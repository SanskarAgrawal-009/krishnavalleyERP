import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Modal } from '../common/Modal.jsx';
import { salesService } from '../../services/salesService.js';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Building2,
  CreditCard,
  Layers,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export const ImportPaymentsModal = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [previewRows, setPreviewRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const formatINR = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(val) || 0);
  };

  // Helper to get normalized row value
  const getRowVal = (row, ...keys) => {
    const rowKeys = Object.keys(row);
    for (const key of keys) {
      const foundKey = rowKeys.find((k) => k.trim().toLowerCase() === key.toLowerCase());
      if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
        return row[foundKey];
      }
    }
    return '';
  };

  const cleanNumeric = (val, fallback = 0) => {
    if (typeof val === 'number') return isNaN(val) ? fallback : val;
    if (!val) return fallback;
    const cleanStr = String(val).replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleanStr);
    return isNaN(num) ? fallback : num;
  };

  // Handle Excel File Selection
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
        const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (rows.length === 0) {
          setErrorMsg('The selected spreadsheet is empty. Please check the rows.');
          return;
        }

        const normalized = rows.map((r, i) => {
          const flatNo = String(getRowVal(r, 'flat no', 'flat_no', 'flat no.', 'flat number', 'unit no', 'unit', 'flat')).trim();
          const buyerName = String(getRowVal(r, 'buyer name', 'owner name', 'customer name', 'name', 'buyer', 'owner')).trim();
          const amountPaid = cleanNumeric(getRowVal(r, 'amount paid', 'paid amount', 'amount', 'payment amount', 'paid', 'total paid'), 0);
          const rawDate = getRowVal(r, 'payment date', 'date', 'date of payment', 'receipt date');
          let paymentDate = rawDate instanceof Date ? rawDate.toISOString().slice(0, 10) : String(rawDate || new Date().toISOString().slice(0, 10));
          const paymentMode = String(getRowVal(r, 'payment mode', 'mode', 'payment type') || 'bank_transfer').trim();
          const receiptNumber = String(getRowVal(r, 'receipt no', 'receipt number', 'utr', 'reference no', 'cheque no') || `RCP-${flatNo}-${Date.now().toString().slice(-4)}`).trim();

          return {
            rowNumber: i + 2,
            flatNo,
            buyerName: buyerName || '—',
            amountPaid,
            paymentDate,
            paymentMode,
            receiptNumber,
            isValid: !!flatNo && amountPaid > 0
          };
        });

        setPreviewRows(normalized);
      } catch (err) {
        console.error('Error parsing excel:', err);
        setErrorMsg('Failed to parse Excel file. Please ensure it is a valid .xlsx, .xls, or .csv file.');
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  // Download Sample Payments Template
  const handleDownloadTemplate = () => {
    const sampleData = [
      {
        'flat no': '101',
        'buyer name': 'Aditya Pratap Singh',
        'amount paid': 3600000,
        'payment date': '2024-03-15',
        'payment mode': 'bank_transfer',
        'receipt no': 'HDFC-NEFT-998822'
      },
      {
        'flat no': '102',
        'buyer name': 'Rajeshwari Sharma',
        'amount paid': 2000000,
        'payment date': '2024-04-10',
        'payment mode': 'cheque',
        'receipt no': 'CHQ-887711'
      },
      {
        'flat no': '201',
        'buyer name': 'Vikram Mehra',
        'amount paid': 1500000,
        'payment date': '2024-05-01',
        'payment mode': 'upi',
        'receipt no': 'UPI-TXN-102938'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Previous_Payments');

    worksheet['!cols'] = [
      { wch: 12 }, // flat no
      { wch: 26 }, // buyer name
      { wch: 18 }, // amount paid
      { wch: 16 }, // payment date
      { wch: 16 }, // payment mode
      { wch: 22 }  // receipt no
    ];

    XLSX.writeFile(workbook, 'Krishna_Valley_Previous_Payments_Template.xlsx');
  };

  // Submit Payments Import
  const handleImportSubmit = async () => {
    const validRows = previewRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      alert('No valid payment rows to import. Please check flat numbers and amounts.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const payload = validRows.map((r) => ({
        flatNo: r.flatNo,
        amount: r.amountPaid,
        paymentDate: r.paymentDate,
        paymentMode: r.paymentMode,
        receiptNumber: r.receiptNumber
      }));

      const res = await salesService.importPreviousPayments(payload);
      if (res.success) {
        setImportResult(res.data);
        if (onSuccess) onSuccess();
      } else {
        setErrorMsg(res.message || 'Failed to import payment records.');
      }
    } catch (err) {
      console.error('Import error:', err);
      setErrorMsg(err.message || 'Error executing payment import.');
    } finally {
      setLoading(false);
    }
  };

  const totalValidAmount = previewRows.filter((r) => r.isValid).reduce((sum, r) => sum + r.amountPaid, 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Previous Payments & Ledger Data"
      maxWidth="840px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Header Information Box */}
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
              <Receipt size={18} color="#16a34a" /> Instant Payment Reconciliation
            </h4>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#166534' }}>
              Upload your spreadsheet to credit payments directly against buyer milestones and reduce balance dues automatically.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadTemplate}
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
            <Download size={14} /> Download Sample Excel Template
          </button>
        </div>

        {/* File Upload Zone */}
        {!importResult && (
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed #94a3b8',
              borderRadius: '10px',
              padding: '28px 20px',
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
            <FileSpreadsheet size={38} color="#2563eb" style={{ margin: '0 auto 8px', opacity: 0.8 }} />
            <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#1e293b' }}>
              {fileName ? fileName : 'Click to Browse or Drag & Drop Excel File'}
            </h5>
            <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              Supports .xlsx, .xls, and .csv with columns: Flat No, Amount Paid, Payment Date, Payment Mode, Receipt No
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

        {/* Preview Table */}
        {!importResult && previewRows.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#1e293b' }}>
                Preview Payment Records ({previewRows.length} Rows Detected)
              </span>
              <span style={{ fontSize: '0.82rem', color: '#16a34a', fontWeight: '800' }}>
                Total to Credit: {formatINR(totalValidAmount)}
              </span>
            </div>

            <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, borderBottom: '1px solid #e2e8f0' }}>
                  <tr style={{ textAlign: 'left', color: '#475569' }}>
                    <th style={{ padding: '8px 10px' }}>Row</th>
                    <th style={{ padding: '8px 10px' }}>Flat #</th>
                    <th style={{ padding: '8px 10px' }}>Buyer Name</th>
                    <th style={{ padding: '8px 10px' }}>Amount Paid</th>
                    <th style={{ padding: '8px 10px' }}>Date</th>
                    <th style={{ padding: '8px 10px' }}>Receipt / Ref</th>
                    <th style={{ padding: '8px 10px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((r) => (
                    <tr key={r.rowNumber} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 10px', color: '#64748b' }}>#{r.rowNumber}</td>
                      <td style={{ padding: '6px 10px', fontWeight: '700', color: '#1e293b' }}>Flat {r.flatNo}</td>
                      <td style={{ padding: '6px 10px', color: '#334155' }}>{r.buyerName}</td>
                      <td style={{ padding: '6px 10px', fontWeight: '800', color: '#16a34a' }}>{formatINR(r.amountPaid)}</td>
                      <td style={{ padding: '6px 10px', color: '#475569' }}>{r.paymentDate}</td>
                      <td style={{ padding: '6px 10px', color: '#64748b' }}>{r.receiptNumber}</td>
                      <td style={{ padding: '6px 10px' }}>
                        {r.isValid ? (
                          <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontWeight: '700', fontSize: '0.7rem' }}>
                            Valid
                          </span>
                        ) : (
                          <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: '4px', fontWeight: '700', fontSize: '0.7rem' }}>
                            Missing Data
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

        {/* Import Success Summary */}
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
              Previous Payments Successfully Applied!
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', maxWidth: '380px', margin: '0 auto', textAlign: 'center' }}>
              <div style={{ background: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: '700' }}>RECORDS CREDITED</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#14532d' }}>{importResult.creditedCount}</div>
              </div>
              <div style={{ background: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: '700' }}>TOTAL CREDITED</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#15803d' }}>{formatINR(importResult.totalAmountCredited)}</div>
              </div>
            </div>

            {importResult.errors && importResult.errors.length > 0 && (
              <div style={{ textAlign: 'left', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '10px', marginTop: '6px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#92400e', marginBottom: '4px' }}>Notes & Warnings:</div>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.74rem', color: '#b45309' }}>
                  {importResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Modal Action Buttons */}
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

          {!importResult && previewRows.length > 0 && (
            <button
              type="button"
              onClick={handleImportSubmit}
              disabled={loading || previewRows.filter((r) => r.isValid).length === 0}
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
              {loading ? 'Processing Payments...' : `Apply & Credit ${previewRows.filter((r) => r.isValid).length} Payment(s)`}
            </button>
          )}
        </div>

      </div>
    </Modal>
  );
};
