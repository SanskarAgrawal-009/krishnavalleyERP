import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  FileText,
  Upload,
  Download,
  Eye,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Building2,
  User,
  Calendar,
  Clock,
  History,
  ShieldCheck,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { rentalService } from '../../services/rentalService.js';
import { getFileUrl } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';

export const FlatDocumentsModal = ({
  isOpen,
  onClose,
  flat,
  onUpdated
}) => {
  const toast = useToast();
  const [registryDoc, setRegistryDoc] = useState(null);
  const [agreementDoc, setAgreementDoc] = useState(null);
  const [uploadingRegistry, setUploadingRegistry] = useState(false);
  const [uploadingAgreement, setUploadingAgreement] = useState(false);

  const registryInputRef = useRef(null);
  const agreementInputRef = useRef(null);

  useEffect(() => {
    if (flat) {
      setRegistryDoc(flat.registryDocument || flat.rentalDetails?.registryDocument || flat.currentOwner?.registryDocument || null);
      setAgreementDoc(flat.agreementDocument || flat.rentalDetails?.agreementDocument || null);
    } else {
      setRegistryDoc(null);
      setAgreementDoc(null);
    }
  }, [flat]);

  if (!isOpen || !flat) return null;

  const flatId = flat._id || flat.id || flat.flatId;
  const flatNumber = flat.flatNumber || 'Unit';
  const ownerName = flat.ownerName || flat.currentOwner?.name || 'Owner';
  const ownerMobile = flat.ownerMobile || flat.currentOwner?.mobileNo || '';

  // 1. Upload Registry Document
  const handleRegistryUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      toast.showError('File size must be under 25MB');
      return;
    }

    setUploadingRegistry(true);
    try {
      const res = await rentalService.uploadRegistryDocument(flatId, file);
      if (res.success) {
        setRegistryDoc(res.data);
        toast.showSuccess(`Registry document uploaded for Flat ${flatNumber}`);
        if (onUpdated) onUpdated();
      } else {
        toast.showError(res.message || 'Failed to upload registry document');
      }
    } catch (err) {
      toast.showError(err.message || 'Error uploading registry document');
    } finally {
      setUploadingRegistry(false);
      if (registryInputRef.current) registryInputRef.current.value = '';
    }
  };

  // 2. Delete Registry Document
  const handleRegistryDelete = async () => {
    if (!window.confirm(`Are you sure you want to remove the registry document for Flat ${flatNumber}?`)) return;
    setUploadingRegistry(true);
    try {
      const res = await rentalService.deleteRegistryDocument(flatId);
      if (res.success) {
        setRegistryDoc(null);
        toast.showSuccess(`Registry document removed for Flat ${flatNumber}`);
        if (onUpdated) onUpdated();
      } else {
        toast.showError(res.message || 'Failed to delete registry document');
      }
    } catch (err) {
      toast.showError(err.message || 'Error deleting registry document');
    } finally {
      setUploadingRegistry(false);
    }
  };

  // 3. Upload Agreement Document
  const handleAgreementUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      toast.showError('File size must be under 25MB');
      return;
    }

    setUploadingAgreement(true);
    try {
      const res = await rentalService.uploadAgreement(flatId, file);
      if (res.success) {
        setAgreementDoc(res.data);
        toast.showSuccess(`Rental agreement uploaded for Flat ${flatNumber}`);
        if (onUpdated) onUpdated();
      } else {
        toast.showError(res.message || 'Failed to upload rental agreement');
      }
    } catch (err) {
      toast.showError(err.message || 'Error uploading rental agreement');
    } finally {
      setUploadingAgreement(false);
      if (agreementInputRef.current) agreementInputRef.current.value = '';
    }
  };

  // 4. Delete Agreement Document
  const handleAgreementDelete = async () => {
    if (!window.confirm(`Are you sure you want to remove the rental agreement for Flat ${flatNumber}?`)) return;
    setUploadingAgreement(true);
    try {
      const res = await rentalService.deleteAgreement(flatId);
      if (res.success) {
        setAgreementDoc(null);
        toast.showSuccess(`Rental agreement removed for Flat ${flatNumber}`);
        if (onUpdated) onUpdated();
      } else {
        toast.showError(res.message || 'Failed to delete rental agreement');
      }
    } catch (err) {
      toast.showError(err.message || 'Error deleting rental agreement');
    } finally {
      setUploadingAgreement(false);
    }
  };

  const formatDate = (val) => {
    if (!val) return '—';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return String(val);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return String(val);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '16px',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '18px',
        width: '100%',
        maxWidth: '680px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        border: '1px solid #e2e8f0'
      }}>
        {/* MODAL HEADER */}
        <div style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)'
            }}>
              <FileText size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.01em' }}>
                  Flat {flatNumber} Documents
                </h2>
                <span style={{
                  background: 'rgba(59, 130, 246, 0.2)',
                  color: '#93c5fd',
                  border: '1px solid rgba(147, 197, 253, 0.3)',
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '12px'
                }}>
                  Unit Documents Vault
                </span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                Current Owner: <strong style={{ color: '#f8fafc' }}>{ownerName}</strong> {ownerMobile ? `• ${ownerMobile}` : ''}
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
              color: '#cbd5e1',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* MODAL BODY */}
        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Quick info banner */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={16} color="#64748b" />
              <span style={{ fontSize: '0.82rem', color: '#334155', fontWeight: '600' }}>
                Floor {flat.floor === 0 ? 'G' : flat.floor || '—'} {flat.bhkType ? `• ${flat.bhkType}` : ''} {flat.carpetArea ? `• ${flat.carpetArea} sq.ft` : ''}
              </span>
            </div>
            {flat.registryDate && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#64748b' }}>
                <Calendar size={14} color="#64748b" />
                <span>Registry Date: <strong style={{ color: '#0f172a' }}>{formatDate(flat.registryDate)}</strong></span>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* DOCUMENT 1: OWNER REGISTRY DOCUMENT */}
          {/* ========================================================================= */}
          <div style={{
            border: registryDoc ? '1.5px solid #86efac' : '1.5px dashed #cbd5e1',
            borderRadius: '14px',
            padding: '18px 20px',
            background: registryDoc ? '#f0fdf4' : '#fafafa',
            transition: 'all 0.2s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: registryDoc ? '#16a34a' : '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  flexShrink: 0
                }}>
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: '800', color: '#0f172a' }}>
                      Owner Registry Document
                    </h3>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: '800',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      background: registryDoc ? '#dcfce7' : '#f1f5f9',
                      color: registryDoc ? '#15803d' : '#64748b',
                      border: registryDoc ? '1px solid #bbf7d0' : '1px solid #e2e8f0'
                    }}>
                      {registryDoc ? '✓ Verified on File' : 'Missing / Required'}
                    </span>
                  </div>
                  <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                    Official Sale Deed, Registry Slip, or Registration Document for Flat {flatNumber}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="file"
                  ref={registryInputRef}
                  style={{ display: 'none' }}
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  onChange={handleRegistryUpload}
                />
                
                {registryDoc && (
                  <>
                    <a
                      href={getFileUrl(registryDoc.fileUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '7px 12px',
                        borderRadius: '8px',
                        background: '#ffffff',
                        border: '1px solid #bbf7d0',
                        color: '#15803d',
                        fontSize: '0.78rem',
                        fontWeight: '700',
                        textDecoration: 'none',
                        cursor: 'pointer',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                      }}
                    >
                      <Eye size={14} /> View File
                    </a>

                    <button
                      type="button"
                      disabled={uploadingRegistry}
                      onClick={handleRegistryDelete}
                      style={{
                        padding: '7px 10px',
                        borderRadius: '8px',
                        background: '#ffffff',
                        border: '1px solid #fecaca',
                        color: '#dc2626',
                        cursor: 'pointer'
                      }}
                      title="Delete Registry Document"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}

                <button
                  type="button"
                  disabled={uploadingRegistry}
                  onClick={() => registryInputRef.current?.click()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    borderRadius: '8px',
                    background: registryDoc ? '#ffffff' : '#16a34a',
                    border: registryDoc ? '1px solid #cbd5e1' : 'none',
                    color: registryDoc ? '#334155' : '#ffffff',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: registryDoc ? 'none' : '0 2px 6px rgba(22, 163, 74, 0.3)'
                  }}
                >
                  {uploadingRegistry ? (
                    <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Upload size={14} />
                  )}
                  <span>{registryDoc ? 'Replace Document' : 'Upload Registry Doc'}</span>
                </button>
              </div>
            </div>

            {/* Document Details Info if present */}
            {registryDoc && (
              <div style={{
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid #dcfce7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                fontSize: '0.75rem',
                color: '#166534'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={14} />
                  <strong>{registryDoc.fileName || `Registry_Flat_${flatNumber}.pdf`}</strong>
                </div>
                {registryDoc.uploadedAt && (
                  <span style={{ color: '#4b5563' }}>
                    Uploaded on {formatDate(registryDoc.uploadedAt)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* DOCUMENT 2: GUARANTEED RENTAL AGREEMENT */}
          {/* ========================================================================= */}
          <div style={{
            border: agreementDoc ? '1.5px solid #bfdbfe' : '1.5px dashed #cbd5e1',
            borderRadius: '14px',
            padding: '18px 20px',
            background: agreementDoc ? '#eff6ff' : '#fafafa',
            transition: 'all 0.2s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: agreementDoc ? '#2563eb' : '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  flexShrink: 0
                }}>
                  <FileText size={22} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: '800', color: '#0f172a' }}>
                      Rental Agreement Contract
                    </h3>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: '800',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      background: agreementDoc ? '#dbeafe' : '#f1f5f9',
                      color: agreementDoc ? '#1d4ed8' : '#64748b',
                      border: agreementDoc ? '1px solid #bfdbfe' : '1px solid #e2e8f0'
                    }}>
                      {agreementDoc ? '✓ Uploaded' : 'Not Uploaded'}
                    </span>
                  </div>
                  <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                    Signed Guaranteed Rent-Back Contract &amp; Terms for Flat {flatNumber}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="file"
                  ref={agreementInputRef}
                  style={{ display: 'none' }}
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  onChange={handleAgreementUpload}
                />
                
                {agreementDoc && (
                  <>
                    <a
                      href={getFileUrl(agreementDoc.fileUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '7px 12px',
                        borderRadius: '8px',
                        background: '#ffffff',
                        border: '1px solid #bfdbfe',
                        color: '#1d4ed8',
                        fontSize: '0.78rem',
                        fontWeight: '700',
                        textDecoration: 'none',
                        cursor: 'pointer',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                      }}
                    >
                      <Eye size={14} /> View File
                    </a>

                    <button
                      type="button"
                      disabled={uploadingAgreement}
                      onClick={handleAgreementDelete}
                      style={{
                        padding: '7px 10px',
                        borderRadius: '8px',
                        background: '#ffffff',
                        border: '1px solid #fecaca',
                        color: '#dc2626',
                        cursor: 'pointer'
                      }}
                      title="Delete Agreement Document"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}

                <button
                  type="button"
                  disabled={uploadingAgreement}
                  onClick={() => agreementInputRef.current?.click()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    borderRadius: '8px',
                    background: agreementDoc ? '#ffffff' : '#2563eb',
                    border: agreementDoc ? '1px solid #cbd5e1' : 'none',
                    color: agreementDoc ? '#334155' : '#ffffff',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: agreementDoc ? 'none' : '0 2px 6px rgba(37, 99, 235, 0.3)'
                  }}
                >
                  {uploadingAgreement ? (
                    <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Upload size={14} />
                  )}
                  <span>{agreementDoc ? 'Replace Contract' : 'Upload Agreement'}</span>
                </button>
              </div>
            </div>

            {/* Document Details Info if present */}
            {agreementDoc && (
              <div style={{
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid #dbeafe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                fontSize: '0.75rem',
                color: '#1e40af'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={14} />
                  <strong>{agreementDoc.fileName || `Agreement_Flat_${flatNumber}.pdf`}</strong>
                </div>
                {agreementDoc.uploadedAt && (
                  <span style={{ color: '#4b5563' }}>
                    Uploaded on {formatDate(agreementDoc.uploadedAt)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* SECTION 3: PREVIOUS OWNERSHIP DOCUMENTS TRAIL (IF ANY) */}
          {/* ========================================================================= */}
          {Array.isArray(flat.ownershipHistory) && flat.ownershipHistory.length > 0 && (
            <div style={{
              background: '#faf5ff',
              border: '1px solid #e9d5ff',
              borderRadius: '14px',
              padding: '16px 18px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <History size={16} color="#7c3aed" />
                <h4 style={{ margin: 0, fontSize: '0.86rem', fontWeight: '800', color: '#581c87' }}>
                  Historical Ownership Documents Trail ({flat.ownershipHistory.length} previous owner{flat.ownershipHistory.length > 1 ? 's' : ''})
                </h4>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {flat.ownershipHistory.map((hist, idx) => (
                  <div
                    key={hist._id || idx}
                    style={{
                      padding: '10px 14px',
                      background: '#ffffff',
                      borderRadius: '8px',
                      border: '1px solid #f3e8ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.78rem'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '700', color: '#0f172a' }}>
                        {hist.name || hist.previousOwnerName || 'Previous Owner'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                        Registry: {formatDate(hist.registryDate)} • Transferred: {formatDate(hist.transferDate)}
                      </div>
                    </div>

                    {hist.registryDocument?.fileUrl ? (
                      <a
                        href={getFileUrl(hist.registryDocument.fileUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: '#7c3aed',
                          fontWeight: '700',
                          textDecoration: 'none'
                        }}
                      >
                        <Eye size={13} /> View Registry
                      </a>
                    ) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.72rem' }}>
                        No archival doc
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div style={{
          padding: '14px 24px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
            All documents are indexed and accessible by Flat No <strong>{flatNumber}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
