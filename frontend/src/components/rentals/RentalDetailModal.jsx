import React, { useState } from 'react';
import { Modal } from '../common/Modal.jsx';
import { StatusBadge } from '../common/StatusBadge.jsx';
import { 
  Building2, 
  Home, 
  User, 
  Phone, 
  Mail, 
  Repeat, 
  FileText, 
  DollarSign, 
  ShieldCheck, 
  Calendar, 
  Clock, 
  ExternalLink, 
  Upload, 
  Plus, 
  TrendingUp, 
  Key, 
  XCircle,
  ArrowRight,
  CheckCircle2,
  CheckCircle
} from 'lucide-react';

export const RentalDetailModal = ({
  isOpen,
  onClose,
  contract,
  onUploadRentBackDoc,
  onUploadTenantAgreementDoc,
  onUpdateAllocation,
  onRecordDepositPayment,
  onTerminateContract
}) => {
  const [activeTab, setActiveTab] = useState('allocation'); // 'allocation' | 'rentback' | 'deposits' | 'financials'

  // Document Upload State
  const [rentBackFile, setRentBackFile] = useState(null);
  const [uploadingRentBack, setUploadingRentBack] = useState(false);

  const [tenantFile, setTenantFile] = useState(null);
  const [uploadingTenantDoc, setUploadingTenantDoc] = useState(false);

  // Deposit Payment Modal State
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [depositPaymentType, setDepositPaymentType] = useState('tenant'); // 'tenant' | 'owner'
  const [depositAmount, setDepositAmount] = useState(0);

  if (!contract) return null;

  const rentBack = contract.rentBack || {};
  const tenantAgreement = contract.tenantAgreement || {};
  const allocation = contract.allocation || {};
  const deposits = contract.securityDeposit || {};

  const tenantDeposit = deposits.tenantDeposit || {};
  const ownerDeposit = deposits.ownerDeposit || {};

  const tenantRent = tenantAgreement.monthlyRent || 0;
  const ownerRent = rentBack.enabled ? (rentBack.monthlyRent || 0) : 0;
  const netMonthlySpread = tenantRent - ownerRent;

  const formatINR = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const handleRentBackDocSubmit = async (e) => {
    e.preventDefault();
    if (!rentBackFile) return;
    setUploadingRentBack(true);
    const formData = new FormData();
    formData.append('agreementFile', rentBackFile);

    try {
      await onUploadRentBackDoc(contract._id, formData);
      setRentBackFile(null);
    } finally {
      setUploadingRentBack(false);
    }
  };

  const handleTenantDocSubmit = async (e) => {
    e.preventDefault();
    if (!tenantFile) return;
    setUploadingTenantDoc(true);
    const formData = new FormData();
    formData.append('agreementFile', tenantFile);

    try {
      await onUploadTenantAgreementDoc(contract._id, formData);
      setTenantFile(null);
    } finally {
      setUploadingTenantDoc(false);
    }
  };

  const customerName = contract.customerName || contract.ownerId?.name || contract.flatId?.currentOwner?.name || contract.tenantAgreement?.tenantName || 'Customer';
  const customerMobile = contract.customerMobile || contract.ownerId?.mobileNo || contract.flatId?.currentOwner?.mobileNo || '';
  const flatNumber = contract.flatId?.flatNumber || '001';
  const floorNumber = contract.floorNum !== undefined ? contract.floorNum : (contract.flatId?.floor !== undefined ? contract.flatId.floor : 0);
  const towerName = contract.towerName || contract.projectId?.buildings?.[0]?.buildingName || 'Tower A';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Rental Agreement: Flat ${flatNumber} — ${customerName}`}
      maxWidth="880px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Top Hero Card: Customer, Tower, Floor, Flat */}
        <div style={{
          background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
          border: '1.5px solid #e2e8f0',
          borderRadius: '10px',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>
                {customerName}
              </span>
              <StatusBadge status={contract.status} />
              <span style={{ fontSize: '0.72rem', background: '#ecfdf5', color: '#059669', padding: '3px 8px', borderRadius: '4px', fontWeight: '800', border: '1px solid #a7f3d0' }}>
                3-YEAR RENT-BACK
              </span>
            </div>

            {/* Property Unit Specification (Tower, Floor, Flat No) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.84rem', color: '#334155', marginTop: '6px', flexWrap: 'wrap', fontWeight: '700' }}>
              <span style={{ color: '#2563eb', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Home size={15} /> Flat {flatNumber}
              </span>
              <span>•</span>
              <span style={{ color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Building2 size={15} /> {towerName}
              </span>
              <span>•</span>
              <span style={{ color: '#475569' }}>
                Floor Level: Floor {floorNumber}
              </span>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Monthly Guaranteed Rent</div>
            <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#16a34a' }}>
              {formatINR(rentBack.monthlyRent || tenantAgreement.monthlyRent || 31000)} <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>/ mo</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
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
            { id: 'allocation', label: '1. Tenant Lease & Allocation', icon: Home },
            { id: 'rentback', label: '2. Owner Rent-Back Agreement', icon: Repeat },
            { id: 'deposits', label: '3. Security Deposits Ledger', icon: ShieldCheck },
            { id: 'financials', label: '4. Revenue & Margin Analysis', icon: TrendingUp }
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
                  padding: '7px 14px',
                  borderRadius: '4px',
                  background: isSelected ? 'linear-gradient(135deg, var(--primary-600), var(--primary-700))' : 'transparent',
                  color: isSelected ? '#fff' : 'var(--text-secondary)',
                  fontWeight: isSelected ? '700' : '500',
                  fontSize: '0.8rem',
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ================= TAB 1: TENANT LEASE & ALLOCATION ================= */}
        {activeTab === 'allocation' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Home size={15} /> Tenant Lease Terms & Occupancy Status
                </h4>

                <select
                  value={allocation.status || 'occupied'}
                  onChange={(e) => onUpdateAllocation(contract._id, { status: e.target.value })}
                  style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                >
                  <option value="occupied">Occupied (Resident In)</option>
                  <option value="allocated">Allocated</option>
                  <option value="reserved">Reserved</option>
                  <option value="vacated">Vacated</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '4px', border: '1px solid #dadce0' }}>
                  <span style={{ fontSize: '0.7rem', color: '#4b5563' }}>Tenant Rent</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#10b981', marginTop: '2px' }}>
                    {formatINR(tenantAgreement.monthlyRent)} / mo
                  </div>
                </div>

                <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '4px', border: '1px solid #dadce0' }}>
                  <span style={{ fontSize: '0.7rem', color: '#4b5563' }}>Rent Due Day</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111827', marginTop: '2px' }}>
                    Day {tenantAgreement.rentDueDay || 5}
                  </div>
                </div>

                <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '4px', border: '1px solid #dadce0' }}>
                  <span style={{ fontSize: '0.7rem', color: '#4b5563' }}>Agreement #</span>
                  <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#60a5fa', marginTop: '2px' }}>
                    {tenantAgreement.agreementNumber || 'N/A'}
                  </div>
                </div>

                <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '4px', border: '1px solid #dadce0' }}>
                  <span style={{ fontSize: '0.7rem', color: '#4b5563' }}>Lease Period</span>
                  <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#111827', marginTop: '4px' }}>
                    {tenantAgreement.startDate ? new Date(tenantAgreement.startDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'Start'} to {tenantAgreement.endDate ? new Date(tenantAgreement.endDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'End'}
                  </div>
                </div>
              </div>

              {/* S3 Tenant Agreement Document */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#111827' }}>Tenant Agreement S3 Document:</span>
                
                {tenantAgreement.agreementDocument?.fileUrl ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f9fa', padding: '10px 12px', borderRadius: '4px' }}>
                    <div style={{ fontSize: '0.8rem', color: '#111827', fontWeight: '600' }}>
                      {tenantAgreement.agreementDocument.fileName || 'Tenant_Agreement.pdf'}
                    </div>
                    <a
                      href={tenantAgreement.agreementDocument.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: '#2563eb', color: '#111827', borderRadius: '4px', textDecoration: 'none', fontSize: '0.75rem', fontWeight: '700' }}
                    >
                      <ExternalLink size={12} /> View S3 Document
                    </a>
                  </div>
                ) : (
                  <form onSubmit={handleTenantDocSubmit} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="file"
                      id="tenantDocFile"
                      onChange={(e) => setTenantFile(e.target.files?.[0] || null)}
                      style={{ display: 'none' }}
                    />
                    <label
                      htmlFor="tenantDocFile"
                      style={{ padding: '6px 12px', background: '#f8f9fa', border: '1px solid #dadce0', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', color: '#374151' }}
                    >
                      <Upload size={12} /> {tenantFile ? tenantFile.name : 'Choose Tenant Lease PDF'}
                    </label>
                    <button
                      type="submit"
                      disabled={!tenantFile || uploadingTenantDoc}
                      style={{ padding: '6px 14px', background: '#3b82f6', color: '#111827', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}
                    >
                      {uploadingTenantDoc ? 'Uploading...' : 'Upload to S3'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: OWNER RENT-BACK ================= */}
        {activeTab === 'rentback' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Repeat size={15} /> Rent-Back Agreement (Company Guarantee to Owner)
                </h4>
                <StatusBadge status={rentBack.status || 'active'} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '4px', border: '1px solid #dadce0' }}>
                  <span style={{ fontSize: '0.7rem', color: '#4b5563' }}>Owner Payout</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#c084fc', marginTop: '2px' }}>
                    {formatINR(rentBack.monthlyRent)} / mo
                  </div>
                </div>

                <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '4px', border: '1px solid #dadce0' }}>
                  <span style={{ fontSize: '0.7rem', color: '#4b5563' }}>Payout Due Day</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111827', marginTop: '2px' }}>
                    Day {rentBack.rentDueDay || 5}
                  </div>
                </div>

                <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '4px', border: '1px solid #dadce0' }}>
                  <span style={{ fontSize: '0.7rem', color: '#4b5563' }}>Agreement #</span>
                  <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#c084fc', marginTop: '2px' }}>
                    {rentBack.agreementNumber || 'N/A'}
                  </div>
                </div>

                <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '4px', border: '1px solid #dadce0' }}>
                  <span style={{ fontSize: '0.7rem', color: '#4b5563' }}>Contract Term</span>
                  <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#111827', marginTop: '4px' }}>
                    {rentBack.startDate ? new Date(rentBack.startDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'Start'} to {rentBack.endDate ? new Date(rentBack.endDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'End'}
                  </div>
                </div>
              </div>

              {/* S3 Rent-Back Agreement Document */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#111827' }}>Owner Rent-Back S3 Document:</span>
                
                {rentBack.agreementDocument?.fileUrl ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f9fa', padding: '10px 12px', borderRadius: '4px' }}>
                    <div style={{ fontSize: '0.8rem', color: '#111827', fontWeight: '600' }}>
                      {rentBack.agreementDocument.fileName || 'Rent_Back_Agreement.pdf'}
                    </div>
                    <a
                      href={rentBack.agreementDocument.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: '#7c3aed', color: '#111827', borderRadius: '4px', textDecoration: 'none', fontSize: '0.75rem', fontWeight: '700' }}
                    >
                      <ExternalLink size={12} /> View S3 Document
                    </a>
                  </div>
                ) : (
                  <form onSubmit={handleRentBackDocSubmit} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="file"
                      id="rentBackDocFile"
                      onChange={(e) => setRentBackFile(e.target.files?.[0] || null)}
                      style={{ display: 'none' }}
                    />
                    <label
                      htmlFor="rentBackDocFile"
                      style={{ padding: '6px 12px', background: '#f8f9fa', border: '1px solid #dadce0', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', color: '#374151' }}
                    >
                      <Upload size={12} /> {rentBackFile ? rentBackFile.name : 'Choose Rent-Back PDF'}
                    </label>
                    <button
                      type="submit"
                      disabled={!rentBackFile || uploadingRentBack}
                      style={{ padding: '6px 14px', background: '#8b5cf6', color: '#111827', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}
                    >
                      {uploadingRentBack ? 'Uploading...' : 'Upload to S3'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: DUAL SECURITY DEPOSITS ================= */}
        {activeTab === 'deposits' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Tenant Deposit */}
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: '800', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={15} /> Tenant Security Deposit
                </h4>
                <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: tenantDeposit.status === 'paid' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(251, 191, 36, 0.2)', color: tenantDeposit.status === 'paid' ? '#10b981' : '#fbbf24', textTransform: 'uppercase', fontWeight: '700' }}>
                  {tenantDeposit.status || 'pending'}
                </span>
              </div>

              <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: '#4b5563' }}>Required:</span>
                  <strong style={{ color: '#111827' }}>{formatINR(tenantDeposit.requiredAmount || 0)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: '#4b5563' }}>Paid to Date:</span>
                  <strong style={{ color: '#10b981' }}>{formatINR(tenantDeposit.paidAmount || 0)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: '#4b5563' }}>Outstanding:</span>
                  <strong style={{ color: tenantDeposit.outstandingAmount > 0 ? '#fbbf24' : '#10b981' }}>{formatINR(tenantDeposit.outstandingAmount || 0)}</strong>
                </div>
              </div>

              {tenantDeposit.outstandingAmount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setDepositPaymentType('tenant');
                    setDepositAmount(tenantDeposit.outstandingAmount);
                    setDepositModalOpen(true);
                  }}
                  style={{ padding: '6px 12px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}
                >
                  + Record Tenant Deposit Payment
                </button>
              )}
            </div>

            {/* Owner Deposit */}
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: '800', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={15} /> Owner Rent-Back Deposit
                </h4>
                <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: ownerDeposit.status === 'paid' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(251, 191, 36, 0.2)', color: ownerDeposit.status === 'paid' ? '#10b981' : '#fbbf24', textTransform: 'uppercase', fontWeight: '700' }}>
                  {ownerDeposit.status || 'pending'}
                </span>
              </div>

              <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: '#4b5563' }}>Required:</span>
                  <strong style={{ color: '#111827' }}>{formatINR(ownerDeposit.requiredAmount || 0)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: '#4b5563' }}>Paid to Owner:</span>
                  <strong style={{ color: '#c084fc' }}>{formatINR(ownerDeposit.paidAmount || 0)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: '#4b5563' }}>Outstanding:</span>
                  <strong style={{ color: ownerDeposit.outstandingAmount > 0 ? '#fbbf24' : '#10b981' }}>{formatINR(ownerDeposit.outstandingAmount || 0)}</strong>
                </div>
              </div>

              {ownerDeposit.outstandingAmount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setDepositPaymentType('owner');
                    setDepositAmount(ownerDeposit.outstandingAmount);
                    setDepositModalOpen(true);
                  }}
                  style={{ padding: '6px 12px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}
                >
                  + Record Owner Deposit Payout
                </button>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 4: FINANCIAL SPREAD ANALYSIS ================= */}
        {activeTab === 'financials' && (
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingUp size={16} /> Revenue, Cost & Net Margin Spread
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '4px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                <span style={{ fontSize: '0.72rem', color: '#4b5563' }}>Gross Monthly Inflow (Tenant)</span>
                <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#60a5fa', marginTop: '2px' }}>
                  +{formatINR(tenantRent)}
                </div>
              </div>

              <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '4px', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                <span style={{ fontSize: '0.72rem', color: '#4b5563' }}>Monthly Outflow (Owner Payout)</span>
                <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#c084fc', marginTop: '2px' }}>
                  -{formatINR(ownerRent)}
                </div>
              </div>

              <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <span style={{ fontSize: '0.72rem', color: '#4b5563' }}>Net Spread Profit</span>
                <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#10b981', marginTop: '2px' }}>
                  +{formatINR(netMonthlySpread)} / mo
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
              <span style={{ fontSize: '0.8rem', color: '#4b5563' }}>
                Annualized Net Revenue Spread: <strong style={{ color: '#111827' }}>{formatINR(netMonthlySpread * 12)} / year</strong>
              </span>

              {contract.status !== 'terminated' && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Terminate this rental contract and mark unit vacated?')) {
                      onTerminateContract(contract._id);
                    }
                  }}
                  style={{ padding: '6px 14px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}
                >
                  Terminate Contract & Vacate
                </button>
              )}
            </div>
          </div>
        )}

      </div>

      {/* RECORD DEPOSIT PAYMENT MODAL */}
      {depositModalOpen && (
        <Modal
          isOpen={depositModalOpen}
          onClose={() => setDepositModalOpen(false)}
          title={`Record ${depositPaymentType === 'tenant' ? 'Tenant Deposit Receipt' : 'Owner Deposit Payout'}`}
          maxWidth="420px"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onRecordDepositPayment(contract._id, {
                type: depositPaymentType,
                paidAmount: Number(depositAmount)
              });
              setDepositModalOpen(false);
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
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" onClick={() => setDepositModalOpen(false)} style={{ padding: '6px 12px', background: '#f8f9fa', color: '#374151', borderRadius: '4px' }}>
                Cancel
              </button>
              <button type="submit" style={{ padding: '6px 16px', background: '#10b981', color: '#111827', fontWeight: '700', borderRadius: '4px', cursor: 'pointer' }}>
                Confirm Payment
              </button>
            </div>
          </form>
        </Modal>
      )}
    </Modal>
  );
};
