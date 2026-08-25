import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { Phone, MessageSquare, Mail, Users, Compass, Tag, Calendar, CheckCircle2 } from 'lucide-react';

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
    { value: 'call', label: 'Call', icon: Phone, color: '#3b82f6' },
    { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: '#10b981' },
    { value: 'site_visit', label: 'Site Visit', icon: Compass, color: '#f59e0b' },
    { value: 'meeting', label: 'Meeting', icon: Users, color: '#8b5cf6' },
    { value: 'email', label: 'Email', icon: Mail, color: '#ec4899' },
    { value: 'other', label: 'Other', icon: Tag, color: '#4b5563' }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={followUp ? `Edit Follow-Up: ${leadName}` : `Log New Follow-Up for "${leadName}"`}
      maxWidth="540px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Interaction Mode Grid */}
        <div>
          <label style={{ fontSize: '0.8rem', color: '#374151', display: 'block', marginBottom: '8px' }}>
            Interaction Mode *
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {modes.map((m) => {
              const Icon = m.icon;
              const isSelected = formData.mode === m.value;
              return (
                <button
                  type="button"
                  key={m.value}
                  onClick={() => setFormData({ ...formData, mode: m.value })}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: isSelected ? `${m.color}22` : 'var(--bg-card)',
                    border: `1px solid ${isSelected ? m.color : 'var(--border-subtle)'}`,
                    color: isSelected ? m.color : 'var(--text-secondary)',
                    fontWeight: isSelected ? '700' : '500',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  <Icon size={14} />
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Date of Interaction & Status */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: '#374151', display: 'block', marginBottom: '4px' }}>
              Interaction Date & Time
            </label>
            <input
              type="datetime-local"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: '#374151', display: 'block', marginBottom: '4px' }}>
              Follow-Up Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              style={{ width: '100%' }}
            >
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label style={{ fontSize: '0.8rem', color: '#374151', display: 'block', marginBottom: '4px' }}>
            Discussion Remarks / Notes *
          </label>
          <textarea
            required
            rows={3}
            placeholder="e.g. Discussed floor plan choices. Client requested price quotation for 3BHK flat A-502. Interested in site visit this Saturday."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            style={{ width: '100%', resize: 'vertical' }}
          />
        </div>

        {/* Next Follow-Up Date */}
        <div>
          <label style={{ fontSize: '0.8rem', color: '#374151', display: 'block', marginBottom: '4px' }}>
            Next Scheduled Follow-Up Date & Time
          </label>
          <input
            type="datetime-local"
            value={formData.nextFollowUpDate}
            onChange={(e) => setFormData({ ...formData, nextFollowUpDate: e.target.value })}
            style={{ width: '100%' }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '8px 16px', background: '#f8f9fa', color: '#374151', borderRadius: 'var(--radius-sm)' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={{
              padding: '8px 20px',
              background: 'linear-gradient(135deg, var(--primary-600), var(--primary-700))',
              color: '#111827',
              fontWeight: '700',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            {followUp ? 'Save Follow-Up' : 'Log Follow-Up'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
