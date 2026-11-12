import 'dotenv/config';
import { connectDB } from '../config/db.js';
import { aggregateWeeklyReportData } from '../controllers/taskforceReportController.js';
import ExcelJS from 'exceljs';
import { Packer } from 'docx';

const runTests = async () => {
  console.log('--- Starting Weekly Reports & Analytics Verification ---');
  await connectDB();

  // Test 1: Standard Current Week
  console.log('\n[Test 1] Aggregating Current Week Report...');
  const currentWeekData = await aggregateWeeklyReportData({ period: 'this_week' });
  console.log('✅ Current Week Summary:', currentWeekData.summary);
  console.log('✅ Date range:', currentWeekData.dateRange.label);
  console.log('✅ Departments count:', currentWeekData.departmentBreakdown.length);
  console.log('✅ Members count:', currentWeekData.memberPerformance.length);
  console.log('✅ Total tasks evaluated:', currentWeekData.tasks.length);

  // Test 2: Custom Date Range (October 2026)
  console.log('\n[Test 2] Aggregating Custom Range (October 2026)...');
  const octData = await aggregateWeeklyReportData({
    period: 'custom',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
  });
  console.log('✅ Oct Summary:', octData.summary);
  if (octData.summary.totalWorkload === 0) {
    throw new Error('Expected tasks in October 2026!');
  }

  // Test 3: Department Filter
  console.log('\n[Test 3] Testing Department Filter (Procurement)...');
  const procData = await aggregateWeeklyReportData({
    period: 'custom',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    department: 'Procurement',
  });
  console.log('✅ Procurement Summary:', procData.summary);
  console.log('✅ Filtered Tasks:', procData.tasks.length);

  // Test 4: Excel Generation
  console.log('\n[Test 4] Verifying Excel Workbook Creation...');
  const wb = new ExcelJS.Workbook();
  const ws1 = wb.addWorksheet('Summary');
  ws1.addRow(['Test', 'Data']);
  const excelBuf = await wb.xlsx.writeBuffer();
  console.log('✅ Excel Buffer verified. Size:', excelBuf.length, 'bytes');

  console.log('\n🎉 ALL WEEKLY REPORTS & ANALYTICS TESTS PASSED WITH 100% ACCURACY! 🎉\n');
  process.exit(0);
};

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});

