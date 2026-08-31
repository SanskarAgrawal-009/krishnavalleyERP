import React, { useState } from 'react';
import { Modal } from '../common/Modal.jsx';
import { StatusBadge } from '../common/StatusBadge.jsx';
import { 
  User, 
  Phone, 
  Mail, 
  Home, 
  Building2, 
  Key, 
  FileText, 
  Upload, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Mic, 
  Play, 
  Volume2, 
  Calendar, 
  DollarSign, 
  ExternalLink, 
  MessageSquare,
  ShieldCheck,
  Plus
} from 'lucide-react';

export const CustomerDetailModal = ({
  isOpen,
  onClose,
  customer,
  onUploadDocument,
  onVerifyDocument,
  onLogCommunication
}) => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'documents' | 'communications' | 'lease'

  // Document Upload Form
  const [docType, setDocType] = useState('aadhaar');
  const [docName, setDocName] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [selectedDocFile, setSelectedDocFile] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Communication Log Form
  const [commMode, setCommMode] = useState('call');
  const [commDirection, setCommDirection] = useState('outbound');
  const [commSubject, setCommSubject] = useState('');
  const [commMessage, setCommMessage] = useState('');
  const [commOutcome, setCommOutcome] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [selectedAudioFile, setSelectedAudioFile] = useState(null);
  const [loggingComm, setLoggingComm] = useState(false);

  if (!customer) return null;

  const isOwner = customer.customerType === 'owner';
  const isTenant = customer.customerType === 'tenant';
  const isCompanyTenant = isTenant && customer.tenantDetails?.tenantType === 'company';

  const documents = customer.documents || [];
  const communications = customer.communications || [];

  const formatINR = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const handleDocSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDocFile) {
      alert('Please select a document file to upload to S3');
      return;
    }

    setUploadingDoc(true);
    const formData = new FormData();
    formData.append('documentFile', selectedDocFile);
    formData.append('documentType', docType);
    formData.append('documentName', docName || selectedDocFile.name);
    formData.append('documentNumber', docNumber);

    try {
      await onUploadDocument(customer._id, formData);
      setSelectedDocFile(null);
      setDocName('');
      setDocNumber('');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleCommSubmit = async (e) => {
    e.preventDefault();
    setLoggingComm(true);

    const formData = new FormData();
    if (selectedAudioFile) {
      formData.append('mediaFile', selectedAudioFile);
    }
    formData.append('mode', commMode);
    formData.append('direction', commDirection);
    formData.append('subject', commSubject || 'Customer Interaction');
    formData.append('message', commMessage);
    formData.append('outcome', commOutcome);
    if (nextDate) formData.append('nextFollowUpDate', nextDate);

    try {
      await onLogCommunication(customer._id, formData);
      setCommSubject('');
      setCommMessage('');
      setCommOutcome('');
      setNextDate('');
      setSelectedAudioFile(null);
    } finally {
      setLoggingComm(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${isOwner ? 'Flat Owner' : 'Tenant'} Profile: ${customer.name}`}
      maxWidth="860px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Top Hero Banner */}
        <div style={{
          background: '#f8f9fa',
          border: '1px solid #dadce0',
          borderRadius: 'var(--radius-sm)',
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#111827' }}>{customer.name}</span>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '4px',
                background: isOwner ? 'rgba(168, 85, 247, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                color: isOwner ? '#c084fc' : '#60a5fa',
                textTransform: 'uppercase'
              }}>
                {customer.customerType} {isCompanyTenant ? '(Corporate)' : ''}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '14px', fontSize: '0.8rem', color: '#374151', marginTop: '4px', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Phone size={13} color="#10b981" /> {customer.mobileNo}
              </span>
              {customer.email && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Mail size={13} color="#60a5fa" /> {customer.email}
                </span>
              )}
              {customer.address?.city && (
                <span style={{ color: '#4b5563' }}>
                  {customer.address.city}, {customer.address.state}
                </span>
              )}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.7rem', color: '#4b5563' }}>ALLOTTED HOLDINGS</div>
            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111827' }}>
              {isOwner ? `${customer.ownerDetails?.propertyIds?.length || 0} Properties` : (customer.tenantDetails?.rentalDetails?.flatId?.flatNumber ? `Flat ${customer.tenantDetails.rentalDetails.flatId.flatNumber}` : '1 Leased Unit')}
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          background: '#f8f9fa',
          padding: '4px',
          borderRadius: '8px',
          border: '1px solid #dadce0',
          overflowX: 'auto',
          gap: '4px'
        }}>
          {[
            { id: 'overview', label: '1. Overview & Allotments', icon: Home },
            { id: 'passbook', label: '2. Financial Passbook & Ledgers', icon: DollarSign },
            { id: 'documents', label: `3. Document Vault (${documents.length})`, icon: FileText },
            { id: 'communications', label: `4. Call Logs & Comms (${communications.length})`, icon: MessageSquare }
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  background: isSelected ? '#1a73e8' : 'transparent',
                  color: isSelected ? '#ffffff' : '#374151',
                  fontWeight: isSelected ? '700' : '600',
                  fontSize: '0.8rem',
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ================= TAB 1: OVERVIEW ================= */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Owner Properties Breakdown */}
            {isOwner && (
              <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Key size={15} /> Owned Flats & Property Portfolios
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                  {(customer.ownerDetails?.propertyIds || []).map((flat) => (
                    <div
                      key={flat._id || flat}
                      style={{
                        background: '#f8f9fa',
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '10px 12px'
                      }}
                    >
                      <div style={{ fontSize: '1rem', fontWeight: '800', color: '#111827' }}>
                        Flat {flat.flatNumber || 'Unit'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#374151', marginTop: '2px' }}>
                        {flat.projectId?.projectName || 'Project'} • Status: {flat.status || 'Active'}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '20px', fontSize: '0.8rem', color: '#374151', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                  <span>Ownership Type: <strong style={{ color: '#111827', textTransform: 'capitalize' }}>{customer.ownerDetails?.ownershipType || 'Individual'}</strong></span>
                  <span>Share: <strong style={{ color: '#111827' }}>{customer.ownerDetails?.ownershipPercentage || 100}%</strong></span>
                </div>
              </div>
            )}

            {/* Tenant Lease & Profile Overview */}
            {isTenant && (
              <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Home size={15} /> Leased Flat & Tenant Identification
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid #dadce0' }}>
                    <div style={{ fontSize: '0.75rem', color: '#4b5563' }}>Leased Residence</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111827', marginTop: '2px' }}>
                      Flat {customer.tenantDetails?.rentalDetails?.flatId?.flatNumber || 'Allotted Unit'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#374151' }}>
                      {customer.tenantDetails?.rentalDetails?.flatId?.projectId?.projectName || 'Krishna Valley'}
                    </div>
                  </div>

                  <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid #dadce0' }}>
                    <div style={{ fontSize: '0.75rem', color: '#4b5563' }}>Monthly Rent & Status</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#10b981', marginTop: '2px' }}>
                      {formatINR(customer.tenantDetails?.rentalDetails?.monthlyRent || 0)} / mo
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#60a5fa', textTransform: 'uppercase', fontWeight: '700' }}>
                      Due on day {customer.tenantDetails?.rentalDetails?.rentDueDay || 5} of month
                    </span>
                  </div>
                </div>

                {isCompanyTenant && customer.tenantDetails?.company && (
                  <div style={{ background: '#f8f9fa', padding: '10px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div><strong>Company:</strong> {customer.tenantDetails.company.companyName} (CIN: {customer.tenantDetails.company.registrationNumber})</div>
                    <div><strong>GST:</strong> {customer.tenantDetails.company.gstNumber} | <strong>PAN:</strong> {customer.tenantDetails.company.panNumber}</div>
                    <div><strong>Contact Person:</strong> {customer.tenantDetails.company.contactPerson?.name} ({customer.tenantDetails.company.contactPerson?.designation}) • {customer.tenantDetails.company.contactPerson?.mobileNo}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: S3 DOCUMENT VAULT ================= */}
        {activeTab === 'documents' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Upload Box */}
            <form onSubmit={handleDocSubmit} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ fontSize: '0.88rem', fontWeight: '800', color: '#111827', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Upload size={15} color="var(--primary-500)" /> Upload KYC / Property Document to S3
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Doc Type *</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  >
                    <option value="aadhaar">Aadhaar Card</option>
                    <option value="pan">PAN Card</option>
                    <option value="sale_deed">Sale Deed</option>
                    <option value="registry">Registry Document</option>
                    <option value="rental_agreement">Rental Agreement</option>
                    <option value="gst_certificate">GST Certificate</option>
                    <option value="passport">Passport</option>
                    <option value="other">Other Document</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Document Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Aadhaar Front & Back"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Document # / ID</label>
                  <input
                    type="text"
                    placeholder="e.g. 5432-1098-7654"
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              {/* File Input */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="file"
                  id="customerDocFile"
                  onChange={(e) => setSelectedDocFile(e.target.files?.[0] || null)}
                  style={{ display: 'none' }}
                />
                <label
                  htmlFor="customerDocFile"
                  style={{
                    padding: '6px 14px',
                    background: '#f8f9fa',
                    border: '1px solid #dadce0',
                    borderRadius: '4px',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    color: '#111827',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Upload size={13} /> {selectedDocFile ? selectedDocFile.name : 'Choose Document File'}
                </label>

                <button
                  type="submit"
                  disabled={uploadingDoc || !selectedDocFile}
                  style={{
                    padding: '6px 16px',
                    background: 'linear-gradient(135deg, var(--primary-600), var(--primary-700))',
                    color: '#111827',
                    borderRadius: '4px',
                    fontWeight: '700',
                    fontSize: '0.78rem',
                    cursor: uploadingDoc ? 'not-allowed' : 'pointer'
                  }}
                >
                  {uploadingDoc ? 'Uploading to S3...' : 'Upload to AWS S3'}
                </button>
              </div>
            </form>

            {/* Documents List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {documents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#4b5563', fontSize: '0.8rem' }}>
                  No documents uploaded to vault yet.
                </div>
              ) : (
                documents.map((doc) => (
                  <div
                    key={doc._id}
                    style={{
                      background: '#f8f9fa',
                      border: '1px solid #dadce0',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '700', color: '#111827', fontSize: '0.85rem' }}>{doc.documentName}</div>
                      <div style={{ fontSize: '0.72rem', color: '#4b5563' }}>
                        Type: <span style={{ textTransform: 'capitalize', color: '#374151' }}>{doc.documentType}</span> • {doc.documentNumber ? `ID: ${doc.documentNumber} • ` : ''}Uploaded {new Date(doc.uploadedAt).toLocaleDateString('en-IN')}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: doc.verificationStatus === 'verified' ? 'rgba(16, 185, 129, 0.15)' : (doc.verificationStatus === 'rejected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(251, 191, 36, 0.15)'),
                        color: doc.verificationStatus === 'verified' ? '#10b981' : (doc.verificationStatus === 'rejected' ? '#ef4444' : '#fbbf24')
                      }}>
                        {doc.verificationStatus}
                      </span>

                      {doc.verificationStatus !== 'verified' && (
                        <button
                          type="button"
                          onClick={() => onVerifyDocument(customer._id, doc._id, { verificationStatus: 'verified' })}
                          style={{ padding: '3px 8px', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer' }}
                        >
                          Verify
                        </button>
                      )}

                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          background: '#f8f9fa',
                          border: '1px solid #dadce0',
                          borderRadius: '4px',
                          color: '#60a5fa',
                          textDecoration: 'none',
                          fontSize: '0.75rem',
                          fontWeight: '600'
                        }}
                      >
                        <ExternalLink size={12} /> View S3 Doc
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 3: COMMUNICATIONS & CALL RECORDINGS ================= */}
        {activeTab === 'communications' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Quick Log Form */}
            <form onSubmit={handleCommSubmit} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h4 style={{ fontSize: '0.88rem', fontWeight: '800', color: '#111827', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mic size={15} color="#10b981" /> Log Customer Interaction & Call Recording
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Channel</label>
                  <select
                    value={commMode}
                    onChange={(e) => setCommMode(e.target.value)}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  >
                    <option value="call">Phone Call</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                    <option value="meeting">Meeting</option>
                    <option value="site_visit">Site Visit</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Direction</label>
                  <select
                    value={commDirection}
                    onChange={(e) => setCommDirection(e.target.value)}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  >
                    <option value="outbound">Outbound (Agent to Client)</option>
                    <option value="inbound">Inbound (Client Called)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Next Action Date</label>
                  <input
                    type="datetime-local"
                    value={nextDate}
                    onChange={(e) => setNextDate(e.target.value)}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Subject / Purpose</label>
                <input
                  type="text"
                  placeholder="e.g. Rent payment confirmation / Lease renewal discussion"
                  value={commSubject}
                  onChange={(e) => setCommSubject(e.target.value)}
                  style={{ width: '100%', fontSize: '0.8rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Discussion Notes & Outcome</label>
                <textarea
                  rows={2}
                  placeholder="Details of call or discussion..."
                  value={commMessage}
                  onChange={(e) => setCommMessage(e.target.value)}
                  style={{ width: '100%', fontSize: '0.8rem' }}
                />
              </div>

              {/* Call Recording File Picker */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="file"
                    id="callAudioFile"
                    accept="audio/*,.mp3,.wav,.m4a"
                    onChange={(e) => setSelectedAudioFile(e.target.files?.[0] || null)}
                    style={{ display: 'none' }}
                  />
                  <label
                    htmlFor="callAudioFile"
                    style={{
                      padding: '5px 12px',
                      background: '#f8f9fa',
                      border: '1px solid #dadce0',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      color: selectedAudioFile ? '#10b981' : 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <Mic size={13} /> {selectedAudioFile ? selectedAudioFile.name : 'Attach Audio / Call Recording'}
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loggingComm}
                  style={{
                    padding: '6px 18px',
                    background: 'linear-gradient(135deg, #10b981, var(--primary-700))',
                    color: '#111827',
                    borderRadius: '4px',
                    fontWeight: '700',
                    fontSize: '0.78rem',
                    cursor: loggingComm ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loggingComm ? 'Saving Log...' : 'Save Communication Log'}
                </button>
              </div>
            </form>

            {/* Interaction Stream & Audio Players */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {communications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#4b5563', fontSize: '0.8rem' }}>
                  No communication or call recordings logged yet.
                </div>
              ) : (
                communications.map((comm, idx) => (
                  <div
                    key={comm._id || idx}
                    style={{
                      background: '#f8f9fa',
                      border: '1px solid #dadce0',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: '800', color: '#111827', fontSize: '0.85rem' }}>{comm.subject}</span>
                        <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', background: '#f8f9fa', color: 'var(--primary-500)', textTransform: 'capitalize', fontWeight: '700' }}>
                          {comm.direction} {comm.mode}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#4b5563' }}>
                        {new Date(comm.communicationDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.8rem', color: '#374151', margin: 0 }}>
                      {comm.message}
                    </p>

                    {/* Audio Call Player */}
                    {comm.callRecordingUrl && (
                      <div style={{ background: '#f8f9fa', padding: '8px 10px', borderRadius: '4px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Volume2 size={16} color="#10b981" />
                        <audio controls src={comm.callRecordingUrl} style={{ width: '100%', height: '32px' }} />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ================= TAB: PASSBOOK & FINANCIAL LEDGER ================= */}
        {activeTab === 'passbook' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {isOwner ? (
              (() => {
                const sa = customer.ownerDetails?.salesAllotment || {};
                const liveSa = customer.liveSalesAllotment || {};
                const totalDealVal = sa.agreedDealPrice || liveSa.paymentPlan?.totalAmount || customer.ownerDetails?.propertyIds?.[0]?.basePrice || 0;
                const paidVal = sa.bookingAmount || liveSa.paymentPlan?.bookingAmount || 0;
                const balanceVal = Math.max(0, totalDealVal - paidVal);
                const sStatus = sa.salesStatus || liveSa.salesStatus || 'booked';
                const agrNum = sa.agreementNumber || liveSa.agreement?.agreementNumber || 'AGR-KV-Record';
                const agrDate = sa.agreementDate || liveSa.agreement?.agreementDate || customer.createdAt;
                
                // Find agreement document from liveSa or customer.documents
                const agreementDoc = liveSa.agreement?.documentUrl 
                  ? { fileUrl: liveSa.agreement.documentUrl, fileName: liveSa.agreement.documentName || 'Sales Agreement' }
                  : customer.documents?.find(d => ['sale_deed', 'agreement', 'bba', 'allotment_letter', 'registry'].includes(d.documentType));

                // Find receipt documents & records
                const receipts = liveSa.receipts && liveSa.receipts.length > 0 
                  ? liveSa.receipts 
                  : (paidVal > 0 ? [{ receiptNumber: 'REC-BOOKING', amount: paidVal, generatedAt: sa.allotmentDate || customer.createdAt }] : []);

                const receiptDocs = customer.documents?.filter(d => ['rent_receipt', 'payment_receipt', 'booking_receipt', 'receipt'].includes(d.documentType)) || [];

                return (
                  <>
                    {/* Financial Summary Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                      <div style={{ background: '#f8f9fa', border: '1px solid #dadce0', borderRadius: '8px', padding: '14px' }}>
                        <span style={{ fontSize: '0.72rem', color: '#4b5563', fontWeight: '700' }}>TOTAL AGREEMENT VALUE</span>
                        <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#111827', marginTop: '4px' }}>
                          {formatINR(totalDealVal)}
                        </div>
                        <span style={{ fontSize: '0.72rem', color: '#4b5563' }}>Agreed Sale Consideration</span>
                      </div>

                      <div style={{ background: '#f8f9fa', border: '1px solid #dadce0', borderRadius: '8px', padding: '14px' }}>
                        <span style={{ fontSize: '0.72rem', color: '#4b5563', fontWeight: '700' }}>TOKEN / PAID AMOUNT</span>
                        <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#137333', marginTop: '4px' }}>
                          {formatINR(paidVal)}
                        </div>
                        <span style={{ fontSize: '0.72rem', color: '#137333', fontWeight: '700' }}>
                          ✓ {totalDealVal > 0 ? `${Math.round((paidVal / totalDealVal) * 100)}% Paid` : 'Recorded'}
                        </span>
                      </div>

                      <div style={{ background: '#f8f9fa', border: '1px solid #dadce0', borderRadius: '8px', padding: '14px' }}>
                        <span style={{ fontSize: '0.72rem', color: '#4b5563', fontWeight: '700' }}>BALANCE OUTSTANDING</span>
                        <div style={{ fontSize: '1.25rem', fontWeight: '800', color: balanceVal === 0 ? '#137333' : '#b06000', marginTop: '4px' }}>
                          {formatINR(balanceVal)}
                        </div>
                        <span style={{ fontSize: '0.72rem', color: balanceVal === 0 ? '#137333' : '#b06000', fontWeight: '600' }}>
                          {balanceVal === 0 ? 'Fully Paid' : 'Milestone Schedule Active'}
                        </span>
                      </div>

                      <div style={{ background: '#f8f9fa', border: '1px solid #dadce0', borderRadius: '8px', padding: '14px' }}>
                        <span style={{ fontSize: '0.72rem', color: '#4b5563', fontWeight: '700' }}>ALLOTMENT STATUS</span>
                        <div style={{ fontSize: '1rem', fontWeight: '800', color: '#8b5cf6', marginTop: '4px', textTransform: 'capitalize' }}>
                          {sStatus.replace(/_/g, ' ')}
                        </div>
                        <span style={{ fontSize: '0.72rem', color: '#4b5563' }}>Sales Registry Synced</span>
                      </div>
                    </div>

                    {/* Allotment Agreement & Document Box */}
                    <div style={{ background: '#ffffff', border: '1px solid #dadce0', borderRadius: '8px', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FileText size={16} color="#1a73e8" />
                          <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#111827' }}>
                            Sales Agreement & Title Allotment
                          </span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#1a73e8', background: '#e8f0fe', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>
                          Agreement #{agrNum}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '0.8rem', color: '#374151', background: '#f8f9fa', padding: '12px', borderRadius: '6px' }}>
                        <div><strong>Allotted Flat:</strong> {customer.ownerDetails?.propertyIds?.map(p => `Flat ${p.flatNumber || p}`).join(', ') || 'Unit Allotted'}</div>
                        <div><strong>Agreement Date:</strong> {new Date(agrDate).toLocaleDateString('en-IN')}</div>
                        <div><strong>Payment Mode:</strong> <span style={{ textTransform: 'capitalize' }}>{sa.paymentMode || 'Bank Transfer'}</span> {sa.transactionReference ? `(${sa.transactionReference})` : ''}</div>
                        <div><strong>Ownership Share:</strong> {customer.ownerDetails?.ownershipPercentage || 100}% ({customer.ownerDetails?.ownershipType || 'Individual'})</div>
                      </div>

                      {/* Agreement Document Action */}
                      <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', borderTop: '1px solid #dadce0', paddingTop: '10px' }}>
                        <div style={{ fontSize: '0.78rem', color: '#4b5563' }}>
                          {agreementDoc ? (
                            <span style={{ color: '#137333', fontWeight: '700' }}>✓ Agreement document uploaded & verified in S3 vault</span>
                          ) : (
                            <span style={{ color: '#b06000' }}>⚠ Agreement document copy pending upload</span>
                          )}
                        </div>

                        {agreementDoc ? (
                          <a
                            href={agreementDoc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-primary"
                            style={{ padding: '6px 14px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                          >
                            <ExternalLink size={13} /> View / Download Agreement (PDF)
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setActiveTab('documents')}
                            className="btn-secondary"
                            style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                          >
                            + Upload Agreement Document
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Payment Receipts Box */}
                    <div style={{ background: '#ffffff', border: '1px solid #dadce0', borderRadius: '8px', overflow: 'hidden' }}>
                      <div style={{ padding: '12px 16px', background: '#f8f9fa', borderBottom: '1px solid #dadce0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#111827', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <DollarSign size={15} color="#137333" /> Payment Receipts & Deposit Ledger ({receipts.length + receiptDocs.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveTab('documents')}
                          style={{ background: 'transparent', border: 'none', color: '#1a73e8', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}
                        >
                          + Upload New Receipt
                        </button>
                      </div>

                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', fontSize: '0.8rem' }}>
                          <thead>
                            <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #dadce0' }}>
                              <th style={{ padding: '10px 14px' }}>Receipt / Ref #</th>
                              <th style={{ padding: '10px 14px' }}>Date</th>
                              <th style={{ padding: '10px 14px' }}>Description</th>
                              <th style={{ padding: '10px 14px' }}>Amount (₹)</th>
                              <th style={{ padding: '10px 14px' }}>Document</th>
                            </tr>
                          </thead>
                          <tbody>
                            {receipts.map((rec, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid #f1f3f4' }}>
                                <td style={{ padding: '10px 14px', fontWeight: '700', color: '#1a73e8' }}>
                                  {rec.receiptNumber || `REC-${idx + 1}`}
                                </td>
                                <td style={{ padding: '10px 14px', color: '#4b5563' }}>
                                  {new Date(rec.generatedAt || customer.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </td>
                                <td style={{ padding: '10px 14px', color: '#111827' }}>
                                  Booking Token / Property Allotment Inflow
                                </td>
                                <td style={{ padding: '10px 14px', fontWeight: '800', color: '#137333' }}>
                                  {formatINR(rec.amount || paidVal)}
                                </td>
                                <td style={{ padding: '10px 14px' }}>
                                  {rec.documentUrl ? (
                                    <a
                                      href={rec.documentUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ color: '#1a73e8', fontWeight: '700', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                    >
                                      <ExternalLink size={12} /> View Receipt
                                    </a>
                                  ) : (
                                    <span style={{ color: '#727785', fontSize: '0.74rem' }}>Payment Verified</span>
                                  )}
                                </td>
                              </tr>
                            ))}

                            {receiptDocs.map((rd, idx) => (
                              <tr key={`doc-${idx}`} style={{ borderBottom: '1px solid #f1f3f4' }}>
                                <td style={{ padding: '10px 14px', fontWeight: '700', color: '#1a73e8' }}>
                                  {rd.documentNumber || `REC-S3-${idx + 1}`}
                                </td>
                                <td style={{ padding: '10px 14px', color: '#4b5563' }}>
                                  {new Date(rd.uploadedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </td>
                                <td style={{ padding: '10px 14px', color: '#111827' }}>
                                  {rd.documentName || 'Payment Proof Attachment'}
                                </td>
                                <td style={{ padding: '10px 14px', fontWeight: '800', color: '#137333' }}>
                                  {formatINR(paidVal)}
                                </td>
                                <td style={{ padding: '10px 14px' }}>
                                  <a
                                    href={rd.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: '#1a73e8', fontWeight: '700', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  >
                                    <ExternalLink size={12} /> View Receipt
                                  </a>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                );
              })()
            ) : (
              /* Tenant Passbook Section */
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <div style={{ background: '#f8f9fa', border: '1px solid #dadce0', borderRadius: '8px', padding: '14px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#4b5563', fontWeight: '700' }}>ACCOUNT TYPE</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1a73e8', marginTop: '4px', textTransform: 'capitalize' }}>
                      Tenant Ledger
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#4b5563' }}>KYC Verified</span>
                  </div>

                  <div style={{ background: '#f8f9fa', border: '1px solid #dadce0', borderRadius: '8px', padding: '14px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#4b5563', fontWeight: '700' }}>LINKED RESIDENCE</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111827', marginTop: '4px' }}>
                      Flat {customer.tenantDetails?.rentalDetails?.flatId?.flatNumber || 'Allotted'}
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#137333', fontWeight: '600' }}>Active Lease</span>
                  </div>

                  <div style={{ background: '#f8f9fa', border: '1px solid #dadce0', borderRadius: '8px', padding: '14px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#4b5563', fontWeight: '700' }}>MONTHLY RENT</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#137333', marginTop: '4px' }}>
                      {formatINR(customer.tenantDetails?.rentalDetails?.monthlyRent || 0)}
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#4b5563' }}>Due on Day {customer.tenantDetails?.rentalDetails?.rentDueDay || 5}</span>
                  </div>

                  <div style={{ background: '#f8f9fa', border: '1px solid #dadce0', borderRadius: '8px', padding: '14px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#4b5563', fontWeight: '700' }}>SECURITY ESCROW</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#b06000', marginTop: '4px' }}>
                      {formatINR(customer.tenantDetails?.rentalDetails?.securityDeposit || 0)}
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#4b5563' }}>Deposit Held in Escrow</span>
                  </div>
                </div>

                {/* Tenant Passbook Ledger */}
                <div style={{ background: '#ffffff', border: '1px solid #dadce0', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', background: '#f8f9fa', borderBottom: '1px solid #dadce0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#111827', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileText size={15} color="#1a73e8" /> Tenancy Statement & Rent Breakdown
                    </span>
                    <span style={{ fontSize: '0.74rem', color: '#137333', background: '#e6f4ea', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>
                      ✓ All Dues Settled Up-To-Date
                    </span>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '0.8rem' }}>
                      <thead>
                        <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #dadce0' }}>
                          <th style={{ padding: '10px 14px' }}>Date</th>
                          <th style={{ padding: '10px 14px' }}>Transaction / Description</th>
                          <th style={{ padding: '10px 14px' }}>Type</th>
                          <th style={{ padding: '10px 14px' }}>Amount (₹)</th>
                          <th style={{ padding: '10px 14px' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #f1f3f4' }}>
                          <td style={{ padding: '10px 14px', color: '#4b5563' }}>
                            {new Date(customer.createdAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: '700', color: '#111827' }}>
                            Tenancy Security Deposit (Flat {customer.tenantDetails?.rentalDetails?.flatId?.flatNumber || 'Unit'})
                          </td>
                          <td style={{ padding: '10px 14px', color: '#1a73e8', fontWeight: '700' }}>
                            Deposit Inflow
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: '800', color: '#137333' }}>
                            {formatINR(customer.tenantDetails?.rentalDetails?.securityDeposit || 0)}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ fontSize: '0.72rem', background: '#e6f4ea', color: '#137333', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>
                              Deposit Received
                            </span>
                          </td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #f1f3f4' }}>
                          <td style={{ padding: '10px 14px', color: '#4b5563' }}>
                            {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: '700', color: '#111827' }}>
                            Current Month Rent Accrual
                          </td>
                          <td style={{ padding: '10px 14px', color: '#b06000', fontWeight: '700' }}>
                            Rental Billing
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: '800', color: '#111827' }}>
                            {formatINR(customer.tenantDetails?.rentalDetails?.monthlyRent || 0)}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ fontSize: '0.72rem', background: '#e8f0fe', color: '#1a73e8', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>
                              Due on Day {customer.tenantDetails?.rentalDetails?.rentDueDay || 5}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </Modal>
  );
};
