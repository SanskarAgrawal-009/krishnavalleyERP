import React, { useState, useEffect } from 'react';
import {
  User, Phone, Mail, Home, MessageSquare, Plus, Users, Zap, MapPin, Tag,
  Calendar, DollarSign, X, ChevronRight, ArrowLeft, CheckCircle2, UserPlus,
  Briefcase, Clock
} from 'lucide-react';
import { projectService } from '../../services/projectService.js';
import { sanitizeAlphabetsOnly, sanitizePhone, sanitizeEmail, isValidEmail } from '../../utils/inputValidators.js';

const STEPS = [
  { id: 1, title: 'Contact Info', subtitle: 'Name & Contact', icon: User, color: '#2563eb' },
  { id: 2, title: 'Requirements', subtitle: 'Budget & Preferences', icon: Tag, color: '#7c3aed' },
  { id: 3, title: 'Assignment', subtitle: 'Team & Follow-Up', icon: Users, color: '#16a34a' },
];

export const ManualLeadModal = ({ isOpen, onClose, onSubmit, lead = null, teamMembers = [] }) => {
  const [formData, setFormData] = useState({
    name: '',
    mobileNo: '',
    email: '',
    city: '',
    state: '',
    requirement: '',
    budget: '',
    purchaseTimeline: '',
    leadSource: 'direct',
    assignedFlat: '',
    assignedTo: 'auto',
    addInitialFollowUp: false,
    initialFollowUp: {
      mode: 'call',
      notes: '',
      nextFollowUpDate: '',
      status: 'pending'
    }
  });

  const [flats, setFlats] = useState([]);
  const [loadingFlats, setLoadingFlats] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Fetch available flats for assignment dropdown
  useEffect(() => {
    if (isOpen) {
      setLoadingFlats(true);
      projectService.getFlats()
        .then((res) => {
          if (res.data) setFlats(res.data);
        })
        .catch((err) => console.error('Error loading flats:', err))
        .finally(() => setLoadingFlats(false));
    }
  }, [isOpen]);

  useEffect(() => {
    if (lead) {
      setFormData({
        name: lead.name || '',
        mobileNo: lead.mobileNo || '',
        email: lead.email || '',
        city: lead.city || '',
        state: lead.state || '',
        requirement: lead.requirement || '',
        budget: lead.budget !== undefined && lead.budget !== null ? lead.budget : '',
        purchaseTimeline: lead.purchaseTimeline || '',
        leadSource: lead.leadSource || 'direct',
        assignedFlat: lead.assignedFlat?._id || lead.assignedFlat || '',
        assignedTo: lead.assignedTo?._id || lead.assignedTo || 'auto',
        addInitialFollowUp: false,
        initialFollowUp: {
          mode: 'call',
          notes: '',
          nextFollowUpDate: '',
          status: 'pending'
        }
      });
    } else {
      setFormData({
        name: '',
        mobileNo: '',
        email: '',
        city: '',
        state: '',
        requirement: '',
        budget: '',
        purchaseTimeline: '',
        leadSource: 'direct',
        assignedFlat: '',
        assignedTo: 'auto',
        addInitialFollowUp: false,
        initialFollowUp: {
          mode: 'call',
          notes: '',
          nextFollowUpDate: '',
          status: 'pending'
        }
      });
    }
    setCurrentStep(1);
  }, [lead, isOpen]);

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      alert('Please enter prospect full name');
      setCurrentStep(1);
      return;
    }

    if (!formData.mobileNo.trim() || formData.mobileNo.replace(/\D/g, '').length < 10) {
      alert('Please enter a valid 10-digit mobile number');
      setCurrentStep(1);
      return;
    }

    if (formData.email && !isValidEmail(formData.email)) {
      alert('Please enter a valid email address');
      setCurrentStep(1);
      return;
    }

    const payload = {
      name: formData.name.trim(),
      mobileNo: formData.mobileNo.trim(),
      email: formData.email.trim(),
      city: formData.city.trim(),
      state: formData.state.trim(),
      requirement: formData.requirement.trim(),
      budget: formData.budget !== '' && !isNaN(formData.budget) ? Number(formData.budget) : undefined,
      purchaseTimeline: formData.purchaseTimeline,
      leadSource: formData.leadSource,
      assignedFlat: formData.assignedFlat || null,
      assignedTo: formData.assignedTo,
    };

    if (!lead && formData.addInitialFollowUp && (formData.initialFollowUp.notes || formData.initialFollowUp.nextFollowUpDate)) {
      payload.initialFollowUp = {
        date: new Date(),
        mode: formData.initialFollowUp.mode,
        notes: formData.initialFollowUp.notes.trim(),
        nextFollowUpDate: formData.initialFollowUp.nextFollowUpDate ? new Date(formData.initialFollowUp.nextFollowUpDate) : null,
        status: formData.initialFollowUp.status
      };
    }

    onSubmit(payload);
  };

  if (!isOpen) return null;

  const validateStep = (step) => {
    switch (step) {
      case 1:
        return formData.name.trim().length > 0 && formData.mobileNo.replace(/\D/g, '').length >= 10;
      case 2:
        return true; // All optional
      case 3:
        return true; // All optional
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

  // Common styles
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
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.72rem',
    fontWeight: '700',
    color: '#64748b',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  const applyFocus = (e) => Object.assign(e.target.style, inputFocusStyle);
  const removeFocus = (e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; };

  // ==========================================
  // STEP 1: Contact Info
  // ==========================================
  const renderStep1 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', animation: 'stepSlideIn 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '10px',
          background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <User size={16} color="#fff" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>Contact Information</h3>
          <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b' }}>Prospect name, phone number & email</p>
        </div>
      </div>

      {/* Full Name */}
      <div>
        <label style={labelStyle}>
          <User size={13} color="#2563eb" />
          Prospect Full Name * (Alphabets only)
        </label>
        <input
          type="text"
          required
          placeholder="e.g. Ramesh Chandra Sharma"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: sanitizeAlphabetsOnly(e.target.value) })}
          style={{ ...inputStyle, fontSize: '1rem', fontWeight: '700' }}
          onFocus={applyFocus}
          onBlur={removeFocus}
          autoFocus
        />
      </div>

      {/* Mobile & Email */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <div>
          <label style={labelStyle}>
            <Phone size={13} color="#16a34a" />
            Mobile Number * (10 digits)
          </label>
          <input
            type="tel"
            required
            placeholder="+91 98765 43210"
            value={formData.mobileNo}
            onChange={(e) => setFormData({ ...formData, mobileNo: sanitizePhone(e.target.value) })}
            style={inputStyle}
            onFocus={applyFocus}
            onBlur={removeFocus}
          />
        </div>
        <div>
          <label style={labelStyle}>
            <Mail size={13} color="#2563eb" />
            Email Address
          </label>
          <input
            type="email"
            placeholder="ramesh@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: sanitizeEmail(e.target.value) })}
            style={inputStyle}
            onFocus={applyFocus}
            onBlur={removeFocus}
          />
        </div>
      </div>

      {/* City & State */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <div>
          <label style={labelStyle}>
            <MapPin size={13} color="#0284c7" />
            City / Location
          </label>
          <input
            type="text"
            placeholder="e.g. Hisar, Delhi, Gurugram"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            style={inputStyle}
            onFocus={applyFocus}
            onBlur={removeFocus}
          />
        </div>
        <div>
          <label style={labelStyle}>
            <MapPin size={13} color="#64748b" />
            State / Province
          </label>
          <input
            type="text"
            placeholder="e.g. Haryana, Delhi, Punjab"
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            style={inputStyle}
            onFocus={applyFocus}
            onBlur={removeFocus}
          />
        </div>
      </div>

      {/* Validation hint */}
      {formData.name && formData.mobileNo && (
        <div style={{
          padding: '10px 14px', background: '#f0fdf4', borderRadius: '10px',
          border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <CheckCircle2 size={16} color="#16a34a" />
          <span style={{ fontSize: '0.78rem', color: '#166534', fontWeight: '600' }}>
            Contact details captured — proceed to add requirements
          </span>
        </div>
      )}
    </div>
  );

  // ==========================================
  // STEP 2: Requirements
  // ==========================================
  const renderStep2 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', animation: 'stepSlideIn 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '10px',
          background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Tag size={16} color="#fff" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>Requirements & Preferences</h3>
          <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b' }}>What the prospect is looking for, budget & timeline</p>
        </div>
      </div>

      {/* Requirement & Budget */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <div>
          <label style={labelStyle}>
            <Tag size={13} color="#7c3aed" />
            Requirement / Looking For
          </label>
          <input
            type="text"
            placeholder="e.g. 2BHK, 3BHK, Villa, Commercial"
            value={formData.requirement}
            onChange={(e) => setFormData({ ...formData, requirement: e.target.value })}
            style={inputStyle}
            onFocus={applyFocus}
            onBlur={removeFocus}
          />
        </div>
        <div>
          <label style={labelStyle}>
            <DollarSign size={13} color="#16a34a" />
            Budget (₹)
          </label>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
              fontWeight: '700', color: '#16a34a', fontSize: '0.9rem',
            }}>₹</span>
            <input
              type="number"
              placeholder="e.g. 4500000"
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
              style={{ ...inputStyle, paddingLeft: '28px', fontWeight: '700' }}
              onFocus={applyFocus}
              onBlur={removeFocus}
            />
          </div>
          {formData.budget && Number(formData.budget) > 0 && (
            <span style={{ fontSize: '0.72rem', color: '#7c3aed', fontWeight: '600', marginTop: '4px', display: 'block' }}>
              ≈ ₹{(Number(formData.budget) / 100000).toFixed(1)} Lakh
            </span>
          )}
        </div>
      </div>

      {/* Timeline & Source */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <div>
          <label style={labelStyle}>
            <Calendar size={13} color="#ea580c" />
            Purchase Timeline
          </label>
          <select
            value={formData.purchaseTimeline}
            onChange={(e) => setFormData({ ...formData, purchaseTimeline: e.target.value })}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            <option value="">-- Select Timeline --</option>
            <option value="immediate">🔥 Immediate / Ready to Move</option>
            <option value="within_1_month">📅 Within 1 Month</option>
            <option value="within_3_months">📅 Within 3 Months</option>
            <option value="within_6_months">📅 Within 6 Months</option>
            <option value="within_2-3_months">📅 Within 2-3 Months</option>
            <option value="6+_months">⏳ 6+ Months</option>
            <option value="exploring">🔍 Exploring / Long Term</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>
            <Zap size={13} color="#0284c7" />
            Lead Source
          </label>
          <select
            value={formData.leadSource}
            onChange={(e) => setFormData({ ...formData, leadSource: e.target.value })}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            <option value="direct">🚶 Direct Walk-in / Inquiry</option>
            <option value="website">🌐 Website Inquiry</option>
            <option value="referral">🤝 Referral</option>
            <option value="phone">📞 Phone / Cold Call</option>
            <option value="meta_ads">📱 Meta Ads</option>
            <option value="bulk_upload">📊 Excel Bulk Import</option>
            <option value="channel_partner">🏢 Channel Partner</option>
            <option value="other">📋 Other</option>
          </select>
        </div>
      </div>

      {/* Info banner */}
      <div style={{
        padding: '10px 14px', background: '#f5f3ff', borderRadius: '10px',
        border: '1px solid #ddd6fe', display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        <Zap size={16} color="#7c3aed" />
        <span style={{ fontSize: '0.78rem', color: '#5b21b6', fontWeight: '600' }}>
          These details help prioritize and route leads effectively
        </span>
      </div>
    </div>
  );

  // ==========================================
  // STEP 3: Assignment & Follow-up
  // ==========================================
  const renderStep3 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', animation: 'stepSlideIn 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '10px',
          background: 'linear-gradient(135deg, #16a34a, #15803d)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Users size={16} color="#fff" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>Assignment & Follow-Up</h3>
          <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b' }}>Assign to team, flat unit, and schedule first activity</p>
        </div>
      </div>

      {/* Assign to Sales Team */}
      <div>
        <label style={labelStyle}>
          <Users size={13} color="#2563eb" />
          Assign Lead To (In-House Team)
        </label>
        <select
          value={formData.assignedTo}
          onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          <option value="auto">⚡ Auto-Assign (Round-Robin 1-by-1)</option>
          <option value="unassigned">📋 Leave Unassigned</option>
          {teamMembers.map((m) => {
            const u = m.userId || m;
            return (
              <option key={u._id} value={u._id}>
                {u.firstName} {u.lastName || ''} ({m.roleTitle || 'Sales Member'})
              </option>
            );
          })}
        </select>
        <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
          Auto-Assign distributes leads sequentially across sales executives in circular rotation.
        </span>
      </div>

      {/* Assign Flat */}
      <div>
        <label style={labelStyle}>
          <Home size={13} color="#8b5cf6" />
          Assign Flat / Unit (Optional)
        </label>
        <select
          value={formData.assignedFlat}
          onChange={(e) => setFormData({ ...formData, assignedFlat: e.target.value })}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          <option value="">-- No Flat Assigned (General Prospect) --</option>
          {flats.map((f) => {
            const projName = f.projectId?.projectName || 'Project';
            const bldName = f.buildingName || 'Tower';
            const flr = f.floor !== undefined && f.floor !== null ? f.floor : 1;
            return (
              <option key={f._id} value={f._id}>
                Flat {f.flatNumber} • Floor {flr} • {bldName} [{projName}] - {f.bhkType || '2BHK'} ({f.status})
              </option>
            );
          })}
        </select>
        {formData.assignedFlat && (() => {
          const selected = flats.find((f) => f._id === formData.assignedFlat);
          if (!selected) return null;
          return (
            <div style={{
              marginTop: '6px', padding: '8px 12px',
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              borderRadius: '8px', fontSize: '0.78rem', color: '#166534',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              <span>🏢 <strong>Floor:</strong> {selected.floor || 1}</span>
              <span>•</span>
              <span>🏛️ <strong>Tower:</strong> {selected.buildingName || 'Main Tower'}</span>
              <span>•</span>
              <span>🏠 <strong>BHK:</strong> {selected.bhkType || '2BHK'}</span>
              <span>•</span>
              <span>🏷️ <strong>Status:</strong> {selected.status}</span>
            </div>
          );
        })()}
      </div>

      {/* Initial Follow-Up */}
      {!lead && (
        <div style={{
          background: '#f8fafc', border: '1px solid #e2e8f0',
          borderRadius: '12px', padding: '16px 18px',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: formData.addInitialFollowUp ? '14px' : '0',
          }}>
            <label
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                fontSize: '0.82rem', fontWeight: '700', color: '#334155', cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={formData.addInitialFollowUp}
                onChange={(e) => setFormData({ ...formData, addInitialFollowUp: e.target.checked })}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2563eb' }}
              />
              <Clock size={14} color="#ea580c" />
              Log First Follow-up Activity Now
            </label>
          </div>

          {formData.addInitialFollowUp && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Mode of Contact *</label>
                  <select
                    value={formData.initialFollowUp.mode}
                    onChange={(e) => setFormData({
                      ...formData,
                      initialFollowUp: { ...formData.initialFollowUp, mode: e.target.value }
                    })}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    <option value="call">📞 Phone Call</option>
                    <option value="whatsapp">💬 WhatsApp</option>
                    <option value="site_visit">🏠 Site Visit</option>
                    <option value="meeting">🤝 Meeting / Office Visit</option>
                    <option value="email">📧 Email</option>
                    <option value="other">📋 Other</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Next Follow-Up Date & Time</label>
                  <input
                    type="datetime-local"
                    value={formData.initialFollowUp.nextFollowUpDate}
                    onChange={(e) => setFormData({
                      ...formData,
                      initialFollowUp: { ...formData.initialFollowUp, nextFollowUpDate: e.target.value }
                    })}
                    style={inputStyle}
                    onFocus={applyFocus}
                    onBlur={removeFocus}
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Discussion Remarks / Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Inquired about flat availability. Client requested quotation."
                  value={formData.initialFollowUp.notes}
                  onChange={(e) => setFormData({
                    ...formData,
                    initialFollowUp: { ...formData.initialFollowUp, notes: e.target.value }
                  })}
                  style={{ ...inputStyle, resize: 'vertical', minHeight: '60px' }}
                  onFocus={applyFocus}
                  onBlur={removeFocus}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary Preview */}
      <div style={{
        padding: '14px 16px', background: '#f0fdf4',
        borderRadius: '12px', border: '1.5px solid #86efac',
      }}>
        <h4 style={{ margin: '0 0 8px', fontSize: '0.78rem', fontWeight: '800', color: '#166534', textTransform: 'uppercase' }}>
          ✅ Lead Summary
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', fontSize: '0.8rem' }}>
          {[
            { label: 'Name', value: formData.name || '—' },
            { label: 'Mobile', value: formData.mobileNo || '—' },
            { label: 'Source', value: formData.leadSource.replace(/_/g, ' ') },
            { label: 'Budget', value: formData.budget ? `₹${Number(formData.budget).toLocaleString('en-IN')}` : '—' },
            { label: 'City', value: formData.city || '—' },
            { label: 'Assignment', value: formData.assignedTo === 'auto' ? 'Auto (Round-Robin)' : formData.assignedTo === 'unassigned' ? 'Unassigned' : 'Manual' },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '4px 8px', borderRadius: '4px',
              background: i % 2 === 0 ? '#ffffff' : '#f0fdf4',
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
          width: '100%', maxWidth: '660px', maxHeight: '92vh',
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
              <span style={{ fontSize: '1.15rem', fontWeight: '800' }}>
                {lead ? `Edit Lead: ${lead.name}` : 'New CRM Lead'}
              </span>
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
              transition: 'background 0.2s',
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
                    {isActive && (
                      <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: '600' }}>
                        {step.subtitle}
                      </div>
                    )}
                  </div>
                </button>
                {idx < STEPS.length - 1 && (
                  <div style={{
                    width: '20px', height: '2px', flexShrink: 0,
                    background: isCompleted ? '#16a34a' : '#e2e8f0',
                    borderRadius: '1px', transition: 'background 0.3s',
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
            onMouseOver={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
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
                transition: 'all 0.2s',
              }}
            >
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              style={{
                padding: '10px 24px', borderRadius: '10px', border: 'none',
                background: 'linear-gradient(135deg, #16a34a, #15803d)',
                color: '#ffffff', fontSize: '0.84rem', fontWeight: '800',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(22,163,74,0.35)',
                display: 'flex', alignItems: 'center', gap: '8px',
                transition: 'all 0.2s',
              }}
            >
              <CheckCircle2 size={16} />
              {lead ? 'Save Lead' : 'Create Lead'}
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes stepSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
