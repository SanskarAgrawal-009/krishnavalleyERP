import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch {}

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from '../config/db.js';
import Flat from '../models/Flat.js';
import Project from '../models/Project.js';
import Customer from '../models/Customer.js';

async function syncNetRentalCommitments() {
  try {
    await connectDB();
    console.log('Connected to DB');

    const flats = await Flat.find({
      $or: [
        { takenForRental: true },
        { 'rentalDetails.guaranteedMonthlyRent': { $gt: 0 } },
        { 'rentalDetails.isRentBackActive': true }
      ]
    });

    console.log(`Found ${flats.length} flats with rental details.`);

    for (const flat of flats) {
      const rental = flat.rentalDetails || {};
      const grossRent = Number(rental.guaranteedMonthlyRent || 0);
      const applyTds = rental.applyTds !== false;
      const tdsPercentage = Number(rental.tdsPercentage || 10);
      const tdsAmount = applyTds ? Math.round(grossRent * (tdsPercentage / 100)) : 0;
      const netRent = grossRent - tdsAmount;
      const tenure = Number(rental.tenureMonths || 36);

      const netCommitment = netRent * tenure;
      const totalPaid = Number(rental.totalDisbursedToOwner || 0);
      const remaining = Math.max(0, netCommitment - totalPaid);

      console.log(`Flat ${flat.flatNumber}:`);
      console.log(`  Gross Rent: ₹${grossRent.toLocaleString('en-IN')}`);
      console.log(`  TDS: ${applyTds ? `${tdsPercentage}% (-₹${tdsAmount.toLocaleString('en-IN')})` : 'No TDS'}`);
      console.log(`  Net Monthly: ₹${netRent.toLocaleString('en-IN')}`);
      console.log(`  Tenure: ${tenure} months`);
      console.log(`  Previous Commitment: ₹${Number(rental.total36MonthCommitment || 0).toLocaleString('en-IN')}`);
      console.log(`  New Net Commitment: ₹${netCommitment.toLocaleString('en-IN')}`);
      console.log(`  Total Paid: ₹${totalPaid.toLocaleString('en-IN')}`);
      console.log(`  New Outstanding: ₹${remaining.toLocaleString('en-IN')}`);

      flat.rentalDetails.total36MonthCommitment = netCommitment;
      flat.rentalDetails.remainingPayableToOwner = remaining;

      await flat.save();
      console.log(`  -> Saved Flat ${flat.flatNumber} successfully!`);
    }

    console.log('Sync finished.');
    process.exit(0);
  } catch (err) {
    console.error('Error syncing commitments:', err);
    process.exit(1);
  }
}

syncNetRentalCommitments();
