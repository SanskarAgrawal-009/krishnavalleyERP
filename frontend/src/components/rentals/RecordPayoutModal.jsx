import React, { useState, useEffect } from 'react';
import { X, DollarSign, Receipt, CheckCircle } from 'lucide-react';
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
        toast.showSuccess(res.message || 'Payout recorded successfully!');
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
      background: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(4px)',
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
        maxWidth: '540px',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          background: 'linear-gradient(135deg, #1e293b, #0f172a)',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #334155'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: '800' }}>Record Rental Payout</span>
              <span style={{
                background: '#16a34a',
                color: '#ffffff',
                fontSize: '0.72rem',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '6px'
              }}>
                Flat {rental.flatNumber}
              </span>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
              Owner: <strong>{rental.ownerName || 'Current Owner'}</strong>
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Quick Stats Pill */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8rem'
          }}>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem' }}>TOTAL PAID TO DATE</span>
              <strong style={{ color: '#166534', fontSize: '1rem' }}>{formatINR(rental.totalPaid)}</strong>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem' }}>OUTSTANDING BALANCE</span>
              <strong style={{ color: '#b91c1c', fontSize: '1rem' }}>{formatINR(rental.amountOutstanding)}</strong>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
              PAYOUT DISBURSEMENT AMOUNT (₹)
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: '700', color: '#64748b' }}>₹</span>
              <input
                type="number"
                min="1"
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 28px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.95rem',
                  fontWeight: '800',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                PAYMENT DATE
              </label>
              <input
                type="date"
                required
                value={form.paymentDate}
                onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                PAYMENT MODE
              </label>
              <select
                value={form.paymentMode}
                onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: '#ffffff'
                }}
              >
                <option value="NEFT">NEFT Bank Transfer</option>
                <option value="RTGS">RTGS High-Value</option>
                <option value="IMPS">IMPS Instant</option>
                <option value="CMS">Corporate CMS Batch</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
              UTR / TRANSACTION REFERENCE NUMBER
            </label>
            <input
              type="text"
              required
              placeholder="e.g. CMS-NEFT-A006-202609"
              value={form.referenceNumber}
              onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
              NOTES / REMARKS
            </label>
            <input
              type="text"
              placeholder="e.g. Month 19 Payout cleared via HDFC"
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Modal Footer */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            borderTop: '1px solid #e2e8f0',
            paddingTop: '16px',
            marginTop: '8px'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontWeight: '600',
                fontSize: '0.82rem',
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
                background: 'linear-gradient(135deg, #16a34a, #15803d)',
                color: '#ffffff',
                fontWeight: '700',
                fontSize: '0.82rem',
                cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)'
              }}
            >
              {saving ? 'Recording...' : 'Disburse & Update Ledger'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
