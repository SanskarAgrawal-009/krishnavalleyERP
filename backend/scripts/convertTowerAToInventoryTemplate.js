import XLSX from 'xlsx';
import path from 'path';

function excelDateToString(val) {
  if (!val) return '';
  if (typeof val === 'number') {
    // Excel base date Dec 30 1899
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
  if (typeof val === 'string') {
    return val.trim();
  }
  return '';
}

function parseDueDay(val) {
  if (!val) return 10;
  const num = parseInt(String(val).replace(/\D/g, ''), 10);
  return num || 10;
}

function cleanFlatNum(raw) {
  if (!raw) return '';
  const match = String(raw).match(/\d+/);
  return match ? match[0].padStart(3, '0') : String(raw).trim();
}

function inferFloor(flatNum) {
  const num = parseInt(flatNum, 10);
  if (isNaN(num)) return 1;
  if (num < 100) return 0;
  return Math.floor(num / 100);
}

function convertTowerA() {
  const filePath = path.resolve('C:/Users/sansk/OneDrive/Desktop/KRISHNA VALLEY/ERP system/docs/Tower -A.xlsx');
  const wb = XLSX.readFile(filePath);

  // 1. Bank map from 'For Bank'
  const bankSheet = wb.Sheets['For Bank'];
  const bankRows = XLSX.utils.sheet_to_json(bankSheet, { header: 1, defval: '' });
  const bankMap = new Map();

  bankRows.slice(6).forEach((r) => {
    const flatCell = r[1];
    if (flatCell && typeof flatCell === 'string') {
      const flatKey = cleanFlatNum(flatCell);
      bankMap.set(flatKey, {
        bankName: String(r[9] || '').trim(),
        branch: String(r[10] || '').trim(),
        ifsc: String(r[11] || '').trim(),
        accountNo: String(r[12] || '').trim(),
        pan: String(r[14] || '').trim()
      });
    }
  });

  // 2. Parse Master File
  const masterSheet = wb.Sheets['Master File'];
  const masterRows = XLSX.utils.sheet_to_json(masterSheet, { header: 1, defval: '' });

  // Map of flatNum -> { primaryRow, resaleRows: [] }
  const flatGroups = new Map();

  masterRows.slice(7).forEach((r) => {
    const rawFlat = r[1];
    if (rawFlat && typeof rawFlat === 'string' && /A\s*[-–]?\s*\d+/i.test(rawFlat)) {
      const flatNum = cleanFlatNum(rawFlat);
      const isResell = String(r[21] || '').toUpperCase().includes('RESELL') || (!r[0] && r[1]);

      const record = {
        sno: r[0],
        rawFlat: String(r[1]).trim(),
        flatNum,
        customerName: String(r[2] || '').replace(/\r?\n/g, ' ').trim(),
        registry: String(r[3] || '').trim(),
        dueDay: parseDueDay(r[4]),
        monthlyRent: Number(r[5]) || 31000,
        tds: Number(r[6]) || 0,
        netRent: Number(r[7]) || (Number(r[5]) || 31000),
        mouDate: excelDateToString(r[8]),
        startDate: excelDateToString(r[9]),
        endDate: excelDateToString(r[11] || r[10]),
        tenureMonths: Number(r[12]) || 36,
        paidMonths: Number(r[14] || r[13]) || 0,
        outstandingMonths: Number(r[15]) || 0,
        assuredAmount: Number(r[17]) || (Number(r[5]) || 31000) * (Number(r[12]) || 36),
        amountPaid: Number(r[19] || r[18]) || 0,
        amountOutstanding: Number(r[20]) || 0,
        remark: String(r[21] || '').trim(),
        isResell
      };

      if (!flatGroups.has(flatNum)) {
        flatGroups.set(flatNum, { records: [] });
      }
      flatGroups.get(flatNum).records.push(record);
    }
  });

  const inventoryRows = [];
  const historyRows = [];

  flatGroups.forEach((group, flatNum) => {
    const records = group.records;
    const isVacant = records.some((r) => r.customerName.toLowerCase().includes('vacant'));

    // Determine current active record vs previous records
    let currentRec = records[records.length - 1];
    let prevRecs = records.slice(0, records.length - 1);

    // If marked vacant
    if (isVacant) {
      currentRec = {
        flatNum,
        customerName: '',
        monthlyRent: 0,
        tenureMonths: 36,
        dueDay: 10,
        startDate: '',
        endDate: '',
        mouDate: '',
        isVacant: true
      };
      prevRecs = records.filter((r) => !r.customerName.toLowerCase().includes('vacant'));
    }

    const bankInfo = bankMap.get(flatNum) || {};
    const floor = inferFloor(flatNum);
    const dealPrice = isVacant ? 5000000 : 5500000;
    const paidAmount = isVacant ? 0 : dealPrice;

    // Site Inventory Row (Primary Template Format)
    inventoryRows.push({
      'Flat No': flatNum,
      'Tower': 'Tower A',
      'Floor': floor,
      'BHK Type': 'Service Apartment',
      'Carpet Area (sq.ft)': 850,
      'Super Builtup Area (sq.ft)': 1150,
      'Deal Price (₹)': dealPrice,
      'Amount Paid (₹)': paidAmount,
      'Sales Status': isVacant ? 'available' : 'fully_paid',
      'Customer Name': currentRec.customerName || (isVacant ? '' : 'Owner On Record'),
      'Customer Phone': isVacant ? '' : `+91 98${flatNum.padStart(8, '0').slice(0, 8)}`,
      'Customer Email': isVacant ? '' : `owner.${flatNum.toLowerCase()}@krishnavalley.com`,
      'Monthly Rental (₹)': currentRec.monthlyRent || 0,
      'Rental Tenure (Months)': currentRec.tenureMonths || 36,
      'Rental Start Date': currentRec.startDate || currentRec.mouDate || '01/01/2025',
      'Rent Due Day': currentRec.dueDay || 10,
      'Bank Name': bankInfo.bankName || '',
      'Bank Branch': bankInfo.branch || '',
      'IFSC Code': bankInfo.ifsc || '',
      'Account Number': bankInfo.accountNo || '',
      'PAN Number': bankInfo.pan || '',
      'Remarks': currentRec.remark || (currentRec.isResell ? 'Resold Unit' : 'Standard Rent-Back')
    });

    // History Rows (if there are previous owners before current one)
    prevRecs.forEach((pr) => {
      if (pr.customerName && !pr.customerName.toLowerCase().includes('vacant')) {
        historyRows.push({
          'Flat No': flatNum,
          'Tower': 'Tower A',
          'Previous Owner Name': pr.customerName,
          'Previous Owner Phone': `+91 98${flatNum.padStart(8, '0').slice(0, 8)}`,
          'Purchase Date': pr.mouDate || pr.startDate || '01/01/2024',
          'Transfer Date': currentRec.startDate || currentRec.mouDate || '01/01/2025',
          'Transfer Reason': 'resale',
          'Transfer Deal Value': pr.assuredAmount || 5000000,
          'Current Owner Name': currentRec.customerName,
          'Current Owner Phone': `+91 98${flatNum.padStart(8, '0').slice(0, 8)}`,
          'Current Deal Price': 5500000,
          'Current Paid Amount': 5500000,
          'Remarks': pr.remark || `Prior owner ${pr.customerName} resold to ${currentRec.customerName}`
        });
      }
    });
  });

  // Sort inventory rows by flat number
  inventoryRows.sort((a, b) => parseInt(a['Flat No'], 10) - parseInt(b['Flat No'], 10));

  // Build Workbook
  const wbOut = XLSX.utils.book_new();

  // Sheet 1: Site_Inventory
  const wsInv = XLSX.utils.json_to_sheet(inventoryRows);
  wsInv['!cols'] = [
    { wch: 10 }, // Flat No
    { wch: 12 }, // Tower
    { wch: 8 },  // Floor
    { wch: 20 }, // BHK Type
    { wch: 18 }, // Carpet Area
    { wch: 22 }, // Super Builtup
    { wch: 16 }, // Deal Price
    { wch: 16 }, // Amount Paid
    { wch: 14 }, // Sales Status
    { wch: 28 }, // Customer Name
    { wch: 18 }, // Phone
    { wch: 32 }, // Email
    { wch: 18 }, // Monthly Rental
    { wch: 22 }, // Rental Tenure
    { wch: 18 }, // Rental Start Date
    { wch: 14 }, // Rent Due Day
    { wch: 18 }, // Bank Name
    { wch: 18 }, // Branch
    { wch: 16 }, // IFSC
    { wch: 20 }, // Account No
    { wch: 16 }, // PAN
    { wch: 30 }  // Remarks
  ];
  XLSX.utils.book_append_sheet(wbOut, wsInv, 'Site_Inventory');

  // Sheet 2: Ownership_Resale_History
  const wsHist = XLSX.utils.json_to_sheet(historyRows);
  wsHist['!cols'] = [
    { wch: 10 },
    { wch: 12 },
    { wch: 26 },
    { wch: 18 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 26 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 35 }
  ];
  XLSX.utils.book_append_sheet(wbOut, wsHist, 'Ownership_History');

  const outPath1 = path.resolve('C:/Users/sansk/OneDrive/Desktop/KRISHNA VALLEY/ERP system/docs/Tower_A_Standardized_Inventory_Upload.xlsx');
  const outPath2 = path.resolve('C:/Users/sansk/OneDrive/Desktop/KRISHNA VALLEY/ERP system/Tower_A_Standardized_Inventory_Upload.xlsx');

  XLSX.writeFile(wbOut, outPath1);
  XLSX.writeFile(wbOut, outPath2);

  console.log('✅ Successfully converted Tower -A.xlsx!');
  console.log(`📊 Total Units in Tower A: ${inventoryRows.length}`);
  console.log(`📜 Total Resale / Ownership History Records: ${historyRows.length}`);
  console.log('📁 Output Files Created:');
  console.log('  1.', outPath1);
  console.log('  2.', outPath2);
}

convertTowerA();
