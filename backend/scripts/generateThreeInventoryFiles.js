import XLSX from 'xlsx';
import path from 'path';

function generateFiles() {
  const invPath = path.resolve('C:/Users/sansk/OneDrive/Desktop/KRISHNA VALLEY/ERP system/docs/Tower_A_Site_Inventory_VedPrakash_Format_v2.xlsx');
  const histPath = path.resolve('C:/Users/sansk/OneDrive/Desktop/KRISHNA VALLEY/ERP system/docs/Tower_A_Ownership_History_Resale_v2.xlsx');

  const invWb = XLSX.readFile(invPath);
  const histWb = XLSX.readFile(histPath);

  const allInvRows = XLSX.utils.sheet_to_json(invWb.Sheets['Site_Inventory']);
  const allHistRows = XLSX.utils.sheet_to_json(histWb.Sheets['Ownership_History']);

  const invCols = [
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
    { wch: 20 }   // Status
  ];

  const histCols = [
    { wch: 10 },  // Flat No
    { wch: 12 },  // Tower
    { wch: 32 },  // Previous Owner Name
    { wch: 20 },  // Previous Owner Phone
    { wch: 16 },  // Purchase Date
    { wch: 16 },  // Transfer Date
    { wch: 22 },  // Transfer Reason
    { wch: 18 },  // Transfer Deal Value
    { wch: 32 },  // Current Owner Name
    { wch: 20 },  // Current Owner Phone
    { wch: 18 },  // Current Deal Price
    { wch: 18 },  // Current Paid Amount
    { wch: 55 }   // Remarks
  ];

  // =========================================================================
  // FILE 1: STANDARD SOLD INVENTORY (126 Flats)
  // =========================================================================
  const soldRows = allInvRows.filter(r => r.Status === 'Sold' || r.Status === 'Available');
  soldRows.sort((a, b) => parseInt(a['Flat No'], 10) - parseInt(b['Flat No'], 10));

  const wbSold = XLSX.utils.book_new();
  const wsSold = XLSX.utils.json_to_sheet(soldRows);
  wsSold['!cols'] = invCols;
  XLSX.utils.book_append_sheet(wbSold, wsSold, 'Site_Inventory');

  const soldOut1 = path.resolve('C:/Users/sansk/OneDrive/Desktop/KRISHNA VALLEY/ERP system/docs/Tower_A_Inventory_1_Sold.xlsx');
  const soldOut2 = path.resolve('C:/Users/sansk/OneDrive/Desktop/KRISHNA VALLEY/ERP system/Tower_A_Inventory_1_Sold.xlsx');
  XLSX.writeFile(wbSold, soldOut1);
  XLSX.writeFile(wbSold, soldOut2);
  console.log(`✅ File 1: Sold Inventory written (${soldRows.length} units) -> ${soldOut1}`);

  // =========================================================================
  // FILE 2: RESELL INVENTORY & CHAIN OF TITLE (29 Flats + 29 History Records)
  // =========================================================================
  const resellInvRows = allInvRows.filter(r => r.Status === 'Resell');
  resellInvRows.sort((a, b) => parseInt(a['Flat No'], 10) - parseInt(b['Flat No'], 10));

  const resellHistRows = allHistRows.filter(r => r['Transfer Reason'] === 'resale');
  resellHistRows.sort((a, b) => parseInt(a['Flat No'], 10) - parseInt(b['Flat No'], 10));

  const wbResell = XLSX.utils.book_new();
  const wsResellInv = XLSX.utils.json_to_sheet(resellInvRows);
  wsResellInv['!cols'] = invCols;
  XLSX.utils.book_append_sheet(wbResell, wsResellInv, 'Site_Inventory');

  const wsResellHist = XLSX.utils.json_to_sheet(resellHistRows);
  wsResellHist['!cols'] = histCols;
  XLSX.utils.book_append_sheet(wbResell, wsResellHist, 'Ownership_History');

  const resellOut1 = path.resolve('C:/Users/sansk/OneDrive/Desktop/KRISHNA VALLEY/ERP system/docs/Tower_A_Inventory_2_Resell.xlsx');
  const resellOut2 = path.resolve('C:/Users/sansk/OneDrive/Desktop/KRISHNA VALLEY/ERP system/Tower_A_Inventory_2_Resell.xlsx');
  XLSX.writeFile(wbResell, resellOut1);
  XLSX.writeFile(wbResell, resellOut2);
  console.log(`✅ File 2: Resell Inventory written (${resellInvRows.length} units + ${resellHistRows.length} history records) -> ${resellOut1}`);

  // =========================================================================
  // FILE 3: POSSESSION RENEWAL INVENTORY & CONTRACTS (13 Flats + 13 History Records)
  // =========================================================================
  const renewalInvRows = allInvRows.filter(r => r.Status === 'Possession Renewal');
  renewalInvRows.sort((a, b) => parseInt(a['Flat No'], 10) - parseInt(b['Flat No'], 10));

  const renewalHistRows = allHistRows.filter(r => r['Transfer Reason'] === 'possession_renewal');
  renewalHistRows.sort((a, b) => parseInt(a['Flat No'], 10) - parseInt(b['Flat No'], 10));

  const wbRenewal = XLSX.utils.book_new();
  const wsRenewalInv = XLSX.utils.json_to_sheet(renewalInvRows);
  wsRenewalInv['!cols'] = invCols;
  XLSX.utils.book_append_sheet(wbRenewal, wsRenewalInv, 'Site_Inventory');

  const wsRenewalHist = XLSX.utils.json_to_sheet(renewalHistRows);
  wsRenewalHist['!cols'] = histCols;
  XLSX.utils.book_append_sheet(wbRenewal, wsRenewalHist, 'Ownership_History');

  const renewalOut1 = path.resolve('C:/Users/sansk/OneDrive/Desktop/KRISHNA VALLEY/ERP system/docs/Tower_A_Inventory_3_Possession_Renewal.xlsx');
  const renewalOut2 = path.resolve('C:/Users/sansk/OneDrive/Desktop/KRISHNA VALLEY/ERP system/Tower_A_Inventory_3_Possession_Renewal.xlsx');
  XLSX.writeFile(wbRenewal, renewalOut1);
  XLSX.writeFile(wbRenewal, renewalOut2);
  console.log(`✅ File 3: Possession Renewal written (${renewalInvRows.length} units + ${renewalHistRows.length} prior contract records) -> ${renewalOut1}`);

  console.log('\n🎉 ALL THREE SPREADSHEETS SUCCESSFULLY CREATED!');
}

generateFiles();
