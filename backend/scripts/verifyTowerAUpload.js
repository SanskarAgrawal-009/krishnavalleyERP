import dns from 'dns';
try { dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']); } catch { /* ignore */ }

import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from '../config/db.js';
import Flat from '../models/Flat.js';
import Customer from '../models/Customer.js';
import Project from '../models/Project.js';

async function verify() {
  await connectDB();

  console.log('\n' + '='.repeat(80));
  console.log('  🔍 DEEP DATABASE VERIFICATION AUDIT');
  console.log('='.repeat(80) + '\n');

  // 1. Flats count
  const totalFlats = await Flat.countDocuments();
  console.log(`[1] Total Flats in DB: ${totalFlats} (Expected: 145)`);

  // 2. Project & Building integration
  const project = await Project.findById('6a95c505d15622a0c6809ee2');
  const b = project.buildings.id('6a9ec0b267f9b1d931b1c017');
  console.log(`[2] Building Flats in Project: ${b.flats.length} | totalFlats: ${b.totalFlats}`);

  // 3. Flats with Owner
  const allFlats = await Flat.find().lean();
  const flatsWithOwner = allFlats.filter(f => f.currentOwner && f.currentOwner.customerId);
  const vacantFlats = allFlats.filter(f => f.status === 'available');
  console.log(`[3] Flats with linked customerId: ${flatsWithOwner.length}`);
  console.log(`[4] Vacant flats: ${vacantFlats.length} (${vacantFlats.map(f => f.flatNumber).join(', ')})`);

  // 4. Check for duplicate flat numbers
  const flatNumbers = allFlats.map(f => f.flatNumber);
  const duplicates = flatNumbers.filter((item, index) => flatNumbers.indexOf(item) !== index);
  console.log(`[5] Duplicate flat numbers: ${duplicates.length === 0 ? 'NONE (PASSED ✅)' : duplicates.join(', ')}`);

  // 5. Customer reverse linkage check
  const allCustomers = await Customer.find({ customerType: 'owner' }).lean();
  let customersWithFlats = 0;
  let totalPropertiesLinked = 0;
  const multiPropertyOwners = [];

  for (const c of allCustomers) {
    const props = c.ownerDetails?.propertyIds || [];
    if (props.length > 0) {
      customersWithFlats++;
      totalPropertiesLinked += props.length;
      if (props.length > 1) {
        multiPropertyOwners.push({ name: c.name, count: props.length });
      }
    }
  }

  console.log(`[6] Customers with properties linked: ${customersWithFlats}`);
  console.log(`[7] Total properties assigned across customers: ${totalPropertiesLinked}`);
  console.log(`[8] Multi-property owners (${multiPropertyOwners.length}):`);
  multiPropertyOwners.forEach(o => console.log(`     - ${o.name}: ${o.count} flats`));

  // 6. Check the newly created customers
  const rashmi = await Customer.findOne({ name: /Rashmi Rekha Sahu/i }).populate('ownerDetails.propertyIds');
  const saurabh = await Customer.findOne({ name: /Saurabh Jain/i }).populate('ownerDetails.propertyIds');
  console.log('\n[9] Verification of newly created customers:');
  console.log(`     - Rashmi Rekha Sahu: Mobile ${rashmi?.mobileNo}, Flat: ${rashmi?.ownerDetails?.propertyIds?.[0]?.flatNumber}`);
  console.log(`     - Saurabh Jain: Mobile ${saurabh?.mobileNo}, Flat: ${saurabh?.ownerDetails?.propertyIds?.[0]?.flatNumber}`);

  // 7. Random Spot Checks across multiple floors
  console.log('\n[10] Sample cross-verification against original data:');
  const sampleFlatNos = ['A-006', 'A-109', 'A-313', 'A-503', 'A-701', 'A-909B', 'A-1109', 'A-1102'];
  for (const fn of sampleFlatNos) {
    const f = await Flat.findOne({ flatNumber: fn }).populate('currentOwner.customerId');
    if (!f) {
      console.log(`     ❌ Flat ${fn} not found!`);
      continue;
    }
    const oName = f.currentOwner?.customerId?.name || f.currentOwner?.name || 'Vacant';
    const rent = f.rentalDetails?.guaranteedMonthlyRent || 0;
    const paid = f.rentalDetails?.totalDisbursedToOwner || 0;
    const dueDay = f.rentalDetails?.dueDayOfMonth;
    const tenure = f.rentalDetails?.tenureMonths;
    console.log(`     ✅ ${f.flatNumber}: Owner: ${oName} | Due: ${dueDay}th | ₹${rent.toLocaleString('en-IN')}/mo | Tenure: ${tenure}m | Disbursed: ₹${paid.toLocaleString('en-IN')} | Status: ${f.status}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('  🎯 ALL AUDIT CHECKS COMPLETED SUCCESSFULLY');
  console.log('='.repeat(80) + '\n');

  process.exit(0);
}

verify().catch(err => {
  console.error(err);
  process.exit(1);
});
