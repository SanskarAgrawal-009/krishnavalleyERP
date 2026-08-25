import React from 'react';
import { Modal } from '../common/Modal.jsx';
import { 
  Phone, 
  MessageSquare, 
  Mail, 
  Users, 
  Compass, 
  Tag, 
  Calendar, 
  Clock, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Trash2, 
  Home 
} from 'lucide-react';

export const LeadTimelineDrawer = ({
  isOpen,
  onClose,
  lead,
  onAddFollowUp,
  onUpdateFollowUpStatus,
  onDeleteFollowUp
}) => {
  if (!lead) return null;

  const followUps = [...(lead.followUps || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
  const assignedFlat = lead.assignedFlat;

  const getModeInfo = (mode) => {
    switch (mode) {
      case 'call': return { label: 'Phone Call', icon: Phone, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' };
      case 'whatsapp': return { label: 'WhatsApp', icon: MessageSquare, color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' };
      case 'site_visit': return { label: 'Site Visit', icon: Compass, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' };
      case 'meeting': return { label: 'Meeting', icon: Users, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' };
      case 'email': return { label: 'Email', icon: Mail, color: '#ec4899', bg: 'rgba(236, 72, 153, 0.12)' };
      default: return { label: 'Other', icon: Tag, color: '#4b5563', bg: 'rgba(148, 163, 184, 0.12)' };
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return { label: 'Completed', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', icon: CheckCircle2 };
      case 'cancelled':
        return { label: 'Cancelled', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', icon: XCircle };
      default:
        return { label: 'Pending', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)', icon: AlertCircle };
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Follow-Up History: ${lead.name}`}
      maxWidth="680px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        
        {/* Lead Profile Header */}
        <div style={{
          background: '#f8f9fa',
          border: '1px solid #dadce0',
          borderRadius: 'var(--radius-sm)',
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#111827' }}>{lead.name}</div>
            <div style={{ display: 'flex', gap: '14px', fontSize: '0.8rem', color: '#374151', marginTop: '4px', flexWrap: 'wrap' }}>
              <a
                href={`tel:${lead.mobileNo}`}
                style={{ color: '#10b981', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Phone size={13} /> {lead.mobileNo}
              </a>
              {lead.email && (
                <a
                  href={`mailto:${lead.email}`}
                  style={{ color: '#60a5fa', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Mail size={13} /> {lead.email}
                </a>
              )}
            </div>

            {assignedFlat && (
              <div style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', padding: '3px 8px', borderRadius: '4px', fontWeight: '700' }}>
                <Home size={13} />
                <span>Assigned Unit: Flat {assignedFlat.flatNumber} {assignedFlat.projectId?.projectName ? `(${assignedFlat.projectId.projectName})` : ''}</span>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              onClose();
              onAddFollowUp(lead);
            }}
            style={{
              padding: '7px 14px',
              background: 'linear-gradient(135deg, var(--primary-600), var(--primary-700))',
              color: '#111827',
              borderRadius: 'var(--radius-sm)',
              fontWeight: '700',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Plus size={14} /> Log New Follow-Up
          </button>
        </div>

        {/* Timeline Stream */}
        <div>
          <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#374151', marginBottom: '14px' }}>
            Follow-Up Interactions ({followUps.length})
          </h4>

          {followUps.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 20px', background: '#f8f9fa', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-subtle)' }}>
              <Clock size={32} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
              <p style={{ fontSize: '0.85rem', color: '#4b5563' }}>No follow-ups logged for this lead yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {followUps.map((fu, idx) => {
                const modeInfo = getModeInfo(fu.mode);
                const statusInfo = getStatusBadge(fu.status);
                const ModeIcon = modeInfo.icon;
                const StatusIcon = statusInfo.icon;

                return (
                  <div
                    key={fu._id || idx}
                    style={{
                      background: '#f8f9fa',
                      border: '1px solid #dadce0',
                      borderRadius: 'var(--radius-sm)',
                      padding: '14px 16px',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          background: modeInfo.bg,
                          color: modeInfo.color,
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}>
                          <ModeIcon size={12} /> {modeInfo.label}
                        </span>

                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          background: statusInfo.bg,
                          color: statusInfo.color,
                          fontSize: '0.7rem',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          textTransform: 'capitalize'
                        }}>
                          <StatusIcon size={11} /> {statusInfo.label}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.75rem', color: '#4b5563' }}>
                        {new Date(fu.date).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>

                    {/* Notes */}
                    <p style={{ fontSize: '0.85rem', color: '#111827', lineHeight: '1.45', margin: '6px 0 10px' }}>
                      {fu.notes || 'No specific discussion remarks recorded.'}
                    </p>

                    {/* Next Follow Up Date & Action Footer */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderTop: '1px solid var(--border-subtle)',
                      paddingTop: '8px',
                      fontSize: '0.75rem',
                      flexWrap: 'wrap',
                      gap: '6px'
                    }}>
                      {fu.nextFollowUpDate ? (
                        <div style={{ color: 'var(--accent-gold-500)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                          <Calendar size={12} /> Next Follow-Up: {new Date(fu.nextFollowUpDate).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      ) : (
                        <div style={{ color: '#4b5563' }}>No next follow-up scheduled</div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {fu.status === 'pending' && (
                          <button
                            onClick={() => onUpdateFollowUpStatus(lead._id, fu._id, 'completed')}
                            style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: '#10b981',
                              fontSize: '0.72rem',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            Mark Completed
                          </button>
                        )}
                        <button
                          onClick={() => onDeleteFollowUp(lead._id, fu._id)}
                          style={{
                            padding: '3px 6px',
                            borderRadius: '4px',
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#ef4444',
                            cursor: 'pointer'
                          }}
                          title="Delete Follow-Up"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
