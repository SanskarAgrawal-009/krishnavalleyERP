import React, { useState, useEffect } from 'react';
import { X, Receipt, CheckCircle } from 'lucide-react';
import { rentalService } from '../../services/rentalService.js';
import { useToast } from '../../context/ToastContext.jsx';

export const RecordPayoutModal = ({ isOpen, onClose, rental, onUpdated }) => {
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    amount: 31000,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMode: 'NEFT',
    referenceNumber: '',
    remarks: ''
  });

  useEffect(() => {
    if (rental) {
      const defaultAmt = rental.netAmount || rental.rentAmount || 31000;
      setForm({
        amount: defaultAmt,
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMode: 'NEFT',
        referenceNumber: `CMS-NEFT-${(rental.flatNumber || '001').replace(/[^0-9]/g, '')}-${Date.now().toString().slice(-4)}`,
        remarks: `Disbursed for Flat ${rental.flatNumber}`
      });
    }
  }, [rental]);

  if (!isOpen || !rental) return null;

  const formatINR = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await rentalService.recordRentalPayout(rental._id, form);
      if (res.success) {
        toast.showSuccess(res.message || 'Payout recorded successfully');
        if (onUpdated) onUpdated();
        onClose();
      } else {
        toast.showError(res.message || 'Failed to record payout');
      }
    } catch (err) {
      toast.showError(err.message || 'Server error recording payout');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(3px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: '16px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '520px',
        position: 'relative',
        boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.18)',
        padding: '28px 32px'
      }}>
        {/* Minimal Close Button */}
        <button
          onClick={onClose}
          type="button"
          aria-label="Close"
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px'
          }}
        >
          <X size={20} />
        </button>

        {/* Centered Heading */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>
            Record rental payout
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            Flat {rental.flatNumber} • Owner: <strong>{rental.ownerName || 'Current Owner'}</strong>
          </p>
        </div>

        {/* Summary Card */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '18px'
        }}>
          <div>
            <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem', fontWeight: '600', textTransform: 'uppercase' }}>Total paid to date</span>
            <strong style={{ color: '#17652f', fontSize: '0.98rem' }}>{formatINR(rental.totalPaid)}</strong>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem', fontWeight: '600', textTransform: 'uppercase' }}>Outstanding balance</span>
            <strong style={{ color: '#0f172a', fontSize: '0.98rem' }}>{formatINR(rental.amountOutstanding)}</strong>
          </div>
        </div>

        {/* Form Body with Boxed Input Cards */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* Card: Payout Amount */}
          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>Payout disbursement amount</span>
              <span className="form-card-badge">Net Payout</span>
            </div>
            <div className="form-card-input-row">
              <span style={{ color: '#64748b', fontWeight: '600', fontSize: '1.05rem' }}>₹</span>
              <input
                type="number"
                min="1"
                required
                className="form-card-input"
                style={{ fontSize: '1.1rem', fontWeight: '700' }}
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
              />
            </div>
          </div>

          {/* Row: Date + Mode */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-card-box">
              <div className="form-card-prompt">
                <span>Payment date</span>
              </div>
              <div className="form-card-input-row">
                <input
                  type="date"
                  required
                  className="form-card-input"
                  value={form.paymentDate}
                  onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
                />
              </div>
            </div>

            <div className="form-card-box">
              <div className="form-card-prompt">
                <span>Payment mode</span>
              </div>
              <div className="form-card-input-row">
                <select
                  value={form.paymentMode}
                  onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
                  className="form-card-input"
                  style={{ cursor: 'pointer' }}
                >
                  <option value="NEFT">NEFT Bank Transfer</option>
                  <option value="RTGS">RTGS High-Value</option>
                  <option value="IMPS">IMPS Instant</option>
                  <option value="CMS">Corporate CMS Batch</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
            </div>
          </div>

          {/* Card: UTR Reference */}
          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>UTR or transaction reference number</span>
            </div>
            <div className="form-card-input-row">
              <input
                type="text"
                required
                placeholder="e.g. CMS-NEFT-A006-202609"
                className="form-card-input"
                value={form.referenceNumber}
                onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })}
              />
            </div>
          </div>

          {/* Card: Notes / Remarks */}
          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>Notes or remarks (optional)</span>
            </div>
            <div className="form-card-input-row">
              <input
                type="text"
                placeholder="e.g. Cleared via HDFC Bank"
                className="form-card-input"
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              />
            </div>
          </div>

          {/* Action Footer */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '12px',
            paddingTop: '16px',
            borderTop: '1px solid #f1f5f9'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
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
              disabled={saving}
              style={{
                padding: '9px 24px',
                borderRadius: '8px',
                border: 'none',
                background: '#17652f',
                color: '#ffffff',
                fontWeight: '700',
                fontSize: '0.86rem',
                cursor: saving ? 'not-allowed' : 'pointer'
              }}
            >
              {saving ? 'Recording...' : 'Disburse & update ledger'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
