import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { Calendar } from 'lucide-react';
import { googleCalendarService } from '../../services/googleCalendarService.js';

export const ManualFollowUpModal = ({
  isOpen,
  onClose,
  onSubmit,
  leadName = 'Lead',
  followUp = null
}) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 16),
    mode: 'call',
    notes: '',
    nextFollowUpDate: '',
    status: 'pending'
  });

  useEffect(() => {
    if (followUp) {
      setFormData({
        date: followUp.date ? new Date(followUp.date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
        mode: followUp.mode || 'call',
        notes: followUp.notes || '',
        nextFollowUpDate: followUp.nextFollowUpDate ? new Date(followUp.nextFollowUpDate).toISOString().slice(0, 16) : '',
        status: followUp.status || 'pending'
      });
    } else {
      setFormData({
        date: new Date().toISOString().slice(0, 16),
        mode: 'call',
        notes: '',
        nextFollowUpDate: '',
        status: 'pending'
      });
    }
  }, [followUp, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      date: formData.date ? new Date(formData.date) : new Date(),
      mode: formData.mode,
      notes: formData.notes.trim(),
      nextFollowUpDate: formData.nextFollowUpDate ? new Date(formData.nextFollowUpDate) : null,
      status: formData.status
    });
  };

  const modes = [
    { value: 'call', label: 'Call' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'site_visit', label: 'Site visit' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'email', label: 'Email' }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={followUp ? `Edit follow-up: ${leadName}` : `Log follow-up: ${leadName}`}
      maxWidth="520px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        {/* Interaction mode choices */}
        <div className="form-card-box">
          <div className="form-card-prompt">
            <span>Interaction mode *</span>
          </div>
          <div className="form-card-choices" style={{ flexWrap: 'wrap', gap: '12px' }}>
            {modes.map((m) => (
              <label
                key={m.value}
                className="form-card-choice"
                onClick={() => setFormData({ ...formData, mode: m.value })}
              >
                <input
                  type="radio"
                  name="manual_followup_mode"
                  checked={formData.mode === m.value}
                  onChange={() => setFormData({ ...formData, mode: m.value })}
                  style={{ accentColor: '#17652f' }}
                />
                <span>{m.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Date and Status Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>Interaction date & time</span>
            </div>
            <div className="form-card-input-row">
              <input
                type="datetime-local"
                className="form-card-input"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
          </div>

          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>Status</span>
            </div>
            <div className="form-card-input-row">
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="form-card-input"
                style={{ cursor: 'pointer' }}
              >
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Remarks / Notes */}
        <div className="form-card-box">
          <div className="form-card-prompt">
            <span>Discussion remarks or notes *</span>
          </div>
          <div className="form-card-input-row">
            <input
              type="text"
              required
              placeholder="e.g. Discussed floor plan choices. Interested in weekend site visit."
              className="form-card-input"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
        </div>

        {/* Next Follow-Up */}
        <div className="form-card-box">
          <div className="form-card-prompt">
            <span>Next scheduled follow-up (optional)</span>
            {formData.nextFollowUpDate && <span className="form-card-badge">Reminder Set</span>}
          </div>
          <div className="form-card-input-row">
            <input
              type="datetime-local"
              className="form-card-input"
              value={formData.nextFollowUpDate}
              onChange={(e) => setFormData({ ...formData, nextFollowUpDate: e.target.value })}
            />
          </div>
        </div>

        {/* Google Calendar Sync */}
        {formData.nextFollowUpDate && (
          <div style={{
            padding: '8px 12px',
            borderRadius: '8px',
            background: '#e8f2e5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ fontSize: '0.74rem', color: '#17652f', fontWeight: '600' }}>
              Add reminder to personal calendar
            </span>
            <button
              type="button"
              onClick={() => {
                const url = googleCalendarService.generateCalendarEventUrl({
                  leadName,
                  mode: formData.mode,
                  notes: formData.notes,
                  scheduledDate: formData.nextFollowUpDate
                });
                window.open(url, '_blank');
              }}
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                background: '#ffffff',
                border: '1px solid #17652f',
                color: '#17652f',
                fontSize: '0.72rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              + Sync Calendar
            </button>
          </div>
        )}

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
            style={{
              padding: '9px 24px',
              borderRadius: '8px',
              border: 'none',
              background: '#17652f',
              color: '#ffffff',
              fontWeight: '700',
              fontSize: '0.86rem',
              cursor: 'pointer'
            }}
          >
            {followUp ? 'Save follow-up' : 'Log follow-up'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
