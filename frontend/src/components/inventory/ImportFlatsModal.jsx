import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Modal } from '../common/Modal.jsx';
import { LoadingButton } from '../common/LoadingButton.jsx';
import { projectService } from '../../services/projectService.js';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  Building2,
  Trash2
} from 'lucide-react';

export const ImportFlatsModal = ({
  isOpen,
  onClose,
  onSuccess,
  projectId,
  buildingId,
  buildingName = 'Building'
}) => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successResult, setSuccessResult] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // 1. Download Sample Template (.xlsx) strictly containing Flat Form Data
  const handleDownloadTemplate = () => {
    const sampleRows = [
      {
        'Flat Number': '101',
        'Floor Number': 1,
        'BHK Type': '2BHK',
        'Carpet Area (sq.ft)': 950,
        'Base Price (₹)': 4500000,
        'Facing': 'East',
        'Status': 'available'
      },
      {
        'Flat Number': '102',
        'Floor Number': 1,
        'BHK Type': '1BHK',
        'Carpet Area (sq.ft)': 650,
        'Base Price (₹)': 3200000,
        'Facing': 'North',
        'Status': 'available'
      },
      {
        'Flat Number': '201',
        'Floor Number': 2,
        'BHK Type': '3BHK',
        'Carpet Area (sq.ft)': 1350,
        'Base Price (₹)': 6200000,
        'Facing': 'North-East',
        'Status': 'available'
      },
      {
        'Flat Number': '202',
        'Floor Number': 2,
        'BHK Type': '2BHK',
        'Carpet Area (sq.ft)': 950,
        'Base Price (₹)': 4600000,
        'Facing': 'East',
        'Status': 'hold'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleRows);
    ws['!cols'] = [
      { wch: 14 }, // Flat Number
      { wch: 14 }, // Floor Number
      { wch: 12 }, // BHK Type
      { wch: 20 }, // Carpet Area (sq.ft)
      { wch: 16 }, // Base Price (₹)
      { wch: 14 }, // Facing
      { wch: 14 }  // Status
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Flats_Inventory');
    XLSX.writeFile(wb, `Flats_Inventory_Template_${buildingName.replace(/\s+/g, '_')}.xlsx`);
  };

  // 2. Parse uploaded Excel file
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
          const flatNum = String(r['Flat Number'] || r['Flat No'] || r.flatNumber || r.flatNo || '').trim();
          const floorVal = r['Floor Number'] !== undefined && r['Floor Number'] !== ''
            ? Number(r['Floor Number'])
            : (r.floor !== undefined && r.floor !== '' ? Number(r.floor) : null);

          return {
            rowIdx: idx + 1,
            flatNumber: flatNum,
            floor: floorVal,
            bhkType: String(r['BHK Type'] || r.bhkType || '2BHK').trim(),
            carpetArea: Number(r['Carpet Area (sq.ft)'] || r['Carpet Area'] || r.carpetArea || 950),
            basePrice: Number(r['Base Price (₹)'] || r['Base Price'] || r.basePrice || 4500000),
            facing: String(r['Facing'] || r.facing || 'East').trim(),
            status: String(r['Status'] || r.status || 'available').trim().toLowerCase(),
            isValid: Boolean(flatNum)
          };
        });

        setParsedRows(formatted);
      } catch (err) {
        console.error('Error parsing Excel:', err);
        setErrorMsg('Failed to parse Excel spreadsheet. Please ensure it is a valid .xlsx or .xls file.');
        setParsedRows([]);
      }
    };
    reader.readAsArrayBuffer(selected);
  };

  // 3. Submit parsed rows to backend
  const handleImportSubmit = async () => {
    if (!projectId || !buildingId) {
      setErrorMsg('Please ensure a Project and Building are selected to import flats into.');
      return;
    }

    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      setErrorMsg('No valid flat records found to import.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const payload = {
        projectId,
        buildingId,
        flats: validRows.map((r) => ({
          flatNumber: r.flatNumber,
          floor: r.floor,
          bhkType: r.bhkType,
          carpetArea: r.carpetArea,
          basePrice: r.basePrice,
          facing: r.facing,
          status: r.status
        }))
      };

      const res = await projectService.importFlatsExcel(payload);
      if (res.success) {
        setSuccessResult(res.data);
        if (onSuccess) onSuccess();
      } else {
        setErrorMsg(res.message || 'Failed to import flats');
      }
    } catch (err) {
      console.error('Error importing flats:', err);
      setErrorMsg(err.message || 'Error occurred during flat import');
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
      title={`Import Flats by Excel: "${buildingName}"`}
      maxWidth="780px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        
        {/* Template Download Ribbon */}
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
              <FileSpreadsheet size={16} /> Flats Inventory Form-Only Template
            </div>
            <div style={{ fontSize: '0.78rem', color: '#15803d', marginTop: '2px' }}>
              Columns strictly match the Flat form data: Flat Number, Floor, BHK Type, Carpet Area, Base Price, Facing, Status.
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

        {/* Upload Dropzone */}
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
                  Click to select or drag & drop Flat Inventory spreadsheet
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
                      {parsedRows.length} unit record(s) ready for review
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
              Flats Imported Successfully!
            </div>
            <div style={{ fontSize: '0.82rem', color: '#15803d', marginTop: '6px' }}>
              Created: <strong>{successResult.createdCount}</strong> new flat(s) • Updated: <strong>{successResult.updatedCount}</strong> flat(s)
            </div>
            <div style={{ marginTop: '14px' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn-primary"
                style={{ padding: '8px 20px', fontSize: '0.85rem' }}
              >
                Close & View Inventory
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
                Only Flat Form data will be stored
              </span>
            </div>

            <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                    <th style={{ padding: '8px 12px' }}>#</th>
                    <th style={{ padding: '8px 12px' }}>Flat No</th>
                    <th style={{ padding: '8px 12px' }}>Floor</th>
                    <th style={{ padding: '8px 12px' }}>BHK</th>
                    <th style={{ padding: '8px 12px' }}>Carpet (sq.ft)</th>
                    <th style={{ padding: '8px 12px' }}>Base Price (₹)</th>
                    <th style={{ padding: '8px 12px' }}>Facing</th>
                    <th style={{ padding: '8px 12px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((r, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#fcfcfc' }}>
                      <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{r.rowIdx}</td>
                      <td style={{ padding: '8px 12px', fontWeight: '700', color: r.isValid ? '#0f172a' : '#ef4444' }}>
                        {r.flatNumber || 'Missing!'}
                      </td>
                      <td style={{ padding: '8px 12px', color: '#475569' }}>
                        {r.floor !== null ? r.floor : 'Auto-inferred'}
                      </td>
                      <td style={{ padding: '8px 12px', color: '#475569' }}>{r.bhkType}</td>
                      <td style={{ padding: '8px 12px', color: '#475569' }}>{r.carpetArea}</td>
                      <td style={{ padding: '8px 12px', fontWeight: '600', color: '#15803d' }}>
                        ₹{Number(r.basePrice || 0).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '8px 12px', color: '#475569' }}>{r.facing}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          background: r.status === 'available' ? '#e6f4ea' : '#fef3c7',
                          color: r.status === 'available' ? '#137333' : '#b45309',
                          textTransform: 'uppercase'
                        }}>
                          {r.status}
                        </span>
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
              loadingText="Importing Flats..."
              disabled={parsedRows.length === 0}
              variant="primary"
              style={{ background: '#16a34a' }}
            >
              Import {parsedRows.length} Flats into {buildingName}
            </LoadingButton>
          </div>
        )}

      </div>
    </Modal>
  );
};

export default ImportFlatsModal;
