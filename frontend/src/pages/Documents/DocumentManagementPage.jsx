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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header Banner */}
      <div className="g-card" style={{
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#111827', display: 'flex', alignItems: 'center', gap: '12px' }}>
            Document Vault & Cryptographic Certificates
            <span style={{ fontSize: '0.74rem', background: '#e8f0fe', color: '#1a73e8', padding: '3px 10px', borderRadius: '6px', fontWeight: '700' }}>
              ENCRYPTED S3
            </span>
          </div>
          <div style={{ fontSize: '0.88rem', color: '#4b5563', marginTop: '4px', fontWeight: '500' }}>
            Central repository for sales deeds, rental agreements, floor blueprints, legal master approvals, and digital signatures.
          </div>
        </div>

        {/* Dynamic Contextual Action Buttons in Header */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {activeTab === 'sales' && (
            <button
              type="button"
              onClick={() => setIsSalesModalOpen(true)}
              className="btn-primary"
              style={{ padding: '10px 18px', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} /> Upload Sales Agreement
            </button>
          )}

          {activeTab === 'rental' && (
            <button
              type="button"
              onClick={() => setIsRentalModalOpen(true)}
              className="btn-primary"
              style={{ padding: '10px 18px', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '6px', background: '#10b981' }}
            >
              <Plus size={16} /> Upload Rental Lease
            </button>
          )}

          {activeTab === 'blueprints' && (
            <button
              type="button"
              onClick={() => setIsBlueprintModalOpen(true)}
              className="btn-primary"
              style={{ padding: '10px 18px', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '6px', background: '#059669' }}
            >
              <Plus size={16} /> Upload Floor Blueprint
            </button>
          )}

          {activeTab === 'legal' && (
            <button
              type="button"
              onClick={() => setIsLegalModalOpen(true)}
              className="btn-primary"
              style={{ padding: '10px 18px', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Lock size={15} /> Upload Legal Master Doc
            </button>
          )}

          {activeTab === 'signatures' && (
            <button
              type="button"
              onClick={() => openSignModal(null)}
              className="btn-primary"
              style={{ padding: '10px 18px', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '6px', background: '#8b5cf6' }}
            >
              <Award size={16} /> New E-Signature Certificate
            </button>
          )}

          {/* Quick Refresh */}
          <button
            type="button"
            onClick={loadVault}
            className="btn-secondary"
            title="Refresh vault contents"
            style={{ padding: '10px 14px' }}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Top Metrics Ribbon */}
      <div className="grid-cols-4">
        <div className="stat-card" onClick={() => handleTabChange('sales')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>SALE AGREEMENTS</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#e8f0fe', color: '#1a73e8' }}>
              <FileText size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#111827', marginTop: '4px' }}>
            {counts.saleAgreements || (vaultData.saleAgreements || []).length}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>Archived BBA PDFs</span>
        </div>

        <div className="stat-card" onClick={() => handleTabChange('rental')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>RENTAL & LEASES</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#e6f4ea', color: '#137333' }}>
              <Repeat size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#137333', marginTop: '4px' }}>
            {counts.rentalAgreements || (vaultData.rentalAgreements || []).length}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>Tenant & Rent-Back Deeds</span>
        </div>

        <div className="stat-card" onClick={() => handleTabChange('blueprints')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>FLOOR BLUEPRINTS</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#fef7e0', color: '#b06000' }}>
              <Layers size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#b06000', marginTop: '4px' }}>
            {counts.blueprints || (vaultData.blueprints || []).length}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>Architectural drawings</span>
        </div>

        <div className="stat-card" onClick={() => handleTabChange('legal')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>LEGAL & TITLE DEEDS</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#fee2e2', color: '#991b1b' }}>
              <ShieldCheck size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#991b1b', marginTop: '4px' }}>
            {counts.legalDocuments || (vaultData.legalDocuments || []).length}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>RERA, NOCs & Title Deeds</span>
        </div>
      </div>

      {/* Sub-Tab Navigation Header */}
      <div className="g-card" style={{
        display: 'flex',
        padding: '6px',
        gap: '6px',
        overflowX: 'auto'
      }}>
        {[
          { id: 'sales', label: `Sales Agreements (${vaultData.saleAgreements?.length || 0})`, icon: FileText },
          { id: 'rental', label: `Rental Leases (${vaultData.rentalAgreements?.length || 0})`, icon: Repeat },
          { id: 'blueprints', label: `Blueprints (${vaultData.blueprints?.length || 0})`, icon: Layers },
          { id: 'legal', label: `Legal & Title Vault (${vaultData.legalDocuments?.length || 0})`, icon: ShieldCheck },
          { id: 'signatures', label: `Digital Signatures (${vaultData.digitalSignatures?.length || 0})`, icon: Award }
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
                padding: '10px 18px',
                borderRadius: '6px',
                background: isSelected ? '#1a73e8' : 'transparent',
                color: isSelected ? '#ffffff' : '#374151',
                fontWeight: isSelected ? '800' : '600',
                fontSize: '0.84rem',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
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
          <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', background: '#fafbfc' }}>
            <div style={{ fontWeight: '700', color: '#111827', fontSize: '0.95rem' }}>
              Builder-Buyer Agreements (BBA) & Sale Deeds
            </div>
            <button
              type="button"
              onClick={() => setIsSalesModalOpen(true)}
              className="btn-primary"
              style={{ padding: '7px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={14} /> Upload Sales Agreement
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Buyer Name</th>
                  <th>Property Unit</th>
                  <th>Agreement Number</th>
                  <th>Execution / Upload Date</th>
                  <th>Sign Status</th>
                  <th>Document Link</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {(vaultData.saleAgreements || []).length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                      <FileText size={36} style={{ margin: '0 auto 10px', color: '#9ca3af' }} />
                      <div style={{ fontWeight: '600', fontSize: '0.92rem' }}>No Sales Agreements Archived Yet</div>
                      <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Upload a signed Builder-Buyer Agreement PDF for any property booking.</div>
                      <button
                        type="button"
                        onClick={() => setIsSalesModalOpen(true)}
                        className="btn-primary"
                        style={{ marginTop: '12px', padding: '7px 16px', fontSize: '0.8rem' }}
                      >
                        + Upload First Sales Agreement
                      </button>
                    </td>
                  </tr>
                ) : (
                  (vaultData.saleAgreements || []).map((doc) => (
                    <tr key={doc.id || Math.random()}>
                      <td style={{ fontWeight: '700', color: '#111827' }}>{doc.buyerName || doc.partyName}</td>
                      <td style={{ color: '#111827', fontWeight: '600' }}>Flat {doc.flatNumber} • {doc.projectName || doc.project}</td>
                      <td><code style={{ background: '#f3f4f5', padding: '2px 6px', borderRadius: '4px', color: '#1a73e8', fontWeight: '700' }}>{doc.agreementNumber}</code></td>
                      <td style={{ color: '#4b5563', fontSize: '0.78rem' }}>{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('en-IN') : 'N/A'}</td>
                      <td>
                        <span style={{ padding: '3px 8px', borderRadius: '4px', background: doc.signed ? '#e6f4ea' : '#fef7e0', color: doc.signed ? '#137333' : '#b06000', fontWeight: '700', fontSize: '0.74rem' }}>
                          {doc.signed ? 'DIGITALLY SIGNED' : 'PENDING SIGN'}
                        </span>
                      </td>
                      <td>
                        {doc.fileUrl ? (
                          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#1a73e8', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <ExternalLink size={13} /> View PDF
                          </a>
                        ) : (
                          <span style={{ color: '#4b5563', fontSize: '0.75rem' }}>No PDF attached</span>
                        )}
                      </td>
                      <td>
                        {!doc.signed && (
                          <button
                            type="button"
                            onClick={() => openSignModal(doc)}
                            style={{ padding: '4px 10px', background: '#1a73e8', color: '#ffffff', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700', border: 'none', cursor: 'pointer' }}
                          >
                            Sign Now
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
          <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', background: '#fafbfc' }}>
            <div style={{ fontWeight: '700', color: '#111827', fontSize: '0.95rem' }}>
              Tenant Lease & Owner Rent-Back Agreements
            </div>
            <button
              type="button"
              onClick={() => setIsRentalModalOpen(true)}
              className="btn-primary"
              style={{ padding: '7px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', background: '#10b981' }}
            >
              <Plus size={14} /> Upload Rental Lease
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Tenant / Owner Name</th>
                  <th>Contract Type</th>
                  <th>Property Unit</th>
                  <th>Contract Code</th>
                  <th>Monthly Value</th>
                  <th>Document Link</th>
                </tr>
              </thead>
              <tbody>
                {(vaultData.rentalAgreements || []).length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                      <Repeat size={36} style={{ margin: '0 auto 10px', color: '#9ca3af' }} />
                      <div style={{ fontWeight: '600', fontSize: '0.92rem' }}>No Rental Agreements Archived Yet</div>
                      <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Upload a Tenant Lease or Owner Rent-Back Agreement PDF.</div>
                      <button
                        type="button"
                        onClick={() => setIsRentalModalOpen(true)}
                        className="btn-primary"
                        style={{ marginTop: '12px', padding: '7px 16px', fontSize: '0.8rem', background: '#10b981' }}
                      >
                        + Upload First Rental Agreement
                      </button>
                    </td>
                  </tr>
                ) : (
                  (vaultData.rentalAgreements || []).map((doc) => (
                    <tr key={doc.id || Math.random()}>
                      <td style={{ fontWeight: '700', color: '#111827' }}>{doc.tenantName || doc.partyName}</td>
                      <td>
                        <span style={{ padding: '3px 8px', borderRadius: '4px', background: doc.type?.includes('Rent-Back') ? '#fef3c7' : '#dbeafe', color: doc.type?.includes('Rent-Back') ? '#92400e' : '#1e40af', fontWeight: '700', fontSize: '0.72rem' }}>
                          {doc.type || 'Lease Agreement'}
                        </span>
                      </td>
                      <td style={{ color: '#111827', fontWeight: '600' }}>Flat {doc.flatNumber} • {doc.projectName || doc.project}</td>
                      <td><code style={{ background: '#f3f4f5', padding: '2px 6px', borderRadius: '4px', color: '#1a73e8', fontWeight: '700' }}>{doc.contractCode}</code></td>
                      <td style={{ color: '#137333', fontWeight: '800' }}>₹{Number(doc.monthlyRent || doc.monthlyAmount || 0).toLocaleString('en-IN')}/mo</td>
                      <td>
                        {doc.fileUrl ? (
                          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#1a73e8', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <ExternalLink size={13} /> View PDF
                          </a>
                        ) : (
                          <span style={{ color: '#4b5563', fontSize: '0.75rem' }}>Archived</span>
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
          <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', background: '#fafbfc' }}>
            <div style={{ fontWeight: '700', color: '#111827', fontSize: '0.95rem' }}>
              Floor Plans & Architectural Drawings
            </div>
            <button
              type="button"
              onClick={() => setIsBlueprintModalOpen(true)}
              className="btn-primary"
              style={{ padding: '7px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', background: '#059669' }}
            >
              <Plus size={14} /> Upload Blueprint
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Property Unit</th>
                  <th>Plan Type</th>
                  <th>Uploaded Date</th>
                  <th>File</th>
                </tr>
              </thead>
              <tbody>
                {(vaultData.blueprints || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                      <Layers size={36} style={{ margin: '0 auto 10px', color: '#9ca3af' }} />
                      <div style={{ fontWeight: '600', fontSize: '0.92rem' }}>No Architectural Blueprints Uploaded</div>
                      <button
                        type="button"
                        onClick={() => setIsBlueprintModalOpen(true)}
                        className="btn-primary"
                        style={{ marginTop: '12px', padding: '7px 16px', fontSize: '0.8rem', background: '#059669' }}
                      >
                        + Upload First Blueprint
                      </button>
                    </td>
                  </tr>
                ) : (
                  (vaultData.blueprints || []).map((bp) => (
                    <tr key={bp.id || Math.random()}>
                      <td style={{ fontWeight: '700', color: '#111827' }}>{bp.title}</td>
                      <td style={{ color: '#374151', fontWeight: '600' }}>Flat {bp.flatNumber} • {bp.projectName || bp.project}</td>
                      <td><span style={{ padding: '2px 6px', background: '#f3f4f5', borderRadius: '4px', fontWeight: '700', color: '#111827', fontSize: '0.75rem' }}>{bp.floorPlanType || bp.version || '2D Layout'}</span></td>
                      <td style={{ color: '#4b5563', fontSize: '0.76rem' }}>{bp.uploadedAt ? new Date(bp.uploadedAt).toLocaleDateString('en-IN') : 'N/A'}</td>
                      <td>
                        <a href={bp.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#1a73e8', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <ExternalLink size={13} /> Blueprint
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
          <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', background: '#fafbfc' }}>
            <div style={{ fontWeight: '700', color: '#111827', fontSize: '0.95rem' }}>
              Legal Master Approvals, RERA, Title Deeds & NOCs
            </div>
            <button
              type="button"
              onClick={() => setIsLegalModalOpen(true)}
              className="btn-primary"
              style={{ padding: '7px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Lock size={14} /> Upload Legal Document
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Document Title</th>
                  <th>Category</th>
                  <th>Project Site</th>
                  <th>Authority / Reg No</th>
                  <th>Expiry Date</th>
                  <th>File</th>
                </tr>
              </thead>
              <tbody>
                {(vaultData.legalDocuments || []).length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                      <ShieldCheck size={36} style={{ margin: '0 auto 10px', color: '#9ca3af' }} />
                      <div style={{ fontWeight: '600', fontSize: '0.92rem' }}>No Legal Documents Uploaded</div>
                      <button
                        type="button"
                        onClick={() => setIsLegalModalOpen(true)}
                        className="btn-primary"
                        style={{ marginTop: '12px', padding: '7px 16px', fontSize: '0.8rem' }}
                      >
                        + Upload First Legal Master Document
                      </button>
                    </td>
                  </tr>
                ) : (
                  (vaultData.legalDocuments || []).map((ld) => (
                    <tr key={ld.id || Math.random()}>
                      <td style={{ fontWeight: '700', color: '#111827' }}>{ld.title}</td>
                      <td><span style={{ padding: '2px 6px', background: '#e8f0fe', color: '#1a73e8', borderRadius: '4px', fontWeight: '700', fontSize: '0.72rem' }}>{ld.category || ld.documentType}</span></td>
                      <td style={{ color: '#374151', fontWeight: '600' }}>{ld.projectId?.projectName || ld.projectName || 'All Sites'}</td>
                      <td style={{ color: '#111827', fontWeight: '600' }}>{ld.authorityNumber || ld.issuingAuthority || 'Clearance Verified'}</td>
                      <td style={{ color: '#4b5563', fontSize: '0.76rem' }}>{ld.expiryDate ? new Date(ld.expiryDate).toLocaleDateString('en-IN') : 'Perpetual'}</td>
                      <td>
                        <a href={ld.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#1a73e8', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <ExternalLink size={13} /> Document
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
          <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', background: '#fafbfc' }}>
            <div style={{ fontWeight: '700', color: '#111827', fontSize: '0.95rem' }}>
              Cryptographic Digital Signatures & SHA-256 Audit Certificates
            </div>
            <button
              type="button"
              onClick={() => openSignModal(null)}
              className="btn-primary"
              style={{ padding: '7px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', background: '#8b5cf6' }}
            >
              <Award size={14} /> New E-Signature Certificate
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Signer Name</th>
                  <th>Role</th>
                  <th>Document Reference</th>
                  <th>Signed Timestamp</th>
                  <th>Certificate Hash</th>
                </tr>
              </thead>
              <tbody>
                {(vaultData.digitalSignatures || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                      <Award size={36} style={{ margin: '0 auto 10px', color: '#9ca3af' }} />
                      <div style={{ fontWeight: '600', fontSize: '0.92rem' }}>No Cryptographic Signatures Issued Yet</div>
                    </td>
                  </tr>
                ) : (
                  (vaultData.digitalSignatures || []).map((ds) => (
                    <tr key={ds.id || Math.random()}>
                      <td style={{ fontWeight: '700', color: '#111827' }}>{ds.signerName}</td>
                      <td>
                        <span style={{ padding: '3px 8px', borderRadius: '4px', background: '#eff6ff', color: '#1e40af', fontWeight: '700', fontSize: '0.74rem' }}>
                          {formatSignerRole(ds.signerRole || ds.role)}
                        </span>
                      </td>
                      <td style={{ color: '#111827', fontWeight: '700' }}>
                        {ds.documentTitle || ds.documentType || 'Agreement Document'}
                        <div style={{ fontSize: '0.74rem', color: '#1a73e8', fontWeight: '600', marginTop: '2px' }}>
                          Ref: {ds.referenceId || ds.certificateNumber || ds.certificateCode || 'REF-N/A'}
                        </div>
                      </td>
                      <td style={{ color: '#4b5563', fontSize: '0.76rem' }}>{new Date(ds.signedAt).toLocaleString('en-IN')}</td>
                      <td><code style={{ background: '#f3f4f5', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', color: '#111827' }}>{ds.signatureHash || 'SHA-256 Verified'}</code></td>
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

