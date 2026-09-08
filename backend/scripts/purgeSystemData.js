import dns from 'dns';
try { dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']); } catch {}

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

// Collections to completely clear
const COLLECTIONS_TO_PURGE = [
  'flats',
  'customers',
  'leads',
  'auditlogs',
  'servicerequests',
  'commissionledgers',
  'materials',
  'stocks',
  'stores',
  'vendors',
  'purchaseorders',
  'goodsreceipts',
  'materialissues',
  'stocktransfers',
  'employees',
  'hrmasters',
  'salesleads',
  'sitevisits',
  'calllogs',
  'tenantpenalties',
  'maintenancebills',
  'rentalmanagements',
  'digitalsignatures',
  'legaldocuments',
  'notificationlogs',
  'accesscontrols'
];

async function purgeData() {
  console.log('📡 Connecting to MongoDB Atlas...');
  await mongoose.connect(process.env.MONGO_URI);

  console.log('\n========================================================');
  console.log('  ⚠️  SYSTEM-WIDE BUSINESS DATA PURGE IN PROGRESS');
  console.log('========================================================\n');

  let totalDeleted = 0;

  for (const colName of COLLECTIONS_TO_PURGE) {
    try {
      const col = mongoose.connection.db.collection(colName);
      const countBefore = await col.countDocuments();
      if (countBefore > 0) {
        const result = await col.deleteMany({});
        console.log(`  🗑️  Purged ${colName.padEnd(25)}: ${result.deletedCount} documents deleted`);
        totalDeleted += result.deletedCount;
      } else {
        console.log(`  ✓  ${colName.padEnd(25)}: already empty (0 docs)`);
      }
    } catch (err) {
      console.warn(`  ⚠️ Could not purge ${colName}:`, err.message);
    }
  }

  // Reset Project Flats & Counters
  console.log('\n🔄 Resetting Project buildings and unit counters...');
  const Project = mongoose.model('Project', new mongoose.Schema({}, { strict: false }));
  const projectUpdate = await Project.updateMany({}, {
    $set: {
      totalUnits: 0,
      bookedUnits: 0,
      availableUnits: 0,
      soldUnits: 0,
      'buildings.$[].flats': [],
      'buildings.$[].totalFlats': 0,
      'buildings.$[].bookedFlats': 0,
      'buildings.$[].availableFlats': 0
    }
  });
  console.log(`  ✓ Reset ${projectUpdate.modifiedCount} project(s) to 0 flats.`);

  console.log('\n========================================================');
  console.log(`  🎉 PURGE COMPLETE! Total records deleted: ${totalDeleted}`);
  console.log('  🛡️  Core authentication, users, roles, and settings preserved.');
  console.log('========================================================\n');

  await mongoose.disconnect();
}

purgeData().catch((err) => {
  console.error('❌ Purge failed:', err);
  process.exit(1);
});
