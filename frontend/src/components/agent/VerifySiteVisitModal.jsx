import React, { useState } from 'react';
import { Modal } from '../common/Modal.jsx';
import { agentService } from '../../services/agentService.js';
import { 
  Building2, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ExternalLink,
  ShieldCheck,
  Home,
  Check,
  X
} from 'lucide-react';

export const VerifySiteVisitModal = ({ isOpen, onClose, siteVisit, onVerificationSuccess }) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [verificationNotes, setVerificationNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  if (!siteVisit) return null;

  const handleAction = async (action) => {
    if (action === 'reject' && !rejectionReason.trim()) {
      alert('Please provide a reason for rejecting this site visit.');
      return;
    }

    setProcessing(true);
    try {
      const res = await agentService.verifySiteVisit(siteVisit._id, {
        action,
        rejectionReason: rejectionReason.trim(),
        verificationNotes: verificationNotes.trim()
      });
      alert(res.message || (action === 'approve' ? 'Site visit approved!' : 'Site visit rejected.'));
      if (onVerificationSuccess) onVerificationSuccess(res.data);
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to process verification');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Management Review: Site Visit #${siteVisit.visitCode || ''}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* SUMMARY CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          
          {/* AGENT CARD */}
          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>
              Channel Partner / Agent
            </div>
            <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '0.88rem' }}>
              {siteVisit.agentName}
            </div>
            <div style={{ display: 'inline-block', marginTop: '2px', padding: '1px 6px', background: '#e0e7ff', color: '#3730a3', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '800', fontFamily: 'monospace' }}>
              CODE: {siteVisit.agentCode}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: '4px' }}>
              🏢 {siteVisit.agencyName || 'Independent Agent'} • 📞 {siteVisit.agentPhone || 'N/A'}
            </div>
          </div>

          {/* PARTY CARD */}
          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>
              Customer / Visiting Party
            </div>
            <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '0.88rem' }}>
              {siteVisit.partyName}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#1a73e8', fontWeight: '700', marginTop: '2px' }}>
              📞 {siteVisit.partyMobile}
            </div>
            {siteVisit.partyEmail && (
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                ✉ {siteVisit.partyEmail}
              </div>
            )}
          </div>
        </div>

        {/* PROPERTY VISITED */}
        <div style={{ background: '#f1f5f9', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ color: '#1e293b' }}>Project:</strong> {siteVisit.projectId?.projectName || 'Krishna Valley'}
            </div>
            <div style={{ color: '#64748b', fontSize: '0.74rem' }}>
              📅 Visit Date: {new Date(siteVisit.visitDate).toLocaleString('en-IN')}
            </div>
          </div>

          {siteVisit.flatIds && siteVisit.flatIds.length > 0 && (
            <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#475569' }}>Units Inspected:</span>
              {siteVisit.flatIds.map((flat) => (
                <span
                  key={flat._id || flat}
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    color: '#1e293b'
                  }}
                >
                  Flat {flat.flatNumber || 'Unit'}
                </span>
              ))}
            </div>
          )}

          {siteVisit.visitNotes && (
            <div style={{ marginTop: '6px', fontSize: '0.75rem', color: '#334155', fontStyle: 'italic', borderTop: '1px dashed #cbd5e1', paddingTop: '4px' }}>
              "{siteVisit.visitNotes}"
            </div>
          )}
        </div>

        {/* PARTY SELFIE / SITE VISIT PROOF */}
        <div>
          <label style={{ fontSize: '0.76rem', color: '#334155', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
            Party Selfie & On-Site Verification Proof:
          </label>

          {siteVisit.partySelfieUrl ? (
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <img
                src={siteVisit.partySelfieUrl}
                alt="Party Selfie at Site"
                style={{ width: '130px', height: '110px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#166534', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={14} color="#16a34a" /> Photo Proof Attached
                </div>
                <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '4px 0 8px' }}>
                  Click below to open the high-resolution original image in a separate tab for full inspection.
                </p>
                <a
                  href={siteVisit.partySelfieUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    background: '#1a73e8',
                    color: '#ffffff',
                    borderRadius: '4px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    textDecoration: 'none'
                  }}
                >
                  <ExternalLink size={11} /> Open Original Photo
                </a>
              </div>
            </div>
          ) : (
            <div style={{ padding: '12px', background: '#fffbeb', color: '#b45309', borderRadius: '6px', border: '1px solid #fef3c7', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertCircle size={15} /> No physical photo proof was uploaded with this site visit entry.
            </div>
          )}
        </div>

        {/* VERIFICATION NOTES */}
        <div>
          <label style={{ fontSize: '0.74rem', color: '#334155', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
            Management Review Notes (Optional):
          </label>
          <input
            type="text"
            placeholder="e.g. Verified with Site Incharge Amit Verma. Party visited Phase 2."
            value={verificationNotes}
            onChange={(e) => setVerificationNotes(e.target.value)}
            style={{ width: '100%', fontSize: '0.8rem' }}
          />
        </div>

        {/* REJECTION REASON INPUT */}
        <div>
          <label style={{ fontSize: '0.74rem', color: '#dc2626', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
            Rejection Reason (Required only if rejecting):
          </label>
          <input
            type="text"
            placeholder="e.g. Party not present at site, duplicate visitor entry"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            style={{ width: '100%', fontSize: '0.8rem' }}
          />
        </div>

        {/* AUTOMATION NOTICE BANNER */}
        <div style={{ background: '#f0fdf4', padding: '10px 12px', borderRadius: '6px', border: '1px solid #bbf7d0', fontSize: '0.74rem', color: '#166534', lineHeight: '1.4' }}>
          💡 <strong>Automated Commission Rule:</strong> Approving this site visit links the visiting party to Agent <strong>{siteVisit.agentCode}</strong>. Once this customer confirms a flat booking in Sales, the agent's commission will be <strong>automatically calculated and credited</strong> to their wallet!
        </div>

        {/* ACTION BUTTONS */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 14px',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontWeight: '700',
              color: '#334155',
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={processing}
            onClick={() => handleAction('reject')}
            style={{
              padding: '8px 16px',
              background: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              fontWeight: '700',
              color: '#b91c1c',
              fontSize: '0.82rem',
              cursor: processing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <X size={14} /> Reject Visit
          </button>

          <button
            type="button"
            disabled={processing}
            onClick={() => handleAction('approve')}
            style={{
              padding: '8px 18px',
              background: '#15803d',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '800',
              color: '#ffffff',
              fontSize: '0.84rem',
              cursor: processing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {processing ? <Loader2 size={15} className="spin" /> : <ShieldCheck size={15} />}
            Approve & Verify Site Visit
          </button>
        </div>

      </div>
    </Modal>
  );
};
