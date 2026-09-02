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

async function auditRentals() {
  try {
    await connectDB();
    const rentals = await RentalManagement.find().populate('flatId ownerId');
    console.log(`\n======================================================`);
    console.log(`         36-MONTH RENTAL LEDGER AUDIT REPORT          `);
    console.log(`======================================================`);
    console.log(`Total Rental Records: ${rentals.length}\n`);

    rentals.forEach((r, idx) => {
      const flatNo = r.flatId?.flatNumber || 'N/A';
      const ownerName = r.ownerId?.name || 'N/A';
      const totalTenure = r.rentBackLedger?.totalTenureAmount || 0;
      const totalPaid = r.rentBackLedger?.totalPaidToOwner || 0;
      const remaining = r.rentBackLedger?.remainingPayableToOwner || 0;
      const paidMonths = (r.rentBackLedger?.entries || []).filter(e => e.status === 'paid' || e.netAmountPaid > 0).length;

      console.log(`[Unit #${idx + 1}] Flat ${flatNo} — Owner: ${ownerName}`);
      console.log(`  - 36-Month Commitment: ₹${totalTenure.toLocaleString('en-IN')}`);
      console.log(`  - Total Paid to Owner: ₹${totalPaid.toLocaleString('en-IN')} (${paidMonths} of 36 Months Disbursed)`);
      console.log(`  - Remaining Liability: ₹${remaining.toLocaleString('en-IN')}`);
      console.log(`  - Status:              ${r.status?.toUpperCase()}`);
      console.log('------------------------------------------------------');
    });

    process.exit(0);
  } catch (err) {
    console.error('Audit error:', err);
    process.exit(1);
  }
}

auditRentals();
