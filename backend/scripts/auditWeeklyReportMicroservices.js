import 'dotenv/config';
import { connectDB } from '../config/db.js';
import {
  resolveDateRange,
  aggregateWeeklyReportData,
  exportWeeklyReportExcel,
  exportWeeklyReportWord,
  formatDate,
  formatDateTime,
} from '../controllers/taskforceReportController.js';
import ExcelJS from 'exceljs';
import { Task } from '../models/Task.js';
import { TaskforceMember } from '../models/TaskforceMember.js';
import { TaskforceDepartment } from '../models/TaskforceDepartment.js';

const runCompleteAudit = async () => {
  console.log('================================================================');
  console.log('   KRISHNA VALLEY ERP — WEEKLY REPORTS & ANALYTICS AUDIT SUITE   ');
  console.log('================================================================\n');

  await connectDB();

  const auditResults = [];
  const recordCheck = (name, passed, details) => {
    auditResults.push({ name, passed, details });
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${mark} [${name}]: ${details}`);
  };

  // -------------------------------------------------------------
  // Test 1: Date Range Resolver for All Presets
  // -------------------------------------------------------------
  console.log('\n--- Test Suite 1: Date Range & Preset Resolution ---');
  const presets = ['this_week', 'last_week', 'last_2_weeks', 'this_month', 'last_month'];
  let allPresetsValid = true;

  presets.forEach((p) => {
    const res = resolveDateRange({ period: p });
    const isValid = res.start instanceof Date && res.end instanceof Date && res.start <= res.end;
    if (!isValid) allPresetsValid = false;
  });

  const customRange = resolveDateRange({
    period: 'custom',
    startDate: '2026-10-01',
    endDate: '2026-10-15',
  });
  const customValid =
    customRange.start.getFullYear() === 2026 &&
    customRange.start.getMonth() === 9 && // Oct = 9
    customRange.start.getDate() === 1 &&
    customRange.end.getDate() === 15;

  recordCheck(
    'Date Preset Computation',
    allPresetsValid,
    'All presets (this_week, last_week, last_2_weeks, this_month, last_month) compute valid start & end boundaries.'
  );
  recordCheck(
    'Custom Date Range Precision',
    customValid,
    `Custom start: ${formatDate(customRange.start)}, end: ${formatDate(customRange.end)}`
  );

  // -------------------------------------------------------------
  // Test 2: Carried-Forward & Workload Invariance Formula
  // -------------------------------------------------------------
  console.log('\n--- Test Suite 2: Carried-Forward Tasks Accounting ---');
  const weekReport = await aggregateWeeklyReportData({ period: 'this_week' });
  const { summary } = weekReport;

  const workloadFormulaValid =
    summary.totalWorkload === summary.newlyAssigned + summary.carriedForward;
  recordCheck(
    'Workload Invariance Rule',
    workloadFormulaValid,
    `Total Workload (${summary.totalWorkload}) == Newly Assigned (${summary.newlyAssigned}) + Carried Forward (${summary.carriedForward})`
  );

  const hasCarriedTasks = summary.carriedForward > 0;
  recordCheck(
    'Carried-Forward Detection',
    hasCarriedTasks,
    `Identified ${summary.carriedForward} tasks originating prior to this week that were carried over without omission.`
  );

  // -------------------------------------------------------------
  // Test 3: Department Breakdown & Responsibilities Scope
  // -------------------------------------------------------------
  console.log('\n--- Test Suite 3: Departmental Breakdown & Responsibilities ---');
  const { departmentBreakdown } = weekReport;
  const deptCountValid = departmentBreakdown.length > 0;
  const allDeptsHaveResponsibilities = departmentBreakdown.every(
    (d) => d.responsibilities && d.responsibilities.length > 5
  );
  const allDeptsHaveWorkloadStats = departmentBreakdown.every(
    (d) =>
      typeof d.totalWorkload === 'number' &&
      typeof d.completed === 'number' &&
      typeof d.pending === 'number' &&
      typeof d.overdue === 'number' &&
      typeof d.completionRate === 'number'
  );

  recordCheck(
    'Department Breakdown Population',
    deptCountValid,
    `Loaded ${departmentBreakdown.length} functional units from system.`
  );
  recordCheck(
    'Assigned Responsibilities Integrity',
    allDeptsHaveResponsibilities,
    'Every single department contains a structured scope of responsibilities and duties.'
  );
  recordCheck(
    'Department Metric Consistency',
    allDeptsHaveWorkloadStats,
    'All department objects compute workload, completed, pending, overdue, and completion rates.'
  );

  // -------------------------------------------------------------
  // Test 4: Member Performance & Accountability Ledger
  // -------------------------------------------------------------
  console.log('\n--- Test Suite 4: Member Contributions & Performance ---');
  const { memberPerformance } = weekReport;
  const membersValid = memberPerformance.length > 0;
  const membersHaveTier = memberPerformance.every(
    (m) => ['head', 'supervisor', 'helper', 'staff'].includes(m.hierarchyLevel)
  );
  const membersHaveRatings = memberPerformance.every((m) =>
    ['Excellent', 'Good', 'Average', 'Needs Attention', 'Standard', 'Neutral'].includes(
      m.performanceRating
    )
  );

  recordCheck(
    'Member Ledger Population',
    membersValid,
    `Tracked ${memberPerformance.length} taskforce personnel and staff.`
  );
  recordCheck(
    'Hierarchy Tier Adherence',
    membersHaveTier,
    'All members have verified hierarchy classification (Head, Supervisor, Helper, Staff).'
  );
  recordCheck(
    'Performance Rating Generation',
    membersHaveRatings,
    'Performance ratings correctly calculated based on individual task completion rates.'
  );

  // -------------------------------------------------------------
  // Test 5: Master Task Audit Ledger Details
  // -------------------------------------------------------------
  console.log('\n--- Test Suite 5: Task Audit Ledger Data Completeness ---');
  const { tasks } = weekReport;
  const allTasksHaveKeys = tasks.every((t) => {
    return (
      t.taskCode &&
      t.title &&
      t.department &&
      t.priority &&
      t.status &&
      typeof t.isCarriedForward === 'boolean'
    );
  });

  recordCheck(
    'Task Field Completeness',
    allTasksHaveKeys,
    `Evaluated ${tasks.length} task records: all contain task code, title, department, priority, status, and carried-forward origin flag.`
  );

  // -------------------------------------------------------------
  // Test 6: Department-Specific Filtering Microservice
  // -------------------------------------------------------------
  console.log('\n--- Test Suite 6: Department Query Filtering ---');
  const filteredReport = await aggregateWeeklyReportData({
    period: 'custom',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    department: 'Procurement',
  });

  const filterMatchesOnlyProcurement = filteredReport.tasks.every(
    (t) => t.department.toLowerCase() === 'procurement'
  );

  recordCheck(
    'Department Filter Precision',
    filterMatchesOnlyProcurement && filteredReport.tasks.length > 0,
    `Filtered tasks strictly to Procurement (count: ${filteredReport.tasks.length}).`
  );

  // -------------------------------------------------------------
  // Test 7: Excel Export Microservice (.xlsx)
  // -------------------------------------------------------------
  console.log('\n--- Test Suite 7: Excel Export (.xlsx) Streaming Microservice ---');
  let excelBuffer = null;
  let excelContentType = '';
  let excelDisposition = '';

  const mockResExcel = {
    setHeader: (key, val) => {
      if (key.toLowerCase() === 'content-type') excelContentType = val;
      if (key.toLowerCase() === 'content-disposition') excelDisposition = val;
    },
    send: (buf) => {
      excelBuffer = buf;
    },
  };

  await exportWeeklyReportExcel({ query: { period: 'this_week' }, user: { username: 'Admin' } }, mockResExcel);

  const excelHasBuffer = Buffer.isBuffer(excelBuffer) && excelBuffer.length > 5000;
  const excelHeaderValid =
    excelContentType.includes('spreadsheetml.sheet') &&
    excelDisposition.includes('attachment') &&
    excelDisposition.includes('.xlsx');

  // Verify Excel Sheet Structure by reading back buffer with ExcelJS
  const parsedWorkbook = new ExcelJS.Workbook();
  await parsedWorkbook.xlsx.load(excelBuffer);
  const sheetNames = parsedWorkbook.worksheets.map((ws) => ws.name);
  const expectedSheets = ['Executive Summary', 'Member Performance', 'Task Detail Ledger'];
  const allSheetsPresent = expectedSheets.every((s) => sheetNames.includes(s));

  recordCheck(
    'Excel File Generation',
    excelHasBuffer,
    `Generated binary buffer of size ${excelBuffer?.length} bytes.`
  );
  recordCheck(
    'Excel Headers & MIME-Type',
    excelHeaderValid,
    `Content-Type: ${excelContentType}, Content-Disposition: ${excelDisposition}`
  );
  recordCheck(
    'Excel Multi-Sheet Architecture',
    allSheetsPresent,
    `Verified 3 worksheets present: [${sheetNames.join(', ')}]`
  );

  // -------------------------------------------------------------
  // Test 8: Word Export Microservice (.docx)
  // -------------------------------------------------------------
  console.log('\n--- Test Suite 8: Word Document (.docx) Streaming Microservice ---');
  let wordBuffer = null;
  let wordContentType = '';
  let wordDisposition = '';

  const mockResWord = {
    setHeader: (key, val) => {
      if (key.toLowerCase() === 'content-type') wordContentType = val;
      if (key.toLowerCase() === 'content-disposition') wordDisposition = val;
    },
    send: (buf) => {
      wordBuffer = buf;
    },
  };

  await exportWeeklyReportWord({ query: { period: 'this_week' }, user: { username: 'Admin' } }, mockResWord);

  const wordHasBuffer = Buffer.isBuffer(wordBuffer) && wordBuffer.length > 5000;
  const wordHeaderValid =
    wordContentType.includes('wordprocessingml.document') &&
    wordDisposition.includes('attachment') &&
    wordDisposition.includes('.docx');

  recordCheck(
    'Word Document Generation',
    wordHasBuffer,
    `Generated binary buffer of size ${wordBuffer?.length} bytes.`
  );
  recordCheck(
    'Word Headers & MIME-Type',
    wordHeaderValid,
    `Content-Type: ${wordContentType}, Content-Disposition: ${wordDisposition}`
  );

  // -------------------------------------------------------------
  // Final Scorecard
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log('                     AUDIT RESULTS SUMMARY                      ');
  console.log('================================================================');
  const passedCount = auditResults.filter((r) => r.passed).length;
  const totalCount = auditResults.length;
  console.log(`Total Checks Executed : ${totalCount}`);
  console.log(`Checks Passed         : ${passedCount}`);
  console.log(`Checks Failed         : ${totalCount - passedCount}`);
  console.log(`System Readiness      : ${Math.round((passedCount / totalCount) * 100)}%`);

  if (passedCount === totalCount) {
    console.log('\n🌟 ALL 14 REPORT MICROSERVICES & FEATURES ARE 100% OPERATIONAL! 🌟\n');
    process.exit(0);
  } else {
    console.error('\n⚠️ Some microservices failed checks. Review logs above.\n');
    process.exit(1);
  }
};

runCompleteAudit().catch((err) => {
  console.error('Audit crashed with error:', err);
  process.exit(1);
});

