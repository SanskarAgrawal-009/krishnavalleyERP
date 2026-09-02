import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch {}

import XLSX from 'xlsx';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from '../config/db.js';
import Flat from '../models/Flat.js';
import Customer from '../models/Customer.js';
import RentalManagement from '../models/RentalManagement.js';

async function testImport() {
  try {
    await connectDB();
    const filePath = 'C:/Users/sansk/OneDrive/Desktop/KRISHNA VALLEY/ERP system/docs/A - 001 Ved Prakash Agarwal.xlsx';
    const wb = XLSX.readFile(filePath);
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    console.log(`Parsing Excel Sheet: "${sheetName}"`);

    // Extract Header Info
    // Row 3: Name / Date of MOU
    // Row 4: Flat No. / Payment Starts ON
    // Row 5: Tower / Payment Ends ON
    // Row 6: Actual Due Date / Due Date as per MOU
    const ownerName = rawRows[2]?.[2] || 'Ved Prakash Agarwal';
    const mouDateStr = rawRows[2]?.[7] || '14/06/2025';
    const flatNo = String(rawRows[3]?.[2] || '001').trim();
    const startDateStr = rawRows[3]?.[7] || '25/07/2025';
    const tower = rawRows[4]?.[2] || 'A';
    const endDateStr = rawRows[4]?.[7] || '25/06/2028';
    const dueDayStr = String(rawRows[5]?.[7] || '25th').replace(/\D/g, '') || '25';

    console.log(`Metadata Extracted:`);
    console.log(`  Owner: ${ownerName}`);
    console.log(`  Flat No: ${flatNo} (Tower ${tower})`);
    console.log(`  MOU Date: ${mouDateStr}`);
    console.log(`  Payment Period: ${startDateStr} to ${endDateStr}`);
    console.log(`  Due Day: ${dueDayStr}th of every month\n`);

    // Parse Month Rows (Rows 9 to 44 = 36 months)
    const entries = [];
    for (let r = 8; r < 44; r++) {
      const row = rawRows[r] || [];
      const sNo = row[0];
      if (typeof sNo === 'number' && sNo >= 1 && sNo <= 36) {
        const pDate = row[1];
        const pMode = String(row[2] || 'NEFT').trim();
        const amountPaid = Number(row[3]) || 0;
        const tds = Number(row[4]) || 0;
        const netPaid = Number(row[5]) || 0;
        const remark = String(row[6] || '').trim();

        entries.push({
          monthIndex: sNo,
          paymentDate: pDate,
          paymentMode: pMode,
          amountPaid: amountPaid,
          tdsDeducted: tds,
          netAmountPaid: netPaid,
          remarks: remark
        });
      }
    }

    console.log(`Parsed ${entries.length} monthly ledger rows.`);
    const paidRows = entries.filter(e => e.amountPaid > 0);
    console.log(`Found ${paidRows.length} paid months totaling ₹${paidRows.reduce((s, r) => s + r.amountPaid, 0).toLocaleString('en-IN')}.\n`);

    // Now let's save this into MongoDB RentalManagement
    const flat = await Flat.findOne({ flatNumber: flatNo });
    if (!flat) {
      console.error(`Flat ${flatNo} not found in DB!`);
      process.exit(1);
    }

    // Owner Customer
    let owner = await Customer.findOne({ name: new RegExp(`^${ownerName}$`, 'i'), customerType: 'owner' });
    if (!owner) {
      owner = new Customer({
        customerType: 'owner',
        name: ownerName,
        mobileNo: '+91 9897123456',
        ownerDetails: { propertyIds: [flat._id], ownershipType: 'individual', ownershipPercentage: 100 },
        status: 'active'
      });
      await owner.save();
    }

    const mRent = 31000;
    const tenure = 36;
    const totalTenure = mRent * tenure; // 11,16,000

    const scheduleEntries = [];
    let cumPaid = 0;

    for (let i = 1; i <= tenure; i++) {
      const uEntry = entries.find(e => e.monthIndex === i);
      const isPaid = uEntry && uEntry.amountPaid > 0;
      const actualPaid = isPaid ? uEntry.amountPaid : 0;
      cumPaid += actualPaid;

      // Due date: 25th of month i starting from July 2025
      const dueDate = new Date(2025, 6 + (i - 1), 25);
      let pDate = null;
      if (uEntry?.paymentDate) {
        const parts = String(uEntry.paymentDate).split('/');
        if (parts.length === 3) {
          pDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        }
      }

      scheduleEntries.push({
        monthIndex: i,
        dueDate,
        paymentDate: pDate,
        paymentMode: uEntry?.paymentMode || 'NEFT',
        referenceNumber: isPaid ? `NEFT-PASS-${flatNo}-M${i}` : '',
        grossAmount: mRent,
        tdsDeducted: uEntry?.tdsDeducted || 0,
        netAmountPaid: isPaid ? (uEntry.netAmountPaid || mRent) : 0,
        cumulativePaid: cumPaid,
        remainingTenureBalance: Math.max(0, totalTenure - cumPaid),
        status: isPaid ? 'paid' : 'upcoming',
        remarks: uEntry?.remarks || ''
      });
    }

    let rental = await RentalManagement.findOne({ flatId: flat._id });
    if (!rental) {
      rental = new RentalManagement({
        projectId: flat.projectId,
        buildingId: flat.buildingId,
        flatId: flat._id,
        flatIds: [flat._id],
        ownerId: owner._id,
        status: 'rent_back_active'
      });
    }

    rental.ownerId = owner._id;
    rental.rentBack = {
      enabled: true,
      agreementNumber: `RB-001-2025`,
      mouDate: new Date(2025, 5, 14),
      startDate: new Date(2025, 6, 25),
      endDate: new Date(2028, 5, 25),
      monthlyRent: mRent,
      rentDueDay: 25,
      status: 'active'
    };

    rental.rentBackLedger = {
      mouDate: new Date(2025, 5, 14),
      startDate: new Date(2025, 6, 25),
      endDate: new Date(2028, 5, 25),
      dueDay: 25,
      tenureMonths: 36,
      monthlyRent: mRent,
      totalTenureAmount: totalTenure,
      totalPaidToOwner: cumPaid,
      remainingPayableToOwner: Math.max(0, totalTenure - cumPaid),
      entries: scheduleEntries
    };

    rental.status = 'rent_back_active';
    await rental.save();

    flat.isSold = true;
    flat.takenForRental = true;
    flat.status = 'leased';
    await flat.save();

    console.log('✅ Successfully imported Flat 001 (Ved Prakash Agarwal) Rental Ledger!');
    console.log(`  Total 36-Month Commitment: ₹${totalTenure.toLocaleString('en-IN')}`);
    console.log(`  Total Paid to Owner (13 Mos): ₹${cumPaid.toLocaleString('en-IN')}`);
    console.log(`  Remaining Balance Payable:   ₹${rental.rentBackLedger.remainingPayableToOwner.toLocaleString('en-IN')}`);

    process.exit(0);
  } catch (err) {
    console.error('Error importing:', err);
    process.exit(1);
  }
}

testImport();
