import React, { useState } from 'react';
import { X, ArrowRight, CheckCircle2 } from 'lucide-react';
import { rentalService } from '../../services/rentalService.js';
import { useToast } from '../../context/ToastContext.jsx';

const STEPS = [
  { id: 1, title: 'New Owner' },
  { id: 2, title: 'Resale & Terms' }
];

export const TransferOwnershipModal = ({ isOpen, onClose, rental, onTransferred }) => {
  const toast = useToast();
  const [step, setStep] = useState(1);
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

  const handleNext = (e) => {
    e.preventDefault();
    if (!form.newOwnerName.trim() || !form.newOwnerMobile.trim()) {
      toast.showError('New owner name and mobile number are required');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await rentalService.transferOwnership(rental._id, form);
      if (res.success) {
        toast.showSuccess(res.message || 'Ownership transferred successfully');
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
        maxWidth: '560px',
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
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>
            Transfer property ownership
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            Flat {rental.flatNumber} • Previous owner will be archived to history
          </p>
        </div>

        {/* Stepper Progress */}
        <div className="form-stepper-header" style={{ marginBottom: '22px' }}>
          {STEPS.map((s, idx) => (
            <React.Fragment key={s.id}>
              <div className={`form-stepper-item ${step === s.id ? 'active' : ''} ${step > s.id ? 'completed' : ''}`}>
                <div className="form-stepper-circle">
                  {step > s.id ? '✓' : s.id}
                </div>
                <span className="form-stepper-label">{s.title}</span>
              </div>
              {idx < STEPS.length - 1 && <div className={`form-stepper-line ${step > s.id ? 'completed' : ''}`} />}
            </React.Fragment>
          ))}
        </div>

        {step === 1 && (
          <form onSubmit={handleNext} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Current Owner Info Card */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: '600', textTransform: 'uppercase' }}>
                  Current Owner (To be archived)
                </span>
                <strong style={{ display: 'block', color: '#0f172a', fontSize: '0.94rem', marginTop: '2px' }}>
                  {rental.ownerName || 'Current Owner'} ({rental.ownerMobile || 'No phone'})
                </strong>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Total rent disbursed: {formatINR(rental.totalPaid)}
                </span>
              </div>
              <span className="form-card-badge">Archived Trail</span>
            </div>

            {/* New Owner Name */}
            <div className="form-card-box">
              <div className="form-card-prompt">
                <span>New owner full name *</span>
              </div>
              <div className="form-card-input-row">
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Chandra Verma"
                  className="form-card-input"
                  value={form.newOwnerName}
                  onChange={(e) => setForm({ ...form, newOwnerName: e.target.value })}
                />
              </div>
            </div>

            {/* Mobile Number */}
            <div className="form-card-box">
              <div className="form-card-prompt">
                <span>Mobile number *</span>
              </div>
              <div className="form-card-input-row">
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  className="form-card-input"
                  value={form.newOwnerMobile}
                  onChange={(e) => setForm({ ...form, newOwnerMobile: e.target.value })}
                />
              </div>
            </div>

            {/* Email + PAN */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-card-box">
                <div className="form-card-prompt">
                  <span>Email address</span>
                </div>
                <div className="form-card-input-row">
                  <input
                    type="email"
                    placeholder="e.g. owner@gmail.com"
                    className="form-card-input"
                    value={form.newOwnerEmail}
                    onChange={(e) => setForm({ ...form, newOwnerEmail: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-card-box">
                <div className="form-card-prompt">
                  <span>PAN number</span>
                  <span className="form-card-badge">KYC</span>
                </div>
                <div className="form-card-input-row">
                  <input
                    type="text"
                    placeholder="ABCDE1234F"
                    className="form-card-input"
                    value={form.newOwnerPan}
                    onChange={(e) => setForm({ ...form, newOwnerPan: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
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
                Continue
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Transfer Date + Registry Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-card-box">
                <div className="form-card-prompt">
                  <span>Transfer date</span>
                </div>
                <div className="form-card-input-row">
                  <input
                    type="date"
                    required
                    className="form-card-input"
                    value={form.transferDate}
                    onChange={(e) => setForm({ ...form, transferDate: e.target.value, newStartDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-card-box">
                <div className="form-card-prompt">
                  <span>Registry date</span>
                </div>
                <div className="form-card-input-row">
                  <input
                    type="date"
                    required
                    className="form-card-input"
                    value={form.newRegistryDate}
                    onChange={(e) => setForm({ ...form, newRegistryDate: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Resale Value */}
            <div className="form-card-box">
              <div className="form-card-prompt">
                <span>Resale deal value</span>
                <span className="form-card-badge">Total Property Value</span>
              </div>
              <div className="form-card-input-row">
                <span style={{ color: '#64748b', fontWeight: '600' }}>₹</span>
                <input
                  type="number"
                  required
                  min="0"
                  className="form-card-input"
                  value={form.transferDealValue}
                  onChange={(e) => setForm({ ...form, transferDealValue: Number(e.target.value) })}
                />
              </div>
            </div>

            {/* Monthly Rent + Tenure */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-card-box">
                <div className="form-card-prompt">
                  <span>New monthly rent</span>
                  <span className="form-card-badge">Monthly</span>
                </div>
                <div className="form-card-input-row">
                  <span style={{ color: '#64748b', fontWeight: '600' }}>₹</span>
                  <input
                    type="number"
                    min="0"
                    required
                    className="form-card-input"
                    value={form.newMonthlyRent}
                    onChange={(e) => setForm({ ...form, newMonthlyRent: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="form-card-box">
                <div className="form-card-prompt">
                  <span>Tenure (months)</span>
                  <span className="form-card-badge">Min 36 Mo</span>
                </div>
                <div className="form-card-input-row">
                  <input
                    type="number"
                    min="1"
                    required
                    className="form-card-input"
                    value={form.newTenureMonths}
                    onChange={(e) => setForm({ ...form, newTenureMonths: Math.max(1, Number(e.target.value)) })}
                  />
                </div>
              </div>
            </div>

            {/* TDS Choice Card */}
            <div className="form-card-box">
              <div className="form-card-prompt">
                <span>Apply 10% TDS deduction?</span>
              </div>
              <div className="form-card-choices">
                <label className="form-card-choice" onClick={() => setForm({ ...form, applyTds: true })}>
                  <input
                    type="radio"
                    name="applyTds"
                    checked={form.applyTds === true}
                    onChange={() => setForm({ ...form, applyTds: true })}
                    style={{ accentColor: '#17652f' }}
                  />
                  <span>Yes, deduct 10%</span>
                </label>
                <label className="form-card-choice" onClick={() => setForm({ ...form, applyTds: false })}>
                  <input
                    type="radio"
                    name="applyTds"
                    checked={form.applyTds === false}
                    onChange={() => setForm({ ...form, applyTds: false })}
                    style={{ accentColor: '#17652f' }}
                  />
                  <span>No deduction</span>
                </label>
              </div>
            </div>

            {/* Live Computed strip */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '10px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.8rem'
            }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.72rem', display: 'block' }}>Ending date</span>
                <strong style={{ color: '#0f172a' }}>{computedEndDateStr}</strong>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: '#64748b', fontSize: '0.72rem', display: 'block' }}>Total commitment</span>
                <strong style={{ color: '#17652f' }}>{formatINR(totalCommitment)}</strong>
              </div>
            </div>

            {/* Footer */}
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
                onClick={() => setStep(1)}
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
                Back
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
                {saving ? 'Transferring...' : 'Execute transfer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
