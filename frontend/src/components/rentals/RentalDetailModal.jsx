import React, { useState } from 'react';
import { Modal } from '../common/Modal.jsx';
import { StatusBadge } from '../common/StatusBadge.jsx';
import { 
  Building2, 
  Home, 
  User, 
  Phone, 
  DollarSign, 
  Calendar, 
  Repeat, 
  FileText, 
  Upload, 
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  TrendingUp,
  CreditCard
} from 'lucide-react';

export const RentalDetailModal = ({
  isOpen,
  onClose,
  contract,
  onUpdateAllocation,
  onUploadTenantAgreementDoc,
  onUploadRentBackDoc,
  onRecordDepositPayment,
  onTerminateContract,
  onUpdateRentBack,
  onUpdateTenant
}) => {
  const [activeTab, setActiveTab] = useState('rentback'); // 'rentback' | 'ledger'
  const [rentBackFile, setRentBackFile] = useState(null);
  const [uploadingRentBack, setUploadingRentBack] = useState(false);

  if (!contract) return null;

  const rentBack = contract.rentBack || {};
  const flat = contract.flatId || {};
  const owner = contract.ownerId || {};
  const customerName = contract.customerName || owner.name || flat.currentOwner?.name || 'Registered Owner';
  const customerMobile = contract.customerMobile || owner.mobileNo || flat.currentOwner?.mobileNo || '';
  const flatNumber = flat.flatNumber || '001';
  const floorNumber = contract.floorNum !== undefined ? contract.floorNum : (flat.floor !== undefined ? flat.floor : (parseInt(flatNumber.replace(/\D/g, ''), 10) >= 100 ? Math.floor(parseInt(flatNumber.replace(/\D/g, ''), 10) / 100) : 0));
  const towerName = contract.towerName || contract.projectId?.buildings?.[0]?.buildingName || 'Tower A';

  const isTdsEnabled = rentBack.applyTds !== false;
  const tdsPercentage = isTdsEnabled ? (rentBack.tdsPercentage !== undefined ? Number(rentBack.tdsPercentage) : 10) : 0;
  const grossRent = Number(rentBack.monthlyRent || 31000);
  const tdsAmount = Math.round(grossRent * (tdsPercentage / 100));
  const netRent = grossRent - tdsAmount;
  const tenure = Number(rentBack.tenureMonths) || 36;
  const totalTenureAmount = netRent * tenure;

  const formatINR = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '₹0';
    return '₹' + Number(val).toLocaleString('en-IN');
  };

  const handleRentBackDocSubmit = async (e) => {
    e.preventDefault();
    if (!rentBackFile) return;
    setUploadingRentBack(true);
    try {
      const formData = new FormData();
      formData.append('document', rentBackFile);
      await onUploadRentBackDoc(contract._id, formData);
      setRentBackFile(null);
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingRentBack(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Rent-Back Agreement — Flat ${flatNumber} (${towerName})`}
      maxWidth="840px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Header Summary Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: '#ecfdf5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '800'
              }}>
                <User size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
                  {customerName}
                </h3>
                {customerMobile && (
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    📞 {customerMobile}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', fontSize: '0.78rem', color: '#475569' }}>
              <span style={{ color: '#2563eb', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '700' }}>
                <Home size={14} /> Flat {flatNumber}
              </span>
              <span>•</span>
              <span style={{ color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '700' }}>
                <Building2 size={14} /> {towerName}
              </span>
              <span>•</span>
              <span>
                Floor: <strong>{floorNumber === 0 ? 'Ground Floor' : `Floor ${floorNumber}`}</strong>
              </span>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
              Monthly Net Payout
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#16a34a' }}>
              {formatINR(netRent)} <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>/ mo</span>
            </div>
            <span style={{ fontSize: '0.7rem', color: isTdsEnabled ? '#059669' : '#64748b', fontWeight: '700' }}>
              {isTdsEnabled ? `Net of ${tdsPercentage}% TDS (Gross: ${formatINR(grossRent)})` : '100% Gross Payout (No TDS)'}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          background: '#f8f9fa',
          padding: '4px',
          borderRadius: '8px',
          border: '1px solid #dadce0',
          gap: '6px'
        }}>
          {[
            { id: 'rentback', label: '1. Guaranteed Rent-Back Contract & Terms', icon: Repeat },
            { id: 'ledger', label: '2. 36-Month Payout Schedule & Ledger', icon: Calendar }
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
                  color: isSelected ? '#ffffff' : '#4b5563',
                  fontWeight: isSelected ? '800' : '600',
                  fontSize: '0.82rem',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ================= TAB 1: RENT-BACK TERMS ================= */}
        {activeTab === 'rentback' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Financial Payout Breakdown Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Gross Rent</span>
                <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#7c3aed', marginTop: '2px' }}>
                  {formatINR(grossRent)} / mo
                </div>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Agreed rate</span>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>TDS Withholding</span>
                <div style={{ fontSize: '1.15rem', fontWeight: '800', color: isTdsEnabled ? '#ef4444' : '#059669', marginTop: '2px' }}>
                  {isTdsEnabled ? `- ${formatINR(tdsAmount)} (${tdsPercentage}%)` : '0% (Exempt)'}
                </div>
                <span style={{ fontSize: '0.7rem', color: isTdsEnabled ? '#b91c1c' : '#059669' }}>
                  {isTdsEnabled ? 'Tax deduction' : 'Full disbursement'}
                </span>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.72rem', color: '#047857', fontWeight: '700', textTransform: 'uppercase' }}>Net Monthly Transfer</span>
                <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#16a34a', marginTop: '2px' }}>
                  {formatINR(netRent)} / mo
                </div>
                <span style={{ fontSize: '0.7rem', color: '#15803d' }}>NEFT to Bank</span>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Payout Due Day</span>
                <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                  Day {rentBack.rentDueDay || 25}
                </div>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Every month</span>
              </div>
            </div>

            {/* Contract Dates & Commitment */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '14px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Contract Tenure</span>
                <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                  {tenure} Months ({rentBack.startDate ? new Date(rentBack.startDate).toLocaleDateString('en-IN') : 'Start'} ➔ {rentBack.endDate ? new Date(rentBack.endDate).toLocaleDateString('en-IN') : 'End'})
                </div>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Agreement #: <strong>{rentBack.agreementNumber || `MOU-${contract._id.slice(-6).toUpperCase()}`}</strong>
                </span>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>36-Month Assured Return Total</span>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                  {formatINR(totalTenureAmount)}
                </div>
              </div>
            </div>

            {/* S3 Rent-Back Document Management */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '14px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#0f172a' }}>
                📄 Guaranteed Rent-Back MOU / Agreement Document:
              </span>

              {rentBack.agreementDocument?.fileUrl ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: '700' }}>
                    {rentBack.agreementDocument.fileName || 'Rent_Back_Agreement.pdf'}
                  </div>
                  <a
                    href={rentBack.agreementDocument.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 14px',
                      background: '#1a73e8',
                      color: '#ffffff',
                      borderRadius: '5px',
                      textDecoration: 'none',
                      fontSize: '0.78rem',
                      fontWeight: '700'
                    }}
                  >
                    <ExternalLink size={13} /> View S3 Document
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
                    style={{ padding: '7px 14px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer', color: '#334155', fontWeight: '600' }}
                  >
                    <Upload size={13} /> {rentBackFile ? rentBackFile.name : 'Choose Rent-Back MOU Document (PDF)'}
                  </label>
                  <button
                    type="submit"
                    disabled={!rentBackFile || uploadingRentBack}
                    style={{ padding: '7px 16px', background: '#16a34a', color: '#ffffff', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer', border: 'none' }}
                  >
                    {uploadingRentBack ? 'Uploading...' : 'Upload MOU to S3'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 2: 36-MONTH PAYOUT SCHEDULE ================= */}
        {activeTab === 'ledger' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: '800', color: '#0f172a' }}>
                36-Month Payout Ledger (Monthly Developer Transfers)
              </h4>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                Due Day: <strong>Day {rentBack.rentDueDay || 25}</strong> of each month
              </span>
            </div>

            <div style={{ maxHeight: '340px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, borderBottom: '1px solid #e2e8f0' }}>
                  <tr>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>#</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Payout Date</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Gross Rent</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>TDS Withheld</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Net Payout</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 36 }, (_, i) => {
                    const mNum = i + 1;
                    const d = new Date(rentBack.startDate ? new Date(rentBack.startDate) : new Date());
                    d.setMonth(d.getMonth() + i);
                    d.setDate(rentBack.rentDueDay || 25);
                    const isPassed = d <= new Date();

                    return (
                      <tr key={mNum} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px', fontWeight: '700', color: '#64748b' }}>Month {mNum}</td>
                        <td style={{ padding: '8px 12px', color: '#0f172a', fontWeight: '600' }}>
                          {d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#7c3aed', fontWeight: '700' }}>
                          {formatINR(grossRent)}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: isTdsEnabled ? '#ef4444' : '#059669', fontWeight: '600' }}>
                          {isTdsEnabled ? `- ${formatINR(tdsAmount)}` : '₹0'}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#16a34a', fontWeight: '800' }}>
                          {formatINR(netRent)}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.68rem',
                            fontWeight: '800',
                            background: isPassed ? '#ecfdf5' : '#f8fafc',
                            color: isPassed ? '#059669' : '#64748b',
                            border: isPassed ? '1px solid #a7f3d0' : '1px solid #e2e8f0'
                          }}>
                            {isPassed ? 'DISBURSED' : 'UPCOMING'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
};
