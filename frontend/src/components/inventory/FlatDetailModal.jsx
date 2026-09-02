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
  Upload
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
    } else {
      setFlatData(null);
    }
  }, [isOpen, flatId]);

  if (!isOpen) return null;

  const flat = flatData || initialFlat || {};
  const owner = flat.owner || null;
  const sales = flat.salesLead || null;
  const rental = flat.rentalContract || null;
  const lockIn = flat.rentalLockIn || {};
  const isSold = (flat.status || '').toLowerCase() === 'sold' || (flat.status || '').toLowerCase() === 'leased' || flat.takenForRental || !!sales || !!owner || !!rental;
  const isLeased = (flat.status || '').toLowerCase() === 'leased' || flat.takenForRental || !!rental;

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
        maxWidth: '840px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        animation: 'modalSlideIn 0.2s ease-out'
      }}>
        {/* MODAL HEADER */}
        <div style={{
          padding: '20px 24px',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0, letterSpacing: '-0.02em' }}>
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
                  {isSold ? 'SOLD' : (flat.status || 'AVAILABLE')}
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
                    3-YR RENTAL PROGRAM (36-MO LOCK-IN)
                  </span>
                )}
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{projectName || flat.projectId?.projectName || 'Project'}</span>
                <span>•</span>
                <span>{buildingName || flat.buildingName || 'Tower'}</span>
                <span>•</span>
                <span>Floor {flat.floor || 1}</span>
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

        {/* 3-YEAR RENTAL LOCK-IN & POSSESSION BANNER (MANDATORY POLICY) */}
        {lockIn && (
          <div style={{
            background: !isSold
              ? '#eff6ff'
              : (lockIn.isLocked ? '#fffbeb' : '#f0fdf4'),
            borderBottom: !isSold
              ? '1px solid #bfdbfe'
              : (lockIn.isLocked ? '1px solid #fde68a' : '1px solid #bbf7d0'),
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {!isSold ? (
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#dbeafe',
                  color: '#1d4ed8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <ShieldCheck size={18} />
                </div>
              ) : lockIn.isLocked ? (
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#fef3c7',
                  color: '#b45309',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Lock size={16} />
                </div>
              ) : (
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#dcfce7',
                  color: '#15803d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Unlock size={16} />
                </div>
              )}

              <div>
                <div style={{
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  color: !isSold
                    ? '#1e40af'
                    : (lockIn.isLocked ? '#92400e' : '#166534'),
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span>3-Year Rental Policy:</span>
                  <span>
                    {!isSold
                      ? 'Available for Sale • 36-Month Rental Term Applies Upon Purchase'
                      : (lockIn.isLocked
                          ? `SOLD • 36-Month Rental Lock-in Active (${lockIn.remainingMonths || 36} Months Remaining)`
                          : '3-Year Term Fulfilled — Ready for Possession')}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                  {isSold
                    ? `Flat is SOLD and enrolled in Krishna Valley's 3-Year Guaranteed Rental Program. Physical possession scheduled after the 36-month lock-in period.`
                    : 'Unit is currently available for purchase.'}
                </div>
              </div>
            </div>

            {/* Progress Bar (36-month timeline) for enrolled/sold units */}
            {isSold && (
              <div style={{ minWidth: '180px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', fontWeight: '600' }}>
                  <span>Term: 36 Months</span>
                  <span>{lockIn.progressPercentage || 0}% Done</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${lockIn.progressPercentage || 0}%`,
                    height: '100%',
                    background: lockIn.isLocked ? 'linear-gradient(90deg, #f59e0b, #d97706)' : '#22c55e',
                    borderRadius: '3px',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* NAVIGATION TABS */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc',
          padding: '0 24px',
          overflowX: 'auto'
        }}>
          {[
            { id: 'overview', label: 'Unit Specifications', icon: Layers },
            { id: 'owner', label: isSold ? 'Owner & Purchase Dossier' : 'Sale Status', icon: User },
            { id: 'rental', label: 'Rental & Leases (3-Yr)', icon: Key },
            { id: 'history', label: `Chain of Title (${flat.ownershipHistory?.length || 0})`, icon: History },
            { id: 'possession', label: 'Possession Timeline', icon: Clock },
            { id: 'blueprints', label: `Blueprints (${flat.blueprints?.length || 0})`, icon: FileText }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive ? '2px solid #1a73e8' : '2px solid transparent',
                  color: isActive ? '#1a73e8' : '#64748b',
                  fontWeight: isActive ? '700' : '500',
                  fontSize: '0.84rem',
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
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
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
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Key Stats Row */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                    gap: '12px'
                  }}>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Floor Level</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
                        Floor {flat.floor || 1}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>{buildingName || flat.buildingName || 'Tower'}</div>
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

                  {/* Property Stacking Matrix Specs */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0f172a', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Layers size={16} color="#1a73e8" /> Architectural & Project Association
                    </h4>

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
                          {flat.flatNumber}
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
                            <RefreshCw size={18} color="#059669" /> Post-Possession Renewal & Pre-Possession Yield Dossier
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
                  {isSold ? (
                    <>
                      {/* Sold Banner */}
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
                              Unit Sold &amp; Registered
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#047857' }}>
                              Purchased / Allotted on {formatDate(sales?.booking?.bookingDate || sales?.convertedAt || flat.updatedAt)}
                            </div>
                          </div>
                        </div>

                        <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#065f46' }}>
                          Sales Status: <span style={{ textTransform: 'uppercase' }}>{sales?.salesStatus || 'Allotted & Agreement Signed'}</span>
                        </div>
                      </div>

                      {/* Owner Profile Card */}
                      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0f172a', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <User size={16} color="#1a73e8" /> Registered Property Owner Profile
                        </h4>

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
                            <span style={{ color: '#64748b' }}>Rental Program:</span>
                            <div style={{ fontWeight: '700', color: '#7e22ce', marginTop: '2px' }}>
                              Confirmed 36-Month Lock-in (Guaranteed Return)
                            </div>
                          </div>

                          <div>
                            <span style={{ color: '#64748b' }}>Aadhaar Number:</span>
                            <div style={{ fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                              {owner?.aadhaarNo || sales?.kyc?.aadhaarNumber ? `XXXX-XXXX-${(owner?.aadhaarNo || sales?.kyc?.aadhaarNumber).slice(-4)}` : 'Verified on Record'}
                            </div>
                          </div>

                          <div>
                            <span style={{ color: '#64748b' }}>Ownership Type:</span>
                            <div style={{ fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                              {owner?.ownerDetails?.ownershipType ? `${owner.ownerDetails.ownershipType.toUpperCase()} (100%)` : 'Individual (100%)'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Financial Deal & Booking Details */}
                      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0f172a', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Receipt size={16} color="#1a73e8" /> Booking &amp; Commercial Terms
                        </h4>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', fontSize: '0.84rem' }}>
                          <div>
                            <span style={{ color: '#64748b' }}>Agreed Deal Value:</span>
                            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#16a34a', marginTop: '2px' }}>
                              {formatINR(sales?.paymentPlan?.totalAmount || sales?.finalPrice || flat.basePrice)}
                            </div>
                          </div>

                          <div>
                            <span style={{ color: '#64748b' }}>Booking Advance / Payments Paid:</span>
                            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                              {formatINR(sales?.booking?.bookingAmount || sales?.paymentPlan?.bookingAmount || 100000)}
                            </div>
                          </div>

                          <div>
                            <span style={{ color: '#64748b' }}>Payment Plan Structure:</span>
                            <div style={{ fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                              {sales?.paymentPlan?.type?.toUpperCase() || '36-MONTH RENT-BACK LINKED'}
                            </div>
                          </div>

                          <div>
                            <span style={{ color: '#64748b' }}>Sale Agreement (BBA):</span>
                            <div style={{ fontWeight: '700', color: '#16a34a', marginTop: '2px' }}>
                              {sales?.agreement?.agreementNumber ? `Signed (${sales.agreement.agreementNumber})` : 'Confirmed BBA Allotment Signed'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{
                      textAlign: 'center',
                      padding: '40px 20px',
                      background: '#f8fafc',
                      borderRadius: '12px',
                      border: '1px dashed #cbd5e1'
                    }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: '#e0f2fe',
                        color: '#0284c7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px'
                      }}>
                        <Home size={24} />
                      </div>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a', margin: '0 0 6px' }}>
                        This Flat is Currently Available for Sale
                      </h4>
                      <p style={{ fontSize: '0.84rem', color: '#64748b', maxWidth: '420px', margin: '0 auto 16px' }}>
                        No buyer has reserved or purchased this unit yet. Base price is {formatINR(flat.basePrice)}. When purchased, the buyer is enrolled into the 3-Year Guaranteed Rental program before physical possession is scheduled.
                      </p>
                    </div>
                  )}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b21a8', fontWeight: '800', fontSize: '0.95rem' }}>
                      <ShieldCheck size={20} />
                      <span>Company Guaranteed Rent-Back Program (Lock-in Term)</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#581c87', lineHeight: '1.45' }}>
                      Under Krishna Valley covenants, the monthly rent is directly disbursed by <strong>Krishna Valley Developer / Treasury</strong> to the property owner. <strong>No tenant collections are involved</strong> for these investor units—all payouts are guaranteed and funded directly by the company.
                    </p>
                  </div>

                  {(rental || flat.takenForRental || flat.rentalDetails?.isRentBackActive || flat.rentalDetails?.guaranteedMonthlyRent > 0) ? (
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
                          const tdsAmount = Math.round(grossMonthly * 0.1);
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
                                <span style={{ color: '#64748b' }}>TDS Deducted (10% Sec 194I):</span>
                                <strong style={{ color: '#ef4444' }}>- {formatINR(tdsAmount)} / mo</strong>
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
                                <span style={{ color: '#64748b' }}>Tenure & Commitment:</span>
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
                            <Building2 size={16} color="#0284c7" /> Beneficiary Owner & Treasury Settlement
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
                  ) : (
                    <div style={{
                      textAlign: 'center',
                      padding: '36px 20px',
                      background: '#f8fafc',
                      borderRadius: '12px',
                      border: '1px dashed #cbd5e1'
                    }}>
                      <Key size={36} style={{ color: '#94a3b8', margin: '0 auto 10px' }} />
                      <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a', margin: '0 0 6px' }}>
                        No Active Lease Contract Recorded
                      </h4>
                      <p style={{ fontSize: '0.82rem', color: '#64748b', maxWidth: '420px', margin: '0 auto' }}>
                        This flat is not currently assigned to an active tenant or rent-back agreement in the Rental Management module.
                      </p>
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
                          <Key size={18} color="#f59e0b" /> Physical Possession & Handover Timeline
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

                    {lockIn?.possessionStatus === 'available_for_sale' ? (
                      /* Clean Pre-Purchase Policy Explanation for Available Flats */
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
                          This unit has not yet been purchased. Under Krishna Valley township rules, once a buyer books this flat, it will enter a <strong>mandatory 3-year (36-month) guaranteed rent-back term</strong>. During that time, the owner receives monthly rental yields, and physical possession is granted at the conclusion of the 36-month period.
                        </p>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', paddingTop: '6px', borderTop: '1px dashed #cbd5e1', fontSize: '0.78rem' }}>
                          <div>
                            <span style={{ color: '#64748b' }}>Rental Program Term:</span> <strong style={{ color: '#0f172a' }}>36 Months (3 Years)</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b' }}>Tenure Clock:</span> <strong style={{ color: '#0f172a' }}>Starts on Sale Agreement Date</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b' }}>Possession Handover:</span> <strong style={{ color: '#16a34a' }}>Eligible on 3-Year Maturity</strong>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Active Progress Visual for Enrolled/Sold Flats */
                      <div style={{
                        background: '#f8fafc',
                        borderRadius: '10px',
                        padding: '16px',
                        border: '1px solid #e2e8f0'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.82rem' }}>
                          <span style={{ color: '#64748b' }}>
                            Rental Start: <strong>{formatDate(lockIn?.rentalStartDate)}</strong>
                          </span>
                          <span style={{ color: '#64748b' }}>
                            3-Year Eligibility Date: <strong style={{ color: '#0f172a' }}>{formatDate(lockIn?.lockInEndDate)}</strong>
                          </span>
                        </div>

                        <div style={{ width: '100%', height: '10px', background: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${lockIn?.progressPercentage || 0}%`,
                            height: '100%',
                            background: lockIn?.isLocked ? 'linear-gradient(90deg, #f59e0b, #d97706)' : '#16a34a',
                            borderRadius: '5px',
                            transition: 'width 0.4s ease'
                          }} />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.75rem', color: '#64748b' }}>
                          <span>Elapsed: {lockIn?.elapsedDays || 0} days</span>
                          <strong style={{ color: lockIn?.isLocked ? '#b45309' : '#16a34a' }}>
                            {lockIn?.isLocked ? `${lockIn.remainingMonths} Months (${lockIn.remainingDays} Days) Remaining` : '100% Fulfilled'}
                          </strong>
                        </div>
                      </div>
                    )}

                    {/* Possession Milestone Schedule */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '0.82rem' }}>
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                        <span style={{ color: '#64748b' }}>Possession Readiness:</span>
                        <div style={{ fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                          {lockIn?.possessionStatus === 'available_for_sale'
                            ? 'PENDING SALE & ALLOTMENT'
                            : (sales?.possession?.status ? sales.possession.status.toUpperCase() : (lockIn?.isLocked ? 'NOT READY (LOCKED)' : 'ELIGIBLE'))}
                        </div>
                      </div>

                      <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                        <span style={{ color: '#64748b' }}>Scheduled Handover Date:</span>
                        <div style={{ fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                          {lockIn?.possessionStatus === 'available_for_sale'
                            ? 'TBD (Booking Date + 3 Years)'
                            : (sales?.possession?.scheduledDate ? formatDate(sales.possession.scheduledDate) : formatDate(lockIn?.lockInEndDate))}
                        </div>
                      </div>

                      <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                        <span style={{ color: '#64748b' }}>Key Handover Status:</span>
                        <div style={{ fontWeight: '800', color: sales?.possession?.possessionDate ? '#16a34a' : '#64748b', marginTop: '2px' }}>
                          {lockIn?.possessionStatus === 'available_for_sale'
                            ? 'With Project Management'
                            : (sales?.possession?.possessionDate ? `Completed on ${formatDate(sales.possession.possessionDate)}` : 'Keys With Property Management')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: BLUEPRINTS */}
              {activeTab === 'blueprints' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#0f172a' }}>
                      Blueprints & Architectural Layouts ({flat.blueprints?.length || 0})
                    </h4>
                  </div>

                  {!flat.blueprints || flat.blueprints.length === 0 ? (
                    <div style={{
                      padding: '40px 20px',
                      background: '#f8fafc',
                      border: '1px dashed #cbd5e1',
                      borderRadius: '12px',
                      textAlign: 'center',
                      color: '#64748b'
                    }}>
                      <FileText size={32} style={{ margin: '0 auto 8px', color: '#94a3b8' }} />
                      <p style={{ margin: '0 0 4px', fontSize: '0.88rem', fontWeight: '600', color: '#334155' }}>
                        No Blueprints Uploaded
                      </p>
                      <span style={{ fontSize: '0.78rem' }}>
                        Upload 2D/3D floor layouts and architectural drawings to attach to this unit.
                      </span>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
                      {flat.blueprints.map((bp, i) => (
                        <div key={i} style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: '10px',
                          padding: '16px',
                          background: '#ffffff',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}>
                          <div style={{ fontWeight: '700', fontSize: '0.86rem', color: '#1e293b' }}>
                            {bp.title || `Drawing #${i + 1}`}
                          </div>

                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            Type: <strong>{(bp.floorPlanType || '2D Layout').replace('_', ' ').toUpperCase()}</strong>
                          </div>

                          <a
                            href={bp.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              background: '#eff6ff',
                              color: '#1a73e8',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: '600',
                              textDecoration: 'none',
                              border: '1px solid #bfdbfe'
                            }}
                          >
                            <ExternalLink size={13} /> View Blueprint
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB: CHAIN OF TITLE & RESALE ARCHIVE */}
              {activeTab === 'history' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#f8fafc',
                    padding: '14px 18px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}>
                    <div>
                      <h4 style={{ margin: '0 0 2px', fontSize: '0.95rem', fontWeight: '800', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <History size={18} color="#1a73e8" /> Chain of Title & Resale Archive
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b' }}>
                        Chronological record of past owners, company buybacks, deal valuations, and ownership transfers.
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setIsImportHistoryModalOpen(true)}
                        style={{
                          padding: '6px 12px',
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          color: '#0284c7',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Upload size={14} /> Import History Excel
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsBuybackModalOpen(true)}
                        style={{
                          padding: '6px 14px',
                          background: '#16a34a',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 1px 3px rgba(22,163,74,0.3)'
                        }}
                      >
                        <RotateCcw size={14} /> Record Buyback / Resale
                      </button>
                    </div>
                  </div>

                  {/* Active Registered Owner Card */}
                  <div style={{
                    background: '#f0fdf4',
                    border: '1.5px solid #86efac',
                    borderRadius: '10px',
                    padding: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        background: '#dcfce7',
                        color: '#16a34a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <ShieldCheck size={22} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ fontSize: '0.96rem', color: '#14532d' }}>
                            {flat.currentOwner?.name || flat.salesDetails?.buyerName || 'Unassigned / Available'}
                          </strong>
                          <span style={{
                            fontSize: '0.68rem',
                            background: '#16a34a',
                            color: '#ffffff',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: '800'
                          }}>
                            ACTIVE OWNER (CURRENT)
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#166534', marginTop: '3px', display: 'flex', gap: '12px' }}>
                          <span>Mobile: {flat.currentOwner?.mobileNo || 'On File'}</span>
                          <span>•</span>
                          <span>Since: {formatDate(flat.currentOwner?.ownershipStartDate || flat.salesDetails?.bookingDate)}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.72rem', color: '#166534', fontWeight: '600' }}>Active Deal Value:</span>
                      <div style={{ fontSize: '1.15rem', fontWeight: '900', color: '#15803d' }}>
                        {formatINR(flat.salesDetails?.agreedDealPrice || flat.basePrice)}
                      </div>
                    </div>
                  </div>

                  {/* Historical Ownership Trail */}
                  <div>
                    <h5 style={{ margin: '14px 0 10px', fontSize: '0.84rem', color: '#334155', fontWeight: '800' }}>
                      Historical Owners & Buybacks ({flat.ownershipHistory?.length || 0})
                    </h5>

                    {!flat.ownershipHistory || flat.ownershipHistory.length === 0 ? (
                      <div style={{
                        padding: '30px 16px',
                        background: '#f8fafc',
                        border: '1px dashed #cbd5e1',
                        borderRadius: '10px',
                        textAlign: 'center',
                        color: '#64748b'
                      }}>
                        <p style={{ margin: '0 0 4px', fontSize: '0.84rem', fontWeight: '600', color: '#334155' }}>
                          First-Hand Unit (No Previous Resale Records)
                        </p>
                        <span style={{ fontSize: '0.76rem' }}>
                          Any future buybacks or transfers will be automatically archived here.
                        </span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {flat.ownershipHistory.map((h, i) => (
                          <div
                            key={i}
                            style={{
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              padding: '12px 16px',
                              background: '#ffffff',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: '10px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: '#f1f5f9',
                                color: '#475569',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.78rem',
                                fontWeight: '800'
                              }}>
                                #{i + 1}
                              </div>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <strong style={{ fontSize: '0.88rem', color: '#1e293b' }}>{h.name}</strong>
                                  <span style={{
                                    fontSize: '0.68rem',
                                    background: h.transferReason === 'buyback' ? '#fef3c7' : '#e0f2fe',
                                    color: h.transferReason === 'buyback' ? '#92400e' : '#0369a1',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    fontWeight: '700',
                                    textTransform: 'uppercase'
                                  }}>
                                    {h.transferReason || 'RESALE'}
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                                  {formatDate(h.ownershipStartDate)} ➔ {formatDate(h.ownershipEndDate || h.transferDate)} ({h.mobileNo})
                                </div>
                                {h.remarks && (
                                  <div style={{ fontSize: '0.72rem', color: '#475569', fontStyle: 'italic', marginTop: '2px' }}>
                                    "{h.remarks}"
                                  </div>
                                )}
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
          padding: '16px 24px',
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
            {onEditFlat && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditFlat(flat);
                }}
                style={{
                  padding: '8px 16px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  color: '#0f172a',
                  cursor: 'pointer'
                }}
              >
                Edit Flat Specifications
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 20px',
                background: '#1a73e8',
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
