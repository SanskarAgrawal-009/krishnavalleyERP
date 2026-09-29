import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { taskService } from '../../services/taskService.js';
import { NewTaskModal } from '../../components/taskforce/NewTaskModal.jsx';
import { TaskDetailModal } from '../../components/taskforce/TaskDetailModal.jsx';

import {
  Sparkles,
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
  Kanban,
  List,
  Target,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Flag,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  Shield,
  Phone,
  X,
  ListTodo,
  CheckSquare,
  Flame,
  RotateCcw
} from 'lucide-react';

export const TaskforcePage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // View Mode: 'kanban', 'radar', 'list'
  const [viewMode, setViewMode] = useState(searchParams.get('view') || 'kanban');

  // Tasks & Stats Data
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [filterMDOnly, setFilterMDOnly] = useState(false);
  const [filterDueTodayOnly, setFilterDueTodayOnly] = useState(false);
  const [filterMyTasks, setFilterMyTasks] = useState(false);
  const [filterRoadblocksOnly, setFilterRoadblocksOnly] = useState(false);

  // Modals State
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const hasActiveFilters =
    search.trim() !== '' ||
    selectedDept !== 'all' ||
    selectedPriority !== 'all' ||
    filterMDOnly ||
    filterDueTodayOnly ||
    filterMyTasks ||
    filterRoadblocksOnly;

  const resetAllFilters = () => {
    setSearch('');
    setSelectedDept('all');
    setSelectedPriority('all');
    setFilterMDOnly(false);
    setFilterDueTodayOnly(false);
    setFilterMyTasks(false);
    setFilterRoadblocksOnly(false);
  };

  useEffect(() => {
    fetchTasksAndStats();
  }, [
    selectedDept,
    selectedPriority,
    filterMDOnly,
    filterDueTodayOnly,
    filterMyTasks,
    filterRoadblocksOnly,
    search,
  ]);

  const fetchTasksAndStats = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (selectedDept !== 'all') params.department = selectedDept;
      if (selectedPriority !== 'all') params.priority = selectedPriority;
      if (filterMDOnly) params.isMDDirective = 'true';
      if (filterDueTodayOnly) params.followUpFilter = 'due_today';
      if (filterMyTasks) params.assignedTo = 'me';
      if (filterRoadblocksOnly) params.hasRoadblock = 'true';

      const [taskRes, statsRes] = await Promise.all([
        taskService.getTasks(params),
        taskService.getStats(),
      ]);

      const taskList = Array.isArray(taskRes)
        ? taskRes
        : (taskRes?.data || taskRes?.tasks || []);
      setTasks(taskList);

      const statsObj = statsRes?.stats || statsRes?.data || statsRes || null;
      setStats(statsObj);
    } catch (err) {
      console.error('Failed to load taskforce data', err);
      showToast('Error loading taskforce directives', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = (taskId) => {
    setSelectedTaskId(taskId);
    setIsDetailModalOpen(true);
  };

  const handleOpenEdit = (task) => {
    setEditingTask(task);
    setIsNewTaskModalOpen(true);
  };

  const handleNewTask = () => {
    setEditingTask(null);
    setIsNewTaskModalOpen(true);
  };

  // Kanban Columns Definition
  const kanbanColumns = [
    { key: 'pending', title: 'Pending / Allocated', color: '#64748b', bg: '#f8fafc', badge: '#e2e8f0', text: '#334155' },
    { key: 'in_progress', title: 'In Execution', color: '#005bbf', bg: '#eff6ff', badge: '#bfdbfe', text: '#1d4ed8' },
    { key: 'under_review', title: 'Under MD Review', color: '#ca8a04', bg: '#fefce8', badge: '#fef08a', text: '#854d0e' },
    { key: 'delayed', title: 'Roadblocks & Blocked', color: '#dc2626', bg: '#fef2f2', badge: '#fca5a5', text: '#991b1b' },
    { key: 'completed', title: 'Completed', color: '#16a34a', bg: '#f0fdf4', badge: '#bbf7d0', text: '#15803d' },
  ];

  // Radar categories for Follow-up Radar
  const radarCategories = () => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const dueToday = [];
    const overdue = [];
    const upcoming = [];
    const completedOrOthers = [];

    tasks.forEach((t) => {
      if (t.status === 'completed') {
        completedOrOthers.push(t);
        return;
      }
      const fuDate = t.followUpSchedule?.nextFollowUpDate
        ? new Date(t.followUpSchedule.nextFollowUpDate)
        : null;

      if (!fuDate) {
        dueToday.push(t);
      } else if (fuDate < startOfDay) {
        overdue.push(t);
      } else if (fuDate >= startOfDay && fuDate <= endOfDay) {
        dueToday.push(t);
      } else {
        upcoming.push(t);
      }
    });

    return { dueToday, overdue, upcoming, completedOrOthers };
  };

  const renderFollowUpBadge = (task) => {
    if (task.status === 'completed') {
      return (
        <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
          <CheckCircle2 size={12} /> Done
        </span>
      );
    }
    if (!task.followUpSchedule?.nextFollowUpDate) {
      return (
        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
          No follow-up set
        </span>
      );
    }

    const now = new Date();
    const nextD = new Date(task.followUpSchedule.nextFollowUpDate);
    const isToday =
      now.getFullYear() === nextD.getFullYear() &&
      now.getMonth() === nextD.getMonth() &&
      now.getDate() === nextD.getDate();
    const isOverdue = nextD < new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (isOverdue) {
      return (
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '12px',
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            border: '1px solid #fca5a5',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <AlertCircle size={11} /> Overdue
        </span>
      );
    }

    if (isToday) {
      return (
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '12px',
            backgroundColor: '#fef08a',
            color: '#854d0e',
            border: '1px solid #facc15',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: '0 1px 4px rgba(202, 138, 4, 0.2)',
          }}
        >
          <Clock size={11} /> Due Today
        </span>
      );
    }

    return (
      <span
        style={{
          fontSize: '11px',
          fontWeight: 600,
          padding: '2px 8px',
          borderRadius: '12px',
          backgroundColor: '#eff6ff',
          color: '#1d4ed8',
          border: '1px solid #bfdbfe',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <Clock size={11} /> {nextD.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
      </span>
    );
  };

  const renderTaskCard = (task) => {
    const completedCheckpoints = (task.checkpoints || []).filter((c) => c.isCompleted).length;
    const totalCheckpoints = task.checkpoints?.length || 0;

    return (
      <div
        key={task._id}
        onClick={() => handleOpenDetail(task._id)}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: task.isMDDirective ? '1.5px solid #facc15' : '1px solid #e2e8f0',
          boxShadow: task.isMDDirective
            ? '0 3px 12px rgba(234, 179, 8, 0.15)'
            : '0 1px 3px rgba(60, 64, 67, 0.06)',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          cursor: 'pointer',
          transition: 'all 0.18s ease',
          position: 'relative',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = task.isMDDirective
            ? '0 3px 12px rgba(234, 179, 8, 0.15)'
            : '0 1px 3px rgba(60, 64, 67, 0.06)';
        }}
      >
        {/* Top: Code, MD Badge & Priority */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>
              {task.taskCode || 'TSK'}
            </span>
            {task.isMDDirective && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  backgroundColor: '#ca8a04',
                  color: '#ffffff',
                  padding: '2px 7px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <Sparkles size={10} /> MD DIRECTIVE
              </span>
            )}
          </div>

          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              padding: '2px 7px',
              borderRadius: '4px',
              backgroundColor:
                task.priority === 'urgent'
                  ? '#fee2e2'
                  : task.priority === 'high'
                  ? '#ffedd5'
                  : '#f1f5f9',
              color:
                task.priority === 'urgent'
                  ? '#dc2626'
                  : task.priority === 'high'
                  ? '#c2410c'
                  : '#475569',
            }}
          >
            {task.priority}
          </span>
        </div>

        {/* Title */}
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', lineHeight: '1.4' }}>
          {task.title}
        </div>

        {/* Department, Property, Roadblock Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '11px',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              padding: '2px 7px',
              borderRadius: '4px',
              fontWeight: 600,
              textTransform: 'capitalize',
            }}
          >
            {task.department}
          </span>

          {task.isApartmentRelated && task.apartmentDetails?.flatNumber && (
            <span
              style={{
                fontSize: '11px',
                backgroundColor: '#e0f2fe',
                color: '#0369a1',
                padding: '2px 7px',
                borderRadius: '4px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Building2 size={11} />
              {task.apartmentDetails.tower ? `${task.apartmentDetails.tower} • ` : ''}
              {task.apartmentDetails.flatNumber}
            </span>
          )}

          {task.roadblockAlert?.hasRoadblock && !task.roadblockAlert?.isResolved && (
            <span
              style={{
                fontSize: '11px',
                backgroundColor: '#fee2e2',
                color: '#b91c1c',
                padding: '2px 7px',
                borderRadius: '4px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <AlertTriangle size={11} /> Blocked
            </span>
          )}
        </div>

        {/* Checkpoints Status (If checkpoints exist) */}
        {totalCheckpoints > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#475569' }}>
            <ListTodo size={12} color="#005bbf" />
            <span>
              <strong>{completedCheckpoints}/{totalCheckpoints}</strong> steps completed
            </span>
          </div>
        )}

        {/* Progress Bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginBottom: '3px' }}>
            <span>Progress</span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>{task.progress || 0}%</span>
          </div>
          <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${task.progress || 0}%`,
                height: '100%',
                backgroundColor:
                  task.progress === 100
                    ? '#16a34a'
                    : task.roadblockAlert?.hasRoadblock
                    ? '#dc2626'
                    : '#005bbf',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* Card Footer: Assignee Avatars & Follow-up badge */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid #f1f5f9',
            paddingTop: '8px',
            marginTop: '2px',
          }}
        >
          {/* Multiple Assignees Avatars */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {(task.assignedTo || []).filter(Boolean).slice(0, 3).map((staff, idx) => {
              const staffObj = typeof staff === 'object' && staff !== null ? staff : {};
              const fName = staffObj.firstName || '';
              const lName = staffObj.lastName || '';
              const initials = ((fName[0] || '') + (lName[0] || '') || (typeof staff === 'string' ? 'U' : '?')).toUpperCase();
              return (
                <div
                  key={staffObj._id || idx}
                  title={fName ? `${fName} ${lName}`.trim() : (staffObj.username || 'Assignee')}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: '#005bbf',
                    color: '#ffffff',
                    fontSize: '10px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: idx > 0 ? '-6px' : '0',
                    border: '1.5px solid #ffffff',
                  }}
                >
                  {initials}
                </div>
              );
            })}
            {((task.assignedTo || []).filter(Boolean).length || 0) > 3 && (
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: '#64748b',
                  color: '#ffffff',
                  fontSize: '9px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: '-6px',
                  border: '1.5px solid #ffffff',
                }}
              >
                +{((task.assignedTo || []).filter(Boolean).length) - 3}
              </div>
            )}
          </div>

          <div>{renderFollowUpBadge(task)}</div>
        </div>
      </div>
    );
  };

  const radar = radarCategories();

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* 1. TOP HEADER BANNER */}
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
              Taskforce & Work Allocation
            </h1>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '12px',
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Target size={13} /> Executive Command
            </span>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '6px', margin: 0 }}>
            MD Directives, cross-department works, multiple staff allocation, and systematic follow-up management.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={fetchTasksAndStats}
            style={{
              padding: '9px 16px',
              fontSize: '13px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              borderRadius: '8px',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={handleNewTask}
            style={{
              padding: '9px 20px',
              fontSize: '13px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#ca8a04',
              color: '#ffffff',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(202, 138, 4, 0.3)',
            }}
          >
            <Plus size={16} />
            Assign New Work
          </button>
        </div>
      </div>

      {/* 2. EXECUTIVE KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
        {/* Total Tasks */}
        <div
          className="stat-card"
          onClick={resetAllFilters}
          style={{
            padding: '16px',
            borderRadius: '12px',
            cursor: 'pointer',
            backgroundColor: '#ffffff',
            border: '1px solid #dadce0',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Total Directives</span>
            <Layers size={18} color="#005bbf" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a', margin: '4px 0' }}>
            {stats?.totalTasks || 0}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>All allocated tasks</div>
        </div>

        {/* Follow-ups Due Today */}
        <div
          className="stat-card"
          onClick={() => setFilterDueTodayOnly(!filterDueTodayOnly)}
          style={{
            padding: '16px',
            borderRadius: '12px',
            cursor: 'pointer',
            border: filterDueTodayOnly ? '2px solid #ca8a04' : '1px solid #fef08a',
            backgroundColor: '#fefce8',
            boxShadow: filterDueTodayOnly ? '0 3px 10px rgba(202, 138, 4, 0.2)' : 'none',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#854d0e' }}>Follow-ups Due Today</span>
            <Clock size={18} color="#ca8a04" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#ca8a04', margin: '4px 0' }}>
            {stats?.followUpsDueToday || 0}
          </div>
          <div style={{ fontSize: '11px', color: '#854d0e', fontWeight: 600 }}>
            {filterDueTodayOnly ? 'Active Filter' : 'Click to filter'}
          </div>
        </div>

        {/* Active MD Directives */}
        <div
          className="stat-card"
          onClick={() => setFilterMDOnly(!filterMDOnly)}
          style={{
            padding: '16px',
            borderRadius: '12px',
            cursor: 'pointer',
            border: filterMDOnly ? '2px solid #ca8a04' : '1px solid #fed7aa',
            backgroundColor: '#fffbeb',
            boxShadow: filterMDOnly ? '0 3px 10px rgba(202, 138, 4, 0.2)' : 'none',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#b45309' }}>MD Directives</span>
            <Sparkles size={18} color="#ca8a04" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#ca8a04', margin: '4px 0' }}>
            {stats?.mdDirectivesActive || 0}
          </div>
          <div style={{ fontSize: '11px', color: '#b45309', fontWeight: 600 }}>
            {filterMDOnly ? 'Active Filter' : 'Top executive priority'}
          </div>
        </div>

        {/* Active In Execution */}
        <div
          className="stat-card"
          style={{
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: '#ffffff',
            border: '1px solid #dadce0',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>In Execution</span>
            <TrendingUp size={18} color="#005bbf" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#005bbf', margin: '4px 0' }}>
            {stats?.activeTasks || 0}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Active ongoing tasks</div>
        </div>

        {/* Roadblocks & Obstacles */}
        <div
          className="stat-card"
          onClick={() => setFilterRoadblocksOnly(!filterRoadblocksOnly)}
          style={{
            padding: '16px',
            borderRadius: '12px',
            cursor: 'pointer',
            backgroundColor: stats?.roadblocksCount > 0 ? '#fef2f2' : '#ffffff',
            border: filterRoadblocksOnly
              ? '2px solid #dc2626'
              : stats?.roadblocksCount > 0
              ? '1.5px solid #fca5a5'
              : '1px solid #dadce0',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: stats?.roadblocksCount > 0 ? '#dc2626' : '#64748b' }}>
              Roadblocks Alert
            </span>
            <AlertTriangle size={18} color={stats?.roadblocksCount > 0 ? '#dc2626' : '#94a3b8'} />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: stats?.roadblocksCount > 0 ? '#dc2626' : '#0f172a', margin: '4px 0' }}>
            {stats?.roadblocksCount || 0}
          </div>
          <div style={{ fontSize: '11px', color: stats?.roadblocksCount > 0 ? '#b91c1c' : '#64748b', fontWeight: 600 }}>
            {filterRoadblocksOnly ? 'Active Filter' : 'Needs attention'}
          </div>
        </div>

        {/* Completed */}
        <div
          className="stat-card"
          style={{
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: '#ffffff',
            border: '1px solid #dadce0',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Completed</span>
            <CheckCircle2 size={18} color="#16a34a" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#16a34a', margin: '4px 0' }}>
            {stats?.completedTasks || 0}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Successfully closed</div>
        </div>
      </div>

      {/* 3. REDESIGNED TOOLBAR: CLEAN, HORIZONTAL & RESPONSIVE */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          backgroundColor: '#ffffff',
          border: '1px solid #dadce0',
          borderRadius: '12px',
          padding: '12px 18px',
          boxShadow: '0 1px 3px rgba(60, 64, 67, 0.06)',
        }}
      >
        {/* Left: View Modes Switcher */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#f1f5f9',
            padding: '4px',
            borderRadius: '8px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setViewMode('kanban');
              setSearchParams({ view: 'kanban' });
            }}
            style={{
              padding: '7px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: viewMode === 'kanban' ? '#ffffff' : 'transparent',
              color: viewMode === 'kanban' ? '#005bbf' : '#64748b',
              boxShadow: viewMode === 'kanban' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer',
              border: 'none',
            }}
          >
            <Kanban size={14} /> Kanban Board
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode('radar');
              setSearchParams({ view: 'radar' });
            }}
            style={{
              padding: '7px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: viewMode === 'radar' ? '#ffffff' : 'transparent',
              color: viewMode === 'radar' ? '#ca8a04' : '#64748b',
              boxShadow: viewMode === 'radar' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer',
              border: 'none',
            }}
          >
            <Target size={14} /> Follow-up Radar ({stats?.followUpsDueToday || 0})
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode('list');
              setSearchParams({ view: 'list' });
            }}
            style={{
              padding: '7px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: viewMode === 'list' ? '#ffffff' : 'transparent',
              color: viewMode === 'list' ? '#005bbf' : '#64748b',
              boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer',
              border: 'none',
            }}
          >
            <List size={14} /> List View
          </button>
        </div>

        {/* Right: Inline Search & Filter Controls (Fixed widths to prevent expanding) */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <Search size={14} color="#64748b" style={{ position: 'absolute', left: '10px', top: '11px', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search tasks, flats..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '180px',
                height: '36px',
                paddingLeft: '32px',
                paddingRight: search ? '28px' : '10px',
                borderRadius: '8px',
                border: '1px solid #dadce0',
                fontSize: '12px',
                display: 'inline-block',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '9px',
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Department Dropdown */}
          <div style={{ display: 'inline-block' }}>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              style={{
                width: '155px',
                height: '36px',
                padding: '0 10px',
                borderRadius: '8px',
                border: selectedDept !== 'all' ? '1.5px solid #005bbf' : '1px solid #dadce0',
                fontSize: '12px',
                fontWeight: 500,
                backgroundColor: selectedDept !== 'all' ? '#eff6ff' : '#ffffff',
                color: selectedDept !== 'all' ? '#005bbf' : '#334155',
                display: 'inline-block',
                cursor: 'pointer',
                boxSizing: 'border-box',
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

          {/* Priority Dropdown */}
          <div style={{ display: 'inline-block' }}>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              style={{
                width: '135px',
                height: '36px',
                padding: '0 10px',
                borderRadius: '8px',
                border: selectedPriority !== 'all' ? '1.5px solid #005bbf' : '1px solid #dadce0',
                fontSize: '12px',
                fontWeight: 500,
                backgroundColor: selectedPriority !== 'all' ? '#eff6ff' : '#ffffff',
                color: selectedPriority !== 'all' ? '#005bbf' : '#334155',
                display: 'inline-block',
                cursor: 'pointer',
                boxSizing: 'border-box',
              }}
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Quick Filter: My Works */}
          <button
            type="button"
            onClick={() => setFilterMyTasks(!filterMyTasks)}
            style={{
              height: '36px',
              padding: '0 12px',
              borderRadius: '8px',
              border: filterMyTasks ? '1.5px solid #005bbf' : '1px solid #dadce0',
              backgroundColor: filterMyTasks ? '#eff6ff' : '#ffffff',
              color: filterMyTasks ? '#005bbf' : '#334155',
              fontSize: '12px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <Users size={13} />
            My Works
          </button>

          {/* Reset Filters Button (if active) */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetAllFilters}
              title="Reset all filters"
              style={{
                height: '36px',
                padding: '0 10px',
                borderRadius: '8px',
                border: '1px solid #fca5a5',
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                fontSize: '11px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={12} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* 4. VIEW 1: KANBAN BOARD */}
      {viewMode === 'kanban' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, minmax(260px, 1fr))',
            gap: '16px',
            alignItems: 'start',
            overflowX: 'auto',
            paddingBottom: '16px',
          }}
        >
          {kanbanColumns.map((col) => {
            const columnTasks = tasks.filter((t) => {
              if (col.key === 'delayed') {
                return (
                  t.status === 'delayed' ||
                  (t.roadblockAlert?.hasRoadblock && !t.roadblockAlert?.isResolved)
                );
              }
              if (col.key === 'in_progress') {
                return (
                  t.status === 'in_progress' &&
                  !(t.roadblockAlert?.hasRoadblock && !t.roadblockAlert?.isResolved)
                );
              }
              return t.status === col.key;
            });

            return (
              <div
                key={col.key}
                style={{
                  backgroundColor: col.bg,
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: 'calc(100vh - 280px)',
                  overflow: 'hidden',
                }}
              >
                {/* Column Header */}
                <div
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: col.color,
                      }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                      {col.title}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      backgroundColor: col.badge,
                      color: col.text,
                    }}
                  >
                    {columnTasks.length}
                  </span>
                </div>

                {/* Column Cards Container */}
                <div
                  style={{
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    overflowY: 'auto',
                    flex: 1,
                  }}
                >
                  {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '6px 0' }}>
                      <div style={{ height: '80px', borderRadius: '8px', backgroundColor: '#ffffff', opacity: 0.7, border: '1px solid #e2e8f0' }} />
                      <div style={{ height: '60px', borderRadius: '8px', backgroundColor: '#ffffff', opacity: 0.5, border: '1px solid #e2e8f0' }} />
                    </div>
                  ) : columnTasks.length === 0 ? (
                    <div
                      style={{
                        padding: '30px 12px',
                        textAlign: 'center',
                        color: '#94a3b8',
                        fontSize: '12px',
                        border: '1px dashed #cbd5e1',
                        borderRadius: '8px',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      No tasks in this stage
                    </div>
                  ) : (
                    columnTasks.map((task) => renderTaskCard(task))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. VIEW 2: FOLLOW-UP RADAR WORKSPACE */}
      {viewMode === 'radar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Urgent Follow-ups Due Today */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1.5px solid #facc15',
              padding: '18px 20px',
              boxShadow: '0 2px 10px rgba(202, 138, 4, 0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={20} color="#ca8a04" />
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#854d0e', margin: 0 }}>
                  Urgent: Follow-ups Scheduled for Today ({radar.dueToday.length})
                </h3>
              </div>
              <span style={{ fontSize: '12px', color: '#854d0e' }}>
                Click any task card to log status discussion & schedule next check
              </span>
            </div>

            {radar.dueToday.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#16a34a', fontSize: '13px', fontWeight: 600 }}>
                Excellent! All scheduled follow-ups for today have been completed.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
                {radar.dueToday.map((task) => renderTaskCard(task))}
              </div>
            )}
          </div>

          {/* Overdue Follow-ups */}
          {radar.overdue.length > 0 && (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1.5px solid #f87171',
                padding: '18px 20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={20} color="#dc2626" />
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#991b1b', margin: 0 }}>Overdue Follow-ups ({radar.overdue.length})
                  </h3>
                </div>
                <span style={{ fontSize: '12px', color: '#991b1b' }}>
                  Follow-up date passed without recorded progress
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
                {radar.overdue.map((task) => renderTaskCard(task))}
              </div>
            </div>
          )}

          {/* Upcoming Scheduled Follow-ups */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #dadce0',
              padding: '18px 20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} color="#005bbf" />
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Upcoming Scheduled Follow-ups ({radar.upcoming.length})
                </h3>
              </div>
            </div>

            {radar.upcoming.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                No future follow-ups scheduled yet.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
                {radar.upcoming.map((task) => renderTaskCard(task))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. VIEW 3: TABLE / LIST VIEW */}
      {viewMode === 'list' && (
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
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #dadce0', color: '#475569', fontSize: '12px' }}>
                  <th style={{ padding: '12px 16px' }}>Task Directive</th>
                  <th style={{ padding: '12px 16px' }}>Dept & Property</th>
                  <th style={{ padding: '12px 16px' }}>Allocated Team</th>
                  <th style={{ padding: '12px 16px' }}>Priority</th>
                  <th style={{ padding: '12px 16px' }}>Progress</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Follow-up Schedule</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                      No tasks matching criteria.
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => {
                    return (
                      <tr
                        key={task._id}
                        onClick={() => handleOpenDetail(task._id)}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        {/* Title & Code */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>
                              {task.taskCode}
                            </span>
                            {task.isMDDirective && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  backgroundColor: '#ca8a04',
                                  color: '#ffffff',
                                  padding: '1px 6px',
                                  borderRadius: '8px',
                                }}
                              >
                                MD
                              </span>
                            )}
                          </div>
                          <div style={{ fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
                            {task.title}
                          </div>
                        </td>

                        {/* Dept & Property */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ textTransform: 'capitalize', fontWeight: 600, color: '#334155' }}>
                            {task.department}
                          </div>
                          {task.isApartmentRelated && task.apartmentDetails?.flatNumber && (
                            <div style={{ fontSize: '11px', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Building2 size={11} /> {task.apartmentDetails.flatNumber}
                            </div>
                          )}
                        </td>

                        {/* Allocated Team */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            {(task.assignedTo || []).filter(Boolean).slice(0, 3).map((staff, idx) => {
                              const staffObj = typeof staff === 'object' && staff !== null ? staff : {};
                              const fName = staffObj.firstName || '';
                              const lName = staffObj.lastName || '';
                              const initials = ((fName[0] || '') + (lName[0] || '') || (typeof staff === 'string' ? 'U' : '?')).toUpperCase();
                              return (
                                <div
                                  key={staffObj._id || idx}
                                  title={fName ? `${fName} ${lName}`.trim() : (staffObj.username || 'Assignee')}
                                  style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    backgroundColor: '#005bbf',
                                    color: '#ffffff',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginLeft: idx > 0 ? '-6px' : '0',
                                    border: '1.5px solid #ffffff',
                                  }}
                                >
                                  {initials}
                                </div>
                              );
                            })}
                            <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '6px' }}>
                              {(task.assignedTo || []).filter(Boolean).length} person(s)
                            </span>
                          </div>
                        </td>

                        {/* Priority */}
                        <td style={{ padding: '14px 16px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor:
                                task.priority === 'urgent'
                                  ? '#fee2e2'
                                  : task.priority === 'high'
                                  ? '#ffedd5'
                                  : '#f1f5f9',
                              color:
                                task.priority === 'urgent'
                                  ? '#dc2626'
                                  : task.priority === 'high'
                                  ? '#c2410c'
                                  : '#475569',
                            }}
                          >
                            {task.priority}
                          </span>
                        </td>

                        {/* Progress */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '120px' }}>
                            <div style={{ flex: 1, height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${task.progress || 0}%`,
                                  height: '100%',
                                  backgroundColor: task.progress === 100 ? '#16a34a' : '#005bbf',
                                }}
                              />
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#334155' }}>
                              {task.progress || 0}%
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td style={{ padding: '14px 16px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '3px 8px',
                              borderRadius: '12px',
                              textTransform: 'capitalize',
                              backgroundColor:
                                task.status === 'completed'
                                  ? '#dcfce7'
                                  : task.status === 'in_progress'
                                  ? '#eff6ff'
                                  : task.status === 'delayed'
                                  ? '#fee2e2'
                                  : '#f1f5f9',
                              color:
                                task.status === 'completed'
                                  ? '#15803d'
                                  : task.status === 'in_progress'
                                  ? '#1d4ed8'
                                  : task.status === 'delayed'
                                  ? '#b91c1c'
                                  : '#475569',
                            }}
                          >
                            {task.status?.replace('_', ' ')}
                          </span>
                        </td>

                        {/* Follow-up Schedule */}
                        <td style={{ padding: '14px 16px' }}>
                          {renderFollowUpBadge(task)}
                        </td>

                        {/* Action */}
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetail(task._id);
                            }}
                            style={{ padding: '4px 10px', fontSize: '11px' }}
                          >
                            Open Directive
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
      )}

      {/* New / Edit Task Modal */}
      <NewTaskModal
        isOpen={isNewTaskModalOpen}
        onClose={() => {
          setIsNewTaskModalOpen(false);
          setEditingTask(null);
        }}
        onTaskCreated={fetchTasksAndStats}
        initialData={editingTask}
      />

      {/* Task Details & Follow-up Drawer/Modal */}
      <TaskDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedTaskId(null);
        }}
        taskId={selectedTaskId}
        onTaskUpdated={fetchTasksAndStats}
        onEditTask={handleOpenEdit}
      />
    </div>
  );
};
