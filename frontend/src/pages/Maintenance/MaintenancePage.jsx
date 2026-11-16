import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { extractRoleCode } from '../../utils/taskPermissions.js';
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

  const { user: currentUser, isSuperAdmin, hasPermission, hasAnyPermission } = useAuth();
  const userRole = extractRoleCode(currentUser);
  const isAdminOrAccountant = ['admin', 'accounts_head', 'finance_manager', 'super_admin', 'general_manager'].includes(userRole);

  const canCreateBill = isSuperAdmin || hasAnyPermission(['maintenance:create', 'maintenance:manage', 'admin:manage']) || isAdminOrAccountant;
  const canVerifyPayments = isSuperAdmin || isAdminOrAccountant || hasAnyPermission(['maintenance:manage', 'accounts:manage', 'admin:manage']);
  const canCreateServiceRequest = isSuperAdmin || hasAnyPermission(['maintenance:create', 'maintenance:manage', 'maintenance:view']);
  const canManageServiceRequest = isSuperAdmin || hasAnyPermission(['maintenance:manage', 'admin:manage']);
  const canIssuePenalty = isSuperAdmin || hasAnyPermission(['maintenance:manage', 'admin:manage']);
  const canSettlePenalty = isSuperAdmin || hasAnyPermission(['maintenance:manage', 'accounts:manage', 'admin:manage']);

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
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        border: '1px solid #e5e7eb'
      }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111827', margin: 0 }}>
            Maintenance
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '4px 0 0 0' }}>
            Periodic billing, payment verification, technician tickets, and penalties.
          </p>
        </div>

        <button
          type="button"
          onClick={loadAll}
          className="btn-secondary"
          style={{ padding: '8px 14px', fontSize: '0.84rem' }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Top Metrics Ribbon */}
      <div className="grid-cols-4">
        <div className="stat-card" style={{ border: '1px solid #e5e7eb', background: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: '500' }}>Maintenance collected</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#f0fdf4', color: '#17652f' }}>
              <DollarSign size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#17652f', marginTop: '4px' }}>
            {formatINR(totalMaintCollected)}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#6b7280', fontWeight: '500' }}>Verified payments</span>
        </div>

        <div className="stat-card" style={{ border: '1px solid #e5e7eb', background: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: '500' }}>Outstanding dues</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: totalMaintOutstanding > 0 ? '#fef3c7' : '#f0fdf4', color: totalMaintOutstanding > 0 ? '#d97706' : '#17652f' }}>
              <Clock size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '600', color: totalMaintOutstanding > 0 ? '#d97706' : '#17652f', marginTop: '4px' }}>
            {formatINR(totalMaintOutstanding)}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#6b7280', fontWeight: '500' }}>Unpaid maintenance bills</span>
        </div>

        <div className="stat-card" style={{ border: '1px solid #e5e7eb', background: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: '500' }}>Active tickets</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#f0fdf4', color: '#17652f' }}>
              <Wrench size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginTop: '4px' }}>
            {openTicketsCount}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#6b7280', fontWeight: '500' }}>Open service tickets</span>
        </div>

        <div className="stat-card" style={{ border: '1px solid #e5e7eb', background: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: '500' }}>Pending penalties</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: activePenaltiesSum > 0 ? '#fee2e2' : '#f9fafb', color: activePenaltiesSum > 0 ? '#dc2626' : '#6b7280' }}>
              <AlertTriangle size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '600', color: activePenaltiesSum > 0 ? '#dc2626' : '#111827', marginTop: '4px' }}>
            {formatINR(activePenaltiesSum)}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#6b7280', fontWeight: '500' }}>Infraction fines due</span>
        </div>
      </div>

      {/* Sub-Tab Navigation Header */}
      <div className="g-card no-scrollbar" style={{
        display: 'flex',
        padding: '4px',
        gap: '4px',
        border: '1px solid #e5e7eb',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        whiteSpace: 'nowrap'
      }}>
        {[
          { id: 'bills', label: `Invoices (${bills.length})` },
          { id: 'services', label: `Service tickets (${serviceRequests.length})` },
          { id: 'penalties', label: `Penalties (${penalties.length})` }
        ].map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              type="button"
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                flex: '1 1 auto',
                padding: '8px 16px',
                borderRadius: '6px',
                background: isSelected ? '#17652f' : 'transparent',
                color: isSelected ? '#ffffff' : '#6b7280',
                fontWeight: isSelected ? '600' : '500',
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
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#111827', margin: 0 }}>Maintenance invoices</h3>
              <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '2px 0 0 0' }}>All payments require UTR and proof document verification.</p>
            </div>
            {canCreateBill && (
              <button
                type="button"
                onClick={() => setIsBillModalOpen(true)}
                className="btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.84rem' }}
              >
                <Plus size={15} /> New invoice
              </button>
            )}
          </div>

          {/* Filter Bar */}
          <div className="g-card" style={{ padding: '12px 16px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', border: '1px solid #e5e7eb' }}>
            <div style={{ flex: '1 1 240px', position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                type="text"
                placeholder="e.g. INV-101, Flat 101, or Rahul"
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
                <option value="">All statuses</option>
                <option value="unpaid">Unpaid</option>
                <option value="pending_approval">Pending approval</option>
                <option value="partially_paid">Partially paid</option>
                <option value="paid">Paid</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="g-card" style={{ overflow: 'hidden', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
            <div className="table-responsive">
              <table style={{ minWidth: '820px', width: '100%' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>Invoice</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>Property and resident</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>Total amount</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>Paid</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>Balance due</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>UTR and proof</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>Status</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBills.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#6b7280', fontWeight: '400' }}>
                        No maintenance bills found. Click "New invoice" to generate invoices.
                      </td>
                    </tr>
                  ) : (
                    filteredBills.map((b) => {
                      const isPendingReview = b.paymentStatus === 'pending_approval' || b.verificationStatus === 'pending';
                      const isApproved = b.verificationStatus === 'approved' || b.paymentStatus === 'paid';
                      const isRejected = b.paymentStatus === 'rejected' || b.verificationStatus === 'rejected';

                      return (
                        <tr key={b._id || b.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '12px 16px' }}>
                            <strong style={{ color: '#17652f' }}>{b.billNumber}</strong>
                            <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                              {b.billingMonth || (b.billingPeriod?.month ? `${b.billingPeriod.month} ${b.billingPeriod.year || ''}` : 'Monthly fee')}
                            </div>
                          </td>

                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 600, color: '#111827' }}>
                              Flat {b.flatId?.flatNumber || 'Unit'}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                              {b.payerType === 'owner' ? 'Owner • ' : 'Tenant • '}
                              {b.payerId?.name || 'Resident'}
                            </div>
                          </td>

                          <td style={{ padding: '12px 16px', color: '#111827', fontWeight: 500 }}>{formatINR(b.totalAmount)}</td>
                          <td style={{ padding: '12px 16px', color: '#17652f', fontWeight: 600 }}>{formatINR(b.paidAmount)}</td>
                          <td style={{ padding: '12px 16px', color: b.balanceAmount > 0 ? '#b45309' : '#17652f', fontWeight: 500 }}>
                            {formatINR(b.balanceAmount)}
                          </td>

                          {/* UTR & PROOF */}
                          <td style={{ padding: '12px 16px' }}>
                            {b.utrNumber ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <span style={{ fontSize: '0.74rem', fontFamily: 'monospace', fontWeight: 600, color: '#111827', background: '#f3f4f6', padding: '1px 5px', borderRadius: '3px', width: 'fit-content' }}>
                                  UTR: {b.utrNumber}
                                </span>
                                {b.proofFileUrl ? (
                                  <a
                                    href={b.proofFileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ fontSize: '0.72rem', color: '#17652f', display: 'flex', alignItems: 'center', gap: '3px', textDecoration: 'none', fontWeight: 500 }}
                                  >
                                    <ExternalLink size={12} /> View proof
                                  </a>
                                ) : (
                                  <span style={{ fontSize: '0.68rem', color: '#9ca3af' }}>No file</span>
                                )}
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>Pending</span>
                            )}
                          </td>

                          {/* VERIFICATION BADGE */}
                          <td style={{ padding: '12px 16px' }}>
                            {isPendingReview && (
                              <span style={{ padding: '3px 8px', borderRadius: '4px', background: '#fef3c7', color: '#d97706', fontWeight: 500, fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Clock size={11} /> Pending review
                              </span>
                            )}
                            {isApproved && (
                              <span style={{ padding: '3px 8px', borderRadius: '4px', background: '#f0fdf4', color: '#17652f', fontWeight: 500, fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle2 size={11} /> Paid
                              </span>
                            )}
                            {isRejected && (
                              <span title={b.rejectionReason} style={{ padding: '3px 8px', borderRadius: '4px', background: '#fee2e2', color: '#dc2626', fontWeight: 500, fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'help' }}>
                                <AlertCircle size={11} /> Rejected
                              </span>
                            )}
                            {!isPendingReview && !isApproved && !isRejected && (
                              <StatusBadge status={b.paymentStatus} />
                            )}
                          </td>

                          {/* ACTION BUTTONS */}
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                              {isPendingReview && canVerifyPayments ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenVerify(b)}
                                  className="btn-primary"
                                  style={{ padding: '5px 10px', fontSize: '0.74rem' }}
                                >
                                  <ShieldCheck size={13} /> Review
                                </button>
                              ) : b.paymentStatus !== 'paid' ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenPay(b)}
                                  className="btn-primary"
                                  style={{ padding: '5px 10px', fontSize: '0.74rem' }}
                                >
                                  <Upload size={12} /> Submit payment
                                </button>
                              ) : (
                                <span style={{ fontSize: '0.72rem', color: '#17652f', fontWeight: 500 }}>Settled</span>
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
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#111827', margin: 0 }}>Service tickets ({serviceRequests.length})</h3>
            {canCreateServiceRequest && (
              <button
                type="button"
                onClick={() => setIsNewSrModalOpen(true)}
                className="btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.84rem' }}
              >
                <Plus size={15} /> New ticket
              </button>
            )}
          </div>

          <div className="g-card" style={{ overflow: 'hidden', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
            <div className="table-responsive">
              <table style={{ minWidth: '780px', width: '100%' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>Ticket</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>Title and category</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>Property</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>Technician</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>Priority</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>Status</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceRequests.map((sr) => (
                    <tr key={sr._id || sr.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px 16px' }}><strong style={{ color: '#17652f' }}>{sr.ticketNumber}</strong></td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#111827' }}>{sr.title}</div>
                        <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>{sr.category}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ color: '#111827', fontWeight: 500 }}>Flat {sr.flatId?.flatNumber || 'Unit'}</div>
                        <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>{sr.projectId?.projectName}</div>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#374151', fontWeight: 500 }}>{sr.assignedTo || 'Unassigned'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '2px 6px', borderRadius: '4px', background: sr.priority === 'urgent' ? '#fee2e2' : '#f0fdf4', color: sr.priority === 'urgent' ? '#dc2626' : '#17652f', fontWeight: 500, fontSize: '0.72rem', textTransform: 'capitalize' }}>
                          {sr.priority || 'Normal'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <StatusBadge status={sr.status} />
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSr(sr);
                            setIsSrDetailModalOpen(true);
                          }}
                          className="btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                        >
                          Manage
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
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#111827', margin: 0 }}>Penalties ({penalties.length})</h3>
            {canIssuePenalty && (
              <button
                type="button"
                onClick={() => setIsNewPenaltyModalOpen(true)}
                className="btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.84rem' }}
              >
                <Plus size={15} /> New penalty
              </button>
            )}
          </div>

          <div className="g-card" style={{ overflow: 'hidden', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
            <div className="table-responsive">
              <table style={{ minWidth: '740px', width: '100%' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>Penalty</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>Property</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>Reason</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>Amount</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>Status</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {penalties.map((p) => (
                    <tr key={p._id || p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <strong style={{ color: '#111827' }}>
                          {p.penaltyNumber || p.penaltyCode || (p._id ? `PEN-${p._id.slice(-6).toUpperCase()}` : 'PEN-NOTICE')}
                        </strong>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#111827' }}>Flat {p.flatId?.flatNumber || 'Unit'}</div>
                        <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>{p.projectId?.projectName || 'Krishna Valley'}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ color: '#111827', fontWeight: 500, fontSize: '0.82rem' }}>
                          {p.description || p.reason || 'Infraction penalty fine levied'}
                        </div>
                        {p.violationType && (
                          <span style={{
                            display: 'inline-block',
                            marginTop: '3px',
                            fontSize: '0.68rem',
                            fontWeight: 500,
                            textTransform: 'capitalize',
                            color: '#4b5563',
                            backgroundColor: '#f3f4f6',
                            padding: '1px 6px',
                            borderRadius: '4px'
                          }}>
                            {p.violationType.replace(/_/g, ' ')}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#111827', fontWeight: 600 }}>{formatINR(p.penaltyAmount)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <StatusBadge status={p.paymentStatus} />
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {p.paymentStatus !== 'paid' && canSettlePenalty && (
                          <button
                            type="button"
                            onClick={() => handleSettlePenalty(p._id, 'paid')}
                            className="btn-primary"
                            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                          >
                            Mark paid
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
              Total Billed: {formatINR(selectedBillForPay?.totalAmount)} • Balance Due: <strong style={{ color: '#0f172a' }}>{formatINR(selectedBillForPay?.balanceAmount || selectedBillForPay?.totalAmount)}</strong>
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
              <label style={{ fontSize: '0.78rem', color: '#374151', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Payment method *</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="upi">UPI / Online</option>
                <option value="bank_transfer">Bank transfer (NEFT / RTGS)</option>
                <option value="cheque">Cheque</option>
                <option value="card">Card</option>
                <option value="cash">Cash</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
              Bank UTR or transaction reference *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. UTR1234567890"
              value={utrNumber}
              onChange={(e) => setUtrNumber(e.target.value)}
              style={{ width: '100%', fontFamily: 'monospace' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
              Payment proof (image or PDF) *
            </label>
            <input
              type="file"
              accept="image/png, image/jpeg, image/jpg, application/pdf"
              onChange={(e) => setProofFile(e.target.files?.[0] || null)}
              required={!selectedBillForPay?.proofFileUrl}
              style={{ width: '100%', fontSize: '0.8rem', padding: '6px', border: '1px dashed #d1d5db', borderRadius: '6px' }}
            />
            {selectedBillForPay?.proofFileUrl && (
              <div style={{ marginTop: '4px', fontSize: '0.72rem' }}>
                Existing file: <a href={selectedBillForPay.proofFileUrl} target="_blank" rel="noreferrer" style={{ color: '#17652f', fontWeight: 500 }}>View proof</a>
              </div>
            )}
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Remarks (optional)</label>
            <input
              type="text"
              placeholder="e.g. Paid via Google Pay"
              value={paymentRemarks}
              onChange={(e) => setPaymentRemarks(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={() => setPayModalOpen(false)}
              className="btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.84rem' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingPay}
              className="btn-primary"
              style={{
                padding: '8px 16px',
                fontSize: '0.84rem',
                opacity: submittingPay ? 0.7 : 1
              }}
            >
              {submittingPay ? 'Submitting...' : 'Submit payment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ADMIN / ACCOUNTANT PAYMENT VERIFICATION MODAL */}
      <Modal isOpen={verifyModalOpen} onClose={() => setVerifyModalOpen(false)} title="Verify payment">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          <div style={{ background: '#f9fafb', padding: '14px', borderRadius: '6px', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>Invoice number:</span>
              <strong style={{ fontSize: '0.84rem', color: '#111827' }}>{selectedBillForVerify?.billNumber}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>Property:</span>
              <strong style={{ fontSize: '0.84rem', color: '#111827' }}>Flat {selectedBillForVerify?.flatId?.flatNumber || ''}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>Resident:</span>
              <strong style={{ fontSize: '0.84rem', color: '#111827' }}>{selectedBillForVerify?.payerId?.name || 'Resident'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>Paid amount:</span>
              <strong style={{ fontSize: '0.92rem', color: '#17652f' }}>{formatINR(selectedBillForVerify?.paidAmount || selectedBillForVerify?.totalAmount)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>Bank UTR / reference:</span>
              <strong style={{ fontSize: '0.84rem', color: '#17652f', fontFamily: 'monospace' }}>{selectedBillForVerify?.utrNumber || 'N/A'}</strong>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
              Payment proof:
            </label>
            {selectedBillForVerify?.proofFileUrl ? (
              <div style={{ padding: '10px', background: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.78rem', color: '#4b5563' }}>Attached proof document</span>
                <a
                  href={selectedBillForVerify.proofFileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary"
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.74rem',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <ExternalLink size={12} /> Open proof
                </a>
              </div>
            ) : (
              <div style={{ padding: '10px', color: '#6b7280', background: '#f9fafb', borderRadius: '6px', fontSize: '0.76rem', border: '1px solid #e5e7eb' }}>
                No file proof attached.
              </div>
            )}
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
              Rejection reason (required only if rejecting):
            </label>
            <input
              type="text"
              placeholder="e.g. UTR number does not match statement"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              style={{ width: '100%', fontSize: '0.8rem' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={() => setVerifyModalOpen(false)}
              className="btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.84rem' }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={verifying}
              onClick={() => handleExecuteVerification('reject')}
              style={{
                padding: '8px 14px',
                background: '#ffffff',
                color: '#dc2626',
                border: '1px solid #fee2e2',
                borderRadius: '6px',
                fontWeight: 500,
                fontSize: '0.84rem',
                cursor: verifying ? 'not-allowed' : 'pointer'
              }}
            >
              Reject
            </button>
            <button
              type="button"
              disabled={verifying}
              onClick={() => handleExecuteVerification('approve')}
              className="btn-primary"
              style={{
                padding: '8px 16px',
                fontSize: '0.84rem',
                cursor: verifying ? 'not-allowed' : 'pointer'
              }}
            >
              {verifying ? 'Approving...' : 'Approve payment'}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};
