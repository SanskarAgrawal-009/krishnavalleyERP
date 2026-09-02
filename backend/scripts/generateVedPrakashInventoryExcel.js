import XLSX from 'xlsx';
import path from 'path';

function generateVedPrakashInventoryExcel() {
  const data = [
    {
      'Flat No': '001',
      'Tower': 'Tower A',
      'Floor': 0,
      'Owner Name': 'Ved Prakash Agarwal',
      'Owner Mobile': '+91 9897123456',
      'Flat Type': 'Service Apartment',
      'Carpet Area': 850,
      'Super Builtup Area': 1150,
      'Agreed Deal Price': 5500000,
      'Previous Payments': 5500000,
      'Date of Agreement': '14/06/2025',
      'Date of the Rental Starts': '25/07/2025',
      'Tenure (Months)': 36,
      'Amount Per Month': 31000,
      'Amount for the Total Tenure': 1116000,
      'Status': 'Sold'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Set column widths for beautiful readability
  worksheet['!cols'] = [
    { wch: 10 }, // Flat No
    { wch: 14 }, // Tower
    { wch: 8 },  // Floor
    { wch: 24 }, // Owner Name
    { wch: 18 }, // Owner Mobile
    { wch: 20 }, // Flat Type
    { wch: 14 }, // Carpet Area
    { wch: 18 }, // Super Builtup Area
    { wch: 18 }, // Agreed Deal Price
    { wch: 18 }, // Previous Payments
    { wch: 18 }, // Date of Agreement
    { wch: 24 }, // Date of the Rental Starts
    { wch: 16 }, // Tenure (Months)
    { wch: 18 }, // Amount Per Month
    { wch: 26 }, // Amount for the Total Tenure
    { wch: 10 }  // Status
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Site_Inventory');

  const outPath1 = path.resolve('C:/Users/sansk/OneDrive/Desktop/KRISHNA VALLEY/ERP system/docs/Ved_Prakash_Agarwal_Site_Inventory.xlsx');
  const outPath2 = path.resolve('C:/Users/sansk/OneDrive/Desktop/KRISHNA VALLEY/ERP system/Ved_Prakash_Agarwal_Site_Inventory.xlsx');

  XLSX.writeFile(workbook, outPath1);
  XLSX.writeFile(workbook, outPath2);

  console.log('✅ Generated Ved Prakash Agarwal Site Inventory Excel at:');
  console.log('  1.', outPath1);
  console.log('  2.', outPath2);
}

generateVedPrakashInventoryExcel();
