import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { leadService } from '../../services/leadService.js';
import { projectService } from '../../services/projectService.js';
import {
  Compass,
  Calendar,
  Clock,
  Car,
  Star,
  Users,
  Building,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  MapPin,
  Phone,
  Mail,
  User,
  Sparkles
} from 'lucide-react';

export const ExternalSiteVisitModal = ({
  isOpen,
  onClose,
  lead = null,
  teamMembers = [],
  currentUser = null,
  initialScheduledOnly = false,
  onSuccess
}) => {
  // Visitor Information
  const [name, setName] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Vrindavan');
  const [state, setState] = useState('Uttar Pradesh');

  // Visit Details
  const [visitDate, setVisitDate] = useState(new Date().toISOString().slice(0, 16));
  const [isScheduledOnly, setIsScheduledOnly] = useState(initialScheduledOnly);
  const [assignedFlatId, setAssignedFlatId] = useState('');
  const [flatLabel, setFlatLabel] = useState('');
  const [accompaniedBy, setAccompaniedBy] = useState('');
  const [numberOfPersons, setNumberOfPersons] = useState(2);

  // Cab Logistics
  const [isCabProvided, setIsCabProvided] = useState(false);
  const [cabNumber, setCabNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');

  // Rating & Feedback
  const [interestRating, setInterestRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [nextStep, setNextStep] = useState('Follow-up call in 2 days to finalize booking terms');

  // Flats & UI State
  const [flats, setFlats] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Load flats
  useEffect(() => {
    const fetchFlats = async () => {
      try {
        const res = await projectService.getFlats();
        if (res.data) setFlats(res.data);
      } catch (err) {
        console.warn('Could not load flats for site visit modal:', err);
      }
    };
    if (isOpen) {
      fetchFlats();
    }
  }, [isOpen]);

  // Pre-fill if lead passed
  useEffect(() => {
    if (lead) {
      setName(lead.name || '');
      setMobileNo(lead.mobileNo || '');
      setEmail(lead.email || '');
      setCity(lead.city || 'Vrindavan');
      setState(lead.state || 'Uttar Pradesh');
      if (lead.assignedFlat) {
        setAssignedFlatId(lead.assignedFlat._id || lead.assignedFlat);
        const fNo = lead.assignedFlat.flatNumber || '';
        const pName = lead.assignedFlat.projectId?.projectName || '';
        setFlatLabel(fNo ? `Flat ${fNo}${pName ? ` (${pName})` : ''}` : '');
      } else {
        setFlatLabel(lead.requirement || '');
      }
      setAccompaniedBy(lead.assignedTo?._id || lead.assignedTo || currentUser?._id || '');
    } else {
      setName('');
      setMobileNo('');
      setEmail('');
      setCity('Vrindavan');
      setState('Uttar Pradesh');
      setAssignedFlatId('');
      setFlatLabel('');
      setAccompaniedBy(currentUser?._id || '');
    }
    setVisitDate(new Date().toISOString().slice(0, 16));
    setIsScheduledOnly(Boolean(initialScheduledOnly));
    setIsCabProvided(false);
    setCabNumber('');
    setDriverName('');
    setDriverPhone('');
    setPickupLocation('');
    setInterestRating(5);
    setFeedback('');
    setNextStep(initialScheduledOnly ? 'Reminder call 2 hours prior to scheduled tour' : 'Follow-up call in 2 days to finalize booking terms');
    setErrorMsg('');
  }, [lead, isOpen, currentUser, initialScheduledOnly]);

  if (!isOpen) return null;

  const handleFlatSelect = (e) => {
    const val = e.target.value;
    setAssignedFlatId(val);
    if (val) {
      const selected = flats.find(f => f._id === val);
      if (selected) {
        setFlatLabel(`Flat ${selected.flatNumber} (${selected.projectId?.projectName || 'Krishna Valley'})`);
      }
    } else {
      setFlatLabel('');
    }
  };

  const getRatingLabel = (stars) => {
    switch (stars) {
      case 5: return '⭐⭐⭐⭐⭐ Ready to Book / Highly Enthusiastic';
      case 4: return '⭐⭐⭐⭐ Very Interested (Reviewing Layout & Payment)';
      case 3: return '⭐⭐⭐ Moderately Interested (Exploring Budget Options)';
      case 2: return '⭐⭐ Neutral (Comparing with other sites)';
      case 1: return '⭐ Not Interested / Budget or Location Mismatch';
      default: return '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!lead && !name.trim()) {
      setErrorMsg('Visitor full name is required.');
      return;
    }
    if (!lead && !mobileNo.trim()) {
      setErrorMsg('Visitor mobile number is required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        leadId: lead?._id || null,
        name: name.trim(),
        mobileNo: mobileNo.trim(),
        email: email.trim() || undefined,
        city: city.trim(),
        state: state.trim(),
        assignedFlatId: assignedFlatId || undefined,
        flatLabel: flatLabel || undefined,
        visitDate: new Date(visitDate).toISOString(),
        accompaniedBy: accompaniedBy || currentUser?._id || undefined,
        numberOfPersons: Number(numberOfPersons) || 1,
        isScheduledOnly,
        cabDetails: {
          isCabProvided,
          cabNumber: isCabProvided ? cabNumber.trim() : '',
          driverName: isCabProvided ? driverName.trim() : '',
          driverPhone: isCabProvided ? driverPhone.trim() : '',
          pickupLocation: isCabProvided ? pickupLocation.trim() : '',
        },
        interestRating,
        feedback: feedback.trim() || (isScheduledOnly ? 'Site visit scheduled.' : 'Direct site visit completed.'),
        nextStep: nextStep.trim(),
      };

      const res = await leadService.logExternalSiteVisit(lead?._id, payload);
      if (res && res.success) {
        if (onSuccess) onSuccess(res.message || 'Site visit logged successfully!');
        onClose();
      } else {
        setErrorMsg(res?.message || 'Failed to log site visit');
      }
    } catch (err) {
      console.error('Error in logExternalSiteVisit:', err);
      setErrorMsg(err.message || 'Server error while logging site visit.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isScheduledOnly ? "📅 Schedule Client Site Visit" : (lead ? "🚗 Record Completed Site Visit" : "🚗 Log Walk-in & Site Visit")}
      maxWidth="720px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

        {errorMsg && (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            color: '#b91c1c',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '0.84rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Lead Context Banner */}
        {lead ? (
          <div style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)',
            border: '1px solid #bbf7d0',
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: '800', textTransform: 'uppercase' }}>
                Existing CRM Prospect
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {lead.name}
                <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '12px', fontWeight: '700' }}>
                  {lead.status?.replace(/_/g, ' ')}
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', gap: '12px', marginTop: '3px' }}>
                <span>📞 {lead.mobileNo}</span>
                {lead.city && <span>📍 {lead.city}, {lead.state}</span>}
              </div>
            </div>
            <div style={{ fontSize: '0.75rem', background: '#ffffff', padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', color: '#334155', fontWeight: '700' }}>
              Lead ID: {lead._id?.slice(-6).toUpperCase()}
            </div>
          </div>
        ) : (
          /* Walk-in Visitor Info Inputs */
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={14} color="#1a73e8" /> Visitor Information (Walk-in Lead)
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Chandra Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  Mobile Phone *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={mobileNo}
                  onChange={(e) => setMobileNo(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  placeholder="e.g. visitor@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  City / Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Delhi, Mathura, Agra"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Visit Logistics Section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          {/* Visit Date & Time */}
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
              <Calendar size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
              Visit Date & Time *
            </label>
            <input
              type="datetime-local"
              required
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            />
          </div>

          {/* Visit Status Timing */}
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
              Visit Status
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setIsScheduledOnly(false)}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: '800',
                  border: !isScheduledOnly ? '2px solid #16a34a' : '1px solid #cbd5e1',
                  background: !isScheduledOnly ? '#dcfce7' : '#ffffff',
                  color: !isScheduledOnly ? '#15803d' : '#475569',
                  cursor: 'pointer'
                }}
              >
                ✅ Completed Visit
              </button>
              <button
                type="button"
                onClick={() => setIsScheduledOnly(true)}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: '800',
                  border: isScheduledOnly ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  background: isScheduledOnly ? '#dbeafe' : '#ffffff',
                  color: isScheduledOnly ? '#1d4ed8' : '#475569',
                  cursor: 'pointer'
                }}
              >
                📅 Upcoming Scheduled
              </button>
            </div>
          </div>

          {/* Unit / Property Visited */}
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
              <Building size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
              Unit / Property Inspected
            </label>
            <select
              value={assignedFlatId}
              onChange={handleFlatSelect}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value="">-- Select Flat or Project --</option>
              {flats.map((flat) => (
                <option key={flat._id} value={flat._id}>
                  Flat {flat.flatNumber} - {flat.projectId?.projectName || 'Krishna Valley'} ({flat.type || 'Unit'})
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Or custom requirement e.g. 2BHK Resort Villa"
              value={flatLabel}
              onChange={(e) => setFlatLabel(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.78rem', marginTop: '6px' }}
            />
          </div>

          {/* Accompanying Executive */}
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
              <UserCheck size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
              Accompanying Sales Rep
            </label>
            <select
              value={accompaniedBy}
              onChange={(e) => setAccompaniedBy(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value="">-- Select Executive --</option>
              {teamMembers.map((member) => {
                const u = member.userId || member;
                if (!u) return null;
                return (
                  <option key={u._id} value={u._id}>
                    {u.firstName || u.username} ({u.roleId?.name?.replace(/_/g, ' ') || 'Sales Rep'})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Number of Persons */}
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
              <Users size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
              Visitor Party Size
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={numberOfPersons}
              onChange={(e) => setNumberOfPersons(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {/* Cab & Transport Facility Section */}
        <div style={{
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          padding: '12px 16px',
          background: isCabProvided ? '#eff6ff' : '#f8fafc',
          transition: 'all 0.2s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Car size={16} color={isCabProvided ? '#2563eb' : '#64748b'} />
              <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a' }}>
                Cab & Transportation Assistance
              </span>
            </div>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700', color: '#1e40af' }}>
              <input
                type="checkbox"
                checked={isCabProvided}
                onChange={(e) => setIsCabProvided(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              Provided by Company
            </label>
          </div>

          {isCabProvided && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginTop: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                  Cab / Vehicle No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. UP85 AB 1234"
                  value={cabNumber}
                  onChange={(e) => setCabNumber(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                  Driver Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Satish Kumar"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                  Driver Phone
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 9812345678"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                  Pickup / Drop Point
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mathura Junction / Hotel"
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Client Interest Rating (Only shown for completed tour) */}
        {!isScheduledOnly ? (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#92400e', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Star size={15} color="#f59e0b" fill="#f59e0b" /> Client Interest Rating
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setInterestRating(star)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px',
                      transform: interestRating >= star ? 'scale(1.15)' : 'scale(1)',
                      transition: 'transform 0.15s ease'
                    }}
                    title={`${star} Star Rating`}
                  >
                    <Star
                      size={24}
                      color="#f59e0b"
                      fill={interestRating >= star ? '#f59e0b' : 'none'}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#b45309', marginTop: '6px' }}>
              {getRatingLabel(interestRating)}
            </div>
          </div>
        ) : (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '10px 14px', fontSize: '0.8rem', color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={15} />
            <span>This site visit is scheduled for the future. The client's rating will be recorded after the tour is completed.</span>
          </div>
        )}

        {/* Feedback & Discussion Summary */}
        <div>
          <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
            <FileText size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
            {isScheduledOnly ? 'Visit Objective / Special Client Requests' : 'Site Visit Discussion & Client Feedback Remarks *'}
          </label>
          <textarea
            rows={3}
            required={!isScheduledOnly}
            placeholder={isScheduledOnly ? "e.g. Client visiting with family on Sunday to see 2BHK flat. Inquired about ground floor units." : "e.g. Client loved the balcony view and temple connectivity. Inquired about EMI financing and possession dates. Requested a discount on down payment."}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', lineHeight: '1.4' }}
          />
        </div>

        {/* Recommended Next Step */}
        <div>
          <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
            🎯 Next Follow-Up Action / Next Step
          </label>
          <input
            type="text"
            placeholder={isScheduledOnly ? "e.g. Call client 2 hours before arrival to coordinate cab" : "e.g. Send payment plan via WhatsApp and call back on Saturday at 11 AM"}
            value={nextStep}
            onChange={(e) => setNextStep(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            disabled={submitting}
            style={{ padding: '9px 18px', fontSize: '0.85rem' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '9px 24px',
              borderRadius: '8px',
              border: 'none',
              background: isScheduledOnly
                ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
                : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              color: '#ffffff',
              fontWeight: '800',
              fontSize: '0.88rem',
              cursor: submitting ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: isScheduledOnly ? '0 2px 6px rgba(37,99,235,0.3)' : '0 2px 6px rgba(22,163,74,0.3)',
              transition: 'all 0.15s ease'
            }}
          >
            {submitting ? 'Saving...' : (isScheduledOnly ? '📅 Confirm & Schedule Site Visit' : '✅ Save & Record Site Visit')}
          </button>
        </div>

      </form>
    </Modal>
  );
};

export default ExternalSiteVisitModal;
