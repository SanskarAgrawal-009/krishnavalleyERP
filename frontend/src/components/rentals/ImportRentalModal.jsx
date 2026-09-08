import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Modal } from '../common/Modal.jsx';
import { LoadingButton } from '../common/LoadingButton.jsx';
import { rentalService } from '../../services/rentalService.js';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  Building2,
  Trash2
} from 'lucide-react';

export const ImportRentalModal = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successResult, setSuccessResult] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Helper: Format INR Currency
  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(val) || 0);
  };

  // Helper: Parse Date String to YYYY-MM-DD
  const parseExcelDate = (val) => {
    if (!val) return '';
    if (val instanceof Date) return val.toISOString().slice(0, 10);
    const num = Number(val);
    if (!isNaN(num) && num >= 20000 && num <= 75000) {
      const d = new Date((num - 25569) * 86400 * 1000);
      return d.toISOString().slice(0, 10);
    }
    const s = String(val).trim();
    if (!s || s === '—' || s === '-') return '';
    const parts = s.split(/[/ -]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) {
      if (parsed.getFullYear() > 3000) {
        const serial = parsed.getUTCHours() > 12 ? parsed.getUTCFullYear() + 1 : parsed.getUTCFullYear();
        if (serial >= 20000 && serial <= 75000) {
          const d = new Date((serial - 25569) * 86400 * 1000);
          return d.toISOString().slice(0, 10);
        }
      }
      return parsed.toISOString().slice(0, 10);
    }
    return s;
  };

  // Helper: Calculate Ending Date
  const calculateEndingDate = (startStr, months) => {
    if (!startStr) return '—';
    const d = new Date(startStr);
    if (isNaN(d.getTime())) return '—';
    d.setMonth(d.getMonth() + Number(months || 36));
    return d.toISOString().slice(0, 10);
  };

  // 1. Download Sample Excel Template matching user's columns
  const handleDownloadTemplate = () => {
    const sampleRows = [
      {
        'Flat No': 'A-001',
        'Owner Name': 'Ved Prakash Agarwal',
        'Owner Mobile': '9812345678',
        'Registry Date': '2025-06-14',
        'Rent Amount': 31000,
        'TDS Applied': 'Yes',
        'TDS %': '10%',
        'TDS Amount': 3100,
        'Payment Starting Date': '2025-07-25',
        'Tenure (Months)': 36,
        'Total Paid': 0
      },
      {
        'Flat No': 'A-002',
        'Owner Name': 'Dr. Alok Nath',
        'Owner Mobile': '9876543210',
        'Registry Date': '2025-06-15',
        'Rent Amount': 31000,
        'TDS Applied': 'Yes',
        'TDS %': '5%',
        'TDS Amount': 1550,
        'Payment Starting Date': '2025-07-25',
        'Tenure (Months)': 36,
        'Total Paid': 58900
      },
      {
        'Flat No': 'A-003',
        'Owner Name': 'Suresh Chand Sharma',
        'Owner Mobile': '9412345678',
        'Registry Date': '2025-07-01',
        'Rent Amount': 24000,
        'TDS Applied': 'No',
        'TDS %': '0%',
        'TDS Amount': 0,
        'Payment Starting Date': '2025-08-10',
        'Tenure (Months)': 36,
        'Total Paid': 0
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleRows);
    ws['!cols'] = [
      { wch: 14 }, // Flat No
      { wch: 24 }, // Owner Name
      { wch: 16 }, // Owner Mobile
      { wch: 16 }, // Registry Date
      { wch: 16 }, // Rent Amount
      { wch: 14 }, // TDS Applied
      { wch: 12 }, // TDS %
      { wch: 14 }, // TDS Amount
      { wch: 22 }, // Payment Starting Date
      { wch: 16 }, // Tenure (Months)
      { wch: 14 }  // Total Paid
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rental_Register');
    XLSX.writeFile(wb, 'Krishna_Valley_Rental_Register_Template.xlsx');
  };

  // 2. Parse Excel File
  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setErrorMsg('');
    setSuccessResult(null);
    setFileName(selected.name);
    setFile(selected);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

        if (!rows || rows.length === 0) {
          setErrorMsg('The selected spreadsheet does not contain any data rows.');
          setParsedRows([]);
          return;
        }

        const formatted = rows.map((r, idx) => {
          const flatNum = String(r['Flat No'] || r['Flat Number'] || r.flatNo || r.flatNumber || '').trim();
          const owner = String(r['Owner Name'] || r.ownerName || r.name || '').trim();
          const mobile = String(r['Owner Mobile'] || r.ownerMobile || r.mobileNo || '').trim();
          const regDate = parseExcelDate(r['Registry Date'] || r.registryDate || r['MOU Date'] || r.mouDate);
          const startDate = parseExcelDate(r['Payment Starting Date'] || r.startDate || r['Start Date'] || regDate);
          const rent = Number(r['Rent Amount'] || r.rentAmount || r.rent || 0);

          const rawTds = String(r['TDS Applied'] || r.applyTds || r.tds || '').trim().toLowerCase();
          const applyTds = !['no', 'false', '0', '0%'].includes(rawTds);

          const rawTdsAmount = r['TDS Amount'] ?? r['TDS (Amount)'] ?? r['TDS (₹)'] ?? r['TDS Value'] ?? r['TDS Deducted'] ?? r.tdsAmount;
          const rawTdsPercent = r['TDS %'] ?? r['TDS Percentage'] ?? r['TDS Rate'] ?? r.tdsPercentage;

          let tdsMode = 'percentage';
          let tdsPercentage = 10;
          let tdsAmt = 0;

          if (!applyTds) {
            tdsPercentage = 0;
            tdsAmt = 0;
          } else if (rawTdsAmount !== undefined && rawTdsAmount !== '' && !isNaN(Number(rawTdsAmount)) && Number(rawTdsAmount) > 0) {
            tdsMode = 'amount';
            tdsAmt = Math.max(0, Number(rawTdsAmount));
            tdsPercentage = rent > 0 ? Number(((tdsAmt / rent) * 100).toFixed(2)) : 0;
          } else if (rawTdsPercent !== undefined && rawTdsPercent !== '') {
            tdsMode = 'percentage';
            const cleanPct = String(rawTdsPercent).replace(/%/g, '').trim();
            tdsPercentage = !isNaN(Number(cleanPct)) ? Number(cleanPct) : 10;
            tdsAmt = Math.round(rent * (tdsPercentage / 100));
          } else if (rawTds && rawTds.includes('%')) {
            tdsMode = 'percentage';
            const cleanPct = rawTds.replace(/%/g, '').trim();
            tdsPercentage = !isNaN(Number(cleanPct)) ? Number(cleanPct) : 10;
            tdsAmt = Math.round(rent * (tdsPercentage / 100));
          } else {
            tdsMode = 'percentage';
            tdsPercentage = 10;
            tdsAmt = Math.round(rent * 0.1);
          }

          const net = rent - tdsAmt;
          const tenure = Number(r['Tenure (Months)'] || r.tenureMonths || r.tenure || 36) || 36;
          const totalCommitment = rent * tenure;
          const paid = Number(r['Total Paid'] || r.totalPaid || 0) || 0;
          const outstanding = Math.max(0, totalCommitment - paid);
          const endDate = calculateEndingDate(startDate, tenure);

          return {
            rowIdx: idx + 1,
            flatNumber: flatNum,
            ownerName: owner,
            ownerMobile: mobile,
            registryDate: regDate,
            rentAmount: rent,
            applyTds,
            tdsMode,
            tdsPercentage,
            tdsAmount: tdsAmt,
            netAmount: net,
            startDate,
            endDate,
            tenureMonths: tenure,
            totalCommitment,
            totalPaid: paid,
            outstanding,
            isValid: Boolean(flatNum && owner && rent > 0)
          };
        });

        setParsedRows(formatted);
      } catch (err) {
        console.error('Error parsing Rental Excel:', err);
        setErrorMsg('Failed to parse Excel spreadsheet. Please ensure it is a valid .xlsx or .xls file.');
        setParsedRows([]);
      }
    };
    reader.readAsArrayBuffer(selected);
  };

  // 3. Submit parsed rows to backend
  const handleImportSubmit = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      setErrorMsg('No valid rental records found to import.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const payload = {
        rentals: validRows.map((r) => ({
          flatNo: r.flatNumber,
          ownerName: r.ownerName,
          ownerMobile: r.ownerMobile,
          registryDate: r.registryDate,
          rentAmount: r.rentAmount,
          applyTds: r.applyTds,
          tdsMode: r.tdsMode,
          tdsPercentage: r.tdsPercentage,
          tdsAmount: r.tdsAmount,
          startDate: r.startDate,
          tenureMonths: r.tenureMonths,
          totalPaid: r.totalPaid
        }))
      };

      const res = await rentalService.importRentalsExcel(payload);
      if (res.success) {
        setSuccessResult(res.data);
        if (onSuccess) onSuccess();
      } else {
        setErrorMsg(res.message || 'Failed to import rental register');
      }
    } catch (err) {
      console.error('Error importing rentals:', err);
      setErrorMsg(err.message || 'Error occurred during rental import');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setFileName('');
    setParsedRows([]);
    setErrorMsg('');
    setSuccessResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import Rental Register by Excel"
      maxWidth="860px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

        {/* Template Download Banner */}
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <div style={{ fontWeight: '700', fontSize: '0.88rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileSpreadsheet size={16} /> Rental Register Template
            </div>
            <div style={{ fontSize: '0.78rem', color: '#15803d', marginTop: '2px' }}>
              Columns: Flat No, Owner Name, Registry Date, Rent Amount, TDS, Starting Date, Tenure, Total Paid.
            </div>
          </div>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            style={{
              padding: '7px 14px',
              borderRadius: '6px',
              background: '#16a34a',
              color: '#ffffff',
              border: 'none',
              fontWeight: '700',
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(22, 163, 74, 0.25)'
            }}
          >
            <Download size={14} /> Download Sample Template (.xlsx)
          </button>
        </div>

        {/* File Upload Dropzone */}
        {!successResult && (
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx, .xls, .csv"
              style={{ display: 'none' }}
            />

            {!file ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: '10px',
                  padding: '30px 20px',
                  textAlign: 'center',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Upload size={32} color="#64748b" style={{ margin: '0 auto 8px', display: 'block' }} />
                <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#1e293b' }}>
                  Click to select or drag & drop Rental Register spreadsheet
                </div>
                <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '4px' }}>
                  Supports .xlsx, .xls, and .csv files
                </div>
              </div>
            ) : (
              <div style={{
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px 16px',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileSpreadsheet size={24} color="#16a34a" />
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.86rem', color: '#0f172a' }}>{fileName}</div>
                    <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                      {parsedRows.length} rental record(s) ready for review
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    background: '#fee2e2',
                    border: '1px solid #fca5a5',
                    color: '#991b1b',
                    fontSize: '0.78rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Trash2 size={13} /> Change File
                </button>
              </div>
            )}
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '12px 14px',
            color: '#991b1b',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}

        {/* Success Alert */}
        {successResult && (
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            padding: '16px 20px',
            textAlign: 'center'
          }}>
            <CheckCircle2 size={36} color="#16a34a" style={{ margin: '0 auto 8px', display: 'block' }} />
            <div style={{ fontWeight: '800', fontSize: '1.05rem', color: '#166534' }}>
              Rental Register Imported Successfully!
            </div>
            <div style={{ fontSize: '0.82rem', color: '#15803d', marginTop: '6px' }}>
              Enrolled / Updated: <strong>{successResult.enrolledCount}</strong> rental unit(s) in Table 1
              {successResult.notFoundFlats?.length > 0 && (
                <span style={{ color: '#b91c1c', display: 'block', marginTop: '4px' }}>
                  Note: {successResult.notFoundFlats.length} flat(s) were not found in inventory ({successResult.notFoundFlats.join(', ')})
                </span>
              )}
            </div>
            <div style={{ marginTop: '14px' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn-primary"
                style={{ padding: '8px 20px', fontSize: '0.85rem' }}
              >
                Close & View Table 1 Register
              </button>
            </div>
          </div>
        )}

        {/* Preview Table */}
        {!successResult && parsedRows.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#334155' }}>
                Preview Rows ({parsedRows.length} units detected):
              </span>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                Ending Date & Outstanding will be auto-calculated
              </span>
            </div>

            <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                    <th style={{ padding: '8px 10px' }}>#</th>
                    <th style={{ padding: '8px 10px' }}>Flat No</th>
                    <th style={{ padding: '8px 10px' }}>Owner</th>
                    <th style={{ padding: '8px 10px' }}>Rent (Gross)</th>
                    <th style={{ padding: '8px 10px' }}>TDS</th>
                    <th style={{ padding: '8px 10px' }}>Net Rent</th>
                    <th style={{ padding: '8px 10px' }}>Start Date</th>
                    <th style={{ padding: '8px 10px' }}>End Date</th>
                    <th style={{ padding: '8px 10px' }}>Tenure</th>
                    <th style={{ padding: '8px 10px' }}>Total Commitment</th>
                    <th style={{ padding: '8px 10px' }}>Paid</th>
                    <th style={{ padding: '8px 10px' }}>Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((r, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#fcfcfc' }}>
                      <td style={{ padding: '8px 10px', color: '#94a3b8' }}>{r.rowIdx}</td>
                      <td style={{ padding: '8px 10px', fontWeight: '700', color: r.isValid ? '#0f172a' : '#ef4444' }}>
                        {r.flatNumber || 'Missing!'}
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: '600', color: '#1e293b' }}>
                        {r.ownerName || 'Missing!'}
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: '600', color: '#0f172a' }}>
                        {formatINR(r.rentAmount)}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        {r.applyTds ? (
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.68rem',
                            fontWeight: '700',
                            background: '#fef3c7',
                            color: '#b45309'
                          }}>
                            {r.tdsMode === 'amount'
                              ? `₹${r.tdsAmount.toLocaleString('en-IN')}`
                              : `${r.tdsPercentage}% (-₹${r.tdsAmount.toLocaleString('en-IN')})`}
                          </span>
                        ) : (
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.68rem',
                            fontWeight: '600',
                            background: '#f1f5f9',
                            color: '#64748b'
                          }}>
                            No TDS
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: '700', color: '#15803d' }}>
                        {formatINR(r.netAmount)}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#475569' }}>{r.startDate || '—'}</td>
                      <td style={{ padding: '8px 10px', color: '#475569' }}>{r.endDate}</td>
                      <td style={{ padding: '8px 10px', color: '#475569' }}>{r.tenureMonths}m</td>
                      <td style={{ padding: '8px 10px', fontWeight: '700', color: '#1e3a8a' }}>
                        {formatINR(r.totalCommitment)}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#15803d' }}>
                        {formatINR(r.totalPaid)}
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: '700', color: r.outstanding > 0 ? '#b91c1c' : '#15803d' }}>
                        {formatINR(r.outstanding)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Action Buttons */}
        {!successResult && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '9px 18px',
                background: '#f3f4f6',
                color: '#374151',
                border: '1px solid #dadce0',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              Cancel
            </button>
            <LoadingButton
              type="button"
              onClick={handleImportSubmit}
              loading={loading}
              loadingText="Importing Rentals..."
              disabled={parsedRows.length === 0}
              variant="primary"
              style={{ background: '#16a34a' }}
            >
              Import {parsedRows.length} Rentals into Table 1
            </LoadingButton>
          </div>
        )}

      </div>
    </Modal>
  );
};

export default ImportRentalModal;
