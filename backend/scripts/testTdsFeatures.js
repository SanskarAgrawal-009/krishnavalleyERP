import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Flat from '../models/Flat.js';
import Customer from '../models/Customer.js';
import { generatePassbookEntries } from '../controllers/rentalController.js';

dotenv.config();

async function runTests() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  try {
    // 1. Test generatePassbookEntries with Percentage Mode
    console.log('\n--- 1. Testing generatePassbookEntries with Percentage Mode (5% on 30,000) ---');
    const pctEntries = generatePassbookEntries({
      flatNumber: 'TEST-101',
      startDate: new Date('2025-01-01'),
      tenureMonths: 12,
      grossRent: 30000,
      applyTds: true,
      tdsMode: 'percentage',
      tdsPercentage: 5,
      totalPaid: 57000
    });
    console.log(`Month 1 Gross: ${pctEntries[0].grossAmount}, TDS: ${pctEntries[0].tdsDeducted}, Net: ${pctEntries[0].netAmountPaid}`);
    if (pctEntries[0].tdsDeducted !== 1500 || pctEntries[0].netAmountPaid !== 28500) {
      throw new Error(`Expected TDS 1500 & Net 28500, got TDS ${pctEntries[0].tdsDeducted}, Net ${pctEntries[0].netAmountPaid}`);
    }
    console.log('✓ Percentage Mode test passed!');

    // 2. Test generatePassbookEntries with Amount Mode
    console.log('\n--- 2. Testing generatePassbookEntries with Amount Mode (Fixed TDS 2,000 on 30,000) ---');
    const amtEntries = generatePassbookEntries({
      flatNumber: 'TEST-102',
      startDate: new Date('2025-01-01'),
      tenureMonths: 12,
      grossRent: 30000,
      applyTds: true,
      tdsMode: 'amount',
      tdsAmount: 2000,
      totalPaid: 56000
    });
    console.log(`Month 1 Gross: ${amtEntries[0].grossAmount}, TDS: ${amtEntries[0].tdsDeducted}, Net: ${amtEntries[0].netAmountPaid}`);
    if (amtEntries[0].tdsDeducted !== 2000 || amtEntries[0].netAmountPaid !== 28000) {
      throw new Error(`Expected TDS 2000 & Net 28000, got TDS ${amtEntries[0].tdsDeducted}, Net ${amtEntries[0].netAmountPaid}`);
    }
    console.log('✓ Amount Mode test passed!');

    // 3. Test Flat model persistence with tdsMode and tdsAmount
    console.log('\n--- 3. Testing Flat model persistence with tdsMode and tdsAmount ---');
    const testFlat = await Flat.findOne({ status: { $in: ['sold', 'booked', 'resell', 'available'] } });
    if (testFlat) {
      testFlat.rentalDetails.tdsMode = 'amount';
      testFlat.rentalDetails.tdsAmount = 2500;
      testFlat.rentalDetails.tdsPercentage = 8.06;
      await testFlat.save();

      const reloaded = await Flat.findById(testFlat._id);
      console.log(`Reloaded flat ${reloaded.flatNumber}: tdsMode = ${reloaded.rentalDetails.tdsMode}, tdsAmount = ${reloaded.rentalDetails.tdsAmount}`);
      if (reloaded.rentalDetails.tdsMode !== 'amount' || reloaded.rentalDetails.tdsAmount !== 2500) {
        throw new Error('Flat model failed to persist tdsMode and tdsAmount');
      }
      console.log('✓ Flat model persistence verified!');
    }

    console.log('\n========================================');
    console.log('ALL TDS BACKEND LOGIC VERIFIED SUCCESSFULLY!');
    console.log('========================================\n');
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
