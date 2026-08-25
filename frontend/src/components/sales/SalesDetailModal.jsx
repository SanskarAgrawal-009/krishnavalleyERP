import React, { useState } from 'react';
import { Modal } from '../common/Modal.jsx';
import { StatusBadge } from '../common/StatusBadge.jsx';
import { 
  Building2, 
  Home, 
  User, 
  Phone, 
  Mail, 
  CheckCircle, 
  FileText, 
  CreditCard, 
  Receipt, 
  Send, 
  Key, 
  XCircle, 
  Plus, 
  Calendar, 
  Clock, 
  AlertCircle,
  FileCheck,
  RotateCcw,
  CheckCircle2,
  DollarSign,
  Upload,
  ExternalLink,
  Check
} from 'lucide-react';

export const SalesDetailModal = ({
  isOpen,
  onClose,
  salesLead,
  onUpdateBooking,
  onUpdateAgreement,
  onUploadAgreementFile,
  onSetupPaymentPlan,
  onRecordPayment,
  onGenerateDemandLetter,
  onAddFollowUp,
  onUpdatePossession,
  onProcessCancellation
}) => {
  const [activeTab, setActiveTab] = useState('booking'); // 'booking' | 'agreement' | 'plan' | 'receipts' | 'followups' | 'possession' | 'cancellation'

  // Booking Form State
  const [bookingForm, setBookingForm] = useState({
    bookingAmount: salesLead?.booking?.bookingAmount || 100000,
    bookingDate: salesLead?.booking?.bookingDate ? new Date(salesLead.booking.bookingDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    bookingStatus: salesLead?.booking?.bookingStatus || 'confirmed'
  });

  // Agreement Form State & File Upload
  const [agreementForm, setAgreementForm] = useState({
    agreementNumber: salesLead?.agreement?.agreementNumber || `AGR-${Date.now().toString().slice(-6)}`,
    agreementDate: salesLead?.agreement?.agreementDate ? new Date(salesLead.agreement.agreementDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    verificationStatus: salesLead?.agreement?.verificationStatus || 'verified'
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingAgreement, setUploadingAgreement] = useState(false);

  // Payment Plan Form State
  const [planForm, setPlanForm] = useState({
    type: salesLead?.paymentPlan?.type || 'installment',
    totalAmount: salesLead?.paymentPlan?.totalAmount || 5000000,
    bookingAmount: salesLead?.booking?.bookingAmount || 100000,
    numberOfInstallments: salesLead?.paymentPlan?.numberOfInstallments || 4
  });

  // Payment Recording State
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payForm, setPayForm] = useState({
    installmentNumber: 1,
    paidAmount: 0,
    receiptNumber: ''
  });

  // Demand Letter State
  const [demandModalOpen, setDemandModalOpen] = useState(false);
  const [demandForm, setDemandForm] = useState({
    installmentNumber: 1,
    amountDue: 0,
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
    demandLetterNumber: ''
  });

  // Follow-Up State
  const [fuForm, setFuForm] = useState({
    mode: 'call',
    notes: '',
    nextFollowUpDate: '',
    status: 'pending'
  });

  // Possession State
  const [possessionForm, setPossessionForm] = useState({
    status: salesLead?.possession?.status || 'ready',
    scheduledDate: salesLead?.possession?.scheduledDate ? new Date(salesLead.possession.scheduledDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    remarks: salesLead?.possession?.remarks || 'Keys & Welcome Kit handed over to buyer.'
  });

  // Cancellation State
  const [cancelForm, setCancelForm] = useState({
    reason: 'Buyer relocation / loan rejection',
    cancellationAmount: 50000,
    refundAmount: 50000,
    refundStatus: 'completed',
    refundMethod: 'bank_transfer',
    refundReference: `REF-${Date.now().toString().slice(-6)}`,
    remarks: 'Refund processed via NEFT transfer.'
  });

  if (!salesLead) return null;

  const installments = salesLead.installments || [];
  const receipts = salesLead.receipts || [];
  const demandLetters = salesLead.demandLetters || [];
  const followUps = salesLead.followUps || [];

  const formatINR = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const handleAgreementSubmit = async (e) => {
    e.preventDefault();
    if (selectedFile) {
      setUploadingAgreement(true);
      const formData = new FormData();
      formData.append('agreementFile', selectedFile);
      formData.append('agreementNumber', agreementForm.agreementNumber);
      formData.append('agreementDate', agreementForm.agreementDate);
      formData.append('verificationStatus', agreementForm.verificationStatus);

      try {
        await onUploadAgreementFile(salesLead._id, formData);
        setSelectedFile(null);
      } finally {
        setUploadingAgreement(false);
      }
    } else {
      onUpdateAgreement(salesLead._id, agreementForm);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Sales Lifecycle Manager — ${salesLead.name} (${salesLead.flatId?.flatNumber ? `Flat ${salesLead.flatId.flatNumber}` : 'Unit'})`}
      maxWidth="880px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Top Buyer & Property Hero Card */}
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
              <span style={{ fontSize: '1.2rem', fontWeight: '800', color: '#111827' }}>{salesLead.name}</span>
              <StatusBadge status={salesLead.salesStatus} />
            </div>
            <div style={{ display: 'flex', gap: '14px', fontSize: '0.8rem', color: '#374151', marginTop: '4px', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Phone size={13} color="#10b981" /> {salesLead.mobileNo}
              </span>
              {salesLead.email && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Mail size={13} color="#60a5fa" /> {salesLead.email}
                </span>
              )}
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#c084fc', fontWeight: '600' }}>
                <Home size={13} /> Flat {salesLead.flatId?.flatNumber || 'N/A'} • {salesLead.projectId?.projectName || 'Project'}
              </span>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.72rem', color: '#4b5563' }}>TOTAL DEAL VALUE</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#111827' }}>
              {formatINR(salesLead.paymentPlan?.totalAmount || 0)}
            </div>
          </div>
        </div>

        {/* Tab Switcher Navigation */}
        <div style={{
          display: 'flex',
          background: '#f8f9fa',
          padding: '4px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid #dadce0',
          overflowX: 'auto',
          gap: '4px'
        }}>
          {[
            { id: 'booking', label: '1. Booking', icon: CheckCircle },
            { id: 'agreement', label: '2. Agreement (S3 Upload)', icon: FileText },
            { id: 'plan', label: '3. Payment Plan', icon: CreditCard },
            { id: 'receipts', label: '4. Receipts & Demands', icon: Receipt },
            { id: 'followups', label: '5. Follow-ups', icon: Clock },
            { id: 'possession', label: '6. Possession', icon: Key },
            { id: 'cancellation', label: '7. Cancellation', icon: XCircle }
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
                  padding: '7px 12px',
                  borderRadius: '4px',
                  background: isSelected ? 'linear-gradient(135deg, var(--primary-600), var(--primary-700))' : 'transparent',
                  color: isSelected ? '#fff' : 'var(--text-secondary)',
                  fontWeight: isSelected ? '700' : '500',
                  fontSize: '0.78rem',
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ================= TAB 1: BOOKING ================= */}
        {activeTab === 'booking' && (
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#111827', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle size={16} color="#10b981" /> Unit Booking & Token Verification
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '3px' }}>
                  Booking / Token Amount (₹) *
                </label>
                <input
                  type="number"
                  value={bookingForm.bookingAmount}
                  onChange={(e) => setBookingForm({ ...bookingForm, bookingAmount: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '3px' }}>
                  Booking Date
                </label>
                <input
                  type="date"
                  value={bookingForm.bookingDate}
                  onChange={(e) => setBookingForm({ ...bookingForm, bookingDate: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '3px' }}>
                  Booking Status
                </label>
                <select
                  value={bookingForm.bookingStatus}
                  onChange={(e) => setBookingForm({ ...bookingForm, bookingStatus: e.target.value })}
                  style={{ width: '100%' }}
                >
                  <option value="pending">Pending</option>
                  <option value="payment_pending">Payment Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Universal Sync Notice */}
            <div style={{
              background: bookingForm.bookingStatus === 'confirmed' ? '#f0fdf4' : (bookingForm.bookingStatus === 'cancelled' ? '#fef2f2' : '#f8f9fa'),
              border: `1px solid ${bookingForm.bookingStatus === 'confirmed' ? '#bbf7d0' : (bookingForm.bookingStatus === 'cancelled' ? '#fecaca' : '#dadce0')}`,
              borderRadius: '6px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.76rem',
              color: bookingForm.bookingStatus === 'confirmed' ? '#166534' : (bookingForm.bookingStatus === 'cancelled' ? '#991b1b' : '#4b5563')
            }}>
              {bookingForm.bookingStatus === 'confirmed' ? (
                <CheckCircle2 size={18} color="#16a34a" />
              ) : bookingForm.bookingStatus === 'cancelled' ? (
                <XCircle size={18} color="#dc2626" />
              ) : (
                <AlertCircle size={18} color="#6b7280" />
              )}
              <div>
                {bookingForm.bookingStatus === 'confirmed' ? (
                  <>
                    <strong>Universal Status Synchronization:</strong> Flat {salesLead.flatId?.flatNumber || 'Unit'} is automatically marked as <span style={{ background: '#dcfce7', padding: '1px 6px', borderRadius: '3px', fontWeight: '800' }}>SOLD</span> across Project Inventory, Floor Matrix, CommandCenter, Customer Registry, and Rental Pool.
                  </>
                ) : bookingForm.bookingStatus === 'cancelled' ? (
                  <>
                    <strong>Cancellation & Release:</strong> Saving as Cancelled will automatically release Flat {salesLead.flatId?.flatNumber || 'Unit'} back to <span style={{ background: '#fee2e2', padding: '1px 6px', borderRadius: '3px', fontWeight: '800' }}>AVAILABLE</span> across all modules.
                  </>
                ) : (
                  <>
                    <strong>Booking Status:</strong> Confirming this booking will lock the flat unit and sync the buyer details to the central Owner Customer registry.
                  </>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => onUpdateBooking(salesLead._id, bookingForm)}
                style={{
                  padding: '8px 18px',
                  background: '#1a73e8',
                  color: '#ffffff',
                  fontWeight: '700',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  border: 'none'
                }}
              >
                Confirm & Save Booking
              </button>
            </div>
          </div>
        )}

        {/* ================= TAB 2: AGREEMENT (S3 UPLOAD) ================= */}
        {activeTab === 'agreement' && (
          <form onSubmit={handleAgreementSubmit} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#111827', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={16} color="#60a5fa" /> Builder-Buyer Agreement (BBA) Upload to S3 & Verification
            </h4>

            {/* Current Uploaded Document Status */}
            {salesLead.agreement?.uploaded && salesLead.agreement?.documentUrl && (
              <div style={{
                background: 'rgba(59, 130, 246, 0.12)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileCheck size={24} color="#60a5fa" />
                  <div>
                    <div style={{ fontWeight: '700', color: '#111827', fontSize: '0.85rem' }}>
                      {salesLead.agreement.documentName || 'Agreement Document'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#4b5563' }}>
                      Agreement #{salesLead.agreement.agreementNumber || 'N/A'} • Uploaded {new Date(salesLead.agreement.uploadedAt || Date.now()).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                </div>

                <a
                  href={salesLead.agreement.documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    background: '#2563eb',
                    color: '#111827',
                    borderRadius: '4px',
                    textDecoration: 'none',
                    fontSize: '0.78rem',
                    fontWeight: '700'
                  }}
                >
                  <ExternalLink size={13} /> View Stored Document
                </a>
              </div>
            )}

            {/* Agreement Number & Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '3px' }}>
                  Agreement / Registration Number *
                </label>
                <input
                  type="text"
                  required
                  value={agreementForm.agreementNumber}
                  onChange={(e) => setAgreementForm({ ...agreementForm, agreementNumber: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '3px' }}>
                  Agreement Execution Date
                </label>
                <input
                  type="date"
                  value={agreementForm.agreementDate}
                  onChange={(e) => setAgreementForm({ ...agreementForm, agreementDate: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* S3 File Upload Picker */}
            <div style={{
              border: '2px dashed var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '20px',
              textAlign: 'center',
              background: '#f8f9fa',
              position: 'relative'
            }}>
              <Upload size={32} color="var(--primary-500)" style={{ margin: '0 auto 8px', opacity: 0.8 }} />
              <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>
                {selectedFile ? selectedFile.name : 'Select Agreement Document to Upload to S3'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#4b5563', marginBottom: '10px' }}>
                Supports PDF, DOCX, PNG, JPG (Max 25MB)
              </div>

              <input
                type="file"
                id="agreementFileInput"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
                style={{ display: 'none' }}
              />

              <label
                htmlFor="agreementFileInput"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 16px',
                  background: '#f8f9fa',
                  border: '1px solid #dadce0',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.78rem',
                  color: '#111827',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                <Upload size={13} /> {selectedFile ? 'Change File' : 'Browse Local File'}
              </label>
            </div>

            {/* Verification Status */}
            <div>
              <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '3px' }}>
                Verification Status
              </label>
              <select
                value={agreementForm.verificationStatus}
                onChange={(e) => setAgreementForm({ ...agreementForm, verificationStatus: e.target.value })}
                style={{ width: '100%' }}
              >
                <option value="verified">Verified & Approved</option>
                <option value="under_review">Under Review / Legal Check</option>
                <option value="pending">Pending Upload / Signature</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Submit */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button
                type="submit"
                disabled={uploadingAgreement}
                style={{
                  padding: '8px 20px',
                  background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                  color: '#111827',
                  fontWeight: '700',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: uploadingAgreement ? 'not-allowed' : 'pointer',
                  opacity: uploadingAgreement ? 0.7 : 1
                }}
              >
                <Upload size={14} /> {uploadingAgreement ? 'Uploading to S3...' : (selectedFile ? 'Upload to S3 & Save Agreement' : 'Save Agreement Info')}
              </button>
            </div>
          </form>
        )}

        {/* ================= TAB 3: PAYMENT PLAN & INSTALLMENTS ================= */}
        {activeTab === 'plan' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Generator Form */}
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#111827', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CreditCard size={16} color="#c084fc" /> Decide Payment Plan & Milestones
                </h4>

                <button
                  type="button"
                  onClick={() => {
                    setPayForm({ installmentNumber: 1, paidAmount: 0, receiptNumber: `RCP-${Date.now().toString().slice(-5)}` });
                    setPayModalOpen(true);
                  }}
                  style={{
                    padding: '6px 12px',
                    background: 'linear-gradient(135deg, #10b981, var(--primary-700))',
                    color: '#111827',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={13} /> + Record Payment
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>
                    Plan Type
                  </label>
                  <select
                    value={planForm.type}
                    onChange={(e) => setPlanForm({ ...planForm, type: e.target.value })}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  >
                    <option value="installment">Installment Linked</option>
                    <option value="full_payment">Full Down-Payment</option>
                    <option value="custom">Custom Milestone</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>
                    Total Flat Cost (₹) *
                  </label>
                  <input
                    type="number"
                    value={planForm.totalAmount}
                    onChange={(e) => setPlanForm({ ...planForm, totalAmount: e.target.value })}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>
                    Booking Token (₹)
                  </label>
                  <input
                    type="number"
                    value={planForm.bookingAmount}
                    onChange={(e) => setPlanForm({ ...planForm, bookingAmount: e.target.value })}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>
                    # Installments
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={planForm.numberOfInstallments}
                    onChange={(e) => setPlanForm({ ...planForm, numberOfInstallments: e.target.value })}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => onSetupPaymentPlan(salesLead._id, planForm)}
                  style={{
                    padding: '7px 16px',
                    background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                    color: '#111827',
                    fontWeight: '700',
                    fontSize: '0.8rem',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer'
                  }}
                >
                  Generate Milestone Schedule
                </button>
              </div>
            </div>

            {/* Installments Table */}
            <div>
              <h5 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '8px' }}>
                Installment Schedule Breakdown ({installments.length} Milestones)
              </h5>

              {installments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', background: '#f8f9fa', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-subtle)' }}>
                  <p style={{ fontSize: '0.8rem', color: '#4b5563' }}>No installments generated yet. Click "Generate Milestone Schedule" above.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', background: '#f8f9fa', borderRadius: 'var(--radius-sm)', border: '1px solid #dadce0' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: '#f8f9fa', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: '#4b5563' }}>
                        <th style={{ padding: '8px 12px' }}>#</th>
                        <th style={{ padding: '8px 12px' }}>Due Date</th>
                        <th style={{ padding: '8px 12px' }}>Due Amount</th>
                        <th style={{ padding: '8px 12px' }}>Paid</th>
                        <th style={{ padding: '8px 12px' }}>Remaining</th>
                        <th style={{ padding: '8px 12px' }}>Status</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {installments.map((inst) => (
                        <tr key={inst.installmentNumber} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '8px 12px', fontWeight: '700', color: '#111827' }}>Installment {inst.installmentNumber}</td>
                          <td style={{ padding: '8px 12px', color: '#374151' }}>
                            {new Date(inst.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td style={{ padding: '8px 12px', fontWeight: '700', color: '#111827' }}>{formatINR(inst.amount)}</td>
                          <td style={{ padding: '8px 12px', color: '#10b981', fontWeight: '600' }}>{formatINR(inst.paidAmount || 0)}</td>
                          <td style={{ padding: '8px 12px', color: inst.remainingAmount > 0 ? '#fbbf24' : '#10b981', fontWeight: '600' }}>{formatINR(inst.remainingAmount)}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: '700',
                              textTransform: 'capitalize',
                              background: inst.status === 'paid' ? 'rgba(16, 185, 129, 0.15)' : (inst.status === 'partially_paid' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(251, 191, 36, 0.15)'),
                              color: inst.status === 'paid' ? '#10b981' : (inst.status === 'partially_paid' ? '#60a5fa' : '#fbbf24')
                            }}>
                              {inst.status}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                              {inst.remainingAmount > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPayForm({
                                      installmentNumber: inst.installmentNumber,
                                      paidAmount: inst.remainingAmount,
                                      receiptNumber: `RCP-${Date.now().toString().slice(-5)}`
                                    });
                                    setPayModalOpen(true);
                                  }}
                                  style={{ padding: '4px 8px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer' }}
                                >
                                  Pay
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setDemandForm({
                                    installmentNumber: inst.installmentNumber,
                                    amountDue: inst.remainingAmount || inst.amount,
                                    dueDate: new Date(inst.dueDate).toISOString().slice(0, 10),
                                    demandLetterNumber: `DEM-${Date.now().toString().slice(-5)}`
                                  });
                                  setDemandModalOpen(true);
                                }}
                                style={{ padding: '4px 8px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer' }}
                              >
                                Demand
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 4: RECEIPTS & DEMANDS ================= */}
        {activeTab === 'receipts' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Receipts */}
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#111827', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Receipt size={15} color="#10b981" /> Payment Receipts ({receipts.length})
              </h4>

              {receipts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#4b5563', fontSize: '0.78rem' }}>
                  No payment receipts recorded yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {receipts.map((rcp, idx) => (
                    <div
                      key={rcp._id || idx}
                      style={{
                        background: '#f8f9fa',
                        border: '1px solid #dadce0',
                        borderRadius: 'var(--radius-sm)',
                        padding: '10px 12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '700', color: '#10b981', fontSize: '0.82rem' }}>{rcp.receiptNumber}</div>
                        <div style={{ fontSize: '0.7rem', color: '#4b5563' }}>
                          {new Date(rcp.generatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: '800', color: '#111827', fontSize: '0.9rem' }}>{formatINR(rcp.amount)}</div>
                        <span style={{ fontSize: '0.68rem', color: '#60a5fa' }}>Paid & Verified</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Demand Letters */}
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#111827', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Send size={15} color="#f59e0b" /> Demand Notices ({demandLetters.length})
                </h4>

                <button
                  type="button"
                  onClick={() => {
                    setDemandForm({
                      installmentNumber: 1,
                      amountDue: 500000,
                      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
                      demandLetterNumber: `DEM-${Date.now().toString().slice(-5)}`
                    });
                    setDemandModalOpen(true);
                  }}
                  style={{ padding: '4px 8px', background: '#f8f9fa', color: '#f59e0b', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer' }}
                >
                  + New Demand
                </button>
              </div>

              {demandLetters.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#4b5563', fontSize: '0.78rem' }}>
                  No demand letters issued yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {demandLetters.map((dem, idx) => (
                    <div
                      key={dem._id || idx}
                      style={{
                        background: '#f8f9fa',
                        border: '1px solid #dadce0',
                        borderRadius: 'var(--radius-sm)',
                        padding: '10px 12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '700', color: '#f59e0b', fontSize: '0.82rem' }}>{dem.demandLetterNumber}</div>
                        <div style={{ fontSize: '0.7rem', color: '#4b5563' }}>
                          Inst #{dem.installmentNumber} • Due: {new Date(dem.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: '800', color: '#111827', fontSize: '0.9rem' }}>{formatINR(dem.amountDue)}</div>
                        <span style={{ fontSize: '0.68rem', color: '#fbbf24', textTransform: 'capitalize' }}>{dem.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 5: SALES FOLLOW-UPS ================= */}
        {activeTab === 'followups' && (
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#111827', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={16} color="#60a5fa" /> Sales & Milestone Follow-ups
              </h4>
            </div>

            {/* Quick Follow-Up Add */}
            <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Mode</label>
                  <select
                    value={fuForm.mode}
                    onChange={(e) => setFuForm({ ...fuForm, mode: e.target.value })}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  >
                    <option value="call">Phone Call</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="meeting">Meeting</option>
                    <option value="site_visit">Site Visit</option>
                    <option value="email">Email</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Next Date</label>
                  <input
                    type="datetime-local"
                    value={fuForm.nextFollowUpDate}
                    onChange={(e) => setFuForm({ ...fuForm, nextFollowUpDate: e.target.value })}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Discussion Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Discussed 2nd installment payment timeline..."
                  value={fuForm.notes}
                  onChange={(e) => setFuForm({ ...fuForm, notes: e.target.value })}
                  style={{ width: '100%', fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    onAddFollowUp(salesLead._id, fuForm);
                    setFuForm({ mode: 'call', notes: '', nextFollowUpDate: '', status: 'pending' });
                  }}
                  style={{ padding: '6px 14px', background: 'var(--primary-700)', color: '#111827', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}
                >
                  Log Sales Follow-Up
                </button>
              </div>
            </div>

            {/* Follow-up Stream */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {followUps.map((fu, i) => (
                <div key={fu._id || i} style={{ background: '#f8f9fa', border: '1px solid #dadce0', padding: '10px 12px', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700', color: 'var(--primary-500)', fontSize: '0.8rem', textTransform: 'capitalize' }}>
                      {fu.mode} ({fu.status})
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#4b5563' }}>
                      {new Date(fu.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#111827', marginTop: '4px' }}>{fu.notes}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 6: POSSESSION ================= */}
        {activeTab === 'possession' && (
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#111827', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Key size={16} color="#fbbf24" /> Unit Possession & Key Handover
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '3px' }}>
                  Possession Readiness Status
                </label>
                <select
                  value={possessionForm.status}
                  onChange={(e) => setPossessionForm({ ...possessionForm, status: e.target.value })}
                  style={{ width: '100%' }}
                >
                  <option value="not_ready">Not Ready</option>
                  <option value="ready">Ready for Handover</option>
                  <option value="scheduled">Handover Scheduled</option>
                  <option value="completed">Possession Completed</option>
                  <option value="rejected">Rejected by Buyer</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '3px' }}>
                  Scheduled Handover Date
                </label>
                <input
                  type="date"
                  value={possessionForm.scheduledDate}
                  onChange={(e) => setPossessionForm({ ...possessionForm, scheduledDate: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '3px' }}>
                Handover Remarks / Checklist Notes
              </label>
              <textarea
                rows={2}
                value={possessionForm.remarks}
                onChange={(e) => setPossessionForm({ ...possessionForm, remarks: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => onUpdatePossession(salesLead._id, possessionForm)}
                style={{
                  padding: '8px 18px',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#111827',
                  fontWeight: '700',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer'
                }}
              >
                Update Possession Status
              </button>
            </div>
          </div>
        )}

        {/* ================= TAB 7: CANCELLATION & REFUND ================= */}
        {activeTab === 'cancellation' && (
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <XCircle size={16} /> Unit Cancellation & Customer Refund
            </h4>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '3px' }}>
                Reason for Cancellation *
              </label>
              <input
                type="text"
                value={cancelForm.reason}
                onChange={(e) => setCancelForm({ ...cancelForm, reason: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '3px' }}>
                  Cancellation Penalty Deducted (₹)
                </label>
                <input
                  type="number"
                  value={cancelForm.cancellationAmount}
                  onChange={(e) => setCancelForm({ ...cancelForm, cancellationAmount: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '3px' }}>
                  Refund Amount to Customer (₹)
                </label>
                <input
                  type="number"
                  value={cancelForm.refundAmount}
                  onChange={(e) => setCancelForm({ ...cancelForm, refundAmount: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '3px' }}>
                  Refund Status
                </label>
                <select
                  value={cancelForm.refundStatus}
                  onChange={(e) => setCancelForm({ ...cancelForm, refundStatus: e.target.value })}
                  style={{ width: '100%' }}
                >
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '3px' }}>
                  Refund Method
                </label>
                <select
                  value={cancelForm.refundMethod}
                  onChange={(e) => setCancelForm({ ...cancelForm, refundMethod: e.target.value })}
                  style={{ width: '100%' }}
                >
                  <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                  <option value="upi">UPI</option>
                  <option value="cheque">Cheque</option>
                  <option value="cash">Cash</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '3px' }}>
                  Refund Transaction Ref #
                </label>
                <input
                  type="text"
                  value={cancelForm.refundReference}
                  onChange={(e) => setCancelForm({ ...cancelForm, refundReference: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => onProcessCancellation(salesLead._id, cancelForm)}
                style={{
                  padding: '8px 18px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid #ef4444',
                  color: '#ef4444',
                  fontWeight: '700',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer'
                }}
              >
                Execute Cancellation & Release Flat
              </button>
            </div>
          </div>
        )}

      </div>

      {/* RECORD PAYMENT MODAL */}
      {payModalOpen && (
        <Modal
          isOpen={payModalOpen}
          onClose={() => setPayModalOpen(false)}
          title={`Record Installment #${payForm.installmentNumber} Payment`}
          maxWidth="460px"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onRecordPayment(salesLead._id, payForm);
              setPayModalOpen(false);
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            <div>
              <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '3px' }}>
                Payment Amount (₹) *
              </label>
              <input
                type="number"
                required
                value={payForm.paidAmount}
                onChange={(e) => setPayForm({ ...payForm, paidAmount: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '3px' }}>
                Receipt Number
              </label>
              <input
                type="text"
                value={payForm.receiptNumber}
                onChange={(e) => setPayForm({ ...payForm, receiptNumber: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <button type="button" onClick={() => setPayModalOpen(false)} style={{ padding: '6px 14px', background: '#f8f9fa', color: '#374151', borderRadius: '4px' }}>
                Cancel
              </button>
              <button type="submit" style={{ padding: '6px 16px', background: '#10b981', color: '#111827', fontWeight: '700', borderRadius: '4px', cursor: 'pointer' }}>
                Save Payment & Generate Receipt
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* GENERATE DEMAND LETTER MODAL */}
      {demandModalOpen && (
        <Modal
          isOpen={demandModalOpen}
          onClose={() => setDemandModalOpen(false)}
          title={`Issue Demand Notice — Installment #${demandForm.installmentNumber}`}
          maxWidth="460px"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onGenerateDemandLetter(salesLead._id, demandForm);
              setDemandModalOpen(false);
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            <div>
              <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '3px' }}>
                Demand Letter #
              </label>
              <input
                type="text"
                value={demandForm.demandLetterNumber}
                onChange={(e) => setDemandForm({ ...demandForm, demandLetterNumber: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '3px' }}>
                  Amount Due (₹) *
                </label>
                <input
                  type="number"
                  required
                  value={demandForm.amountDue}
                  onChange={(e) => setDemandForm({ ...demandForm, amountDue: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '3px' }}>
                  Payment Due Date *
                </label>
                <input
                  type="date"
                  required
                  value={demandForm.dueDate}
                  onChange={(e) => setDemandForm({ ...demandForm, dueDate: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <button type="button" onClick={() => setDemandModalOpen(false)} style={{ padding: '6px 14px', background: '#f8f9fa', color: '#374151', borderRadius: '4px' }}>
                Cancel
              </button>
              <button type="submit" style={{ padding: '6px 16px', background: '#f59e0b', color: '#111827', fontWeight: '700', borderRadius: '4px', cursor: 'pointer' }}>
                Issue Demand Letter
              </button>
            </div>
          </form>
        </Modal>
      )}
    </Modal>
  );
};
