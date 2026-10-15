import React, { useState, useEffect } from 'react';
import { taskforceMeetingService } from '../../services/taskforceMeetingService.js';
import { ScheduleMeetingModal } from './ScheduleMeetingModal.jsx';
import { MoMModal } from './MoMModal.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { canUserAssignTasks } from '../../utils/taskPermissions.js';
import {
  Calendar,
  Clock,
  Users,
  Search,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileText,
  MapPin,
  Download,
  Printer,
  ShieldCheck,
  Zap,
  Trash2,
  Edit2,
  RotateCcw,
} from 'lucide-react';

const TYPE_CONFIG = {
  executive_review: { label: 'MD Directives', color: '#b45309', bg: '#fef3c7' },
  site_progress: { label: 'Site Review', color: '#0284c7', bg: '#e0f2fe' },
  department_sync: { label: 'Dept Sync', color: '#059669', bg: '#d1fae5' },
  emergency_huddle: { label: 'Roadblock', color: '#dc2626', bg: '#fee2e2' },
  vendor_alignment: { label: 'Vendor Sync', color: '#7c3aed', bg: '#ede9fe' },
  general: { label: 'General Sync', color: '#475569', bg: '#f1f5f9' },
};

/**
 * Clean printable/downloadable MoM letterhead viewer
 */
export const downloadMeetingMoMPDF = (meeting) => {
  if (!meeting) return;
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to download or print the MoM PDF.');
    return;
  }

  const dateFormatted = meeting.scheduledDate
    ? new Date(meeting.scheduledDate).toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'N/A';

  const attendeesHtml = (meeting.attendees || [])
    .map(
      (a) =>
        `<tr>
          <td style="padding:6px 10px;border:1px solid #e2e8f0;font-weight:600;">${a.name}</td>
          <td style="padding:6px 10px;border:1px solid #e2e8f0;text-transform:capitalize;">${a.department || 'General'}</td>
          <td style="padding:6px 10px;border:1px solid #e2e8f0;font-weight:bold;color:${a.attendanceStatus === 'absent' ? '#dc2626' : '#16a34a'}">
            ${a.attendanceStatus === 'absent' ? 'Absent' : 'Present'}
          </td>
        </tr>`
    )
    .join('');

  const actionItemsHtml = (meeting.mom?.actionItems || [])
    .map(
      (ai, idx) =>
        `<tr>
          <td style="padding:6px 10px;border:1px solid #e2e8f0;font-weight:bold;">#${idx + 1}</td>
          <td style="padding:6px 10px;border:1px solid #e2e8f0;">${ai.title}</td>
          <td style="padding:6px 10px;border:1px solid #e2e8f0;">${ai.assignedToName || 'Unassigned'}</td>
          <td style="padding:6px 10px;border:1px solid #e2e8f0;">${ai.dueDate ? new Date(ai.dueDate).toLocaleDateString() : 'N/A'}</td>
          <td style="padding:6px 10px;border:1px solid #e2e8f0;color:#0284c7;font-weight:bold;">${ai.linkedTaskCode || 'Direct Task'}</td>
        </tr>`
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>MoM - ${meeting.meetingCode || 'MTG'} - ${meeting.title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 40px; font-size: 13px; line-height: 1.5; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
          h1 { margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 18px; background: #f8fafc; padding: 12px; border-radius: 6px; }
          .meta-item { font-size: 12px; }
          .meta-item strong { color: #475569; }
          h2 { font-size: 13px; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-top: 18px; margin-bottom: 8px; color: #1e293b; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 12px; }
          th { background: #f1f5f9; text-align: left; padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 600; }
          .content-box { background: #ffffff; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; white-space: pre-wrap; font-size: 12px; line-height: 1.6; }
          .sig-box { margin-top: 36px; display: flex; justify-content: space-between; }
          .sig-line { width: 200px; border-top: 1px solid #0f172a; text-align: center; font-size: 11px; padding-top: 4px; }
          .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; }
          @media print { body { margin: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>Krishna Valley Real Estate</h1>
            <div style="font-size: 12px; color: #64748b;">Taskforce Operations • Minutes of Meeting (MoM)</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 15px; font-weight: bold; color: #0284c7;">${meeting.meetingCode || 'MTG'}</div>
            <div style="font-size: 11px; color: #64748b;">Status: ${(meeting.mom?.momStatus || 'Draft').toUpperCase()}</div>
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-item"><strong>Meeting Title:</strong> ${meeting.title}</div>
          <div class="meta-item"><strong>Date:</strong> ${dateFormatted}</div>
          <div class="meta-item"><strong>Time & Venue:</strong> ${meeting.startTime || '10:30'} • ${meeting.locationDetails || 'Site Operations'}</div>
          <div class="meta-item"><strong>Organizer:</strong> ${meeting.organizerName || 'Executive Desk'}</div>
        </div>

        <h2>1. Attendance Verification</h2>
        <table>
          <thead>
            <tr><th>Attendee Name</th><th>Department</th><th>Attendance</th></tr>
          </thead>
          <tbody>
            ${attendeesHtml || '<tr><td colspan="3" style="padding:8px;">No attendees listed</td></tr>'}
          </tbody>
        </table>

        <h2>2. Discussion Notes & Key Decisions</h2>
        <div class="content-box">${meeting.mom?.discussionSummary || 'No discussion notes logged.'}</div>

        <h2>3. Action Items & Tasks</h2>
        <table>
          <thead>
            <tr><th>#</th><th>Deliverable</th><th>Assigned To</th><th>Due Date</th><th>Task Code</th></tr>
          </thead>
          <tbody>
            ${actionItemsHtml || '<tr><td colspan="5" style="padding:8px;">No action items recorded.</td></tr>'}
          </tbody>
        </table>

        <div class="sig-box">
          <div class="sig-line">Recorded By: ${meeting.mom?.recordedByName || meeting.organizerName || 'Organizer'}</div>
          <div class="sig-line">Executive Authority (MD / GM)</div>
        </div>

        <div class="footer">
          <div>Krishna Valley ERP System</div>
          <div>Printed on ${new Date().toLocaleString()}</div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
};

export const TaskforceMeetingsTab = ({ onOpenTaskDetail }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const canSchedule = canUserAssignTasks(user);

  const [loading, setLoading] = useState(true);
  const [meetings, setMeetings] = useState([]);
  const [stats, setStats] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [momFilter, setMomFilter] = useState('all'); // 'all', 'ready', 'pending'

  // Modals
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [selectedMeetingForMoM, setSelectedMeetingForMoM] = useState(null);
  const [isMoMModalOpen, setIsMoMModalOpen] = useState(false);

  useEffect(() => {
    fetchMeetingsAndStats();
  }, [selectedType, momFilter]);

  const fetchMeetingsAndStats = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (selectedType !== 'all') params.meetingType = selectedType;
      if (momFilter === 'ready') params.momStatus = 'published';
      if (momFilter === 'pending') params.momStatus = 'pending';

      const [meetingsRes, statsRes] = await Promise.all([
        taskforceMeetingService.getMeetings(params),
        taskforceMeetingService.getMeetingStats().catch(() => null),
      ]);

      if (meetingsRes?.success) {
        setMeetings(meetingsRes.data || []);
      }
      if (statsRes?.success) {
        setStats(statsRes.stats);
      }
    } catch (err) {
      console.error('Error fetching meetings:', err);
      showToast('Failed to load meetings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchMeetingsAndStats();
  };

  const handleOpenMoM = (meeting) => {
    setSelectedMeetingForMoM(meeting);
    setIsMoMModalOpen(true);
  };

  const handleEditSchedule = (meeting) => {
    setEditingMeeting(meeting);
    setIsScheduleModalOpen(true);
  };

  const handleDeleteMeeting = async (meetingId) => {
    if (!window.confirm('Are you sure you want to delete this meeting?')) return;
    try {
      const res = await taskforceMeetingService.deleteMeeting(meetingId);
      if (res?.success) {
        showToast('Meeting deleted', 'success');
        fetchMeetingsAndStats();
      } else {
        showToast(res?.message || 'Failed to delete meeting', 'error');
      }
    } catch (err) {
      console.error('Error deleting meeting:', err);
      showToast('Error removing meeting', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* 1. CLEAN 4-CARD SUMMARY */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>TOTAL MEETINGS</span>
            <Calendar size={16} color="#005bbf" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '4px 0' }}>
            {stats?.totalMeetings || 0}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Scheduled & past syncs</div>
        </div>

        <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#fefce8', border: '1px solid #fef08a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#854d0e' }}>TODAY / UPCOMING</span>
            <Clock size={16} color="#ca8a04" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#ca8a04', margin: '4px 0' }}>
            {stats?.upcomingScheduled || stats?.todayMeetings || 0}
          </div>
          <div style={{ fontSize: '11px', color: '#854d0e' }}>Ready for execution</div>
        </div>

        <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#166534' }}>MOM PUBLISHED</span>
            <CheckCircle2 size={16} color="#16a34a" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#16a34a', margin: '4px 0' }}>
            {stats?.completedWithMoM || 0}
          </div>
          <div style={{ fontSize: '11px', color: '#166534' }}>Ready to download & view</div>
        </div>

        <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>TASKS FROM MOM</span>
            <Zap size={16} color="#ca8a04" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#ca8a04', margin: '4px 0' }}>
            {stats?.convertedTasksCount || 0}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Active directives assigned</div>
        </div>
      </div>

      {/* 2. SIMPLE TOOLBAR */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '10px 14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} style={{ position: 'relative' }}>
            <Search size={13} color="#64748b" style={{ position: 'absolute', left: '9px', top: '10px' }} />
            <input
              type="text"
              placeholder="Search meetings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '180px',
                height: '32px',
                paddingLeft: '28px',
                paddingRight: '8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                outline: 'none',
              }}
            />
          </form>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            style={{
              height: '32px',
              padding: '0 8px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              outline: 'none',
              backgroundColor: '#ffffff',
            }}
          >
            <option value="all">All Types</option>
            <option value="site_progress">Site Review</option>
            <option value="executive_review">MD Directives</option>
            <option value="department_sync">Dept Sync</option>
          </select>

          {/* MoM Status Filter */}
          <select
            value={momFilter}
            onChange={(e) => setMomFilter(e.target.value)}
            style={{
              height: '32px',
              padding: '0 8px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              outline: 'none',
              backgroundColor: '#ffffff',
            }}
          >
            <option value="all">All Meetings</option>
            <option value="ready">MoM Ready (Download)</option>
            <option value="pending">Needs MoM</option>
          </select>

          {(search || selectedType !== 'all' || momFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSelectedType('all');
                setMomFilter('all');
              }}
              style={{
                height: '32px',
                padding: '0 8px',
                borderRadius: '6px',
                border: '1px solid #fecaca',
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
              }}
            >
              <RotateCcw size={11} /> Clear
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={fetchMeetingsAndStats}
            style={{
              height: '32px',
              padding: '0 10px',
              fontSize: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              borderRadius: '6px',
            }}
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          {canSchedule && (
            <button
              type="button"
              onClick={() => {
                setEditingMeeting(null);
                setIsScheduleModalOpen(true);
              }}
              style={{
                height: '32px',
                padding: '0 14px',
                fontSize: '12px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                backgroundColor: '#ca8a04',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              <Plus size={14} /> Schedule Meeting
            </button>
          )}
        </div>
      </div>

      {/* 3. MEETINGS LIST / TABLE */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        <div className="table-responsive" style={{ width: '100%', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '780px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '10px 14px', fontWeight: 600 }}>Meeting Title & Code</th>
                <th style={{ padding: '10px 14px', fontWeight: 600 }}>Date & Venue</th>
                <th style={{ padding: '10px 14px', fontWeight: 600 }}>Type</th>
                <th style={{ padding: '10px 14px', fontWeight: 600 }}>MoM Status</th>
                <th style={{ padding: '10px 14px', fontWeight: 600, textAlign: 'right' }}>MoM & Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                    Loading meetings...
                  </td>
                </tr>
              ) : meetings.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                    No meetings found.{' '}
                    {canSchedule && (
                      <span
                        onClick={() => {
                          setEditingMeeting(null);
                          setIsScheduleModalOpen(true);
                        }}
                        style={{ color: '#005bbf', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Schedule a meeting now.
                      </span>
                    )}
                  </td>
                </tr>
              ) : (
                meetings.map((m) => {
                  const typeCfg = TYPE_CONFIG[m.meetingType] || TYPE_CONFIG.general;
                  const momSt = m.mom?.momStatus || 'pending';
                  const hasMoM = momSt === 'published' || momSt === 'approved';
                  const actionCount = m.mom?.actionItems?.length || 0;

                  return (
                    <tr
                      key={m._id}
                      style={{ borderBottom: '1px solid #f1f5f9' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                    >
                      {/* Title & Code */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '1px 5px',
                              borderRadius: '4px',
                              backgroundColor: '#e2e8f0',
                              color: '#1e293b',
                            }}
                          >
                            {m.meetingCode || 'MTG'}
                          </span>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                            {m.title}
                          </span>
                        </div>
                        {m.agenda && (
                          <div style={{ fontSize: '11px', color: '#64748b', maxWidth: '320px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {m.agenda}
                          </div>
                        )}
                      </td>

                      {/* Date & Venue */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={12} color="#005bbf" />
                          {m.scheduledDate ? new Date(m.scheduledDate).toLocaleDateString() : 'N/A'} at {m.startTime || '10:30'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <MapPin size={11} />
                          {m.locationDetails || 'Site Office'}
                        </div>
                      </td>

                      {/* Type */}
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 7px',
                            borderRadius: '4px',
                            backgroundColor: typeCfg.bg,
                            color: typeCfg.color,
                          }}
                        >
                          {typeCfg.label}
                        </span>
                      </td>

                      {/* MoM Status Badge */}
                      <td style={{ padding: '12px 14px' }}>
                        {hasMoM ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: '#15803d', backgroundColor: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>
                            <CheckCircle2 size={12} /> MoM Ready
                          </div>
                        ) : momSt === 'draft' ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: '#b45309', backgroundColor: '#fef3c7', padding: '2px 8px', borderRadius: '4px' }}>
                            <Clock size={12} /> MoM Draft
                          </div>
                        ) : (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 500, color: '#64748b', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>
                            <AlertCircle size={12} /> Awaiting MoM
                          </div>
                        )}
                        {actionCount > 0 && (
                          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                            {actionCount} action item{actionCount > 1 ? 's' : ''}
                          </div>
                        )}
                      </td>

                      {/* MoM & Action Buttons */}
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {/* If MoM is ready: View & Download buttons */}
                          {hasMoM ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenMoM(m)}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  border: '1px solid #cbd5e1',
                                  backgroundColor: '#ffffff',
                                  color: '#0f172a',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <FileText size={12} /> View MoM
                              </button>

                              <button
                                type="button"
                                onClick={() => downloadMeetingMoMPDF(m)}
                                title="Download / Print MoM (PDF)"
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  border: 'none',
                                  backgroundColor: '#16a34a',
                                  color: '#ffffff',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <Download size={12} /> Download MoM
                              </button>
                            </>
                          ) : (
                            /* If MoM is not added yet: Direct prominent "+ Add MoM" button */
                            <button
                              type="button"
                              onClick={() => handleOpenMoM(m)}
                              style={{
                                padding: '5px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: '#0284c7',
                                color: '#ffffff',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Plus size={12} /> Add MoM
                            </button>
                          )}

                          {canSchedule && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleEditSchedule(m)}
                                title="Edit Schedule"
                                style={{
                                  padding: '5px 7px',
                                  borderRadius: '6px',
                                  border: '1px solid #cbd5e1',
                                  backgroundColor: '#ffffff',
                                  color: '#64748b',
                                  cursor: 'pointer',
                                }}
                              >
                                <Edit2 size={11} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteMeeting(m._id)}
                                title="Delete Meeting"
                                style={{
                                  padding: '5px 7px',
                                  borderRadius: '6px',
                                  border: '1px solid #fecaca',
                                  backgroundColor: '#ffffff',
                                  color: '#dc2626',
                                  cursor: 'pointer',
                                }}
                              >
                                <Trash2 size={11} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Meeting Modal */}
      <ScheduleMeetingModal
        isOpen={isScheduleModalOpen}
        onClose={() => {
          setIsScheduleModalOpen(false);
          setEditingMeeting(null);
        }}
        onMeetingScheduled={() => {
          fetchMeetingsAndStats();
        }}
        initialMeeting={editingMeeting}
      />

      {/* Minutes of Meeting (MoM) Modal */}
      {selectedMeetingForMoM && (
        <MoMModal
          isOpen={isMoMModalOpen}
          onClose={() => {
            setIsMoMModalOpen(false);
            setSelectedMeetingForMoM(null);
          }}
          meetingId={selectedMeetingForMoM._id}
          onMoMUpdated={() => {
            fetchMeetingsAndStats();
          }}
          onOpenTaskDetail={onOpenTaskDetail}
        />
      )}
    </div>
  );
};

export default TaskforceMeetingsTab;
