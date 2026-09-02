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
import SalesLead from '../models/SalesLead.js';
import RentalManagement from '../models/RentalManagement.js';
import Project from '../models/Project.js';

async function cleanAllData() {
  try {
    await connectDB();

    console.log('======================================================');
    console.log('       COMPLETE INVENTORY & SALES WIPEOUT SCRIPT      ');
    console.log('======================================================');

    // 1. Delete all Sales Leads
    const salesRes = await SalesLead.deleteMany({});
    console.log(`✓ Deleted ${salesRes.deletedCount} Sales Allotment / Lead records.`);

    // 2. Delete all Rental Contracts
    const rentalRes = await RentalManagement.deleteMany({});
    console.log(`✓ Deleted ${rentalRes.deletedCount} Rental Management records.`);

    // 3. Delete all Flats
    const flatRes = await Flat.deleteMany({});
    console.log(`✓ Deleted ${flatRes.deletedCount} Flat records.`);

    // 4. Clean Customer records
    const custRes = await Customer.deleteMany({ customerType: { $in: ['owner', 'tenant', 'buyer'] } });
    console.log(`✓ Cleaned ${custRes.deletedCount} Customer records.`);

    // 5. Clear building flats in Projects
    await Project.updateMany({}, { $set: { "buildings.$[].flats": [] } });
    console.log(`✓ Cleared project building flat references.`);

    console.log('======================================================');
    console.log('✅ ALL FLATS, SALES ALLOTMENTS, RENTALS & CUSTOMERS REMOVED!');
    console.log('======================================================');
    process.exit(0);
  } catch (err) {
    console.error('Error cleaning data:', err);
    process.exit(1);
  }
}

cleanAllData();
