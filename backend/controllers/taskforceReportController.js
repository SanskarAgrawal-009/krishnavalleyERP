import { Task } from '../models/Task.js';
import { TaskforceMember } from '../models/TaskforceMember.js';
import { TaskforceDepartment } from '../models/TaskforceDepartment.js';
import { User } from '../models/User.js';
import ExcelJS from 'exceljs';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  Header,
  Footer,
  PageNumber,
} from 'docx';

// Default responsibilities dictionary for standard real estate / township departments
const DEFAULT_DEPARTMENT_RESPONSIBILITIES = {
  civil: 'Structural casting, brickwork, masonry, plastering, waterproofing, expansion joints & civil finishing.',
  construction: 'Core site construction, superstructure, structural inspection & milestone execution.',
  electrical: 'LT/HT cabling, main DB panels, conduit fitting, substation maintenance, earthing & apartment wiring.',
  plumbing: 'Domestic & flushing water supply lines, sanitary fittings, drainage networks, pumps & sewage lines.',
  snagging: 'Pre-possession quality audits, finishing snag lists, paint touch-ups, door/window fittings & clearances.',
  maintenance: 'Resident common area maintenance (CAM), lift servicing, DG set backup & routine site repairs.',
  housekeeping: 'Township premises cleaning, waste collection, corridor scrubbing & chemical sanitization.',
  security: '24/7 perimeter guarding, visitor logging, boom-barrier control, CCTV surveillance & night patrolling.',
  procurement: 'Raw material ordering (cement, steel, tiles), purchase orders, supplier evaluation & gate deliveries.',
  accounts: 'Subcontractor measurement verification, vendor payment clearance, billing & ledger reconciliation.',
  sales: 'Site visit walkthroughs, buyer inquiries, booking documentation & inventory allotment coordination.',
  'human resource': 'Site labor muster rolls, shift scheduling, safety compliance, contractor HR & staff welfare.',
  hr: 'Site workforce attendance, shift management, contractor compliance & staff welfare.',
  'i.t.': 'ERP platform support, fiber connectivity, biometric devices, CCTV NVR management & hardware setup.',
  it: 'ERP platform support, network connectivity, biometric devices & IT infrastructure.',
  hotel: 'Guest room maintenance, linen upkeep, housekeeping turnarounds & hospitality facility support.',
  'general operations': 'Cross-departmental logistics, material dispatch, daily supervisor muster & site safety audits.',
};

/**
 * Helper: Resolve start and end dates based on preset period or custom range
 */
export const resolveDateRange = (query = {}) => {
  const { period = 'this_week', startDate, endDate } = query;
  const now = new Date();

  let start = new Date(now);
  let end = new Date(now);
  let label = 'Current Week';

  if (period === 'custom' && startDate && endDate) {
    start = new Date(startDate);
    end = new Date(endDate);
    label = `Custom Range: ${formatDate(start)} to ${formatDate(end)}`;
  } else if (period === 'last_week') {
    const day = now.getDay();
    const diffToPrevMon = (day === 0 ? 6 : day - 1) + 7;
    start = new Date(now);
    start.setDate(now.getDate() - diffToPrevMon);
    end = new Date(start);
    end.setDate(start.getDate() + 6);
    label = `Last Week (${formatDate(start)} - ${formatDate(end)})`;
  } else if (period === 'last_2_weeks') {
    start = new Date(now);
    start.setDate(now.getDate() - 14);
    end = new Date(now);
    label = `Last 2 Weeks (${formatDate(start)} - ${formatDate(end)})`;
  } else if (period === 'this_month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    label = `This Month (${start.toLocaleString('default', { month: 'long', year: 'numeric' })})`;
  } else if (period === 'last_month') {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    end = new Date(now.getFullYear(), now.getMonth(), 0);
    label = `Last Month (${start.toLocaleString('default', { month: 'long', year: 'numeric' })})`;
  } else {
    // Default: 'this_week' (Monday to Sunday)
    const day = now.getDay();
    const diffToMon = day === 0 ? 6 : day - 1;
    start = new Date(now);
    start.setDate(now.getDate() - diffToMon);
    end = new Date(start);
    end.setDate(start.getDate() + 6);
    label = `This Week (${formatDate(start)} - ${formatDate(end)})`;
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end, label, period };
};

export const formatDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateTime = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
};

/**
 * Core engine: aggregates weekly performance, carried-forward tasks, department breakdown, and member metrics
 */
export const aggregateWeeklyReportData = async (query = {}) => {
  const { start, end, label, period } = resolveDateRange(query);
  const departmentFilter = query.department && query.department !== 'all' ? query.department.trim() : null;

  // 1. Fetch system entities in parallel
  const [dbDepartments, dbMembers, dbUsers] = await Promise.all([
    TaskforceDepartment.find({ status: { $ne: 'deleted' } })
      .populate('headMemberId', 'name trade hierarchyLevel')
      .sort({ order: 1, name: 1 })
      .lean(),
    TaskforceMember.find({ status: { $ne: 'deleted' } })
      .populate('userId', 'firstName lastName username email mobileNo')
      .populate('supervisorId', 'name trade')
      .populate('headId', 'name trade')
      .sort({ hierarchyLevel: -1, name: 1 })
      .lean(),
    User.find({ status: 'active' })
      .select('firstName lastName username email mobileNo')
      .lean(),
  ]);

  // Build lookup maps
  const userMap = {};
  dbUsers.forEach((u) => {
    userMap[u._id.toString()] = u;
  });

  const memberToUserMap = {};
  const userToMemberMap = {};
  dbMembers.forEach((m) => {
    if (m.userId?._id) {
      const uId = m.userId._id.toString();
      const mId = m._id.toString();
      memberToUserMap[mId] = uId;
      userToMemberMap[uId] = m;
    }
  });

  // 2. Fetch Tasks relevant to the period
  const taskQuery = {
    status: { $nin: ['cancelled'] },
  };

  if (departmentFilter) {
    taskQuery.department = { $regex: new RegExp(`^${departmentFilter}$`, 'i') };
  }

  // A task is relevant if:
  // (a) Assigned/created in the period, OR
  // (b) Completed in the period, OR
  // (c) Carried forward: created before period start and not completed before period start
  taskQuery.$or = [
    { createdAt: { $gte: start, $lte: end } },
    { startDate: { $gte: start, $lte: end } },
    { completedAt: { $gte: start, $lte: end } },
    {
      $and: [
        {
          $or: [
            { createdAt: { $lt: start } },
            { startDate: { $lt: start } },
          ],
        },
        {
          $or: [
            { completedAt: { $exists: false } },
            { completedAt: null },
            { completedAt: { $gte: start } },
          ],
        },
      ],
    },
  ];

  const tasks = await Task.find(taskQuery)
    .populate('assignedTo', 'firstName lastName username email mobileNo')
    .populate('assignedMembers', 'name trade department hierarchyLevel')
    .populate('assignedBy', 'firstName lastName username')
    .sort({ dueDate: 1, createdAt: -1 })
    .lean();

  const now = new Date();

  // 3. Process each task and annotate status
  const processedTasks = tasks.map((task) => {
    const taskStart = task.startDate ? new Date(task.startDate) : new Date(task.createdAt);
    const taskDue = task.dueDate ? new Date(task.dueDate) : null;
    const taskCompleted = task.completedAt ? new Date(task.completedAt) : null;

    // Check if task was carried forward from before the window
    const isCarriedForward = taskStart < start;
    const isNewInPeriod = !isCarriedForward && (taskStart >= start && taskStart <= end);

    // Completed within this window
    const isCompletedInPeriod =
      task.status === 'completed' &&
      ((taskCompleted && taskCompleted >= start && taskCompleted <= end) ||
        (!taskCompleted && task.updatedAt && new Date(task.updatedAt) >= start && new Date(task.updatedAt) <= end));

    // Overdue check
    const isOverdue =
      taskDue &&
      (taskDue < (taskCompleted || now)) &&
      (!isCompletedInPeriod || (taskCompleted && taskCompleted > taskDue));

    // Resolve assigned member names
    const memberNames = (task.assignedMembers || []).map((m) => m.name || m.trade).filter(Boolean);
    const userNames = (task.assignedTo || []).map((u) => {
      const name = `${u.firstName || ''} ${u.lastName || ''}`.trim();
      return name || u.username;
    }).filter(Boolean);

    const allAssignees = Array.from(new Set([...memberNames, ...userNames]));
    const primaryAssignee = allAssignees[0] || 'Unassigned';

    // Department normalization
    const deptNorm = (task.department || 'general').trim();

    return {
      _id: task._id,
      taskCode: task.taskCode || `TSK-${task._id.toString().slice(-4).toUpperCase()}`,
      title: task.title,
      description: task.description || '',
      department: deptNorm,
      priority: task.priority || 'medium',
      status: task.status,
      progress: task.progress || 0,
      startDate: task.startDate || task.createdAt,
      dueDate: task.dueDate,
      completedAt: task.completedAt,
      createdAt: task.createdAt,
      assignedBy: task.assignedBy ? `${task.assignedBy.firstName || ''} ${task.assignedBy.lastName || ''}`.trim() || task.assignedBy.username : 'Management',
      assignees: allAssignees,
      assigneeText: allAssignees.length > 0 ? allAssignees.join(', ') : 'Unassigned',
      primaryAssignee,
      isCarriedForward,
      isNewInPeriod,
      isCompletedInPeriod,
      isOverdue,
      isMDDirective: !!task.isMDDirective,
      hasRoadblock: !!(task.roadblockAlert?.hasRoadblock && !task.roadblockAlert?.isResolved),
      roadblockReason: task.roadblockAlert?.reason || '',
      apartmentContext: task.isApartmentRelated && task.apartmentDetails ? `${task.apartmentDetails.tower || ''} ${task.apartmentDetails.flatNumber || ''}`.trim() : '',
    };
  });

  // 4. Overall Executive Summary Metrics
  const summary = {
    totalWorkload: processedTasks.length,
    newlyAssigned: processedTasks.filter((t) => t.isNewInPeriod).length,
    carriedForward: processedTasks.filter((t) => t.isCarriedForward).length,
    completed: processedTasks.filter((t) => t.isCompletedInPeriod).length,
    inProgress: processedTasks.filter((t) => ['in_progress', 'under_review'].includes(t.status) && !t.isCompletedInPeriod).length,
    pending: processedTasks.filter((t) => t.status === 'pending' && !t.isCompletedInPeriod).length,
    overdue: processedTasks.filter((t) => t.isOverdue).length,
    roadblocks: processedTasks.filter((t) => t.hasRoadblock).length,
    mdDirectives: processedTasks.filter((t) => t.isMDDirective).length,
    completionRate: 0,
    onTimeRate: 0,
  };

  summary.completionRate = summary.totalWorkload > 0
    ? Math.round((summary.completed / summary.totalWorkload) * 100)
    : 0;

  const onTimeCompleted = processedTasks.filter((t) => t.isCompletedInPeriod && !t.isOverdue).length;
  summary.onTimeRate = summary.completed > 0
    ? Math.round((onTimeCompleted / summary.completed) * 100)
    : 100;

  // 5. Department Breakdown Aggregation
  // Merge official departments with any dynamic department names found in tasks
  const deptMap = {};

  dbDepartments.forEach((d) => {
    const key = d.name.trim().toLowerCase();
    deptMap[key] = {
      id: d._id,
      name: d.name,
      code: d.code || d.name.slice(0, 4).toUpperCase(),
      responsibilities: d.description || DEFAULT_DEPARTMENT_RESPONSIBILITIES[key] || `${d.name} operations, maintenance & execution.`,
      color: d.color || '#2563eb',
      headName: d.headMemberId?.name || 'Unassigned',
      carriedForward: 0,
      newlyAssigned: 0,
      totalWorkload: 0,
      completed: 0,
      inProgress: 0,
      pending: 0,
      overdue: 0,
      roadblocks: 0,
      completionRate: 0,
      taskCount: 0,
    };
  });

  // Check if tasks contain extra departments not in master
  processedTasks.forEach((t) => {
    const key = t.department.toLowerCase();
    if (!deptMap[key]) {
      const capName = t.department.charAt(0).toUpperCase() + t.department.slice(1);
      deptMap[key] = {
        id: null,
        name: capName,
        code: capName.slice(0, 4).toUpperCase(),
        responsibilities: DEFAULT_DEPARTMENT_RESPONSIBILITIES[key] || `${capName} operations, field taskforce & maintenance.`,
        color: '#64748b',
        headName: 'Unassigned',
        carriedForward: 0,
        newlyAssigned: 0,
        totalWorkload: 0,
        completed: 0,
        inProgress: 0,
        pending: 0,
        overdue: 0,
        roadblocks: 0,
        completionRate: 0,
        taskCount: 0,
      };
    }
  });

  // Aggregate task counts per department
  processedTasks.forEach((t) => {
    const key = t.department.toLowerCase();
    const d = deptMap[key];
    if (!d) return;

    d.taskCount++;
    d.totalWorkload++;
    if (t.isCarriedForward) d.carriedForward++;
    if (t.isNewInPeriod) d.newlyAssigned++;
    if (t.isCompletedInPeriod) d.completed++;
    else if (['in_progress', 'under_review'].includes(t.status)) d.inProgress++;
    else if (t.status === 'pending') d.pending++;

    if (t.isOverdue) d.overdue++;
    if (t.hasRoadblock) d.roadblocks++;
  });

  const departmentBreakdown = Object.values(deptMap)
    .map((d) => ({
      ...d,
      completionRate: d.totalWorkload > 0 ? Math.round((d.completed / d.totalWorkload) * 100) : 0,
    }))
    .filter((d) => d.totalWorkload > 0 || !departmentFilter)
    .sort((a, b) => b.totalWorkload - a.totalWorkload);

  // 6. Member Performance Aggregation
  const memberPerformanceMap = {};

  dbMembers.forEach((m) => {
    const mId = m._id.toString();
    memberPerformanceMap[mId] = {
      id: m._id,
      name: m.name,
      hierarchyLevel: m.hierarchyLevel || 'helper',
      department: m.department || m.trade || 'Taskforce',
      trade: m.trade || 'General Operations',
      supervisor: m.supervisorId?.name || '—',
      head: m.headId?.name || '—',
      mobileNo: m.mobileNo || m.userId?.mobileNo || '—',
      email: m.email || m.userId?.email || '—',
      carriedForward: 0,
      newlyAssigned: 0,
      totalWorkload: 0,
      completed: 0,
      inProgress: 0,
      pending: 0,
      overdue: 0,
      roadblocks: 0,
      onTimeCompleted: 0,
      completionRate: 0,
      performanceRating: 'Neutral',
    };
  });

  // Also include users who have tasks assigned if not in TaskforceMember
  dbUsers.forEach((u) => {
    const uId = u._id.toString();
    if (!userToMemberMap[uId]) {
      memberPerformanceMap[`user_${uId}`] = {
        id: u._id,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username,
        hierarchyLevel: 'staff',
        department: 'Staff Operations',
        trade: 'General Operations',
        supervisor: '—',
        head: '—',
        mobileNo: u.mobileNo || '—',
        email: u.email || '—',
        carriedForward: 0,
        newlyAssigned: 0,
        totalWorkload: 0,
        completed: 0,
        inProgress: 0,
        pending: 0,
        overdue: 0,
        roadblocks: 0,
        onTimeCompleted: 0,
        completionRate: 0,
        performanceRating: 'Neutral',
      };
    }
  });

  // Assign task contributions to members
  tasks.forEach((rawTask) => {
    const pTask = processedTasks.find((pt) => pt._id.toString() === rawTask._id.toString());
    if (!pTask) return;

    const matchedMemberKeys = new Set();

    (rawTask.assignedMembers || []).forEach((m) => {
      const mId = (m._id || m).toString();
      if (memberPerformanceMap[mId]) matchedMemberKeys.add(mId);
    });

    (rawTask.assignedTo || []).forEach((u) => {
      const uId = (u._id || u).toString();
      const member = userToMemberMap[uId];
      if (member) {
        matchedMemberKeys.add(member._id.toString());
      } else if (memberPerformanceMap[`user_${uId}`]) {
        matchedMemberKeys.add(`user_${uId}`);
      }
    });

    matchedMemberKeys.forEach((key) => {
      const mem = memberPerformanceMap[key];
      if (!mem) return;

      mem.totalWorkload++;
      if (pTask.isCarriedForward) mem.carriedForward++;
      if (pTask.isNewInPeriod) mem.newlyAssigned++;
      if (pTask.isCompletedInPeriod) {
        mem.completed++;
        if (!pTask.isOverdue) mem.onTimeCompleted++;
      } else if (['in_progress', 'under_review'].includes(pTask.status)) {
        mem.inProgress++;
      } else if (pTask.status === 'pending') {
        mem.pending++;
      }

      if (pTask.isOverdue) mem.overdue++;
      if (pTask.hasRoadblock) mem.roadblocks++;
    });
  });

  const memberPerformance = Object.values(memberPerformanceMap)
    .map((m) => {
      const rate = m.totalWorkload > 0 ? Math.round((m.completed / m.totalWorkload) * 100) : 0;
      let rating = 'Standard';
      if (rate >= 80) rating = 'Excellent';
      else if (rate >= 60) rating = 'Good';
      else if (rate >= 40) rating = 'Average';
      else if (m.totalWorkload > 0) rating = 'Needs Attention';

      return {
        ...m,
        completionRate: rate,
        performanceRating: rating,
      };
    })
    .filter((m) => m.totalWorkload > 0 || m.hierarchyLevel !== 'staff')
    .sort((a, b) => {
      const hierarchyOrder = { head: 3, supervisor: 2, helper: 1, staff: 0 };
      const diff = (hierarchyOrder[b.hierarchyLevel] || 0) - (hierarchyOrder[a.hierarchyLevel] || 0);
      if (diff !== 0) return diff;
      return b.totalWorkload - a.totalWorkload;
    });

  return {
    dateRange: {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      formattedStart: formatDate(start),
      formattedEnd: formatDate(end),
      weekNumber: getWeekNumber(start),
      year: start.getFullYear(),
      label,
      period,
    },
    filter: {
      department: departmentFilter || 'all',
    },
    summary,
    departmentBreakdown,
    memberPerformance,
    tasks: processedTasks,
    generatedAt: new Date().toISOString(),
  };
};

/**
 * Controller: GET JSON Analytics for Weekly Reports Dashboard
 */
export const getWeeklyReportAnalytics = async (req, res) => {
  try {
    const reportData = await aggregateWeeklyReportData(req.query);
    return res.json({
      success: true,
      data: reportData,
    });
  } catch (error) {
    console.error('Error generating weekly report analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate weekly reports and analytics',
      error: error.message,
    });
  }
};

/**
 * Controller: GET Stream Excel (.xlsx) Report
 */
export const exportWeeklyReportExcel = async (req, res) => {
  try {
    const reportData = await aggregateWeeklyReportData(req.query);
    const { dateRange, summary, departmentBreakdown, memberPerformance, tasks } = reportData;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Krishna Valley ERP Taskforce';
    workbook.lastModifiedBy = req.user?.username || 'Task Force Manager';
    workbook.created = new Date();

    const brandDarkBlue = 'FF1E3A8A';
    const brandLightBlue = 'FFDBEAFE';
    const softGreen = 'FFDCFCE7';
    const softYellow = 'FFFEF9C3';
    const softRed = 'FFFEE2E2';
    const headerFont = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    const borderStyle = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };

    // =========================================================
    // SHEET 1: EXECUTIVE & DEPARTMENT SUMMARY
    // =========================================================
    const ws1 = workbook.addWorksheet('Executive Summary', {
      views: [{ showGridLines: true }],
    });

    // Title Banner
    ws1.mergeCells('A1:J1');
    const titleCell = ws1.getCell('A1');
    titleCell.value = 'KRISHNA VALLEY TOWNSHIP — TASK FORCE WEEKLY PERFORMANCE REPORT';
    titleCell.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: brandDarkBlue } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    ws1.getRow(1).height = 36;

    // Subtitle / Period Banner
    ws1.mergeCells('A2:J2');
    const subtitleCell = ws1.getCell('A2');
    subtitleCell.value = `REPORTING WINDOW: ${dateRange.formattedStart} to ${dateRange.formattedEnd} (Week #${dateRange.weekNumber}, ${dateRange.year}) | Generated: ${formatDateTime(new Date())}`;
    subtitleCell.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FF1E293B' } };
    subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: brandLightBlue } };
    subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    ws1.getRow(2).height = 24;

    // Blank row
    ws1.addRow([]);

    // Executive KPI Summary Table
    ws1.addRow(['EXECUTIVE KPI SUMMARY METRIC', 'COUNT / VALUE', 'BENCHMARK / REMARKS']);
    const kpiHeader = ws1.getRow(4);
    kpiHeader.font = headerFont;
    kpiHeader.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: brandDarkBlue } };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.border = borderStyle;
    });
    kpiHeader.height = 24;

    const kpiRows = [
      ['Total Weekly Workload', summary.totalWorkload, 'Newly Assigned + Carried Forward Responsibilities'],
      ['Newly Assigned Tasks in Window', summary.newlyAssigned, 'Tasks initiated during this reporting week'],
      ['Incomplete Tasks Carried Forward', summary.carriedForward, 'Pending responsibilities carried from prior weeks'],
      ['Tasks Completed in Window', summary.completed, 'Successfully verified & closed deliverables'],
      ['Tasks Currently In-Progress', summary.inProgress, 'Active field execution underway'],
      ['Tasks Pending (Unstarted)', summary.pending, 'Awaiting initiation or resource allocation'],
      ['Overdue Tasks', summary.overdue, 'Past assigned completion deadline'],
      ['Active Roadblocks Reported', summary.roadblocks, 'Issues requiring supervisor / management clearance'],
      ['Overall Weekly Completion Rate', `${summary.completionRate}%`, 'Completed / Total Active Workload'],
      ['On-Time Completion Rate', `${summary.onTimeRate}%`, 'Completed without exceeding due date'],
    ];

    kpiRows.forEach((row) => {
      const r = ws1.addRow(row);
      r.height = 20;
      r.eachCell((cell) => {
        cell.font = { name: 'Segoe UI', size: 9 };
        cell.border = borderStyle;
      });
    });

    ws1.addRow([]);
    ws1.addRow([]);

    // Department Breakdown Table
    const deptHeaderRowIdx = ws1.rowCount + 1;
    ws1.addRow([
      'DEPARTMENT',
      'CODE',
      'ASSIGNED RESPONSIBILITIES & SCOPE',
      'HEAD / LEAD',
      'CARRIED FWD',
      'NEW ASSIGNED',
      'TOTAL WORKLOAD',
      'COMPLETED',
      'IN PROGRESS',
      'PENDING',
      'OVERDUE',
      'COMPLETION %',
    ]);

    const deptHeader = ws1.getRow(deptHeaderRowIdx);
    deptHeader.font = headerFont;
    deptHeader.height = 26;
    deptHeader.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: brandDarkBlue } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = borderStyle;
    });

    departmentBreakdown.forEach((dept) => {
      const r = ws1.addRow([
        dept.name,
        dept.code,
        dept.responsibilities,
        dept.headName,
        dept.carriedForward,
        dept.newlyAssigned,
        dept.totalWorkload,
        dept.completed,
        dept.inProgress,
        dept.pending,
        dept.overdue,
        `${dept.completionRate}%`,
      ]);
      r.height = 24;
      r.eachCell((cell, colNum) => {
        cell.font = { name: 'Segoe UI', size: 9 };
        cell.border = borderStyle;
        if (colNum >= 5) cell.alignment = { vertical: 'middle', horizontal: 'center' };
        if (colNum === 8 && dept.completed > 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: softGreen } };
        }
        if (colNum === 11 && dept.overdue > 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: softRed } };
        }
      });
    });

    ws1.columns = [
      { width: 22 }, // Department
      { width: 10 }, // Code
      { width: 45 }, // Responsibilities
      { width: 20 }, // Head
      { width: 14 }, // Carried Fwd
      { width: 14 }, // New
      { width: 16 }, // Workload
      { width: 14 }, // Completed
      { width: 14 }, // In Progress
      { width: 12 }, // Pending
      { width: 12 }, // Overdue
      { width: 14 }, // %
    ];

    // =========================================================
    // SHEET 2: MEMBER PERFORMANCE & CONTRIBUTIONS
    // =========================================================
    const ws2 = workbook.addWorksheet('Member Performance', {
      views: [{ showGridLines: true }],
    });

    ws2.mergeCells('A1:K1');
    const titleCell2 = ws2.getCell('A1');
    titleCell2.value = 'TASK FORCE PERSONNEL — WEEKLY CONTRIBUTIONS & ACCOUNTABILITY';
    titleCell2.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: brandDarkBlue } };
    titleCell2.alignment = { vertical: 'middle', horizontal: 'center' };
    ws2.getRow(1).height = 36;

    ws2.addRow([
      'PERSONNEL NAME',
      'HIERARCHY LEVEL',
      'DEPARTMENT / TRADE',
      'SUPERVISOR / HEAD',
      'CARRIED FWD',
      'NEW ASSIGNED',
      'TOTAL WORKLOAD',
      'COMPLETED',
      'IN PROGRESS',
      'OVERDUE',
      'COMPLETION RATE',
      'RATING',
    ]);

    const memHeader = ws2.getRow(2);
    memHeader.font = headerFont;
    memHeader.height = 26;
    memHeader.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: brandDarkBlue } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = borderStyle;
    });

    memberPerformance.forEach((m) => {
      const r = ws2.addRow([
        m.name,
        m.hierarchyLevel.toUpperCase(),
        m.department,
        m.head !== '—' ? m.head : m.supervisor,
        m.carriedForward,
        m.newlyAssigned,
        m.totalWorkload,
        m.completed,
        m.inProgress,
        m.overdue,
        `${m.completionRate}%`,
        m.performanceRating,
      ]);
      r.height = 22;
      r.eachCell((cell, colNum) => {
        cell.font = { name: 'Segoe UI', size: 9 };
        cell.border = borderStyle;
        if (colNum >= 5) cell.alignment = { vertical: 'middle', horizontal: 'center' };
        if (colNum === 8 && m.completed > 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: softGreen } };
        }
        if (colNum === 10 && m.overdue > 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: softRed } };
        }
      });
    });

    ws2.columns = [
      { width: 22 }, // Name
      { width: 16 }, // Level
      { width: 22 }, // Dept
      { width: 20 }, // Supervisor
      { width: 14 }, // Carried Fwd
      { width: 14 }, // New
      { width: 16 }, // Total
      { width: 14 }, // Completed
      { width: 14 }, // In Progress
      { width: 12 }, // Overdue
      { width: 16 }, // %
      { width: 16 }, // Rating
    ];

    // =========================================================
    // SHEET 3: DETAILED TASK LEDGER (ALL LINE ITEMS)
    // =========================================================
    const ws3 = workbook.addWorksheet('Task Detail Ledger', {
      views: [{ showGridLines: true }],
    });

    ws3.mergeCells('A1:L1');
    const titleCell3 = ws3.getCell('A1');
    titleCell3.value = 'TASK FORCE MASTER AUDIT LEDGER — ALL DELIVERABLES';
    titleCell3.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: brandDarkBlue } };
    titleCell3.alignment = { vertical: 'middle', horizontal: 'center' };
    ws3.getRow(1).height = 36;

    ws3.addRow([
      'TASK CODE',
      'TASK TITLE & SCOPE',
      'DEPARTMENT',
      'PRIORITY',
      'ASSIGNED MEMBERS / STAFF',
      'ASSIGNMENT DATE',
      'DEADLINE',
      'CURRENT STATUS',
      'COMPLETION DATE',
      'PROGRESS',
      'CARRIED FORWARD?',
      'ROADBLOCK ALERT',
    ]);

    const taskHeader = ws3.getRow(2);
    taskHeader.font = headerFont;
    taskHeader.height = 26;
    taskHeader.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: brandDarkBlue } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = borderStyle;
    });

    tasks.forEach((t) => {
      const r = ws3.addRow([
        t.taskCode,
        t.title,
        t.department.toUpperCase(),
        t.priority.toUpperCase(),
        t.assigneeText,
        formatDate(t.startDate),
        formatDate(t.dueDate),
        t.status.toUpperCase(),
        formatDate(t.completedAt),
        `${t.progress}%`,
        t.isCarriedForward ? 'YES (Carried Over)' : 'NO (New in Week)',
        t.hasRoadblock ? `ROADBLOCK: ${t.roadblockReason || 'Yes'}` : 'Clear',
      ]);
      r.height = 22;
      r.eachCell((cell, colNum) => {
        cell.font = { name: 'Segoe UI', size: 9 };
        cell.border = borderStyle;
        if ([1, 3, 4, 6, 7, 8, 9, 10, 11].includes(colNum)) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
        if (colNum === 8 && t.status === 'completed') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: softGreen } };
        } else if (colNum === 8 && ['in_progress', 'under_review'].includes(t.status)) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: softYellow } };
        } else if (colNum === 11 && t.isCarriedForward) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: softRed } };
        }
      });
    });

    ws3.columns = [
      { width: 16 }, // Code
      { width: 40 }, // Title
      { width: 16 }, // Dept
      { width: 12 }, // Priority
      { width: 28 }, // Assignees
      { width: 16 }, // Start
      { width: 16 }, // Due
      { width: 16 }, // Status
      { width: 16 }, // Completed
      { width: 12 }, // Progress
      { width: 20 }, // Carried Fwd
      { width: 24 }, // Roadblock
    ];

    // Stream download to client
    const buffer = await workbook.xlsx.writeBuffer();
    const safeDate = dateRange.formattedStart.replace(/[\s,]+/g, '_');
    const filename = `Krishna_Valley_Taskforce_Weekly_Report_${safeDate}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (error) {
    console.error('Error exporting Excel report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate Excel report',
      error: error.message,
    });
  }
};

/**
 * Controller: GET Stream Word (.docx) Report
 */
export const exportWeeklyReportWord = async (req, res) => {
  try {
    const reportData = await aggregateWeeklyReportData(req.query);
    const { dateRange, summary, departmentBreakdown, memberPerformance, tasks } = reportData;

    const brandDarkBlue = '1E3A8A';
    const brandLightBlue = 'DBEAFE';
    const slateGray = '334155';
    const softGreen = 'DCFCE7';
    const softRed = 'FEE2E2';

    const cellBorders = {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
    };

    // Helper: make styled table cell
    const makeCell = (text, options = {}) => {
      const {
        bold = false,
        color = '000000',
        size = 18, // 18 half-pts = 9pt
        shading = null,
        alignment = AlignmentType.LEFT,
        width = null,
      } = options;

      return new TableCell({
        width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
        shading: shading ? { fill: shading } : undefined,
        borders: cellBorders,
        children: [
          new Paragraph({
            alignment,
            children: [
              new TextRun({
                text: String(text !== undefined && text !== null ? text : '—'),
                bold,
                color,
                size,
                font: 'Segoe UI',
              }),
            ],
          }),
        ],
      });
    };

    // 1. KPI Summary Table
    const kpiTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            makeCell('KPI METRIC', { bold: true, color: 'FFFFFF', shading: brandDarkBlue, width: 40 }),
            makeCell('COUNT / VALUE', { bold: true, color: 'FFFFFF', shading: brandDarkBlue, width: 25, alignment: AlignmentType.CENTER }),
            makeCell('OPERATIONAL BENCHMARK', { bold: true, color: 'FFFFFF', shading: brandDarkBlue, width: 35 }),
          ],
        }),
        new TableRow({
          children: [
            makeCell('Total Active Workload', { bold: true }),
            makeCell(summary.totalWorkload, { bold: true, alignment: AlignmentType.CENTER }),
            makeCell('New Assigned + Incomplete Carried Forward'),
          ],
        }),
        new TableRow({
          children: [
            makeCell('Newly Assigned This Week', {}),
            makeCell(summary.newlyAssigned, { alignment: AlignmentType.CENTER }),
            makeCell('Tasks initiated in the current reporting period'),
          ],
        }),
        new TableRow({
          children: [
            makeCell('Carried Forward from Prior Weeks', { bold: true, color: 'B91C1C' }),
            makeCell(summary.carriedForward, { bold: true, color: 'B91C1C', shading: softRed, alignment: AlignmentType.CENTER }),
            makeCell('Incomplete deliverables carried over to prevent lapses'),
          ],
        }),
        new TableRow({
          children: [
            makeCell('Successfully Completed Tasks', { bold: true, color: '15803D' }),
            makeCell(summary.completed, { bold: true, color: '15803D', shading: softGreen, alignment: AlignmentType.CENTER }),
            makeCell('Verified and closed during this window'),
          ],
        }),
        new TableRow({
          children: [
            makeCell('Tasks Currently In-Progress', {}),
            makeCell(summary.inProgress, { alignment: AlignmentType.CENTER }),
            makeCell('Active execution on-site'),
          ],
        }),
        new TableRow({
          children: [
            makeCell('Tasks Pending Initiation', {}),
            makeCell(summary.pending, { alignment: AlignmentType.CENTER }),
            makeCell('Awaiting start date or material clearance'),
          ],
        }),
        new TableRow({
          children: [
            makeCell('Overdue Tasks', { bold: true, color: 'B91C1C' }),
            makeCell(summary.overdue, { bold: true, color: 'B91C1C', shading: softRed, alignment: AlignmentType.CENTER }),
            makeCell('Target completion deadline passed'),
          ],
        }),
        new TableRow({
          children: [
            makeCell('Overall Weekly Completion Rate', { bold: true }),
            makeCell(`${summary.completionRate}%`, { bold: true, alignment: AlignmentType.CENTER }),
            makeCell('Completed vs Total Active Workload Target'),
          ],
        }),
        new TableRow({
          children: [
            makeCell('On-Time Execution Delivery Rate', { bold: true }),
            makeCell(`${summary.onTimeRate}%`, { bold: true, alignment: AlignmentType.CENTER }),
            makeCell('Completed without deadline extension'),
          ],
        }),
      ],
    });

    // 2. Department Breakdown Table
    const deptRows = [
      new TableRow({
        children: [
          makeCell('Department', { bold: true, color: 'FFFFFF', shading: brandDarkBlue, width: 18 }),
          makeCell('Assigned Responsibilities', { bold: true, color: 'FFFFFF', shading: brandDarkBlue, width: 34 }),
          makeCell('Head / Lead', { bold: true, color: 'FFFFFF', shading: brandDarkBlue, width: 16 }),
          makeCell('Carried Fwd', { bold: true, color: 'FFFFFF', shading: brandDarkBlue, width: 8, alignment: AlignmentType.CENTER }),
          makeCell('New', { bold: true, color: 'FFFFFF', shading: brandDarkBlue, width: 6, alignment: AlignmentType.CENTER }),
          makeCell('Total', { bold: true, color: 'FFFFFF', shading: brandDarkBlue, width: 6, alignment: AlignmentType.CENTER }),
          makeCell('Done', { bold: true, color: 'FFFFFF', shading: brandDarkBlue, width: 6, alignment: AlignmentType.CENTER }),
          makeCell('Late', { bold: true, color: 'FFFFFF', shading: brandDarkBlue, width: 6, alignment: AlignmentType.CENTER }),
        ],
      }),
    ];

    departmentBreakdown.forEach((d) => {
      deptRows.push(
        new TableRow({
          children: [
            makeCell(d.name, { bold: true }),
            makeCell(d.responsibilities, { size: 16 }),
            makeCell(d.headName, {}),
            makeCell(d.carriedForward, { alignment: AlignmentType.CENTER, color: d.carriedForward > 0 ? 'B91C1C' : '000000' }),
            makeCell(d.newlyAssigned, { alignment: AlignmentType.CENTER }),
            makeCell(d.totalWorkload, { bold: true, alignment: AlignmentType.CENTER }),
            makeCell(d.completed, { bold: true, color: '15803D', alignment: AlignmentType.CENTER }),
            makeCell(d.overdue, { color: d.overdue > 0 ? 'B91C1C' : '000000', alignment: AlignmentType.CENTER }),
          ],
        })
      );
    });

    const deptTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: deptRows,
    });

    // 3. Member Performance Table
    const memRows = [
      new TableRow({
        children: [
          makeCell('Personnel Name', { bold: true, color: 'FFFFFF', shading: brandDarkBlue, width: 22 }),
          makeCell('Hierarchy', { bold: true, color: 'FFFFFF', shading: brandDarkBlue, width: 14 }),
          makeCell('Department / Trade', { bold: true, color: 'FFFFFF', shading: brandDarkBlue, width: 20 }),
          makeCell('Carried Fwd', { bold: true, color: 'FFFFFF', shading: brandDarkBlue, width: 11, alignment: AlignmentType.CENTER }),
          makeCell('New', { bold: true, color: 'FFFFFF', shading: brandDarkBlue, width: 8, alignment: AlignmentType.CENTER }),
          makeCell('Completed', { bold: true, color: 'FFFFFF', shading: brandDarkBlue, width: 11, alignment: AlignmentType.CENTER }),
          makeCell('Overdue', { bold: true, color: 'FFFFFF', shading: brandDarkBlue, width: 8, alignment: AlignmentType.CENTER }),
          makeCell('Rate %', { bold: true, color: 'FFFFFF', shading: brandDarkBlue, width: 6, alignment: AlignmentType.CENTER }),
        ],
      }),
    ];

    memberPerformance.forEach((m) => {
      memRows.push(
        new TableRow({
          children: [
            makeCell(m.name, { bold: true }),
            makeCell(m.hierarchyLevel.toUpperCase(), { size: 16 }),
            makeCell(m.department, { size: 16 }),
            makeCell(m.carriedForward, { alignment: AlignmentType.CENTER, color: m.carriedForward > 0 ? 'B91C1C' : '000000' }),
            makeCell(m.newlyAssigned, { alignment: AlignmentType.CENTER }),
            makeCell(m.completed, { bold: true, color: '15803D', alignment: AlignmentType.CENTER }),
            makeCell(m.overdue, { color: m.overdue > 0 ? 'B91C1C' : '000000', alignment: AlignmentType.CENTER }),
            makeCell(`${m.completionRate}%`, { bold: true, alignment: AlignmentType.CENTER }),
          ],
        })
      );
    });

    const memberTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: memRows,
    });

    // 4. Carried Forward & Roadblock Focus Section Table
    const carriedOverTasks = tasks.filter((t) => t.isCarriedForward || t.isOverdue);
    const criticalRows = [
      new TableRow({
        children: [
          makeCell('Code', { bold: true, color: 'FFFFFF', shading: '991B1B', width: 12 }),
          makeCell('Task Title & Scope', { bold: true, color: 'FFFFFF', shading: '991B1B', width: 34 }),
          makeCell('Dept', { bold: true, color: 'FFFFFF', shading: '991B1B', width: 12 }),
          makeCell('Assigned Member', { bold: true, color: 'FFFFFF', shading: '991B1B', width: 20 }),
          makeCell('Deadline', { bold: true, color: 'FFFFFF', shading: '991B1B', width: 12 }),
          makeCell('Carried / Overdue Reason', { bold: true, color: 'FFFFFF', shading: '991B1B', width: 10 }),
        ],
      }),
    ];

    if (carriedOverTasks.length === 0) {
      criticalRows.push(
        new TableRow({
          children: [
            makeCell('—', {}),
            makeCell('No carried forward or overdue tasks recorded for this period. All responsibilities on track!', { bold: true, color: '15803D' }),
            makeCell('—', {}),
            makeCell('—', {}),
            makeCell('—', {}),
            makeCell('Clear', {}),
          ],
        })
      );
    } else {
      carriedOverTasks.slice(0, 50).forEach((t) => {
        criticalRows.push(
          new TableRow({
            children: [
              makeCell(t.taskCode, { bold: true }),
              makeCell(t.title, { size: 16 }),
              makeCell(t.department.toUpperCase(), { size: 16 }),
              makeCell(t.primaryAssignee, {}),
              makeCell(formatDate(t.dueDate), {}),
              makeCell(t.isCarriedForward ? 'Carried Over' : 'Overdue', {
                bold: true,
                color: '991B1B',
                shading: softRed,
              }),
            ],
          })
        );
      });
    }

    const criticalTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: criticalRows,
    });

    // 5. Complete Task Audit Ledger Table
    const taskLedgerRows = [
      new TableRow({
        children: [
          makeCell('Code', { bold: true, color: 'FFFFFF', shading: brandDarkBlue, width: 12 }),
          makeCell('Title', { bold: true, color: 'FFFFFF', shading: brandDarkBlue, width: 30 }),
          makeCell('Dept', { bold: true, color: 'FFFFFF', shading: brandDarkBlue, width: 12 }),
          makeCell('Assigned', { bold: true, color: 'FFFFFF', shading: brandDarkBlue, width: 18 }),
          makeCell('Start Date', { bold: true, color: 'FFFFFF', shading: brandDarkBlue, width: 10 }),
          makeCell('Due Date', { bold: true, color: 'FFFFFF', shading: brandDarkBlue, width: 10 }),
          makeCell('Status', { bold: true, color: 'FFFFFF', shading: brandDarkBlue, width: 8 }),
        ],
      }),
    ];

    tasks.slice(0, 100).forEach((t) => {
      taskLedgerRows.push(
        new TableRow({
          children: [
            makeCell(t.taskCode, { bold: true }),
            makeCell(t.title, { size: 16 }),
            makeCell(t.department.toUpperCase(), { size: 16 }),
            makeCell(t.primaryAssignee, { size: 16 }),
            makeCell(formatDate(t.startDate), { size: 16 }),
            makeCell(formatDate(t.dueDate), { size: 16 }),
            makeCell(t.status.toUpperCase(), {
              size: 16,
              bold: true,
              color: t.status === 'completed' ? '15803D' : (t.status === 'in_progress' ? 'D97706' : '334155'),
            }),
          ],
        })
      );
    });

    const taskLedgerTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: taskLedgerRows,
    });

    // Assemble Document
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 720,
                bottom: 720,
                left: 720,
                right: 720,
              },
            },
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [
                    new TextRun({
                      text: 'KRISHNA VALLEY ERP • TASK FORCE WEEKLY PERFORMANCE AUDIT',
                      size: 16,
                      color: '64748B',
                      font: 'Segoe UI',
                    }),
                  ],
                }),
              ],
            }),
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: 'Confidential Internal Report • Krishna Valley Township Operations • Page ',
                      size: 16,
                      color: '94A3B8',
                      font: 'Segoe UI',
                    }),
                    new TextRun({
                      children: [PageNumber.CURRENT],
                      size: 16,
                      color: '94A3B8',
                      font: 'Segoe UI',
                    }),
                  ],
                }),
              ],
            }),
          },
          children: [
            // Title & Header Banner
            new Paragraph({
              children: [
                new TextRun({
                  text: 'KRISHNA VALLEY ENTERPRISE ERP',
                  size: 20,
                  bold: true,
                  color: brandDarkBlue,
                  font: 'Segoe UI',
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: 'TASK FORCE WEEKLY OPERATIONAL & PERFORMANCE REPORT',
                  size: 28,
                  bold: true,
                  color: slateGray,
                  font: 'Segoe UI',
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Reporting Period: ${dateRange.formattedStart} to ${dateRange.formattedEnd} (Week #${dateRange.weekNumber}, ${dateRange.year}) | Generated on: ${formatDateTime(new Date())}`,
                  size: 18,
                  italic: true,
                  color: '475569',
                  font: 'Segoe UI',
                }),
              ],
            }),
            new Paragraph({ text: '' }),

            // Section 1: Executive KPI Summary
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              children: [
                new TextRun({
                  text: '1. Executive KPI Performance Summary',
                  bold: true,
                  color: brandDarkBlue,
                  font: 'Segoe UI',
                  size: 24,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Consolidated performance overview capturing total assigned deliverables, carried-forward commitments, completed targets, and deadline compliance.',
                  size: 18,
                  color: '475569',
                  font: 'Segoe UI',
                }),
              ],
            }),
            new Paragraph({ text: '' }),
            kpiTable,
            new Paragraph({ text: '' }),

            // Section 2: Department Breakdown
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              children: [
                new TextRun({
                  text: "2. Departmental Assigned Responsibilities & Execution Matrix",
                  bold: true,
                  color: brandDarkBlue,
                  font: 'Segoe UI',
                  size: 24,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "Detailed breakdown of each department's core responsibilities, newly assigned workloads, carried forward tasks from prior weeks, and department-level completion rate.",
                  size: 18,
                  color: '475569',
                  font: 'Segoe UI',
                }),
              ],
            }),
            new Paragraph({ text: '' }),
            deptTable,
            new Paragraph({ text: '' }),

            // Section 3: Member Performance
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              children: [
                new TextRun({
                  text: "3. Task Force Members' Contributions & Performance",
                  bold: true,
                  color: brandDarkBlue,
                  font: 'Segoe UI',
                  size: 24,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Individual performance ledger tracking Head, Supervisor, and Helper task execution, carried-over items, completion rates, and deadline adherence.',
                  size: 18,
                  color: '475569',
                  font: 'Segoe UI',
                }),
              ],
            }),
            new Paragraph({ text: '' }),
            memberTable,
            new Paragraph({ text: '' }),

            // Section 4: Carried Forward & Roadblock Focus
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              children: [
                new TextRun({
                  text: '4. Critical Focus: Carried-Forward Tasks & Overdue Deliverables',
                  bold: true,
                  color: '991B1B',
                  font: 'Segoe UI',
                  size: 24,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Highlighted register of all incomplete tasks carried forward from previous weeks or currently past their deadline, requiring manager intervention so no responsibility is overlooked.',
                  size: 18,
                  color: '475569',
                  font: 'Segoe UI',
                }),
              ],
            }),
            new Paragraph({ text: '' }),
            criticalTable,
            new Paragraph({ text: '' }),

            // Section 5: Master Task Audit Ledger
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              children: [
                new TextRun({
                  text: '5. Master Task Audit Ledger',
                  bold: true,
                  color: brandDarkBlue,
                  font: 'Segoe UI',
                  size: 24,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Chronological ledger of tasks assigned, in-progress, or finalized during this reporting period.',
                  size: 18,
                  color: '475569',
                  font: 'Segoe UI',
                }),
              ],
            }),
            new Paragraph({ text: '' }),
            taskLedgerTable,
            new Paragraph({ text: '' }),

            // Sign-off / Signature Block
            new Paragraph({ text: '' }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    makeCell('PREPARED & VERIFIED BY:\n\n___________________________________\nTask Force Manager\nKrishna Valley Township Operations', { width: 50 }),
                    makeCell('REVIEWED & APPROVED BY:\n\n___________________________________\nManaging Director / Project Director\nKrishna Valley Real Estate ERP', { width: 50 }),
                  ],
                }),
              ],
            }),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const safeDate = dateRange.formattedStart.replace(/[\s,]+/g, '_');
    const filename = `Krishna_Valley_Taskforce_Weekly_Report_${safeDate}.docx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (error) {
    console.error('Error exporting Word report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate Word report',
      error: error.message,
    });
  }
};

