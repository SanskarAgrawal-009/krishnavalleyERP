import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Building2,
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  History,
  FileSpreadsheet,
  Search,
  Filter,
  RefreshCw,
  Edit,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  Sparkles,
  Repeat,
  Plus,
  BookOpen,
  Trash2
} from 'lucide-react';
import { rentalService } from '../../services/rentalService.js';
import { EditRentalTermsModal } from '../../components/rentals/EditRentalTermsModal.jsx';
import { RecordPayoutModal } from '../../components/rentals/RecordPayoutModal.jsx';
import { TransferOwnershipModal } from '../../components/rentals/TransferOwnershipModal.jsx';
import { ManualRentalEntryModal } from '../../components/rentals/ManualRentalEntryModal.jsx';
import { ImportRentalModal } from '../../components/rentals/ImportRentalModal.jsx';
import { TableSkeleton } from '../../components/common/SkeletonLoader.jsx';
import { EmptyState } from '../../components/common/EmptyState.jsx';
import { useToast } from '../../context/ToastContext.jsx';

export const RentalManagementPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  const activeTabParam = searchParams.get('tab') || 'active';
  const [activeTab, setActiveTab] = useState(activeTabParam === 'history' ? 'history' : 'active');

  const [loadingActive, setLoadingActive] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeRentals, setActiveRentals] = useState([]);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [kpis, setKpis] = useState({
    totalUnits: 0,
    totalMonthlyGross: 0,
    totalMonthlyNet: 0,
    totalDisbursed: 0,
    totalOutstanding: 0,
    totalCommitmentAll: 0
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [tenureFilter, setTenureFilter] = useState('all');

  // Modals
  const [selectedRentalForEdit, setSelectedRentalForEdit] = useState(null);
  const [selectedRentalForPayout, setSelectedRentalForPayout] = useState(null);
  const [selectedRentalForTransfer, setSelectedRentalForTransfer] = useState(null);
  const [isManualEntryModalOpen, setIsManualEntryModalOpen] = useState(false);
  const [isImportRentalModalOpen, setIsImportRentalModalOpen] = useState(false);

  // Sync tab with URL
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Fetch Active Rentals (Table 1)
  const fetchActiveRentals = async () => {
    setLoadingActive(true);
    try {
      const res = await rentalService.getActiveRentals({
        search: searchQuery,
        tenure: tenureFilter !== 'all' ? tenureFilter : undefined
      });
      if (res.success) {
        setActiveRentals(res.data || []);
        if (res.kpis) setKpis(res.kpis);
      }
    } catch (err) {
      console.error('Error fetching active rentals:', err);
      toast.showError('Could not load active rentals data');
    } finally {
      setLoadingActive(false);
    }
  };

  // Fetch Previous Owners History (Table 2)
  const fetchPreviousOwnersHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await rentalService.getPreviousOwnersHistory({
        search: searchQuery
      });
      if (res.success) {
        setHistoryRecords(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching previous owners history:', err);
      toast.showError('Could not load previous owners history');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchActiveRentals();
    fetchPreviousOwnersHistory();
  }, [tenureFilter]);

  // Search trigger on enter or debounced
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (activeTab === 'active') fetchActiveRentals();
    else fetchPreviousOwnersHistory();
  };

  const formatINR = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

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

  const formatDate = (val, forExport = false) => {
    const parsed = parseAnyDate(val);
    if (!parsed) {
      return forExport ? 'No Data' : <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.74rem' }}>No Data</span>;
    }
    return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const renderCellData = (val, customStyle = {}) => {
    if (val === undefined || val === null || val === '' || val === '—' || val === '-' || val === 'null' || val === 'undefined' || val === 'On File') {
      return <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.74rem', ...customStyle }}>No Data</span>;
    }
    return val;
  };

  // Export CSV
  const handleExportCSV = () => {
    if (activeTab === 'active') {
      const headers = [
        'Flat No',
        'Owner Name',
        'Owner Mobile',
        'Registry Date',
        'Monthly Gross Rent',
        'TDS Applied',
        'Net Monthly Rent',
        'Tenure (Months)',
        'Payment Starting Date',
        'Payment Ending Date',
        'Total Commitment',
        'Total Paid',
        'Amount Outstanding'
      ];
      const rows = activeRentals.map((r) => [
        `"${r.flatNumber}"`,
        `"${r.ownerName}"`,
        `"${r.ownerMobile}"`,
        `"${formatDate(r.registryDate)}"`,
        r.rentAmount,
        r.applyTds ? `${r.tdsPercentage}% (-₹${r.tdsAmount})` : 'No',
        r.netAmount,
        r.tenureMonths,
        `"${formatDate(r.startDate)}"`,
        `"${formatDate(r.endDate)}"`,
        r.totalCommitment,
        r.totalPaid,
        r.amountOutstanding
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Active_Rental_Register_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const headers = [
        'Flat No',
        'Sequence',
        'Previous Owner Name',
        'Contact',
        'Registry Date',
        'Monthly Rent',
        'TDS Applied',
        'Net Rent',
        'Start Date',
        'End Date / Transfer Date',
        'Tenure (Months)',
        'Total Rent Disbursed',
        'Transferred To'
      ];
      const rows = historyRecords.map((h) => [
        `"${h.flatNumber}"`,
        `"${h.sequenceLabel}"`,
        `"${h.previousOwnerName}"`,
        `"${h.mobileNo}"`,
        `"${formatDate(h.registryDate)}"`,
        h.rentAmount,
        h.applyTds ? `${h.tdsPercentage}%` : 'No',
        h.netAmount,
        `"${formatDate(h.startDate)}"`,
        `"${formatDate(h.endDate)}"`,
        h.tenureMonths,
        h.totalRentPaid,
        `"${h.transferredTo}"`
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Previous_Owners_Rental_Trail_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    toast.showSuccess('Report exported to CSV!');
  };

  // Delete / Unenroll Active Rental Entry
  const handleDeleteActiveRental = async (rental) => {
    if (!rental) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to delete and unenroll Flat ${rental.flatNumber} (${rental.ownerName}) from the active rental register?\n\nThis will reset its guaranteed rental commitment and clear all scheduled passbook ledger entries.`
    );
    if (!confirmDelete) return;

    try {
      const res = await rentalService.deleteRental(rental._id);
      if (res.success) {
        toast.showSuccess(res.message || `Flat ${rental.flatNumber} deleted from rental register!`);
        fetchActiveRentals();
        fetchPreviousOwnersHistory();
      } else {
        toast.showError(res.message || 'Failed to delete rental entry');
      }
    } catch (err) {
      console.error('Error deleting rental entry:', err);
      toast.showError('Server error deleting rental entry');
    }
  };

  // Delete Previous Owner History Entry
  const handleDeleteHistoryEntry = async (item) => {
    if (!item) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the previous ownership record of Flat ${item.flatNumber} (${item.previousOwnerName})?`
    );
    if (!confirmDelete) return;

    try {
      const res = await rentalService.deleteOwnershipHistory(item.flatId, item.historyId);
      if (res.success) {
        toast.showSuccess(res.message || 'Previous owner record deleted!');
        fetchPreviousOwnersHistory();
      } else {
        toast.showError(res.message || 'Failed to delete history entry');
      }
    } catch (err) {
      console.error('Error deleting history entry:', err);
      toast.showError('Server error deleting history entry');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
      
      {/* 1. TOP EXECUTIVE HEADER */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
            }}>
              <Repeat size={20} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Rental Management Hub
              </h1>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b', fontWeight: '500' }}>
                Guaranteed Rental Program • Minimum 3-Year Fixed Tenure • Multi-Owner Resale Trail
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsManualEntryModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)'
            }}
          >
            <Plus size={15} /> + Manual Rental Entry
          </button>

          <button
            onClick={() => setIsImportRentalModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              background: '#16a34a',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)'
            }}
          >
            <FileSpreadsheet size={15} /> Import by Excel
          </button>

          <button
            onClick={() => navigate('/rentals/ledgers')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(124, 58, 237, 0.25)'
            }}
          >
            <BookOpen size={15} /> Passbook Ledgers Hub
          </button>

          <button
            onClick={handleExportCSV}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#334155',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            <FileSpreadsheet size={15} color="#16a34a" /> Export CSV
          </button>

          <button
            onClick={() => {
              fetchActiveRentals();
              fetchPreviousOwnersHistory();
              toast.showSuccess('Refreshed rental registers');
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#334155',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      {/* 2. TOP KPI CARDS STRIP */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '14px'
      }}>
        {/* Card 1 */}
        <div className="g-card" style={{ padding: '16px 20px', borderLeft: '4px solid #2563eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '800' }}>ENROLLED FLATS</span>
            <Building2 size={18} color="#2563eb" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
            {kpis.totalUnits} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>Units</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: '600' }}>
            Active under 3-Yr Rent-Back
          </span>
        </div>

        {/* Card 2 */}
        <div className="g-card" style={{ padding: '16px 20px', borderLeft: '4px solid #16a34a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '800' }}>MONTHLY GROSS YIELD</span>
            <DollarSign size={18} color="#16a34a" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#166534', marginTop: '4px' }}>
            {formatINR(kpis.totalMonthlyGross)}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: '600' }}>
            Total scheduled monthly payout
          </span>
        </div>

        {/* Card 3 */}
        <div className="g-card" style={{ padding: '16px 20px', borderLeft: '4px solid #0891b2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '800' }}>MONTHLY NET PAYOUT</span>
            <CheckCircle2 size={18} color="#0891b2" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0e7490', marginTop: '4px' }}>
            {formatINR(kpis.totalMonthlyNet)}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#0891b2', fontWeight: '600' }}>
            Disbursed Net after 10% TDS
          </span>
        </div>

        {/* Card 4 */}
        <div className="g-card" style={{ padding: '16px 20px', borderLeft: '4px solid #7c3aed' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '800' }}>TOTAL DISBURSED</span>
            <TrendingUp size={18} color="#7c3aed" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#6d28d9', marginTop: '4px' }}>
            {formatINR(kpis.totalDisbursed)}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#7c3aed', fontWeight: '600' }}>
            Cumulative to current owners
          </span>
        </div>

        {/* Card 5 */}
        <div className="g-card" style={{ padding: '16px 20px', borderLeft: '4px solid #d97706' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '800' }}>OUTSTANDING BALANCE</span>
            <Clock size={18} color="#d97706" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#b45309', marginTop: '4px' }}>
            {formatINR(kpis.totalOutstanding)}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: '600' }}>
            Remaining tenure liability
          </span>
        </div>
      </div>

      {/* 3. TABS & FILTER BAR */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '12px 18px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        {/* Tab Buttons */}
        <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '8px', gap: '4px' }}>
          <button
            onClick={() => handleTabChange('active')}
            style={{
              padding: '8px 18px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'active' ? '#ffffff' : 'transparent',
              color: activeTab === 'active' ? '#0f172a' : '#64748b',
              fontWeight: '800',
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: activeTab === 'active' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Building2 size={16} color={activeTab === 'active' ? '#2563eb' : '#64748b'} />
            <span>Table 1: Active Rental Register</span>
            <span style={{
              fontSize: '0.7rem',
              background: activeTab === 'active' ? '#eff6ff' : '#e2e8f0',
              color: activeTab === 'active' ? '#2563eb' : '#64748b',
              padding: '2px 6px',
              borderRadius: '10px'
            }}>
              {activeRentals.length}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('history')}
            style={{
              padding: '8px 18px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'history' ? '#ffffff' : 'transparent',
              color: activeTab === 'history' ? '#0f172a' : '#64748b',
              fontWeight: '800',
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: activeTab === 'history' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <History size={16} color={activeTab === 'history' ? '#7c3aed' : '#64748b'} />
            <span>Table 2: Previous Owners Trail</span>
            <span style={{
              fontSize: '0.7rem',
              background: activeTab === 'history' ? '#f5f3ff' : '#e2e8f0',
              color: activeTab === 'history' ? '#7c3aed' : '#64748b',
              padding: '2px 6px',
              borderRadius: '10px'
            }}>
              {historyRecords.length}
            </span>
          </button>
        </div>

        {/* Search & Tenure Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <form onSubmit={handleSearchSubmit} style={{ position: 'relative', width: '260px' }}>
            <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder={activeTab === 'active' ? 'Search Flat No or Owner...' : 'Search Previous Owner or Flat...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 12px 7px 32px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </form>

          {activeTab === 'active' && (
            <select
              value={tenureFilter}
              onChange={(e) => setTenureFilter(e.target.value)}
              style={{
                padding: '7px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                background: '#ffffff',
                color: '#334155',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Tenures</option>
              <option value="36">36 Months (3 Yrs)</option>
              <option value="48">48 Months (4 Yrs)</option>
              <option value="60">60 Months (5 Yrs)</option>
              <option value="100">100 Months</option>
            </select>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. TABLE 1: ACTIVE RENTAL REGISTER (CURRENT OWNERS) */}
      {/* ========================================================================= */}
      {activeTab === 'active' && (
        <div className="g-card" style={{ padding: 0, overflow: 'hidden' }}>
          {loadingActive ? (
            <div style={{ padding: '24px' }}>
              <TableSkeleton rows={8} columns={11} />
            </div>
          ) : activeRentals.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No Active Rentals Found"
              description="No flats are currently enrolled in the active rental program matching your filters."
            />
          ) : (
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1250px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '12px 16px', fontWeight: '800' }}>Flat No</th>
                    <th style={{ padding: '12px 16px', fontWeight: '800' }}>Current Owner</th>
                    <th style={{ padding: '12px 14px', fontWeight: '800' }}>Registry Date</th>
                    <th style={{ padding: '12px 14px', fontWeight: '800', textAlign: 'right' }}>Rent Amount</th>
                    <th style={{ padding: '12px 14px', fontWeight: '800' }}>TDS (If Applied)</th>
                    <th style={{ padding: '12px 14px', fontWeight: '800', textAlign: 'right' }}>Net Amount</th>
                    <th style={{ padding: '12px 14px', fontWeight: '800' }}>Starting Date</th>
                    <th style={{ padding: '12px 14px', fontWeight: '800' }}>Ending Date</th>
                    <th style={{ padding: '12px 14px', fontWeight: '800', textAlign: 'center' }}>Tenure</th>
                    <th style={{ padding: '12px 16px', fontWeight: '800', textAlign: 'right' }}>Total Payment (Tenure)</th>
                    <th style={{ padding: '12px 16px', fontWeight: '800', textAlign: 'right' }}>Total Paid</th>
                    <th style={{ padding: '12px 16px', fontWeight: '800', textAlign: 'right' }}>Amount Outstanding</th>
                    <th style={{ padding: '12px 16px', fontWeight: '800', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRentals.map((r, idx) => (
                    <tr
                      key={r._id || idx}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.15s ease',
                        fontSize: '0.82rem'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      {/* 1. Flat No */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <button
                          type="button"
                          onClick={() => navigate(`/inventory/flats/${r._id}`)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            color: '#2563eb',
                            fontWeight: '800',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Open full Flat Profile"
                        >
                          <span>{r.flatNumber}</span>
                          <ExternalLink size={12} />
                        </button>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>
                          Floor {r.floor === 0 ? 'G' : renderCellData(r.floor)} • {renderCellData(r.bhkType)}
                        </span>
                      </td>

                      {/* 2. Owner Name */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>{renderCellData(r.ownerName)}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>{renderCellData(r.ownerMobile)}</div>
                      </td>

                      {/* 3. Registry Date */}
                      <td style={{ padding: '14px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <span style={{ color: '#334155', fontWeight: '600' }}>
                          {formatDate(r.registryDate)}
                        </span>
                      </td>

                      {/* 4. Rent Amount */}
                      <td style={{ padding: '14px 14px', verticalAlign: 'middle', textAlign: 'right', fontWeight: '800', color: '#0f172a' }}>
                        {formatINR(r.rentAmount)}
                        <span style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: '500' }}>/month</span>
                        {r.effectiveFromMonthYear && (
                          <span style={{
                            display: 'inline-block',
                            fontSize: '0.64rem',
                            color: '#1d4ed8',
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontWeight: '700',
                            marginTop: '2px'
                          }}>
                            Eff: {r.effectiveFromMonthYear}
                          </span>
                        )}
                      </td>

                      {/* 5. TDS Applied */}
                      <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                        {r.applyTds ? (
                          <div>
                            <span style={{
                              background: '#fef3c7',
                              color: '#92400e',
                              fontSize: '0.7rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: '700'
                            }}>
                              {r.tdsMode === 'amount'
                                ? `₹${(r.tdsAmount || 0).toLocaleString('en-IN')} (Fixed)`
                                : `${r.tdsPercentage}% TDS`}
                            </span>
                            <span style={{ display: 'block', fontSize: '0.7rem', color: '#b45309', marginTop: '2px' }}>
                              - {formatINR(r.tdsAmount)}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>No TDS</span>
                        )}
                      </td>

                      {/* 6. Net Amount */}
                      <td style={{ padding: '14px 14px', verticalAlign: 'middle', textAlign: 'right', fontWeight: '800', color: '#166534' }}>
                        {formatINR(r.netAmount)}
                        <span style={{ display: 'block', fontSize: '0.68rem', color: '#16a34a', fontWeight: '500' }}>Net /mo</span>
                      </td>

                      {/* 7. Payment Starting Date */}
                      <td style={{ padding: '14px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap', color: '#334155', fontWeight: '600' }}>
                        {formatDate(r.startDate)}
                      </td>

                      {/* 8. Payment Ending Date */}
                      <td style={{ padding: '14px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <span style={{ color: '#1e3a8a', fontWeight: '700' }}>
                          {formatDate(r.endDate)}
                        </span>
                      </td>

                      {/* 9. Tenure (Months) */}
                      <td style={{ padding: '14px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <span style={{
                          background: '#e0e7ff',
                          color: '#3730a3',
                          fontSize: '0.75rem',
                          fontWeight: '800',
                          padding: '3px 8px',
                          borderRadius: '12px'
                        }}>
                          {r.tenureMonths} Mos
                        </span>
                      </td>

                      {/* 10. Total Commitment */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>
                        {formatINR(r.totalCommitment)}
                        <span style={{ display: 'block', fontSize: '0.68rem', color: '#2563eb', fontWeight: '600' }}>
                          Rent × {r.tenureMonths} Mos (Gross)
                        </span>
                      </td>

                      {/* 11. Total Paid */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'right', fontWeight: '800', color: '#16a34a' }}>
                        {formatINR(r.totalPaid)}
                        <span style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: '500' }}>
                          {r.paidMonthsCount} mos paid
                        </span>
                      </td>

                      {/* 12. Amount Outstanding */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'right', fontWeight: '800', color: r.amountOutstanding > 0 ? '#dc2626' : '#16a34a' }}>
                        {formatINR(r.amountOutstanding)}
                        <span style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: '500' }}>
                          {r.remainingMonths} mos left
                        </span>
                      </td>

                      {/* 13. Actions */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedRentalForEdit(r)}
                            title="Edit Rental Terms, Price & Effective Date"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: '1.5px solid #93c5fd',
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              boxShadow: '0 1px 2px rgba(37, 99, 235, 0.08)'
                            }}
                          >
                            <Edit size={13} />
                            <span>Edit Terms</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedRentalForPayout(r)}
                            title="Record Payout / Disbursement"
                            style={{
                              padding: '6px 8px',
                              borderRadius: '6px',
                              border: '1px solid #86efac',
                              background: '#f0fdf4',
                              color: '#16a34a',
                              cursor: 'pointer'
                            }}
                          >
                            <DollarSign size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedRentalForTransfer(r)}
                            title="Resale Transfer (Archive to Table 2)"
                            style={{
                              padding: '6px 8px',
                              borderRadius: '6px',
                              border: '1px solid #c7d2fe',
                              background: '#eef2ff',
                              color: '#4f46e5',
                              cursor: 'pointer'
                            }}
                          >
                            <Repeat size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteActiveRental(r)}
                            title="Delete / Unenroll Rental Record"
                            style={{
                              padding: '6px 8px',
                              borderRadius: '6px',
                              border: '1px solid #fecaca',
                              background: '#fef2f2',
                              color: '#dc2626',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. TABLE 2: PREVIOUS OWNERS TRAIL (HISTORICAL OWNERSHIP) */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="g-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: '14px 20px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <History size={18} color="#7c3aed" />
              <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0f172a' }}>
                Previous Owners Registry &amp; Fixed Term History
              </span>
            </div>
            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
              Records frozen upon resale transfer (no active outstanding tracking)
            </span>
          </div>

          {loadingHistory ? (
            <div style={{ padding: '24px' }}>
              <TableSkeleton rows={6} columns={10} />
            </div>
          ) : historyRecords.length === 0 ? (
            <EmptyState
              icon={History}
              title="No Previous Ownership History Yet"
              description="As flats undergo resale or transfer, previous owners will be chronologically archived here as 'Last Owner', '2nd Last Owner', etc."
            />
          ) : (
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1150px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '12px 16px', fontWeight: '800' }}>Flat No</th>
                    <th style={{ padding: '12px 14px', fontWeight: '800' }}>Sequence</th>
                    <th style={{ padding: '12px 16px', fontWeight: '800' }}>Previous Owner Name</th>
                    <th style={{ padding: '12px 14px', fontWeight: '800' }}>Registry Date</th>
                    <th style={{ padding: '12px 14px', fontWeight: '800', textAlign: 'right' }}>Rent Amount</th>
                    <th style={{ padding: '12px 14px', fontWeight: '800' }}>TDS Applied</th>
                    <th style={{ padding: '12px 14px', fontWeight: '800', textAlign: 'right' }}>Net Rent</th>
                    <th style={{ padding: '12px 14px', fontWeight: '800' }}>Payment Start Date</th>
                    <th style={{ padding: '12px 14px', fontWeight: '800' }}>Ending / Transfer Date</th>
                    <th style={{ padding: '12px 14px', fontWeight: '800', textAlign: 'center' }}>Tenure</th>
                    <th style={{ padding: '12px 16px', fontWeight: '800', textAlign: 'right' }}>Total Rent Disbursed</th>
                    <th style={{ padding: '12px 16px', fontWeight: '800' }}>Transferred To</th>
                    <th style={{ padding: '12px 14px', fontWeight: '800', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRecords.map((h, idx) => (
                    <tr
                      key={h.historyId || idx}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.15s ease',
                        fontSize: '0.82rem'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      {/* 1. Flat No */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <button
                          type="button"
                          onClick={() => navigate(`/inventory/flats/${h.flatId}`)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            color: '#2563eb',
                            fontWeight: '800',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <span>{h.flatNumber}</span>
                          <ExternalLink size={12} />
                        </button>
                      </td>

                      {/* 2. Sequence Label */}
                      <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                        <span style={{
                          background: h.sequenceIndex === 1 ? '#ede9fe' : '#f1f5f9',
                          color: h.sequenceIndex === 1 ? '#6d28d9' : '#475569',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: '800'
                        }}>
                          {h.sequenceLabel}
                        </span>
                      </td>

                      {/* 3. Previous Owner Name */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>{renderCellData(h.previousOwnerName)}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>{renderCellData(h.mobileNo)}</div>
                      </td>

                      {/* 4. Registry Date */}
                      <td style={{ padding: '14px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap', color: '#334155', fontWeight: '600' }}>
                        {formatDate(h.registryDate)}
                      </td>

                      {/* 5. Rent Amount */}
                      <td style={{ padding: '14px 14px', verticalAlign: 'middle', textAlign: 'right', fontWeight: '800', color: '#0f172a' }}>
                        {formatINR(h.rentAmount)}
                      </td>

                      {/* 6. TDS Applied */}
                      <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                        {h.applyTds ? (
                          <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                            {h.tdsPercentage}% TDS
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>No</span>
                        )}
                      </td>

                      {/* 7. Net Rent */}
                      <td style={{ padding: '14px 14px', verticalAlign: 'middle', textAlign: 'right', fontWeight: '800', color: '#166534' }}>
                        {formatINR(h.netAmount)}
                      </td>

                      {/* 8. Starting Date */}
                      <td style={{ padding: '14px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap', color: '#334155' }}>
                        {formatDate(h.startDate)}
                      </td>

                      {/* 9. Ending / Transfer Date */}
                      <td style={{ padding: '14px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap', color: '#b91c1c', fontWeight: '700' }}>
                        {formatDate(h.endDate)}
                      </td>

                      {/* 10. Tenure (Months) */}
                      <td style={{ padding: '14px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <span style={{ background: '#f1f5f9', color: '#334155', padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '700' }}>
                          {h.tenureMonths} Mos
                        </span>
                      </td>

                      {/* 11. Total Rent Disbursed */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'right', fontWeight: '800', color: '#16a34a' }}>
                        {formatINR(h.totalRentPaid)}
                      </td>

                      {/* 12. Transferred To */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <ArrowRight size={13} color="#6366f1" />
                          <span style={{ fontWeight: '700', color: '#312e81' }}>{renderCellData(h.transferredTo)}</span>
                        </div>
                      </td>

                      {/* 13. Actions */}
                      <td style={{ padding: '14px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteHistoryEntry(h)}
                          title="Delete Previous Owner Record"
                          style={{
                            padding: '5px 8px',
                            borderRadius: '6px',
                            border: '1px solid #fecaca',
                            background: '#fef2f2',
                            color: '#dc2626',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODALS */}
      {/* ========================================================================= */}
      <EditRentalTermsModal
        isOpen={!!selectedRentalForEdit}
        onClose={() => setSelectedRentalForEdit(null)}
        rental={selectedRentalForEdit}
        onUpdated={() => {
          fetchActiveRentals();
          fetchPreviousOwnersHistory();
        }}
      />

      <RecordPayoutModal
        isOpen={!!selectedRentalForPayout}
        onClose={() => setSelectedRentalForPayout(null)}
        rental={selectedRentalForPayout}
        onUpdated={() => {
          fetchActiveRentals();
          fetchPreviousOwnersHistory();
        }}
      />

      <TransferOwnershipModal
        isOpen={!!selectedRentalForTransfer}
        onClose={() => setSelectedRentalForTransfer(null)}
        rental={selectedRentalForTransfer}
        onTransferred={() => {
          fetchActiveRentals();
          fetchPreviousOwnersHistory();
        }}
      />

      {/* MANUAL RENTAL ENTRY MODAL */}
      <ManualRentalEntryModal
        isOpen={isManualEntryModalOpen}
        onClose={() => setIsManualEntryModalOpen(false)}
        onSuccess={() => {
          fetchActiveRentals();
          fetchPreviousOwnersHistory();
          toast.showSuccess('Flat enrolled into active rental register!');
        }}
      />

      {/* IMPORT RENTAL REGISTER BY EXCEL MODAL */}
      <ImportRentalModal
        isOpen={isImportRentalModalOpen}
        onClose={() => setIsImportRentalModalOpen(false)}
        onSuccess={() => {
          fetchActiveRentals();
          fetchPreviousOwnersHistory();
          toast.showSuccess('Rental register updated from Excel!');
        }}
      />

    </div>
  );
};

export default RentalManagementPage;
