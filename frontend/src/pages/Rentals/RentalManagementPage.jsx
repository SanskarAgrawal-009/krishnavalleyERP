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
  Trash2,
  FileText,
  FolderOpen,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  RotateCcw,
  Check,
  Phone,
  FileCheck
} from 'lucide-react';
import { rentalService } from '../../services/rentalService.js';
import { getFileUrl } from '../../services/api.js';
import { EditRentalTermsModal } from '../../components/rentals/EditRentalTermsModal.jsx';
import { RecordPayoutModal } from '../../components/rentals/RecordPayoutModal.jsx';
import { TransferOwnershipModal } from '../../components/rentals/TransferOwnershipModal.jsx';
import { ManualRentalEntryModal } from '../../components/rentals/ManualRentalEntryModal.jsx';
import { ImportRentalModal } from '../../components/rentals/ImportRentalModal.jsx';
import { FlatDocumentsModal } from '../../components/rentals/FlatDocumentsModal.jsx';
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

  // Filters & Ordering
  const [searchQuery, setSearchQuery] = useState('');
  const [tenureFilter, setTenureFilter] = useState('all');
  const [sortField, setSortField] = useState('flatNumber');
  const [sortOrder, setSortOrder] = useState('default'); // 'default' | 'asc' | 'desc'

  // Modals
  const [selectedRentalForEdit, setSelectedRentalForEdit] = useState(null);
  const [selectedRentalForPayout, setSelectedRentalForPayout] = useState(null);
  const [selectedRentalForTransfer, setSelectedRentalForTransfer] = useState(null);
  const [selectedFlatForDocs, setSelectedFlatForDocs] = useState(null);
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

  // Search trigger on submit
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
      return forExport ? 'No Data' : <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.72rem' }}>No Data</span>;
    }
    return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const renderCellData = (val, customStyle = {}) => {
    if (val === undefined || val === null || val === '' || val === '—' || val === '-' || val === 'null' || val === 'undefined' || val === 'On File') {
      return <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.72rem', ...customStyle }}>No Data</span>;
    }
    return val;
  };

  // Natural flat number comparison (e.g. A-001 < A-002 < A-014 < A-101)
  const naturalCompare = (a, b) => {
    return String(a || '').localeCompare(String(b || ''), undefined, { numeric: true, sensitivity: 'base' });
  };

  // Sorted Active Rentals Memo
  const sortedActiveRentals = useMemo(() => {
    const list = [...activeRentals];
    if (sortOrder === 'default') {
      return list.sort((a, b) => naturalCompare(a.flatNumber, b.flatNumber));
    }

    return list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'flatNumber':
          cmp = naturalCompare(a.flatNumber, b.flatNumber);
          break;
        case 'ownerName':
          cmp = (a.ownerName || '').localeCompare(b.ownerName || '');
          break;
        case 'registryDate': {
          const da = parseAnyDate(a.registryDate)?.getTime() || 0;
          const db = parseAnyDate(b.registryDate)?.getTime() || 0;
          cmp = da - db;
          break;
        }
        case 'startDate': {
          const da = parseAnyDate(a.startDate)?.getTime() || 0;
          const db = parseAnyDate(b.startDate)?.getTime() || 0;
          cmp = da - db;
          break;
        }
        case 'rentAmount':
          cmp = (Number(a.rentAmount) || 0) - (Number(b.rentAmount) || 0);
          break;
        case 'netAmount':
          cmp = (Number(a.netAmount) || 0) - (Number(b.netAmount) || 0);
          break;
        case 'totalPaid':
          cmp = (Number(a.totalPaid) || 0) - (Number(b.totalPaid) || 0);
          break;
        case 'amountOutstanding':
          cmp = (Number(a.amountOutstanding) || 0) - (Number(b.amountOutstanding) || 0);
          break;
        case 'tenureMonths':
          cmp = (Number(a.tenureMonths) || 0) - (Number(b.tenureMonths) || 0);
          break;
        default:
          cmp = naturalCompare(a.flatNumber, b.flatNumber);
      }
      return sortOrder === 'desc' ? -cmp : cmp;
    });
  }, [activeRentals, sortOrder, sortField]);

  // Sorted History Records Memo
  const sortedHistoryRecords = useMemo(() => {
    const list = [...historyRecords];
    if (sortOrder === 'default') {
      return list.sort((a, b) => naturalCompare(a.flatNumber, b.flatNumber));
    }

    return list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'flatNumber':
          cmp = naturalCompare(a.flatNumber, b.flatNumber);
          break;
        case 'ownerName':
          cmp = (a.previousOwnerName || '').localeCompare(b.previousOwnerName || '');
          break;
        case 'registryDate': {
          const da = parseAnyDate(a.registryDate)?.getTime() || 0;
          const db = parseAnyDate(b.registryDate)?.getTime() || 0;
          cmp = da - db;
          break;
        }
        case 'rentAmount':
          cmp = (Number(a.rentAmount) || 0) - (Number(b.rentAmount) || 0);
          break;
        case 'netAmount':
          cmp = (Number(a.netAmount) || 0) - (Number(b.netAmount) || 0);
          break;
        case 'totalPaid':
          cmp = (Number(a.totalRentPaid) || 0) - (Number(b.totalRentPaid) || 0);
          break;
        default:
          cmp = naturalCompare(a.flatNumber, b.flatNumber);
      }
      return sortOrder === 'desc' ? -cmp : cmp;
    });
  }, [historyRecords, sortOrder, sortField]);

  // Header click sorting
  const handleHeaderSort = (field) => {
    if (sortField === field) {
      if (sortOrder === 'asc') setSortOrder('desc');
      else if (sortOrder === 'desc') setSortOrder('default');
      else setSortOrder('asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (activeTab === 'active') {
      const headers = [
        'Flat No',
        'Owner Name',
        'Owner Mobile',
        'Registry Date',
        'Registry Document',
        'Rental Agreement',
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
      const rows = sortedActiveRentals.map((r) => [
        `"${r.flatNumber}"`,
        `"${r.ownerName}"`,
        `"${r.ownerMobile || ''}"`,
        `"${formatDate(r.registryDate, true)}"`,
        `"${r.registryDocument?.fileUrl ? 'Uploaded' : 'Pending'}"`,
        `"${r.agreementDocument?.fileUrl ? 'Uploaded' : 'Pending'}"`,
        r.rentAmount,
        r.applyTds ? `${r.tdsPercentage}% (-₹${r.tdsAmount})` : 'No',
        r.netAmount,
        r.tenureMonths,
        `"${formatDate(r.startDate, true)}"`,
        `"${formatDate(r.endDate, true)}"`,
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
      const rows = sortedHistoryRecords.map((h) => [
        `"${h.flatNumber}"`,
        `"${h.sequenceLabel}"`,
        `"${h.previousOwnerName}"`,
        `"${h.mobileNo}"`,
        `"${formatDate(h.registryDate, true)}"`,
        h.rentAmount,
        h.applyTds ? `${h.tdsPercentage}%` : 'No',
        h.netAmount,
        `"${formatDate(h.startDate, true)}"`,
        `"${formatDate(h.endDate, true)}"`,
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', paddingBottom: '40px' }}>
      
      {/* ========================================================================= */}
      {/* 1. TOP EXECUTIVE HEADER */}
      {/* ========================================================================= */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        padding: '4px 0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 6px 16px rgba(37, 99, 235, 0.3)'
          }}>
            <Repeat size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                Rental Management Hub
              </h1>
              <span style={{
                background: '#eff6ff',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
                fontSize: '0.72rem',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '12px'
              }}>
                Live Register
              </span>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: '#64748b', fontWeight: '500' }}>
              Guaranteed Rental Program • Minimum 3-Year Fixed Tenure • Multi-Owner Resale Trail &amp; Document Vault
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsManualEntryModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '9px',
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.84rem',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#1d4ed8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#2563eb'; }}
          >
            <Plus size={16} /> Manual Rental Entry
          </button>

          <button
            onClick={() => setIsImportRentalModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '9px',
              background: '#16a34a',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.84rem',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#15803d'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#16a34a'; }}
          >
            <FileSpreadsheet size={16} /> Import by Excel
          </button>

          <button
            onClick={() => navigate('/rentals/ledgers')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '9px',
              background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.84rem',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(124, 58, 237, 0.3)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.92'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            <BookOpen size={16} /> Passbook Ledgers Hub
          </button>

          <button
            onClick={handleExportCSV}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 14px',
              borderRadius: '9px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#334155',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'background 0.15s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
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
              padding: '9px 14px',
              borderRadius: '9px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#334155',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'background 0.15s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TOP KPI CARDS STRIP (REFINED MODERN AESTHETICS) */}
      {/* ========================================================================= */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '14px'
      }}>
        {/* Card 1: Enrolled Flats */}
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '16px',
          padding: '18px 20px',
          border: '1px solid #e2e8f0',
          borderTop: '3px solid #2563eb',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '800', letterSpacing: '0.04em' }}>ENROLLED FLATS</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={16} color="#2563eb" />
            </div>
          </div>
          <div style={{ fontSize: '1.7rem', fontWeight: '800', color: '#0f172a', margin: '8px 0 2px' }}>
            {kpis.totalUnits} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>Units</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: '600' }}>
            Active under 3-Yr Rent-Back
          </span>
        </div>

        {/* Card 2: Monthly Gross Yield */}
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
          borderRadius: '16px',
          padding: '18px 20px',
          border: '1px solid #bbf7d0',
          borderTop: '3px solid #16a34a',
          boxShadow: '0 4px 12px rgba(22, 163, 74, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: '#166534', fontWeight: '800', letterSpacing: '0.04em' }}>MONTHLY GROSS YIELD</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={16} color="#16a34a" />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#15803d', margin: '8px 0 2px' }}>
            {formatINR(kpis.totalMonthlyGross)}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: '600' }}>
            Total scheduled monthly payout
          </span>
        </div>

        {/* Card 3: Monthly Net Payout */}
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #ecfeff 100%)',
          borderRadius: '16px',
          padding: '18px 20px',
          border: '1px solid #a5f3fc',
          borderTop: '3px solid #0891b2',
          boxShadow: '0 4px 12px rgba(8, 145, 178, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: '#0e7490', fontWeight: '800', letterSpacing: '0.04em' }}>MONTHLY NET PAYOUT</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#cffafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={16} color="#0891b2" />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0e7490', margin: '8px 0 2px' }}>
            {formatINR(kpis.totalMonthlyNet)}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#0891b2', fontWeight: '600' }}>
            Disbursed Net after 10% TDS
          </span>
        </div>

        {/* Card 4: Total Disbursed */}
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)',
          borderRadius: '16px',
          padding: '18px 20px',
          border: '1px solid #e9d5ff',
          borderTop: '3px solid #7c3aed',
          boxShadow: '0 4px 12px rgba(124, 58, 237, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: '#581c87', fontWeight: '800', letterSpacing: '0.04em' }}>TOTAL DISBURSED</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={16} color="#7c3aed" />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#6d28d9', margin: '8px 0 2px' }}>
            {formatINR(kpis.totalDisbursed)}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#7c3aed', fontWeight: '600' }}>
            Cumulative to current owners
          </span>
        </div>

        {/* Card 5: Outstanding Balance */}
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)',
          borderRadius: '16px',
          padding: '18px 20px',
          border: '1px solid #fde68a',
          borderTop: '3px solid #d97706',
          boxShadow: '0 4px 12px rgba(217, 119, 6, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: '#92400e', fontWeight: '800', letterSpacing: '0.04em' }}>OUTSTANDING BALANCE</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={16} color="#d97706" />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#b45309', margin: '8px 0 2px' }}>
            {formatINR(kpis.totalOutstanding)}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: '600' }}>
            Remaining tenure liability
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. TABS, SEARCH, AND TABLE ORDERING CONTROLS TOOLBAR */}
      {/* ========================================================================= */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '14px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)'
      }}>
        {/* Row 1: Tab Switcher & Search Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          {/* Tab Buttons */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '10px', gap: '4px' }}>
            <button
              onClick={() => handleTabChange('active')}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'active' ? '#ffffff' : 'transparent',
                color: activeTab === 'active' ? '#0f172a' : '#64748b',
                fontWeight: '800',
                fontSize: '0.84rem',
                cursor: 'pointer',
                boxShadow: activeTab === 'active' ? '0 2px 4px rgba(0,0,0,0.08)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
            >
              <Building2 size={16} color={activeTab === 'active' ? '#2563eb' : '#64748b'} />
              <span>Table 1: Active Rental Register</span>
              <span style={{
                fontSize: '0.72rem',
                background: activeTab === 'active' ? '#eff6ff' : '#e2e8f0',
                color: activeTab === 'active' ? '#2563eb' : '#64748b',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: '800'
              }}>
                {activeRentals.length}
              </span>
            </button>

            <button
              onClick={() => handleTabChange('history')}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'history' ? '#ffffff' : 'transparent',
                color: activeTab === 'history' ? '#0f172a' : '#64748b',
                fontWeight: '800',
                fontSize: '0.84rem',
                cursor: 'pointer',
                boxShadow: activeTab === 'history' ? '0 2px 4px rgba(0,0,0,0.08)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
            >
              <History size={16} color={activeTab === 'history' ? '#7c3aed' : '#64748b'} />
              <span>Table 2: Previous Owners Trail</span>
              <span style={{
                fontSize: '0.72rem',
                background: activeTab === 'history' ? '#f5f3ff' : '#e2e8f0',
                color: activeTab === 'history' ? '#7c3aed' : '#64748b',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: '800'
              }}>
                {historyRecords.length}
              </span>
            </button>
          </div>

          {/* Search & Tenure Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <form onSubmit={handleSearchSubmit} style={{ position: 'relative', width: '280px' }}>
              <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder={activeTab === 'active' ? 'Search Flat No or Owner...' : 'Search Previous Owner or Flat...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  borderRadius: '9px',
                  border: '1.5px solid #e2e8f0',
                  fontSize: '0.82rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: '#f8fafc'
                }}
              />
            </form>

            {activeTab === 'active' && (
              <select
                value={tenureFilter}
                onChange={(e) => setTenureFilter(e.target.value)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '9px',
                  border: '1.5px solid #e2e8f0',
                  fontSize: '0.82rem',
                  background: '#f8fafc',
                  color: '#334155',
                  fontWeight: '600',
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

        {/* Row 2: Table Ordering Buttons (User Requested Feature) */}
        <div style={{
          borderTop: '1px solid #f1f5f9',
          paddingTop: '10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          {/* Order Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: '4px' }}>
              Table Order:
            </span>

            {/* Default Ascending Button */}
            <button
              type="button"
              onClick={() => {
                setSortField('flatNumber');
                setSortOrder('default');
                toast.showSuccess('Reset to Default Order (Flat No)');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '8px',
                border: sortOrder === 'default' ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                background: sortOrder === 'default' ? '#eff6ff' : '#ffffff',
                color: sortOrder === 'default' ? '#1d4ed8' : '#475569',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: sortOrder === 'default' ? '0 1px 3px rgba(37, 99, 235, 0.15)' : 'none'
              }}
            >
              <RotateCcw size={13} color={sortOrder === 'default' ? '#2563eb' : '#64748b'} />
              <span>Default Order</span>
              {sortOrder === 'default' && <Check size={13} color="#2563eb" />}
            </button>

            {/* Ascending Button */}
            <button
              type="button"
              onClick={() => {
                setSortOrder('asc');
                toast.showSuccess(`Sorted Ascending by ${sortField}`);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '8px',
                border: sortOrder === 'asc' ? '1.5px solid #16a34a' : '1px solid #cbd5e1',
                background: sortOrder === 'asc' ? '#f0fdf4' : '#ffffff',
                color: sortOrder === 'asc' ? '#15803d' : '#475569',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: sortOrder === 'asc' ? '0 1px 3px rgba(22, 163, 74, 0.15)' : 'none'
              }}
            >
              <ArrowUp size={13} color={sortOrder === 'asc' ? '#16a34a' : '#64748b'} />
              <span>Ascending</span>
              {sortOrder === 'asc' && <Check size={13} color="#16a34a" />}
            </button>

            {/* Descending Button */}
            <button
              type="button"
              onClick={() => {
                setSortOrder('desc');
                toast.showSuccess(`Sorted Descending by ${sortField}`);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '8px',
                border: sortOrder === 'desc' ? '1.5px solid #7c3aed' : '1px solid #cbd5e1',
                background: sortOrder === 'desc' ? '#f5f3ff' : '#ffffff',
                color: sortOrder === 'desc' ? '#6d28d9' : '#475569',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: sortOrder === 'desc' ? '0 1px 3px rgba(124, 58, 237, 0.15)' : 'none'
              }}
            >
              <ArrowDown size={13} color={sortOrder === 'desc' ? '#7c3aed' : '#64748b'} />
              <span>Descending</span>
              {sortOrder === 'desc' && <Check size={13} color="#7c3aed" />}
            </button>

            {/* Sort Field Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '6px' }}>
              <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '600' }}>by</span>
              <select
                value={sortField}
                onChange={(e) => {
                  setSortField(e.target.value);
                  if (sortOrder === 'default') setSortOrder('asc');
                }}
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.78rem',
                  background: '#ffffff',
                  color: '#0f172a',
                  fontWeight: '700',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="flatNumber">Flat No</option>
                <option value="ownerName">Owner Name</option>
                <option value="rentAmount">Gross Monthly Rent</option>
                <option value="netAmount">Net Monthly Rent</option>
                <option value="registryDate">Registry Date</option>
                <option value="startDate">Starting Date</option>
                <option value="totalPaid">Total Paid</option>
                <option value="amountOutstanding">Amount Outstanding</option>
                <option value="tenureMonths">Tenure Duration</option>
              </select>
            </div>
          </div>

          {/* Current order indicator */}
          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
            Showing <strong>{activeTab === 'active' ? sortedActiveRentals.length : sortedHistoryRecords.length}</strong> records • Order:{' '}
            <strong style={{ color: '#0f172a' }}>
              {sortOrder === 'default'
                ? 'Default Ascending (Flat No)'
                : `${sortField.replace(/([A-Z])/g, ' $1').toUpperCase()} (${sortOrder === 'asc' ? 'Ascending' : 'Descending'})`}
            </strong>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. TABLE 1: ACTIVE RENTAL REGISTER (CURRENT OWNERS) */}
      {/* ========================================================================= */}
      {activeTab === 'active' && (
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
          overflow: 'hidden'
        }}>
          {loadingActive ? (
            <div style={{ padding: '24px' }}>
              <TableSkeleton rows={8} columns={12} />
            </div>
          ) : sortedActiveRentals.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No Active Rentals Found"
              description="No flats are currently enrolled in the active rental program matching your filters."
            />
          ) : (
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1360px' }}>
                <thead>
                  <tr style={{
                    background: '#f8fafc',
                    borderBottom: '1.5px solid #e2e8f0',
                    color: '#475569',
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}>
                    {/* Flat No */}
                    <th
                      onClick={() => handleHeaderSort('flatNumber')}
                      style={{ padding: '14px 16px', fontWeight: '800', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>Flat No</span>
                        <ArrowUpDown size={12} color="#94a3b8" />
                      </div>
                    </th>

                    {/* Owner */}
                    <th
                      onClick={() => handleHeaderSort('ownerName')}
                      style={{ padding: '14px 16px', fontWeight: '800', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>Current Owner</span>
                        <ArrowUpDown size={12} color="#94a3b8" />
                      </div>
                    </th>

                    {/* Documents & Registry (NEW) */}
                    <th style={{ padding: '14px 16px', fontWeight: '800' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>Documents</span>
                        <span style={{ fontSize: '0.62rem', background: '#dcfce7', color: '#166534', padding: '1px 5px', borderRadius: '4px' }}>
                          REGISTRY
                        </span>
                      </div>
                    </th>

                    {/* Registry Date */}
                    <th
                      onClick={() => handleHeaderSort('registryDate')}
                      style={{ padding: '14px 14px', fontWeight: '800', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>Registry Date</span>
                        <ArrowUpDown size={12} color="#94a3b8" />
                      </div>
                    </th>

                    {/* Rent Amount */}
                    <th
                      onClick={() => handleHeaderSort('rentAmount')}
                      style={{ padding: '14px 14px', fontWeight: '800', textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                        <span>Rent Amount</span>
                        <ArrowUpDown size={12} color="#94a3b8" />
                      </div>
                    </th>

                    {/* TDS */}
                    <th style={{ padding: '14px 14px', fontWeight: '800' }}>TDS Applied</th>

                    {/* Net Amount */}
                    <th
                      onClick={() => handleHeaderSort('netAmount')}
                      style={{ padding: '14px 14px', fontWeight: '800', textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                        <span>Net Amount</span>
                        <ArrowUpDown size={12} color="#94a3b8" />
                      </div>
                    </th>

                    {/* Start Date */}
                    <th
                      onClick={() => handleHeaderSort('startDate')}
                      style={{ padding: '14px 14px', fontWeight: '800', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>Starting Date</span>
                        <ArrowUpDown size={12} color="#94a3b8" />
                      </div>
                    </th>

                    {/* End Date */}
                    <th style={{ padding: '14px 14px', fontWeight: '800' }}>Ending Date</th>

                    {/* Tenure */}
                    <th style={{ padding: '14px 14px', fontWeight: '800', textAlign: 'center' }}>Tenure</th>

                    {/* Total Paid */}
                    <th
                      onClick={() => handleHeaderSort('totalPaid')}
                      style={{ padding: '14px 16px', fontWeight: '800', textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                        <span>Total Paid</span>
                        <ArrowUpDown size={12} color="#94a3b8" />
                      </div>
                    </th>

                    {/* Outstanding */}
                    <th
                      onClick={() => handleHeaderSort('amountOutstanding')}
                      style={{ padding: '14px 16px', fontWeight: '800', textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                        <span>Outstanding</span>
                        <ArrowUpDown size={12} color="#94a3b8" />
                      </div>
                    </th>

                    {/* Actions */}
                    <th style={{ padding: '14px 16px', fontWeight: '800', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedActiveRentals.map((r, idx) => {
                    const hasRegistryDoc = Boolean(r.registryDocument?.fileUrl);
                    const hasAgreementDoc = Boolean(r.agreementDocument?.fileUrl);

                    return (
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
                              fontSize: '0.92rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}
                            title="Open full Flat Profile"
                          >
                            <span>{r.flatNumber}</span>
                            <ExternalLink size={12} />
                          </button>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginTop: '2px' }}>
                            Floor {r.floor === 0 ? 'G' : renderCellData(r.floor)} • {renderCellData(r.bhkType)}
                          </span>
                        </td>

                        {/* 2. Owner Name & Mobile */}
                        <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                          <div style={{ fontWeight: '700', color: '#0f172a' }}>{renderCellData(r.ownerName)}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {r.ownerMobile && <Phone size={10} color="#94a3b8" />}
                            <span>{renderCellData(r.ownerMobile)}</span>
                          </div>
                        </td>

                        {/* 3. Documents Pill Access (NEW) */}
                        <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {/* Registry Document Pill */}
                            {hasRegistryDoc ? (
                              <a
                                href={getFileUrl(r.registryDocument.fileUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="View Owner Registry Document (opens in new tab)"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.7rem',
                                  fontWeight: '700',
                                  background: '#dcfce7',
                                  color: '#15803d',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #bbf7d0',
                                  textDecoration: 'none',
                                  width: 'fit-content'
                                }}
                              >
                                <ShieldCheck size={12} />
                                <span>Registry Doc</span>
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setSelectedFlatForDocs(r)}
                                title="Add / Upload Owner Registry Document"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.68rem',
                                  fontWeight: '600',
                                  background: '#f8fafc',
                                  color: '#64748b',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  border: '1px dashed #cbd5e1',
                                  cursor: 'pointer',
                                  width: 'fit-content'
                                }}
                              >
                                <Plus size={11} />
                                <span>Add Registry</span>
                              </button>
                            )}

                            {/* Rental Agreement Document Pill */}
                            {hasAgreementDoc ? (
                              <a
                                href={getFileUrl(r.agreementDocument.fileUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="View Rental Agreement Contract"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.7rem',
                                  fontWeight: '700',
                                  background: '#eff6ff',
                                  color: '#1d4ed8',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #bfdbfe',
                                  textDecoration: 'none',
                                  width: 'fit-content'
                                }}
                              >
                                <FileText size={12} />
                                <span>Agreement</span>
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setSelectedFlatForDocs(r)}
                                title="Upload Rental Agreement"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.68rem',
                                  fontWeight: '600',
                                  background: '#f8fafc',
                                  color: '#64748b',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  border: '1px dashed #cbd5e1',
                                  cursor: 'pointer',
                                  width: 'fit-content'
                                }}
                              >
                                <Plus size={11} />
                                <span>Add Agreement</span>
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 4. Registry Date */}
                        <td style={{ padding: '14px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <span style={{ color: '#334155', fontWeight: '600' }}>
                            {formatDate(r.registryDate)}
                          </span>
                        </td>

                        {/* 5. Rent Amount */}
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

                        {/* 6. TDS Applied */}
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

                        {/* 7. Net Amount */}
                        <td style={{ padding: '14px 14px', verticalAlign: 'middle', textAlign: 'right', fontWeight: '800', color: '#166534' }}>
                          {formatINR(r.netAmount)}
                          <span style={{ display: 'block', fontSize: '0.68rem', color: '#16a34a', fontWeight: '500' }}>Net /mo</span>
                        </td>

                        {/* 8. Starting Date */}
                        <td style={{ padding: '14px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap', color: '#334155', fontWeight: '600' }}>
                          {formatDate(r.startDate)}
                        </td>

                        {/* 9. Ending Date */}
                        <td style={{ padding: '14px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <span style={{ color: '#1e3a8a', fontWeight: '700' }}>
                            {formatDate(r.endDate)}
                          </span>
                        </td>

                        {/* 10. Tenure (Months) */}
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
                            {/* Edit Terms */}
                            <button
                              type="button"
                              onClick={() => setSelectedRentalForEdit(r)}
                              title="Edit Rental Terms & Pricing"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 10px',
                                borderRadius: '7px',
                                border: '1.5px solid #93c5fd',
                                background: '#eff6ff',
                                color: '#1d4ed8',
                                fontSize: '0.74rem',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                            >
                              <Edit size={13} />
                              <span>Edit</span>
                            </button>

                            {/* Flat Documents Hub Modal */}
                            <button
                              type="button"
                              onClick={() => setSelectedFlatForDocs(r)}
                              title={`View & Manage Documents for Flat ${r.flatNumber}`}
                              style={{
                                padding: '6px 8px',
                                borderRadius: '7px',
                                border: '1px solid #bfdbfe',
                                background: hasRegistryDoc ? '#f0fdf4' : '#eff6ff',
                                color: hasRegistryDoc ? '#16a34a' : '#2563eb',
                                cursor: 'pointer'
                              }}
                            >
                              <FolderOpen size={14} />
                            </button>

                            {/* Record Payout */}
                            <button
                              type="button"
                              onClick={() => setSelectedRentalForPayout(r)}
                              title="Record Rental Disbursement Payout"
                              style={{
                                padding: '6px 8px',
                                borderRadius: '7px',
                                border: '1px solid #86efac',
                                background: '#f0fdf4',
                                color: '#16a34a',
                                cursor: 'pointer'
                              }}
                            >
                              <DollarSign size={14} />
                            </button>

                            {/* Resale Transfer */}
                            <button
                              type="button"
                              onClick={() => setSelectedRentalForTransfer(r)}
                              title="Resale Transfer (Archive to Table 2)"
                              style={{
                                padding: '6px 8px',
                                borderRadius: '7px',
                                border: '1px solid #c7d2fe',
                                background: '#eef2ff',
                                color: '#4f46e5',
                                cursor: 'pointer'
                              }}
                            >
                              <Repeat size={14} />
                            </button>

                            {/* Delete / Unenroll */}
                            <button
                              type="button"
                              onClick={() => handleDeleteActiveRental(r)}
                              title="Delete / Unenroll Rental Record"
                              style={{
                                padding: '6px 8px',
                                borderRadius: '7px',
                                border: '1px solid #fecaca',
                                background: '#fef2f2',
                                color: '#dc2626',
                                cursor: 'pointer'
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '16px 22px',
            background: 'linear-gradient(135deg, #f8fafc 0%, #faf5ff 100%)',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#f3e8ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#7c3aed'
              }}>
                <History size={18} />
              </div>
              <div>
                <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a' }}>
                  Previous Owners Registry &amp; Fixed Term History
                </span>
                <span style={{ display: 'block', fontSize: '0.74rem', color: '#64748b' }}>
                  Records frozen upon resale transfer (historical disbursement and terms trail)
                </span>
              </div>
            </div>
            <span style={{ fontSize: '0.74rem', color: '#7c3aed', background: '#f5f3ff', border: '1px solid #e9d5ff', padding: '3px 10px', borderRadius: '12px', fontWeight: '700' }}>
              {sortedHistoryRecords.length} Historical Records
            </span>
          </div>

          {loadingHistory ? (
            <div style={{ padding: '24px' }}>
              <TableSkeleton rows={6} columns={11} />
            </div>
          ) : sortedHistoryRecords.length === 0 ? (
            <EmptyState
              icon={History}
              title="No Previous Ownership History Yet"
              description="As flats undergo resale or transfer, previous owners will be chronologically archived here as 'Last Owner', '2nd Last Owner', etc."
            />
          ) : (
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1250px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '14px 16px', fontWeight: '800' }}>Flat No</th>
                    <th style={{ padding: '14px 14px', fontWeight: '800' }}>Sequence</th>
                    <th style={{ padding: '14px 16px', fontWeight: '800' }}>Previous Owner Name</th>
                    <th style={{ padding: '14px 16px', fontWeight: '800' }}>Archived Docs</th>
                    <th style={{ padding: '14px 14px', fontWeight: '800' }}>Registry Date</th>
                    <th style={{ padding: '14px 14px', fontWeight: '800', textAlign: 'right' }}>Rent Amount</th>
                    <th style={{ padding: '14px 14px', fontWeight: '800' }}>TDS Applied</th>
                    <th style={{ padding: '14px 14px', fontWeight: '800', textAlign: 'right' }}>Net Rent</th>
                    <th style={{ padding: '14px 14px', fontWeight: '800' }}>Payment Start Date</th>
                    <th style={{ padding: '14px 14px', fontWeight: '800' }}>Transfer Date</th>
                    <th style={{ padding: '14px 14px', fontWeight: '800', textAlign: 'center' }}>Tenure</th>
                    <th style={{ padding: '14px 16px', fontWeight: '800', textAlign: 'right' }}>Total Rent Disbursed</th>
                    <th style={{ padding: '14px 16px', fontWeight: '800' }}>Transferred To</th>
                    <th style={{ padding: '14px 14px', fontWeight: '800', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedHistoryRecords.map((h, idx) => (
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
                      {/* Flat No */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', fontWeight: '800', color: '#0f172a' }}>
                        <span style={{
                          background: '#f1f5f9',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.86rem'
                        }}>
                          {h.flatNumber}
                        </span>
                      </td>

                      {/* Sequence */}
                      <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                        <span style={{
                          background: '#f5f3ff',
                          color: '#7c3aed',
                          fontSize: '0.72rem',
                          fontWeight: '800',
                          padding: '3px 8px',
                          borderRadius: '12px'
                        }}>
                          {h.sequenceLabel}
                        </span>
                      </td>

                      {/* Previous Owner Name */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>{renderCellData(h.previousOwnerName)}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>{renderCellData(h.mobileNo)}</div>
                      </td>

                      {/* Archived Documents */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        {h.registryDocument?.fileUrl ? (
                          <a
                            href={getFileUrl(h.registryDocument.fileUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.7rem',
                              fontWeight: '700',
                              color: '#7c3aed',
                              background: '#f5f3ff',
                              border: '1px solid #e9d5ff',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              textDecoration: 'none'
                            }}
                          >
                            <ShieldCheck size={12} /> Registry
                          </a>
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.72rem' }}>No Doc</span>
                        )}
                      </td>

                      {/* Registry Date */}
                      <td style={{ padding: '14px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap', color: '#334155' }}>
                        {formatDate(h.registryDate)}
                      </td>

                      {/* Rent Amount */}
                      <td style={{ padding: '14px 14px', verticalAlign: 'middle', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>
                        {formatINR(h.rentAmount)}
                      </td>

                      {/* TDS Applied */}
                      <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                        {h.applyTds ? (
                          <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                            {h.tdsPercentage}% TDS
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>No</span>
                        )}
                      </td>

                      {/* Net Rent */}
                      <td style={{ padding: '14px 14px', verticalAlign: 'middle', textAlign: 'right', fontWeight: '800', color: '#166534' }}>
                        {formatINR(h.netAmount)}
                      </td>

                      {/* Payment Start Date */}
                      <td style={{ padding: '14px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap', color: '#334155' }}>
                        {formatDate(h.startDate)}
                      </td>

                      {/* Transfer Date */}
                      <td style={{ padding: '14px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap', color: '#7c3aed', fontWeight: '700' }}>
                        {formatDate(h.transferDate)}
                      </td>

                      {/* Tenure */}
                      <td style={{ padding: '14px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <span style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.74rem', fontWeight: '700', padding: '2px 6px', borderRadius: '10px' }}>
                          {h.tenureMonths} Mos
                        </span>
                      </td>

                      {/* Total Rent Disbursed */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'right', fontWeight: '800', color: '#16a34a' }}>
                        {formatINR(h.totalRentPaid)}
                      </td>

                      {/* Transferred To */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <span style={{ fontWeight: '700', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <ArrowRight size={12} color="#2563eb" />
                          <span>{renderCellData(h.transferredTo)}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteHistoryEntry(h)}
                          title="Delete History Entry"
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

      {/* FLAT DOCUMENTS HUB MODAL */}
      <FlatDocumentsModal
        isOpen={!!selectedFlatForDocs}
        onClose={() => setSelectedFlatForDocs(null)}
        flat={selectedFlatForDocs}
        onUpdated={() => {
          fetchActiveRentals();
          fetchPreviousOwnersHistory();
        }}
      />

      {/* EDIT RENTAL TERMS MODAL */}
      <EditRentalTermsModal
        isOpen={!!selectedRentalForEdit}
        onClose={() => setSelectedRentalForEdit(null)}
        rental={selectedRentalForEdit}
        onUpdated={() => {
          fetchActiveRentals();
          fetchPreviousOwnersHistory();
        }}
      />

      {/* RECORD PAYOUT MODAL */}
      <RecordPayoutModal
        isOpen={!!selectedRentalForPayout}
        onClose={() => setSelectedRentalForPayout(null)}
        rental={selectedRentalForPayout}
        onUpdated={() => {
          fetchActiveRentals();
          fetchPreviousOwnersHistory();
        }}
      />

      {/* TRANSFER OWNERSHIP MODAL */}
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
