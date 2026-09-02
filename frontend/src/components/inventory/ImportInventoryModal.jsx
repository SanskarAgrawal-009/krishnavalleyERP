import React, { useState, useRef } from 'react';
import { Modal } from '../common/Modal.jsx';
import { projectService } from '../../services/projectService.js';
import * as XLSX from 'xlsx';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Home,
  User,
  Calendar,
  DollarSign,
  Clock,
  ShieldCheck,
  RefreshCw,
  Trash2,
  ArrowRight,
  Info,
  Check
} from 'lucide-react';

export const ImportInventoryModal = ({
  isOpen,
  onClose,
  projects = [],
  defaultProjectId = '',
  onImportSuccess
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState(defaultProjectId || (projects[0]?._id || projects[0]?.id || ''));
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [previewRows, setPreviewRows] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  // Sync default project if changed
  React.useEffect(() => {
    if (defaultProjectId) {
      setSelectedProjectId(defaultProjectId);
    } else if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0]._id || projects[0].id);
    }
  }, [defaultProjectId, projects]);

  // Reset state on modal open
  React.useEffect(() => {
    if (isOpen) {
      setFile(null);
      setFileName('');
      setPreviewRows([]);
      setRawRows([]);
      setImportResult(null);
      setErrorMsg('');
    }
  }, [isOpen]);

  const formatINR = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  // Safe helper to find key in row
  const getRowVal = (row, ...aliases) => {
    if (!row || typeof row !== 'object') return '';
    const keys = Object.keys(row);
    for (const alias of aliases) {
      if (row[alias] !== undefined && row[alias] !== null && String(row[alias]).trim() !== '') {
        return row[alias];
      }
      const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
      const matchedKey = keys.find((k) => k.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanAlias);
      if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null && String(row[matchedKey]).trim() !== '') {
        return row[matchedKey];
      }
    }
    return '';
  };

  const cleanNumeric = (val, defaultVal = 0) => {
    if (val === undefined || val === null || val === '') return defaultVal;
    if (typeof val === 'number') return isNaN(val) ? defaultVal : val;
    const cleaned = String(val).replace(/[^0-9.-]/g, '');
    const n = parseFloat(cleaned);
    return isNaN(n) ? defaultVal : n;
  };

  const parseExcelDate = (val) => {
    if (!val) return null;
    if (val instanceof Date && !isNaN(val.getTime())) return val;
    if (typeof val === 'number') {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const ms = val * 86400 * 1000;
      const d = new Date(excelEpoch.getTime() + ms);
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof val === 'string') {
      const s = val.trim();
      if (!s) return null;
      const dmyMatch = s.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
      if (dmyMatch) {
        const day = parseInt(dmyMatch[1], 10);
        const month = parseInt(dmyMatch[2], 10) - 1;
        const year = parseInt(dmyMatch[3], 10);
        const d = new Date(year, month, day);
        return isNaN(d.getTime()) ? null : d;
      }
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  };

  const inferFloorFromFlat = (flatStr) => {
    if (!flatStr) return 1;
    const digits = flatStr.toString().replace(/\D/g, '');
    if (!digits) return 1;
    if (digits.length >= 3) {
      const fl = parseInt(digits.slice(0, -2), 10);
      return isNaN(fl) || fl === 0 ? 1 : fl;
    }
    const single = parseInt(digits[0], 10);
    return isNaN(single) || single === 0 ? 1 : single;
  };

  // Process File Selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    processFile(selectedFile);
  };

  const processFile = (selectedFile) => {
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setErrorMsg('');
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (!rows || rows.length === 0) {
          setErrorMsg('The selected spreadsheet has no rows or is empty.');
          setPreviewRows([]);
          setRawRows([]);
          return;
        }

        setRawRows(rows);

        // Normalize rows for preview
        const normalized = rows.map((r, i) => {
          const flatNo = String(getRowVal(r, 'flat no', 'flat_no', 'flat no.', 'flat number', 'unit no', 'unit', 'flat')).trim();
          const rawFloor = getRowVal(r, 'floor', 'floor no', 'floor_no', 'floor number');
          const floor = rawFloor !== '' ? cleanNumeric(rawFloor, 1) : inferFloorFromFlat(flatNo);
          const building = String(getRowVal(r, 'building', 'tower', 'building name', 'block', 'wing') || 'Tower A').trim();
          const ownerName = String(getRowVal(r, 'owner name', 'owner_name', 'owner', 'buyer name', 'customer name', 'name')).trim();
          const ownerMobile = String(getRowVal(r, 'owner mobile', 'owner phone', 'mobile', 'phone', 'contact')).trim();

          const rawAgreementDate = getRowVal(r, 'date of aggreement', 'date of agreement', 'agreement date', 'booking date');
          const agreementDate = parseExcelDate(rawAgreementDate);

          const rawRentalStart = getRowVal(r, 'date of the rental starts', 'rental start date', 'rental start', 'start date');
          const rentalStartDate = parseExcelDate(rawRentalStart) || agreementDate;

          // Tenure: default to 36 if empty, blank, or 0
          const rawTenure = getRowVal(r, 'tenure', 'tenure (months)', 'tenure months', 'lease tenure', 'duration');
          let tenure = cleanNumeric(rawTenure, 36);
          if (tenure <= 0) tenure = 36;

          // Monthly Rent
          const rawMonthlyRent = getRowVal(r, 'amount per month', 'monthly rent', 'rent per month', 'monthly amount', 'rent');
          const monthlyRent = cleanNumeric(rawMonthlyRent, 0);

          // Total Tenure Amount: auto-calculated as monthlyRent * tenure if blank
          const rawTotalTenureAmount = getRowVal(r, 'amount for the total tenure', 'total tenure amount', 'total amount', 'total rental amount', 'total rent');
          let totalTenureAmount = cleanNumeric(rawTotalTenureAmount, 0);
          if (totalTenureAmount <= 0 && monthlyRent > 0) {
            totalTenureAmount = monthlyRent * tenure;
          }

          // Sales Deal Price & Previous Payments
          const rawDealPrice = getRowVal(r, 'agreed deal price', 'deal price', 'sale price', 'total price', 'flat price', 'base price');
          let agreedDealPrice = cleanNumeric(rawDealPrice, 0);
          if (agreedDealPrice <= 0) {
            agreedDealPrice = totalTenureAmount > 0 ? totalTenureAmount * 3 : 4500000;
          }

          const rawPaidAmount = getRowVal(r, 'previous payment', 'previous payments', 'paid amount', 'amount paid', 'booking amount', 'advance paid', 'token amount', 'payment made');
          let previousPaidAmount = cleanNumeric(rawPaidAmount, 0);
          if (previousPaidAmount <= 0 && rawPaidAmount === '') {
            previousPaidAmount = Math.min(agreedDealPrice, 100000);
          }

          const bhkType = String(getRowVal(r, 'flat type', 'bhk type', 'type', 'bhk') || '2BHK').trim();

          return {
            rowNumber: i + 2,
            flatNo,
            floor,
            building,
            ownerName: ownerName || '—',
            ownerMobile: ownerMobile || '—',
            agreementDate: agreementDate ? agreementDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
            rentalStartDate: rentalStartDate ? rentalStartDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
            tenure,
            monthlyRent,
            totalTenureAmount,
            agreedDealPrice,
            previousPaidAmount,
            bhkType,
            isValid: !!flatNo
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

  // Download Sample Template
  const handleDownloadTemplate = () => {
    const sampleData = [
      {
        'flat no': '101',
        'floor': 1,
        'building': 'Tower A',
        'owner name': 'Aditya Pratap Singh',
        'owner mobile': '9810112233',
        'agreed deal price': 4500000,
        'previous payment': 1000000, // advance already paid by buyer
        'date of aggreement': '2024-01-15',
        'date of the rental starts': '2024-02-01',
        'tenure': 36,
        'amount per month': 25000,
        'amount for the total tenure': 900000,
        'flat type': '2BHK',
        'carpet area': 950
      },
      {
        'flat no': '102',
        'floor': 1,
        'building': 'Tower A',
        'owner name': 'Rajeshwari Sharma',
        'owner mobile': '9876543210',
        'agreed deal price': 5500000,
        'previous payment': 5500000, // fully paid
        'date of aggreement': '2024-03-10',
        'date of the rental starts': '2024-04-01',
        'tenure': '', // left blank to test default 36
        'amount per month': 30000,
        'amount for the total tenure': '', // left blank to test auto-calculation (30000 * 36)
        'flat type': 'Service Apartment',
        'carpet area': 1150
      },
      {
        'flat no': '201',
        'floor': 2,
        'building': 'Tower B',
        'owner name': 'Vikram Mehra',
        'owner mobile': '9988776655',
        'agreed deal price': 4800000,
        'previous payment': 1500000,
        'date of aggreement': '2024-05-01',
        'date of the rental starts': '2024-06-01',
        'tenure': 36,
        'amount per month': 28000,
        'amount for the total tenure': 1008000,
        'flat type': '3BHK',
        'carpet area': 1450
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory_Template');

    // Auto-fit column widths
    worksheet['!cols'] = [
      { wch: 10 }, // flat no
      { wch: 8 },  // floor
      { wch: 14 }, // building
      { wch: 24 }, // owner name
      { wch: 15 }, // owner mobile
      { wch: 18 }, // agreed deal price
      { wch: 18 }, // previous payment
      { wch: 20 }, // date of aggreement
      { wch: 26 }, // date of the rental starts
      { wch: 10 }, // tenure
      { wch: 18 }, // amount per month
      { wch: 26 }, // amount for the total tenure
      { wch: 18 }, // flat type
      { wch: 12 }  // carpet area
    ];

    XLSX.writeFile(workbook, 'Krishna_Valley_Inventory_Import_Template.xlsx');
  };

  // Submit Import to Backend
  const handleConfirmImport = async () => {
    if (!file && rawRows.length === 0) {
      alert('Please select an Excel file to import.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      let res;
      if (file) {
        const formData = new FormData();
        formData.append('excelFile', file);
        if (selectedProjectId) formData.append('projectId', selectedProjectId);
        res = await projectService.importFlatsExcel(formData);
      } else {
        res = await projectService.importFlatsExcel({
          projectId: selectedProjectId,
          items: rawRows
        });
      }

      if (res.success && res.data) {
        setImportResult(res.data);
        if (onImportSuccess) onImportSuccess(res.data);
      } else {
        setErrorMsg(res.message || 'Import failed.');
      }
    } catch (err) {
      console.error('Import error:', err);
      setErrorMsg(err.message || 'An error occurred while importing inventory.');
    } finally {
      setLoading(false);
    }
  };

  const validRowCount = previewRows.filter((r) => r.isValid).length;
  const invalidRowCount = previewRows.length - validRowCount;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Excel Bulk Import: Inventory, Owners & 3-Year Guaranteed Rentals"
      maxWidth="1020px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Top Instructions Banner */}
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '10px',
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '280px' }}>
            <FileSpreadsheet size={24} color="#16a34a" />
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#166534' }}>
                Bulk Import Past Units, Owner Registry & 3-Year Rent-Back Contracts
              </div>
              <div style={{ fontSize: '0.78rem', color: '#15803d', marginTop: '2px' }}>
                Required columns: <strong>flat no</strong>, <strong>floor</strong>, <strong>building</strong>, <strong>owner name</strong>, <strong>date of aggreement</strong>, <strong>date of the rental starts</strong>, <strong>tenure</strong> (default: 36), <strong>amount per month</strong>, <strong>amount for total tenure</strong>.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            style={{
              padding: '8px 16px',
              background: '#ffffff',
              color: '#16a34a',
              border: '1.5px solid #16a34a',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            <Download size={15} /> Download Sample Template
          </button>
        </div>

        {/* Project Selector */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          background: '#f8fafc',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '0.84rem', fontWeight: '700', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={16} color="#2563eb" /> Target Project / Site:
          </span>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              fontWeight: '600',
              color: '#0f172a',
              minWidth: '240px',
              backgroundColor: '#ffffff'
            }}
          >
            {projects.map((p) => (
              <option key={p._id || p.id} value={p._id || p.id}>
                {p.projectName} ({p.projectCode || 'KV'})
              </option>
            ))}
          </select>
        </div>

        {/* Drag & Drop File Upload Zone */}
        {!previewRows.length && !importResult && (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
            }}
            style={{
              border: '2px dashed #94a3b8',
              borderRadius: '12px',
              padding: '40px 20px',
              textAlign: 'center',
              background: '#f8fafc',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx, .xls, .csv"
              style={{ display: 'none' }}
            />
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#e0f2fe',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <UploadCloud size={28} />
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>
                Click to browse or drag & drop your Excel sheet here
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                Supports <strong>.xlsx</strong>, <strong>.xls</strong>, and <strong>.csv</strong> spreadsheets
              </div>
            </div>
          </div>
        )}

        {/* Error Notification */}
        {errorMsg && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertTriangle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Import Results Card */}
        {importResult && (
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '10px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle2 size={28} color="#16a34a" />
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#166534', margin: 0 }}>
                  Import Completed Successfully!
                </h3>
                <div style={{ fontSize: '0.82rem', color: '#15803d', marginTop: '2px' }}>
                  Your previous inventory, owners, and 3-Year guaranteed rental programs have been saved in MongoDB.
                </div>
              </div>
            </div>

            {/* Metrics Chips */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
              <div style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #dcfce7', textAlign: 'center' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#166534' }}>{importResult.createdFlats}</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>NEW FLATS CREATED</div>
              </div>
              <div style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #dcfce7', textAlign: 'center' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#2563eb' }}>{importResult.updatedFlats}</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>FLATS UPDATED</div>
              </div>
              <div style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #dcfce7', textAlign: 'center' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#9333ea' }}>{importResult.createdOwners}</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>OWNERS REGISTERED</div>
              </div>
              <div style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #dcfce7', textAlign: 'center' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#d97706' }}>{importResult.createdRentals}</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>RENT-BACK CONTRACTS</div>
              </div>
            </div>

            {/* Error logs if any */}
            {importResult.errors && importResult.errors.length > 0 && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '10px 14px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#92400e', marginBottom: '4px' }}>
                  Warnings / Skipped Rows:
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.75rem', color: '#b45309' }}>
                  {importResult.errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '9px 20px',
                  background: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Close & View Inventory
              </button>
            </div>
          </div>
        )}

        {/* Data Preview Table */}
        {previewRows.length > 0 && !importResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileSpreadsheet size={18} color="#2563eb" />
                <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0f172a' }}>
                  {fileName}
                </span>
                <span style={{ fontSize: '0.75rem', background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>
                  {validRowCount} valid row{validRowCount !== 1 ? 's' : ''} detected
                </span>
                {invalidRowCount > 0 && (
                  <span style={{ fontSize: '0.75rem', background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>
                    {invalidRowCount} skipped (missing flat no)
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setFileName('');
                  setPreviewRows([]);
                  setRawRows([]);
                }}
                style={{
                  padding: '5px 10px',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  color: '#475569',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Trash2 size={13} /> Change File
              </button>
            </div>

            {/* Scrollable Table Container */}
            <div style={{
              maxHeight: '340px',
              overflowY: 'auto',
              border: '1px solid #e2e8f0',
              borderRadius: '8px'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 2 }}>
                  <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                    <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>#</th>
                    <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>Flat No</th>
                    <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>Floor</th>
                    <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>Building</th>
                    <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>Owner Name</th>
                    <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>Deal Price</th>
                    <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>Previous Payment</th>
                    <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>Agreement Date</th>
                    <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>Rental Starts</th>
                    <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>Tenure</th>
                    <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>Monthly Rent</th>
                    <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>Total Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((r, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                        opacity: r.isValid ? 1 : 0.5
                      }}
                    >
                      <td style={{ padding: '8px 12px', color: '#94a3b8', fontWeight: '600' }}>{r.rowNumber}</td>
                      <td style={{ padding: '8px 12px', fontWeight: '800', color: '#0f172a' }}>
                        {r.flatNo || <span style={{ color: '#ef4444' }}>Missing</span>}
                      </td>
                      <td style={{ padding: '8px 12px', color: '#334155' }}>Floor {r.floor}</td>
                      <td style={{ padding: '8px 12px', fontWeight: '600', color: '#2563eb' }}>{r.building}</td>
                      <td style={{ padding: '8px 12px', color: '#0f172a', fontWeight: '600' }}>
                        {r.ownerName}
                        {r.ownerMobile !== '—' && (
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{r.ownerMobile}</div>
                        )}
                      </td>
                      <td style={{ padding: '8px 12px', color: '#0f172a', fontWeight: '600' }}>
                        {formatINR(r.agreedDealPrice)}
                      </td>
                      <td style={{ padding: '8px 12px', color: '#16a34a', fontWeight: '700' }}>
                        {formatINR(r.previousPaidAmount)}
                      </td>
                      <td style={{ padding: '8px 12px', color: '#475569' }}>{r.agreementDate}</td>
                      <td style={{ padding: '8px 12px', color: '#475569' }}>{r.rentalStartDate}</td>
                      <td style={{ padding: '8px 12px', fontWeight: '700', color: '#7c3aed' }}>
                        {r.tenure} Mo
                        {r.tenure === 36 && (
                          <span style={{ fontSize: '0.65rem', background: '#f3e8ff', color: '#7c3aed', padding: '1px 4px', borderRadius: '3px', marginLeft: '4px' }}>
                            Default
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: '800', color: '#16a34a' }}>
                        {formatINR(r.monthlyRent)}/mo
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: '800', color: '#7e22ce' }}>
                        {formatINR(r.totalTenureAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Action Bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid #e2e8f0',
              paddingTop: '14px',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Total <strong>{validRowCount}</strong> unit records will be imported into MongoDB.
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  style={{
                    padding: '9px 18px',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={loading || validRowCount === 0}
                  style={{
                    padding: '9px 24px',
                    background: '#16a34a',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '700',
                    fontSize: '0.88rem',
                    color: '#ffffff',
                    cursor: loading || validRowCount === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)'
                  }}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={15} className="spin" /> Importing Records...
                    </>
                  ) : (
                    <>
                      <Check size={16} /> Confirm &amp; Import ({validRowCount} Flats)
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
};
