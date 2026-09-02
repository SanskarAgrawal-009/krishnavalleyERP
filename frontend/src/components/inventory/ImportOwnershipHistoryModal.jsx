import React, { useState } from 'react';
import { Modal } from '../common/Modal.jsx';
import { projectService } from '../../services/projectService.js';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  History,
  RotateCcw
} from 'lucide-react';

export const ImportOwnershipHistoryModal = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [importSummary, setImportSummary] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
        setError('Please upload a valid Excel spreadsheet (.xlsx, .xls, or .csv)');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const downloadSampleTemplate = () => {
    const sampleData = [
      {
        'Flat No': '105',
        'Tower': 'Tower A',
        'Floor': 1,
        'Previous Owner Name': 'Shakuntla Gupta',
        'Previous Owner Mobile': '+91 9800000105',
        'Previous Owner Email': 'shakuntla.gupta@example.com',
        'Previous Owner PAN': 'ABCDE1234F',
        'Previous Owner Aadhaar': '123456789012',
        'Original Purchase Date': '13/03/2014',
        'Ownership Transfer Date': '14/10/2025',
        'Transfer Reason': 'Resale',
        'Historical Valuation': 1600000,
        'Historical Paid Amount': 1600000,
        'Total Rent Paid to Previous Owner (₹)': 1600000,
        'Previous Owner Monthly Rent (₹)': 16000,
        'Previous Owner Paid Months': 100,
        'Current Owner Name': 'MADAN GOPAL SARASWAT',
        'Current Owner Mobile': '+91 9800000105',
        'Remarks': 'Flat A-105: Prior owner Shakuntla Gupta received 100-Mo Rent (₹16,00,000) prior to resale to Madan Gopal Saraswat'
      },
      {
        'Flat No': '612',
        'Tower': 'Tower A',
        'Floor': 6,
        'Previous Owner Name': 'Uma Shankar Prasad Singh',
        'Previous Owner Mobile': '+91 9800000612',
        'Previous Owner Email': 'umashankar@example.com',
        'Previous Owner PAN': 'FGHIJ5678K',
        'Previous Owner Aadhaar': '987654321098',
        'Original Purchase Date': '15/06/2015',
        'Ownership Transfer Date': '10/06/2025',
        'Transfer Reason': 'Possession Renewal',
        'Historical Valuation': 2150000,
        'Historical Paid Amount': 5500000,
        'Total Rent Paid to Previous Owner (₹)': 2150000,
        'Previous Owner Monthly Rent (₹)': 21500,
        'Previous Owner Paid Months': 100,
        'Current Owner Name': 'Uma Shankar Prasad Singh',
        'Current Owner Mobile': '+91 9800000612',
        'Remarks': 'Flat A-612: Pre-Possession Guaranteed Rent (100mo @ ₹21,500/mo, Total: ₹21,50,000) expired/renewed to Post-Possession Rate (@ ₹11,000/mo)'
      },
      {
        'Flat No': '001',
        'Tower': 'Tower A',
        'Floor': 0,
        'Previous Owner Name': 'Ved Prakash Agarwal',
        'Previous Owner Mobile': '+91 9897123456',
        'Previous Owner Email': 'vedprakash@example.com',
        'Previous Owner PAN': 'KLMNO9012P',
        'Previous Owner Aadhaar': '456789012345',
        'Original Purchase Date': '14/06/2024',
        'Ownership Transfer Date': '20/07/2025',
        'Transfer Reason': 'Buy Back',
        'Historical Valuation': 5000000,
        'Historical Paid Amount': 5000000,
        'Total Rent Paid to Previous Owner (₹)': 310000,
        'Previous Owner Monthly Rent (₹)': 31000,
        'Previous Owner Paid Months': 10,
        'Current Owner Name': 'Suresh Mehta',
        'Current Owner Mobile': '+91 9811223344',
        'Remarks': 'Flat A-001: Repurchased by developer after 10 months rent payout (₹3,10,000) and transferred to Suresh Mehta'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    ws['!cols'] = [
      { wch: 10 }, // Flat No
      { wch: 12 }, // Tower
      { wch: 8 },  // Floor
      { wch: 28 }, // Previous Owner Name
      { wch: 18 }, // Previous Owner Mobile
      { wch: 24 }, // Previous Owner Email
      { wch: 14 }, // Previous Owner PAN
      { wch: 16 }, // Previous Owner Aadhaar
      { wch: 16 }, // Original Purchase Date
      { wch: 16 }, // Ownership Transfer Date
      { wch: 22 }, // Transfer Reason
      { wch: 18 }, // Historical Valuation
      { wch: 18 }, // Historical Paid Amount
      { wch: 30 }, // Total Rent Paid to Previous Owner
      { wch: 22 }, // Monthly Rent
      { wch: 16 }, // Paid Months
      { wch: 28 }, // Current Owner Name
      { wch: 18 }, // Current Owner Mobile
      { wch: 55 }  // Remarks
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Previous_Owners');
    XLSX.writeFile(wb, 'Krishna_Valley_Previous_Owners_Template.xlsx');
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select an Excel file to upload');
      return;
    }

    setLoading(true);
    setError(null);
    setImportSummary(null);

    try {
      const formData = new FormData();
      formData.append('excelFile', file);

      const res = await projectService.importOwnershipHistory(formData);
      if (res.success) {
        setImportSummary(res.data);
        if (onSuccess) onSuccess();
      } else {
        setError(res.message || 'Import failed');
      }
    } catch (err) {
      console.error('Error uploading ownership history:', err);
      setError(err.message || 'An error occurred during file upload');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Ownership History & Resale Archive (Excel)"
      maxWidth="680px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Informational Banner */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div>
            <h4 style={{ margin: '0 0 2px', fontSize: '0.86rem', color: '#1e293b', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <History size={16} color="#1a73e8" /> Chain of Title & Resale Archive Importer
            </h4>
            <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b' }}>
              Upload past owners, buyback deals, and transfer dates. The system keeps the historical archive and sets the active owner.
            </p>
          </div>

          <button
            type="button"
            onClick={downloadSampleTemplate}
            style={{
              padding: '6px 12px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              color: '#1a73e8',
              fontSize: '0.76rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
          >
            <Download size={14} /> Download Template
          </button>
        </div>

        {/* Upload Form */}
        <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{
            border: '2px dashed #cbd5e1',
            borderRadius: '10px',
            padding: '24px',
            textAlign: 'center',
            background: '#fafafa',
            cursor: 'pointer'
          }}>
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              id="history-excel-upload"
              style={{ display: 'none' }}
            />
            <label htmlFor="history-excel-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: '#e0f2fe',
                color: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FileSpreadsheet size={24} />
              </div>
              <div>
                <strong style={{ fontSize: '0.88rem', color: '#1e293b', display: 'block' }}>
                  {file ? file.name : 'Click to select or drag & drop Ownership History Excel'}
                </strong>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  Supports .xlsx, .xls (e.g. Previous Owners, Buyback Prices, New Buyers)
                </span>
              </div>
            </label>
          </div>

          {error && (
            <div style={{
              padding: '10px 14px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              color: '#991b1b',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {importSummary && (
            <div style={{
              padding: '12px 16px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '6px',
              color: '#166534',
              fontSize: '0.82rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', marginBottom: '6px' }}>
                <CheckCircle2 size={16} color="#16a34a" /> Import Successful!
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.78rem' }}>
                <li>Flats Processed: <strong>{importSummary.flatsUpdated}</strong></li>
                <li>Historical Records Appended: <strong>{importSummary.historyRecordsAppended}</strong></li>
                <li>Active Owners Updated: <strong>{importSummary.activeOwnersUpdated}</strong></li>
              </ul>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                background: '#ffffff',
                border: '1px solid #dadce0',
                borderRadius: '6px',
                color: '#374151',
                fontSize: '0.82rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Close
            </button>

            <button
              type="submit"
              disabled={!file || loading}
              style={{
                padding: '8px 20px',
                background: '#1a73e8',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: '700',
                cursor: !file || loading ? 'not-allowed' : 'pointer',
                opacity: !file || loading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Processing Import...
                </>
              ) : (
                <>
                  <Upload size={15} /> Upload & Process Archive
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </Modal>
  );
};
