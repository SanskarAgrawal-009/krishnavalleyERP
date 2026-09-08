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
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(124, 58, 237, 0.3)'
            }}
          >
            <BookOpen size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Rental Passbooks & Customer Ledgers
              </h1>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '6px',
                  backgroundColor: '#f3e8ff',
                  color: '#7c3aed',
                  fontSize: '0.75rem',
                  fontWeight: '800'
                }}
              >
                Passbook Hub
              </span>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: '#64748b', fontWeight: '500' }}>
              Owner-by-Owner Disbursal Passbooks • Tenure Schedule • Auto-Calculated Paid Month Entries
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          
          <button
            onClick={() => setIsUploadCalculateModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: '800',
              cursor: 'pointer',
              boxShadow: '0 3px 10px rgba(37, 99, 235, 0.3)'
            }}
          >
            <Calculator size={16} /> Upload Excel & Auto-Calculate
          </button>

          <button
            onClick={handleAutoGenerateAll}
            disabled={autoGenerating}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '8px',
              background: '#7c3aed',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: '800',
              cursor: autoGenerating ? 'not-allowed' : 'pointer',
              boxShadow: '0 3px 10px rgba(124, 58, 237, 0.25)'
            }}
          >
            <Sparkles size={16} />
            {autoGenerating ? 'Generating...' : 'Sync from Active Register'}
          </button>

          <button
            onClick={handleExportCSV}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 14px',
              borderRadius: '8px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#334155',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            <FileSpreadsheet size={15} color="#16a34a" /> Export Master CSV
          </button>

          <button
            onClick={() => navigate('/rentals')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 14px',
              borderRadius: '8px',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              color: '#1e293b',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            <Building2 size={15} /> Active Register
          </button>

          <button
            onClick={fetchLedgers}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 12px',
              borderRadius: '8px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#334155',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* 2. TOP KPI CARDS STRIP */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px'
        }}
      >
        {/* Card 1 */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '16px 18px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
              Enrolled Passbooks
            </span>
            <Users size={16} color="#7c3aed" />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#0f172a' }}>
            {kpis.totalAccounts} Flats
          </div>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
            Active rental contracts
          </span>
        </div>

        {/* Card 2 */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '16px 18px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
              Total Paid to Owners
            </span>
            <CheckCircle2 size={16} color="#16a34a" />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#16a34a' }}>
            {formatINR(kpis.totalDisbursedAll)}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: '600' }}>
            {kpis.totalPaidMonthsAll} Total months settled
          </span>
        </div>

        {/* Card 3 */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '16px 18px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
              Remaining Liability
            </span>
            <TrendingUp size={16} color="#dc2626" />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#dc2626' }}>
            {formatINR(kpis.totalOutstandingAll)}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
            Scheduled upcoming disbursals
          </span>
        </div>

        {/* Card 4 */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '16px 18px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
              Total Commitment (Tenure)
            </span>
            <DollarSign size={16} color="#2563eb" />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#2563eb' }}>
            {formatINR(kpis.totalCommitmentAll)}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
            Rent × Tenure (Gross commitment)
          </span>
        </div>
      </div>

      {/* 3. SEARCH & FILTERS BAR */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '14px 18px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '280px' }}>
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '380px'
            }}
          >
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8'
              }}
            />
            <input
              type="text"
              placeholder="Search by Flat Number, Owner Name, Mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.84rem',
                outline: 'none'
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Search
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600' }}>Tenure:</span>
            <select
              value={tenureFilter}
              onChange={(e) => setTenureFilter(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.8rem',
                backgroundColor: '#ffffff'
              }}
            >
              <option value="all">All Tenures</option>
              <option value="36">36 Months (3 Years)</option>
              <option value="24">24 Months (2 Years)</option>
              <option value="12">12 Months (1 Year)</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600' }}>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.8rem',
                backgroundColor: '#ffffff'
              }}
            >
              <option value="all">All Passbooks</option>
              <option value="active">Active (Pending Payments)</option>
              <option value="completed">Fully Settled</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. MASTER PASSBOOKS TABLE */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}
      >
        {loading ? (
          <TableSkeleton rows={8} columns={8} />
        ) : ledgers.length === 0 ? (
          <EmptyState
            title="No Rental Passbook Records Found"
            message="No active rental customer passbooks match your current search criteria. Click 'Upload Excel & Auto-Calculate' or 'Sync from Active Register' to generate passbooks."
            icon={BookOpen}
            actionLabel="Upload Passbook Excel"
            onAction={() => setIsUploadCalculateModalOpen(true)}
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 14px', fontWeight: '700', color: '#475569' }}>Flat / Unit</th>
                  <th style={{ padding: '12px 14px', fontWeight: '700', color: '#475569' }}>Owner & Contact</th>
                  <th style={{ padding: '12px 14px', fontWeight: '700', color: '#475569' }}>Tenure Schedule</th>
                  <th style={{ padding: '12px 14px', fontWeight: '700', color: '#475569', textAlign: 'right' }}>Monthly Net Rent</th>
                  <th style={{ padding: '12px 14px', fontWeight: '700', color: '#475569', textAlign: 'right' }}>Total Disbursed</th>
                  <th style={{ padding: '12px 14px', fontWeight: '700', color: '#475569', textAlign: 'right' }}>Remaining Balance</th>
                  <th style={{ padding: '12px 14px', fontWeight: '700', color: '#475569' }}>Disbursal Progress</th>
                  <th style={{ padding: '12px 14px', fontWeight: '700', color: '#475569', textAlign: 'center' }}>Passbook Statement</th>
                </tr>
              </thead>
              <tbody>
                {ledgers.map((item, idx) => (
                  <tr
                    key={item.flatId || idx}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    {/* Flat / Unit */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            backgroundColor: '#eff6ff',
                            color: '#2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '800',
                            fontSize: '0.78rem'
                          }}
                        >
                          {item.flatNumber?.slice(0, 2) || 'FL'}
                        </div>
                        <div>
                          <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.88rem' }}>
                            {item.flatNumber}
                          </div>
                          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            {item.floor ? `Floor ${item.floor}` : ''} {item.bhkType ? `• ${item.bhkType}` : ''}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Owner & Contact */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: '700', color: '#1e293b' }}>
                        {renderCellData(item.ownerName)}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                        {renderCellData(item.ownerMobile)} • PAN: {renderCellData(item.ownerPan)}
                      </div>
                    </td>

                    {/* Tenure Schedule */}
                    <td style={{ padding: '12px 14px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#f1f5f9',
                          fontSize: '0.75rem',
                          fontWeight: '800',
                          color: '#334155'
                        }}
                      >
                        {item.tenureMonths} Months
                      </span>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                        {formatDate(item.startDate)} → {formatDate(item.endDate)}
                      </div>
                    </td>

                    {/* Monthly Net Rent */}
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <div style={{ fontWeight: '800', color: '#2563eb' }}>
                        {formatINR(item.netRent)}
                      </div>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        Gross: {formatINR(item.grossRent)}
                      </span>
                    </td>

                    {/* Total Disbursed */}
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <div style={{ fontWeight: '800', color: '#16a34a' }}>
                        {formatINR(item.totalPaid)}
                      </div>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                          fontSize: '0.72rem',
                          color: '#15803d',
                          fontWeight: '700'
                        }}
                      >
                        <CheckCircle2 size={11} /> {item.paidCount} Months Paid
                      </span>
                    </td>

                    {/* Remaining Balance */}
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <div style={{ fontWeight: '800', color: '#dc2626' }}>
                        {formatINR(item.amountOutstanding)}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {Math.max(0, item.tenureMonths - item.paidCount)} Months Due
                      </span>
                    </td>

                    {/* Disbursal Progress */}
                    <td style={{ padding: '12px 14px', minWidth: '160px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '700', color: '#334155' }}>
                          {item.completionPercentage}%
                        </span>
                        <span style={{ color: '#64748b' }}>
                          {item.paidCount} / {item.tenureMonths} Mos
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${item.completionPercentage}%`,
                            height: '100%',
                            backgroundColor: item.completionPercentage === 100 ? '#16a34a' : '#2563eb'
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
                          title="Edit Rental Terms, Price & Effective Date"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid #93c5fd',
                            backgroundColor: '#eff6ff',
                            color: '#1d4ed8',
                            fontSize: '0.78rem',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          <Edit size={13} /> Edit Terms
                        </button>

                        <button
                          onClick={() => setSelectedLedgerForPassbook(item)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            backgroundColor: '#7c3aed',
                            color: '#ffffff',
                            border: 'none',
                            fontSize: '0.78rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(124, 58, 237, 0.2)'
                          }}
                        >
                          <BookOpen size={14} /> View Passbook
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteLedger(item)}
                          title="Delete / Unenroll Rental Record"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            border: '1px solid #fecaca',
                            backgroundColor: '#fef2f2',
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
