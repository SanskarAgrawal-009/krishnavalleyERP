import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { salesService } from '../../services/salesService.js';
import { SalesDetailModal } from '../../components/sales/SalesDetailModal.jsx';
import { StatusBadge } from '../../components/common/StatusBadge.jsx';
import { ModuleMessagingCenter } from '../../components/notifications/ModuleMessagingCenter.jsx';
import { QuickMessageModal } from '../../components/notifications/QuickMessageModal.jsx';

import {
  ShoppingBag,
  DollarSign,
  CheckCircle,
  FileText,
  CreditCard,
  Key,
  XCircle,
  Search,
  Phone,
  MessageSquare,
  Home,
  RefreshCw,
  Clock,
  ArrowRight,
  TrendingUp,
  Building2,
  Send,
  Zap
} from 'lucide-react';

export const SalesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const getTabFromParam = (param) => {
    if (param === 'messaging') return 'messaging';
    if (param === 'lifecycle') return 'lifecycle';
    return 'pipeline';
  };

  const [salesViewTab, setSalesViewTab] = useState(getTabFromParam(tabParam));

  useEffect(() => {
    setSalesViewTab(getTabFromParam(tabParam));
  }, [tabParam]);

  const [salesLeads, setSalesLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Active Sales Lead Detail Modal
  const [selectedSalesLead, setSelectedSalesLead] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Quick Message Modal
  const [quickMsgLead, setQuickMsgLead] = useState(null);
  const [isQuickMsgModalOpen, setIsQuickMsgModalOpen] = useState(false);

  const fetchSalesLeads = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.salesStatus = statusFilter;

      const res = await salesService.getSalesLeads(params);
      if (res.data) setSalesLeads(res.data);
    } catch (error) {
      console.error('Error fetching sales leads:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesLeads();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSalesLeads();
  };

  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(val) || 0);
  };

  // Lifecycle Callback Handlers
  const handleUpdateBooking = async (arg1, arg2) => {
    try {
      const id = (arg2 && typeof arg1 === 'string') ? arg1 : selectedSalesLead?._id;
      const data = arg2 || arg1;
      await salesService.updateBooking(id, data);
      alert('Booking details recorded successfully!');
      refreshSelectedLead();
      fetchSalesLeads();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateAgreement = async (arg1, arg2) => {
    try {
      const id = (arg2 && typeof arg1 === 'string') ? arg1 : selectedSalesLead?._id;
      const data = arg2 || arg1;
      await salesService.updateAgreement(id, data);
      alert('Agreement information updated!');
      refreshSelectedLead();
      fetchSalesLeads();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUploadAgreementFile = async (arg1, arg2) => {
    try {
      const id = (arg2 && typeof arg1 === 'string') ? arg1 : selectedSalesLead?._id;
      const file = arg2 || arg1;
      await salesService.uploadAgreementDoc(id, file);
      alert('Legal agreement PDF uploaded and archived!');
      refreshSelectedLead();
      fetchSalesLeads();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSetupPaymentPlan = async (arg1, arg2) => {
    try {
      const id = (arg2 && typeof arg1 === 'string') ? arg1 : selectedSalesLead?._id;
      const data = arg2 || arg1;
      await salesService.setupPaymentPlan(id, data);
      alert('Milestone payment schedule configured!');
      refreshSelectedLead();
      fetchSalesLeads();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRecordPayment = async (arg1, arg2) => {
    try {
      const id = (arg2 && typeof arg1 === 'string') ? arg1 : selectedSalesLead?._id;
      const data = arg2 || arg1;
      await salesService.recordInstallmentPayment(id, data);
      alert('Buyer installment receipt verified & recorded!');
      refreshSelectedLead();
      fetchSalesLeads();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleGenerateDemandLetter = async (arg1, arg2) => {
    try {
      const id = (arg2 && typeof arg1 === 'string') ? arg1 : selectedSalesLead?._id;
      const data = arg2 || arg1;
      const res = await salesService.generateDemandLetter(id, data);
      alert(res.message || 'Demand letter notice dispatched to buyer!');
      refreshSelectedLead();
      fetchSalesLeads();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddSalesFollowUp = async (arg1, arg2) => {
    try {
      const id = (arg2 && typeof arg1 === 'string') ? arg1 : selectedSalesLead?._id;
      const data = arg2 || arg1;
      await salesService.addSalesFollowUp(id, data);
      alert('Payment collection follow-up logged!');
      refreshSelectedLead();
      fetchSalesLeads();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdatePossession = async (arg1, arg2) => {
    try {
      const id = (arg2 && typeof arg1 === 'string') ? arg1 : selectedSalesLead?._id;
      const data = arg2 || arg1;
      await salesService.updatePossession(id, data);
      alert('Possession handover record confirmed!');
      refreshSelectedLead();
      fetchSalesLeads();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleProcessCancellation = async (arg1, arg2) => {
    if (window.confirm('Process cancellation for this property deal? The unit status will revert to available.')) {
      try {
        const id = (arg2 && typeof arg1 === 'string') ? arg1 : selectedSalesLead?._id;
        const data = arg2 || arg1;
        await salesService.processCancellation(id, data);
        alert('Allotment cancelled & inventory released.');
        setIsDetailModalOpen(false);
        fetchSalesLeads();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const refreshSelectedLead = async () => {
    if (selectedSalesLead) {
      const res = await salesService.getSalesLeadById(selectedSalesLead._id);
      if (res.data) setSelectedSalesLead(res.data);
    }
  };

  // Compute Pipeline Metrics
  const totalSales = salesLeads.length;
  let bookedCount = 0;
  let inPaymentCount = 0;
  let possessedCount = 0;
  let totalPortfolioValue = 0;

  salesLeads.forEach((sl) => {
    const val = sl.paymentPlan?.totalAmount || sl.booking?.bookingAmount || 0;
    totalPortfolioValue += val;
    if (sl.salesStatus === 'booked') bookedCount++;
    if (sl.salesStatus === 'payment_in_progress') inPaymentCount++;
    if (sl.salesStatus === 'possessed') possessedCount++;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
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
            Property Sales & Deal Lifecycle
            <span style={{ fontSize: '0.74rem', background: '#e6f4ea', color: '#137333', padding: '3px 10px', borderRadius: '6px', fontWeight: '700' }}>
              ALLOTMENT PIPELINE
            </span>
          </div>
          <div style={{ fontSize: '0.88rem', color: '#4b5563', marginTop: '4px', fontWeight: '500' }}>
            Manage buyer bookings, legal agreements, milestone demand letters, collection receipts, and possession handovers.
          </div>
        </div>

        {/* View Switcher Ribbon */}
        <div style={{ display: 'flex', background: '#f3f4f5', padding: '4px', borderRadius: '8px', border: '1px solid #dadce0', gap: '6px' }}>
          <button
            type="button"
            onClick={() => {
              setSalesViewTab('pipeline');
              setSearchParams({ tab: 'deals' });
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: salesViewTab === 'pipeline' ? '#1a73e8' : 'transparent',
              color: salesViewTab === 'pipeline' ? '#ffffff' : '#4b5563',
              fontWeight: salesViewTab === 'pipeline' ? '800' : '600',
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <ShoppingBag size={14} /> Deals Pipeline ({salesLeads.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setSalesViewTab('lifecycle');
              setSearchParams({ tab: 'lifecycle' });
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: salesViewTab === 'lifecycle' ? '#1a73e8' : 'transparent',
              color: salesViewTab === 'lifecycle' ? '#ffffff' : '#4b5563',
              fontWeight: salesViewTab === 'lifecycle' ? '800' : '600',
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <DollarSign size={14} /> Milestone Demands ({salesLeads.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setSalesViewTab('messaging');
              setSearchParams({ tab: 'messaging' });
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: salesViewTab === 'messaging' ? '#1a73e8' : 'transparent',
              color: salesViewTab === 'messaging' ? '#ffffff' : '#4b5563',
              fontWeight: salesViewTab === 'messaging' ? '800' : '600',
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <MessageSquare size={14} /> Buyer Messaging Hub
          </button>
        </div>
      </div>

      {/* ================= TAB 1: PIPELINE & DEALS ================= */}
      {salesViewTab === 'pipeline' && (
        <>
          {/* Sales Pipeline Metrics Ribbon */}
          <div className="grid-cols-5">
            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>TOTAL CONVERTED</span>
                <div style={{ padding: '6px', borderRadius: '6px', background: '#e8f0fe', color: '#1a73e8' }}>
                  <ShoppingBag size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#111827', marginTop: '4px' }}>{totalSales}</div>
              <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>In Sales Pipeline</span>
            </div>

            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>BOOKED & ALLOTTED</span>
                <div style={{ padding: '6px', borderRadius: '6px', background: '#e6f4ea', color: '#137333' }}>
                  <CheckCircle size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#137333', marginTop: '4px' }}>{bookedCount}</div>
              <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>Token confirmed</span>
            </div>

            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>IN PAYMENT PROGRESS</span>
                <div style={{ padding: '6px', borderRadius: '6px', background: '#f3e8ff', color: '#8b5cf6' }}>
                  <CreditCard size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#8b5cf6', marginTop: '4px' }}>{inPaymentCount}</div>
              <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>Active milestone demands</span>
            </div>

            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>POSSESSION COMPLETED</span>
                <div style={{ padding: '6px', borderRadius: '6px', background: '#fef7e0', color: '#b06000' }}>
                  <Key size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#b06000', marginTop: '4px' }}>{possessedCount}</div>
              <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>Keys handed over</span>
            </div>

            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>SALES PORTFOLIO VALUE</span>
                <div style={{ padding: '6px', borderRadius: '6px', background: '#e8f0fe', color: '#1a73e8' }}>
                  <TrendingUp size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#111827', marginTop: '4px' }}>{formatINR(totalPortfolioValue)}</div>
              <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>Contracted deals</span>
            </div>
          </div>

          {/* Search & Status Filters */}
          <div className="g-card" style={{
            padding: '12px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '260px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#4b5563' }} />
                <input
                  type="text"
                  placeholder="Search by buyer name, phone, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    background: '#f8f9fa',
                    border: '1px solid #dadce0',
                    borderRadius: '6px',
                    color: '#111827',
                    fontWeight: '600',
                    fontSize: '0.85rem'
                  }}
                />
              </div>
              <button
                type="submit"
                style={{ padding: '8px 14px', background: '#1a73e8', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer' }}
              >
                Search
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: '8px 12px', background: '#f8f9fa', border: '1px solid #dadce0', borderRadius: '6px', color: '#111827', fontWeight: '600', fontSize: '0.82rem', cursor: 'pointer' }}
              >
                <option value="">All Deal Stages</option>
                <option value="booked">Booked (Token Received)</option>
                <option value="agreement_signed">Agreement Signed</option>
                <option value="payment_in_progress">Payment In Progress</option>
                <option value="fully_paid">Fully Paid</option>
                <option value="possession_ready">Possession Ready</option>
                <option value="possessed">Possession Handed Over</option>
                <option value="cancelled">Cancelled</option>
                <option value="refunded">Refunded</option>
              </select>

              <button
                onClick={fetchSalesLeads}
                title="Refresh Sales Pipeline"
                style={{ padding: '7px 10px', background: '#f3f4f5', border: '1px solid #dadce0', borderRadius: '6px', color: '#111827', cursor: 'pointer' }}
              >
                <RefreshCw size={14} className={loading ? 'spin' : ''} />
              </button>
            </div>
          </div>

          {/* Sales Lead Cards Grid */}
          {salesLeads.length === 0 ? (
            <div className="g-card" style={{ textAlign: 'center', padding: '50px 20px' }}>
              <ShoppingBag size={40} style={{ opacity: 0.3, margin: '0 auto 12px', color: '#4b5563' }} />
              <h3 style={{ color: '#111827', marginBottom: '6px', fontWeight: '800' }}>No Sales Records Found</h3>
              <p style={{ fontSize: '0.85rem', color: '#4b5563', marginBottom: '16px', fontWeight: '500' }}>
                Go to the <strong>CRM Leads</strong> tab and click <strong>"Convert to Sales"</strong> on any qualified lead to bring them into the sales pipeline.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
              {salesLeads.map((sl) => {
                const cleanPhone = sl.mobileNo ? sl.mobileNo.replace(/[^0-9]/g, '') : '';
                const totalDeal = sl.paymentPlan?.totalAmount || 0;
                const tokenAmount = sl.booking?.bookingAmount || 0;

                let totalPaid = tokenAmount;
                (sl.installments || []).forEach((inst) => {
                  totalPaid += (inst.paidAmount || 0);
                });
                const payPercent = totalDeal > 0 ? Math.min(100, Math.round((totalPaid / totalDeal) * 100)) : 0;

                return (
                  <div
                    key={sl._id}
                    className="g-card"
                    style={{
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      position: 'relative'
                    }}
                  >
                    {/* Header: Buyer Name & Status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#111827' }}>{sl.name}</h3>
                        <div style={{ fontSize: '0.74rem', color: '#4b5563', marginTop: '2px', fontWeight: '500' }}>
                          Converted: {new Date(sl.convertedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </div>

                      <StatusBadge status={sl.salesStatus} />
                    </div>

                    {/* Property Details */}
                    <div style={{
                      background: '#f3e8ff',
                      border: '1px solid #e9d5ff',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.78rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8b5cf6', fontWeight: '700' }}>
                        <Home size={14} />
                        <span>Flat {sl.flatId?.flatNumber || 'N/A'}</span>
                        {sl.projectId?.projectName && (
                          <span style={{ color: '#4b5563', fontWeight: '600' }}>• {sl.projectId.projectName}</span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#6b21a8', fontWeight: '700' }}>
                        {sl.agreement?.agreementNumber ? `AGR: ${sl.agreement.agreementNumber}` : 'Agreement Pending'}
                      </span>
                    </div>

                    {/* Direct Contact Actions */}
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      background: '#f8f9fa',
                      padding: '6px 8px',
                      borderRadius: '6px',
                      border: '1px solid #dadce0'
                    }}>
                      <a
                        href={`tel:${sl.mobileNo}`}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px',
                          padding: '5px',
                          background: '#e8f0fe',
                          color: '#1a73e8',
                          borderRadius: '4px',
                          textDecoration: 'none',
                          fontSize: '0.78rem',
                          fontWeight: '700'
                        }}
                      >
                        <Phone size={12} /> {sl.mobileNo}
                      </a>

                      <a
                        href={`https://wa.me/${cleanPhone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="WhatsApp"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          padding: '5px 10px',
                          background: '#e6f4ea',
                          color: '#137333',
                          borderRadius: '4px',
                          textDecoration: 'none',
                          fontSize: '0.78rem',
                          fontWeight: '700'
                        }}
                      >
                        <MessageSquare size={12} /> WhatsApp
                      </a>
                    </div>

                    {/* Financial Progress Bar */}
                    <div style={{
                      background: '#f8f9fa',
                      border: '1px solid #dadce0',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem' }}>
                        <span style={{ color: '#4b5563', fontWeight: '600' }}>Payment Progress:</span>
                        <strong style={{ color: '#111827' }}>{formatINR(totalPaid)} / {formatINR(totalDeal)} ({payPercent}%)</strong>
                      </div>

                      {/* Progress Bar Container */}
                      <div style={{ width: '100%', height: '6px', background: '#e1e3e4', borderRadius: '9999px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${payPercent}%`,
                          height: '100%',
                          background: '#1a73e8',
                          borderRadius: '9999px',
                          transition: 'width 0.4s ease'
                        }} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#4b5563', fontWeight: '500' }}>
                        <span>Token: {formatINR(tokenAmount)}</span>
                        <span>Milestones: {sl.installments?.length || 0} scheduled</span>
                      </div>
                    </div>

                    {/* Action Footer */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderTop: '1px solid #dadce0',
                      paddingTop: '10px',
                      gap: '8px'
                    }}>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickMsgLead(sl);
                          setIsQuickMsgModalOpen(true);
                        }}
                        style={{
                          padding: '6px 12px',
                          background: '#e6f4ea',
                          border: '1px solid #ceead6',
                          color: '#137333',
                          fontWeight: '700',
                          borderRadius: '6px',
                          fontSize: '0.76rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          cursor: 'pointer'
                        }}
                      >
                        <Zap size={13} /> Send Notice
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSalesLead(sl);
                          setIsDetailModalOpen(true);
                        }}
                        style={{
                          padding: '6px 14px',
                          background: '#1a73e8',
                          color: '#ffffff',
                          fontWeight: '700',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          cursor: 'pointer',
                          border: 'none'
                        }}
                      >
                        Manage Lifecycle <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ================= TAB 2: MILESTONE DEMANDS & PAYMENT STAGES ================= */}
      {salesViewTab === 'lifecycle' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Milestone Demands Financial Ribbon */}
          <div className="grid-cols-4">
            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>TOTAL ACTIVE DEALS</span>
                <div style={{ padding: '6px', borderRadius: '6px', background: '#e8f0fe', color: '#1a73e8' }}>
                  <ShoppingBag size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#111827', marginTop: '4px' }}>{totalSales}</div>
              <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>Booking & Allotment pool</span>
            </div>

            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>TOTAL PORTFOLIO VALUE</span>
                <div style={{ padding: '6px', borderRadius: '6px', background: '#e6f4ea', color: '#137333' }}>
                  <DollarSign size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#137333', marginTop: '4px' }}>{formatINR(totalPortfolioValue)}</div>
              <span style={{ fontSize: '0.74rem', color: '#137333', fontWeight: '700' }}>Total agreed property value</span>
            </div>

            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>IN PAYMENT SCHEDULE</span>
                <div style={{ padding: '6px', borderRadius: '6px', background: '#fef7e0', color: '#b06000' }}>
                  <CheckCircle size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#b06000', marginTop: '4px' }}>{inPaymentCount || bookedCount}</div>
              <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>Active construction demands</span>
            </div>

            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>POSSESSION READY</span>
                <div style={{ padding: '6px', borderRadius: '6px', background: '#f3e8ff', color: '#8b5cf6' }}>
                  <Building2 size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#8b5cf6', marginTop: '4px' }}>{possessedCount}</div>
              <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>Handover completed</span>
            </div>
          </div>

          {/* Demands Register Table */}
          <div className="g-card" style={{ overflow: 'hidden' }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <DollarSign size={18} color="#1a73e8" /> Milestone Demands & Construction Linked Payment Register ({salesLeads.length})
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#4b5563', marginTop: '2px' }}>
                  Track construction milestone slab completion, issue official demand letters, and reconcile payment receipts.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchSalesLeads}
                style={{ padding: '6px 12px', background: '#f3f4f5', border: '1px solid #dadce0', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh Demands
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Buyer & Allotment</th>
                    <th>Flat & Project</th>
                    <th>Total Deal Value</th>
                    <th>Booking Paid</th>
                    <th>Current Milestone Stage</th>
                    <th>Stage Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {salesLeads.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: '#4b5563' }}>
                        No converted sales deals found in the pipeline.
                      </td>
                    </tr>
                  ) : (
                    salesLeads.map((sl) => {
                      const totalAmt = sl.paymentPlan?.totalAmount || sl.booking?.bookingAmount || 0;
                      const bookingAmt = sl.booking?.bookingAmount || 0;
                      const milestones = sl.paymentPlan?.milestones || [];
                      const activeMilestone = milestones.find((m) => m.status === 'demand_issued' || m.status === 'pending') || milestones[0] || { name: 'Booking Confirmation', percentage: 10 };

                      return (
                        <tr key={sl._id}>
                          <td>
                            <div style={{ fontWeight: '700', color: '#111827' }}>
                              {sl.customerName || sl.leadId?.name || 'Allotted Buyer'}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#4b5563' }}>
                              {sl.customerPhone || sl.leadId?.phone || 'Phone on file'}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#1a73e8', fontWeight: '700', marginTop: '2px' }}>
                              {sl.applicationNo || `ALLOT-${sl._id.slice(-6).toUpperCase()}`}
                            </div>
                          </td>

                          <td>
                            <div style={{ fontWeight: '700', color: '#111827', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Building2 size={12} color="#1a73e8" />
                              {sl.flatId?.unitNumber || sl.flatNumber || 'Flat 101'}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#4b5563' }}>
                              {sl.projectId?.name || 'Krishna Valley Phase 1'}
                            </div>
                          </td>

                          <td style={{ fontWeight: '800', color: '#111827', fontSize: '0.92rem' }}>
                            {formatINR(totalAmt)}
                          </td>

                          <td style={{ fontWeight: '800', color: '#137333', fontSize: '0.92rem' }}>
                            {formatINR(bookingAmt)}
                            <div style={{ fontSize: '0.7rem', color: '#137333', fontWeight: '600' }}>
                              Receipt Verified
                            </div>
                          </td>

                          <td>
                            <div style={{ fontWeight: '700', color: '#111827', fontSize: '0.82rem' }}>
                              {activeMilestone.name || 'Plinth Slab Casting'}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#8b5cf6', fontWeight: '700' }}>
                              {activeMilestone.percentage || 15}% Demand Stage
                            </div>
                          </td>

                          <td>
                            <StatusBadge status={sl.salesStatus || 'booked'} />
                          </td>

                          <td>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSalesLead(sl);
                                setIsDetailModalOpen(true);
                              }}
                              style={{
                                padding: '6px 12px',
                                background: '#1a73e8',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '0.76rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              Manage Demands <ArrowRight size={13} />
                            </button>
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

      {/* ================= TAB 3: BUYER MESSAGING & REMINDERS CENTER ================= */}
      {salesViewTab === 'messaging' && (
        <ModuleMessagingCenter
          module="sales"
          records={salesLeads}
        />
      )}

      {/* SALES LIFECYCLE COMMAND CENTER MODAL */}
      <SalesDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        salesLead={selectedSalesLead}
        onUpdateBooking={handleUpdateBooking}
        onUpdateAgreement={handleUpdateAgreement}
        onUploadAgreementFile={handleUploadAgreementFile}
        onSetupPaymentPlan={handleSetupPaymentPlan}
        onRecordPayment={handleRecordPayment}
        onGenerateDemandLetter={handleGenerateDemandLetter}
        onAddFollowUp={handleAddSalesFollowUp}
        onUpdatePossession={handleUpdatePossession}
        onProcessCancellation={handleProcessCancellation}
      />

      {/* QUICK MESSAGE MODAL */}
      <QuickMessageModal
        isOpen={isQuickMsgModalOpen}
        onClose={() => setIsQuickMsgModalOpen(false)}
        record={quickMsgLead}
        module="sales"
      />

    </div>
  );
};
