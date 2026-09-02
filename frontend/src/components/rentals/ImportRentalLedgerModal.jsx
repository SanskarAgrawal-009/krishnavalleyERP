import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Modal } from '../common/Modal.jsx';
import { rentalService } from '../../services/rentalService.js';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Building2,
  User,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';

export const ImportRentalLedgerModal = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(val) || 0);
  };

  const parseExcelDate = (val) => {
    if (!val) return null;
    if (val instanceof Date) return val.toISOString().slice(0, 10);
    const str = String(val).trim();
    const slashParts = str.split('/');
    if (slashParts.length === 3) {
      const d = parseInt(slashParts[0], 10);
      const m = parseInt(slashParts[1], 10) - 1;
      const y = parseInt(slashParts[2], 10);
      return new Date(y, m, d).toISOString().slice(0, 10);
    }
    const dashParts = str.split('-');
    if (dashParts.length === 3) {
      return str;
    }
    return null;
  };

  // Handle Excel File Selection & Parse
  const handleFileChange = (e) => {
    setErrorMsg('');
    setImportResult(null);
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setFileName(selectedFile.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (rawRows.length === 0) {
          setErrorMsg('The selected spreadsheet is empty. Please check your file.');
          return;
        }

        // Check if format matches Passbook (like A - 001 Ved Prakash Agarwal.xlsx)
        let ownerName = '';
        let mouDate = '';
        let flatNo = '';
        let startDate = '';
        let endDate = '';
        let dueDay = 25;
        let entries = [];
        let isPassbookFormat = false;

        // Search metadata rows
        for (let i = 0; i < Math.min(10, rawRows.length); i++) {
          const row = rawRows[i] || [];
          const rowStr = row.map((c) => String(c).toLowerCase()).join(' ');
          if (rowStr.includes('name') && (row[2] || row[1])) {
            ownerName = String(row[2] || row[1] || '').trim();
            isPassbookFormat = true;
          }
          if (rowStr.includes('mou') && (row[7] || row[6] || row[5] || row[3])) {
            mouDate = parseExcelDate(row[7] || row[6] || row[5] || row[3]);
          }
          if (rowStr.includes('flat') && (row[2] || row[1])) {
            flatNo = String(row[2] || row[1] || '').trim();
          }
          if (rowStr.includes('payment starts') && (row[7] || row[6] || row[5] || row[3])) {
            startDate = parseExcelDate(row[7] || row[6] || row[5] || row[3]);
          }
          if (rowStr.includes('payment ends') && (row[7] || row[6] || row[5] || row[3])) {
            endDate = parseExcelDate(row[7] || row[6] || row[5] || row[3]);
          }
          if (rowStr.includes('due date')) {
            const rawDue = String(row[7] || row[6] || row[2] || '').replace(/\D/g, '');
            if (rawDue) dueDay = parseInt(rawDue, 10);
          }
        }

        // Search table header row (e.g. S.No, Date of Payment, Amount Paid)
        let tableStartRow = -1;
        for (let i = 0; i < Math.min(15, rawRows.length); i++) {
          const rowStr = (rawRows[i] || []).map((c) => String(c).toLowerCase()).join(' ');
          if (rowStr.includes('s.no') || rowStr.includes('date of payment') || rowStr.includes('amount paid')) {
            tableStartRow = i + 1;
            break;
          }
        }

        if (tableStartRow === -1) tableStartRow = 8; // fallback

        // Parse month rows
        for (let r = tableStartRow; r < rawRows.length; r++) {
          const row = rawRows[r] || [];
          const sNo = parseInt(String(row[0]).replace(/\D/g, ''), 10);
          if (sNo >= 1 && sNo <= 36) {
            const pDate = parseExcelDate(row[1]);
            const pMode = String(row[2] || 'NEFT').trim();
            const amountPaid = parseFloat(String(row[3] || 0).replace(/[^0-9.-]/g, '')) || 0;
            const tds = parseFloat(String(row[4] || 0).replace(/[^0-9.-]/g, '')) || 0;
            const netPaid = parseFloat(String(row[5] || 0).replace(/[^0-9.-]/g, '')) || amountPaid;
            const remark = String(row[6] || '').trim();

            entries.push({
              sNo,
              monthIndex: sNo,
              paymentDate: pDate,
              paymentMode: pMode || 'NEFT',
              amountPaid: amountPaid > 0 ? amountPaid : netPaid,
              tdsDeducted: tds,
              netAmountPaid: netPaid,
              remarks: remark,
              isPaid: amountPaid > 0 || netPaid > 0 || !!pDate
            });
          }
        }

        // If Flat No is still empty, check sheet name (e.g. "A - 001" or "001")
        if (!flatNo) {
          const matched = sheetName.match(/\d+/);
          if (matched) flatNo = matched[0];
        }

        // Calculate Monthly Rent from first paid row or standard 31,000 / 24,000
        const firstPaidRow = entries.find((e) => e.amountPaid > 0);
        const monthlyRent = firstPaidRow ? firstPaidRow.amountPaid : 31000;
        const totalTenureAmount = monthlyRent * 36;
        const totalPaid = entries.reduce((s, e) => s + (e.amountPaid || 0), 0);
        const remainingBalance = Math.max(0, totalTenureAmount - totalPaid);

        setParsedData({
          flatNo: flatNo || '001',
          ownerName: ownerName || 'Owner',
          mouDate: mouDate || '2025-06-14',
          startDate: startDate || '2025-07-25',
          endDate: endDate || '2028-06-25',
          dueDay: dueDay || 25,
          monthlyRent,
          totalTenureAmount,
          totalPaid,
          remainingBalance,
          entries
        });
      } catch (err) {
        console.error('Error parsing Excel:', err);
        setErrorMsg('Failed to parse Excel file. Please ensure it is a valid .xlsx or .xls file.');
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  // Download Exact Sample Template matching A - 001 Ved Prakash Agarwal.xlsx
  const handleDownloadSample = () => {
    const headerData = [
      ['KRISHNA VALLEY', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['Name', '', 'Ved Prakash Agarwal', '', '', 'Date of MOU', '', '14/06/2025'],
      ['Flat No.', '', '001', '', '', 'Payment Starts ON', '', '25/07/2025'],
      ['Tower ', '', 'A', '', '', 'Payment Ends ON', '', '25/06/2028'],
      ['Actual Due Date', '', '25th', '', '', 'Due Date as per MOU', '', '25th'],
      ['', '', '', '', '', '', '', ''],
      ['S.No.', 'Date of Payment', 'Mode of Payment (NEFT/RTGS/Chq)', 'Amount Paid', 'TDS Deducted', 'Net Amount Paid', 'Remark', '']
    ];

    const sampleRows = [];
    for (let i = 1; i <= 36; i++) {
      if (i <= 13) {
        sampleRows.push([
          i,
          `25/${(i % 12 + 1).toString().padStart(2, '0')}/2025`,
          'NEFT',
          31000,
          0,
          31000,
          '',
          ''
        ]);
      } else {
        sampleRows.push([i, '', '', 0, 0, 0, '', '']);
      }
    }

    const totalRow = ['', '', '', 403000, 0, 403000, '', ''];

    const worksheet = XLSX.utils.aoa_to_sheet([...headerData, ...sampleRows, totalRow]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'A - 001');

    worksheet['!cols'] = [
      { wch: 8 },  // S.No
      { wch: 18 }, // Date of Payment
      { wch: 28 }, // Mode of Payment
      { wch: 16 }, // Amount Paid
      { wch: 14 }, // TDS Deducted
      { wch: 16 }, // Net Amount Paid
      { wch: 20 }, // Remark
      { wch: 10 }
    ];

    XLSX.writeFile(workbook, 'Krishna_Valley_Rental_Ledger_Template.xlsx');
  };

  // Submit Import to Backend
  const handleImportSubmit = async () => {
    if (!parsedData || !parsedData.flatNo) {
      alert('No valid parsed ledger data found to import.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await rentalService.importRentalLedger(parsedData, 'single_passbook');
      if (res.success) {
        setImportResult(res.data);
        if (onSuccess) onSuccess();
      } else {
        setErrorMsg(res.message || 'Failed to import rental ledger.');
      }
    } catch (err) {
      console.error('Import error:', err);
      setErrorMsg(err.message || 'Error executing ledger import.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Owner Rental Ledger Excel (.xlsx)"
      maxWidth="900px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Top Info Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
          border: '1px solid #86efac',
          borderRadius: '10px',
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: '#14532d', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={18} color="#16a34a" /> 36-Month Owner Rent-Back Passbook Importer
            </h4>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#166534' }}>
              Upload your owner rental payout passbook to automatically record past payments and deduce remaining 3-year commitment balances.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadSample}
            style={{
              padding: '7px 14px',
              background: '#ffffff',
              border: '1px solid #86efac',
              borderRadius: '6px',
              color: '#15803d',
              fontWeight: '700',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            <Download size={14} /> Download Sample Template (.xlsx)
          </button>
        </div>

        {/* File Dropzone */}
        {!importResult && (
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed #94a3b8',
              borderRadius: '10px',
              padding: '26px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              background: '#f8fafc',
              transition: 'all 0.2s ease'
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <FileSpreadsheet size={38} color="#16a34a" style={{ margin: '0 auto 8px', opacity: 0.8 }} />
            <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#1e293b' }}>
              {fileName ? fileName : 'Click to Browse or Drag & Drop Rental Passbook Excel'}
            </h5>
            <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              Supports passbook spreadsheets formatted with Name, Flat No, MOU Date, and 36-Month Schedule Rows
            </p>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #f87171',
            borderRadius: '6px',
            padding: '10px 14px',
            fontSize: '0.82rem',
            color: '#991b1b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertTriangle size={16} /> {errorMsg}
          </div>
        )}

        {/* Parsed Preview Section */}
        {!importResult && parsedData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Metadata Badges */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px 16px',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '10px'
            }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700' }}>FLAT & OWNER</div>
                <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1e293b' }}>
                  Flat {parsedData.flatNo} ({parsedData.ownerName})
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700' }}>MOU & DUE DAY</div>
                <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#334155' }}>
                  {parsedData.mouDate} (Due: {parsedData.dueDay}th)
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', color: '#166534', fontWeight: '700' }}>TOTAL PAID TO OWNER</div>
                <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#15803d' }}>
                  {formatINR(parsedData.totalPaid)} ({parsedData.entries.filter((e) => e.isPaid).length} Mos)
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', color: '#92400e', fontWeight: '700' }}>REMAINING 3-YR BALANCE</div>
                <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#b45309' }}>
                  {formatINR(parsedData.remainingBalance)}
                </div>
              </div>
            </div>

            {/* Schedule Table Preview */}
            <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, borderBottom: '1px solid #e2e8f0' }}>
                  <tr style={{ textAlign: 'left', color: '#475569' }}>
                    <th style={{ padding: '6px 10px' }}>Month #</th>
                    <th style={{ padding: '6px 10px' }}>Date of Payment</th>
                    <th style={{ padding: '6px 10px' }}>Mode</th>
                    <th style={{ padding: '6px 10px' }}>Amount Paid</th>
                    <th style={{ padding: '6px 10px' }}>TDS</th>
                    <th style={{ padding: '6px 10px' }}>Net Paid</th>
                    <th style={{ padding: '6px 10px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.entries.map((e) => (
                    <tr key={e.sNo} style={{ borderBottom: '1px solid #f1f5f9', background: e.isPaid ? '#f0fdf4' : '#ffffff' }}>
                      <td style={{ padding: '6px 10px', fontWeight: '700', color: '#1e293b' }}>Month #{e.sNo}</td>
                      <td style={{ padding: '6px 10px', color: e.isPaid ? '#15803d' : '#94a3b8' }}>{e.paymentDate || '—'}</td>
                      <td style={{ padding: '6px 10px', color: '#334155' }}>{e.isPaid ? e.paymentMode : '—'}</td>
                      <td style={{ padding: '6px 10px', fontWeight: '800', color: e.isPaid ? '#15803d' : '#94a3b8' }}>
                        {formatINR(e.amountPaid)}
                      </td>
                      <td style={{ padding: '6px 10px', color: '#64748b' }}>{formatINR(e.tdsDeducted)}</td>
                      <td style={{ padding: '6px 10px', fontWeight: '700', color: e.isPaid ? '#16a34a' : '#94a3b8' }}>
                        {formatINR(e.netAmountPaid)}
                      </td>
                      <td style={{ padding: '6px 10px' }}>
                        {e.isPaid ? (
                          <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontWeight: '700', fontSize: '0.68rem' }}>
                            PAID
                          </span>
                        ) : (
                          <span style={{ background: '#f1f5f9', color: '#64748b', padding: '2px 6px', borderRadius: '4px', fontSize: '0.68rem' }}>
                            UPCOMING
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Success Report */}
        {importResult && (
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: '10px',
            padding: '20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <CheckCircle2 size={44} color="#16a34a" style={{ margin: '0 auto' }} />
            <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#14532d' }}>
              Owner Rental Ledger Successfully Synchronized!
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', maxWidth: '380px', margin: '0 auto', textAlign: 'center' }}>
              <div style={{ background: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: '700' }}>PAYOUTS RECORDED</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#14532d' }}>{importResult.totalPayoutsRecorded} / 36 Mos</div>
              </div>
              <div style={{ background: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: '700' }}>TOTAL DISBURSED</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#15803d' }}>{formatINR(importResult.totalAmountDisbursed)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '8px 16px',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '0.82rem',
              fontWeight: '600',
              color: '#475569',
              cursor: 'pointer'
            }}
          >
            {importResult ? 'Close' : 'Cancel'}
          </button>

          {!importResult && parsedData && (
            <button
              type="button"
              onClick={handleImportSubmit}
              disabled={loading}
              style={{
                padding: '8px 20px',
                background: '#16a34a',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: '700',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 4px rgba(22,163,74,0.25)'
              }}
            >
              {loading ? 'Synchronizing Ledger...' : `Save & Sync Flat ${parsedData.flatNo} Rental Passbook`}
            </button>
          )}
        </div>

      </div>
    </Modal>
  );
};
