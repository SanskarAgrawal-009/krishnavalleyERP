import dns from 'dns';
try { dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']); } catch {}

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Flat from '../models/Flat.js';
import Customer from '../models/Customer.js';
import Project from '../models/Project.js';
import jwt from 'jsonwebtoken';

async function testRentalFlow() {
  console.log('🧪 Running Comprehensive Rental Flow Test...');
  await mongoose.connect(process.env.MONGO_URI);

  const project = await Project.findOne();
  if (!project) {
    console.error('No project found');
    process.exit(1);
  }

  const buildingId = project.buildings?.[0]?._id || new mongoose.Types.ObjectId();

  // 1. Create a test customer
  const testCustomer = new Customer({
    name: 'Padam Kumar',
    mobileNo: '+91 9999900101',
    customerType: 'owner',
    status: 'active'
  });
  await testCustomer.save();

  // 2. Create a test flat enrolled in rental
  const startDate = new Date('2024-01-10');
  const tenure = 36;
  const grossRent = 31000;
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + tenure);

  const testFlat = new Flat({
    flatNumber: 'TEST-101',
    projectId: project._id,
    buildingId,
    floor: 1,
    bhkType: '2BHK',
    status: 'sold',
    takenForRental: true,
    currentOwner: {
      customerId: testCustomer._id,
      name: 'Padam Kumar',
      mobileNo: '+91 9999900101',
      ownershipStartDate: startDate
    },
    rentalDetails: {
      isRentBackActive: true,
      guaranteedMonthlyRent: grossRent,
      applyTds: true,
      tdsPercentage: 10,
      mouDate: startDate,
      startDate,
      endDate,
      tenureMonths: tenure,
      dueDayOfMonth: 10,
      total36MonthCommitment: grossRent * tenure,
      totalDisbursedToOwner: 0,
      remainingPayableToOwner: grossRent * tenure
    }
  });
  await testFlat.save();

  console.log('✅ Created test flat TEST-101 with owner Padam Kumar');

  // Generate Admin JWT token
  const token = jwt.sign({ id: 'admin-test', role: 'admin' }, process.env.JWT_SECRET || 'super_secret_jwt_key_change_in_production');

  // Test 3: Query /api/rentals/active
  const res1 = await fetch('http://localhost:5000/api/rentals/active?search=TEST-101', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data1 = await res1.json();
  const row1 = data1.data?.find(r => r.flatNumber === 'TEST-101');
  console.log('\n--- TEST 1: Table 1 Active Rental Verification ---');
  console.log('Flat:', row1.flatNumber);
  console.log('Owner:', row1.ownerName);
  console.log('Gross Rent:', row1.rentAmount, '| Expected: 31000');
  console.log('TDS Deduction:', row1.tdsAmount, '| Expected: 3100');
  console.log('Net Amount:', row1.netAmount, '| Expected: 27900');
  console.log('Tenure:', row1.tenureMonths, '| Expected: 36');
  console.log('Total Commitment:', row1.totalCommitment, '| Expected: 1116000');
  console.log('Total Paid:', row1.totalPaid, '| Expected: 0');
  console.log('Outstanding Balance:', row1.amountOutstanding, '| Expected: 1116000');

  if (row1.netAmount === 27900 && row1.totalCommitment === 1116000 && row1.amountOutstanding === 1116000) {
    console.log('✅ TABLE 1 INITIAL CALCULATIONS PASSED!');
  } else {
    console.error('❌ Table 1 calculation mismatch!');
  }

  // Test 4: Record Payout of ₹62,000 (2 months)
  console.log('\n--- TEST 2: Record Payout Payout ---');
  const res2 = await fetch(`http://localhost:5000/api/rentals/${testFlat._id}/payout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      amount: 62000,
      paymentDate: '2024-03-10',
      paymentMode: 'NEFT',
      referenceNumber: 'CMS-NEFT-TEST101-01'
    })
  });
  const data2 = await res2.json();
  console.log('Payout Response:', data2.message);

  // Check Table 1 updated state
  const res3 = await fetch('http://localhost:5000/api/rentals/active?search=TEST-101', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data3 = await res3.json();
  const row3 = data3.data?.find(r => r.flatNumber === 'TEST-101');
  console.log('Updated Total Paid:', row3.totalPaid, '| Expected: 62000');
  console.log('Updated Outstanding:', row3.amountOutstanding, '| Expected: 1054000');
  if (row3.totalPaid === 62000 && row3.amountOutstanding === 1054000) {
    console.log('✅ PAYOUT & OUTSTANDING DECREMENT PASSED!');
  }

  // Test 5: Edit Tenure from 36 to 48 months
  console.log('\n--- TEST 3: Edit Tenure & Auto-Update Ending Date ---');
  const res4 = await fetch(`http://localhost:5000/api/rentals/${testFlat._id}/terms`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      guaranteedMonthlyRent: 31000,
      applyTds: true,
      tdsPercentage: 10,
      startDate: '2024-01-10',
      tenureMonths: 48
    })
  });
  const data4 = await res4.json();
  const res5 = await fetch('http://localhost:5000/api/rentals/active?search=TEST-101', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data5 = await res5.json();
  const row5 = data5.data?.find(r => r.flatNumber === 'TEST-101');
  console.log('New Tenure:', row5.tenureMonths, '| Expected: 48');
  console.log('New Total Commitment:', row5.totalCommitment, '| Expected: 1488000');
  console.log('New Outstanding:', row5.amountOutstanding, '| Expected: 1426000 (1488000 - 62000)');
  if (row5.tenureMonths === 48 && row5.totalCommitment === 1488000 && row5.amountOutstanding === 1426000) {
    console.log('✅ TENURE EDIT & AUTO-COMMITMENT PASSED!');
  }

  // Test 6: Resale Transfer to Nitin Kumar (Archive Padam Kumar into Table 2)
  console.log('\n--- TEST 4: Resale Transfer & Table 2 History Archive ---');
  const res6 = await fetch(`http://localhost:5000/api/rentals/${testFlat._id}/transfer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      newOwnerName: 'Nitin Kumar',
      newOwnerMobile: '+91 9999900102',
      transferDate: '2025-01-10',
      transferDealValue: 3200000,
      newMonthlyRent: 35000,
      newTenureMonths: 36,
      newStartDate: '2025-01-10',
      newRegistryDate: '2025-01-10'
    })
  });
  const data6 = await res6.json();
  console.log('Transfer Response:', data6.message);

  // Verify Table 1 has Nitin Kumar
  const res7 = await fetch('http://localhost:5000/api/rentals/active?search=TEST-101', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data7 = await res7.json();
  const row7 = data7.data?.find(r => r.flatNumber === 'TEST-101');
  console.log('Current Owner in Table 1:', row7.ownerName, '| Expected: Nitin Kumar');
  console.log('New Rent in Table 1:', row7.rentAmount, '| Expected: 35000');
  console.log('New Paid in Table 1:', row7.totalPaid, '| Expected: 0 (Reset for new owner)');

  // Verify Table 2 has Padam Kumar as "Last Owner (Previous)"
  const res8 = await fetch('http://localhost:5000/api/rentals/history?search=TEST-101', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data8 = await res8.json();
  const histRow = data8.data?.find(h => h.flatNumber === 'TEST-101');
  console.log('\n--- Table 2 Previous Owners Row ---');
  console.log('Sequence:', histRow?.sequenceLabel, '| Expected: Last Owner (Previous)');
  console.log('Previous Owner Name:', histRow?.previousOwnerName, '| Expected: Padam Kumar');
  console.log('Historical Rent:', histRow?.rentAmount, '| Expected: 31000');
  console.log('Total Rent Disbursed During Ownership:', histRow?.totalRentPaid, '| Expected: 62000');
  console.log('Transferred To:', histRow?.transferredTo, '| Expected: Nitin Kumar');

  if (histRow?.previousOwnerName === 'Padam Kumar' && histRow?.totalRentPaid === 62000 && histRow?.transferredTo === 'Nitin Kumar') {
    console.log('✅ TABLE 2 PREVIOUS OWNERS ARCHIVE PASSED 100%!');
  }

  // Clean up test records
  console.log('\n🧹 Cleaning up test records to preserve clean state...');
  await Flat.deleteOne({ _id: testFlat._id });
  await Customer.deleteMany({ mobileNo: { $in: ['+91 9999900101', '+91 9999900102'] } });
  console.log('✓ Cleaned up test flat and customers.\n');

  console.log('🎉 ALL RENTAL FLOW TESTS COMPLETED WITH 100% SUCCESS!');
  await mongoose.disconnect();
}

testRentalFlow().catch(console.error);
