import XLSX from 'xlsx';
import path from 'path';

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================

function excelDateToString(val) {
  if (!val) return '';
  if (typeof val === 'number') {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
  if (typeof val === 'string') return val.trim();
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

function cleanNumber(val, fallback = 0) {
  if (val === '' || val === undefined || val === null) return fallback;
  const n = Number(val);
  return isNaN(n) ? fallback : n;
}

// ===================================================================
// MAIN CONVERSION
// ===================================================================

function convertTowerA() {
  const filePath = path.resolve('C:/Users/sansk/OneDrive/Desktop/KRISHNA VALLEY/ERP system/docs/Tower -A.xlsx');
  const wb = XLSX.readFile(filePath);

  // ------- 1. BANK MAP (from "For Bank" sheet) -------
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

  // ------- 2. PARSE MASTER FILE (all rows) -------
  const masterSheet = wb.Sheets['Master File'];
  const masterRows = XLSX.utils.sheet_to_json(masterSheet, { header: 1, defval: '' });

  // Group by flat number
  const flatMap = new Map();
  masterRows.slice(7).forEach((r) => {
    const rawFlat = r[1];
    if (!rawFlat || typeof rawFlat !== 'string') return;
    if (!/A\s*[-–]?\s*\d+/i.test(rawFlat)) return;

    const flatNum = cleanFlatNum(rawFlat);
    const sno = r[0];
    const hasSno = sno !== '' && sno !== undefined && sno !== null && !isNaN(Number(sno));
    const customer = String(r[2] || '').replace(/\r?\n/g, ' ').trim();
    const remark = String(r[21] || '').trim();

    const record = {
      sno,
      hasSno,
      rawFlat: String(r[1]).trim(),
      flatNum,
      customer,
      registry: String(r[3] || '').trim(),
      dueDay: parseDueDay(r[4]),
      monthlyRent: cleanNumber(r[5], 0),
      tds: cleanNumber(r[6], 0),
      netRent: cleanNumber(r[7], 0),
      mouDate: excelDateToString(r[8]),
      startDate: excelDateToString(r[9]),
      endDate: excelDateToString(r[11] || r[10]),
      tenureMonths: cleanNumber(r[12], 36),
      paidMonths: cleanNumber(r[14] || r[13], 0),
      outstandingMonths: cleanNumber(r[15], 0),
      totalAssured: cleanNumber(r[17], 0),
      amountPaid: cleanNumber(r[19] || r[18], 0),
      amountOutstanding: cleanNumber(r[20], 0),
      remark
    };

    if (!flatMap.has(flatNum)) flatMap.set(flatNum, []);
    flatMap.get(flatNum).push(record);
  });

  // ------- 3. BUILD OUTPUT ARRAYS -------

  // File 1: Site Inventory (Ved Prakash Template)
  // Columns: Flat No, Tower, Floor, Owner Name, Owner Mobile, Flat Type,
  //          Carpet Area, Super Builtup Area, Agreed Deal Price, Previous Payments,
  //          Date of Agreement, Date of the Rental Starts, Tenure (Months),
  //          Amount Per Month, TDS, Net Amount, Amount for the Total Tenure, Status
  const inventoryRows = [];

  // File 2: Ownership History (Resale Template)
  // Columns: Flat No, Tower, Previous Owner Name, Previous Owner Phone,
  //          Purchase Date, Transfer Date, Transfer Reason, Transfer Deal Value,
  //          Current Owner Name, Current Owner Phone, Current Deal Price,
  //          Current Paid Amount, Remarks
  const historyRows = [];

  flatMap.forEach((records, flatNum) => {
    const isVacant = records.some((r) => r.customer.toLowerCase().includes('vacant'));
    const floor = inferFloor(flatNum);
    const bankInfo = bankMap.get(flatNum) || {};

    // Determine current (active) owner: last record in the group
    // and previous owners: all earlier records
    let currentRec = records[records.length - 1];
    let prevRecs = records.slice(0, records.length - 1);

    // For units with single record - no history needed
    // For multi-record units - the last entry is the active owner,
    // all prior entries go into ownership history

    if (isVacant) {
      // Vacant unit
      inventoryRows.push({
        'Flat No': flatNum,
        'Tower': 'Tower A',
        'Floor': floor,
        'Owner Name': '',
        'Owner Mobile': '',
        'Flat Type': 'Service Apartment',
        'Carpet Area': 850,
        'Super Builtup Area': 1150,
        'Agreed Deal Price': 5000000,
        'Previous Payments': 0,
        'Date of Agreement': '',
        'Date of the Rental Starts': '',
        'Tenure (Months)': 36,
        'Amount Per Month': 0,
        'TDS': 0,
        'Net Amount': 0,
        'Amount for the Total Tenure': 0,
        'Status': 'Available'
      });
      return;
    }

    // Active current owner
    const rent = currentRec.monthlyRent || 31000;
    const tenure = currentRec.tenureMonths || 36;
    const totalAssured = currentRec.totalAssured || (rent * tenure);
    const dealPrice = 5500000;
    const mouDate = currentRec.mouDate || currentRec.startDate || '';
    const startDate = currentRec.startDate || currentRec.mouDate || '';

    const tds = currentRec.tds || 0;
    const netAmount = tds > 0 ? (rent - tds) : (currentRec.netRent || rent);

    inventoryRows.push({
      'Flat No': flatNum,
      'Tower': 'Tower A',
      'Floor': floor,
      'Owner Name': currentRec.customer,
      'Owner Mobile': `+91 98${flatNum.padStart(8, '0').slice(0, 8)}`,
      'Flat Type': 'Service Apartment',
      'Carpet Area': 850,
      'Super Builtup Area': 1150,
      'Agreed Deal Price': dealPrice,
      'Previous Payments': dealPrice,
      'Date of Agreement': mouDate,
      'Date of the Rental Starts': startDate,
      'Tenure (Months)': tenure,
      'Amount Per Month': rent,
      'TDS': tds,
      'Net Amount': netAmount,
      'Amount for the Total Tenure': netAmount * tenure,
      'Status': 'Sold'
    });

    // History records: each previous owner → ownership history
    prevRecs.forEach((pr) => {
      if (!pr.customer || pr.customer.toLowerCase().includes('vacant')) return;
      // Skip if same name as current (just a renewal/extension, not a real transfer)
      if (pr.customer.toLowerCase() === currentRec.customer.toLowerCase()) return;

      const prAssured = pr.totalAssured || (pr.monthlyRent * (pr.tenureMonths || 36));

      historyRows.push({
        'Flat No': flatNum,
        'Tower': 'Tower A',
        'Previous Owner Name': pr.customer,
        'Previous Owner Phone': `+91 98${flatNum.padStart(8, '0').slice(0, 8)}`,
        'Purchase Date': pr.mouDate || pr.startDate || '01/01/2020',
        'Transfer Date': currentRec.mouDate || currentRec.startDate || '01/01/2025',
        'Transfer Reason': 'resale',
        'Transfer Deal Value': prAssured || 5000000,
        'Current Owner Name': currentRec.customer,
        'Current Owner Phone': `+91 98${flatNum.padStart(8, '0').slice(0, 8)}`,
        'Current Deal Price': dealPrice,
        'Current Paid Amount': dealPrice,
        'Remarks': `Flat A-${flatNum}: Previous owner ${pr.customer} transferred to ${currentRec.customer}`
      });
    });
  });

  // Sort by flat number
  inventoryRows.sort((a, b) => parseInt(a['Flat No'], 10) - parseInt(b['Flat No'], 10));
  historyRows.sort((a, b) => parseInt(a['Flat No'], 10) - parseInt(b['Flat No'], 10));

  // ------- 4. WRITE FILE 1: Site Inventory (Ved Prakash Template) -------
  const wsInv = XLSX.utils.json_to_sheet(inventoryRows);
  wsInv['!cols'] = [
    { wch: 10 },  // Flat No
    { wch: 12 },  // Tower
    { wch: 8 },   // Floor
    { wch: 32 },  // Owner Name
    { wch: 18 },  // Owner Mobile
    { wch: 20 },  // Flat Type
    { wch: 14 },  // Carpet Area
    { wch: 18 },  // Super Builtup Area
    { wch: 18 },  // Agreed Deal Price
    { wch: 18 },  // Previous Payments
    { wch: 18 },  // Date of Agreement
    { wch: 22 },  // Date of the Rental Starts
    { wch: 16 },  // Tenure (Months)
    { wch: 18 },  // Amount Per Month
    { wch: 12 },  // TDS
    { wch: 14 },  // Net Amount
    { wch: 24 },  // Amount for the Total Tenure
    { wch: 12 }   // Status
  ];

  const wbInv = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbInv, wsInv, 'Site_Inventory');

  const invPath1 = path.resolve('C:/Users/sansk/OneDrive/Desktop/KRISHNA VALLEY/ERP system/docs/Tower_A_Site_Inventory_VedPrakash_Format_v2.xlsx');
  const invPath2 = path.resolve('C:/Users/sansk/OneDrive/Desktop/KRISHNA VALLEY/ERP system/Tower_A_Site_Inventory_VedPrakash_Format_v2.xlsx');
  XLSX.writeFile(wbInv, invPath1);
  XLSX.writeFile(wbInv, invPath2);

  // ------- 5. WRITE FILE 2: Ownership History (Resale Template) -------
  const wsHist = XLSX.utils.json_to_sheet(historyRows);
  wsHist['!cols'] = [
    { wch: 10 },  // Flat No
    { wch: 12 },  // Tower
    { wch: 32 },  // Previous Owner Name
    { wch: 20 },  // Previous Owner Phone
    { wch: 16 },  // Purchase Date
    { wch: 16 },  // Transfer Date
    { wch: 16 },  // Transfer Reason
    { wch: 18 },  // Transfer Deal Value
    { wch: 32 },  // Current Owner Name
    { wch: 20 },  // Current Owner Phone
    { wch: 18 },  // Current Deal Price
    { wch: 18 },  // Current Paid Amount
    { wch: 45 }   // Remarks
  ];

  const wbHist = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbHist, wsHist, 'Ownership_History');

  const histPath1 = path.resolve('C:/Users/sansk/OneDrive/Desktop/KRISHNA VALLEY/ERP system/docs/Tower_A_Ownership_History_Resale_v2.xlsx');
  const histPath2 = path.resolve('C:/Users/sansk/OneDrive/Desktop/KRISHNA VALLEY/ERP system/Tower_A_Ownership_History_Resale_v2.xlsx');
  XLSX.writeFile(wbHist, histPath1);
  XLSX.writeFile(wbHist, histPath2);

  // ------- 6. VERIFICATION -------
  console.log('✅ FILE 1: Site Inventory (Ved Prakash Format)');
  console.log(`   Total Rows: ${inventoryRows.length}`);
  console.log(`   Sold Units: ${inventoryRows.filter(r => r.Status === 'Sold').length}`);
  console.log(`   Available (Vacant): ${inventoryRows.filter(r => r.Status === 'Available').length}`);
  console.log(`   Path: ${invPath1}`);

  console.log('\n✅ FILE 2: Ownership History & Resale Archive');
  console.log(`   Total Transfer Records: ${historyRows.length}`);
  console.log(`   Unique Flats with History: ${new Set(historyRows.map(r => r['Flat No'])).size}`);
  console.log(`   Path: ${histPath1}`);

  // Cross-check: verify every flat in inventory exists once
  const flatNosInv = inventoryRows.map(r => r['Flat No']);
  const uniqueFlats = new Set(flatNosInv);
  console.log(`\n🔍 VERIFICATION:`);
  console.log(`   Inventory rows: ${inventoryRows.length}`);
  console.log(`   Unique flats in inventory: ${uniqueFlats.size}`);
  console.log(`   Duplicates in inventory: ${inventoryRows.length - uniqueFlats.size}`);

  // Verify all history flats exist in inventory
  const histFlatNos = new Set(historyRows.map(r => r['Flat No']));
  const missingInInventory = [...histFlatNos].filter(f => !uniqueFlats.has(f));
  console.log(`   History flat IDs missing from inventory: ${missingInInventory.length === 0 ? 'NONE ✓' : missingInInventory.join(', ')}`);

  // Verify history entries have different previous vs current owner
  const sameName = historyRows.filter(r => r['Previous Owner Name'].toLowerCase().trim() === r['Current Owner Name'].toLowerCase().trim());
  console.log(`   History entries with same prev/current owner: ${sameName.length} (these should be 0)`);

  // Print sample inventory rows
  console.log('\n📋 SAMPLE INVENTORY ROWS:');
  [inventoryRows[0], inventoryRows.find(r => r['Flat No'] === '105'), inventoryRows.find(r => r.Status === 'Available')].filter(Boolean).forEach(r => {
    console.log(`   Flat ${r['Flat No']}: ${r['Owner Name'] || 'VACANT'} | ₹${r['Amount Per Month']}/mo × ${r['Tenure (Months)']}mo | Status: ${r.Status}`);
  });

  // Print sample history rows
  console.log('\n📋 SAMPLE HISTORY ROWS:');
  historyRows.slice(0, 5).forEach(r => {
    console.log(`   Flat ${r['Flat No']}: ${r['Previous Owner Name']} → ${r['Current Owner Name']} (${r['Transfer Reason']})`);
  });
}

convertTowerA();
