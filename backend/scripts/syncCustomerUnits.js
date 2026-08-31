import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Customer from '../models/Customer.js';
import SalesLead from '../models/SalesLead.js';
import RentalManagement from '../models/RentalManagement.js';
import Flat from '../models/Flat.js';
import Project from '../models/Project.js';

dotenv.config();

async function runSync() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const customers = await Customer.find();
  console.log(`Found ${customers.length} customer records.`);

  for (const cust of customers) {
    let modified = false;

    // 1. If owner, check if there are sales leads or rentals linked to this mobileNo or customer ID
    if (cust.customerType === 'owner') {
      let existingPropIds = (cust.ownerDetails?.propertyIds || []).map(p => (p._id || p).toString());
      const uniqueIds = new Set(existingPropIds);

      const sales = await SalesLead.find({ mobileNo: cust.mobileNo });
      for (const s of sales) {
        if (s.flatId) {
          uniqueIds.add(s.flatId.toString());
        }
      }

      const rentals = await RentalManagement.find({ ownerId: cust._id });
      for (const r of rentals) {
        if (r.flatId) {
          uniqueIds.add(r.flatId.toString());
        }
        if (Array.isArray(r.flatIds)) {
          for (const fId of r.flatIds) {
            if (fId) {
              uniqueIds.add(fId.toString());
            }
          }
        }
      }

      const finalPropIds = Array.from(uniqueIds);
      if (finalPropIds.length !== existingPropIds.length || finalPropIds.some((id, idx) => id !== existingPropIds[idx])) {
        if (!cust.ownerDetails) {
          cust.ownerDetails = { propertyIds: finalPropIds, ownershipType: 'individual', ownershipPercentage: 100 };
        } else {
          cust.ownerDetails.propertyIds = finalPropIds;
        }
        modified = true;
        console.log(`Updated owner ${cust.name}: now has ${finalPropIds.length} properties.`);
      }
    }

    // 2. If tenant, check if rental contracts exist for this tenant
    if (cust.customerType === 'tenant') {
      if (!cust.tenantDetails?.rentalDetails?.flatId) {
        const rental = await RentalManagement.findOne({ tenantId: cust._id }).sort({ createdAt: -1 });
        if (rental && rental.flatId) {
          if (!cust.tenantDetails) cust.tenantDetails = {};
          if (!cust.tenantDetails.rentalDetails) cust.tenantDetails.rentalDetails = {};
          cust.tenantDetails.rentalDetails.flatId = rental.flatId;
          cust.tenantDetails.rentalDetails.monthlyRent = rental.tenantAgreement?.monthlyRent || 0;
          cust.tenantDetails.rentalDetails.securityDeposit = rental.securityDeposit?.tenantDeposit?.requiredAmount || 0;
          cust.tenantDetails.rentalDetails.rentDueDay = rental.tenantAgreement?.rentDueDay || 5;
          cust.tenantDetails.rentalDetails.leaseStartDate = rental.tenantAgreement?.startDate || new Date();
          cust.tenantDetails.rentalDetails.leaseEndDate = rental.tenantAgreement?.endDate || null;
          modified = true;
          console.log(`Updated tenant ${cust.name}: linked flat ${rental.flatId}`);
        }
      }
    }

    if (modified) {
      await cust.save();
    }
  }

  // Check results
  const checkAfter = await Customer.find()
    .populate({
      path: 'ownerDetails.propertyIds',
      select: 'flatNumber status projectId floor bhkType',
      populate: { path: 'projectId', select: 'projectName' }
    })
    .populate({
      path: 'tenantDetails.rentalDetails.flatId',
      select: 'flatNumber status projectId floor bhkType',
      populate: { path: 'projectId', select: 'projectName' }
    });

  console.log('\n--- VERIFICATION AFTER SYNC ---');
  for (const c of checkAfter) {
    const ownerUnits = c.ownerDetails?.propertyIds || [];
    const tenantFlat = c.tenantDetails?.rentalDetails?.flatId;
    const units = c.customerType === 'owner' ? ownerUnits : (tenantFlat ? [tenantFlat] : []);
    console.log(`${c.name} (${c.customerType}) -> ${units.length} unit(s):`, units.map(u => u.flatNumber || u._id));
  }

  process.exit(0);
}

runSync().catch(err => {
  console.error('Sync error:', err);
  process.exit(1);
});
