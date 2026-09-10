import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { Calendar, Clock, Phone, MessageSquare, Users, MapPin, Mail, FileText, CheckCircle2 } from 'lucide-react';
import { googleCalendarService } from '../../services/googleCalendarService.js';

export const ScheduleFollowUpModal = ({
  isOpen,
  onClose,
  onSubmit,
  lead,
  teamMembers = [],
  currentUser = null
}) => {
  const [formData, setFormData] = useState({
    date: '',
    time: '11:00',
    mode: 'call',
    notes: '',
    assignedTo: '',
    status: 'pending',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && lead) {
      // Default follow-up date to tomorrow at 11:00 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yyyy = tomorrow.getFullYear();
      const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const dd = String(tomorrow.getDate()).padStart(2, '0');
      const defaultDate = `${yyyy}-${mm}-${dd}`;

      setFormData({
        date: defaultDate,
        time: '11:00',
        mode: 'call',
        notes: '',
        assignedTo: lead.assignedTo?._id || lead.assignedTo || currentUser?._id || '',
        status: 'pending',
      });
    }
  }, [isOpen, lead, currentUser]);

  if (!isOpen || !lead) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.date) {
      alert('Please select a scheduled date');
      return;
    }

    try {
      setLoading(true);
      const scheduledDateTime = new Date(`${formData.date}T${formData.time || '10:00'}:00`);

      await onSubmit({
        nextFollowUpDate: scheduledDateTime,
        date: new Date(),
        mode: formData.mode,
        notes: formData.notes.trim() || `Follow-up scheduled via ${formData.mode.toUpperCase()}`,
        assignedTo: formData.assignedTo || undefined,
        status: formData.status,
      });

      onClose();
    } catch (err) {
      alert(err.message || 'Failed to schedule follow-up');
    } finally {
      setLoading(false);
    }
  };

  const modeOptions = [
    { value: 'call', label: 'Phone Call', icon: Phone, color: '#1a73e8' },
    { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: '#16a34a' },
    { value: 'meeting', label: 'In-Person Meeting', icon: Users, color: '#9333ea' },
    { value: 'site_visit', label: 'Site Visit Tour', icon: MapPin, color: '#ea580c' },
    { value: 'email', label: 'Email Follow-up', icon: Mail, color: '#475569' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Schedule Follow-Up: ${lead.name}`}
      maxWidth="550px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        
        {/* Lead Context Pill */}
        <div style={{
          padding: '12px 16px',
          background: '#f8fafc',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div>
            <div style={{ fontSize: '0.92rem', fontWeight: '700', color: '#0f172a' }}>{lead.name}</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{lead.mobileNo} • {lead.requirement || 'Buyer Inquiry'}</div>
          </div>
          <span style={{
            fontSize: '0.75rem',
            padding: '4px 10px',
            borderRadius: '20px',
            background: '#e0f2fe',
            color: '#0369a1',
            fontWeight: '700'
          }}>
            Status: {lead.status?.replace(/_/g, ' ').toUpperCase()}
          </span>
        </div>

        {/* Interaction Mode Selector */}
        <div>
          <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '8px', display: 'block' }}>
            Follow-Up Channel / Mode *
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(95px, 1fr))', gap: '8px' }}>
            {modeOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = formData.mode === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, mode: opt.value })}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px 6px',
                    borderRadius: '8px',
                    border: isSelected ? `2px solid ${opt.color}` : '1px solid #cbd5e1',
                    background: isSelected ? `${opt.color}10` : '#ffffff',
                    color: isSelected ? opt.color : '#475569',
                    cursor: 'pointer',
                    fontWeight: isSelected ? '700' : '500',
                    fontSize: '0.75rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Icon size={18} color={opt.color} />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date & Time Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} color="#1a73e8" />
              Follow-Up Date *
            </label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="g-input"
              style={{ width: '100%', padding: '9px 12px', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} color="#1a73e8" />
              Preferred Time
            </label>
            <input
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              className="g-input"
              style={{ width: '100%', padding: '9px 12px', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {/* Assign Follow-Up to Sales Member */}
        <div>
          <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Users size={14} color="#1a73e8" />
            Assign Follow-Up To
          </label>
          <select
            value={formData.assignedTo}
            onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
            className="g-input"
            style={{ width: '100%', padding: '9px 12px', fontSize: '0.85rem' }}
          >
            <option value="">Keep currently assigned member ({lead.assignedTo?.firstName || 'None'})</option>
            {teamMembers.map((m) => {
              const u = m.userId || m;
              return (
                <option key={u._id} value={u._id}>
                  {u.firstName} {u.lastName || ''} ({m.roleTitle || 'Sales Member'})
                </option>
              );
            })}
          </select>
        </div>

        {/* Agenda / Discussion Notes */}
        <div>
          <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={14} color="#1a73e8" />
            Discussion Agenda / Notes
          </label>
          <textarea
            rows="3"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="e.g., Client requested Tower B brochure. Call to confirm family site visit timing."
            className="g-input"
            style={{ width: '100%', padding: '10px 12px', fontSize: '0.85rem', resize: 'vertical' }}
          />
        </div>

        {/* Google Calendar Direct Sync Callout */}
        <div style={{
          padding: '10px 14px',
          borderRadius: '8px',
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={16} color="#1d4ed8" />
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1e40af' }}>
                Google Calendar Direct Sync
              </div>
              <div style={{ fontSize: '0.72rem', color: '#3b82f6' }}>
                Will automatically map into your company Google Calendar.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const url = googleCalendarService.generateCalendarEventUrl({
                leadName: lead.name,
                leadMobile: lead.mobileNo,
                leadEmail: lead.email,
                mode: formData.mode,
                notes: formData.notes,
                scheduledDate: `${formData.date}T${formData.time || '10:00'}:00`,
                durationMinutes: formData.mode === 'site_visit' ? 45 : 30
              });
              window.open(url, '_blank');
            }}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              background: '#ffffff',
              border: '1px solid #3b82f6',
              color: '#1d4ed8',
              fontSize: '0.72rem',
              fontWeight: '700',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            + Add to Personal Calendar
          </button>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '9px 18px', fontSize: '0.85rem' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ padding: '9px 22px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <CheckCircle2 size={16} />
            {loading ? 'Scheduling...' : 'Schedule Follow-Up'}
          </button>
        </div>

      </form>
    </Modal>
  );
};

export default ScheduleFollowUpModal;
