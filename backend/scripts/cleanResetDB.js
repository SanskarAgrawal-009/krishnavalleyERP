import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function cleanResetDB() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    console.log(`Connected to database: "${db.databaseName}"`);

    // 1. Transactional & Operational collections to completely wipe
    const collectionsToClear = [
      'leads',
      'salesleads',
      'rentalmanagements',
      'customers',
      'commissionledgers',
      'tenantpenalties',
      'maintenancebills',
      'servicerequests',
      'sitevisits',
      'calllogs',
      'auditlogs',
      'notificationlogs',
      'digitalsignatures',
      'legaldocuments',
      'purchaseorders',
      'goodsreceipts',
      'stocktransfers',
      'materialissues'
    ];

    console.log('\n--- CLEARING TRANSACTIONAL DATA ---');
    for (const colName of collectionsToClear) {
      try {
        const col = db.collection(colName);
        const countBefore = await col.countDocuments();
        if (countBefore > 0) {
          const res = await col.deleteMany({});
          console.log(`✓ Cleared ${colName}: deleted ${res.deletedCount} documents (was ${countBefore})`);
        } else {
          console.log(`- ${colName}: already empty (0 documents)`);
        }
      } catch (err) {
        console.warn(`! Could not clear ${colName}: ${err.message}`);
      }
    }

    // 2. Reset All Flats to 'available' status with zero leases/allotments
    console.log('\n--- RESETTING FLAT INVENTORY ---');
    const flatCol = db.collection('flats');
    const totalFlats = await flatCol.countDocuments();
    const updateRes = await flatCol.updateMany(
      {},
      {
        $set: {
          status: 'available',
          takenForRental: false,
          buybackCount: 0
        },
        $unset: {
          assignedOwner: '',
          assignedTenant: '',
          currentLeaseId: '',
          rentalDetails: ''
        }
      }
    );
    console.log(`✓ Reset all ${totalFlats} flats: ${updateRes.modifiedCount} updated to status "available" (takenForRental = false)`);

    // 3. Keep Default Seed for Auth & Notification Templates intact
    console.log('\n--- RE-VERIFYING AUTH & ROLES ---');
    const { seedAuthDefaults } = await import('../utils/seedAuth.js');
    await seedAuthDefaults();

    // 4. Print final database summary
    console.log('\n--- FINAL DATABASE SUMMARY ---');
    const collections = await db.listCollections().toArray();
    for (const c of collections.sort((a, b) => a.name.localeCompare(b.name))) {
      const count = await db.collection(c.name).countDocuments();
      console.log(`  ${c.name.padEnd(25)}: ${count} documents`);
    }

    console.log('\n✅ Clean Reset Completed Successfully! All test data wiped & inventory reset to AVAILABLE.\n');
    process.exit(0);
  } catch (error) {
    console.error('Fatal error during clean reset:', error);
    process.exit(1);
  }
}

cleanResetDB();
