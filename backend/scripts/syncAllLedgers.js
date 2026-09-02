import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch {}

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from '../config/db.js';
import Flat from '../models/Flat.js';
import Customer from '../models/Customer.js';
import RentalManagement from '../models/RentalManagement.js';
import { generateDefaultRentBackLedger } from '../controllers/rentalController.js';

async function syncAllLedgers() {
  try {
    await connectDB();
    const rentals = await RentalManagement.find().populate('flatId ownerId');

    for (const r of rentals) {
      if (!r.rentBackLedger || !r.rentBackLedger.entries || r.rentBackLedger.entries.length === 0 || r.rentBackLedger.totalTenureAmount === 0) {
        const mRent = r.rentBack?.monthlyRent || (r.flatId?.basePrice ? Math.round(r.flatId.basePrice * 0.005) : 25000);
        r.rentBack.enabled = true;
        r.rentBack.monthlyRent = mRent;
        r.rentBack.rentDueDay = 25;
        r.rentBackLedger = generateDefaultRentBackLedger({
          monthlyRent: mRent,
          tenureMonths: 36,
          dueDay: 25,
          startDate: r.rentBack?.startDate || new Date('2025-07-25'),
          mouDate: r.rentBack?.mouDate || new Date('2025-06-14')
        });
        r.status = 'rent_back_active';
        await r.save();
        console.log(`Synced 36-month ledger for Flat ${r.flatId?.flatNumber}: Commitment ₹${r.rentBackLedger.totalTenureAmount.toLocaleString('en-IN')}`);
      }
    }

    console.log('✅ All rental ledgers synced in MongoDB Atlas!');
    process.exit(0);
  } catch (err) {
    console.error('Error syncing:', err);
    process.exit(1);
  }
}

syncAllLedgers();
