import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { taskService } from '../../services/taskService.js';
import { taskforceManagerService } from '../../services/taskforceManagerService.js';
import { getFileUrl } from '../../services/api.js';
import { NewTaskModal } from '../../components/taskforce/NewTaskModal.jsx';
import { TaskDetailModal } from '../../components/taskforce/TaskDetailModal.jsx';
import { TaskforceMemberDrawer } from '../../components/taskforce/TaskforceMemberDrawer.jsx';
import {
  getDepartmentTheme,
  getDepartmentIcon,
  getHierarchyTheme,
} from '../../utils/departmentIcons.js';
import {
  isTaskforceTeamMember,
  canUserAssignTasks,
  extractRoleCode,
} from '../../utils/taskPermissions.js';
const getFileTypeMeta = (url = '', fileName = '') => {
  const target = (fileName || url || '').split('?')[0].toLowerCase();
  if (target.endsWith('.pdf')) {
    return { type: 'pdf', isImage: false, icon: 'fa-solid fa-file-pdf', color: '#ef4444', label: 'PDF Document' };
  }
  if (target.match(/\.(mp4|webm|mov|mkv|avi)$/)) {
    return { type: 'video', isImage: false, icon: 'fa-solid fa-file-video', color: '#8b5cf6', label: 'Video File' };
  }
  if (target.match(/\.(mp3|wav|ogg|m4a)$/)) {
    return { type: 'audio', isImage: false, icon: 'fa-solid fa-file-audio', color: '#06b6d4', label: 'Audio Clip' };
  }
  if (target.match(/\.(doc|docx|xls|xlsx|csv|ppt|pptx|txt)$/)) {
    return { type: 'doc', isImage: false, icon: 'fa-solid fa-file-lines', color: '#3b82f6', label: 'Document' };
  }
  if (target.match(/\.(zip|rar|7z)$/)) {
    return { type: 'archive', isImage: false, icon: 'fa-solid fa-file-zipper', color: '#f59e0b', label: 'Archive' };
  }
  return { type: 'image', isImage: true, icon: 'fa-solid fa-image', color: '#10b981', label: 'Photo' };
};

export const TaskforceDashboardPage = () => {
  const navigate = useNavigate();
  const { user, userRole: authRole } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const userRole = extractRoleCode(user, authRole);

  const isTaskforceUser = isTaskforceTeamMember(user, userRole);
  const canAssign = canUserAssignTasks(user, userRole);

  useEffect(() => {
    if (!isTaskforceUser) {
      showToast('Access restricted: Taskforce Operations Dashboard is reserved exclusively for Taskforce team members. Super Admin and General Managers use the Executive Dashboard.', 'error');
      navigate('/dashboard', { replace: true });
    }
  }, [isTaskforceUser, navigate]);

  // Active operational view mode:
  // 'command' | 'my_directives' | 'roadblocks' | 'proofs' | 'departments'
  const urlMode = searchParams.get('mode');
  const [activeMode, setActiveMode] = useState(urlMode || 'command');

  // Core Data States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState(new Date());

  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [workforceData, setWorkforceData] = useState(null);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [myDashboardData, setMyDashboardData] = useState(null);

  // Filters
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [filterDueToday, setFilterDueToday] = useState(false);
  const [filterMDOnly, setFilterMDOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [alertFilter, setAlertFilter] = useState('all');
  const [isAlertCenterCollapsed, setIsAlertCenterCollapsed] = useState(false);

  // Modals & Drawers
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [detailModalInitialTab, setDetailModalInitialTab] = useState('overview');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedMemberForDrawer, setSelectedMemberForDrawer] = useState(null);
  const [isMemberDrawerOpen, setIsMemberDrawerOpen] = useState(false);

  // Quick Action Modals State
  const [isQuickProgressOpen, setIsQuickProgressOpen] = useState(false);
  const [quickProgressTask, setQuickProgressTask] = useState(null);
  const [quickProgressVal, setQuickProgressVal] = useState(0);
  const [quickProgressStatus, setQuickProgressStatus] = useState('in_progress');
  const [savingProgress, setSavingProgress] = useState(false);

  // Quick Proof Upload Modal State
  const [isQuickProofOpen, setIsQuickProofOpen] = useState(false);
  const [proofTaskId, setProofTaskId] = useState('');
  const [proofStage, setProofStage] = useState('proof');
  const [proofRemarks, setProofRemarks] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [uploadingProof, setUploadingProof] = useState(false);

  // Quick Roadblock Modal State (Report or Resolve)
  const [roadblockModalMode, setRoadblockModalMode] = useState(null); // 'raise' | 'resolve'
  const [roadblockTask, setRoadblockTask] = useState(null);
  const [roadblockReason, setRoadblockReason] = useState('');
  const [roadblockResolving, setRoadblockResolving] = useState(false);

  // Lightbox Modal for Site Photos
  const [lightboxImage, setLightboxImage] = useState(null);

  // Sync mode changes to URL
  const handleModeChange = (mode) => {
    setActiveMode(mode);
    setSearchParams({ mode });
  };

  // Fetch all operational data
  const fetchDashboardData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const [tasksRes, statsRes, wfRes, deptsRes] = await Promise.all([
        taskService.getTasks({ limit: 100 }),
        taskService.getStats().catch(() => null),
        taskforceManagerService.getWorkforce({ showAll: 'true' }).catch(() => null),
        taskforceManagerService.getDepartments().catch(() => null),
      ]);

      if (tasksRes && tasksRes.success) {
        setTasks(tasksRes.data || []);
      }
      if (statsRes && statsRes.success) {
        setStats(statsRes.stats || statsRes.data || null);
      }
      if (wfRes && wfRes.success) {
        setWorkforceData(wfRes);
      }
      if (deptsRes && deptsRes.success) {
        setDepartmentsList(deptsRes.departments || []);
      }

      // Fetch personal dashboard if applicable
      try {
        const myRes = await taskforceManagerService.getMyDashboard();
        if (myRes && myRes.success) {
          setMyDashboardData(myRes);
        }
      } catch (e) {
        // Fallback silently if personal endpoint is not scoped
      }

      setLastSynced(new Date());
    } catch (err) {
      console.error('Error fetching taskforce dashboard data:', err);
      showToast('Error loading operational dashboard data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const handleTaskUpdated = () => {
      fetchDashboardData(true);
    };
    const handleTeamUpdated = () => {
      fetchDashboardData(true);
    };
    const handleDeptUpdated = () => {
      fetchDashboardData(true);
    };

    window.addEventListener('taskforceTaskUpdated', handleTaskUpdated);
    window.addEventListener('taskforceTeamUpdated', handleTeamUpdated);
    window.addEventListener('departmentsUpdated', handleDeptUpdated);

    return () => {
      window.removeEventListener('taskforceTaskUpdated', handleTaskUpdated);
      window.removeEventListener('taskforceTeamUpdated', handleTeamUpdated);
      window.removeEventListener('departmentsUpdated', handleDeptUpdated);
    };
  }, []);

  // Compute Active KPIs
  const kpis = useMemo(() => {
    const total = tasks.length;
    const activeTasks = tasks.filter((t) =>
      ['pending', 'in_progress', 'under_review'].includes(t.status)
    );
    const completedTasks = tasks.filter((t) => t.status === 'completed');
    const mdDirectives = tasks.filter((t) => t.isMDDirective && t.status !== 'completed');
    const urgentTasks = tasks.filter((t) => t.priority === 'urgent' && t.status !== 'completed');

    const roadblocks = tasks.filter(
      (t) => t.roadblockAlert?.hasRoadblock && !t.roadblockAlert?.isResolved
    );

    const todayStr = new Date().toISOString().split('T')[0];
    const dueToday = tasks.filter(
      (t) =>
        t.status !== 'completed' &&
        t.dueDate &&
        t.dueDate.toString().startsWith(todayStr)
    );

    const now = new Date();
    const overdue = tasks.filter((t) => {
      if (t.status === 'completed' || !t.dueDate) return false;
      return new Date(t.dueDate) < now;
    });

    // Extract all site uploads/proofs across tasks
    const allProofs = [];
    tasks.forEach((t) => {
      (t.uploads || []).forEach((u) => {
        allProofs.push({
          ...u,
          taskId: t._id,
          taskCode: t.taskCode,
          taskTitle: t.title,
          department: t.department,
          flat: t.apartmentDetails?.flatNumber,
        });
      });
    });

    const workforceList = workforceData?.workforce || [];
    const activeWorkers = workforceList.filter((w) => w.activeTasks > 0 || w.status === 'active').length;
    const avgCapacity = workforceList.length > 0
      ? Math.round(workforceList.reduce((acc, w) => acc + (w.capacityScore || 80), 0) / workforceList.length)
      : 85;

    return {
      total,
      activeCount: activeTasks.length,
      completedCount: completedTasks.length,
      mdDirectivesCount: mdDirectives.length,
      urgentCount: urgentTasks.length,
      roadblocksCount: roadblocks.length,
      roadblocksList: roadblocks,
      dueTodayCount: dueToday.length,
      overdueCount: overdue.length,
      totalProofs: allProofs.length,
      allProofs: allProofs.sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0)),
      activeWorkers,
      avgCapacity,
      workforceList,
    };
  }, [tasks, workforceData]);

  // Live Task Notifications & Activity Alerts for Manager & Team
  const managerTaskAlerts = useMemo(() => {
    const list = [];
    tasks.forEach((t) => {
      // 1. Field Roadblock Alerts (Highest Priority)
      if (t.roadblockAlert?.hasRoadblock && !t.roadblockAlert?.isResolved) {
        list.push({
          id: `rb-${t._id}`,
          taskId: t._id,
          taskCode: t.taskCode,
          taskTitle: t.title,
          department: t.department,
          flat: t.apartmentDetails?.flatNumber,
          category: 'roadblock',
          label: 'ROADBLOCK REPORTED',
          message: t.roadblockAlert.reason || 'Field obstacle or roadblock reported on this directive.',
          color: '#dc2626',
          bg: '#fee2e2',
          borderColor: '#fca5a5',
          icon: 'fa-solid fa-triangle-exclamation',
          time: t.roadblockAlert.reportedAt || t.updatedAt,
          author: t.roadblockAlert.reportedBy?.name || t.roadblockAlert.reportedBy?.firstName || 'Field Crew',
        });
      }

      // 2. MD Directives / Management Directives
      const mdNotes = (t.comments || []).filter((c) => c.isMDNote);
      if (t.isMDDirective || mdNotes.length > 0) {
        const latestNote = mdNotes[mdNotes.length - 1];
        list.push({
          id: `md-${t._id}`,
          taskId: t._id,
          taskCode: t.taskCode,
          taskTitle: t.title,
          department: t.department,
          flat: t.apartmentDetails?.flatNumber,
          category: 'md_directive',
          label: 'MD DIRECTIVE NOTE',
          message: latestNote?.message || 'High-priority management directive note posted.',
          color: '#ca8a04',
          bg: '#fefce8',
          borderColor: '#fef08a',
          icon: 'fa-solid fa-crown',
          time: latestNote?.createdAt || t.updatedAt,
          author: latestNote?.sender?.firstName
            ? `${latestNote.sender.firstName} ${latestNote.sender.lastName || ''}`.trim()
            : 'MD Office',
        });
      }

      // 3. Directive updates & transparent communications (chat, queries, guidelines)
      const regularComments = (t.comments || []).filter((c) => !c.isMDNote);
      if (regularComments.length > 0) {
        const latestComment = regularComments[regularComments.length - 1];
        const msgType = latestComment.messageType || 'chat';
        let alertLabel = 'DIRECTIVE UPDATE';
        let alertColor = '#0284c7';
        let alertBg = '#f0f9ff';
        let alertBorderColor = '#bae6fd';
        let alertIcon = 'fa-solid fa-comments';

        if (msgType === 'query') {
          alertLabel = 'TASK QUERY / CLARIFICATION';
          alertColor = '#d97706';
          alertBg = '#fffbeb';
          alertBorderColor = '#fde68a';
          alertIcon = 'fa-solid fa-circle-question';
        } else if (msgType === 'guideline') {
          alertLabel = 'WORK GUIDELINE / SOP';
          alertColor = '#0d9488';
          alertBg = '#f0fdfa';
          alertBorderColor = '#99f6e4';
          alertIcon = 'fa-solid fa-clipboard-list';
        }

        list.push({
          id: `comm-${t._id}-${latestComment._id || regularComments.length}`,
          taskId: t._id,
          taskCode: t.taskCode,
          taskTitle: t.title,
          department: t.department,
          flat: t.apartmentDetails?.flatNumber,
          category: 'comment',
          label: alertLabel,
          message: latestComment.message,
          color: alertColor,
          bg: alertBg,
          borderColor: alertBorderColor,
          icon: alertIcon,
          time: latestComment.createdAt,
          author: latestComment.sender?.firstName
            ? `${latestComment.sender.firstName} ${latestComment.sender.lastName || ''}`.trim()
            : 'Staff Member',
        });
      }

      // 4. Work evidence & field proof uploads
      if ((t.uploads || []).length > 0) {
        const latestUpload = t.uploads[t.uploads.length - 1];
        list.push({
          id: `proof-${t._id}-${latestUpload._id || t.uploads.length}`,
          taskId: t._id,
          taskCode: t.taskCode,
          taskTitle: t.title,
          department: t.department,
          flat: t.apartmentDetails?.flatNumber,
          category: 'proof',
          label: 'WORK PROOF UPLOADED',
          message:
            latestUpload.caption ||
            latestUpload.remarks ||
            `Work proof uploaded (${latestUpload.stage || 'proof'})`,
          color: '#7c3aed',
          bg: '#f5f3ff',
          borderColor: '#ddd6fe',
          icon: 'fa-solid fa-camera',
          time: latestUpload.uploadedAt || latestUpload.createdAt,
          author: latestUpload.uploadedBy?.firstName
            ? `${latestUpload.uploadedBy.firstName} ${latestUpload.uploadedBy.lastName || ''}`.trim()
            : 'Field Personnel',
          fileUrl: latestUpload.fileUrl || latestUpload.path,
        });
      }

      // 5. Follow-up / inspection due alerts
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
            department: t.department,
            flat: t.apartmentDetails?.flatNumber,
            category: 'followup',
            label: isOverdue ? 'INSPECTION OVERDUE' : 'INSPECTION DUE TODAY',
            message:
              t.followUpSchedule.remarks ||
              `Inspection scheduled ${isToday ? 'today' : 'was due ' + nextD.toLocaleDateString()}`,
            color: isOverdue ? '#e11d48' : '#d97706',
            bg: isOverdue ? '#fff1f2' : '#fffbeb',
            borderColor: isOverdue ? '#fecdd3' : '#fde68a',
            icon: 'fa-solid fa-clock-rotate-left',
            time: nextD,
            author: 'Inspection Schedule',
          });
        }
      }
    });

    return list.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
  }, [tasks]);

  const filteredAlerts = useMemo(() => {
    if (alertFilter === 'all') return managerTaskAlerts;
    return managerTaskAlerts.filter((a) => a.category === alertFilter);
  }, [managerTaskAlerts, alertFilter]);

  const formatTimeAgo = (date) => {
    if (!date) return '';
    const now = new Date();
    const d = new Date(date);
    const diffMs = now - d;
    if (diffMs < 0) {
      const days = Math.ceil(Math.abs(diffMs) / (1000 * 60 * 60 * 24));
      return days === 0 ? 'Due today' : `Due in ${days}d`;
    }
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  // Filtered Tasks for Operational Queue
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Mode-specific scoping
      if (activeMode === 'my_directives') {
        const myUserId = user?._id || user?.id;
        const assignedToMe = (t.assignedTo || []).some(
          (a) => (a._id || a).toString() === myUserId?.toString()
        );
        const assignedMemberMe = (t.assignedMembers || []).some(
          (m) => (m._id || m).toString() === myUserId?.toString()
        );
        if (!assignedToMe && !assignedMemberMe) return false;
      }

      if (activeMode === 'roadblocks') {
        if (!t.roadblockAlert?.hasRoadblock || t.roadblockAlert?.isResolved) return false;
      }

      // Department filter
      if (selectedDept !== 'all' && (t.department || '').toLowerCase() !== (selectedDept || '').toLowerCase()) {
        return false;
      }

      // Priority filter
      if (selectedPriority !== 'all' && t.priority !== selectedPriority) {
        return false;
      }

      // MD Directive filter
      if (filterMDOnly && !t.isMDDirective) {
        return false;
      }

      // Due Today filter
      if (filterDueToday) {
        const todayStr = new Date().toISOString().split('T')[0];
        if (!t.dueDate || !t.dueDate.toString().startsWith(todayStr)) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCode = t.taskCode?.toLowerCase().includes(q);
        const matchesTitle = t.title?.toLowerCase().includes(q);
        const matchesDept = t.department?.toLowerCase().includes(q);
        const matchesFlat = t.apartmentDetails?.flatNumber?.toLowerCase().includes(q);
        const matchesAssignee = (t.assignedTo || []).some((a) =>
          `${a.firstName || ''} ${a.lastName || ''} ${a.username || ''}`.toLowerCase().includes(q)
        );
        if (!matchesCode && !matchesTitle && !matchesDept && !matchesFlat && !matchesAssignee) {
          return false;
        }
      }

      return true;
    });
  }, [
    tasks,
    activeMode,
    selectedDept,
    selectedPriority,
    filterMDOnly,
    filterDueToday,
    searchQuery,
    user,
  ]);

  // Department Aggregates
  const departmentAggregates = useMemo(() => {
    const map = {};
    // Seed with departments from backend
    (departmentsList || []).forEach((d) => {
      const name = d.name || d.department;
      if (name) {
        map[name] = { name, total: 0, active: 0, completed: 0, roadblocks: 0, progressSum: 0 };
      }
    });

    tasks.forEach((t) => {
      const dept = t.department || 'General Operations';
      if (!map[dept]) {
        map[dept] = { name: dept, total: 0, active: 0, completed: 0, roadblocks: 0, progressSum: 0 };
      }
      map[dept].total += 1;
      if (['in_progress', 'pending', 'under_review'].includes(t.status)) {
        map[dept].active += 1;
      }
      if (t.status === 'completed') {
        map[dept].completed += 1;
      }
      if (t.roadblockAlert?.hasRoadblock && !t.roadblockAlert?.isResolved) {
        map[dept].roadblocks += 1;
      }
      map[dept].progressSum += t.progress || 0;
    });

    return Object.values(map).map((d) => ({
      ...d,
      avgProgress: d.total > 0 ? Math.round(d.progressSum / d.total) : 0,
      completionRate: d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0,
      theme: getDepartmentTheme(d.name),
    }));
  }, [tasks, departmentsList]);

  // Handle Quick Progress Save
  const handleSaveProgress = async () => {
    if (!quickProgressTask) return;
    try {
      setSavingProgress(true);
      const res = await taskService.updateProgress(quickProgressTask._id, {
        progress: Number(quickProgressVal),
        status: quickProgressStatus,
      });

      if (res && res.success) {
        showToast('Operation progress updated successfully', 'success');
        setIsQuickProgressOpen(false);
        const updatedId = quickProgressTask._id;
        setQuickProgressTask(null);
        window.dispatchEvent(new CustomEvent('taskforceTaskUpdated', { detail: { taskId: updatedId } }));
        fetchDashboardData(true);
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

  // Handle Quick Proof Upload
  const handleProofUpload = async (e) => {
    e.preventDefault();
    if (!proofTaskId) {
      showToast('Please select a task for this proof upload', 'error');
      return;
    }
    if (!proofFile) {
      showToast('Please attach a photo or document file', 'error');
      return;
    }

    try {
      setUploadingProof(true);
      const formData = new FormData();
      formData.append('file', proofFile);
      formData.append('proof', proofFile);
      formData.append('stage', proofStage);
      formData.append('remarks', proofRemarks);
      formData.append('caption', proofRemarks);

      const res = await taskService.uploadProof(proofTaskId, formData);
      if (res && res.success) {
        showToast('Work evidence uploaded successfully', 'success');
        setIsQuickProofOpen(false);
        setProofFile(null);
        setProofRemarks('');
        const updatedId = proofTaskId;
        setProofTaskId('');
        window.dispatchEvent(new CustomEvent('taskforceTaskUpdated', { detail: { taskId: updatedId } }));
        fetchDashboardData(true);
      } else {
        showToast(res?.message || 'Failed to upload proof', 'error');
      }
    } catch (err) {
      console.error('Error uploading proof:', err);
      showToast(err.message || 'Failed to upload proof', 'error');
    } finally {
      setUploadingProof(false);
    }
  };

  // Handle Roadblock Actions (Raise or Resolve)
  const handleRoadblockSubmit = async () => {
    if (!roadblockTask) return;
    try {
      setRoadblockResolving(true);
      if (roadblockModalMode === 'raise') {
        if (!roadblockReason.trim()) {
          showToast('Please describe the roadblock reason', 'error');
          return;
        }
        const res = await taskService.updateProgress(roadblockTask._id, {
          roadblock: { action: 'raise', reason: roadblockReason.trim() },
        });
        if (res && res.success) {
          showToast('Roadblock reported and team alerted', 'warning');
          const updatedId = roadblockTask._id;
          setRoadblockModalMode(null);
          setRoadblockTask(null);
          setRoadblockReason('');
          window.dispatchEvent(new CustomEvent('taskforceTaskUpdated', { detail: { taskId: updatedId } }));
          fetchDashboardData(true);
        }
      } else if (roadblockModalMode === 'resolve') {
        const res = await taskService.updateProgress(roadblockTask._id, {
          roadblock: { action: 'resolve' },
        });
        if (res && res.success) {
          showToast('Roadblock marked resolved! Task back in progress.', 'success');
          const updatedId = roadblockTask._id;
          setRoadblockModalMode(null);
          setRoadblockTask(null);
          window.dispatchEvent(new CustomEvent('taskforceTaskUpdated', { detail: { taskId: updatedId } }));
          fetchDashboardData(true);
        }
      }
    } catch (err) {
      console.error('Error processing roadblock action:', err);
      showToast(err.message || 'Action failed', 'error');
    } finally {
      setRoadblockResolving(false);
    }
  };

  // Open Quick Progress Modal
  const openProgressModal = (task) => {
    setQuickProgressTask(task);
    setQuickProgressVal(task.progress || 0);
    setQuickProgressStatus(task.status || 'in_progress');
    setIsQuickProgressOpen(true);
  };

  return (
    <div className="taskforce-dashboard-root" style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh' }}>
      {/* ======================================================== */}
      {/* 1. TOP OPERATIONAL HERO & COMMAND BAR                     */}
      {/* ======================================================== */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f766e 100%)',
          borderRadius: '16px',
          padding: '24px 28px',
          color: '#ffffff',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
          marginBottom: '24px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span
                style={{
                  background: 'rgba(20, 184, 166, 0.2)',
                  border: '1px solid rgba(45, 212, 191, 0.4)',
                  color: '#2dd4bf',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <i className="fa-solid fa-satellite-dish" style={{ color: '#2dd4bf' }}></i>
                TASKFORCE OPERATIONS HUB
              </span>

              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#e2e8f0',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: '20px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <i className="fa-solid fa-shield-halved" style={{ color: '#38bdf8' }}></i>
                {userRole === 'taskforce_manager' ? 'Command Center' : 'Field Operations'}
              </span>
            </div>

            <h1 style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.02em', color: '#ffffff' }}>
              Taskforce Operations Dashboard
            </h1>
            <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', maxWidth: '650px', lineHeight: 1.5 }}>
              Dedicated operational workspace for active field directives, site evidence verification, roadblock resolution, and real-time team dispatch.
            </p>
          </div>

          {/* Quick Command Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
            {canAssign && (
              <button
                onClick={() => setIsNewTaskModalOpen(true)}
                style={{
                  background: '#0d9488',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(13, 148, 136, 0.35)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#0f766e')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#0d9488')}
              >
                <i className="fa-solid fa-plus"></i>
                New Directive / Task
              </button>
            )}

            <button
              onClick={() => {
                setProofTaskId('');
                setProofFile(null);
                setProofRemarks('');
                setIsQuickProofOpen(true);
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                padding: '10px 16px',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backdropFilter: 'blur(8px)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)')}
            >
              <i className="fa-solid fa-camera"></i>
              Upload Proof
            </button>

            <button
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#cbd5e1',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                padding: '10px 14px',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
              }}
              title="Refresh Live Data"
            >
              <i className={`fa-solid fa-arrows-rotate ${refreshing ? 'fa-spin' : ''}`}></i>
              <span style={{ fontSize: '12px' }}>
                {refreshing ? 'Syncing...' : 'Sync'}
              </span>
            </button>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div
          style={{
            position: 'absolute',
            right: '-40px',
            bottom: '-40px',
            width: '260px',
            height: '260px',
            background: 'radial-gradient(circle, rgba(20, 184, 166, 0.18) 0%, rgba(15, 23, 42, 0) 70%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* ======================================================== */}
      {/* 2. OPERATIONAL KPI METRICS CARDS                         */}
      {/* ======================================================== */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* KPI 1: Active Operations */}
        <div
          onClick={() => { setSelectedPriority('all'); handleModeChange('command'); }}
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#38bdf8'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Active Directives
            </span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa-solid fa-list-check" style={{ fontSize: '15px' }}></i>
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
            {kpis.activeCount}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
            <span style={{ color: '#059669', fontWeight: 600 }}>{kpis.completedCount}</span> completed
          </div>
        </div>

        {/* KPI 2: MD Directives & Urgent */}
        <div
          onClick={() => { setFilterMDOnly(true); handleModeChange('command'); }}
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '18px 20px',
            border: kpis.mdDirectivesCount > 0 ? '1px solid #fed7aa' : '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              MD Directives
            </span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#fff7ed', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa-solid fa-fire-flame-curved" style={{ fontSize: '15px' }}></i>
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#c2410c', lineHeight: 1.1 }}>
            {kpis.mdDirectivesCount}
          </div>
          <div style={{ fontSize: '12px', color: '#9a3412', marginTop: '6px' }}>
            {kpis.urgentCount} marked urgent
          </div>
        </div>

        {/* KPI 3: Roadblocks (Obstacles) */}
        <div
          onClick={() => handleModeChange('roadblocks')}
          style={{
            background: kpis.roadblocksCount > 0 ? '#fef2f2' : '#ffffff',
            borderRadius: '12px',
            padding: '18px 20px',
            border: kpis.roadblocksCount > 0 ? '1px solid #fecaca' : '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: kpis.roadblocksCount > 0 ? '#b91c1c' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Roadblocks
            </span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa-solid fa-road-barrier" style={{ fontSize: '15px' }}></i>
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: kpis.roadblocksCount > 0 ? '#dc2626' : '#0f172a', lineHeight: 1.1 }}>
            {kpis.roadblocksCount}
          </div>
          <div style={{ fontSize: '12px', color: kpis.roadblocksCount > 0 ? '#b91c1c' : '#10b981', marginTop: '6px', fontWeight: 600 }}>
            {kpis.roadblocksCount > 0 ? 'Attention required' : 'No field blockers'}
          </div>
        </div>

        {/* KPI 4: Due Today & Overdue */}
        <div
          onClick={() => { setFilterDueToday(!filterDueToday); handleModeChange('command'); }}
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Due Today
            </span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa-solid fa-clock" style={{ fontSize: '15px' }}></i>
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
            {kpis.dueTodayCount}
          </div>
          <div style={{ fontSize: '12px', color: kpis.overdueCount > 0 ? '#dc2626' : '#64748b', marginTop: '6px' }}>
            {kpis.overdueCount > 0 ? `${kpis.overdueCount} overdue` : 'On schedule'}
          </div>
        </div>

        {/* KPI 5: Field Proofs / Photos */}
        <div
          onClick={() => handleModeChange('proofs')}
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Site Evidence
            </span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa-solid fa-camera-retro" style={{ fontSize: '15px' }}></i>
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
            {kpis.totalProofs}
          </div>
          <div style={{ fontSize: '12px', color: '#059669', marginTop: '6px' }}>
            Verified site uploads
          </div>
        </div>

        {/* KPI 6: Active Workforce */}
        <div
          onClick={() => handleModeChange('departments')}
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Team Capacity
            </span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa-solid fa-users-gear" style={{ fontSize: '15px' }}></i>
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
            {kpis.avgCapacity}%
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
            {kpis.activeWorkers} active personnel
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. LIVE TASK NOTIFICATIONS & DIRECTIVES ALERT CENTER      */}
      {/* ======================================================== */}
      {managerTaskAlerts.length > 0 && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '16px 20px',
            marginBottom: '24px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Header Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: managerTaskAlerts.some((a) => a.category === 'roadblock') ? '#fee2e2' : '#eff6ff',
                  color: managerTaskAlerts.some((a) => a.category === 'roadblock') ? '#dc2626' : '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 0 4px rgba(37, 99, 235, 0.08)',
                }}
              >
                <i className="fa-solid fa-bell" style={{ fontSize: '15px' }}></i>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                    Task Notifications &amp; Directives Alert Center
                  </span>
                  <span
                    style={{
                      background: managerTaskAlerts.some((a) => a.category === 'roadblock') ? '#fee2e2' : '#e0f2fe',
                      color: managerTaskAlerts.some((a) => a.category === 'roadblock') ? '#dc2626' : '#0369a1',
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '12px',
                    }}
                  >
                    {managerTaskAlerts.length} Active Notice{managerTaskAlerts.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  Live task-level roadblocks, directives, communication updates &amp; site evidence. Click any card to open task.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {kpis.roadblocksCount > 0 && activeMode !== 'roadblocks' && (
                <button
                  onClick={() => handleModeChange('roadblocks')}
                  style={{
                    background: '#fff1f2',
                    border: '1px solid #fecdd3',
                    color: '#e11d48',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  {kpis.roadblocksCount} Roadblock{kpis.roadblocksCount > 1 ? 's' : ''}
                </button>
              )}
              <button
                onClick={() => setIsAlertCenterCollapsed(!isAlertCenterCollapsed)}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#475569',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <i className={`fa-solid ${isAlertCenterCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'}`}></i>
                {isAlertCenterCollapsed ? 'Expand' : 'Collapse'}
              </button>
            </div>
          </div>

          {!isAlertCenterCollapsed && (
            <>
              {/* Category Filter Pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  { id: 'all', label: `All (${managerTaskAlerts.length})`, icon: 'fa-solid fa-layer-group' },
                  { id: 'roadblock', label: `Roadblocks (${managerTaskAlerts.filter((a) => a.category === 'roadblock').length})`, icon: 'fa-solid fa-triangle-exclamation', color: '#dc2626' },
                  { id: 'md_directive', label: `MD Notes (${managerTaskAlerts.filter((a) => a.category === 'md_directive').length})`, icon: 'fa-solid fa-crown', color: '#ca8a04' },
                  { id: 'comment', label: `Updates (${managerTaskAlerts.filter((a) => a.category === 'comment').length})`, icon: 'fa-solid fa-comments', color: '#0284c7' },
                  { id: 'proof', label: `Site Evidence (${managerTaskAlerts.filter((a) => a.category === 'proof').length})`, icon: 'fa-solid fa-camera', color: '#7c3aed' },
                  { id: 'followup', label: `Follow-ups (${managerTaskAlerts.filter((a) => a.category === 'followup').length})`, icon: 'fa-solid fa-clock-rotate-left', color: '#d97706' },
                ].map((pill) => {
                  const count =
                    pill.id === 'all'
                      ? managerTaskAlerts.length
                      : managerTaskAlerts.filter((a) => a.category === pill.id).length;
                  if (count === 0 && pill.id !== 'all') return null;

                  const isSelected = alertFilter === pill.id;
                  return (
                    <button
                      key={pill.id}
                      onClick={() => setAlertFilter(pill.id)}
                      style={{
                        background: isSelected ? '#0f172a' : '#f8fafc',
                        color: isSelected ? '#ffffff' : pill.color || '#475569',
                        border: isSelected ? '1px solid #0f172a' : '1px solid #e2e8f0',
                        padding: '5px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: isSelected ? 700 : 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <i className={pill.icon}></i>
                      {pill.label}
                    </button>
                  );
                })}
              </div>

              {/* Alert Cards Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                  gap: '12px',
                }}
              >
                {filteredAlerts.slice(0, 9).map((alert) => (
                  <div
                    key={alert.id}
                    onClick={() => {
                      setSelectedTaskId(alert.taskId);
                      setDetailModalInitialTab(
                        alert.category === 'comment' || alert.category === 'md_directive'
                          ? 'chat'
                          : alert.category === 'proof'
                          ? 'evidence'
                          : 'overview'
                      );
                      setIsDetailModalOpen(true);
                    }}
                    style={{
                      background: alert.bg,
                      border: `1px solid ${alert.borderColor}`,
                      borderRadius: '12px',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
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
                    {/* Alert Top Strip */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          color: alert.color,
                          letterSpacing: '0.04em',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <i className={alert.icon}></i>
                        {alert.label}
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        {formatTimeAgo(alert.time)}
                      </span>
                    </div>

                    {/* Task Title & Code */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#334155', fontFamily: 'monospace' }}>
                        {alert.taskCode}
                      </span>
                      {alert.department && (
                        <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.7)', color: '#475569', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                          {alert.department}
                        </span>
                      )}
                      {alert.flat && (
                        <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.7)', color: '#475569', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                          Flat {alert.flat}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
                      {alert.taskTitle}
                    </div>

                    {/* Alert Content / Message */}
                    <p
                      style={{
                        margin: 0,
                        fontSize: '12px',
                        color: '#334155',
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {alert.message}
                    </p>

                    {/* Bottom Metadata & CTA */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '4px',
                        paddingTop: '6px',
                        borderTop: '1px dashed rgba(0,0,0,0.08)',
                      }}
                    >
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        By: <strong style={{ color: '#1e293b' }}>{alert.author}</strong>
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: alert.color,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        Open Task <i className="fa-solid fa-arrow-right"></i>
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {filteredAlerts.length > 9 && (
                <div style={{ textAlign: 'center', marginTop: '6px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Showing top 9 of {filteredAlerts.length} notices. Click any directive card below to see full history.
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. OPERATIONAL VIEW TABS & FILTERS BAR                   */}
      {/* ======================================================== */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        {/* View Mode Tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {[
            { id: 'command', label: 'Operational Command', icon: 'fa-solid fa-table-columns' },
            { id: 'my_directives', label: 'My Directives', icon: 'fa-solid fa-user-check' },
            { id: 'roadblocks', label: `Roadblocks (${kpis.roadblocksCount})`, icon: 'fa-solid fa-road-barrier', alert: kpis.roadblocksCount > 0 },
            { id: 'proofs', label: `Site Evidence (${kpis.totalProofs})`, icon: 'fa-solid fa-camera' },
            { id: 'departments', label: 'Department Health', icon: 'fa-solid fa-sitemap' },
          ].map((tab) => {
            const isActive = activeMode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleModeChange(tab.id)}
                style={{
                  background: isActive ? '#0f172a' : '#f8fafc',
                  color: isActive ? '#ffffff' : tab.alert ? '#dc2626' : '#475569',
                  border: isActive ? '1px solid #0f172a' : '1px solid #e2e8f0',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                }}
              >
                <i className={tab.icon}></i>
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search & Quick Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
          {/* Search Bar */}
          <div style={{ position: 'relative', width: '220px' }}>
            <i
              className="fa-solid fa-magnifying-glass"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '13px' }}
            ></i>
            <input
              type="text"
              placeholder="Search tasks, flat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 34px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              background: '#ffffff',
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Departments</option>
            {departmentAggregates.map((d) => (
              <option key={d.name} value={d.name}>
                {d.name} ({d.total})
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              background: '#ffffff',
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Quick Clear Filter if active */}
          {(selectedDept !== 'all' || selectedPriority !== 'all' || searchQuery || filterMDOnly || filterDueToday) && (
            <button
              onClick={() => {
                setSelectedDept('all');
                setSelectedPriority('all');
                setSearchQuery('');
                setFilterMDOnly(false);
                setFilterDueToday(false);
              }}
              style={{
                background: '#f1f5f9',
                border: 'none',
                color: '#64748b',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              <i className="fa-solid fa-xmark" style={{ marginRight: '4px' }}></i>
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5. MAIN CONTENT PANELS (BASED ON ACTIVE MODE)            */}
      {/* ======================================================== */}

      {/* MODE 1: OPERATIONAL COMMAND (DUAL PANEL) */}
      {activeMode === 'command' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(320px, 1fr)', gap: '20px' }}>
          {/* Left Column: Priority Directives Queue */}
          <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
                  Operational Directives Queue
                </h2>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Showing {filteredTasks.length} directive{filteredTasks.length === 1 ? '' : 's'} sorted by priority & update time
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => navigate('/taskforce?view=kanban')}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    color: '#334155',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <i className="fa-solid fa-columns"></i>
                  Kanban Board
                </button>
              </div>
            </div>

            {/* Directives List */}
            {filteredTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8' }}>
                <i className="fa-solid fa-clipboard-check" style={{ fontSize: '36px', marginBottom: '12px', color: '#cbd5e1' }}></i>
                <div style={{ fontWeight: 600, color: '#475569' }}>No directives match current filters</div>
                <div style={{ fontSize: '13px', marginTop: '4px' }}>Try clearing your filters or create a new task.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredTasks.slice(0, 15).map((task) => {
                  const deptTheme = getDepartmentTheme(task.department);
                  const isBlocked = task.roadblockAlert?.hasRoadblock && !task.roadblockAlert?.isResolved;

                  return (
                    <div
                      key={task._id}
                      style={{
                        background: isBlocked ? '#fff1f2' : '#ffffff',
                        border: isBlocked ? '1px solid #fecdd3' : '1px solid #f1f5f9',
                        borderRadius: '12px',
                        padding: '16px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {/* Top Header of Card */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', fontFamily: 'monospace' }}>
                            {task.taskCode || '#TSK'}
                          </span>

                          {/* Department Chip */}
                          <span
                            style={{
                              background: deptTheme.bg,
                              color: deptTheme.color,
                              border: `1px solid ${deptTheme.border}`,
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                          >
                            <i className={deptTheme.icon}></i>
                            {task.department || 'General'}
                          </span>

                          {/* Priority Chip */}
                          {task.isMDDirective && (
                            <span style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px' }}>
                              <i className="fa-solid fa-fire" style={{ marginRight: '4px' }}></i> MD Directive
                            </span>
                          )}

                          {task.priority === 'urgent' && (
                            <span style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px' }}>
                              Urgent
                            </span>
                          )}

                          {/* Roadblock Badge */}
                          {isBlocked && (
                            <span style={{ background: '#dc2626', color: '#ffffff', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px' }}>
                              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '4px' }}></i> ROADBLOCK
                            </span>
                          )}
                        </div>

                        {/* Status Chip */}
                        <span
                          style={{
                            background: task.status === 'completed' ? '#ecfdf5' : task.status === 'in_progress' ? '#eff6ff' : '#f8fafc',
                            color: task.status === 'completed' ? '#059669' : task.status === 'in_progress' ? '#2563eb' : '#64748b',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 9px',
                            borderRadius: '12px',
                            textTransform: 'uppercase',
                          }}
                        >
                          {task.status?.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Title & Location */}
                      <h3
                        onClick={() => { setSelectedTaskId(task._id); setIsDetailModalOpen(true); }}
                        style={{
                          fontSize: '14px',
                          fontWeight: 700,
                          color: '#0f172a',
                          margin: '0 0 6px 0',
                          cursor: 'pointer',
                        }}
                      >
                        {task.title}
                      </h3>

                      {task.apartmentDetails?.flatNumber && (
                        <div style={{ fontSize: '12px', color: '#475569', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <i className="fa-solid fa-building" style={{ color: '#94a3b8' }}></i>
                          <span>{task.apartmentDetails.flatNumber} • {task.apartmentDetails?.tower || 'Site Area'}</span>
                        </div>
                      )}

                      {/* Live Task Notification Badges Bar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        {(task.comments?.length || 0) > 0 && (
                          <span
                            onClick={(e) => { e.stopPropagation(); setSelectedTaskId(task._id); setDetailModalInitialTab('chat'); setIsDetailModalOpen(true); }}
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              background: '#f0f9ff',
                              color: '#0369a1',
                              border: '1px solid #bae6fd',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                            }}
                            title="Click to view directive updates & comments"
                          >
                            <i className="fa-solid fa-comments"></i> {task.comments.length} update{task.comments.length > 1 ? 's' : ''}
                          </span>
                        )}

                        {(task.isMDDirective || (task.comments || []).some((c) => c.isMDNote)) && (
                          <span
                            onClick={(e) => { e.stopPropagation(); setSelectedTaskId(task._id); setDetailModalInitialTab('chat'); setIsDetailModalOpen(true); }}
                            style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              background: '#fefce8',
                              color: '#a16207',
                              border: '1px solid #fef08a',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                            }}
                            title="Click to view management directive instructions"
                          >
                            <i className="fa-solid fa-crown"></i> MD Note
                          </span>
                        )}

                        {(task.uploads?.length || 0) > 0 && (
                          <span
                            onClick={(e) => { e.stopPropagation(); setSelectedTaskId(task._id); setDetailModalInitialTab('evidence'); setIsDetailModalOpen(true); }}
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              background: '#f5f3ff',
                              color: '#7c3aed',
                              border: '1px solid #ddd6fe',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                            }}
                            title="Click to view uploaded work evidence"
                          >
                            <i className="fa-solid fa-camera"></i> {task.uploads.length} proof{task.uploads.length > 1 ? 's' : ''}
                          </span>
                        )}

                        {task.followUpSchedule?.nextFollowUpDate && (
                          <span
                            onClick={(e) => { e.stopPropagation(); setSelectedTaskId(task._id); setIsDetailModalOpen(true); }}
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              background: '#fffbeb',
                              color: '#d97706',
                              border: '1px solid #fde68a',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                            }}
                            title="Scheduled inspection"
                          >
                            <i className="fa-solid fa-clock-rotate-left"></i> Follow-up
                          </span>
                        )}
                      </div>

                      {/* Roadblock Reason note if blocked */}
                      {isBlocked && (
                        <div style={{ background: '#ffe4e6', borderRadius: '6px', padding: '8px 12px', marginBottom: '10px', fontSize: '12px', color: '#9f1239' }}>
                          <strong>Reason:</strong> {task.roadblockAlert?.reason || 'Site obstacle encountered'}
                        </div>
                      )}

                      {/* Progress Bar & Actions Bar */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                        {/* Progress */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                          <div style={{ width: '120px', height: '6px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${task.progress || 0}%`,
                                height: '100%',
                                background: task.status === 'completed' ? '#10b981' : isBlocked ? '#ef4444' : '#2563eb',
                                borderRadius: '4px',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                            {task.progress || 0}%
                          </span>
                        </div>

                        {/* Interactive Action Buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            onClick={() => openProgressModal(task)}
                            style={{
                              background: '#f1f5f9',
                              border: 'none',
                              color: '#334155',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title="Update Progress"
                          >
                            <i className="fa-solid fa-sliders"></i>
                            Update
                          </button>

                          <button
                            onClick={() => {
                              setProofTaskId(task._id);
                              setIsQuickProofOpen(true);
                            }}
                            style={{
                              background: '#ecfdf5',
                              border: '1px solid #a7f3d0',
                              color: '#059669',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title="Upload Site Evidence"
                          >
                            <i className="fa-solid fa-camera"></i>
                            Proof
                          </button>

                          {isBlocked ? (
                            <button
                              onClick={() => {
                                setRoadblockTask(task);
                                setRoadblockModalMode('resolve');
                              }}
                              style={{
                                background: '#dc2626',
                                color: '#ffffff',
                                border: 'none',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Resolve
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setRoadblockTask(task);
                                setRoadblockReason('');
                                setRoadblockModalMode('raise');
                              }}
                              style={{
                                background: '#fff1f2',
                                border: '1px solid #fecdd3',
                                color: '#e11d48',
                                padding: '6px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                cursor: 'pointer',
                              }}
                              title="Report Roadblock"
                            >
                              <i className="fa-solid fa-triangle-exclamation"></i>
                            </button>
                          )}

                          <button
                            onClick={() => { setSelectedTaskId(task._id); setIsDetailModalOpen(true); }}
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              color: '#475569',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Details
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Department Health & Field Personnel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Department Capacity Breakdown */}
            <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Department Workload
                </h2>
                <button
                  onClick={() => handleModeChange('departments')}
                  style={{ background: 'transparent', border: 'none', color: '#0284c7', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  View All
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {departmentAggregates.slice(0, 6).map((dept) => (
                  <div
                    key={dept.name}
                    onClick={() => { setSelectedDept(dept.name); }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      background: selectedDept === dept.name ? '#f0fdfa' : '#f8fafc',
                      border: selectedDept === dept.name ? '1px solid #5eead4' : '1px solid #f1f5f9',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className={dept.theme.icon} style={{ color: dept.theme.color, fontSize: '14px' }}></i>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{dept.name}</span>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                        {dept.active} active / {dept.total} total
                      </span>
                    </div>

                    <div style={{ width: '100%', height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${dept.completionRate}%`,
                          height: '100%',
                          background: dept.theme.color,
                          borderRadius: '3px',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Field Personnel On-Duty Roster */}
            <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  On-Duty Supervisors & Leads
                </h2>
                <button
                  onClick={() => navigate('/taskforce-manager?tab=team')}
                  style={{ background: 'transparent', border: 'none', color: '#0284c7', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Manage Roster
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(kpis.workforceList || []).slice(0, 5).map((member) => {
                  const hierarchyTheme = getHierarchyTheme(member.hierarchyLevel);

                  return (
                    <div
                      key={member._id}
                      onClick={() => {
                        setSelectedMemberForDrawer(member);
                        setIsMemberDrawerOpen(true);
                      }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#93c5fd')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: hierarchyTheme.bg,
                            color: hierarchyTheme.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '13px',
                          }}
                        >
                          <i className={hierarchyTheme.icon}></i>
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                            {member.name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {member.department || 'Operations'} • {hierarchyTheme.title}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                          {member.activeTasks || 0} tasks
                        </div>
                        <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>
                          {member.capacityScore || 85}% cap
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Evidence Stream Mini Preview */}
            {kpis.allProofs.length > 0 && (
              <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Recent Site Evidence
                  </h2>
                  <button
                    onClick={() => handleModeChange('proofs')}
                    style={{ background: 'transparent', border: 'none', color: '#0284c7', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    All Proofs ({kpis.allProofs.length})
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {kpis.allProofs.slice(0, 6).map((proof, idx) => {
                    const rawUrl = proof.fileUrl || proof.path || '';
                    const imgUrl = getFileUrl(rawUrl);
                    const fileMeta = getFileTypeMeta(rawUrl, proof.fileName || proof.caption || proof.remarks);
                    const isImg = fileMeta.isImage;

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          if (isImg) {
                            setLightboxImage({ url: imgUrl, title: proof.taskTitle || 'Site Photo', meta: fileMeta });
                          } else {
                            window.open(imgUrl, '_blank');
                          }
                        }}
                        title={isImg ? 'Click to view photo' : `Click to open ${fileMeta.label}`}
                        style={{
                          height: '75px',
                          borderRadius: '8px',
                          background: isImg ? '#f1f5f9' : '#f8fafc',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          position: 'relative',
                          border: `1px solid ${isImg ? '#e2e8f0' : fileMeta.color + '40'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {isImg ? (
                          <img
                            src={imgUrl}
                            alt="Site proof"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const next = e.currentTarget.nextElementSibling;
                              if (next) next.style.display = 'flex';
                            }}
                          />
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', padding: '4px' }}>
                            <i className={fileMeta.icon} style={{ fontSize: '20px', color: fileMeta.color }}></i>
                            <span style={{ fontSize: '9px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                              {fileMeta.type}
                            </span>
                          </div>
                        )}

                        {/* Hidden fallback container if image load errors */}
                        {isImg && (
                          <div style={{ display: 'none', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', color: '#94a3b8', gap: '2px' }}>
                            <i className="fa-solid fa-file-image" style={{ fontSize: '18px' }}></i>
                            <span style={{ fontSize: '8px', fontWeight: 600 }}>Image</span>
                          </div>
                        )}

                        <span
                          style={{
                            position: 'absolute',
                            bottom: '2px',
                            left: '2px',
                            background: isImg ? 'rgba(0,0,0,0.65)' : fileMeta.color,
                            color: '#ffffff',
                            fontSize: '9px',
                            padding: '1px 4px',
                            borderRadius: '3px',
                            fontWeight: 700,
                          }}
                        >
                          {proof.stage || 'proof'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE 2: MY DIRECTIVES QUEUE */}
      {activeMode === 'my_directives' && (
        <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '24px' }}>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
              My Assigned Operations Queue
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              Directives and checkpoints allocated directly to you. Update progress directly or submit site verification evidence.
            </p>
          </div>

          {filteredTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
              <i className="fa-solid fa-circle-check" style={{ fontSize: '42px', color: '#10b981', marginBottom: '12px' }}></i>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#334155' }}>You have no pending directives assigned</div>
              <div style={{ fontSize: '13px', marginTop: '6px' }}>All tasks are completed or awaiting new taskforce dispatch.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {filteredTasks.map((task) => (
                <div
                  key={task._id}
                  style={{
                    background: '#f8fafc',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    padding: '16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>{task.taskCode}</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#0284c7', background: '#e0f2fe', padding: '2px 8px', borderRadius: '4px' }}>
                      {task.status}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0' }}>
                    {task.title}
                  </h3>

                  <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 10px 0', lineClamp: 2, overflow: 'hidden' }}>
                    {task.description || 'No additional details provided.'}
                  </p>

                  {/* Task Notifications Strip */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    {task.roadblockAlert?.hasRoadblock && !task.roadblockAlert?.isResolved && (
                      <span
                        onClick={(e) => { e.stopPropagation(); setSelectedTaskId(task._id); setIsDetailModalOpen(true); }}
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          background: '#fee2e2',
                          color: '#dc2626',
                          border: '1px solid #fca5a5',
                          padding: '2px 7px',
                          borderRadius: '5px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          cursor: 'pointer',
                        }}
                      >
                        <i className="fa-solid fa-triangle-exclamation"></i> Roadblock
                      </span>
                    )}

                    {(task.isMDDirective || (task.comments || []).some((c) => c.isMDNote)) && (
                      <span
                        onClick={(e) => { e.stopPropagation(); setSelectedTaskId(task._id); setDetailModalInitialTab('chat'); setIsDetailModalOpen(true); }}
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          background: '#fefce8',
                          color: '#a16207',
                          border: '1px solid #fef08a',
                          padding: '2px 7px',
                          borderRadius: '5px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          cursor: 'pointer',
                        }}
                      >
                        <i className="fa-solid fa-crown"></i> MD Note
                      </span>
                    )}

                    {(task.comments?.length || 0) > 0 && (
                      <span
                        onClick={(e) => { e.stopPropagation(); setSelectedTaskId(task._id); setDetailModalInitialTab('chat'); setIsDetailModalOpen(true); }}
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          background: '#f0f9ff',
                          color: '#0369a1',
                          border: '1px solid #bae6fd',
                          padding: '2px 7px',
                          borderRadius: '5px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          cursor: 'pointer',
                        }}
                      >
                        <i className="fa-solid fa-comments"></i> {task.comments.length} update{task.comments.length > 1 ? 's' : ''}
                      </span>
                    )}

                    {(task.uploads?.length || 0) > 0 && (
                      <span
                        onClick={(e) => { e.stopPropagation(); setSelectedTaskId(task._id); setDetailModalInitialTab('evidence'); setIsDetailModalOpen(true); }}
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          background: '#f5f3ff',
                          color: '#7c3aed',
                          border: '1px solid #ddd6fe',
                          padding: '2px 7px',
                          borderRadius: '5px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          cursor: 'pointer',
                        }}
                      >
                        <i className="fa-solid fa-camera"></i> {task.uploads.length} proof{task.uploads.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
                    <button
                      onClick={() => openProgressModal(task)}
                      style={{
                        background: '#0f172a',
                        color: '#ffffff',
                        border: 'none',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Update Progress ({task.progress || 0}%)
                    </button>

                    <button
                      onClick={() => { setSelectedTaskId(task._id); setIsDetailModalOpen(true); }}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#475569',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODE 3: ROADBLOCK CRISIS CENTER */}
      {activeMode === 'roadblocks' && (
        <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '24px' }}>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#991b1b', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-road-barrier"></i>
              Roadblock Resolution Command
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              Tasks currently halted due to site impediments. Review reported issues, assign mitigation, or clear the roadblock once resolved.
            </p>
          </div>

          {kpis.roadblocksList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#059669' }}>
              <i className="fa-solid fa-shield-heart" style={{ fontSize: '48px', marginBottom: '14px' }}></i>
              <div style={{ fontSize: '16px', fontWeight: 700 }}>Zero Field Roadblocks!</div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>All taskforce operations are moving forward smoothly without recorded blockers.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
              {kpis.roadblocksList.map((task) => (
                <div
                  key={task._id}
                  style={{
                    background: '#fff1f2',
                    border: '1px solid #fecdd3',
                    borderRadius: '12px',
                    padding: '18px',
                    boxShadow: '0 2px 5px rgba(225, 29, 72, 0.05)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#9f1239', fontFamily: 'monospace' }}>
                      {task.taskCode}
                    </span>
                    <span style={{ background: '#fee2e2', color: '#dc2626', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px' }}>
                      HALTED
                    </span>
                  </div>

                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#881337', margin: '0 0 8px 0' }}>
                    {task.title}
                  </h3>

                  <div style={{ background: '#ffffff', borderRadius: '8px', padding: '12px', border: '1px solid #fecaca', marginBottom: '14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Reported Roadblock Reason:
                    </div>
                    <div style={{ fontSize: '13px', color: '#1e293b', lineHeight: 1.4 }}>
                      {task.roadblockAlert?.reason || 'Site impediment halting work.'}
                    </div>
                    {task.roadblockAlert?.reportedAt && (
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
                        Reported: {new Date(task.roadblockAlert.reportedAt).toLocaleString()}
                      </div>
                    )}
                  </div>

                  {/* Roadblock updates & proofs badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {(task.comments?.length || 0) > 0 && (
                      <span
                        onClick={(e) => { e.stopPropagation(); setSelectedTaskId(task._id); setIsDetailModalOpen(true); }}
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          background: '#f0f9ff',
                          color: '#0369a1',
                          border: '1px solid #bae6fd',
                          padding: '2px 8px',
                          borderRadius: '5px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        <i className="fa-solid fa-comments"></i> {task.comments.length} update{task.comments.length > 1 ? 's' : ''}
                      </span>
                    )}

                    {(task.uploads?.length || 0) > 0 && (
                      <span
                        onClick={(e) => { e.stopPropagation(); setSelectedTaskId(task._id); setIsDetailModalOpen(true); }}
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          background: '#f5f3ff',
                          color: '#7c3aed',
                          border: '1px solid #ddd6fe',
                          padding: '2px 8px',
                          borderRadius: '5px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        <i className="fa-solid fa-camera"></i> {task.uploads.length} proof{task.uploads.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                    <button
                      onClick={() => {
                        setRoadblockTask(task);
                        setRoadblockModalMode('resolve');
                      }}
                      style={{
                        background: '#059669',
                        color: '#ffffff',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        flex: 1,
                        justifyContent: 'center',
                      }}
                    >
                      <i className="fa-solid fa-check"></i>
                      Mark Roadblock Resolved
                    </button>

                    <button
                      onClick={() => { setSelectedTaskId(task._id); setIsDetailModalOpen(true); }}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#475569',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      Inspect Task
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODE 4: FIELD EVIDENCE GALLERY */}
      {activeMode === 'proofs' && (
        <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
                Field Proof & Verification Stream
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                Real-time photostream of work proofs uploaded from site by field helpers and supervisors.
              </p>
            </div>

            <button
              onClick={() => {
                setProofTaskId('');
                setProofFile(null);
                setProofRemarks('');
                setIsQuickProofOpen(true);
              }}
              style={{
                background: '#0d9488',
                color: '#ffffff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <i className="fa-solid fa-camera"></i>
              Upload New Evidence
            </button>
          </div>

          {kpis.allProofs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
              <i className="fa-solid fa-camera" style={{ fontSize: '42px', color: '#cbd5e1', marginBottom: '12px' }}></i>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#334155' }}>No site proofs uploaded yet</div>
              <div style={{ fontSize: '13px', marginTop: '6px' }}>Upload photos from site to populate the audit gallery.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
              {kpis.allProofs.map((proof, idx) => {
                const rawUrl = proof.fileUrl || proof.path || '';
                const imgUrl = getFileUrl(rawUrl);
                const fileMeta = getFileTypeMeta(rawUrl, proof.fileName || proof.caption || proof.remarks);
                const isImg = fileMeta.isImage;

                return (
                  <div
                    key={idx}
                    style={{
                      background: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      overflow: 'hidden',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div
                      onClick={() => {
                        if (isImg) {
                          setLightboxImage({ url: imgUrl, title: proof.taskTitle || 'Site Photo', meta: fileMeta });
                        } else {
                          window.open(imgUrl, '_blank');
                        }
                      }}
                      title={isImg ? 'Click to view photo' : `Click to open ${fileMeta.label}`}
                      style={{
                        height: '180px',
                        background: isImg ? '#0f172a' : '#f8fafc',
                        cursor: 'pointer',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderBottom: '1px solid #e2e8f0',
                      }}
                    >
                      {isImg ? (
                        <img
                          src={imgUrl}
                          alt="Evidence"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const next = e.currentTarget.nextElementSibling;
                            if (next) next.style.display = 'flex';
                          }}
                        />
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px', textAlign: 'center' }}>
                          <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: `${fileMeta.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: fileMeta.color, fontSize: '26px' }}>
                            <i className={fileMeta.icon}></i>
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                            {fileMeta.label}
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <i className="fa-solid fa-arrow-up-right-from-square"></i> Click to Open / Download
                          </span>
                        </div>
                      )}

                      {/* Image fallback if img tag fails */}
                      {isImg && (
                        <div style={{ display: 'none', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', color: '#94a3b8', gap: '6px' }}>
                          <i className="fa-solid fa-file-image" style={{ fontSize: '32px' }}></i>
                          <span style={{ fontSize: '12px', fontWeight: 600 }}>Image unavailable</span>
                        </div>
                      )}

                      <span
                        style={{
                          position: 'absolute',
                          top: '10px',
                          left: '10px',
                          background: isImg ? 'rgba(15, 23, 42, 0.75)' : fileMeta.color,
                          color: '#ffffff',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                        }}
                      >
                        {proof.stage || 'proof'}
                      </span>
                    </div>

                    <div style={{ padding: '12px 14px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {proof.taskTitle || proof.taskCode || 'Task Directive'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>
                        {proof.department || 'Operations'} {proof.flat ? `• Flat ${proof.flat}` : ''}
                      </div>

                      {proof.remarks && (
                        <div style={{ fontSize: '12px', color: '#334155', background: '#ffffff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '8px' }}>
                          "{proof.remarks}"
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#94a3b8' }}>
                        <span>{proof.uploadedAt ? new Date(proof.uploadedAt).toLocaleDateString() : 'Recent'}</span>
                        <button
                          onClick={() => { setSelectedTaskId(proof.taskId); setIsDetailModalOpen(true); }}
                          style={{ background: 'transparent', border: 'none', color: '#0284c7', cursor: 'pointer', fontWeight: 600, fontSize: '11px' }}
                        >
                          View Task
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODE 5: DEPARTMENT HEALTH & CAPACITY */}
      {activeMode === 'departments' && (
        <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '24px' }}>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
              Department Health & Capacity Matrix
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              Operational efficiency, workload saturation, and active bottlenecks per department.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {departmentAggregates.map((dept) => (
              <div
                key={dept.name}
                style={{
                  background: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  padding: '20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: dept.theme.bg,
                        color: dept.theme.color,
                        border: `1px solid ${dept.theme.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                      }}
                    >
                      <i className={dept.theme.icon}></i>
                    </div>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                        {dept.name}
                      </h3>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                        {dept.active} active directives
                      </span>
                    </div>
                  </div>

                  <span
                    style={{
                      background: dept.roadblocks > 0 ? '#fee2e2' : '#ecfdf5',
                      color: dept.roadblocks > 0 ? '#dc2626' : '#059669',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    {dept.roadblocks > 0 ? `${dept.roadblocks} Blocked` : 'Healthy'}
                  </span>
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px', color: '#475569', fontWeight: 600 }}>
                    <span>Completion Rate</span>
                    <span>{dept.completionRate}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${dept.completionRate}%`,
                        height: '100%',
                        background: dept.theme.color,
                        borderRadius: '4px',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center', background: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>{dept.total}</div>
                    <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Total</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#0284c7' }}>{dept.active}</div>
                    <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Active</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#10b981' }}>{dept.completed}</div>
                    <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Done</div>
                  </div>
                </div>

                <div style={{ marginTop: '14px', textAlign: 'right' }}>
                  <button
                    onClick={() => {
                      setSelectedDept(dept.name);
                      handleModeChange('command');
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#0284c7',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Filter Queue to this Department →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. MODALS & DRAWERS                                      */}
      {/* ======================================================== */}

      {/* NEW TASK / DIRECTIVE MODAL */}
      <NewTaskModal
        isOpen={isNewTaskModalOpen}
        onClose={() => setIsNewTaskModalOpen(false)}
        onTaskCreated={() => {
          showToast('New directive created successfully', 'success');
          setIsNewTaskModalOpen(false);
          fetchDashboardData(true);
        }}
      />

      {/* TASK DETAIL MODAL */}
      <TaskDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedTaskId(null);
          setDetailModalInitialTab('overview');
        }}
        taskId={selectedTaskId}
        initialTab={detailModalInitialTab}
        onTaskUpdated={() => {
          fetchDashboardData(true);
        }}
      />

      {/* TASKFORCE MEMBER DRAWER */}
      <TaskforceMemberDrawer
        isOpen={isMemberDrawerOpen}
        onClose={() => {
          setIsMemberDrawerOpen(false);
          setSelectedMemberForDrawer(null);
          fetchDashboardData(true);
        }}
        member={selectedMemberForDrawer}
        onOpenTaskDetail={(taskId, initialTab = 'overview') => {
          setSelectedTaskId(taskId);
          setDetailModalInitialTab(initialTab);
          setIsDetailModalOpen(true);
        }}
      />

      {/* QUICK PROGRESS UPDATE MODAL */}
      {isQuickProgressOpen && quickProgressTask && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '460px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Update Operation Progress
              </h3>
              <button
                onClick={() => setIsQuickProgressOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0' }}>
              Directive: <strong>{quickProgressTask.title}</strong>
            </p>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                <span>Completion Percentage</span>
                <span style={{ color: '#0284c7' }}>{quickProgressVal}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={quickProgressVal}
                onChange={(e) => setQuickProgressVal(Number(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Operation Status
              </label>
              <select
                value={quickProgressStatus}
                onChange={(e) => setQuickProgressStatus(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              >
                <option value="pending">Pending Dispatch</option>
                <option value="in_progress">In Progress</option>
                <option value="under_review">Under Review / Inspection</option>
                <option value="completed">Completed (100%)</option>
                <option value="delayed">Delayed / On Hold</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setIsQuickProgressOpen(false)}
                style={{ background: '#f1f5f9', border: 'none', color: '#64748b', padding: '10px 16px', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProgress}
                disabled={savingProgress}
                style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
              >
                {savingProgress ? 'Saving...' : 'Save Progress'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK PROOF UPLOAD MODAL */}
      {isQuickProofOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-camera" style={{ color: '#0d9488' }}></i>
                Upload Site Proof / Evidence
              </h3>
              <button
                onClick={() => setIsQuickProofOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleProofUpload}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Select Taskforce Directive *
                </label>
                <select
                  value={proofTaskId}
                  onChange={(e) => setProofTaskId(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                >
                  <option value="">-- Choose Directive --</option>
                  {tasks.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.taskCode ? `${t.taskCode} - ` : ''}{t.title} {t.apartmentDetails?.flatNumber ? `(${t.apartmentDetails.flatNumber})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Inspection Stage
                </label>
                <select
                  value={proofStage}
                  onChange={(e) => setProofStage(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                >
                  <option value="before">Before Work Started</option>
                  <option value="during">During Execution / In-Progress</option>
                  <option value="proof">Work Proof / Checkpoint</option>
                  <option value="completion">Completion Evidence</option>
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Upload Photo / File (Any file type accepted) *
                </label>
                <input
                  type="file"
                  accept="*/*"
                  onChange={(e) => setProofFile(e.target.files[0])}
                  required
                  style={{ width: '100%', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Remarks / Site Notes
                </label>
                <textarea
                  rows="2"
                  value={proofRemarks}
                  onChange={(e) => setProofRemarks(e.target.value)}
                  placeholder="e.g. Masonry plaster completed for wall B..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsQuickProofOpen(false)}
                  style={{ background: '#f1f5f9', border: 'none', color: '#64748b', padding: '10px 16px', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingProof}
                  style={{ background: '#0d9488', color: '#ffffff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                >
                  {uploadingProof ? 'Uploading...' : 'Upload Evidence'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ROADBLOCK MODAL (RAISE OR RESOLVE) */}
      {roadblockModalMode && roadblockTask && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '460px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: roadblockModalMode === 'raise' ? '#dc2626' : '#059669', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className={roadblockModalMode === 'raise' ? 'fa-solid fa-triangle-exclamation' : 'fa-solid fa-check-double'}></i>
                {roadblockModalMode === 'raise' ? 'Report Roadblock / Obstacle' : 'Resolve Field Roadblock'}
              </h3>
              <button
                onClick={() => setRoadblockModalMode(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0' }}>
              Directive: <strong>{roadblockTask.title}</strong>
            </p>

            {roadblockModalMode === 'raise' ? (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Obstacle Description *
                </label>
                <textarea
                  rows="3"
                  value={roadblockReason}
                  onChange={(e) => setRoadblockReason(e.target.value)}
                  placeholder="e.g. Missing electrical conduit pipes from stores; awaiting approval from head..."
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #fecaca', fontSize: '13px', background: '#fff1f2' }}
                />
              </div>
            ) : (
              <div style={{ marginBottom: '20px', background: '#ecfdf5', padding: '12px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#065f46' }}>
                  Are you sure the field issue has been resolved? Marking this resolved will restore task status to <strong>In Progress</strong> and alert team leads.
                </p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setRoadblockModalMode(null)}
                style={{ background: '#f1f5f9', border: 'none', color: '#64748b', padding: '10px 16px', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleRoadblockSubmit}
                disabled={roadblockResolving}
                style={{
                  background: roadblockModalMode === 'raise' ? '#dc2626' : '#059669',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {roadblockResolving ? 'Processing...' : roadblockModalMode === 'raise' ? 'Report Roadblock' : 'Confirm Resolution'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX MODAL FOR SITE EVIDENCE & MEDIA */}
      {lightboxImage && (() => {
        const url = typeof lightboxImage === 'string' ? lightboxImage : lightboxImage?.url;
        const meta = typeof lightboxImage === 'object' && lightboxImage?.meta ? lightboxImage.meta : getFileTypeMeta(url);
        const title = typeof lightboxImage === 'object' && lightboxImage?.title ? lightboxImage.title : 'Site Evidence';

        return (
          <div
            onClick={() => setLightboxImage(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 99999,
              padding: '24px',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'relative',
                maxWidth: '90vw',
                maxHeight: '90vh',
                background: '#0f172a',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '12px', gap: '16px' }}>
                <span style={{ color: '#ffffff', fontSize: '13px', fontWeight: 700 }}>{title}</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    style={{
                      background: '#1e293b',
                      color: '#ffffff',
                      textDecoration: 'none',
                      fontSize: '12px',
                      fontWeight: 600,
                      padding: '6px 12px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <i className="fa-solid fa-arrow-up-right-from-square"></i> Open Original
                  </a>
                  <button
                    onClick={() => setLightboxImage(null)}
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      background: '#ffffff',
                      border: 'none',
                      color: '#0f172a',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
              </div>

              {meta.type === 'video' ? (
                <video src={url} controls autoPlay style={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: '8px' }} />
              ) : meta.type === 'pdf' ? (
                <iframe src={url} title="PDF Preview" style={{ width: '80vw', height: '75vh', border: 'none', borderRadius: '8px', background: '#ffffff' }} />
              ) : meta.isImage ? (
                <img
                  src={url}
                  alt="Enlarged site evidence"
                  style={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: '8px', objectFit: 'contain' }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const next = e.currentTarget.nextElementSibling;
                    if (next) next.style.display = 'flex';
                  }}
                />
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: '#ffffff' }}>
                  <i className={meta.icon} style={{ fontSize: '48px', color: meta.color, marginBottom: '12px' }}></i>
                  <div style={{ fontSize: '16px', fontWeight: 700 }}>{meta.label}</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px' }}>Click "Open Original" above to view or download this file.</div>
                </div>
              )}

              {meta.isImage && (
                <div style={{ display: 'none', padding: '40px', textAlign: 'center', color: '#ffffff', flexDirection: 'column', alignItems: 'center' }}>
                  <i className="fa-solid fa-file-image" style={{ fontSize: '48px', color: '#ef4444', marginBottom: '12px' }}></i>
                  <div style={{ fontSize: '16px', fontWeight: 700 }}>Image Preview Failed</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px' }}>Click "Open Original" above to view directly in browser.</div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default TaskforceDashboardPage;
