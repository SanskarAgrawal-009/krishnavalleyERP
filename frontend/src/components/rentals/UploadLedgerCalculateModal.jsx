import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  Calculator,
  ArrowRight,
  Sparkles,
  Info
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { rentalService } from '../../services/rentalService.js';
import { useToast } from '../../context/ToastContext.jsx';

export const UploadLedgerCalculateModal = ({ isOpen, onClose, onSuccess }) => {
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [calculating, setCalculating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadSummary, setUploadSummary] = useState(null);

  if (!isOpen) return null;

  // 1. Download Clean Excel Template
  const handleDownloadTemplate = () => {
    const sampleData = [
      {
        'Flat No': 'A-101',
        'Owner Name': 'Rajendra Sharma',
        'Tenure (Months)': 36,
        'Monthly Gross Rent': 15000,
        'TDS Applied': 'Yes',
        'TDS %': '10%',
        'TDS Amount': 1500,
        'Monthly Net Rent': 13500,
        'Total Paid': 162000,
        'Amount Outstanding': 324000,
        'Payment Starting Date': '2024-01-01'
      },
      {
        'Flat No': 'A-102',
        'Owner Name': 'Sunita Devi Agrawal',
        'Tenure (Months)': 36,
        'Monthly Gross Rent': 20000,
        'TDS Applied': 'Yes',
        'TDS %': '5%',
        'TDS Amount': 1000,
        'Monthly Net Rent': 19000,
        'Total Paid': 216000,
        'Amount Outstanding': 468000,
        'Payment Starting Date': '2024-02-01'
      },
      {
        'Flat No': 'B-201',
        'Owner Name': 'Vikramaditya Verma',
        'Tenure (Months)': 36,
        'Monthly Gross Rent': 25000,
        'TDS Applied': 'No',
        'TDS %': '0%',
        'TDS Amount': 0,
        'Monthly Net Rent': 25000,
        'Total Paid': 90000,
        'Amount Outstanding': 810000,
        'Payment Starting Date': '2024-03-01'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Passbook Calculation');

    // Auto-size columns
    worksheet['!cols'] = [
      { wch: 12 },
      { wch: 25 },
      { wch: 16 },
      { wch: 18 },
      { wch: 12 },
      { wch: 10 },
      { wch: 14 },
      { wch: 18 },
      { wch: 15 },
      { wch: 20 },
      { wch: 22 }
    ];

    XLSX.writeFile(workbook, 'Krishna_Valley_Rental_Passbook_Upload_Template.xlsx');
    toast.showSuccess('Template downloaded! Fill in your data and upload.');
  };

  // 2. Parse Excel and pre-calculate month figures
  const processExcelFile = (file) => {
    setCalculating(true);
    setSelectedFile(file);
    setUploadSummary(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawJson = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          toast.showError('The uploaded Excel sheet contains no rows.');
          setCalculating(false);
          return;
        }

        // Calculate paid months and balances for each row
        const calculated = rawJson.map((row, idx) => {
          const flatNumber = String(
            row.flatNumber || row['Flat No'] || row['Flat Number'] || row.flat || row['Unit'] || ''
          ).trim();

          const ownerName = String(
            row.ownerName || row['Owner Name'] || row['Customer Name'] || row.name || ''
          ).trim();

          const tenure = Number(
            row.tenureMonths || row['Tenure (Months)'] || row['Tenure'] || row['Tenure in Months'] || 36
          ) || 36;

          let netRent = Number(
            row.netAmount || row['Monthly Net Rent'] || row['Net Rental Amount'] || row['Net Rent'] || row['Net Amount'] || 0
          );
          let grossRent = Number(
            row.rentAmount || row['Monthly Gross Rent'] || row['Rent Amount'] || row['Gross Rent'] || 0
          );

          const rawTds = String(row.applyTds || row['TDS Applied'] || row['Apply TDS'] || row['TDS'] || '').trim().toLowerCase();
          const applyTds = !['no', 'false', '0', '0%'].includes(rawTds);

          const rawTdsAmount = row['TDS Amount'] ?? row['TDS (Amount)'] ?? row['TDS (₹)'] ?? row['TDS Value'] ?? row['TDS Deducted'] ?? row.tdsAmount;
          const rawTdsPercent = row['TDS %'] ?? row['TDS Percentage'] ?? row['TDS Rate'] ?? row.tdsPercentage;

          let tdsMode = 'percentage';
          let tdsPercentage = 10;
          let tdsAmt = 0;

          if (!applyTds) {
            tdsPercentage = 0;
            tdsAmt = 0;
          } else if (rawTdsAmount !== undefined && rawTdsAmount !== '' && !isNaN(Number(rawTdsAmount)) && Number(rawTdsAmount) > 0) {
            tdsMode = 'amount';
            tdsAmt = Math.max(0, Number(rawTdsAmount));
            if (grossRent > 0) {
              tdsPercentage = Number(((tdsAmt / grossRent) * 100).toFixed(2));
            }
          } else if (rawTdsPercent !== undefined && rawTdsPercent !== '') {
            tdsMode = 'percentage';
            const cleanPct = String(rawTdsPercent).replace(/%/g, '').trim();
            tdsPercentage = !isNaN(Number(cleanPct)) ? Number(cleanPct) : 10;
            if (grossRent > 0) {
              tdsAmt = Math.round(grossRent * (tdsPercentage / 100));
            }
          } else if (rawTds && rawTds.includes('%')) {
            const cleanPct = rawTds.replace(/%/g, '').trim();
            tdsPercentage = !isNaN(Number(cleanPct)) ? Number(cleanPct) : 10;
            if (grossRent > 0) {
              tdsAmt = Math.round(grossRent * (tdsPercentage / 100));
            }
          }

          if (netRent > 0 && grossRent <= 0) {
            if (tdsMode === 'amount') {
              grossRent = netRent + tdsAmt;
              tdsPercentage = grossRent > 0 ? Number(((tdsAmt / grossRent) * 100).toFixed(2)) : 0;
            } else {
              grossRent = applyTds ? Math.round(netRent / (1 - (tdsPercentage / 100) || 0.9)) : netRent;
              tdsAmt = applyTds ? grossRent - netRent : 0;
            }
          } else if (grossRent > 0 && netRent <= 0) {
            if (tdsMode === 'amount') {
              tdsPercentage = grossRent > 0 ? Number(((tdsAmt / grossRent) * 100).toFixed(2)) : 0;
            } else {
              tdsAmt = applyTds ? Math.round(grossRent * (tdsPercentage / 100)) : 0;
            }
            netRent = grossRent - tdsAmt;
          } else if (grossRent > 0 && netRent > 0) {
            if (applyTds && tdsAmt === 0) {
              tdsAmt = Math.max(0, grossRent - netRent);
              if (tdsMode === 'amount') {
                tdsPercentage = grossRent > 0 ? Number(((tdsAmt / grossRent) * 100).toFixed(2)) : 0;
              }
            }
          }

          const totalPaid = Number(
            row.totalPaid || row['Total Paid'] || row['Paid'] || row['Total Amount Paid'] || 0
          ) || 0;

          const monthlyGross = grossRent > 0 ? grossRent : 1;
          const paidMonths = Math.min(tenure, Math.round(totalPaid / monthlyGross));
          const remainderPaid = totalPaid % monthlyGross;
          const remainingMonths = Math.max(0, tenure - paidMonths);
          const totalCommitment = tenure * monthlyGross;
          const outstandingCalculated = Math.max(0, totalCommitment - totalPaid);

          const providedOutstanding = Number(row.amountOutstanding || row['Amount Outstanding'] || row['Outstanding']);
          const finalOutstanding = !isNaN(providedOutstanding) && providedOutstanding >= 0
            ? providedOutstanding
            : outstandingCalculated;

          const startDateStr = row.startDate || row['Payment Starting Date'] || row['Start Date'] || row['Registry Date'] || '';

          return {
            rowIdx: idx + 1,
            flatNumber,
            ownerName,
            tenure,
            netRent: monthlyUnit,
            grossRent,
            applyTds,
            tdsMode,
            tdsPercentage,
            tdsAmount: tdsAmt,
            totalPaid,
            paidMonths,
            remainderPaid,
            remainingMonths,
            totalCommitment,
            outstanding: finalOutstanding,
            startDateStr,
            isValid: Boolean(flatNumber && monthlyUnit > 0)
          };
        });

        setParsedRows(calculated);
        setCalculating(false);
        toast.showSuccess(`Calculated passbook schedules for ${calculated.length} rows! Review before generating.`);
      } catch (err) {
        console.error('Error reading Excel:', err);
        toast.showError('Failed to parse Excel file. Ensure valid columns.');
        setCalculating(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processExcelFile(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) processExcelFile(file);
  };

  // 3. Confirm and Submit to Backend
  const handleConfirmAndGenerate = async () => {
    if (parsedRows.length === 0) return;

    setSubmitting(true);
    try {
      const payload = parsedRows.map((r) => ({
        flatNumber: r.flatNumber,
        ownerName: r.ownerName,
        tenureMonths: r.tenure,
        netAmount: r.netRent,
        rentAmount: r.grossRent,
        applyTds: r.applyTds,
        tdsPercentage: r.tdsPercentage,
        totalPaid: r.totalPaid,
        amountOutstanding: r.outstanding,
        startDate: r.startDateStr
      }));

      const res = await rentalService.uploadLedgerExcelAndGenerate({ records: payload });

      if (res.success) {
        setUploadSummary(res.data);
        toast.showSuccess(res.message || 'Passbook ledgers generated successfully!');
        if (onSuccess) onSuccess();
      } else {
        toast.showError(res.message || 'Failed to process ledger upload');
      }
    } catch (err) {
      console.error('Error submitting ledger calculation:', err);
      toast.showError('Server error while generating rental passbooks');
    } finally {
      setSubmitting(false);
    }
  };

  const formatINR = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

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
          maxWidth: '1050px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
            color: '#ffffff'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Calculator size={22} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>
                Upload Passbook Excel & Auto-Calculate Ledgers
              </h2>
              <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#bfdbfe' }}>
                Auto-computes paid months from Total Paid ÷ Net Monthly Rent and generates all paid ledger passbook entries
              </p>
            </div>
          </div>
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

        {/* Modal Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Top Instruction Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              borderRadius: '10px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sparkles size={18} color="#2563eb" />
              <div>
                <span style={{ fontSize: '0.86rem', fontWeight: '700', color: '#1e3a8a' }}>
                  Smart Month Calculation Formula:
                </span>
                <span style={{ fontSize: '0.82rem', color: '#3b82f6', marginLeft: '6px' }}>
                  Paid Months = ⌊ Total Paid ÷ Monthly Net Rent ⌋ • Remaining months up to Tenure will be scheduled as Upcoming.
                </span>
              </div>
            </div>

            <button
              onClick={handleDownloadTemplate}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                backgroundColor: '#ffffff',
                border: '1px solid #2563eb',
                color: '#2563eb',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(37, 99, 235, 0.1)'
              }}
            >
              <Download size={15} /> Download Sample Excel Template
            </button>
          </div>

          {/* Upload Dropzone */}
          {!parsedRows.length && (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragActive ? '#2563eb' : '#cbd5e1'}`,
                borderRadius: '12px',
                padding: '40px 20px',
                textAlign: 'center',
                backgroundColor: dragActive ? '#f8faff' : '#f8fafc',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: '#dbeafe',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px'
                }}
              >
                <FileSpreadsheet size={28} />
              </div>
              <h3 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: '700', color: '#0f172a' }}>
                Drag & Drop your Excel Passbook file here
              </h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                Supports .xlsx or .xls with Tenure, Net Rental Amount, Total Paid, and Outstanding
              </p>
            </div>
          )}

          {/* Preview & Calculation Table */}
          {parsedRows.length > 0 && !uploadSummary && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: '800', color: '#0f172a' }}>
                    Calculation Preview ({parsedRows.length} properties detected)
                  </h4>
                  <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                    Verify the calculated paid months and upcoming balances below before writing to owner passbooks
                  </p>
                </div>

                <button
                  onClick={() => {
                    setParsedRows([]);
                    setSelectedFile(null);
                  }}
                  style={{
                    fontSize: '0.8rem',
                    color: '#dc2626',
                    background: 'transparent',
                    border: 'none',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Clear & Re-upload
                </button>
              </div>

              <div
                style={{
                  maxHeight: '380px',
                  overflowY: 'auto',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px'
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#f1f5f9', zIndex: 1 }}>
                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                      <th style={{ padding: '10px 12px', fontWeight: '700', color: '#475569' }}>Flat</th>
                      <th style={{ padding: '10px 12px', fontWeight: '700', color: '#475569' }}>Owner Name</th>
                      <th style={{ padding: '10px 12px', fontWeight: '700', color: '#475569' }}>Tenure</th>
                      <th style={{ padding: '10px 12px', fontWeight: '700', color: '#475569' }}>Net Rent / Mo</th>
                      <th style={{ padding: '10px 12px', fontWeight: '700', color: '#475569' }}>TDS</th>
                      <th style={{ padding: '10px 12px', fontWeight: '700', color: '#475569' }}>Total Paid</th>
                      <th style={{ padding: '10px 12px', fontWeight: '700', color: '#15803d' }}>
                        🧮 Paid Months
                      </th>
                      <th style={{ padding: '10px 12px', fontWeight: '700', color: '#b45309' }}>
                        Upcoming Months
                      </th>
                      <th style={{ padding: '10px 12px', fontWeight: '700', color: '#475569' }}>Outstanding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row, idx) => (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                        }}
                      >
                        <td style={{ padding: '10px 12px', fontWeight: '800', color: '#1e293b' }}>
                          {row.flatNumber || '⚠️ Missing'}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#334155' }}>
                          {row.ownerName || '—'}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#334155' }}>
                          {row.tenure} Mos
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: '600', color: '#0f172a' }}>
                          {formatINR(row.netRent)}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {row.applyTds ? (
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              background: '#fef3c7',
                              color: '#92400e'
                            }}>
                              {row.tdsMode === 'amount'
                                ? `₹${row.tdsAmount?.toLocaleString('en-IN')}`
                                : `${row.tdsPercentage}%`}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>None</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: '700', color: '#16a34a' }}>
                          {formatINR(row.totalPaid)}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: '#dcfce7',
                              color: '#15803d',
                              fontWeight: '800'
                            }}
                          >
                            <CheckCircle2 size={12} /> {row.paidMonths} Months Paid
                          </span>
                          {row.remainderPaid > 0 && (
                            <span style={{ display: 'block', fontSize: '0.7rem', color: '#65a30d', marginTop: '2px' }}>
                              + {formatINR(row.remainderPaid)} partial
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: '#fef3c7',
                              color: '#b45309',
                              fontWeight: '700'
                            }}
                          >
                            {row.remainingMonths} Months Upcoming
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: '700', color: '#dc2626' }}>
                          {formatINR(row.outstanding)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Post-Upload Success Summary */}
          {uploadSummary && (
            <div
              style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '12px',
                padding: '20px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <CheckCircle2 size={24} color="#16a34a" />
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#14532d' }}>
                  Passbook Generation Completed!
                </h4>
              </div>
              <p style={{ margin: '0 0 14px', fontSize: '0.85rem', color: '#166534' }}>
                Successfully updated <strong>{uploadSummary.updatedCount}</strong> rental customer passbooks with all calculated paid and upcoming tenure entries.
              </p>

              {uploadSummary.notFoundFlats?.length > 0 && (
                <div style={{ marginTop: '10px', padding: '10px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#991b1b' }}>
                    Flats Not Found in Inventory: {uploadSummary.notFoundFlats.join(', ')}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc'
          }}
        >
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            {parsedRows.length > 0 && !uploadSummary ? (
              <span>Ready to generate {parsedRows.length} customer passbook ledgers</span>
            ) : null}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '0.84rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              {uploadSummary ? 'Close' : 'Cancel'}
            </button>

            {parsedRows.length > 0 && !uploadSummary && (
              <button
                onClick={handleConfirmAndGenerate}
                disabled={submitting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 22px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: submitting ? '#93c5fd' : '#2563eb',
                  color: '#ffffff',
                  fontSize: '0.84rem',
                  fontWeight: '800',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)'
                }}
              >
                <Sparkles size={16} />
                {submitting ? 'Generating Passbooks...' : 'Generate All Paid Entries in Passbook'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
