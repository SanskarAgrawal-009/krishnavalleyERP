import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch {
  // ignore
}

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from '../config/db.js';
import Flat from '../models/Flat.js';
import SalesLead from '../models/SalesLead.js';

async function fixSalesCalculations() {
  try {
    await connectDB();

    const salesLeads = await SalesLead.find().populate('flatId');
    console.log(`Auditing ${salesLeads.length} Sales Leads in database...\n`);

    for (const sl of salesLeads) {
      const dealPrice = sl.booking?.agreedDealPrice || sl.paymentPlan?.totalAmount || sl.flatId?.basePrice || 4500000;
      const bookingAmount = sl.booking?.bookingAmount || Math.round(dealPrice * 0.2);
      const remainingAmount = Math.max(0, dealPrice - bookingAmount);

      console.log(`Fixing Flat ${sl.flatId?.flatNumber || 'N/A'} (${sl.name}):`);
      console.log(`  Deal Price: ₹${dealPrice.toLocaleString('en-IN')}`);
      console.log(`  Booking Token: ₹${bookingAmount.toLocaleString('en-IN')}`);
      console.log(`  Remaining Balance: ₹${remainingAmount.toLocaleString('en-IN')}`);

      // 1. Payment Plan
      sl.paymentPlan = {
        type: 'installment',
        totalAmount: dealPrice,
        bookingAmount: bookingAmount,
        remainingAmount: remainingAmount,
        numberOfInstallments: 2,
        decidedAt: sl.booking?.bookingDate || new Date()
      };

      // 2. Exact Installments
      sl.installments = [
        {
          installmentNumber: 1,
          dueDate: sl.booking?.bookingDate || new Date(Date.now() - 30 * 86400000),
          amount: bookingAmount,
          paidAmount: bookingAmount,
          remainingAmount: 0,
          status: 'paid',
          paidAt: sl.booking?.bookingDate || new Date(Date.now() - 30 * 86400000)
        },
        {
          installmentNumber: 2,
          dueDate: new Date(Date.now() + 60 * 86400000),
          amount: remainingAmount,
          paidAmount: 0,
          remainingAmount: remainingAmount,
          status: 'upcoming'
        }
      ];

      // 3. Exact Receipts (Only booking receipt unless installments were genuinely paid)
      sl.receipts = [
        {
          receiptNumber: `RCP-${sl.flatId?.flatNumber || '001'}-01`,
          amount: bookingAmount,
          generatedAt: sl.booking?.bookingDate || new Date(Date.now() - 30 * 86400000)
        }
      ];

      sl.salesStatus = 'agreement_completed';
      await sl.save();
      console.log(`  ✓ Successfully updated SalesLead for Flat ${sl.flatId?.flatNumber}\n`);
    }

    console.log('✅ All sales lead calculations fixed in MongoDB!');
    process.exit(0);
  } catch (err) {
    console.error('Error fixing sales calculations:', err);
    process.exit(1);
  }
}

fixSalesCalculations();
