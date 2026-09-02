import XLSX from 'xlsx';
import path from 'path';

function generateOwnershipHistoryTemplate() {
  const data = [
    {
      'Flat No': '001',
      'Tower': 'Tower A',
      'Previous Owner Name': 'Ved Prakash Agarwal',
      'Previous Owner Phone': '+91 9897123456',
      'Purchase Date': '14/06/2024',
      'Transfer Date': '20/07/2025',
      'Transfer Reason': 'buyback',
      'Transfer Deal Value': 5000000,
      'Current Owner Name': 'Suresh Mehta',
      'Current Owner Phone': '+91 9811223344',
      'Current Deal Price': 5500000,
      'Current Paid Amount': 5500000,
      'Remarks': 'Repurchased by company and resold to Suresh Mehta'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(data);

  worksheet['!cols'] = [
    { wch: 10 }, // Flat No
    { wch: 12 }, // Tower
    { wch: 24 }, // Previous Owner Name
    { wch: 20 }, // Previous Owner Phone
    { wch: 16 }, // Purchase Date
    { wch: 16 }, // Transfer Date
    { wch: 16 }, // Transfer Reason
    { wch: 18 }, // Transfer Deal Value
    { wch: 22 }, // Current Owner Name
    { wch: 20 }, // Current Owner Phone
    { wch: 18 }, // Current Deal Price
    { wch: 18 }, // Current Paid Amount
    { wch: 40 }  // Remarks
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Ownership_History');

  const outPath1 = path.resolve('C:/Users/sansk/OneDrive/Desktop/KRISHNA VALLEY/ERP system/docs/Ownership_History_and_Resale_Template.xlsx');
  const outPath2 = path.resolve('C:/Users/sansk/OneDrive/Desktop/KRISHNA VALLEY/ERP system/Ownership_History_and_Resale_Template.xlsx');

  XLSX.writeFile(workbook, outPath1);
  XLSX.writeFile(workbook, outPath2);

  console.log('✅ Generated Ownership History & Resale Excel Template at:');
  console.log('  1.', outPath1);
  console.log('  2.', outPath2);
}

generateOwnershipHistoryTemplate();
