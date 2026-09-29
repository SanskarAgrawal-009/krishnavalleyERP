import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { taskService } from '../../services/taskService.js';
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
  Flag
} from 'lucide-react';

export const TaskDetailModal = ({
  isOpen,
  onClose,
  taskId,
  onTaskUpdated,
  onEditTask,
}) => {
  const { showToast } = useToast();
  const { user: currentUser } = useAuth();

  const [loading, setLoading] = useState(false);
  const [task, setTask] = useState(null);
  const [activeTab, setActiveTab] = useState('followups'); // 'followups', 'chat', 'details'

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

  // Communication / Chat State
  const [chatMessage, setChatMessage] = useState('');
  const [isMDNote, setIsMDNote] = useState(false);
  const [submittingChat, setSubmittingChat] = useState(false);

  useEffect(() => {
    if (isOpen && taskId) {
      loadTaskDetails();
    }
  }, [isOpen, taskId]);

  const loadTaskDetails = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };

  const handleProgressSave = async (newVal) => {
    try {
      setSavingProgress(true);
      const val = typeof newVal === 'number' ? newVal : progressVal;
      await taskService.updateProgress(task._id, { progress: val });
      showToast(`Progress updated to ${val}%`, 'success');
      loadTaskDetails();
      if (onTaskUpdated) onTaskUpdated();
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
        if (onTaskUpdated) onTaskUpdated();
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
      loadTaskDetails();
      if (onTaskUpdated) onTaskUpdated();
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
      loadTaskDetails();
      if (onTaskUpdated) onTaskUpdated();
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
      loadTaskDetails();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      showToast(err.message || 'Failed to record follow-up', 'error');
    } finally {
      setSubmittingFollowUp(false);
    }
  };

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    try {
      setSubmittingChat(true);
      await taskService.addComment(task._id, {
        message: chatMessage.trim(),
        isMDNote,
      });
      setChatMessage('');
      loadTaskDetails();
    } catch (err) {
      showToast(err.message || 'Failed to post message', 'error');
    } finally {
      setSubmittingChat(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to permanently delete this task?')) {
      try {
        await taskService.deleteTask(task._id);
        showToast('Task removed successfully', 'success');
        onClose();
        if (onTaskUpdated) onTaskUpdated();
      } catch (err) {
        showToast(err.message || 'Failed to delete task', 'error');
      }
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
      {loading || !task ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          Loading task details & communication logs...
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
              Communication & Directives ({task.comments?.length || 0})
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

          {/* TAB 2: COMMUNICATION & DIRECTIVES */}
          {activeTab === 'chat' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Messages feed */}
              <div
                style={{
                  maxHeight: '320px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  padding: '8px',
                  backgroundColor: '#fafbfc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                }}
              >
                {!task.comments || task.comments.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                    No communication messages posted yet. Post updates or directives below.
                  </div>
                ) : (
                  task.comments.map((comment, index) => {
                    return (
                      <div
                        key={comment._id || index}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '8px',
                          backgroundColor: comment.isMDNote ? '#fefce8' : '#ffffff',
                          border: comment.isMDNote ? '1px solid #fef08a' : '1px solid #e2e8f0',
                          boxShadow: comment.isMDNote ? '0 2px 8px rgba(202, 138, 4, 0.1)' : '0 1px 3px rgba(0,0,0,0.02)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {comment.isMDNote && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  backgroundColor: '#ca8a04',
                                  color: '#ffffff',
                                  padding: '2px 6px',
                                  borderRadius: '10px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                              >
                                <Sparkles size={10} /> MD NOTE
                              </span>
                            )}
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                              {comment.sender?.firstName || 'Staff'} {comment.sender?.lastName || ''}
                            </span>
                          </div>

                          <span style={{ fontSize: '11px', color: '#64748b' }}>
                            {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <div style={{ fontSize: '13px', color: '#334155', whiteSpace: 'pre-wrap' }}>
                          {comment.message}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Post comment input box */}
              <form onSubmit={handleSendComment} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <textarea
                  className="search-input"
                  rows={2}
                  style={{ width: '100%', height: '60px', fontSize: '13px', padding: '8px' }}
                  placeholder="Post directive, update, or roadblock comment..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#854d0e', cursor: 'pointer', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={isMDNote}
                      onChange={(e) => setIsMDNote(e.target.checked)}
                      style={{ accentColor: '#ca8a04', cursor: 'pointer' }}
                    />
                    Highlight as Senior Management / MD Directive Note
                  </label>

                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={submittingChat || !chatMessage.trim()}
                    style={{
                      padding: '6px 18px',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: isMDNote ? '#ca8a04' : '#005bbf',
                    }}
                  >
                    <Send size={13} />
                    Post Update
                  </button>
                </div>
              </form>
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
