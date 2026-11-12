import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Download,
  Calendar,
  Filter,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Users,
  Building2,
  Target,
  TrendingUp,
  Layers,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Shield,
  Eye,
  Award,
  ChevronRight,
  SlidersHorizontal,
  ExternalLink,
} from 'lucide-react';
import { taskforceManagerService } from '../../services/taskforceManagerService.js';
import { useToast } from '../../context/ToastContext.jsx';
import {
  getDepartmentTheme,
  getDepartmentIcon,
  getHierarchyTheme,
} from '../../utils/departmentIcons.js';

export const TaskforceWeeklyReportsTab = ({
  onSelectTask,
  onSelectMember,
  systemUsers = [],
}) => {
  const { showToast } = useToast();

  // Data & loading states
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingWord, setExportingWord] = useState(false);

  // Filters
  const [period, setPeriod] = useState('this_week');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [subView, setSubView] = useState('departments'); // 'departments' | 'members' | 'tasks' | 'carried_forward'
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [carriedFilter, setCarriedFilter] = useState('all'); // 'all' | 'carried_only' | 'new_only'

  // Fetch report data
  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = {
        period,
        department: selectedDept,
      };
      if (period === 'custom' && customStart && customEnd) {
        params.startDate = customStart;
        params.endDate = customEnd;
      }
      const res = await taskforceManagerService.getWeeklyReports(params);
      if (res && res.success && res.data) {
        setReportData(res.data);
      } else {
        throw new Error(res?.message || 'Failed to load weekly report');
      }
    } catch (err) {
      console.error('Error fetching weekly report:', err);
      showToast(err.message || 'Error loading report data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [period, selectedDept]);

  const handleApplyCustomRange = (e) => {
    e.preventDefault();
    if (!customStart || !customEnd) {
      showToast('Please select both start and end dates', 'warning');
      return;
    }
    if (new Date(customStart) > new Date(customEnd)) {
      showToast('Start date cannot be after end date', 'warning');
      return;
    }
    fetchReport();
  };

  // Export handlers
  const handleExportExcel = async () => {
    try {
      setExportingExcel(true);
      showToast('Generating weekly performance spreadsheet...', 'info');
      const params = {
        period,
        department: selectedDept,
      };
      if (period === 'custom' && customStart && customEnd) {
        params.startDate = customStart;
        params.endDate = customEnd;
      }
      await taskforceManagerService.exportWeeklyReportExcel(params);
      showToast('Weekly Excel Report downloaded successfully!', 'success');
    } catch (err) {
      console.error('Excel export error:', err);
      showToast(err.message || 'Failed to download Excel report', 'error');
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportWord = async () => {
    try {
      setExportingWord(true);
      showToast('Generating official Word (.docx) audit document...', 'info');
      const params = {
        period,
        department: selectedDept,
      };
      if (period === 'custom' && customStart && customEnd) {
        params.startDate = customStart;
        params.endDate = customEnd;
      }
      await taskforceManagerService.exportWeeklyReportWord(params);
      showToast('Weekly Word Report downloaded successfully!', 'success');
    } catch (err) {
      console.error('Word export error:', err);
      showToast(err.message || 'Failed to download Word report', 'error');
    } finally {
      setExportingWord(false);
    }
  };

  // Quick department filter helper
  const handleFilterByDepartment = (deptName) => {
    setSelectedDept(deptName);
    setSubView('tasks');
  };

  // Filtered task list for the ledger tab
  const filteredTasks = useMemo(() => {
    if (!reportData?.tasks) return [];
    return reportData.tasks.filter((t) => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesCode = (t.taskCode || '').toLowerCase().includes(q);
        const matchesTitle = (t.title || '').toLowerCase().includes(q);
        const matchesDept = (t.department || '').toLowerCase().includes(q);
        const matchesAssignee = (t.assigneeText || '').toLowerCase().includes(q);
        if (!matchesCode && !matchesTitle && !matchesDept && !matchesAssignee) {
          return false;
        }
      }

      // Priority
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) {
        return false;
      }

      // Status
      if (statusFilter !== 'all') {
        if (statusFilter === 'completed' && !t.isCompletedInPeriod) return false;
        if (statusFilter === 'in_progress' && !['in_progress', 'under_review'].includes(t.status)) return false;
        if (statusFilter === 'pending' && t.status !== 'pending') return false;
        if (statusFilter === 'overdue' && !t.isOverdue) return false;
      }

      // Carried forward
      if (carriedFilter === 'carried_only' && !t.isCarriedForward) return false;
      if (carriedFilter === 'new_only' && t.isCarriedForward) return false;

      // Sub-view: carried forward focus
      if (subView === 'carried_forward' && !t.isCarriedForward && !t.isOverdue) {
        return false;
      }

      return true;
    });
  }, [reportData, searchQuery, priorityFilter, statusFilter, carriedFilter, subView]);

  // Filtered members list
  const filteredMembers = useMemo(() => {
    if (!reportData?.memberPerformance) return [];
    return reportData.memberPerformance.filter((m) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = (m.name || '').toLowerCase().includes(q);
        const matchesDept = (m.department || '').toLowerCase().includes(q);
        const matchesTrade = (m.trade || '').toLowerCase().includes(q);
        return matchesName || matchesDept || matchesTrade;
      }
      return true;
    });
  }, [reportData, searchQuery]);

  const summary = reportData?.summary || {
    totalWorkload: 0,
    newlyAssigned: 0,
    carriedForward: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
    overdue: 0,
    completionRate: 0,
    onTimeRate: 100,
  };

  const dateRange = reportData?.dateRange || {
    formattedStart: '—',
    formattedEnd: '—',
    label: 'Current Period',
    weekNumber: '—',
    year: '—',
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-300 font-bold';
      case 'high':
        return 'bg-amber-100 text-amber-800 border-amber-300 font-semibold';
      case 'medium':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadge = (task) => {
    if (task.status === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 size={12} /> Completed
        </span>
      );
    }
    if (['in_progress', 'under_review'].includes(task.status)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
          <Clock size={12} /> In Progress
        </span>
      );
    }
    if (task.status === 'pending') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
          <AlertCircle size={12} /> Pending
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        {task.status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* 1. TOP HEADER & REPORT GENERATION TOOLBAR */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <TrendingUp size={20} />
              </span>
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Weekly Performance Reports & Analytics
                </h2>
                <p className="text-xs text-slate-500">
                  Comprehensive breakdown of department responsibilities, member contributions, and carried-forward tasks.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons: Export Excel & Word */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExportExcel}
              disabled={exportingExcel || loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-sm disabled:opacity-50"
              title="Download formatted multi-sheet Excel spreadsheet (.xlsx)"
            >
              {exportingExcel ? (
                <RefreshCw size={14} className="animate-spin text-emerald-600" />
              ) : (
                <FileSpreadsheet size={15} className="text-emerald-600" />
              )}
              <span>{exportingExcel ? 'Exporting...' : 'Export Excel (.xlsx)'}</span>
            </button>

            <button
              onClick={handleExportWord}
              disabled={exportingWord || loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors shadow-sm disabled:opacity-50"
              title="Download comprehensive executive Word report document (.docx)"
            >
              {exportingWord ? (
                <RefreshCw size={14} className="animate-spin text-indigo-600" />
              ) : (
                <FileText size={15} className="text-indigo-600" />
              )}
              <span>{exportingWord ? 'Exporting...' : 'Export Word (.docx)'}</span>
            </button>

            <button
              onClick={fetchReport}
              disabled={loading}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
              title="Refresh Report Data"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="pt-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'this_week', label: 'This Week' },
              { id: 'last_week', label: 'Last Week' },
              { id: 'last_2_weeks', label: 'Last 2 Weeks' },
              { id: 'this_month', label: 'This Month' },
              { id: 'custom', label: 'Custom Range' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  period === p.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Department Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Department:</span>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Departments</option>
              {(reportData?.departmentBreakdown || []).map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name} ({d.totalWorkload} tasks)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom Date Range Picker Accordion */}
        {period === 'custom' && (
          <form
            onSubmit={handleApplyCustomRange}
            className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3 bg-slate-50/70 p-3 rounded-xl"
          >
            <div className="flex items-center gap-2 text-xs">
              <Calendar size={14} className="text-slate-400" />
              <span className="font-medium text-slate-700">From:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-slate-700">To:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
            >
              Apply Dates
            </button>
            <span className="text-[11px] text-slate-400 italic">
              Active: {dateRange.formattedStart} to {dateRange.formattedEnd}
            </span>
          </form>
        )}
      </div>

      {/* ========================================================= */}
      {/* 2. EXECUTIVE KPI CARDS GRID */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Active Workload */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Total Workload</span>
            <Layers size={16} className="text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{summary.totalWorkload}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span className="text-indigo-600 font-semibold">+{summary.newlyAssigned} new</span>
            <span>•</span>
            <span className="text-amber-600 font-semibold">+{summary.carriedForward} carried</span>
          </div>
          <div className="absolute top-0 right-0 w-1 h-full bg-indigo-500" />
        </div>

        {/* Carried Forward Focus */}
        <div className="bg-white p-4 rounded-xl border border-amber-200/80 bg-amber-50/20 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">Carried Forward</span>
            <RotateCcw size={16} className="text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-900">{summary.carriedForward}</div>
          <div className="text-[11px] text-amber-700 mt-1">
            From prior weeks (no lapses)
          </div>
          <div className="absolute top-0 right-0 w-1 h-full bg-amber-500" />
        </div>

        {/* Tasks Completed */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/20 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">Completed</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-900">{summary.completed}</div>
          <div className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1 font-semibold">
            <span>{summary.completionRate}% completion rate</span>
          </div>
          <div className="absolute top-0 right-0 w-1 h-full bg-emerald-500" />
        </div>

        {/* In Progress */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">In Progress</span>
            <Clock size={16} className="text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{summary.inProgress}</div>
          <div className="text-[11px] text-blue-600 mt-1 font-medium">
            Active on-site execution
          </div>
          <div className="absolute top-0 right-0 w-1 h-full bg-blue-500" />
        </div>

        {/* Pending */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Pending</span>
            <AlertCircle size={16} className="text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-700">{summary.pending}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Unstarted / Awaiting queue
          </div>
          <div className="absolute top-0 right-0 w-1 h-full bg-slate-400" />
        </div>

        {/* Overdue */}
        <div className="bg-white p-4 rounded-xl border border-red-200/80 bg-red-50/20 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-red-700 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-red-800">Overdue Tasks</span>
            <AlertTriangle size={16} className="text-red-600" />
          </div>
          <div className="text-2xl font-black text-red-900">{summary.overdue}</div>
          <div className="text-[11px] text-red-700 mt-1">
            Target deadline passed
          </div>
          <div className="absolute top-0 right-0 w-1 h-full bg-red-500" />
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. SUB-VIEW TABS NAVIGATION */}
      {/* ========================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          {[
            {
              id: 'departments',
              label: 'Department Breakdown & Responsibilities',
              icon: Building2,
              badge: reportData?.departmentBreakdown?.length || 0,
            },
            {
              id: 'members',
              label: 'Task Force Members & Performance',
              icon: Users,
              badge: reportData?.memberPerformance?.length || 0,
            },
            {
              id: 'tasks',
              label: 'Master Task Ledger',
              icon: Layers,
              badge: reportData?.tasks?.length || 0,
            },
            {
              id: 'carried_forward',
              label: 'Carried Forward & Overdue Focus',
              icon: RotateCcw,
              badge: (summary.carriedForward || 0) + (summary.overdue || 0),
              highlight: true,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = subView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSubView(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : tab.highlight && tab.badge > 0
                      ? 'bg-red-100 text-red-700 font-extrabold'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search input in view header */}
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search report..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. SUB-VIEW 1: DEPARTMENT BREAKDOWN */}
      {/* ========================================================= */}
      {subView === 'departments' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Departmental Assigned Responsibilities & Execution Matrix
                </h3>
                <p className="text-xs text-slate-500">
                  Detailed scope of duties, carried-forward commitments, and active workloads per functional unit.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-xs">
                {reportData?.departmentBreakdown?.length || 0} Functional Units
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Department & Code</th>
                    <th className="py-3 px-4 min-w-[280px]">Assigned Responsibilities & Scope</th>
                    <th className="py-3 px-3">Head / Lead</th>
                    <th className="py-3 px-3 text-center">Carried Fwd</th>
                    <th className="py-3 px-3 text-center">New</th>
                    <th className="py-3 px-3 text-center">Workload</th>
                    <th className="py-3 px-3 text-center">Completed</th>
                    <th className="py-3 px-3 text-center">In Progress</th>
                    <th className="py-3 px-3 text-center">Overdue</th>
                    <th className="py-3 px-4 text-center">Completion %</th>
                    <th className="py-3 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(reportData?.departmentBreakdown || []).map((dept) => {
                    const theme = getDepartmentTheme(dept.name);
                    const iconClass = getDepartmentIcon(dept.name);

                    return (
                      <tr key={dept.name} className="hover:bg-slate-50/80 transition-colors">
                        {/* Dept Name */}
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0"
                              style={{ backgroundColor: theme.bg, color: theme.color, border: `1px solid ${theme.border}` }}
                            >
                              <i className={iconClass} />
                            </span>
                            <div>
                              <div className="font-bold text-slate-900">{dept.name}</div>
                              <span className="text-[10px] font-semibold text-slate-400 tracking-wider">
                                {dept.code || 'KV-DEPT'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Responsibilities */}
                        <td className="py-3 px-4 text-slate-600 leading-relaxed">
                          <p className="line-clamp-2" title={dept.responsibilities}>
                            {dept.responsibilities}
                          </p>
                        </td>

                        {/* Head */}
                        <td className="py-3 px-3 font-medium text-slate-700 whitespace-nowrap">
                          {dept.headName !== 'Unassigned' ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                              <Shield size={12} className="text-indigo-600" />
                              {dept.headName}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                        </td>

                        {/* Carried Forward */}
                        <td className="py-3 px-3 text-center font-bold">
                          {dept.carriedForward > 0 ? (
                            <span className="inline-block px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[11px]">
                              {dept.carriedForward}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>

                        {/* Newly Assigned */}
                        <td className="py-3 px-3 text-center font-medium text-slate-700">
                          {dept.newlyAssigned}
                        </td>

                        {/* Total Workload */}
                        <td className="py-3 px-3 text-center font-black text-slate-900">
                          {dept.totalWorkload}
                        </td>

                        {/* Completed */}
                        <td className="py-3 px-3 text-center font-bold text-emerald-700">
                          {dept.completed > 0 ? (
                            <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px]">
                              {dept.completed}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>

                        {/* In Progress */}
                        <td className="py-3 px-3 text-center font-medium text-blue-700">
                          {dept.inProgress}
                        </td>

                        {/* Overdue */}
                        <td className="py-3 px-3 text-center font-bold">
                          {dept.overdue > 0 ? (
                            <span className="inline-block px-2 py-0.5 rounded-md bg-red-100 text-red-800 text-[11px]">
                              {dept.overdue}
                            </span>
                          ) : (
                            <span className="text-slate-300">0</span>
                          )}
                        </td>

                        {/* Completion Rate */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                              <div
                                className={`h-full rounded-full ${
                                  dept.completionRate >= 80
                                    ? 'bg-emerald-500'
                                    : dept.completionRate >= 50
                                    ? 'bg-blue-500'
                                    : 'bg-amber-500'
                                }`}
                                style={{ width: `${Math.min(100, dept.completionRate)}%` }}
                              />
                            </div>
                            <span className="font-bold text-slate-800 text-[11px] w-9 text-right">
                              {dept.completionRate}%
                            </span>
                          </div>
                        </td>

                        {/* Action: Filter Tasks */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleFilterByDepartment(dept.name)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            <span>Tasks</span>
                            <ArrowRight size={11} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. SUB-VIEW 2: MEMBER PERFORMANCE & CONTRIBUTIONS */}
      {/* ========================================================= */}
      {subView === 'members' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Task Force Personnel Contributions & Accountability
                </h3>
                <p className="text-xs text-slate-500">
                  Tracking deliverables for Heads, Supervisors, and Helpers, including carried-over and overdue tasks.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-xs">
                {filteredMembers.length} Members Listed
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Member Name</th>
                    <th className="py-3 px-3">Hierarchy Tier</th>
                    <th className="py-3 px-3">Department / Trade</th>
                    <th className="py-3 px-3">Supervisor / Head</th>
                    <th className="py-3 px-3 text-center">Carried Fwd</th>
                    <th className="py-3 px-3 text-center">New</th>
                    <th className="py-3 px-3 text-center">Total Workload</th>
                    <th className="py-3 px-3 text-center">Completed</th>
                    <th className="py-3 px-3 text-center">In Progress</th>
                    <th className="py-3 px-3 text-center">Overdue</th>
                    <th className="py-3 px-4 text-center">Completion %</th>
                    <th className="py-3 px-3 text-center">Rating</th>
                    <th className="py-3 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMembers.map((m) => {
                    const tierTheme = getHierarchyTheme(m.hierarchyLevel);

                    return (
                      <tr key={m.id || m.name} className="hover:bg-slate-50/80 transition-colors">
                        {/* Name */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{m.name}</div>
                          <div className="text-[10px] text-slate-400">{m.mobileNo !== '—' ? m.mobileNo : m.email}</div>
                        </td>

                        {/* Hierarchy Level */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider"
                            style={{ backgroundColor: tierTheme.bg, color: tierTheme.color, border: `1px solid ${tierTheme.border}` }}
                          >
                            <i className={tierTheme.icon} />
                            {m.hierarchyLevel}
                          </span>
                        </td>

                        {/* Department / Trade */}
                        <td className="py-3 px-3 font-medium text-slate-700 whitespace-nowrap">
                          <div>{m.department}</div>
                          {m.trade && m.trade !== m.department && (
                            <span className="text-[10px] text-slate-400 font-normal">({m.trade})</span>
                          )}
                        </td>

                        {/* Supervisor */}
                        <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                          {m.head !== '—' ? m.head : m.supervisor}
                        </td>

                        {/* Carried Forward */}
                        <td className="py-3 px-3 text-center font-bold">
                          {m.carriedForward > 0 ? (
                            <span className="inline-block px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[11px]">
                              {m.carriedForward}
                            </span>
                          ) : (
                            <span className="text-slate-300">0</span>
                          )}
                        </td>

                        {/* Newly Assigned */}
                        <td className="py-3 px-3 text-center font-medium text-slate-700">
                          {m.newlyAssigned}
                        </td>

                        {/* Total Workload */}
                        <td className="py-3 px-3 text-center font-black text-slate-900">
                          {m.totalWorkload}
                        </td>

                        {/* Completed */}
                        <td className="py-3 px-3 text-center font-bold text-emerald-700">
                          {m.completed > 0 ? (
                            <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px]">
                              {m.completed}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>

                        {/* In Progress */}
                        <td className="py-3 px-3 text-center font-medium text-blue-700">
                          {m.inProgress}
                        </td>

                        {/* Overdue */}
                        <td className="py-3 px-3 text-center font-bold">
                          {m.overdue > 0 ? (
                            <span className="inline-block px-2 py-0.5 rounded-md bg-red-100 text-red-800 text-[11px]">
                              {m.overdue}
                            </span>
                          ) : (
                            <span className="text-slate-300">0</span>
                          )}
                        </td>

                        {/* Completion Rate */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5 font-bold text-slate-800 text-[11px]">
                            <span>{m.completionRate}%</span>
                          </div>
                        </td>

                        {/* Rating */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              m.performanceRating === 'Excellent'
                                ? 'bg-emerald-100 text-emerald-800'
                                : m.performanceRating === 'Good'
                                ? 'bg-blue-100 text-blue-800'
                                : m.performanceRating === 'Average'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {m.performanceRating}
                          </span>
                        </td>

                        {/* Action: Open Member Drawer */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <button
                            onClick={() => onSelectMember && onSelectMember(m)}
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            title="View Member Profile & Tasks"
                          >
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. SUB-VIEW 3 & 4: TASK AUDIT LEDGER & CARRIED FORWARD FOCUS */}
      {/* ========================================================= */}
      {(subView === 'tasks' || subView === 'carried_forward') && (
        <div className="space-y-4">
          {/* Carried Forward Focus Alert Banner */}
          {subView === 'carried_forward' && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
              <div>
                <h4 className="text-xs font-bold text-amber-900">
                  Critical Focus: Incomplete Responsibilities Carried Forward
                </h4>
                <p className="text-xs text-amber-700 mt-0.5">
                  The tasks listed below were initiated in prior weeks or are past deadline. Review and allocate immediate field resources so no project milestone is delayed.
                </p>
              </div>
            </div>
          )}

          {/* Table Filters Toolbar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-600 flex items-center gap-1">
                <SlidersHorizontal size={13} /> Filters:
              </span>

              {/* Priority Filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700"
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed in Week</option>
                <option value="in_progress">In Progress</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue Only</option>
              </select>

              {/* Carried Over Filter */}
              {subView === 'tasks' && (
                <select
                  value={carriedFilter}
                  onChange={(e) => setCarriedFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700"
                >
                  <option value="all">All Task Origins</option>
                  <option value="carried_only">Carried Forward Only</option>
                  <option value="new_only">Newly Assigned in Week</option>
                </select>
              )}
            </div>

            <div className="text-slate-500 font-medium">
              Showing <span className="font-bold text-slate-900">{filteredTasks.length}</span> tasks
            </div>
          </div>

          {/* Master Task Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Task Code</th>
                    <th className="py-3 px-4 min-w-[240px]">Task Title & Scope</th>
                    <th className="py-3 px-3">Department</th>
                    <th className="py-3 px-3">Priority</th>
                    <th className="py-3 px-3">Assigned Member(s)</th>
                    <th className="py-3 px-3">Assignment Date</th>
                    <th className="py-3 px-3">Deadline</th>
                    <th className="py-3 px-3">Current Status</th>
                    <th className="py-3 px-3">Completion Date</th>
                    <th className="py-3 px-3 text-center">Origin</th>
                    <th className="py-3 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan="11" className="py-12 text-center text-slate-400 font-medium">
                        No tasks found matching the selected period and filters.
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((t) => {
                      const deptTheme = getDepartmentTheme(t.department);

                      return (
                        <tr key={t._id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Task Code */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <button
                              onClick={() => onSelectTask && onSelectTask(t._id)}
                              className="font-mono font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                            >
                              {t.taskCode}
                            </button>
                            {t.isMDDirective && (
                              <span className="ml-1.5 px-1 py-0.2 bg-purple-100 text-purple-800 text-[9px] font-black rounded uppercase">
                                MD
                              </span>
                            )}
                          </td>

                          {/* Title */}
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900 leading-snug">{t.title}</div>
                            {t.apartmentContext && (
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Unit: {t.apartmentContext}
                              </div>
                            )}
                            {t.hasRoadblock && (
                              <div className="text-[10px] text-red-600 font-semibold mt-0.5 flex items-center gap-1">
                                <AlertTriangle size={11} /> Roadblock: {t.roadblockReason || 'Active roadblock'}
                              </div>
                            )}
                          </td>

                          {/* Department */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase"
                              style={{ backgroundColor: deptTheme.bg, color: deptTheme.color, border: `1px solid ${deptTheme.border}` }}
                            >
                              {t.department}
                            </span>
                          </td>

                          {/* Priority */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[10px] uppercase border ${getPriorityBadgeClass(
                                t.priority
                              )}`}
                            >
                              {t.priority}
                            </span>
                          </td>

                          {/* Assigned Members */}
                          <td className="py-3 px-3 text-slate-700 whitespace-nowrap font-medium">
                            <span title={t.assigneeText}>
                              {t.primaryAssignee}
                              {t.assignees.length > 1 && (
                                <span className="ml-1 text-[10px] text-slate-400 font-normal">
                                  +{t.assignees.length - 1} more
                                </span>
                              )}
                            </span>
                          </td>

                          {/* Assignment Date */}
                          <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                            {t.startDate ? new Date(t.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                          </td>

                          {/* Deadline */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className={t.isOverdue ? 'font-bold text-red-600' : 'text-slate-600'}>
                              {t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            {getStatusBadge(t)}
                          </td>

                          {/* Completion Date */}
                          <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                            {t.completedAt
                              ? new Date(t.completedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                              : '—'}
                          </td>

                          {/* Carried Forward Origin */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {t.isCarriedForward ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                                <RotateCcw size={10} /> Carried Over
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                New in Week
                              </span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <button
                              onClick={() => onSelectTask && onSelectTask(t._id)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Inspect Task Detail"
                            >
                              <ExternalLink size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskforceWeeklyReportsTab;

