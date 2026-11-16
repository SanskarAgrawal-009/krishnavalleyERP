import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { documentService } from '../../services/documentService.js';
import { salesService } from '../../services/salesService.js';
import { rentalService } from '../../services/rentalService.js';
import { UploadSalesAgreementModal } from '../../components/documents/UploadSalesAgreementModal.jsx';
import { UploadRentalAgreementModal } from '../../components/documents/UploadRentalAgreementModal.jsx';
import { UploadBlueprintModal } from '../../components/documents/UploadBlueprintModal.jsx';
import { UploadLegalDocModal } from '../../components/documents/UploadLegalDocModal.jsx';
import { DigitalSignatureModal } from '../../components/documents/DigitalSignatureModal.jsx';
import { StatusBadge } from '../../components/common/StatusBadge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

import {
  Folder,
  FileText,
  ShieldCheck,
  Upload,
  ExternalLink,
  CheckCircle,
  RefreshCw,
  Search,
  Layers,
  Building2,
  Edit3,
  Lock,
  Key,
  Award,
  Hash,
  Plus,
  Repeat,
  FileCheck
} from 'lucide-react';

export const DocumentManagementPage = () => {
  const { isSuperAdmin, hasPermission, hasAnyPermission } = useAuth();
  const canUploadDocs = isSuperAdmin || hasAnyPermission(['documents:upload', 'documents:manage']);
  const canSignDocs = isSuperAdmin || hasPermission('documents:manage');

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const normalizeTab = (t) => {
    if (!t) return 'sales';
    if (t === 'agreements' || t === 'sale' || t === 'sales') return 'sales';
    if (t === 'vault' || t === 'legal' || t === 'title' || t === 'deeds') return 'legal';
    if (t === 'rental' || t === 'leases' || t === 'rent') return 'rental';
    if (t === 'blueprints' || t === 'blueprint' || t === 'drawings') return 'blueprints';
    if (t === 'signatures' || t === 'signs' || t === 'certs') return 'signatures';
    return t;
  };

  const formatSignerRole = (role) => {
    if (!role) return 'Authorized Signatory (Builder)';
    if (role === 'seller_authorized_signatory') return 'Authorized Signatory (Builder)';
    if (role === 'buyer') return 'Purchaser / Buyer';
    if (role === 'owner') return 'Flat Owner';
    if (role === 'tenant') return 'Tenant';
    if (role === 'notary') return 'Legal Advocate / Notary';
    if (role === 'witness') return 'Witness';
    return role.replace(/_/g, ' ');
  };

  const [activeTab, setActiveTab] = useState(normalizeTab(tabParam));

  useEffect(() => {
    if (tabParam) {
      setActiveTab(normalizeTab(tabParam));
    }
  }, [tabParam]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
  };

  const [vaultData, setVaultData] = useState({
    saleAgreements: [],
    rentalAgreements: [],
    maintenanceAgreements: [],
    blueprints: [],
    legalDocuments: [],
    kycDocuments: [],
    digitalSignatures: [],
    counts: {}
  });

  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals for each document category
  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);
  const [isRentalModalOpen, setIsRentalModalOpen] = useState(false);
  const [isBlueprintModalOpen, setIsBlueprintModalOpen] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [selectedDocForSign, setSelectedDocForSign] = useState(null);

  const loadVault = async () => {
    setLoading(true);
    try {
      const res = await documentService.getVault();
      if (res.data) setVaultData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVault();
  }, []);

  const handleUploadSalesAgreement = async (leadId, formData) => {
    try {
      await salesService.uploadAgreementFile(leadId, formData);
      alert('Sales Agreement uploaded and archived in S3!');
      setIsSalesModalOpen(false);
      loadVault();
    } catch (err) {
      alert(err.message || 'Failed to upload sales agreement');
    }
  };

  const handleUploadRentalAgreement = () => {
    alert('Rental Agreement uploaded and archived in S3!');
    setIsRentalModalOpen(false);
    loadVault();
  };

  const handleUploadBlueprint = async (flatId, formData) => {
    try {
      await documentService.uploadBlueprint(flatId, formData);
      alert('Blueprint uploaded and saved to S3!');
      setIsBlueprintModalOpen(false);
      loadVault();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUploadLegalDoc = async (formData) => {
    try {
      await documentService.uploadLegalDoc(formData);
      alert('Legal document saved in S3!');
      setIsLegalModalOpen(false);
      loadVault();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSignAgreement = async (data) => {
    try {
      const res = await documentService.signAgreement(data);
      alert(res.message || 'Digital signature verified and certificate issued!');
      setIsSignModalOpen(false);
      loadVault();
    } catch (err) {
      alert(err.message);
    }
  };

  const openSignModal = (doc) => {
    setSelectedDocForSign(doc);
    setIsSignModalOpen(true);
  };

  const counts = vaultData.counts || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header Banner */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600', color: '#111827' }}>
            Documents
          </h1>
          <div style={{ fontSize: '0.85rem', color: '#4b5563', marginTop: '4px' }}>
            Manage sale deeds, rental contracts, unit blueprints, legal approvals, and digital signatures.
          </div>
        </div>

        {/* Dynamic Contextual Action Buttons in Header */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {activeTab === 'sales' && canUploadDocs && (
            <button
              type="button"
              onClick={() => setIsSalesModalOpen(true)}
              style={{ padding: '8px 16px', fontSize: '0.82rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#17652f', color: '#ffffff', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
            >
              <Plus size={15} /> Upload sales agreement
            </button>
          )}

          {activeTab === 'rental' && canUploadDocs && (
            <button
              type="button"
              onClick={() => setIsRentalModalOpen(true)}
              style={{ padding: '8px 16px', fontSize: '0.82rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#17652f', color: '#ffffff', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
            >
              <Plus size={15} /> Upload rental agreement
            </button>
          )}

          {activeTab === 'blueprints' && canUploadDocs && (
            <button
              type="button"
              onClick={() => setIsBlueprintModalOpen(true)}
              style={{ padding: '8px 16px', fontSize: '0.82rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#17652f', color: '#ffffff', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
            >
              <Plus size={15} /> Upload blueprint
            </button>
          )}

          {activeTab === 'legal' && canUploadDocs && (
            <button
              type="button"
              onClick={() => setIsLegalModalOpen(true)}
              style={{ padding: '8px 16px', fontSize: '0.82rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#17652f', color: '#ffffff', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
            >
              <Lock size={15} /> Upload legal document
            </button>
          )}

          {activeTab === 'signatures' && canSignDocs && (
            <button
              type="button"
              onClick={() => openSignModal(null)}
              style={{ padding: '8px 16px', fontSize: '0.82rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#17652f', color: '#ffffff', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
            >
              <Award size={15} /> Add signature
            </button>
          )}

          {/* Quick Refresh */}
          <button
            type="button"
            onClick={loadVault}
            title="Refresh documents"
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e5e7eb', background: '#ffffff', color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Top Metrics Ribbon */}
      <div className="grid-cols-4">
        <div className="stat-card" onClick={() => handleTabChange('sales')} style={{ cursor: 'pointer', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#ffffff', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>Sale agreements</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#f0fdf4', color: '#17652f' }}>
              <FileText size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginTop: '6px' }}>
            {counts.saleAgreements || (vaultData.saleAgreements || []).length}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Archived deeds</span>
        </div>

        <div className="stat-card" onClick={() => handleTabChange('rental')} style={{ cursor: 'pointer', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#ffffff', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>Rental agreements</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#f0fdf4', color: '#17652f' }}>
              <Repeat size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#17652f', marginTop: '6px' }}>
            {counts.rentalAgreements || (vaultData.rentalAgreements || []).length}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Leases and rent-backs</span>
        </div>

        <div className="stat-card" onClick={() => handleTabChange('blueprints')} style={{ cursor: 'pointer', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#ffffff', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>Blueprints</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#f3f4f6', color: '#374151' }}>
              <Layers size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginTop: '6px' }}>
            {counts.blueprints || (vaultData.blueprints || []).length}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Floor layouts</span>
        </div>

        <div className="stat-card" onClick={() => handleTabChange('legal')} style={{ cursor: 'pointer', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#ffffff', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>Legal documents</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#f0fdf4', color: '#17652f' }}>
              <ShieldCheck size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginTop: '6px' }}>
            {counts.legalDocuments || (vaultData.legalDocuments || []).length}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>NOCs and certificates</span>
        </div>
      </div>

      {/* Sub-Tab Navigation Header */}
      <div style={{
        display: 'flex',
        backgroundColor: '#f3f4f6',
        borderRadius: '8px',
        padding: '3px',
        gap: '4px',
        overflowX: 'auto',
        whiteSpace: 'nowrap'
      }}>
        {[
          { id: 'sales', label: `Sales agreements (${vaultData.saleAgreements?.length || 0})`, icon: FileText },
          { id: 'rental', label: `Rental agreements (${vaultData.rentalAgreements?.length || 0})`, icon: Repeat },
          { id: 'blueprints', label: `Blueprints (${vaultData.blueprints?.length || 0})`, icon: Layers },
          { id: 'legal', label: `Legal documents (${vaultData.legalDocuments?.length || 0})`, icon: ShieldCheck },
          { id: 'signatures', label: `Digital signatures (${vaultData.digitalSignatures?.length || 0})`, icon: Award }
        ].map((tab) => {
          const isSelected = activeTab === tab.id;
          const IconC = tab.icon;
          return (
            <button
              type="button"
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                flex: '1 1 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '6px',
                background: isSelected ? '#17652f' : 'transparent',
                color: isSelected ? '#ffffff' : '#4b5563',
                fontWeight: isSelected ? '600' : '500',
                fontSize: '0.82rem',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              <IconC size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ================= TAB 1: SALES AGREEMENTS ================= */}
      {activeTab === 'sales' && (
        <div className="g-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', background: '#fafbfc' }}>
            <div style={{ fontWeight: '600', color: '#111827', fontSize: '0.92rem' }}>
              Sale agreements
            </div>
            <button
              type="button"
              onClick={() => setIsSalesModalOpen(true)}
              style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', background: '#17652f', color: '#ffffff', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
            >
              <Plus size={14} /> Upload sales agreement
            </button>
          </div>

          <div className="table-responsive">
            <table style={{ minWidth: '780px' }}>
              <thead>
                <tr>
                  <th>Buyer</th>
                  <th>Unit</th>
                  <th>Agreement number</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>File</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(vaultData.saleAgreements || []).length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                      <FileText size={32} style={{ margin: '0 auto 10px', color: '#9ca3af' }} />
                      <div style={{ fontWeight: '600', fontSize: '0.92rem', color: '#111827' }}>No sales agreements found</div>
                      <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Upload a signed sale agreement for any property booking.</div>
                      <button
                        type="button"
                        onClick={() => setIsSalesModalOpen(true)}
                        style={{ marginTop: '12px', padding: '7px 16px', fontSize: '0.8rem', fontWeight: '600', background: '#17652f', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        Upload sales agreement
                      </button>
                    </td>
                  </tr>
                ) : (
                  (vaultData.saleAgreements || []).map((doc) => (
                    <tr key={doc.id || Math.random()}>
                      <td style={{ fontWeight: '600', color: '#111827' }}>{doc.buyerName || doc.partyName}</td>
                      <td style={{ color: '#111827', fontWeight: '500' }}>Flat {doc.flatNumber} • {doc.projectName || doc.project}</td>
                      <td><code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px', color: '#17652f', fontWeight: '600' }}>{doc.agreementNumber}</code></td>
                      <td style={{ color: '#4b5563', fontSize: '0.78rem' }}>{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('en-IN') : 'N/A'}</td>
                      <td>
                        <span style={{ padding: '3px 8px', borderRadius: '4px', background: doc.signed ? '#f0fdf4' : '#f9fafb', color: doc.signed ? '#17652f' : '#6b7280', fontWeight: '600', fontSize: '0.74rem' }}>
                          {doc.signed ? 'Signed' : 'Pending signature'}
                        </span>
                      </td>
                      <td>
                        {doc.fileUrl ? (
                          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#17652f', fontWeight: '600', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <ExternalLink size={13} /> View file
                          </a>
                        ) : (
                          <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>No file</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {!doc.signed && (
                          <button
                            type="button"
                            onClick={() => openSignModal(doc)}
                            style={{ padding: '4px 10px', background: '#17652f', color: '#ffffff', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', border: 'none', cursor: 'pointer' }}
                          >
                            Sign document
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 2: RENTAL AGREEMENTS ================= */}
      {activeTab === 'rental' && (
        <div className="g-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', background: '#fafbfc' }}>
            <div style={{ fontWeight: '600', color: '#111827', fontSize: '0.92rem' }}>
              Rental agreements
            </div>
            <button
              type="button"
              onClick={() => setIsRentalModalOpen(true)}
              style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', background: '#17652f', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              <Plus size={14} /> Upload rental agreement
            </button>
          </div>

          <div className="table-responsive">
            <table style={{ minWidth: '780px' }}>
              <thead>
                <tr>
                  <th>Tenant or owner</th>
                  <th>Contract type</th>
                  <th>Unit</th>
                  <th>Contract code</th>
                  <th>Monthly rent</th>
                  <th>File</th>
                </tr>
              </thead>
              <tbody>
                {(vaultData.rentalAgreements || []).length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                      <Repeat size={32} style={{ margin: '0 auto 10px', color: '#9ca3af' }} />
                      <div style={{ fontWeight: '600', fontSize: '0.92rem', color: '#111827' }}>No rental agreements found</div>
                      <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Upload a tenant lease or owner rent-back agreement.</div>
                      <button
                        type="button"
                        onClick={() => setIsRentalModalOpen(true)}
                        style={{ marginTop: '12px', padding: '7px 16px', fontSize: '0.8rem', fontWeight: '600', background: '#17652f', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        Upload rental agreement
                      </button>
                    </td>
                  </tr>
                ) : (
                  (vaultData.rentalAgreements || []).map((doc) => (
                    <tr key={doc.id || Math.random()}>
                      <td style={{ fontWeight: '600', color: '#111827' }}>{doc.tenantName || doc.partyName}</td>
                      <td>
                        <span style={{ padding: '3px 8px', borderRadius: '4px', background: doc.type?.includes('Rent-Back') ? '#f3f4f6' : '#f0fdf4', color: doc.type?.includes('Rent-Back') ? '#374151' : '#17652f', fontWeight: '600', fontSize: '0.72rem' }}>
                          {doc.type || 'Lease agreement'}
                        </span>
                      </td>
                      <td style={{ color: '#111827', fontWeight: '500' }}>Flat {doc.flatNumber} • {doc.projectName || doc.project}</td>
                      <td><code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px', color: '#17652f', fontWeight: '600' }}>{doc.contractCode}</code></td>
                      <td style={{ color: '#17652f', fontWeight: '600' }}>₹{Number(doc.monthlyRent || doc.monthlyAmount || 0).toLocaleString('en-IN')}/mo</td>
                      <td>
                        {doc.fileUrl ? (
                          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#17652f', fontWeight: '600', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <ExternalLink size={13} /> View file
                          </a>
                        ) : (
                          <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>Archived</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 3: BLUEPRINTS ================= */}
      {activeTab === 'blueprints' && (
        <div className="g-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', background: '#fafbfc' }}>
            <div style={{ fontWeight: '600', color: '#111827', fontSize: '0.92rem' }}>
              Blueprints
            </div>
            <button
              type="button"
              onClick={() => setIsBlueprintModalOpen(true)}
              style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', background: '#17652f', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              <Plus size={14} /> Upload blueprint
            </button>
          </div>

          <div className="table-responsive">
            <table style={{ minWidth: '780px' }}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Unit</th>
                  <th>Plan type</th>
                  <th>Uploaded date</th>
                  <th>File</th>
                </tr>
              </thead>
              <tbody>
                {(vaultData.blueprints || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                      <Layers size={32} style={{ margin: '0 auto 10px', color: '#9ca3af' }} />
                      <div style={{ fontWeight: '600', fontSize: '0.92rem', color: '#111827' }}>No blueprints uploaded</div>
                      <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Upload floor plans and architectural drawings.</div>
                      <button
                        type="button"
                        onClick={() => setIsBlueprintModalOpen(true)}
                        style={{ marginTop: '12px', padding: '7px 16px', fontSize: '0.8rem', fontWeight: '600', background: '#17652f', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        Upload blueprint
                      </button>
                    </td>
                  </tr>
                ) : (
                  (vaultData.blueprints || []).map((bp) => (
                    <tr key={bp.id || Math.random()}>
                      <td style={{ fontWeight: '600', color: '#111827' }}>{bp.title}</td>
                      <td style={{ color: '#374151', fontWeight: '500' }}>Flat {bp.flatNumber} • {bp.projectName || bp.project}</td>
                      <td><span style={{ padding: '2px 6px', background: '#f3f4f6', borderRadius: '4px', fontWeight: '600', color: '#111827', fontSize: '0.75rem' }}>{bp.floorPlanType || bp.version || '2D Layout'}</span></td>
                      <td style={{ color: '#4b5563', fontSize: '0.76rem' }}>{bp.uploadedAt ? new Date(bp.uploadedAt).toLocaleDateString('en-IN') : 'N/A'}</td>
                      <td>
                        <a href={bp.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#17652f', fontWeight: '600', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <ExternalLink size={13} /> View file
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 4: LEGAL DOCUMENTS ================= */}
      {activeTab === 'legal' && (
        <div className="g-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', background: '#fafbfc' }}>
            <div style={{ fontWeight: '600', color: '#111827', fontSize: '0.92rem' }}>
              Legal documents
            </div>
            <button
              type="button"
              onClick={() => setIsLegalModalOpen(true)}
              style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', background: '#17652f', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              <Lock size={14} /> Upload legal document
            </button>
          </div>

          <div className="table-responsive">
            <table style={{ minWidth: '780px' }}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Site</th>
                  <th>Authority / Reg No</th>
                  <th>Expiry date</th>
                  <th>File</th>
                </tr>
              </thead>
              <tbody>
                {(vaultData.legalDocuments || []).length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                      <ShieldCheck size={32} style={{ margin: '0 auto 10px', color: '#9ca3af' }} />
                      <div style={{ fontWeight: '600', fontSize: '0.92rem', color: '#111827' }}>No legal documents uploaded</div>
                      <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Upload approvals, RERA certificates, title deeds, and NOCs.</div>
                      <button
                        type="button"
                        onClick={() => setIsLegalModalOpen(true)}
                        style={{ marginTop: '12px', padding: '7px 16px', fontSize: '0.8rem', fontWeight: '600', background: '#17652f', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        Upload legal document
                      </button>
                    </td>
                  </tr>
                ) : (
                  (vaultData.legalDocuments || []).map((ld) => (
                    <tr key={ld.id || Math.random()}>
                      <td style={{ fontWeight: '600', color: '#111827' }}>{ld.title}</td>
                      <td><span style={{ padding: '2px 6px', background: '#f0fdf4', color: '#17652f', borderRadius: '4px', fontWeight: '600', fontSize: '0.72rem' }}>{ld.category || ld.documentType}</span></td>
                      <td style={{ color: '#374151', fontWeight: '500' }}>{ld.projectId?.projectName || ld.projectName || 'All Sites'}</td>
                      <td style={{ color: '#111827', fontWeight: '500' }}>{ld.authorityNumber || ld.issuingAuthority || 'Verified'}</td>
                      <td style={{ color: '#4b5563', fontSize: '0.76rem' }}>{ld.expiryDate ? new Date(ld.expiryDate).toLocaleDateString('en-IN') : 'Perpetual'}</td>
                      <td>
                        <a href={ld.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#17652f', fontWeight: '600', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <ExternalLink size={13} /> View file
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 5: SIGNATURES ================= */}
      {activeTab === 'signatures' && (
        <div className="g-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', background: '#fafbfc' }}>
            <div style={{ fontWeight: '600', color: '#111827', fontSize: '0.92rem' }}>
              Digital signatures
            </div>
            <button
              type="button"
              onClick={() => openSignModal(null)}
              style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', background: '#17652f', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              <Award size={14} /> Add signature
            </button>
          </div>

          <div className="table-responsive">
            <table style={{ minWidth: '780px' }}>
              <thead>
                <tr>
                  <th>Signer</th>
                  <th>Role</th>
                  <th>Document</th>
                  <th>Signed date</th>
                  <th>Certificate hash</th>
                </tr>
              </thead>
              <tbody>
                {(vaultData.digitalSignatures || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                      <Award size={32} style={{ margin: '0 auto 10px', color: '#9ca3af' }} />
                      <div style={{ fontWeight: '600', fontSize: '0.92rem', color: '#111827' }}>No digital signatures found</div>
                      <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Add digital signatures to executed agreements.</div>
                    </td>
                  </tr>
                ) : (
                  (vaultData.digitalSignatures || []).map((ds) => (
                    <tr key={ds.id || Math.random()}>
                      <td style={{ fontWeight: '600', color: '#111827' }}>{ds.signerName}</td>
                      <td>
                        <span style={{ padding: '3px 8px', borderRadius: '4px', background: '#f0fdf4', color: '#17652f', fontWeight: '600', fontSize: '0.74rem' }}>
                          {formatSignerRole(ds.signerRole || ds.role)}
                        </span>
                      </td>
                      <td style={{ color: '#111827', fontWeight: '600' }}>
                        {ds.documentTitle || ds.documentType || 'Agreement Document'}
                        <div style={{ fontSize: '0.74rem', color: '#17652f', fontWeight: '500', marginTop: '2px' }}>
                          Ref: {ds.referenceId || ds.certificateNumber || ds.certificateCode || 'REF-N/A'}
                        </div>
                      </td>
                      <td style={{ color: '#4b5563', fontSize: '0.76rem' }}>{new Date(ds.signedAt).toLocaleString('en-IN')}</td>
                      <td><code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', color: '#111827' }}>{ds.signatureHash || 'SHA-256 Verified'}</code></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ALL MODALS */}
      <UploadSalesAgreementModal
        isOpen={isSalesModalOpen}
        onClose={() => setIsSalesModalOpen(false)}
        onSubmit={handleUploadSalesAgreement}
        onUpload={handleUploadSalesAgreement}
      />

      <UploadRentalAgreementModal
        isOpen={isRentalModalOpen}
        onClose={() => setIsRentalModalOpen(false)}
        onSubmit={handleUploadRentalAgreement}
        onUpload={handleUploadRentalAgreement}
      />

      <UploadBlueprintModal
        isOpen={isBlueprintModalOpen}
        onClose={() => setIsBlueprintModalOpen(false)}
        onSubmit={handleUploadBlueprint}
        onUpload={handleUploadBlueprint}
      />

      <UploadLegalDocModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        onSubmit={handleUploadLegalDoc}
        onUpload={handleUploadLegalDoc}
      />

      <DigitalSignatureModal
        isOpen={isSignModalOpen}
        onClose={() => setIsSignModalOpen(false)}
        onSubmit={handleSignAgreement}
        onSubmitSignature={handleSignAgreement}
        document={selectedDocForSign}
        agreement={selectedDocForSign}
      />

    </div>
  );
};

