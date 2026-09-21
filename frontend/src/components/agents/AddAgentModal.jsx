import React, { useState, useEffect } from 'react';
import {
  X, User, Phone, Mail, MapPin, Building2, Shield, Star,
  DollarSign, Hash, ChevronRight, ArrowLeft, CheckCircle2,
  Briefcase, CreditCard, Sparkles, UserPlus
} from 'lucide-react';
import { authService } from '../../services/authService.js';

const STEPS = [
  { id: 1, title: 'Basic Info', subtitle: 'Name & Login', icon: User, color: '#2563eb' },
  { id: 2, title: 'Agent Profile', subtitle: 'Agency & Commission', icon: Briefcase, color: '#7c3aed' },
  { id: 3, title: 'Bank Details', subtitle: 'Payment Info', icon: CreditCard, color: '#16a34a' },
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
    // Step 1 - Basic Info
    firstName: '',
    lastName: '',
    email: '',
    mobileNo: '',
    username: '',
    password: '',
    // Step 2 - Agent Profile
    agentCode: '',
    agencyName: '',
    tier: 'Standard',
    city: '',
    reraNumber: '',
    commissionType: 'percentage',
    commissionRate: 2,
    // Step 3 - Bank Details
    accountHolder: '',
    accountNumber: '',
    ifscCode: '',
    bankName: '',
    upiId: '',
  });

  // Fetch agent role ID on mount
  useEffect(() => {
    if (isOpen) {
      (async () => {
        try {
          const res = await authService.getRoles();
          if (res.success && res.data) {
            const agentRole = res.data.find(r =>
              r.roleCode === 'agent' || r.roleName?.toLowerCase().includes('agent') || r.roleName?.toLowerCase().includes('channel')
            );
            if (agentRole) {
              setAgentRoleId(agentRole._id);
            }
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

  // Auto-generate username from name
  useEffect(() => {
    if (form.firstName && !form.username) {
      const base = `${form.firstName}${form.lastName ? '.' + form.lastName : ''}`.toLowerCase().replace(/\s+/g, '').slice(0, 20);
      setForm(f => ({ ...f, username: base }));
    }
  }, [form.firstName, form.lastName]);

  if (!isOpen) return null;

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1.5px solid #e2e8f0',
    fontSize: '0.88rem',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    fontFamily: "'Inter', sans-serif",
    background: '#ffffff',
  };

  const inputFocusStyle = {
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.72rem',
    fontWeight: '700',
    color: '#64748b',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        return form.firstName.trim() && form.email.trim() && form.username.trim() && form.password.length >= 4;
      case 2:
        return true; // Optional fields
      case 3:
        return true; // Optional fields
      default:
        return true;
    }
  };

  const goNext = () => {
    if (currentStep < STEPS.length && validateStep(currentStep)) {
      setCurrentStep(s => s + 1);
    }
  };

  const goPrev = () => {
    if (currentStep > 1) {
      setCurrentStep(s => s - 1);
    }
  };

  const goToStep = (step) => {
    if (step < currentStep || validateStep(currentStep)) {
      setCurrentStep(step);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      const userData = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        mobileNo: form.mobileNo.trim(),
        username: form.username.trim().toLowerCase(),
        password: form.password,
        roleId: agentRoleId,
        status: 'active',
        agentProfile: {
          agentCode: form.agentCode.trim().toUpperCase() || undefined,
          agencyName: form.agencyName.trim() || undefined,
          tier: form.tier,
          city: form.city || undefined,
          reraNumber: form.reraNumber.trim() || undefined,
          commissionType: form.commissionType,
          commissionRate: Number(form.commissionRate) || 2,
          bankDetails: {
            accountHolder: form.accountHolder.trim() || undefined,
            accountNumber: form.accountNumber.trim() || undefined,
            ifscCode: form.ifscCode.trim().toUpperCase() || undefined,
            bankName: form.bankName.trim() || undefined,
            upiId: form.upiId.trim() || undefined,
          },
        },
      };

      if (!agentRoleId) {
        setError('Agent role not found in the system. Please create an "Agent" role first in Settings > Roles.');
        setSaving(false);
        return;
      }

      const res = await authService.createUser(userData);
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

  // ==========================================
  // STEP 1: Basic Info
  // ==========================================
  const renderStep1 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', animation: 'stepFadeIn 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '10px',
          background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <User size={16} color="#fff" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>Basic Information</h3>
          <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b' }}>Agent personal details & login credentials</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <div>
          <label style={labelStyle}>First Name *</label>
          <input
            type="text"
            required
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            placeholder="e.g. Rajesh"
            style={inputStyle}
            onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
            onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
          />
        </div>
        <div>
          <label style={labelStyle}>Last Name</label>
          <input
            type="text"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            placeholder="e.g. Sharma"
            style={inputStyle}
            onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
            onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <div>
          <label style={labelStyle}>Email Address *</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="agent@example.com"
            style={inputStyle}
            onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
            onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
          />
        </div>
        <div>
          <label style={labelStyle}>Mobile Number</label>
          <input
            type="text"
            value={form.mobileNo}
            onChange={(e) => setForm({ ...form, mobileNo: e.target.value })}
            placeholder="9876543210"
            style={inputStyle}
            onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
            onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
          />
        </div>
      </div>

      <div style={{
        padding: '16px', background: '#f8fafc', borderRadius: '12px',
        border: '1px solid #e2e8f0',
      }}>
        <h4 style={{ margin: '0 0 12px', fontSize: '0.82rem', fontWeight: '700', color: '#334155' }}>
          🔐 Login Credentials
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={labelStyle}>Username *</label>
            <input
              type="text"
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
              placeholder="rajesh.sharma"
              style={{ ...inputStyle, fontFamily: 'monospace' }}
              onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
              onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
          <div>
            <label style={labelStyle}>Password * (min 4 chars)</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              style={inputStyle}
              onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
              onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // STEP 2: Agent Profile
  // ==========================================
  const renderStep2 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', animation: 'stepFadeIn 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '10px',
          background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Briefcase size={16} color="#fff" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>Agent Profile</h3>
          <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b' }}>Agency details, tier, and commission setup</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <div>
          <label style={labelStyle}>Agent Code</label>
          <input
            type="text"
            value={form.agentCode}
            onChange={(e) => setForm({ ...form, agentCode: e.target.value.toUpperCase() })}
            placeholder="e.g. AGT-101"
            style={{ ...inputStyle, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '700' }}
            onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
            onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
          />
        </div>
        <div>
          <label style={labelStyle}>Agency Name</label>
          <input
            type="text"
            value={form.agencyName}
            onChange={(e) => setForm({ ...form, agencyName: e.target.value })}
            placeholder="e.g. Sharma Real Estate"
            style={inputStyle}
            onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
            onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <div>
          <label style={labelStyle}>Tier</label>
          <select
            value={form.tier}
            onChange={(e) => setForm({ ...form, tier: e.target.value })}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            <option value="Standard">📋 Standard</option>
            <option value="Silver">🥈 Silver</option>
            <option value="Gold">🥇 Gold</option>
            <option value="Platinum">💎 Platinum</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>City</label>
          <select
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            <option value="">Select City...</option>
            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label style={labelStyle}>RERA Number</label>
        <input
          type="text"
          value={form.reraNumber}
          onChange={(e) => setForm({ ...form, reraNumber: e.target.value })}
          placeholder="e.g. UPRERAPRJ12345"
          style={inputStyle}
          onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
          onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
        />
      </div>

      {/* Commission Setup */}
      <div style={{
        padding: '16px', background: '#f0fdf4', borderRadius: '12px',
        border: '1.5px solid #86efac',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
          <DollarSign size={15} color="#16a34a" />
          <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#166534' }}>Commission Setup</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={labelStyle}>Commission Type</label>
            <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '8px', padding: '3px', gap: '2px' }}>
              <button
                type="button"
                onClick={() => setForm({ ...form, commissionType: 'percentage' })}
                style={{
                  flex: 1, padding: '6px 12px', fontSize: '0.78rem', fontWeight: '700',
                  borderRadius: '6px', border: 'none', cursor: 'pointer',
                  background: form.commissionType === 'percentage' ? '#16a34a' : 'transparent',
                  color: form.commissionType === 'percentage' ? '#ffffff' : '#475569',
                  transition: 'all 0.2s',
                }}
              >% Percentage</button>
              <button
                type="button"
                onClick={() => setForm({ ...form, commissionType: 'flat' })}
                style={{
                  flex: 1, padding: '6px 12px', fontSize: '0.78rem', fontWeight: '700',
                  borderRadius: '6px', border: 'none', cursor: 'pointer',
                  background: form.commissionType === 'flat' ? '#16a34a' : 'transparent',
                  color: form.commissionType === 'flat' ? '#ffffff' : '#475569',
                  transition: 'all 0.2s',
                }}
              >₹ Flat Amount</button>
            </div>
          </div>
          <div>
            <label style={labelStyle}>
              Commission Rate {form.commissionType === 'percentage' ? '(%)' : '(₹)'}
            </label>
            <input
              type="number"
              min="0"
              step={form.commissionType === 'percentage' ? '0.5' : '1000'}
              value={form.commissionRate}
              onChange={(e) => setForm({ ...form, commissionRate: Number(e.target.value) })}
              style={{ ...inputStyle, fontWeight: '800', fontSize: '1rem' }}
              onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
              onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // STEP 3: Bank Details
  // ==========================================
  const renderStep3 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', animation: 'stepFadeIn 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '10px',
          background: 'linear-gradient(135deg, #16a34a, #15803d)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CreditCard size={16} color="#fff" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>Bank & Payment Details</h3>
          <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b' }}>For commission payouts (can be updated later)</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <div>
          <label style={labelStyle}>Account Holder Name</label>
          <input
            type="text"
            value={form.accountHolder}
            onChange={(e) => setForm({ ...form, accountHolder: e.target.value })}
            placeholder="As per bank records"
            style={inputStyle}
            onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
            onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
          />
        </div>
        <div>
          <label style={labelStyle}>Bank Name</label>
          <input
            type="text"
            value={form.bankName}
            onChange={(e) => setForm({ ...form, bankName: e.target.value })}
            placeholder="e.g. HDFC Bank"
            style={inputStyle}
            onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
            onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <div>
          <label style={labelStyle}>Account Number</label>
          <input
            type="text"
            value={form.accountNumber}
            onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
            placeholder="e.g. 1234567890123"
            style={{ ...inputStyle, letterSpacing: '0.1em' }}
            onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
            onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
          />
        </div>
        <div>
          <label style={labelStyle}>IFSC Code</label>
          <input
            type="text"
            value={form.ifscCode}
            onChange={(e) => setForm({ ...form, ifscCode: e.target.value.toUpperCase() })}
            placeholder="e.g. HDFC0001234"
            style={{ ...inputStyle, textTransform: 'uppercase', letterSpacing: '0.1em' }}
            onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
            onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>UPI ID</label>
        <input
          type="text"
          value={form.upiId}
          onChange={(e) => setForm({ ...form, upiId: e.target.value })}
          placeholder="e.g. rajesh@upi"
          style={inputStyle}
          onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
          onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
        />
      </div>

      {/* Summary Preview */}
      <div style={{
        padding: '16px 18px', background: '#f8fafc',
        borderRadius: '12px', border: '1px solid #e2e8f0',
      }}>
        <h4 style={{ margin: '0 0 10px', fontSize: '0.82rem', fontWeight: '800', color: '#334155' }}>
          📋 Agent Summary
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.82rem' }}>
          {[
            { label: 'Name', value: `${form.firstName} ${form.lastName}`.trim() || '—' },
            { label: 'Username', value: form.username || '—' },
            { label: 'Email', value: form.email || '—' },
            { label: 'Mobile', value: form.mobileNo || '—' },
            { label: 'Agent Code', value: form.agentCode || 'Auto-generated' },
            { label: 'Agency', value: form.agencyName || '—' },
            { label: 'Tier', value: form.tier },
            { label: 'Commission', value: form.commissionType === 'percentage' ? `${form.commissionRate}%` : `₹${form.commissionRate}` },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '5px 10px', borderRadius: '6px',
              background: i % 2 === 0 ? '#ffffff' : '#f1f5f9',
            }}>
              <span style={{ color: '#64748b', fontWeight: '600' }}>{item.label}</span>
              <span style={{ color: '#0f172a', fontWeight: '700' }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      default: return null;
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1100, padding: '16px',
      }}
    >
      <div
        style={{
          background: '#ffffff', borderRadius: '20px',
          width: '100%', maxWidth: '640px', maxHeight: '92vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
        }}
      >
        {/* HEADER */}
        <div style={{
          padding: '18px 24px',
          background: 'linear-gradient(135deg, #1e3a8a, #0f172a)',
          color: '#ffffff',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <UserPlus size={20} />
              <span style={{ fontSize: '1.15rem', fontWeight: '800' }}>Add New Agent</span>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: '#93c5fd' }}>
              Step {currentStep} of {STEPS.length} — {STEPS[currentStep - 1].subtitle}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)', border: 'none',
              borderRadius: '8px', color: '#94a3b8', cursor: 'pointer',
              padding: '8px', display: 'flex', alignItems: 'center',
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            <X size={18} />
          </button>
        </div>

        {/* STEPPER */}
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '14px 24px', background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
        }}>
          {STEPS.map((step, idx) => {
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            const StepIcon = step.icon;
            return (
              <React.Fragment key={step.id}>
                <button
                  type="button"
                  onClick={() => goToStep(step.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 14px', borderRadius: '10px', border: 'none',
                    cursor: 'pointer',
                    background: isActive ? '#ffffff' : 'transparent',
                    boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.2s ease', flex: 1,
                  }}
                >
                  <div style={{
                    width: '30px', height: '30px', borderRadius: '8px',
                    background: isCompleted
                      ? 'linear-gradient(135deg, #16a34a, #15803d)'
                      : isActive
                        ? `linear-gradient(135deg, ${step.color}, ${step.color}dd)`
                        : '#e2e8f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.3s ease', flexShrink: 0,
                  }}>
                    {isCompleted ? (
                      <CheckCircle2 size={14} color="#fff" />
                    ) : (
                      <StepIcon size={14} color={isActive ? '#fff' : '#94a3b8'} />
                    )}
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{
                      fontSize: '0.72rem', fontWeight: '800',
                      color: isActive ? '#0f172a' : isCompleted ? '#16a34a' : '#94a3b8',
                    }}>{step.title}</div>
                  </div>
                </button>
                {idx < STEPS.length - 1 && (
                  <div style={{
                    width: '20px', height: '2px', flexShrink: 0,
                    background: isCompleted ? '#16a34a' : '#e2e8f0',
                    borderRadius: '1px',
                  }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* CONTENT */}
        <div style={{ padding: '22px 24px', overflowY: 'auto', flex: 1 }}>
          {renderCurrentStep()}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            margin: '0 24px 12px', padding: '10px 14px',
            background: '#fef2f2', border: '1px solid #fca5a5',
            borderRadius: '8px', fontSize: '0.82rem', color: '#dc2626', fontWeight: '600',
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* FOOTER */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 24px', borderTop: '1px solid #e2e8f0',
          background: '#ffffff',
        }}>
          <button
            type="button"
            onClick={currentStep === 1 ? onClose : goPrev}
            style={{
              padding: '10px 20px', borderRadius: '10px',
              border: '1px solid #e2e8f0', background: '#ffffff',
              color: '#475569', fontSize: '0.84rem', fontWeight: '700',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              transition: 'all 0.2s',
            }}
          >
            {currentStep === 1 ? 'Cancel' : <><ArrowLeft size={15} /> Back</>}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {STEPS.map((step) => (
              <div
                key={step.id}
                style={{
                  width: currentStep === step.id ? '24px' : '8px',
                  height: '8px', borderRadius: '4px',
                  background: currentStep >= step.id
                    ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : '#e2e8f0',
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </div>

          {currentStep < STEPS.length ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!validateStep(currentStep)}
              style={{
                padding: '10px 24px', borderRadius: '10px', border: 'none',
                background: validateStep(currentStep)
                  ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : '#e2e8f0',
                color: validateStep(currentStep) ? '#ffffff' : '#94a3b8',
                fontSize: '0.84rem', fontWeight: '800',
                cursor: validateStep(currentStep) ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', gap: '6px',
                boxShadow: validateStep(currentStep) ? '0 4px 12px rgba(37,99,235,0.35)' : 'none',
              }}
            >
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || !validateStep(1)}
              style={{
                padding: '10px 24px', borderRadius: '10px', border: 'none',
                background: 'linear-gradient(135deg, #16a34a, #15803d)',
                color: '#ffffff', fontSize: '0.84rem', fontWeight: '800',
                cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(22,163,74,0.35)',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}
            >
              <UserPlus size={16} />
              {saving ? 'Creating...' : 'Create Agent'}
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes stepFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default AddAgentModal;
