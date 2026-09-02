import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch {}

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from '../config/db.js';
import Project from '../models/Project.js';
import Flat from '../models/Flat.js';
import Customer from '../models/Customer.js';
import SalesLead from '../models/SalesLead.js';
import RentalManagement from '../models/RentalManagement.js';

async function syncUnifiedFlats() {
  try {
    await connectDB();

    // Ensure Flat 001 exists for Tower A
    let flat001 = await Flat.findOne({ flatNumber: '001' });
    const sampleFlat = await Flat.findOne();
    if (!flat001 && sampleFlat) {
      flat001 = new Flat({
        flatNumber: '001',
        projectId: sampleFlat.projectId,
        buildingId: sampleFlat.buildingId,
        floor: 0,
        bhkType: 'Service Apartment',
        carpetArea: 850,
        basePrice: 6200000,
        facing: 'East',
        status: 'leased',
        isSold: true,
        takenForRental: true
      });
      await flat001.save();
      console.log('✅ Created Flat 001 (Service Apartment) in Inventory');

      // Update Project building flats array
      const project = await Project.findById(sampleFlat.projectId);
      if (project) {
        const bld = project.buildings.id(sampleFlat.buildingId);
        if (bld && !bld.flats.includes(flat001._id)) {
          bld.flats.push(flat001._id);
          await project.save();
        }
      }

      // Link any orphaned rental for Flat 001 to this flat001._id
      const orphanedRental = await RentalManagement.findOne({
        $or: [{ 'rentBack.agreementNumber': 'MOU-001' }, { 'rentBackLedger.monthlyRent': 31000 }]
      });
      if (orphanedRental) {
        orphanedRental.flatId = flat001._id;
        orphanedRental.projectId = sampleFlat.projectId;
        orphanedRental.buildingId = sampleFlat.buildingId;
        await orphanedRental.save();
      }
    }

    const flats = await Flat.find().populate('projectId');
    console.log(`\n======================================================`);
    console.log(`      UNIFIED FLAT SCHEMA SYNCHRONIZATION ENGINE      `);
    console.log(`======================================================`);
    console.log(`Auditing and synchronizing ${flats.length} flats in database...\n`);

    for (const flat of flats) {
      console.log(`[Syncing Flat ${flat.flatNumber}]`);

      // 1. Resolve Sales Record
      const salesLead = await SalesLead.findOne({ flatId: flat._id, salesStatus: { $ne: 'cancelled' } });
      
      // 2. Resolve Rental Record
      const rental = await RentalManagement.findOne({
        $or: [{ flatId: flat._id }, { flatIds: flat._id }],
        status: { $ne: 'terminated' }
      }).populate('ownerId tenantId');

      // 3. Resolve Owner
      let owner = null;
      if (rental?.ownerId) {
        owner = rental.ownerId;
      } else if (salesLead?.mobileNo) {
        owner = await Customer.findOne({ mobileNo: salesLead.mobileNo });
      } else {
        owner = await Customer.findOne({
          customerType: 'owner',
          'ownerDetails.propertyIds': flat._id
        });
      }

      // Update Current Owner
      if (owner) {
        flat.currentOwner = {
          customerId: owner._id,
          name: owner.name,
          mobileNo: owner.mobileNo,
          email: owner.email || '',
          address: owner.address || '',
          panNumber: owner.kyc?.panNumber || '',
          aadhaarNumber: owner.kyc?.aadhaarNumber || '',
          ownershipStartDate: salesLead?.booking?.bookingDate || rental?.rentBack?.startDate || new Date(),
          ownershipType: 'individual'
        };
        console.log(`  ✓ Owner Linked: ${owner.name} (${owner.mobileNo})`);
      }

      // Update Sales Details
      if (salesLead) {
        const deal = salesLead.booking?.agreedDealPrice || salesLead.paymentPlan?.totalAmount || flat.basePrice || 4500000;
        const totalPaid = (salesLead.installments || []).reduce((sum, i) => sum + (i.paidAmount || 0), 0) || (salesLead.booking?.bookingAmount || 0);
        const balance = Math.max(0, deal - totalPaid);

        flat.salesDetails = {
          salesLeadId: salesLead._id,
          buyerName: salesLead.name,
          bookingDate: salesLead.booking?.bookingDate || new Date(),
          agreedDealPrice: deal,
          bookingAmountPaid: salesLead.booking?.bookingAmount || 0,
          totalAmountPaid: totalPaid,
          balanceAmountDue: balance,
          paymentPlanType: salesLead.paymentPlan?.type || 'installment',
          agreementNumber: salesLead.agreement?.agreementNumber || `AGR-${flat.flatNumber}`,
          agreementDate: salesLead.agreement?.agreementDate || new Date(),
          agreementVerificationStatus: salesLead.agreement?.verificationStatus || 'verified',
          possessionStatus: salesLead.possession?.status || 'ready',
          possessionDate: salesLead.possession?.handoverDate || new Date(),
          salesStatus: salesLead.salesStatus || 'agreement_completed'
        };
        flat.isSold = true;
        console.log(`  ✓ Sales Allotment: Deal ₹${deal.toLocaleString('en-IN')}, Paid: ₹${totalPaid.toLocaleString('en-IN')}, Balance: ₹${balance.toLocaleString('en-IN')}`);
      } else {
        flat.isSold = false;
      }

      // Update Rental Details
      if (rental && rental.rentBack?.enabled) {
        const ledger = rental.rentBackLedger || {};
        const mRent = ledger.monthlyRent || rental.rentBack?.monthlyRent || 25000;
        const totalCommitment = ledger.totalTenureAmount || (mRent * 36);
        const totalPaid = ledger.totalPaidToOwner || 0;
        const remaining = ledger.remainingPayableToOwner !== undefined ? ledger.remainingPayableToOwner : Math.max(0, totalCommitment - totalPaid);

        flat.rentalDetails = {
          rentalContractId: rental._id,
          isRentBackActive: true,
          mouNumber: rental.rentBack?.agreementNumber || `MOU-${flat.flatNumber}`,
          mouDate: ledger.mouDate || rental.rentBack?.mouDate || new Date('2025-06-14'),
          startDate: ledger.startDate || rental.rentBack?.startDate || new Date('2025-07-25'),
          endDate: ledger.endDate || rental.rentBack?.endDate || new Date('2028-06-25'),
          tenureMonths: ledger.tenureMonths || 36,
          dueDayOfMonth: ledger.dueDay || rental.rentBack?.rentDueDay || 25,
          guaranteedMonthlyRent: mRent,
          total36MonthCommitment: totalCommitment,
          totalDisbursedToOwner: totalPaid,
          remainingPayableToOwner: remaining,
          ledgerEntries: (ledger.entries || []).map(e => ({
            monthIndex: e.monthIndex,
            dueDate: e.dueDate,
            paymentDate: e.paymentDate,
            paymentMode: e.paymentMode || 'NEFT',
            referenceNumber: e.referenceNumber || '',
            grossAmount: e.grossAmount || mRent,
            tdsDeducted: e.tdsDeducted || 0,
            netAmountPaid: e.netAmountPaid || 0,
            cumulativePaid: e.cumulativePaid || 0,
            remainingTenureBalance: e.remainingTenureBalance || totalCommitment,
            status: e.status || 'upcoming',
            remarks: e.remarks || ''
          }))
        };
        flat.takenForRental = true;
        flat.status = 'leased';
        console.log(`  ✓ 36-Month Rental Ledger: Rent ₹${mRent.toLocaleString('en-IN')}/mo, 3-Yr Commitment: ₹${totalCommitment.toLocaleString('en-IN')}, Disbursed: ₹${totalPaid.toLocaleString('en-IN')}`);
      }

      // Maintenance Config
      flat.maintenanceDetails = {
        monthlyMaintenanceFee: 2000,
        billingCycle: 'monthly',
        lastBilledDate: new Date(),
        outstandingMaintenanceDue: 0,
        maintenanceStatus: 'paid'
      };

      await flat.save();
      console.log(`  ✅ Flat ${flat.flatNumber} Unified Document Saved Successfully!\n`);
    }

    console.log('======================================================');
    console.log('✅ ALL FLATS FULLY SYNCHRONIZED UNDER UNIFIED SCHEMA!');
    console.log('======================================================');
    process.exit(0);
  } catch (err) {
    console.error('Error during synchronization:', err);
    process.exit(1);
  }
}

syncUnifiedFlats();
