import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { rentalService } from '../../services/rentalService.js';
import { projectService } from '../../services/projectService.js';
import { ManualRentalModal } from '../../components/rentals/ManualRentalModal.jsx';
import { RentalDetailModal } from '../../components/rentals/RentalDetailModal.jsx';
import { RentalLedgerModal } from '../../components/rentals/RentalLedgerModal.jsx';
import { ImportRentalLedgerModal } from '../../components/rentals/ImportRentalLedgerModal.jsx';
import { BulkEnrollRentalModal } from '../../components/rentals/BulkEnrollRentalModal.jsx';
import { StatusBadge } from '../../components/common/StatusBadge.jsx';
import { ModuleMessagingCenter } from '../../components/notifications/ModuleMessagingCenter.jsx';
import { QuickMessageModal } from '../../components/notifications/QuickMessageModal.jsx';
import { TableSkeleton, CardGridSkeleton } from '../../components/common/SkeletonLoader.jsx';
import { EmptyState } from '../../components/common/EmptyState.jsx';
import { useToast } from '../../context/ToastContext.jsx';

import * as XLSX from 'xlsx';
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
  Send,
  FileSpreadsheet,
  BookOpen,
  Printer,
  Download,
  Filter,
  Sparkles,
  Layers,
  CheckCircle2
} from 'lucide-react';

export const RentalsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  
  const getTabFromParam = (param) => {
    if (param === 'messaging') return 'messaging';
    if (param === 'rentback') return 'rentback';
    if (param === 'units' || param === 'pool') return 'units';
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
  const toast = useToast();

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);

  // 36-Month Rental Ledger Modal
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [ledgerContract, setLedgerContract] = useState(null);

  // Rental Due Day Filter & Search for Printing / Batch Payouts
  const [dueDayFilter, setDueDayFilter] = useState('all'); // 'all', '5', '10', '15', '20', '25', or custom
  const [customDueDay, setCustomDueDay] = useState('');
  const [ledgerSearch, setLedgerSearch] = useState('');

  // Import Rental Ledger Excel Modal
  const [isImportLedgerModalOpen, setIsImportLedgerModalOpen] = useState(false);

  // Quick Message Modal
  const [quickMsgRental, setQuickMsgRental] = useState(null);
  const [isQuickMsgModalOpen, setIsQuickMsgModalOpen] = useState(false);

  // 3-Year Rental Units Pool State
  const [rentalFlats, setRentalFlats] = useState([]);
  const [loadingRentalFlats, setLoadingRentalFlats] = useState(false);
  const [unitsSearchTerm, setUnitsSearchTerm] = useState('');
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);

  const fetchRentalUnits = async () => {
    setLoadingRentalFlats(true);
    try {
      const res = await projectService.getFlats();
      const allFlats = res.data || (Array.isArray(res) ? res : []);
      const pool = allFlats.filter(f =>
        f.takenForRental ||
        (f.status || '').toLowerCase() === 'leased' ||
        Boolean(f.rentalContract) ||
        Boolean(f.rentalDetails?.monthlyRent)
      );
      setRentalFlats(pool.length > 0 ? pool : allFlats);
    } catch (err) {
      console.error('Error loading rental flats:', err);
      toast.error('Failed to load rental units pool');
    } finally {
      setLoadingRentalFlats(false);
    }
  };

  useEffect(() => {
    if (rentalViewTab === 'units') {
      fetchRentalUnits();
    }
  }, [rentalViewTab]);

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
      toast.error('Failed to fetch rental contracts');
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
        toast.success('Rental contract updated successfully!');
      } else {
        await rentalService.createRental(data);
        toast.success('Rental contract initialized & unit reserved!');
      }
      setIsCreateModalOpen(false);
      setEditingContract(null);
      fetchRentals();
    } catch (err) {
      toast.error(err.message || 'Failed to save rental contract');
    }
  };

  const handleDeleteContract = async (contract) => {
    if (window.confirm(`Delete rental contract for "${contract.tenantAgreement?.tenantName || 'Unit'}"?`)) {
      try {
        await rentalService.deleteRental(contract._id);
        toast.success('Rental contract deleted successfully');
        fetchRentals();
      } catch (err) {
        toast.error(err.message || 'Failed to delete contract');
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
  let totalMonthlyGrossPayouts = 0;
  let totalMonthlyTds = 0;
  let totalMonthlyNetDisbursed = 0;
  let total36MonthCommitment = 0;

  rentals.forEach((r) => {
    rentBackCount++;
    const gross = Number(r.rentBack?.monthlyRent || 31000);
    const applyTds = r.rentBack?.applyTds !== false;
    const tdsRate = applyTds ? ((Number(r.rentBack?.tdsPercentage) >= 0 ? Number(r.rentBack?.tdsPercentage) : 10) / 100) : 0;
    const tds = Math.round(gross * tdsRate);
    const net = gross - tds;
    const tenure = Number(r.rentBack?.tenureMonths) || 36;

    totalMonthlyGrossPayouts += gross;
    totalMonthlyTds += tds;
    totalMonthlyNetDisbursed += net;
    total36MonthCommitment += (net * tenure);
  });

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
            36-Month Guaranteed Rent-Back Hub
            <span style={{ fontSize: '0.74rem', background: '#ecfdf5', color: '#059669', padding: '3px 10px', borderRadius: '6px', fontWeight: '700', border: '1px solid #a7f3d0' }}>
              DEVELOPER DISBURSEMENTS
            </span>
          </div>
          <div style={{ fontSize: '0.88rem', color: '#4b5563', marginTop: '4px', fontWeight: '500' }}>
            Manage 3-year guaranteed return payouts to property owners, TDS withholdings, and monthly bank transfer ledgers.
          </div>
        </div>

        {/* View Switcher Ribbon & Action Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: '#f3f4f5', padding: '4px', borderRadius: '8px', border: '1px solid #dadce0', gap: '6px' }}>
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
              <BookOpen size={14} /> 36-Month Rental Ledger ({rentBackCount})
            </button>

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
              <Repeat size={14} /> All Rent-Back Agreements ({rentals.length})
            </button>

            <button
              type="button"
              onClick={() => {
                setRentalViewTab('units');
                setSearchParams({ tab: 'units' });
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                background: rentalViewTab === 'units' ? '#1a73e8' : 'transparent',
                color: rentalViewTab === 'units' ? '#ffffff' : '#4b5563',
                fontWeight: rentalViewTab === 'units' ? '800' : '600',
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <Sparkles size={14} /> Rental Units Pool ({rentalFlats.length || '•'})
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
              <MessageSquare size={14} /> Owner Messaging Hub
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsImportLedgerModalOpen(true)}
            style={{
              padding: '9px 16px',
              background: '#16a34a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '700',
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(22, 163, 74, 0.25)'
            }}
          >
            <FileSpreadsheet size={16} /> Upload Rental Ledger Excel
          </button>

          <button
            onClick={() => {
              setEditingContract(null);
              setIsCreateModalOpen(true);
            }}
            className="btn-primary"
            style={{ padding: '9px 18px', fontSize: '0.82rem' }}
          >
            <Plus size={16} /> New Rent-Back Agreement
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
                <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>RENT-BACK UNITS</span>
                <div style={{ padding: '6px', borderRadius: '6px', background: '#e8f0fe', color: '#1a73e8' }}>
                  <Repeat size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#111827', marginTop: '4px' }}>{totalCount}</div>
              <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>Active 3-year commitments</span>
            </div>

            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>MONTHLY GROSS DISBURSEMENTS</span>
                <div style={{ padding: '6px', borderRadius: '6px', background: '#f3e8ff', color: '#7c3aed' }}>
                  <DollarSign size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#7c3aed', marginTop: '4px' }}>{formatINR(totalMonthlyGrossPayouts)}</div>
              <span style={{ fontSize: '0.74rem', color: '#6b21a8', fontWeight: '600' }}>Total developer rent commitment</span>
            </div>

            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>MONTHLY TDS DEDUCTED</span>
                <div style={{ padding: '6px', borderRadius: '6px', background: '#fee2e2', color: '#ef4444' }}>
                  <TrendingUp size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#ef4444', marginTop: '4px' }}>{formatINR(totalMonthlyTds)}</div>
              <span style={{ fontSize: '0.74rem', color: '#b91c1c', fontWeight: '600' }}>Tax withholdings</span>
            </div>

            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>NET TRANSFERS TO OWNERS</span>
                <div style={{ padding: '6px', borderRadius: '6px', background: '#e6f4ea', color: '#137333' }}>
                  <ShieldCheck size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#137333', marginTop: '4px' }}>{formatINR(totalMonthlyNetDisbursed)}</div>
              <span style={{ fontSize: '0.74rem', color: '#137333', fontWeight: '700' }}>Direct bank NEFT transfers</span>
            </div>

            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>36-MONTH COMMITMENT</span>
                <div style={{ padding: '6px', borderRadius: '6px', background: '#f8fafc', color: '#0f172a' }}>
                  <TrendingUp size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
                {formatINR(total36MonthCommitment)}
              </div>
              <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>Total assured return across pool</span>
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

          {/* Rental Cards Grid / Skeletons / Empty State */}
          {loading ? (
            <TableSkeleton rows={6} columns={6} />
          ) : rentals.length === 0 ? (
            <EmptyState
              icon={Repeat}
              title="No Rental Contracts Found"
              description="Create your first rental management contract to assign units and configure 3-Year Rent-Back guaranteed payouts."
              primaryAction={() => {
                setEditingContract(null);
                setIsCreateModalOpen(true);
              }}
              primaryActionLabel="Add First Contract"
              primaryActionIcon={Plus}
            />
          ) : (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {rentals.map((r) => {
                const rentBack = r.rentBack || {};
                const flat = r.flatId || {};
                const customerName = r.customerName || r.ownerId?.name || flat.currentOwner?.name || r.tenantAgreement?.tenantName || 'Registered Customer';
                const customerMobile = r.customerMobile || r.ownerId?.mobileNo || flat.currentOwner?.mobileNo || r.tenantAgreement?.tenantPhone || '';
                const cleanPhone = customerMobile ? customerMobile.replace(/[^0-9]/g, '') : '';
                
                // Resolve Tower, Floor, Flat Number
                const flatNumber = flat.flatNumber || '001';
                const floorNumber = r.floorNum !== undefined ? r.floorNum : (flat.floor !== undefined ? flat.floor : (parseInt(flatNumber.replace(/\D/g, ''), 10) >= 100 ? Math.floor(parseInt(flatNumber.replace(/\D/g, ''), 10) / 100) : 0));
                const towerName = r.towerName || r.projectId?.buildings?.[0]?.buildingName || 'Tower A';

                const isTdsEnabled = rentBack.applyTds !== undefined ? rentBack.applyTds : (flat.rentalDetails?.applyTds !== false);
                const tdsPercentage = isTdsEnabled ? (rentBack.tdsPercentage !== undefined ? rentBack.tdsPercentage : (flat.rentalDetails?.tdsPercentage !== undefined ? flat.rentalDetails.tdsPercentage : 10)) : 0;
                const grossRent = rentBack.monthlyRent || r.tenantAgreement?.monthlyRent || 31000;
                const tds = Math.round(grossRent * (tdsPercentage / 100));
                const netRent = grossRent - tds;
                const tenure = rentBack.tenureMonths || 36;
                const totalTenure = r.rentBackLedger?.totalTenureAmount || (netRent * tenure);

                return (
                  <div
                    key={r._id}
                    className="g-card"
                    style={{
                      padding: '18px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      position: 'relative',
                      borderRadius: '12px',
                      border: '1.5px solid #e2e8f0',
                      background: '#ffffff',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                    }}
                  >
                    {/* Header: Customer Name & Status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '10px',
                          background: '#f3e8ff',
                          color: '#7c3aed',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '800',
                          fontSize: '1.1rem',
                          border: '1px solid #ddd6fe'
                        }}>
                          <User size={20} />
                        </div>
                        <div>
                          <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>
                            {customerName}
                          </h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '600' }}>
                              Agreement: <strong>{r.contractCode || `RENT-${r._id.slice(-6).toUpperCase()}`}</strong>
                            </span>
                            <span style={{
                              fontSize: '0.68rem',
                              background: '#ecfdf5',
                              color: '#059669',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontWeight: '800',
                              border: '1px solid #a7f3d0'
                            }}>
                              3-YEAR RENT-BACK
                            </span>
                          </div>
                        </div>
                      </div>

                      <StatusBadge status={r.status} />
                    </div>

                    {/* Property Unit Specification (Tower, Floor, Flat No) */}
                    <div style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.86rem', color: '#0f172a', fontWeight: '800' }}>
                          <Home size={16} color="#2563eb" />
                          <span>Flat {flatNumber}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#334155', fontWeight: '700' }}>
                          <Building2 size={15} color="#7c3aed" />
                          <span>{towerName}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#475569', fontWeight: '600' }}>
                          <span>Floor Level: <strong>{floorNumber === 0 ? 'Ground Floor' : `Floor ${floorNumber}`}</strong></span>
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                          {flat.bhkType || 'Service Apartment'}
                        </div>
                      </div>

                      <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: '600' }}>
                        Payout Due: <strong style={{ color: '#0f172a' }}>Day {rentBack.rentDueDay || r.tenantAgreement?.rentDueDay || 25} of month</strong>
                      </div>
                    </div>

                    {/* Financial Payout Breakdown */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: '10px',
                      background: '#fcfcfd',
                      border: '1px solid #f1f5f9',
                      padding: '12px',
                      borderRadius: '8px'
                    }}>
                      <div>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Gross Monthly Rent</span>
                        <div style={{ fontSize: '1rem', fontWeight: '800', color: '#7c3aed', marginTop: '2px' }}>
                          {formatINR(grossRent)} <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600' }}>/ mo</span>
                        </div>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>
                          {isTdsEnabled && tds > 0 ? `TDS Deducted (${tdsPercentage}%)` : 'TDS Deduction'}
                        </span>
                        <div style={{ fontSize: '0.95rem', fontWeight: '800', color: isTdsEnabled && tds > 0 ? '#ef4444' : '#059669', marginTop: '2px' }}>
                          {isTdsEnabled && tds > 0 ? `- ${formatINR(tds)}` : '0% (No TDS / Exempt)'}
                        </div>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.72rem', color: '#047857', fontWeight: '700', textTransform: 'uppercase' }}>Net Disbursed to Owner</span>
                        <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#16a34a', marginTop: '2px' }}>
                          {formatINR(netRent)} <span style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: '600' }}>/ mo</span>
                        </div>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>36-Mo Commitment</span>
                        <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                          {formatINR(totalTenure)}
                        </div>
                      </div>
                    </div>

                    {/* Customer Direct Contact Actions */}
                    {customerMobile && (
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        background: '#f8fafc',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0'
                      }}>
                        <a
                          href={`tel:${customerMobile}`}
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                            padding: '6px',
                            background: '#ffffff',
                            color: '#0284c7',
                            borderRadius: '5px',
                            border: '1px solid #cbd5e1',
                            textDecoration: 'none',
                            fontSize: '0.76rem',
                            fontWeight: '700'
                          }}
                        >
                          <User size={13} /> {customerMobile}
                        </a>

                        <a
                          href={`https://wa.me/${cleanPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="WhatsApp Customer"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            padding: '6px 12px',
                            background: '#ecfdf5',
                            color: '#059669',
                            borderRadius: '5px',
                            border: '1px solid #a7f3d0',
                            textDecoration: 'none',
                            fontSize: '0.76rem',
                            fontWeight: '700'
                          }}
                        >
                          <MessageSquare size={13} /> WhatsApp
                        </a>
                      </div>
                    )}

                    {/* Action Footer */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderTop: '1px solid #f1f5f9',
                      paddingTop: '10px',
                      gap: '8px',
                      flexWrap: 'wrap'
                    }}>
                      <button
                        type="button"
                        onClick={() => {
                          setLedgerContract(r);
                          setIsLedgerModalOpen(true);
                        }}
                        style={{
                          padding: '7px 14px',
                          background: '#ecfdf5',
                          border: '1px solid #a7f3d0',
                          color: '#047857',
                          fontWeight: '700',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <BookOpen size={14} /> 36-Mo Ledger Passbook
                      </button>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setQuickMsgRental(r);
                            setIsQuickMsgModalOpen(true);
                          }}
                          style={{
                            padding: '7px 12px',
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            color: '#334155',
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
                            padding: '7px 16px',
                            background: '#2563eb',
                            color: '#ffffff',
                            fontWeight: '700',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            cursor: 'pointer',
                            border: 'none',
                            boxShadow: '0 1px 3px rgba(37,99,235,0.3)'
                          }}
                        >
                          View Contract <ArrowRight size={14} />
                        </button>
                      </div>
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
          {(() => {
            const rentBackList = rentals.filter((r) => r.rentBack?.enabled);
            const totalTenureCommitment = rentBackList.reduce((sum, r) => {
              const ledger = r.rentBackLedger || {};
              const mRent = ledger.monthlyRent || r.rentBack?.monthlyRent || 0;
              return sum + (ledger.totalTenureAmount || (mRent * 36));
            }, 0);

            const totalDisbursed = rentBackList.reduce((sum, r) => {
              const ledger = r.rentBackLedger || {};
              return sum + (ledger.totalPaidToOwner || 0);
            }, 0);

            const totalRemaining = Math.max(0, totalTenureCommitment - totalDisbursed);
            const monthlyRentPool = rentBackList.reduce((sum, r) => sum + (r.rentBack?.monthlyRent || 31000), 0);

            return (
              <div className="grid-cols-4">
                <div className="stat-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>TOTAL 36-MO COMMITMENT</span>
                    <div style={{ padding: '6px', borderRadius: '6px', background: '#e8f0fe', color: '#1a73e8' }}>
                      <Building2 size={16} />
                    </div>
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#111827', marginTop: '4px' }}>{formatINR(totalTenureCommitment)}</div>
                  <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>Across {rentBackList.length} guaranteed units</span>
                </div>

                <div className="stat-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>TOTAL PAID TO OWNERS</span>
                    <div style={{ padding: '6px', borderRadius: '6px', background: '#f0fdf4', color: '#16a34a' }}>
                      <DollarSign size={16} />
                    </div>
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#15803d', marginTop: '4px' }}>{formatINR(totalDisbursed)}</div>
                  <span style={{ fontSize: '0.74rem', color: '#166534', fontWeight: '700' }}>Disbursed payouts</span>
                </div>

                <div className="stat-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>REMAINING TENURE LIABILITY</span>
                    <div style={{ padding: '6px', borderRadius: '6px', background: '#fffbeb', color: '#b45309' }}>
                      <TrendingUp size={16} />
                    </div>
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#b45309', marginTop: '4px' }}>{formatINR(totalRemaining)}</div>
                  <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>Future payable balance</span>
                </div>

                <div className="stat-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>MONTHLY RENT POOL</span>
                    <div style={{ padding: '6px', borderRadius: '6px', background: '#f3e8ff', color: '#8b5cf6' }}>
                      <ShieldCheck size={16} />
                    </div>
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#8b5cf6', marginTop: '4px' }}>{formatINR(monthlyRentPool || totalMonthlyGrossPayouts)}</div>
                  <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>Monthly assured payout</span>
                </div>
              </div>
            );
          })()}

          {/* Rent-Back Units Ledger */}
          <div className="g-card" style={{ overflow: 'hidden' }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BookOpen size={18} color="#16a34a" /> 36-Month Owner Rent-Back Passbook Register
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#4b5563', marginTop: '2px' }}>
                  Filter and print monthly owner payout lists by due date (e.g. 10th, 20th, 25th of month).
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    padding: '7px 14px',
                    background: '#1e293b',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                  }}
                >
                  <Printer size={15} /> Print Payout List
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const rentBackList = rentals.filter((r) => r.rentBack?.enabled);
                    const effectiveDue = dueDayFilter === 'custom' ? customDueDay : dueDayFilter;
                    const filtered = rentBackList.filter((r) => {
                      const dueDay = r.rentBackLedger?.dueDay || r.rentBack?.rentDueDay || 25;
                      if (effectiveDue !== 'all' && String(dueDay) !== String(effectiveDue)) return false;
                      if (ledgerSearch) {
                        const s = ledgerSearch.toLowerCase();
                        const flatNo = String(r.flatId?.flatNumber || '').toLowerCase();
                        const oName = String(r.ownerId?.name || r.rentBack?.ownerName || '').toLowerCase();
                        if (!flatNo.includes(s) && !oName.includes(s)) return false;
                      }
                      return true;
                    });

                    const exportRows = filtered.map((r, i) => {
                      const rb = r.rentBack || {};
                      const ledger = r.rentBackLedger || {};
                      const mRent = ledger.monthlyRent || rb.monthlyRent || 0;
                      const totalCommitment = ledger.totalTenureAmount || (mRent * 36);
                      const totalPaid = ledger.totalPaidToOwner || 0;
                      const remainingBal = ledger.remainingPayableToOwner !== undefined ? ledger.remainingPayableToOwner : Math.max(0, totalCommitment - totalPaid);
                      const due = ledger.dueDay || rb.rentDueDay || 25;
                      const paidMonths = (ledger.entries || []).filter((e) => e.status === 'paid' || (e.netAmountPaid > 0)).length;

                      return {
                        'S.No': i + 1,
                        'Flat No': r.flatId?.flatNumber || '001',
                        'Tower': r.projectId?.projectName || 'Krishna Valley',
                        'Owner Name': r.ownerId?.name || rb.ownerName || 'Property Owner',
                        'Mobile': r.ownerId?.mobileNo || rb.ownerPhone || 'On File',
                        'Due Day': `${due}th of every month`,
                        'Monthly Rent (₹)': mRent,
                        '36-Mo Commitment (₹)': totalCommitment,
                        'Total Paid (₹)': totalPaid,
                        'Remaining Balance (₹)': remainingBal,
                        'Months Disbursed': `${paidMonths} / 36`,
                        'Status': 'ACTIVE'
                      };
                    });

                    const ws = XLSX.utils.json_to_sheet(exportRows);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, 'Payout_List');
                    XLSX.writeFile(wb, `Owner_Rental_Payout_Schedule_Due_${effectiveDue}_Day.xlsx`);
                  }}
                  style={{
                    padding: '7px 14px',
                    background: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Download size={15} /> Export Excel
                </button>

                <button
                  type="button"
                  onClick={() => setIsImportLedgerModalOpen(true)}
                  style={{ padding: '7px 14px', background: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <FileSpreadsheet size={14} /> Upload Passbook Excel
                </button>

                <button
                  type="button"
                  onClick={fetchRentals}
                  style={{ padding: '7px 12px', background: '#f3f4f5', border: '1px solid #dadce0', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh
                </button>
              </div>
            </div>

            {/* Payout Schedule Due Day Filter Ribbon */}
            <div style={{
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Filter size={15} color="#0284c7" /> Filter by Due Day:
                </span>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    { label: 'All Dates', value: 'all' },
                    { label: '5th of Month', value: '5' },
                    { label: '10th of Month', value: '10' },
                    { label: '15th of Month', value: '15' },
                    { label: '20th of Month', value: '20' },
                    { label: '25th of Month', value: '25' },
                    { label: 'Custom Day', value: 'custom' }
                  ].map((btn) => (
                    <button
                      key={btn.value}
                      type="button"
                      onClick={() => setDueDayFilter(btn.value)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '20px',
                        border: '1px solid',
                        borderColor: dueDayFilter === btn.value ? '#0284c7' : '#cbd5e1',
                        background: dueDayFilter === btn.value ? '#e0f2fe' : '#ffffff',
                        color: dueDayFilter === btn.value ? '#0369a1' : '#475569',
                        fontWeight: dueDayFilter === btn.value ? '800' : '600',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                {dueDayFilter === 'custom' && (
                  <input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="Day (1-31)"
                    value={customDueDay}
                    onChange={(e) => setCustomDueDay(e.target.value)}
                    style={{
                      width: '100px',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid #94a3b8',
                      fontSize: '0.8rem',
                      fontWeight: '700'
                    }}
                  />
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Search flat # or owner name..."
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                    width: '210px'
                  }}
                />
              </div>
            </div>

            {/* PRINT HEADER ONLY VISIBLE DURING PRINT */}
            <div className="print-only" style={{ display: 'none', padding: '16px 20px', borderBottom: '2px solid #000000', marginBottom: '16px' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#000000' }}>
                KRISHNA VALLEY TOWNSHIP & RESORT
              </div>
              <div style={{ fontSize: '1rem', fontWeight: '800', marginTop: '4px', color: '#111827' }}>
                MONTHLY OWNER GUARANTEED RENTAL PAYOUT DISBURSEMENT SCHEDULE
              </div>
              <div style={{ fontSize: '0.82rem', color: '#374151', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                <span><strong>Filter:</strong> {dueDayFilter === 'all' ? 'All Scheduled Due Dates' : `Due on ${dueDayFilter === 'custom' ? customDueDay : dueDayFilter}th of every month`}</span>
                <span><strong>Generated On:</strong> {new Date().toLocaleDateString('en-GB')}</span>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Unit & Building</th>
                    <th>Property Owner</th>
                    <th>Assured Monthly Rent</th>
                    <th>Payout Due Day</th>
                    <th>Total 3-Yr Commitment</th>
                    <th>Total Disbursed</th>
                    <th>Remaining Balance</th>
                    <th>Progress</th>
                    <th className="no-print">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const rentBackList = rentals.filter((r) => r.rentBack?.enabled);
                    const effectiveDue = dueDayFilter === 'custom' ? customDueDay : dueDayFilter;
                    const filtered = rentBackList.filter((r) => {
                      const dueDay = r.rentBackLedger?.dueDay || r.rentBack?.rentDueDay || 25;
                      if (effectiveDue !== 'all' && String(dueDay) !== String(effectiveDue)) return false;
                      if (ledgerSearch) {
                        const s = ledgerSearch.toLowerCase();
                        const flatNo = String(r.flatId?.flatNumber || '').toLowerCase();
                        const oName = String(r.ownerId?.name || r.rentBack?.ownerName || '').toLowerCase();
                        const oPhone = String(r.ownerId?.mobileNo || r.rentBack?.ownerPhone || '').toLowerCase();
                        if (!flatNo.includes(s) && !oName.includes(s) && !oPhone.includes(s)) return false;
                      }
                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan="9" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                            No rental units found matching the selected due date filter ({effectiveDue === 'all' ? 'All' : `${effectiveDue}th`}).
                          </td>
                        </tr>
                      );
                    }

                    const batchTotalMonthly = filtered.reduce((s, r) => s + (r.rentBackLedger?.monthlyRent || r.rentBack?.monthlyRent || 0), 0);
                    const batchTotalCommitment = filtered.reduce((s, r) => s + (r.rentBackLedger?.totalTenureAmount || ((r.rentBackLedger?.monthlyRent || r.rentBack?.monthlyRent || 0) * 36)), 0);
                    const batchTotalPaid = filtered.reduce((s, r) => s + (r.rentBackLedger?.totalPaidToOwner || 0), 0);
                    const batchTotalRemaining = Math.max(0, batchTotalCommitment - batchTotalPaid);

                    return (
                      <>
                        {filtered.map((r) => {
                          const rb = r.rentBack || {};
                          const ledger = r.rentBackLedger || {};
                          const mRent = ledger.monthlyRent || rb.monthlyRent || 0;
                          const totalCommitment = ledger.totalTenureAmount || (mRent * 36);
                          const totalPaid = ledger.totalPaidToOwner || 0;
                          const remainingBal = ledger.remainingPayableToOwner !== undefined ? ledger.remainingPayableToOwner : Math.max(0, totalCommitment - totalPaid);
                          const dueDay = ledger.dueDay || rb.rentDueDay || 25;
                          const paidMonths = (ledger.entries || []).filter((e) => e.status === 'paid' || (e.netAmountPaid > 0)).length;
                          const progress = Math.round((paidMonths / 36) * 100);

                          const flatNumber = r.flatId?.flatNumber || '001';
                          const floorNumber = r.floorNum !== undefined ? r.floorNum : (r.flatId?.floor !== undefined ? r.flatId.floor : (parseInt(flatNumber.replace(/\D/g, ''), 10) >= 100 ? Math.floor(parseInt(flatNumber.replace(/\D/g, ''), 10) / 100) : 0));
                          const towerName = r.towerName || r.projectId?.buildings?.[0]?.buildingName || 'Tower A';
                          const customerName = r.customerName || r.ownerId?.name || r.flatId?.currentOwner?.name || rb.ownerName || 'Property Owner';
                          const customerMobile = r.customerMobile || r.ownerId?.mobileNo || r.flatId?.currentOwner?.mobileNo || rb.ownerPhone || 'On File';

                          return (
                            <tr key={r._id}>
                              <td>
                                <div style={{ fontWeight: '800', color: '#111827', fontSize: '0.95rem' }}>
                                  Flat {flatNumber}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#1a73e8', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                  <Building2 size={12} />
                                  {towerName} • {floorNumber === 0 ? 'Ground Floor' : `Floor ${floorNumber}`}
                                </div>
                              </td>
                              <td>
                                <div style={{ fontWeight: '700', color: '#111827' }}>
                                  {customerName}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#4b5563' }}>
                                  {customerMobile}
                                </div>
                              </td>
                              <td style={{ fontWeight: '800', color: '#111827', fontSize: '0.92rem' }}>
                                {formatINR(mRent)}
                                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '500' }}>
                                  / month
                                </div>
                              </td>
                              <td>
                                <span style={{
                                  background: dueDay === 10 ? '#fef3c7' : (dueDay === 20 ? '#e0f2fe' : '#f0fdf4'),
                                  color: dueDay === 10 ? '#92400e' : (dueDay === 20 ? '#0369a1' : '#166534'),
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontWeight: '800',
                                  fontSize: '0.76rem'
                                }}>
                                  {dueDay}th of month
                                </span>
                              </td>
                              <td style={{ fontWeight: '700', color: '#1e293b' }}>
                                {formatINR(totalCommitment)}
                                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                  36 Months
                                </div>
                              </td>
                              <td style={{ fontWeight: '800', color: '#16a34a' }}>
                                {formatINR(totalPaid)}
                                <div style={{ fontSize: '0.7rem', color: '#166534', fontWeight: '700' }}>
                                  {paidMonths} / 36 Mos
                                </div>
                              </td>
                              <td style={{ fontWeight: '800', color: '#b45309' }}>
                                {formatINR(remainingBal)}
                                <div style={{ fontSize: '0.7rem', color: '#92400e' }}>
                                  {36 - paidMonths} Mos Left
                                </div>
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div style={{ width: '70px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ width: `${progress}%`, height: '100%', background: progress >= 100 ? '#16a34a' : '#3b82f6' }} />
                                  </div>
                                  <span style={{ fontSize: '0.74rem', fontWeight: '700', color: '#334155' }}>{progress}%</span>
                                </div>
                              </td>
                              <td className="no-print">
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setLedgerContract(r);
                                      setIsLedgerModalOpen(true);
                                    }}
                                    style={{
                                      padding: '6px 12px',
                                      background: '#16a34a',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: '6px',
                                      fontSize: '0.76rem',
                                      fontWeight: '700',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      boxShadow: '0 1px 2px rgba(22,163,74,0.3)'
                                    }}
                                  >
                                    <BookOpen size={13} /> Open Passbook
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedContract(r);
                                      setIsDetailModalOpen(true);
                                    }}
                                    style={{
                                      padding: '6px 10px',
                                      background: '#f1f5f9',
                                      color: '#334155',
                                      border: '1px solid #cbd5e1',
                                      borderRadius: '6px',
                                      fontSize: '0.76rem',
                                      fontWeight: '600',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Manage
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                        {/* Batch Total Summary Row */}
                        <tr style={{ background: '#f8fafc', fontWeight: '800', borderTop: '2px solid #cbd5e1' }}>
                          <td colSpan="2" style={{ padding: '10px 14px', color: '#1e293b' }}>
                            BATCH TOTAL ({filtered.length} Units Due on {effectiveDue === 'all' ? 'All Dates' : `${effectiveDue}th`})
                          </td>
                          <td style={{ padding: '10px 14px', color: '#111827', fontSize: '0.95rem' }}>
                            {formatINR(batchTotalMonthly)}/mo
                          </td>
                          <td style={{ padding: '10px 14px', color: '#64748b' }}>—</td>
                          <td style={{ padding: '10px 14px', color: '#1e293b' }}>{formatINR(batchTotalCommitment)}</td>
                          <td style={{ padding: '10px 14px', color: '#16a34a' }}>{formatINR(batchTotalPaid)}</td>
                          <td style={{ padding: '10px 14px', color: '#b45309' }}>{formatINR(batchTotalRemaining)}</td>
                          <td colSpan="2"></td>
                        </tr>
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB: 3-YEAR RENTAL UNITS POOL ================= */}
      {rentalViewTab === 'units' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Subheader and Actions Bar */}
          <div className="g-card" style={{
            padding: '18px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={20} color="#7c3aed" /> 3-Year Rental Units Pool &amp; Asset Management
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Manage all property units committed to the 36-month guaranteed rent-back program, track owner yield allocations, and monitor tenant occupancy.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setIsEnrollModalOpen(true)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  background: '#7c3aed',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.84rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(124, 58, 237, 0.3)'
                }}
              >
                <ShieldCheck size={16} /> + Enroll Flats in 3-Year Rental
              </button>

              <button
                type="button"
                onClick={fetchRentalUnits}
                style={{
                  padding: '9px 14px',
                  borderRadius: '8px',
                  background: '#ffffff',
                  border: '1px solid #dadce0',
                  color: '#475569',
                  fontSize: '0.84rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <RefreshCw size={15} className={loadingRentalFlats ? 'spin' : ''} /> Refresh Pool
              </button>
            </div>
          </div>

          {/* Metric KPI Cards */}
          {(() => {
            let totalYield = 0;
            let leasedCount = 0;
            let vacantPoolCount = 0;

            rentalFlats.forEach(f => {
              const rent = f.rentalDetails?.monthlyRent || f.rentalContract?.rentBack?.monthlyRent || 25000;
              totalYield += Number(rent) || 0;
              const isLeased = (f.status || '').toLowerCase() === 'leased' || Boolean(f.rentalContract?.tenantAgreement?.tenantName);
              if (isLeased) leasedCount++;
              else vacantPoolCount++;
            });

            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div className="g-card" style={{ padding: '16px 20px', borderLeft: '4px solid #7c3aed' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: '700', color: '#64748b' }}>UNITS IN RENTAL POOL</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
                    {rentalFlats.length} Flats
                  </div>
                  <span style={{ fontSize: '0.74rem', color: '#7c3aed', fontWeight: '600' }}>Committed to 3-Yr Scheme</span>
                </div>

                <div className="g-card" style={{ padding: '16px 20px', borderLeft: '4px solid #16a34a' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: '700', color: '#64748b' }}>MONTHLY GUARANTEED YIELD</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#16a34a', marginTop: '4px' }}>
                    {formatINR(totalYield)}/mo
                  </div>
                  <span style={{ fontSize: '0.74rem', color: '#166534', fontWeight: '600' }}>Total owner disbursements</span>
                </div>

                <div className="g-card" style={{ padding: '16px 20px', borderLeft: '4px solid #0284c7' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: '700', color: '#64748b' }}>LEASED &amp; OCCUPIED</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0284c7', marginTop: '4px' }}>
                    {leasedCount} Units
                  </div>
                  <span style={{ fontSize: '0.74rem', color: '#0369a1', fontWeight: '600' }}>Tenants generating revenue</span>
                </div>

                <div className="g-card" style={{ padding: '16px 20px', borderLeft: '4px solid #d97706' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: '700', color: '#64748b' }}>VACANT IN RENTAL POOL</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#d97706', marginTop: '4px' }}>
                    {vacantPoolCount} Units
                  </div>
                  <span style={{ fontSize: '0.74rem', color: '#b45309', fontWeight: '600' }}>Ready for tenant allotment</span>
                </div>
              </div>
            );
          })()}

          {/* Search Bar */}
          <div className="g-card" style={{ padding: '14px 20px', display: 'flex', gap: '14px', alignItems: 'center' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search flat number, tower, owner name..."
                value={unitsSearchTerm}
                onChange={(e) => setUnitsSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  paddingLeft: '36px',
                  paddingRight: '12px',
                  paddingTop: '8px',
                  paddingBottom: '8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.84rem'
                }}
              />
            </div>
          </div>

          {/* Table of Units in Rental Pool */}
          {loadingRentalFlats ? (
            <TableSkeleton rows={6} columns={7} />
          ) : (
            <div className="g-card animate-fade-in" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>
                    <th style={{ padding: '12px 16px' }}>Unit &amp; Tower</th>
                    <th style={{ padding: '12px 16px' }}>Floor / BHK</th>
                    <th style={{ padding: '12px 16px' }}>Registered Owner</th>
                    <th style={{ padding: '12px 16px' }}>Monthly Guaranteed Yield</th>
                    <th style={{ padding: '12px 16px' }}>Tenure</th>
                    <th style={{ padding: '12px 16px' }}>Occupancy Status</th>
                    <th style={{ padding: '12px 16px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filtered = rentalFlats.filter(f => {
                      if (!unitsSearchTerm.trim()) return true;
                      const q = unitsSearchTerm.toLowerCase();
                      const matchFlat = (f.flatNumber || '').toLowerCase().includes(q);
                      const matchTower = (f.buildingName || '').toLowerCase().includes(q);
                      const matchOwner = (f.currentOwner?.name || f.owner?.name || '').toLowerCase().includes(q);
                      return matchFlat || matchTower || matchOwner;
                    });

                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan="7" style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
                            <Home size={32} color="#cbd5e1" style={{ margin: '0 auto 8px', display: 'block' }} />
                            <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#1e293b' }}>No Units in Rental Pool</div>
                            <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Click "+ Enroll Flats in 3-Year Rental" to commit units to guaranteed rental management.</div>
                          </td>
                        </tr>
                      );
                    }

                    return filtered.map((f) => {
                      const monthlyRent = f.rentalDetails?.monthlyRent || f.rentalContract?.rentBack?.monthlyRent || 25000;
                      const isLeased = (f.status || '').toLowerCase() === 'leased' || Boolean(f.rentalContract?.tenantAgreement?.tenantName);
                      const matchedContract = rentals.find(r => r.flatId?._id === (f._id || f.id) || r.flatNumber === f.flatNumber);

                      return (
                        <tr key={f._id || f.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 16px', fontWeight: '800', color: '#0f172a' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Building2 size={14} color="#7c3aed" /> Flat {f.flatNumber}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '600' }}>
                              {f.buildingName || 'Tower A'}
                            </div>
                          </td>

                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: '700', color: '#334155' }}>
                              Floor {f.floor === 0 ? 'Ground' : f.floor}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                              {f.bhkType || '2BHK'} ({f.carpetArea || 950} sqft)
                            </div>
                          </td>

                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: '800', color: '#1e293b' }}>
                              {f.currentOwner?.name || f.owner?.name || 'Assigned Titleholder'}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                              {f.currentOwner?.mobileNo || f.owner?.mobileNo || 'Contact on file'}
                            </div>
                          </td>

                          <td style={{ padding: '12px 16px', fontWeight: '800', color: '#166534' }}>
                            {formatINR(monthlyRent)}/mo
                            <div style={{ fontSize: '0.7rem', color: '#7c3aed', fontWeight: '700' }}>
                              3-Year Guaranteed
                            </div>
                          </td>

                          <td style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>
                            36 Months
                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                              Rent-Back Yield
                            </div>
                          </td>

                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.74rem',
                              fontWeight: '700',
                              background: isLeased ? '#ecfdf5' : '#fef3c7',
                              color: isLeased ? '#065f46' : '#92400e',
                              border: isLeased ? '1px solid #a7f3d0' : '1px solid #fde68a'
                            }}>
                              {isLeased ? '✓ LEASED TO TENANT' : 'VACANT IN POOL'}
                            </span>
                          </td>

                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              {matchedContract && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setLedgerContract(matchedContract);
                                    setIsLedgerModalOpen(true);
                                  }}
                                  style={{
                                    padding: '5px 10px',
                                    background: '#7c3aed',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  <BookOpen size={12} /> Ledger
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  if (matchedContract) {
                                    setSelectedContract(matchedContract);
                                    setIsDetailModalOpen(true);
                                  } else {
                                    alert(`Unit ${f.flatNumber} is enrolled in the 3-Year Rental Pool. Creating or syncing lease contract...`);
                                  }
                                }}
                                style={{
                                  padding: '5px 10px',
                                  background: '#f8fafc',
                                  border: '1px solid #cbd5e1',
                                  color: '#334155',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  cursor: 'pointer'
                                }}
                              >
                                Details
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </div>
      )}

      {/* ================= TAB 4: TENANT MESSAGING HUB ================= */}
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

      {/* 36-MONTH OWNER RENTAL LEDGER PASSBOOK MODAL */}
      <RentalLedgerModal
        isOpen={isLedgerModalOpen}
        onClose={() => setIsLedgerModalOpen(false)}
        rentalContract={ledgerContract}
        onUpdate={fetchRentals}
      />

      {/* IMPORT RENTAL LEDGER EXCEL MODAL */}
      <ImportRentalLedgerModal
        isOpen={isImportLedgerModalOpen}
        onClose={() => setIsImportLedgerModalOpen(false)}
        onSuccess={fetchRentals}
      />

      {/* BULK ENROLL FLATS IN 3-YEAR RENTAL MODAL */}
      <BulkEnrollRentalModal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        selectedFlats={[]}
        onSuccess={() => {
          fetchRentalUnits();
          fetchRentals();
        }}
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
