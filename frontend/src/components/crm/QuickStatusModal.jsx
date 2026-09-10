import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { CheckCircle2, Sliders, Calendar, FileText, AlertCircle, ArrowRight } from 'lucide-react';

export const QuickStatusModal = ({
  isOpen,
  onClose,
  onSubmit,
  lead,
}) => {
  const [status, setStatus] = useState('contacted');
  const [notes, setNotes] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && lead) {
      setStatus(lead.status || 'contacted');
      setNotes('');
      setNextFollowUpDate('');
    }
  }, [isOpen, lead]);

  if (!isOpen || !lead) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await onSubmit({
        status,
        notes: notes.trim(),
        nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
      });
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to update lead status');
    } finally {
      setLoading(false);
    }
  };

  const statusWorkflow = [
    { value: 'new', label: 'New Lead', color: '#64748b', desc: 'Fresh inquiry awaiting first contact' },
    { value: 'contacted', label: 'Contacted', color: '#2563eb', desc: 'Spoke with buyer / requirements gathered' },
    { value: 'site_visit_scheduled', label: 'Site Visit Scheduled', color: '#d97706', desc: 'Tour date and time fixed' },
    { value: 'site_visit_completed', label: 'Site Visit Completed', color: '#16a34a', desc: 'Buyer visited Krishna Valley site' },
    { value: 'negotiation', label: 'In Negotiation', color: '#8b5cf6', desc: 'Price, payment plan, or unit selection discussions' },
    { value: 'booked', label: 'Booked / Token Paid', color: '#059669', desc: 'Booking form signed or token paid' },
    { value: 'converted', label: 'Converted to Sale', color: '#0d9488', desc: 'Moved to Sales Allotment ledger' },
    { value: 'lost', label: 'Lost / Disqualified', color: '#dc2626', desc: 'Out of budget, uninterested, or invalid' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Update Status: ${lead.name}`}
      maxWidth="560px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        
        {/* Header Preview */}
        <div style={{
          padding: '12px 16px',
          background: '#f8fafc',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div>
            <div style={{ fontSize: '0.92rem', fontWeight: '700', color: '#0f172a' }}>{lead.name}</div>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{lead.mobileNo} • {lead.requirement || 'Buyer Inquiry'}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
            <span style={{ color: '#64748b' }}>Current:</span>
            <span style={{
              background: '#e2e8f0',
              padding: '3px 9px',
              borderRadius: '6px',
              fontWeight: '700',
              color: '#334155'
            }}>
              {lead.status?.replace(/_/g, ' ').toUpperCase()}
            </span>
          </div>
        </div>

        {/* Status Stage Selection Grid */}
        <div>
          <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sliders size={14} color="#1a73e8" />
            Select New Pipeline Stage *
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {statusWorkflow.map((item) => {
              const isSelected = status === item.value;
              return (
                <div
                  key={item.value}
                  onClick={() => setStatus(item.value)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: isSelected ? `2px solid ${item.color}` : '1px solid #e2e8f0',
                    background: isSelected ? `${item.color}10` : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{
                      fontWeight: isSelected ? '700' : '600',
                      color: isSelected ? item.color : '#1e293b',
                      fontSize: '0.82rem'
                    }}>
                      {item.label}
                    </span>
                    {isSelected && <CheckCircle2 size={15} color={item.color} />}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{item.desc}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Date for Site Visit or Next Follow-Up */}
        {(status === 'site_visit_scheduled' || status === 'contacted' || status === 'negotiation') && (
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} color="#1a73e8" />
              {status === 'site_visit_scheduled' ? 'Scheduled Site Visit Date & Time *' : 'Next Follow-Up Date & Time (Optional)'}
            </label>
            <input
              type="datetime-local"
              required={status === 'site_visit_scheduled'}
              value={nextFollowUpDate}
              onChange={(e) => setNextFollowUpDate(e.target.value)}
              className="g-input"
              style={{ width: '100%', padding: '9px 12px', fontSize: '0.85rem' }}
            />
          </div>
        )}

        {/* Remarks / Conversation Notes */}
        <div>
          <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={14} color="#1a73e8" />
            Stage Update Remarks / Conversation Notes
          </label>
          <textarea
            rows="3"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Summarize buyer feedback, objections, preferred tower/flat, or next action steps..."
            className="g-input"
            style={{ width: '100%', padding: '10px 12px', fontSize: '0.85rem', resize: 'vertical' }}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
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
            {loading ? 'Updating...' : 'Update Lead Status'}
          </button>
        </div>

      </form>
    </Modal>
  );
};

export default QuickStatusModal;
