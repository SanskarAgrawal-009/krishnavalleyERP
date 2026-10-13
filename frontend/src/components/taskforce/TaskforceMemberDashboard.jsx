import React, { useState, useEffect } from 'react';
import {
  Users,
  HardHat,
  Shield,
  Briefcase,
  Upload,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Search,
  Filter,
  Eye,
  Trash2,
  Plus,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  SlidersHorizontal,
  Calendar,
  Building2,
  X,
  Camera,
  Layers,
  MessageSquare,
  Sparkles,
  Bell,
  Megaphone
} from 'lucide-react';
import { taskforceManagerService } from '../../services/taskforceManagerService.js';
import { taskService } from '../../services/taskService.js';
import { getFileUrl } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export const TaskforceMemberDashboard = ({
  initialMemberId = null,
  onOpenTaskDetail,
  onAssignTaskToMember,
}) => {
  const { showToast } = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [allMembers, setAllMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState(initialMemberId || '');

  // Active view tab: 'tasks' | 'uploads' | 'subordinates'
  const [activeTab, setActiveTab] = useState('tasks');
  const [taskStatusFilter, setTaskStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [memberAlertFilter, setMemberAlertFilter] = useState('all');

  // Quick Proof Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadTaskId, setUploadTaskId] = useState('');
  const [uploadStage, setUploadStage] = useState('proof');
  const [uploadRemarks, setUploadRemarks] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [submittingProof, setSubmittingProof] = useState(false);

  // Quick Progress Modal State
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [progressTaskId, setProgressTaskId] = useState(null);
  const [progressVal, setProgressVal] = useState(0);
  const [progressStatus, setProgressStatus] = useState('in_progress');
  const [savingProgress, setSavingProgress] = useState(false);

  useEffect(() => {
    loadMembersList();
  }, []);

  useEffect(() => {
    if (initialMemberId) {
      setSelectedMemberId(initialMemberId);
    }
  }, [initialMemberId]);

  useEffect(() => {
    loadDashboard();

    const handleRemoteTaskUpdated = () => {
      loadDashboard();
    };
    window.addEventListener('taskforceTaskUpdated', handleRemoteTaskUpdated);
    return () => window.removeEventListener('taskforceTaskUpdated', handleRemoteTaskUpdated);
  }, [selectedMemberId]);

  const loadMembersList = async () => {
    try {
      const res = await taskforceManagerService.getTeam();
      if (res && res.success) {
        setAllMembers(res.members || []);
      }
    } catch (err) {
      console.warn('Could not load team list for switcher:', err);
    }
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await taskforceManagerService.getMemberDashboard(selectedMemberId || undefined);
      if (res && res.success) {
        setDashboardData(res);
      } else {
        showToast(res?.message || 'Failed to load member dashboard', 'error');
      }
    } catch (err) {
      console.error('Error loading member dashboard:', err);
      showToast(err.message || 'Error loading dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleProofSubmit = async (e) => {
    e.preventDefault();
    if (!uploadTaskId) {
      showToast('Please select a task for this proof upload', 'error');
      return;
    }
    if (!selectedFile) {
      showToast('Please select a photo or document file', 'error');
      return;
    }

    try {
      setSubmittingProof(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('proof', selectedFile);
      formData.append('stage', uploadStage);
      formData.append('remarks', uploadRemarks);
      formData.append('caption', uploadRemarks);

      const res = await taskService.uploadProof(uploadTaskId, formData);
      if (res && res.success) {
        showToast('Work proof uploaded successfully!', 'success');
        setIsUploadModalOpen(false);
        setSelectedFile(null);
        setUploadRemarks('');
        window.dispatchEvent(new CustomEvent('taskforceTaskUpdated', { detail: { taskId: uploadTaskId } }));
        loadDashboard();
      } else {
        showToast(res?.message || 'Failed to upload proof', 'error');
      }
    } catch (err) {
      console.error('Error uploading proof:', err);
      showToast(err.message || 'Failed to upload proof', 'error');
    } finally {
      setSubmittingProof(false);
    }
  };

  const handleSaveProgress = async () => {
    if (!progressTaskId) return;
    try {
      setSavingProgress(true);
      const res = await taskService.updateProgress(progressTaskId, {
        progress: Number(progressVal),
        status: progressStatus,
      });
      if (res && res.success) {
        showToast('Task progress updated!', 'success');
        setIsProgressModalOpen(false);
        window.dispatchEvent(new CustomEvent('taskforceTaskUpdated', { detail: { taskId: progressTaskId } }));
        loadDashboard();
      } else {
        showToast(res?.message || 'Failed to update progress', 'error');
      }
    } catch (err) {
      console.error('Error updating progress:', err);
      showToast(err.message || 'Error updating progress', 'error');
    } finally {
      setSavingProgress(false);
    }
  };

  const member = dashboardData?.member;
  const kpis = dashboardData?.kpis || {};
  const tasks = dashboardData?.tasks || [];
  const uploads = dashboardData?.uploads || [];
  const hierarchyLevel = dashboardData?.hierarchyLevel || 'helper';
  const callerLevel = dashboardData?.callerLevel || 'helper';
  const isManagerOrAdmin = ['admin', 'super_admin', 'taskforce_manager'].includes(user?.role);

  // Compute live task notifications and directives for the dashboard
  const taskAlerts = React.useMemo(() => {
    const list = [];
    tasks.forEach((t) => {
      // 1. Roadblock alerts
      if (t.roadblockAlert?.hasRoadblock && !t.roadblockAlert?.isResolved) {
        list.push({
          id: `rb-${t._id}`,
          taskId: t._id,
          taskCode: t.taskCode,
          taskTitle: t.title,
          type: 'roadblock',
          label: 'ROADBLOCK REPORTED',
          message: t.roadblockAlert.reason || 'Roadblock hindrance reported on this directive.',
          color: '#dc2626',
          bg: '#fee2e2',
          borderColor: '#fca5a5',
          icon: AlertTriangle,
          time: t.roadblockAlert.reportedAt,
        });
      }

      // 2. MD Directives / Management Notes
      const mdNotes = (t.comments || []).filter((c) => c.isMDNote);
      if (t.isMDDirective || mdNotes.length > 0) {
        const latestNote = mdNotes[mdNotes.length - 1];
        list.push({
          id: `md-${t._id}`,
          taskId: t._id,
          taskCode: t.taskCode,
          taskTitle: t.title,
          type: 'md_directive',
          label: 'MD DIRECTIVE NOTE',
          message: latestNote?.message || 'High priority management directive note posted.',
          color: '#ca8a04',
          bg: '#fefce8',
          borderColor: '#fef08a',
          icon: Sparkles,
          time: latestNote?.createdAt || t.updatedAt,
        });
      }

      // 3. Directive updates & communication
      const regularComments = (t.comments || []).filter((c) => !c.isMDNote);
      if (regularComments.length > 0) {
        const latestComment = regularComments[regularComments.length - 1];
        list.push({
          id: `comm-${t._id}-${latestComment._id || regularComments.length}`,
          taskId: t._id,
          taskCode: t.taskCode,
          taskTitle: t.title,
          type: 'comment',
          label: 'DIRECTIVE UPDATE',
          message: `${latestComment.sender?.firstName || 'Staff'}: "${latestComment.message}"`,
          color: '#0284c7',
          bg: '#f0f9ff',
          borderColor: '#bae6fd',
          icon: MessageSquare,
          time: latestComment.createdAt,
        });
      }

      // 4. Overdue or Due Today follow-up inspections
      if (t.followUpSchedule?.nextFollowUpDate && t.status !== 'completed') {
        const now = new Date();
        const nextD = new Date(t.followUpSchedule.nextFollowUpDate);
        const isToday =
          now.getFullYear() === nextD.getFullYear() &&
          now.getMonth() === nextD.getMonth() &&
          now.getDate() === nextD.getDate();
        const isOverdue = nextD < new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (isOverdue || isToday) {
          list.push({
            id: `fu-${t._id}`,
            taskId: t._id,
            taskCode: t.taskCode,
            taskTitle: t.title,
            type: 'followup',
            label: isOverdue ? 'FOLLOW-UP OVERDUE' : 'FOLLOW-UP DUE TODAY',
            message: `Inspection scheduled ${isToday ? 'today' : 'was due ' + nextD.toLocaleDateString()}`,
            color: isOverdue ? '#e11d48' : '#d97706',
            bg: isOverdue ? '#fff1f2' : '#fffbeb',
            borderColor: isOverdue ? '#fecdd3' : '#fde68a',
            icon: Clock,
            time: nextD,
          });
        }
      }

      // 5. Work evidence / field proofs
      if ((t.uploads || []).length > 0) {
        const latestUpload = t.uploads[t.uploads.length - 1];
        list.push({
          id: `proof-${t._id}-${latestUpload._id || t.uploads.length}`,
          taskId: t._id,
          taskCode: t.taskCode,
          taskTitle: t.title,
          type: 'proof',
          label: 'WORK PROOF UPLOADED',
          message: latestUpload.caption || latestUpload.remarks || `Work proof uploaded (${latestUpload.stage || 'proof'})`,
          color: '#7c3aed',
          bg: '#f5f3ff',
          borderColor: '#ddd6fe',
          icon: Camera,
          time: latestUpload.uploadedAt || latestUpload.createdAt,
        });
      }
    });

    return list.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
  }, [tasks]);

  const filteredMemberAlerts = React.useMemo(() => {
    if (memberAlertFilter === 'all') return taskAlerts;
    return taskAlerts.filter((a) => a.type === memberAlertFilter);
  }, [taskAlerts, memberAlertFilter]);

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (taskStatusFilter !== 'all' && t.status !== taskStatusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCode = (t.taskCode || '').toLowerCase().includes(q);
      const matchTitle = (t.title || '').toLowerCase().includes(q);
      const matchFlat = (t.apartmentDetails?.flatNumber || '').toLowerCase().includes(q);
      return matchCode || matchTitle || matchFlat;
    }
    return true;
  });

  const getHierarchyBadge = (level) => {
    switch (level) {
      case 'head':
        return {
          label: 'HEAD',
          icon: Briefcase,
          bg: '#ecfeff',
          color: '#0e7490',
          border: '#a5f3fc',
        };
      case 'supervisor':
        return {
          label: 'SUPERVISOR',
          icon: Shield,
          bg: '#eef2ff',
          color: '#4338ca',
          border: '#c7d2fe',
        };
      case 'helper':
      default:
        return {
          label: 'HELPER',
          icon: HardHat,
          bg: '#eff6ff',
          color: '#1d4ed8',
          border: '#bfdbfe',
        };
    }
  };

  const badgeInfo = getHierarchyBadge(hierarchyLevel);

  if (loading && !dashboardData) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          gap: '12px',
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
        }}
      >
        <RefreshCw size={26} style={{ color: '#2563eb', animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>
          Loading member dashboard & directives...
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & MEMBER PROFILE CARD */}
      {/* ========================================================================= */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '20px 24px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          {/* Member Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background:
                  hierarchyLevel === 'head'
                    ? 'linear-gradient(135deg, #0891b2, #0e7490)'
                    : hierarchyLevel === 'supervisor'
                    ? 'linear-gradient(135deg, #4f46e5, #4338ca)'
                    : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              }}
            >
              {hierarchyLevel === 'head' ? (
                <Briefcase size={26} />
              ) : hierarchyLevel === 'supervisor' ? (
                <Shield size={26} />
              ) : (
                <HardHat size={26} />
              )}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '800', color: '#0f172a' }}>
                  {member ? member.name : `${user?.firstName || 'My'} Taskforce Dashboard`}
                </h1>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.72rem',
                    fontWeight: '800',
                    background: badgeInfo.bg,
                    color: badgeInfo.color,
                    border: `1px solid ${badgeInfo.border}`,
                  }}
                >
                  <badgeInfo.icon size={13} />
                  {badgeInfo.label}
                </span>
                {(member?.department || member?.trade) && (
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      background: '#f1f5f9',
                      color: '#475569',
                    }}
                  >
                    {member.department || member.trade}
                  </span>
                )}
              </div>

              <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                {hierarchyLevel === 'helper' &&
                  'Field Tier • Helper permissions active (Personal tasks, uploads & progress only)'}
                {hierarchyLevel === 'supervisor' &&
                  'Middle Tier • Supervisor permissions active (Personal & subordinate helpers visibility)'}
                {hierarchyLevel === 'head' &&
                  'Top Tier • Department Head permissions active (All 3 tiers: Head, Supervisors & Helpers)'}
                {hierarchyLevel === 'taskforce_manager' &&
                  'Administrative Overview • Full Taskforce Operations visibility'}
                {member?.supervisorId && ` • Reports to: ${member.supervisorId.name}`}
                {member?.headId && ` • Head: ${member.headId.name}`}
              </p>
            </div>
          </div>

          {/* Actions & Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Manager Switcher Dropdown */}
            {isManagerOrAdmin && allMembers.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: '700', color: '#64748b' }}>
                  View Member:
                </span>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    background: '#f8fafc',
                    color: '#1e293b',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">-- All / Team Overview --</option>
                  {allMembers.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.name} ({m.hierarchyLevel?.toUpperCase()} • {m.department || m.trade})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Quick Upload Proof CTA */}
            <button
              onClick={() => {
                if (tasks.length > 0) setUploadTaskId(tasks[0]._id);
                setIsUploadModalOpen(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.28)',
              }}
            >
              <Camera size={15} />
              <span>Submit Work Proof</span>
            </button>

            {/* Refresh */}
            <button
              onClick={loadDashboard}
              disabled={loading}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <RefreshCw size={14} className={loading ? 'spin-animate' : ''} />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. STATS & KPI STRIP */}
        {/* ========================================================================= */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
          {[
            { label: 'Assigned Directives', val: kpis.totalCount || 0, color: '#2563eb', bg: '#eff6ff', icon: FileText },
            { label: 'Active In-Progress', val: kpis.inProgressCount || 0, color: '#0891b2', bg: '#ecfeff', icon: Clock },
            { label: 'Completed Works', val: kpis.completedCount || 0, color: '#16a34a', bg: '#f0fdf4', icon: CheckCircle2 },
            { label: 'Work Proofs Uploaded', val: kpis.totalUploads || 0, color: '#7c3aed', bg: '#f5f3ff', icon: Upload },
            { label: 'Average Progress', val: `${kpis.avgProgress || 0}%`, color: '#d97706', bg: '#fffbeb', icon: TrendingUp },
            { label: 'Active Roadblocks', val: kpis.roadblockCount || 0, color: '#dc2626', bg: '#fef2f2', icon: AlertTriangle },
          ].map((stat, i) => (
            <div
              key={i}
              style={{
                background: stat.bg,
                border: `1px solid ${stat.color}30`,
                borderRadius: '10px',
                padding: '10px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: '700', color: '#64748b' }}>{stat.label}</span>
                <stat.icon size={13} color={stat.color} />
              </div>
              <span style={{ fontSize: '1.25rem', fontWeight: '800', color: stat.color }}>{stat.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2.5 LIVE TASK NOTIFICATIONS & DIRECTIVES BANNER */}
      {/* ========================================================================= */}
      {taskAlerts.length > 0 && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '16px 20px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bell size={15} />
              </div>
              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                Task Notifications & Directives Alert Center
              </span>
              <span
                style={{
                  background: '#fee2e2',
                  color: '#dc2626',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '12px',
                }}
              >
                {taskAlerts.length} Active
              </span>
            </div>
            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
              Click any notification to open task details
            </span>
          </div>

          {/* Category Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: `All (${taskAlerts.length})` },
              { id: 'roadblock', label: `Roadblocks (${taskAlerts.filter((a) => a.type === 'roadblock').length})`, color: '#dc2626' },
              { id: 'md_directive', label: `MD Notes (${taskAlerts.filter((a) => a.type === 'md_directive').length})`, color: '#ca8a04' },
              { id: 'comment', label: `Updates (${taskAlerts.filter((a) => a.type === 'comment').length})`, color: '#0284c7' },
              { id: 'proof', label: `Proofs (${taskAlerts.filter((a) => a.type === 'proof').length})`, color: '#7c3aed' },
              { id: 'followup', label: `Follow-ups (${taskAlerts.filter((a) => a.type === 'followup').length})`, color: '#d97706' },
            ].map((pill) => {
              const count =
                pill.id === 'all'
                  ? taskAlerts.length
                  : taskAlerts.filter((a) => a.type === pill.id).length;
              if (count === 0 && pill.id !== 'all') return null;

              const isSelected = memberAlertFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  onClick={() => setMemberAlertFilter(pill.id)}
                  style={{
                    background: isSelected ? '#0f172a' : '#f8fafc',
                    color: isSelected ? '#ffffff' : pill.color || '#475569',
                    border: isSelected ? '1px solid #0f172a' : '1px solid #cbd5e1',
                    padding: '4px 10px',
                    borderRadius: '16px',
                    fontSize: '0.72rem',
                    fontWeight: isSelected ? 800 : 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '10px',
            }}
          >
            {filteredMemberAlerts.map((alert) => {
              const IconComponent = alert.icon;
              return (
                <div
                  key={alert.id}
                  onClick={() => onOpenTaskDetail && onOpenTaskDetail(alert.taskId)}
                  style={{
                    background: alert.bg,
                    border: `1px solid ${alert.borderColor}`,
                    borderRadius: '10px',
                    padding: '10px 14px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    transition: 'transform 0.12s ease, box-shadow 0.12s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span
                      style={{
                        fontSize: '0.64rem',
                        fontWeight: 800,
                        color: alert.color,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <IconComponent size={12} />
                      {alert.label}
                    </span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#1e293b', fontFamily: 'monospace' }}>
                      {alert.taskCode}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {alert.taskTitle}
                  </div>

                  <div
                    style={{
                      fontSize: '0.72rem',
                      color: '#475569',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {alert.message}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. TABS NAVIGATION */}
      {/* ========================================================================= */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '2px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('tasks')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: activeTab === 'tasks' ? '2px solid #2563eb' : '2px solid transparent',
              background: 'none',
              color: activeTab === 'tasks' ? '#1d4ed8' : '#64748b',
              fontWeight: activeTab === 'tasks' ? '800' : '600',
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <FileText size={16} />
            <span>Assigned Directives ({tasks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('uploads')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: activeTab === 'uploads' ? '2px solid #7c3aed' : '2px solid transparent',
              background: 'none',
              color: activeTab === 'uploads' ? '#6d28d9' : '#64748b',
              fontWeight: activeTab === 'uploads' ? '800' : '600',
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Upload size={16} />
            <span>Work Proof &amp; Uploads Vault ({uploads.length})</span>
          </button>
        </div>

        {/* Search & Filter */}
        {activeTab === 'tasks' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '9px' }} />
              <input
                type="text"
                placeholder="Search directives..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '6px 12px 6px 30px',
                  borderRadius: '7px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.76rem',
                  width: '180px',
                }}
              />
            </div>
            <select
              value={taskStatusFilter}
              onChange={(e) => setTaskStatusFilter(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '7px',
                border: '1px solid #cbd5e1',
                fontSize: '0.76rem',
                fontWeight: '600',
              }}
            >
              <option value="all">All Status</option>
              <option value="in_progress">In Progress</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. TAB CONTENT: DIRECTIVES & TASKS */}
      {/* ========================================================================= */}
      {activeTab === 'tasks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredTasks.length === 0 ? (
            <div
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                padding: '40px 20px',
                textAlign: 'center',
                border: '1px dashed #cbd5e1',
                color: '#64748b',
              }}
            >
              <CheckCircle2 size={36} color="#94a3b8" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#1e293b' }}>
                No directives matching this filter
              </div>
              <div style={{ fontSize: '0.76rem', marginTop: '4px' }}>
                All assigned tasks are clear or completed.
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
              {filteredTasks.map((t) => (
                <div
                  key={t._id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {/* Task Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#2563eb', fontFamily: 'monospace' }}>
                        {t.taskCode}
                      </span>
                      <h3
                        onClick={() => onOpenTaskDetail && onOpenTaskDetail(t._id)}
                        style={{
                          margin: '2px 0 0',
                          fontSize: '0.88rem',
                          fontWeight: '800',
                          color: '#0f172a',
                          cursor: 'pointer',
                          lineHeight: 1.3,
                        }}
                      >
                        {t.title}
                      </h3>
                    </div>

                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.68rem',
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        background:
                          t.status === 'completed'
                            ? '#dcfce7'
                            : t.status === 'in_progress'
                            ? '#e0f2fe'
                            : '#fef3c7',
                        color:
                          t.status === 'completed'
                            ? '#15803d'
                            : t.status === 'in_progress'
                            ? '#0369a1'
                            : '#b45309',
                      }}
                    >
                      {t.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Task Notifications Badges Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {t.roadblockAlert?.hasRoadblock && !t.roadblockAlert?.isResolved && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          background: '#fee2e2',
                          color: '#dc2626',
                          border: '1px solid #fca5a5',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <AlertTriangle size={10} /> ROADBLOCK
                      </span>
                    )}
                    {(t.isMDDirective || (t.comments || []).some((c) => c.isMDNote)) && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          background: '#fefce8',
                          color: '#a16207',
                          border: '1px solid #fef08a',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <Sparkles size={10} /> MD NOTE
                      </span>
                    )}
                    {(t.comments?.length || 0) > 0 && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          background: '#f0f9ff',
                          color: '#0369a1',
                          border: '1px solid #bae6fd',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <MessageSquare size={10} /> {t.comments.length}
                      </span>
                    )}
                    {(t.uploads?.length || 0) > 0 && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          background: '#f5f3ff',
                          color: '#7c3aed',
                          border: '1px solid #ddd6fe',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <Camera size={10} /> {t.uploads.length} proofs
                      </span>
                    )}
                  </div>

                  {/* Apartment / Property Context */}
                  {t.apartmentDetails?.flatNumber && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#475569' }}>
                      <Building2 size={13} color="#64748b" />
                      <span>
                        Flat {t.apartmentDetails.flatNumber} • {t.apartmentDetails.projectName || 'Krishna Valley'}
                      </span>
                    </div>
                  )}

                  {/* Progress Bar & Slider Trigger */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: '700', marginBottom: '4px' }}>
                      <span style={{ color: '#64748b' }}>Completion Progress</span>
                      <span style={{ color: '#0f172a' }}>{t.progress || 0}%</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${t.progress || 0}%`,
                          background:
                            t.progress === 100
                              ? '#16a34a'
                              : t.progress > 50
                              ? '#2563eb'
                              : '#f59e0b',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>

                  {/* Uploads Count & Quick Actions */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTop: '1px solid #f1f5f9',
                      paddingTop: '10px',
                      marginTop: 'auto',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#64748b' }}>
                      <Upload size={13} color="#7c3aed" />
                      <span>{(t.uploads || []).length} proof file{(t.uploads || []).length !== 1 ? 's' : ''}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setProgressTaskId(t._id);
                          setProgressVal(t.progress || 0);
                          setProgressStatus(t.status || 'in_progress');
                          setIsProgressModalOpen(true);
                        }}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          background: '#f1f5f9',
                          border: 'none',
                          fontSize: '0.72rem',
                          fontWeight: '700',
                          color: '#334155',
                          cursor: 'pointer',
                        }}
                      >
                        Update %
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setUploadTaskId(t._id);
                          setIsUploadModalOpen(true);
                        }}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          fontSize: '0.72rem',
                          fontWeight: '700',
                          color: '#1d4ed8',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Camera size={12} /> Proof
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenTaskDetail && onOpenTaskDetail(t._id)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          background: '#2563eb',
                          border: 'none',
                          fontSize: '0.72rem',
                          fontWeight: '700',
                          color: '#ffffff',
                          cursor: 'pointer',
                        }}
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. TAB CONTENT: WORK PROOF & UPLOADS VAULT */}
      {/* ========================================================================= */}
      {activeTab === 'uploads' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Showing verified photographic and document evidence scoped to your hierarchy level:
            </span>
            <button
              onClick={() => {
                if (tasks.length > 0) setUploadTaskId(tasks[0]._id);
                setIsUploadModalOpen(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '7px',
                background: '#7c3aed',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.76rem',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              <Upload size={13} /> Upload New Proof
            </button>
          </div>

          {uploads.length === 0 ? (
            <div
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                padding: '40px 20px',
                textAlign: 'center',
                border: '1px dashed #cbd5e1',
                color: '#64748b',
              }}
            >
              <Upload size={36} color="#94a3b8" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#1e293b' }}>
                No work proof uploads yet
              </div>
              <div style={{ fontSize: '0.76rem', marginTop: '4px' }}>
                Upload photos, site inspection receipts or inspection reports to record task verification.
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
              {uploads.map((up, i) => (
                <div
                  key={i}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span
                      style={{
                        padding: '2px 7px',
                        borderRadius: '5px',
                        fontSize: '0.65rem',
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        background: '#f1f5f9',
                        color: '#475569',
                      }}
                    >
                      {up.stage || 'PROOF'}
                    </span>
                    <span
                      style={{
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontSize: '0.65rem',
                        fontWeight: '800',
                        background:
                          up.uploaderRole === 'head'
                            ? '#ecfeff'
                            : up.uploaderRole === 'supervisor'
                            ? '#eef2ff'
                            : '#eff6ff',
                        color:
                          up.uploaderRole === 'head'
                            ? '#0e7490'
                            : up.uploaderRole === 'supervisor'
                            ? '#4338ca'
                            : '#1d4ed8',
                      }}
                    >
                      {up.uploaderRole?.toUpperCase() || 'MEMBER'}
                    </span>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: '800' }}>
                      {up.taskCode}
                    </div>
                    <div
                      style={{
                        fontWeight: '700',
                        fontSize: '0.82rem',
                        color: '#1e293b',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={up.fileName}
                    >
                      {up.fileName}
                    </div>
                    {up.remarks && (
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic', marginTop: '2px' }}>
                        "{up.remarks}"
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>By: {up.uploaderName || 'Staff'}</span>
                    <a
                      href={getFileUrl(up.fileUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        color: '#2563eb',
                        fontWeight: '700',
                        textDecoration: 'none',
                        background: '#eff6ff',
                        padding: '3px 8px',
                        borderRadius: '5px',
                      }}
                    >
                      <Eye size={12} /> View
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL: UPLOAD WORK PROOF */}
      {/* ========================================================================= */}
      {isUploadModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              maxWidth: '520px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                background: '#1e3a8a',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Camera size={18} />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800' }}>Submit Work Evidence / Proof</h3>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleProofSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Target Directive / Task *
                </label>
                <select
                  value={uploadTaskId}
                  onChange={(e) => setUploadTaskId(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '0.78rem' }}
                >
                  {tasks.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.taskCode} — {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Work Stage
                </label>
                <select
                  value={uploadStage}
                  onChange={(e) => setUploadStage(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '0.78rem' }}
                >
                  <option value="proof">Proof of Completion</option>
                  <option value="in_progress">Work In Progress Inspection</option>
                  <option value="before">Before Work Condition</option>
                  <option value="inspection">Supervisor / Quality Check</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Remarks / Observations
                </label>
                <input
                  type="text"
                  placeholder="e.g. Balcony tile grouting completed, no leaks detected..."
                  value={uploadRemarks}
                  onChange={(e) => setUploadRemarks(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '0.78rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Select File (Any Photo, Video, Audio, Document, or File) *
                </label>
                <input
                  type="file"
                  accept="*/*"
                  required
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  style={{ width: '100%', padding: '8px', borderRadius: '7px', border: '1px dashed #94a3b8', fontSize: '0.78rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  style={{ padding: '7px 14px', borderRadius: '7px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '0.78rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingProof}
                  style={{
                    padding: '7px 16px',
                    borderRadius: '7px',
                    border: 'none',
                    background: '#2563eb',
                    color: '#ffffff',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    cursor: submittingProof ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submittingProof ? 'Uploading...' : 'Submit Evidence'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL: UPDATE PROGRESS */}
      {/* ========================================================================= */}
      {isProgressModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              maxWidth: '440px',
              width: '100%',
              padding: '20px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>
              Update Task Progress
            </h3>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', fontWeight: '700', marginBottom: '6px' }}>
                <span>Progress Percentage:</span>
                <span style={{ color: '#2563eb' }}>{progressVal}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={progressVal}
                onChange={(e) => setProgressVal(e.target.value)}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Status
              </label>
              <select
                value={progressStatus}
                onChange={(e) => setProgressStatus(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '0.78rem' }}
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed (100%)</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setIsProgressModalOpen(false)}
                style={{ padding: '7px 14px', borderRadius: '7px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '0.78rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingProgress}
                onClick={handleSaveProgress}
                style={{
                  padding: '7px 16px',
                  borderRadius: '7px',
                  border: 'none',
                  background: '#2563eb',
                  color: '#ffffff',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: savingProgress ? 'not-allowed' : 'pointer',
                }}
              >
                {savingProgress ? 'Saving...' : 'Save Progress'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskforceMemberDashboard;
