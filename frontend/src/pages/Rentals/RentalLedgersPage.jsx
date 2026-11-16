import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Building2,
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  Calculator,
  ArrowRight,
  CheckCircle2,
  Clock,
  ChevronRight,
  CreditCard,
  AlertCircle,
  ExternalLink,
  Trash2,
  Edit
} from 'lucide-react';
import { rentalService } from '../../services/rentalService.js';
import { UploadLedgerCalculateModal } from '../../components/rentals/UploadLedgerCalculateModal.jsx';
import { PassbookStatementModal } from '../../components/rentals/PassbookStatementModal.jsx';
import { EditRentalTermsModal } from '../../components/rentals/EditRentalTermsModal.jsx';
import { TableSkeleton } from '../../components/common/SkeletonLoader.jsx';
import { EmptyState } from '../../components/common/EmptyState.jsx';
import { useToast } from '../../context/ToastContext.jsx';

export const RentalLedgersPage = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [ledgers, setLedgers] = useState([]);
  const [kpis, setKpis] = useState({
    totalAccounts: 0,
    totalDisbursedAll: 0,
    totalOutstandingAll: 0,
    totalCommitmentAll: 0,
    totalPaidMonthsAll: 0
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [tenureFilter, setTenureFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isUploadCalculateModalOpen, setIsUploadCalculateModalOpen] = useState(false);
  const [selectedLedgerForPassbook, setSelectedLedgerForPassbook] = useState(null);
  const [selectedLedgerForEdit, setSelectedLedgerForEdit] = useState(null);
  const [autoGenerating, setAutoGenerating] = useState(false);

  const fetchLedgers = async () => {
    setLoading(true);
    try {
      const res = await rentalService.getRentalLedgers({
        search: searchQuery,
        tenure: tenureFilter !== 'all' ? tenureFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined
      });
      if (res.success) {
        setLedgers(res.data || []);
        if (res.kpis) setKpis(res.kpis);
      }
    } catch (err) {
      console.error('Error fetching rental ledgers:', err);
      toast.showError('Failed to load rental passbook ledgers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedgers();
  }, [tenureFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLedgers();
  };

  // Auto-generate all from Active Rental Register
  const handleAutoGenerateAll = async () => {
    if (!window.confirm('Auto-generate and synchronize full tenure passbook ledgers for all active rental properties?')) {
      return;
    }

    setAutoGenerating(true);
    try {
      const res = await rentalService.autoGenerateLedgers();
      if (res.success) {
        toast.showSuccess(res.message || 'Passbook ledgers generated for all active properties!');
        fetchLedgers();
      } else {
        toast.showError(res.message || 'Failed to auto-generate passbooks');
      }
    } catch (err) {
      console.error('Error auto-generating passbooks:', err);
      toast.showError('Server error while generating passbook ledgers');
    } finally {
      setAutoGenerating(false);
    }
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
      return <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.72rem', ...customStyle }}>No Data</span>;
    }
    return val;
  };

  // Export CSV Summary
  const handleExportCSV = () => {
    const headers = [
      'Flat No',
      'Owner Name',
      'Owner Mobile',
      'Tenure (Months)',
      'Monthly Net Rent',
      'Monthly Gross Rent',
      'TDS Deducted',
      'Total Paid',
      'Paid Months',
      'Remaining Balance',
      'Start Date',
      'End Date',
      'Completion %'
    ];

    const rows = ledgers.map((l) => [
      `"${l.flatNumber}"`,
      `"${l.ownerName}"`,
      `"${l.ownerMobile}"`,
      l.tenureMonths,
      l.netRent,
      l.grossRent,
      l.tdsAmount,
      l.totalPaid,
      l.paidCount,
      l.amountOutstanding,
      `"${formatDate(l.startDate)}"`,
      `"${formatDate(l.endDate)}"`,
      `${l.completionPercentage}%`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rental_Passbook_Ledgers_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.showSuccess('Exported master rental ledger to CSV!');
  };

  // Delete / Unenroll Rental Ledger Entry
  const handleDeleteLedger = async (ledger) => {
    if (!ledger) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to delete Flat ${ledger.flatNumber} (${ledger.ownerName}) from the rental ledger?\n\nThis will reset its guaranteed rental commitment and clear all scheduled passbook ledger entries.`
    );
    if (!confirmDelete) return;

    try {
      const res = await rentalService.deleteRental(ledger.flatId);
      if (res.success) {
        toast.showSuccess(res.message || `Flat ${ledger.flatNumber} passbook ledger deleted!`);
        fetchLedgers();
      } else {
        toast.showError(res.message || 'Failed to delete passbook ledger');
      }
    } catch (err) {
      console.error('Error deleting ledger:', err);
      toast.showError('Server error deleting passbook ledger');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
      
      {/* 1. TOP EXECUTIVE HEADER */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111827', margin: 0 }}>
            Rental ledgers
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#6b7280' }}>
            Passbook accounts, monthly schedules, and settlement records.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          
          <button
            onClick={() => setIsUploadCalculateModalOpen(true)}
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
            <Calculator size={15} /> Upload Excel
          </button>

          <button
            onClick={handleAutoGenerateAll}
            disabled={autoGenerating}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '6px',
              background: '#ffffff',
              color: '#111827',
              border: '1px solid #e5e7eb',
              fontSize: '0.82rem',
              fontWeight: 500,
              cursor: autoGenerating ? 'not-allowed' : 'pointer'
            }}
          >
            <Sparkles size={15} style={{ color: '#17652f' }} />
            {autoGenerating ? 'Generating...' : 'Sync register'}
          </button>

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
          >
            <FileSpreadsheet size={15} style={{ color: '#17652f' }} /> Export CSV
          </button>

          <button
            onClick={() => navigate('/rentals')}
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
          >
            <Building2 size={15} /> Active rentals
          </button>

          <button
            onClick={fetchLedgers}
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
            title="Refresh"
          >
            <RefreshCw size={14} style={{ color: '#6b7280' }} />
          </button>
        </div>
      </div>

      {/* 2. TOP KPI CARDS STRIP */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px'
        }}
      >
        {/* Card 1 */}
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 500, color: '#6b7280' }}>
              Enrolled passbooks
            </span>
            <Users size={16} color="#17652f" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111827' }}>
            {kpis.totalAccounts} <span style={{ fontSize: '0.82rem', fontWeight: 400, color: '#6b7280' }}>flats</span>
          </div>
          <span style={{ fontSize: '0.74rem', color: '#6b7280' }}>
            Active rental contracts
          </span>
        </div>

        {/* Card 2 */}
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 500, color: '#6b7280' }}>
              Total paid
            </span>
            <CheckCircle2 size={16} color="#17652f" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#17652f' }}>
            {formatINR(kpis.totalDisbursedAll)}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#6b7280' }}>
            {kpis.totalPaidMonthsAll} months settled
          </span>
        </div>

        {/* Card 3 */}
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 500, color: '#6b7280' }}>
              Remaining liability
            </span>
            <TrendingUp size={16} color="#6b7280" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111827' }}>
            {formatINR(kpis.totalOutstandingAll)}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#6b7280' }}>
            Scheduled upcoming disbursals
          </span>
        </div>

        {/* Card 4 */}
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 500, color: '#6b7280' }}>
              Total commitment
            </span>
            <DollarSign size={16} color="#17652f" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111827' }}>
            {formatINR(kpis.totalCommitmentAll)}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#6b7280' }}>
            Gross contract liability
          </span>
        </div>
      </div>

      {/* 3. SEARCH & FILTERS BAR */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '8px',
          padding: '12px 16px',
          border: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '260px' }}>
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '360px'
            }}
          >
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9ca3af'
              }}
            />
            <input
              type="text"
              placeholder="e.g. Flat 101, Rahul, or 98765"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                fontSize: '0.84rem',
                outline: 'none',
                background: '#ffffff',
                color: '#111827'
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              backgroundColor: '#17652f',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Search
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>Tenure:</span>
            <select
              value={tenureFilter}
              onChange={(e) => setTenureFilter(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                fontSize: '0.8rem',
                backgroundColor: '#ffffff',
                color: '#111827'
              }}
            >
              <option value="all">All tenures</option>
              <option value="36">36 months</option>
              <option value="24">24 months</option>
              <option value="12">12 months</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                fontSize: '0.8rem',
                backgroundColor: '#ffffff',
                color: '#111827'
              }}
            >
              <option value="all">All passbooks</option>
              <option value="active">Active</option>
              <option value="completed">Settled</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. MASTER PASSBOOKS TABLE */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}
      >
        {loading ? (
          <TableSkeleton rows={8} columns={8} />
        ) : ledgers.length === 0 ? (
          <EmptyState
            title="No passbooks found"
            message="No active customer passbooks match your search criteria."
            icon={BookOpen}
            actionLabel="Upload Excel"
            onAction={() => setIsUploadCalculateModalOpen(true)}
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '12px 14px', fontWeight: 500, color: '#6b7280' }}>Flat</th>
                  <th style={{ padding: '12px 14px', fontWeight: 500, color: '#6b7280' }}>Owner</th>
                  <th style={{ padding: '12px 14px', fontWeight: 500, color: '#6b7280' }}>Tenure schedule</th>
                  <th style={{ padding: '12px 14px', fontWeight: 500, color: '#6b7280', textAlign: 'right' }}>Monthly net rent</th>
                  <th style={{ padding: '12px 14px', fontWeight: 500, color: '#6b7280', textAlign: 'right' }}>Total disbursed</th>
                  <th style={{ padding: '12px 14px', fontWeight: 500, color: '#6b7280', textAlign: 'right' }}>Remaining balance</th>
                  <th style={{ padding: '12px 14px', fontWeight: 500, color: '#6b7280' }}>Progress</th>
                  <th style={{ padding: '12px 14px', fontWeight: 500, color: '#6b7280', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ledgers.map((item, idx) => (
                  <tr
                    key={item.flatId || idx}
                    style={{
                      borderBottom: '1px solid #f3f4f6'
                    }}
                  >
                    {/* Flat / Unit */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.88rem' }}>
                        {item.flatNumber}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                        {item.floor ? `Floor ${item.floor}` : ''} {item.bhkType ? `• ${item.bhkType}` : ''}
                      </span>
                    </td>

                    {/* Owner & Contact */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 500, color: '#111827' }}>
                        {renderCellData(item.ownerName)}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#6b7280' }}>
                        {renderCellData(item.ownerMobile)} {item.ownerPan ? `• PAN: ${item.ownerPan}` : ''}
                      </div>
                    </td>

                    {/* Tenure Schedule */}
                    <td style={{ padding: '12px 14px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: '#f3f4f6',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          color: '#374151'
                        }}
                      >
                        {item.tenureMonths} mos
                      </span>
                      <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '2px' }}>
                        {formatDate(item.startDate)} → {formatDate(item.endDate)}
                      </div>
                    </td>

                    {/* Monthly Net Rent */}
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, color: '#17652f' }}>
                        {formatINR(item.netRent)}
                      </div>
                      <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                        Gross: {formatINR(item.grossRent)}
                      </span>
                    </td>

                    {/* Total Disbursed */}
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, color: '#111827' }}>
                        {formatINR(item.totalPaid)}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                        {item.paidCount} paid
                      </span>
                    </td>

                    {/* Remaining Balance */}
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, color: '#111827' }}>
                        {formatINR(item.amountOutstanding)}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                        {Math.max(0, item.tenureMonths - item.paidCount)} remaining
                      </span>
                    </td>

                    {/* Disbursal Progress */}
                    <td style={{ padding: '12px 14px', minWidth: '150px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 500, color: '#111827' }}>
                          {item.completionPercentage}%
                        </span>
                        <span style={{ color: '#6b7280' }}>
                          {item.paidCount} / {item.tenureMonths} mos
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '5px', backgroundColor: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${item.completionPercentage}%`,
                            height: '100%',
                            backgroundColor: '#17652f'
                          }}
                        />
                      </div>
                    </td>

                    {/* Passbook Statement Action */}
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedLedgerForEdit({
                            ...item,
                            _id: item.flatId,
                            rentAmount: item.grossRent,
                            guaranteedMonthlyRent: item.grossRent,
                            tenureMonths: item.tenureMonths,
                            applyTds: item.applyTds,
                            tdsPercentage: item.tdsPercentage,
                            registryDate: item.registryDate,
                            startDate: item.startDate,
                            totalPaid: item.totalPaid
                          })}
                          title="Edit terms"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            border: '1px solid #e5e7eb',
                            backgroundColor: '#ffffff',
                            color: '#111827',
                            fontSize: '0.78rem',
                            fontWeight: 500,
                            cursor: 'pointer'
                          }}
                        >
                          <Edit size={13} /> Edit
                        </button>

                        <button
                          onClick={() => setSelectedLedgerForPassbook(item)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '5px 12px',
                            borderRadius: '6px',
                            backgroundColor: '#17652f',
                            color: '#ffffff',
                            border: 'none',
                            fontSize: '0.78rem',
                            fontWeight: 500,
                            cursor: 'pointer'
                          }}
                        >
                          <BookOpen size={14} /> Passbook
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteLedger(item)}
                          title="Delete rental"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '5px 8px',
                            borderRadius: '6px',
                            border: '1px solid #e5e7eb',
                            backgroundColor: '#ffffff',
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

      {/* Upload & Auto-Calculate Excel Modal */}
      <UploadLedgerCalculateModal
        isOpen={isUploadCalculateModalOpen}
        onClose={() => setIsUploadCalculateModalOpen(false)}
        onSuccess={() => {
          setIsUploadCalculateModalOpen(false);
          fetchLedgers();
        }}
      />

      {/* Individual Customer Passbook Statement Modal */}
      {selectedLedgerForPassbook && (
        <PassbookStatementModal
          isOpen={Boolean(selectedLedgerForPassbook)}
          ledger={selectedLedgerForPassbook}
          onClose={() => setSelectedLedgerForPassbook(null)}
          onRefresh={() => {
            fetchLedgers();
            // Re-fetch selected ledger updated state
            rentalService.getRentalLedgers({ search: selectedLedgerForPassbook.flatNumber }).then((res) => {
              if (res.success && res.data?.[0]) {
                setSelectedLedgerForPassbook(res.data[0]);
              }
            });
          }}
        />
      )}

      {/* Edit Rental Terms Modal */}
      {selectedLedgerForEdit && (
        <EditRentalTermsModal
          isOpen={Boolean(selectedLedgerForEdit)}
          rental={selectedLedgerForEdit}
          onClose={() => setSelectedLedgerForEdit(null)}
          onUpdated={fetchLedgers}
        />
      )}
    </div>
  );
};
