import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { taskforceMeetingService } from '../../services/taskforceMeetingService.js';
import { taskService } from '../../services/taskService.js';
import { useToast } from '../../context/ToastContext.jsx';
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  Check,
  Plus,
  X,
  Search,
} from 'lucide-react';

// Streamlined 3 meeting types
const SIMPLE_TYPES = [
  { value: 'site_progress', label: 'Site Review', desc: 'Civil & Work Progress' },
  { value: 'executive_review', label: 'MD Directives', desc: 'Executive Priorities' },
  { value: 'department_sync', label: 'Department Sync', desc: 'Team Coordination' },
];

export const ScheduleMeetingModal = ({
  isOpen,
  onClose,
  onMeetingScheduled,
  initialMeeting = null,
}) => {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [staffList, setStaffList] = useState([]);

  // Streamlined Form State
  const [title, setTitle] = useState('');
  const [meetingType, setMeetingType] = useState('site_progress');
  const [scheduledDate, setScheduledDate] = useState('');
  const [startTime, setStartTime] = useState('10:30');
  const [locationDetails, setLocationDetails] = useState('Site Operations Room');
  const [agenda, setAgenda] = useState('');
  const [selectedAttendees, setSelectedAttendees] = useState([]);
  const [attendeeSearch, setAttendeeSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadStaff();
      if (initialMeeting) {
        setTitle(initialMeeting.title || '');
        setMeetingType(
          ['site_progress', 'executive_review', 'department_sync'].includes(initialMeeting.meetingType)
            ? initialMeeting.meetingType
            : 'site_progress'
        );
        setScheduledDate(
          initialMeeting.scheduledDate
            ? new Date(initialMeeting.scheduledDate).toISOString().split('T')[0]
            : ''
        );
        setStartTime(initialMeeting.startTime || '10:30');
        setLocationDetails(initialMeeting.locationDetails || initialMeeting.meetingLink || 'Site Operations Room');
        setAgenda(initialMeeting.agenda || '');
        setSelectedAttendees(
          Array.isArray(initialMeeting.attendees)
            ? initialMeeting.attendees.map((a) => ({
                user: a.user?._id || a.user || null,
                name: a.name || a.user?.firstName || 'Staff',
                department: a.department || 'general',
              }))
            : []
        );
      } else {
        setTitle('');
        setMeetingType('site_progress');
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setScheduledDate(tomorrow.toISOString().split('T')[0]);
        setStartTime('10:30');
        setLocationDetails('Site Operations Room');
        setAgenda('');
        setSelectedAttendees([]);
      }
      setAttendeeSearch('');
    }
  }, [isOpen, initialMeeting]);

  const loadStaff = async () => {
    try {
      const res = await taskService.getAssigneesMeta();
      if (res?.success) {
        setStaffList(res.assignees || []);
      }
    } catch (err) {
      console.error('Error loading staff list:', err);
    }
  };

  const toggleAttendee = (staff) => {
    const sId = staff._id?.toString();
    const exists = selectedAttendees.some((a) => (a.user?._id || a.user)?.toString() === sId);

    if (exists) {
      setSelectedAttendees((prev) =>
        prev.filter((a) => (a.user?._id || a.user)?.toString() !== sId)
      );
    } else {
      const name = `${staff.firstName || ''} ${staff.lastName || ''}`.trim() || staff.username;
      setSelectedAttendees((prev) => [
        ...prev,
        {
          user: staff._id,
          name,
          department: staff.department || 'general',
          role: staff.role || 'member',
          attendanceStatus: 'invited',
        },
      ]);
    }
  };

  const handleSelectAll = () => {
    if (selectedAttendees.length === staffList.length) {
      setSelectedAttendees([]);
    } else {
      setSelectedAttendees(
        staffList.map((s) => ({
          user: s._id,
          name: `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.username,
          department: s.department || 'general',
          role: s.role || 'member',
          attendanceStatus: 'invited',
        }))
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Please enter a meeting title', 'error');
      return;
    }
    if (!scheduledDate) {
      showToast('Please select a date', 'error');
      return;
    }

    try {
      setLoading(true);
      const isUrl = locationDetails.startsWith('http://') || locationDetails.startsWith('https://');

      const payload = {
        title: title.trim(),
        meetingType,
        scheduledDate,
        startTime: startTime || '10:30',
        locationType: isUrl ? 'virtual' : 'site_office',
        locationDetails: locationDetails.trim() || 'Site Operations Room',
        meetingLink: isUrl ? locationDetails.trim() : '',
        agenda: agenda.trim(),
        attendees: selectedAttendees,
      };

      let res;
      if (initialMeeting?._id) {
        res = await taskforceMeetingService.updateMeeting(initialMeeting._id, payload);
        showToast('Meeting updated', 'success');
      } else {
        res = await taskforceMeetingService.createMeeting(payload);
        showToast('Meeting scheduled', 'success');
      }

      if (res?.success) {
        if (onMeetingScheduled) onMeetingScheduled(res.data);
        onClose();
      } else {
        showToast(res?.message || 'Failed to schedule', 'error');
      }
    } catch (err) {
      console.error('Error scheduling meeting:', err);
      showToast(err.message || 'Error scheduling meeting', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredStaff = staffList.filter((s) => {
    if (!attendeeSearch.trim()) return true;
    const q = attendeeSearch.toLowerCase().trim();
    const name = `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase();
    const dept = (s.department || '').toLowerCase();
    return name.includes(q) || dept.includes(q);
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialMeeting ? 'Edit Meeting' : 'Schedule Meeting'}
      size="md"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* 1. Meeting Type Selector (3 Clean Cards) */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
            Meeting Type
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {SIMPLE_TYPES.map((t) => {
              const active = meetingType === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setMeetingType(t.value)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: active ? '2px solid #ca8a04' : '1px solid #cbd5e1',
                    backgroundColor: active ? '#fefce8' : '#ffffff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 700, color: active ? '#854d0e' : '#1e293b' }}>
                    {t.label}
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                    {t.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Title */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>
            Meeting Title / Subject <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Weekly Site Progress & Materials Review"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* 3. Date, Time & Venue in a simple 2-column grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>
              Date <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="date"
              required
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>
              Time
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* 4. Venue or Online Link (Single input) */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>
            Location or Online Meeting Link
          </label>
          <div style={{ position: 'relative' }}>
            <MapPin size={14} color="#64748b" style={{ position: 'absolute', left: '10px', top: '11px' }} />
            <input
              type="text"
              placeholder="e.g. Site Room 102 or Google Meet link..."
              value={locationDetails}
              onChange={(e) => setLocationDetails(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px 8px 30px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* 5. Agenda (Quick notes) */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>
            Agenda / Key Discussion Points (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="Key discussion topics or objectives for this sync..."
            value={agenda}
            onChange={(e) => setAgenda(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              outline: 'none',
              fontFamily: 'inherit',
              resize: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* 6. Attendees (Compact, Click-to-Select) */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Users size={13} color="#005bbf" />
              Attendees ({selectedAttendees.length} selected)
            </label>
            <button
              type="button"
              onClick={handleSelectAll}
              style={{
                background: 'none',
                border: 'none',
                color: '#005bbf',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {selectedAttendees.length === staffList.length ? 'Clear All' : 'Select All'}
            </button>
          </div>

          <div
            className="no-scrollbar"
            style={{
              maxHeight: '110px',
              overflowY: 'auto',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '6px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              backgroundColor: '#f8fafc',
            }}
          >
            {staffList.map((staff) => {
              const sId = staff._id?.toString();
              const isSelected = selectedAttendees.some(
                (a) => (a.user?._id || a.user)?.toString() === sId
              );

              return (
                <button
                  key={staff._id}
                  type="button"
                  onClick={() => toggleAttendee(staff)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '16px',
                    border: isSelected ? '1px solid #005bbf' : '1px solid #cbd5e1',
                    backgroundColor: isSelected ? '#005bbf' : '#ffffff',
                    color: isSelected ? '#ffffff' : '#334155',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.1s ease',
                  }}
                >
                  {isSelected && <Check size={11} />}
                  {staff.firstName} {staff.lastName || ''}
                </button>
              );
            })}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={loading}
            style={{ padding: '7px 16px', fontSize: '12px', borderRadius: '6px' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{
              padding: '7px 20px',
              fontSize: '12px',
              borderRadius: '6px',
              backgroundColor: '#ca8a04',
              color: '#ffffff',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {loading ? 'Saving...' : initialMeeting ? 'Save Changes' : 'Schedule Meeting'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ScheduleMeetingModal;
