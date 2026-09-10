import dns from 'dns';
try { dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']); } catch {}

import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { connectDB } from '../config/db.js';
import Flat from '../models/Flat.js';
import Customer from '../models/Customer.js';
import Project from '../models/Project.js';
import RentalManagement from '../models/RentalManagement.js';

export async function syncRentalOwnersToCustomers() {
  await connectDB();

  console.log('🔄 Starting full rental owner synchronization...');

  // 1. Read Excel file for authentic contact and banking details
  const excelPath = path.resolve('Tower_A_Standardized_Inventory_Upload.xlsx');
  let excelRows = [];
  if (fs.existsSync(excelPath)) {
    const buf = fs.readFileSync(excelPath);
    const wb = XLSX.read(buf, { type: 'buffer' });
    excelRows = XLSX.utils.sheet_to_json(wb.Sheets['Site_Inventory'] || wb.Sheets[wb.SheetNames[0]] || {});
    console.log(`📊 Loaded ${excelRows.length} rows from ${excelPath}`);
  } else {
    console.warn(`⚠️ Excel file not found at ${excelPath}`);
  }

  // Build lookup by normalized flat number
  const excelLookup = new Map();
  for (const row of excelRows) {
    const rawNo = String(row['Flat No'] || row.flatNo || row['Flat Number'] || '').replace(/^A-?/i, '').trim();
    if (rawNo) {
      excelLookup.set(rawNo.toLowerCase(), row);
      // also allow padded or unpadded version
      const numOnly = rawNo.replace(/\D/g, '');
      if (numOnly) {
        excelLookup.set(numOnly, row);
        excelLookup.set(numOnly.padStart(3, '0'), row);
      }
    }
  }

  // 2. Fetch all flats that are in rental or sold/booked
  const flats = await Flat.find({
    $or: [
      { takenForRental: true },
      { 'rentalDetails.guaranteedMonthlyRent': { $gt: 0 } },
      { status: { $in: ['sold', 'booked', 'resell', 'possession_renewal', 'buy_back'] } },
      { 'currentOwner.name': { $exists: true, $ne: '' } }
    ]
  }).sort({ flatNumber: 1 });

  console.log(`🏢 Found ${flats.length} flats with rental or ownership to synchronize.`);

  let createdCustomersCount = 0;
  let updatedCustomersCount = 0;
  let updatedFlatsCount = 0;

  // Group flats by owner identifier (name + phone) so multi-unit owners get unified
  const ownerGroups = new Map();

  for (const flat of flats) {
    const normFlatNo = flat.flatNumber.replace(/^A-?/i, '').trim();
    const excelData = excelLookup.get(normFlatNo.toLowerCase()) || excelLookup.get(normFlatNo.replace(/\D/g, '')) || {};

    const ownerName = String(
      excelData['Customer Name'] ||
      excelData['Owner Name'] ||
      flat.currentOwner?.name ||
      'Property Owner'
    ).trim();

    if (!ownerName || ownerName === '-' || ownerName.toLowerCase() === 'unassigned') {
      continue;
    }

    // Determine phone number
    let mobileNo = String(
      excelData['Customer Phone'] ||
      excelData['Owner Mobile'] ||
      flat.currentOwner?.mobileNo ||
      ''
    ).trim();

    if (!mobileNo || mobileNo === '-' || mobileNo === '—' || mobileNo.toLowerCase() === 'on file') {
      // Generate clean deterministic phone number if missing: e.g. +91 9800000001
      const numOnly = normFlatNo.replace(/\D/g, '').padStart(3, '0');
      mobileNo = `+91 98${numOnly.padStart(8, '0').slice(0, 8)}`;
    }

    // Email
    const email = String(
      excelData['Customer Email'] ||
      excelData['Owner Email'] ||
      flat.currentOwner?.email ||
      `owner.${normFlatNo.toLowerCase().replace(/[^a-z0-9]/g, '')}@krishnavalley.com`
    ).trim();

    // Bank Details
    const bName = String(excelData['Bank Name'] || flat.currentOwner?.bankDetails?.bankName || '').trim();
    const bBranch = String(excelData['Bank Branch'] || flat.currentOwner?.bankDetails?.branch || '').trim();
    const bAcc = String(excelData['Account Number'] || flat.currentOwner?.bankDetails?.accountNumber || flat.currentOwner?.bankDetails?.accountNo || '').trim();
    const bIfsc = String(excelData['IFSC Code'] || flat.currentOwner?.bankDetails?.ifscCode || flat.currentOwner?.bankDetails?.ifsc || '').trim().toUpperCase();

    // PAN
    const pan = String(excelData['PAN Number'] || flat.currentOwner?.panNumber || '').trim().toUpperCase();

    // Key for grouping: normalized name + clean phone digits if available
    const nameKey = ownerName.toLowerCase().replace(/\s+/g, ' ');

    if (!ownerGroups.has(nameKey)) {
      ownerGroups.set(nameKey, {
        name: ownerName,
        mobileNo,
        email,
        panNumber: pan,
        bankDetails: {
          bankName: bName,
          branch: bBranch,
          accountNumber: bAcc,
          accountNo: bAcc,
          ifscCode: bIfsc,
          ifsc: bIfsc,
          accountHolderName: ownerName
        },
        flats: []
      });
    }

    const group = ownerGroups.get(nameKey);
    // Update missing fields if available in this row
    if (!group.bankDetails.bankName && bName) group.bankDetails.bankName = bName;
    if (!group.bankDetails.branch && bBranch) group.bankDetails.branch = bBranch;
    if (!group.bankDetails.accountNumber && bAcc) {
      group.bankDetails.accountNumber = bAcc;
      group.bankDetails.accountNo = bAcc;
    }
    if (!group.bankDetails.ifscCode && bIfsc) {
      group.bankDetails.ifscCode = bIfsc;
      group.bankDetails.ifsc = bIfsc;
    }
    if (!group.panNumber && pan) group.panNumber = pan;
    if ((!group.mobileNo || group.mobileNo.startsWith('+91 9800')) && mobileNo && !mobileNo.startsWith('+91 9800')) {
      group.mobileNo = mobileNo;
    }

    group.flats.push(flat);
  }

  console.log(`👥 Identified ${ownerGroups.size} unique property owner entities.`);

  // 3. Upsert Customer documents and link flats
  for (const [key, info] of ownerGroups) {
    const flatIds = info.flats.map(f => f._id);

    // Search existing Customer by mobile or name
    let customer = await Customer.findOne({
      $or: [
        { mobileNo: info.mobileNo },
        { name: new RegExp(`^${info.name.replace(/[-\\/\\^$*+?.()|[\\]{}]/g, '\\$&')}$`, 'i') }
      ]
    });

    const bankObj = {
      bankName: info.bankDetails.bankName || '',
      branch: info.bankDetails.branch || '',
      accountNumber: info.bankDetails.accountNumber || '',
      accountNo: info.bankDetails.accountNumber || '',
      ifscCode: info.bankDetails.ifscCode || '',
      ifsc: info.bankDetails.ifscCode || '',
      accountHolderName: info.name
    };

    if (!customer) {
      customer = new Customer({
        customerType: 'owner',
        name: info.name,
        mobileNo: info.mobileNo,
        email: info.email,
        panNumber: info.panNumber || '',
        bankDetails: bankObj,
        address: {
          addressLine1: 'Krishna Valley Residence',
          city: 'Mathura',
          state: 'Uttar Pradesh',
          pincode: '281001',
          country: 'India'
        },
        permanentAddress: 'Krishna Valley, Mathura, Uttar Pradesh - 281001',
        ownerDetails: {
          ownershipType: info.name.includes('&') || info.name.includes('and') ? 'joint' : 'individual',
          ownershipPercentage: 100,
          propertyIds: flatIds,
          panNumber: info.panNumber || '',
          bankDetails: bankObj
        },
        status: 'active'
      });
      await customer.save();
      createdCustomersCount++;
    } else {
      // Merge properties into existing customer
      const existingPropIds = (customer.ownerDetails?.propertyIds || []).map(p => p.toString());
      const mergedPropIds = Array.from(new Set([...existingPropIds, ...flatIds.map(f => f.toString())]));

      customer.name = info.name;
      if (info.mobileNo && !customer.mobileNo) customer.mobileNo = info.mobileNo;
      if (info.email && !customer.email) customer.email = info.email;
      if (info.panNumber && !customer.panNumber) customer.panNumber = info.panNumber;

      // Update bank details if customer doesn't have them
      if (!customer.bankDetails?.accountNumber && bankObj.accountNumber) {
        customer.bankDetails = bankObj;
      }

      if (!customer.ownerDetails) {
        customer.ownerDetails = {
          ownershipType: 'individual',
          ownershipPercentage: 100,
          propertyIds: mergedPropIds,
          bankDetails: customer.bankDetails || bankObj
        };
      } else {
        customer.ownerDetails.propertyIds = mergedPropIds;
        if (!customer.ownerDetails.bankDetails?.accountNumber && bankObj.accountNumber) {
          customer.ownerDetails.bankDetails = bankObj;
        }
      }

      customer.customerType = 'owner';
      customer.status = 'active';
      await customer.save();
      updatedCustomersCount++;
    }

    // 4. Update all linked flats to have valid currentOwner.customerId and matching bank details
    for (const flat of info.flats) {
      if (!flat.currentOwner) flat.currentOwner = {};
      flat.currentOwner.customerId = customer._id;
      flat.currentOwner.name = customer.name;
      flat.currentOwner.mobileNo = customer.mobileNo;
      flat.currentOwner.email = customer.email;
      if (customer.panNumber) flat.currentOwner.panNumber = customer.panNumber;
      if (customer.bankDetails?.accountNumber) {
        flat.currentOwner.bankDetails = customer.bankDetails;
      }
      flat.status = 'sold';
      flat.takenForRental = true;
      await flat.save();
      updatedFlatsCount++;
    }
  }

  console.log('\n======================================================');
  console.log('           RENTAL OWNERS SYNC SUMMARY                 ');
  console.log('======================================================');
  console.log(`✅ New Customers Created:     ${createdCustomersCount}`);
  console.log(`🔄 Existing Customers Synced: ${updatedCustomersCount}`);
  console.log(`🏠 Total Flats Linked:        ${updatedFlatsCount}`);
  console.log(`👥 Total Customer Directory:  ${await Customer.countDocuments()}`);
  console.log('======================================================\n');
}

// Execute directly if run via CLI
if (process.argv[1]?.endsWith('syncRentalOwnersToCustomers.js')) {
  syncRentalOwnersToCustomers()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Sync failed:', err);
      process.exit(1);
    });
}
