import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import {
  User, Phone, Mail, Home, Users, Tag,
  Calendar, DollarSign, Check, Clock
} from 'lucide-react';
import { projectService } from '../../services/projectService.js';
import { sanitizeAlphabetsOnly, sanitizePhone, sanitizeEmail, isValidEmail } from '../../utils/inputValidators.js';

const STEPS = [
  { id: 1, title: 'Contact', subtitle: 'Name & Phone' },
  { id: 2, title: 'Requirements', subtitle: 'Budget & Type' },
  { id: 3, title: 'Assignment', subtitle: 'Team & Follow-up' },
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
  const [currentStep, setCurrentStep] = useState(1);

  // Fetch available flats for assignment dropdown
  useEffect(() => {
    if (isOpen) {
      projectService.getFlats()
        .then((res) => {
          if (res.data) setFlats(res.data);
        })
        .catch((err) => console.error('Error loading flats:', err));
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

  const validateStep = (step) => {
    if (step === 1) {
      if (!formData.name.trim()) return false;
      if (!formData.mobileNo.trim() || formData.mobileNo.replace(/\D/g, '').length < 10) return false;
      if (formData.email && !isValidEmail(formData.email)) return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.name.trim()) {
        alert('Please enter prospect full name');
        return;
      }
      if (!formData.mobileNo.trim() || formData.mobileNo.replace(/\D/g, '').length < 10) {
        alert('Please enter a valid 10-digit mobile number');
        return;
      }
      if (formData.email && !isValidEmail(formData.email)) {
        alert('Please enter a valid email address');
        return;
      }
    }
    if (currentStep < STEPS.length) {
      setCurrentStep(s => s + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(s => s - 1);
    }
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
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

  // STEP 1: Contact
  const renderStep1 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div className="form-card-box">
        <div className="form-card-prompt">
          <span>Prospect full name *</span>
        </div>
        <div className="form-card-input-row">
          <input
            type="text"
            required
            autoFocus
            placeholder="e.g. Ramesh Chandra Sharma"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: sanitizeAlphabetsOnly(e.target.value) })}
            className="form-card-input"
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div className="form-card-box">
          <div className="form-card-prompt">
            <span>Mobile number * (10 digits)</span>
          </div>
          <div className="form-card-input-row">
            <input
              type="tel"
              required
              placeholder="e.g. 9876543210"
              value={formData.mobileNo}
              onChange={(e) => setFormData({ ...formData, mobileNo: sanitizePhone(e.target.value) })}
              className="form-card-input"
            />
          </div>
        </div>

        <div className="form-card-box">
          <div className="form-card-prompt">
            <span>Email address</span>
          </div>
          <div className="form-card-input-row">
            <input
              type="email"
              placeholder="e.g. ramesh@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: sanitizeEmail(e.target.value) })}
              className="form-card-input"
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div className="form-card-box">
          <div className="form-card-prompt">
            <span>City / Location</span>
          </div>
          <div className="form-card-input-row">
            <input
              type="text"
              placeholder="e.g. Mathura, Delhi, Vrindavan"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="form-card-input"
            />
          </div>
        </div>

        <div className="form-card-box">
          <div className="form-card-prompt">
            <span>State</span>
          </div>
          <div className="form-card-input-row">
            <input
              type="text"
              placeholder="e.g. Uttar Pradesh"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              className="form-card-input"
            />
          </div>
        </div>
      </div>
    </div>
  );

  // STEP 2: Requirements
  const renderStep2 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
        <div className="form-card-box">
          <div className="form-card-prompt">
            <span>Unit requirement</span>
          </div>
          <div className="form-card-input-row">
            <input
              type="text"
              placeholder="e.g. 2BHK, 3BHK, Villa, Studio"
              value={formData.requirement}
              onChange={(e) => setFormData({ ...formData, requirement: e.target.value })}
              className="form-card-input"
            />
          </div>
        </div>

        <div className="form-card-box">
          <div className="form-card-prompt">
            <span>Budget (₹)</span>
            {formData.budget && Number(formData.budget) > 0 && (
              <span className="form-card-badge">≈ ₹{(Number(formData.budget) / 100000).toFixed(1)} L</span>
            )}
          </div>
          <div className="form-card-input-row">
            <input
              type="number"
              placeholder="e.g. 4500000"
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
              className="form-card-input"
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div className="form-card-box">
          <div className="form-card-prompt">
            <span>Purchase timeline</span>
          </div>
          <div className="form-card-input-row">
            <select
              value={formData.purchaseTimeline}
              onChange={(e) => setFormData({ ...formData, purchaseTimeline: e.target.value })}
              className="form-card-input"
              style={{ cursor: 'pointer' }}
            >
              <option value="">Select timeline</option>
              <option value="immediate">Immediate / Ready to Move</option>
              <option value="within_1_month">Within 1 Month</option>
              <option value="within_3_months">Within 3 Months</option>
              <option value="within_6_months">Within 6 Months</option>
              <option value="exploring">Exploring / Long Term</option>
            </select>
          </div>
        </div>

        <div className="form-card-box">
          <div className="form-card-prompt">
            <span>Lead source</span>
          </div>
          <div className="form-card-input-row">
            <select
              value={formData.leadSource}
              onChange={(e) => setFormData({ ...formData, leadSource: e.target.value })}
              className="form-card-input"
              style={{ cursor: 'pointer' }}
            >
              <option value="direct">Direct Walk-in / Inquiry</option>
              <option value="website">Website Inquiry</option>
              <option value="referral">Referral</option>
              <option value="phone">Phone / Cold Call</option>
              <option value="meta_ads">Meta Ads</option>
              <option value="channel_partner">Channel Partner</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  // STEP 3: Assignment & Follow-Up
  const renderStep3 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div className="form-card-box">
          <div className="form-card-prompt">
            <span>Assign sales executive</span>
          </div>
          <div className="form-card-input-row">
            <select
              value={formData.assignedTo}
              onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
              className="form-card-input"
              style={{ cursor: 'pointer' }}
            >
              <option value="auto">Auto-Assign (Round-robin)</option>
              <option value="unassigned">Leave Unassigned</option>
              {teamMembers.map((m) => {
                const u = m.userId || m;
                return (
                  <option key={u._id} value={u._id}>
                    {u.firstName} {u.lastName || ''} ({m.roleTitle || 'Sales Executive'})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div className="form-card-box">
          <div className="form-card-prompt">
            <span>Preferred flat / unit (optional)</span>
          </div>
          <div className="form-card-input-row">
            <select
              value={formData.assignedFlat}
              onChange={(e) => setFormData({ ...formData, assignedFlat: e.target.value })}
              className="form-card-input"
              style={{ cursor: 'pointer' }}
            >
              <option value="">No flat assigned (General)</option>
              {flats.map((f) => {
                const bld = f.buildingName || f.buildingId?.buildingName || 'Tower';
                return (
                  <option key={f._id} value={f._id}>
                    Flat {f.flatNumber} ({bld}) — {f.status}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Optional Follow-up box */}
      {!lead && (
        <div className="form-card-box" style={{ background: '#fafaf9' }}>
          <div className="form-card-prompt">
            <span>First follow-up activity</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.78rem', color: '#17652f', fontWeight: '600' }}>
              <input
                type="checkbox"
                checked={formData.addInitialFollowUp}
                onChange={(e) => setFormData({ ...formData, addInitialFollowUp: e.target.checked })}
                style={{ accentColor: '#17652f' }}
              />
              Schedule now
            </label>
          </div>

          {formData.addInitialFollowUp && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <select
                  value={formData.initialFollowUp.mode}
                  onChange={(e) => setFormData({
                    ...formData,
                    initialFollowUp: { ...formData.initialFollowUp, mode: e.target.value }
                  })}
                  className="form-card-input"
                  style={{ background: '#ffffff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                >
                  <option value="call">Phone Call</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="site_visit">Site Visit</option>
                  <option value="meeting">Meeting</option>
                  <option value="email">Email</option>
                </select>

                <input
                  type="datetime-local"
                  value={formData.initialFollowUp.nextFollowUpDate}
                  onChange={(e) => setFormData({
                    ...formData,
                    initialFollowUp: { ...formData.initialFollowUp, nextFollowUpDate: e.target.value }
                  })}
                  className="form-card-input"
                  style={{ background: '#ffffff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                />
              </div>

              <input
                type="text"
                placeholder="Follow-up notes (e.g. Interested in floor 2)"
                value={formData.initialFollowUp.notes}
                onChange={(e) => setFormData({
                  ...formData,
                  initialFollowUp: { ...formData.initialFollowUp, notes: e.target.value }
                })}
                className="form-card-input"
                style={{ background: '#ffffff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={lead ? `Edit lead: ${lead.name}` : "Let's capture a new lead"}
      maxWidth="620px"
      centeredHeader={true}
    >
      {/* Centered Stepper matching reference */}
      <div className="form-stepper-header" style={{ marginBottom: '20px' }}>
        {STEPS.map((step, idx) => {
          const isCompleted = currentStep > step.id;
          const isActive = currentStep === step.id;
          return (
            <React.Fragment key={step.id}>
              <button
                type="button"
                onClick={() => {
                  if (step.id < currentStep || validateStep(currentStep)) {
                    setCurrentStep(step.id);
                  }
                }}
                className="form-stepper-item"
              >
                <div className={`form-stepper-circle ${isCompleted ? 'completed' : isActive ? 'active' : 'upcoming'}`}>
                  {isCompleted ? <Check size={12} strokeWidth={3} /> : step.id}
                </div>
                <span className={`form-stepper-label ${isActive ? 'active' : ''}`}>
                  {step.title}
                </span>
              </button>
              {idx < STEPS.length - 1 && <div className="form-stepper-line" />}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step Content */}
      <div style={{ minHeight: '220px' }}>
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </div>

      {/* Standardized Bottom Action Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '20px',
          marginTop: '16px',
          borderTop: '1px solid #f1f5f9'
        }}
      >
        {currentStep > 1 ? (
          <button
            type="button"
            onClick={handleBack}
            style={{
              padding: '9px 24px',
              borderRadius: '8px',
              border: 'none',
              background: '#f1f5f9',
              color: '#475569',
              fontSize: '0.86rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
          >
            Back
          </button>
        ) : (
          <div />
        )}

        {currentStep < STEPS.length ? (
          <button
            type="button"
            onClick={handleNext}
            style={{
              padding: '9px 28px',
              borderRadius: '8px',
              border: 'none',
              background: '#17652f',
              color: '#ffffff',
              fontSize: '0.86rem',
              fontWeight: '500',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(23, 101, 47, 0.25)',
              transition: 'background-color 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#134e26'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#17652f'}
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            style={{
              padding: '9px 28px',
              borderRadius: '8px',
              border: 'none',
              background: '#17652f',
              color: '#ffffff',
              fontSize: '0.86rem',
              fontWeight: '500',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(23, 101, 47, 0.25)',
              transition: 'background-color 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#134e26'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#17652f'}
          >
            Save lead
          </button>
        )}
      </div>
    </Modal>
  );
};
export default ManualLeadModal;
