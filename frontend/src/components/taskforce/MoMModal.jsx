import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { taskforceMeetingService } from '../../services/taskforceMeetingService.js';
import { taskService } from '../../services/taskService.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  FileText,
  Calendar,
  Clock,
  Users,
  Plus,
  Trash2,
  Printer,
  ShieldCheck,
  Send,
  Save,
  Check,
  Zap,
  ExternalLink,
} from 'lucide-react';

export const MoMModal = ({
  isOpen,
  onClose,
  meetingId,
  onMoMUpdated,
  onOpenTaskDetail,
}) => {
  const { showToast } = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [convertingId, setConvertingId] = useState(null);
  const [meeting, setMeeting] = useState(null);
  const [staffList, setStaffList] = useState([]);

  // Streamlined MoM State
  const [discussionSummary, setDiscussionSummary] = useState('');
  const [actionItems, setActionItems] = useState([]);
  const [attendeesAttendance, setAttendeesAttendance] = useState([]);

  // Check if executive authorized to approve MoM
  const userRole = (user?.role || '').toLowerCase();
  const userPerms = (user?.permissions || user?.permissionCodes || []).map((p) =>
    typeof p === 'string' ? p : p.permissionCode
  );
  const canApprove =
    userRole === 'admin' ||
    userRole === 'super_admin' ||
    userRole === 'managing_director' ||
    userRole === 'md' ||
    userRole === 'taskforce_manager' ||
    userPerms.includes('tasks:manage');

  useEffect(() => {
    if (isOpen && meetingId) {
      loadMeetingData();
      loadStaff();
    }
  }, [isOpen, meetingId]);

  const loadMeetingData = async () => {
    try {
      setLoading(true);
      const res = await taskforceMeetingService.getMeetingById(meetingId);
      if (res?.success && res.data) {
        const m = res.data;
        setMeeting(m);

        // Combine summary and decisions seamlessly into discussionSummary
        let initialText = m.mom?.discussionSummary || '';
        if (m.mom?.keyDecisions?.length && !initialText.includes('Key Decisions:')) {
          initialText = (
            initialText +
            '\n\nKey Decisions:\n' +
            m.mom.keyDecisions.map((d) => `• ${d}`).join('\n')
          ).trim();
        }
        setDiscussionSummary(initialText);

        setActionItems(
          Array.isArray(m.mom?.actionItems)
            ? m.mom.actionItems.map((ai) => ({
                _id: ai._id,
                actionItemCode: ai.actionItemCode,
                title: ai.title || '',
                assignedTo: ai.assignedTo?._id || ai.assignedTo || '',
                assignedToName:
                  ai.assignedToName ||
                  (ai.assignedTo?.firstName ? `${ai.assignedTo.firstName} ${ai.assignedTo.lastName || ''}`.trim() : ''),
                dueDate: ai.dueDate ? new Date(ai.dueDate).toISOString().split('T')[0] : '',
                priority: ai.priority || 'medium',
                status: ai.status || 'pending',
                linkedTaskId: ai.linkedTaskId?._id || ai.linkedTaskId || null,
                linkedTaskCode: ai.linkedTaskCode || (ai.linkedTaskId?.taskCode || ''),
              }))
            : []
        );

        setAttendeesAttendance(
          Array.isArray(m.attendees)
            ? m.attendees.map((att) => ({
                id: att._id,
                name: att.name || (att.user ? `${att.user.firstName} ${att.user.lastName || ''}`.trim() : 'Staff'),
                department: att.department || 'general',
                isPresent: att.attendanceStatus === 'present' || att.attendanceStatus === 'confirmed',
              }))
            : []
        );
      } else {
        showToast(res?.message || 'Failed to load meeting details', 'error');
      }
    } catch (err) {
      console.error('Error fetching meeting details:', err);
      showToast('Error loading meeting details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadStaff = async () => {
    try {
      const res = await taskService.getAssigneesMeta();
      if (res?.success) {
        setStaffList(res.assignees || []);
      }
    } catch (err) {
      console.error('Error fetching staff list:', err);
    }
  };

  // Toggle Attendance: 1-click Present (Green) / Absent (Gray)
  const toggleAttendance = (attendeeId) => {
    setAttendeesAttendance((prev) =>
      prev.map((a) => (a.id === attendeeId ? { ...a, isPresent: !a.isPresent } : a))
    );
  };

  // Action Items
  const handleAddActionItem = () => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 5);

    setActionItems((prev) => [
      ...prev,
      {
        title: '',
        assignedTo: '',
        assignedToName: '',
        dueDate: defaultDate.toISOString().split('T')[0],
        priority: 'medium',
        status: 'pending',
        linkedTaskId: null,
        linkedTaskCode: '',
      },
    ]);
  };

  const handleUpdateActionItem = (index, field, value) => {
    setActionItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'assignedTo') {
        const found = staffList.find((s) => s._id?.toString() === value?.toString());
        if (found) {
          updated[index].assignedToName = `${found.firstName || ''} ${found.lastName || ''}`.trim();
        }
      }
      return updated;
    });
  };

  const handleRemoveActionItem = (index) => {
    setActionItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Convert Action Item to Task
  const handleConvertActionItem = async (item, index) => {
    if (!item._id) {
      showToast('Please click "Save Draft" first, then convert to task', 'warning');
      return;
    }

    try {
      setConvertingId(item._id);
      const res = await taskforceMeetingService.convertActionItemToTask(meetingId, item._id);
      if (res?.success) {
        showToast(res.message || 'Action item converted to Task!', 'success');
        setActionItems((prev) => {
          const next = [...prev];
          next[index] = {
            ...next[index],
            status: 'converted_to_task',
            linkedTaskId: res.task?._id,
            linkedTaskCode: res.task?.taskCode,
          };
          return next;
        });

        window.dispatchEvent(new CustomEvent('taskforceTaskUpdated'));
        if (onMoMUpdated) onMoMUpdated();
      } else {
        showToast(res?.message || 'Failed to convert to task', 'error');
      }
    } catch (err) {
      console.error('Error converting action item:', err);
      showToast('Failed to convert action item to task', 'error');
    } finally {
      setConvertingId(null);
    }
  };

  // Save MoM (Draft or Published)
  const handleSaveMoM = async (statusToSet = 'draft') => {
    try {
      setSaving(true);
      const payload = {
        momStatus: statusToSet,
        discussionSummary: discussionSummary.trim(),
        actionItems: actionItems.filter((ai) => ai.title && ai.title.trim()),
        attendeeAttendance: attendeesAttendance.map((a) => ({
          id: a.id,
          status: a.isPresent ? 'present' : 'absent',
        })),
      };

      const res = await taskforceMeetingService.saveMoM(meetingId, payload);
      if (res?.success) {
        showToast(
          statusToSet === 'published' ? 'MoM published successfully!' : 'Draft saved',
          'success'
        );
        setMeeting(res.data);
        if (onMoMUpdated) onMoMUpdated(res.data);
        window.dispatchEvent(new CustomEvent('taskforceTaskUpdated'));
      } else {
        showToast(res?.message || 'Failed to save MoM', 'error');
      }
    } catch (err) {
      console.error('Error saving MoM:', err);
      showToast('Error saving MoM', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Executive Sign-off
  const handleApproveMoM = async () => {
    if (!window.confirm('Sign off and officially approve this Minutes of Meeting?')) return;
    try {
      setSaving(true);
      const res = await taskforceMeetingService.approveMoM(meetingId, 'Approved by Executive Desk');
      if (res?.success) {
        showToast('MoM officially signed off & approved!', 'success');
        setMeeting(res.data);
        if (onMoMUpdated) onMoMUpdated(res.data);
      } else {
        showToast(res?.message || 'Failed to approve', 'error');
      }
    } catch (err) {
      console.error('Error approving MoM:', err);
      showToast('Error approving MoM', 'error');
    } finally {
      setSaving(false);
    }
  };

  const momStatus = meeting?.mom?.momStatus || 'pending';
  const isApproved = momStatus === 'approved';
  const presentCount = attendeesAttendance.filter((a) => a.isPresent).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="lg"
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
          Loading Minutes of Meeting...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Header Bar */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <span
                  style={{
                    backgroundColor: '#1e293b',
                    color: '#38bdf8',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  {meeting?.meetingCode || 'MTG'}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    backgroundColor: isApproved ? '#14532d' : momStatus === 'published' ? '#0369a1' : '#854d0e',
                    color: isApproved ? '#86efac' : momStatus === 'published' ? '#bae6fd' : '#fef08a',
                  }}
                >
                  {isApproved ? 'Approved' : momStatus === 'published' ? 'Published' : 'Draft'}
                </span>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>
                {meeting?.title}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                {meeting?.scheduledDate ? new Date(meeting.scheduledDate).toLocaleDateString() : ''} at {meeting?.startTime || '10:30'} • Organizer: {meeting?.organizerName || 'Executive'}
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              style={{
                backgroundColor: '#1e293b',
                color: '#e2e8f0',
                border: '1px solid #334155',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
              }}
            >
              <Printer size={13} /> Print MoM
            </button>
          </div>

          {/* 1. Quick Attendance Strip */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Users size={13} color="#005bbf" />
                Attendance ({presentCount} of {attendeesAttendance.length} Present)
              </label>
              <span style={{ fontSize: '10px', color: '#64748b' }}>Click name to toggle Present/Absent</span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {attendeesAttendance.map((att) => (
                <button
                  key={att.id}
                  type="button"
                  onClick={() => toggleAttendance(att.id)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '16px',
                    border: att.isPresent ? '1px solid #86efac' : '1px solid #cbd5e1',
                    backgroundColor: att.isPresent ? '#dcfce7' : '#f1f5f9',
                    color: att.isPresent ? '#15803d' : '#64748b',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {att.isPresent && <Check size={11} />}
                  {att.name}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Unified Discussion Notes & Key Decisions */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              Meeting Minutes, Discussion &amp; Key Decisions <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <textarea
              rows={6}
              placeholder="Record summary of discussion, site updates, technical roadblocks, and key executive decisions agreed upon..."
              value={discussionSummary}
              onChange={(e) => setDiscussionSummary(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                fontFamily: 'inherit',
                resize: 'vertical',
                lineHeight: '1.5',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* 3. Action Items (Deliverables with 1-click Task Conversion) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Zap size={13} color="#ca8a04" />
                Action Items ({actionItems.length})
              </label>
              <button
                type="button"
                onClick={handleAddActionItem}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: '#ca8a04',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Plus size={13} /> Add Item
              </button>
            </div>

            {actionItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', color: '#64748b', fontSize: '12px' }}>
                No action items added yet. Click "+ Add Item" to assign tasks to team members.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {actionItems.map((item, idx) => {
                  const isConverted = item.status === 'converted_to_task' || item.linkedTaskId;
                  return (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        backgroundColor: isConverted ? '#f0fdf4' : '#ffffff',
                        border: isConverted ? '1px solid #86efac' : '1px solid #cbd5e1',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>
                          #{idx + 1}
                        </span>
                        <input
                          type="text"
                          placeholder="Action item / deliverable..."
                          value={item.title}
                          onChange={(e) => handleUpdateActionItem(idx, 'title', e.target.value)}
                          style={{
                            flex: 1,
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '12px',
                            fontWeight: 600,
                            outline: 'none',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveActionItem(idx)}
                          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <select
                            value={item.assignedTo}
                            onChange={(e) => handleUpdateActionItem(idx, 'assignedTo', e.target.value)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              fontSize: '11px',
                              outline: 'none',
                              backgroundColor: '#ffffff',
                            }}
                          >
                            <option value="">Assignee...</option>
                            {staffList.map((s) => (
                              <option key={s._id} value={s._id}>
                                {s.firstName} {s.lastName}
                              </option>
                            ))}
                          </select>

                          <input
                            type="date"
                            value={item.dueDate}
                            onChange={(e) => handleUpdateActionItem(idx, 'dueDate', e.target.value)}
                            style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              fontSize: '11px',
                              outline: 'none',
                            }}
                          />
                        </div>

                        <div>
                          {isConverted ? (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  backgroundColor: '#dcfce7',
                                  color: '#15803d',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                }}
                              >
                                Task: {item.linkedTaskCode || 'TSK-ACTIVE'}
                              </span>
                              {onOpenTaskDetail && (
                                <button
                                  type="button"
                                  onClick={() => onOpenTaskDetail(item.linkedTaskId)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#0284c7',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '2px',
                                  }}
                                >
                                  View <ExternalLink size={10} />
                                </button>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleConvertActionItem(item, idx)}
                              disabled={convertingId === item._id}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                backgroundColor: '#16a34a',
                                color: '#ffffff',
                                border: 'none',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Zap size={11} />
                              {convertingId === item._id ? 'Converting...' : 'Convert to Task'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid #e2e8f0',
              paddingTop: '10px',
              marginTop: '4px',
            }}
          >
            <div>
              {canApprove && !isApproved && momStatus === 'published' && (
                <button
                  type="button"
                  onClick={handleApproveMoM}
                  disabled={saving}
                  style={{
                    backgroundColor: '#15803d',
                    color: '#ffffff',
                    border: 'none',
                    padding: '7px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <ShieldCheck size={13} /> Approve MoM
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                disabled={saving}
                style={{ padding: '7px 14px', fontSize: '12px', borderRadius: '6px' }}
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => handleSaveMoM('draft')}
                disabled={saving}
                style={{
                  padding: '7px 14px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                }}
              >
                <Save size={13} />
                {saving ? 'Saving...' : 'Save Draft'}
              </button>

              <button
                type="button"
                onClick={() => handleSaveMoM('published')}
                disabled={saving}
                style={{
                  padding: '7px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                }}
              >
                <Send size={13} />
                {saving ? 'Publishing...' : 'Publish MoM'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default MoMModal;
