import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch {
  // ignore
}

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import Flat from '../models/Flat.js';
import Project from '../models/Project.js';
import RentalManagement from '../models/RentalManagement.js';
import SalesLead from '../models/SalesLead.js';
import Customer from '../models/Customer.js';
import Lead from '../models/Lead.js';

async function deleteAllFlatsData() {
  try {
    console.log('Connecting to MongoDB via connectDB...');
    await connectDB();
    const db = mongoose.connection.db;
    console.log(`Connected to database: "${db.databaseName}"`);

    console.log('\n--- REMOVING ALL FLATS & ASSOCIATED PROPERTY RECORDS ---');
    
    // 1. Delete all Flats
    const flatDeleteRes = await Flat.deleteMany({});
    console.log(`✓ Deleted all Flats: ${flatDeleteRes.deletedCount} units removed`);

    // 2. Clear flats array in all Projects and Buildings
    const projects = await Project.find({});
    let updatedProjectsCount = 0;
    for (const proj of projects) {
      let modified = false;
      if (proj.buildings && Array.isArray(proj.buildings)) {
        proj.buildings.forEach(bld => {
          if (bld.flats && bld.flats.length > 0) {
            bld.flats = [];
            modified = true;
          }
        });
      }
      if (modified) {
        await proj.save();
        updatedProjectsCount++;
      }
    }
    console.log(`✓ Cleared flats references across ${updatedProjectsCount} projects/buildings`);

    // 3. Clear Rental Management contracts
    const rentalDeleteRes = await RentalManagement.deleteMany({});
    console.log(`✓ Deleted all Rental Contracts: ${rentalDeleteRes.deletedCount} contracts removed`);

    // 4. Clear Sales Leads / Allotments
    const salesDeleteRes = await SalesLead.deleteMany({});
    console.log(`✓ Deleted all Sales Allotments: ${salesDeleteRes.deletedCount} records removed`);

    // 5. Clean Customer property references
    const custRes = await Customer.updateMany(
      {},
      {
        $set: {
          'ownerDetails.propertyIds': [],
          'tenantDetails.leasedPropertyIds': []
        },
        $unset: {
          salesAllotment: ''
        }
      }
    );
    console.log(`✓ Cleaned property links from ${custRes.modifiedCount} customer records`);

    // 6. Delete legacy import CRM leads
    const leadRes = await Lead.deleteMany({
      $or: [
        { source: 'Legacy Inventory Import' },
        { leadSource: 'Legacy Inventory Import' }
      ]
    });
    console.log(`✓ Deleted ${leadRes.deletedCount} legacy import leads`);

    console.log('\n--- VERIFYING CLEAN STATE ---');
    const remainingFlats = await Flat.countDocuments();
    const remainingRentals = await RentalManagement.countDocuments();
    const remainingSales = await SalesLead.countDocuments();

    console.log(`Remaining Flats: ${remainingFlats}`);
    console.log(`Remaining Rental Contracts: ${remainingRentals}`);
    console.log(`Remaining Sales Records: ${remainingSales}`);

    console.log('\n✅ All flats data has been completely wiped and inventory is ready for fresh Excel import!\n');
    process.exit(0);
  } catch (err) {
    console.error('Error removing flats data:', err);
    process.exit(1);
  }
}

deleteAllFlatsData();
