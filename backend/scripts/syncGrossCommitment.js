import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import { connectDB } from '../config/db.js';
import Flat from '../models/Flat.js';
import apiCache from '../utils/cacheManager.js';

async function syncGrossRentalCommitments() {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    const flats = await Flat.find({
      $or: [
        { takenForRental: true },
        { 'rentalDetails.guaranteedMonthlyRent': { $gt: 0 } },
        { 'rentalDetails.isRentBackActive': true }
      ]
    });

    console.log(`Found ${flats.length} flats with rental details.`);

    let updatedCount = 0;

    for (const flat of flats) {
      const rental = flat.rentalDetails || {};
      const grossRent = Number(rental.guaranteedMonthlyRent || 0);
      const tenure = Number(rental.tenureMonths || 36);

      // User requirement: Commitment is gross rent * tenure (without TDS)
      const totalCommitment = grossRent * tenure;
      const totalPaid = Number(rental.totalDisbursedToOwner || 0);
      const remaining = Math.max(0, totalCommitment - totalPaid);

      flat.rentalDetails.total36MonthCommitment = totalCommitment;
      flat.rentalDetails.remainingPayableToOwner = remaining;

      // Also update ledger entries remaining balances if present
      if (Array.isArray(flat.rentalDetails.ledgerEntries) && flat.rentalDetails.ledgerEntries.length > 0) {
        let runningPaid = 0;
        flat.rentalDetails.ledgerEntries.forEach((entry) => {
          if (entry.status === 'paid') {
            runningPaid += (entry.grossAmount || grossRent);
          }
          entry.remainingTenureBalance = Math.max(0, totalCommitment - runningPaid);
        });
      }

      flat.markModified('rentalDetails');
      await flat.save();
      updatedCount++;
    }

    if (apiCache) {
      apiCache.invalidatePrefix('flats');
      apiCache.invalidatePrefix('reports');
    }

    console.log(`\nSuccessfully synchronized ${updatedCount} flats to Gross Commitment (Rent * Tenure)!`);
    process.exit(0);
  } catch (err) {
    console.error('Error syncing gross commitments:', err);
    process.exit(1);
  }
}

syncGrossRentalCommitments();
