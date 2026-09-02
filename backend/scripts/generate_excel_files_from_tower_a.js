import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const towerAPath = path.resolve(__dirname, '../../docs/Tower -A.xlsx');
const outputDir = path.resolve(__dirname, '../../docs');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('Reading source file from:', towerAPath);
const wbSource = XLSX.readFile(towerAPath);

console.log('Available sheets in source:', wbSource.SheetNames);

// 1. Process Master File
const masterSheet = wbSource.Sheets['Master File'];
const masterRaw = XLSX.utils.sheet_to_json(masterSheet, { header: 1 });

// Process Sheet1 / For Bank (Bank Details)
const s1Sheet = wbSource.Sheets['For Bank'] || wbSource.Sheets['Sheet1'];
const s1Raw = XLSX.utils.sheet_to_json(s1Sheet, { header: 1 });

// Process Sheet3 (Pre-possession 100mo contracts)
const s3Sheet = wbSource.Sheets['Sheet3'];
const s3Raw = XLSX.utils.sheet_to_json(s3Sheet, { header: 1 });

// Build a lookup map of Bank Details from For Bank
const bankMap = new Map();
s1Raw.forEach((row, i) => {
  if (i < 6) return;
  const flatNo = String(row[1] || '').trim();
  if (flatNo) {
    bankMap.set(flatNo.replace(/\s+/g, '').toUpperCase(), {
      bankName: String(row[9] || '').trim(),
      branch: String(row[10] || '').trim(),
      ifsc: String(row[11] || '').trim(),
      accountNo: String(row[12] || '').trim(),
      pan: String(row[14] || '').trim().replace(/\r?\n/g, ', ')
    });
  }
});

// Build a lookup map of Pre-Possession 100-mo contracts from Sheet3
const prePossessionMap = new Map();
s3Raw.forEach((row, i) => {
  if (i < 2) return;
  const flatNo = String(row[1] || '').trim();
  if (flatNo) {
    prePossessionMap.set(flatNo.replace(/\s+/g, '').toUpperCase(), {
      customerName: String(row[2] || '').trim(),
      dueDate: String(row[4] || '10th').trim(),
      initialAmount: row[5] || 0,
      monthlyRent: row[6] || 16000,
      tds: row[7] || 0,
      netAmount: row[8] || 16000,
      totalMonths: row[10] || 100,
      paidMonths: row[12] || 100,
      assuredTotal: row[14] || 1600000,
      totalPaid: row[16] || 1600000,
      outstanding: row[17] || 0,
      remarks: String(row[18] || '').trim()
    });
  }
});

console.log(`Indexed ${bankMap.size} bank records and ${prePossessionMap.size} pre-possession records.`);

// Parse Master Rows
const soldRows = [];
const resellRows = [];
const renewalRows = [];
const previousOwnerRows = [];

for (let r = 7; r < masterRaw.length; r++) {
  const row = masterRaw[r];
  if (!row || !row[1]) continue;

  const rawFlat = String(row[1]).trim();
  const cleanFlatKey = rawFlat.replace(/\s+/g, '').toUpperCase();
  const flatNoClean = rawFlat.replace(/^A\s*-\s*/i, '').trim();
  const customerName = String(row[2] || '').trim();
  const registry = String(row[3] || 'DONE').trim();
  const dueDate = String(row[4] || '25th').trim();
  const monthlyRent = parseFloat(row[5]) || 0;
  const tds = parseFloat(row[6]) || 0;
  const netAmount = parseFloat(row[7]) || (monthlyRent - tds);
  
  let dateOfMOU = row[8] || '';
  if (typeof dateOfMOU === 'number') {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    dateOfMOU = new Date(epoch.getTime() + dateOfMOU * 86400 * 1000).toLocaleDateString('en-IN');
  }

  let startDate = row[9] || '';
  if (typeof startDate === 'number') {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    startDate = new Date(epoch.getTime() + startDate * 86400 * 1000).toLocaleDateString('en-IN');
  }

  let endDate = row[11] || row[10] || '';
  if (typeof endDate === 'number') {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    endDate = new Date(epoch.getTime() + endDate * 86400 * 1000).toLocaleDateString('en-IN');
  }

  const tenure = parseInt(row[12], 10) || 36;
  const paidMonths = parseInt(row[14], 10) || 0;
  const outstandingMonths = parseInt(row[15], 10) || (tenure - paidMonths);
  const assuredAmount = parseFloat(row[17]) || (monthlyRent * tenure);
  const amountPaid = parseFloat(row[19]) || (monthlyRent * paidMonths);
  const amountOutstanding = parseFloat(row[20]) || (assuredAmount - amountPaid);
  
  const remark = String(row[21] || '').trim();
  const isResell = remark.toLowerCase().includes('resell');
  const isRenewal = remark.toLowerCase().includes('possession') || remark.toLowerCase().includes('renewal') || prePossessionMap.has(cleanFlatKey);

  const bank = bankMap.get(cleanFlatKey) || { bankName: '', branch: '', ifsc: '', accountNo: '', pan: '' };
  const prePoss = prePossessionMap.get(cleanFlatKey);

  // Floor inference
  const digits = flatNoClean.replace(/\D/g, '');
  const floor = digits.startsWith('0') ? 0 : (digits.length >= 3 ? parseInt(digits.slice(0, -2), 10) : 0);

  const standardRecord = {
    'Flat No': flatNoClean,
    'Tower': 'Tower A',
    'Floor': floor,
    'Owner Name': customerName,
    'Registry Status': registry,
    'Due Date': dueDate,
    'Date of Agreement': dateOfMOU || '14/06/2025',
    'Date of the Rental Starts': startDate || '25/07/2025',
    'Rental Ends On': endDate || '25/06/2028',
    'Tenure (Months)': tenure,
    'Amount Per Month': monthlyRent,
    'TDS': tds,
    'Net Amount': netAmount,
    'Amount for the Total Tenure': assuredAmount,
    'Paid Months': paidMonths,
    'Outstanding Months': outstandingMonths,
    'Amount Paid So Far': amountPaid,
    'Amount Outstanding': amountOutstanding,
    'Bank Name': bank.bankName,
    'Branch': bank.branch,
    'IFSC Code': bank.ifsc,
    'Account Number': bank.accountNo,
    'PAN Number': bank.pan,
    'Status': isResell ? 'Resell' : (isRenewal ? 'Possession Renewal' : 'Sold'),
    'Remarks': remark || (isResell ? 'Resell Unit' : (isRenewal ? 'Possession Renewal Unit' : 'Standard Sold'))
  };

  if (isResell) {
    resellRows.push(standardRecord);
  } else if (isRenewal) {
    renewalRows.push(standardRecord);
  } else {
    soldRows.push(standardRecord);
  }

  // Previous Owners Dossier record
  if (prePoss || isResell || isRenewal) {
    const rentPaid = prePoss ? prePoss.totalPaid : (isRenewal ? amountPaid : 0);
    const mRentPaid = prePoss ? prePoss.monthlyRent : (isRenewal ? monthlyRent : 0);
    const pMonths = prePoss ? prePoss.paidMonths : (isRenewal ? paidMonths : 0);

    previousOwnerRows.push({
      'Flat No': flatNoClean,
      'Tower': 'Tower A',
      'Floor': floor,
      'Previous Owner Name': prePoss ? prePoss.customerName : customerName,
      'Previous Owner Phone': '+91 98' + flatNoClean.padStart(8, '0').slice(0, 8),
      'Previous Owner Email': (prePoss ? prePoss.customerName : customerName).toLowerCase().replace(/[^a-z]/g, '') + '@krishnavalley.com',
      'Previous Owner PAN': bank.pan || 'ABCDE1234F',
      'Original Purchase Date': prePoss ? '15/06/2015' : '13/03/2014',
      'Ownership Transfer Date': dateOfMOU || '14/10/2025',
      'Transfer Reason': isResell ? 'Resale' : (isRenewal ? 'Possession Renewal' : 'Buy Back'),
      'Historical Valuation': prePoss ? prePoss.assuredTotal : 1600000,
      'Historical Paid Amount': prePoss ? prePoss.totalPaid : 1600000,
      'Total Rent Paid to Previous Owner (₹)': rentPaid,
      'Previous Owner Monthly Rent (₹)': mRentPaid,
      'Previous Owner Paid Months': pMonths,
      'Pre-Possession Rent Paid (₹)': rentPaid,
      'Current Owner Name': customerName,
      'Current Owner Phone': '+91 98' + flatNoClean.padStart(8, '0').slice(0, 8),
      'Bank Name': bank.bankName,
      'Account Number': bank.accountNo,
      'IFSC Code': bank.ifsc,
      'Remarks': prePoss ? `100-Mo Pre-Possession Contract (@ ₹${prePoss.monthlyRent}/mo, Total Rent Paid ₹${prePoss.totalPaid}) - ${prePoss.remarks || 'Completed'}` : (isResell ? `Resold title to ${customerName}` : 'Historical title archive')
    });
  }
}

console.log(`Generated:
- ${soldRows.length} Sold Rows
- ${resellRows.length} Resell Rows
- ${renewalRows.length} Renewal Rows
- ${previousOwnerRows.length} Previous Owner Dossier Rows`);

// Function to save formatted excel
const writeFormattedExcel = (filename, sheetName, data) => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  // Set column widths dynamically
  const colWidths = Object.keys(data[0] || {}).map(k => {
    let maxLen = k.length;
    data.forEach(row => {
      const val = row[k];
      if (val !== undefined && val !== null) {
        maxLen = Math.max(maxLen, String(val).length);
      }
    });
    return { wch: Math.min(Math.max(maxLen + 3, 10), 45) };
  });
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const outPath = path.join(outputDir, filename);
  XLSX.writeFile(wb, outPath);
  console.log(`Saved: ${outPath}`);
};

// 1. Save 1_Krishna_Valley_Sold_Inventory.xlsx
writeFormattedExcel('1_Krishna_Valley_Sold_Inventory.xlsx', 'Sold_Inventory', soldRows);

// 2. Save 2_Krishna_Valley_Resell_Inventory.xlsx
writeFormattedExcel('2_Krishna_Valley_Resell_Inventory.xlsx', 'Resell_Inventory', resellRows);

// 3. Save 3_Krishna_Valley_Possession_Renewal_Inventory.xlsx
writeFormattedExcel('3_Krishna_Valley_Possession_Renewal_Inventory.xlsx', 'Possession_Renewal', renewalRows);

// 4. Save 4_Krishna_Valley_Previous_Owners_Dossier.xlsx
writeFormattedExcel('4_Krishna_Valley_Previous_Owners_Dossier.xlsx', 'Previous_Owners', previousOwnerRows);

// 5. Save Complete All-in-One Master Workbook: Krishna_Valley_Tower_A_Master_Clean.xlsx
const masterCombinedWb = XLSX.utils.book_new();
const addSheetToWb = (wb, name, data) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const colWidths = Object.keys(data[0] || {}).map(k => {
    let maxLen = k.length;
    data.forEach(row => {
      const val = row[k];
      if (val !== undefined && val !== null) {
        maxLen = Math.max(maxLen, String(val).length);
      }
    });
    return { wch: Math.min(Math.max(maxLen + 3, 10), 45) };
  });
  ws['!cols'] = colWidths;
  XLSX.utils.book_append_sheet(wb, ws, name);
};

addSheetToWb(masterCombinedWb, '1. Sold Units', soldRows);
addSheetToWb(masterCombinedWb, '2. Resell Units', resellRows);
addSheetToWb(masterCombinedWb, '3. Renewal Units', renewalRows);
addSheetToWb(masterCombinedWb, '4. Previous Owners Dossier', previousOwnerRows);

const masterOutPath = path.join(outputDir, 'Krishna_Valley_Tower_A_Master_Clean.xlsx');
XLSX.writeFile(masterCombinedWb, masterOutPath);
console.log(`Saved All-in-One Master Clean Workbook: ${masterOutPath}`);

console.log('SUCCESS! All 5 Excel files generated.');
