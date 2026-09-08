import React, { useState, useEffect, useMemo } from 'react';
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
  ArrowRight
} from 'lucide-react';
import { rentalService } from '../../services/rentalService.js';
import { useToast } from '../../context/ToastContext.jsx';

export const EditRentalTermsModal = ({ isOpen, onClose, rental, onUpdated }) => {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

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
    }
  }, [rental]);

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
    e.preventDefault();
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

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(5px)',
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
          borderRadius: '16px',
          width: '100%',
          maxWidth: '760px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden'
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
            borderBottom: '1px solid #334155'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: '800' }}>Edit Rental Terms & Register Details</span>
              <span
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '6px'
                }}
              >
                Flat {rental.flatNumber}
              </span>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#93c5fd' }}>
              Modify rental price, tenure, TDS, registry dates, and set the exact month-year from which new terms take effect.
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

        {/* ================= FORM BODY ================= */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: '22px 24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}
        >
          {/* ================= SECTION 1: REGISTER DETAILS & OWNER KYC ================= */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
              <User size={15} color="#2563eb" />
              <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#1e3a8a', textTransform: 'uppercase' }}>
                1. Owner & Register Details
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1.2fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  OWNER NAME *
                </label>
                <input
                  type="text"
                  required
                  value={form.ownerName}
                  onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                  placeholder="e.g. Padam Kumar"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.84rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  OWNER MOBILE
                </label>
                <input
                  type="text"
                  value={form.ownerMobile}
                  onChange={(e) => setForm({ ...form, ownerMobile: e.target.value })}
                  placeholder="e.g. 9876543210"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.84rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  OWNER EMAIL
                </label>
                <input
                  type="email"
                  value={form.ownerEmail}
                  onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })}
                  placeholder="owner@example.com"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.84rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.2fr', gap: '12px', marginTop: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  PAN NUMBER
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={form.ownerPan}
                  onChange={(e) => setForm({ ...form, ownerPan: e.target.value.toUpperCase() })}
                  placeholder="ABCDE1234F"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.84rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  AADHAAR NUMBER
                </label>
                <input
                  type="text"
                  maxLength={14}
                  value={form.ownerAadhaar}
                  onChange={(e) => setForm({ ...form, ownerAadhaar: e.target.value })}
                  placeholder="12-digit number"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.84rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  REGISTRY / MOU DATE
                </label>
                <input
                  type="date"
                  value={form.mouDate}
                  onChange={(e) => setForm({ ...form, mouDate: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.84rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  MOU / AGREEMENT NUMBER
                </label>
                <input
                  type="text"
                  value={form.mouNumber}
                  onChange={(e) => setForm({ ...form, mouNumber: e.target.value })}
                  placeholder="e.g. KVH/MOU/2026/101"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.84rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          </div>

          {/* ================= SECTION 2: RENT PRICING & TDS ================= */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
              <DollarSign size={15} color="#16a34a" />
              <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#166534', textTransform: 'uppercase' }}>
                2. Monthly Rental Amount & TDS
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.3fr', gap: '14px', alignItems: 'flex-start' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  NEW GROSS MONTHLY RENT (₹) *
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontWeight: '700', color: '#64748b' }}>
                    ₹
                  </span>
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
                      width: '100%',
                      padding: '8px 10px 8px 24px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      fontWeight: '800',
                      color: '#0f172a',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.76rem',
                      fontWeight: '700',
                      color: '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={form.applyTds}
                      onChange={(e) => setForm({ ...form, applyTds: e.target.checked })}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    APPLY TDS
                  </label>

                  {form.applyTds && (
                    <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '6px', padding: '2px', gap: '2px' }}>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, tdsMode: 'percentage' })}
                        style={{
                          padding: '2px 8px',
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          borderRadius: '4px',
                          border: 'none',
                          cursor: 'pointer',
                          background: form.tdsMode === 'percentage' ? '#2563eb' : 'transparent',
                          color: form.tdsMode === 'percentage' ? '#ffffff' : '#475569',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        % Percent
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, tdsMode: 'amount' })}
                        style={{
                          padding: '2px 8px',
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          borderRadius: '4px',
                          border: 'none',
                          cursor: 'pointer',
                          background: form.tdsMode === 'amount' ? '#2563eb' : 'transparent',
                          color: form.tdsMode === 'amount' ? '#ffffff' : '#475569',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        ₹ Amount
                      </button>
                    </div>
                  )}
                </div>

                {form.applyTds ? (
                  form.tdsMode === 'percentage' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                          style={{
                            width: '100%',
                            padding: '8px 24px 8px 10px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.85rem',
                            fontWeight: '700',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                        <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: '#64748b', fontWeight: '700' }}>
                          %
                        </span>
                      </div>
                      <span style={{
                        padding: '6px 10px',
                        background: '#fef3c7',
                        color: '#92400e',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        whiteSpace: 'nowrap'
                      }}>
                        - {formatINR(newTdsAmt)}
                      </span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: '#64748b', fontWeight: '700' }}>
                          ₹
                        </span>
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
                          style={{
                            width: '100%',
                            padding: '8px 10px 8px 22px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.85rem',
                            fontWeight: '700',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                      <span style={{
                        padding: '6px 10px',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        whiteSpace: 'nowrap'
                      }}>
                        {newTdsPct}% rate
                      </span>
                    </div>
                  )
                ) : (
                  <div style={{
                    height: '38px',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 12px',
                    background: '#f1f5f9',
                    borderRadius: '6px',
                    color: '#64748b',
                    fontSize: '0.8rem',
                    fontWeight: '600'
                  }}>
                    No TDS will be deducted (0%)
                  </div>
                )}
              </div>
            </div>

            {/* Net Preview */}
            <div
              style={{
                marginTop: '10px',
                padding: '8px 12px',
                background: '#ffffff',
                border: '1px solid #bbf7d0',
                borderRadius: '6px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: '700' }}>
                New Net Monthly Payout after TDS:
              </span>
              <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#166534' }}>
                {formatINR(newNet)} / month
                {form.applyTds && (
                  <span style={{ fontSize: '0.72rem', color: '#b45309', marginLeft: '6px', fontWeight: '600' }}>
                    (-{formatINR(newTdsAmt)} TDS @ {newTdsPct}%)
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* ================= SECTION 3: DATES, TENURE & EFFECTIVE MONTH-YEAR ================= */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
              <Calendar size={15} color="#d97706" />
              <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#b45309', textTransform: 'uppercase' }}>
                3. Contract Period & Effective Month-Year (Key)
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.3fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  PAYMENT STARTING DATE *
                </label>
                <input
                  type="date"
                  required
                  value={form.startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.84rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  TOTAL TENURE (MONTHS) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  required
                  value={form.tenureMonths}
                  onChange={(e) => handleTenureChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.88rem',
                    fontWeight: '700',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.74rem', fontWeight: '700', color: '#1e40af' }}>
                    PAYMENT ENDING DATE *
                  </label>
                  <button
                    type="button"
                    onClick={handleRecalculateEndDate}
                    title="Auto-calculate from Start Date + Tenure Months"
                    style={{
                      border: 'none',
                      background: '#eff6ff',
                      color: '#2563eb',
                      fontSize: '0.68rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      padding: '1px 6px'
                    }}
                  >
                    Auto-Compute
                  </button>
                </div>
                <input
                  type="date"
                  required
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1.5px solid #3b82f6',
                    fontSize: '0.84rem',
                    fontWeight: '700',
                    color: '#1e3a8a',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: '#ffffff'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  PAYOUT DUE DAY
                </label>
                <select
                  value={form.dueDayOfMonth}
                  onChange={(e) => setForm({ ...form, dueDayOfMonth: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.84rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: '#ffffff'
                  }}
                >
                  <option value={10}>10th of every month</option>
                  <option value={15}>15th of every month</option>
                  <option value={20}>20th of every month</option>
                  <option value={25}>25th of every month</option>
                  <option value={1}>1st of every month</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  TOTAL PAID / DISBURSED SO FAR (₹)
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontWeight: '700', color: '#64748b' }}>
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={form.totalPaid}
                    onChange={(e) => setForm({ ...form, totalPaid: Math.max(0, Number(e.target.value)) })}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '8px 10px 8px 24px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      fontWeight: '700',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* EFFECTIVE MONTH-YEAR INPUT (PROMINENT HIGHLIGHT) */}
            <div
              style={{
                marginTop: '16px',
                padding: '16px 18px',
                background: '#eff6ff',
                border: '1.5px solid #93c5fd',
                borderRadius: '10px'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}
              >
                <label
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: '800',
                    color: '#1e40af',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Sparkles size={16} color="#2563eb" />
                  EFFECTIVE FROM (MONTH & YEAR) *
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={handleSetEffectiveToStart}
                    style={{
                      fontSize: '0.72rem',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid #bfdbfe',
                      background: '#ffffff',
                      color: '#1d4ed8',
                      cursor: 'pointer',
                      fontWeight: '700'
                    }}
                  >
                    From Start Month
                  </button>
                  <button
                    type="button"
                    onClick={handleSetEffectiveToCurrent}
                    style={{
                      fontSize: '0.72rem',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid #bfdbfe',
                      background: '#ffffff',
                      color: '#1d4ed8',
                      cursor: 'pointer',
                      fontWeight: '700'
                    }}
                  >
                    Current Month
                  </button>
                </div>
              </div>

              {/* Month Picker Row */}
              <div style={{ marginBottom: '12px' }}>
                <input
                  type="month"
                  required
                  value={form.effectiveMonthYear}
                  onChange={(e) => setForm({ ...form, effectiveMonthYear: e.target.value })}
                  style={{
                    width: '100%',
                    maxWidth: '260px',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #3b82f6',
                    fontSize: '0.95rem',
                    fontWeight: '800',
                    color: '#1e3a8a',
                    outline: 'none',
                    background: '#ffffff',
                    boxShadow: '0 1px 3px rgba(37, 99, 235, 0.1)',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Explanatory Banner Below the Input - Full Width & Clean */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#2563eb',
                    flexShrink: 0
                  }}
                />
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

            {/* REVISION REASON */}
            <div style={{ marginTop: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                REVISION REASON / REMARKS (OPTIONAL)
              </label>
              <input
                type="text"
                value={form.revisionReason}
                onChange={(e) => setForm({ ...form, revisionReason: e.target.value })}
                placeholder="e.g. Annual rent escalation per agreement clause 4, or tenure extension"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.84rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* ================= SECTION 4: LIVE COMPUTED FINANCIAL SUMMARY ================= */}
          <div
            style={{
              background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
              border: '1.5px solid #86efac',
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} color="#16a34a" />
                <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#166534', textTransform: 'uppercase' }}>
                  Live Auto-Computed Financial Impact
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: '700' }}>
                Ends: {computedEndDateStr}
              </span>
            </div>

            {/* Transition Periods Breakdown */}
            {appliedFromMonthIndex > 1 && priorMonthsCount > 0 ? (
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.7)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  border: '1px solid #bbf7d0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '0.75rem',
                  color: '#14532d',
                  flexWrap: 'wrap'
                }}
              >
                <div>
                  <span style={{ fontWeight: '800' }}>Prior Period:</span> {priorMonthsCount} mos @ {formatINR(prevNet)} ={' '}
                  <strong>{formatINR(priorMonthsCount * prevNet)}</strong>
                </div>
                <ArrowRight size={14} color="#16a34a" />
                <div>
                  <span style={{ fontWeight: '800' }}>New Period (from {formatMonthYearLabel(form.effectiveMonthYear)}):</span> {newMonthsCount} mos @ {formatINR(newNet)} ={' '}
                  <strong>{formatINR(newMonthsCount * newNet)}</strong>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '0.74rem', color: '#166534' }}>
                Applied uniformly across entire {newTenure} months tenure @ {formatINR(newNet)} Net / month.
              </div>
            )}

            {/* 3 Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', display: 'block' }}>
                  TOTAL PAYMENT (TENURE)
                </span>
                <span style={{ fontSize: '1.15rem', fontWeight: '800', color: '#1e3a8a' }}>
                  {formatINR(totalCommitment)}
                </span>
                <span style={{ fontSize: '0.66rem', color: '#2563eb', display: 'block', fontWeight: '600', marginTop: '2px' }}>
                  Rent × Tenure (Gross without TDS)
                </span>
              </div>

              <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', display: 'block' }}>
                  TOTAL PAID (DISBURSED)
                </span>
                <span style={{ fontSize: '1.15rem', fontWeight: '800', color: '#16a34a' }}>
                  {formatINR(totalPaid)}
                </span>
                <span style={{ fontSize: '0.66rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                  Disbursed so far
                </span>
              </div>

              <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', display: 'block' }}>
                  AMOUNT OUTSTANDING
                </span>
                <span style={{ fontSize: '1.15rem', fontWeight: '800', color: outstandingBalance > 0 ? '#dc2626' : '#16a34a' }}>
                  {formatINR(outstandingBalance)}
                </span>
                <span style={{ fontSize: '0.66rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                  Remaining liability
                </span>
              </div>
            </div>
          </div>

          {/* ================= PAST REVISIONS ACCORDION ================= */}
          {Array.isArray(rental.termRevisions) && rental.termRevisions.length > 0 && (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: '#f8fafc',
                  border: 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  color: '#475569'
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
                          <td style={{ padding: '6px 8px', color: '#64748b' }}>
                            {rev.reason || '—'}
                          </td>
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

          {/* ================= MODAL FOOTER ACTIONS ================= */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              borderTop: '1px solid #e2e8f0',
              paddingTop: '16px',
              marginTop: '4px'
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: '0.84rem',
                fontWeight: '600',
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
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#ffffff',
                fontSize: '0.84rem',
                fontWeight: '800',
                cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <CheckCircle2 size={16} />
              {saving ? 'Applying Terms...' : 'Apply & Save Terms'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
