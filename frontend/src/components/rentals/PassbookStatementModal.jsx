import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  Calendar,
  CreditCard,
  Printer,
  ChevronRight,
  ShieldCheck,
  DollarSign,
  Trash2,
  Edit
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { rentalService } from '../../services/rentalService.js';
import { useToast } from '../../context/ToastContext.jsx';
import { EditRentalTermsModal } from './EditRentalTermsModal.jsx';

export const PassbookStatementModal = ({ isOpen, onClose, ledger, onRefresh }) => {
  const toast = useToast();
  const [filterStatus, setFilterStatus] = useState('all');
  const [updatingMonth, setUpdatingMonth] = useState(null);
  const [quickDisburseModal, setQuickDisburseModal] = useState(null); // { monthIndex, dueDate, amount }
  const [isEditTermsOpen, setIsEditTermsOpen] = useState(false);
  const [disburseForm, setDisburseForm] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMode: 'NEFT',
    referenceNumber: '',
    remarks: 'Disbursed via Direct Bank Transfer (NEFT)'
  });

  if (!isOpen || !ledger) return null;

  const formatINR = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;
  const formatDate = (val) => {
    if (!val) return '—';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return '—';
    }
  };

  const entries = ledger.passbookEntries || [];
  const filteredEntries = entries.filter((e) => {
    if (filterStatus === 'paid') return e.status === 'paid';
    if (filterStatus === 'due') return e.status === 'due';
    if (filterStatus === 'upcoming') return e.status === 'upcoming';
    return true;
  });

  // Export Passbook to Excel
  const handleExportPassbook = () => {
    const data = entries.map((e) => ({
      'Month #': `Month ${e.monthIndex}`,
      'Due Date': formatDate(e.dueDate),
      'Disbursement Date': formatDate(e.paymentDate),
      'Payment Mode': e.paymentMode || 'Pending',
      'Transaction Ref': e.referenceNumber || '—',
      'Gross Monthly Rent (₹)': e.grossAmount || 0,
      'TDS Deducted (₹)': e.tdsDeducted || 0,
      'Net Payout Disbursed (₹)': e.netAmountPaid || 0,
      'Cumulative Disbursed (₹)': e.cumulativePaid || 0,
      'Remaining Balance (₹)': e.remainingTenureBalance || 0,
      'Status': String(e.status).toUpperCase(),
      'Remarks': e.remarks || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Passbook Statement');

    worksheet['!cols'] = [
      { wch: 12 },
      { wch: 14 },
      { wch: 18 },
      { wch: 14 },
      { wch: 26 },
      { wch: 20 },
      { wch: 16 },
      { wch: 22 },
      { wch: 22 },
      { wch: 20 },
      { wch: 14 },
      { wch: 35 }
    ];

    XLSX.writeFile(
      workbook,
      `Rental_Passbook_${ledger.flatNumber}_${(ledger.ownerName || 'Owner').replace(/\s+/g, '_')}.xlsx`
    );
    toast.showSuccess(`Passbook exported for Flat ${ledger.flatNumber}!`);
  };

  // Quick Disburse Submit
  const handleDisburseSubmit = async (e) => {
    e.preventDefault();
    if (!quickDisburseModal) return;

    try {
      const res = await rentalService.updatePassbookEntry(ledger.flatId, {
        monthIndex: quickDisburseModal.monthIndex,
        paymentDate: disburseForm.paymentDate,
        paymentMode: disburseForm.paymentMode,
        referenceNumber: disburseForm.referenceNumber || `NEFT/KV-RENT/M${quickDisburseModal.monthIndex}/${ledger.flatNumber}`,
        remarks: disburseForm.remarks,
        status: 'paid'
      });

      if (res.success) {
        toast.showSuccess(`Month ${quickDisburseModal.monthIndex} marked as PAID!`);
        setQuickDisburseModal(null);
        if (onRefresh) onRefresh();
      } else {
        toast.showError(res.message || 'Failed to update entry');
      }
    } catch (err) {
      console.error('Error updating entry:', err);
      toast.showError('Server error updating passbook entry');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '1200px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden'
        }}
      >
        {/* Passbook Bank Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #0f172a, #1e293b)',
            color: '#ffffff'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)'
              }}
            >
              <CreditCard size={24} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '800' }}>
                  Rental Passbook Statement • Flat {ledger.flatNumber}
                </h2>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    backgroundColor: '#3b82f6',
                    fontSize: '0.75rem',
                    fontWeight: '800'
                  }}
                >
                  {ledger.tenureMonths}-Month Tenure
                </span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                Owner: <strong style={{ color: '#ffffff' }}>{ledger.ownerName}</strong> • Contact: {ledger.ownerMobile} • PAN: {ledger.ownerPan}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setIsEditTermsOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
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
              <Edit size={15} /> Edit Terms
            </button>

            <button
              onClick={handleExportPassbook}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                backgroundColor: '#16a34a',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.82rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              <FileSpreadsheet size={15} /> Export Statement (Excel)
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Financial Summary Strip */}
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '16px'
          }}
        >
          <div>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
              Monthly Gross Rent
            </span>
            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
              {formatINR(ledger.grossRent)}
            </div>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
              TDS: {ledger.applyTds ? `${ledger.tdsPercentage}% (-${formatINR(ledger.tdsAmount)})` : 'None'}
            </span>
          </div>

          <div>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
              Monthly Net Disbursable
            </span>
            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#2563eb' }}>
              {formatINR(ledger.netRent)}
            </div>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
              Due Day: {ledger.dueDayOfMonth || 25}th of Month
            </span>
          </div>

          <div>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
              Tenure Commitment
            </span>
            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
              {formatINR(ledger.totalCommitment || ledger.totalCommitmentGross || (ledger.grossRent * ledger.tenureMonths))}
            </div>
            <span style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: '600' }}>
              Rent × {ledger.tenureMonths} Mos (Gross)
            </span>
          </div>

          <div>
            <span style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: '700', textTransform: 'uppercase' }}>
              Total Paid to Date
            </span>
            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#16a34a' }}>
              {formatINR(ledger.totalPaid)}
            </div>
            <span style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: '700' }}>
              {ledger.paidCount} of {ledger.tenureMonths} Months Disbursed
            </span>
          </div>

          <div>
            <span style={{ fontSize: '0.72rem', color: '#b91c1c', fontWeight: '700', textTransform: 'uppercase' }}>
              Remaining Liability
            </span>
            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#dc2626' }}>
              {formatINR(ledger.amountOutstanding)}
            </div>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
              {Math.max(0, ledger.tenureMonths - ledger.paidCount)} Months Remaining
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ padding: '12px 24px', backgroundColor: '#ffffff', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>
              Tenure Completion Progress: {ledger.completionPercentage}% ({ledger.paidCount} / {ledger.tenureMonths} Months)
            </span>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              {formatDate(ledger.startDate)} to {formatDate(ledger.endDate)}
            </span>
          </div>
          <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${ledger.completionPercentage}%`,
                height: '100%',
                backgroundColor: ledger.completionPercentage === 100 ? '#16a34a' : '#2563eb',
                transition: 'width 0.4s ease'
              }}
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div
          style={{
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #e2e8f0'
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { id: 'all', label: `All Months (${entries.length})` },
              { id: 'paid', label: `Paid (${ledger.paidCount})` },
              { id: 'due', label: `Due (${ledger.dueCount})` },
              { id: 'upcoming', label: `Upcoming (${ledger.upcomingCount})` }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: filterStatus === tab.id ? '1px solid #2563eb' : '1px solid #e2e8f0',
                  backgroundColor: filterStatus === tab.id ? '#eff6ff' : '#ffffff',
                  color: filterStatus === tab.id ? '#2563eb' : '#64748b',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Bank Account: {ledger.bankDetails?.accountNumber ? `${ledger.bankDetails.bankName || 'Bank'} • A/C ${ledger.bankDetails.accountNumber}` : 'Direct Transfer'}
          </span>
        </div>

        {/* Passbook Ledger Entries Table */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8fafc', zIndex: 1 }}>
              <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                <th style={{ padding: '12px 10px', fontWeight: '700', color: '#475569' }}>Month</th>
                <th style={{ padding: '12px 10px', fontWeight: '700', color: '#475569' }}>Due Date</th>
                <th style={{ padding: '12px 10px', fontWeight: '700', color: '#475569' }}>Payment Date</th>
                <th style={{ padding: '12px 10px', fontWeight: '700', color: '#475569' }}>Mode</th>
                <th style={{ padding: '12px 10px', fontWeight: '700', color: '#475569' }}>Reference No</th>
                <th style={{ padding: '12px 10px', fontWeight: '700', color: '#475569', textAlign: 'right' }}>Gross Rent</th>
                <th style={{ padding: '12px 10px', fontWeight: '700', color: '#475569', textAlign: 'right' }}>TDS</th>
                <th style={{ padding: '12px 10px', fontWeight: '700', color: '#475569', textAlign: 'right' }}>Net Disbursed</th>
                <th style={{ padding: '12px 10px', fontWeight: '700', color: '#475569', textAlign: 'right' }}>Cumulative Paid</th>
                <th style={{ padding: '12px 10px', fontWeight: '700', color: '#475569', textAlign: 'right' }}>Remaining Balance</th>
                <th style={{ padding: '12px 10px', fontWeight: '700', color: '#475569', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '12px 10px', fontWeight: '700', color: '#475569', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((e, idx) => (
                <tr
                  key={e.monthIndex || idx}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    backgroundColor: e.status === 'paid' ? '#ffffff' : (e.status === 'due' ? '#fffbeb' : '#fafafa')
                  }}
                >
                  <td style={{ padding: '12px 10px', fontWeight: '800', color: '#0f172a' }}>
                    Month {e.monthIndex}
                  </td>
                  <td style={{ padding: '12px 10px', color: '#475569' }}>
                    {formatDate(e.dueDate)}
                  </td>
                  <td style={{ padding: '12px 10px', color: e.paymentDate ? '#15803d' : '#94a3b8', fontWeight: e.paymentDate ? '600' : '400' }}>
                    {formatDate(e.paymentDate)}
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: '#f1f5f9',
                        fontSize: '0.74rem',
                        fontWeight: '700',
                        color: '#475569'
                      }}
                    >
                      {e.paymentMode || 'NEFT'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 10px', fontFamily: 'monospace', fontSize: '0.75rem', color: '#334155' }}>
                    {e.referenceNumber || '—'}
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'right', color: '#64748b' }}>
                    {formatINR(e.grossAmount)}
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'right', color: '#dc2626' }}>
                    {e.tdsDeducted > 0 ? `-${formatINR(e.tdsDeducted)}` : '₹0'}
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '800', color: e.status === 'paid' ? '#16a34a' : '#0f172a' }}>
                    {formatINR(e.netAmountPaid)}
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '700', color: '#2563eb' }}>
                    {formatINR(e.cumulativePaid)}
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '700', color: '#64748b' }}>
                    {formatINR(e.remainingTenureBalance)}
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                    {e.status === 'paid' ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#dcfce7',
                          color: '#15803d',
                          fontWeight: '800',
                          fontSize: '0.74rem'
                        }}
                      >
                        <CheckCircle2 size={12} /> PAID
                      </span>
                    ) : e.status === 'due' ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#fee2e2',
                          color: '#b91c1c',
                          fontWeight: '800',
                          fontSize: '0.74rem'
                        }}
                      >
                        <AlertCircle size={12} /> OVERDUE
                      </span>
                    ) : (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#f1f5f9',
                          color: '#64748b',
                          fontWeight: '700',
                          fontSize: '0.74rem'
                        }}
                      >
                        <Clock size={12} /> UPCOMING
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                    {e.status !== 'paid' ? (
                      <button
                        onClick={() => {
                          setQuickDisburseModal(e);
                          setDisburseForm({
                            paymentDate: new Date().toISOString().split('T')[0],
                            paymentMode: 'NEFT',
                            referenceNumber: `NEFT/KV-RENT/M${e.monthIndex}/${ledger.flatNumber.replace(/[^A-Za-z0-9]/g, '')}`,
                            remarks: `Disbursed Month ${e.monthIndex} via NEFT`
                          });
                        }}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          border: '1px solid #2563eb',
                          backgroundColor: '#ffffff',
                          color: '#2563eb',
                          fontSize: '0.74rem',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        Disburse
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: '700' }}>
                        ✓ Settled
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Showing {filteredEntries.length} entries of {entries.length} total tenure schedule
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={async () => {
                const confirmDelete = window.confirm(
                  `Are you sure you want to delete and unenroll Flat ${ledger.flatNumber} (${ledger.ownerName}) from rentals?\n\nThis will permanently delete this passbook statement and clear all commitments.`
                );
                if (!confirmDelete) return;
                try {
                  const res = await rentalService.deleteRental(ledger.flatId);
                  if (res.success) {
                    toast.showSuccess(res.message || `Flat ${ledger.flatNumber} passbook deleted!`);
                    onClose();
                    if (onRefresh) onRefresh();
                  } else {
                    toast.showError(res.message || 'Failed to delete passbook');
                  }
                } catch (err) {
                  console.error('Error deleting passbook:', err);
                  toast.showError('Server error deleting passbook');
                }
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #fecaca',
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                fontSize: '0.82rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              <Trash2 size={14} /> Delete Passbook
            </button>

            <button
              onClick={onClose}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#334155',
                fontSize: '0.82rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Close Passbook
            </button>
          </div>
        </div>
      </div>

      {/* Quick Disburse Modal Sub-dialog */}
      {quickDisburseModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '460px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
                Disburse Month {quickDisburseModal.monthIndex}
              </h3>
              <button
                onClick={() => setQuickDisburseModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: '#475569' }}>
              Amount: <strong style={{ color: '#15803d' }}>{formatINR(ledger.netRent)}</strong> for Flat {ledger.flatNumber} ({ledger.ownerName})
            </p>

            <form onSubmit={handleDisburseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  Disbursement Date
                </label>
                <input
                  type="date"
                  value={disburseForm.paymentDate}
                  onChange={(e) => setDisburseForm({ ...disburseForm, paymentDate: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  Payment Mode
                </label>
                <select
                  value={disburseForm.paymentMode}
                  onChange={(e) => setDisburseForm({ ...disburseForm, paymentMode: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                >
                  <option value="NEFT">NEFT (Direct Bank Transfer)</option>
                  <option value="RTGS">RTGS</option>
                  <option value="IMPS">IMPS</option>
                  <option value="Cheque">Cheque</option>
                  <option value="UPI">UPI</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  Transaction Reference / UTR
                </label>
                <input
                  type="text"
                  value={disburseForm.referenceNumber}
                  onChange={(e) => setDisburseForm({ ...disburseForm, referenceNumber: e.target.value })}
                  placeholder="e.g. UTR12345678"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setQuickDisburseModal(null)}
                  style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontWeight: '700' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: '#16a34a', color: '#ffffff', cursor: 'pointer', fontWeight: '800' }}
                >
                  Confirm Paid
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Rental Terms Modal */}
      {isEditTermsOpen && (
        <EditRentalTermsModal
          isOpen={isEditTermsOpen}
          rental={{
            ...ledger,
            _id: ledger.flatId,
            rentAmount: ledger.grossRent,
            guaranteedMonthlyRent: ledger.grossRent,
            tenureMonths: ledger.tenureMonths,
            applyTds: ledger.applyTds,
            tdsPercentage: ledger.tdsPercentage,
            registryDate: ledger.registryDate,
            startDate: ledger.startDate,
            totalPaid: ledger.totalPaid
          }}
          onClose={() => setIsEditTermsOpen(false)}
          onUpdated={() => {
            setIsEditTermsOpen(false);
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
};
