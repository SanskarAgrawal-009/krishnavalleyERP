import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  Home,
  User,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Key,
  Layers,
  Compass,
  Maximize2,
  Tag,
  ArrowRight,
  ExternalLink,
  Lock,
  Unlock,
  Percent,
  Receipt,
  History,
  RotateCcw,
  Upload,
  Pencil,
  Save,
  Check,
  RefreshCw,
  Edit3
} from 'lucide-react';
import { projectService } from '../../services/projectService.js';
import { StatusBadge } from '../common/StatusBadge.jsx';
import { RecordBuybackModal } from './RecordBuybackModal.jsx';
import { ImportOwnershipHistoryModal } from './ImportOwnershipHistoryModal.jsx';

export const FlatDetailModal = ({
  isOpen,
  onClose,
  flatId,
  initialFlat,
  onEditFlat,
  projectName,
  buildingName
}) => {
  const [flatData, setFlatData] = useState(initialFlat || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'owner' | 'rental' | 'history' | 'possession' | 'blueprints'
  const [isBuybackModalOpen, setIsBuybackModalOpen] = useState(false);
  const [isImportHistoryModalOpen, setIsImportHistoryModalOpen] = useState(false);

  // EDIT MODES & FORM STATES
  const [isEditingSpecs, setIsEditingSpecs] = useState(false);
  const [isSavingSpecs, setIsSavingSpecs] = useState(false);
  const [specsForm, setSpecsForm] = useState({});

  const [isEditingOwner, setIsEditingOwner] = useState(false);
  const [isSavingOwner, setIsSavingOwner] = useState(false);
  const [ownerForm, setOwnerForm] = useState({});

  const [isEditingSales, setIsEditingSales] = useState(false);
  const [isSavingSales, setIsSavingSales] = useState(false);
  const [salesForm, setSalesForm] = useState({});

  const [isEditingRental, setIsEditingRental] = useState(false);
  const [isSavingRental, setIsSavingRental] = useState(false);
  const [rentalForm, setRentalForm] = useState({});

  const [toastMessage, setToastMessage] = useState(null); // { type: 'success' | 'error', text: '' }

  const formatINR = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '₹0';
    return `₹${Number(val).toLocaleString('en-IN')}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  const loadFlatDetail = async () => {
    if (!flatId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await projectService.getFlatById(flatId);
      if (res.data) {
        setFlatData(res.data);
      } else {
        setError('Failed to fetch flat details');
      }
    } catch (err) {
      console.error('Error fetching flat detail:', err);
      setError(err.message || 'Error loading flat details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && flatId) {
      if (initialFlat) setFlatData(initialFlat);
      loadFlatDetail();
      setActiveTab('overview');
      setIsEditingSpecs(false);
      setIsEditingOwner(false);
      setIsEditingSales(false);
      setIsEditingRental(false);
    } else {
      setFlatData(null);
    }
  }, [isOpen, flatId]);

  // Sync Form States from Flat Data
  useEffect(() => {
    if (flatData) {
      const f = flatData;
      const o = f.owner || f.currentOwner || {};
      const s = f.salesLead || f.salesDetails || {};
      const r = f.rentalContract || f.rentalDetails || {};

      setSpecsForm({
        flatNumber: f.flatNumber || '',
        floor: f.floor !== undefined && f.floor !== null ? f.floor : 0,
        bhkType: f.bhkType || '2BHK',
        carpetArea: f.carpetArea || 950,
        superBuiltupArea: f.superBuiltupArea || 1250,
        basePrice: f.basePrice || 4500000,
        facing: f.facing || 'East',
        status: f.status || 'available',
        takenForRental: f.takenForRental || false
      });

      setOwnerForm({
        name: o.name || s.name || '',
        mobileNo: o.mobileNo || s.mobileNo || '',
        email: o.email || s.email || '',
        address: o.address || (o.ownerDetails && o.ownerDetails.permanentAddress) || '',
        panNumber: o.panNumber || o.panNo || (s.kyc && s.kyc.panNumber) || '',
        aadhaarNumber: o.aadhaarNumber || o.aadhaarNo || (s.kyc && s.kyc.aadhaarNumber) || '',
        ownershipType: (o.ownerDetails && o.ownerDetails.ownershipType) || o.ownershipType || 'individual',
        bankName: (o.bankDetails && o.bankDetails.bankName) || '',
        bankBranch: (o.bankDetails && o.bankDetails.branch) || '',
        accountNumber: (o.bankDetails && o.bankDetails.accountNo) || '',
        ifscCode: (o.bankDetails && o.bankDetails.ifsc) || ''
      });

      setSalesForm({
        agreedDealPrice: s.booking?.agreedDealPrice || s.paymentPlan?.totalAmount || s.finalPrice || f.basePrice || 4500000,
        bookingAmountPaid: s.booking?.bookingAmount || s.paymentPlan?.bookingAmount || s.totalAmountPaid || 100000,
        agreementDate: s.agreement?.agreementDate ? new Date(s.agreement.agreementDate).toISOString().slice(0, 10) : (f.salesDetails?.agreementDate ? new Date(f.salesDetails.agreementDate).toISOString().slice(0, 10) : ''),
        salesStatus: s.salesStatus || f.salesDetails?.salesStatus || 'agreement_completed',
        paymentPlanType: s.paymentPlan?.type || f.salesDetails?.paymentPlanType || '36-month rent-back linked'
      });

      setRentalForm({
        guaranteedMonthlyRent: r.rentBack?.monthlyRent || r.guaranteedMonthlyRent || 31000,
        applyTds: r.rentBack?.applyTds !== undefined ? r.rentBack.applyTds : (r.applyTds !== undefined ? r.applyTds : true),
        tdsPercentage: r.rentBack?.tdsPercentage !== undefined ? r.rentBack.tdsPercentage : (r.tdsPercentage !== undefined ? r.tdsPercentage : 10),
        tenureMonths: r.rentBack?.tenureMonths || r.tenureMonths || 36,
        dueDayOfMonth: r.rentBack?.rentDueDay || r.dueDayOfMonth || 25,
        startDate: r.rentBack?.startDate ? new Date(r.rentBack.startDate).toISOString().slice(0, 10) : (r.startDate ? new Date(r.startDate).toISOString().slice(0, 10) : ''),
        endDate: r.rentBack?.endDate ? new Date(r.rentBack.endDate).toISOString().slice(0, 10) : (r.endDate ? new Date(r.endDate).toISOString().slice(0, 10) : ''),
        prePossessionMonthlyRent: r.prePossessionMonthlyRent || 16000,
        prePossessionTenureMonths: r.prePossessionTenureMonths || 100,
        prePossessionTotalPaid: r.prePossessionTotalPaid || 2150000,
        isPossessionRenewal: r.isPossessionRenewal || f.status === 'possession_renewal'
      });
    }
  }, [flatData]);

  // SAVE HANDLERS
  const handleSaveSpecs = async (e) => {
    e?.preventDefault();
    setIsSavingSpecs(true);
    try {
      const res = await projectService.updateFlat(flatId, specsForm);
      if (res.data) {
        setFlatData(res.data);
        onEditFlat?.(res.data);
        setToastMessage({ type: 'success', text: 'Unit specifications updated successfully!' });
        setIsEditingSpecs(false);
      }
    } catch (err) {
      console.error('Error updating unit specs:', err);
      setToastMessage({ type: 'error', text: err.message || 'Failed to update unit specifications' });
    } finally {
      setIsSavingSpecs(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleSaveOwner = async (e) => {
    e?.preventDefault();
    setIsSavingOwner(true);
    try {
      const payload = {
        currentOwner: {
          name: ownerForm.name,
          mobileNo: ownerForm.mobileNo,
          email: ownerForm.email,
          address: ownerForm.address,
          panNumber: ownerForm.panNumber,
          aadhaarNumber: ownerForm.aadhaarNumber,
          ownershipType: ownerForm.ownershipType
        },
        ownerName: ownerForm.name,
        ownerMobile: ownerForm.mobileNo,
        ownerEmail: ownerForm.email,
        ownerAddress: ownerForm.address,
        ownerPan: ownerForm.panNumber,
        ownerAadhaar: ownerForm.aadhaarNumber,
        bankName: ownerForm.bankName,
        bankBranch: ownerForm.bankBranch,
        accountNo: ownerForm.accountNumber,
        ifsc: ownerForm.ifscCode
      };
      const res = await projectService.updateFlat(flatId, payload);
      if (res.data) {
        setFlatData(res.data);
        onEditFlat?.(res.data);
        setToastMessage({ type: 'success', text: 'Owner details updated successfully!' });
        setIsEditingOwner(false);
      }
    } catch (err) {
      console.error('Error updating owner details:', err);
      setToastMessage({ type: 'error', text: err.message || 'Failed to update owner details' });
    } finally {
      setIsSavingOwner(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleSaveSales = async (e) => {
    e?.preventDefault();
    setIsSavingSales(true);
    try {
      const payload = {
        salesDetails: salesForm,
        agreedDealPrice: salesForm.agreedDealPrice,
        bookingAmountPaid: salesForm.bookingAmountPaid,
        salesStatus: salesForm.salesStatus,
        agreementDate: salesForm.agreementDate,
        paymentPlanType: salesForm.paymentPlanType
      };
      const res = await projectService.updateFlat(flatId, payload);
      if (res.data) {
        setFlatData(res.data);
        onEditFlat?.(res.data);
        setToastMessage({ type: 'success', text: 'Booking & commercial terms updated successfully!' });
        setIsEditingSales(false);
      }
    } catch (err) {
      console.error('Error updating commercial terms:', err);
      setToastMessage({ type: 'error', text: err.message || 'Failed to update commercial terms' });
    } finally {
      setIsSavingSales(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleSaveRental = async (e) => {
    e?.preventDefault();
    setIsSavingRental(true);
    try {
      const payload = {
        rentalDetails: rentalForm,
        guaranteedMonthlyRent: rentalForm.guaranteedMonthlyRent,
        tenureMonths: rentalForm.tenureMonths,
        dueDayOfMonth: rentalForm.dueDayOfMonth,
        startDate: rentalForm.startDate,
        endDate: rentalForm.endDate,
        prePossessionMonthlyRent: rentalForm.prePossessionMonthlyRent,
        prePossessionTenureMonths: rentalForm.prePossessionTenureMonths,
        prePossessionTotalPaid: rentalForm.prePossessionTotalPaid,
        isPossessionRenewal: rentalForm.isPossessionRenewal,
        applyTds: rentalForm.applyTds,
        tdsPercentage: rentalForm.applyTds ? Number(rentalForm.tdsPercentage || 10) : 0
      };
      const res = await projectService.updateFlat(flatId, payload);
      if (res.data) {
        setFlatData(res.data);
        onEditFlat?.(res.data);
        setToastMessage({ type: 'success', text: 'Rental & Rent-back program details updated successfully!' });
        setIsEditingRental(false);
      }
    } catch (err) {
      console.error('Error updating rental details:', err);
      setToastMessage({ type: 'error', text: err.message || 'Failed to update rental details' });
    } finally {
      setIsSavingRental(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  if (!isOpen) return null;

  const flat = flatData || initialFlat || {};
  const owner = flat.owner || flat.currentOwner || null;
  const sales = flat.salesLead || flat.salesDetails || null;
  const rental = flat.rentalContract || flat.rentalDetails || null;
  const lockIn = flat.rentalLockIn || {};
  const isSold = (flat.status || '').toLowerCase() === 'sold' || (flat.status || '').toLowerCase() === 'leased' || (flat.status || '').toLowerCase() === 'resell' || (flat.status || '').toLowerCase() === 'buy_back' || (flat.status || '').toLowerCase() === 'possession_renewal' || flat.takenForRental || !!sales || !!owner || !!rental;

  const inputStyle = {
    width: '100%',
    padding: '7px 10px',
    borderRadius: '6px',
    border: '1.5px solid #cbd5e1',
    fontSize: '0.82rem',
    color: '#0f172a',
    background: '#ffffff',
    boxSizing: 'border-box',
    outline: 'none'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.72rem',
    fontWeight: '700',
    color: '#475569',
    marginBottom: '3px',
    textTransform: 'uppercase',
    letterSpacing: '0.02em'
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1050,
      padding: '16px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '860px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        animation: 'modalSlideIn 0.2s ease-out'
      }}>
        {/* MODAL HEADER */}
        <div style={{
          padding: '18px 24px',
          background: 'linear-gradient(135deg, #1e293b, #0f172a)',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #334155'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#60a5fa'
            }}>
              <Home size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '1.35rem', fontWeight: '800', margin: 0, letterSpacing: '-0.02em' }}>
                  Flat {flat.flatNumber || 'Loading...'}
                </h3>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: isSold ? '#1e3a8a' : '#14532d',
                  color: isSold ? '#93c5fd' : '#86efac',
                  border: isSold ? '1px solid #3b82f6' : '1px solid #22c55e',
                  textTransform: 'uppercase'
                }}>
                  {flat.status ? flat.status.replace(/_/g, ' ') : (isSold ? 'SOLD' : 'AVAILABLE')}
                </span>
                {(flat.takenForRental || isSold) && (
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: '#581c87',
                    color: '#e9d5ff',
                    border: '1px solid #a855f7'
                  }}>
                    3-YR RENTAL PROGRAM
                  </span>
                )}
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{projectName || flat.projectId?.projectName || 'Project'}</span>
                <span>•</span>
                <span>{buildingName || flat.buildingName || 'Tower A'}</span>
                <span>•</span>
                <span>{flat.floor === 0 ? 'Ground Floor' : `Floor ${flat.floor || 1}`}</span>
                <span>•</span>
                <span>{flat.bhkType || '2BHK'} ({flat.carpetArea || 950} sq.ft)</span>
              </p>
            </div>
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
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = '#ffffff')}
            onMouseOut={(e) => (e.currentTarget.style.color = '#94a3b8')}
          >
            <X size={20} />
          </button>
        </div>

        {/* TOAST ALERT NOTIFICATION */}
        {toastMessage && (
          <div style={{
            padding: '10px 24px',
            background: toastMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
            borderBottom: `1px solid ${toastMessage.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            color: toastMessage.type === 'success' ? '#065f46' : '#991b1b',
            fontSize: '0.84rem',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.2s ease-in-out'
          }}>
            {toastMessage.type === 'success' ? <CheckCircle2 size={16} color="#059669" /> : <AlertCircle size={16} color="#dc2626" />}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* TAB NAVIGATION HEADER */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc',
          padding: '0 16px',
          gap: '4px',
          overflowX: 'auto'
        }}>
          {[
            { id: 'overview', label: 'Unit Specifications', icon: Layers },
            { id: 'owner', label: 'Owner & Purchase Dossier', icon: User },
            { id: 'rental', label: 'Rent-Back Program & Yields', icon: DollarSign },
            { id: 'possession', label: 'Possession & Lock-in', icon: Key },
            { id: 'history', label: 'Ownership History & Resale', icon: History }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '12px 14px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: isActive ? '3px solid #2563eb' : '3px solid transparent',
                  color: isActive ? '#2563eb' : '#64748b',
                  fontWeight: isActive ? '700' : '600',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
              <div className="spin" style={{ display: 'inline-block', marginBottom: '8px' }}>
                <Clock size={28} color="#1a73e8" />
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>Loading unit specifications & records...</p>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#dc2626' }}>
              <AlertCircle size={32} style={{ margin: '0 auto 8px' }} />
              <p style={{ margin: 0, fontWeight: '600' }}>{error}</p>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW & UNIT SPECIFICATIONS */}
              {activeTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {/* Key Stats Row */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                    gap: '12px'
                  }}>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Floor Level</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
                        {flat.floor === 0 ? 'Ground Floor' : `Floor ${flat.floor || 1}`}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>{buildingName || flat.buildingName || 'Tower A'}</div>
                    </div>

                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Configuration</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
                        {flat.bhkType || '2BHK'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>Facing: {flat.facing || 'East'}</div>
                    </div>

                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Carpet Area</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
                        {flat.carpetArea || 950} <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>sq.ft</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>RERA carpet standard</div>
                    </div>

                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Base Inventory Price</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#16a34a', marginTop: '4px' }}>
                        {formatINR(flat.basePrice)}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>Excl. statutory taxes</div>
                    </div>
                  </div>

                  {/* Architecture & Specs Card (View / Edit) */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Layers size={16} color="#1a73e8" /> Unit Specifications &amp; Architectural Setup
                      </h4>
                      <button
                        type="button"
                        onClick={() => setIsEditingSpecs(!isEditingSpecs)}
                        style={{
                          padding: '6px 12px',
                          background: isEditingSpecs ? '#f1f5f9' : '#eff6ff',
                          color: isEditingSpecs ? '#475569' : '#2563eb',
                          border: `1px solid ${isEditingSpecs ? '#cbd5e1' : '#bfdbfe'}`,
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        {isEditingSpecs ? <RotateCcw size={13} /> : <Pencil size={13} />}
                        {isEditingSpecs ? 'Cancel Edit' : 'Edit Unit Specifications'}
                      </button>
                    </div>

                    {isEditingSpecs ? (
                      <form onSubmit={handleSaveSpecs} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                          <div>
                            <label style={labelStyle}>Flat / Unit Number *</label>
                            <input
                              type="text"
                              style={inputStyle}
                              value={specsForm.flatNumber}
                              onChange={(e) => setSpecsForm({ ...specsForm, flatNumber: e.target.value })}
                              required
                            />
                          </div>

                          <div>
                            <label style={labelStyle}>Floor Level (0 = Ground Floor) *</label>
                            <input
                              type="number"
                              style={inputStyle}
                              value={specsForm.floor}
                              onChange={(e) => setSpecsForm({ ...specsForm, floor: e.target.value })}
                              required
                            />
                          </div>

                          <div>
                            <label style={labelStyle}>BHK Configuration</label>
                            <select
                              style={inputStyle}
                              value={specsForm.bhkType}
                              onChange={(e) => setSpecsForm({ ...specsForm, bhkType: e.target.value })}
                            >
                              <option value="1BHK">1BHK</option>
                              <option value="2BHK">2BHK</option>
                              <option value="3BHK">3BHK</option>
                              <option value="4BHK">4BHK</option>
                              <option value="Studio">Studio</option>
                              <option value="Service Apartment">Service Apartment</option>
                              <option value="Penthouse">Penthouse</option>
                              <option value="Duplex">Duplex</option>
                              <option value="Villa">Villa</option>
                            </select>
                          </div>

                          <div>
                            <label style={labelStyle}>Direction / Facing</label>
                            <select
                              style={inputStyle}
                              value={specsForm.facing}
                              onChange={(e) => setSpecsForm({ ...specsForm, facing: e.target.value })}
                            >
                              <option value="East">East (Vastu Compliant)</option>
                              <option value="North">North (Vastu Compliant)</option>
                              <option value="North-East">North-East (Ishanya)</option>
                              <option value="West">West</option>
                              <option value="South">South</option>
                              <option value="South-East">South-East (Agneya)</option>
                              <option value="North-West">North-West (Vayavya)</option>
                              <option value="South-West">South-West (Nairutya)</option>
                            </select>
                          </div>

                          <div>
                            <label style={labelStyle}>Carpet Area (sq.ft)</label>
                            <input
                              type="number"
                              style={inputStyle}
                              value={specsForm.carpetArea}
                              onChange={(e) => setSpecsForm({ ...specsForm, carpetArea: e.target.value })}
                            />
                          </div>

                          <div>
                            <label style={labelStyle}>Super Builtup Area (sq.ft)</label>
                            <input
                              type="number"
                              style={inputStyle}
                              value={specsForm.superBuiltupArea}
                              onChange={(e) => setSpecsForm({ ...specsForm, superBuiltupArea: e.target.value })}
                            />
                          </div>

                          <div>
                            <label style={labelStyle}>Base Inventory Price (₹)</label>
                            <input
                              type="number"
                              style={inputStyle}
                              value={specsForm.basePrice}
                              onChange={(e) => setSpecsForm({ ...specsForm, basePrice: e.target.value })}
                            />
                          </div>

                          <div>
                            <label style={labelStyle}>Flat Inventory Status</label>
                            <select
                              style={inputStyle}
                              value={specsForm.status}
                              onChange={(e) => setSpecsForm({ ...specsForm, status: e.target.value })}
                            >
                              <option value="available">Available</option>
                              <option value="sold">Sold</option>
                              <option value="resell">Resell</option>
                              <option value="buy_back">Buy Back</option>
                              <option value="possession_renewal">Possession Renewal</option>
                              <option value="hold">Hold / Reserved</option>
                              <option value="leased">Leased</option>
                              <option value="under_maintenance">Under Maintenance</option>
                              <option value="blocked">Blocked</option>
                            </select>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                          <input
                            type="checkbox"
                            id="specsTakenForRental"
                            checked={specsForm.takenForRental}
                            onChange={(e) => setSpecsForm({ ...specsForm, takenForRental: e.target.checked })}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                          <label htmlFor="specsTakenForRental" style={{ fontSize: '0.82rem', fontWeight: '700', color: '#1e293b', cursor: 'pointer', margin: 0 }}>
                            Enroll unit in 3-Year Guaranteed Rent-Back Program
                          </label>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                          <button
                            type="button"
                            onClick={() => setIsEditingSpecs(false)}
                            style={{
                              padding: '7px 14px',
                              background: '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              color: '#475569',
                              cursor: 'pointer'
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSavingSpecs}
                            style={{
                              padding: '7px 18px',
                              background: '#2563eb',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: '700',
                              color: '#ffffff',
                              cursor: isSavingSpecs ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            {isSavingSpecs ? <Clock size={14} className="spin" /> : <Save size={14} />}
                            {isSavingSpecs ? 'Saving Specs...' : 'Save Unit Specifications'}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', fontSize: '0.82rem' }}>
                        <div>
                          <span style={{ color: '#64748b' }}>Project Name:</span>
                          <div style={{ fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                            {flat.projectId?.projectName || projectName || 'Krishna Valley Development'}
                          </div>
                        </div>

                        <div>
                          <span style={{ color: '#64748b' }}>Tower / Building:</span>
                          <div style={{ fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                            {flat.buildingName || buildingName || 'Tower A'} {flat.buildingCode ? `(${flat.buildingCode})` : ''}
                          </div>
                        </div>

                        <div>
                          <span style={{ color: '#64748b' }}>Unit Number:</span>
                          <div style={{ fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                            Flat {flat.flatNumber}
                          </div>
                        </div>

                        <div>
                          <span style={{ color: '#64748b' }}>Direction / Facing:</span>
                          <div style={{ fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                            {flat.facing || 'East'} Facing (Vastu Compliant)
                          </div>
                        </div>

                        <div>
                          <span style={{ color: '#64748b' }}>Inventory Status:</span>
                          <div style={{ marginTop: '2px' }}>
                            <StatusBadge status={flat.status} />
                          </div>
                        </div>

                        <div>
                          <span style={{ color: '#64748b' }}>Rental Program Status:</span>
                          <div style={{ fontWeight: '700', color: flat.takenForRental ? '#7e22ce' : '#64748b', marginTop: '2px' }}>
                            {flat.takenForRental ? 'Enrolled (3-Year Rent-Back)' : 'Not Enrolled in Rental'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* PRE-POSSESSION VS POST-POSSESSION RENEWAL DOSSIER */}
                  {((flat.status || '').toLowerCase() === 'possession_renewal' || flat.rentalDetails?.isPossessionRenewal || (flat.ownershipHistory || []).some(h => h.transferReason === 'possession_renewal')) && (() => {
                    const renewalHistory = (flat.ownershipHistory || []).find(h => h.transferReason === 'possession_renewal');
                    const preRent = flat.rentalDetails?.prePossessionMonthlyRent || (renewalHistory?.transferDealValue ? Math.round(renewalHistory.transferDealValue / 100) : 16000);
                    const preTenure = flat.rentalDetails?.prePossessionTenureMonths || 100;
                    const prePaid = flat.rentalDetails?.prePossessionTotalPaid || renewalHistory?.transferDealValue || 2150000;
                    const curRent = rental?.rentBack?.monthlyRent || flat.rentalDetails?.guaranteedMonthlyRent || 11000;
                    const curNet = curRent > 0 ? (curRent * 0.9) : 9900;

                    return (
                      <div style={{
                        background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
                        border: '1.5px solid #a7f3d0',
                        borderRadius: '12px',
                        padding: '16px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: '#065f46', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <RefreshCw size={18} color="#059669" /> Post-Possession Renewal &amp; Pre-Possession Yield Dossier
                          </h4>
                          <span style={{
                            background: '#059669',
                            color: '#ffffff',
                            fontSize: '0.72rem',
                            fontWeight: '800',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            letterSpacing: '0.02em'
                          }}>
                            POSSESSION RENEWAL
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                          <div style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                            <div style={{ fontSize: '0.72rem', color: '#047857', fontWeight: '700' }}>Initial Pre-Possession Rent</div>
                            <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                              {formatINR(preRent)} <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>/ mo</span>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#059669', marginTop: '2px' }}>{preTenure}-Month Initial Term</div>
                          </div>

                          <div style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                            <div style={{ fontSize: '0.72rem', color: '#047857', fontWeight: '700' }}>Total Rent Paid So Far</div>
                            <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#16a34a', marginTop: '2px' }}>
                              {formatINR(prePaid)}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#15803d', marginTop: '2px' }}>Disbursed to Owner</div>
                          </div>

                          <div style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                            <div style={{ fontSize: '0.72rem', color: '#047857', fontWeight: '700' }}>Active Post-Possession Rate</div>
                            <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#7c3aed', marginTop: '2px' }}>
                              {formatINR(curRent)} <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>/ mo</span>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#6b21a8', marginTop: '2px' }}>Net: {formatINR(curNet)} (after TDS)</div>
                          </div>
                        </div>

                        {renewalHistory?.remarks && (
                          <div style={{ fontSize: '0.76rem', color: '#064e3b', fontStyle: 'italic', background: 'rgba(255,255,255,0.6)', padding: '6px 10px', borderRadius: '6px' }}>
                            {renewalHistory.remarks}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* TAB 2: OWNER & PURCHASE DOSSIER */}
              {activeTab === 'owner' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {/* Sold / Ownership Status Banner */}
                  <div style={{
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    borderRadius: '10px',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <CheckCircle2 size={20} color="#059669" />
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#065f46' }}>
                          Registered Property Owner Dossier
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#047857' }}>
                          Purchased / Allotted on {formatDate(sales?.booking?.bookingDate || sales?.agreementDate || sales?.convertedAt || flat.updatedAt)}
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#065f46' }}>
                      Sales Status: <span style={{ textTransform: 'uppercase' }}>{(sales?.salesStatus || flat.salesDetails?.salesStatus || 'Allotted & Agreement Signed').replace(/_/g, ' ')}</span>
                    </div>
                  </div>

                  {/* Owner Profile Card (View / Edit) */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <User size={16} color="#1a73e8" /> Registered Property Owner Profile
                      </h4>
                      <button
                        type="button"
                        onClick={() => setIsEditingOwner(!isEditingOwner)}
                        style={{
                          padding: '6px 12px',
                          background: isEditingOwner ? '#f1f5f9' : '#eff6ff',
                          color: isEditingOwner ? '#475569' : '#2563eb',
                          border: `1px solid ${isEditingOwner ? '#cbd5e1' : '#bfdbfe'}`,
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        {isEditingOwner ? <RotateCcw size={13} /> : <Pencil size={13} />}
                        {isEditingOwner ? 'Cancel Edit' : 'Edit Owner Details'}
                      </button>
                    </div>

                    {isEditingOwner ? (
                      <form onSubmit={handleSaveOwner} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                          <div>
                            <label style={labelStyle}>Owner Full Name *</label>
                            <input
                              type="text"
                              style={inputStyle}
                              value={ownerForm.name}
                              onChange={(e) => setOwnerForm({ ...ownerForm, name: e.target.value })}
                              required
                            />
                          </div>

                          <div>
                            <label style={labelStyle}>Mobile Number *</label>
                            <input
                              type="text"
                              style={inputStyle}
                              value={ownerForm.mobileNo}
                              onChange={(e) => setOwnerForm({ ...ownerForm, mobileNo: e.target.value })}
                              required
                            />
                          </div>

                          <div>
                            <label style={labelStyle}>Email Address</label>
                            <input
                              type="email"
                              style={inputStyle}
                              value={ownerForm.email}
                              onChange={(e) => setOwnerForm({ ...ownerForm, email: e.target.value })}
                            />
                          </div>

                          <div>
                            <label style={labelStyle}>Ownership Type</label>
                            <select
                              style={inputStyle}
                              value={ownerForm.ownershipType}
                              onChange={(e) => setOwnerForm({ ...ownerForm, ownershipType: e.target.value })}
                            >
                              <option value="individual">Individual</option>
                              <option value="joint">Joint Ownership</option>
                              <option value="corporate">Corporate / Company</option>
                            </select>
                          </div>

                          <div>
                            <label style={labelStyle}>PAN Card Number</label>
                            <input
                              type="text"
                              style={inputStyle}
                              value={ownerForm.panNumber}
                              onChange={(e) => setOwnerForm({ ...ownerForm, panNumber: e.target.value.toUpperCase() })}
                              placeholder="e.g. ABCDE1234F"
                            />
                          </div>

                          <div>
                            <label style={labelStyle}>Aadhaar Card Number</label>
                            <input
                              type="text"
                              style={inputStyle}
                              value={ownerForm.aadhaarNumber}
                              onChange={(e) => setOwnerForm({ ...ownerForm, aadhaarNumber: e.target.value })}
                              placeholder="e.g. 1234 5678 9012"
                            />
                          </div>

                          <div style={{ gridColumn: 'span 2' }}>
                            <label style={labelStyle}>Permanent Address</label>
                            <input
                              type="text"
                              style={inputStyle}
                              value={ownerForm.address}
                              onChange={(e) => setOwnerForm({ ...ownerForm, address: e.target.value })}
                              placeholder="Full postal address"
                            />
                          </div>
                        </div>

                        {/* Bank Account Section for Rental Disbursements */}
                        <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '4px' }}>
                          <h5 style={{ margin: '0 0 10px', fontSize: '0.82rem', fontWeight: '800', color: '#1e293b' }}>
                            🏦 Bank Account Details (For Monthly Rent Disbursements)
                          </h5>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                            <div>
                              <label style={labelStyle}>Bank Name</label>
                              <input
                                type="text"
                                style={inputStyle}
                                value={ownerForm.bankName}
                                onChange={(e) => setOwnerForm({ ...ownerForm, bankName: e.target.value })}
                                placeholder="e.g. State Bank of India"
                              />
                            </div>
                            <div>
                              <label style={labelStyle}>Branch</label>
                              <input
                                type="text"
                                style={inputStyle}
                                value={ownerForm.bankBranch}
                                onChange={(e) => setOwnerForm({ ...ownerForm, bankBranch: e.target.value })}
                                placeholder="e.g. Mathura Main Branch"
                              />
                            </div>
                            <div>
                              <label style={labelStyle}>Account Number</label>
                              <input
                                type="text"
                                style={inputStyle}
                                value={ownerForm.accountNumber}
                                onChange={(e) => setOwnerForm({ ...ownerForm, accountNumber: e.target.value })}
                                placeholder="e.g. 123456789012"
                              />
                            </div>
                            <div>
                              <label style={labelStyle}>IFSC Code</label>
                              <input
                                type="text"
                                style={inputStyle}
                                value={ownerForm.ifscCode}
                                onChange={(e) => setOwnerForm({ ...ownerForm, ifscCode: e.target.value.toUpperCase() })}
                                placeholder="e.g. SBIN0001234"
                              />
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                          <button
                            type="button"
                            onClick={() => setIsEditingOwner(false)}
                            style={{
                              padding: '7px 14px',
                              background: '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              color: '#475569',
                              cursor: 'pointer'
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSavingOwner}
                            style={{
                              padding: '7px 18px',
                              background: '#2563eb',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: '700',
                              color: '#ffffff',
                              cursor: isSavingOwner ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            {isSavingOwner ? <Clock size={14} className="spin" /> : <Save size={14} />}
                            {isSavingOwner ? 'Saving Owner...' : 'Save Owner Details'}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', fontSize: '0.84rem' }}>
                        <div>
                          <span style={{ color: '#64748b' }}>Owner Full Name:</span>
                          <div style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                            {owner?.name || sales?.name || 'Registered Property Owner'}
                          </div>
                        </div>

                        <div>
                          <span style={{ color: '#64748b' }}>Mobile Number:</span>
                          <div style={{ fontWeight: '700', color: '#0f172a', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Phone size={14} color="#16a34a" />
                            <a href={`tel:${owner?.mobileNo || sales?.mobileNo}`} style={{ color: '#1a73e8', textDecoration: 'none' }}>
                              {owner?.mobileNo || sales?.mobileNo || 'On File'}
                            </a>
                          </div>
                        </div>

                        <div>
                          <span style={{ color: '#64748b' }}>Email Address:</span>
                          <div style={{ fontWeight: '600', color: '#0f172a', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Mail size={14} color="#64748b" />
                            <span>{owner?.email || sales?.email || 'owner@krishnavalley.com'}</span>
                          </div>
                        </div>

                        <div>
                          <span style={{ color: '#64748b' }}>Ownership Type:</span>
                          <div style={{ fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                            {owner?.ownerDetails?.ownershipType ? `${owner.ownerDetails.ownershipType.toUpperCase()} (100%)` : (owner?.ownershipType ? `${owner.ownershipType.toUpperCase()} (100%)` : 'Individual (100%)')}
                          </div>
                        </div>

                        <div>
                          <span style={{ color: '#64748b' }}>PAN Number:</span>
                          <div style={{ fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                            {owner?.panNumber || owner?.panNo || sales?.kyc?.panNumber || 'On Record'}
                          </div>
                        </div>

                        <div>
                          <span style={{ color: '#64748b' }}>Aadhaar Number:</span>
                          <div style={{ fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                            {owner?.aadhaarNumber || owner?.aadhaarNo || sales?.kyc?.aadhaarNumber ? `XXXX-XXXX-${String(owner?.aadhaarNumber || owner?.aadhaarNo || sales?.kyc?.aadhaarNumber).slice(-4)}` : 'Verified on Record'}
                          </div>
                        </div>

                        <div style={{ gridColumn: 'span 2' }}>
                          <span style={{ color: '#64748b' }}>Permanent Address:</span>
                          <div style={{ fontWeight: '600', color: '#0f172a', marginTop: '2px' }}>
                            {owner?.address || owner?.ownerDetails?.permanentAddress || 'On File with Krishna Valley Registry'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Financial Deal & Booking Details (View / Edit) */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Receipt size={16} color="#1a73e8" /> Booking &amp; Commercial Terms
                      </h4>
                      <button
                        type="button"
                        onClick={() => setIsEditingSales(!isEditingSales)}
                        style={{
                          padding: '6px 12px',
                          background: isEditingSales ? '#f1f5f9' : '#eff6ff',
                          color: isEditingSales ? '#475569' : '#2563eb',
                          border: `1px solid ${isEditingSales ? '#cbd5e1' : '#bfdbfe'}`,
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        {isEditingSales ? <RotateCcw size={13} /> : <Pencil size={13} />}
                        {isEditingSales ? 'Cancel Edit' : 'Edit Sales & Pricing'}
                      </button>
                    </div>

                    {isEditingSales ? (
                      <form onSubmit={handleSaveSales} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                          <div>
                            <label style={labelStyle}>Agreed Deal Value (₹) *</label>
                            <input
                              type="number"
                              style={inputStyle}
                              value={salesForm.agreedDealPrice}
                              onChange={(e) => setSalesForm({ ...salesForm, agreedDealPrice: e.target.value })}
                              required
                            />
                          </div>

                          <div>
                            <label style={labelStyle}>Booking Amount Paid (₹)</label>
                            <input
                              type="number"
                              style={inputStyle}
                              value={salesForm.bookingAmountPaid}
                              onChange={(e) => setSalesForm({ ...salesForm, bookingAmountPaid: e.target.value })}
                            />
                          </div>

                          <div>
                            <label style={labelStyle}>Agreement Date</label>
                            <input
                              type="date"
                              style={inputStyle}
                              value={salesForm.agreementDate}
                              onChange={(e) => setSalesForm({ ...salesForm, agreementDate: e.target.value })}
                            />
                          </div>

                          <div>
                            <label style={labelStyle}>Sales Status</label>
                            <select
                              style={inputStyle}
                              value={salesForm.salesStatus}
                              onChange={(e) => setSalesForm({ ...salesForm, salesStatus: e.target.value })}
                            >
                              <option value="agreement_completed">Agreement Completed (BBA Signed)</option>
                              <option value="booked">Booked</option>
                              <option value="payment_in_progress">Payment In Progress</option>
                              <option value="fully_paid">Fully Paid</option>
                              <option value="possession_completed">Possession Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </div>

                          <div>
                            <label style={labelStyle}>Payment Plan Structure</label>
                            <input
                              type="text"
                              style={inputStyle}
                              value={salesForm.paymentPlanType}
                              onChange={(e) => setSalesForm({ ...salesForm, paymentPlanType: e.target.value })}
                              placeholder="e.g. 36-Month Rent-Back Linked"
                            />
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                          <button
                            type="button"
                            onClick={() => setIsEditingSales(false)}
                            style={{
                              padding: '7px 14px',
                              background: '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              color: '#475569',
                              cursor: 'pointer'
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSavingSales}
                            style={{
                              padding: '7px 18px',
                              background: '#2563eb',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: '700',
                              color: '#ffffff',
                              cursor: isSavingSales ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            {isSavingSales ? <Clock size={14} className="spin" /> : <Save size={14} />}
                            {isSavingSales ? 'Saving Sales...' : 'Save Commercial Terms'}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', fontSize: '0.84rem' }}>
                        <div>
                          <span style={{ color: '#64748b' }}>Agreed Deal Value:</span>
                          <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#16a34a', marginTop: '2px' }}>
                            {formatINR(sales?.booking?.agreedDealPrice || sales?.paymentPlan?.totalAmount || sales?.finalPrice || flat.basePrice)}
                          </div>
                        </div>

                        <div>
                          <span style={{ color: '#64748b' }}>Booking Advance / Payments Paid:</span>
                          <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                            {formatINR(sales?.booking?.bookingAmount || sales?.paymentPlan?.bookingAmount || sales?.totalAmountPaid || 100000)}
                          </div>
                        </div>

                        <div>
                          <span style={{ color: '#64748b' }}>Payment Plan Structure:</span>
                          <div style={{ fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                            {sales?.paymentPlan?.type?.toUpperCase() || flat.salesDetails?.paymentPlanType?.toUpperCase() || '36-MONTH RENT-BACK LINKED'}
                          </div>
                        </div>

                        <div>
                          <span style={{ color: '#64748b' }}>Sale Agreement (BBA):</span>
                          <div style={{ fontWeight: '700', color: '#16a34a', marginTop: '2px' }}>
                            {sales?.agreement?.agreementNumber ? `Signed (${sales.agreement.agreementNumber})` : 'Confirmed BBA Allotment Signed'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: COMPANY GUARANTEED RENT-BACK PROGRAM */}
              {activeTab === 'rental' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {/* Company Guaranteed Rent-Back Policy Highlight Box */}
                  <div style={{
                    background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
                    border: '1px solid #ddd6fe',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b21a8', fontWeight: '800', fontSize: '0.95rem' }}>
                        <ShieldCheck size={20} />
                        <span>Company Guaranteed Rent-Back Program (36-Month Lock-in)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsEditingRental(!isEditingRental)}
                        style={{
                          padding: '6px 12px',
                          background: isEditingRental ? '#ffffff' : '#7c3aed',
                          color: isEditingRental ? '#7c3aed' : '#ffffff',
                          border: `1px solid ${isEditingRental ? '#ddd6fe' : '#6d28d9'}`,
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        {isEditingRental ? <RotateCcw size={13} /> : <Pencil size={13} />}
                        {isEditingRental ? 'Cancel Edit' : 'Edit Rent-Back Details'}
                      </button>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#581c87', lineHeight: '1.45' }}>
                      Under Krishna Valley covenants, the monthly rent is directly disbursed by <strong>Krishna Valley Developer / Treasury</strong> to the property owner. <strong>No tenant collections are involved</strong> for these investor units—all payouts are guaranteed and funded directly by the company.
                    </p>
                  </div>

                  {isEditingRental ? (
                    <form onSubmit={handleSaveRental} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <h5 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '800', color: '#0f172a' }}>
                        Edit Monthly Guaranteed Rent &amp; Disbursement Schedule
                      </h5>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                        <div>
                          <label style={labelStyle}>Gross Monthly Rent (₹) *</label>
                          <input
                            type="number"
                            style={inputStyle}
                            value={rentalForm.guaranteedMonthlyRent}
                            onChange={(e) => setRentalForm({ ...rentalForm, guaranteedMonthlyRent: e.target.value })}
                            required
                          />
                        </div>

                        <div>
                          <label style={labelStyle}>Monthly Payout Due Day *</label>
                          <input
                            type="number"
                            min="1"
                            max="31"
                            style={inputStyle}
                            value={rentalForm.dueDayOfMonth}
                            onChange={(e) => setRentalForm({ ...rentalForm, dueDayOfMonth: e.target.value })}
                            placeholder="e.g. 25"
                            required
                          />
                        </div>

                        <div>
                          <label style={labelStyle}>Tenure (Months) *</label>
                          <input
                            type="number"
                            style={inputStyle}
                            value={rentalForm.tenureMonths}
                            onChange={(e) => setRentalForm({ ...rentalForm, tenureMonths: e.target.value })}
                            required
                          />
                        </div>

                        <div>
                          <label style={labelStyle}>Rental Start Date</label>
                          <input
                            type="date"
                            style={inputStyle}
                            value={rentalForm.startDate}
                            onChange={(e) => setRentalForm({ ...rentalForm, startDate: e.target.value })}
                          />
                        </div>

                        <div>
                          <label style={labelStyle}>Rental End Date</label>
                          <input
                            type="date"
                            style={inputStyle}
                            value={rentalForm.endDate}
                            onChange={(e) => setRentalForm({ ...rentalForm, endDate: e.target.value })}
                          />
                        </div>

                        <div>
                          <label style={labelStyle}>Pre-Possession Rent (₹ / mo)</label>
                          <input
                            type="number"
                            style={inputStyle}
                            value={rentalForm.prePossessionMonthlyRent}
                            onChange={(e) => setRentalForm({ ...rentalForm, prePossessionMonthlyRent: e.target.value })}
                          />
                        </div>

                        <div>
                          <label style={labelStyle}>Pre-Possession Total Paid (₹)</label>
                          <input
                            type="number"
                            style={inputStyle}
                            value={rentalForm.prePossessionTotalPaid}
                            onChange={(e) => setRentalForm({ ...rentalForm, prePossessionTotalPaid: e.target.value })}
                          />
                        </div>

                        <div>
                          <label style={labelStyle}>Pre-Possession Tenure (Mo)</label>
                          <input
                            type="number"
                            style={inputStyle}
                            value={rentalForm.prePossessionTenureMonths}
                            onChange={(e) => setRentalForm({ ...rentalForm, prePossessionTenureMonths: e.target.value })}
                          />
                        </div>
                      </div>

                      {/* Optional TDS Deduction Controls */}
                      <div style={{
                        background: rentalForm.applyTds ? '#f5f3ff' : '#f8fafc',
                        border: `1.5px solid ${rentalForm.applyTds ? '#ddd6fe' : '#e2e8f0'}`,
                        borderRadius: '8px',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                              type="checkbox"
                              id="modalApplyTds"
                              checked={rentalForm.applyTds}
                              onChange={(e) => setRentalForm({ ...rentalForm, applyTds: e.target.checked })}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            <label htmlFor="modalApplyTds" style={{ fontSize: '0.84rem', fontWeight: '800', color: '#1e293b', cursor: 'pointer', margin: 0 }}>
                              Apply Statutory TDS Deduction (Section 194I)
                            </label>
                          </div>

                          {rentalForm.applyTds && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <label style={{ fontSize: '0.74rem', fontWeight: '700', color: '#6b21a8' }}>TDS RATE (%):</label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                style={{ ...inputStyle, width: '80px', padding: '4px 8px', fontWeight: '800', color: '#6b21a8', textAlign: 'center' }}
                                value={rentalForm.tdsPercentage}
                                onChange={(e) => setRentalForm({ ...rentalForm, tdsPercentage: e.target.value })}
                              />
                            </div>
                          )}
                        </div>

                        {/* Live calculation breakdown */}
                        {(() => {
                          const gRent = Number(rentalForm.guaranteedMonthlyRent || 0);
                          const isTds = Boolean(rentalForm.applyTds);
                          const tRate = isTds ? (Number(rentalForm.tdsPercentage || 10) / 100) : 0;
                          const tAmt = Math.round(gRent * tRate);
                          const nRent = gRent - tAmt;

                          return (
                            <div style={{ fontSize: '0.76rem', color: isTds ? '#581c87' : '#475569', display: 'flex', gap: '14px', flexWrap: 'wrap', borderTop: '1px dashed #cbd5e1', paddingTop: '6px' }}>
                              <span>Gross: <strong>{formatINR(gRent)}</strong></span>
                              <span>TDS Deduction: <strong style={{ color: isTds ? '#ef4444' : '#059669' }}>{isTds ? `- ${formatINR(tAmt)} (${rentalForm.tdsPercentage || 10}%)` : '₹0 (0% TDS / Exempt)'}</strong></span>
                              <span>Net Payout to Owner: <strong style={{ color: '#16a34a' }}>{formatINR(nRent)} / mo</strong></span>
                            </div>
                          );
                        })()}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <input
                          type="checkbox"
                          id="isPossessionRenewal"
                          checked={rentalForm.isPossessionRenewal}
                          onChange={(e) => setRentalForm({ ...rentalForm, isPossessionRenewal: e.target.checked })}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <label htmlFor="isPossessionRenewal" style={{ fontSize: '0.82rem', fontWeight: '700', color: '#1e293b', cursor: 'pointer', margin: 0 }}>
                          Mark as Possession Renewal Unit (Post-Possession Adjusted Rate)
                        </label>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                        <button
                          type="button"
                          onClick={() => setIsEditingRental(false)}
                          style={{
                            padding: '7px 14px',
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            color: '#475569',
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSavingRental}
                          style={{
                            padding: '7px 18px',
                            background: '#7c3aed',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: '700',
                            color: '#ffffff',
                            cursor: isSavingRental ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          {isSavingRental ? <Clock size={14} className="spin" /> : <Save size={14} />}
                          {isSavingRental ? 'Saving Rent-Back...' : 'Save Rent-Back Details'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                      {/* 1. Company Rent-Back Yield Payout Side */}
                      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderBottom: '1px solid #f1f5f9',
                          paddingBottom: '10px',
                          marginBottom: '12px'
                        }}>
                          <h5 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <DollarSign size={16} color="#7c3aed" /> Assured Rent Disbursement
                          </h5>
                          <span style={{
                            fontSize: '0.72rem',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: '#f3e8ff',
                            color: '#7c3aed',
                            fontWeight: '700'
                          }}>
                            Company Payout Active
                          </span>
                        </div>

                        {(() => {
                          const grossMonthly = rental?.rentBack?.monthlyRent || flat.rentalDetails?.guaranteedMonthlyRent || (flat.basePrice ? Math.round(flat.basePrice * 0.006) : 31000);
                          const isTds = rental?.rentBack?.applyTds !== undefined ? rental.rentBack.applyTds : (flat.rentalDetails?.applyTds !== false);
                          const tdsPercent = isTds ? (rental?.rentBack?.tdsPercentage !== undefined ? rental.rentBack.tdsPercentage : (flat.rentalDetails?.tdsPercentage !== undefined ? flat.rentalDetails.tdsPercentage : 10)) : 0;
                          const tdsAmount = Math.round(grossMonthly * (tdsPercent / 100));
                          const netMonthly = grossMonthly - tdsAmount;
                          const tenureMo = rental?.rentBack?.tenureMonths || flat.rentalDetails?.tenureMonths || 36;
                          const totalTenureCommitment = flat.rentalDetails?.total36MonthCommitment || (netMonthly * tenureMo);

                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.82rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#64748b' }}>Gross Guaranteed Rent:</span>
                                <strong style={{ color: '#7c3aed', fontSize: '1rem' }}>
                                  {formatINR(grossMonthly)} / mo
                                </strong>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#64748b' }}>TDS Deduction:</span>
                                <strong style={{ color: isTds && tdsAmount > 0 ? '#ef4444' : '#059669' }}>
                                  {isTds && tdsAmount > 0 ? `- ${formatINR(tdsAmount)} (${tdsPercent}% Sec 194I)` : '0% (Optional / No TDS)'}
                                </strong>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f8fafc', padding: '6px 8px', borderRadius: '6px' }}>
                                <span style={{ color: '#166534', fontWeight: '700' }}>Net Disbursed to Owner:</span>
                                <strong style={{ color: '#16a34a', fontSize: '1rem' }}>{formatINR(netMonthly)} / mo</strong>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#64748b' }}>Payout Due Day:</span>
                                <strong style={{ color: '#0f172a' }}>Day {flat.rentalDetails?.dueDayOfMonth || rental?.rentBack?.rentDueDay || 25} of every month</strong>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#64748b' }}>Tenure &amp; Commitment:</span>
                                <strong style={{ color: '#0f172a' }}>{tenureMo} Months ({formatINR(totalTenureCommitment)})</strong>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#64748b' }}>Disbursement Period:</span>
                                <span style={{ fontWeight: '600', color: '#0f172a' }}>
                                  {formatDate(flat.rentalDetails?.startDate || rental?.rentBack?.startDate || flat.salesDetails?.agreementDate)} ➔ {formatDate(flat.rentalDetails?.endDate || rental?.rentBack?.endDate)}
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* 2. Beneficiary Owner & Settlement Details */}
                      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderBottom: '1px solid #f1f5f9',
                          paddingBottom: '10px',
                          marginBottom: '12px'
                        }}>
                          <h5 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Building2 size={16} color="#0284c7" /> Beneficiary Owner &amp; Treasury Settlement
                          </h5>
                          <span style={{
                            fontSize: '0.72rem',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: '#e0f2fe',
                            color: '#0284c7',
                            fontWeight: '700'
                          }}>
                            Direct Disbursed
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.82rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b' }}>Beneficiary Owner:</span>
                            <strong style={{ color: '#0f172a' }}>{owner?.name || flat.currentOwner?.name || flat.salesDetails?.buyerName || 'Registered Owner'}</strong>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b' }}>Beneficiary Mobile:</span>
                            <span style={{ fontWeight: '600', color: '#0f172a' }}>{owner?.mobileNo || flat.currentOwner?.mobileNo || 'N/A'}</span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b' }}>Disbursing Source:</span>
                            <strong style={{ color: '#0284c7' }}>Krishna Valley Developer Treasury</strong>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b' }}>Settlement Mode:</span>
                            <span style={{ fontWeight: '600', color: '#0f172a' }}>Bank NEFT / RTGS Monthly Transfer</span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b' }}>TDS Certificate:</span>
                            <strong style={{ color: '#0f172a' }}>Form 16A Issued Annually</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: POSSESSION TIMELINE */}
              {activeTab === 'possession' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Possession Status Card */}
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Key size={18} color="#f59e0b" /> Physical Possession &amp; Handover Timeline
                        </h4>
                        <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                          Enforcing the mandatory 3-Year (36-Month) Rental Period before possession readiness.
                        </p>
                      </div>

                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '0.78rem',
                        fontWeight: '800',
                        background: lockIn?.possessionStatus === 'available_for_sale'
                          ? '#eff6ff'
                          : (lockIn?.isLocked ? '#fef3c7' : (lockIn?.possessionStatus === 'possession_completed' ? '#dcfce7' : '#dbeafe')),
                        color: lockIn?.possessionStatus === 'available_for_sale'
                          ? '#1d4ed8'
                          : (lockIn?.isLocked ? '#92400e' : (lockIn?.possessionStatus === 'possession_completed' ? '#166534' : '#1e40af')),
                        border: lockIn?.possessionStatus === 'available_for_sale'
                          ? '1px solid #bfdbfe'
                          : (lockIn?.isLocked ? '1px solid #fde68a' : (lockIn?.possessionStatus === 'possession_completed' ? '1px solid #bbf7d0' : '1px solid #bfdbfe'))
                      }}>
                        {lockIn?.possessionStatus === 'available_for_sale'
                          ? '🏷️ AVAILABLE FOR SALE'
                          : (lockIn?.isLocked
                              ? '🔒 POSSESSION LOCKED'
                              : (lockIn?.possessionStatus === 'possession_completed' ? '✓ POSSESSION COMPLETED' : '🔓 READY FOR POSSESSION'))}
                      </span>
                    </div>

                    <div style={{
                      background: '#f8fafc',
                      borderRadius: '10px',
                      padding: '18px 20px',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e40af', fontWeight: '700', fontSize: '0.9rem' }}>
                        <ShieldCheck size={18} />
                        <span>3-Year Lock-in Covenant (Starts on Booking Date)</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: '1.5' }}>
                        Under Krishna Valley township rules, this flat enters a <strong>mandatory 3-year (36-month) guaranteed rent-back term</strong> upon agreement signing. During that time, the owner receives monthly rental yields, and physical possession is scheduled upon the completion of the 36-month term.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: OWNERSHIP HISTORY & RESALE */}
              {activeTab === 'history' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <History size={18} color="#2563eb" /> Chain of Title &amp; Resale / Buyback History
                        </h4>
                        <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                          Chronological chain of title, transfers, and ownership lifecycle.
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setIsBuybackModalOpen(true)}
                          style={{
                            padding: '6px 12px',
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <RotateCcw size={13} /> Record Transfer / Buyback
                        </button>
                      </div>
                    </div>

                    {(!flat.ownershipHistory || flat.ownershipHistory.length === 0) ? (
                      <div style={{
                        textAlign: 'center',
                        padding: '36px 20px',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px dashed #cbd5e1',
                        color: '#64748b',
                        fontSize: '0.82rem'
                      }}>
                        No historical transfers recorded yet. The initial owner is the current titleholder.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {flat.ownershipHistory.map((h, idx) => (
                          <div
                            key={h._id || idx}
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              padding: '12px 16px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: '10px'
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.88rem' }}>
                                  {h.previousOwnerName || 'Prior Owner'} ➔ {h.newOwnerName || 'New Owner'}
                                </span>
                                <span style={{
                                  fontSize: '0.68rem',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background: '#e0e7ff',
                                  color: '#3730a3',
                                  fontWeight: '800'
                                }}>
                                  {(h.transferReason || 'RESALE').replace(/_/g, ' ').toUpperCase()}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '3px' }}>
                                Transferred on: {formatDate(h.transferDate)}
                                {h.remarks && ` • ${h.remarks}`}
                              </div>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Transfer Valuation:</span>
                              <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#1e293b' }}>
                                {formatINR(h.transferDealValue)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div style={{
          padding: '14px 24px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Unit ID: <code style={{ color: '#0f172a' }}>{flat._id || flatId}</code>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 22px',
                background: '#1e293b',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* SUB-MODALS */}
      {isBuybackModalOpen && (
        <RecordBuybackModal
          isOpen={isBuybackModalOpen}
          onClose={() => setIsBuybackModalOpen(false)}
          flat={flat}
          onSuccess={() => {
            loadFlatDetail();
            setIsBuybackModalOpen(false);
          }}
        />
      )}

      {isImportHistoryModalOpen && (
        <ImportOwnershipHistoryModal
          isOpen={isImportHistoryModalOpen}
          onClose={() => setIsImportHistoryModalOpen(false)}
          onSuccess={() => {
            loadFlatDetail();
            setIsImportHistoryModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
