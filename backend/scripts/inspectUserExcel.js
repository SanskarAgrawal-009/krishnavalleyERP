import XLSX from 'xlsx';
import path from 'path';

const filePath = 'C:/Users/sansk/OneDrive/Desktop/KRISHNA VALLEY/ERP system/docs/A - 001 Ved Prakash Agarwal.xlsx';

try {
  const wb = XLSX.readFile(filePath);
  console.log('Sheet Names:', wb.SheetNames);

  wb.SheetNames.forEach(sheetName => {
    console.log('\n========================================================');
    console.log(`SHEET: ${sheetName}`);
    console.log('========================================================');
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    console.log(`Total Rows: ${rows.length}`);
    rows.forEach((r, idx) => {
      if (r.some(cell => cell !== '')) {
        console.log(`Row ${(idx + 1).toString().padStart(2, ' ')}:`, JSON.stringify(r));
      }
    });
  });
} catch (err) {
  console.error('Error reading excel:', err);
}
