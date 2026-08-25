import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { rentalService } from '../../services/rentalService.js';
import { ManualRentalModal } from '../../components/rentals/ManualRentalModal.jsx';
import { RentalDetailModal } from '../../components/rentals/RentalDetailModal.jsx';
import { StatusBadge } from '../../components/common/StatusBadge.jsx';
import { ModuleMessagingCenter } from '../../components/notifications/ModuleMessagingCenter.jsx';
import { QuickMessageModal } from '../../components/notifications/QuickMessageModal.jsx';

import {
  Home,
  Repeat,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Search,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  ArrowRight,
  User,
  Key,
  Calendar,
  Building2,
  MessageSquare,
  Zap,
  Send
} from 'lucide-react';

export const RentalsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  
  const getTabFromParam = (param) => {
    if (param === 'messaging') return 'messaging';
    if (param === 'rentback') return 'rentback';
    return 'contracts';
  };

  const [rentalViewTab, setRentalViewTab] = useState(getTabFromParam(tabParam));

  useEffect(() => {
    setRentalViewTab(getTabFromParam(tabParam));
  }, [tabParam]);

  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [rentBackFilter, setRentBackFilter] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);

  // Quick Message Modal
  const [quickMsgRental, setQuickMsgRental] = useState(null);
  const [isQuickMsgModalOpen, setIsQuickMsgModalOpen] = useState(false);

  const fetchRentals = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      if (rentBackFilter) params.rentBack = rentBackFilter;

      const res = await rentalService.getRentals(params);
      if (res.data) setRentals(res.data);
    } catch (error) {
      console.error('Error fetching rentals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRentals();
  }, [statusFilter, rentBackFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRentals();
  };

  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(val) || 0);
  };

  // CRUD Handlers
  const handleSaveContract = async (data) => {
    try {
      if (editingContract) {
        await rentalService.updateRental(editingContract._id, data);
        alert('Rental contract updated successfully!');
      } else {
        await rentalService.createRental(data);
        alert('Rental contract initialized & unit reserved!');
      }
      setIsCreateModalOpen(false);
      setEditingContract(null);
      fetchRentals();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteContract = async (contract) => {
    if (window.confirm(`Delete rental contract for "${contract.tenantAgreement?.tenantName || 'Unit'}"?`)) {
      try {
        await rentalService.deleteRental(contract._id);
        fetchRentals();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  // Lifecycle Updates
  const handleUpdateTenant = async (data) => {
    try {
      await rentalService.updateTenantAgreement(selectedContract._id, data);
      alert('Tenant agreement and lease terms saved!');
      refreshSelectedContract();
      fetchRentals();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateRentBack = async (data) => {
    try {
      await rentalService.updateRentBack(selectedContract._id, data);
      alert('Rent-Back guaranteed payout terms saved!');
      refreshSelectedContract();
      fetchRentals();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUploadRentBackDoc = async (id, formData) => {
    try {
      await rentalService.uploadRentBackDoc(id || selectedContract?._id, formData);
      alert('Rent-Back agreement uploaded to S3!');
      refreshSelectedContract();
      fetchRentals();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUploadTenantAgreementDoc = async (id, formData) => {
    try {
      await rentalService.uploadTenantAgreementDoc(id || selectedContract?._id, formData);
      alert('Tenant lease agreement uploaded to S3!');
      refreshSelectedContract();
      fetchRentals();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateAllocation = async (id, data) => {
    try {
      await rentalService.updateAllocation(id || selectedContract?._id, data);
      alert('Unit allocation status updated!');
      refreshSelectedContract();
      fetchRentals();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRecordDepositPayment = async (id, data) => {
    try {
      await rentalService.recordDepositPayment(id || selectedContract?._id, data);
      alert('Security deposit payment recorded!');
      refreshSelectedContract();
      fetchRentals();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddPenalty = async (data) => {
    try {
      await rentalService.addPenalty(selectedContract._id, data);
      alert('Late payment penalty charged!');
      refreshSelectedContract();
      fetchRentals();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleTerminateContract = async (id) => {
    if (window.confirm('Process lease termination and vacate this property unit?')) {
      try {
        await rentalService.terminateContract(id || selectedContract?._id);
        alert('Tenancy terminated & unit status updated.');
        setIsDetailModalOpen(false);
        fetchRentals();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleProcessTermination = async (data) => {
    return handleTerminateContract(selectedContract?._id);
  };

  const refreshSelectedContract = async () => {
    if (selectedContract) {
      const res = await rentalService.getRentalById(selectedContract._id);
      if (res.data) setSelectedContract(res.data);
    }
  };

  // Metrics
  const totalCount = rentals.length;
  let rentBackCount = 0;
  let totalTenantMonthlyInflow = 0;
  let totalOwnerMonthlyOutflow = 0;

  rentals.forEach((r) => {
    if (r.rentBack?.enabled) {
      rentBackCount++;
      totalOwnerMonthlyOutflow += (r.rentBack?.monthlyRent || 0);
    }
    totalTenantMonthlyInflow += (r.tenantAgreement?.monthlyRent || 0);
  });

  const netMonthlySpread = totalTenantMonthlyInflow - totalOwnerMonthlyOutflow;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Header Banner */}
      <div className="g-card" style={{
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#111827', display: 'flex', alignItems: 'center', gap: '12px' }}>
            Rental Management & Guaranteed Rent-Back
            <span style={{ fontSize: '0.74rem', background: '#e8f0fe', color: '#1a73e8', padding: '3px 10px', borderRadius: '6px', fontWeight: '700' }}>
              LEASE HUB
            </span>
          </div>
          <div style={{ fontSize: '0.88rem', color: '#4b5563', marginTop: '4px', fontWeight: '500' }}>
            Manage tenancy agreements, assured return payouts to buyers, security deposits, and rent collection reminders.
          </div>
        </div>

        {/* View Switcher Ribbon & Action Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: '#f3f4f5', padding: '4px', borderRadius: '8px', border: '1px solid #dadce0', gap: '6px' }}>
            <button
              type="button"
              onClick={() => {
                setRentalViewTab('contracts');
                setSearchParams({ tab: 'contracts' });
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                background: rentalViewTab === 'contracts' ? '#1a73e8' : 'transparent',
                color: rentalViewTab === 'contracts' ? '#ffffff' : '#4b5563',
                fontWeight: rentalViewTab === 'contracts' ? '800' : '600',
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <Repeat size={14} /> Rental Contracts ({rentals.length})
            </button>

            <button
              type="button"
              onClick={() => {
                setRentalViewTab('rentback');
                setSearchParams({ tab: 'rentback' });
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                background: rentalViewTab === 'rentback' ? '#1a73e8' : 'transparent',
                color: rentalViewTab === 'rentback' ? '#ffffff' : '#4b5563',
                fontWeight: rentalViewTab === 'rentback' ? '800' : '600',
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <ShieldCheck size={14} /> Guaranteed Yields ({rentBackCount})
            </button>

            <button
              type="button"
              onClick={() => {
                setRentalViewTab('messaging');
                setSearchParams({ tab: 'messaging' });
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                background: rentalViewTab === 'messaging' ? '#1a73e8' : 'transparent',
                color: rentalViewTab === 'messaging' ? '#ffffff' : '#4b5563',
                fontWeight: rentalViewTab === 'messaging' ? '800' : '600',
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <MessageSquare size={14} /> Tenant Messaging Hub
            </button>
          </div>

          <button
            onClick={() => {
              setEditingContract(null);
              setIsCreateModalOpen(true);
            }}
            className="btn-primary"
            style={{ padding: '10px 20px', fontSize: '0.88rem' }}
          >
            <Plus size={16} /> New Rental Contract
          </button>
        </div>
      </div>

      {/* ================= TAB 1: CONTRACTS ================= */}
      {rentalViewTab === 'contracts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {/* Top Metrics Ribbon */}
          <div className="grid-cols-5">
            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>ACTIVE CONTRACTS</span>
                <div style={{ padding: '6px', borderRadius: '6px', background: '#e8f0fe', color: '#1a73e8' }}>
                  <Repeat size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#111827', marginTop: '4px' }}>{totalCount}</div>
              <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>Units in rental pool</span>
            </div>

            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>RENT-BACK UNITS</span>
                <div style={{ padding: '6px', borderRadius: '6px', background: '#f3e8ff', color: '#8b5cf6' }}>
                  <ShieldCheck size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#8b5cf6', marginTop: '4px' }}>{rentBackCount}</div>
              <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>Guaranteed investor payout</span>
            </div>

            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>TENANT RENT INFLOW</span>
                <div style={{ padding: '6px', borderRadius: '6px', background: '#e6f4ea', color: '#137333' }}>
                  <DollarSign size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#137333', marginTop: '4px' }}>{formatINR(totalTenantMonthlyInflow)}</div>
              <span style={{ fontSize: '0.74rem', color: '#137333', fontWeight: '700' }}>Monthly gross collection</span>
            </div>

            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>OWNER RENT-BACK PAYOUT</span>
                <div style={{ padding: '6px', borderRadius: '6px', background: '#fef7e0', color: '#b06000' }}>
                  <TrendingUp size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#b06000', marginTop: '4px' }}>{formatINR(totalOwnerMonthlyOutflow)}</div>
              <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>Monthly assured returns</span>
            </div>

            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>NET SPREAD MARGIN</span>
                <div style={{ padding: '6px', borderRadius: '6px', background: netMonthlySpread >= 0 ? '#e6f4ea' : '#ffdad6', color: netMonthlySpread >= 0 ? '#137333' : '#ba1a1a' }}>
                  <DollarSign size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: netMonthlySpread >= 0 ? '#137333' : '#ba1a1a', marginTop: '4px' }}>
                {netMonthlySpread >= 0 ? `+${formatINR(netMonthlySpread)}` : formatINR(netMonthlySpread)}
              </div>
              <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>Company net monthly yield</span>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="g-card" style={{
            padding: '12px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '260px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#4b5563' }} />
                <input
                  type="text"
                  placeholder="Search by tenant name, phone, contract code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    background: '#f8f9fa',
                    border: '1px solid #dadce0',
                    borderRadius: '6px',
                    color: '#111827',
                    fontWeight: '600',
                    fontSize: '0.85rem'
                  }}
                />
              </div>
              <button
                type="submit"
                style={{ padding: '8px 14px', background: '#1a73e8', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer' }}
              >
                Search
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: '8px 12px', background: '#f8f9fa', border: '1px solid #dadce0', borderRadius: '6px', color: '#111827', fontWeight: '600', fontSize: '0.82rem', cursor: 'pointer' }}
              >
                <option value="">All Contract Statuses</option>
                <option value="draft">Draft</option>
                <option value="active">Active Tenancy</option>
                <option value="expired">Expired</option>
                <option value="terminated">Terminated</option>
              </select>

              <select
                value={rentBackFilter}
                onChange={(e) => setRentBackFilter(e.target.value)}
                style={{ padding: '8px 12px', background: '#f8f9fa', border: '1px solid #dadce0', borderRadius: '6px', color: '#111827', fontWeight: '600', fontSize: '0.82rem', cursor: 'pointer' }}
              >
                <option value="">All Rental Types</option>
                <option value="true">Guaranteed Rent-Back Only</option>
                <option value="false">Standard Tenant Rental</option>
              </select>

              <button
                onClick={fetchRentals}
                title="Refresh Rental Contracts"
                style={{ padding: '7px 10px', background: '#f3f4f5', border: '1px solid #dadce0', borderRadius: '6px', color: '#111827', cursor: 'pointer' }}
              >
                <RefreshCw size={14} className={loading ? 'spin' : ''} />
              </button>
            </div>
          </div>

          {/* Rental Cards Grid */}
          {rentals.length === 0 ? (
            <div className="g-card" style={{ textAlign: 'center', padding: '50px 20px' }}>
              <Repeat size={40} style={{ opacity: 0.3, margin: '0 auto 12px', color: '#4b5563' }} />
              <h3 style={{ color: '#111827', marginBottom: '6px', fontWeight: '800' }}>No Rental Contracts Found</h3>
              <p style={{ fontSize: '0.85rem', color: '#4b5563', marginBottom: '16px', fontWeight: '500' }}>
                Create your first rental management contract to assign tenants and configure Rent-Back guaranteed returns.
              </p>
              <button
                onClick={() => {
                  setEditingContract(null);
                  setIsCreateModalOpen(true);
                }}
                style={{
                  padding: '9px 18px',
                  background: '#1a73e8',
                  color: '#ffffff',
                  fontWeight: '700',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  border: 'none'
                }}
              >
                <Plus size={14} /> Add First Contract
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {rentals.map((r) => {
                const tenant = r.tenantAgreement || {};
                const rentBack = r.rentBack || {};
                const cleanPhone = tenant.tenantPhone ? tenant.tenantPhone.replace(/[^0-9]/g, '') : '';
                const penalties = r.penaltyRecords || [];

                return (
                  <div
                    key={r._id}
                    className="g-card"
                    style={{
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      position: 'relative'
                    }}
                  >
                    {/* Header: Contract Code & Status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#111827' }}>
                            {r.contractCode || `RENT-${r._id.slice(-6).toUpperCase()}`}
                          </h3>
                          {r.isMultiUnit || (r.flatIds && r.flatIds.length > 1) ? (
                            <span style={{
                              fontSize: '0.68rem',
                              background: '#f3e8ff',
                              color: '#8b5cf6',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: '800',
                              border: '1px solid #e9d5ff',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}>
                              <Building2 size={11} /> {r.flatIds?.length || r.leasedUnits?.length || r.totalUnitsCount || 2} UNITS BUNDLE
                            </span>
                          ) : null}
                          {rentBack.enabled && (
                            <span style={{
                              fontSize: '0.68rem',
                              background: '#e8f0fe',
                              color: '#1a73e8',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: '800',
                              border: '1px solid #d2e3fc'
                            }}>
                              RENT-BACK
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#4b5563', marginTop: '2px', fontWeight: '500' }}>
                          Created: {new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </div>

                      <StatusBadge status={r.status} />
                    </div>

                    {/* Property Unit Details */}
                    <div style={{
                      background: '#f8f9fa',
                      border: '1px solid #dadce0',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.78rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#111827', fontWeight: '700', flexWrap: 'wrap' }}>
                        {r.isMultiUnit || (r.flatIds && r.flatIds.length > 1) ? (
                          <>
                            <Building2 size={14} color="#8b5cf6" />
                            <span>
                              Flats: {r.flatIds?.map((f) => f.flatNumber || f).join(', ') || (r.leasedUnits?.map((u) => u.flatNumber).join(', ')) || `Flat ${r.flatId?.flatNumber}`}
                            </span>
                          </>
                        ) : (
                          <>
                            <Home size={14} color="#1a73e8" />
                            <span>Flat {r.flatId?.flatNumber || 'Unit'}</span>
                          </>
                        )}
                        {r.projectId?.projectName && (
                          <span style={{ color: '#4b5563', fontWeight: '600' }}>• {r.projectId.projectName}</span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#4b5563', fontWeight: '600' }}>
                        Due: {tenant.rentDueDay ? `Day ${tenant.rentDueDay}` : '1st of month'}
                      </span>
                    </div>

                    {/* Tenant & Rent Breakdown */}
                    <div style={{
                      background: '#f8f9fa',
                      border: '1px solid #dadce0',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '5px',
                      fontSize: '0.78rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#4b5563', fontWeight: '600' }}>Tenant:</span>
                        <strong style={{ color: '#111827' }}>{tenant.tenantName || 'Not Assigned'}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#4b5563', fontWeight: '600' }}>Monthly Rent:</span>
                        <strong style={{ color: '#137333', fontSize: '0.88rem' }}>{formatINR(tenant.monthlyRent)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#4b5563', fontWeight: '600' }}>Deposit Held:</span>
                        <span style={{ color: '#111827', fontWeight: '700' }}>{formatINR(tenant.depositAmount)}</span>
                      </div>
                      {rentBack.enabled && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #dadce0', paddingTop: '4px', marginTop: '2px' }}>
                          <span style={{ color: '#8b5cf6', fontWeight: '700' }}>Owner Payout:</span>
                          <strong style={{ color: '#8b5cf6' }}>{formatINR(rentBack.monthlyRent)}</strong>
                        </div>
                      )}
                    </div>

                    {/* Direct Contact Actions */}
                    {tenant.tenantPhone && (
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        background: '#f8f9fa',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: '1px solid #dadce0'
                      }}>
                        <a
                          href={`tel:${tenant.tenantPhone}`}
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                            padding: '5px',
                            background: '#e8f0fe',
                            color: '#1a73e8',
                            borderRadius: '4px',
                            textDecoration: 'none',
                            fontSize: '0.75rem',
                            fontWeight: '700'
                          }}
                        >
                          <User size={12} /> {tenant.tenantPhone}
                        </a>

                        <a
                          href={`https://wa.me/${cleanPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="WhatsApp Tenant"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            padding: '5px 10px',
                            background: '#e6f4ea',
                            color: '#137333',
                            borderRadius: '4px',
                            textDecoration: 'none',
                            fontSize: '0.75rem',
                            fontWeight: '700'
                          }}
                        >
                          <MessageSquare size={12} /> WhatsApp
                        </a>
                      </div>
                    )}

                    {/* Action Footer */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderTop: '1px solid #dadce0',
                      paddingTop: '10px',
                      gap: '8px'
                    }}>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickMsgRental(r);
                          setIsQuickMsgModalOpen(true);
                        }}
                        style={{
                          padding: '6px 12px',
                          background: '#e6f4ea',
                          border: '1px solid #ceead6',
                          color: '#137333',
                          fontWeight: '700',
                          borderRadius: '6px',
                          fontSize: '0.76rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          cursor: 'pointer'
                        }}
                      >
                        <Zap size={13} /> Send Notice
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedContract(r);
                          setIsDetailModalOpen(true);
                        }}
                        style={{
                          padding: '6px 14px',
                          background: '#1a73e8',
                          color: '#ffffff',
                          fontWeight: '700',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          cursor: 'pointer',
                          border: 'none'
                        }}
                      >
                        Manage Lease <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: GUARANTEED RENT-BACK YIELDS ================= */}
      {rentalViewTab === 'rentback' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Rent-Back Financial Overview Ribbon */}
          <div className="grid-cols-4">
            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>RENT-BACK UNITS</span>
                <div style={{ padding: '6px', borderRadius: '6px', background: '#f3e8ff', color: '#8b5cf6' }}>
                  <ShieldCheck size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#8b5cf6', marginTop: '4px' }}>{rentBackCount}</div>
              <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>Active guaranteed payout pool</span>
            </div>

            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>INVESTOR ASSURED PAYOUT</span>
                <div style={{ padding: '6px', borderRadius: '6px', background: '#fef7e0', color: '#b06000' }}>
                  <TrendingUp size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#b06000', marginTop: '4px' }}>{formatINR(totalOwnerMonthlyOutflow)}</div>
              <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>Monthly assured owner commitment</span>
            </div>

            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>TENANT RENT INFLOW</span>
                <div style={{ padding: '6px', borderRadius: '6px', background: '#e6f4ea', color: '#137333' }}>
                  <DollarSign size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#137333', marginTop: '4px' }}>{formatINR(totalTenantMonthlyInflow)}</div>
              <span style={{ fontSize: '0.74rem', color: '#137333', fontWeight: '700' }}>Monthly gross tenancy collection</span>
            </div>

            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>COMPANY NET SPREAD</span>
                <div style={{ padding: '6px', borderRadius: '6px', background: netMonthlySpread >= 0 ? '#e6f4ea' : '#ffdad6', color: netMonthlySpread >= 0 ? '#137333' : '#ba1a1a' }}>
                  <DollarSign size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: netMonthlySpread >= 0 ? '#137333' : '#ba1a1a', marginTop: '4px' }}>
                {netMonthlySpread >= 0 ? `+${formatINR(netMonthlySpread)}` : formatINR(netMonthlySpread)}
              </div>
              <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>Net monthly yield profit</span>
            </div>
          </div>

          {/* Rent-Back Units Ledger */}
          <div className="g-card" style={{ overflow: 'hidden' }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={18} color="#8b5cf6" /> Guaranteed Yields & Rent-Back Register ({rentBackCount})
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#4b5563', marginTop: '2px' }}>
                  Assured return contracts with fixed investor disbursements and tenant rent spreads.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchRentals}
                style={{ padding: '6px 12px', background: '#f3f4f5', border: '1px solid #dadce0', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh Yields
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Contract & Unit</th>
                    <th>Investor / Owner</th>
                    <th>Assured Monthly Payout</th>
                    <th>Tenant Inflow</th>
                    <th>Net Spread</th>
                    <th>Lease Tenure</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rentals.filter((r) => r.rentBack?.enabled).length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: '#4b5563' }}>
                        No guaranteed rent-back units found in the system.
                      </td>
                    </tr>
                  ) : (
                    rentals.filter((r) => r.rentBack?.enabled).map((r) => {
                      const rb = r.rentBack || {};
                      const tenant = r.tenantAgreement || {};
                      const spread = (tenant.monthlyRent || 0) - (rb.monthlyRent || 0);

                      return (
                        <tr key={r._id}>
                          <td>
                            <div style={{ fontWeight: '700', color: '#111827' }}>
                              {r.contractCode || `RENT-${r._id.slice(-6).toUpperCase()}`}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#1a73e8', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                              <Building2 size={12} />
                              {r.flatId?.unitNumber || (r.flatIds && r.flatIds.length > 1 ? `${r.flatIds.length} Bundled Units` : 'Assigned Unit')} • {r.projectId?.name || 'Krishna Valley'}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: '700', color: '#111827' }}>
                              {rb.ownerName || r.customerId?.name || 'Property Investor'}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#4b5563' }}>
                              {rb.ownerPhone || r.customerId?.mobileNo || 'Contact on File'}
                            </div>
                          </td>
                          <td style={{ fontWeight: '800', color: '#b06000', fontSize: '0.92rem' }}>
                            {formatINR(rb.monthlyRent || 0)}
                            <div style={{ fontSize: '0.7rem', color: '#4b5563', fontWeight: '500' }}>
                              Day {rb.payoutDayOfMonth || 5} of every month
                            </div>
                          </td>
                          <td style={{ fontWeight: '800', color: '#137333', fontSize: '0.92rem' }}>
                            {formatINR(tenant.monthlyRent || 0)}
                            <div style={{ fontSize: '0.7rem', color: '#4b5563', fontWeight: '500' }}>
                              {tenant.tenantName ? `Tenant: ${tenant.tenantName}` : 'Vacant Unit'}
                            </div>
                          </td>
                          <td style={{ fontWeight: '800', color: spread >= 0 ? '#137333' : '#ba1a1a', fontSize: '0.92rem' }}>
                            {spread >= 0 ? `+${formatINR(spread)}` : formatINR(spread)}
                            <div style={{ fontSize: '0.7rem', color: '#4b5563', fontWeight: '500' }}>
                              Margin / mo
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.78rem', color: '#111827', fontWeight: '600' }}>
                              {rb.startDate ? new Date(rb.startDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'Jan 2026'} ➔ {rb.endDate ? new Date(rb.endDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'Dec 2028'}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#8b5cf6', fontWeight: '700', marginTop: '2px' }}>
                              Assured Lock-in
                            </div>
                          </td>
                          <td>
                            <StatusBadge status={r.status || 'active'} />
                          </td>
                          <td>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedContract(r);
                                setIsDetailModalOpen(true);
                              }}
                              style={{
                                padding: '6px 12px',
                                background: '#1a73e8',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '0.76rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              Manage Lease <ArrowRight size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: TENANT MESSAGING HUB ================= */}
      {rentalViewTab === 'messaging' && (
        <ModuleMessagingCenter
          module="rentals"
          records={rentals}
        />
      )}

      {/* CREATE / EDIT RENTAL MODAL */}
      <ManualRentalModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleSaveContract}
        rental={editingContract}
      />

      {/* RENTAL DETAIL & LEASE COMMAND CENTER MODAL */}
      <RentalDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        contract={selectedContract}
        rental={selectedContract}
        onUploadRentBackDoc={handleUploadRentBackDoc}
        onUploadTenantAgreementDoc={handleUploadTenantAgreementDoc}
        onUpdateAllocation={handleUpdateAllocation}
        onRecordDepositPayment={handleRecordDepositPayment}
        onTerminateContract={handleTerminateContract}
        onUpdateTenant={handleUpdateTenant}
        onUpdateRentBack={handleUpdateRentBack}
        onAddPenalty={handleAddPenalty}
        onProcessTermination={handleProcessTermination}
      />

      {/* QUICK MESSAGE MODAL */}
      <QuickMessageModal
        isOpen={isQuickMsgModalOpen}
        onClose={() => setIsQuickMsgModalOpen(false)}
        record={quickMsgRental}
        module="rentals"
      />

    </div>
  );
};
