import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { taskforceMeetingService } from '../../services/taskforceMeetingService.js';
import { ScheduleMeetingModal } from './ScheduleMeetingModal.jsx';
import { MoMModal } from './MoMModal.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { canUserAssignTasks, extractRoleCode } from '../../utils/taskPermissions.js';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  FileText,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

const TYPE_CONFIG = {
  executive_review: { label: 'MD Directives', color: '#b45309', bg: '#fef3c7' },
  site_progress: { label: 'Site Review', color: '#0284c7', bg: '#e0f2fe' },
  department_sync: { label: 'Dept Sync', color: '#059669', bg: '#d1fae5' },
  emergency_huddle: { label: 'Roadblock', color: '#dc2626', bg: '#fee2e2' },
  vendor_alignment: { label: 'Vendor Sync', color: '#7c3aed', bg: '#ede9fe' },
  general: { label: 'General Sync', color: '#475569', bg: '#f1f5f9' },
};

export const UpcomingMeetingsWidget = ({ className = '', style = {} }) => {
  const navigate = useNavigate();
  const { user, userRole: authRole } = useAuth();
  const userRole = extractRoleCode(user, authRole);
  const canSchedule = canUserAssignTasks(user, userRole);

  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeetingId, setSelectedMeetingId] = useState(null);
  const [isMoMOpen, setIsMoMOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  const loadMyMeetings = async () => {
    try {
      setLoading(true);
      const res = await taskforceMeetingService.getMyUpcomingMeetings();
      if (res?.success && Array.isArray(res.data)) {
        setMeetings(res.data);
      }
    } catch (err) {
      console.warn('Error loading upcoming meetings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMyMeetings();

    const handleMeetingChanged = () => {
      loadMyMeetings();
    };

    window.addEventListener('meetingScheduled', handleMeetingChanged);
    window.addEventListener('meetingUpdated', handleMeetingChanged);
    window.addEventListener('momUpdated', handleMeetingChanged);

    return () => {
      window.removeEventListener('meetingScheduled', handleMeetingChanged);
      window.removeEventListener('meetingUpdated', handleMeetingChanged);
      window.removeEventListener('momUpdated', handleMeetingChanged);
    };
  }, []);

  const todayMeetings = meetings.filter((m) => m.isToday);

  const formatMeetingDate = (dateVal, isToday) => {
    if (isToday) return 'Today';
    if (!dateVal) return 'Upcoming';
    const d = new Date(dateVal);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (
      d.getDate() === tomorrow.getDate() &&
      d.getMonth() === tomorrow.getMonth() &&
      d.getFullYear() === tomorrow.getFullYear()
    ) {
      return 'Tomorrow';
    }
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div
      className={`upcoming-meetings-widget ${className}`}
      style={{
        background: '#ffffff',
        borderRadius: '14px',
        border: todayMeetings.length > 0 ? '1.5px solid #0d9488' : '1px solid #e2e8f0',
        padding: '20px 22px',
        boxShadow: todayMeetings.length > 0 ? '0 4px 16px rgba(13, 148, 136, 0.12)' : '0 1px 3px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        ...style,
      }}
    >
      {/* Widget Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: todayMeetings.length > 0 ? '#0f766e' : '#0284c7',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: todayMeetings.length > 0 ? '0 4px 10px rgba(15, 118, 110, 0.35)' : '0 2px 6px rgba(2, 132, 199, 0.25)',
            }}
          >
            <Calendar size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.01em' }}>
                My Scheduled Meetings
              </h2>
              {todayMeetings.length > 0 ? (
                <span
                  style={{
                    backgroundColor: '#ccfbf1',
                    color: '#0f766e',
                    border: '1px solid #99f6e4',
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '2px 9px',
                    borderRadius: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0d9488', display: 'inline-block' }}></span>
                  {todayMeetings.length} Meeting{todayMeetings.length > 1 ? 's' : ''} Today
                </span>
              ) : (
                <span
                  style={{
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                  }}
                >
                  {meetings.length} Scheduled
                </span>
              )}
            </div>
            <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              Meetings where you are an attendee or organizer. Visible to all attendees upon login.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={loadMyMeetings}
            disabled={loading}
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
            title="Refresh Meetings"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          {canSchedule && (
            <button
              type="button"
              onClick={() => setIsScheduleOpen(true)}
              style={{
                background: '#0d9488',
                color: '#ffffff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(13, 148, 136, 0.3)',
              }}
            >
              <Plus size={14} /> Schedule Meeting
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate('/taskforce?view=meetings')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#0284c7',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 8px',
            }}
          >
            All Meetings <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Meetings Grid / List */}
      {loading && meetings.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
          Loading your scheduled meetings...
        </div>
      ) : meetings.length === 0 ? (
        <div
          style={{
            background: '#f8fafc',
            border: '1px dashed #cbd5e1',
            borderRadius: '10px',
            padding: '24px 20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
            <Calendar size={18} />
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
            No Upcoming Meetings Scheduled
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', maxWidth: '420px' }}>
            When a meeting is scheduled with you as an attendee, it will automatically appear here with the exact date, time, venue, and attendees list.
          </div>
          {canSchedule && (
            <button
              type="button"
              onClick={() => setIsScheduleOpen(true)}
              style={{
                marginTop: '6px',
                background: '#0d9488',
                color: '#ffffff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Plus size={14} /> Schedule First Meeting
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '14px',
          }}
        >
          {meetings.slice(0, 6).map((m) => {
            const typeCfg = TYPE_CONFIG[m.meetingType] || TYPE_CONFIG.general;
            const isToday = m.isToday;
            const isSoon = m.isDueSoon;
            const attendeesList = m.attendees || [];
            const hasMoM = m.mom?.momStatus === 'published' || m.mom?.momStatus === 'approved';

            return (
              <div
                key={m._id}
                style={{
                  background: isToday ? '#f0fdfa' : '#ffffff',
                  border: isSoon ? '1.5px solid #0d9488' : isToday ? '1px solid #99f6e4' : '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                  boxShadow: isSoon ? '0 4px 12px rgba(13, 148, 136, 0.15)' : '0 1px 3px rgba(0,0,0,0.03)',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Header row: Code & Type & Alarm badge */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: isToday ? '#ccfbf1' : '#f1f5f9',
                          color: isToday ? '#0f766e' : '#475569',
                          border: '1px solid rgba(0,0,0,0.06)',
                        }}
                      >
                        {m.meetingCode || 'MTG'}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: typeCfg.bg,
                          color: typeCfg.color,
                        }}
                      >
                        {typeCfg.label}
                      </span>
                    </div>

                    {isSoon ? (
                      <span
                        style={{
                          background: '#fee2e2',
                          color: '#b91c1c',
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '10px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <Clock size={10} /> IN {Math.max(1, m.minutesRemaining || 0)} MINS
                      </span>
                    ) : isToday ? (
                      <span
                        style={{
                          background: '#ccfbf1',
                          color: '#0f766e',
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '10px',
                        }}
                      >
                        TODAY
                      </span>
                    ) : null}
                  </div>

                  {/* Title */}
                  <h3
                    style={{
                      margin: '0 0 6px 0',
                      fontSize: '14px',
                      fontWeight: 800,
                      color: '#0f172a',
                      lineHeight: 1.3,
                    }}
                  >
                    {m.title}
                  </h3>

                  {m.agenda && (
                    <p style={{ margin: '0 0 10px 0', fontSize: '11.5px', color: '#64748b', lineHeight: 1.4, maxHeight: '34px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {m.agenda}
                    </p>
                  )}

                  {/* Time & Venue Information Box */}
                  <div
                    style={{
                      background: isToday ? '#ffffff' : '#f8fafc',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    {/* Time & Date */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#0f172a', fontWeight: 700 }}>
                      <Clock size={14} color="#0d9488" />
                      <span>
                        {formatMeetingDate(m.scheduledDate, isToday)} • {m.startTime || '10:30'}{m.endTime ? ` - ${m.endTime}` : ''} ({m.durationMinutes || 45} mins)
                      </span>
                    </div>

                    {/* Venue / Location */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '11.5px', color: '#475569' }}>
                      <MapPin size={14} color="#2563eb" style={{ marginTop: '2px', flexShrink: 0 }} />
                      <span style={{ fontWeight: 600 }}>
                        <span style={{ color: '#64748b', fontWeight: 500 }}>Venue:</span> {m.venue || m.locationDetails || 'Site Operations Room'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Attendees Strip & Actions */}
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Attendees List preview */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#475569' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Users size={12} color="#64748b" />
                      <span style={{ fontWeight: 700 }}>
                        {attendeesList.length} Attendee{attendeesList.length !== 1 ? 's' : ''}:
                      </span>
                      <span style={{ color: '#64748b', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {attendeesList.map((a) => a.name || 'Member').join(', ')}
                      </span>
                    </div>

                    {hasMoM && (
                      <span style={{ color: '#15803d', fontWeight: 700, fontSize: '10.5px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <CheckCircle2 size={11} /> MoM Ready
                      </span>
                    )}
                  </div>

                  {/* Actions buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '2px' }}>
                    {m.meetingLink ? (
                      <a
                        href={m.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: '11.5px',
                          fontWeight: 700,
                          color: '#2563eb',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Video size={13} /> Join Virtual Link
                      </a>
                    ) : (
                      <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                        Organized by {m.organizerName || 'Executive'}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMeetingId(m._id);
                        setIsMoMOpen(true);
                      }}
                      style={{
                        background: hasMoM ? '#f0fdf4' : '#f8fafc',
                        border: hasMoM ? '1px solid #bbf7d0' : '1px solid #cbd5e1',
                        color: hasMoM ? '#166534' : '#1e293b',
                        padding: '5px 12px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <FileText size={12} color={hasMoM ? '#16a34a' : '#64748b'} />
                      {hasMoM ? 'View MoM' : 'Open MoM / Details'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MoM Modal */}
      {isMoMOpen && selectedMeetingId && (
        <MoMModal
          isOpen={isMoMOpen}
          onClose={() => {
            setIsMoMOpen(false);
            setSelectedMeetingId(null);
          }}
          meetingId={selectedMeetingId}
          onMoMUpdated={() => {
            loadMyMeetings();
            window.dispatchEvent(new CustomEvent('momUpdated'));
          }}
        />
      )}

      {/* Schedule Meeting Modal */}
      {isScheduleOpen && (
        <ScheduleMeetingModal
          isOpen={isScheduleOpen}
          onClose={() => setIsScheduleOpen(false)}
          onMeetingScheduled={(newMtg) => {
            loadMyMeetings();
            window.dispatchEvent(new CustomEvent('meetingScheduled', { detail: newMtg }));
          }}
        />
      )}
    </div>
  );
};

export default UpcomingMeetingsWidget;
