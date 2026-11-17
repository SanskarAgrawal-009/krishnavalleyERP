import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  ChevronDown,
  Layers,
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
  FileCheck,
  X,
  Download,
  SlidersHorizontal,
  Info,
  Upload
} from 'lucide-react';
import { rentalService } from '../../services/rentalService.js';
import { getFileUrl } from '../../services/api.js';
import { EditRentalTermsModal } from '../../components/rentals/EditRentalTermsModal.jsx';
import { RecordPayoutModal } from '../../components/rentals/RecordPayoutModal.jsx';
import { TransferOwnershipModal } from '../../components/rentals/TransferOwnershipModal.jsx';
import { ManualRentalEntryModal } from '../../components/rentals/ManualRentalEntryModal.jsx';
import { ImportRentalModal } from '../../components/rentals/ImportRentalModal.jsx';
import { FlatDocumentsModal } from '../../components/rentals/FlatDocumentsModal.jsx';
import { BulkRentalDocumentsModal } from '../../components/rentals/BulkRentalDocumentsModal.jsx';
import { TableSkeleton } from '../../components/common/SkeletonLoader.jsx';
import { EmptyState } from '../../components/common/EmptyState.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export const RentalManagementPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const { user, isSuperAdmin, hasPermission, hasAnyPermission } = useAuth();
  const canCreateRental = isSuperAdmin || hasPermission('rentals:create') || hasPermission('rentals:manage');
  const canEditRental = isSuperAdmin || hasPermission('rentals:edit') || hasPermission('rentals:manage');
  const canDeleteRental = isSuperAdmin || hasPermission('rentals:delete') || hasPermission('rentals:manage');
  const canManageRentals = isSuperAdmin || hasPermission('rentals:manage');

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
  const [groupByFloor, setGroupByFloor] = useState(true);
  const [collapsedFloors, setCollapsedFloors] = useState({});
  const toggleFloor = (floor) => setCollapsedFloors((prev) => ({ ...prev, [floor]: !prev[floor] }));

  // Modals
  const [selectedRentalForEdit, setSelectedRentalForEdit] = useState(null);
  const [selectedRentalForPayout, setSelectedRentalForPayout] = useState(null);
  const [selectedRentalForTransfer, setSelectedRentalForTransfer] = useState(null);
  const [selectedFlatForDocs, setSelectedFlatForDocs] = useState(null);
  const [isManualEntryModalOpen, setIsManualEntryModalOpen] = useState(false);
  const [isImportRentalModalOpen, setIsImportRentalModalOpen] = useState(false);
  const [isBulkDocumentsModalOpen, setIsBulkDocumentsModalOpen] = useState(false);

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

  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      fetchActiveRentals();
      fetchPreviousOwnersHistory();
      return;
    }
    const timer = setTimeout(() => {
      fetchActiveRentals();
      fetchPreviousOwnersHistory();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, tenureFilter]);

  useEffect(() => {
    const handleRentalsUpdated = () => {
      fetchActiveRentals();
      fetchPreviousOwnersHistory();
    };
    window.addEventListener('rentalsUpdated', handleRentalsUpdated);
    window.addEventListener('flatBuybackRecorded', handleRentalsUpdated);
    return () => {
      window.removeEventListener('rentalsUpdated', handleRentalsUpdated);
      window.removeEventListener('flatBuybackRecorded', handleRentalsUpdated);
    };
  }, []);

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

  // Floor derivation and grouping
  const getFloor = (flatNumber) => {
    const num = parseInt(String(flatNumber || '').replace(/\D/g, ''), 10);
    return isNaN(num) ? 0 : num < 100 ? 0 : Math.floor(num / 100);
  };
  const floorLabel = (floor) => (floor === 0 ? 'Ground Floor' : `Floor ${floor}`);

  const floorGroups = useMemo(() => {
    const groups = {};
    sortedActiveRentals.forEach((r) => {
      const fl = getFloor(r.flatNumber);
      if (!groups[fl]) groups[fl] = [];
      groups[fl].push(r);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([floor, rows]) => ({
        floor: Number(floor),
        label: floorLabel(Number(floor)),
        rows,
        totalGross: rows.reduce((s, r) => s + (Number(r.rentAmount) || 0), 0),
        totalNet: rows.reduce((s, r) => s + (Number(r.netAmount) || 0), 0),
        totalOutstanding: rows.reduce((s, r) => s + (Number(r.amountOutstanding) || 0), 0),
        totalPaid: rows.reduce((s, r) => s + (Number(r.totalPaid) || 0), 0)
      }));
  }, [sortedActiveRentals]);

  const toggleAllFloors = (collapse) => {
    const next = {};
    floorGroups.forEach((g) => {
      next[g.floor] = collapse;
    });
    setCollapsedFloors(next);
  };

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

  // Combined sort helpers & filter checks
  const currentSortKey = sortOrder === 'default' ? `${sortField}_default` : `${sortField}_${sortOrder}`;

  const handleSortChange = (e) => {
    const val = e.target.value;
    if (val.endsWith('_default')) {
      const field = val.replace('_default', '');
      setSortField(field);
      setSortOrder('default');
    } else if (val.endsWith('_asc')) {
      const field = val.replace('_asc', '');
      setSortField(field);
      setSortOrder('asc');
    } else if (val.endsWith('_desc')) {
      const field = val.replace('_desc', '');
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const toggleSortDirection = () => {
    if (sortOrder === 'asc') {
      setSortOrder('desc');
    } else if (sortOrder === 'desc') {
      setSortOrder('asc');
    } else {
      setSortOrder('desc');
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setTenureFilter('all');
    setSortField('flatNumber');
    setSortOrder('default');
    toast.showSuccess('Filters and sorting reset to default');
  };

  const isFilteredOrSorted = searchQuery !== '' || tenureFilter !== 'all' || sortOrder !== 'default' || sortField !== 'flatNumber';

  // Render Table Head for Active Rentals
  const renderActiveTableHead = () => (
    <thead>
      <tr
        style={{
          background: '#f9fafb',
          borderBottom: '1px solid #e5e7eb',
          color: '#6b7280',
          fontSize: '0.78rem',
          fontWeight: 500
        }}
      >
        {/* Flat No */}
        <th
          onClick={() => handleHeaderSort('flatNumber')}
          style={{ padding: '12px 16px', fontWeight: 500, cursor: 'pointer', userSelect: 'none' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Flat</span>
            <ArrowUpDown size={12} color="#9ca3af" />
          </div>
        </th>

        {/* Owner */}
        <th
          onClick={() => handleHeaderSort('ownerName')}
          style={{ padding: '12px 16px', fontWeight: 500, cursor: 'pointer', userSelect: 'none' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Owner</span>
            <ArrowUpDown size={12} color="#9ca3af" />
          </div>
        </th>

        {/* Documents & Registry */}
        <th style={{ padding: '12px 16px', fontWeight: 500 }}>
          <span>Documents</span>
        </th>

        {/* Registry Date */}
        <th
          onClick={() => handleHeaderSort('registryDate')}
          style={{ padding: '12px 14px', fontWeight: 500, cursor: 'pointer', userSelect: 'none' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Registry date</span>
            <ArrowUpDown size={12} color="#9ca3af" />
          </div>
        </th>

        {/* Rent Amount */}
        <th
          onClick={() => handleHeaderSort('rentAmount')}
          style={{ padding: '12px 14px', fontWeight: 500, textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
            <span>Monthly rent</span>
            <ArrowUpDown size={12} color="#9ca3af" />
          </div>
        </th>

        {/* TDS */}
        <th style={{ padding: '12px 14px', fontWeight: 500 }}>TDS</th>

        {/* Net Amount */}
        <th
          onClick={() => handleHeaderSort('netAmount')}
          style={{ padding: '12px 14px', fontWeight: 500, textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
            <span>Net payout</span>
            <ArrowUpDown size={12} color="#9ca3af" />
          </div>
        </th>

        {/* Start Date */}
        <th
          onClick={() => handleHeaderSort('startDate')}
          style={{ padding: '12px 14px', fontWeight: 500, cursor: 'pointer', userSelect: 'none' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Start date</span>
            <ArrowUpDown size={12} color="#9ca3af" />
          </div>
        </th>

        {/* End Date */}
        <th style={{ padding: '12px 14px', fontWeight: 500 }}>End date</th>

        {/* Tenure */}
        <th style={{ padding: '12px 14px', fontWeight: 500, textAlign: 'center' }}>Tenure</th>

        {/* Total Paid */}
        <th
          onClick={() => handleHeaderSort('totalPaid')}
          style={{ padding: '12px 16px', fontWeight: 500, textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
            <span>Total paid</span>
            <ArrowUpDown size={12} color="#9ca3af" />
          </div>
        </th>

        {/* Outstanding */}
        <th
          onClick={() => handleHeaderSort('amountOutstanding')}
          style={{ padding: '12px 16px', fontWeight: 500, textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
            <span>Outstanding</span>
            <ArrowUpDown size={12} color="#9ca3af" />
          </div>
        </th>

        {/* Actions */}
        <th style={{ padding: '12px 16px', fontWeight: 500, textAlign: 'center' }}>Actions</th>
      </tr>
    </thead>
  );

  // Render Table Row for Active Rentals
  const renderActiveRentalRow = (r, idx) => {
    const hasRegistryDoc = Boolean(r.registryDocument?.fileUrl);
    const hasAgreementDoc = Boolean(r.agreementDocument?.fileUrl);

    return (
      <tr
        key={r._id || idx}
        style={{
          borderBottom: '1px solid #f3f4f6',
          fontSize: '0.82rem'
        }}
      >
        {/* 1. Flat No */}
        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
          <button
            type="button"
            onClick={() => navigate(`/inventory/flats/${r._id}`)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: '#17652f',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="Open flat profile"
          >
            <span>{r.flatNumber}</span>
            <ExternalLink size={12} />
          </button>
          <span style={{ fontSize: '0.72rem', color: '#6b7280', display: 'block', marginTop: '2px' }}>
            Floor {r.floor === 0 ? 'G' : renderCellData(r.floor)} • {renderCellData(r.bhkType)}
          </span>
        </td>

        {/* 2. Owner Name & Mobile */}
        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
          <div style={{ fontWeight: 500, color: '#111827' }}>{renderCellData(r.ownerName)}</div>
          <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {r.ownerMobile && <Phone size={10} color="#9ca3af" />}
            <span>{renderCellData(r.ownerMobile)}</span>
          </div>
        </td>

        {/* 3. Documents Pill Access */}
        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {/* Registry Document Pill */}
            {hasRegistryDoc ? (
              <a
                href={getFileUrl(r.registryDocument.fileUrl)}
                target="_blank"
                rel="noopener noreferrer"
                title="View registry document"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.7rem',
                  fontWeight: 500,
                  background: '#e8f2e5',
                  color: '#17652f',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  textDecoration: 'none',
                  width: 'fit-content'
                }}
              >
                <ShieldCheck size={12} />
                <span>Registry</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={() => setSelectedFlatForDocs(r)}
                title="Upload registry document"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.68rem',
                  fontWeight: 500,
                  background: '#ffffff',
                  color: '#6b7280',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: '1px dashed #d1d5db',
                  cursor: 'pointer',
                  width: 'fit-content'
                }}
              >
                <Plus size={11} />
                <span>Add registry</span>
              </button>
            )}

            {/* Rental Agreement Document Pill */}
            {hasAgreementDoc ? (
              <a
                href={getFileUrl(r.agreementDocument.fileUrl)}
                target="_blank"
                rel="noopener noreferrer"
                title="View rental agreement"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.7rem',
                  fontWeight: 500,
                  background: '#e8f2e5',
                  color: '#17652f',
                  padding: '2px 8px',
                  borderRadius: '4px',
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
                title="Upload rental agreement"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.68rem',
                  fontWeight: 500,
                  background: '#ffffff',
                  color: '#6b7280',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: '1px dashed #d1d5db',
                  cursor: 'pointer',
                  width: 'fit-content'
                }}
              >
                <Plus size={11} />
                <span>Add agreement</span>
              </button>
            )}
          </div>
        </td>

        {/* 4. Registry Date */}
        <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
          <span style={{ color: '#374151', fontWeight: 500 }}>
            {formatDate(r.registryDate)}
          </span>
        </td>

        {/* 5. Rent Amount */}
        <td style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: 'right', fontWeight: 500, color: '#111827' }}>
          {formatINR(r.rentAmount)}
          <span style={{ display: 'block', fontSize: '0.68rem', color: '#6b7280' }}>/month</span>
          {r.effectiveFromMonthYear && (
            <span style={{
              display: 'inline-block',
              fontSize: '0.64rem',
              color: '#17652f',
              background: '#e8f2e5',
              padding: '1px 6px',
              borderRadius: '4px',
              marginTop: '2px'
            }}>
              From: {r.effectiveFromMonthYear}
            </span>
          )}
        </td>

        {/* 6. TDS Applied */}
        <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
          {r.applyTds ? (
            <div>
              <span style={{
                background: '#f3f4f6',
                color: '#374151',
                fontSize: '0.7rem',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: 500
              }}>
                {r.tdsMode === 'amount'
                  ? `₹${(r.tdsAmount || 0).toLocaleString('en-IN')}`
                  : `${r.tdsPercentage}%`}
              </span>
              <span style={{ display: 'block', fontSize: '0.7rem', color: '#6b7280', marginTop: '2px' }}>
                - {formatINR(r.tdsAmount)}
              </span>
            </div>
          ) : (
            <span style={{ color: '#9ca3af', fontSize: '0.72rem' }}>None</span>
          )}
        </td>

        {/* 7. Net Amount */}
        <td style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: 'right', fontWeight: 600, color: '#17652f' }}>
          {formatINR(r.netAmount)}
          <span style={{ display: 'block', fontSize: '0.68rem', color: '#6b7280' }}>Net /mo</span>
        </td>

        {/* 8. Starting Date */}
        <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap', color: '#374151', fontWeight: 500 }}>
          {formatDate(r.startDate)}
        </td>

        {/* 9. Ending Date */}
        <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
          <span style={{ color: '#17652f', fontWeight: 500 }}>
            {formatDate(r.endDate)}
          </span>
        </td>

        {/* 10. Tenure (Months) */}
        <td style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
          <span style={{
            background: '#f3f4f6',
            color: '#374151',
            fontSize: '0.75rem',
            fontWeight: 500,
            padding: '3px 8px',
            borderRadius: '4px'
          }}>
            {r.tenureMonths} mos
          </span>
        </td>

        {/* 11. Total Paid */}
        <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'right', fontWeight: 500, color: '#111827' }}>
          {formatINR(r.totalPaid)}
          <span style={{ display: 'block', fontSize: '0.68rem', color: '#6b7280' }}>
            {r.paidMonthsCount} paid
          </span>
        </td>

        {/* 12. Amount Outstanding */}
        <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'right', fontWeight: 500, color: '#111827' }}>
          {formatINR(r.amountOutstanding)}
          <span style={{ display: 'block', fontSize: '0.68rem', color: '#6b7280' }}>
            {r.remainingMonths} left
          </span>
        </td>

        {/* 13. Actions */}
        <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            {/* Edit Terms */}
            {canEditRental && (
              <button
                type="button"
                onClick={() => setSelectedRentalForEdit(r)}
                title="Edit terms"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  background: '#ffffff',
                  color: '#111827',
                  fontSize: '0.74rem',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                <Edit size={13} />
                <span>Edit</span>
              </button>
            )}

            {/* Flat Documents Hub Modal */}
            <button
              type="button"
              onClick={() => setSelectedFlatForDocs(r)}
              title={`Documents for flat ${r.flatNumber}`}
              style={{
                padding: '5px 8px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
                color: '#111827',
                cursor: 'pointer'
              }}
            >
              <FolderOpen size={14} />
            </button>

            {/* Record Payout */}
            {(canEditRental || canManageRentals) && (
              <button
                type="button"
                onClick={() => setSelectedRentalForPayout(r)}
                title="Record payout"
                style={{
                  padding: '5px 8px',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  background: '#ffffff',
                  color: '#17652f',
                  cursor: 'pointer'
                }}
              >
                <DollarSign size={14} />
              </button>
            )}

            {/* Resale Transfer */}
            {canManageRentals && (
              <button
                type="button"
                onClick={() => setSelectedRentalForTransfer(r)}
                title="Transfer ownership"
                style={{
                  padding: '5px 8px',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  background: '#ffffff',
                  color: '#17652f',
                  cursor: 'pointer'
                }}
              >
                <Repeat size={14} />
              </button>
            )}

            {/* Delete / Unenroll */}
            {canDeleteRental && (
              <button
                type="button"
                onClick={() => handleDeleteActiveRental(r)}
                title="Delete rental"
                style={{
                  padding: '5px 8px',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  background: '#ffffff',
                  color: '#dc2626',
                  cursor: 'pointer'
                }}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
      
      {/* ========================================================================= */}
      {/* 1. TOP EXECUTIVE HEADER */}
      {/* ========================================================================= */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        padding: '2px 0'
      }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111827', margin: 0 }}>
            Rentals
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#6b7280' }}>
            Manage rental contracts, owner payout terms, passbook ledgers, and resale records.
          </p>
        </div>

        {/* Action Buttons Group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Primary CTA: Manual Rental Entry */}
          {canCreateRental && (
            <button
              onClick={() => setIsManualEntryModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '6px',
                background: '#17652f',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.82rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              <Plus size={16} />
              <span>Add rental</span>
            </button>
          )}

          {/* Import by Excel */}
          {canCreateRental && (
            <button
              onClick={() => setIsImportRentalModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '6px',
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                color: '#111827',
                fontSize: '0.82rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              <FileSpreadsheet size={15} style={{ color: '#17652f' }} />
              <span>Import rentals</span>
            </button>
          )}

          {/* Bulk Document Upload (Registry & Agreements) */}
          {(canEditRental || canManageRentals) && (
            <button
              onClick={() => setIsBulkDocumentsModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '6px',
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                color: '#111827',
                fontSize: '0.82rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
              title="Bulk upload registry documents and rent agreements"
            >
              <Upload size={15} style={{ color: '#17652f' }} />
              <span>Upload documents</span>
            </button>
          )}

          {/* Passbook Ledgers Hub */}
          {canManageRentals && (
            <button
              onClick={() => navigate('/rentals/ledgers')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '6px',
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                color: '#111827',
                fontSize: '0.82rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              <BookOpen size={15} style={{ color: '#17652f' }} />
              <span>Ledgers</span>
            </button>
          )}

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '6px',
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              color: '#111827',
              fontSize: '0.82rem',
              fontWeight: 500,
              cursor: 'pointer'
            }}
            title="Export to CSV"
          >
            <Download size={14} style={{ color: '#6b7280' }} />
            <span>Export CSV</span>
          </button>

          {/* Refresh Data */}
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
              padding: '8px 12px',
              borderRadius: '6px',
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              color: '#111827',
              fontSize: '0.82rem',
              fontWeight: 500,
              cursor: 'pointer'
            }}
            title="Refresh table data"
          >
            <RefreshCw size={14} style={{ color: '#6b7280' }} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TOP KPI CARDS STRIP */}
      {/* ========================================================================= */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '12px'
      }}>
        {/* Card 1: Enrolled Units */}
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: 500 }}>Enrolled units</span>
            <div style={{ width: '30px', height: '30px', borderRadius: '6px', background: '#e8f2e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={15} color="#17652f" />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111827', margin: '4px 0 2px' }}>
            {kpis.totalUnits} <span style={{ fontSize: '0.82rem', fontWeight: 400, color: '#6b7280' }}>units</span>
          </div>
          <span style={{ fontSize: '0.74rem', color: '#6b7280' }}>
            Active rental contracts
          </span>
        </div>

        {/* Card 2: Monthly Gross Rent */}
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: 500 }}>Monthly gross rent</span>
            <div style={{ width: '30px', height: '30px', borderRadius: '6px', background: '#e8f2e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={15} color="#17652f" />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111827', margin: '4px 0 2px' }}>
            {formatINR(kpis.totalMonthlyGross)}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#6b7280' }}>
            Total scheduled monthly payout
          </span>
        </div>

        {/* Card 3: Monthly Net Payout */}
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: 500 }}>Monthly net payout</span>
            <div style={{ width: '30px', height: '30px', borderRadius: '6px', background: '#e8f2e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={15} color="#17652f" />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#17652f', margin: '4px 0 2px' }}>
            {formatINR(kpis.totalMonthlyNet)}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#6b7280' }}>
            After TDS deductions
          </span>
        </div>

        {/* Card 4: Total Disbursed */}
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: 500 }}>Total disbursed</span>
            <div style={{ width: '30px', height: '30px', borderRadius: '6px', background: '#e8f2e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={15} color="#17652f" />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111827', margin: '4px 0 2px' }}>
            {formatINR(kpis.totalDisbursed)}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#6b7280' }}>
            Cumulative to current owners
          </span>
        </div>

        {/* Card 5: Outstanding Balance */}
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: 500 }}>Outstanding balance</span>
            <div style={{ width: '30px', height: '30px', borderRadius: '6px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={15} color="#b45309" />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111827', margin: '4px 0 2px' }}>
            {formatINR(kpis.totalOutstanding)}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#6b7280' }}>
            Remaining contract liability
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. TABS & SEARCH/FILTER WORKSPACE */}
      {/* ========================================================================= */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {/* Row 1: Clean Tabs on left + Status Count on right */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          {/* Segmented Tabs */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: '#f3f4f6',
            padding: '3px',
            borderRadius: '6px',
            gap: '3px'
          }}>
            <button
              type="button"
              onClick={() => handleTabChange('active')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '4px',
                border: 'none',
                background: activeTab === 'active' ? '#17652f' : 'transparent',
                color: activeTab === 'active' ? '#ffffff' : '#4b5563',
                fontWeight: activeTab === 'active' ? 600 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              <Building2 size={15} />
              <span>Active rentals</span>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '1px 7px',
                borderRadius: '10px',
                background: activeTab === 'active' ? '#e8f2e5' : '#e5e7eb',
                color: activeTab === 'active' ? '#17652f' : '#4b5563'
              }}>
                {activeRentals.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('history')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '4px',
                border: 'none',
                background: activeTab === 'history' ? '#17652f' : 'transparent',
                color: activeTab === 'history' ? '#ffffff' : '#4b5563',
                fontWeight: activeTab === 'history' ? 600 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              <History size={15} />
              <span>Resale history</span>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '1px 7px',
                borderRadius: '10px',
                background: activeTab === 'history' ? '#e8f2e5' : '#e5e7eb',
                color: activeTab === 'history' ? '#17652f' : '#4b5563'
              }}>
                {historyRecords.length}
              </span>
            </button>
          </div>

          {/* Record Count Badge */}
          <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
            <strong style={{ color: '#111827' }}>{activeTab === 'active' ? sortedActiveRentals.length : sortedHistoryRecords.length}</strong> flats
          </div>
        </div>

        {/* Row 2: Spacious Search & Filters */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'wrap',
          borderTop: '1px solid #f3f4f6',
          paddingTop: '10px'
        }}>
          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} style={{ position: 'relative', flex: '1 1 260px', minWidth: '220px' }}>
            <Search size={15} color="#9ca3af" style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder={activeTab === 'active' ? 'e.g. Flat 101, Rahul, or 98765' : 'e.g. Flat 101 or past owner'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 30px 8px 34px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                fontSize: '0.84rem',
                outline: 'none',
                boxSizing: 'border-box',
                background: '#ffffff',
                color: '#111827'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </form>

          {/* Tenure Filter */}
          {activeTab === 'active' && (
            <select
              value={tenureFilter}
              onChange={(e) => setTenureFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                fontSize: '0.82rem',
                background: tenureFilter !== 'all' ? '#e8f2e5' : '#ffffff',
                color: tenureFilter !== 'all' ? '#17652f' : '#111827',
                fontWeight: 500,
                outline: 'none',
                cursor: 'pointer',
                width: '140px',
                flexShrink: 0
              }}
            >
              <option value="all">All tenures</option>
              <option value="36">36 months</option>
              <option value="48">48 months</option>
              <option value="60">60 months</option>
              <option value="100">100 months</option>
            </select>
          )}

          {/* Sort By Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            <select
              value={currentSortKey}
              onChange={handleSortChange}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                fontSize: '0.82rem',
                background: sortOrder !== 'default' ? '#e8f2e5' : '#ffffff',
                color: sortOrder !== 'default' ? '#17652f' : '#111827',
                fontWeight: 500,
                outline: 'none',
                cursor: 'pointer',
                width: '180px'
              }}
              title="Sort table"
            >
              {activeTab === 'active' ? (
                <>
                  <option value="flatNumber_default">Sort: Flat number</option>
                  <option value="flatNumber_desc">Sort: Flat number (desc)</option>
                  <option value="ownerName_asc">Sort: Owner (A to Z)</option>
                  <option value="ownerName_desc">Sort: Owner (Z to A)</option>
                  <option value="rentAmount_desc">Sort: Gross rent (high to low)</option>
                  <option value="rentAmount_asc">Sort: Gross rent (low to high)</option>
                  <option value="netAmount_desc">Sort: Net payout (high to low)</option>
                  <option value="netAmount_asc">Sort: Net payout (low to high)</option>
                  <option value="amountOutstanding_desc">Sort: Outstanding (high to low)</option>
                  <option value="totalPaid_desc">Sort: Total paid (high to low)</option>
                  <option value="startDate_desc">Sort: Start date (newest)</option>
                  <option value="registryDate_desc">Sort: Registry date (newest)</option>
                  <option value="tenureMonths_desc">Sort: Tenure (longest)</option>
                </>
              ) : (
                <>
                  <option value="flatNumber_default">Sort: Flat number</option>
                  <option value="flatNumber_desc">Sort: Flat number (desc)</option>
                  <option value="ownerName_asc">Sort: Past owner (A to Z)</option>
                  <option value="ownerName_desc">Sort: Past owner (Z to A)</option>
                  <option value="rentAmount_desc">Sort: Gross rent (high to low)</option>
                  <option value="totalPaid_desc">Sort: Total paid (high to low)</option>
                  <option value="startDate_desc">Sort: Transfer date (newest)</option>
                </>
              )}
            </select>

            {/* Quick Direction Toggle Button */}
            <button
              type="button"
              onClick={toggleSortDirection}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '34px',
                height: '34px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
                color: '#4b5563',
                cursor: 'pointer'
              }}
              title={sortOrder === 'desc' ? 'Descending' : 'Ascending'}
            >
              {sortOrder === 'desc' ? <ArrowDown size={14} style={{ color: '#17652f' }} /> : <ArrowUp size={14} style={{ color: '#17652f' }} />}
            </button>
          </div>

          {/* Reset Filters & Sort Button */}
          {isFilteredOrSorted && (
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '7px 12px',
                borderRadius: '6px',
                border: '1px solid #fecaca',
                background: '#fef2f2',
                color: '#b91c1c',
                fontSize: '0.8rem',
                fontWeight: 500,
                cursor: 'pointer',
                flexShrink: 0
              }}
              title="Reset all filters and sorting"
            >
              <RotateCcw size={12} />
              <span>Reset filters</span>
            </button>
          )}

          {/* Active Tab: Floor Grouping Controls */}
          {activeTab === 'active' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setGroupByFloor((g) => !g)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${groupByFloor ? '#17652f' : '#e5e7eb'}`,
                  background: groupByFloor ? '#e8f2e5' : '#ffffff',
                  color: groupByFloor ? '#17652f' : '#374151',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
                title="Toggle floor-wise grouped tables"
              >
                <Layers size={14} />
                <span>{groupByFloor ? 'Grouped by floor' : 'Single table'}</span>
              </button>

              {groupByFloor && floorGroups.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const allCollapsed = floorGroups.every((g) => collapsedFloors[g.floor]);
                    toggleAllFloors(!allCollapsed);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '7px 11px',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                    background: '#ffffff',
                    color: '#4b5563',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  <span>{floorGroups.every((g) => collapsedFloors[g.floor]) ? 'Expand all' : 'Collapse all'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. TABLE 1: ACTIVE RENTAL REGISTER (CURRENT OWNERS) */}
      {/* ========================================================================= */}
      {activeTab === 'active' && (
        <>
          {loadingActive ? (
            <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px' }}>
              <TableSkeleton rows={8} columns={12} />
            </div>
          ) : sortedActiveRentals.length === 0 ? (
            <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <EmptyState
                icon={Building2}
                title="No active rentals found"
                description="No flats are currently enrolled in the active rental program matching your filters."
              />
            </div>
          ) : groupByFloor ? (
            /* Floor-by-Floor Grouped Tables */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {floorGroups.map((group) => {
                const isCollapsed = Boolean(collapsedFloors[group.floor]);
                return (
                  <div
                    key={group.floor}
                    style={{
                      background: '#ffffff',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      overflow: 'hidden',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                    }}
                  >
                    {/* Floor Header Bar */}
                    <div
                      onClick={() => toggleFloor(group.floor)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px',
                        padding: '12px 18px',
                        background: isCollapsed ? '#fafafa' : '#f8faf9',
                        borderBottom: isCollapsed ? 'none' : '1px solid #e5e7eb',
                        cursor: 'pointer',
                        userSelect: 'none',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      {/* Left: Tower & Floor Info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            background: '#e8f2e5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#17652f'
                          }}
                        >
                          <Building2 size={15} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#111827' }}>
                              Tower A — {group.label}
                            </span>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                padding: '2px 8px',
                                borderRadius: '10px',
                                background: '#e8f2e5',
                                color: '#17652f'
                              }}
                            >
                              {group.rows.length} {group.rows.length === 1 ? 'flat' : 'flats'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Floor Metrics & Expand Icon */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.78rem' }}>
                          <div>
                            <span style={{ color: '#6b7280' }}>Monthly Gross: </span>
                            <strong style={{ color: '#111827' }}>{formatINR(group.totalGross)}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#6b7280' }}>Net Payout: </span>
                            <strong style={{ color: '#17652f' }}>{formatINR(group.totalNet)}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#6b7280' }}>Outstanding: </span>
                            <strong style={{ color: '#b45309' }}>{formatINR(group.totalOutstanding)}</strong>
                          </div>
                        </div>

                        <div
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '4px',
                            background: '#ffffff',
                            border: '1px solid #e5e7eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#6b7280'
                          }}
                        >
                          {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                        </div>
                      </div>
                    </div>

                    {/* Floor Table */}
                    {!isCollapsed && (
                      <div className="table-responsive" style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1360px' }}>
                          {renderActiveTableHead()}
                          <tbody>
                            {group.rows.map((r, idx) => renderActiveRentalRow(r, idx))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Single Large Table View */
            <div
              style={{
                background: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                overflow: 'hidden'
              }}
            >
              <div className="table-responsive" style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1360px' }}>
                  {renderActiveTableHead()}
                  <tbody>
                    {sortedActiveRentals.map((r, idx) => renderActiveRentalRow(r, idx))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* 5. TABLE 2: PREVIOUS OWNERS TRAIL (HISTORICAL OWNERSHIP) */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div style={{
          background: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '16px 20px',
            background: '#f9fafb',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div>
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#111827' }}>
                Resale history
              </span>
              <span style={{ display: 'block', fontSize: '0.78rem', color: '#6b7280', marginTop: '2px' }}>
                Archived records from ownership transfers and past rental terms.
              </span>
            </div>
            <span style={{ fontSize: '0.74rem', color: '#17652f', background: '#e8f2e5', padding: '2px 8px', borderRadius: '4px', fontWeight: 500 }}>
              {sortedHistoryRecords.length} records
            </span>
          </div>

          {loadingHistory ? (
            <div style={{ padding: '24px' }}>
              <TableSkeleton rows={6} columns={11} />
            </div>
          ) : sortedHistoryRecords.length === 0 ? (
            <EmptyState
              icon={History}
              title="No resale records found"
              description="When flats are transferred or resold, historical owner records will appear here."
            />
          ) : (
            <div className="table-responsive" style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1250px' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontSize: '0.78rem', fontWeight: 500 }}>
                    <th style={{ padding: '12px 16px', fontWeight: 500 }}>Flat</th>
                    <th style={{ padding: '12px 14px', fontWeight: 500 }}>Sequence</th>
                    <th style={{ padding: '12px 16px', fontWeight: 500 }}>Previous owner</th>
                    <th style={{ padding: '12px 16px', fontWeight: 500 }}>Documents</th>
                    <th style={{ padding: '12px 14px', fontWeight: 500 }}>Registry date</th>
                    <th style={{ padding: '12px 14px', fontWeight: 500, textAlign: 'right' }}>Monthly rent</th>
                    <th style={{ padding: '12px 14px', fontWeight: 500 }}>TDS</th>
                    <th style={{ padding: '12px 14px', fontWeight: 500, textAlign: 'right' }}>Net payout</th>
                    <th style={{ padding: '12px 14px', fontWeight: 500 }}>Start date</th>
                    <th style={{ padding: '12px 14px', fontWeight: 500 }}>Transfer date</th>
                    <th style={{ padding: '12px 14px', fontWeight: 500, textAlign: 'center' }}>Tenure</th>
                    <th style={{ padding: '12px 16px', fontWeight: 500, textAlign: 'right' }}>Total disbursed</th>
                    <th style={{ padding: '12px 16px', fontWeight: 500 }}>Transferred to</th>
                    <th style={{ padding: '12px 14px', fontWeight: 500, textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedHistoryRecords.map((h, idx) => (
                    <tr
                      key={h.historyId || idx}
                      style={{
                        borderBottom: '1px solid #f3f4f6',
                        fontSize: '0.82rem'
                      }}
                    >
                      {/* Flat No */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle', fontWeight: 600, color: '#111827' }}>
                        {h.flatNumber}
                      </td>

                      {/* Sequence */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                        <span style={{
                          background: '#f3f4f6',
                          color: '#374151',
                          fontSize: '0.72rem',
                          fontWeight: 500,
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          {h.sequenceLabel}
                        </span>
                      </td>

                      {/* Previous Owner Name */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 500, color: '#111827' }}>{renderCellData(h.previousOwnerName)}</div>
                        <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '2px' }}>{renderCellData(h.mobileNo)}</div>
                      </td>

                      {/* Archived Documents */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
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
                              fontWeight: 500,
                              color: '#17652f',
                              background: '#e8f2e5',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              textDecoration: 'none'
                            }}
                          >
                            <ShieldCheck size={12} /> Registry
                          </a>
                        ) : (
                          <span style={{ color: '#9ca3af', fontSize: '0.72rem' }}>None</span>
                        )}
                      </td>

                      {/* Registry Date */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap', color: '#374151' }}>
                        {formatDate(h.registryDate)}
                      </td>

                      {/* Rent Amount */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: 'right', fontWeight: 500, color: '#111827' }}>
                        {formatINR(h.rentAmount)}
                      </td>

                      {/* TDS Applied */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                        {h.applyTds ? (
                          <span style={{ background: '#f3f4f6', color: '#374151', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 500 }}>
                            {h.tdsPercentage}%
                          </span>
                        ) : (
                          <span style={{ color: '#9ca3af', fontSize: '0.72rem' }}>None</span>
                        )}
                      </td>

                      {/* Net Rent */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: 'right', fontWeight: 500, color: '#17652f' }}>
                        {formatINR(h.netAmount)}
                      </td>

                      {/* Payment Start Date */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap', color: '#374151' }}>
                        {formatDate(h.startDate)}
                      </td>

                      {/* Transfer Date */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap', color: '#17652f', fontWeight: 500 }}>
                        {formatDate(h.transferDate)}
                      </td>

                      {/* Tenure */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <span style={{ background: '#f3f4f6', color: '#475569', fontSize: '0.74rem', fontWeight: 500, padding: '2px 6px', borderRadius: '4px' }}>
                          {h.tenureMonths} mos
                        </span>
                      </td>

                      {/* Total Rent Disbursed */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'right', fontWeight: 500, color: '#17652f' }}>
                        {formatINR(h.totalRentPaid)}
                      </td>

                      {/* Transferred To */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                        <span style={{ fontWeight: 500, color: '#111827', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <ArrowRight size={12} color="#17652f" />
                          <span>{renderCellData(h.transferredTo)}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
                        {canDeleteRental && (
                          <button
                            type="button"
                            onClick={() => handleDeleteHistoryEntry(h)}
                            title="Delete history entry"
                            style={{
                              padding: '5px 8px',
                              borderRadius: '6px',
                              border: '1px solid #e5e7eb',
                              background: '#ffffff',
                              color: '#dc2626',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
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

      {/* BULK DOCUMENTS (REGISTRY / AGREEMENT) UPLOAD MODAL */}
      <BulkRentalDocumentsModal
        isOpen={isBulkDocumentsModalOpen}
        onClose={() => setIsBulkDocumentsModalOpen(false)}
        flats={activeRentals}
        onUpdated={() => {
          fetchActiveRentals();
          fetchPreviousOwnersHistory();
        }}
      />

    </div>
  );
};

export default RentalManagementPage;
