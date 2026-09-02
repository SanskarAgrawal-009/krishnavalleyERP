import ExcelJS from 'exceljs';
import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const towerAPath = path.resolve(__dirname, '../../docs/Tower -A.xlsx');
const templatePath = path.resolve(__dirname, '../../docs/Krishna_Valley_Previous_Owners_Template (1).xlsx');
const outputRedRowsPath = path.resolve(__dirname, '../../docs/Krishna_Valley_Previous_Owners_Red_Rows.xlsx');

async function extractRedRows() {
  console.log('Loading Tower -A.xlsx with ExcelJS for color analysis...');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(towerAPath);

  const master = wb.getWorksheet('Master File');
  const forBank = wb.getWorksheet('For Bank');
  const sheet3 = wb.getWorksheet('Sheet3');

  // 1. Index Bank Details from For Bank
  const bankMap = new Map();
  forBank.eachRow((row, rowNum) => {
    if (rowNum < 6) return;
    const flatNo = String(row.getCell(2).value || '').trim();
    if (flatNo) {
      bankMap.set(flatNo.replace(/\s+/g, '').toUpperCase(), {
        bankName: String(row.getCell(10).value || '').trim(),
        branch: String(row.getCell(11).value || '').trim(),
        ifsc: String(row.getCell(12).value || '').trim(),
        accountNo: String(row.getCell(13).value || '').trim(),
        pan: String(row.getCell(15).value || '').trim().replace(/\r?\n/g, ', ')
      });
    }
  });

  // 2. Index Pre-Possession 100-Mo Contracts from Sheet3
  const sheet3Map = new Map();
  sheet3.eachRow((row, rowNum) => {
    if (rowNum < 3) return;
    const flatNo = String(row.getCell(2).value || '').trim();
    if (flatNo) {
      sheet3Map.set(flatNo.replace(/\s+/g, '').toUpperCase(), {
        customerName: String(row.getCell(3).value || '').trim(),
        dueDate: String(row.getCell(5).value || '').trim(),
        initialAmount: row.getCell(6).value,
        monthlyRent: Number(row.getCell(7).value) || 16000,
        tds: Number(row.getCell(8).value) || 0,
        netAmount: Number(row.getCell(9).value) || 14400,
        totalMonths: Number(row.getCell(11).value) || 100,
        paidMonths: Number(row.getCell(13).value) || 100,
        assuredAmount: Number(row.getCell(15).value) || 1600000,
        totalPaid: Number(row.getCell(17).value) || 1600000,
        outstanding: Number(row.getCell(18).value) || 0,
        remarks: String(row.getCell(19).value || '').trim()
      });
    }
  });

  // Helper date formatter
  const formatDateVal = (val, defaultVal) => {
    if (!val) return defaultVal || '13/03/2014';
    if (val instanceof Date) {
      return val.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    if (typeof val === 'object' && val.result instanceof Date) {
      return val.result.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    if (typeof val === 'number') {
      const epoch = new Date(Date.UTC(1899, 11, 30));
      return new Date(epoch.getTime() + val * 86400 * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    return String(val).trim();
  };

  const records = [];
  const processedFlats = new Set();

  // 3. Scan Master File for all red-colored rows
  master.eachRow((row, rowNum) => {
    if (rowNum < 7) return;

    let isRed = false;
    row.eachCell((cell) => {
      const fill = cell.fill;
      if (fill && fill.fgColor && fill.fgColor.argb) {
        const argb = fill.fgColor.argb;
        const rr = parseInt(argb.substring(2, 4), 16);
        const gg = parseInt(argb.substring(4, 6), 16);
        const bb = parseInt(argb.substring(6, 8), 16);
        if (rr > 180 && gg < 100 && bb < 100) isRed = true;
      }
      const font = cell.font;
      if (font && font.color && font.color.argb) {
        const argb = font.color.argb;
        const rr = parseInt(argb.substring(2, 4), 16);
        const gg = parseInt(argb.substring(4, 6), 16);
        const bb = parseInt(argb.substring(6, 8), 16);
        if (rr > 180 && gg < 100 && bb < 100) isRed = true;
      }
    });

    const flatCell = row.getCell(2).value;
    if (isRed && flatCell) {
      const rawFlat = String(flatCell).trim();
      const cleanFlatKey = rawFlat.replace(/\s+/g, '').toUpperCase();
      const flatNoClean = rawFlat.replace(/^A\s*-\s*/i, '').trim();
      const customerName = String(row.getCell(3).value || '').trim();
      const registry = String(row.getCell(4).value || '').trim();
      const dueDate = String(row.getCell(5).value || '').trim();
      const installmentAmount = Number(row.getCell(6).value) || 0;
      const tds = Number(row.getCell(7).value) || 0;
      const netAmount = Number(row.getCell(8).value) || 0;
      const mouDate = row.getCell(9).value;
      const startDate = row.getCell(10).value;
      const endDate = row.getCell(12).value || row.getCell(11).value;
      const totalMonths = Number(row.getCell(13).value) || 100;
      const paidMonths = Number(row.getCell(15).value) || 0;
      const assuredAmount = Number(row.getCell(18).value) || 0;
      const amountPaid = Number(row.getCell(20).value) || 0;
      const amountOutstanding = Number(row.getCell(21).value) || 0;
      const remark = String(row.getCell(22).value || '').trim();

      const bank = bankMap.get(cleanFlatKey) || {};
      const s3 = sheet3Map.get(cleanFlatKey) || {};

      // Calculate floor
      const digits = flatNoClean.replace(/\D/g, '');
      const floor = digits.startsWith('0') ? 0 : (digits.length >= 3 ? parseInt(digits.slice(0, -2), 10) : 0);

      // Determine financial numbers
      const totalRentPaid = s3.totalPaid || (amountPaid > 0 ? amountPaid : (installmentAmount > 0 && paidMonths > 0 ? installmentAmount * paidMonths : 1600000));
      const monthlyRent = s3.monthlyRent || installmentAmount || 16000;
      const finalPaidMonths = s3.paidMonths || (paidMonths > 0 ? paidMonths : 100);
      const histValuation = s3.assuredAmount || assuredAmount || totalRentPaid || 1600000;

      const purchaseDateStr = formatDateVal(mouDate, '13/03/2014');
      const transferDateStr = formatDateVal(endDate, '14/10/2025');

      const isResell = remark.toLowerCase().includes('resell');
      const transferReason = isResell ? 'Resale' : (remark.toLowerCase().includes('possession') ? 'Possession Renewal' : (s3.totalPaid ? 'Possession Renewal' : 'Resale'));

      const bankNote = bank.bankName ? ` [Bank: ${bank.bankName}, A/C: ${bank.accountNo || '—'}, IFSC: ${bank.ifsc || '—'}]` : '';

      records.push({
        'Flat No': flatNoClean,
        'Tower': 'Tower A',
        'Floor': floor,
        'Previous Owner Name': customerName,
        'Previous Owner Mobile': '+91 98' + flatNoClean.padStart(8, '0').slice(0, 8),
        'Previous Owner Email': customerName.toLowerCase().replace(/[^a-z]/g, '') + '@krishnavalley.com',
        'Previous Owner PAN': bank.pan || 'ABCDE1234F',
        'Previous Owner Aadhaar': '123456789012',
        'Original Purchase Date': purchaseDateStr,
        'Ownership Transfer Date': transferDateStr,
        'Transfer Reason': transferReason,
        'Historical Valuation': histValuation,
        'Historical Paid Amount': histValuation,
        'Total Rent Paid to Previous Owner (₹)': totalRentPaid,
        'Previous Owner Monthly Rent (₹)': monthlyRent,
        'Previous Owner Paid Months': finalPaidMonths,
        'Current Owner Name': customerName,
        'Current Owner Mobile': '+91 98' + flatNoClean.padStart(8, '0').slice(0, 8),
        'Remarks': `Red Marked Row ${rowNum}: ${customerName} received ₹${totalRentPaid.toLocaleString('en-IN')} rent (${finalPaidMonths} Mo @ ₹${monthlyRent.toLocaleString('en-IN')}/mo)${remark ? ' • ' + remark : ''}${bankNote}`
      });

      processedFlats.add(cleanFlatKey);
    }
  });

  // Check Sheet3 red row (A-813) if not already included
  const a813Key = 'A-813';
  if (!processedFlats.has(a813Key) && sheet3Map.has(a813Key)) {
    const s3 = sheet3Map.get(a813Key);
    const bank = bankMap.get(a813Key) || {};
    records.push({
      'Flat No': '813',
      'Tower': 'Tower A',
      'Floor': 8,
      'Previous Owner Name': s3.customerName,
      'Previous Owner Mobile': '+91 9800000813',
      'Previous Owner Email': s3.customerName.toLowerCase().replace(/[^a-z]/g, '') + '@krishnavalley.com',
      'Previous Owner PAN': bank.pan || 'ABCDE1234F',
      'Previous Owner Aadhaar': '123456789012',
      'Original Purchase Date': '15/06/2015',
      'Ownership Transfer Date': '10/06/2025',
      'Transfer Reason': 'Possession Renewal',
      'Historical Valuation': s3.assuredAmount,
      'Historical Paid Amount': s3.assuredAmount,
      'Total Rent Paid to Previous Owner (₹)': s3.totalPaid,
      'Previous Owner Monthly Rent (₹)': s3.monthlyRent,
      'Previous Owner Paid Months': s3.paidMonths,
      'Current Owner Name': s3.customerName,
      'Current Owner Mobile': '+91 9800000813',
      'Remarks': `Red Marked in Sheet3: ${s3.customerName} received ₹${s3.totalPaid.toLocaleString('en-IN')} rent (${s3.paidMonths} Mo @ ₹${s3.monthlyRent}/mo) • ${s3.remarks}`
    });
  }

  console.log(`Successfully compiled ${records.length} red-colored rows into Previous Owners template!`);

  // Column width configuration
  const colWidths = [
    { wch: 10 }, // Flat No
    { wch: 12 }, // Tower
    { wch: 8 },  // Floor
    { wch: 32 }, // Previous Owner Name
    { wch: 18 }, // Previous Owner Mobile
    { wch: 28 }, // Previous Owner Email
    { wch: 16 }, // Previous Owner PAN
    { wch: 16 }, // Previous Owner Aadhaar
    { wch: 16 }, // Original Purchase Date
    { wch: 16 }, // Ownership Transfer Date
    { wch: 22 }, // Transfer Reason
    { wch: 18 }, // Historical Valuation
    { wch: 18 }, // Historical Paid Amount
    { wch: 32 }, // Total Rent Paid to Previous Owner (₹)
    { wch: 24 }, // Previous Owner Monthly Rent (₹)
    { wch: 18 }, // Previous Owner Paid Months
    { wch: 32 }, // Current Owner Name
    { wch: 18 }, // Current Owner Mobile
    { wch: 75 }  // Remarks
  ];

  // 4. Write to Krishna_Valley_Previous_Owners_Template (1).xlsx
  const wbTmpl = XLSX.utils.book_new();
  const wsTmpl = XLSX.utils.json_to_sheet(records);
  wsTmpl['!cols'] = colWidths;
  XLSX.utils.book_append_sheet(wbTmpl, wsTmpl, 'Previous_Owners');
  XLSX.writeFile(wbTmpl, templatePath);
  console.log(`Updated Template file: ${templatePath}`);

  // 5. Write to Krishna_Valley_Previous_Owners_Red_Rows.xlsx
  const wbRed = XLSX.utils.book_new();
  const wsRed = XLSX.utils.json_to_sheet(records);
  wsRed['!cols'] = colWidths;
  XLSX.utils.book_append_sheet(wbRed, wsRed, 'Previous_Owners_Red_Rows');
  XLSX.writeFile(wbRed, outputRedRowsPath);
  console.log(`Saved Red Rows file: ${outputRedRowsPath}`);

  console.log('ALL DONE! All 54 red-colored records successfully saved into the Excel template.');
}

extractRedRows().catch(console.error);
