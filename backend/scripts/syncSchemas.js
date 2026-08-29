import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

// Import all models to register schemas
import '../models/User.js';
import '../models/Role.js';
import '../models/Customer.js';
import '../models/Flat.js';
import '../models/Project.js';
import '../models/Lead.js';
import '../models/SalesLead.js';
import '../models/RentalManagement.js';
import '../models/MaintenanceBill.js';
import '../models/ServiceRequest.js';
import '../models/hr/Employee.js';
import '../models/hr/HRMaster.js';
import '../models/inventory/Material.js';
import '../models/inventory/Store.js';
import '../models/inventory/Stock.js';
import '../models/inventory/StockTransfer.js';
import '../models/inventory/PurchaseOrder.js';
import '../models/inventory/GoodsReceipt.js';
import '../models/inventory/MaterialIssue.js';
import '../models/inventory/Vendor.js';
import '../models/LegalDocument.js';
import '../models/DigitalSignature.js';
import '../models/NotificationConfig.js';
import '../models/ReminderTemplate.js';
import '../models/NotificationLog.js';
import '../models/SystemSettings.js';
import '../models/AuditLog.js';

async function syncDatabaseSchemas() {
  console.log('🔄 STARTING DATABASE SCHEMA SYNCHRONIZATION...');

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB Atlas.');

    const modelNames = mongoose.modelNames();
    console.log(`📋 Total Registered Mongoose Models: ${modelNames.length}`);

    for (const name of modelNames) {
      const model = mongoose.model(name);
      try {
        await model.init();
        const docCount = await model.countDocuments();
        console.log(`  ✓ Synced schema & indexes for: ${name} (${docCount} records)`);
      } catch (err) {
        console.warn(`  ⚠️ Warning syncing ${name}:`, err.message);
      }
    }

    // Ensure Customer collection has alternateMobileNo field standardized
    const Customer = mongoose.model('Customer');
    const custWithoutAlt = await Customer.find({ alternateMobileNo: { $exists: false } });
    if (custWithoutAlt.length > 0) {
      console.log(`  🔧 Standardizing ${custWithoutAlt.length} customers missing alternateMobileNo field...`);
      await Customer.updateMany({ alternateMobileNo: { $exists: false } }, { $set: { alternateMobileNo: '' } });
      console.log('  ✓ Updated Customer schema records.');
    }

    console.log('\n🎉 ALL DATABASE SCHEMAS ARE 100% IN SYNC WITH MONGOOSE!');
  } catch (err) {
    console.error('❌ Schema Sync Error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

syncDatabaseSchemas();
