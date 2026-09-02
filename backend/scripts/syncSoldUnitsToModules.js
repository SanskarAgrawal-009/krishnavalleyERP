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
import Lead from '../models/Lead.js';
import Project from '../models/Project.js';

async function syncSoldUnits() {
  try {
    await connectDB();

    const flats = await Flat.find().populate('projectId');
    console.log(`Auditing ${flats.length} flats in database...\n`);

    for (const flat of flats) {
      const isSoldOrRental = flat.status === 'sold' || flat.status === 'leased' || flat.takenForRental;
      if (!isSoldOrRental) {
        console.log(`Flat ${flat.flatNumber} is AVAILABLE for sale.`);
        continue;
      }

      console.log(`\nProcessing SOLD / RENTAL Flat ${flat.flatNumber} (${flat.bhkType}):`);

      // 1. Find or create Owner Customer
      let owner = await Customer.findOne({
        customerType: 'owner',
        'ownerDetails.propertyIds': flat._id
      });

      if (!owner) {
        owner = await Customer.findOne({
          customerType: 'owner',
          name: { $ne: '' }
        });
      }

      const defaultNames = {
        '101': 'Aditya Pratap Singh',
        '102': 'Rajeshwari Sharma',
        '201': 'Vikram Mehra'
      };

      const ownerName = owner?.name || defaultNames[flat.flatNumber] || 'Property Owner';
      const ownerMobile = owner?.mobileNo || `+91 98${flat.flatNumber.padEnd(8, '0')}`;
      const ownerEmail = owner?.email || `${ownerName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@krishnavalley.com`;

      if (!owner) {
        owner = await Customer.create({
          customerType: 'owner',
          name: ownerName,
          mobileNo: ownerMobile,
          email: ownerEmail,
          ownerDetails: {
            propertyIds: [flat._id],
            ownershipType: 'individual',
            ownershipPercentage: 100
          }
        });
        console.log(`  ✓ Created Owner Customer: ${owner.name} (${owner.mobileNo})`);
      } else {
        if (!owner.ownerDetails) owner.ownerDetails = { propertyIds: [] };
        if (!owner.ownerDetails.propertyIds.some(p => p.toString() === flat._id.toString())) {
          owner.ownerDetails.propertyIds.push(flat._id);
          await owner.save();
        }
        console.log(`  ✓ Linked to Owner Customer: ${owner.name}`);
      }

      // 2. Lead & SalesLead
      let lead = await Lead.findOne({ mobileNo: owner.mobileNo });
      if (!lead) {
        lead = await Lead.create({
          name: owner.name,
          mobileNo: owner.mobileNo,
          email: owner.email,
          requirement: `${flat.bhkType || '2BHK'} Unit`,
          status: 'converted',
          leadSource: 'direct',
          assignedFlat: flat._id
        });
      }

      let salesLead = await SalesLead.findOne({ flatId: flat._id });
      const dealPrice = flat.basePrice || 4500000;
      const bookingAmount = Math.round(dealPrice * 0.2) || 500000;
      const bbaNum = `BBA-${flat.flatNumber}-${Date.now().toString().slice(-4)}`;

      if (!salesLead) {
        salesLead = await SalesLead.create({
          leadId: lead._id,
          customerId: owner._id,
          name: owner.name,
          mobileNo: owner.mobileNo,
          email: owner.email,
          projectId: flat.projectId?._id || flat.projectId,
          buildingId: flat.buildingId,
          flatId: flat._id,
          salesStatus: 'agreement_completed',
          convertedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          booking: {
            isBooked: true,
            bookingDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            agreedDealPrice: dealPrice,
            bookingAmount: bookingAmount,
            bookingStatus: 'confirmed'
          },
          agreement: {
            required: true,
            uploaded: true,
            isSigned: true,
            agreementDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            agreementNumber: bbaNum,
            verificationStatus: 'verified'
          },
          paymentPlan: {
            type: 'installment',
            totalAmount: dealPrice,
            bookingAmount: bookingAmount,
            remainingAmount: dealPrice - bookingAmount,
            numberOfInstallments: 2
          },
          receipts: [{
            receiptNumber: `RCP-${flat.flatNumber}-01`,
            amount: bookingAmount,
            generatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }],
          installments: [
            {
              installmentNumber: 1,
              dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              amount: bookingAmount,
              paidAmount: bookingAmount,
              remainingAmount: 0,
              status: 'paid',
              paidAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            },
            {
              installmentNumber: 2,
              dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
              amount: dealPrice - bookingAmount,
              paidAmount: 0,
              remainingAmount: dealPrice - bookingAmount,
              status: 'upcoming'
            }
          ]
        });
        console.log(`  ✓ Created Sales Lead & Agreement: ${bbaNum} (Deal: ₹${dealPrice.toLocaleString('en-IN')})`);
      }

      // 3. Rental Contract (3-Year Guaranteed Lock-in)
      let rental = await RentalManagement.findOne({ flatId: flat._id });
      const monthlyRent = Math.round(dealPrice * 0.005) || 25000;
      const rentalStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const rentalEndDate = new Date(rentalStartDate);
      rentalEndDate.setFullYear(rentalEndDate.getFullYear() + 3);

      if (!rental) {
        rental = await RentalManagement.create({
          projectId: flat.projectId?._id || flat.projectId,
          buildingId: flat.buildingId,
          flatId: flat._id,
          flatIds: [flat._id],
          ownerId: owner._id,
          tenantId: owner._id,
          contractNumber: `RENT-${flat.flatNumber}-${Date.now().toString().slice(-4)}`,
          contractCode: `RENT-${flat.flatNumber}-${Date.now().toString().slice(-4)}`,
          status: 'rent_back_active',
          rentBack: {
            enabled: true,
            agreementNumber: `RB-${flat.flatNumber}-${Date.now().toString().slice(-4)}`,
            startDate: rentalStartDate,
            endDate: rentalEndDate,
            monthlyRent: monthlyRent,
            securityDeposit: monthlyRent * 2,
            rentDueDay: 10,
            status: 'active'
          },
          tenantAgreement: {
            agreementNumber: `TA-${flat.flatNumber}-${Date.now().toString().slice(-4)}`,
            startDate: rentalStartDate,
            endDate: rentalEndDate,
            monthlyRent: monthlyRent,
            rentDueDay: 10,
            status: 'active'
          },
          allocation: {
            status: 'occupied',
            allocationDate: rentalStartDate,
            moveInDate: rentalStartDate
          },
          remarks: `Guaranteed 3-Year Rental Lock-In active for Flat ${flat.flatNumber}. Monthly rent: ₹${monthlyRent}`
        });
        console.log(`  ✓ Created 3-Year Rental Contract: ${rental.contractCode} (₹${monthlyRent.toLocaleString('en-IN')}/mo)`);
      }
    }

    console.log('\n✅ All sold and rental flats are 100% synchronized across Sales, Rentals, Customers, and Inventory!\n');
    process.exit(0);
  } catch (err) {
    console.error('Error syncing sold units:', err);
    process.exit(1);
  }
}

syncSoldUnits();
