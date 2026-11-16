import React, { useState, useEffect } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { authService } from '../../services/authService.js';
import { agentService } from '../../services/agentService.js';

const STEPS = [
  { id: 1, title: 'Basic info' },
  { id: 2, title: 'Partner profile' },
  { id: 3, title: 'Bank details' },
];

const CITIES = [
  'Mathura', 'Vrindavan', 'Agra', 'Delhi NCR', 'Noida',
  'Gurugram', 'Faridabad', 'Aligarh', 'Bharatpur', 'Hathras',
  'Lucknow', 'Jaipur', 'Other',
];

export const AddAgentModal = ({ isOpen, onClose, onAgentAdded }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [agentRoleId, setAgentRoleId] = useState(null);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobileNo: '',
    username: '',
    password: '',
    agentCode: '',
    agencyName: '',
    tier: 'Standard',
    city: '',
    reraNumber: '',
    commissionType: 'percentage',
    commissionRate: 2,
    accountHolder: '',
    accountNumber: '',
    ifscCode: '',
    bankName: '',
    upiId: '',
  });

  useEffect(() => {
    if (isOpen) {
      (async () => {
        try {
          const res = await authService.getRoles();
          if (res.success && res.data) {
            const agentRole = res.data.find(r =>
              r.roleCode === 'agent' || r.roleName?.toLowerCase().includes('agent') || r.roleName?.toLowerCase().includes('channel')
            );
            if (agentRole) setAgentRoleId(agentRole._id);
          }
        } catch (err) {
          console.error('Failed to fetch roles:', err);
        }
      })();
      setCurrentStep(1);
      setError('');
      setForm({
        firstName: '', lastName: '', email: '', mobileNo: '',
        username: '', password: '',
        agentCode: '', agencyName: '', tier: 'Standard',
        city: '', reraNumber: '', commissionType: 'percentage', commissionRate: 2,
        accountHolder: '', accountNumber: '', ifscCode: '', bankName: '', upiId: '',
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (form.firstName && !form.username) {
      const base = `${form.firstName}${form.lastName ? '.' + form.lastName : ''}`.toLowerCase().replace(/\s+/g, '').slice(0, 20);
      setForm(f => ({ ...f, username: base }));
    }
  }, [form.firstName, form.lastName]);

  if (!isOpen) return null;

  const validateStep = (step) => {
    switch (step) {
      case 1:
        return form.firstName.trim() && form.email.trim() && form.username.trim() && form.password.length >= 4;
      case 2:
      case 3:
      default:
        return true;
    }
  };

  const goNext = (e) => {
    if (e) e.preventDefault();
    if (currentStep < STEPS.length && validateStep(currentStep)) {
      setCurrentStep(s => s + 1);
    }
  };

  const goPrev = () => {
    if (currentStep > 1) {
      setCurrentStep(s => s - 1);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!validateStep(1)) {
      setError('Please fill in required fields on Step 1');
      setCurrentStep(1);
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        name: `${form.firstName} ${form.lastName}`.trim(),
        username: form.username,
        email: form.email,
        password: form.password,
        mobile: form.mobileNo,
        role: agentRoleId || 'agent',
        agentProfile: {
          agentCode: form.agentCode || undefined,
          agencyName: form.agencyName || undefined,
          tier: form.tier,
          city: form.city || undefined,
          reraNumber: form.reraNumber || undefined,
          commissionType: form.commissionType,
          commissionRate: Number(form.commissionRate) || 2,
          bankDetails: {
            accountHolder: form.accountHolder || undefined,
            accountNumber: form.accountNumber || undefined,
            ifscCode: form.ifscCode || undefined,
            bankName: form.bankName || undefined,
            upiId: form.upiId || undefined,
          },
        },
      };

      const res = await agentService.createAgent(payload);
      if (res.success) {
        if (onAgentAdded) onAgentAdded(res.data);
        onClose();
      } else {
        setError(res.message || 'Failed to create agent');
      }
    } catch (err) {
      setError(err.message || 'Server error creating agent');
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
        maxWidth: '580px',
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
            Register channel partner
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            Step {currentStep} of {STEPS.length} — {STEPS[currentStep - 1].title}
          </p>
        </div>

        {/* Stepper Progress */}
        <div className="form-stepper-header" style={{ marginBottom: '22px' }}>
          {STEPS.map((s, idx) => (
            <React.Fragment key={s.id}>
              <div
                className={`form-stepper-item ${currentStep === s.id ? 'active' : ''} ${currentStep > s.id ? 'completed' : ''}`}
                onClick={() => { if (s.id < currentStep || validateStep(currentStep)) setCurrentStep(s.id); }}
                style={{ cursor: 'pointer' }}
              >
                <div className="form-stepper-circle">
                  {currentStep > s.id ? '✓' : s.id}
                </div>
                <span className="form-stepper-label">{s.title}</span>
              </div>
              {idx < STEPS.length - 1 && <div className={`form-stepper-line ${currentStep > s.id ? 'completed' : ''}`} />}
            </React.Fragment>
          ))}
        </div>

        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '0.82rem',
            marginBottom: '14px'
          }}>
            {error}
          </div>
        )}

        {/* STEP 1: Basic Info */}
        {currentStep === 1 && (
          <form onSubmit={goNext} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-card-box">
                <div className="form-card-prompt">
                  <span>First name *</span>
                </div>
                <div className="form-card-input-row">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajesh"
                    className="form-card-input"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-card-box">
                <div className="form-card-prompt">
                  <span>Last name</span>
                </div>
                <div className="form-card-input-row">
                  <input
                    type="text"
                    placeholder="e.g. Sharma"
                    className="form-card-input"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-card-box">
                <div className="form-card-prompt">
                  <span>Email address *</span>
                </div>
                <div className="form-card-input-row">
                  <input
                    type="email"
                    required
                    placeholder="partner@example.com"
                    className="form-card-input"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-card-box">
                <div className="form-card-prompt">
                  <span>Mobile number</span>
                </div>
                <div className="form-card-input-row">
                  <input
                    type="tel"
                    placeholder="9876543210"
                    className="form-card-input"
                    value={form.mobileNo}
                    onChange={(e) => setForm({ ...form, mobileNo: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-card-box">
                <div className="form-card-prompt">
                  <span>Portal username *</span>
                  <span className="form-card-badge">Login ID</span>
                </div>
                <div className="form-card-input-row">
                  <input
                    type="text"
                    required
                    placeholder="rajesh.sharma"
                    className="form-card-input"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                  />
                </div>
              </div>

              <div className="form-card-box">
                <div className="form-card-prompt">
                  <span>Password * (min 4 chars)</span>
                </div>
                <div className="form-card-input-row">
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className="form-card-input"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
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
                disabled={!validateStep(1)}
                style={{
                  padding: '9px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: validateStep(1) ? '#17652f' : '#cbd5e1',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '0.86rem',
                  cursor: validateStep(1) ? 'pointer' : 'not-allowed'
                }}
              >
                Continue
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: Profile */}
        {currentStep === 2 && (
          <form onSubmit={goNext} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-card-box">
                <div className="form-card-prompt">
                  <span>Partner code</span>
                  <span className="form-card-badge">Optional</span>
                </div>
                <div className="form-card-input-row">
                  <input
                    type="text"
                    placeholder="e.g. AGT-101"
                    className="form-card-input"
                    value={form.agentCode}
                    onChange={(e) => setForm({ ...form, agentCode: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>

              <div className="form-card-box">
                <div className="form-card-prompt">
                  <span>Agency or firm name</span>
                </div>
                <div className="form-card-input-row">
                  <input
                    type="text"
                    placeholder="e.g. Sharma Real Estate"
                    className="form-card-input"
                    value={form.agencyName}
                    onChange={(e) => setForm({ ...form, agencyName: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-card-box">
                <div className="form-card-prompt">
                  <span>Partner tier</span>
                </div>
                <div className="form-card-input-row">
                  <select
                    value={form.tier}
                    onChange={(e) => setForm({ ...form, tier: e.target.value })}
                    className="form-card-input"
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="Standard">Standard</option>
                    <option value="Silver">Silver</option>
                    <option value="Gold">Gold</option>
                    <option value="Platinum">Platinum</option>
                  </select>
                </div>
              </div>

              <div className="form-card-box">
                <div className="form-card-prompt">
                  <span>Operating city</span>
                </div>
                <div className="form-card-input-row">
                  <select
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="form-card-input"
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="">Select city...</option>
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="form-card-box">
              <div className="form-card-prompt">
                <span>RERA registration number</span>
                <span className="form-card-badge">Compliance</span>
              </div>
              <div className="form-card-input-row">
                <input
                  type="text"
                  placeholder="e.g. UPRERAPRJ12345"
                  className="form-card-input"
                  value={form.reraNumber}
                  onChange={(e) => setForm({ ...form, reraNumber: e.target.value })}
                />
              </div>
            </div>

            {/* Commission choices */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-card-box">
                <div className="form-card-prompt">
                  <span>Commission type</span>
                </div>
                <div className="form-card-choices">
                  <label className="form-card-choice" onClick={() => setForm({ ...form, commissionType: 'percentage' })}>
                    <input
                      type="radio"
                      name="commissionType"
                      checked={form.commissionType === 'percentage'}
                      onChange={() => setForm({ ...form, commissionType: 'percentage' })}
                      style={{ accentColor: '#17652f' }}
                    />
                    <span>Percentage (%)</span>
                  </label>
                  <label className="form-card-choice" onClick={() => setForm({ ...form, commissionType: 'flat' })}>
                    <input
                      type="radio"
                      name="commissionType"
                      checked={form.commissionType === 'flat'}
                      onChange={() => setForm({ ...form, commissionType: 'flat' })}
                      style={{ accentColor: '#17652f' }}
                    />
                    <span>Flat (₹)</span>
                  </label>
                </div>
              </div>

              <div className="form-card-box">
                <div className="form-card-prompt">
                  <span>Commission rate {form.commissionType === 'percentage' ? '(%)' : '(₹)'}</span>
                </div>
                <div className="form-card-input-row">
                  <input
                    type="number"
                    min="0"
                    step={form.commissionType === 'percentage' ? '0.5' : '1000'}
                    className="form-card-input"
                    value={form.commissionRate}
                    onChange={(e) => setForm({ ...form, commissionRate: Number(e.target.value) })}
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
                onClick={goPrev}
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

        {/* STEP 3: Bank Details */}
        {currentStep === 3 && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-card-box">
                <div className="form-card-prompt">
                  <span>Account holder name</span>
                </div>
                <div className="form-card-input-row">
                  <input
                    type="text"
                    placeholder="As per bank passbook"
                    className="form-card-input"
                    value={form.accountHolder}
                    onChange={(e) => setForm({ ...form, accountHolder: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-card-box">
                <div className="form-card-prompt">
                  <span>Bank name</span>
                </div>
                <div className="form-card-input-row">
                  <input
                    type="text"
                    placeholder="e.g. HDFC Bank"
                    className="form-card-input"
                    value={form.bankName}
                    onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-card-box">
                <div className="form-card-prompt">
                  <span>Account number</span>
                </div>
                <div className="form-card-input-row">
                  <input
                    type="text"
                    placeholder="e.g. 123456789012"
                    className="form-card-input"
                    value={form.accountNumber}
                    onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-card-box">
                <div className="form-card-prompt">
                  <span>IFSC code</span>
                </div>
                <div className="form-card-input-row">
                  <input
                    type="text"
                    placeholder="e.g. HDFC0001234"
                    className="form-card-input"
                    value={form.ifscCode}
                    onChange={(e) => setForm({ ...form, ifscCode: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>
            </div>

            <div className="form-card-box">
              <div className="form-card-prompt">
                <span>UPI ID (optional)</span>
              </div>
              <div className="form-card-input-row">
                <input
                  type="text"
                  placeholder="e.g. name@upi"
                  className="form-card-input"
                  value={form.upiId}
                  onChange={(e) => setForm({ ...form, upiId: e.target.value })}
                />
              </div>
            </div>

            {/* Summary Preview */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '10px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.82rem'
            }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.72rem', display: 'block' }}>Partner</span>
                <strong style={{ color: '#0f172a' }}>{`${form.firstName} ${form.lastName}`.trim() || '—'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.72rem', display: 'block' }}>Username</span>
                <strong style={{ color: '#0f172a' }}>{form.username || '—'}</strong>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: '#64748b', fontSize: '0.72rem', display: 'block' }}>Commission</span>
                <strong style={{ color: '#17652f' }}>
                  {form.commissionType === 'percentage' ? `${form.commissionRate}%` : `₹${form.commissionRate}`}
                </strong>
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
                onClick={goPrev}
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
                disabled={saving || !validateStep(1)}
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
                {saving ? 'Registering...' : 'Register partner'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddAgentModal;
