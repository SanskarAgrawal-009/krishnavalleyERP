import React, { useState, useEffect, useMemo } from 'react';
import { rentalService } from '../../services/rentalService.js';
import { projectService } from '../../services/projectService.js';
import {
  Building2, Calendar, DollarSign, User, Clock, ShieldCheck,
  CheckCircle2, AlertCircle, Search, Check, X, RefreshCw,
  Home, Layers, ChevronRight, ArrowLeft, TrendingUp
} from 'lucide-react';

const STEPS = [
  { id: 1, title: 'Select Flat', subtitle: 'Choose Unit', icon: Home, color: '#2563eb' },
  { id: 2, title: 'Owner Details', subtitle: 'KYC & Registry', icon: User, color: '#7c3aed' },
  { id: 3, title: 'Rent & TDS', subtitle: 'Monthly Pricing', icon: DollarSign, color: '#16a34a' },
  { id: 4, title: 'Contract', subtitle: 'Dates & Review', icon: Calendar, color: '#ea580c' },
];

export const ManualRentalEntryModal = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [flatsList, setFlatsList] = useState([]);
  const [loadingFlats, setLoadingFlats] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Flat Selection State
  const [selectedFlat, setSelectedFlat] = useState(null);
  const [flatSearchQuery, setFlatSearchQuery] = useState('');

  // Form State
  const [ownerName, setOwnerName] = useState('');
  const [ownerMobile, setOwnerMobile] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [registryDate, setRegistryDate] = useState(new Date().toISOString().slice(0, 10));
  const [rentAmount, setRentAmount] = useState(31000);
  const [applyTds, setApplyTds] = useState(true);
  const [tdsMode, setTdsMode] = useState('percentage');
  const [tdsPercentage, setTdsPercentage] = useState(10);
  const [tdsAmount, setTdsAmount] = useState(3100);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');
  const [tenureMonths, setTenureMonths] = useState(36);
  const [totalPaid, setTotalPaid] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch flats list when modal opens
  useEffect(() => {
    if (isOpen) {
      setLoadingFlats(true);
      setErrorMsg('');
      projectService.getFlats()
        .then((res) => {
          const list = res?.data || (Array.isArray(res) ? res : []);
          setFlatsList(list);
        })
        .catch((err) => console.error('Error fetching flats for rental selection:', err))
        .finally(() => setLoadingFlats(false));
    } else {
      setSelectedFlat(null);
      setFlatSearchQuery('');
      setOwnerName('');
      setOwnerMobile('');
      setOwnerEmail('');
      setRentAmount(31000);
      setApplyTds(true);
      setTdsMode('percentage');
      setTdsPercentage(10);
      setTdsAmount(3100);
      setTenureMonths(36);
      setTotalPaid(0);
      setCurrentStep(1);
    }
  }, [isOpen]);

  // Filtered flats for selector
  const filteredFlats = useMemo(() => {
    if (!flatSearchQuery.trim()) return flatsList;
    const q = flatSearchQuery.toLowerCase().trim();
    return flatsList.filter((f) =>
      (f.flatNumber || '').toLowerCase().includes(q) ||
      (f.bhkType || '').toLowerCase().includes(q) ||
      String(f.floor || '').includes(q) ||
      (f.buildingName || '').toLowerCase().includes(q) ||
      (f.currentOwner?.name || '').toLowerCase().includes(q)
    );
  }, [flatsList, flatSearchQuery]);

  if (!isOpen) return null;

  // Auto Calculations
  const grossRent = Math.max(0, Number(rentAmount) || 0);
  let finalTdsAmount = 0;
  let effectiveTdsPct = 0;

  if (applyTds) {
    if (tdsMode === 'amount') {
      finalTdsAmount = Math.max(0, Number(tdsAmount) || 0);
      effectiveTdsPct = grossRent > 0 ? Number(((finalTdsAmount / grossRent) * 100).toFixed(2)) : 0;
    } else {
      effectiveTdsPct = Math.max(0, Number(tdsPercentage) || 0);
      finalTdsAmount = Math.round(grossRent * (effectiveTdsPct / 100));
    }
  }

  const netAmount = grossRent - finalTdsAmount;
  const tenure = Math.max(1, Number(tenureMonths) || 36);
  const totalCommitment = grossRent * tenure;
  const paid = Math.max(0, Number(totalPaid) || 0);
  const outstandingBalance = Math.max(0, totalCommitment - paid);

  const calculateEndingDate = (startStr, months) => {
    if (!startStr) return '—';
    const d = new Date(startStr);
    if (isNaN(d.getTime())) return '—';
    d.setMonth(d.getMonth() + Number(months));
    return d.toISOString().slice(0, 10);
  };

  const endingDate = calculateEndingDate(startDate, tenure);
  const formatINR = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

  // Handle Flat Selection
  const handleSelectFlat = (flat) => {
    setSelectedFlat(flat);
    setErrorMsg('');
    if (flat.currentOwner?.name) setOwnerName(flat.currentOwner.name);
    if (flat.currentOwner?.mobileNo && flat.currentOwner.mobileNo !== '—') setOwnerMobile(flat.currentOwner.mobileNo);
    if (flat.currentOwner?.email && flat.currentOwner.email !== '—') setOwnerEmail(flat.currentOwner.email);
    if (flat.rentalDetails?.guaranteedMonthlyRent) {
      const gRent = flat.rentalDetails.guaranteedMonthlyRent;
      setRentAmount(gRent);
      if (flat.rentalDetails.applyTds !== undefined) setApplyTds(flat.rentalDetails.applyTds !== false);
      if (flat.rentalDetails.tdsMode) setTdsMode(flat.rentalDetails.tdsMode);
      if (flat.rentalDetails.tdsPercentage !== undefined) setTdsPercentage(flat.rentalDetails.tdsPercentage);
      if (flat.rentalDetails.tdsAmount !== undefined) setTdsAmount(flat.rentalDetails.tdsAmount);
      else setTdsAmount(Math.round(gRent * (Number(flat.rentalDetails.tdsPercentage || 10) / 100)));
    }
    if (flat.rentalDetails?.tenureMonths) setTenureMonths(flat.rentalDetails.tenureMonths);
    if (flat.rentalDetails?.startDate) setStartDate(new Date(flat.rentalDetails.startDate).toISOString().slice(0, 10));
    if (flat.rentalDetails?.mouDate) setRegistryDate(new Date(flat.rentalDetails.mouDate).toISOString().slice(0, 10));
    // Auto-advance to step 2
    setCurrentStep(2);
  };

  const handleSubmit = async () => {
    if (!selectedFlat) {
      setErrorMsg('Please select a flat unit from the list.');
      setCurrentStep(1);
      return;
    }
    if (!ownerName.trim()) {
      setErrorMsg('Please enter the owner name.');
      setCurrentStep(2);
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        flatId: selectedFlat._id || selectedFlat.id,
        flatNumber: selectedFlat.flatNumber,
        ownerName: ownerName.trim(),
        ownerMobile: ownerMobile.trim(),
        ownerEmail: ownerEmail.trim(),
        registryDate,
        rentAmount: grossRent,
        applyTds,
        tdsMode,
        tdsPercentage: effectiveTdsPct,
        tdsAmount: finalTdsAmount,
        startDate,
        endDate: endDate || endingDate,
        tenureMonths: tenure,
        totalPaid: paid
      };

      const res = await rentalService.createManualRental(payload);
      if (res.success) {
        onClose();
        if (onSuccess) {
          try { onSuccess(); } catch (e) { console.warn('onSuccess callback error:', e); }
        }
      } else {
        setErrorMsg(res.message || 'Failed to enroll flat into rental register');
      }
    } catch (err) {
      console.error('Manual rental enrollment error:', err);
      setErrorMsg(err.message || 'Error executing manual rental enrollment');
    } finally {
      setSubmitting(false);
    }
  };

  // Step validation
  const validateStep = (step) => {
    switch (step) {
      case 1: return !!selectedFlat;
      case 2: return ownerName.trim().length > 0;
      case 3: return grossRent > 0;
      case 4: return !!startDate;
      default: return true;
    }
  };

  const goNext = () => {
    if (currentStep < STEPS.length && validateStep(currentStep)) {
      setCurrentStep(s => s + 1);
    }
  };

  const goPrev = () => {
    if (currentStep > 1) setCurrentStep(s => s - 1);
  };

  const goToStep = (step) => {
    if (step < currentStep || validateStep(currentStep)) setCurrentStep(step);
  };

  // Common styles
  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: '8px',
    border: '1.5px solid #e2e8f0', fontSize: '0.88rem', outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.2s, box-shadow 0.2s',
    fontFamily: "'Inter', sans-serif", background: '#ffffff',
  };
  const focusStyle = { borderColor: '#3b82f6', boxShadow: '0 0 0 3px rgba(59,130,246,0.1)' };
  const labelStyle = {
    display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#64748b',
    marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em',
  };
  const applyFocus = (e) => Object.assign(e.target.style, focusStyle);
  const removeFocus = (e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; };

  // ==========================================
  // STEP 1: Select Flat
  // ==========================================
  const renderStep1 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'stepSlide 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '10px',
          background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Home size={16} color="#fff" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>Select Flat Unit</h3>
          <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b' }}>Choose the flat to enroll into rental register</p>
        </div>
      </div>

      {selectedFlat ? (
        <div style={{
          background: '#f0fdf4', border: '2px solid #22c55e', borderRadius: '12px',
          padding: '14px 18px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(34,197,94,0.15)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #16a34a, #15803d)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Check size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#166534' }}>
                  Flat {selectedFlat.flatNumber}
                </span>
                <span style={{
                  padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem',
                  fontWeight: '700', background: '#dcfce7', color: '#15803d',
                }}>{selectedFlat.bhkType || '2BHK'}</span>
                <span style={{
                  padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem',
                  fontWeight: '600', background: '#e2e8f0', color: '#475569',
                }}>Floor {selectedFlat.floor}</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#15803d', marginTop: '3px' }}>
                {selectedFlat.buildingName ? `${selectedFlat.buildingName} • ` : ''}
                {selectedFlat.carpetArea ? `${selectedFlat.carpetArea} sq.ft` : ''}
                {selectedFlat.currentOwner?.name ? ` • Owner: ${selectedFlat.currentOwner.name}` : ''}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setSelectedFlat(null); }}
            style={{
              padding: '6px 14px', background: '#ffffff', border: '1px solid #cbd5e1',
              borderRadius: '8px', color: '#475569', fontSize: '0.78rem', fontWeight: '700',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
            }}
          >
            <X size={13} /> Change
          </button>
        </div>
      ) : (
        <div style={{
          border: '1.5px solid #e2e8f0', borderRadius: '12px',
          padding: '14px', background: '#f8fafc',
        }}>
          {/* Search */}
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
            <input
              type="text"
              placeholder="Search by flat number, floor, BHK, tower..."
              value={flatSearchQuery}
              onChange={(e) => setFlatSearchQuery(e.target.value)}
              style={{ ...inputStyle, paddingLeft: '36px' }}
              onFocus={applyFocus}
              onBlur={removeFocus}
              autoFocus
            />
          </div>

          {loadingFlats ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '0.84rem' }}>
              <RefreshCw size={18} style={{ margin: '0 auto 6px', display: 'block', animation: 'spin 0.8s linear infinite' }} />
              Loading available flats...
            </div>
          ) : filteredFlats.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.82rem' }}>
              No flats match "{flatSearchQuery}". Import flats in Property Inventory first.
            </div>
          ) : (
            <div style={{
              maxHeight: '280px', overflowY: 'auto',
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px',
            }}>
              {filteredFlats.map((f) => {
                const hasRental = Boolean(f.takenForRental || f.rentalDetails?.guaranteedMonthlyRent);
                return (
                  <div
                    key={f._id || f.id}
                    onClick={() => handleSelectFlat(f)}
                    style={{
                      padding: '10px 14px', borderRadius: '10px',
                      border: '1.5px solid #e2e8f0', background: '#ffffff',
                      cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '3px',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '800', fontSize: '0.92rem', color: '#0f172a' }}>{f.flatNumber}</span>
                      <span style={{
                        padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: '700',
                        background: hasRental ? '#e0f2fe' : '#f1f5f9', color: hasRental ? '#0369a1' : '#475569',
                      }}>{f.bhkType || '2BHK'}</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      Floor {f.floor} {f.carpetArea ? `• ${f.carpetArea} sq.ft` : ''}
                    </div>
                    {f.currentOwner?.name && (
                      <div style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        Owner: {f.currentOwner.name}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '8px', textAlign: 'center' }}>
            {filteredFlats.length} flats available • Click a flat to select
          </div>
        </div>
      )}
    </div>
  );

  // ==========================================
  // STEP 2: Owner Details
  // ==========================================
  const renderStep2 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', animation: 'stepSlide 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '10px',
          background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <User size={16} color="#fff" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>Owner & Registry Details</h3>
          <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b' }}>
            Owner KYC for Flat {selectedFlat?.flatNumber || '—'}
          </p>
        </div>
      </div>

      <div>
        <label style={labelStyle}>Owner Full Name *</label>
        <input
          type="text" required placeholder="e.g. Ved Prakash Agarwal"
          value={ownerName} onChange={(e) => setOwnerName(e.target.value)}
          style={{ ...inputStyle, fontSize: '1rem', fontWeight: '700' }}
          onFocus={applyFocus} onBlur={removeFocus} autoFocus
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <div>
          <label style={labelStyle}>Owner Mobile</label>
          <input
            type="text" placeholder="9876543210"
            value={ownerMobile} onChange={(e) => setOwnerMobile(e.target.value)}
            style={inputStyle} onFocus={applyFocus} onBlur={removeFocus}
          />
        </div>
        <div>
          <label style={labelStyle}>Owner Email</label>
          <input
            type="email" placeholder="owner@example.com"
            value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)}
            style={inputStyle} onFocus={applyFocus} onBlur={removeFocus}
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Registry / MOU Date *</label>
        <input
          type="date" required value={registryDate}
          onChange={(e) => setRegistryDate(e.target.value)}
          style={inputStyle} onFocus={applyFocus} onBlur={removeFocus}
        />
      </div>

      {/* Selected flat info */}
      {selectedFlat && (
        <div style={{
          padding: '10px 14px', background: '#f0fdf4', borderRadius: '10px',
          border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <CheckCircle2 size={16} color="#16a34a" />
          <span style={{ fontSize: '0.78rem', color: '#166534', fontWeight: '600' }}>
            Enrolling <strong>Flat {selectedFlat.flatNumber}</strong> • {selectedFlat.buildingName || 'Tower'} • Floor {selectedFlat.floor}
          </span>
        </div>
      )}
    </div>
  );

  // ==========================================
  // STEP 3: Rent & TDS
  // ==========================================
  const renderStep3 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', animation: 'stepSlide 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '10px',
          background: 'linear-gradient(135deg, #16a34a, #15803d)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <DollarSign size={16} color="#fff" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>Rent Amount & TDS</h3>
          <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b' }}>Set gross rent and TDS deduction for Flat {selectedFlat?.flatNumber || '—'}</p>
        </div>
      </div>

      {/* Gross Rent */}
      <div>
        <label style={labelStyle}>Gross Monthly Rent (₹) *</label>
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
            fontWeight: '800', color: '#16a34a', fontSize: '1rem',
          }}>₹</span>
          <input
            type="number" required min="1000" step="500"
            value={rentAmount}
            onChange={(e) => {
              const val = e.target.value === '' ? '' : Number(e.target.value);
              setRentAmount(val);
              if (tdsMode === 'percentage' && val) {
                setTdsAmount(Math.round(val * (tdsPercentage / 100)));
              }
            }}
            style={{ ...inputStyle, paddingLeft: '30px', fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}
            onFocus={applyFocus} onBlur={removeFocus}
          />
        </div>
      </div>

      {/* TDS Config */}
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
              type="checkbox" checked={applyTds}
              onChange={(e) => setApplyTds(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2563eb' }}
            />
            Apply TDS Deduction
          </label>

          {applyTds && (
            <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '8px', padding: '3px', gap: '2px' }}>
              <button type="button" onClick={() => setTdsMode('percentage')} style={{
                padding: '4px 12px', fontSize: '0.75rem', fontWeight: '700', borderRadius: '6px', border: 'none',
                cursor: 'pointer', background: tdsMode === 'percentage' ? '#2563eb' : 'transparent',
                color: tdsMode === 'percentage' ? '#fff' : '#475569', transition: 'all 0.2s',
              }}>% Percent</button>
              <button type="button" onClick={() => setTdsMode('amount')} style={{
                padding: '4px 12px', fontSize: '0.75rem', fontWeight: '700', borderRadius: '6px', border: 'none',
                cursor: 'pointer', background: tdsMode === 'amount' ? '#2563eb' : 'transparent',
                color: tdsMode === 'amount' ? '#fff' : '#475569', transition: 'all 0.2s',
              }}>₹ Amount</button>
            </div>
          )}
        </div>

        {applyTds ? (
          tdsMode === 'percentage' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="number" min="0" max="100" step="0.1"
                  value={tdsPercentage}
                  onChange={(e) => {
                    const p = Number(e.target.value);
                    setTdsPercentage(p);
                    setTdsAmount(Math.round(grossRent * (p / 100)));
                  }}
                  style={{ ...inputStyle, paddingRight: '28px', fontWeight: '700' }}
                  onFocus={applyFocus} onBlur={removeFocus}
                />
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem', color: '#64748b', fontWeight: '700' }}>%</span>
              </div>
              <span style={{
                padding: '8px 14px', background: '#fef3c7', color: '#92400e',
                borderRadius: '8px', fontSize: '0.82rem', fontWeight: '700', whiteSpace: 'nowrap',
              }}>− {formatINR(finalTdsAmount)}</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem', color: '#64748b', fontWeight: '700' }}>₹</span>
                <input
                  type="number" min="0" step="100"
                  value={tdsAmount}
                  onChange={(e) => {
                    const amt = Number(e.target.value);
                    setTdsAmount(amt);
                    if (grossRent > 0) setTdsPercentage(Number(((amt / grossRent) * 100).toFixed(2)));
                  }}
                  style={{ ...inputStyle, paddingLeft: '28px', fontWeight: '700' }}
                  onFocus={applyFocus} onBlur={removeFocus}
                />
              </div>
              <span style={{
                padding: '8px 14px', background: '#eff6ff', color: '#1d4ed8',
                borderRadius: '8px', fontSize: '0.82rem', fontWeight: '700', whiteSpace: 'nowrap',
              }}>{effectiveTdsPct}% rate</span>
            </div>
          )
        ) : (
          <div style={{
            padding: '10px 14px', background: '#f1f5f9', borderRadius: '8px',
            color: '#64748b', fontSize: '0.85rem', fontWeight: '600', textAlign: 'center',
          }}>No TDS will be deducted (0%)</div>
        )}
      </div>

      {/* Net Preview */}
      <div style={{
        padding: '14px 18px', background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
        border: '1.5px solid #86efac', borderRadius: '12px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: '0.82rem', color: '#166534', fontWeight: '700' }}>Net Monthly Payout:</span>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '1.2rem', fontWeight: '800', color: '#166534' }}>{formatINR(netAmount)}</span>
          <span style={{ fontSize: '0.72rem', color: '#166534', display: 'block', fontWeight: '600' }}>per month</span>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // STEP 4: Contract & Review
  // ==========================================
  const renderStep4 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', animation: 'stepSlide 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '10px',
          background: 'linear-gradient(135deg, #ea580c, #c2410c)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Calendar size={16} color="#fff" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>Contract Period & Review</h3>
          <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b' }}>Set dates, tenure, and review before enrollment</p>
        </div>
      </div>

      {/* Dates */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.8fr 1fr', gap: '14px' }}>
        <div>
          <label style={labelStyle}>Start Date *</label>
          <input
            type="date" required value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={inputStyle} onFocus={applyFocus} onBlur={removeFocus}
          />
        </div>
        <div>
          <label style={labelStyle}>Tenure (Months) *</label>
          <input
            type="number" required min="1" max="120"
            value={tenureMonths} onChange={(e) => setTenureMonths(e.target.value)}
            style={{ ...inputStyle, fontWeight: '800', fontSize: '1rem', textAlign: 'center' }}
            onFocus={applyFocus} onBlur={removeFocus}
          />
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>End Date *</label>
            <button type="button" onClick={() => {
              if (startDate) {
                const d = new Date(startDate);
                if (!isNaN(d.getTime())) { d.setMonth(d.getMonth() + Number(tenureMonths || 36)); setEndDate(d.toISOString().slice(0, 10)); }
              }
            }} style={{
              border: 'none', background: '#eff6ff', color: '#2563eb', fontSize: '0.68rem',
              fontWeight: '700', cursor: 'pointer', borderRadius: '4px', padding: '2px 6px',
            }}>Auto</button>
          </div>
          <input
            type="date" required value={endDate || endingDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ ...inputStyle, borderColor: '#3b82f6', fontWeight: '700', color: '#1e3a8a' }}
          />
        </div>
      </div>

      {/* Total Paid */}
      <div>
        <label style={labelStyle}>Total Paid / Disbursed So Far (₹)</label>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: '700', color: '#64748b' }}>₹</span>
          <input
            type="number" min="0" step="1000" value={totalPaid}
            onChange={(e) => setTotalPaid(e.target.value)}
            style={{ ...inputStyle, paddingLeft: '28px', fontWeight: '700' }}
            onFocus={applyFocus} onBlur={removeFocus}
          />
        </div>
      </div>

      {/* Financial Summary */}
      <div style={{
        background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
        border: '1.5px solid #86efac', borderRadius: '12px', padding: '16px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <TrendingUp size={16} color="#16a34a" />
          <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#166534', textTransform: 'uppercase' }}>Financial Summary</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          <div style={{ background: '#fff', padding: '12px 14px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', display: 'block' }}>TOTAL PAYMENT</span>
            <span style={{ fontSize: '1.15rem', fontWeight: '800', color: '#1e3a8a' }}>{formatINR(totalCommitment)}</span>
            <span style={{ fontSize: '0.66rem', color: '#2563eb', display: 'block', marginTop: '2px' }}>
              {formatINR(grossRent)} × {tenure} mos
            </span>
          </div>
          <div style={{ background: '#fff', padding: '12px 14px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', display: 'block' }}>TOTAL PAID</span>
            <span style={{ fontSize: '1.15rem', fontWeight: '800', color: '#16a34a' }}>{formatINR(paid)}</span>
            <span style={{ fontSize: '0.66rem', color: '#64748b', display: 'block', marginTop: '2px' }}>Disbursed</span>
          </div>
          <div style={{ background: '#fff', padding: '12px 14px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', display: 'block' }}>OUTSTANDING</span>
            <span style={{ fontSize: '1.15rem', fontWeight: '800', color: outstandingBalance > 0 ? '#dc2626' : '#16a34a' }}>
              {formatINR(outstandingBalance)}
            </span>
            <span style={{ fontSize: '0.66rem', color: '#64748b', display: 'block', marginTop: '2px' }}>Remaining</span>
          </div>
        </div>
      </div>

      {/* Summary Table */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px' }}>
        <h4 style={{ margin: '0 0 10px', fontSize: '0.78rem', fontWeight: '800', color: '#334155', textTransform: 'uppercase' }}>📋 Enrollment Summary</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', fontSize: '0.82rem' }}>
          {[
            { label: 'Flat', value: `Flat ${selectedFlat?.flatNumber || '—'}` },
            { label: 'Owner', value: ownerName || '—' },
            { label: 'Gross Rent', value: `${formatINR(grossRent)}/mo` },
            { label: 'Net Rent', value: `${formatINR(netAmount)}/mo` },
            { label: 'TDS', value: applyTds ? `${effectiveTdsPct}% (${formatINR(finalTdsAmount)})` : 'None' },
            { label: 'Tenure', value: `${tenure} months` },
            { label: 'Start', value: startDate ? new Date(startDate).toLocaleDateString('en-IN') : '—' },
            { label: 'End', value: (endDate || endingDate) !== '—' ? new Date(endDate || endingDate).toLocaleDateString('en-IN') : '—' },
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
      case 4: return renderStep4();
      default: return null;
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1100, padding: '16px',
    }}>
      <div style={{
        background: '#ffffff', borderRadius: '20px', width: '100%',
        maxWidth: '720px', maxHeight: '92vh', display: 'flex',
        flexDirection: 'column', boxShadow: '0 25px 60px -12px rgba(0,0,0,0.3)',
        overflow: 'hidden',
      }}>
        {/* HEADER */}
        <div style={{
          padding: '18px 24px', background: 'linear-gradient(135deg, #1e3a8a, #0f172a)',
          color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Building2 size={20} />
              <span style={{ fontSize: '1.15rem', fontWeight: '800' }}>Manual Rental Enrollment</span>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: '#93c5fd' }}>
              Step {currentStep} of {STEPS.length} — {STEPS[currentStep - 1].subtitle}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px',
              color: '#94a3b8', cursor: 'pointer', padding: '8px', display: 'flex',
              alignItems: 'center', transition: 'background 0.2s',
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            <X size={18} />
          </button>
        </div>

        {/* STEPPER */}
        <div style={{
          display: 'flex', alignItems: 'center', padding: '14px 24px',
          background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
        }}>
          {STEPS.map((step, idx) => {
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            const StepIcon = step.icon;
            return (
              <React.Fragment key={step.id}>
                <button
                  type="button" onClick={() => goToStep(step.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 12px', borderRadius: '10px', border: 'none',
                    cursor: 'pointer', background: isActive ? '#ffffff' : 'transparent',
                    boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.2s ease', flex: isActive ? '1.2' : '1',
                  }}
                >
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '8px',
                    background: isCompleted ? 'linear-gradient(135deg, #16a34a, #15803d)'
                      : isActive ? `linear-gradient(135deg, ${step.color}, ${step.color}dd)` : '#e2e8f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.3s ease', flexShrink: 0,
                  }}>
                    {isCompleted ? <CheckCircle2 size={13} color="#fff" /> : <StepIcon size={13} color={isActive ? '#fff' : '#94a3b8'} />}
                  </div>
                  <div style={{ textAlign: 'left', minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.7rem', fontWeight: '800',
                      color: isActive ? '#0f172a' : isCompleted ? '#16a34a' : '#94a3b8',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{step.title}</div>
                    {isActive && <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: '600' }}>{step.subtitle}</div>}
                  </div>
                </button>
                {idx < STEPS.length - 1 && (
                  <div style={{
                    width: '20px', height: '2px', flexShrink: 0,
                    background: isCompleted ? '#16a34a' : '#e2e8f0', borderRadius: '1px',
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

        {/* ERROR */}
        {errorMsg && (
          <div style={{
            margin: '0 24px 12px', padding: '10px 14px', background: '#fef2f2',
            border: '1px solid #fca5a5', borderRadius: '8px', fontSize: '0.82rem',
            color: '#dc2626', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}

        {/* FOOTER */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 24px', borderTop: '1px solid #e2e8f0', background: '#ffffff',
        }}>
          <button
            type="button" onClick={currentStep === 1 ? onClose : goPrev}
            style={{
              padding: '10px 20px', borderRadius: '10px', border: '1px solid #e2e8f0',
              background: '#ffffff', color: '#475569', fontSize: '0.84rem', fontWeight: '700',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#ffffff'; }}
          >
            {currentStep === 1 ? 'Cancel' : <><ArrowLeft size={15} /> Back</>}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {STEPS.map((step) => (
              <div key={step.id} style={{
                width: currentStep === step.id ? '24px' : '8px', height: '8px', borderRadius: '4px',
                background: currentStep >= step.id ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : '#e2e8f0',
                transition: 'all 0.3s ease',
              }} />
            ))}
          </div>

          {currentStep < STEPS.length ? (
            <button
              type="button" onClick={goNext} disabled={!validateStep(currentStep)}
              style={{
                padding: '10px 24px', borderRadius: '10px', border: 'none',
                background: validateStep(currentStep) ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : '#e2e8f0',
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
              type="button" onClick={handleSubmit} disabled={submitting}
              style={{
                padding: '10px 24px', borderRadius: '10px', border: 'none',
                background: 'linear-gradient(135deg, #16a34a, #15803d)',
                color: '#ffffff', fontSize: '0.84rem', fontWeight: '800',
                cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(22,163,74,0.35)',
                display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s',
              }}
            >
              <CheckCircle2 size={16} />
              {submitting ? 'Enrolling...' : `Enroll Flat ${selectedFlat?.flatNumber || ''}`}
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes stepSlide {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ManualRentalEntryModal;
