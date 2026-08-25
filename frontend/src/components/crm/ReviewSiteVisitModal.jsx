import React, { useState } from 'react';
import { Modal } from '../common/Modal.jsx';
import { leadService } from '../../services/leadService.js';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Phone,
  Building2,
  DollarSign,
  AlertCircle,
  FileText,
  Sparkles
} from 'lucide-react';

export const ReviewSiteVisitModal = ({ isOpen, onClose, lead, onApprovalSuccess }) => {
  const [action, setAction] = useState('approve'); // 'approve' | 'reject'
  const [verificationNotes, setVerificationNotes] = useState('Site visit verified with client on ground. Approved for commission credit.');
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!lead) return null;

  const agentName = lead.agentId
    ? `${lead.agentId.firstName || ''} ${lead.agentId.lastName || ''}`.trim() || lead.agentId.username
    : 'Direct Partner';
  const agentCode = lead.agentId?.agentProfile?.agentCode || 'AGT-PARTNER';
  const commissionRate = lead.agentId?.agentProfile?.commissionRate || 2;
  const estBudget = lead.budget || 4500000;
  const estimatedCommission = Math.round((estBudget * commissionRate) / 100);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (action === 'reject' && !rejectionReason.trim()) {
      setError('Please provide a reason for rejecting this site visit.');
      return;
    }

    setSubmitting(true);
    try {
      if (action === 'approve') {
        const res = await leadService.approveSiteVisit(lead._id, { verificationNotes });
        if (onApprovalSuccess) onApprovalSuccess(res.message || 'Site visit approved successfully!');
      } else {
        const res = await leadService.rejectSiteVisit(lead._id, { rejectionReason });
        if (onApprovalSuccess) onApprovalSuccess(res.message || 'Site visit rejected.');
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to process site visit verification.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={20} color="#1a73e8" />
          <span>Inhouse Site Visit Approval Desk</span>
        </div>
      }
      maxWidth="620px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Banner */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '14px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
          }}
        >
          <Sparkles size={20} color="#1a73e8" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.84rem', color: '#334155', lineHeight: 1.5 }}>
            <strong>Inhouse Maker-Checker Policy:</strong> Approving this site visit will officially mark the buyer lead as verified, credit <strong>₹{estimatedCommission.toLocaleString('en-IN')}</strong> ({commissionRate}%) commission to the agent's wallet, and start the <strong>5-Day exclusive conversion window</strong>.
          </div>
        </div>

        {/* Lead & Agent Info Card */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '14px',
          }}
        >
          <div>
            <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Prospect Client</span>
            <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.92rem', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={14} color="#1a73e8" /> {lead.name}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <Phone size={12} /> {lead.mobileNo}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Channel Partner (Agent)</span>
            <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.92rem', marginTop: '2px' }}>
              {agentName}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#1a73e8', fontWeight: '600' }}>
              Code: {agentCode} • {commissionRate}% Sla
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Property Requirement</span>
            <div style={{ fontWeight: '600', color: '#334155', fontSize: '0.85rem', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Building2 size={13} color="#64748b" /> {lead.requirement || 'Apartment / Villa'}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Commission Payable</span>
            <div style={{ fontWeight: '800', color: '#0d904f', fontSize: '1rem', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '2px' }}>
              ₹{estimatedCommission.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Agent Visit Log Details */}
        <div style={{ backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '12px', fontSize: '0.84rem' }}>
          <div style={{ fontWeight: '700', color: '#334155', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={14} color="#64748b" /> Agent's Visit Remarks:
          </div>
          <div style={{ color: '#475569', fontStyle: 'italic', backgroundColor: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            "{lead.siteVisitDetails?.feedback || 'Site visit completed with party. Client was interested in the model flat.'}"
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '6px' }}>
            Visit Date: {lead.siteVisitDetails?.completedDate ? new Date(lead.siteVisitDetails.completedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Today'}
          </div>
        </div>

        {/* Action Toggle: Approve vs Reject */}
        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
            Inhouse Decision *
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setAction('approve')}
              style={{
                padding: '10px',
                borderRadius: '8px',
                border: action === 'approve' ? '2px solid #0d904f' : '1px solid #cbd5e1',
                backgroundColor: action === 'approve' ? '#f0fdf4' : '#ffffff',
                color: action === 'approve' ? '#0d904f' : '#64748b',
                fontWeight: '700',
                fontSize: '0.86rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <CheckCircle2 size={16} /> Approve & Credit Commission
            </button>

            <button
              type="button"
              onClick={() => setAction('reject')}
              style={{
                padding: '10px',
                borderRadius: '8px',
                border: action === 'reject' ? '2px solid #dc2626' : '1px solid #cbd5e1',
                backgroundColor: action === 'reject' ? '#fef2f2' : '#ffffff',
                color: action === 'reject' ? '#dc2626' : '#64748b',
                fontWeight: '700',
                fontSize: '0.86rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <XCircle size={16} /> Reject Site Visit
            </button>
          </div>
        </div>

        {/* Dynamic Notes */}
        {action === 'approve' ? (
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              Verification Notes (Optional)
            </label>
            <input
              type="text"
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
              placeholder="e.g. Verified by Front Desk. Client attended site visit."
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.86rem',
                boxSizing: 'border-box',
              }}
            />
          </div>
        ) : (
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#dc2626', marginBottom: '4px' }}>
              Rejection Reason *
            </label>
            <textarea
              rows="2"
              required
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="State reason (e.g. Party denied visiting site, duplicate submission, no photo proof)..."
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #fca5a5',
                fontSize: '0.86rem',
                boxSizing: 'border-box',
              }}
            />
          </div>
        )}

        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '8px 12px', borderRadius: '8px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {/* Footer Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontSize: '0.86rem',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '9px 22px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: action === 'approve' ? '#0d904f' : '#dc2626',
              color: '#ffffff',
              fontSize: '0.86rem',
              fontWeight: '700',
              cursor: submitting ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: action === 'approve' ? '0 2px 8px rgba(13,144,79,0.3)' : '0 2px 8px rgba(220,38,38,0.3)',
            }}
          >
            {submitting ? (
              'Processing...'
            ) : action === 'approve' ? (
              <>
                <CheckCircle2 size={16} /> Confirm & Approve Visit
              </>
            ) : (
              <>
                <XCircle size={16} /> Confirm Rejection
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ReviewSiteVisitModal;
