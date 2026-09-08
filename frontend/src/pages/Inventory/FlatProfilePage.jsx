import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { projectService } from '../../services/projectService.js';
import { StatusBadge } from '../../components/common/StatusBadge.jsx';
import { LoadingButton } from '../../components/common/LoadingButton.jsx';
import { DetailModalSkeleton } from '../../components/common/SkeletonLoader.jsx';
import { EmptyState } from '../../components/common/EmptyState.jsx';
import { useToast } from '../../context/ToastContext.jsx';

import {
  Home,
  Building2,
  Layers,
  User,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  Key,
  Compass,
  Maximize2,
  Tag,
  ArrowLeft,
  ExternalLink,
  Upload,
  Pencil,
  Save,
  Check,
  Sparkles,
  Receipt,
  Repeat,
  RotateCcw,
  Printer,
  History,
  CreditCard,
  Building,
  CheckSquare,
  AlertTriangle,
  Download,
  Eye,
  Plus,
  X
} from 'lucide-react';

export const FlatProfilePage = () => {
  const { flatId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [flat, setFlat] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('payouts'); // 'payouts' | 'owner' | 'specs' | 'sales' | 'maintenance'

  // Modal States
  const [isEditSpecsOpen, setIsEditSpecsOpen] = useState(false);
  const [specsForm, setSpecsForm] = useState({});
  const [savingSpecs, setSavingSpecs] = useState(false);

  const [isEditMouOpen, setIsEditMouOpen] = useState(false);
  const [mouForm, setMouForm] = useState({});
  const [savingMou, setSavingMou] = useState(false);

  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutForm, setPayoutForm] = useState({});
  const [savingPayout, setSavingPayout] = useState(false);

  const [isResaleModalOpen, setIsResaleModalOpen] = useState(false);
  const [resaleForm, setResaleForm] = useState({});
  const [savingResale, setSavingResale] = useState(false);

  const [uploadingBlueprint, setUploadingBlueprint] = useState(false);

  const formatINR = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '₹0';
    return `₹${Number(val).toLocaleString('en-IN')}`;
  };

  const formatDate = (val) => {
    if (!val) return '—';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return '—';
    }
  };

  // Fetch Flat Data
  const loadFlat = useCallback(async () => {
    if (!flatId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await projectService.getFlatById(flatId);
      if (res.data) {
        setFlat(res.data);
      } else {
        setError('Flat not found');
      }
    } catch (err) {
      console.error('Error fetching flat profile:', err);
      setError(err.message || 'Error loading flat details');
    } finally {
      setLoading(false);
    }
  }, [flatId]);

  useEffect(() => {
    loadFlat();
  }, [loadFlat]);

  // Derived Values
  const rental = flat?.rentalDetails || {};
  const owner = flat?.owner || flat?.currentOwner || {};
  const sales = flat?.salesDetails || flat?.salesLead || {};
  const lockIn = flat?.rentalLockIn || {};
  const passbook = rental.ledgerEntries || [];

  const monthlyRent = rental.guaranteedMonthlyRent || 0;
  const tenureMonths = rental.tenureMonths || 36;
  const tdsPct = rental.tdsPercentage || 10;
  const applyTds = rental.applyTds !== false;
  const tdsAmount = applyTds ? Math.round(monthlyRent * (tdsPct / 100)) : 0;
  const netMonthlyRent = monthlyRent - tdsAmount;

  const totalCommitment = rental.total36MonthCommitment || (monthlyRent * tenureMonths);
  const totalDisbursed = rental.totalDisbursedToOwner || 0;
  const balancePayable = Math.max(0, totalCommitment - totalDisbursed);
  const paidMonthsCount = rental.paidMonthsCount ?? (monthlyRent > 0 ? Math.round(totalDisbursed / monthlyRent) : 0);
  const outstandingMonthsCount = Math.max(0, tenureMonths - paidMonthsCount);
  const progressPct = rental.progressPercentage ?? (tenureMonths > 0 ? Math.min(100, Math.round((paidMonthsCount / tenureMonths) * 100)) : 0);

  // --- Handlers ---
  const handleOpenEditSpecs = () => {
    setSpecsForm({
      bhkType: flat.bhkType || '2BHK',
      floor: flat.floor ?? 0,
      carpetArea: flat.carpetArea || 950,
      superBuiltUpArea: flat.superBuiltUpArea || 1250,
      facing: flat.facing || 'East',
      furnishingStatus: flat.furnishingStatus || 'semi_furnished',
      parkingSlot: flat.parkingSlot || '',
      basePrice: flat.basePrice || 2500000,
      status: flat.status || 'sold'
    });
    setIsEditSpecsOpen(true);
  };

  const handleSaveSpecs = async (e) => {
    e.preventDefault();
    setSavingSpecs(true);
    try {
      await projectService.updateFlat(flat._id, specsForm);
      toast.show('Unit specifications updated successfully', 'success');
      setIsEditSpecsOpen(false);
      loadFlat();
    } catch (err) {
      toast.show(err.message || 'Failed to update unit specs', 'error');
    } finally {
      setSavingSpecs(false);
    }
  };

  const handleOpenEditMou = () => {
    setMouForm({
      mouNumber: rental.mouNumber || '',
      mouDate: rental.mouDate ? new Date(rental.mouDate).toISOString().split('T')[0] : '',
      startDate: rental.startDate ? new Date(rental.startDate).toISOString().split('T')[0] : '',
      endDate: rental.endDate ? new Date(rental.endDate).toISOString().split('T')[0] : '',
      dueDayOfMonth: rental.dueDayOfMonth || 25,
      guaranteedMonthlyRent: rental.guaranteedMonthlyRent || 0,
      tenureMonths: rental.tenureMonths || 36,
      applyTds: rental.applyTds !== false,
      tdsPercentage: rental.tdsPercentage || 10,
      total36MonthCommitment: rental.total36MonthCommitment || totalCommitment,
      totalDisbursedToOwner: rental.totalDisbursedToOwner || totalDisbursed
    });
    setIsEditMouOpen(true);
  };

  const handleSaveMou = async (e) => {
    e.preventDefault();
    setSavingMou(true);
    try {
      await projectService.updateFlat(flat._id, { rentalDetails: mouForm });
      toast.show('MOU & payout terms updated successfully', 'success');
      setIsEditMouOpen(false);
      loadFlat();
    } catch (err) {
      toast.show(err.message || 'Failed to update MOU terms', 'error');
    } finally {
      setSavingMou(false);
    }
  };

  const handleOpenPayout = (monthIdx = null) => {
    const nextMonth = monthIdx || (paidMonthsCount + 1);
    setPayoutForm({
      monthIndex: nextMonth,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMode: 'NEFT',
      referenceNumber: `CMS-NEFT-${flat.flatNumber?.replace(/[^0-9]/g, '') || '001'}-${nextMonth.toString().padStart(2, '0')}`,
      amount: monthlyRent,
      remarks: `Assured payout for Month ${nextMonth}`
    });
    setIsPayoutModalOpen(true);
  };

  const handleSavePayout = async (e) => {
    e.preventDefault();
    setSavingPayout(true);
    try {
      await projectService.recordRentalPayout(flat._id, payoutForm);
      toast.show(`Payout for Month ${payoutForm.monthIndex} recorded successfully!`, 'success');
      setIsPayoutModalOpen(false);
      loadFlat();
    } catch (err) {
      toast.show(err.message || 'Failed to record payout', 'error');
    } finally {
      setSavingPayout(false);
    }
  };

  const handleOpenResale = () => {
    setResaleForm({
      transactionType: 'resale',
      transferDate: new Date().toISOString().split('T')[0],
      newOwnerName: '',
      newOwnerMobile: '',
      newOwnerEmail: '',
      newOwnerPan: '',
      newOwnerAadhaar: '',
      newOwnerBankName: '',
      newOwnerAccountNumber: '',
      newOwnerIfscCode: '',
      transferDealValue: flat.basePrice || 2500000,
      remarks: ''
    });
    setIsResaleModalOpen(true);
  };

  const handleSaveResale = async (e) => {
    e.preventDefault();
    setSavingResale(true);
    try {
      await projectService.recordFlatBuybackOrResale(flat._id, resaleForm);
      toast.show('Ownership transfer & resale trail recorded successfully', 'success');
      setIsResaleModalOpen(false);
      loadFlat();
    } catch (err) {
      toast.show(err.message || 'Failed to record transfer', 'error');
    } finally {
      setSavingResale(false);
    }
  };

  const handleBlueprintUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBlueprint(true);
    const fd = new FormData();
    fd.append('blueprintFile', file);
    fd.append('title', file.name.replace(/\.[^/.]+$/, ''));
    try {
      const token = localStorage.getItem('kv_token');
      const res = await fetch(`/api/flats/${flat._id}/blueprints`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: fd
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');
      toast.show('Blueprint uploaded successfully', 'success');
      loadFlat();
    } catch (err) {
      toast.show(err.message || 'Failed to upload blueprint', 'error');
    } finally {
      setUploadingBlueprint(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
        <DetailModalSkeleton />
      </div>
    );
  }

  if (error || !flat) {
    return (
      <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <EmptyState
          icon={AlertCircle}
          title="Flat Not Found"
          description={error || `Could not find property record for "${flatId}".`}
          primaryAction={() => navigate('/inventory')}
          primaryActionLabel="Back to Property Inventory"
          primaryActionIcon={ArrowLeft}
        />
      </div>
    );
  }

  return (
    <div className="flat-profile-page animate-fade-in" style={{ padding: '20px 28px 60px', maxWidth: '1500px', margin: '0 auto' }}>
      
      {/* 1. TOP BREADCRUMB & HEADER ACTIONS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => navigate('/inventory')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              background: '#ffffff',
              border: '1px solid #dadce0',
              color: '#1a73e8',
              fontSize: '0.82rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <ArrowLeft size={14} /> Back to Inventory
          </button>
          <span style={{ color: '#9aa0a6', fontSize: '0.85rem' }}>/</span>
          <span style={{ color: '#5f6368', fontSize: '0.82rem', fontWeight: '500' }}>
            {flat.buildingName || 'Tower A'}
          </span>
          <span style={{ color: '#9aa0a6', fontSize: '0.85rem' }}>/</span>
          <span style={{ color: '#111827', fontSize: '0.82rem', fontWeight: '700' }}>
            Flat {flat.flatNumber}
          </span>
        </div>

        {/* Quick Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={handleOpenEditSpecs}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '6px',
              background: '#ffffff',
              border: '1px solid #dadce0',
              color: '#3c4043',
              fontSize: '0.8rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <Pencil size={13} color="#1a73e8" /> Edit Specs
          </button>

          <button
            onClick={handleOpenEditMou}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '6px',
              background: '#ffffff',
              border: '1px solid #dadce0',
              color: '#3c4043',
              fontSize: '0.8rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <FileText size={13} color="#137333" /> Update MOU Terms
          </button>

          <button
            onClick={() => handleOpenPayout()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '6px',
              background: '#137333',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.8rem',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(19, 115, 51, 0.2)'
            }}
          >
            <DollarSign size={13} /> Record Payout
          </button>

          <button
            onClick={handleOpenResale}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '6px',
              background: '#ffffff',
              border: '1px solid #dadce0',
              color: '#8b5cf6',
              fontSize: '0.8rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <Repeat size={13} /> Resale / Transfer
          </button>

          <button
            onClick={() => window.print()}
            title="Print Property Dossier"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              borderRadius: '6px',
              background: '#ffffff',
              border: '1px solid #dadce0',
              color: '#5f6368',
              fontSize: '0.8rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      {/* 2. HERO PROPERTY COMMAND CARD */}
      <div
        className="g-card"
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8faff 100%)',
          border: '1px solid #dadce0',
          borderRadius: '12px',
          padding: '24px 28px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(60, 64, 67, 0.08)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '10px',
                  background: '#e8f0fe',
                  color: '#1a73e8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '800',
                  fontSize: '1.25rem'
                }}
              >
                <Home size={24} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
                    Flat {flat.flatNumber}
                  </h1>
                  <StatusBadge status={flat.status} />
                  {monthlyRent > 0 && (
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        padding: '3px 9px',
                        borderRadius: '12px',
                        background: '#e6f4ea',
                        color: '#137333',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <CheckCircle2 size={12} /> MOU ACTIVE • {formatINR(monthlyRent)}/mo
                    </span>
                  )}
                  {flat.salesDetails?.salesStatus === 'fully_paid' && (
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        padding: '3px 9px',
                        borderRadius: '12px',
                        background: '#f3e8ff',
                        color: '#8b5cf6'
                      }}
                    >
                      REGISTRY COMPLETED
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', color: '#5f6368', marginTop: '6px', flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Building2 size={14} color="#1a73e8" /> {flat.buildingName || 'Tower A'}, {flat.projectName || 'Krishna Valley Resorts'}
                  </span>
                  <span>•</span>
                  <span>{flat.floor === 0 ? 'Ground Floor' : `Floor ${flat.floor}`}</span>
                  <span>•</span>
                  <span>{flat.bhkType || '2BHK'} ({flat.carpetArea || 950} sq ft)</span>
                  <span>•</span>
                  <span>Facing: {flat.facing || 'East'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Owner Summary Tile */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #dadce0',
              borderRadius: '10px',
              padding: '12px 18px',
              minWidth: '260px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: '#f3e8ff',
                color: '#8b5cf6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700'
              }}
            >
              <User size={20} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.7rem', color: '#5f6368', fontWeight: '700', textTransform: 'uppercase' }}>Current Owner</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {owner.name || 'Unassigned / Available'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '600' }}>
                {owner.mobileNo || 'Contact on file'}
              </div>
            </div>
            {owner.name && (
              <button
                onClick={() => navigate(`/customers?tab=directory&search=${encodeURIComponent(owner.name)}`)}
                title="View Owner Customer Dossier"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#1a73e8',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <ExternalLink size={15} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. 5 EXECUTIVE TOP KPI TILES */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '14px',
          marginBottom: '22px'
        }}
      >
        {/* Metric 1: Monthly Assured Rent */}
        <div className="stat-card" style={{ background: '#ffffff', border: '1px solid #dadce0', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.74rem', color: '#5f6368', fontWeight: '700', textTransform: 'uppercase' }}>Monthly Assured Rent</span>
            <div style={{ padding: '5px', borderRadius: '6px', background: '#e6f4ea', color: '#137333' }}>
              <DollarSign size={15} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#137333', marginTop: '4px' }}>
            {formatINR(monthlyRent)}
            <span style={{ fontSize: '0.75rem', color: '#5f6368', fontWeight: '600' }}> /mo</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#4b5563', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Net (after TDS): <strong>{formatINR(netMonthlyRent)}</strong></span>
            <span>Due: <strong>{rental.dueDayOfMonth || 25}th</strong></span>
          </div>
        </div>

        {/* Metric 2: Tenure Progress */}
        <div className="stat-card" style={{ background: '#ffffff', border: '1px solid #dadce0', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.74rem', color: '#5f6368', fontWeight: '700', textTransform: 'uppercase' }}>Tenure Progress</span>
            <div style={{ padding: '5px', borderRadius: '6px', background: '#e8f0fe', color: '#1a73e8' }}>
              <Clock size={15} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1a73e8', marginTop: '4px' }}>
            {paidMonthsCount} / {tenureMonths}
            <span style={{ fontSize: '0.75rem', color: '#5f6368', fontWeight: '600' }}> Months</span>
          </div>
          <div style={{ marginTop: '6px' }}>
            <div style={{ width: '100%', height: '6px', background: '#e0e2ec', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${progressPct}%`, height: '100%', background: '#1a73e8', borderRadius: '3px', transition: 'width 0.4s ease' }} />
            </div>
            <div style={{ fontSize: '0.72rem', color: '#5f6368', display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span>{outstandingMonthsCount} mos remaining</span>
              <strong>{progressPct}%</strong>
            </div>
          </div>
        </div>

        {/* Metric 3: Financial Commitment */}
        <div className="stat-card" style={{ background: '#ffffff', border: '1px solid #dadce0', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.74rem', color: '#5f6368', fontWeight: '700', textTransform: 'uppercase' }}>Total Assured Amount</span>
            <div style={{ padding: '5px', borderRadius: '6px', background: '#fef7e0', color: '#b06000' }}>
              <Receipt size={15} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#b06000', marginTop: '4px' }}>
            {formatINR(totalCommitment)}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#4b5563', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Disbursed: <strong style={{ color: '#137333' }}>{formatINR(totalDisbursed)}</strong></span>
            <span>Bal: <strong>{formatINR(balancePayable)}</strong></span>
          </div>
        </div>

        {/* Metric 4: Lock-In & Possession Target */}
        <div className="stat-card" style={{ background: '#ffffff', border: '1px solid #dadce0', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.74rem', color: '#5f6368', fontWeight: '700', textTransform: 'uppercase' }}>Possession & Lock-in</span>
            <div style={{ padding: '5px', borderRadius: '6px', background: '#f3e8ff', color: '#8b5cf6' }}>
              <Key size={15} />
            </div>
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#111827', marginTop: '4px' }}>
            {lockIn.isLocked ? `${lockIn.remainingMonths} Months` : 'Eligible'}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#5f6368', marginTop: '4px' }}>
            Target: <strong>{formatDate(lockIn.lockInEndDate || rental.endDate)}</strong>
          </div>
        </div>
      </div>

      {/* 4. TABBED INTERFACE HEADER */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          background: '#f1f3f4',
          padding: '4px',
          borderRadius: '8px',
          marginBottom: '20px',
          overflowX: 'auto',
          border: '1px solid #dadce0'
        }}
      >
        {[
          { id: 'payouts', label: '1. Owner Payouts & MOU Passbook', icon: Receipt },
          { id: 'owner', label: '2. Owner KYC & Resale History', icon: User },
          { id: 'specs', label: '3. Property Specs & Blueprints', icon: Layers },
          { id: 'sales', label: '4. Sales Allotment & Agreements', icon: DollarSign },
          { id: 'maintenance', label: '5. Maintenance & CAM', icon: ShieldCheck }
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '6px',
                background: isSelected ? '#1a73e8' : 'transparent',
                color: isSelected ? '#ffffff' : '#3c4043',
                fontSize: '0.82rem',
                fontWeight: isSelected ? '700' : '600',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* 5. TAB CONTENTS */}

      {/* ========================================================================= */}
      {/* TAB 1: OWNER PAYOUTS & MOU PASSBOOK                                       */}
      {/* ========================================================================= */}
      {activeTab === 'payouts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Contract Terms Summary Card */}
          <div className="g-card" style={{ background: '#ffffff', border: '1px solid #dadce0', borderRadius: '10px', padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} color="#1a73e8" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                  Assured Returns MOU & Payout Terms
                </h3>
              </div>
              <button
                onClick={handleOpenEditMou}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 12px',
                  borderRadius: '5px',
                  background: '#f1f3f4',
                  border: '1px solid #dadce0',
                  color: '#1a73e8',
                  fontSize: '0.78rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <Pencil size={12} /> Edit Terms
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#5f6368', display: 'block' }}>MOU Date</span>
                <strong style={{ fontSize: '0.92rem', color: '#111827' }}>{formatDate(rental.mouDate)}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#5f6368', display: 'block' }}>Payment Start Date</span>
                <strong style={{ fontSize: '0.92rem', color: '#111827' }}>{formatDate(rental.startDate)}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#5f6368', display: 'block' }}>Payment End Date</span>
                <strong style={{ fontSize: '0.92rem', color: '#111827' }}>{formatDate(rental.endDate)}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#5f6368', display: 'block' }}>Monthly Due Day</span>
                <strong style={{ fontSize: '0.92rem', color: '#111827' }}>{rental.dueDayOfMonth || 25}th of every month</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#5f6368', display: 'block' }}>Installment Amount</span>
                <strong style={{ fontSize: '0.92rem', color: '#137333' }}>{formatINR(monthlyRent)}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#5f6368', display: 'block' }}>TDS Withheld (10%)</span>
                <strong style={{ fontSize: '0.92rem', color: '#c62828' }}>- {formatINR(tdsAmount)}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#5f6368', display: 'block' }}>Net Monthly Disbursal</span>
                <strong style={{ fontSize: '1rem', color: '#137333' }}>{formatINR(netMonthlyRent)}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#5f6368', display: 'block' }}>Registry Status</span>
                <strong style={{ fontSize: '0.92rem', color: flat.salesDetails?.salesStatus === 'fully_paid' ? '#137333' : '#b06000' }}>
                  {flat.salesDetails?.salesStatus === 'fully_paid' ? 'DONE' : 'PENDING'}
                </strong>
              </div>
            </div>

            {/* Owner's Bank Account for Payouts */}
            <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: '1px solid #f1f3f4', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1a73e8', fontWeight: '700', fontSize: '0.8rem' }}>
                <CreditCard size={15} /> Payout Bank Details:
              </div>
              <span style={{ fontSize: '0.82rem', color: '#3c4043' }}>
                Bank: <strong>{owner.bankDetails?.bankName || 'Not Provided'}</strong>
              </span>
              <span style={{ fontSize: '0.82rem', color: '#3c4043' }}>
                A/C No: <strong>{owner.bankDetails?.accountNumber || owner.bankDetails?.accountNo || '—'}</strong>
              </span>
              <span style={{ fontSize: '0.82rem', color: '#3c4043' }}>
                IFSC: <strong>{owner.bankDetails?.ifscCode || owner.bankDetails?.ifsc || '—'}</strong>
              </span>
              <span style={{ fontSize: '0.82rem', color: '#3c4043' }}>
                Branch: <strong>{owner.bankDetails?.branch || '—'}</strong>
              </span>
            </div>
          </div>

          {/* Passbook Ledger Table */}
          <div className="g-card" style={{ background: '#ffffff', border: '1px solid #dadce0', borderRadius: '10px', padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                  Month-by-Month Passbook Disbursement Ledger
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#5f6368' }}>
                  Complete record of all {tenureMonths} installments under the assured returns program.
                </span>
              </div>
              <button
                onClick={() => handleOpenPayout()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 16px',
                  borderRadius: '6px',
                  background: '#137333',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                <Plus size={14} /> Record Next Payout
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dadce0', textAlign: 'left', color: '#5f6368' }}>
                    <th style={{ padding: '10px 12px' }}>Month #</th>
                    <th style={{ padding: '10px 12px' }}>Due Date</th>
                    <th style={{ padding: '10px 12px' }}>Payment Date</th>
                    <th style={{ padding: '10px 12px' }}>Mode</th>
                    <th style={{ padding: '10px 12px' }}>Reference #</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Gross</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>TDS (10%)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Net Disbursed</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Cumulative</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {passbook.map((entry) => {
                    const isPaid = entry.status === 'paid';
                    const isDue = entry.status === 'due';
                    return (
                      <tr
                        key={entry.monthIndex}
                        style={{
                          borderBottom: '1px solid #f1f3f4',
                          background: isDue ? '#fffbf0' : (isPaid ? '#ffffff' : '#fafafa')
                        }}
                      >
                        <td style={{ padding: '10px 12px', fontWeight: '700', color: '#111827' }}>
                          Month {entry.monthIndex}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#3c4043' }}>
                          {formatDate(entry.dueDate)}
                        </td>
                        <td style={{ padding: '10px 12px', color: isPaid ? '#137333' : '#9aa0a6' }}>
                          {formatDate(entry.paymentDate)}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#5f6368' }}>
                          {entry.paymentMode || 'NEFT'}
                        </td>
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '0.75rem', color: '#1a73e8' }}>
                          {entry.referenceNumber || '—'}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600' }}>
                          {formatINR(entry.grossAmount || monthlyRent)}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#c62828' }}>
                          - {formatINR(entry.tdsDeducted || tdsAmount)}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', color: '#137333' }}>
                          {formatINR(entry.netAmountPaid || netMonthlyRent)}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#5f6368' }}>
                          {formatINR(entry.cumulativePaid || 0)}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: isPaid ? '#e6f4ea' : (isDue ? '#fef7e0' : '#f1f3f4'),
                              color: isPaid ? '#137333' : (isDue ? '#b06000' : '#5f6368'),
                              textTransform: 'uppercase'
                            }}
                          >
                            {entry.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          {!isPaid ? (
                            <button
                              onClick={() => handleOpenPayout(entry.monthIndex)}
                              style={{
                                padding: '3px 8px',
                                borderRadius: '4px',
                                background: '#e8f0fe',
                                border: '1px solid #c2e7ff',
                                color: '#1a73e8',
                                fontSize: '0.72rem',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                            >
                              Mark Paid
                            </button>
                          ) : (
                            <span style={{ color: '#137333', fontSize: '0.8rem' }}>✓</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: OWNER KYC & RESALE HISTORY                                         */}
      {/* ========================================================================= */}
      {activeTab === 'owner' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Current Owner Card */}
          <div className="g-card" style={{ background: '#ffffff', border: '1px solid #dadce0', borderRadius: '10px', padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={18} color="#1a73e8" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                  Current Registered Owner
                </h3>
              </div>
              <button
                onClick={handleOpenResale}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  background: '#f3e8ff',
                  border: '1px solid #d8b4fe',
                  color: '#8b5cf6',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                <Repeat size={13} /> Transfer Ownership / Resale
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#5f6368', display: 'block' }}>Full Name</span>
                <strong style={{ fontSize: '1.05rem', color: '#111827' }}>{owner.name || 'Unassigned'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#5f6368', display: 'block' }}>Primary Mobile</span>
                <strong style={{ fontSize: '0.95rem', color: '#10b981' }}>{owner.mobileNo || '—'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#5f6368', display: 'block' }}>Email Address</span>
                <strong style={{ fontSize: '0.92rem', color: '#1a73e8' }}>{owner.email || '—'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#5f6368', display: 'block' }}>Ownership Type</span>
                <strong style={{ fontSize: '0.92rem', color: '#111827', textTransform: 'capitalize' }}>{owner.ownershipType || 'Individual'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#5f6368', display: 'block' }}>PAN Number</span>
                <strong style={{ fontSize: '0.92rem', color: '#111827', letterSpacing: '0.04em' }}>{owner.panNumber || '—'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#5f6368', display: 'block' }}>Aadhaar Number</span>
                <strong style={{ fontSize: '0.92rem', color: '#111827' }}>{owner.aadhaarNumber || '—'}</strong>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ fontSize: '0.74rem', color: '#5f6368', display: 'block' }}>Permanent Address</span>
                <span style={{ fontSize: '0.88rem', color: '#3c4043' }}>{owner.address || owner.permanentAddress || 'On File with Administration'}</span>
              </div>
            </div>
          </div>

          {/* Ownership Trail / Resale History */}
          <div className="g-card" style={{ background: '#ffffff', border: '1px solid #dadce0', borderRadius: '10px', padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <History size={18} color="#8b5cf6" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                Ownership Trail & Resale History ({flat.ownershipHistory?.length || 0})
              </h3>
            </div>

            {(!flat.ownershipHistory || flat.ownershipHistory.length === 0) ? (
              <div style={{ padding: '24px', textAlign: 'center', background: '#f8f9fa', borderRadius: '8px', color: '#5f6368' }}>
                <span style={{ fontSize: '0.85rem' }}>No historical transfers or resales on record. Current owner is the initial allottee.</span>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dadce0', textAlign: 'left', color: '#5f6368' }}>
                      <th style={{ padding: '10px 12px' }}>Previous Owner</th>
                      <th style={{ padding: '10px 12px' }}>Transfer Date</th>
                      <th style={{ padding: '10px 12px' }}>Transfer Reason</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Deal Value</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Rent Paid While Owned</th>
                      <th style={{ padding: '10px 12px' }}>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flat.ownershipHistory.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f3f4' }}>
                        <td style={{ padding: '10px 12px', fontWeight: '700', color: '#111827' }}>
                          {item.name || item.previousOwnerName || 'Prior Allottee'}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#3c4043' }}>
                          {formatDate(item.transferDate || item.ownershipEndDate)}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: '#f3e8ff',
                              color: '#8b5cf6',
                              textTransform: 'uppercase'
                            }}
                          >
                            {item.transferReason || 'resale'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600' }}>
                          {formatINR(item.transferDealValue || 0)}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#137333', fontWeight: '600' }}>
                          {formatINR(item.totalRentPaid || 0)}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#5f6368', fontStyle: 'italic' }}>
                          {item.remarks || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PROPERTY SPECS & BLUEPRINTS                                        */}
      {/* ========================================================================= */}
      {activeTab === 'specs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Architectural Specifications */}
          <div className="g-card" style={{ background: '#ffffff', border: '1px solid #dadce0', borderRadius: '10px', padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} color="#1a73e8" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                  Architectural & Unit Specifications
                </h3>
              </div>
              <button
                onClick={handleOpenEditSpecs}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 12px',
                  borderRadius: '5px',
                  background: '#f1f3f4',
                  border: '1px solid #dadce0',
                  color: '#1a73e8',
                  fontSize: '0.78rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <Pencil size={12} /> Edit
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#5f6368', display: 'block' }}>Unit Number</span>
                <strong style={{ fontSize: '1.1rem', color: '#111827' }}>{flat.flatNumber}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#5f6368', display: 'block' }}>Floor Level</span>
                <strong style={{ fontSize: '0.95rem', color: '#111827' }}>{flat.floor === 0 ? 'Ground Floor' : `Floor ${flat.floor}`}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#5f6368', display: 'block' }}>BHK Configuration</span>
                <strong style={{ fontSize: '0.95rem', color: '#111827' }}>{flat.bhkType || '2BHK'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#5f6368', display: 'block' }}>Carpet Area</span>
                <strong style={{ fontSize: '0.95rem', color: '#111827' }}>{flat.carpetArea || 950} sq ft</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#5f6368', display: 'block' }}>Super Built-Up Area</span>
                <strong style={{ fontSize: '0.95rem', color: '#111827' }}>{flat.superBuiltUpArea || 1250} sq ft</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#5f6368', display: 'block' }}>Facing Direction</span>
                <strong style={{ fontSize: '0.95rem', color: '#111827' }}>{flat.facing || 'East'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#5f6368', display: 'block' }}>Furnishing Status</span>
                <strong style={{ fontSize: '0.95rem', color: '#111827', textTransform: 'capitalize' }}>
                  {(flat.furnishingStatus || 'semi_furnished').replace('_', ' ')}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#5f6368', display: 'block' }}>Allocated Parking Slot</span>
                <strong style={{ fontSize: '0.95rem', color: '#111827' }}>{flat.parkingSlot || 'Stilt (Shared)'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#5f6368', display: 'block' }}>Current Valuation / Price</span>
                <strong style={{ fontSize: '1.05rem', color: '#137333' }}>{formatINR(flat.basePrice || 2500000)}</strong>
              </div>
            </div>
          </div>

          {/* Blueprints & Floorplans */}
          <div className="g-card" style={{ background: '#ffffff', border: '1px solid #dadce0', borderRadius: '10px', padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Maximize2 size={18} color="#1a73e8" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                  Blueprints & Architectural Floor Plans ({flat.blueprints?.length || 0})
                </h3>
              </div>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  background: '#1a73e8',
                  color: '#ffffff',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <Upload size={13} /> {uploadingBlueprint ? 'Uploading...' : 'Upload Blueprint'}
                <input
                  type="file"
                  accept="image/*,.pdf"
                  style={{ display: 'none' }}
                  onChange={handleBlueprintUpload}
                  disabled={uploadingBlueprint}
                />
              </label>
            </div>

            {(!flat.blueprints || flat.blueprints.length === 0) ? (
              <div style={{ padding: '24px', textAlign: 'center', background: '#f8f9fa', borderRadius: '8px', color: '#5f6368' }}>
                <span style={{ fontSize: '0.85rem' }}>No blueprint files attached. Click "Upload Blueprint" to upload 2D layouts or 3D renders.</span>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px' }}>
                {flat.blueprints.map((bp, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: '1px solid #dadce0',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      background: '#ffffff'
                    }}
                  >
                    <div style={{ height: '140px', background: '#f1f3f4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {bp.fileUrl?.match(/\.(jpg|jpeg|png|webp|svg)$/i) ? (
                        <img src={bp.fileUrl} alt={bp.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <FileText size={40} color="#5f6368" />
                      )}
                    </div>
                    <div style={{ padding: '10px 12px' }}>
                      <strong style={{ fontSize: '0.85rem', color: '#111827', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {bp.title}
                      </strong>
                      <span style={{ fontSize: '0.72rem', color: '#5f6368' }}>{formatDate(bp.uploadedAt)}</span>
                      <div style={{ marginTop: '8px' }}>
                        <a
                          href={bp.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.74rem',
                            color: '#1a73e8',
                            fontWeight: '600',
                            textDecoration: 'none'
                          }}
                        >
                          <ExternalLink size={12} /> View File
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SALES ALLOTMENT & AGREEMENTS                                       */}
      {/* ========================================================================= */}
      {activeTab === 'sales' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="g-card" style={{ background: '#ffffff', border: '1px solid #dadce0', borderRadius: '10px', padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <DollarSign size={18} color="#137333" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                Sales Allotment & Financial Deal Summary
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#5f6368', display: 'block' }}>Allottee Name</span>
                <strong style={{ fontSize: '0.95rem', color: '#111827' }}>{sales.buyerName || sales.name || owner.name || '—'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#5f6368', display: 'block' }}>Booking Date</span>
                <strong style={{ fontSize: '0.92rem', color: '#111827' }}>{formatDate(sales.bookingDate || sales.booking?.bookingDate)}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#5f6368', display: 'block' }}>Agreed Deal Price</span>
                <strong style={{ fontSize: '1.05rem', color: '#137333' }}>{formatINR(sales.agreedDealPrice || sales.booking?.agreedDealPrice || flat.basePrice)}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#5f6368', display: 'block' }}>Booking Amount Paid</span>
                <strong style={{ fontSize: '0.92rem', color: '#111827' }}>{formatINR(sales.bookingAmountPaid || sales.booking?.bookingAmount || 0)}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#5f6368', display: 'block' }}>Total Paid Towards Deal</span>
                <strong style={{ fontSize: '0.92rem', color: '#137333' }}>{formatINR(sales.totalAmountPaid || sales.booking?.bookingAmount || 0)}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#5f6368', display: 'block' }}>Balance Deal Due</span>
                <strong style={{ fontSize: '0.92rem', color: '#c62828' }}>{formatINR(sales.balanceAmountDue || 0)}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#5f6368', display: 'block' }}>Sales Status</span>
                <strong style={{ fontSize: '0.92rem', color: '#1a73e8', textTransform: 'capitalize' }}>
                  {(sales.salesStatus || 'agreement_completed').replace(/_/g, ' ')}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#5f6368', display: 'block' }}>Agreement Number</span>
                <strong style={{ fontSize: '0.92rem', color: '#111827' }}>{sales.agreementNumber || `BBA-${flat.flatNumber}`}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#5f6368', display: 'block' }}>Possession Status</span>
                <strong style={{ fontSize: '0.92rem', color: sales.possessionStatus === 'handed_over' ? '#137333' : '#b06000', textTransform: 'capitalize' }}>
                  {(sales.possessionStatus || 'handed_over').replace(/_/g, ' ')}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: MAINTENANCE & CAM                                                  */}
      {/* ========================================================================= */}
      {activeTab === 'maintenance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="g-card" style={{ background: '#ffffff', border: '1px solid #dadce0', borderRadius: '10px', padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <ShieldCheck size={18} color="#1a73e8" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                Common Area Maintenance (CAM) & Facility Services
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#5f6368', display: 'block' }}>Monthly CAM Fee</span>
                <strong style={{ fontSize: '1rem', color: '#111827' }}>{formatINR(flat.maintenanceDetails?.monthlyMaintenanceFee || 2000)} /mo</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#5f6368', display: 'block' }}>Billing Cycle</span>
                <strong style={{ fontSize: '0.92rem', color: '#111827', textTransform: 'capitalize' }}>
                  {flat.maintenanceDetails?.billingCycle || 'Monthly'}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#5f6368', display: 'block' }}>Outstanding Due</span>
                <strong style={{ fontSize: '0.92rem', color: flat.maintenanceDetails?.outstandingMaintenanceDue > 0 ? '#c62828' : '#137333' }}>
                  {formatINR(flat.maintenanceDetails?.outstandingMaintenanceDue || 0)}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#5f6368', display: 'block' }}>Payment Status</span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: '#e6f4ea',
                    color: '#137333',
                    textTransform: 'uppercase'
                  }}
                >
                  {flat.maintenanceDetails?.maintenanceStatus || 'PAID'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: EDIT UNIT SPECS                                                  */}
      {/* ========================================================================= */}
      {isEditSpecsOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div style={{ background: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '540px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>Edit Unit Specifications</h3>
              <button onClick={() => setIsEditSpecsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveSpecs} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '4px' }}>BHK Type</label>
                  <select
                    value={specsForm.bhkType}
                    onChange={(e) => setSpecsForm({ ...specsForm, bhkType: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #dadce0' }}
                  >
                    <option value="1BHK">1BHK</option>
                    <option value="2BHK">2BHK</option>
                    <option value="3BHK">3BHK</option>
                    <option value="Studio">Studio</option>
                    <option value="Commercial">Commercial</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Floor</label>
                  <input
                    type="number"
                    value={specsForm.floor}
                    onChange={(e) => setSpecsForm({ ...specsForm, floor: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #dadce0' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Carpet Area (sq ft)</label>
                  <input
                    type="number"
                    value={specsForm.carpetArea}
                    onChange={(e) => setSpecsForm({ ...specsForm, carpetArea: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #dadce0' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Super Built-Up (sq ft)</label>
                  <input
                    type="number"
                    value={specsForm.superBuiltUpArea}
                    onChange={(e) => setSpecsForm({ ...specsForm, superBuiltUpArea: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #dadce0' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Facing</label>
                  <select
                    value={specsForm.facing}
                    onChange={(e) => setSpecsForm({ ...specsForm, facing: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #dadce0' }}
                  >
                    <option value="East">East</option>
                    <option value="West">West</option>
                    <option value="North">North</option>
                    <option value="South">South</option>
                    <option value="North-East">North-East</option>
                    <option value="South-East">South-East</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Status</label>
                  <select
                    value={specsForm.status}
                    onChange={(e) => setSpecsForm({ ...specsForm, status: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #dadce0' }}
                  >
                    <option value="available">Available</option>
                    <option value="sold">Sold</option>
                    <option value="resell">Resell</option>
                    <option value="possession_renewal">Possession Renewal</option>
                    <option value="hold">Hold</option>
                    <option value="booked">Booked</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Valuation / Base Price (₹)</label>
                <input
                  type="number"
                  value={specsForm.basePrice}
                  onChange={(e) => setSpecsForm({ ...specsForm, basePrice: Number(e.target.value) })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #dadce0' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsEditSpecsOpen(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #dadce0', background: '#ffffff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <LoadingButton loading={savingSpecs} type="submit" style={{ padding: '8px 18px', borderRadius: '6px', background: '#1a73e8', color: '#fff', border: 'none', fontWeight: '600', cursor: 'pointer' }}>
                  Save Specifications
                </LoadingButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT MOU & PAYOUT TERMS                                          */}
      {/* ========================================================================= */}
      {isEditMouOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div style={{ background: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '540px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>Update MOU & Payout Terms</h3>
              <button onClick={() => setIsEditMouOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveMou} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Guaranteed Monthly Rent (₹)</label>
                  <input
                    type="number"
                    value={mouForm.guaranteedMonthlyRent}
                    onChange={(e) => setMouForm({ ...mouForm, guaranteedMonthlyRent: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #dadce0' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Tenure (Months)</label>
                  <input
                    type="number"
                    value={mouForm.tenureMonths}
                    onChange={(e) => setMouForm({ ...mouForm, tenureMonths: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #dadce0' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Due Day of Month</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={mouForm.dueDayOfMonth}
                    onChange={(e) => setMouForm({ ...mouForm, dueDayOfMonth: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #dadce0' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '4px' }}>TDS Percentage (%)</label>
                  <input
                    type="number"
                    value={mouForm.tdsPercentage}
                    onChange={(e) => setMouForm({ ...mouForm, tdsPercentage: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #dadce0' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '4px' }}>MOU Date</label>
                  <input
                    type="date"
                    value={mouForm.mouDate}
                    onChange={(e) => setMouForm({ ...mouForm, mouDate: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #dadce0' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Start Date</label>
                  <input
                    type="date"
                    value={mouForm.startDate}
                    onChange={(e) => setMouForm({ ...mouForm, startDate: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #dadce0' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '4px' }}>End Date</label>
                <input
                  type="date"
                  value={mouForm.endDate}
                  onChange={(e) => setMouForm({ ...mouForm, endDate: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #dadce0' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsEditMouOpen(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #dadce0', background: '#ffffff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <LoadingButton loading={savingMou} type="submit" style={{ padding: '8px 18px', borderRadius: '6px', background: '#137333', color: '#fff', border: 'none', fontWeight: '600', cursor: 'pointer' }}>
                  Save MOU Terms
                </LoadingButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: RECORD RENTAL PAYOUT                                             */}
      {/* ========================================================================= */}
      {isPayoutModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div style={{ background: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '480px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: '#137333' }}>
                Record Rental Disbursement Payout
              </h3>
              <button onClick={() => setIsPayoutModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleSavePayout} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: '#e6f4ea', border: '1px solid #c6f6d5', padding: '10px 14px', borderRadius: '6px', fontSize: '0.82rem', color: '#137333' }}>
                Recording payout for <strong>Flat {flat.flatNumber}</strong> • Owner: <strong>{owner.name}</strong>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Month Index</label>
                  <input
                    type="number"
                    min="1"
                    max={tenureMonths}
                    value={payoutForm.monthIndex}
                    onChange={(e) => setPayoutForm({ ...payoutForm, monthIndex: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #dadce0' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Amount (Gross ₹)</label>
                  <input
                    type="number"
                    value={payoutForm.amount}
                    onChange={(e) => setPayoutForm({ ...payoutForm, amount: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #dadce0' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Payment Date</label>
                  <input
                    type="date"
                    value={payoutForm.paymentDate}
                    onChange={(e) => setPayoutForm({ ...payoutForm, paymentDate: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #dadce0' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Payment Mode</label>
                  <select
                    value={payoutForm.paymentMode}
                    onChange={(e) => setPayoutForm({ ...payoutForm, paymentMode: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #dadce0' }}
                  >
                    <option value="NEFT">NEFT / RTGS</option>
                    <option value="IMPS">IMPS</option>
                    <option value="UPI">UPI</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Bank Reference / UTR Number</label>
                <input
                  type="text"
                  value={payoutForm.referenceNumber}
                  onChange={(e) => setPayoutForm({ ...payoutForm, referenceNumber: e.target.value })}
                  placeholder="e.g. CMS-NEFT-2026-09"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #dadce0' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Remarks</label>
                <input
                  type="text"
                  value={payoutForm.remarks}
                  onChange={(e) => setPayoutForm({ ...payoutForm, remarks: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #dadce0' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #dadce0', background: '#ffffff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <LoadingButton loading={savingPayout} type="submit" style={{ padding: '8px 18px', borderRadius: '6px', background: '#137333', color: '#fff', border: 'none', fontWeight: '600', cursor: 'pointer' }}>
                  Commit Payout to Ledger
                </LoadingButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: RESALE & BUYBACK TRANSFER                                        */}
      {/* ========================================================================= */}
      {isResaleModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div style={{ background: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '540px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: '#8b5cf6' }}>
                Record Resale or Ownership Transfer
              </h3>
              <button onClick={() => setIsResaleModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveResale} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: '#f5f3ff', border: '1px solid #e9d5ff', padding: '10px 14px', borderRadius: '6px', fontSize: '0.8rem', color: '#6b21a8' }}>
                Current Owner <strong>{owner.name}</strong> will be archived into the permanent ownership history trail, and the new purchaser will become the active owner.
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Transaction Type</label>
                <select
                  value={resaleForm.transactionType}
                  onChange={(e) => setResaleForm({ ...resaleForm, transactionType: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #dadce0' }}
                >
                  <option value="resale">Resale (Sold to New Buyer)</option>
                  <option value="buyback">Developer Buyback</option>
                  <option value="possession_renewal">Possession Renewal</option>
                  <option value="family_transfer">Family Transfer / Inheritance</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '4px' }}>New Owner Name</label>
                  <input
                    type="text"
                    required
                    value={resaleForm.newOwnerName}
                    onChange={(e) => setResaleForm({ ...resaleForm, newOwnerName: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #dadce0' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '4px' }}>New Owner Mobile</label>
                  <input
                    type="text"
                    required
                    value={resaleForm.newOwnerMobile}
                    onChange={(e) => setResaleForm({ ...resaleForm, newOwnerMobile: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #dadce0' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Transfer Date</label>
                  <input
                    type="date"
                    value={resaleForm.transferDate}
                    onChange={(e) => setResaleForm({ ...resaleForm, transferDate: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #dadce0' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Deal Value (₹)</label>
                  <input
                    type="number"
                    value={resaleForm.transferDealValue}
                    onChange={(e) => setResaleForm({ ...resaleForm, transferDealValue: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #dadce0' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Remarks / Reason</label>
                <input
                  type="text"
                  value={resaleForm.remarks}
                  onChange={(e) => setResaleForm({ ...resaleForm, remarks: e.target.value })}
                  placeholder="e.g. Unit resold via developer brokerage"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #dadce0' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsResaleModalOpen(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #dadce0', background: '#ffffff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <LoadingButton loading={savingResale} type="submit" style={{ padding: '8px 18px', borderRadius: '6px', background: '#8b5cf6', color: '#fff', border: 'none', fontWeight: '600', cursor: 'pointer' }}>
                  Execute Transfer
                </LoadingButton>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
