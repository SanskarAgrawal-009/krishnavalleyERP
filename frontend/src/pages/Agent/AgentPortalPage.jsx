import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { agentService } from '../../services/agentService.js';
import { leadService } from '../../services/leadService.js';
import { NewSiteVisitModal } from '../../components/agent/NewSiteVisitModal.jsx';
import { VerifySiteVisitModal } from '../../components/agent/VerifySiteVisitModal.jsx';
import { ReviewSiteVisitModal } from '../../components/crm/ReviewSiteVisitModal.jsx';
import {
  Users,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  Sparkles,
  Building2,
  Phone,
  Mail,
  FileText,
  Wallet,
  AlertCircle,
  TrendingUp,
  MapPin,
  ChevronRight,
  ShieldCheck,
  Award,
  RefreshCw,
  Send,
  Loader2,
  XCircle,
  X,
  ExternalLink,
  Activity,
  History,
  ArrowLeft
} from 'lucide-react';

export const AgentPortalPage = () => {
  const { user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const viewAgentId = searchParams.get('agentId'); // For inhouse team viewing a specific agent

  const getTabFromParam = (param) => {
    if (param === 'commissions') return 'commissions';
    if (param === 'visits') return 'visits';
    if (param === 'audit') return 'audit';
    return 'leads';
  };

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [leads, setLeads] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [siteVisits, setSiteVisits] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('all');
  const [activeTab, setActiveTab] = useState(getTabFromParam(tabParam));

  useEffect(() => {
    setActiveTab(getTabFromParam(tabParam));
  }, [tabParam]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    const newParams = { tab: newTab };
    if (viewAgentId) newParams.agentId = viewAgentId;
    setSearchParams(newParams);
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');

  const userRole = (currentUser?.role?.roleCode || currentUser?.roleCode || currentUser?.role || '').toLowerCase();
  const isInhouse = ['admin', 'super_admin', 'sales_head', 'crm_manager', 'site_incharge', 'general_manager', 'sales_executive', 'front_desk'].includes(userRole);
  const isViewingOtherAgent = !!viewAgentId;

  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [matureModalOpen, setMatureModalOpen] = useState(false);
  const [siteVisitModalOpen, setSiteVisitModalOpen] = useState(false);
  const [selectedLeadForMaturity, setSelectedLeadForMaturity] = useState(null);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [selectedVisitForVerify, setSelectedVisitForVerify] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedLeadForReview, setSelectedLeadForReview] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Forms
  const [leadFormData, setLeadFormData] = useState({
    name: '',
    mobileNo: '',
    email: '',
    budget: 4500000,
    requirement: '2BHK Apartment',
    initialNotes: '',
    scheduledSiteVisitDate: '',
  });

  const [maturityFormData, setMaturityFormData] = useState({
    completedDate: new Date().toISOString().split('T')[0],
    feedback: 'Client attended site visit at Vrindavan Project and liked the sample flat.',
  });

  const [feedbackToast, setFeedbackToast] = useState({ message: '', type: '' });

  const showToast = (message, type = 'success') => {
    setFeedbackToast({ message, type });
    setTimeout(() => setFeedbackToast({ message: '', type: '' }), 5000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const targetAgentId = viewAgentId || undefined;
      const leadsParams = targetAgentId ? { agentId: targetAgentId } : {};
      const visitsParams = targetAgentId ? { agentId: targetAgentId } : {};
      const auditParams = targetAgentId ? { agentId: targetAgentId } : {};

      const [dashRes, leadsRes, commsRes, visitsRes, auditRes] = await Promise.all([
        agentService.getDashboard(targetAgentId),
        agentService.getLeads(leadsParams),
        agentService.getCommissions(targetAgentId),
        agentService.getSiteVisits(visitsParams),
        agentService.getAgentAuditLogs(auditParams),
      ]);

      if (dashRes.success) setDashboardData(dashRes.data);
      if (leadsRes.success) setLeads(leadsRes.data || []);
      if (commsRes.success) setCommissions(commsRes.data || []);
      if (visitsRes.success) setSiteVisits(visitsRes.data || []);
      if (auditRes.success) setAuditLogs(auditRes.data || []);
    } catch (err) {
      console.error('Failed to load agent portal data:', err);
      showToast(err.message || 'Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [viewAgentId]);

  // Filtered Leads
  const filteredLeads = leads.filter((l) => {
    const matchesSearch =
      searchTerm === '' ||
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.mobileNo.includes(searchTerm) ||
      (l.email && l.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (l.requirement && l.requirement.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      selectedStatusFilter === 'all' || l.status === selectedStatusFilter;

    return matchesSearch && matchesStatus;
  });

  // Filtered Audit Logs
  const filteredAuditLogs = auditLogs.filter((log) => {
    const matchesAction = auditActionFilter === 'all' || log.action === auditActionFilter;
    const matchesSearch =
      auditSearch === '' ||
      (log.summary && log.summary.toLowerCase().includes(auditSearch.toLowerCase())) ||
      (log.resourceName && log.resourceName.toLowerCase().includes(auditSearch.toLowerCase())) ||
      (log.performedBy?.name && log.performedBy.name.toLowerCase().includes(auditSearch.toLowerCase())) ||
      (log.performedBy?.username && log.performedBy.username.toLowerCase().includes(auditSearch.toLowerCase()));

    return matchesAction && matchesSearch;
  });

  const getAuditActionColor = (action) => {
    switch (action) {
      case 'SITE_VISIT_APPROVED':
      case 'APPROVE':
        return { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' };
      case 'SITE_VISIT_REJECTED':
      case 'REJECT':
        return { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca' };
      case 'COMMISSION_CREDIT':
        return { bg: '#f0fdf4', color: '#0d9488', border: '#99f6e4' };
      case 'COMMISSION_DEBIT':
        return { bg: '#fff1f2', color: '#e11d48', border: '#fecdd3' };
      case 'LEAD_SUBMITTED':
      case 'SITE_VISIT_LOGGED':
      case 'CREATE':
        return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
      default:
        return { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' };
    }
  };

  // Handle Lead Submit
  const handleUploadLead = async (e) => {
    e.preventDefault();
    if (!leadFormData.name || !leadFormData.mobileNo) {
      showToast('Client name and mobile number are required', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const res = await agentService.uploadLead(leadFormData);
      if (res.success) {
        showToast('Buyer lead registered successfully into your pipeline!');
        setUploadModalOpen(false);
        setLeadFormData({
          name: '',
          mobileNo: '',
          email: '',
          budget: 4500000,
          requirement: '2BHK Apartment',
          initialNotes: '',
          scheduledSiteVisitDate: '',
        });
        loadData();
      }
    } catch (err) {
      showToast(err.message || 'Failed to register lead', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Site Visit Maturity (Credits Commission)
  const handleCompleteSiteVisit = async (e) => {
    e.preventDefault();
    if (!selectedLeadForMaturity) return;

    setActionLoading(true);
    try {
      const res = await agentService.matureSiteVisit(selectedLeadForMaturity._id, maturityFormData);
      if (res.success) {
        showToast(res.message || 'Site visit completed and commission credited to your wallet!');
        setMatureModalOpen(false);
        setSelectedLeadForMaturity(null);
        loadData();
      }
    } catch (err) {
      showToast(err.message || 'Failed to mature site visit', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const agentProfile = dashboardData?.agent?.agentProfile || currentUser?.agentProfile || {
    commissionType: 'percentage',
    commissionRate: 2,
    walletBalance: 0,
    totalEarned: 0,
    agencyName: 'Channel Partner',
  };

  const commissionModelLabel =
    agentProfile.commissionType === 'percentage'
      ? `${agentProfile.commissionRate || 2}% on Matured Site Visits`
      : `₹${(agentProfile.commissionRate || 25000).toLocaleString('en-IN')} Flat per Matured Visit`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toast Alert */}
      {feedbackToast.message && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 9999,
            padding: '14px 22px',
            borderRadius: '12px',
            backgroundColor: feedbackToast.type === 'error' ? '#ba1a1a' : '#0d904f',
            color: '#ffffff',
            fontWeight: '600',
            fontSize: '0.9rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {feedbackToast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <span>{feedbackToast.message}</span>
        </div>
      )}

      {/* Inhouse Inspection Mode Banner */}
      {isViewingOtherAgent && (
        <div
          style={{
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '16px',
            padding: '16px 22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 4px 14px rgba(29, 78, 216, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #1d4ed8, #1e40af)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '800',
                fontSize: '1.2rem',
                flexShrink: 0,
              }}
            >
              👁️
            </div>
            <div>
              <div style={{ fontSize: '0.96rem', fontWeight: '800', color: '#1e3a8a' }}>
                Inhouse Management Inspection: Viewing Profile for {dashboardData?.agent?.firstName || 'Partner'} {dashboardData?.agent?.lastName || ''} ({agentProfile.agentCode || 'AGT-PARTNER'})
              </div>
              <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '2px' }}>
                Agency: <strong>{agentProfile.agencyName || 'Direct'}</strong> • City: <strong>{agentProfile.city || 'Mathura/Vrindavan'}</strong> • Tier: <strong>{agentProfile.tier || 'Standard'}</strong> • Rate: <strong>{agentProfile.commissionRate || 2}%</strong> • Wallet: <strong>₹{(agentProfile.walletBalance || 0).toLocaleString('en-IN')}</strong>
              </div>
            </div>
          </div>
          <Link
            to="/agent-network"
            style={{
              padding: '9px 18px',
              borderRadius: '10px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#1e293b',
              fontSize: '0.84rem',
              fontWeight: '700',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
            }}
          >
            <ArrowLeft size={15} /> Back to Agent Network Directory
          </Link>
        </div>
      )}

      {/* Header Banner: Agent Partner Profile & Commission Model */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0369a1 100%)',
          borderRadius: '20px',
          padding: '32px',
          color: '#ffffff',
          boxShadow: '0 12px 36px rgba(15, 23, 42, 0.25)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '24px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ zIndex: 1, maxWidth: '650px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '20px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(8px)',
                fontSize: '0.78rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <Award size={14} style={{ color: '#fbbf24' }} />
              Authorized Channel Partner
            </span>

            {agentProfile.reraNumber && (
              <span style={{ fontSize: '0.78rem', color: '#93c5fd', backgroundColor: 'rgba(0,0,0,0.2)', padding: '4px 10px', borderRadius: '20px' }}>
                RERA: {agentProfile.reraNumber}
              </span>
            )}
          </div>

          <h1 style={{ margin: '0 0 6px', fontSize: '1.85rem', fontWeight: '800', letterSpacing: '-0.02em' }}>
            Welcome, {dashboardData?.agent?.firstName || currentUser?.firstName || 'Partner'}!
          </h1>
          <p style={{ margin: '0 0 16px', fontSize: '0.92rem', color: '#cbd5e1', lineHeight: 1.5 }}>
            {agentProfile.agencyName || 'Krishna Valley Realty Partner'} • Manage your buyer leads, track live pipeline progress, and earn guaranteed commissions when site visits are completed.
          </p>

          {/* Commission terms pill */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 16px',
              borderRadius: '12px',
              backgroundColor: 'rgba(13, 144, 79, 0.25)',
              border: '1px solid rgba(52, 211, 153, 0.4)',
              color: '#6ee7b7',
              fontSize: '0.88rem',
              fontWeight: '700',
            }}
          >
            <Sparkles size={16} style={{ color: '#34d399' }} />
            <span>Commission Terms: {commissionModelLabel}</span>
          </div>
        </div>

        {/* Action Button */}
        <div style={{ zIndex: 1, display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={loadData}
            title="Refresh pipeline data"
            style={{
              padding: '12px',
              borderRadius: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <RefreshCw size={18} />
          </button>

          <button
            onClick={() => setSiteVisitModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              borderRadius: '12px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.92rem',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
              transition: 'transform 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <ShieldCheck size={18} />
            <span>Log Verified Site Visit</span>
          </button>

          <button
            onClick={() => setUploadModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 22px',
              borderRadius: '12px',
              backgroundColor: '#ffffff',
              color: '#0f172a',
              border: 'none',
              fontSize: '0.95rem',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
              transition: 'transform 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <Plus size={18} style={{ color: '#1a73e8' }} />
            <span>Submit New Buyer Lead</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
        {/* Wallet Balance */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '22px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
              Credited Wallet Balance
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: '800', color: '#0d904f', letterSpacing: '-0.02em' }}>
              ₹{(agentProfile.walletBalance || 0).toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '6px' }}>
              Credited directly upon verified site visits
            </div>
          </div>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#e6f4ea', color: '#0d904f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Wallet size={24} />
          </div>
        </div>

        {/* Total Earned */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '22px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
              Total Earnings to Date
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: '800', color: '#1e293b', letterSpacing: '-0.02em' }}>
              ₹{(agentProfile.totalEarned || 0).toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '6px' }}>
              {commissions.length} credited payouts logged
            </div>
          </div>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#eff6ff', color: '#1a73e8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <TrendingUp size={24} />
          </div>
        </div>

        {/* Matured Site Visits */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '22px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
              Matured Site Visits
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: '800', color: '#1e293b', letterSpacing: '-0.02em' }}>
              {dashboardData?.metrics?.maturedVisits ?? agentProfile.maturedLeadsCount ?? 0}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#0d904f', fontWeight: '600', marginTop: '6px' }}>
              100% Commission Credited
            </div>
          </div>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#fef7e0', color: '#e37400', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle2 size={24} />
          </div>
        </div>

        {/* Total Submitted Leads */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '22px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
              Total Uploaded Leads
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: '800', color: '#1e293b', letterSpacing: '-0.02em' }}>
              {leads.length}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '6px' }}>
              {leads.filter((l) => l.status === 'site_visit_scheduled').length} upcoming site visits
            </div>
          </div>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#f3e8fd', color: '#9334e6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Users size={24} />
          </div>
        </div>
      </div>

      {/* 5-Day Maturity Window Informational Policy Banner */}
      <div
        style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '16px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          boxShadow: '0 2px 8px rgba(30, 58, 138, 0.04)',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            backgroundColor: '#dbeafe',
            color: '#1d4ed8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Clock size={22} />
        </div>
        <div style={{ fontSize: '0.86rem', color: '#1e40af', lineHeight: 1.5 }}>
          <strong>5-Day Maturity & Handover Policy:</strong> Once you complete a site visit with your buyer, your commission is credited and you have an exclusive <strong>5-day window</strong> to close the prospect. After 5 days, the lead automatically transfers to the inhouse CRM team for final conversion while your commission remains <strong>100% secured</strong> in your wallet.
        </div>
      </div>

      {/* Tabs Bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', gap: '24px' }}>
        <button
          onClick={() => handleTabChange('leads')}
          style={{
            padding: '12px 4px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'leads' ? '2px solid #1a73e8' : '2px solid transparent',
            color: activeTab === 'leads' ? '#1a73e8' : '#64748b',
            fontWeight: activeTab === 'leads' ? '700' : '500',
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Users size={18} />
          <span>My Uploaded Leads ({leads.length})</span>
        </button>

        <button
          onClick={() => handleTabChange('visits')}
          style={{
            padding: '12px 4px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'visits' ? '2px solid #1a73e8' : '2px solid transparent',
            color: activeTab === 'visits' ? '#1a73e8' : '#64748b',
            fontWeight: activeTab === 'visits' ? '700' : '500',
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <ShieldCheck size={18} />
          <span>Verified Site Visits ({siteVisits.length})</span>
        </button>

        <button
          onClick={() => handleTabChange('commissions')}
          style={{
            padding: '12px 4px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'commissions' ? '2px solid #1a73e8' : '2px solid transparent',
            color: activeTab === 'commissions' ? '#1a73e8' : '#64748b',
            fontWeight: activeTab === 'commissions' ? '700' : '500',
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <DollarSign size={18} />
          <span>Commission Statement & Ledger ({commissions.length})</span>
        </button>

        <button
          onClick={() => handleTabChange('audit')}
          style={{
            padding: '12px 4px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'audit' ? '2px solid #1a73e8' : '2px solid transparent',
            color: activeTab === 'audit' ? '#1a73e8' : '#64748b',
            fontWeight: activeTab === 'audit' ? '700' : '500',
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Activity size={18} />
          <span>Audit & Activity Trail ({auditLogs.length})</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: MY UPLOADED LEADS                                 */}
      {/* ======================================================== */}
      {activeTab === 'leads' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Search & Filter Bar */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '14px 18px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', flex: 1, minWidth: '260px', position: 'relative' }}>
              <Search
                size={16}
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
              />
              <input
                type="text"
                placeholder="Search leads by client name, mobile, or property requirement..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                }}
              >
                <option value="all">All Stages</option>
                <option value="active_window">In 5-Day Exclusive Window</option>
                <option value="handed_over">Handed Over to Inhouse CRM</option>
                <option value="new">New Inquiries</option>
                <option value="contacted">Contacted</option>
                <option value="site_visit_scheduled">Site Visit Scheduled</option>
                <option value="site_visit_completed">Site Visit Completed (Matured)</option>
                <option value="booked">Booked Deals</option>
              </select>
            </div>
          </div>

          {/* Leads Table */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
            }}
          >
            {loading ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
                <Loader2 size={26} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
                <span>Loading your leads pipeline...</span>
              </div>
            ) : filteredLeads.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
                <Users size={36} style={{ margin: '0 auto 12px', color: '#cbd5e1' }} />
                <h4 style={{ margin: '0 0 4px', color: '#1e293b' }}>No leads found</h4>
                <p style={{ margin: '0 0 16px', fontSize: '0.85rem' }}>Upload your first buyer lead to begin tracking site visits and earning commissions.</p>
                <button
                  onClick={() => setUploadModalOpen(true)}
                  style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: '#1a73e8', color: '#ffffff', border: 'none', fontWeight: '600', cursor: 'pointer' }}
                >
                  Submit Lead
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>
                      <th style={{ padding: '14px 18px' }}>Client Details</th>
                      <th style={{ padding: '14px 18px' }}>Requirement & Budget</th>
                      <th style={{ padding: '14px 18px' }}>Pipeline Stage</th>
                      <th style={{ padding: '14px 18px' }}>Site Visit & Handover</th>
                      <th style={{ padding: '14px 18px' }}>Commission Status</th>
                      <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead) => {
                      const isMatured =
                        lead.status === 'site_visit_completed' ||
                        lead.status === 'matured' ||
                        lead.commission?.status === 'credited';

                      const stagePills = {
                        new: { label: 'New Lead', bg: '#f1f5f9', color: '#475569' },
                        contacted: { label: 'Contacted', bg: '#eff6ff', color: '#1d4ed8' },
                        site_visit_scheduled: { label: 'Visit Scheduled', bg: '#fef3c7', color: '#b45309' },
                        site_visit_completed: { label: 'Visit Completed', bg: '#e6f4ea', color: '#0d904f' },
                        matured: { label: 'Matured Lead', bg: '#e6f4ea', color: '#0d904f' },
                        booked: { label: 'Booked Deal', bg: '#f3e8fd', color: '#7e22ce' },
                        lost: { label: 'Closed/Lost', bg: '#fee2e2', color: '#dc2626' },
                      }[lead.status] || { label: lead.status, bg: '#f1f5f9', color: '#475569' };

                      return (
                        <tr key={lead._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          {/* Client */}
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.9rem' }}>
                              {lead.name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                              <span>{lead.mobileNo}</span>
                              {lead.email && <span>• {lead.email}</span>}
                            </div>
                          </td>

                          {/* Requirement & Budget */}
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontWeight: '600', color: '#334155' }}>
                              {lead.requirement || '2BHK Apartment'}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#0d904f', fontWeight: '700', marginTop: '2px' }}>
                              Budget: ₹{(lead.budget || 0).toLocaleString('en-IN')}
                            </div>
                          </td>

                          {/* Pipeline Stage */}
                          <td style={{ padding: '14px 18px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '4px 10px',
                                borderRadius: '12px',
                                backgroundColor: stagePills.bg,
                                color: stagePills.color,
                                fontSize: '0.75rem',
                                fontWeight: '700',
                              }}
                            >
                              {stagePills.label}
                            </span>
                          </td>

                          {/* Site Visit & Handover */}
                          <td style={{ padding: '14px 18px' }}>
                            {lead.siteVisitDetails?.completedDate ? (
                              <div>
                                <div style={{ fontSize: '0.8rem', color: '#0d904f', fontWeight: '600' }}>
                                  Visited: {new Date(lead.siteVisitDetails.completedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                </div>
                                <div style={{ marginTop: '4px' }}>
                                  {lead.maturityMeta?.isHandedOver ? (
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontSize: '0.72rem',
                                        fontWeight: '700',
                                        backgroundColor: '#f1f5f9',
                                        color: '#475569',
                                        padding: '2px 7px',
                                        borderRadius: '5px',
                                        border: '1px solid #e2e8f0',
                                      }}
                                    >
                                      🏢 Handed to Inhouse CRM
                                    </span>
                                  ) : (
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontSize: '0.72rem',
                                        fontWeight: '700',
                                        backgroundColor: '#fef3c7',
                                        color: '#b45309',
                                        padding: '2px 7px',
                                        borderRadius: '5px',
                                        border: '1px solid #fde68a',
                                      }}
                                    >
                                      ⏳ Exclusive ({lead.maturityMeta?.daysRemainingInMaturity || 5}d left)
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : lead.siteVisitDetails?.scheduledDate ? (
                              <div style={{ fontSize: '0.8rem', color: '#d97706', fontWeight: '600' }}>
                                Scheduled for {new Date(lead.siteVisitDetails.scheduledDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Not scheduled</span>
                            )}
                          </td>

                          {/* Commission Tag */}
                          <td style={{ padding: '14px 18px' }}>
                            {lead.maturityMeta?.isDebited || lead.commission?.status === 'debited' ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '4px 10px',
                                  borderRadius: '8px',
                                  backgroundColor: '#fee2e2',
                                  color: '#dc2626',
                                  fontWeight: '700',
                                  fontSize: '0.8rem',
                                  border: '1px solid #fca5a5',
                                }}
                                title="Commission debited because 5-day exclusive window expired without booking conversion"
                              >
                                <XCircle size={13} />
                                <span>- ₹{(lead.commission?.amount || 0).toLocaleString('en-IN')} Debited</span>
                              </span>
                            ) : isMatured ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '4px 10px',
                                  borderRadius: '8px',
                                  backgroundColor: '#e6f4ea',
                                  color: '#0d904f',
                                  fontWeight: '700',
                                  fontSize: '0.8rem',
                                  border: '1px solid #bbf7d0',
                                }}
                              >
                                <CheckCircle2 size={13} />
                                <span>+ ₹{(lead.commission?.amount || 0).toLocaleString('en-IN')} Credited</span>
                              </span>
                            ) : (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '4px 8px',
                                  borderRadius: '8px',
                                  backgroundColor: '#fffbeb',
                                  color: '#b45309',
                                  fontWeight: '600',
                                  fontSize: '0.75rem',
                                }}
                              >
                                <Clock size={12} />
                                <span>Pending Site Visit</span>
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                            {lead.status === 'site_visit_completed_pending_approval' || lead.siteVisitDetails?.approvalStatus === 'pending' ? (
                              isInhouse ? (
                                <button
                                  onClick={() => {
                                    setSelectedLeadForReview(lead);
                                    setIsReviewModalOpen(true);
                                  }}
                                  title="Review and approve site visit to credit commission"
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    backgroundColor: '#1a73e8',
                                    color: '#ffffff',
                                    border: 'none',
                                    fontSize: '0.78rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 6px rgba(26,115,232,0.3)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <ShieldCheck size={13} />
                                  <span>Approve Visit</span>
                                </button>
                              ) : (
                                <span style={{ padding: '4px 8px', borderRadius: '6px', backgroundColor: '#fef3c7', color: '#b45309', fontSize: '0.74rem', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                  <Clock size={11} /> Pending Inhouse Approval
                                </span>
                              )
                            ) : !isMatured ? (
                              <button
                                onClick={() => {
                                  setSelectedLeadForMaturity(lead);
                                  setMatureModalOpen(true);
                                }}
                                title="Submit site visit for inhouse verification"
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  backgroundColor: '#0d904f',
                                  color: '#ffffff',
                                  border: 'none',
                                  fontSize: '0.78rem',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 6px rgba(13,144,79,0.25)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <CheckCircle2 size={13} />
                                <span>Complete Visit</span>
                              </button>
                            ) : lead.maturityMeta?.isDebited ? (
                              <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '600' }}>
                                Handed Over
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.78rem', color: '#0d904f', fontWeight: '600' }}>
                                Active in Window ✓
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB: VERIFIED SITE VISITS                                */}
      {/* ======================================================== */}
      {activeTab === 'visits' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: '800', color: '#1e293b' }}>
                My Verified Site Visits Ledger ({siteVisits.length})
              </h3>
              <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>
                When your visiting party books a flat, the commission is <strong>automatically calculated and credited</strong> to your wallet.
              </p>
            </div>

            <button
              onClick={() => setSiteVisitModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '10px',
                backgroundColor: '#10b981',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.86rem',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)'
              }}
            >
              <Plus size={16} /> Log New Site Visit
            </button>
          </div>

          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
            }}
          >
            {siteVisits.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                <ShieldCheck size={44} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
                <h4 style={{ margin: '0 0 6px', fontSize: '1.05rem', color: '#334155' }}>No Site Visits Logged Yet</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}>
                  Log your customer visits with photo proofs at the site to qualify for automated commission credits upon flat booking.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                      <th style={{ padding: '14px 18px', fontWeight: '700' }}>Visit Code & Date</th>
                      <th style={{ padding: '14px 18px', fontWeight: '700' }}>Visiting Party</th>
                      <th style={{ padding: '14px 18px', fontWeight: '700' }}>Project & Units Visited</th>
                      <th style={{ padding: '14px 18px', fontWeight: '700' }}>Proof Document</th>
                      <th style={{ padding: '14px 18px', fontWeight: '700' }}>Verification Status</th>
                      <th style={{ padding: '14px 18px', fontWeight: '700' }}>Automated Commission</th>
                      <th style={{ padding: '14px 18px', fontWeight: '700', textAlign: 'right' }}>Inhouse Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {siteVisits.map((visit) => {
                      const isPending = visit.verificationStatus === 'pending';
                      const isApproved = visit.verificationStatus === 'approved';
                      const isRejected = visit.verificationStatus === 'rejected';
                      const isBooked = visit.bookingStatus === 'booked';

                      return (
                        <tr key={visit._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '14px 18px' }}>
                            <strong style={{ color: '#1a73e8', display: 'block' }}>{visit.visitCode}</strong>
                            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                              {new Date(visit.visitDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </td>

                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontWeight: '800', color: '#1e293b' }}>{visit.partyName}</div>
                            <div style={{ fontSize: '0.76rem', color: '#1a73e8', fontWeight: '700' }}>📞 {visit.partyMobile}</div>
                          </td>

                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontWeight: '700', color: '#334155' }}>{visit.projectId?.projectName || 'Krishna Valley'}</div>
                            {visit.flatIds && visit.flatIds.length > 0 ? (
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                                {visit.flatIds.map((f) => (
                                  <span key={f._id || f} style={{ fontSize: '0.68rem', padding: '1px 5px', background: '#f1f5f9', color: '#334155', borderRadius: '3px', fontWeight: '700' }}>
                                    Flat {f.flatNumber || 'Unit'}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </td>

                          <td style={{ padding: '14px 18px' }}>
                            {visit.partySelfieUrl ? (
                              <a
                                href={visit.partySelfieUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', color: '#1a73e8', fontSize: '0.74rem', fontWeight: '700' }}
                              >
                                <img
                                  src={visit.partySelfieUrl}
                                  alt="Selfie"
                                  style={{ width: '28px', height: '28px', borderRadius: '4px', objectFit: 'cover', border: '1px solid #cbd5e1' }}
                                />
                                <span>View Photo</span>
                              </a>
                            ) : (
                              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>No photo</span>
                            )}
                          </td>

                          <td style={{ padding: '14px 18px' }}>
                            {isPending && (
                              <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#fef3c7', color: '#b45309', fontWeight: '800', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Clock size={11} /> Pending Review
                              </span>
                            )}
                            {isApproved && (
                              <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#dcfce7', color: '#15803d', fontWeight: '800', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle2 size={11} /> Approved
                              </span>
                            )}
                            {isRejected && (
                              <span title={visit.rejectionReason} style={{ padding: '3px 8px', borderRadius: '12px', background: '#fee2e2', color: '#b91c1c', fontWeight: '800', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <AlertCircle size={11} /> Rejected
                              </span>
                            )}
                          </td>

                          <td style={{ padding: '14px 18px' }}>
                            {isBooked ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ padding: '3px 8px', borderRadius: '6px', background: '#f3e8ff', color: '#7e22ce', fontWeight: '800', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <Award size={12} /> Deal Booked
                                </span>
                                <span style={{ fontSize: '0.76rem', fontWeight: '800', color: '#15803d' }}>
                                  + ₹{(visit.commissionAmount || 0).toLocaleString('en-IN')} Credited
                                </span>
                              </div>
                            ) : isApproved ? (
                              <span style={{ fontSize: '0.74rem', color: '#15803d', fontWeight: '700' }}>
                                ✓ Eligible for Auto-Credit upon Booking
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                Awaiting management verification
                              </span>
                            )}
                          </td>

                          <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                            {isPending ? (
                              isInhouse ? (
                                <button
                                  onClick={() => {
                                    setSelectedVisitForVerify(visit);
                                    setIsVerifyModalOpen(true);
                                  }}
                                  title="Inspect proof and approve site visit"
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    backgroundColor: '#1a73e8',
                                    color: '#ffffff',
                                    border: 'none',
                                    fontSize: '0.78rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 6px rgba(26,115,232,0.3)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <ShieldCheck size={13} />
                                  <span>Verify & Approve</span>
                                </button>
                              ) : (
                                <span style={{ fontSize: '0.74rem', color: '#b45309', fontWeight: '700' }}>
                                  ⏳ Inhouse Review
                                </span>
                              )
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedVisitForVerify(visit);
                                  setIsVerifyModalOpen(true);
                                }}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  backgroundColor: '#f1f5f9',
                                  color: '#475569',
                                  border: '1px solid #cbd5e1',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                }}
                              >
                                View Details
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: COMMISSION STATEMENT & LEDGER                     */}
      {/* ======================================================== */}
      {activeTab === 'commissions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>
                  Commission Account Ledger
                </h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                  Itemized audit of site visit credits and 5-day unclosed maturity debits.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Net Wallet Balance</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1a73e8' }}>
                    ₹{(agentProfile.walletBalance || 0).toLocaleString('en-IN')}
                  </div>
                </div>

                {dashboardData?.metrics?.totalDebited > 0 && (
                  <div style={{ textAlign: 'right', borderLeft: '1px solid #e2e8f0', paddingLeft: '16px' }}>
                    <div style={{ fontSize: '0.74rem', color: '#dc2626', fontWeight: '600', textTransform: 'uppercase' }}>Expired Debits</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#dc2626' }}>
                      - ₹{(dashboardData.metrics.totalDebited || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {commissions.length === 0 ? (
              <div style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                <DollarSign size={32} style={{ margin: '0 auto 8px', color: '#cbd5e1' }} />
                <p style={{ margin: 0, fontSize: '0.9rem' }}>No commission records yet. Completed site visits will automatically appear here.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>
                      <th style={{ padding: '12px 16px' }}>Date</th>
                      <th style={{ padding: '12px 16px' }}>Client Lead</th>
                      <th style={{ padding: '12px 16px' }}>Event & Remarks</th>
                      <th style={{ padding: '12px 16px' }}>Base Value</th>
                      <th style={{ padding: '12px 16px' }}>Transaction Amount</th>
                      <th style={{ padding: '12px 16px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.map((comm) => {
                      const isDebit = comm.transactionType === 'debit' || comm.status === 'debited';
                      return (
                        <tr key={comm._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 16px', color: '#475569', whiteSpace: 'nowrap' }}>
                            {new Date(comm.debitedAt || comm.creditedAt || comm.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>

                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: '700', color: '#0f172a' }}>
                              {comm.leadName}
                            </div>
                            {comm.leadMobile && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{comm.leadMobile}</div>}
                          </td>

                          <td style={{ padding: '12px 16px', maxWidth: '280px' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: '600', color: isDebit ? '#dc2626' : '#1e293b' }}>
                              {isDebit ? '5-Day Maturity Window Expiration' : 'Site Visit Completed Credit'}
                            </div>
                            {comm.remarks && (
                              <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px', lineHeight: 1.3 }}>
                                {comm.remarks}
                              </div>
                            )}
                          </td>

                          <td style={{ padding: '12px 16px', color: '#334155' }}>
                            ₹{(comm.baseAmount || 0).toLocaleString('en-IN')}
                          </td>

                          <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                            <span
                              style={{
                                fontSize: '0.95rem',
                                fontWeight: '800',
                                color: isDebit ? '#dc2626' : '#0d904f',
                              }}
                            >
                              {isDebit ? '- ' : '+ '}₹{(comm.calculatedAmount || 0).toLocaleString('en-IN')}
                            </span>
                          </td>

                          <td style={{ padding: '12px 16px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                backgroundColor: isDebit ? '#fee2e2' : '#e6f4ea',
                                color: isDebit ? '#dc2626' : '#0d904f',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                textTransform: 'capitalize',
                              }}
                            >
                              {isDebit ? 'Debited' : comm.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: AUDIT & ACTIVITY TRAIL                             */}
      {/* ======================================================== */}
      {activeTab === 'audit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Audit KPI Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#eff6ff', color: '#1a73e8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '600' }}>Total Events</div>
                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a' }}>{auditLogs.length}</div>
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '600' }}>Approved Visits</div>
                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#15803d' }}>
                  {auditLogs.filter((l) => l.action === 'SITE_VISIT_APPROVED' || l.action === 'APPROVE').length}
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#fee2e2', color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <XCircle size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '600' }}>Rejections</div>
                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#b91c1c' }}>
                  {auditLogs.filter((l) => l.action === 'SITE_VISIT_REJECTED' || l.action === 'REJECT').length}
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#f0fdf4', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DollarSign size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '600' }}>Commission Credits</div>
                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0d9488' }}>
                  {auditLogs.filter((l) => l.action === 'COMMISSION_CREDIT').length}
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#fff7ed', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '600' }}>Lead Submissions</div>
                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#ea580c' }}>
                  {auditLogs.filter((l) => l.action === 'LEAD_SUBMITTED' || l.action === 'CREATE').length}
                </div>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '14px 18px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1', minWidth: '240px' }}>
              <Search size={16} color="#94a3b8" />
              <input
                type="text"
                placeholder="Search audit trail by summary, actor, or code..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.88rem',
                  width: '100%',
                  color: '#1e293b',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <Filter size={15} color="#94a3b8" />
              <select
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                  fontSize: '0.82rem',
                  color: '#334155',
                  fontWeight: '600',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="all">All Actions</option>
                <option value="SITE_VISIT_APPROVED">Approvals (SITE_VISIT_APPROVED)</option>
                <option value="SITE_VISIT_REJECTED">Rejections (SITE_VISIT_REJECTED)</option>
                <option value="SITE_VISIT_LOGGED">Site Visits Logged</option>
                <option value="COMMISSION_CREDIT">Commission Credits</option>
                <option value="COMMISSION_DEBIT">Commission Debits</option>
                <option value="LEAD_SUBMITTED">Lead Submissions</option>
              </select>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            }}
          >
            {filteredAuditLogs.length === 0 ? (
              <div style={{ padding: '60px 24px', textAlign: 'center', color: '#64748b' }}>
                <History size={48} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
                <h4 style={{ margin: '0 0 6px', color: '#1e293b', fontSize: '1.1rem' }}>No Audit Logs Recorded</h4>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>
                  All agent submissions, manager reviews, and commission movements are tracked and audited in real-time.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '14px 18px', fontWeight: '700', color: '#475569' }}>Timestamp</th>
                      <th style={{ padding: '14px 18px', fontWeight: '700', color: '#475569' }}>Action & Module</th>
                      <th style={{ padding: '14px 18px', fontWeight: '700', color: '#475569' }}>Performed By</th>
                      <th style={{ padding: '14px 18px', fontWeight: '700', color: '#475569' }}>Resource</th>
                      <th style={{ padding: '14px 18px', fontWeight: '700', color: '#475569' }}>Audit Summary & Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAuditLogs.map((log) => {
                      const actionColor = getAuditActionColor(log.action);
                      return (
                        <tr key={log._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.82rem' }}>
                              {new Date(log.timestamp).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                              {new Date(log.timestamp).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </td>

                          <td style={{ padding: '14px 18px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                backgroundColor: actionColor.bg,
                                color: actionColor.color,
                                border: `1px solid ${actionColor.border}`,
                                fontSize: '0.72rem',
                                fontWeight: '700',
                              }}
                            >
                              {log.action}
                            </span>
                            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '3px' }}>
                              Type: {log.eventType || 'CRUD'}
                            </div>
                          </td>

                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontWeight: '600', color: '#1e293b' }}>
                              {log.performedBy?.name || log.performedBy?.username || 'System Engine'}
                            </div>
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '2px' }}>
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: '#f1f5f9',
                                  color: '#475569',
                                  fontWeight: '600',
                                  textTransform: 'uppercase',
                                }}
                              >
                                {log.performedBy?.role || 'system'}
                              </span>
                              {log.ipAddress && (
                                <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>• {log.ipAddress}</span>
                              )}
                            </div>
                          </td>

                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontWeight: '600', color: '#334155', fontSize: '0.8rem' }}>
                              {log.resourceType || log.module}
                            </div>
                            {log.resourceName && (
                              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{log.resourceName}</div>
                            )}
                          </td>

                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ color: '#1e293b', fontSize: '0.82rem', lineHeight: 1.4 }}>
                              {log.summary}
                            </div>
                            {log.changes && Object.keys(log.changes).length > 0 && (
                              <div style={{ marginTop: '6px', padding: '6px 10px', backgroundColor: '#f8fafc', borderRadius: '6px', fontSize: '0.72rem', color: '#475569', border: '1px solid #f1f5f9' }}>
                                <strong>Payload Audit:</strong> {JSON.stringify(log.changes)}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: SUBMIT / REGISTER NEW LEAD                        */}
      {/* ======================================================== */}
      {uploadModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              maxWidth: '560px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={20} style={{ color: '#1a73e8' }} />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>
                  Submit Buyer Lead
                </h3>
              </div>
              <button
                onClick={() => setUploadModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUploadLead} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Client Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Chandra Sharma"
                  value={leadFormData.name}
                  onChange={(e) => setLeadFormData({ ...leadFormData, name: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={leadFormData.mobileNo}
                    onChange={(e) => setLeadFormData({ ...leadFormData, mobileNo: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="client@gmail.com"
                    value={leadFormData.email}
                    onChange={(e) => setLeadFormData({ ...leadFormData, email: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Property Requirement
                  </label>
                  <select
                    value={leadFormData.requirement}
                    onChange={(e) => setLeadFormData({ ...leadFormData, requirement: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box', backgroundColor: '#ffffff' }}
                  >
                    <option value="1BHK Studio Apartment">1BHK Studio Apartment</option>
                    <option value="2BHK Apartment">2BHK Apartment</option>
                    <option value="3BHK Premium Suite">3BHK Premium Suite</option>
                    <option value="Service Apartment">Service Apartment</option>
                    <option value="Luxury Villa / Duplex">Luxury Villa / Duplex</option>
                    <option value="Commercial Shop / Retail">Commercial Shop / Retail</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Estimated Budget (₹)
                  </label>
                  <input
                    type="number"
                    step="50000"
                    placeholder="e.g. 5000000"
                    value={leadFormData.budget}
                    onChange={(e) => setLeadFormData({ ...leadFormData, budget: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Schedule Site Visit (Optional)
                </label>
                <input
                  type="date"
                  value={leadFormData.scheduledSiteVisitDate}
                  onChange={(e) => setLeadFormData({ ...leadFormData, scheduledSiteVisitDate: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Initial Notes / Client Preferences
                </label>
                <textarea
                  rows="2"
                  placeholder="e.g. Client interested in Tower B 3rd Floor garden facing unit..."
                  value={leadFormData.initialNotes}
                  onChange={(e) => setLeadFormData({ ...leadFormData, initialNotes: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontSize: '0.9rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: '#1a73e8',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    fontWeight: '700',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {actionLoading ? 'Registering...' : 'Register Buyer Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: COMPLETE SITE VISIT & MATURE COMMISSION           */}
      {/* ======================================================== */}
      {matureModalOpen && selectedLeadForMaturity && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              maxWidth: '520px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={22} style={{ color: '#0d904f' }} />
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>
                  Verify & Complete Site Visit
                </h3>
              </div>
              <button
                onClick={() => setMatureModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: '18px' }}>
              <div style={{ fontSize: '0.85rem', color: '#166534', fontWeight: '600' }}>
                Lead: <strong>{selectedLeadForMaturity.name}</strong> ({selectedLeadForMaturity.mobileNo})
              </div>
              <div style={{ fontSize: '0.82rem', color: '#15803d', marginTop: '4px' }}>
                Estimated Commission: <strong>
                  {agentProfile.commissionType === 'percentage'
                    ? `₹${Math.round(((selectedLeadForMaturity.budget || 4500000) * (agentProfile.commissionRate || 2)) / 100).toLocaleString('en-IN')} (${agentProfile.commissionRate}% of ₹${(selectedLeadForMaturity.budget || 4500000).toLocaleString('en-IN')})`
                    : `₹${(agentProfile.commissionRate || 25000).toLocaleString('en-IN')} Flat`}
                </strong> will be instantly credited to your wallet upon verification!
              </div>
            </div>

            <form onSubmit={handleCompleteSiteVisit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Site Visit Completion Date
                </label>
                <input
                  type="date"
                  required
                  value={maturityFormData.completedDate}
                  onChange={(e) => setMaturityFormData({ ...maturityFormData, completedDate: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Visit Feedback & Client Response
                </label>
                <textarea
                  rows="3"
                  required
                  value={maturityFormData.feedback}
                  onChange={(e) => setMaturityFormData({ ...maturityFormData, feedback: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setMatureModalOpen(false)}
                  style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontSize: '0.9rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: '#0d904f',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    fontWeight: '700',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {actionLoading ? 'Verifying & Crediting...' : 'Confirm & Credit Commission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LOG VERIFIED SITE VISIT */}
      <NewSiteVisitModal
        isOpen={siteVisitModalOpen}
        onClose={() => setSiteVisitModalOpen(false)}
        onSubmitSuccess={loadData}
      />

      {/* MODAL: INHOUSE VERIFY SITE VISIT */}
      <VerifySiteVisitModal
        isOpen={isVerifyModalOpen}
        onClose={() => {
          setIsVerifyModalOpen(false);
          setSelectedVisitForVerify(null);
        }}
        visit={selectedVisitForVerify}
        onVerificationSuccess={() => {
          showToast('Site visit status updated successfully!');
          loadData();
        }}
      />

      {/* MODAL: INHOUSE REVIEW CRM LEAD SITE VISIT */}
      <ReviewSiteVisitModal
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false);
          setSelectedLeadForReview(null);
        }}
        lead={selectedLeadForReview}
        onApprovalSuccess={(msg) => {
          showToast(msg);
          loadData();
        }}
      />
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AgentPortalPage;
