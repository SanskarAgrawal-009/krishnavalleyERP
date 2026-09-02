import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Modal } from '../common/Modal.jsx';
import { rentalService } from '../../services/rentalService.js';
import {
  FileSpreadsheet,
  CheckCircle,
  Clock,
  AlertCircle,
  DollarSign,
  Calendar,
  Building2,
  User,
  ShieldCheck,
  Plus,
  Download,
  Receipt,
  ArrowRight
} from 'lucide-react';

export const RentalLedgerModal = ({
  isOpen,
  onClose,
  rentalContract,
  onUpdate
}) => {
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [activeEntry, setActiveEntry] = useState(null);
  const [payoutForm, setPayoutForm] = useState({
    monthIndex: 1,
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMode: 'NEFT',
    referenceNumber: '',
    amountPaid: 0,
    tdsDeducted: 0,
    remarks: ''
  });
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !rentalContract) return null;

  const ledger = rentalContract.rentBackLedger || {};
  const entries = ledger.entries || [];
  const monthlyRent = ledger.monthlyRent || rentalContract.rentBack?.monthlyRent || 0;
  const tenureMonths = ledger.tenureMonths || 36;
  const totalTenureAmount = ledger.totalTenureAmount || (monthlyRent * tenureMonths);
  const totalPaidToOwner = ledger.totalPaidToOwner || 0;
  const remainingPayableToOwner = ledger.remainingPayableToOwner !== undefined ? ledger.remainingPayableToOwner : Math.max(0, totalTenureAmount - totalPaidToOwner);
  const paidCount = entries.filter((e) => e.status === 'paid' || (e.netAmountPaid > 0)).length;
  const progressPct = tenureMonths > 0 ? Math.round((paidCount / tenureMonths) * 100) : 0;

  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(val) || 0);
  };

  const formatDate = (d) => {
    if (!d) return '—';
    try {
      const date = new Date(d);
      return isNaN(date.getTime()) ? String(d) : date.toLocaleDateString('en-GB');
    } catch {
      return String(d);
    }
  };

  const handleOpenPayout = (entry) => {
    setActiveEntry(entry);
    setPayoutForm({
      monthIndex: entry.monthIndex,
      paymentDate: entry.paymentDate ? new Date(entry.paymentDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      paymentMode: entry.paymentMode || 'NEFT',
      referenceNumber: entry.referenceNumber || `NEFT-${rentalContract.flatId?.flatNumber || '001'}-M${entry.monthIndex}`,
      amountPaid: entry.netAmountPaid > 0 ? entry.netAmountPaid : (entry.grossAmount || monthlyRent),
      tdsDeducted: entry.tdsDeducted || 0,
      remarks: entry.remarks || ''
    });
    setPayoutModalOpen(true);
  };

  const handleSavePayout = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await rentalService.recordOwnerPayout(rentalContract._id, payoutForm);
      if (res.success) {
        setPayoutModalOpen(false);
        if (onUpdate) onUpdate();
      } else {
        alert(res.message || 'Failed to record payout');
      }
    } catch (err) {
      console.error('Payout error:', err);
      alert(err.message || 'Error recording payout');
    } finally {
      setSubmitting(false);
    }
  };

  // Export 36-Month Passbook to Excel
  const handleExportExcel = () => {
    const flatNo = rentalContract.flatId?.flatNumber || '001';
    const ownerName = rentalContract.ownerId?.name || 'Owner';

    const headerData = [
      ['KRISHNA VALLEY RESORT & ERP SYSTEM', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['Name', '', ownerName, '', '', 'Date of MOU', '', formatDate(ledger.mouDate)],
      ['Flat No.', '', flatNo, '', '', 'Payment Starts ON', '', formatDate(ledger.startDate)],
      ['Tower', '', rentalContract.buildingId?.buildingName || 'A', '', '', 'Payment Ends ON', '', formatDate(ledger.endDate)],
      ['Actual Due Date', '', `${ledger.dueDay || 25}th`, '', '', 'Due Date as per MOU', '', `${ledger.dueDay || 25}th`],
      ['', '', '', '', '', '', ''],
      ['S.No.', 'Date of Payment', 'Mode of Payment / Ref No.', 'Gross Amount', 'TDS Deducted', 'Net Amount Paid', 'Remaining Balance', 'Status', 'Remarks']
    ];

    const rowsData = entries.map((e) => [
      e.monthIndex,
      e.paymentDate ? formatDate(e.paymentDate) : '—',
      e.referenceNumber ? `${e.paymentMode} (${e.referenceNumber})` : (e.status === 'paid' ? e.paymentMode : '—'),
      e.grossAmount || monthlyRent,
      e.tdsDeducted || 0,
      e.netAmountPaid || (e.status === 'paid' ? monthlyRent : 0),
      e.remainingTenureBalance,
      e.status.toUpperCase(),
      e.remarks || ''
    ]);

    const totalRow = [
      'TOTAL',
      '',
      '',
      totalTenureAmount,
      entries.reduce((s, e) => s + (e.tdsDeducted || 0), 0),
      totalPaidToOwner,
      remainingPayableToOwner,
      `${paidCount}/${tenureMonths} Paid`,
      ''
    ];

    const ws = XLSX.utils.aoa_to_sheet([...headerData, ...rowsData, totalRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Flat_${flatNo}_Ledger`);
    XLSX.writeFile(wb, `Rental_Ledger_Flat_${flatNo}_${ownerName.replace(/\s+/g, '_')}.xlsx`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`36-Month Owner Rental Ledger — Flat ${rentalContract.flatId?.flatNumber || '001'} (${rentalContract.ownerId?.name || 'Owner'})`}
      maxWidth="1100px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Top Agreement Summary Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #1e293b, #0f172a)',
          color: '#ffffff',
          borderRadius: '10px',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: '800' }}>
                Flat {rentalContract.flatId?.flatNumber || '001'} — {rentalContract.ownerId?.name || 'Owner'}
              </span>
              <span style={{ background: '#10b981', color: '#ffffff', fontSize: '0.7rem', fontWeight: '700', padding: '2px 8px', borderRadius: '4px' }}>
                3-Year Assured Yield
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <span><strong>MOU Date:</strong> {formatDate(ledger.mouDate)}</span>
              <span><strong>Start:</strong> {formatDate(ledger.startDate)}</span>
              <span><strong>End:</strong> {formatDate(ledger.endDate)}</span>
              <span><strong>Due Day:</strong> {ledger.dueDay || 25}th of every month</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            style={{
              padding: '8px 14px',
              background: '#059669',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
          >
            <Download size={14} /> Export Passbook (.xlsx)
          </button>
        </div>

        {/* Financial Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>TOTAL 36-MONTH COMMITMENT</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1e293b', marginTop: '2px' }}>{formatINR(totalTenureAmount)}</div>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{formatINR(monthlyRent)} / month × 36</span>
          </div>

          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: '700' }}>TOTAL PAID TO OWNER</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#15803d', marginTop: '2px' }}>{formatINR(totalPaidToOwner)}</div>
            <span style={{ fontSize: '0.72rem', color: '#166534' }}>{paidCount} of {tenureMonths} Months Disbursed</span>
          </div>

          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '0.72rem', color: '#92400e', fontWeight: '700' }}>REMAINING TENURE BALANCE</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#b45309', marginTop: '2px' }}>{formatINR(remainingPayableToOwner)}</div>
            <span style={{ fontSize: '0.72rem', color: '#92400e' }}>{tenureMonths - paidCount} Months Left to Pay</span>
          </div>

          <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '0.72rem', color: '#6b21a8', fontWeight: '700' }}>DISBURSEMENT PROGRESS</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#7c3aed', marginTop: '2px' }}>{progressPct}%</div>
            <div style={{ width: '100%', height: '6px', background: '#e9d5ff', borderRadius: '3px', marginTop: '6px', overflow: 'hidden' }}>
              <div style={{ width: `${progressPct}%`, height: '100%', background: '#7c3aed' }} />
            </div>
          </div>
        </div>

        {/* 36-Month Passbook Table */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 1, borderBottom: '2px solid #e2e8f0' }}>
                <tr style={{ textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '8px 10px' }}>Month #</th>
                  <th style={{ padding: '8px 10px' }}>Due Date</th>
                  <th style={{ padding: '8px 10px' }}>Date of Payment</th>
                  <th style={{ padding: '8px 10px' }}>Mode / Ref No.</th>
                  <th style={{ padding: '8px 10px' }}>Monthly Rent</th>
                  <th style={{ padding: '8px 10px' }}>TDS</th>
                  <th style={{ padding: '8px 10px' }}>Net Paid</th>
                  <th style={{ padding: '8px 10px' }}>Remaining Balance</th>
                  <th style={{ padding: '8px 10px' }}>Status</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const isPaid = entry.status === 'paid' || (entry.netAmountPaid > 0);
                  return (
                    <tr
                      key={entry.monthIndex}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isPaid ? '#f0fdf4' : (entry.status === 'due' ? '#fffbeb' : '#ffffff')
                      }}
                    >
                      <td style={{ padding: '8px 10px', fontWeight: '700', color: '#1e293b' }}>
                        Month #{entry.monthIndex}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#64748b' }}>
                        {formatDate(entry.dueDate)}
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: isPaid ? '700' : '400', color: isPaid ? '#15803d' : '#94a3b8' }}>
                        {formatDate(entry.paymentDate)}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#334155' }}>
                        {entry.referenceNumber ? (
                          <span><strong>{entry.paymentMode}</strong> ({entry.referenceNumber})</span>
                        ) : (
                          isPaid ? entry.paymentMode : '—'
                        )}
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: '600', color: '#1e293b' }}>
                        {formatINR(entry.grossAmount || monthlyRent)}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#64748b' }}>
                        {formatINR(entry.tdsDeducted || 0)}
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: '800', color: isPaid ? '#16a34a' : '#94a3b8' }}>
                        {formatINR(entry.netAmountPaid || (isPaid ? (entry.grossAmount || monthlyRent) : 0))}
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: '700', color: '#b45309' }}>
                        {formatINR(entry.remainingTenureBalance)}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        {isPaid ? (
                          <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '4px', fontWeight: '700', fontSize: '0.7rem' }}>
                            ✓ PAID
                          </span>
                        ) : (
                          <span style={{ background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: '4px', fontWeight: '600', fontSize: '0.7rem' }}>
                            UPCOMING
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenPayout(entry)}
                          style={{
                            padding: '4px 10px',
                            background: isPaid ? '#e0f2fe' : '#16a34a',
                            color: isPaid ? '#0284c7' : '#ffffff',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          {isPaid ? 'Edit' : '+ Pay'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 20px',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              color: '#475569',
              fontWeight: '700',
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            Close Passbook
          </button>
        </div>

      </div>

      {/* RECORD OWNER PAYOUT MODAL */}
      {payoutModalOpen && (
        <Modal
          isOpen={payoutModalOpen}
          onClose={() => setPayoutModalOpen(false)}
          title={`Record Month #${payoutForm.monthIndex} Payout to Owner`}
          maxWidth="460px"
        >
          <form onSubmit={handleSavePayout} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '3px' }}>
                Payment Date *
              </label>
              <input
                type="date"
                required
                value={payoutForm.paymentDate}
                onChange={(e) => setPayoutForm({ ...payoutForm, paymentDate: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '3px' }}>
                  Amount Paid to Owner (₹) *
                </label>
                <input
                  type="number"
                  required
                  value={payoutForm.amountPaid}
                  onChange={(e) => setPayoutForm({ ...payoutForm, amountPaid: e.target.value })}
                  style={{ width: '100%', fontWeight: '700' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '3px' }}>
                  TDS Deducted (₹)
                </label>
                <input
                  type="number"
                  value={payoutForm.tdsDeducted}
                  onChange={(e) => setPayoutForm({ ...payoutForm, tdsDeducted: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '3px' }}>
                  Payment Mode
                </label>
                <select
                  value={payoutForm.paymentMode}
                  onChange={(e) => setPayoutForm({ ...payoutForm, paymentMode: e.target.value })}
                  style={{ width: '100%' }}
                >
                  <option value="NEFT">NEFT</option>
                  <option value="RTGS">RTGS</option>
                  <option value="Cheque">Cheque</option>
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '3px' }}>
                  UTR / Reference No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. HDFC-NEFT-992211"
                  value={payoutForm.referenceNumber}
                  onChange={(e) => setPayoutForm({ ...payoutForm, referenceNumber: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '3px' }}>
                Remarks
              </label>
              <input
                type="text"
                placeholder="Optional remarks"
                value={payoutForm.remarks}
                onChange={(e) => setPayoutForm({ ...payoutForm, remarks: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setPayoutModalOpen(false)}
                style={{ padding: '6px 14px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '6px 18px',
                  background: '#16a34a',
                  color: '#ffffff',
                  fontWeight: '700',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: submitting ? 'not-allowed' : 'pointer'
                }}
              >
                {submitting ? 'Saving...' : 'Save Payout & Deduct Balance'}
              </button>
            </div>
          </form>
        </Modal>
      )}

    </Modal>
  );
};
