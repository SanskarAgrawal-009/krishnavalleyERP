import React, { useState, useRef } from 'react';
import { Modal } from '../common/Modal.jsx';
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Users,
  Zap,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Info,
  ShieldCheck,
  Check,
  Building2,
  Calendar,
  DollarSign
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { leadService } from '../../services/leadService.js';

export const BulkLeadUploadModal = ({ isOpen, onClose, onSuccess, salesTeam = [] }) => {
  const [step, setStep] = useState(1); // 1: Select File | 2: Preview & Map | 3: Results
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [mappedLeads, setMappedLeads] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Configuration settings
  const [assignmentStrategy, setAssignmentStrategy] = useState('auto'); // 'auto' | 'rep' | 'unassigned'
  const [selectedRepId, setSelectedRepId] = useState('');
  const [duplicateStrategy, setDuplicateStrategy] = useState('skip'); // 'skip' | 'update'
  const [defaultSource, setDefaultSource] = useState('bulk_upload');

  // Results
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, batch: 0, totalBatches: 0 });

  const fileInputRef = useRef(null);

  const resetState = () => {
    setStep(1);
    setFile(null);
    setFileName('');
    setParsedRows([]);
    setMappedLeads([]);
    setParsing(false);
    setUploading(false);
    setUploadResult(null);
    setUploadProgress({ current: 0, total: 0, batch: 0, totalBatches: 0 });
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Helper: Normalize phone
  const normalizePhone = (val) => {
    if (!val) return '';
    let digits = String(val).replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('0')) {
      digits = digits.slice(1);
    } else if (digits.length === 12 && digits.startsWith('91')) {
      digits = digits.slice(2);
    } else if (digits.length > 10 && digits.endsWith(digits.slice(-10))) {
      digits = digits.slice(-10);
    }
    return digits;
  };

  // Helper: Parse budget
  const parseBudget = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return Math.round(val);
    const str = String(val).toLowerCase().replace(/,/g, '').trim();
    if (str.includes('cr') || str.includes('crore')) {
      const num = parseFloat(str.replace(/[^0-9.]/g, ''));
      return isNaN(num) ? 0 : Math.round(num * 10000000);
    }
    if (str.includes('lakh') || str.includes('lac') || str.includes('l')) {
      const num = parseFloat(str.replace(/[^0-9.]/g, ''));
      return isNaN(num) ? 0 : Math.round(num * 100000);
    }
    const cleanNum = parseFloat(str.replace(/[^0-9.]/g, ''));
    return isNaN(cleanNum) ? 0 : Math.round(cleanNum);
  };

  // Helper: Fuzzy extract
  const extractFieldValue = (row, fieldKeys) => {
    if (!row || typeof row !== 'object') return '';
    for (const key of fieldKeys) {
      if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
        return String(row[key]).trim();
      }
    }
    const rowKeys = Object.keys(row);
    for (const key of fieldKeys) {
      const normalizedTarget = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      const matched = rowKeys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedTarget);
      if (matched && row[matched] !== undefined && row[matched] !== null && String(row[matched]).trim() !== '') {
        return String(row[matched]).trim();
      }
    }
    return '';
  };

  // Client-side Excel/CSV parsing
  const processFile = async (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setParsing(true);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (!rawData || rawData.length === 0) {
        alert('The uploaded spreadsheet appears to be empty.');
        setParsing(false);
        return;
      }

      setParsedRows(rawData);

      // Map rows into standardized lead objects
      const mapped = rawData.map((row, idx) => {
        const firstName = extractFieldValue(row, ['firstName', 'first_name', 'first name', 'name', 'fullName', 'prospectName', 'clientName', 'prospect']);
        const lastName = extractFieldValue(row, ['lastName', 'last_name', 'last name', 'surname']);
        const rawMobile = extractFieldValue(row, ['number', 'mobileNo', 'mobile', 'phone', 'contact', 'phoneNumber', 'contactNumber', 'cell', 'phone no', 'mobile number']);
        const email = extractFieldValue(row, ['emailAddress', 'email', 'emailId', 'mail', 'email address']);
        const city = extractFieldValue(row, ['city', 'location', 'town', 'district']);
        const state = extractFieldValue(row, ['state', 'province']);
        const rawBudget = extractFieldValue(row, ['budget', 'price', 'budgetRange', 'investment', 'budget in inr']);
        const requirement = extractFieldValue(row, [
          'whatTheyAreLookingFor',
          'what they are looking for',
          'lookingFor',
          'looking for',
          'requirement',
          'propertyType',
          'property type',
          'unitType',
          'bhk',
          'interestedIn'
        ]) || '2BHK Apartment';
        const purchaseTimeline = extractFieldValue(row, [
          'whenTheyArePlanningToDo',
          'when they are planning to do',
          'whenPlanning',
          'when planning',
          'planningToDo',
          'purchaseTimeline',
          'purchase timeline',
          'planningToBuy',
          'planning to buy',
          'timeline'
        ]) || 'Immediate';
        const remarks = extractFieldValue(row, ['remarks', 'notes', 'comments', 'description']);

        const cleanMobile = normalizePhone(rawMobile);
        const fullName = lastName ? `${firstName} ${lastName}`.trim() : firstName.trim();
        const budgetVal = parseBudget(rawBudget);

        const isValid = cleanMobile && cleanMobile.length >= 10;

        return {
          rowNumber: idx + 2,
          name: fullName || (cleanMobile ? `Lead (${cleanMobile.slice(-4)})` : 'Missing Name'),
          mobileNo: cleanMobile || rawMobile,
          email: email || '',
          city: city || '',
          state: state || '',
          budget: budgetVal,
          requirement: requirement || '2BHK Apartment',
          purchaseTimeline: purchaseTimeline || 'Immediate',
          remarks: remarks || '',
          isValid,
          validationError: !isValid ? (cleanMobile.length > 0 ? 'Mobile must have 10 digits' : 'Missing mobile number') : null
        };
      });

      setMappedLeads(mapped);
      setStep(2);
    } catch (err) {
      console.error('Error parsing Excel file:', err);
      alert('Failed to parse Excel spreadsheet. Please ensure it is a valid .xlsx, .xls, or .csv file.');
    } finally {
      setParsing(false);
    }
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // 1-Click Download Sample Excel Template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'First Name': 'Rajesh Sharma',
        'Number': '9876543210',
        'Email Address': 'rajesh.sharma@example.com',
        'City': 'Mumbai',
        'Budget': '45 Lakhs',
        'What they are looking for': '2BHK Luxury Apartment',
        'When they are planning to do': 'Immediate',
        'Remarks': 'Interested in Tower A park facing unit'
      },
      {
        'First Name': 'Priya Patel',
        'Number': '9823456781',
        'Email Address': 'priya.patel@gmail.com',
        'City': 'Pune',
        'Budget': '65 Lakhs',
        'What they are looking for': '3BHK Penthouse Suite',
        'When they are planning to do': 'Within 30 Days',
        'Remarks': 'Wants site visit this Sunday with family'
      },
      {
        'First Name': 'Amit Singhal',
        'Number': '9912345678',
        'Email Address': 'amit.singhal@yahoo.com',
        'City': 'Delhi NCR',
        'Budget': '32 Lakhs',
        'What they are looking for': '1BHK Studio Apartment',
        'When they are planning to do': '1-3 Months',
        'Remarks': 'Investment client seeking high rental yield'
      },
      {
        'First Name': 'Ananya Verma',
        'Number': '9845012345',
        'Email Address': 'ananya.verma@outlook.com',
        'City': 'Bengaluru',
        'Budget': '55 Lakhs',
        'What they are looking for': '2BHK Corner Unit',
        'When they are planning to do': 'Within 15 Days',
        'Remarks': 'Prefers east facing vastu compliant unit'
      }
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(templateData);

    worksheet['!cols'] = [
      { wch: 18 }, // First Name
      { wch: 16 }, // Number
      { wch: 28 }, // Email Address
      { wch: 14 }, // City
      { wch: 14 }, // Budget
      { wch: 28 }, // What they are looking for
      { wch: 28 }, // When they are planning to do
      { wch: 40 }, // Remarks
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Krishna_Valley_Leads_Template');
    XLSX.writeFile(workbook, 'Krishna_Valley_Leads_Bulk_Upload_Template.xlsx');
  };

  // Submit bulk upload to backend with batching for 2,000+ records
  const handleUploadSubmit = async () => {
    const validLeads = mappedLeads.filter(l => l.isValid);
    if (validLeads.length === 0) {
      alert('No valid lead records found to import. Please check that mobile numbers are provided.');
      return;
    }

    setUploading(true);
    const BATCH_SIZE = 500;
    const totalBatches = Math.ceil(validLeads.length / BATCH_SIZE);
    setUploadProgress({ current: 0, total: validLeads.length, batch: 1, totalBatches });

    try {
      let aggregatedResult = {
        totalReceived: validLeads.length,
        insertedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        errorsCount: 0,
        errors: [],
        sampleImported: []
      };

      for (let b = 0; b < totalBatches; b++) {
        const batchLeads = validLeads.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
        setUploadProgress({
          current: Math.min((b + 1) * BATCH_SIZE, validLeads.length),
          total: validLeads.length,
          batch: b + 1,
          totalBatches
        });

        const payload = {
          leads: batchLeads,
          duplicateStrategy,
          assignmentStrategy,
          assignedTo: assignmentStrategy === 'rep' ? selectedRepId : null,
          defaultSource,
          notesTag: `Bulk Import (${fileName || 'Excel'})`
        };

        const res = await leadService.bulkUploadLeads(payload);
        if (res.success && res.data) {
          aggregatedResult.insertedCount += (res.data.insertedCount || 0);
          aggregatedResult.updatedCount += (res.data.updatedCount || 0);
          aggregatedResult.skippedCount += (res.data.skippedCount || 0);
          aggregatedResult.errorsCount += (res.data.errorsCount || 0);
          if (Array.isArray(res.data.errors)) {
            aggregatedResult.errors.push(...res.data.errors);
          }
          if (Array.isArray(res.data.sampleImported) && aggregatedResult.sampleImported.length < 10) {
            aggregatedResult.sampleImported.push(...res.data.sampleImported);
          }
        } else {
          throw new Error(res.message || `Error occurred during batch ${b + 1} of lead upload.`);
        }
      }

      setUploadResult(aggregatedResult);
      setStep(3);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Upload error:', err);
      alert(err.message || 'Failed to upload leads. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const validCount = mappedLeads.filter(l => l.isValid).length;
  const invalidCount = mappedLeads.filter(l => !l.isValid).length;

  const formatINR = (val) => {
    if (!val) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Bulk Lead Upload via Excel"
      maxWidth="920px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Step Progress Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '12px'
        }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: step === 1 ? '#1a73e8' : (step > 1 ? '#16a34a' : '#e2e8f0'),
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: '800'
              }}>
                {step > 1 ? '✓' : '1'}
              </span>
              <span style={{ fontSize: '0.84rem', fontWeight: step === 1 ? '800' : '600', color: step === 1 ? '#0f172a' : '#64748b' }}>
                Upload & Template
              </span>
            </div>

            <ArrowRight size={14} color="#94a3b8" />

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: step === 2 ? '#1a73e8' : (step > 2 ? '#16a34a' : '#e2e8f0'),
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: '800'
              }}>
                {step > 2 ? '✓' : '2'}
              </span>
              <span style={{ fontSize: '0.84rem', fontWeight: step === 2 ? '800' : '600', color: step === 2 ? '#0f172a' : '#64748b' }}>
                Inspect & Assign
              </span>
            </div>

            <ArrowRight size={14} color="#94a3b8" />

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: step === 3 ? '#16a34a' : '#e2e8f0',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: '800'
              }}>
                3
              </span>
              <span style={{ fontSize: '0.84rem', fontWeight: step === 3 ? '800' : '600', color: step === 3 ? '#0f172a' : '#64748b' }}>
                Import Results
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              color: '#1a73e8',
              fontSize: '0.76rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
            title="Download sample pre-formatted spreadsheet"
          >
            <Download size={13} /> Download Template (.xlsx)
          </button>
        </div>

        {/* ========================================================================= */}
        {/* STEP 1: UPLOAD FILE & FORMAT GUIDANCE */}
        {/* ========================================================================= */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              style={{
                border: dragOver ? '2px dashed #1a73e8' : '2px dashed #cbd5e1',
                borderRadius: '12px',
                padding: '40px 24px',
                textAlign: 'center',
                backgroundColor: dragOver ? '#eff6ff' : '#f8fafc',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                {parsing ? <RefreshCw size={26} className="spin" /> : <FileSpreadsheet size={28} />}
              </div>

              <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
                {parsing ? 'Parsing Spreadsheet Data...' : 'Drop your Excel or CSV file here, or click to browse'}
              </div>

              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 auto 12px', maxWidth: '480px' }}>
                Supports Microsoft Excel (<strong>.xlsx</strong>, <strong>.xls</strong>) and standard Comma-Separated Values (<strong>.csv</strong>).
              </p>

              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: '#1a73e8',
                color: '#ffffff',
                padding: '8px 18px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: '700'
              }}>
                <Upload size={14} /> Choose File
              </span>
            </div>

            {/* Field Specifications Card */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '16px 18px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <Info size={15} color="#1a73e8" />
                <strong style={{ fontSize: '0.84rem', color: '#0f172a' }}>
                  Supported Excel Columns & Data Formats
                </strong>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '8px 10px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: '800', color: '#0f172a' }}>👤 First Name *</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>e.g. Rajesh or Rajesh Sharma</div>
                </div>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '8px 10px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: '800', color: '#0f172a' }}>📞 Number *</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>10-digit mobile number</div>
                </div>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '8px 10px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: '800', color: '#0f172a' }}>✉️ Email Address</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Valid client email</div>
                </div>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '8px 10px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: '800', color: '#0f172a' }}>📍 City</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>e.g. Mumbai, Pune, Delhi</div>
                </div>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '8px 10px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: '800', color: '#0f172a' }}>💰 Budget</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>4500000 or "45 Lakhs"</div>
                </div>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '8px 10px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: '800', color: '#0f172a' }}>🏢 What they are looking for</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>2BHK, 3BHK, Penthouse, Villa</div>
                </div>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '8px 10px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: '800', color: '#0f172a' }}>⏳ When they are planning to do</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Immediate, Within 30 Days, 1-3 M</div>
                </div>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '8px 10px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: '800', color: '#0f172a' }}>📝 Remarks</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Discussion notes / preferences</div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: LIVE DATA INSPECTION & IMPORT CONFIGURATION */}
        {/* ========================================================================= */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* Summary Statistics Ribbon */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '10px 14px'
            }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#334155' }}>
                  File: <strong style={{ color: '#0f172a' }}>{fileName}</strong>
                </span>
                <span style={{ fontSize: '0.8rem', color: '#334155' }}>
                  Total Rows: <strong style={{ color: '#0f172a' }}>{mappedLeads.length}</strong>
                </span>
                <span style={{ fontSize: '0.78rem', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '12px', fontWeight: '800' }}>
                  ✓ {validCount} Valid
                </span>
                {invalidCount > 0 && (
                  <span style={{ fontSize: '0.78rem', background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '12px', fontWeight: '800' }}>
                    ✕ {invalidCount} Invalid/Missing Mobile
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '5px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  color: '#475569',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <ArrowLeft size={12} /> Replace File
              </button>
            </div>

            {/* Import Configuration Controls */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '12px 16px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '12px',
              alignItems: 'flex-end'
            }}>
              {/* Sales Rep Assignment */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                  Sales Representative Assignment
                </label>
                <select
                  value={assignmentStrategy}
                  onChange={(e) => setAssignmentStrategy(e.target.value)}
                  style={{ width: '100%', fontSize: '0.8rem', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="auto">⚡ Automated Round-Robin (1-by-1 Sequential)</option>
                  <option value="rep">Assign to Specific Representative</option>
                  <option value="unassigned">Keep Unassigned (Queue for Sales Head)</option>
                </select>
              </div>

              {/* Specific Rep Dropdown (if rep chosen) */}
              {assignmentStrategy === 'rep' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                    Choose Representative
                  </label>
                  <select
                    value={selectedRepId}
                    onChange={(e) => setSelectedRepId(e.target.value)}
                    style={{ width: '100%', fontSize: '0.8rem', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="">-- Select Sales Executive --</option>
                    {salesTeam.map((m) => {
                      const u = m.userId || m;
                      if (!u) return null;
                      return (
                        <option key={u._id} value={u._id}>
                          {u.firstName || u.username} ({u.roleId?.name?.replace(/_/g, ' ') || 'Sales Rep'})
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Duplicate Handling */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                  Duplicate Mobile Number Handling
                </label>
                <select
                  value={duplicateStrategy}
                  onChange={(e) => setDuplicateStrategy(e.target.value)}
                  style={{ width: '100%', fontSize: '0.8rem', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="skip">🛡️ Skip Duplicate (Preserve Existing Lead)</option>
                  <option value="update">Update Existing Lead with New Information</option>
                </select>
              </div>

              {/* Lead Source */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                  Attributed Lead Source
                </label>
                <select
                  value={defaultSource}
                  onChange={(e) => setDefaultSource(e.target.value)}
                  style={{ width: '100%', fontSize: '0.8rem', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="bulk_upload">Bulk Excel Upload</option>
                  <option value="campaign">Marketing Campaign</option>
                  <option value="meta_ads">Meta / Facebook Ads Export</option>
                  <option value="referral">Client Referral</option>
                  <option value="direct">Direct Walk-In / Inquiry</option>
                </select>
              </div>
            </div>

            {/* Live Data Preview Table */}
            <div style={{
              maxHeight: '360px',
              overflowY: 'auto',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              backgroundColor: '#ffffff'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '8px 10px', width: '40px' }}>#</th>
                    <th style={{ padding: '8px 10px', width: '70px' }}>Status</th>
                    <th style={{ padding: '8px 10px' }}>First Name / Name</th>
                    <th style={{ padding: '8px 10px' }}>Number</th>
                    <th style={{ padding: '8px 10px' }}>Email Address</th>
                    <th style={{ padding: '8px 10px' }}>City</th>
                    <th style={{ padding: '8px 10px' }}>Budget</th>
                    <th style={{ padding: '8px 10px' }}>Looking For</th>
                    <th style={{ padding: '8px 10px' }}>Planning To Do</th>
                  </tr>
                </thead>
                <tbody>
                  {mappedLeads.slice(0, 100).map((row, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: !row.isValid ? '#fef2f2' : (idx % 2 === 0 ? '#ffffff' : '#fafafa')
                      }}
                    >
                      <td style={{ padding: '7px 10px', color: '#64748b' }}>{row.rowNumber}</td>
                      <td style={{ padding: '7px 10px' }}>
                        {row.isValid ? (
                          <span style={{ color: '#16a34a', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <CheckCircle2 size={12} /> Ready
                          </span>
                        ) : (
                          <span style={{ color: '#dc2626', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '3px' }} title={row.validationError}>
                            <XCircle size={12} /> Error
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '7px 10px', fontWeight: '700', color: '#0f172a' }}>{row.name}</td>
                      <td style={{ padding: '7px 10px', color: row.isValid ? '#0f172a' : '#dc2626', fontWeight: '700' }}>{row.mobileNo}</td>
                      <td style={{ padding: '7px 10px', color: '#475569' }}>{row.email || '—'}</td>
                      <td style={{ padding: '7px 10px', color: '#475569' }}>{row.city || '—'}</td>
                      <td style={{ padding: '7px 10px', fontWeight: '700', color: '#111827' }}>{row.budget ? formatINR(row.budget) : '—'}</td>
                      <td style={{ padding: '7px 10px', color: '#1a73e8', fontWeight: '600' }}>{row.requirement}</td>
                      <td style={{ padding: '7px 10px', color: '#b06000', fontWeight: '700' }}>{row.purchaseTimeline}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {mappedLeads.length > 100 && (
              <div style={{ fontSize: '0.72rem', color: '#64748b', textAlign: 'center' }}>
                Showing first 100 rows preview of {mappedLeads.length} total rows.
              </div>
            )}

            {uploading && (
              <div style={{
                marginTop: '12px',
                padding: '12px 16px',
                backgroundColor: '#eff6ff',
                borderRadius: '8px',
                border: '1px solid #bfdbfe'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: '700', color: '#1e40af', marginBottom: '6px' }}>
                  <span>Importing leads into CRM engine... (Batch {uploadProgress.batch} of {uploadProgress.totalBatches})</span>
                  <span>{uploadProgress.current} / {uploadProgress.total} ({uploadProgress.total > 0 ? Math.round((uploadProgress.current / uploadProgress.total) * 100) : 0}%)</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: '#dbeafe', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${uploadProgress.total > 0 ? Math.round((uploadProgress.current / uploadProgress.total) * 100) : 0}%`,
                    height: '100%',
                    backgroundColor: '#1a73e8',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}
              >
                ← Back
              </button>

              <button
                type="button"
                onClick={handleUploadSubmit}
                disabled={uploading || validCount === 0}
                style={{
                  padding: '8px 24px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#1a73e8',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: '800',
                  cursor: uploading || validCount === 0 ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 4px rgba(26,115,232,0.25)'
                }}
              >
                {uploading ? (
                  <>
                    <RefreshCw size={14} className="spin" /> Importing Leads...
                  </>
                ) : (
                  <>
                    <Upload size={14} /> Import {validCount} Leads to CRM
                  </>
                )}
              </button>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: RESULTS SUMMARY REPORT */}
        {/* ========================================================================= */}
        {step === 3 && uploadResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px 0' }}>
            
            {/* Congratulatory Card */}
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '10px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                <CheckCircle2 size={26} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#166534', margin: '0 0 6px 0' }}>
                Bulk Lead Import Successful!
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#15803d', margin: 0 }}>
                Spreadsheet leads have been successfully parsed, deduplicated, and attributed into the CRM lead registry.
              </p>
            </div>

            {/* Metrics Counters Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b' }}>TOTAL PROCESSED</div>
                <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#0f172a', marginTop: '2px' }}>{uploadResult.totalReceived}</div>
              </div>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#15803d' }}>NEW LEADS ADDED</div>
                <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#15803d', marginTop: '2px' }}>{uploadResult.insertedCount}</div>
              </div>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#1d4ed8' }}>LEADS UPDATED</div>
                <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#1d4ed8', marginTop: '2px' }}>{uploadResult.updatedCount}</div>
              </div>
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#b45309' }}>DUPLICATES SKIPPED</div>
                <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#b45309', marginTop: '2px' }}>{uploadResult.skippedCount}</div>
              </div>
            </div>

            {/* Sample of Imported Leads */}
            {uploadResult.sampleImported && uploadResult.sampleImported.length > 0 && (
              <div>
                <strong style={{ fontSize: '0.8rem', color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                  Newly Created Leads Sample:
                </strong>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
                    <thead style={{ background: '#f8fafc' }}>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '6px 10px' }}>Name</th>
                        <th style={{ padding: '6px 10px' }}>Mobile</th>
                        <th style={{ padding: '6px 10px' }}>City</th>
                        <th style={{ padding: '6px 10px' }}>Budget</th>
                        <th style={{ padding: '6px 10px' }}>Requirement</th>
                        <th style={{ padding: '6px 10px' }}>Timeline</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploadResult.sampleImported.map((lead) => (
                        <tr key={lead.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 10px', fontWeight: '700' }}>{lead.name}</td>
                          <td style={{ padding: '6px 10px', color: '#1a73e8' }}>{lead.mobileNo}</td>
                          <td style={{ padding: '6px 10px' }}>{lead.city || '—'}</td>
                          <td style={{ padding: '6px 10px', fontWeight: '700' }}>{lead.budget ? formatINR(lead.budget) : '—'}</td>
                          <td style={{ padding: '6px 10px' }}>{lead.requirement}</td>
                          <td style={{ padding: '6px 10px', color: '#b06000', fontWeight: '700' }}>{lead.purchaseTimeline}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Dismiss & Done Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  padding: '9px 24px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#16a34a',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: '800',
                  cursor: 'pointer'
                }}
              >
                Done & View in Pipeline
              </button>
            </div>

          </div>
        )}

      </div>
    </Modal>
  );
};
