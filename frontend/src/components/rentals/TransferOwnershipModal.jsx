import React, { useState } from 'react';
import { X, UserPlus, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { rentalService } from '../../services/rentalService.js';
import { useToast } from '../../context/ToastContext.jsx';

export const TransferOwnershipModal = ({ isOpen, onClose, rental, onTransferred }) => {
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    newOwnerName: '',
    newOwnerMobile: '',
    newOwnerEmail: '',
    newOwnerPan: '',
    newOwnerAadhaar: '',
    transferDate: new Date().toISOString().split('T')[0],
    transferReason: 'resale',
    transferDealValue: 2800000,
    newMonthlyRent: rental?.rentAmount || 31000,
    newTenureMonths: 36,
    newStartDate: new Date().toISOString().split('T')[0],
    newRegistryDate: new Date().toISOString().split('T')[0],
    applyTds: true,
    tdsPercentage: 10,
    remarks: ''
  });

  if (!isOpen || !rental) return null;

  const grossRent = Number(form.newMonthlyRent) || 0;
  const tenure = Math.max(1, Number(form.newTenureMonths) || 36);
  const totalCommitment = grossRent * tenure;

  let computedEndDateStr = '—';
  if (form.newStartDate) {
    try {
      const d = new Date(form.newStartDate);
      if (!isNaN(d.getTime())) {
        d.setMonth(d.getMonth() + tenure);
        computedEndDateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      }
    } catch {
      computedEndDateStr = '—';
    }
  }

  const formatINR = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.newOwnerName.trim() || !form.newOwnerMobile.trim()) {
      toast.showError('New owner name and mobile number are required');
      return;
    }

    setSaving(true);
    try {
      const res = await rentalService.transferOwnership(rental._id, form);
      if (res.success) {
        toast.showSuccess(res.message || 'Ownership transferred successfully!');
        if (onTransferred) onTransferred();
        onClose();
      } else {
        toast.showError(res.message || 'Failed to transfer ownership');
      }
    } catch (err) {
      toast.showError(err.message || 'Server error transferring ownership');
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
        maxWidth: '720px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          background: 'linear-gradient(135deg, #4338ca, #312e81)',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #4f46e5'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: '800' }}>Resale Transfer &amp; History Archive</span>
              <span style={{
                background: '#6366f1',
                color: '#ffffff',
                fontSize: '0.72rem',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '6px'
              }}>
                Flat {rental.flatNumber}
              </span>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#c7d2fe' }}>
              Current owner will be archived into <strong>Previous Owners Trail (Table 2)</strong>.
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              color: '#c7d2fe',
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

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* ARCHIVE NOTICE BOX */}
          <div style={{
            background: '#eef2ff',
            border: '1.5px solid #c7d2fe',
            borderRadius: '12px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#4338ca', fontWeight: '800', textTransform: 'uppercase' }}>
                CURRENT OWNER (TO BE ARCHIVED AS "LAST OWNER")
              </span>
              <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#1e1b4b', marginTop: '2px' }}>
                {rental.ownerName || 'Current Owner'} ({rental.ownerMobile})
              </div>
              <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '2px' }}>
                Total Rent Disbursed: <strong>{formatINR(rental.totalPaid)}</strong> • Contract: {rental.tenureMonths} Months
              </div>
            </div>

            <div style={{ background: '#6366f1', color: '#ffffff', padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center' }}>
              <ArrowRight size={20} />
            </div>
          </div>

          {/* SECTION: NEW OWNER DETAILS */}
          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0f172a', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <UserPlus size={16} color="#4338ca" /> New Buyer / Transferee Information (Table 1)
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  NEW OWNER FULL NAME *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Chandra Verma"
                  value={form.newOwnerName}
                  onChange={(e) => setForm({ ...form, newOwnerName: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  MOBILE NUMBER *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98XXXXXXXX"
                  value={form.newOwnerMobile}
                  onChange={(e) => setForm({ ...form, newOwnerMobile: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  EMAIL ADDRESS
                </label>
                <input
                  type="email"
                  placeholder="owner@example.com"
                  value={form.newOwnerEmail}
                  onChange={(e) => setForm({ ...form, newOwnerEmail: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  PAN CARD NUMBER
                </label>
                <input
                  type="text"
                  placeholder="ABCDE1234F"
                  value={form.newOwnerPan}
                  onChange={(e) => setForm({ ...form, newOwnerPan: e.target.value.toUpperCase() })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>

          {/* SECTION: TRANSFER DETAILS & NEW RENTAL TERMS */}
          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0f172a', marginBottom: '10px' }}>
              Resale Terms &amp; New Rental Tenure
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  TRANSFER DATE
                </label>
                <input
                  type="date"
                  required
                  value={form.transferDate}
                  onChange={(e) => setForm({ ...form, transferDate: e.target.value, newStartDate: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  NEW REGISTRY DATE
                </label>
                <input
                  type="date"
                  required
                  value={form.newRegistryDate}
                  onChange={(e) => setForm({ ...form, newRegistryDate: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  RESALE DEAL VALUE (₹)
                </label>
                <input
                  type="number"
                  value={form.transferDealValue}
                  onChange={(e) => setForm({ ...form, transferDealValue: Number(e.target.value) })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  NEW MONTHLY RENT (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={form.newMonthlyRent}
                  onChange={(e) => setForm({ ...form, newMonthlyRent: Number(e.target.value) })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: '700', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  NEW TENURE (MONTHS, MIN 36)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={form.newTenureMonths}
                  onChange={(e) => setForm({ ...form, newTenureMonths: Math.max(1, Number(e.target.value)) })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: '700', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>

          {/* LIVE COMPUTED NEW COMMITMENT STRIP */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8rem'
          }}>
            <div>
              <span style={{ color: '#64748b', fontSize: '0.72rem' }}>NEW PAYMENT ENDING DATE:</span>
              <strong style={{ display: 'block', color: '#0f172a', fontSize: '0.95rem' }}>{computedEndDateStr}</strong>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ color: '#64748b', fontSize: '0.72rem' }}>NEW TOTAL COMMITMENT:</span>
              <strong style={{ display: 'block', color: '#2563eb', fontSize: '0.95rem' }}>{formatINR(totalCommitment)}</strong>
            </div>
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
              style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: '600', fontSize: '0.82rem', cursor: 'pointer' }}
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
                background: 'linear-gradient(135deg, #4338ca, #3730a3)',
                color: '#ffffff',
                fontWeight: '700',
                fontSize: '0.82rem',
                cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 6px rgba(67, 56, 202, 0.3)'
              }}
            >
              {saving ? 'Transferring...' : 'Execute Resale Transfer'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
