import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Download,
  Copy,
  Trash2,
  RefreshCw,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { rentalService } from '../../services/rentalService.js';
import { useToast } from '../../context/ToastContext.jsx';

export const BulkRentalDocumentsModal = ({
  isOpen,
  onClose,
  flats = [],
  onUpdated
}) => {
  const toast = useToast();
  const fileInputRef = useRef(null);

  // Mode: 'auto' | 'registry' | 'agreement'
  const [docTypeMode, setDocTypeMode] = useState('auto');
  const [showTemplateGuide, setShowTemplateGuide] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  // Staged files: array of { file, id, fileName, fileSize, matchedFlat, docType, status }
  const [stagedFiles, setStagedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState(null);

  // Helper to extract flat from filename
  const matchFlatFromFilename = (fileName) => {
    if (!flats || flats.length === 0) return null;
    const cleanName = fileName.replace(/\.[^/.]+$/, '').trim();

    // 1. Exact match with flatNumber
    for (const f of flats) {
      const fn = String(f.flatNumber).trim();
      const regex = new RegExp(`(^|[\\-_\\s\\[\\(])${fn}([\\-_\\s\\]\\)]|$)`, 'i');
      if (regex.test(cleanName)) {
        return f;
      }
    }

    // 2. Tower / digits fallback: e.g. A-001, Flat 001, 001
    const match = cleanName.match(/(?:flat\s*|tower\s*[a-z]?[\s\-_]*)?([a-z]?[\s\-_]*)?(\d{1,4})/i);
    if (match) {
      const digits = match[2];
      const found = flats.find((f) => {
        const fDigits = String(f.flatNumber).replace(/\D/g, '');
        return String(f.flatNumber) === digits || fDigits === digits || Number(fDigits) === Number(digits);
      });
      if (found) return found;
    }

    return null;
  };

  // Helper to detect document type
  const detectDocType = (fileName, mode) => {
    if (mode === 'registry' || mode === 'agreement') return mode;
    const lower = fileName.toLowerCase();
    if (/registry|reg|sale|deed|registri|stamp/i.test(lower)) {
      return 'registry';
    }
    if (/agreement|agree|contract|rent|mou|rentback/i.test(lower)) {
      return 'agreement';
    }
    return 'registry'; // default fallback
  };

  // Process files into staged files list
  const handleFilesSelected = (filesList) => {
    if (!filesList || filesList.length === 0) return;

    const newStaged = Array.from(filesList).map((file, idx) => {
      const matched = matchFlatFromFilename(file.name);
      const type = detectDocType(file.name, docTypeMode);

      return {
        file,
        id: `${file.name}_${Date.now()}_${idx}`,
        fileName: file.name,
        fileSize: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        matchedFlatId: matched ? matched._id : '',
        matchedFlatNumber: matched ? matched.flatNumber : '',
        matchedOwnerName: matched ? (matched.ownerName || matched.currentOwner?.name || 'Owner') : '',
        docType: type,
        status: matched ? 'ready' : 'unmatched'
      };
    });

    setStagedFiles((prev) => [...prev, ...newStaged]);
    setUploadResults(null);
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  // Remove individual staged file
  const handleRemoveStaged = (id) => {
    setStagedFiles((prev) => prev.filter((item) => item.id !== id));
  };

  // Clear all staged files
  const handleClearAll = () => {
    setStagedFiles([]);
    setUploadResults(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Update manually assigned flat
  const handleFlatChange = (id, newFlatId) => {
    setStagedFiles((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const selected = flats.find((f) => f._id === newFlatId);
          return {
            ...item,
            matchedFlatId: newFlatId,
            matchedFlatNumber: selected ? selected.flatNumber : '',
            matchedOwnerName: selected ? (selected.ownerName || selected.currentOwner?.name || 'Owner') : '',
            status: newFlatId ? 'ready' : 'unmatched'
          };
        }
        return item;
      })
    );
  };

  // Update document type for item
  const handleDocTypeChange = (id, newType) => {
    setStagedFiles((prev) =>
      prev.map((item) => (item.id === id ? { ...item, docType: newType } : item))
    );
  };

  // Apply default mode change to all currently staged files
  const handleModeChange = (mode) => {
    setDocTypeMode(mode);
    if (mode !== 'auto') {
      setStagedFiles((prev) => prev.map((item) => ({ ...item, docType: mode })));
    } else {
      setStagedFiles((prev) =>
        prev.map((item) => ({ ...item, docType: detectDocType(item.fileName, 'auto') }))
      );
    }
  };

  // Download Naming Template CSV Guide
  const handleDownloadNamingGuide = () => {
    if (!flats || flats.length === 0) {
      toast.showError('No flats available to generate template guide');
      return;
    }

    const headers = [
      'Flat Number',
      'Owner Name',
      'Recommended Registry Filename',
      'Recommended Rent Agreement Filename',
      'Example Alternative'
    ];

    const rows = flats.map((f) => {
      const fn = String(f.flatNumber).trim();
      const owner = (f.ownerName || f.currentOwner?.name || 'Owner').replace(/,/g, ' ');
      const cleanOwner = owner.replace(/[^a-zA-Z0-9]/g, '');
      return [
        `"${fn}"`,
        `"${owner}"`,
        `"${fn}_Registry.pdf"`,
        `"${fn}_Agreement.pdf"`,
        `"${fn}_${cleanOwner}_Registry.pdf"`
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Krishna_Valley_Document_Naming_Guide_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.showSuccess('Naming Guide CSV downloaded! Use it to rename your scanned PDFs.');
  };

  // Copy template text
  const handleCopyTemplate = (text) => {
    navigator.clipboard.writeText(text);
    toast.showSuccess(`Copied: "${text}"`);
  };

  // Stats
  const readyCount = stagedFiles.filter((f) => f.status === 'ready' && f.matchedFlatId).length;
  const unmatchedCount = stagedFiles.length - readyCount;

  // Execute Upload
  const handleStartUpload = async () => {
    if (readyCount === 0) {
      toast.showError('No files are ready for upload. Please assign flats to unmatched files.');
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    const formData = new FormData();
    const metadataMap = {};

    stagedFiles.forEach((item) => {
      if (item.matchedFlatId) {
        formData.append('files', item.file);
        metadataMap[item.fileName] = {
          flatId: item.matchedFlatId,
          flatNumber: item.matchedFlatNumber,
          docType: item.docType
        };
      }
    });

    formData.append('metadata', JSON.stringify(metadataMap));
    formData.append('defaultDocType', docTypeMode);

    try {
      setUploadProgress(40);
      const res = await rentalService.bulkUploadDocuments(formData);
      setUploadProgress(100);

      if (res.success) {
        setUploadResults(res);
        toast.showSuccess(`Successfully uploaded and linked ${res.successCount} document(s)!`);
        if (onUpdated) onUpdated();
      } else {
        toast.showError(res.message || 'Failed to bulk upload documents');
      }
    } catch (err) {
      console.error('Bulk upload error:', err);
      toast.showError(err.message || 'Error occurred during bulk upload');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div
        style={{
          background: '#ffffff',
          width: '100%',
          maxWidth: '920px',
          maxHeight: '92vh',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          border: '1px solid #cbd5e1'
        }}
      >
        {/* ========================================================================= */}
        {/* 1. MODAL HEADER */}
        {/* ========================================================================= */}
        <div
          style={{
            padding: '18px 24px',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(4px)'
              }}
            >
              <Upload size={20} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.18rem', fontWeight: '800', letterSpacing: '-0.01em' }}>
                Bulk Document Upload Hub
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: '#cbd5e1' }}>
                Batch upload Registry Proofs &amp; Rental Agreements with auto flat matching &amp; naming template
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'background 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* 2. BODY CONTENT (SCROLLABLE) */}
        {/* ========================================================================= */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* ========================================================================= */}
          {/* A. FILE NAMING TEMPLATE & CONVENTION CARD */}
          {/* ========================================================================= */}
          <div
            style={{
              background: '#f8fafc',
              border: '1.5px solid #bfdbfe',
              borderRadius: '12px',
              overflow: 'hidden'
            }}
          >
            <div
              onClick={() => setShowTemplateGuide(!showTemplateGuide)}
              style={{
                padding: '12px 18px',
                background: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} color="#2563eb" />
                <span style={{ fontSize: '0.86rem', fontWeight: '800', color: '#1e40af' }}>
                  File Naming Template &amp; Automated Renaming Rules
                </span>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: '700',
                    background: '#2563eb',
                    color: '#ffffff',
                    padding: '1px 8px',
                    borderRadius: '10px'
                  }}
                >
                  Recommended
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  {showTemplateGuide ? 'Hide Guide' : 'Show Guide'}
                </span>
                {showTemplateGuide ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
              </div>
            </div>

            {showTemplateGuide && (
              <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#475569', lineHeight: 1.5 }}>
                  Rename your scanned PDF/image files using either format below. The system will automatically match the{' '}
                  <strong>Flat Number</strong> and assign the document to the corresponding owner!
                </p>

                {/* Templates Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                  {/* Template 1: Registry Document */}
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ShieldCheck size={16} color="#1e40af" />
                        <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#1e3a8a' }}>
                          Owner Registry (Sale Deed)
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopyTemplate('{FlatNumber}_Registry.pdf')}
                        style={{
                          background: '#f1f5f9',
                          border: 'none',
                          padding: '3px 7px',
                          borderRadius: '5px',
                          fontSize: '0.68rem',
                          color: '#475569',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                        title="Copy Template"
                      >
                        <Copy size={11} /> Copy
                      </button>
                    </div>
                    <div
                      style={{
                        background: '#f8fafc',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontFamily: 'monospace',
                        fontSize: '0.82rem',
                        fontWeight: '700',
                        color: '#1e40af',
                        border: '1px dashed #cbd5e1'
                      }}
                    >
                      {'{FlatNumber}_Registry.pdf'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      <strong>Examples:</strong> <code>001_Registry.pdf</code>, <code>1001_Registry.pdf</code>, <code>A-001_SaleDeed.pdf</code>
                    </div>
                  </div>

                  {/* Template 2: Rent Agreement */}
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileText size={16} color="#4338ca" />
                        <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#312e81' }}>
                          Rent Agreement (Contract)
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopyTemplate('{FlatNumber}_Agreement.pdf')}
                        style={{
                          background: '#f1f5f9',
                          border: 'none',
                          padding: '3px 7px',
                          borderRadius: '5px',
                          fontSize: '0.68rem',
                          color: '#475569',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                        title="Copy Template"
                      >
                        <Copy size={11} /> Copy
                      </button>
                    </div>
                    <div
                      style={{
                        background: '#f8fafc',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontFamily: 'monospace',
                        fontSize: '0.82rem',
                        fontWeight: '700',
                        color: '#4338ca',
                        border: '1px dashed #cbd5e1'
                      }}
                    >
                      {'{FlatNumber}_Agreement.pdf'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      <strong>Examples:</strong> <code>001_Agreement.pdf</code>, <code>1001_Agreement.pdf</code>, <code>A-001_Contract.pdf</code>
                    </div>
                  </div>
                </div>

                {/* Download Naming Guide CSV Button */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', paddingTop: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Info size={14} color="#64748b" />
                    <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      Tip: You can also include owner names, e.g. <code>001_VedPrakash_Registry.pdf</code>.
                    </span>
                  </div>
                  <button
                    onClick={handleDownloadNamingGuide}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '7px',
                      background: '#ffffff',
                      border: '1px solid #2563eb',
                      color: '#2563eb',
                      fontSize: '0.76rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#eff6ff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
                  >
                    <Download size={13} />
                    <span>Download Flats Naming Guide (CSV)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* B. TARGET DOCUMENT TYPE SELECTOR */}
          {/* ========================================================================= */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>
              Target Document Assignment:
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { id: 'auto', label: 'Auto-Detect from Filename' },
                { id: 'registry', label: 'All Registry Documents' },
                { id: 'agreement', label: 'All Rent Agreements' }
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleModeChange(m.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '7px',
                    fontSize: '0.75rem',
                    fontWeight: docTypeMode === m.id ? '700' : '600',
                    border: docTypeMode === m.id ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                    background: docTypeMode === m.id ? '#eff6ff' : '#ffffff',
                    color: docTypeMode === m.id ? '#1d4ed8' : '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* C. DRAG & DROP UPLOAD ZONE */}
          {/* ========================================================================= */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: isDragging ? '2px dashed #2563eb' : '2px dashed #cbd5e1',
              background: isDragging ? '#eff6ff' : '#f8fafc',
              borderRadius: '14px',
              padding: '30px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              onChange={(e) => handleFilesSelected(e.target.files)}
              style={{ display: 'none' }}
            />
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
              }}
            >
              <Upload size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: '700', color: '#1e293b' }}>
                Drag &amp; drop document files here, or <span style={{ color: '#2563eb', textDecoration: 'underline' }}>Browse</span>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '3px' }}>
                Supports multiple PDFs or images • Max 30MB per file • Up to 100 files at once
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* D. STAGED FILES MATCHING PREVIEW TABLE */}
          {/* ========================================================================= */}
          {stagedFiles.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Table Toolbar & Stats */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: '800', color: '#0f172a' }}>
                    Staged Files Queue ({stagedFiles.length})
                  </span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: '700',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      background: '#dcfce7',
                      color: '#15803d'
                    }}
                  >
                    {readyCount} Ready
                  </span>
                  {unmatchedCount > 0 && (
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        background: '#fef3c7',
                        color: '#b45309'
                      }}
                    >
                      {unmatchedCount} Unmatched (Select Flat)
                    </span>
                  )}
                </div>

                <button
                  onClick={handleClearAll}
                  disabled={uploading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Trash2 size={13} /> Clear All
                </button>
              </div>

              {/* Table */}
              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  maxHeight: '260px',
                  overflowY: 'auto'
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr>
                      <th style={{ padding: '8px 12px', textAlign: 'left', color: '#475569', fontWeight: '700' }}>File Name</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', color: '#475569', fontWeight: '700' }}>Target Flat</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', color: '#475569', fontWeight: '700' }}>Doc Type</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', color: '#475569', fontWeight: '700' }}>Status</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', color: '#475569', fontWeight: '700' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stagedFiles.map((item, idx) => (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: idx % 2 === 0 ? '#ffffff' : '#fcfcfc'
                        }}
                      >
                        {/* 1. File Name */}
                        <td style={{ padding: '8px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FileText size={15} color="#2563eb" style={{ flexShrink: 0 }} />
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontWeight: '700',
                                  color: '#1e293b',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  maxWidth: '220px'
                                }}
                                title={item.fileName}
                              >
                                {item.fileName}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{item.fileSize}</div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Target Flat Selection */}
                        <td style={{ padding: '8px 12px' }}>
                          <select
                            value={item.matchedFlatId}
                            onChange={(e) => handleFlatChange(item.id, e.target.value)}
                            style={{
                              padding: '5px 8px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              border: item.matchedFlatId ? '1px solid #94a3b8' : '1.5px solid #f59e0b',
                              background: item.matchedFlatId ? '#ffffff' : '#fffbeb',
                              color: '#1e293b',
                              fontWeight: '600',
                              maxWidth: '220px',
                              width: '100%'
                            }}
                          >
                            <option value="">-- Select Flat --</option>
                            {flats.map((f) => (
                              <option key={f._id} value={f._id}>
                                Flat {f.flatNumber} ({f.ownerName || f.currentOwner?.name || 'Owner'})
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* 3. Document Type Selection */}
                        <td style={{ padding: '8px 12px' }}>
                          <select
                            value={item.docType}
                            onChange={(e) => handleDocTypeChange(item.id, e.target.value)}
                            style={{
                              padding: '5px 8px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              border: '1px solid #94a3b8',
                              background: '#ffffff',
                              color: '#1e293b',
                              fontWeight: '600'
                            }}
                          >
                            <option value="registry">Owner Registry (Sale Deed)</option>
                            <option value="agreement">Rent Agreement (Contract)</option>
                          </select>
                        </td>

                        {/* 4. Match Status */}
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          {item.matchedFlatId ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.68rem',
                                fontWeight: '700',
                                color: '#16a34a',
                                background: '#dcfce7',
                                padding: '2px 8px',
                                borderRadius: '12px'
                              }}
                            >
                              <CheckCircle2 size={12} /> Ready
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.68rem',
                                fontWeight: '700',
                                color: '#d97706',
                                background: '#fef3c7',
                                padding: '2px 8px',
                                borderRadius: '12px'
                              }}
                            >
                              <AlertCircle size={12} /> Assign Flat
                            </span>
                          )}
                        </td>

                        {/* 5. Delete Action */}
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveStaged(item.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#94a3b8',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
                            title="Remove file"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* E. UPLOAD RESULTS SUMMARY VIEW */}
          {/* ========================================================================= */}
          {uploadResults && (
            <div
              style={{
                background: '#f0fdf4',
                border: '1.5px solid #86efac',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={18} color="#16a34a" />
                  <span style={{ fontSize: '0.86rem', fontWeight: '800', color: '#14532d' }}>
                    Upload Batch Completed ({uploadResults.successCount} Success, {uploadResults.errorCount} Errors)
                  </span>
                </div>
              </div>

              <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {uploadResults.results?.map((res, i) => (
                  <div
                    key={i}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #bbf7d0',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.75rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {res.status === 'success' ? (
                        <CheckCircle2 size={14} color="#16a34a" />
                      ) : (
                        <AlertCircle size={14} color="#dc2626" />
                      )}
                      <span style={{ fontWeight: '700', color: '#1e293b' }}>{res.fileName}</span>
                      {res.flatNumber && (
                        <span style={{ color: '#2563eb', fontWeight: '600' }}>→ Flat {res.flatNumber}</span>
                      )}
                    </div>
                    <span style={{ color: res.status === 'success' ? '#16a34a' : '#dc2626', fontWeight: '600' }}>
                      {res.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload progress indicator */}
          {uploading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '700', color: '#1e40af' }}>
                <span>Uploading documents to server...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${uploadProgress}%`,
                    background: 'linear-gradient(90deg, #2563eb, #1d4ed8)',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 3. MODAL FOOTER */}
        {/* ========================================================================= */}
        <div
          style={{
            padding: '14px 24px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontSize: '0.82rem',
              fontWeight: '600',
              cursor: uploading ? 'not-allowed' : 'pointer'
            }}
          >
            {uploadResults ? 'Close' : 'Cancel'}
          </button>

          <div style={{ display: 'flex', gap: '10px' }}>
            {uploadResults ? (
              <button
                type="button"
                onClick={() => {
                  setStagedFiles([]);
                  setUploadResults(null);
                  onClose();
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  borderRadius: '8px',
                  background: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)'
                }}
              >
                <CheckCircle2 size={16} />
                <span>Done &amp; View Updated Registers</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartUpload}
                disabled={uploading || readyCount === 0}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 20px',
                  borderRadius: '8px',
                  background: readyCount > 0 && !uploading ? '#2563eb' : '#94a3b8',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  cursor: readyCount > 0 && !uploading ? 'pointer' : 'not-allowed',
                  boxShadow: readyCount > 0 ? '0 2px 8px rgba(37, 99, 235, 0.3)' : 'none',
                  transition: 'background 0.15s ease'
                }}
              >
                {uploading ? (
                  <>
                    <RefreshCw size={15} className="spin-animate" />
                    <span>Uploading {readyCount} Documents...</span>
                  </>
                ) : (
                  <>
                    <Upload size={15} />
                    <span>Upload {readyCount} Document{readyCount !== 1 ? 's' : ''}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkRentalDocumentsModal;
