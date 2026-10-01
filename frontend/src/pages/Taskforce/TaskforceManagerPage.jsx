import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { taskforceManagerService } from '../../services/taskforceManagerService.js';
import { taskService } from '../../services/taskService.js';

import {
  Users,
  Building2,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Search,
  Plus,
  RefreshCw,
  Filter,
  Layers,
  Target,
  TrendingUp,
  AlertCircle,
  Flag,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  Shield,
  X,
  BarChart3,
  Briefcase,
  Award,
  Zap,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  UserCheck,
  UserX,
  Activity,
  Gauge,
  Timer,
  Star,
  ThumbsUp,
  ThumbsDown,
  Flame,
  Sparkles,
  GanttChart,
  ListChecks,
  GitBranch,
  Send,
  RotateCcw,
} from 'lucide-react';

// =====================================================
// TASKFORCE MANAGER PAGE — COMPREHENSIVE MODULE
// =====================================================
export const TaskforceManagerPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Tab
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'workforce');

  // Data States
  const [workforceData, setWorkforceData] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  const [timelineData, setTimelineData] = useState(null);
  const [departmentStats, setDepartmentStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [performancePeriod, setPerformancePeriod] = useState('30');

  // Selection for bulk actions
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [bulkActionModal, setBulkActionModal] = useState(null);

  // Workforce detail expansion
  const [expandedUser, setExpandedUser] = useState(null);

  const tabs = [
    { key: 'workforce', label: 'Team & Workload', icon: Users, color: '#1a73e8' },
    { key: 'timeline', label: 'Gantt Timeline', icon: GanttChart, color: '#1e40af' },
    { key: 'performance', label: 'Performance KPIs', icon: Award, color: '#0f172a' },
    { key: 'departments', label: 'Department Analytics', icon: Building2, color: '#2563eb' },
    { key: 'delegation', label: 'Delegation Hub', icon: GitBranch, color: '#1e293b' },
  ];

  useEffect(() => {
    loadTabData(activeTab);
  }, [activeTab, selectedDept, performancePeriod]);

  const loadTabData = async (tab) => {
    try {
      setLoading(true);
      switch (tab) {
        case 'workforce':
          const wf = await taskforceManagerService.getWorkforce({
            department: selectedDept,
            showAll: 'true',
          });
          setWorkforceData(wf);
          break;
        case 'performance':
          const pf = await taskforceManagerService.getPerformance(performancePeriod);
          setPerformanceData(pf);
          break;
        case 'timeline':
          const tl = await taskforceManagerService.getTimeline({
            department: selectedDept,
          });
          setTimelineData(tl);
          break;
        case 'departments':
          const ds = await taskforceManagerService.getDepartmentStats();
          setDepartmentStats(ds);
          break;
        case 'delegation':
          const [wfDel, tlDel] = await Promise.all([
            taskforceManagerService.getWorkforce({ showAll: 'true' }),
            taskforceManagerService.getTimeline({ status: 'all' }),
          ]);
          setWorkforceData(wfDel);
          setTimelineData(tlDel);
          break;
      }
    } catch (err) {
      console.error('Failed to load tab data:', err);
      showToast('Error loading data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
    setSearch('');
    setSelectedTasks([]);
  };

  // ==========================
  // HELPER RENDERERS
  // ==========================

  const getCapacityColor = (score) => {
    if (score >= 70) return '#1d4ed8';
    if (score >= 40) return '#475569';
    return '#0f172a';
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#1d4ed8';
    if (score >= 60) return '#2563eb';
    if (score >= 40) return '#475569';
    return '#0f172a';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Executive Grade';
    if (score >= 60) return 'Optimal';
    if (score >= 40) return 'Standard';
    return 'Action Required';
  };

  const getPriorityStyles = (priority) => {
    switch (priority) {
      case 'urgent': return { bg: '#0f172a', color: '#ffffff', border: '#1e293b' };
      case 'high': return { bg: '#1e3a8a', color: '#eff6ff', border: '#1d4ed8' };
      case 'medium': return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
      default: return { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
    }
  };

  const getStatusStyles = (status) => {
    switch (status) {
      case 'completed': return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
      case 'in_progress': return { bg: '#f8fafc', color: '#1e40af', border: '#cbd5e1' };
      case 'under_review': return { bg: '#f1f5f9', color: '#334155', border: '#cbd5e1' };
      case 'delayed': return { bg: '#0f172a', color: '#ffffff', border: '#1e293b' };
      case 'pending': return { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
      default: return { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
    }
  };

  const renderInitialsAvatar = (user, size = 32, color = '#1a73e8') => {
    const fName = user?.firstName || '';
    const lName = user?.lastName || '';
    const initials = ((fName[0] || '') + (lName[0] || '')).toUpperCase() || '?';
    return (
      <div
        title={`${fName} ${lName}`.trim() || user?.username || 'User'}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          backgroundColor: color,
          color: '#ffffff',
          fontSize: `${Math.round(size * 0.38)}px`,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {initials}
      </div>
    );
  };

  const renderProgressBar = (value, height = 6, color = '#1a73e8') => (
    <div style={{ height: `${height}px`, backgroundColor: '#e2e8f0', borderRadius: `${height / 2}px`, overflow: 'hidden', flex: 1 }}>
      <div
        style={{
          width: `${Math.min(100, value || 0)}%`,
          height: '100%',
          backgroundColor: value >= 100 ? '#1e40af' : value >= 70 ? '#1a73e8' : color,
          transition: 'width 0.4s ease',
          borderRadius: `${height / 2}px`,
        }}
      />
    </div>
  );

  // ==========================
  // TAB 1: TEAM & WORKLOAD
  // ==========================
  const renderWorkforceTab = () => {
    const workforce = workforceData?.workforce || [];
    const summary = workforceData?.summary || {};

    const filtered = workforce.filter((w) => {
      if (!search.trim()) return true;
      const name = `${w.user?.firstName || ''} ${w.user?.lastName || ''}`.toLowerCase();
      return name.includes(search.toLowerCase()) || (w.user?.username || '').toLowerCase().includes(search.toLowerCase());
    });

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
          {[
            { label: 'Team Members', value: summary.totalMembers || 0, icon: Users, color: '#1a73e8', bg: '#eff6ff' },
            { label: 'Active Tasks', value: summary.totalActiveTasks || 0, icon: Activity, color: '#1e40af', bg: '#eff6ff' },
            { label: 'Avg Workload', value: `${summary.averageWorkload || 0} tasks`, icon: Gauge, color: '#2563eb', bg: '#eff6ff' },
            { label: 'Overloaded', value: summary.overloadedMembers || 0, icon: Flame, color: '#0f172a', bg: '#f1f5f9' },
            { label: 'Available', value: summary.idleMembers || 0, icon: UserCheck, color: '#1d4ed8', bg: '#eff6ff' },
            { label: 'Completed', value: summary.totalCompletedTasks || 0, icon: CheckCircle2, color: '#1e40af', bg: '#eff6ff' },
          ].map((card, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #dadce0',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>{card.label}</span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <card.icon size={16} color={card.color} />
                </div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>{card.value}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', maxWidth: '300px' }}>
          <Search size={14} color="#64748b" style={{ position: 'absolute', left: '12px', top: '11px', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search team members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              height: '38px',
              paddingLeft: '34px',
              paddingRight: '12px',
              borderRadius: '8px',
              border: '1px solid #dadce0',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Workforce Table */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #dadce0',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(60, 64, 67, 0.06)',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #dadce0', fontSize: '12px', color: '#475569' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Team Member</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Active</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Completed</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Overdue</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Blocked</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Workload</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Capacity</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Departments</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading workforce data...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No team members found.</td></tr>
                ) : (
                  filtered.map((w, idx) => {
                    const isExpanded = expandedUser === w.user?._id;
                    return (
                      <React.Fragment key={w.user?._id || idx}>
                        <tr
                          onClick={() => setExpandedUser(isExpanded ? null : w.user?._id)}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s ease',
                            backgroundColor: isExpanded ? '#f8fafc' : 'transparent',
                          }}
                          onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.backgroundColor = '#fafbfc'; }}
                          onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <ChevronRight
                                size={14}
                                color="#64748b"
                                style={{
                                  transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                  transition: 'transform 0.2s ease',
                                }}
                              />
                              {renderInitialsAvatar(w.user, 30, w.active > 8 ? '#0f172a' : w.active === 0 ? '#1d4ed8' : '#1a73e8')}
                              <div>
                                <div style={{ fontWeight: 600, color: '#0f172a' }}>
                                  {w.user?.firstName} {w.user?.lastName || ''}
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748b' }}>
                                  {w.user?.roleId?.roleName || w.user?.username}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <span style={{ fontWeight: 700, color: w.active > 0 ? '#005bbf' : '#94a3b8', fontSize: '15px' }}>
                              {w.active}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <span style={{ fontWeight: 600, color: '#1d4ed8' }}>{w.completed}</span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            {w.overdue > 0 ? (
                              <span style={{ fontWeight: 700, color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <AlertCircle size={12} /> {w.overdue}
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>0</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            {w.roadblocks > 0 ? (
                              <span style={{
                                fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px',
                                backgroundColor: '#0f172a', color: '#ffffff',
                              }}>
                                {w.roadblocks} blocked
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', minWidth: '140px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {renderProgressBar(w.activeAvgProgress, 6)}
                              <span style={{ fontSize: '11px', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>
                                {w.activeAvgProgress}%
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                              <div
                                style={{
                                  width: '38px',
                                  height: '38px',
                                  borderRadius: '50%',
                                  border: `3px solid ${getCapacityColor(w.capacityScore)}`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  color: getCapacityColor(w.capacityScore),
                                }}
                              >
                                {w.capacityScore}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {(w.departments || []).slice(0, 3).map((dept) => (
                                <span
                                  key={dept}
                                  style={{
                                    fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px',
                                    backgroundColor: '#f1f5f9', color: '#334155', textTransform: 'capitalize',
                                  }}
                                >
                                  {dept}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Detail Row */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={8} style={{ padding: '0 16px 16px 16px', backgroundColor: '#f8fafc' }}>
                              <div
                                style={{
                                  padding: '16px',
                                  backgroundColor: '#ffffff',
                                  borderRadius: '10px',
                                  border: '1px solid #e2e8f0',
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                                  gap: '14px',
                                }}
                              >
                                {[
                                  { label: 'Total Assigned', value: w.totalAssigned, color: '#0f172a' },
                                  { label: 'Urgent Tasks', value: w.urgent, color: '#0f172a' },
                                  { label: 'High Priority', value: w.high, color: '#1e3a8a' },
                                  { label: 'Medium Priority', value: w.medium, color: '#2563eb' },
                                  { label: 'MD Directives', value: w.mdDirectives, color: '#00285c' },
                                  { label: 'Completion Rate', value: `${w.completionRate}%`, color: '#1d4ed8' },
                                ].map((item, i) => (
                                  <div key={i} style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>{item.label}</div>
                                    <div style={{ fontSize: '20px', fontWeight: 700, color: item.color }}>{item.value}</div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ==========================
  // TAB 2: GANTT TIMELINE
  // ==========================
  const renderTimelineTab = () => {
    const timeline = timelineData?.timeline || [];

    const filtered = timeline.filter((t) => {
      if (!search.trim()) return true;
      return (t.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (t.taskCode || '').toLowerCase().includes(search.toLowerCase());
    });

    // Calculate the overall date range for the Gantt chart
    const allDates = filtered.flatMap((t) => [t.startDate, t.endDate].filter(Boolean).map((d) => new Date(d)));
    const minDate = allDates.length > 0 ? new Date(Math.min(...allDates)) : new Date();
    const maxDate = allDates.length > 0 ? new Date(Math.max(...allDates)) : new Date();
    const today = new Date();

    // Add 7-day padding
    minDate.setDate(minDate.getDate() - 3);
    maxDate.setDate(maxDate.getDate() + 7);
    const totalDays = Math.max(1, Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)));

    const getBarPosition = (start, end) => {
      const s = new Date(start);
      const e = new Date(end);
      const left = Math.max(0, ((s - minDate) / (maxDate - minDate)) * 100);
      const width = Math.max(2, ((e - s) / (maxDate - minDate)) * 100);
      return { left: `${left}%`, width: `${Math.min(width, 100 - left)}%` };
    };

    const todayPosition = `${Math.max(0, Math.min(100, ((today - minDate) / (maxDate - minDate)) * 100))}%`;

    // Generate week markers
    const weekMarkers = [];
    const d = new Date(minDate);
    while (d <= maxDate) {
      const pos = ((d - minDate) / (maxDate - minDate)) * 100;
      weekMarkers.push({
        date: new Date(d),
        position: `${pos}%`,
        label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      });
      d.setDate(d.getDate() + 7);
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Search & Filter bar */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} color="#64748b" style={{ position: 'absolute', left: '10px', top: '11px' }} />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '220px', height: '38px', paddingLeft: '32px', borderRadius: '8px',
                border: '1px solid #dadce0', fontSize: '12px', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            {filtered.length} tasks • {totalDays} day range
          </span>
        </div>

        {/* Gantt Chart */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #dadce0',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(60, 64, 67, 0.06)',
          }}
        >
          {/* Header with date markers */}
          <div
            style={{
              position: 'relative',
              height: '36px',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #dadce0',
              overflow: 'hidden',
            }}
          >
            {weekMarkers.map((marker, idx) => (
              <div
                key={idx}
                style={{
                  position: 'absolute',
                  left: marker.position,
                  top: 0,
                  bottom: 0,
                  borderLeft: '1px dashed #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: '6px',
                  fontSize: '10px',
                  fontWeight: 600,
                  color: '#64748b',
                  whiteSpace: 'nowrap',
                }}
              >
                {marker.label}
              </div>
            ))}
            {/* Today marker */}
            <div
              style={{
                position: 'absolute',
                left: todayPosition,
                top: 0,
                bottom: 0,
                borderLeft: '2px solid #1a73e8',
                zIndex: 5,
              }}
            >
              <span style={{
                position: 'absolute', top: '2px', left: '4px', fontSize: '9px',
                fontWeight: 700, color: '#ffffff', backgroundColor: '#1a73e8', padding: '1px 5px',
                borderRadius: '4px', whiteSpace: 'nowrap',
              }}>TODAY</span>
            </div>
          </div>

          {/* Task rows */}
          <div style={{ maxHeight: 'calc(100vh - 360px)', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>Loading timeline...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>No tasks in timeline range.</div>
            ) : (
              filtered.map((task, idx) => {
                const barPos = getBarPosition(task.startDate, task.endDate);
                const priStyles = getPriorityStyles(task.priority);
                const isOverdue = task.isOverdue;

                return (
                  <div
                    key={task._id || idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '280px 1fr',
                      borderBottom: '1px solid #f1f5f9',
                      minHeight: '48px',
                      transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fafbfc')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {/* Left: Task info */}
                    <div style={{ padding: '10px 14px', borderRight: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b' }}>{task.taskCode}</span>
                          {task.isMDDirective && (
                            <span style={{
                              fontSize: '9px', fontWeight: 700, backgroundColor: '#0f172a', color: '#ffffff',
                              padding: '1px 5px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '2px',
                            }}><Sparkles size={8} /> MD</span>
                          )}
                          <span style={{
                            fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px',
                            textTransform: 'uppercase', backgroundColor: priStyles.bg, color: priStyles.color,
                          }}>{task.priority}</span>
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                          {task.title}
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '1px' }}>
                          <span style={{ textTransform: 'capitalize' }}>{task.department}</span>
                          {(task.assignedTo || []).length > 0 && (
                            <span>• {(task.assignedTo || []).length} member(s)</span>
                          )}
                          {isOverdue && (
                            <span style={{ color: '#0f172a', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                              <AlertCircle size={10} /> {Math.abs(task.daysRemaining)}d overdue
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Gantt bar */}
                    <div style={{ position: 'relative', padding: '10px 8px' }}>
                      {/* Week grid lines */}
                      {weekMarkers.map((marker, mIdx) => (
                        <div key={mIdx} style={{ position: 'absolute', left: marker.position, top: 0, bottom: 0, borderLeft: '1px dashed #f1f5f9' }} />
                      ))}
                      {/* Today line */}
                      <div style={{ position: 'absolute', left: todayPosition, top: 0, bottom: 0, borderLeft: '2px solid rgba(26, 115, 232, 0.35)', zIndex: 3 }} />

                      {/* Task bar */}
                      <div
                        style={{
                          position: 'absolute',
                          ...barPos,
                          top: '12px',
                          height: '24px',
                          backgroundColor: isOverdue ? '#f1f5f9' : task.status === 'completed' ? '#eff6ff' : '#ffffff',
                          border: `1px solid ${isOverdue ? '#0f172a' : task.status === 'completed' ? '#bfdbfe' : '#dadce0'}`,
                          borderRadius: '6px',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          zIndex: 2,
                        }}
                      >
                        {/* Progress fill */}
                        <div
                          style={{
                            width: `${task.progress || 0}%`,
                            height: '100%',
                            backgroundColor: isOverdue
                              ? '#0f172a'
                              : task.status === 'completed'
                              ? '#1e40af'
                              : task.roadblockAlert?.hasRoadblock
                              ? '#1e293b'
                              : '#1a73e8',
                            transition: 'width 0.4s ease',
                          }}
                        />
                        <span
                          style={{
                            position: 'absolute',
                            left: '6px',
                            fontSize: '9px',
                            fontWeight: 700,
                            color: (task.progress || 0) > 50 ? '#ffffff' : '#334155',
                            whiteSpace: 'nowrap',
                            zIndex: 3,
                          }}
                        >
                          {task.progress || 0}%
                        </span>

                        {/* Milestone dots */}
                        {(task.milestones || []).map((ms, mIdx) => (
                          <div
                            key={mIdx}
                            title={ms.title}
                            style={{
                              position: 'absolute',
                              left: `${ms.position}%`,
                              top: '50%',
                              transform: 'translate(-50%, -50%)',
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: ms.isCompleted ? '#1d4ed8' : '#ffffff',
                              border: `2px solid ${ms.isCompleted ? '#1d4ed8' : '#94a3b8'}`,
                              zIndex: 4,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  // ==========================
  // TAB 3: PERFORMANCE KPIs
  // ==========================
  const renderPerformanceTab = () => {
    const performance = performanceData?.performance || [];
    const teamAvg = performanceData?.teamAverages || {};

    const filtered = performance.filter((p) => {
      if (!search.trim()) return true;
      const name = `${p.user?.firstName || ''} ${p.user?.lastName || ''}`.toLowerCase();
      return name.includes(search.toLowerCase());
    });

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Team Average KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          {[
            { label: 'Team Avg Completion Rate', value: `${teamAvg.avgCompletionRate || 0}%`, icon: CheckCircle2, color: '#1d4ed8', bg: '#eff6ff' },
            { label: 'Team Avg On-Time Rate', value: `${teamAvg.avgOnTimeRate || 0}%`, icon: Timer, color: '#1a73e8', bg: '#eff6ff' },
            { label: 'Team Productivity Score', value: `${teamAvg.avgProductivityScore || 0}/100`, icon: Award, color: '#1e40af', bg: '#eff6ff' },
            {
              label: 'Top Performer',
              value: teamAvg.topPerformer?.user
                ? `${teamAvg.topPerformer.user.firstName || ''} ${teamAvg.topPerformer.user.lastName || ''}`
                : '—',
              icon: Star,
              color: '#0f172a',
              bg: '#f1f5f9',
            },
          ].map((card, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #dadce0',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>{card.label}</span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <card.icon size={16} color={card.color} />
                </div>
              </div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a' }}>{card.value}</div>
            </div>
          ))}
        </div>

        {/* Period Selector + Search */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={performancePeriod}
            onChange={(e) => setPerformancePeriod(e.target.value)}
            style={{
              height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid #dadce0',
              fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            <option value="7">Last 7 Days</option>
            <option value="14">Last 14 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="60">Last 60 Days</option>
            <option value="90">Last 90 Days</option>
          </select>
          <div style={{ position: 'relative' }}>
            <Search size={14} color="#64748b" style={{ position: 'absolute', left: '10px', top: '11px' }} />
            <input
              type="text"
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '220px', height: '38px', paddingLeft: '32px', borderRadius: '8px',
                border: '1px solid #dadce0', fontSize: '12px', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Performance Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', gridColumn: '1 / -1' }}>Loading performance data...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', gridColumn: '1 / -1' }}>No data available.</div>
          ) : (
            filtered.map((p, idx) => {
              const scoreColor = getScoreColor(p.productivityScore);
              const scoreLabel = getScoreLabel(p.productivityScore);
              const rank = idx + 1;

              return (
                <div
                  key={p.user?._id || idx}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: rank <= 3 ? `1.5px solid ${rank === 1 ? '#1a73e8' : rank === 2 ? '#1e40af' : '#0f172a'}` : '1px solid #dadce0',
                    padding: '18px',
                    boxShadow: rank <= 3 ? '0 3px 12px rgba(0,0,0,0.06)' : '0 1px 3px rgba(60, 64, 67, 0.06)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = rank <= 3 ? '0 3px 12px rgba(0,0,0,0.06)' : '0 1px 3px rgba(60, 64, 67, 0.06)'; }}
                >
                  {/* Rank Badge */}
                  {rank <= 3 && (
                    <div style={{
                      position: 'absolute', top: '10px', right: '10px',
                      width: '28px', height: '28px', borderRadius: '50%',
                      backgroundColor: rank === 1 ? '#1a73e8' : rank === 2 ? '#1e40af' : '#0f172a',
                      color: '#ffffff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: 800,
                    }}>
                      #{rank}
                    </div>
                  )}

                  {/* User Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                    {renderInitialsAvatar(p.user, 40, scoreColor)}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
                        {p.user?.firstName} {p.user?.lastName || ''}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {p.user?.roleId?.roleName || p.user?.username}
                      </div>
                    </div>
                  </div>

                  {/* Productivity Score Gauge */}
                  <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                    <div
                      style={{
                        width: '64px', height: '64px', borderRadius: '50%',
                        border: `4px solid ${scoreColor}`,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto',
                      }}
                    >
                      <span style={{ fontSize: '18px', fontWeight: 800, color: scoreColor }}>{p.productivityScore}</span>
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: scoreColor, marginTop: '4px' }}>{scoreLabel}</div>
                  </div>

                  {/* Metrics Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {[
                      { label: 'Tasks Assigned', value: p.tasksAssigned },
                      { label: 'Tasks Completed', value: p.tasksCompleted },
                      { label: 'Completion Rate', value: `${p.completionRate}%` },
                      { label: 'On-Time Rate', value: `${p.onTimeRate}%` },
                      { label: 'Avg Days/Task', value: `${p.avgCompletionDays}d` },
                      { label: 'Follow-ups', value: p.followUpsLogged },
                    ].map((metric, mIdx) => (
                      <div key={mIdx} style={{ textAlign: 'center', padding: '6px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                        <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748b' }}>{metric.label}</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{metric.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  // ==========================
  // TAB 4: DEPARTMENT ANALYTICS
  // ==========================
  const renderDepartmentTab = () => {
    const departments = departmentStats?.departments || [];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Department Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', gridColumn: '1 / -1' }}>Loading department data...</div>
          ) : departments.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', gridColumn: '1 / -1' }}>No department data available.</div>
          ) : (
            departments.map((dept, idx) => {
              const completionRate = dept.completionRate || 0;
              const deptColors = [
                '#1a73e8', '#1e40af', '#00285c', '#2563eb', '#0f172a',
                '#1d4ed8', '#1e293b', '#3b82f6', '#334155', '#475569',
              ];
              const color = deptColors[idx % deptColors.length];

              return (
                <div
                  key={dept._id || idx}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #dadce0',
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(60, 64, 67, 0.06)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    borderTop: `3px solid ${color}`,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(60, 64, 67, 0.06)'; }}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{dept.label}</h3>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>{dept.memberCount} team member(s)</span>
                    </div>
                    <div
                      style={{
                        width: '44px', height: '44px', borderRadius: '50%',
                        border: `3px solid ${color}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '12px', fontWeight: 800, color: color,
                      }}
                    >
                      {completionRate}%
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                      <span>Average Progress</span>
                      <span style={{ fontWeight: 600 }}>{dept.avgProgress}%</span>
                    </div>
                    {renderProgressBar(dept.avgProgress, 8, color)}
                  </div>

                  {/* Stats Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {[
                      { label: 'Total', value: dept.totalTasks, color: '#0f172a' },
                      { label: 'Active', value: dept.activeTasks, color: '#1a73e8' },
                      { label: 'Completed', value: dept.completedTasks, color: '#1e40af' },
                      { label: 'Delayed', value: dept.delayedTasks, color: '#0f172a' },
                      { label: 'Urgent', value: dept.urgentTasks, color: '#00285c' },
                      { label: 'MD Tasks', value: dept.mdDirectives, color: '#2563eb' },
                    ].map((stat, sIdx) => (
                      <div key={sIdx} style={{ textAlign: 'center', padding: '8px 4px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                        <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748b' }}>{stat.label}</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: stat.color }}>{stat.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Roadblocks Alert */}
                  {dept.roadblocks > 0 && (
                    <div style={{
                      marginTop: '12px', padding: '8px 12px', backgroundColor: '#0f172a', borderRadius: '8px',
                      border: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: '6px',
                      fontSize: '12px', fontWeight: 600, color: '#ffffff',
                    }}>
                      <AlertTriangle size={14} color="#ffffff" /> {dept.roadblocks} active roadblock(s)
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  // ==========================
  // TAB 5: DELEGATION HUB
  // ==========================
  const renderDelegationTab = () => {
    const allTasks = timelineData?.timeline || [];
    const workforce = workforceData?.workforce || [];

    const underReview = allTasks.filter((t) => t.status === 'under_review');
    const urgentPending = allTasks.filter((t) => t.priority === 'urgent' && t.status !== 'completed' && t.status !== 'cancelled');
    const overdueTasks = allTasks.filter((t) => t.isOverdue);

    const toggleTaskSelection = (taskId) => {
      setSelectedTasks((prev) =>
        prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
      );
    };

    const handleBulkAction = async (action) => {
      if (selectedTasks.length === 0) {
        showToast('Select tasks first', 'warning');
        return;
      }
      try {
        await taskforceManagerService.bulkAction({ taskIds: selectedTasks, action });
        showToast(`${selectedTasks.length} task(s) ${action}ed`, 'success');
        setSelectedTasks([]);
        loadTabData('delegation');
      } catch (err) {
        showToast(`Failed to ${action} tasks`, 'error');
      }
    };

    const renderDelegationTaskRow = (task) => {
      const isSelected = selectedTasks.includes(task._id);
      const statusStyle = getStatusStyles(task.status);
      const priStyle = getPriorityStyles(task.priority);

      return (
        <div
          key={task._id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderBottom: '1px solid #f1f5f9',
            backgroundColor: isSelected ? '#eff6ff' : 'transparent',
            transition: 'background-color 0.15s',
            cursor: 'pointer',
          }}
          onClick={() => toggleTaskSelection(task._id)}
          onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = '#fafbfc'; }}
          onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = isSelected ? '#eff6ff' : 'transparent'; }}
        >
          {/* Checkbox */}
          <div
            style={{
              width: '18px', height: '18px', borderRadius: '4px',
              border: isSelected ? '2px solid #005bbf' : '2px solid #cbd5e1',
              backgroundColor: isSelected ? '#005bbf' : '#ffffff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {isSelected && <CheckCircle size={12} color="#ffffff" />}
          </div>

          {/* Task Info */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b' }}>{task.taskCode}</span>
              {task.isMDDirective && (
                <span style={{ fontSize: '9px', fontWeight: 700, backgroundColor: '#0f172a', color: '#ffffff', padding: '1px 5px', borderRadius: '6px' }}>MD</span>
              )}
              <span style={{
                fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px',
                textTransform: 'uppercase', backgroundColor: priStyle.bg, color: priStyle.color,
              }}>{task.priority}</span>
            </div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {task.title}
            </div>
          </div>

          {/* Department */}
          <span style={{
            fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px',
            backgroundColor: '#f1f5f9', color: '#334155', textTransform: 'capitalize', whiteSpace: 'nowrap',
          }}>
            {task.department}
          </span>

          {/* Assignees */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {(task.assignedTo || []).slice(0, 2).map((a, aIdx) => renderInitialsAvatar(a, 22, '#005bbf'))}
            {(task.assignedTo || []).length > 2 && (
              <span style={{ fontSize: '10px', color: '#64748b', marginLeft: '4px' }}>+{(task.assignedTo || []).length - 2}</span>
            )}
          </div>

          {/* Status */}
          <span style={{
            fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '12px',
            backgroundColor: statusStyle.bg, color: statusStyle.color, textTransform: 'capitalize', whiteSpace: 'nowrap',
          }}>
            {task.status?.replace('_', ' ')}
          </span>

          {/* Progress */}
          <div style={{ width: '60px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {renderProgressBar(task.progress, 4)}
            <span style={{ fontSize: '10px', fontWeight: 600, color: '#334155' }}>{task.progress || 0}%</span>
          </div>
        </div>
      );
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Quick Action Bar */}
        {selectedTasks.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 18px',
              backgroundColor: '#eff6ff',
              borderRadius: '10px',
              border: '1px solid #bfdbfe',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#005bbf' }}>
              {selectedTasks.length} task(s) selected
            </span>
            <div style={{ flex: 1 }} />
            <button
              onClick={() => handleBulkAction('approve')}
              style={{
                padding: '7px 14px', borderRadius: '8px', border: 'none', fontSize: '12px',
                fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px',
                backgroundColor: '#1a73e8', color: '#ffffff',
              }}
            >
              <ThumbsUp size={13} /> Approve
            </button>
            <button
              onClick={() => handleBulkAction('reject')}
              style={{
                padding: '7px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px',
                fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px',
                backgroundColor: '#ffffff', color: '#0f172a',
              }}
            >
              <ThumbsDown size={13} /> Reject
            </button>
            <button
              onClick={() => handleBulkAction('escalate')}
              style={{
                padding: '7px 14px', borderRadius: '8px', border: '1px solid #1e293b', fontSize: '12px',
                fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px',
                backgroundColor: '#0f172a', color: '#ffffff',
              }}
            >
              <Zap size={13} /> Escalate to MD
            </button>
            <button
              onClick={() => setSelectedTasks([])}
              style={{
                padding: '7px 14px', borderRadius: '8px', border: '1px solid #dadce0', fontSize: '12px',
                fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px',
                backgroundColor: '#ffffff', color: '#64748b',
              }}
            >
              <X size={13} /> Clear
            </button>
          </div>
        )}

        {/* Under Review Section */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #dadce0',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(60, 64, 67, 0.06)',
          }}
        >
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #dadce0', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={16} color="#1a73e8" />
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1e40af' }}>
              Awaiting Approval ({underReview.length})
            </h3>
            <span style={{ fontSize: '11px', color: '#1e40af', marginLeft: 'auto' }}>Select tasks to approve or reject</span>
          </div>
          {underReview.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>No tasks pending approval.</div>
          ) : (
            underReview.map(renderDelegationTaskRow)
          )}
        </div>

        {/* Urgent & Overdue Tasks */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: urgentPending.length > 0 ? '1.5px solid #1e293b' : '1px solid #dadce0',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #1e293b', backgroundColor: urgentPending.length > 0 ? '#0f172a' : '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Flame size={16} color={urgentPending.length > 0 ? "#ffffff" : "#0f172a"} />
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: urgentPending.length > 0 ? '#ffffff' : '#0f172a' }}>
              Urgent & Escalated ({urgentPending.length}) | Overdue ({overdueTasks.length})
            </h3>
          </div>
          {urgentPending.length === 0 && overdueTasks.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>No urgent or overdue tasks.</div>
          ) : (
            [...new Map([...urgentPending, ...overdueTasks].map((t) => [t._id, t])).values()].map(renderDelegationTaskRow)
          )}
        </div>

        {/* Team Availability Quick View */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #dadce0',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #dadce0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={16} color="#005bbf" />
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
              Team Availability Overview
            </h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', padding: '14px 18px' }}>
            {workforce.slice(0, 12).map((w, idx) => (
              <div
                key={w.user?._id || idx}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '10px',
                  backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0',
                }}
              >
                {renderInitialsAvatar(w.user, 28, getCapacityColor(w.capacityScore))}
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {w.user?.firstName} {w.user?.lastName || ''}
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>
                    {w.active} active • Cap: {w.capacityScore}%
                  </div>
                </div>
                <div
                  style={{
                    width: '24px', height: '24px', borderRadius: '50%',
                    backgroundColor: w.capacityScore >= 70 ? '#eff6ff' : w.capacityScore >= 40 ? '#f1f5f9' : '#0f172a',
                    border: `2px solid ${getCapacityColor(w.capacityScore)}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '8px', fontWeight: 700, color: w.capacityScore < 40 ? '#ffffff' : getCapacityColor(w.capacityScore),
                  }}
                >
                  {w.capacityScore}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ==========================
  // MAIN RENDER
  // ==========================
  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #dadce0',
          padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(60, 64, 67, 0.08)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 className="font-headline-md" style={{ color: '#0f172a', margin: 0, fontSize: '24px' }}>
              Taskforce Manager
            </h1>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '12px',
                backgroundColor: '#eff6ff',
                color: '#1a73e8',
                border: '1px solid #bfdbfe',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Shield size={13} /> Command & Control
            </span>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '6px', margin: 0 }}>
            Team workload management, Gantt timeline, performance KPIs, department analytics, and task delegation hub.
          </p>
        </div>

        <button
          type="button"
          className="btn-secondary"
          onClick={() => loadTabData(activeTab)}
          style={{
            padding: '9px 16px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '8px',
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Tab Navigation */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          backgroundColor: '#ffffff',
          border: '1px solid #dadce0',
          borderRadius: '12px',
          padding: '6px',
          boxShadow: '0 1px 3px rgba(60, 64, 67, 0.06)',
          overflowX: 'auto',
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: isActive ? '#ffffff' : 'transparent',
                color: isActive ? tab.color : '#64748b',
                boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                border: isActive ? `1px solid ${tab.color}20` : 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <tab.icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Department Filter (shared across tabs) */}
      {['workforce', 'timeline'].includes(activeTab) && (
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            style={{
              height: '36px', padding: '0 12px', borderRadius: '8px',
              border: selectedDept !== 'all' ? '1.5px solid #005bbf' : '1px solid #dadce0',
              fontSize: '12px', fontWeight: 500, cursor: 'pointer',
              backgroundColor: selectedDept !== 'all' ? '#eff6ff' : '#ffffff',
              color: selectedDept !== 'all' ? '#005bbf' : '#334155',
            }}
          >
            <option value="all">All Departments</option>
            <option value="sales">Sales & Allotments</option>
            <option value="crm">CRM & Clients</option>
            <option value="construction">Civil & Construction</option>
            <option value="maintenance">Maintenance</option>
            <option value="accounts">Accounts & Finance</option>
            <option value="hr">HR & Admin</option>
            <option value="legal">Legal & Compliance</option>
            <option value="rentals">Rentals</option>
            <option value="operations">Site Operations</option>
            <option value="management">Management</option>
          </select>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'workforce' && renderWorkforceTab()}
      {activeTab === 'timeline' && renderTimelineTab()}
      {activeTab === 'performance' && renderPerformanceTab()}
      {activeTab === 'departments' && renderDepartmentTab()}
      {activeTab === 'delegation' && renderDelegationTab()}
    </div>
  );
};
