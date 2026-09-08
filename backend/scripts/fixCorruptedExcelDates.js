import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Flat from '../models/Flat.js';
import Customer from '../models/Customer.js';

dotenv.config();

/**
 * Convert any Excel serial number or corrupted Date (year > 3000) to a real Gregorian Date
 */
function parseAnyExcelOrCorruptedDate(val) {
  if (!val) return null;
  
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    let y = val.getFullYear();
    if (y > 3000) {
      // In IST (UTC+5:30) or UTC, the year or (UTC year + 1) was the serial number
      const serial = val.getUTCHours() > 12 ? val.getUTCFullYear() + 1 : val.getUTCFullYear();
      if (serial >= 20000 && serial <= 75000) {
        return new Date((serial - 25569) * 86400 * 1000);
      }
    }
    return val;
  }

  const num = Number(val);
  if (!isNaN(num) && num >= 20000 && num <= 75000) {
    return new Date((num - 25569) * 86400 * 1000);
  }

  const str = String(val).trim();
  if (!str || str === '—' || str === '-' || str.toLowerCase() === 'no data') return null;

  // If DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    if (d.getFullYear() > 3000) {
      const serial = d.getUTCHours() > 12 ? d.getUTCFullYear() + 1 : d.getUTCFullYear();
      if (serial >= 20000 && serial <= 75000) {
        return new Date((serial - 25569) * 86400 * 1000);
      }
    }
    return d;
  }
  return null;
}

function calculateEndDate(startDate, tenureMonths) {
  if (!startDate) return null;
  const d = new Date(startDate);
  if (isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() + Number(tenureMonths || 36));
  return d;
}

async function fixAllDates() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected.');

  const flats = await Flat.find({});
  console.log(`Found ${flats.length} total flats in database.`);

  let updatedCount = 0;

  for (const flat of flats) {
    let modified = false;

    // 1. Rental Details Dates
    if (flat.rentalDetails) {
      const origMou = flat.rentalDetails.mouDate;
      const origStart = flat.rentalDetails.startDate;
      const origEnd = flat.rentalDetails.endDate;

      const fixedMou = parseAnyExcelOrCorruptedDate(origMou);
      const fixedStart = parseAnyExcelOrCorruptedDate(origStart);

      if (fixedMou && (!origMou || new Date(origMou).getTime() !== fixedMou.getTime())) {
        flat.rentalDetails.mouDate = fixedMou;
        modified = true;
      }

      if (fixedStart && (!origStart || new Date(origStart).getTime() !== fixedStart.getTime())) {
        flat.rentalDetails.startDate = fixedStart;
        modified = true;
      }

      // Check / Fix End Date
      const tenure = Number(flat.rentalDetails.tenureMonths || 36);
      const refStart = fixedStart || parseAnyExcelOrCorruptedDate(origStart) || fixedMou;
      
      let fixedEnd = parseAnyExcelOrCorruptedDate(origEnd);
      // If end date year is > 3000 or missing, calculate from start + tenure
      if (!fixedEnd || fixedEnd.getFullYear() > 3000 || (origEnd && new Date(origEnd).getFullYear() > 3000)) {
        if (refStart) {
          fixedEnd = calculateEndDate(refStart, tenure);
        }
      }

      if (fixedEnd && (!origEnd || new Date(origEnd).getTime() !== fixedEnd.getTime())) {
        flat.rentalDetails.endDate = fixedEnd;
        modified = true;
      }

      // Re-check ledgerEntries dates if present
      if (Array.isArray(flat.rentalDetails.ledgerEntries)) {
        flat.rentalDetails.ledgerEntries.forEach((entry, idx) => {
          if (refStart && (!entry.dueDate || new Date(entry.dueDate).getFullYear() > 3000)) {
            const m = entry.monthIndex || (idx + 1);
            const d = new Date(refStart);
            d.setMonth(d.getMonth() + (m - 1));
            d.setDate(Math.min(Number(flat.rentalDetails.dueDayOfMonth || 25), 28));
            entry.dueDate = d;
            modified = true;
          }
        });
      }
    }

    // 2. Sales Details Agreement Date
    if (flat.salesDetails?.agreementDate) {
      const fixedAgreement = parseAnyExcelOrCorruptedDate(flat.salesDetails.agreementDate);
      if (fixedAgreement && fixedAgreement.getTime() !== new Date(flat.salesDetails.agreementDate).getTime()) {
        flat.salesDetails.agreementDate = fixedAgreement;
        modified = true;
      }
    }

    // 3. Current Owner Ownership Start Date
    if (flat.currentOwner?.ownershipStartDate) {
      const fixedOwnerStart = parseAnyExcelOrCorruptedDate(flat.currentOwner.ownershipStartDate);
      if (fixedOwnerStart && fixedOwnerStart.getTime() !== new Date(flat.currentOwner.ownershipStartDate).getTime()) {
        flat.currentOwner.ownershipStartDate = fixedOwnerStart;
        modified = true;
      }
    }

    // 4. Ownership History Entries
    if (Array.isArray(flat.ownershipHistory)) {
      flat.ownershipHistory.forEach((hist) => {
        if (hist.registryDate) {
          const f = parseAnyExcelOrCorruptedDate(hist.registryDate);
          if (f) hist.registryDate = f;
        }
        if (hist.startDate) {
          const f = parseAnyExcelOrCorruptedDate(hist.startDate);
          if (f) hist.startDate = f;
        }
        if (hist.endDate) {
          const f = parseAnyExcelOrCorruptedDate(hist.endDate);
          if (f) hist.endDate = f;
        }
        if (hist.transferDate) {
          const f = parseAnyExcelOrCorruptedDate(hist.transferDate);
          if (f) hist.transferDate = f;
        }
        if (hist.ownershipStartDate) {
          const f = parseAnyExcelOrCorruptedDate(hist.ownershipStartDate);
          if (f) hist.ownershipStartDate = f;
        }
        if (hist.ownershipEndDate) {
          const f = parseAnyExcelOrCorruptedDate(hist.ownershipEndDate);
          if (f) hist.ownershipEndDate = f;
        }
      });
    }

    if (modified) {
      await flat.save();
      updatedCount++;
    }
  }

  console.log(`Successfully migrated and repaired dates for ${updatedCount} flats!`);
  await mongoose.disconnect();
}

fixAllDates().catch(console.error);
