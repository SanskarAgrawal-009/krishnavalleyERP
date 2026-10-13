import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Modal } from '../common/Modal.jsx';
import { taskService } from '../../services/taskService.js';
import { getFileUrl } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  Sparkles,
  Users,
  Building2,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Send,
  MessageSquare,
  History,
  TrendingUp,
  AlertCircle,
  Edit2,
  Trash2,
  Phone,
  Mail,
  Check,
  ShieldAlert,
  ChevronRight,
  Flag,
  Camera,
  UploadCloud,
  FileImage,
  FileText,
  Film,
  Music,
  ExternalLink,
  ShieldCheck,
  Award
} from 'lucide-react';

export const TaskDetailModal = ({
  isOpen,
  onClose,
  taskId,
  initialTab = 'followups',
  onTaskUpdated,
  onEditTask,
}) => {
  const { showToast } = useToast();
  const { user: currentUser } = useAuth();

  const [loading, setLoading] = useState(false);
  const [task, setTask] = useState(null);
  const [activeTab, setActiveTab] = useState(initialTab || 'followups'); // 'followups', 'chat', 'details', 'uploads'

  // Proof / Uploads State
  const [selectedProofFile, setSelectedProofFile] = useState(null);
  const [proofStage, setProofStage] = useState('in_progress');
  const [proofCaption, setProofCaption] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);

  // Progress Update State
  const [progressVal, setProgressVal] = useState(0);
  const [savingProgress, setSavingProgress] = useState(false);

  // Status Changer State
  const [currentStatus, setCurrentStatus] = useState('pending');

  // Roadblock State
  const [showRoadblockPrompt, setShowRoadblockPrompt] = useState(false);
  const [roadblockReason, setRoadblockReason] = useState('');
  const [submittingRoadblock, setSubmittingRoadblock] = useState(false);

  // Follow-up Form State
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [fuRemarks, setFuRemarks] = useState('');
  const [fuOutcome, setFuOutcome] = useState('on_track');
  const [fuProgress, setFuProgress] = useState(0);
  const [fuNextDate, setFuNextDate] = useState('');
  const [submittingFollowUp, setSubmittingFollowUp] = useState(false);

  // Dedicated Task Communication Chat State
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessageType, setChatMessageType] = useState('chat'); // 'chat' | 'query' | 'guideline' | 'md_note'
  const [chatFilter, setChatFilter] = useState('all'); // 'all' | 'query' | 'guideline' | 'md_note'
  const [isMDNote, setIsMDNote] = useState(false);
  const [submittingChat, setSubmittingChat] = useState(false);

  useEffect(() => {
    if (isOpen && taskId) {
      if (initialTab) setActiveTab(initialTab);
      loadTaskDetails();
    }
  }, [isOpen, taskId, initialTab]);

  const commentsEndRef = useRef(null);

  useEffect(() => {
    if (activeTab === 'chat' && commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab, task?.comments?.length]);

  const notifyTaskUpdated = () => {
    if (onTaskUpdated) onTaskUpdated();
    window.dispatchEvent(
      new CustomEvent('taskforceTaskUpdated', {
        detail: { taskId: task?._id || taskId },
      })
    );
  };

  useEffect(() => {
    const handleRemoteTaskUpdated = (e) => {
      if (isOpen && taskId && (!e.detail?.taskId || e.detail.taskId === taskId)) {
        loadTaskDetails(true);
      }
    };
    window.addEventListener('taskforceTaskUpdated', handleRemoteTaskUpdated);
    return () => window.removeEventListener('taskforceTaskUpdated', handleRemoteTaskUpdated);
  }, [isOpen, taskId]);

  const loadTaskDetails = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await taskService.getTaskById(taskId);
      if (res && res.success) {
        setTask(res.data);
        setProgressVal(res.data.progress || 0);
        setCurrentStatus(res.data.status || 'pending');
        setFuProgress(res.data.progress || 0);

        // Pre-fill next follow up date suggestion
        const nextD = new Date();
        nextD.setDate(nextD.getDate() + 1);
        setFuNextDate(nextD.toISOString().split('T')[0]);
      }
    } catch (err) {
      console.error('Failed to load task details', err);
      showToast('Could not load task details', 'error');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const handleProgressSave = async (newVal) => {
    try {
      setSavingProgress(true);
      const val = typeof newVal === 'number' ? newVal : progressVal;
      await taskService.updateProgress(task._id, { progress: val });
      showToast(`Progress updated to ${val}%`, 'success');
      loadTaskDetails(true);
      notifyTaskUpdated();
    } catch (err) {
      showToast(err.message || 'Failed to update progress', 'error');
    } finally {
      setSavingProgress(false);
    }
  };

  const handleToggleCheckpoint = async (checkpointId) => {
    try {
      const res = await taskService.toggleCheckpoint(task._id, checkpointId);
      if (res && res.success) {
        setTask(res.data);
        setProgressVal(res.data.progress || 0);
        showToast(res.message || 'Checkpoint updated', 'success');
        notifyTaskUpdated();
      }
    } catch (err) {
      showToast(err.message || 'Failed to update checkpoint', 'error');
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      setCurrentStatus(newStatus);
      await taskService.updateProgress(task._id, { status: newStatus });
      showToast(`Status updated to ${newStatus.replace('_', ' ').toUpperCase()}`, 'success');
      loadTaskDetails(true);
      notifyTaskUpdated();
    } catch (err) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  const handleToggleRoadblock = async (action) => {
    try {
      setSubmittingRoadblock(true);
      if (action === 'raise') {
        if (!roadblockReason.trim()) {
          showToast('Please state the roadblock reason', 'error');
          return;
        }
        await taskService.updateProgress(task._id, {
          roadblock: { action: 'raise', reason: roadblockReason.trim() },
        });
        showToast('Roadblock reported and MD alerted', 'warning');
        setShowRoadblockPrompt(false);
        setRoadblockReason('');
      } else {
        await taskService.updateProgress(task._id, {
          roadblock: { action: 'resolve' },
        });
        showToast('Roadblock marked as resolved', 'success');
      }
      loadTaskDetails(true);
      notifyTaskUpdated();
    } catch (err) {
      showToast(err.message || 'Failed to update roadblock', 'error');
    } finally {
      setSubmittingRoadblock(false);
    }
  };

  const handleSubmitFollowUp = async (e) => {
    e.preventDefault();
    if (!fuRemarks.trim()) {
      showToast('Please enter follow-up remarks', 'error');
      return;
    }

    try {
      setSubmittingFollowUp(true);
      await taskService.logFollowUp(task._id, {
        remarks: fuRemarks.trim(),
        outcome: fuOutcome,
        newProgress: Number(fuProgress),
        nextFollowUpDate: fuNextDate || undefined,
      });

      showToast('Follow-up logged successfully', 'success');
      setFuRemarks('');
      setShowFollowUpForm(false);
      loadTaskDetails(true);
      notifyTaskUpdated();
    } catch (err) {
      showToast(err.message || 'Failed to record follow-up', 'error');
    } finally {
      setSubmittingFollowUp(false);
    }
  };

  const handleSendComment = async (e, typeOverride) => {
    if (e && e.preventDefault) e.preventDefault();
    const messageToSend = chatMessage.trim();
    if (!messageToSend || submittingChat) return;

    const chosenType = typeOverride || chatMessageType;
    const isMD = chosenType === 'md_note' || isMDNote;

    try {
      setSubmittingChat(true);
      const res = await taskService.addComment(task._id, {
        message: messageToSend,
        isMDNote: isMD,
        messageType: chosenType,
      });

      showToast(
        isMD
          ? 'MD Directive note posted successfully'
          : chosenType === 'query'
          ? 'Task query posted to assigned team'
          : chosenType === 'guideline'
          ? 'Task guideline posted for crew'
          : 'Message posted to task chat',
        'success'
      );
      setChatMessage('');
      setIsMDNote(false);
      setChatMessageType('chat');

      if (res && res.comments) {
        setTask((prev) => (prev ? { ...prev, comments: res.comments } : prev));
      }
      loadTaskDetails(true);
      notifyTaskUpdated();
    } catch (err) {
      showToast(err.message || 'Failed to post message', 'error');
    } finally {
      setSubmittingChat(false);
    }
  };

  const allParticipants = useMemo(() => {
    if (!task) return [];
    const list = [];
    if (task.assignedBy) {
      const u = task.assignedBy;
      list.push({
        id: u._id || 'creator',
        name: u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : u.username || 'Creator',
        role: (u.role || 'Admin/Manager').toUpperCase(),
        isCreator: true,
      });
    }
    (task.assignedTo || []).forEach((u) => {
      if (u) {
        list.push({
          id: u._id,
          name: u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : u.username || 'Staff',
          role: u.role ? u.role.toUpperCase() : 'STAFF',
        });
      }
    });
    (task.assignedMembers || []).forEach((m) => {
      if (m) {
        list.push({
          id: m._id,
          name: m.name || m.fullName || 'Crew',
          role: (m.hierarchyLevel || 'CREW').toUpperCase(),
        });
      }
    });
    const seen = new Set();
    return list.filter((item) => {
      const key = `${item.name}-${item.role}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [task]);

  const getSenderRoleBadge = (commentSender) => {
    if (!commentSender) return { label: 'STAFF', bg: '#f1f5f9', color: '#475569' };
    const role = (commentSender.role || '').toLowerCase();
    const username = (commentSender.username || '').toLowerCase();

    if (role.includes('admin') || username.includes('admin')) {
      return { label: 'ADMIN', bg: '#fee2e2', color: '#dc2626' };
    }
    if (role.includes('manager') || username.includes('manager')) {
      return { label: 'TF MANAGER', bg: '#fdf2f8', color: '#db2777' };
    }
    if (role.includes('head') || username.includes('head')) {
      return { label: 'HEAD', bg: '#ecfeff', color: '#0891b2' };
    }
    if (role.includes('supervisor')) {
      return { label: 'SUPERVISOR', bg: '#eef2ff', color: '#4f46e5' };
    }
    if (role.includes('helper') || role.includes('crew')) {
      return { label: 'CREW', bg: '#eff6ff', color: '#2563eb' };
    }
    return { label: 'ASSIGNED', bg: '#f1f5f9', color: '#334155' };
  };

  const filteredComments = useMemo(() => {
    const list = task?.comments || [];
    if (chatFilter === 'all') return list;
    if (chatFilter === 'query') return list.filter((c) => c.messageType === 'query');
    if (chatFilter === 'guideline') return list.filter((c) => c.messageType === 'guideline');
    if (chatFilter === 'md_note') return list.filter((c) => c.isMDNote || c.messageType === 'md_note');
    return list;
  }, [task?.comments, chatFilter]);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to permanently delete this task?')) {
      try {
        await taskService.deleteTask(task._id);
        showToast('Task removed successfully', 'success');
        onClose();
        notifyTaskUpdated();
      } catch (err) {
        showToast(err.message || 'Failed to delete task', 'error');
      }
    }
  };

  const getFullProofUrl = (url) => {
    if (!url) return '';
    return getFileUrl(url);
  };

  const handleProofSubmit = async (e) => {
    e?.preventDefault();
    if (!selectedProofFile) {
      showToast('Please select a photo or document proof to upload', 'error');
      return;
    }
    try {
      setUploadingProof(true);
      const formData = new FormData();
      formData.append('file', selectedProofFile);
      formData.append('stage', proofStage);
      if (proofCaption) {
        formData.append('caption', proofCaption.trim());
        formData.append('remarks', proofCaption.trim());
      }

      const res = await taskService.uploadProof(task._id, formData);
      if (res && res.success) {
        showToast('Proof of work uploaded successfully', 'success');
        setSelectedProofFile(null);
        setProofCaption('');
        const fi = document.getElementById('task-proof-file-input');
        if (fi) fi.value = '';
        loadTaskDetails(true);
        notifyTaskUpdated();
      }
    } catch (err) {
      showToast(err.message || 'Failed to upload proof', 'error');
    } finally {
      setUploadingProof(false);
    }
  };

  const handleDeleteProof = async (uploadId) => {
    if (!window.confirm('Are you sure you want to delete this proof upload?')) return;
    try {
      const res = await taskService.deleteProof(task._id, uploadId);
      if (res && res.success) {
        showToast('Proof removed', 'success');
        loadTaskDetails(true);
        notifyTaskUpdated();
      }
    } catch (err) {
      showToast(err.message || 'Failed to delete proof', 'error');
    }
  };

  if (!isOpen) return null;

  // Compute Follow-up timing indicator
  const getFollowUpStatusInfo = () => {
    if (!task?.followUpSchedule?.nextFollowUpDate) return null;
    const now = new Date();
    const nextD = new Date(task.followUpSchedule.nextFollowUpDate);

    const isToday =
      now.getFullYear() === nextD.getFullYear() &&
      now.getMonth() === nextD.getMonth() &&
      now.getDate() === nextD.getDate();

    const isOverdue = nextD < new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (task.status === 'completed') {
      return { label: 'Task Completed', color: '#16a34a', bg: '#dcfce7' };
    }
    if (isOverdue) {
      return { label: 'FOLLOW-UP OVERDUE', color: '#dc2626', bg: '#fee2e2', alert: true };
    }
    if (isToday) {
      return { label: 'FOLLOW-UP DUE TODAY', color: '#ca8a04', bg: '#fef08a', urgent: true };
    }
    return {
      label: `Scheduled for ${nextD.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
      color: '#005bbf',
      bg: '#e8f0fe',
    };
  };

  const fuStatus = task ? getFollowUpStatusInfo() : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={task ? `${task.taskCode || 'Task'} • ${task.title}` : 'Task Directive'}
      maxWidth="880px"
    >
      {loading ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '28px', color: '#005bbf', marginBottom: '12px', display: 'block' }}></i>
          Loading task details & communication logs...
        </div>
      ) : !task ? (
        <div style={{ padding: '50px 20px', textAlign: 'center', color: '#64748b' }}>
          <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '36px', color: '#f59e0b', marginBottom: '12px', display: 'block' }}></i>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>Task directive could not be loaded</div>
          <div style={{ fontSize: '13px', marginTop: '6px', color: '#64748b' }}>This task may have been removed or is temporarily unavailable.</div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '16px' }}>
            <button
              onClick={() => loadTaskDetails()}
              style={{ padding: '8px 16px', borderRadius: '8px', background: '#005bbf', color: '#ffffff', border: 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
            >
              Retry
            </button>
            <button
              onClick={onClose}
              style={{ padding: '8px 16px', borderRadius: '8px', background: '#e2e8f0', color: '#334155', border: 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
            >
              Close
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Header Badges & Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              paddingBottom: '12px',
              borderBottom: '1px solid #edeef0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {task.isMDDirective && (
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    backgroundColor: '#ca8a04',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '11px',
                    letterSpacing: '0.04em',
                    boxShadow: '0 2px 6px rgba(202, 138, 4, 0.3)',
                  }}
                >
                  <Sparkles size={13} />
                  MD DIRECTIVE
                </span>
              )}

              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: '16px',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#334155',
                  textTransform: 'capitalize',
                }}
              >
                {task.department} Dept
              </span>

              {task.isApartmentRelated && task.apartmentDetails?.flatNumber && (
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 10px',
                    borderRadius: '16px',
                    backgroundColor: '#e0f2fe',
                    border: '1px solid #bae6fd',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#0369a1',
                  }}
                >
                  <Building2 size={13} />
                  {task.apartmentDetails.tower ? `${task.apartmentDetails.tower} • ` : ''}
                  {task.apartmentDetails.flatNumber}
                </span>
              )}

              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: '16px',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
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
                  border:
                    task.priority === 'urgent'
                      ? '1px solid #fca5a5'
                      : task.priority === 'high'
                      ? '1px solid #fed7aa'
                      : '1px solid #cbd5e1',
                }}
              >
                {task.priority} Priority
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {onEditTask && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    onClose();
                    onEditTask(task);
                  }}
                  style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Edit2 size={13} />
                  Edit Task
                </button>
              )}
              <button
                type="button"
                className="btn-secondary"
                onClick={handleDelete}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  color: '#dc2626',
                  borderColor: '#fca5a5',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Trash2 size={13} />
                Delete
              </button>
            </div>
          </div>

          {/* Roadblock Alert Banner (If active) */}
          {task.roadblockAlert?.hasRoadblock && !task.roadblockAlert?.isResolved && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #f87171',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <AlertTriangle size={20} color="#dc2626" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#991b1b' }}>
                    WORK ROADBLOCK REPORTED
                  </div>
                  <div style={{ fontSize: '12px', color: '#b91c1c', marginTop: '2px' }}>
                    "{task.roadblockAlert.reason}"
                  </div>
                  <div style={{ fontSize: '11px', color: '#7f1d1d', marginTop: '4px' }}>
                    Reported by {task.roadblockAlert.reportedBy?.firstName || 'Assignee'} on{' '}
                    {new Date(task.roadblockAlert.reportedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn-primary"
                onClick={() => handleToggleRoadblock('resolve')}
                disabled={submittingRoadblock}
                style={{
                  backgroundColor: '#16a34a',
                  padding: '6px 14px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexShrink: 0,
                }}
              >
                <Check size={14} />
                Resolve Roadblock
              </button>
            </div>
          )}

          {/* Progress Slider & Status Bar */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '14px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} color="#005bbf" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                  Execution Progress: <span style={{ color: '#005bbf' }}>{progressVal}%</span>
                </span>
              </div>

              {/* Status Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Status:</span>
                <select
                  value={currentStatus}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  <option value="pending">Pending (Not Started)</option>
                  <option value="in_progress">In Progress</option>
                  <option value="under_review">Under MD Review</option>
                  <option value="completed">Completed</option>
                  <option value="delayed">Delayed / Blocked</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Slider with quick buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={progressVal}
                onChange={(e) => setProgressVal(Number(e.target.value))}
                style={{ flex: 1, accentColor: '#005bbf', cursor: 'pointer' }}
              />

              <div style={{ display: 'flex', gap: '4px' }}>
                {[25, 50, 75, 100].map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => {
                      setProgressVal(step);
                      handleProgressSave(step);
                    }}
                    style={{
                      padding: '2px 8px',
                      fontSize: '11px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: progressVal === step ? '#005bbf' : '#ffffff',
                      color: progressVal === step ? '#ffffff' : '#334155',
                      cursor: 'pointer',
                    }}
                  >
                    {step}%
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="btn-primary"
                onClick={() => handleProgressSave(progressVal)}
                disabled={savingProgress || progressVal === task.progress}
                style={{ padding: '4px 12px', fontSize: '12px' }}
              >
                {savingProgress ? 'Saving...' : 'Save %'}
              </button>
            </div>

            {/* Roadblock Prompt Toggle */}
            {!task.roadblockAlert?.hasRoadblock && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                {!showRoadblockPrompt ? (
                  <button
                    type="button"
                    onClick={() => setShowRoadblockPrompt(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dc2626',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Flag size={12} />
                    Report Work Roadblock / Hindrance
                  </button>
                ) : (
                  <div style={{ width: '100%', display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                    <input
                      type="text"
                      className="search-input"
                      placeholder="State what is blocking this work (e.g. materials delayed, electrical power off)..."
                      value={roadblockReason}
                      onChange={(e) => setRoadblockReason(e.target.value)}
                      style={{ flex: 1, height: '32px', fontSize: '12px' }}
                    />
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => handleToggleRoadblock('raise')}
                      disabled={submittingRoadblock}
                      style={{ backgroundColor: '#dc2626', padding: '4px 12px', fontSize: '11px' }}
                    >
                      Alert MD
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRoadblockPrompt(false)}
                      style={{ background: 'none', border: 'none', fontSize: '11px', color: '#64748b', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Checkpoints & Milestone Subtasks */}
          {task.checkpoints && task.checkpoints.length > 0 && (
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '14px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                  Action Checkpoints ({task.checkpoints.filter((c) => c.isCompleted).length} of {task.checkpoints.length} completed)
                </span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Click step to check off milestone
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {task.checkpoints.map((cp) => (
                  <div
                    key={cp._id}
                    onClick={() => handleToggleCheckpoint(cp._id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: cp.isCompleted ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                      backgroundColor: cp.isCompleted ? '#f0fdf4' : '#f8fafc',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={cp.isCompleted}
                      onChange={() => {}}
                      style={{ accentColor: '#16a34a', width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <span
                      style={{
                        fontSize: '13px',
                        color: cp.isCompleted ? '#166534' : '#1e293b',
                        textDecoration: cp.isCompleted ? 'line-through' : 'none',
                        fontWeight: cp.isCompleted ? 500 : 600,
                      }}
                    >
                      {cp.title}
                    </span>
                    {cp.isCompleted && cp.completedAt && (
                      <span style={{ fontSize: '11px', color: '#16a34a', marginLeft: 'auto' }}>
                        Done {new Date(cp.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              borderBottom: '2px solid #e2e8f0',
              paddingBottom: '2px',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('followups')}
              style={{
                padding: '8px 16px',
                border: 'none',
                background: 'none',
                fontWeight: 600,
                fontSize: '13px',
                color: activeTab === 'followups' ? '#005bbf' : '#64748b',
                borderBottom: activeTab === 'followups' ? '2px solid #005bbf' : '2px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Clock size={16} />
              Follow-ups & Next Action ({task.followUpLogs?.length || 0})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              style={{
                padding: '8px 16px',
                border: 'none',
                background: 'none',
                fontWeight: 600,
                fontSize: '13px',
                color: activeTab === 'chat' ? '#005bbf' : '#64748b',
                borderBottom: activeTab === 'chat' ? '2px solid #005bbf' : '2px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <MessageSquare size={16} />
              Queries & Guidelines Chat ({task.comments?.length || 0})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('details')}
              style={{
                padding: '8px 16px',
                border: 'none',
                background: 'none',
                fontWeight: 600,
                fontSize: '13px',
                color: activeTab === 'details' ? '#005bbf' : '#64748b',
                borderBottom: activeTab === 'details' ? '2px solid #005bbf' : '2px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Building2 size={16} />
              Assignment Details & Team ({task.assignedTo?.length || 0})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('uploads')}
              style={{
                padding: '8px 16px',
                border: 'none',
                background: 'none',
                fontWeight: 600,
                fontSize: '13px',
                color: activeTab === 'uploads' ? '#005bbf' : '#64748b',
                borderBottom: activeTab === 'uploads' ? '2px solid #005bbf' : '2px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Camera size={16} />
              Proof & Uploads ({task.uploads?.length || 0})
            </button>
          </div>

          {/* TAB 1: FOLLOW-UPS & ACTIVE TRACKING */}
          {activeTab === 'followups' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Follow-up Status Banner */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  borderRadius: '10px',
                  backgroundColor: fuStatus?.bg || '#eff6ff',
                  border: `1px solid ${fuStatus?.color || '#bfdbfe'}`,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={18} color={fuStatus?.color || '#005bbf'} />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: fuStatus?.color || '#005bbf' }}>
                      {fuStatus?.label}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                    Follow-up Cadence: <strong style={{ textTransform: 'capitalize' }}>{task.followUpSchedule?.frequency || 'Daily'}</strong> • Conducted: <strong>{task.followUpLogs?.length || 0} times</strong>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setShowFollowUpForm(!showFollowUpForm)}
                  style={{
                    padding: '8px 16px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Clock size={14} />
                  {showFollowUpForm ? 'Close Form' : 'Take Follow-up'}
                </button>
              </div>

              {/* Follow-up Logging Form */}
              {showFollowUpForm && (
                <form
                  onSubmit={handleSubmitFollowUp}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                    Log Follow-up & Discussion Outcome
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Follow-up Remarks / Status Inspection <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <textarea
                      className="search-input"
                      rows={3}
                      style={{ width: '100%', height: '70px', fontSize: '13px', padding: '8px' }}
                      placeholder="e.g. Called site engineer Ramesh. Masonry work completed. Plumbing team is arriving at 2 PM. Work progressing well."
                      value={fuRemarks}
                      onChange={(e) => setFuRemarks(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        Follow-up Outcome
                      </label>
                      <select
                        className="search-input"
                        style={{ width: '100%', height: '36px', fontSize: '12px' }}
                        value={fuOutcome}
                        onChange={(e) => setFuOutcome(e.target.value)}
                      >
                        <option value="on_track">On Track (Progressing)</option>
                        <option value="milestone_reached"> Milestone Reached</option>
                        <option value="needs_attention">Needs Attention</option>
                        <option value="roadblock">Roadblock / Blocked</option>
                        <option value="rescheduled">Rescheduled</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        Updated Progress %
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="search-input"
                        style={{ width: '100%', height: '36px', fontSize: '12px' }}
                        value={fuProgress}
                        onChange={(e) => setFuProgress(Number(e.target.value))}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        Next Follow-up Date
                      </label>
                      <input
                        type="date"
                        className="search-input"
                        style={{ width: '100%', height: '36px', fontSize: '12px' }}
                        value={fuNextDate}
                        onChange={(e) => setFuNextDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setShowFollowUpForm(false)}
                      style={{ padding: '6px 14px', fontSize: '12px' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={submittingFollowUp}
                      style={{ padding: '6px 18px', fontSize: '12px' }}
                    >
                      {submittingFollowUp ? 'Recording...' : 'Save Follow-up Entry'}
                    </button>
                  </div>
                </form>
              )}

              {/* Follow-up Logs List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  Follow-up Audit Log ({task.followUpLogs?.length || 0})
                </div>

                {!task.followUpLogs || task.followUpLogs.length === 0 ? (
                  <div
                    style={{
                      padding: '24px',
                      textAlign: 'center',
                      backgroundColor: '#f8fafc',
                      borderRadius: '8px',
                      color: '#64748b',
                      fontSize: '13px',
                    }}
                  >
                    No follow-ups recorded yet. Click "Take Follow-up" above to log the first interaction.
                  </div>
                ) : (
                  task.followUpLogs
                    .slice()
                    .reverse()
                    .map((log, index) => {
                      const outcomeColors = {
                        on_track: { bg: '#dcfce7', text: '#15803d', label: 'On Track' },
                        milestone_reached: { bg: '#e0e7ff', text: '#4338ca', label: 'Milestone Reached' },
                        needs_attention: { bg: '#fef3c7', text: '#b45309', label: 'Needs Attention' },
                        roadblock: { bg: '#fee2e2', text: '#b91c1c', label: 'Roadblock' },
                        rescheduled: { bg: '#f1f5f9', text: '#475569', label: 'Rescheduled' },
                      };
                      const oStyle = outcomeColors[log.outcome] || outcomeColors.on_track;

                      return (
                        <div
                          key={log._id || index}
                          style={{
                            padding: '12px 16px',
                            backgroundColor: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  backgroundColor: oStyle.bg,
                                  color: oStyle.text,
                                  textTransform: 'uppercase',
                                }}
                              >
                                {oStyle.label}
                              </span>

                              <span style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>
                                Logged by {log.loggedBy?.firstName || 'Staff'} {log.loggedBy?.lastName || ''}
                              </span>
                            </div>

                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                              {new Date(log.loggedAt).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </span>
                          </div>

                          <div style={{ fontSize: '13px', color: '#334155' }}>"{log.remarks}"</div>

                          <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                            <span>
                              Progress: <strong>{log.previousProgress}% → {log.newProgress}%</strong>
                            </span>
                            {log.nextFollowUpDate && (
                              <span>
                                Next Scheduled Check:{' '}
                                <strong>
                                  {new Date(log.nextFollowUpDate).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </strong>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: QUERIES, GUIDELINES & DIRECTIVE CHAT BOX */}
          {activeTab === 'chat' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* 1. TRANSPARENCY & PARTICIPANTS HEADER */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
                  border: '1px solid #bfdbfe',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: '#dbeafe',
                      color: '#1d4ed8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>Transparent Directive & Queries Thread</span>
                      <span
                        style={{
                          fontSize: '10px',
                          background: '#dcfce7',
                          color: '#15803d',
                          border: '1px solid #86efac',
                          padding: '1px 6px',
                          borderRadius: '10px',
                          fontWeight: 800,
                          letterSpacing: '0.5px',
                        }}
                      >
                        ALL VISIBLE
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      Every query, guideline, and message is visible in real-time to the <strong>Taskforce Manager</strong>, <strong>Administrators</strong>, and all <strong>{allParticipants.length} assigned personnel</strong>.
                    </div>
                  </div>
                </div>

                {/* Participant badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  {allParticipants.slice(0, 4).map((p, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#1e293b',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
                      {p.name} <span style={{ fontSize: '9px', color: '#64748b' }}>({p.role})</span>
                    </span>
                  ))}
                  {allParticipants.length > 4 && (
                    <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 700, background: '#eff6ff', padding: '3px 8px', borderRadius: '12px' }}>
                      +{allParticipants.length - 4} more
                    </span>
                  )}
                </div>
              </div>

              {/* 2. CHAT CATEGORY FILTER TABS */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'all', label: `All Messages (${task.comments?.length || 0})` },
                    {
                      id: 'query',
                      label: `❓ Queries (${task.comments?.filter((c) => c.messageType === 'query').length || 0})`,
                      color: '#d97706',
                    },
                    {
                      id: 'guideline',
                      label: `📋 Guidelines (${task.comments?.filter((c) => c.messageType === 'guideline').length || 0})`,
                      color: '#0d9488',
                    },
                    {
                      id: 'md_note',
                      label: `👑 MD Notes (${task.comments?.filter((c) => c.isMDNote || c.messageType === 'md_note').length || 0})`,
                      color: '#ca8a04',
                    },
                  ].map((filterTab) => {
                    const isSelected = chatFilter === filterTab.id;
                    return (
                      <button
                        key={filterTab.id}
                        type="button"
                        onClick={() => setChatFilter(filterTab.id)}
                        style={{
                          background: isSelected ? '#0f172a' : '#ffffff',
                          color: isSelected ? '#ffffff' : filterTab.color || '#475569',
                          border: isSelected ? '1px solid #0f172a' : '1px solid #e2e8f0',
                          padding: '4px 10px',
                          borderRadius: '16px',
                          fontSize: '11px',
                          fontWeight: isSelected ? 800 : 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {filterTab.label}
                      </button>
                    );
                  })}
                </div>

                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  Press Enter to send • Shift+Enter for new line
                </span>
              </div>

              {/* 3. MESSAGES CHAT FEED (THREAD CONTAINER) */}
              <div
                style={{
                  height: '340px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  padding: '16px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
                }}
              >
                {filteredComments.length === 0 ? (
                  <div style={{ margin: 'auto', textAlign: 'center', padding: '30px 20px', color: '#94a3b8' }}>
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: '#eff6ff',
                        color: '#3b82f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 10px',
                        fontSize: '20px',
                      }}
                    >
                      <MessageSquare size={22} />
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}>
                      {chatFilter === 'all'
                        ? 'No task communication messages yet'
                        : `No ${chatFilter} messages found`}
                    </div>
                    <div style={{ fontSize: '12px', marginTop: '4px', maxWidth: '380px' }}>
                      Use the chat box below to ask queries, share site guidelines, or communicate with the team. Everything is transparent to managers and assigned members.
                    </div>
                  </div>
                ) : (
                  filteredComments.map((comment, index) => {
                    const senderId = comment.sender?._id || comment.sender;
                    const myId = currentUser?._id || currentUser?.id;
                    const isMe = Boolean(senderId && myId && senderId.toString() === myId.toString());

                    const senderName = comment.sender?.firstName
                      ? `${comment.sender.firstName} ${comment.sender.lastName || ''}`.trim()
                      : comment.sender?.username || 'Staff Member';

                    const roleBadge = getSenderRoleBadge(comment.sender);
                    const isQuery = comment.messageType === 'query';
                    const isGuideline = comment.messageType === 'guideline';
                    const isMD = comment.isMDNote || comment.messageType === 'md_note';

                    // Avatar initials
                    const initials = senderName
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase() || 'U';

                    return (
                      <div
                        key={comment._id || index}
                        style={{
                          display: 'flex',
                          flexDirection: isMe ? 'row-reverse' : 'row',
                          alignItems: 'flex-start',
                          gap: '10px',
                          maxWidth: '85%',
                          alignSelf: isMe ? 'flex-end' : 'flex-start',
                        }}
                      >
                        {/* Avatar */}
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: isMe
                              ? '#005bbf'
                              : isMD
                              ? '#ca8a04'
                              : isQuery
                              ? '#d97706'
                              : isGuideline
                              ? '#0d9488'
                              : '#475569',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 800,
                            flexShrink: 0,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          }}
                        >
                          {initials}
                        </div>

                        {/* Message Bubble */}
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isMe ? 'flex-end' : 'flex-start',
                          }}
                        >
                          {/* Sender name & role info */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              marginBottom: '3px',
                              fontSize: '11px',
                            }}
                          >
                            <span style={{ fontWeight: 700, color: isMe ? '#005bbf' : '#1e293b' }}>
                              {isMe ? 'You' : senderName}
                            </span>
                            <span
                              style={{
                                fontSize: '9px',
                                fontWeight: 800,
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: roleBadge.bg,
                                color: roleBadge.color,
                              }}
                            >
                              {roleBadge.label}
                            </span>
                            <span style={{ color: '#94a3b8', fontSize: '10px' }}>
                              {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {/* Bubble Body */}
                          <div
                            style={{
                              padding: '10px 14px',
                              borderRadius: isMe ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
                              background: isMe
                                ? isMD
                                  ? 'linear-gradient(135deg, #ca8a04, #a16207)'
                                  : isQuery
                                  ? 'linear-gradient(135deg, #d97706, #b45309)'
                                  : isGuideline
                                  ? 'linear-gradient(135deg, #0d9488, #0f766e)'
                                  : 'linear-gradient(135deg, #005bbf, #0284c7)'
                                : isMD
                                ? '#fefce8'
                                : isQuery
                                ? '#fffbeb'
                                : isGuideline
                                ? '#f0fdfa'
                                : '#ffffff',
                              color: isMe ? '#ffffff' : '#1e293b',
                              border: isMe
                                ? 'none'
                                : isMD
                                ? '1px solid #fef08a'
                                : isQuery
                                ? '1px solid #fde68a'
                                : isGuideline
                                ? '1px solid #99f6e4'
                                : '1px solid #e2e8f0',
                              boxShadow: isMe
                                ? '0 3px 10px rgba(0, 91, 191, 0.2)'
                                : '0 2px 6px rgba(0,0,0,0.04)',
                            }}
                          >
                            {/* Category Indicator Tag */}
                            {(isQuery || isGuideline || isMD) && (
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  marginBottom: '5px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background: isMe
                                    ? 'rgba(255,255,255,0.2)'
                                    : isMD
                                    ? '#fef08a'
                                    : isQuery
                                    ? '#fde68a'
                                    : '#ccfbf1',
                                  color: isMe
                                    ? '#ffffff'
                                    : isMD
                                    ? '#854d0e'
                                    : isQuery
                                    ? '#92400e'
                                    : '#0f766e',
                                }}
                              >
                                {isMD ? (
                                  <>
                                    <Sparkles size={11} /> MD DIRECTIVE NOTE
                                  </>
                                ) : isQuery ? (
                                  <>
                                    <span>❓</span> TASK QUERY / CLARIFICATION
                                  </>
                                ) : (
                                  <>
                                    <span>📋</span> WORK GUIDELINE / SOP
                                  </>
                                )}
                              </div>
                            )}

                            <div style={{ fontSize: '13px', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                              {comment.message}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={commentsEndRef} />
              </div>

              {/* 4. MESSAGE TYPE SELECTOR & PROMPT TEMPLATES */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Tag Message As:</span>
                    {[
                      { type: 'chat', label: '💬 General Chat', color: '#005bbf' },
                      { type: 'query', label: '❓ Task Query', color: '#d97706' },
                      { type: 'guideline', label: '📋 Work Guideline', color: '#0d9488' },
                      { type: 'md_note', label: '👑 MD Note', color: '#ca8a04' },
                    ].map((btn) => {
                      const isActive = chatMessageType === btn.type;
                      return (
                        <button
                          key={btn.type}
                          type="button"
                          onClick={() => {
                            setChatMessageType(btn.type);
                            setIsMDNote(btn.type === 'md_note');
                          }}
                          style={{
                            background: isActive ? btn.color : '#f1f5f9',
                            color: isActive ? '#ffffff' : '#475569',
                            border: isActive ? `1px solid ${btn.color}` : '1px solid #cbd5e1',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: isActive ? 800 : 600,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {btn.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Clear prompt */}
                  {chatMessage && (
                    <button
                      type="button"
                      onClick={() => setChatMessage('')}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '11px', cursor: 'pointer' }}
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Quick guideline / query clickable suggestions */}
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
                  {[
                    { label: '❓ Need specs clarification', text: 'Please clarify specifications and measurements before proceeding.', type: 'query' },
                    { label: '❓ Site access clearance', text: 'Site access is currently obstructed, awaiting supervisor clearance.', type: 'query' },
                    { label: '📋 Safety & Snagging SOP', text: 'Reminder: Follow mandatory safety gear guidelines and inspect snag points thoroughly.', type: 'guideline' },
                    { label: '📋 Proofs required', text: 'Please upload verified before and after work evidence photos upon completion.', type: 'guideline' },
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setChatMessage(chip.text);
                        setChatMessageType(chip.type);
                        setIsMDNote(false);
                      }}
                      style={{
                        background: '#ffffff',
                        border: '1px dashed #cbd5e1',
                        borderRadius: '12px',
                        padding: '2px 8px',
                        fontSize: '10px',
                        fontWeight: 600,
                        color: '#475569',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                      title={chip.text}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                {/* 5. INTERACTIVE INPUT BOX & SEND BUTTON */}
                <form onSubmit={handleSendComment} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ position: 'relative' }}>
                    <textarea
                      rows={2}
                      style={{
                        width: '100%',
                        minHeight: '68px',
                        fontSize: '13px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border:
                          chatMessageType === 'query'
                            ? '1px solid #f59e0b'
                            : chatMessageType === 'guideline'
                            ? '1px solid #14b8a6'
                            : chatMessageType === 'md_note'
                            ? '1px solid #eab308'
                            : '1px solid #cbd5e1',
                        background:
                          chatMessageType === 'query'
                            ? '#fffbeb'
                            : chatMessageType === 'guideline'
                            ? '#f0fdfa'
                            : chatMessageType === 'md_note'
                            ? '#fefce8'
                            : '#ffffff',
                        resize: 'vertical',
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                      placeholder={
                        chatMessageType === 'query'
                          ? 'Ask a query or question regarding this task (visible to team lead, manager & crew)...'
                          : chatMessageType === 'guideline'
                          ? 'Post an execution guideline or standard instruction for this task...'
                          : chatMessageType === 'md_note'
                          ? 'Post a senior management MD directive note for the team...'
                          : 'Type a message or update for this task (transparent to all assigned crew & managers)...'
                      }
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendComment(e);
                        }
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748b' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                      <span>Real-time thread broadcast to Taskforce Manager, Admin & Allocated Crew</span>
                    </div>

                    <button
                      type="submit"
                      disabled={submittingChat || !chatMessage.trim()}
                      style={{
                        padding: '8px 22px',
                        fontSize: '12px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor:
                          chatMessageType === 'query'
                            ? '#d97706'
                            : chatMessageType === 'guideline'
                            ? '#0d9488'
                            : chatMessageType === 'md_note'
                            ? '#ca8a04'
                            : '#005bbf',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        opacity: submittingChat || !chatMessage.trim() ? 0.5 : 1,
                        cursor: submittingChat || !chatMessage.trim() ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                      }}
                    >
                      {submittingChat ? (
                        <span>Sending...</span>
                      ) : (
                        <>
                          <Send size={13} />
                          {chatMessageType === 'query'
                            ? 'Post Query'
                            : chatMessageType === 'guideline'
                            ? 'Post Guideline'
                            : chatMessageType === 'md_note'
                            ? 'Post MD Note'
                            : 'Send Message'}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: DETAILS & PERSONNEL */}
          {activeTab === 'details' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Scope of Work */}
              <div
                style={{
                  padding: '14px',
                  borderRadius: '8px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Scope of Work & Deliverables
                </div>
                <div style={{ fontSize: '13px', color: '#1e293b', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                  {task.description || 'No detailed scope provided.'}
                </div>
              </div>

              {/* Assigned Team Members Grid */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Allocated Personnel ({task.assignedTo?.length || 0})
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
                  {(task.assignedTo || []).filter(Boolean).map((staff, idx) => {
                    const staffObj = typeof staff === 'object' && staff !== null ? staff : {};
                    const fName = staffObj.firstName || '';
                    const lName = staffObj.lastName || '';
                    const initials = ((fName[0] || '') + (lName[0] || '') || (typeof staff === 'string' ? 'U' : '?')).toUpperCase();
                    return (
                      <div
                        key={staffObj._id || idx}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          backgroundColor: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                        }}
                      >
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            backgroundColor: '#005bbf',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '12px',
                          }}
                        >
                          {initials}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                            {fName || lName ? `${fName} ${lName}`.trim() : (staffObj.username || 'Staff Member')}
                          </div>
                          {staff.mobileNo && (
                            <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Phone size={10} /> {staff.mobileNo}
                            </div>
                          )}
                          {staff.email && (
                            <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Mail size={10} /> {staff.email}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Assigned Taskforce Hierarchy Members */}
                {task.assignedMembers && task.assignedMembers.length > 0 && (
                  <div style={{ marginTop: '14px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Assigned Taskforce Hierarchy Members ({task.assignedMembers.length})
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
                      {task.assignedMembers.map((m) => {
                        const tierBadge =
                          m.hierarchyLevel === 'head'
                            ? { label: 'HEAD', bg: '#fef3c7', color: '#92400e' }
                            : m.hierarchyLevel === 'supervisor'
                            ? { label: 'SUPERVISOR', bg: '#eff6ff', color: '#1d4ed8' }
                            : { label: 'HELPER', bg: '#f1f5f9', color: '#334155' };
                        return (
                          <div
                            key={m._id}
                            style={{
                              padding: '10px 12px',
                              borderRadius: '8px',
                              border: '1px solid #e2e8f0',
                              backgroundColor: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                            }}
                          >
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                backgroundColor: tierBadge.bg,
                                color: tierBadge.color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '12px',
                              }}
                            >
                              {m.fullName?.charAt(0) || 'M'}
                            </div>
                            <div style={{ overflow: 'hidden', flex: 1 }}>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>{m.fullName}</span>
                                <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '4px', backgroundColor: tierBadge.bg, color: tierBadge.color, fontWeight: 700 }}>
                                  {tierBadge.label}
                                </span>
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>
                                {m.department || m.trade || m.role || 'Field Personnel'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Apartment & Timeline Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    Created By
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
                    {task.assignedBy?.firstName} {task.assignedBy?.lastName} ({task.assignedBy?.username})
                  </div>
                </div>

                <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    Target Completion Deadline
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: task.dueDate ? '#0f172a' : '#64748b', marginTop: '2px' }}>
                    {task.dueDate
                      ? new Date(task.dueDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : 'No deadline set'}
                  </div>
                </div>
              </div>

              {/* Audit trail */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Activity Audit Trail ({task.auditTrail?.length || 0})
                </div>
                <div style={{ maxHeight: '140px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px', backgroundColor: '#fafbfc' }}>
                  {(task.auditTrail || [])
                    .slice()
                    .reverse()
                    .map((item, idx) => (
                      <div key={idx} style={{ fontSize: '11px', color: '#475569', padding: '4px 0', borderBottom: '1px solid #edeef0' }}>
                        <strong style={{ color: '#0f172a' }}>{item.action}</strong> • {item.details} •{' '}
                        <span style={{ color: '#94a3b8' }}>{new Date(item.timestamp).toLocaleString()}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: WORK EVIDENCE & PROOF OF PROGRESS */}
          {activeTab === 'uploads' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Upload Evidence Box */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '16px',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Camera size={16} color="#005bbf" />
                  Upload Field Work Evidence / Progress Proof
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '14px' }}>
                  Attach before/after photos or site inspection proofs for verification across supervisor and head dashboards.
                </div>

                <form onSubmit={handleProofSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                        Work Stage
                      </label>
                      <select
                        value={proofStage}
                        onChange={(e) => setProofStage(e.target.value)}
                        className="form-control"
                        style={{ fontSize: '12px', padding: '7px 10px' }}
                      >
                        <option value="before">Pre-Work / Initial State</option>
                        <option value="in_progress">In Progress</option>
                        <option value="after">Completed / Post-Work</option>
                        <option value="milestone">Milestone / Quality Check</option>
                        <option value="other">General / Reference</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                        File (Any Photo, Video, Audio, PDF, Document, or File)
                      </label>
                      <input
                        id="task-proof-file-input"
                        type="file"
                        accept="*/*"
                        onChange={(e) => setSelectedProofFile(e.target.files[0] || null)}
                        className="form-control"
                        style={{ fontSize: '12px', padding: '5px 10px' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Caption / Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={proofCaption}
                      onChange={(e) => setProofCaption(e.target.value)}
                      placeholder="e.g., Repaired plumbing joint in master washroom, verified no leaks"
                      className="form-control"
                      style={{ fontSize: '12px', padding: '7px 10px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="submit"
                      disabled={uploadingProof || !selectedProofFile}
                      className="btn-primary"
                      style={{
                        padding: '7px 18px',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        opacity: uploadingProof || !selectedProofFile ? 0.5 : 1,
                        cursor: uploadingProof || !selectedProofFile ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <UploadCloud size={14} />
                      {uploadingProof ? 'Uploading Proof...' : 'Upload Work Evidence'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Evidence Gallery */}
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Uploaded Evidence Vault ({task.uploads?.length || 0})</span>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 400 }}>
                    Scoping filtered according to Taskforce Hierarchy
                  </span>
                </div>

                {!task.uploads || task.uploads.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '36px 16px',
                      border: '2px dashed #e2e8f0',
                      borderRadius: '10px',
                      backgroundColor: '#fafbfc',
                      color: '#64748b',
                    }}
                  >
                    <Camera size={36} color="#94a3b8" style={{ marginBottom: '8px' }} />
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>No work proofs uploaded yet</div>
                    <div style={{ fontSize: '11px', marginTop: '2px' }}>
                      Helpers, supervisors, and heads can upload site photos or inspection records above.
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '14px' }}>
                    {task.uploads.map((up) => {
                      const isImage = up.fileType?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(up.fileName || up.fileUrl || '');
                      const fullUrl = getFullProofUrl(up.fileUrl);
                      const stageLabels = {
                        before: { label: 'Pre-Work', bg: '#fef3c7', color: '#92400e' },
                        in_progress: { label: 'In Progress', bg: '#eff6ff', color: '#1d4ed8' },
                        after: { label: 'Completed', bg: '#dcfce7', color: '#15803d' },
                        completed: { label: 'Completed', bg: '#dcfce7', color: '#15803d' },
                        milestone: { label: 'Milestone', bg: '#f3e8ff', color: '#7e22ce' },
                        inspection: { label: 'Inspection', bg: '#e0e7ff', color: '#3730a3' },
                        proof: { label: 'Evidence', bg: '#f1f5f9', color: '#334155' },
                        other: { label: 'General', bg: '#f1f5f9', color: '#475569' },
                      };
                      const stageStyle = stageLabels[up.stage] || stageLabels.other;

                      const roleLabels = {
                        helper: { label: 'HELPER', bg: '#f1f5f9', color: '#334155' },
                        supervisor: { label: 'SUPERVISOR', bg: '#eff6ff', color: '#1d4ed8' },
                        head: { label: 'HEAD', bg: '#fef3c7', color: '#92400e' },
                        taskforce_manager: { label: 'MANAGER', bg: '#fdf2f8', color: '#9d174d' },
                        manager: { label: 'MANAGER', bg: '#fdf2f8', color: '#9d174d' },
                        admin: { label: 'ADMIN', bg: '#fdf2f8', color: '#9d174d' },
                        super_admin: { label: 'ADMIN', bg: '#fdf2f8', color: '#9d174d' },
                      };
                      const roleStyle = roleLabels[up.uploaderRole] || { label: (up.uploaderRole || 'MEMBER').toUpperCase(), bg: '#f1f5f9', color: '#475569' };

                      return (
                        <div
                          key={up._id}
                          style={{
                            border: '1px solid #e2e8f0',
                            borderRadius: '10px',
                            backgroundColor: '#ffffff',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                          }}
                        >
                          {/* Visual Thumbnail */}
                          <div
                            style={{
                              height: '140px',
                              backgroundColor: '#0f172a',
                              position: 'relative',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              overflow: 'hidden',
                            }}
                            onClick={() => window.open(fullUrl, '_blank')}
                            title="Click to view full image in new tab"
                          >
                            {isImage ? (
                              <>
                                <img
                                  src={fullUrl}
                                  alt={up.caption || up.remarks || up.fileName || 'Proof image'}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const next = e.currentTarget.nextElementSibling;
                                    if (next) next.style.display = 'flex';
                                  }}
                                />
                                <div style={{ display: 'none', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', color: '#94a3b8', gap: '4px' }}>
                                  <FileImage size={32} />
                                  <span style={{ fontSize: '11px', fontWeight: 600 }}>Image preview unavailable</span>
                                </div>
                              </>
                            ) : up.fileType === 'pdf' || (up.fileName && /\.pdf$/i.test(up.fileName)) ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#f87171', gap: '6px' }}>
                                <FileText size={36} color="#ef4444" />
                                <span style={{ fontSize: '11px', color: '#fca5a5', fontWeight: 700 }}>PDF Document</span>
                              </div>
                            ) : up.fileType === 'video' || (up.fileName && /\.(mp4|mov|avi|webm)$/i.test(up.fileName)) ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#60a5fa', gap: '6px' }}>
                                <Film size={36} color="#3b82f6" />
                                <span style={{ fontSize: '11px', color: '#93c5fd', fontWeight: 700 }}>Video File</span>
                              </div>
                            ) : up.fileType === 'audio' || (up.fileName && /\.(mp3|wav|m4a|aac)$/i.test(up.fileName)) ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#34d399', gap: '6px' }}>
                                <Music size={36} color="#10b981" />
                                <span style={{ fontSize: '11px', color: '#6ee7b7', fontWeight: 700 }}>Audio Note</span>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#94a3b8', gap: '6px' }}>
                                <FileImage size={36} />
                                <span style={{ fontSize: '11px', color: '#cbd5e1' }}>
                                  {up.fileName?.split('.').pop()?.toUpperCase() || 'DOCUMENT'} File
                                </span>
                              </div>
                            )}

                            {/* Stage Badge on Top Left */}
                            <span
                              style={{
                                position: 'absolute',
                                top: '8px',
                                left: '8px',
                                backgroundColor: stageStyle.bg,
                                color: stageStyle.color,
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '12px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                              }}
                            >
                              {stageStyle.label}
                            </span>

                            {/* View external button */}
                            <span
                              style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                backgroundColor: 'rgba(0,0,0,0.6)',
                                color: '#ffffff',
                                borderRadius: '6px',
                                padding: '4px',
                                display: 'flex',
                              }}
                            >
                              <ExternalLink size={12} />
                            </span>
                          </div>

                          {/* Info Content */}
                          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                            {(up.caption || up.remarks) && (
                              <div style={{ fontSize: '12px', color: '#0f172a', fontWeight: 600 }}>
                                "{up.caption || up.remarks}"
                              </div>
                            )}

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginTop: 'auto', paddingTop: '4px', borderTop: '1px solid #f1f5f9' }}>
                              <div style={{ overflow: 'hidden' }}>
                                <div style={{ fontSize: '11px', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span>{up.uploadedBy?.firstName ? `${up.uploadedBy.firstName} ${up.uploadedBy.lastName || ''}`.trim() : (up.uploaderName || 'Team Member')}</span>
                                  <span
                                    style={{
                                      fontSize: '9px',
                                      fontWeight: 700,
                                      padding: '1px 5px',
                                      borderRadius: '4px',
                                      backgroundColor: roleStyle.bg,
                                      color: roleStyle.color,
                                    }}
                                  >
                                    {roleStyle.label}
                                  </span>
                                </div>
                                <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                                  {new Date(up.uploadedAt).toLocaleString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDeleteProof(up._id)}
                                style={{
                                  padding: '4px 6px',
                                  border: '1px solid #fecaca',
                                  background: '#fef2f2',
                                  color: '#dc2626',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                }}
                                title="Delete proof"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              borderTop: '1px solid #edeef0',
              paddingTop: '12px',
            }}
          >
            <button type="button" className="btn-secondary" onClick={onClose} style={{ padding: '6px 18px', fontSize: '13px' }}>
              Close Window
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
