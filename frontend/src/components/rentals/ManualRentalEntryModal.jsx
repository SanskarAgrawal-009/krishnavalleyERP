import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal.jsx';
import { LoadingButton } from '../common/LoadingButton.jsx';
import { rentalService } from '../../services/rentalService.js';
import { projectService } from '../../services/projectService.js';
import {
  Building2,
  Calendar,
  DollarSign,
  User,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Search,
  Check,
  X,
  RefreshCw,
  Home,
  Layers
} from 'lucide-react';

export const ManualRentalEntryModal = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [flatsList, setFlatsList] = useState([]);
  const [loadingFlats, setLoadingFlats] = useState(false);

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
  const [tdsMode, setTdsMode] = useState('percentage'); // 'percentage' | 'amount'
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

  // Calculate Ending Date
  const calculateEndingDate = (startStr, months) => {
    if (!startStr) return '—';
    const d = new Date(startStr);
    if (isNaN(d.getTime())) return '—';
    d.setMonth(d.getMonth() + Number(months));
    return d.toISOString().slice(0, 10);
  };

  const endingDate = calculateEndingDate(startDate, tenure);

  // Handle Flat Selection
  const handleSelectFlat = (flat) => {
    setSelectedFlat(flat);
    setErrorMsg('');

    // Pre-populate owner and rental details if available on the flat
    if (flat.currentOwner?.name) {
      setOwnerName(flat.currentOwner.name);
    }
    if (flat.currentOwner?.mobileNo && flat.currentOwner.mobileNo !== '—') {
      setOwnerMobile(flat.currentOwner.mobileNo);
    }
    if (flat.currentOwner?.email && flat.currentOwner.email !== '—') {
      setOwnerEmail(flat.currentOwner.email);
    }
    if (flat.rentalDetails?.guaranteedMonthlyRent) {
      const gRent = flat.rentalDetails.guaranteedMonthlyRent;
      setRentAmount(gRent);
      if (flat.rentalDetails.applyTds !== undefined) {
        setApplyTds(flat.rentalDetails.applyTds !== false);
      }
      if (flat.rentalDetails.tdsMode) {
        setTdsMode(flat.rentalDetails.tdsMode);
      }
      if (flat.rentalDetails.tdsPercentage !== undefined) {
        setTdsPercentage(flat.rentalDetails.tdsPercentage);
      }
      if (flat.rentalDetails.tdsAmount !== undefined) {
        setTdsAmount(flat.rentalDetails.tdsAmount);
      } else {
        setTdsAmount(Math.round(gRent * (Number(flat.rentalDetails.tdsPercentage || 10) / 100)));
      }
    }
    if (flat.rentalDetails?.tenureMonths) {
      setTenureMonths(flat.rentalDetails.tenureMonths);
    }
    if (flat.rentalDetails?.startDate) {
      setStartDate(new Date(flat.rentalDetails.startDate).toISOString().slice(0, 10));
    }
    if (flat.rentalDetails?.mouDate) {
      setRegistryDate(new Date(flat.rentalDetails.mouDate).toISOString().slice(0, 10));
    }
  };

  const handleClearSelection = () => {
    setSelectedFlat(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFlat) {
      setErrorMsg('Please select a flat unit from the list to continue.');
      return;
    }
    if (!ownerName.trim()) {
      setErrorMsg('Please enter the owner name.');
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
          try {
            onSuccess();
          } catch (callbackErr) {
            console.warn('onSuccess callback error:', callbackErr);
          }
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manual Rental Entry • Select Flat Unit"
      maxWidth="720px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

        {/* Error Alert */}
        {errorMsg && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '10px 14px',
            color: '#991b1b',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}

        {/* ========================================================= */}
        {/* 1. DEDICATED FLAT SELECTION COMPONENT */}
        {/* ========================================================= */}
        <div>
          <label style={{ fontSize: '0.82rem', color: '#111827', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <Home size={15} color="#2563eb" /> Select Flat Unit *
          </label>

          {selectedFlat ? (
            /* Selected Flat Highlighted Badge */
            <div style={{
              background: '#f0fdf4',
              border: '2px solid #22c55e',
              borderRadius: '10px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 6px rgba(34, 197, 94, 0.15)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '8px',
                  background: '#16a34a',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '800',
                  fontSize: '1.05rem'
                }}>
                  <Check size={24} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#166534' }}>
                      Flat {selectedFlat.flatNumber}
                    </span>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      background: '#dcfce7',
                      color: '#15803d',
                      textTransform: 'uppercase'
                    }}>
                      {selectedFlat.bhkType || '2BHK'}
                    </span>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: '600',
                      background: '#e2e8f0',
                      color: '#475569'
                    }}>
                      Floor {selectedFlat.floor}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#15803d', marginTop: '2px' }}>
                    {selectedFlat.buildingName ? `${selectedFlat.buildingName} • ` : ''}
                    {selectedFlat.carpetArea ? `${selectedFlat.carpetArea} sq.ft • ` : ''}
                    Valuation: ₹{Number(selectedFlat.basePrice || 0).toLocaleString('en-IN')}
                    {selectedFlat.currentOwner?.name ? ` • Existing Owner: ${selectedFlat.currentOwner.name}` : ''}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClearSelection}
                style={{
                  padding: '6px 12px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  color: '#475569',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <X size={13} /> Change Flat
              </button>
            </div>
          ) : (
            /* Searchable Flat Picker */
            <div style={{
              border: '1px solid #dadce0',
              borderRadius: '8px',
              padding: '12px',
              background: '#f8fafc'
            }}>
              {/* Search Box */}
              <div style={{ position: 'relative', marginBottom: '10px' }}>
                <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                <input
                  type="text"
                  placeholder="Filter by flat number (e.g. A-001, 101), floor, BHK..."
                  value={flatSearchQuery}
                  onChange={(e) => setFlatSearchQuery(e.target.value)}
                  style={{ width: '100%', paddingLeft: '32px', fontSize: '0.84rem' }}
                />
              </div>

              {/* Scrollable Flat Cards Grid */}
              {loadingFlats ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.84rem' }}>
                  <RefreshCw size={18} className="spin" style={{ margin: '0 auto 6px', display: 'block' }} />
                  Loading available flats...
                </div>
              ) : filteredFlats.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '0.82rem' }}>
                  No flats match "{flatSearchQuery}". Please create or import flats in Property Inventory first.
                </div>
              ) : (
                <div style={{
                  maxHeight: '160px',
                  overflowY: 'auto',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '8px'
                }}>
                  {filteredFlats.map((f) => {
                    const hasRental = Boolean(f.takenForRental || f.rentalDetails?.guaranteedMonthlyRent);
                    return (
                      <div
                        key={f._id || f.id}
                        onClick={() => handleSelectFlat(f)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                          background: '#ffffff',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#2563eb';
                          e.currentTarget.style.background = '#eff6ff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          e.currentTarget.style.background = '#ffffff';
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: '800', fontSize: '0.92rem', color: '#0f172a' }}>
                            {f.flatNumber}
                          </span>
                          <span style={{
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '0.68rem',
                            fontWeight: '700',
                            background: hasRental ? '#e0f2fe' : '#f1f5f9',
                            color: hasRental ? '#0369a1' : '#475569'
                          }}>
                            {f.bhkType || '2BHK'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          Floor {f.floor} {f.carpetArea ? `• ${f.carpetArea} sq.ft` : ''}
                        </div>
                        {f.currentOwner?.name && (
                          <div style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            Owner: {f.currentOwner.name}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* 2. OWNER KYC DETAILS */}
        {/* ========================================================= */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
              Owner Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Padam Kumar"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
              Owner Mobile
            </label>
            <input
              type="text"
              placeholder="e.g. 9876543210"
              value={ownerMobile}
              onChange={(e) => setOwnerMobile(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
              Owner Email
            </label>
            <input
              type="email"
              placeholder="owner@example.com"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {/* Registry Date */}
        <div>
          <label style={{ fontSize: '0.78rem', color: '#374151', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
            Registry Date (MOU / Sale Agreement Date) *
          </label>
          <input
            type="date"
            required
            value={registryDate}
            onChange={(e) => setRegistryDate(e.target.value)}
            style={{ width: '100%', fontSize: '0.85rem' }}
          />
        </div>

        {/* ========================================================= */}
        {/* 3. RENT, TDS & NET AMOUNT */}
        {/* ========================================================= */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px', alignItems: 'flex-start' }}>
            <div>
              <label style={{ fontSize: '0.78rem', color: '#374151', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                Rent Amount (Gross ₹/Month) *
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontWeight: '700', color: '#64748b' }}>
                  ₹
                </span>
                <input
                  type="number"
                  required
                  min="1000"
                  step="500"
                  value={rentAmount}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : Number(e.target.value);
                    setRentAmount(val);
                    if (tdsMode === 'percentage' && val) {
                      setTdsAmount(Math.round(val * (tdsPercentage / 100)));
                    }
                  }}
                  style={{ width: '100%', paddingLeft: '24px', fontSize: '0.9rem', fontWeight: '800', color: '#0f172a' }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '0.78rem', color: '#374151', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="checkbox"
                    id="manualApplyTds2"
                    checked={applyTds}
                    onChange={(e) => setApplyTds(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  Apply TDS Deduction
                </label>

                {applyTds && (
                  <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '6px', padding: '2px', gap: '2px' }}>
                    <button
                      type="button"
                      onClick={() => setTdsMode('percentage')}
                      style={{
                        padding: '2px 8px',
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        borderRadius: '4px',
                        border: 'none',
                        cursor: 'pointer',
                        background: tdsMode === 'percentage' ? '#2563eb' : 'transparent',
                        color: tdsMode === 'percentage' ? '#ffffff' : '#475569',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      % Percent
                    </button>
                    <button
                      type="button"
                      onClick={() => setTdsMode('amount')}
                      style={{
                        padding: '2px 8px',
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        borderRadius: '4px',
                        border: 'none',
                        cursor: 'pointer',
                        background: tdsMode === 'amount' ? '#2563eb' : 'transparent',
                        color: tdsMode === 'amount' ? '#ffffff' : '#475569',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      ₹ Amount
                    </button>
                  </div>
                )}
              </div>

              {applyTds ? (
                tdsMode === 'percentage' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={tdsPercentage}
                        onChange={(e) => {
                          const p = Number(e.target.value);
                          setTdsPercentage(p);
                          setTdsAmount(Math.round(grossRent * (p / 100)));
                        }}
                        style={{ width: '100%', fontSize: '0.85rem', fontWeight: '700', paddingRight: '22px' }}
                        placeholder="10"
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
                      - ₹{finalTdsAmount.toLocaleString('en-IN')}
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
                        value={tdsAmount}
                        onChange={(e) => {
                          const amt = Number(e.target.value);
                          setTdsAmount(amt);
                          if (grossRent > 0) {
                            setTdsPercentage(Number(((amt / grossRent) * 100).toFixed(2)));
                          }
                        }}
                        style={{ width: '100%', fontSize: '0.85rem', fontWeight: '700', paddingLeft: '22px' }}
                        placeholder="3100"
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
                      {effectiveTdsPct}% rate
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

          {/* Net Amount Highlight Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '8px',
            padding: '8px 14px'
          }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#065f46' }}>
              Net Monthly Disbursal (Gross ₹{grossRent.toLocaleString('en-IN')} - TDS ₹{finalTdsAmount.toLocaleString('en-IN')}):
            </span>
            <span style={{ fontSize: '1.05rem', fontWeight: '800', color: '#047857' }}>
              ₹{netAmount.toLocaleString('en-IN')}
              <span style={{ fontSize: '0.72rem', fontWeight: '600', color: '#059669', marginLeft: '4px' }}>/month</span>
            </span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4. TENURE & PAYMENT DATES */}
        {/* ========================================================= */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.2fr', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
              Payment Starting Date *
            </label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
              Tenure (Months) *
            </label>
            <input
              type="number"
              required
              min="1"
              max="120"
              value={tenureMonths}
              onChange={(e) => setTenureMonths(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ fontSize: '0.78rem', color: '#1e40af', fontWeight: '700' }}>
                Payment Ending Date *
              </label>
              <button
                type="button"
                onClick={() => {
                  if (startDate) {
                    const d = new Date(startDate);
                    if (!isNaN(d.getTime())) {
                      d.setMonth(d.getMonth() + Number(tenureMonths || 36));
                      setEndDate(d.toISOString().slice(0, 10));
                    }
                  }
                }}
                title="Auto-calculate ending date from Start Date + Tenure Months"
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
              value={endDate || endingDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                width: '100%',
                fontSize: '0.85rem',
                border: '1.5px solid #3b82f6',
                color: '#1e3a8a',
                fontWeight: '700'
              }}
            />
          </div>
        </div>

        {/* ========================================================= */}
        {/* 5. COMMITMENT & FINANCIAL BALANCE */}
        {/* ========================================================= */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '14px 16px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '14px'
        }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700' }}>TOTAL PAYMENT (TENURE)</span>
            <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1e3a8a', marginTop: '2px' }}>
              ₹{totalCommitment.toLocaleString('en-IN')}
            </div>
            <span style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: '600' }}>
              ₹{grossRent.toLocaleString('en-IN')} × {tenure} mos (Without TDS)
            </span>
          </div>

          <div>
            <label style={{ fontSize: '0.7rem', color: '#374151', fontWeight: '700', display: 'block', marginBottom: '2px' }}>
              TOTAL PAID (DISBURSED)
            </label>
            <input
              type="number"
              min="0"
              step="1000"
              value={totalPaid}
              onChange={(e) => setTotalPaid(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem', fontWeight: '700', color: '#15803d' }}
            />
          </div>

          <div>
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700' }}>AMOUNT OUTSTANDING</span>
            <div style={{ fontSize: '1.2rem', fontWeight: '800', color: outstandingBalance > 0 ? '#b91c1c' : '#15803d', marginTop: '2px' }}>
              ₹{outstandingBalance.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              padding: '9px 18px',
              background: '#f3f4f6',
              color: '#374151',
              border: '1px solid #dadce0',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: submitting ? 'not-allowed' : 'pointer'
            }}
          >
            Cancel
          </button>
          <LoadingButton
            type="submit"
            loading={submitting}
            loadingText="Enrolling Flat..."
            disabled={!selectedFlat}
            variant="primary"
          >
            {selectedFlat ? `Confirm Enrollment for Flat ${selectedFlat.flatNumber}` : 'Select a Flat to Continue'}
          </LoadingButton>
        </div>

      </form>
    </Modal>
  );
};

export default ManualRentalEntryModal;
