import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
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
    { value: 'call', label: 'Phone call' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'site_visit', label: 'Site visit' },
    { value: 'email', label: 'Email' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Schedule client follow-up"
      maxWidth="520px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        {/* Context card */}
        <div style={{
          padding: '12px 16px',
          background: '#f8fafc',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '0.92rem', fontWeight: '700', color: '#0f172a' }}>{lead.name}</div>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{lead.mobileNo} • {lead.requirement || 'General buyer'}</div>
          </div>
          <span className="form-card-badge">{lead.status?.replace(/_/g, ' ')}</span>
        </div>

        {/* Channel card */}
        <div className="form-card-box">
          <div className="form-card-prompt">
            <span>Follow-up channel</span>
          </div>
          <div className="form-card-choices" style={{ flexWrap: 'wrap', gap: '12px' }}>
            {modeOptions.map((opt) => (
              <label
                key={opt.value}
                className="form-card-choice"
                onClick={() => setFormData({ ...formData, mode: opt.value })}
              >
                <input
                  type="radio"
                  name="followup_mode"
                  checked={formData.mode === opt.value}
                  onChange={() => setFormData({ ...formData, mode: opt.value })}
                  style={{ accentColor: '#17652f' }}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Date & Time Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>Follow-up date *</span>
            </div>
            <div className="form-card-input-row">
              <input
                type="date"
                required
                className="form-card-input"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
          </div>

          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>Preferred time</span>
            </div>
            <div className="form-card-input-row">
              <input
                type="time"
                className="form-card-input"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Assignee Card */}
        <div className="form-card-box">
          <div className="form-card-prompt">
            <span>Assign follow-up to</span>
          </div>
          <div className="form-card-input-row">
            <select
              value={formData.assignedTo}
              onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
              className="form-card-input"
              style={{ cursor: 'pointer' }}
            >
              <option value="">Keep current assignee ({lead.assignedTo?.firstName || 'Self'})</option>
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
        </div>

        {/* Agenda / Discussion notes */}
        <div className="form-card-box">
          <div className="form-card-prompt">
            <span>Discussion agenda or notes</span>
          </div>
          <div className="form-card-input-row">
            <input
              type="text"
              placeholder="e.g. Confirm site visit timing or discuss floor plan pricing"
              className="form-card-input"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '10px',
          paddingTop: '16px',
          borderTop: '1px solid #f1f5f9'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 20px',
              borderRadius: '8px',
              border: 'none',
              background: '#f1f5f9',
              color: '#475569',
              fontWeight: '600',
              fontSize: '0.86rem',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '9px 24px',
              borderRadius: '8px',
              border: 'none',
              background: '#17652f',
              color: '#ffffff',
              fontWeight: '700',
              fontSize: '0.86rem',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Scheduling...' : 'Schedule follow-up'}
          </button>
        </div>

      </form>
    </Modal>
  );
};

export default ScheduleFollowUpModal;
