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
      title="Import Ownership, Resale & Buyback History (Excel)"
      maxWidth="680px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Info Banner */}
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          padding: '12px 16px',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start'
        }}>
          <History size={20} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.82rem', color: '#166534', lineHeight: 1.5 }}>
            <strong>Bulk Historical Title Transfer & Resale Import:</strong>
            <p style={{ margin: '4px 0 0', color: '#15803d' }}>
              Upload previous titleholder records, historical purchase values, total rent paid prior to resale/buyback, and archive outgoing owner dossier records in the sales registry.
            </p>
          </div>
        </div>

        {/* Template Download Option */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px'
        }}>
          <div>
            <div style={{ fontSize: '0.84rem', fontWeight: '700', color: '#1e293b' }}>
              Download Sample Ownership Template
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
              Pre-formatted Excel sheet with column headers matching database fields.
            </div>
          </div>

          <button
            type="button"
            onClick={downloadSampleTemplate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              color: '#0f172a',
              fontSize: '0.8rem',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            <Download size={14} /> Download Template (.xlsx)
          </button>
        </div>

        {/* File Upload Form */}
        <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#1e293b', display: 'block', marginBottom: '6px' }}>
              Select Ownership History Excel File (.xlsx, .xls): *
            </label>
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              style={{
                width: '100%',
                padding: '10px',
                background: '#ffffff',
                border: '2px dashed #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            />
            {file && (
              <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: '600', marginTop: '4px', display: 'block' }}>
                ✓ Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </span>
            )}
          </div>

          {error && (
            <div style={{
              padding: '10px 14px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              color: '#991b1b',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Import Result Summary */}
          {importSummary && (
            <div style={{
              padding: '12px 16px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              color: '#166534'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', fontSize: '0.88rem' }}>
                <CheckCircle2 size={18} color="#16a34a" />
                <span>Ownership History Import Successful!</span>
              </div>
              <ul style={{ margin: '8px 0 0', paddingLeft: '20px', fontSize: '0.8rem', lineHeight: 1.6 }}>
                <li>Processed: <strong>{importSummary.totalRowsProcessed || importSummary.updated || 0}</strong> record(s)</li>
                <li>Transfers Archived: <strong>{importSummary.transfersArchived || importSummary.updated || 0}</strong> unit(s)</li>
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
              disabled={loading || !file}
              style={{
                padding: '8px 20px',
                background: '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: '700',
                cursor: (loading || !file) ? 'not-allowed' : 'pointer',
                opacity: (loading || !file) ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="spin" /> Importing Records...
                </>
              ) : (
                <>
                  <Upload size={15} /> Upload &amp; Sync History
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </Modal>
  );
};

export default ImportOwnershipHistoryModal;
