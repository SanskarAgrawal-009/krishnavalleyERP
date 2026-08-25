import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { maintenanceService } from '../../services/maintenanceService.js';
import { NewBillModal } from '../../components/maintenance/NewBillModal.jsx';
import { NewServiceRequestModal } from '../../components/maintenance/NewServiceRequestModal.jsx';
import { NewPenaltyModal } from '../../components/maintenance/NewPenaltyModal.jsx';
import { ServiceRequestDetailModal } from '../../components/maintenance/ServiceRequestDetailModal.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { StatusBadge } from '../../components/common/StatusBadge.jsx';

import {
  Wrench,
  DollarSign,
  AlertTriangle,
  Receipt,
  Plus,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  User,
  Home,
  FileText,
  TrendingUp,
  XCircle,
  Building2,
  Eye,
  Upload,
  Check,
  Copy,
  AlertCircle
} from 'lucide-react';

export const MaintenancePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  
  const getTabFromParam = (param) => {
    if (param === 'tickets' || param === 'services') return 'services';
    if (param === 'penalties') return 'penalties';
    return 'bills';
  };

  const [activeTab, setActiveTab] = useState(getTabFromParam(tabParam));

  useEffect(() => {
    setActiveTab(getTabFromParam(tabParam));
  }, [tabParam]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab === 'services' ? 'tickets' : newTab });
  };

  // 1. Bills State
  const [bills, setBills] = useState([]);
  const [billSearch, setBillSearch] = useState('');
  const [billStatusFilter, setBillStatusFilter] = useState('');
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);

  // Bill Pay & Proof State
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedBillForPay, setSelectedBillForPay] = useState(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState('upi');
  const [utrNumber, setUtrNumber] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [paymentRemarks, setPaymentRemarks] = useState('');
  const [submittingPay, setSubmittingPay] = useState(false);

  // Admin / Accountant Verification Modal State
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [selectedBillForVerify, setSelectedBillForVerify] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [verifying, setVerifying] = useState(false);

  // 2. Service Requests State
  const [serviceRequests, setServiceRequests] = useState([]);
  const [srStatusFilter, setSrStatusFilter] = useState('');
  const [srCategoryFilter, setSrCategoryFilter] = useState('');
  const [isNewSrModalOpen, setIsNewSrModalOpen] = useState(false);
  const [selectedSr, setSelectedSr] = useState(null);
  const [isSrDetailModalOpen, setIsSrDetailModalOpen] = useState(false);

  // 3. Penalties State
  const [penalties, setPenalties] = useState([]);
  const [penaltyStatusFilter, setPenaltyStatusFilter] = useState('');
  const [isNewPenaltyModalOpen, setIsNewPenaltyModalOpen] = useState(false);

  const [loading, setLoading] = useState(false);

  const { user: currentUser } = useAuth();
  const userRole = currentUser?.role?.roleCode || currentUser?.roleCode || currentUser?.role || '';
  const isAdminOrAccountant = ['admin', 'accounts_head', 'finance_manager', 'super_admin', 'general_manager'].includes(userRole);

  // Fetch Bills
  const fetchBills = async () => {
    try {
      const params = {};
      if (billStatusFilter) params.paymentStatus = billStatusFilter;
      const res = await maintenanceService.getBills(params);
      if (res.data) setBills(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Service Requests
  const fetchServiceRequests = async () => {
    try {
      const params = {};
      if (srStatusFilter) params.status = srStatusFilter;
      if (srCategoryFilter) params.category = srCategoryFilter;
      const res = await maintenanceService.getServiceRequests(params);
      if (res.data) setServiceRequests(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Penalties
  const fetchPenalties = async () => {
    try {
      const params = {};
      if (penaltyStatusFilter) params.paymentStatus = penaltyStatusFilter;
      const res = await maintenanceService.getPenalties(params);
      if (res.data) setPenalties(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadAll = () => {
    setLoading(true);
    Promise.all([fetchBills(), fetchServiceRequests(), fetchPenalties()]).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAll();
  }, [billStatusFilter, srStatusFilter, srCategoryFilter, penaltyStatusFilter]);

  // Handlers
  const handleSaveBill = async (data) => {
    try {
      await maintenanceService.createBill(data);
      alert('Maintenance bill issued successfully!');
      setIsBillModalOpen(false);
      fetchBills();
    } catch (err) {
      alert(err.message || 'Failed to issue bill');
    }
  };

  const handleBatchGenerateBills = async (data) => {
    try {
      const res = await maintenanceService.batchGenerateBills(data);
      alert(res.message || 'Batch maintenance bills generated successfully!');
      setIsBillModalOpen(false);
      fetchBills();
    } catch (err) {
      alert(err.message || 'Failed to generate batch bills');
    }
  };

  const handleOpenPay = (bill) => {
    setSelectedBillForPay(bill);
    setPayAmount(bill.balanceAmount || bill.totalAmount);
    setPayMethod(bill.paymentMethod || 'upi');
    setUtrNumber(bill.utrNumber || '');
    setProofFile(null);
    setPaymentRemarks(bill.remarks || '');
    setPayModalOpen(true);
  };

  const handleConfirmPayment = async (e) => {
    e.preventDefault();
    if (!selectedBillForPay) return;
    if (!utrNumber.trim()) {
      alert('Payment UTR / Transaction Reference number is mandatory.');
      return;
    }
    if (!proofFile && !selectedBillForPay.proofFileUrl) {
      alert('Please upload payment receipt / bill proof (Image, PDF, JPG).');
      return;
    }

    setSubmittingPay(true);
    try {
      const formData = new FormData();
      formData.append('paidAmount', payAmount);
      formData.append('paymentMethod', payMethod);
      formData.append('utrNumber', utrNumber.trim());
      formData.append('remarks', paymentRemarks);
      if (proofFile) {
        formData.append('proofFile', proofFile);
      }

      const res = await maintenanceService.recordBillPayment(selectedBillForPay._id, formData);
      alert(res.message || 'Payment proof and UTR submitted successfully!');
      setPayModalOpen(false);
      fetchBills();
    } catch (err) {
      alert(err.message || 'Failed to submit payment proof');
    } finally {
      setSubmittingPay(false);
    }
  };

  const handleOpenVerify = (bill) => {
    setSelectedBillForVerify(bill);
    setRejectionReason('');
    setVerifyModalOpen(true);
  };

  const handleExecuteVerification = async (action) => {
    if (!selectedBillForVerify) return;
    if (action === 'reject' && !rejectionReason.trim()) {
      alert('Please provide a reason for rejecting the payment proof.');
      return;
    }

    setVerifying(true);
    try {
      const res = await maintenanceService.verifyBillPayment(selectedBillForVerify._id, {
        action,
        rejectionReason: rejectionReason.trim()
      });
      alert(res.message || (action === 'approve' ? 'Payment approved by Accounts!' : 'Payment rejected.'));
      setVerifyModalOpen(false);
      fetchBills();
    } catch (err) {
      alert(err.message || 'Failed to process verification');
    } finally {
      setVerifying(false);
    }
  };

  const handleSaveSR = async (data) => {
    try {
      await maintenanceService.createServiceRequest(data);
      alert('Service ticket opened & technician assigned!');
      setIsNewSrModalOpen(false);
      fetchServiceRequests();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateSrStatus = async (id, payloadOrStatus, maybeNotes) => {
    try {
      const payload = typeof payloadOrStatus === 'object'
        ? payloadOrStatus
        : { status: payloadOrStatus, resolutionNotes: maybeNotes };
      await maintenanceService.updateServiceRequest(id, payload);
      alert('Service ticket work order updated successfully!');
      setIsSrDetailModalOpen(false);
      fetchServiceRequests();
    } catch (err) {
      alert(err.message || 'Failed to update service request');
    }
  };

  const handleUploadSrPhoto = async (id, formData) => {
    try {
      await maintenanceService.uploadServicePhoto(id, formData);
      alert('Service photo uploaded successfully!');
      fetchServiceRequests();
    } catch (err) {
      alert(err.message || 'Failed to upload photo');
    }
  };

  const handleSavePenalty = async (data) => {
    try {
      await maintenanceService.issuePenalty(data);
      alert('Infraction fine issued & tenant notified!');
      setIsNewPenaltyModalOpen(false);
      fetchPenalties();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSettlePenalty = async (id, status) => {
    try {
      await maintenanceService.settlePenalty(id, { paymentStatus: status });
      alert(`Penalty marked as ${status}!`);
      fetchPenalties();
    } catch (err) {
      alert(err.message);
    }
  };

  const formatINR = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  // Filtered Bills
  const filteredBills = bills.filter((b) => {
    if (!billSearch.trim()) return true;
    const term = billSearch.toLowerCase();
    const bNum = (b.billNumber || '').toLowerCase();
    const fNum = (b.flatId?.flatNumber || '').toString().toLowerCase();
    const pName = (b.payerId?.name || '').toLowerCase();
    const utr = (b.utrNumber || '').toLowerCase();
    return bNum.includes(term) || fNum.includes(term) || pName.includes(term) || utr.includes(term);
  });

  // Compute Metrics
  let totalMaintCollected = 0;
  let totalMaintOutstanding = 0;
  bills.forEach((b) => {
    totalMaintCollected += (b.paidAmount || 0);
    totalMaintOutstanding += (b.balanceAmount || 0);
  });

  const openTicketsCount = serviceRequests.filter((s) => s.status === 'open' || s.status === 'in_progress' || s.status === 'assigned').length;
  const activePenaltiesSum = penalties.filter((p) => p.paymentStatus === 'pending').reduce((acc, p) => acc + (p.penaltyAmount || 0), 0);

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
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#111827', display: 'flex', alignItems: 'center', gap: '12px' }}>
            Facility Maintenance & Operations Hub
            <span style={{ fontSize: '0.74rem', background: '#e8f0fe', color: '#1a73e8', padding: '3px 10px', borderRadius: '6px', fontWeight: '700' }}>
              RESIDENT SERVICES
            </span>
          </div>
          <div style={{ fontSize: '0.88rem', color: '#4b5563', marginTop: '4px', fontWeight: '500' }}>
            Periodic maintenance invoicing, proof & UTR verification by Accounts, technician tickets, and rule infraction fines.
          </div>
        </div>

        <button
          type="button"
          onClick={loadAll}
          className="btn-secondary"
          style={{ padding: '9px 16px', fontSize: '0.84rem' }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          Refresh Data
        </button>
      </div>

      {/* Top Metrics Ribbon */}
      <div className="grid-cols-4">
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>MAINTENANCE COLLECTED</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#e6f4ea', color: '#137333' }}>
              <DollarSign size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#137333', marginTop: '4px' }}>
            {formatINR(totalMaintCollected)}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>Verified & paid fees</span>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>OUTSTANDING DUES</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#ffdad6', color: '#ba1a1a' }}>
              <Clock size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#ba1a1a', marginTop: '4px' }}>
            {formatINR(totalMaintOutstanding)}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>Unpaid maintenance bills</span>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>ACTIVE WORK ORDERS</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#e8f0fe', color: '#1a73e8' }}>
              <Wrench size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1a73e8', marginTop: '4px' }}>
            {openTicketsCount}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>Open service tickets</span>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>PENDING PENALTIES</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#fef7e0', color: '#b06000' }}>
              <AlertTriangle size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#b06000', marginTop: '4px' }}>
            {formatINR(activePenaltiesSum)}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>Infraction fines due</span>
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
          { id: 'bills', label: `Maintenance Invoices (${bills.length})` },
          { id: 'services', label: `Service Requests (${serviceRequests.length})` },
          { id: 'penalties', label: `Rule Infractions & Penalties (${penalties.length})` }
        ].map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              type="button"
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                flex: '1 1 auto',
                padding: '9px 16px',
                borderRadius: '6px',
                background: isSelected ? '#1a73e8' : 'transparent',
                color: isSelected ? '#ffffff' : '#374151',
                fontWeight: isSelected ? '800' : '600',
                fontSize: '0.82rem',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ================= TAB 1: BILLS ================= */}
      {activeTab === 'bills' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111827' }}>Maintenance Invoices Register</h3>
              <p style={{ fontSize: '0.76rem', color: '#6b7280', margin: 0 }}>All payments require mandatory UTR and proof document verification by Accounts.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsBillModalOpen(true)}
              style={{
                background: '#1a73e8',
                color: '#ffffff',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                border: 'none'
              }}
            >
              <Plus size={15} /> Issue Maintenance Bill / Batch
            </button>
          </div>

          {/* Filter Bar */}
          <div className="g-card" style={{ padding: '12px 16px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: '1 1 240px', position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                type="text"
                placeholder="Search invoice number, flat, resident, or UTR..."
                value={billSearch}
                onChange={(e) => setBillSearch(e.target.value)}
                style={{ width: '100%', paddingLeft: '30px', fontSize: '0.82rem' }}
              />
            </div>

            <div style={{ width: '180px' }}>
              <select
                value={billStatusFilter}
                onChange={(e) => setBillStatusFilter(e.target.value)}
                style={{ width: '100%', fontSize: '0.82rem' }}
              >
                <option value="">All Payment Statuses</option>
                <option value="unpaid">Unpaid</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="paid">Paid & Verified</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="g-card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Invoice No & Month</th>
                    <th>Property & Billed Payer</th>
                    <th>Total Billed</th>
                    <th>Paid</th>
                    <th>Balance Due</th>
                    <th>Payment UTR & Proof</th>
                    <th>Verification Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBills.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#6b7280', fontWeight: '500' }}>
                        No maintenance bills found matching your criteria. Click "Issue Maintenance Bill" to generate invoices.
                      </td>
                    </tr>
                  ) : (
                    filteredBills.map((b) => {
                      const isPendingReview = b.paymentStatus === 'pending_approval' || b.verificationStatus === 'pending';
                      const isApproved = b.verificationStatus === 'approved' || b.paymentStatus === 'paid';
                      const isRejected = b.paymentStatus === 'rejected' || b.verificationStatus === 'rejected';

                      return (
                        <tr key={b._id || b.id}>
                          <td>
                            <strong style={{ color: '#1a73e8' }}>{b.billNumber}</strong>
                            <div style={{ fontSize: '0.72rem', color: '#4b5563', fontWeight: '600' }}>
                              {b.billingMonth || (b.billingPeriod?.month ? `${b.billingPeriod.month} ${b.billingPeriod.year || ''}` : 'Monthly Fee')}
                            </div>
                          </td>

                          <td>
                            <div style={{ fontWeight: '700', color: '#111827' }}>
                              Flat {b.flatId?.flatNumber || 'Unit'}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#374151' }}>
                              {b.payerType === 'owner' ? '👤 [Owner] ' : '🏢 [Tenant] '}
                              {b.payerId?.name || 'Resident'}
                            </div>
                          </td>

                          <td style={{ color: '#111827', fontWeight: '800' }}>{formatINR(b.totalAmount)}</td>
                          <td style={{ color: '#137333', fontWeight: '700' }}>{formatINR(b.paidAmount)}</td>
                          <td style={{ color: b.balanceAmount > 0 ? '#ba1a1a' : '#137333', fontWeight: '800' }}>
                            {formatINR(b.balanceAmount)}
                          </td>

                          {/* UTR & PROOF */}
                          <td>
                            {b.utrNumber ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <span style={{ fontSize: '0.74rem', fontFamily: 'monospace', fontWeight: '700', color: '#111827', background: '#f3f4f6', padding: '1px 5px', borderRadius: '3px' }}>
                                  UTR: {b.utrNumber}
                                </span>
                                {b.proofFileUrl ? (
                                  <a
                                    href={b.proofFileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ fontSize: '0.72rem', color: '#1a73e8', display: 'flex', alignItems: 'center', gap: '3px', textDecoration: 'none', fontWeight: '700' }}
                                  >
                                    <ExternalLink size={12} /> View Bill Proof
                                  </a>
                                ) : (
                                  <span style={{ fontSize: '0.68rem', color: '#9ca3af' }}>No file uploaded</span>
                                )}
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.72rem', color: '#9ca3af', fontStyle: 'italic' }}>Pending submission</span>
                            )}
                          </td>

                          {/* VERIFICATION BADGE */}
                          <td>
                            {isPendingReview && (
                              <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#fef3c7', color: '#b45309', fontWeight: '800', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Clock size={11} /> Pending Review
                              </span>
                            )}
                            {isApproved && (
                              <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#dcfce7', color: '#15803d', fontWeight: '800', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle2 size={11} /> Verified & Paid
                              </span>
                            )}
                            {isRejected && (
                              <span title={b.rejectionReason} style={{ padding: '3px 8px', borderRadius: '12px', background: '#fee2e2', color: '#b91c1c', fontWeight: '800', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'help' }}>
                                <AlertCircle size={11} /> Proof Rejected
                              </span>
                            )}
                            {!isPendingReview && !isApproved && !isRejected && (
                              <StatusBadge status={b.paymentStatus} />
                            )}
                          </td>

                          {/* ACTION BUTTONS */}
                          <td>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              {isPendingReview && isAdminOrAccountant ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenVerify(b)}
                                  style={{
                                    padding: '5px 12px',
                                    background: '#1a73e8',
                                    color: '#ffffff',
                                    borderRadius: '5px',
                                    fontSize: '0.74rem',
                                    fontWeight: '800',
                                    cursor: 'pointer',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  <ShieldCheck size={13} /> Review & Approve
                                </button>
                              ) : b.paymentStatus !== 'paid' ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenPay(b)}
                                  style={{
                                    padding: '5px 10px',
                                    background: '#137333',
                                    color: '#ffffff',
                                    borderRadius: '5px',
                                    fontSize: '0.74rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  <Upload size={12} /> Pay / Submit Proof
                                </button>
                              ) : (
                                <span style={{ fontSize: '0.72rem', color: '#137333', fontWeight: '700' }}>✓ Settled</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: SERVICE REQUESTS ================= */}
      {activeTab === 'services' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111827' }}>Resident Service Tickets ({serviceRequests.length})</h3>
            <button
              type="button"
              onClick={() => setIsNewSrModalOpen(true)}
              style={{
                background: '#1a73e8',
                color: '#ffffff',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                border: 'none'
              }}
            >
              <Plus size={15} /> Log Service Request
            </button>
          </div>

          <div className="g-card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Ticket Code</th>
                    <th>Title & Category</th>
                    <th>Property Unit</th>
                    <th>Technician</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceRequests.map((sr) => (
                    <tr key={sr._id || sr.id}>
                      <td><strong style={{ color: '#1a73e8' }}>{sr.ticketNumber}</strong></td>
                      <td>
                        <div style={{ fontWeight: '700', color: '#111827' }}>{sr.title}</div>
                        <div style={{ fontSize: '0.72rem', color: '#4b5563' }}>{sr.category}</div>
                      </td>
                      <td>
                        <div style={{ color: '#111827', fontWeight: '600' }}>Flat {sr.flatId?.flatNumber || 'Unit'}</div>
                        <div style={{ fontSize: '0.72rem', color: '#4b5563' }}>{sr.projectId?.projectName}</div>
                      </td>
                      <td style={{ color: '#374151', fontWeight: '600' }}>{sr.assignedTo || 'Unassigned'}</td>
                      <td>
                        <span style={{ padding: '2px 6px', borderRadius: '4px', background: sr.priority === 'urgent' ? '#ffdad6' : '#e8f0fe', color: sr.priority === 'urgent' ? '#ba1a1a' : '#1a73e8', fontWeight: '800', fontSize: '0.72rem' }}>
                          {sr.priority?.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={sr.status} />
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSr(sr);
                            setIsSrDetailModalOpen(true);
                          }}
                          style={{
                            padding: '4px 10px',
                            background: '#f3f4f5',
                            border: '1px solid #dadce0',
                            color: '#111827',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          Manage Ticket
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: PENALTIES ================= */}
      {activeTab === 'penalties' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111827' }}>Rule Infractions & Penalties ({penalties.length})</h3>
            <button
              type="button"
              onClick={() => setIsNewPenaltyModalOpen(true)}
              style={{
                background: '#ba1a1a',
                color: '#ffffff',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                border: 'none'
              }}
            >
              <AlertTriangle size={15} /> Issue Fine / Penalty
            </button>
          </div>

          <div className="g-card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Penalty Code</th>
                    <th>Property Unit</th>
                    <th>Infraction Reason</th>
                    <th>Fine Amount</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {penalties.map((p) => (
                    <tr key={p._id || p.id}>
                      <td><strong style={{ color: '#ba1a1a' }}>{p.penaltyCode}</strong></td>
                      <td>
                        <div style={{ fontWeight: '700', color: '#111827' }}>Flat {p.flatId?.flatNumber || 'Unit'}</div>
                        <div style={{ fontSize: '0.72rem', color: '#4b5563' }}>{p.projectId?.projectName}</div>
                      </td>
                      <td style={{ color: '#374151', fontWeight: '600' }}>{p.reason}</td>
                      <td style={{ color: '#ba1a1a', fontWeight: '800' }}>{formatINR(p.penaltyAmount)}</td>
                      <td>
                        <StatusBadge status={p.paymentStatus} />
                      </td>
                      <td>
                        {p.paymentStatus !== 'paid' && (
                          <button
                            type="button"
                            onClick={() => handleSettlePenalty(p._id, 'paid')}
                            style={{
                              padding: '4px 10px',
                              background: '#137333',
                              color: '#ffffff',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              border: 'none'
                            }}
                          >
                            Mark Paid
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      <NewBillModal
        isOpen={isBillModalOpen}
        onClose={() => setIsBillModalOpen(false)}
        onCreateSingle={handleSaveBill}
        onGenerateBatch={handleBatchGenerateBills}
        onSubmit={handleSaveBill}
      />
      <NewServiceRequestModal isOpen={isNewSrModalOpen} onClose={() => setIsNewSrModalOpen(false)} onSubmit={handleSaveSR} />
      <NewPenaltyModal isOpen={isNewPenaltyModalOpen} onClose={() => setIsNewPenaltyModalOpen(false)} onSubmit={handleSavePenalty} />
      <ServiceRequestDetailModal
        isOpen={isSrDetailModalOpen}
        onClose={() => setIsSrDetailModalOpen(false)}
        serviceRequest={selectedSr}
        request={selectedSr}
        onUpdateRequest={handleUpdateSrStatus}
        onUpdateStatus={handleUpdateSrStatus}
        onSubmit={handleUpdateSrStatus}
        onUploadPhoto={handleUploadSrPhoto}
      />

      {/* BILL PAYMENT & PROOF UPLOAD MODAL */}
      <Modal isOpen={payModalOpen} onClose={() => setPayModalOpen(false)} title="Record Maintenance Payment & Upload Proof">
        <form onSubmit={handleConfirmPayment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
            <div style={{ fontWeight: '700', color: '#1e293b' }}>
              Invoice: {selectedBillForPay?.billNumber} • Flat {selectedBillForPay?.flatId?.flatNumber || ''}
            </div>
            <div style={{ color: '#64748b', fontSize: '0.75rem' }}>
              Total Billed: {formatINR(selectedBillForPay?.totalAmount)} • Balance Due: <strong style={{ color: '#ba1a1a' }}>{formatINR(selectedBillForPay?.balanceAmount || selectedBillForPay?.totalAmount)}</strong>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '0.76rem', color: '#374151', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Payment Amount (₹) *</label>
              <input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                required
                min="1"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.76rem', color: '#374151', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Payment Method *</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="upi">UPI / Online Gateway</option>
                <option value="bank_transfer">Bank Transfer (NEFT / RTGS)</option>
                <option value="cheque">Cheque / Demand Draft</option>
                <option value="card">Debit / Credit Card</option>
                <option value="cash">Cash Receipt</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.76rem', color: '#374151', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
              Bank UTR Number / Transaction ID *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. UTR1234567890 / TXN-987654"
              value={utrNumber}
              onChange={(e) => setUtrNumber(e.target.value)}
              style={{ width: '100%', fontFamily: 'monospace', fontWeight: '700' }}
            />
            <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>Mandatory for confirmation and audit verification.</span>
          </div>

          <div>
            <label style={{ fontSize: '0.76rem', color: '#374151', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
              Upload Payment Bill Proof (Image / PDF) *
            </label>
            <input
              type="file"
              accept="image/png, image/jpeg, image/jpg, application/pdf"
              onChange={(e) => setProofFile(e.target.files?.[0] || null)}
              required={!selectedBillForPay?.proofFileUrl}
              style={{ width: '100%', fontSize: '0.8rem', padding: '6px', border: '1px dashed #94a3b8', borderRadius: '6px' }}
            />
            {selectedBillForPay?.proofFileUrl && (
              <div style={{ marginTop: '4px', fontSize: '0.72rem' }}>
                Existing proof: <a href={selectedBillForPay.proofFileUrl} target="_blank" rel="noreferrer" style={{ color: '#1a73e8', fontWeight: '700' }}>View Uploaded File</a>
              </div>
            )}
          </div>

          <div>
            <label style={{ fontSize: '0.76rem', color: '#374151', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Remarks / Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Paid via GooglePay, August maintenance"
              value={paymentRemarks}
              onChange={(e) => setPaymentRemarks(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={() => setPayModalOpen(false)}
              style={{ padding: '8px 14px', background: '#f3f4f5', border: '1px solid #dadce0', borderRadius: '6px', color: '#111827', fontWeight: '700', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingPay}
              style={{
                padding: '8px 18px',
                background: '#137333',
                color: '#ffffff',
                borderRadius: '6px',
                fontWeight: '700',
                border: 'none',
                cursor: submittingPay ? 'not-allowed' : 'pointer',
                opacity: submittingPay ? 0.7 : 1
              }}
            >
              {submittingPay ? 'Submitting...' : 'Submit Payment Proof'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ADMIN / ACCOUNTANT PAYMENT VERIFICATION MODAL */}
      <Modal isOpen={verifyModalOpen} onClose={() => setVerifyModalOpen(false)} title="Accountant Review: Verify Maintenance Payment">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600' }}>Invoice Number:</span>
              <strong style={{ fontSize: '0.84rem', color: '#1e293b' }}>{selectedBillForVerify?.billNumber}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600' }}>Property Unit:</span>
              <strong style={{ fontSize: '0.84rem', color: '#1e293b' }}>Flat {selectedBillForVerify?.flatId?.flatNumber || ''}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600' }}>Billed Payer:</span>
              <strong style={{ fontSize: '0.84rem', color: '#1e293b' }}>{selectedBillForVerify?.payerId?.name || 'Resident'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600' }}>Paid Amount:</span>
              <strong style={{ fontSize: '0.92rem', color: '#15803d' }}>{formatINR(selectedBillForVerify?.paidAmount || selectedBillForVerify?.totalAmount)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600' }}>Bank UTR / Txn Reference:</span>
              <strong style={{ fontSize: '0.84rem', color: '#1a73e8', fontFamily: 'monospace' }}>{selectedBillForVerify?.utrNumber || 'N/A'}</strong>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.76rem', color: '#374151', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
              Payment Receipt / Screenshot Proof:
            </label>
            {selectedBillForVerify?.proofFileUrl ? (
              <div style={{ padding: '10px', background: '#f1f5f9', borderRadius: '6px', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.78rem', color: '#334155', fontWeight: '600' }}>Attached Proof Document</span>
                <a
                  href={selectedBillForVerify.proofFileUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: '4px 10px',
                    background: '#1a73e8',
                    color: '#ffffff',
                    borderRadius: '4px',
                    fontSize: '0.74rem',
                    fontWeight: '700',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <ExternalLink size={12} /> Open & Inspect Proof
                </a>
              </div>
            ) : (
              <div style={{ padding: '10px', color: '#ba1a1a', background: '#fee2e2', borderRadius: '6px', fontSize: '0.76rem' }}>
                No file proof attached to this payment record.
              </div>
            )}
          </div>

          <div>
            <label style={{ fontSize: '0.76rem', color: '#374151', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
              Rejection Reason (Required only if rejecting):
            </label>
            <input
              type="text"
              placeholder="e.g. UTR number not matching bank statement, invalid amount"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              style={{ width: '100%', fontSize: '0.8rem' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={() => setVerifyModalOpen(false)}
              style={{ padding: '8px 14px', background: '#f3f4f5', border: '1px solid #dadce0', borderRadius: '6px', color: '#111827', fontWeight: '700', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={verifying}
              onClick={() => handleExecuteVerification('reject')}
              style={{
                padding: '8px 16px',
                background: '#fee2e2',
                color: '#ba1a1a',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                fontWeight: '700',
                cursor: verifying ? 'not-allowed' : 'pointer'
              }}
            >
              ✕ Reject Proof
            </button>
            <button
              type="button"
              disabled={verifying}
              onClick={() => handleExecuteVerification('approve')}
              style={{
                padding: '8px 18px',
                background: '#15803d',
                color: '#ffffff',
                borderRadius: '6px',
                fontWeight: '800',
                border: 'none',
                cursor: verifying ? 'not-allowed' : 'pointer'
              }}
            >
              {verifying ? 'Approving...' : '✓ Approve & Confirm Payment'}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};
