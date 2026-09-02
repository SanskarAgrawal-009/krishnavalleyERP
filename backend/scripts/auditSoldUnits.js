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
import RentalManagement from '../models/RentalManagement.js';
import Customer from '../models/Customer.js';
import Project from '../models/Project.js';

async function auditSoldUnits() {
  try {
    await connectDB();

    const totalFlats = await Flat.find().populate('projectId');
    const salesLeads = await SalesLead.find().populate('flatId');
    const rentals = await RentalManagement.find().populate('flatId ownerId');
    const owners = await Customer.find({ customerType: 'owner' });

    console.log('\n======================================================');
    console.log('              DATABASE INVENTORY AUDIT                ');
    console.log('======================================================');
    console.log(`Total Flats:                   ${totalFlats.length}`);
    console.log(`Sales Allotment Records:       ${salesLeads.length}`);
    console.log(`Rental Management Contracts:   ${rentals.length}`);
    console.log(`Registered Flat Owners:        ${owners.length}`);
    console.log('------------------------------------------------------');

    if (totalFlats.length === 0) {
      console.log('STATUS: No flats in database currently (clean state ready for Excel import).');
    } else {
      console.log('\n--- DETAILED LIST OF UNITS ---');
      totalFlats.forEach((f, idx) => {
        const sl = salesLeads.find(s => s.flatId?._id?.toString() === f._id.toString() || s.flatId?.flatNumber === f.flatNumber);
        const rm = rentals.find(r => r.flatId?._id?.toString() === f._id.toString() || r.flatId?.flatNumber === f.flatNumber);
        const own = owners.find(o => o.ownerDetails?.propertyIds?.some(p => p.toString() === f._id.toString()) || o.name === sl?.name || o.name === rm?.ownerId?.name);

        const isSold = f.status === 'sold' || f.status === 'leased' || f.takenForRental || !!sl || !!rm;
        console.log(`\n[Unit #${idx + 1}] Flat: ${f.flatNumber} | Building: ${f.buildingName || 'Tower A'} | Floor: ${f.floor} | Type: ${f.bhkType}`);
        console.log(`  - Inventory Status:    ${f.status.toUpperCase()} (isSold = ${isSold})`);
        console.log(`  - 3-Yr Rental Lock-in: ${f.takenForRental ? 'ACTIVE (36-Month Lock-in)' : 'NOT ENROLLED'}`);
        console.log(`  - Property Owner:      ${own?.name || sl?.name || rm?.ownerId?.name || 'Unassigned'}`);
        console.log(`  - Deal Value:          ₹${f.basePrice?.toLocaleString('en-IN') || '0'}`);
        console.log(`  - Previous Payment:    ₹${(sl?.booking?.bookingAmount || 0).toLocaleString('en-IN')}`);
        if (rm) {
          console.log(`  - Guaranteed Rent:     ₹${(rm.rentBack?.monthlyRent || 0).toLocaleString('en-IN')} / mo`);
          console.log(`  - Rental Agreement:    ${rm.contractCode || rm.rentBack?.agreementNumber || 'Active'}`);
        }
      });
    }
    console.log('======================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('Audit Error:', err);
    process.exit(1);
  }
}

auditSoldUnits();
