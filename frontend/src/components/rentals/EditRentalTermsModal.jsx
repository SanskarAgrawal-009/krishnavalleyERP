import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Calendar,
  DollarSign,
  Clock,
  ShieldCheck,
  CheckCircle2,
  FileText,
  User,
  Phone,
  Mail,
  History,
  AlertCircle,
  TrendingUp,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Upload,
  Download,
  Trash2,
  Eye,
  ChevronRight
} from 'lucide-react';
import { rentalService } from '../../services/rentalService.js';
import { useToast } from '../../context/ToastContext.jsx';
import { getFileUrl } from '../../services/api.js';

// Step configuration
const STEPS = [
  { id: 1, title: 'Owner Details', subtitle: 'KYC & Registration', icon: User, color: '#2563eb' },
  { id: 2, title: 'Rent & TDS', subtitle: 'Monthly Pricing', icon: DollarSign, color: '#16a34a' },
  { id: 3, title: 'Contract Period', subtitle: 'Dates & Tenure', icon: Calendar, color: '#d97706' },
  { id: 4, title: 'Review & Upload', subtitle: 'Financial Impact', icon: CheckCircle2, color: '#7c3aed' },
];

export const EditRentalTermsModal = ({ isOpen, onClose, rental, onUpdated }) => {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [agreementUploading, setAgreementUploading] = useState(false);
  const [agreementDoc, setAgreementDoc] = useState(null);
  const fileInputRef = useRef(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [stepDirection, setStepDirection] = useState('next');

  // Form State matching register details & effective date
  const [form, setForm] = useState({
    ownerName: '',
    ownerMobile: '',
    ownerEmail: '',
    ownerPan: '',
    ownerAadhaar: '',
    mouDate: '',
    mouNumber: '',
    guaranteedMonthlyRent: 31000,
    applyTds: true,
    tdsMode: 'percentage',
    tdsPercentage: 10,
    tdsAmount: 3100,
    startDate: '',
    endDate: '',
    tenureMonths: 36,
    dueDayOfMonth: 25,
    effectiveMonthYear: '',
    totalPaid: 0,
    revisionReason: ''
  });

  const parseAnyDate = (val) => {
    if (!val) return null;
    if (val instanceof Date) {
      if (isNaN(val.getTime())) return null;
      let y = val.getFullYear();
      if (y > 3000) {
        const serial = val.getUTCHours() > 12 ? val.getUTCFullYear() + 1 : val.getUTCFullYear();
        if (serial >= 20000 && serial <= 75000) {
          return new Date((serial - 25569) * 86400 * 1000);
        }
      }
      return val;
    }
    const num = Number(val);
    if (!isNaN(num) && num >= 20000 && num <= 75000) {
      return new Date((num - 25569) * 86400 * 1000);
    }
    const str = String(val).trim();
    if (!str || str === '—' || str === '-' || str.toLowerCase() === 'no data') return null;
    const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyMatch) {
      const [, d, m, y] = dmyMatch;
      return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    }
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      if (d.getFullYear() > 3000) {
        const serial = d.getUTCHours() > 12 ? d.getUTCFullYear() + 1 : d.getUTCFullYear();
        if (serial >= 20000 && serial <= 75000) {
          return new Date((serial - 25569) * 86400 * 1000);
        }
      }
      return d;
    }
    return null;
  };

  const formatDateForInput = (d) => {
    const parsed = parseAnyDate(d);
    if (!parsed) return '';
    try {
      return parsed.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const calculateAutoEndDate = (startStr, months) => {
    const parsed = parseAnyDate(startStr);
    if (!parsed) return '';
    const d = new Date(parsed);
    d.setMonth(d.getMonth() + Number(months || 36));
    try {
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const getMonthYearFromDate = (d) => {
    const parsed = parseAnyDate(d);
    if (!parsed) return '';
    try {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      return `${y}-${m}`;
    } catch {
      return '';
    }
  };

  const handleStartDateChange = (newStart) => {
    const updated = { ...form, startDate: newStart };
    if (newStart) {
      updated.endDate = calculateAutoEndDate(newStart, form.tenureMonths || 36);
    }
    setForm(updated);
  };

  const handleTenureChange = (newTenure) => {
    const t = Math.max(1, Number(newTenure) || 36);
    const updated = { ...form, tenureMonths: t };
    if (form.startDate) {
      updated.endDate = calculateAutoEndDate(form.startDate, t);
    }
    setForm(updated);
  };

  const handleRecalculateEndDate = () => {
    if (form.startDate) {
      const autoEnd = calculateAutoEndDate(form.startDate, form.tenureMonths || 36);
      setForm({ ...form, endDate: autoEnd });
    }
  };

  useEffect(() => {
    if (rental) {
      const regDateStr = formatDateForInput(rental.registryDate || rental.mouDate);
      const startDateStr = formatDateForInput(rental.startDate || rental.registryDate);
      let endDateStr = formatDateForInput(rental.endDate);
      if (!endDateStr && startDateStr) {
        endDateStr = calculateAutoEndDate(startDateStr, rental.tenureMonths || 36);
      }
      const currentMonthYear = rental.effectiveFromMonthYear || getMonthYearFromDate(startDateStr) || new Date().toISOString().slice(0, 7);

      const gRent = Number(
        rental.rentAmount || rental.guaranteedMonthlyRent || rental.rentalDetails?.guaranteedMonthlyRent || 31000
      );
      const isApplyTds = rental.applyTds !== false;
      const initialMode = rental.tdsMode || 'percentage';
      const initialPct = Number(rental.tdsPercentage ?? 10);
      const initialAmt = (rental.tdsAmount !== undefined && Number(rental.tdsAmount) > 0)
        ? Number(rental.tdsAmount)
        : Math.round(gRent * (initialPct / 100));

      setForm({
        ownerName: rental.ownerName && rental.ownerName !== 'Unassigned' ? rental.ownerName : '',
        ownerMobile: rental.ownerMobile && rental.ownerMobile !== '—' && rental.ownerMobile !== '-' ? rental.ownerMobile : '',
        ownerEmail: rental.ownerEmail && rental.ownerEmail !== '—' && rental.ownerEmail !== '-' ? rental.ownerEmail : '',
        ownerPan: rental.ownerPan && rental.ownerPan !== '—' && rental.ownerPan !== '-' ? rental.ownerPan : '',
        ownerAadhaar: rental.ownerAadhaar && rental.ownerAadhaar !== '—' && rental.ownerAadhaar !== '-' ? rental.ownerAadhaar : '',
        mouDate: regDateStr,
        mouNumber: rental.mouNumber || '',
        guaranteedMonthlyRent: gRent,
        applyTds: isApplyTds,
        tdsMode: initialMode,
        tdsPercentage: initialPct,
        tdsAmount: initialAmt,
        startDate: startDateStr,
        endDate: endDateStr,
        tenureMonths: Number(rental.tenureMonths || 36),
        dueDayOfMonth: Number(rental.dueDayOfMonth || 25),
        effectiveMonthYear: currentMonthYear,
        totalPaid: Number(rental.totalPaid || 0),
        revisionReason: ''
      });

      // Load existing agreement document
      setAgreementDoc(rental.agreementDocument || rental.rentalDetails?.agreementDocument || null);
      setCurrentStep(1);
    }
  }, [rental]);

  // Agreement upload handler
  const handleAgreementUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      toast.showError('File size must be under 20MB');
      return;
    }

    setAgreementUploading(true);
    try {
      const res = await rentalService.uploadAgreement(rental._id, file);
      if (res.success) {
        setAgreementDoc(res.data);
        toast.showSuccess('Agreement document uploaded successfully!');
        if (onUpdated) onUpdated();
      } else {
        toast.showError(res.message || 'Failed to upload agreement');
      }
    } catch (err) {
      toast.showError(err.message || 'Error uploading agreement');
    } finally {
      setAgreementUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Agreement delete handler
  const handleAgreementDelete = async () => {
    if (!window.confirm('Are you sure you want to remove this agreement document?')) return;
    setAgreementUploading(true);
    try {
      const res = await rentalService.deleteAgreement(rental._id);
      if (res.success) {
        setAgreementDoc(null);
        toast.showSuccess('Agreement document removed');
        if (onUpdated) onUpdated();
      } else {
        toast.showError(res.message || 'Failed to delete agreement');
      }
    } catch (err) {
      toast.showError(err.message || 'Error deleting agreement');
    } finally {
      setAgreementUploading(false);
    }
  };

  if (!isOpen || !rental) return null;

  // Previous Terms Snapshot
  const prevGross = Number(rental.rentAmount || rental.guaranteedMonthlyRent || 0);
  const prevApplyTds = rental.applyTds !== false;
  const prevTdsMode = rental.tdsMode || 'percentage';
  let prevTdsPct = Number(rental.tdsPercentage ?? 10);
  let prevTdsAmt = 0;
  if (prevApplyTds) {
    if (prevTdsMode === 'amount' && rental.tdsAmount !== undefined && Number(rental.tdsAmount) > 0) {
      prevTdsAmt = Number(rental.tdsAmount);
      prevTdsPct = prevGross > 0 ? Number(((prevTdsAmt / prevGross) * 100).toFixed(2)) : 0;
    } else {
      prevTdsAmt = Math.round(prevGross * (prevTdsPct / 100));
    }
  }
  const prevNet = prevGross - prevTdsAmt;
  const prevTenure = Number(rental.tenureMonths || 36);
  const totalPaid = Number(form.totalPaid !== undefined ? form.totalPaid : (rental.totalPaid || 0));

  // New Terms Live Auto-Calculations
  const newGross = Number(form.guaranteedMonthlyRent) || 0;
  let newTdsAmt = 0;
  let newTdsPct = 0;

  if (form.applyTds) {
    if (form.tdsMode === 'amount') {
      newTdsAmt = Math.max(0, Number(form.tdsAmount) || 0);
      newTdsPct = newGross > 0 ? Number(((newTdsAmt / newGross) * 100).toFixed(2)) : 0;
    } else {
      newTdsPct = Math.max(0, Number(form.tdsPercentage) || 0);
      newTdsAmt = Math.round(newGross * (newTdsPct / 100));
    }
  }
  const newNet = newGross - newTdsAmt;
  const newTenure = Math.max(1, Number(form.tenureMonths || 36));

  // Compute live ending date
  let computedEndDateStr = '—';
  const targetEnd = form.endDate || (form.startDate ? calculateAutoEndDate(form.startDate, newTenure) : null);
  if (targetEnd) {
    try {
      const d = new Date(targetEnd);
      if (!isNaN(d.getTime())) {
        computedEndDateStr = d.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
      }
    } catch {
      computedEndDateStr = '—';
    }
  }

  // Calculate Effective Month Index and Split
  const contractStart = form.startDate ? new Date(form.startDate) : new Date();
  let appliedFromMonthIndex = 1;

  if (form.effectiveMonthYear && form.effectiveMonthYear.includes('-')) {
    const [effY, effM] = form.effectiveMonthYear.split('-').map(Number);
    if (!isNaN(effY) && !isNaN(effM) && !isNaN(contractStart.getTime())) {
      const startY = contractStart.getFullYear();
      const startM = contractStart.getMonth() + 1;
      const monthDiff = (effY - startY) * 12 + (effM - startM);
      appliedFromMonthIndex = Math.max(1, monthDiff + 1);
    }
  }

  const priorMonthsCount = Math.min(newTenure, Math.max(0, appliedFromMonthIndex - 1));
  const newMonthsCount = Math.max(0, newTenure - priorMonthsCount);

  let totalCommitment = 0;
  if (priorMonthsCount > 0 && prevGross > 0) {
    totalCommitment = (priorMonthsCount * prevGross) + (newMonthsCount * newGross);
  } else {
    totalCommitment = newTenure * newGross;
  }

  const outstandingBalance = Math.max(0, totalCommitment - totalPaid);

  const formatINR = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

  const formatMonthYearLabel = (myStr) => {
    if (!myStr || !myStr.includes('-')) return myStr;
    const [y, m] = myStr.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  };

  const handleSetEffectiveToStart = () => {
    const startMY = getMonthYearFromDate(form.startDate);
    if (startMY) setForm({ ...form, effectiveMonthYear: startMY });
  };

  const handleSetEffectiveToCurrent = () => {
    const curMY = new Date().toISOString().slice(0, 7);
    setForm({ ...form, effectiveMonthYear: curMY });
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const res = await rentalService.updateRentalTerms(rental._id, form);
      if (res.success) {
        toast.showSuccess(
          `Rental terms updated for Flat ${rental.flatNumber} effective from ${formatMonthYearLabel(form.effectiveMonthYear)}!`
        );
        if (onUpdated) onUpdated();
        onClose();
      } else {
        toast.showError(res.message || 'Failed to update rental terms');
      }
    } catch (err) {
      toast.showError(err.message || 'Server error saving rental terms');
    } finally {
      setSaving(false);
    }
  };

  // Step validation
  const validateStep = (step) => {
    switch (step) {
      case 1:
        return form.ownerName.trim().length > 0;
      case 2:
        return newGross > 0;
      case 3:
        return form.startDate && form.endDate && form.effectiveMonthYear;
      case 4:
        return true;
      default:
        return true;
    }
  };

  const goNext = () => {
    if (currentStep < STEPS.length && validateStep(currentStep)) {
      setStepDirection('next');
      setCurrentStep(s => s + 1);
    }
  };

  const goPrev = () => {
    if (currentStep > 1) {
      setStepDirection('prev');
      setCurrentStep(s => s - 1);
    }
  };

  const goToStep = (step) => {
    if (step < currentStep || validateStep(currentStep)) {
      setStepDirection(step > currentStep ? 'next' : 'prev');
      setCurrentStep(step);
    }
  };

  // Common input style
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

  // ==========================================
  // STEP 1: Owner & Register Details
  // ==========================================
  const renderStep1 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'stepFadeIn 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '10px',
          background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <User size={16} color="#fff" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>Owner & Registration Details</h3>
          <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b' }}>Enter owner KYC, contact info and registration documents</p>
        </div>
      </div>

      {/* Row 1: Name, Mobile, Email */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Owner Full Name *</label>
          <input
            type="text"
            required
            value={form.ownerName}
            onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
            placeholder="e.g. Ved Prakash Agarwal"
            style={inputStyle}
            onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
            onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
          />
        </div>
        <div>
          <label style={labelStyle}>Owner Mobile</label>
          <input
            type="text"
            value={form.ownerMobile}
            onChange={(e) => setForm({ ...form, ownerMobile: e.target.value })}
            placeholder="e.g. 9876543210"
            style={inputStyle}
            onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
            onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
          />
        </div>
        <div>
          <label style={labelStyle}>Owner Email</label>
          <input
            type="email"
            value={form.ownerEmail}
            onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })}
            placeholder="owner@example.com"
            style={inputStyle}
            onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
            onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
          />
        </div>
      </div>

      {/* Row 2: PAN, Aadhaar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label style={labelStyle}>PAN Number</label>
          <input
            type="text"
            maxLength={10}
            value={form.ownerPan}
            onChange={(e) => setForm({ ...form, ownerPan: e.target.value.toUpperCase() })}
            placeholder="ABCDE1234F"
            style={{ ...inputStyle, textTransform: 'uppercase', letterSpacing: '0.1em' }}
            onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
            onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
          />
        </div>
        <div>
          <label style={labelStyle}>Aadhaar Number</label>
          <input
            type="text"
            maxLength={14}
            value={form.ownerAadhaar}
            onChange={(e) => setForm({ ...form, ownerAadhaar: e.target.value })}
            placeholder="XXXX XXXX XXXX"
            style={{ ...inputStyle, letterSpacing: '0.1em' }}
            onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
            onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
          />
        </div>
      </div>

      {/* Row 3: Registry Date, MOU Number */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label style={labelStyle}>Registry / MOU Date</label>
          <input
            type="date"
            value={form.mouDate}
            onChange={(e) => setForm({ ...form, mouDate: e.target.value })}
            style={inputStyle}
            onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
            onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
          />
        </div>
        <div>
          <label style={labelStyle}>MOU / Agreement Number</label>
          <input
            type="text"
            value={form.mouNumber}
            onChange={(e) => setForm({ ...form, mouNumber: e.target.value })}
            placeholder="e.g. KVH/MOU/2026/101"
            style={inputStyle}
            onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
            onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
          />
        </div>
      </div>
    </div>
  );

  // ==========================================
  // STEP 2: Rent & TDS
  // ==========================================
  const renderStep2 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'stepFadeIn 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '10px',
          background: 'linear-gradient(135deg, #16a34a, #15803d)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <DollarSign size={16} color="#fff" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>Monthly Rental Amount & TDS</h3>
          <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b' }}>Set gross rent and TDS deduction preferences</p>
        </div>
      </div>

      {/* Gross Rent */}
      <div>
        <label style={labelStyle}>New Gross Monthly Rent (₹) *</label>
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
            fontWeight: '800', color: '#16a34a', fontSize: '1rem',
          }}>₹</span>
          <input
            type="number"
            min="0"
            step="500"
            required
            value={form.guaranteedMonthlyRent}
            onChange={(e) => {
              const val = e.target.value === '' ? '' : Number(e.target.value);
              const updated = { ...form, guaranteedMonthlyRent: val };
              if (form.tdsMode === 'percentage' && val) {
                updated.tdsAmount = Math.round(val * (Number(form.tdsPercentage || 10) / 100));
              }
              setForm(updated);
            }}
            style={{
              ...inputStyle,
              paddingLeft: '30px',
              fontSize: '1.1rem',
              fontWeight: '800',
              color: '#0f172a',
            }}
            onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
            onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
          />
        </div>
      </div>

      {/* TDS Toggle */}
      <div style={{
        background: '#f8fafc', border: '1px solid #e2e8f0',
        borderRadius: '12px', padding: '16px 18px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            fontSize: '0.82rem', fontWeight: '700', color: '#334155', cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={form.applyTds}
              onChange={(e) => setForm({ ...form, applyTds: e.target.checked })}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2563eb' }}
            />
            Apply TDS Deduction
          </label>

          {form.applyTds && (
            <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '8px', padding: '3px', gap: '2px' }}>
              <button
                type="button"
                onClick={() => setForm({ ...form, tdsMode: 'percentage' })}
                style={{
                  padding: '4px 12px', fontSize: '0.75rem', fontWeight: '700',
                  borderRadius: '6px', border: 'none', cursor: 'pointer',
                  background: form.tdsMode === 'percentage' ? '#2563eb' : 'transparent',
                  color: form.tdsMode === 'percentage' ? '#ffffff' : '#475569',
                  transition: 'all 0.2s ease',
                }}
              >% Percent</button>
              <button
                type="button"
                onClick={() => setForm({ ...form, tdsMode: 'amount' })}
                style={{
                  padding: '4px 12px', fontSize: '0.75rem', fontWeight: '700',
                  borderRadius: '6px', border: 'none', cursor: 'pointer',
                  background: form.tdsMode === 'amount' ? '#2563eb' : 'transparent',
                  color: form.tdsMode === 'amount' ? '#ffffff' : '#475569',
                  transition: 'all 0.2s ease',
                }}
              >₹ Amount</button>
            </div>
          )}
        </div>

        {form.applyTds ? (
          form.tdsMode === 'percentage' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={form.tdsPercentage}
                  onChange={(e) => {
                    const p = Number(e.target.value);
                    setForm({
                      ...form,
                      tdsPercentage: p,
                      tdsAmount: Math.round(newGross * (p / 100))
                    });
                  }}
                  style={{ ...inputStyle, paddingRight: '28px', fontWeight: '700' }}
                  onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
                  onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                />
                <span style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  fontSize: '0.85rem', color: '#64748b', fontWeight: '700',
                }}>%</span>
              </div>
              <span style={{
                padding: '8px 14px', background: '#fef3c7', color: '#92400e',
                borderRadius: '8px', fontSize: '0.82rem', fontWeight: '700', whiteSpace: 'nowrap',
              }}>
                − {formatINR(newTdsAmt)}
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <span style={{
                  position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                  fontSize: '0.85rem', color: '#64748b', fontWeight: '700',
                }}>₹</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={form.tdsAmount}
                  onChange={(e) => {
                    const amt = Number(e.target.value);
                    setForm({
                      ...form,
                      tdsAmount: amt,
                      tdsPercentage: newGross > 0 ? Number(((amt / newGross) * 100).toFixed(2)) : form.tdsPercentage
                    });
                  }}
                  style={{ ...inputStyle, paddingLeft: '28px', fontWeight: '700' }}
                  onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
                  onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
              <span style={{
                padding: '8px 14px', background: '#eff6ff', color: '#1d4ed8',
                borderRadius: '8px', fontSize: '0.82rem', fontWeight: '700', whiteSpace: 'nowrap',
              }}>
                {newTdsPct}% rate
              </span>
            </div>
          )
        ) : (
          <div style={{
            padding: '10px 14px', background: '#f1f5f9', borderRadius: '8px',
            color: '#64748b', fontSize: '0.85rem', fontWeight: '600',
            textAlign: 'center',
          }}>
            No TDS will be deducted (0%)
          </div>
        )}
      </div>

      {/* Net Preview Card */}
      <div style={{
        padding: '14px 18px', background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
        border: '1.5px solid #86efac', borderRadius: '12px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: '0.82rem', color: '#166534', fontWeight: '700' }}>
          Net Monthly Payout after TDS:
        </span>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '1.2rem', fontWeight: '800', color: '#166534' }}>
            {formatINR(newNet)}
          </span>
          <span style={{ fontSize: '0.72rem', color: '#166534', display: 'block', fontWeight: '600' }}>
            per month
          </span>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // STEP 3: Contract Period & Effective Month
  // ==========================================
  const renderStep3 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'stepFadeIn 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '10px',
          background: 'linear-gradient(135deg, #d97706, #b45309)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Calendar size={16} color="#fff" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>Contract Period & Effective Date</h3>
          <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b' }}>Set contract dates, tenure, and when new terms take effect</p>
        </div>
      </div>

      {/* Row 1: Start, Tenure, End */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.8fr 1fr', gap: '14px' }}>
        <div>
          <label style={labelStyle}>Payment Start Date *</label>
          <input
            type="date"
            required
            value={form.startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
            style={inputStyle}
            onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
            onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
          />
        </div>
        <div>
          <label style={labelStyle}>Tenure (Months) *</label>
          <input
            type="number"
            min="1"
            max="120"
            required
            value={form.tenureMonths}
            onChange={(e) => handleTenureChange(e.target.value)}
            style={{ ...inputStyle, fontWeight: '800', fontSize: '1rem', textAlign: 'center' }}
            onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
            onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
          />
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>End Date *</label>
            <button
              type="button"
              onClick={handleRecalculateEndDate}
              style={{
                border: 'none', background: '#eff6ff', color: '#2563eb',
                fontSize: '0.68rem', fontWeight: '700', cursor: 'pointer',
                borderRadius: '4px', padding: '2px 6px',
              }}
            >Auto</button>
          </div>
          <input
            type="date"
            required
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            style={{ ...inputStyle, borderColor: '#3b82f6', fontWeight: '700', color: '#1e3a8a' }}
          />
        </div>
      </div>

      {/* Row 2: Due Day, Total Paid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <div>
          <label style={labelStyle}>Payout Due Day</label>
          <select
            value={form.dueDayOfMonth}
            onChange={(e) => setForm({ ...form, dueDayOfMonth: Number(e.target.value) })}
            style={{ ...inputStyle, background: '#ffffff', cursor: 'pointer' }}
          >
            <option value={1}>1st of every month</option>
            <option value={10}>10th of every month</option>
            <option value={15}>15th of every month</option>
            <option value={20}>20th of every month</option>
            <option value={25}>25th of every month</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Total Paid / Disbursed So Far (₹)</label>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
              fontWeight: '700', color: '#64748b',
            }}>₹</span>
            <input
              type="number"
              min="0"
              step="1000"
              value={form.totalPaid}
              onChange={(e) => setForm({ ...form, totalPaid: Math.max(0, Number(e.target.value)) })}
              placeholder="0"
              style={{ ...inputStyle, paddingLeft: '28px', fontWeight: '700' }}
              onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
              onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
        </div>
      </div>

      {/* Effective Month-Year */}
      <div style={{
        padding: '16px 18px', background: '#eff6ff',
        border: '1.5px solid #93c5fd', borderRadius: '12px',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '12px', flexWrap: 'wrap', gap: '8px',
        }}>
          <label style={{
            fontSize: '0.82rem', fontWeight: '800', color: '#1e40af',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <Sparkles size={16} color="#2563eb" />
            Effective From (Month & Year) *
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={handleSetEffectiveToStart}
              style={{
                fontSize: '0.72rem', padding: '4px 10px', borderRadius: '6px',
                border: '1px solid #bfdbfe', background: '#ffffff', color: '#1d4ed8',
                cursor: 'pointer', fontWeight: '700',
              }}
            >From Start</button>
            <button
              type="button"
              onClick={handleSetEffectiveToCurrent}
              style={{
                fontSize: '0.72rem', padding: '4px 10px', borderRadius: '6px',
                border: '1px solid #bfdbfe', background: '#ffffff', color: '#1d4ed8',
                cursor: 'pointer', fontWeight: '700',
              }}
            >Current Month</button>
          </div>
        </div>

        <input
          type="month"
          required
          value={form.effectiveMonthYear}
          onChange={(e) => setForm({ ...form, effectiveMonthYear: e.target.value })}
          style={{
            ...inputStyle, maxWidth: '260px',
            fontWeight: '800', fontSize: '1rem', color: '#1e3a8a',
            borderColor: '#3b82f6',
          }}
        />

        <div style={{
          marginTop: '12px', background: '#ffffff', border: '1px solid #bfdbfe',
          borderRadius: '8px', padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563eb', flexShrink: 0 }} />
          <span style={{ fontSize: '0.78rem', color: '#1e40af', fontWeight: '500', lineHeight: 1.5 }}>
            The new price (
            <strong style={{ color: '#15803d' }}>
              {formatINR(newNet > 0 ? newNet : (newGross > 0 ? newGross : 27900))}/mo net
            </strong>
            ) will take effect starting from{' '}
            <strong style={{ color: '#1d4ed8' }}>{formatMonthYearLabel(form.effectiveMonthYear)}</strong> (Month #{appliedFromMonthIndex}).{' '}
            {appliedFromMonthIndex > 1
              ? `Months 1 to ${appliedFromMonthIndex - 1} will retain their historical rate.`
              : 'This applies uniformly across the tenure.'}
          </span>
        </div>
      </div>

      {/* Revision Reason */}
      <div>
        <label style={labelStyle}>Revision Reason / Remarks (Optional)</label>
        <input
          type="text"
          value={form.revisionReason}
          onChange={(e) => setForm({ ...form, revisionReason: e.target.value })}
          placeholder="e.g. Annual rent escalation per agreement clause 4"
          style={inputStyle}
          onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
          onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
        />
      </div>
    </div>
  );

  // ==========================================
  // STEP 4: Review & Upload
  // ==========================================
  const renderStep4 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'stepFadeIn 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '10px',
          background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CheckCircle2 size={16} color="#fff" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>Review & Confirm</h3>
          <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b' }}>Review financial impact, upload agreement, and save</p>
        </div>
      </div>

      {/* Financial Summary */}
      <div style={{
        background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
        border: '1.5px solid #86efac', borderRadius: '12px', padding: '16px 20px',
        display: 'flex', flexDirection: 'column', gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} color="#16a34a" />
            <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#166534', textTransform: 'uppercase' }}>
              Financial Impact Summary
            </span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: '700' }}>
            Ends: {computedEndDateStr}
          </span>
        </div>

        {appliedFromMonthIndex > 1 && priorMonthsCount > 0 ? (
          <div style={{
            background: 'rgba(255, 255, 255, 0.7)', borderRadius: '8px',
            padding: '10px 14px', border: '1px solid #bbf7d0',
            display: 'flex', alignItems: 'center', gap: '10px',
            fontSize: '0.75rem', color: '#14532d', flexWrap: 'wrap',
          }}>
            <div>
              <span style={{ fontWeight: '800' }}>Prior Period:</span> {priorMonthsCount} mos @ {formatINR(prevNet)} = <strong>{formatINR(priorMonthsCount * prevNet)}</strong>
            </div>
            <ArrowRight size={14} color="#16a34a" />
            <div>
              <span style={{ fontWeight: '800' }}>New Period ({formatMonthYearLabel(form.effectiveMonthYear)}):</span> {newMonthsCount} mos @ {formatINR(newNet)} = <strong>{formatINR(newMonthsCount * newNet)}</strong>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: '0.78rem', color: '#166534', fontWeight: '600' }}>
            Applied uniformly across entire {newTenure} months tenure @ {formatINR(newNet)} Net / month.
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', display: 'block' }}>TOTAL PAYMENT (TENURE)</span>
            <span style={{ fontSize: '1.15rem', fontWeight: '800', color: '#1e3a8a' }}>{formatINR(totalCommitment)}</span>
            <span style={{ fontSize: '0.66rem', color: '#2563eb', display: 'block', fontWeight: '600', marginTop: '2px' }}>Gross without TDS</span>
          </div>
          <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', display: 'block' }}>TOTAL PAID</span>
            <span style={{ fontSize: '1.15rem', fontWeight: '800', color: '#16a34a' }}>{formatINR(totalPaid)}</span>
            <span style={{ fontSize: '0.66rem', color: '#64748b', display: 'block', marginTop: '2px' }}>Disbursed so far</span>
          </div>
          <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', display: 'block' }}>OUTSTANDING</span>
            <span style={{ fontSize: '1.15rem', fontWeight: '800', color: outstandingBalance > 0 ? '#dc2626' : '#16a34a' }}>
              {formatINR(outstandingBalance)}
            </span>
            <span style={{ fontSize: '0.66rem', color: '#64748b', display: 'block', marginTop: '2px' }}>Remaining liability</span>
          </div>
        </div>
      </div>

      {/* Quick Summary Table */}
      <div style={{
        background: '#f8fafc', border: '1px solid #e2e8f0',
        borderRadius: '12px', padding: '16px 18px',
      }}>
        <h4 style={{ margin: '0 0 12px', fontSize: '0.82rem', fontWeight: '800', color: '#334155' }}>📋 Terms Summary</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.82rem' }}>
          {[
            { label: 'Owner', value: form.ownerName || '—' },
            { label: 'Flat', value: `Flat ${rental.flatNumber}` },
            { label: 'Gross Rent', value: `${formatINR(newGross)}/mo` },
            { label: 'Net Rent', value: `${formatINR(newNet)}/mo` },
            { label: 'TDS', value: form.applyTds ? `${newTdsPct}% (${formatINR(newTdsAmt)})` : 'None' },
            { label: 'Tenure', value: `${newTenure} months` },
            { label: 'Start', value: form.startDate ? new Date(form.startDate).toLocaleDateString('en-IN') : '—' },
            { label: 'Effective From', value: formatMonthYearLabel(form.effectiveMonthYear) || '—' },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '6px 10px', borderRadius: '6px',
              background: i % 2 === 0 ? '#ffffff' : '#f1f5f9',
            }}>
              <span style={{ color: '#64748b', fontWeight: '600' }}>{item.label}</span>
              <span style={{ color: '#0f172a', fontWeight: '700' }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Agreement Upload */}
      <div style={{
        background: '#f8fafc', border: '1px solid #e2e8f0',
        borderRadius: '12px', padding: '16px 18px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
          <FileText size={15} color="#7c3aed" />
          <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#5b21b6', textTransform: 'uppercase' }}>
            Agreement Document
          </span>
        </div>

        {agreementDoc?.fileUrl ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: '#ffffff', border: '1.5px solid #c4b5fd',
            borderRadius: '10px', padding: '12px 16px', gap: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '8px',
                background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <FileText size={18} color="#ffffff" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {agreementDoc.fileName || 'Rental_Agreement.pdf'}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                  Uploaded {agreementDoc.uploadedAt ? new Date(agreementDoc.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  {agreementDoc.verificationStatus && (
                    <span style={{
                      marginLeft: '8px', padding: '1px 6px', borderRadius: '4px',
                      fontSize: '0.65rem', fontWeight: '700',
                      background: agreementDoc.verificationStatus === 'verified' ? '#dcfce7' : '#fef3c7',
                      color: agreementDoc.verificationStatus === 'verified' ? '#166534' : '#92400e',
                    }}>
                      {agreementDoc.verificationStatus.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              <a
                href={getFileUrl(agreementDoc.fileUrl)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  width: '32px', height: '32px', borderRadius: '6px',
                  border: '1px solid #c4b5fd', background: '#f5f3ff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', textDecoration: 'none',
                }}
                title="View / Download"
              >
                <Eye size={15} color="#7c3aed" />
              </a>
              <a
                href={getFileUrl(agreementDoc.fileUrl)}
                download={agreementDoc.fileName || 'Rental_Agreement.pdf'}
                style={{
                  width: '32px', height: '32px', borderRadius: '6px',
                  border: '1px solid #93c5fd', background: '#eff6ff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', textDecoration: 'none',
                }}
                title="Download"
              >
                <Download size={15} color="#2563eb" />
              </a>
              <button
                type="button"
                onClick={handleAgreementDelete}
                disabled={agreementUploading}
                style={{
                  width: '32px', height: '32px', borderRadius: '6px',
                  border: '1px solid #fca5a5', background: '#fef2f2',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: agreementUploading ? 'not-allowed' : 'pointer',
                }}
                title="Remove Agreement"
              >
                <Trash2 size={15} color="#dc2626" />
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => !agreementUploading && fileInputRef.current?.click()}
            style={{
              border: '2px dashed #c4b5fd', borderRadius: '12px',
              padding: '24px', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '8px',
              cursor: agreementUploading ? 'not-allowed' : 'pointer',
              background: '#faf5ff', transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => { e.currentTarget.style.borderColor = '#8b5cf6'; e.currentTarget.style.background = '#f5f3ff'; }}
            onMouseOut={(e) => { e.currentTarget.style.borderColor = '#c4b5fd'; e.currentTarget.style.background = '#faf5ff'; }}
          >
            <div style={{
              width: '42px', height: '42px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Upload size={20} color="#ffffff" />
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#5b21b6' }}>
              {agreementUploading ? 'Uploading...' : 'Upload Rental Agreement'}
            </span>
            <span style={{ fontSize: '0.72rem', color: '#7c3aed' }}>
              PDF, JPG, PNG — Max 20MB
            </span>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          onChange={handleAgreementUpload}
          style={{ display: 'none' }}
        />
      </div>

      {/* Past Revisions */}
      {Array.isArray(rental.termRevisions) && rental.termRevisions.length > 0 && (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            style={{
              width: '100%', padding: '10px 14px',
              background: '#f8fafc', border: 'none',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              cursor: 'pointer', fontSize: '0.78rem', fontWeight: '700', color: '#475569',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <History size={14} color="#64748b" />
              Past Terms Revision History ({rental.termRevisions.length})
            </span>
            <span style={{ color: '#2563eb', fontSize: '0.72rem' }}>
              {showHistory ? 'Hide Details' : 'View Audit Log'}
            </span>
          </button>

          {showHistory && (
            <div style={{ padding: '12px 14px', background: '#ffffff', maxHeight: '180px', overflowY: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.72rem', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                    <th style={{ padding: '6px 8px' }}>Effective</th>
                    <th style={{ padding: '6px 8px' }}>Previous Terms</th>
                    <th style={{ padding: '6px 8px' }}>New Terms</th>
                    <th style={{ padding: '6px 8px' }}>Reason</th>
                    <th style={{ padding: '6px 8px' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {rental.termRevisions.map((rev, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 8px', fontWeight: '700', color: '#2563eb' }}>
                        {formatMonthYearLabel(rev.effectiveMonthYear)}
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        {formatINR(rev.previousTerms?.netRent || rev.previousTerms?.guaranteedMonthlyRent)}/mo • {rev.previousTerms?.tenureMonths || 36}m
                      </td>
                      <td style={{ padding: '6px 8px', fontWeight: '700', color: '#16a34a' }}>
                        {formatINR(rev.newTerms?.netRent || rev.newTerms?.guaranteedMonthlyRent)}/mo • {rev.newTerms?.tenureMonths || 36}m
                      </td>
                      <td style={{ padding: '6px 8px', color: '#64748b' }}>{rev.reason || '—'}</td>
                      <td style={{ padding: '6px 8px', color: '#94a3b8' }}>
                        {rev.revisionDate ? new Date(rev.revisionDate).toLocaleDateString('en-IN') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      default: return null;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '16px'
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '720px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
        }}
      >
        {/* ================= HEADER ================= */}
        <div
          style={{
            padding: '18px 24px',
            background: 'linear-gradient(135deg, #1e3a8a, #0f172a)',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.15rem', fontWeight: '800' }}>Edit Rental Terms</span>
              <span style={{
                background: '#2563eb', color: '#ffffff',
                fontSize: '0.72rem', fontWeight: '700',
                padding: '3px 10px', borderRadius: '6px',
              }}>Flat {rental.flatNumber}</span>
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
              padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s',
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            <X size={18} />
          </button>
        </div>

        {/* ================= STEPPER ================= */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0',
          padding: '16px 24px', background: '#f8fafc',
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
                    transition: 'all 0.2s ease',
                    flex: isActive ? '1.2' : '1',
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
                    transition: 'all 0.3s ease',
                    flexShrink: 0,
                  }}>
                    {isCompleted ? (
                      <CheckCircle2 size={14} color="#fff" />
                    ) : (
                      <StepIcon size={14} color={isActive ? '#fff' : '#94a3b8'} />
                    )}
                  </div>
                  <div style={{ textAlign: 'left', minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.72rem', fontWeight: '800',
                      color: isActive ? '#0f172a' : isCompleted ? '#16a34a' : '#94a3b8',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
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
                    width: '24px', height: '2px', flexShrink: 0,
                    background: isCompleted ? '#16a34a' : '#e2e8f0',
                    borderRadius: '1px', transition: 'background 0.3s',
                  }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* ================= STEP CONTENT ================= */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (currentStep === STEPS.length) {
              handleSubmit();
            } else {
              goNext();
            }
          }}
          style={{
            padding: '22px 24px',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {renderCurrentStep()}
        </form>

        {/* ================= FOOTER ================= */}
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
            {currentStep === 1 ? (
              <>Cancel</>
            ) : (
              <><ArrowLeft size={15} /> Back</>
            )}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {STEPS.map((step) => (
              <div
                key={step.id}
                style={{
                  width: currentStep === step.id ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: currentStep >= step.id
                    ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                    : '#e2e8f0',
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
                  ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                  : '#e2e8f0',
                color: validateStep(currentStep) ? '#ffffff' : '#94a3b8',
                fontSize: '0.84rem', fontWeight: '800',
                cursor: validateStep(currentStep) ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', gap: '6px',
                boxShadow: validateStep(currentStep) ? '0 4px 12px rgba(37, 99, 235, 0.35)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              style={{
                padding: '10px 24px', borderRadius: '10px', border: 'none',
                background: 'linear-gradient(135deg, #16a34a, #15803d)',
                color: '#ffffff', fontSize: '0.84rem', fontWeight: '800',
                cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.35)',
                display: 'flex', alignItems: 'center', gap: '8px',
                transition: 'all 0.2s',
              }}
            >
              <CheckCircle2 size={16} />
              {saving ? 'Saving...' : 'Apply & Save Terms'}
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
