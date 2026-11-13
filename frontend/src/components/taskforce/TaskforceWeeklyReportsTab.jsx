import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Calendar,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Users,
  Building2,
  Layers,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  Shield,
  Eye,
  SlidersHorizontal,
  ExternalLink,
  TrendingUp,
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
  const [carriedFilter, setCarriedFilter] = useState('all');

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
      showToast('⏳ Generating weekly performance spreadsheet...', 'info');
      const params = {
        period,
        department: selectedDept,
      };
      if (period === 'custom' && customStart && customEnd) {
        params.startDate = customStart;
        params.endDate = customEnd;
      }
      const result = await taskforceManagerService.exportWeeklyReportExcel(params);
      const fname = result?.filename || 'Report.xlsx';
      const sizeKB = result?.size ? Math.round(result.size / 1024) : '—';
      showToast(`✅ Excel report exported successfully! (${fname}, ${sizeKB} KB)`, 'success');
    } catch (err) {
      console.error('Excel export error:', err);
      showToast(`❌ ${err.message || 'Failed to download Excel report'}`, 'error');
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportWord = async () => {
    try {
      setExportingWord(true);
      showToast('⏳ Generating official Word (.docx) audit document...', 'info');
      const params = {
        period,
        department: selectedDept,
      };
      if (period === 'custom' && customStart && customEnd) {
        params.startDate = customStart;
        params.endDate = customEnd;
      }
      const result = await taskforceManagerService.exportWeeklyReportWord(params);
      const fname = result?.filename || 'Report.docx';
      const sizeKB = result?.size ? Math.round(result.size / 1024) : '—';
      showToast(`✅ Word report exported successfully! (${fname}, ${sizeKB} KB)`, 'success');
    } catch (err) {
      console.error('Word export error:', err);
      showToast(`❌ ${err.message || 'Failed to download Word report'}`, 'error');
    } finally {
      setExportingWord(false);
    }
  };

  const handleFilterByDepartment = (deptName) => {
    setSelectedDept(deptName);
    setSubView('tasks');
  };

  // Filtered task list
  const filteredTasks = useMemo(() => {
    if (!reportData?.tasks) return [];
    return reportData.tasks.filter((t) => {
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

      if (priorityFilter !== 'all' && t.priority !== priorityFilter) {
        return false;
      }

      if (statusFilter !== 'all') {
        if (statusFilter === 'completed' && !t.isCompletedInPeriod) return false;
        if (statusFilter === 'in_progress' && !['in_progress', 'under_review'].includes(t.status)) return false;
        if (statusFilter === 'pending' && t.status !== 'pending') return false;
        if (statusFilter === 'overdue' && !t.isOverdue) return false;
      }

      if (carriedFilter === 'carried_only' && !t.isCarriedForward) return false;
      if (carriedFilter === 'new_only' && t.isCarriedForward) return false;

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

  const getPriorityBadgeStyle = (priority) => {
    switch (priority) {
      case 'urgent':
        return { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', fontWeight: '800' };
      case 'high':
        return { background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', fontWeight: '700' };
      case 'medium':
        return { background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', fontWeight: '600' };
      default:
        return { background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', fontWeight: '500' };
    }
  };

  const renderStatusBadge = (task) => {
    if (task.status === 'completed') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 700,
            background: '#dcfce7',
            color: '#15803d',
            border: '1px solid #bbf7d0',
          }}
        >
          <CheckCircle2 size={12} /> Completed
        </span>
      );
    }
    if (['in_progress', 'under_review'].includes(task.status)) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 700,
            background: '#e0f2fe',
            color: '#0369a1',
            border: '1px solid #bae6fd',
          }}
        >
          <Clock size={12} /> In Progress
        </span>
      );
    }
    if (task.status === 'pending') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 700,
            background: '#fef3c7',
            color: '#92400e',
            border: '1px solid #fde68a',
          }}
        >
          <AlertCircle size={12} /> Pending
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: 600,
          background: '#f1f5f9',
          color: '#475569',
          border: '1px solid #e2e8f0',
        }}
      >
        {task.status}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
      {/* Inject spinner keyframes for export buttons */}
      <style>{`
        @keyframes kvReportSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes kvReportPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      {/* Export Processing Overlay */}
      {(exportingExcel || exportingWord) && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '36px 48px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            maxWidth: '380px',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: `4px solid ${exportingExcel ? '#d1fae5' : '#e0e7ff'}`,
              borderTopColor: exportingExcel ? '#059669' : '#4f46e5',
              borderRadius: '50%',
              animation: 'kvReportSpin 0.8s linear infinite',
            }} />
            <div style={{
              fontSize: '1.05rem',
              fontWeight: '700',
              color: '#0f172a',
            }}>
              {exportingExcel ? '📊 Generating Excel Report...' : '📝 Generating Word Report...'}
            </div>
            <div style={{
              fontSize: '0.82rem',
              color: '#64748b',
              animation: 'kvReportPulse 1.5s ease-in-out infinite',
            }}>
              Compiling department metrics, member performance & task ledger. This may take a few seconds...
            </div>
          </div>
        </div>
      )}
      {/* ========================================================= */}
      {/* 1. TOP HEADER & REPORT GENERATION TOOLBAR */}
      {/* ========================================================= */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '20px 24px',
          boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)',
              }}
            >
              <TrendingUp size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>
                Weekly Performance Reports &amp; Analytics
              </h2>
              <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                Comprehensive breakdown of department responsibilities, member contributions, and carried-forward tasks.
              </span>
            </div>
          </div>

          {/* Action Buttons: Export Excel & Word */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={handleExportExcel}
              disabled={exportingExcel || loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                borderRadius: '10px',
                background: exportingExcel ? '#d1fae5' : '#ecfdf5',
                color: '#065f46',
                border: '1.5px solid #a7f3d0',
                fontSize: '0.82rem',
                fontWeight: '700',
                cursor: exportingExcel || loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 6px rgba(5, 150, 105, 0.1)',
                transition: 'all 0.15s ease',
                opacity: exportingExcel || loading ? 0.7 : 1,
              }}
              title="Download formatted multi-sheet Excel spreadsheet (.xlsx)"
            >
              {exportingExcel ? (
                <span style={{
                  display: 'inline-block',
                  width: '14px',
                  height: '14px',
                  border: '2.5px solid #a7f3d0',
                  borderTopColor: '#059669',
                  borderRadius: '50%',
                  animation: 'kvReportSpin 0.8s linear infinite',
                }} />
              ) : (
                <FileSpreadsheet size={15} color="#059669" />
              )}
              <span>{exportingExcel ? 'Generating Report...' : 'Export Excel (.xlsx)'}</span>
            </button>

            <button
              onClick={handleExportWord}
              disabled={exportingWord || loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                borderRadius: '10px',
                background: exportingWord ? '#e0e7ff' : '#eef2ff',
                color: '#3730a3',
                border: '1.5px solid #c7d2fe',
                fontSize: '0.82rem',
                fontWeight: '700',
                cursor: exportingWord || loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 6px rgba(79, 70, 229, 0.1)',
                transition: 'all 0.15s ease',
                opacity: exportingWord || loading ? 0.7 : 1,
              }}
              title="Download comprehensive executive Word report document (.docx)"
            >
              {exportingWord ? (
                <span style={{
                  display: 'inline-block',
                  width: '14px',
                  height: '14px',
                  border: '2.5px solid #c7d2fe',
                  borderTopColor: '#4f46e5',
                  borderRadius: '50%',
                  animation: 'kvReportSpin 0.8s linear infinite',
                }} />
              ) : (
                <FileText size={15} color="#4f46e5" />
              )}
              <span>{exportingWord ? 'Generating Report...' : 'Export Word (.docx)'}</span>
            </button>

            <button
              onClick={fetchReport}
              disabled={loading}
              style={{
                padding: '9px 12px',
                borderRadius: '10px',
                background: '#f8fafc',
                color: '#475569',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Refresh Report Data"
            >
              <RefreshCw size={15} style={loading ? { animation: 'kvReportSpin 0.8s linear infinite' } : {}} />
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          {/* Preset Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
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
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  transition: 'all 0.15s ease',
                  background: period === p.id ? '#0f172a' : '#f1f5f9',
                  color: period === p.id ? '#ffffff' : '#475569',
                  boxShadow: period === p.id ? '0 2px 6px rgba(15, 23, 42, 0.15)' : 'none',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Department Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>Department:</span>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              style={{
                height: '34px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
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

        {/* Custom Date Range Picker */}
        {period === 'custom' && (
          <form
            onSubmit={handleApplyCustomRange}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
              background: '#f8fafc',
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}>
              <Calendar size={14} color="#64748b" />
              <span style={{ fontWeight: 600, color: '#334155' }}>From:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.78rem',
                }}
                required
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}>
              <span style={{ fontWeight: 600, color: '#334155' }}>To:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.78rem',
                }}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                background: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Apply Dates
            </button>
            <span style={{ fontSize: '0.74rem', color: '#64748b', fontStyle: 'italic' }}>
              Active Window: {dateRange.formattedStart} to {dateRange.formattedEnd}
            </span>
          </form>
        )}
      </div>

      {/* ========================================================= */}
      {/* 2. EXECUTIVE KPI CARDS GRID */}
      {/* ========================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '14px',
        }}
      >
        {/* Total Active Workload */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            borderTop: '4px solid #4f46e5',
            padding: '16px 18px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>
              Total Workload
            </span>
            <Layers size={16} color="#4f46e5" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0f172a' }}>
            {summary.totalWorkload}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
            <span style={{ color: '#4f46e5', fontWeight: 700 }}>+{summary.newlyAssigned} new</span>
            <span> • </span>
            <span style={{ color: '#d97706', fontWeight: 700 }}>+{summary.carriedForward} carried</span>
          </div>
        </div>

        {/* Carried Forward Focus */}
        <div
          style={{
            background: '#fffbeb',
            borderRadius: '14px',
            border: '1px solid #fde68a',
            borderTop: '4px solid #d97706',
            padding: '16px 18px',
            boxShadow: '0 2px 8px rgba(217, 119, 6, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: '#92400e' }}>
              Carried Forward
            </span>
            <RotateCcw size={16} color="#d97706" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#78350f' }}>
            {summary.carriedForward}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 600, marginTop: '4px' }}>
            From prior weeks (no lapses)
          </div>
        </div>

        {/* Tasks Completed */}
        <div
          style={{
            background: '#f0fdf4',
            borderRadius: '14px',
            border: '1px solid #bbf7d0',
            borderTop: '4px solid #16a34a',
            padding: '16px 18px',
            boxShadow: '0 2px 8px rgba(22, 163, 74, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: '#166534' }}>
              Completed
            </span>
            <CheckCircle2 size={16} color="#16a34a" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#14532d' }}>
            {summary.completed}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 700, marginTop: '4px' }}>
            {summary.completionRate}% completion rate
          </div>
        </div>

        {/* In Progress */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            borderTop: '4px solid #0284c7',
            padding: '16px 18px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>
              In Progress
            </span>
            <Clock size={16} color="#0284c7" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0f172a' }}>
            {summary.inProgress}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: 600, marginTop: '4px' }}>
            Active on-site execution
          </div>
        </div>

        {/* Pending */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            borderTop: '4px solid #94a3b8',
            padding: '16px 18px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>
              Pending
            </span>
            <AlertCircle size={16} color="#94a3b8" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#475569' }}>
            {summary.pending}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
            Unstarted / In queue
          </div>
        </div>

        {/* Overdue */}
        <div
          style={{
            background: '#fef2f2',
            borderRadius: '14px',
            border: '1px solid #fecaca',
            borderTop: '4px solid #dc2626',
            padding: '16px 18px',
            boxShadow: '0 2px 8px rgba(220, 38, 38, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: '#991b1b' }}>
              Overdue Tasks
            </span>
            <AlertTriangle size={16} color="#dc2626" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#7f1d1d' }}>
            {summary.overdue}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#b91c1c', fontWeight: 600, marginTop: '4px' }}>
            Target deadline passed
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. SUB-VIEW TABS NAVIGATION */}
      {/* ========================================================= */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto' }}>
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
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 16px',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: isActive ? '1px solid #4f46e5' : '1px solid transparent',
                  background: isActive ? '#4f46e5' : '#f8fafc',
                  color: isActive ? '#ffffff' : '#475569',
                  boxShadow: isActive ? '0 2px 8px rgba(79, 70, 229, 0.25)' : 'none',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
                <span
                  style={{
                    padding: '2px 7px',
                    borderRadius: '6px',
                    fontSize: '10px',
                    fontWeight: 800,
                    background: isActive
                      ? 'rgba(255,255,255,0.25)'
                      : tab.highlight && tab.badge > 0
                      ? '#fee2e2'
                      : '#e2e8f0',
                    color: isActive
                      ? '#ffffff'
                      : tab.highlight && tab.badge > 0
                      ? '#991b1b'
                      : '#334155',
                  }}
                >
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search input in view header */}
        <div style={{ position: 'relative', minWidth: '220px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search report..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 12px 7px 32px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.78rem',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. SUB-VIEW 1: DEPARTMENT BREAKDOWN */}
      {/* ========================================================= */}
      {subView === 'departments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: '#0f172a' }}>
                  Departmental Assigned Responsibilities &amp; Execution Matrix
                </h3>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  Detailed scope of duties, carried-forward commitments, and active workloads per functional unit.
                </span>
              </div>
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: '700',
                  color: '#334155',
                  background: '#ffffff',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                }}
              >
                {reportData?.departmentBreakdown?.length || 0} Functional Units
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', color: '#475569', textTransform: 'uppercase', fontSize: '10px', fontWeight: 800 }}>
                    <th style={{ padding: '12px 16px' }}>Department &amp; Code</th>
                    <th style={{ padding: '12px 16px', minWidth: '260px' }}>Assigned Responsibilities &amp; Scope</th>
                    <th style={{ padding: '12px 12px' }}>Head / Lead</th>
                    <th style={{ padding: '12px 10px', textAlign: 'center' }}>Carried Fwd</th>
                    <th style={{ padding: '12px 10px', textAlign: 'center' }}>New</th>
                    <th style={{ padding: '12px 10px', textAlign: 'center' }}>Workload</th>
                    <th style={{ padding: '12px 10px', textAlign: 'center' }}>Completed</th>
                    <th style={{ padding: '12px 10px', textAlign: 'center' }}>In Progress</th>
                    <th style={{ padding: '12px 10px', textAlign: 'center' }}>Overdue</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Completion %</th>
                    <th style={{ padding: '12px 12px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(reportData?.departmentBreakdown || []).map((dept) => {
                    const theme = getDepartmentTheme(dept.name);
                    const iconClass = getDepartmentIcon(dept.name);

                    return (
                      <tr
                        key={dept.name}
                        style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        {/* Dept Name */}
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span
                              style={{
                                width: '30px',
                                height: '30px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                flexShrink: 0,
                                backgroundColor: theme.bg,
                                color: theme.color,
                                border: `1px solid ${theme.border}`,
                              }}
                            >
                              <i className={iconClass} />
                            </span>
                            <div>
                              <div style={{ fontWeight: 800, color: '#0f172a' }}>{dept.name}</div>
                              <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8' }}>
                                {dept.code || 'KV-DEPT'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Responsibilities */}
                        <td style={{ padding: '12px 16px', color: '#475569', lineHeight: 1.5 }}>
                          <span title={dept.responsibilities}>{dept.responsibilities}</span>
                        </td>

                        {/* Head */}
                        <td style={{ padding: '12px 12px', whiteSpace: 'nowrap' }}>
                          {dept.headName !== 'Unassigned' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700, color: '#1e293b' }}>
                              <Shield size={12} color="#4f46e5" />
                              {dept.headName}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Unassigned</span>
                          )}
                        </td>

                        {/* Carried Forward */}
                        <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 800 }}>
                          {dept.carriedForward > 0 ? (
                            <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '6px', fontSize: '11px' }}>
                              {dept.carriedForward}
                            </span>
                          ) : (
                            <span style={{ color: '#cbd5e1' }}>0</span>
                          )}
                        </td>

                        {/* Newly Assigned */}
                        <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 600, color: '#334155' }}>
                          {dept.newlyAssigned}
                        </td>

                        {/* Total Workload */}
                        <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 900, color: '#0f172a' }}>
                          {dept.totalWorkload}
                        </td>

                        {/* Completed */}
                        <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 800 }}>
                          {dept.completed > 0 ? (
                            <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '6px', fontSize: '11px' }}>
                              {dept.completed}
                            </span>
                          ) : (
                            <span style={{ color: '#cbd5e1' }}>0</span>
                          )}
                        </td>

                        {/* In Progress */}
                        <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 600, color: '#0284c7' }}>
                          {dept.inProgress}
                        </td>

                        {/* Overdue */}
                        <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 800 }}>
                          {dept.overdue > 0 ? (
                            <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '6px', fontSize: '11px' }}>
                              {dept.overdue}
                            </span>
                          ) : (
                            <span style={{ color: '#cbd5e1' }}>0</span>
                          )}
                        </td>

                        {/* Completion Rate */}
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <div style={{ width: '60px', background: '#f1f5f9', borderRadius: '8px', height: '6px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  height: '100%',
                                  borderRadius: '8px',
                                  width: `${Math.min(100, dept.completionRate)}%`,
                                  background: dept.completionRate >= 80 ? '#16a34a' : dept.completionRate >= 40 ? '#0284c7' : '#d97706',
                                }}
                              />
                            </div>
                            <span style={{ fontWeight: 800, fontSize: '11px', color: '#0f172a', width: '35px', textAlign: 'right' }}>
                              {dept.completionRate}%
                            </span>
                          </div>
                        </td>

                        {/* Action: Filter Tasks */}
                        <td style={{ padding: '12px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <button
                            onClick={() => handleFilterByDepartment(dept.name)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              color: '#4f46e5',
                              background: '#eef2ff',
                              border: '1px solid #c7d2fe',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                            }}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: '#0f172a' }}>
                  Task Force Personnel Contributions &amp; Accountability
                </h3>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  Tracking deliverables for Heads, Supervisors, and Helpers, including carried-over and overdue tasks.
                </span>
              </div>
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: '700',
                  color: '#334155',
                  background: '#ffffff',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                }}
              >
                {filteredMembers.length} Members Listed
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', color: '#475569', textTransform: 'uppercase', fontSize: '10px', fontWeight: 800 }}>
                    <th style={{ padding: '12px 16px' }}>Member Name</th>
                    <th style={{ padding: '12px 12px' }}>Hierarchy Tier</th>
                    <th style={{ padding: '12px 12px' }}>Department / Trade</th>
                    <th style={{ padding: '12px 12px' }}>Supervisor / Head</th>
                    <th style={{ padding: '12px 10px', textAlign: 'center' }}>Carried Fwd</th>
                    <th style={{ padding: '12px 10px', textAlign: 'center' }}>New</th>
                    <th style={{ padding: '12px 10px', textAlign: 'center' }}>Workload</th>
                    <th style={{ padding: '12px 10px', textAlign: 'center' }}>Completed</th>
                    <th style={{ padding: '12px 10px', textAlign: 'center' }}>In Progress</th>
                    <th style={{ padding: '12px 10px', textAlign: 'center' }}>Overdue</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>Completion %</th>
                    <th style={{ padding: '12px 12px', textAlign: 'center' }}>Rating</th>
                    <th style={{ padding: '12px 12px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((m) => {
                    const tierTheme = getHierarchyTheme(m.hierarchyLevel);

                    return (
                      <tr
                        key={m.id || m.name}
                        style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        {/* Name */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>{m.name}</div>
                          <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                            {m.mobileNo !== '—' ? m.mobileNo : m.email}
                          </div>
                        </td>

                        {/* Hierarchy Level */}
                        <td style={{ padding: '12px 12px', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '12px',
                              fontSize: '10px',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              backgroundColor: tierTheme.bg,
                              color: tierTheme.color,
                              border: `1px solid ${tierTheme.border}`,
                            }}
                          >
                            <i className={tierTheme.icon} />
                            {m.hierarchyLevel}
                          </span>
                        </td>

                        {/* Department / Trade */}
                        <td style={{ padding: '12px 12px', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>
                          <div>{m.department}</div>
                          {m.trade && m.trade !== m.department && (
                            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 400 }}>({m.trade})</span>
                          )}
                        </td>

                        {/* Supervisor */}
                        <td style={{ padding: '12px 12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                          {m.head !== '—' ? m.head : m.supervisor}
                        </td>

                        {/* Carried Forward */}
                        <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 800 }}>
                          {m.carriedForward > 0 ? (
                            <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '6px', fontSize: '11px' }}>
                              {m.carriedForward}
                            </span>
                          ) : (
                            <span style={{ color: '#cbd5e1' }}>0</span>
                          )}
                        </td>

                        {/* Newly Assigned */}
                        <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 600, color: '#334155' }}>
                          {m.newlyAssigned}
                        </td>

                        {/* Total Workload */}
                        <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 900, color: '#0f172a' }}>
                          {m.totalWorkload}
                        </td>

                        {/* Completed */}
                        <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 800 }}>
                          {m.completed > 0 ? (
                            <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '6px', fontSize: '11px' }}>
                              {m.completed}
                            </span>
                          ) : (
                            <span style={{ color: '#cbd5e1' }}>0</span>
                          )}
                        </td>

                        {/* In Progress */}
                        <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 600, color: '#0284c7' }}>
                          {m.inProgress}
                        </td>

                        {/* Overdue */}
                        <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 800 }}>
                          {m.overdue > 0 ? (
                            <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '6px', fontSize: '11px' }}>
                              {m.overdue}
                            </span>
                          ) : (
                            <span style={{ color: '#cbd5e1' }}>0</span>
                          )}
                        </td>

                        {/* Completion Rate */}
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>
                          {m.completionRate}%
                        </td>

                        {/* Rating */}
                        <td style={{ padding: '12px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '10px',
                              fontWeight: 800,
                              background:
                                m.performanceRating === 'Excellent'
                                  ? '#dcfce7'
                                  : m.performanceRating === 'Good'
                                  ? '#e0f2fe'
                                  : m.performanceRating === 'Average'
                                  ? '#fef3c7'
                                  : '#fee2e2',
                              color:
                                m.performanceRating === 'Excellent'
                                  ? '#15803d'
                                  : m.performanceRating === 'Good'
                                  ? '#0369a1'
                                  : m.performanceRating === 'Average'
                                  ? '#92400e'
                                  : '#991b1b',
                            }}
                          >
                            {m.performanceRating}
                          </span>
                        </td>

                        {/* Action: Open Member Drawer */}
                        <td style={{ padding: '12px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <button
                            onClick={() => onSelectMember && onSelectMember(m)}
                            style={{
                              padding: '5px 8px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              color: '#475569',
                              cursor: 'pointer',
                            }}
                            title="View Member Profile & Tasks"
                          >
                            <Eye size={13} />
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Carried Forward Focus Alert Banner */}
          {subView === 'carried_forward' && (
            <div
              style={{
                padding: '16px 20px',
                borderRadius: '14px',
                background: '#fffbeb',
                border: '1px solid #fde68a',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              <AlertTriangle color="#d97706" size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#92400e' }}>
                  Critical Focus: Incomplete Responsibilities Carried Forward
                </h4>
                <p style={{ margin: '4px 0 0', fontSize: '0.76rem', color: '#b45309', lineHeight: 1.5 }}>
                  The tasks listed below were initiated in prior weeks or are past deadline. Review and allocate immediate field resources so no project milestone is delayed.
                </p>
              </div>
            </div>
          )}

          {/* Table Filters Toolbar */}
          <div
            style={{
              background: '#ffffff',
              padding: '12px 18px',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              fontSize: '0.78rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <SlidersHorizontal size={13} /> Filters:
              </span>

              {/* Priority Filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.76rem' }}
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
                style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.76rem' }}
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
                  style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.76rem' }}
                >
                  <option value="all">All Task Origins</option>
                  <option value="carried_only">Carried Forward Only</option>
                  <option value="new_only">Newly Assigned in Week</option>
                </select>
              )}
            </div>

            <div style={{ color: '#64748b', fontWeight: 600 }}>
              Showing <span style={{ fontWeight: 800, color: '#0f172a' }}>{filteredTasks.length}</span> tasks
            </div>
          </div>

          {/* Master Task Table */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', color: '#475569', textTransform: 'uppercase', fontSize: '10px', fontWeight: 800 }}>
                    <th style={{ padding: '12px 16px' }}>Task Code</th>
                    <th style={{ padding: '12px 16px', minWidth: '240px' }}>Task Title &amp; Scope</th>
                    <th style={{ padding: '12px 10px' }}>Department</th>
                    <th style={{ padding: '12px 10px' }}>Priority</th>
                    <th style={{ padding: '12px 12px' }}>Assigned Member(s)</th>
                    <th style={{ padding: '12px 10px' }}>Assignment Date</th>
                    <th style={{ padding: '12px 10px' }}>Deadline</th>
                    <th style={{ padding: '12px 10px' }}>Current Status</th>
                    <th style={{ padding: '12px 10px' }}>Completion Date</th>
                    <th style={{ padding: '12px 10px', textAlign: 'center' }}>Origin</th>
                    <th style={{ padding: '12px 10px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan="11" style={{ padding: '36px', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>
                        No tasks found matching the selected period and filters.
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((t) => {
                      const deptTheme = getDepartmentTheme(t.department);

                      return (
                        <tr
                          key={t._id}
                          style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          {/* Task Code */}
                          <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                            <button
                              onClick={() => onSelectTask && onSelectTask(t._id)}
                              style={{
                                fontFamily: 'monospace',
                                fontWeight: 800,
                                color: '#4f46e5',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 0,
                                textDecoration: 'underline',
                              }}
                            >
                              {t.taskCode}
                            </button>
                            {t.isMDDirective && (
                              <span
                                style={{
                                  marginLeft: '6px',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  fontSize: '9px',
                                  fontWeight: 900,
                                  background: '#f3e8ff',
                                  color: '#7e22ce',
                                }}
                              >
                                MD
                              </span>
                            )}
                          </td>

                          {/* Title */}
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a', lineHeight: 1.4 }}>{t.title}</div>
                            {t.apartmentContext && (
                              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                                Unit: {t.apartmentContext}
                              </div>
                            )}
                            {t.hasRoadblock && (
                              <div style={{ fontSize: '10px', color: '#dc2626', fontWeight: 700, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <AlertTriangle size={11} /> Roadblock: {t.roadblockReason || 'Active roadblock'}
                              </div>
                            )}
                          </td>

                          {/* Department */}
                          <td style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 7px',
                                borderRadius: '6px',
                                fontSize: '10px',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                backgroundColor: deptTheme.bg,
                                color: deptTheme.color,
                                border: `1px solid ${deptTheme.border}`,
                              }}
                            >
                              {t.department}
                            </span>
                          </td>

                          {/* Priority */}
                          <td style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 7px',
                                borderRadius: '6px',
                                fontSize: '10px',
                                textTransform: 'uppercase',
                                ...getPriorityBadgeStyle(t.priority),
                              }}
                            >
                              {t.priority}
                            </span>
                          </td>

                          {/* Assigned Members */}
                          <td style={{ padding: '12px 12px', color: '#334155', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            <span title={t.assigneeText}>
                              {t.primaryAssignee}
                              {t.assignees.length > 1 && (
                                <span style={{ marginLeft: '4px', fontSize: '10px', color: '#94a3b8', fontWeight: 400 }}>
                                  +{t.assignees.length - 1} more
                                </span>
                              )}
                            </span>
                          </td>

                          {/* Assignment Date */}
                          <td style={{ padding: '12px 10px', color: '#64748b', whiteSpace: 'nowrap' }}>
                            {t.startDate ? new Date(t.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                          </td>

                          {/* Deadline */}
                          <td style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>
                            <span style={{ fontWeight: t.isOverdue ? 800 : 500, color: t.isOverdue ? '#dc2626' : '#475569' }}>
                              {t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                            </span>
                          </td>

                          {/* Status */}
                          <td style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>
                            {renderStatusBadge(t)}
                          </td>

                          {/* Completion Date */}
                          <td style={{ padding: '12px 10px', color: '#64748b', whiteSpace: 'nowrap' }}>
                            {t.completedAt
                              ? new Date(t.completedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                              : '—'}
                          </td>

                          {/* Carried Forward Origin */}
                          <td style={{ padding: '12px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            {t.isCarriedForward ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  background: '#fef3c7',
                                  color: '#92400e',
                                  border: '1px solid #fde68a',
                                }}
                              >
                                <RotateCcw size={10} /> Carried Over
                              </span>
                            ) : (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  background: '#f1f5f9',
                                  color: '#475569',
                                  border: '1px solid #e2e8f0',
                                }}
                              >
                                New in Week
                              </span>
                            )}
                          </td>

                          {/* Action */}
                          <td style={{ padding: '12px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <button
                              onClick={() => onSelectTask && onSelectTask(t._id)}
                              style={{
                                padding: '5px 8px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                color: '#4f46e5',
                                cursor: 'pointer',
                              }}
                              title="Inspect Task Detail"
                            >
                              <ExternalLink size={13} />
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
