import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { agentService } from '../../services/agentService.js';
import { leadService } from '../../services/leadService.js';
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
  XCircle,
  X,
  ExternalLink,
  Activity,
  History,
  ArrowLeft,
  Star,
  Briefcase,
  Shield,
  Eye,
  CheckSquare,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  AlertTriangle
} from 'lucide-react';

export const AgentProfilePage = () => {
  const { agentId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  // If no agentId in url params, check query string or redirect to directory
  const targetAgentId = agentId || searchParams.get('agentId');

  const tabParam = searchParams.get('tab') || 'leads';
  const [activeTab, setActiveTab] = useState(tabParam);

  useEffect(() => {
    if (searchParams.get('tab')) {
      setActiveTab(searchParams.get('tab'));
    }
  }, [searchParams]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
  };

  const [loading, setLoading] = useState(true);
  const [agentData, setAgentData] = useState(null);
  const [leads, setLeads] = useState([]);
  const [siteVisits, setSiteVisits] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Search & Filters
  const [leadSearch, setLeadSearch] = useState('');
  const [leadStatusFilter, setLeadStatusFilter] = useState('all');
  const [visitStatusFilter, setVisitStatusFilter] = useState('all');
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('all');

  // Modals & Selected items
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedLeadForReview, setSelectedLeadForReview] = useState(null);
  const [selectedLeadForTimeline, setSelectedLeadForTimeline] = useState(null);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [feedbackToast, setFeedbackToast] = useState({ message: '', type: '' });

  const showToast = (message, type = 'success') => {
    setFeedbackToast({ message, type });
    setTimeout(() => setFeedbackToast({ message: '', type: '' }), 5000);
  };

  const loadProfileData = useCallback(async () => {
    if (!targetAgentId) {
      navigate('/agent-network', { replace: true });
      return;
    }

    setLoading(true);
    try {
      const [dashRes, leadsRes, visitsRes, commsRes, auditRes] = await Promise.all([
        agentService.getDashboard(targetAgentId),
        agentService.getLeads({ agentId: targetAgentId }),
        agentService.getSiteVisits({ agentId: targetAgentId }),
        agentService.getCommissions(targetAgentId),
        agentService.getAgentAuditLogs({ agentId: targetAgentId }),
      ]);

      if (dashRes.success) setAgentData(dashRes.data);
      if (leadsRes.success) setLeads(leadsRes.data || []);
      if (visitsRes.success) setSiteVisits(visitsRes.data || []);
      if (commsRes.success) setCommissions(commsRes.data || []);
      if (auditRes.success) setAuditLogs(auditRes.data || []);
    } catch (err) {
      console.error('Failed to load agent profile data:', err);
      showToast(err.message || 'Failed to load agent profile', 'error');
    } finally {
      setLoading(false);
    }
  }, [targetAgentId, navigate]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  const agent = agentData?.agent || {};
  const ap = agent.agentProfile || {};

  const tierColor = (tier) => {
    switch (tier) {
      case 'Platinum': return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
      case 'Gold': return { bg: '#fffbeb', color: '#b45309', border: '#fde68a' };
      case 'Silver': return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
      default: return { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' };
    }
  };

  const tc = tierColor(ap.tier);

  // Filtered Leads
  const filteredLeads = leads.filter((lead) => {
    const matchesStatus = leadStatusFilter === 'all' || lead.status === leadStatusFilter;
    const matchesSearch =
      leadSearch === '' ||
      lead.name?.toLowerCase().includes(leadSearch.toLowerCase()) ||
      lead.mobileNo?.includes(leadSearch) ||
      (lead.email && lead.email.toLowerCase().includes(leadSearch.toLowerCase())) ||
      (lead.requirement && lead.requirement.toLowerCase().includes(leadSearch.toLowerCase()));

    return matchesStatus && matchesSearch;
  });

  // Filtered Site Visits
  const filteredVisits = siteVisits.filter((v) => {
    if (visitStatusFilter === 'all') return true;
    return v.verificationStatus === visitStatusFilter;
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'new':
        return { label: 'New Lead', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
      case 'contacted':
        return { label: 'Contacted', bg: '#fef3c7', color: '#b45309', border: '#fde68a' };
      case 'site_visit_scheduled':
        return { label: 'Visit Scheduled', bg: '#ede9fe', color: '#6d28d9', border: '#ddd6fe' };
      case 'site_visit_completed_pending_approval':
        return { label: 'Pending Approval', bg: '#fef3c7', color: '#b45309', border: '#f59e0b' };
      case 'site_visit_completed':
      case 'matured':
        return { label: 'Visit Approved', bg: '#dcfce7', color: '#15803d', border: '#86efac' };
      case 'site_visit_rejected':
        return { label: 'Visit Rejected', bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' };
      case 'booked':
        return { label: 'Deal Booked', bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' };
      case 'lost':
        return { label: 'Lost / Closed', bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' };
      default:
        return { label: status, bg: '#f8fafc', color: '#475569', border: '#e2e8f0' };
    }
  };

  return (
    <div style={{ padding: '24px 32px', fontFamily: "'Inter', sans-serif", maxWidth: '1600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
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

      {/* Top Breadcrumb & Actions Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <Link
          to="/agent-network"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: '#1a73e8',
            fontSize: '0.88rem',
            fontWeight: '700',
            textDecoration: 'none',
            padding: '6px 12px',
            borderRadius: '8px',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
          }}
        >
          <ArrowLeft size={16} /> Back to Channel Partner Directory
        </Link>

        <button
          onClick={loadProfileData}
          style={{
            padding: '8px 16px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            color: '#334155',
            fontSize: '0.84rem',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          <RefreshCw size={14} /> Refresh Profile
        </button>
      </div>

      {/* Agent Hero Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0284c7 100%)',
          borderRadius: '20px',
          padding: '28px 32px',
          color: '#ffffff',
          boxShadow: '0 12px 36px rgba(15, 23, 42, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '24px',
        }}
      >
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              border: '3px solid rgba(255, 255, 255, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: '800',
              fontSize: '1.5rem',
              flexShrink: 0,
              boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
            }}
          >
            {(agent.firstName?.[0] || '').toUpperCase()}{(agent.lastName?.[0] || '').toUpperCase()}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.02em' }}>
                {agent.firstName} {agent.lastName || ''}
              </h1>
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  letterSpacing: '0.04em',
                }}
              >
                {ap.agentCode || 'AGT-PARTNER'}
              </span>
              {ap.tier && (
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: '12px',
                    backgroundColor: tc.bg,
                    color: tc.color,
                    fontSize: '0.78rem',
                    fontWeight: '800',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Star size={12} /> {ap.tier} Partner
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', fontSize: '0.85rem', color: '#cbd5e1', flexWrap: 'wrap' }}>
              <span><Building2 size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{ap.agencyName || 'Direct Channel Partner'}</span>
              <span>•</span>
              <span><MapPin size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{ap.city || 'Mathura/Vrindavan'}</span>
              <span>•</span>
              <span><Phone size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{agent.mobileNo || '—'}</span>
              <span>•</span>
              <span><Mail size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{agent.email || '—'}</span>
            </div>
          </div>
        </div>

        {/* Commission Terms Card in Banner */}
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(10px)',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            minWidth: '220px',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#93c5fd', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Commission Setup
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#6ee7b7' }}>
            {ap.commissionRate || 2}% Comm Rate
          </div>
          <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
            Credited upon inhouse verified site visits
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '18px 20px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Wallet Balance</div>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0d904f', marginTop: '2px' }}>
              ₹{(ap.walletBalance || 0).toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>Available for payout</div>
          </div>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#e6f4ea', color: '#0d904f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wallet size={22} />
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '18px 20px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Total Earned</div>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#1e293b', marginTop: '2px' }}>
              ₹{(ap.totalEarned || 0).toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>{commissions.length} payouts logged</div>
          </div>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#eff6ff', color: '#1a73e8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={22} />
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '18px 20px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Total Uploaded Leads</div>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
              {leads.length}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
              {leads.filter(l => l.status === 'site_visit_completed_pending_approval').length} awaiting review
            </div>
          </div>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#faf5ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={22} />
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '18px 20px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Site Visits Logged</div>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#ea580c', marginTop: '2px' }}>
              {siteVisits.length}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
              {siteVisits.filter(v => v.verificationStatus === 'approved').length} verified & approved
            </div>
          </div>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#fff7ed', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={22} />
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', gap: '24px', overflowX: 'auto' }}>
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
            whiteSpace: 'nowrap',
          }}
        >
          <Users size={18} />
          <span>Leads Pipeline & Activity Tracks ({leads.length})</span>
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
            whiteSpace: 'nowrap',
          }}
        >
          <ShieldCheck size={18} />
          <span>Site Visits & Approval Desk ({siteVisits.length})</span>
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
            whiteSpace: 'nowrap',
          }}
        >
          <DollarSign size={18} />
          <span>Commission Statement ({commissions.length})</span>
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
            whiteSpace: 'nowrap',
          }}
        >
          <Activity size={18} />
          <span>Audit & Activity Trail ({auditLogs.length})</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: ALL LEADS WITH LIVE TRACKS & TIMELINE            */}
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
              boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1', minWidth: '240px' }}>
              <Search size={16} color="#94a3b8" />
              <input
                type="text"
                placeholder="Search leads by name, mobile, email, or requirement..."
                value={leadSearch}
                onChange={(e) => setLeadSearch(e.target.value)}
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
                value={leadStatusFilter}
                onChange={(e) => setLeadStatusFilter(e.target.value)}
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
                <option value="all">All Lead Stages</option>
                <option value="new">New Leads</option>
                <option value="contacted">Contacted</option>
                <option value="site_visit_scheduled">Site Visit Scheduled</option>
                <option value="site_visit_completed_pending_approval">Pending Inhouse Approval</option>
                <option value="site_visit_completed">Site Visit Completed</option>
                <option value="booked">Deal Booked</option>
                <option value="lost">Lost / Handed Over</option>
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
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            }}
          >
            {loading ? (
              <div style={{ padding: '60px 0', textAlign: 'center' }}>
                <div style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#1a73e8', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />
                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Loading agent's leads...</span>
              </div>
            ) : filteredLeads.length === 0 ? (
              <div style={{ padding: '60px 24px', textAlign: 'center', color: '#64748b' }}>
                <Users size={44} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
                <h4 style={{ margin: '0 0 6px', color: '#1e293b' }}>No Leads Found</h4>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>No leads match your current search or filter.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '14px 18px', fontWeight: '700', color: '#475569' }}>Prospect Client</th>
                      <th style={{ padding: '14px 18px', fontWeight: '700', color: '#475569' }}>Requirement & Budget</th>
                      <th style={{ padding: '14px 18px', fontWeight: '700', color: '#475569' }}>Assigned Project / Flat</th>
                      <th style={{ padding: '14px 18px', fontWeight: '700', color: '#475569' }}>Current Stage</th>
                      <th style={{ padding: '14px 18px', fontWeight: '700', color: '#475569' }}>5-Day Maturity Window</th>
                      <th style={{ padding: '14px 18px', fontWeight: '700', textAlign: 'right', color: '#475569' }}>Actions & Timeline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead) => {
                      const sb = getStatusBadge(lead.status);
                      const isPendingApproval = lead.status === 'site_visit_completed_pending_approval' || lead.siteVisitDetails?.approvalStatus === 'pending';
                      const meta = lead.maturityMeta || {};

                      return (
                        <tr key={lead._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontWeight: '700', color: '#0f172a' }}>{lead.name}</div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b', display: 'flex', gap: '8px', marginTop: '2px' }}>
                              <span><Phone size={11} style={{ marginRight: '2px' }} />{lead.mobileNo}</span>
                              {lead.email && <span><Mail size={11} style={{ marginRight: '2px' }} />{lead.email}</span>}
                            </div>
                          </td>

                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontWeight: '600', color: '#334155' }}>{lead.requirement || '2BHK Apartment'}</div>
                            <div style={{ fontSize: '0.74rem', color: '#0d904f', fontWeight: '700', marginTop: '2px' }}>
                              ₹{(lead.budget || 4500000).toLocaleString('en-IN')}
                            </div>
                          </td>

                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontWeight: '600', color: '#334155' }}>
                              {lead.assignedFlat?.projectId?.projectName || 'Krishna Valley'}
                            </div>
                            {lead.assignedFlat?.flatNumber && (
                              <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                                Flat: {lead.assignedFlat.flatNumber}
                              </div>
                            )}
                          </td>

                          <td style={{ padding: '14px 18px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 10px',
                                borderRadius: '20px',
                                backgroundColor: sb.bg,
                                color: sb.color,
                                border: `1px solid ${sb.border}`,
                                fontSize: '0.72rem',
                                fontWeight: '700',
                              }}
                            >
                              {sb.label}
                            </span>
                          </td>

                          <td style={{ padding: '14px 18px' }}>
                            {lead.siteVisitDetails?.completedDate ? (
                              meta.isHandedOver || meta.isDebited ? (
                                <span style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: '700', backgroundColor: '#fee2e2', padding: '2px 8px', borderRadius: '6px' }}>
                                  Handed over to inhouse CRM
                                </span>
                              ) : (
                                <div>
                                  <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#15803d' }}>
                                    {meta.daysRemainingInMaturity || 5} day{meta.daysRemainingInMaturity > 1 ? 's' : ''} left
                                  </div>
                                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                    Handover: {new Date(meta.handoverDate || Date.now()).toLocaleDateString('en-IN')}
                                  </div>
                                </div>
                              )
                            ) : (
                              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Site visit not completed</span>
                            )}
                          </td>

                          <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                              {/* Inhouse Review & Approve Button */}
                              {isPendingApproval && (
                                <button
                                  onClick={() => {
                                    setSelectedLeadForReview({
                                      ...lead,
                                      agentId: {
                                        _id: agent._id,
                                        firstName: agent.firstName,
                                        lastName: agent.lastName,
                                        username: agent.username,
                                        agentProfile: ap,
                                      },
                                    });
                                    setIsReviewModalOpen(true);
                                  }}
                                  style={{
                                    padding: '5px 12px',
                                    borderRadius: '8px',
                                    backgroundColor: '#10b981',
                                    color: '#ffffff',
                                    border: 'none',
                                    fontSize: '0.74rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
                                  }}
                                >
                                  <ShieldCheck size={12} /> Approve Visit
                                </button>
                              )}

                              {/* Lead Track & Timeline Button */}
                              <button
                                onClick={() => setSelectedLeadForTimeline(lead)}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '8px',
                                  backgroundColor: '#f1f5f9',
                                  color: '#334155',
                                  border: '1px solid #cbd5e1',
                                  fontSize: '0.74rem',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <History size={12} /> Track
                              </button>
                            </div>
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
      {/* TAB 2: SITE VISITS & INHOUSE APPROVAL DESK               */}
      {/* ======================================================== */}
      {activeTab === 'visits' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Filter Bar */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.92rem' }}>
              Site Visits Logged by {agent.firstName} ({siteVisits.length})
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Filter size={15} color="#94a3b8" />
              <select
                value={visitStatusFilter}
                onChange={(e) => setVisitStatusFilter(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                  fontSize: '0.82rem',
                  color: '#334155',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Verification Status</option>
                <option value="pending">Pending Approval</option>
                <option value="approved">Approved & Credited</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Visits Table */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            }}
          >
            {filteredVisits.length === 0 ? (
              <div style={{ padding: '60px 24px', textAlign: 'center', color: '#64748b' }}>
                <ShieldCheck size={44} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
                <h4 style={{ margin: '0 0 6px', color: '#1e293b' }}>No Site Visits Found</h4>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>No site visits match the selected filter.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '14px 18px', fontWeight: '700', color: '#475569' }}>Visit Code & Date</th>
                      <th style={{ padding: '14px 18px', fontWeight: '700', color: '#475569' }}>Client Name & Mobile</th>
                      <th style={{ padding: '14px 18px', fontWeight: '700', color: '#475569' }}>Project & Flats</th>
                      <th style={{ padding: '14px 18px', fontWeight: '700', color: '#475569' }}>On-Site Proof</th>
                      <th style={{ padding: '14px 18px', fontWeight: '700', color: '#475569' }}>Status</th>
                      <th style={{ padding: '14px 18px', fontWeight: '700', textAlign: 'right', color: '#475569' }}>Inhouse Review</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVisits.map((visit) => {
                      const isPending = visit.verificationStatus === 'pending';
                      const isApproved = visit.verificationStatus === 'approved';
                      const isRejected = visit.verificationStatus === 'rejected';

                      return (
                        <tr key={visit._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontWeight: '700', color: '#1a73e8' }}>{visit.visitCode}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                              {new Date(visit.visitDate).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </div>
                          </td>

                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontWeight: '700', color: '#0f172a' }}>{visit.partyName}</div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                              <Phone size={11} style={{ marginRight: '2px' }} />{visit.partyMobile}
                            </div>
                          </td>

                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontWeight: '600', color: '#334155' }}>
                              {visit.projectId?.projectName || 'Krishna Valley Project'}
                            </div>
                            {visit.flatIds && visit.flatIds.length > 0 && (
                              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                Flats: {visit.flatIds.map(f => f.flatNumber).join(', ')}
                              </div>
                            )}
                          </td>

                          <td style={{ padding: '14px 18px' }}>
                            {visit.partySelfieUrl ? (
                              <button
                                onClick={() => setPreviewImageUrl(visit.partySelfieUrl)}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  backgroundColor: '#eff6ff',
                                  border: '1px solid #bfdbfe',
                                  color: '#1d4ed8',
                                  fontSize: '0.72rem',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <Eye size={11} /> View Photo
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>No Photo</span>
                            )}
                          </td>

                          <td style={{ padding: '14px 18px' }}>
                            <span
                              style={{
                                padding: '3px 10px',
                                borderRadius: '14px',
                                fontSize: '0.72rem',
                                fontWeight: '700',
                                backgroundColor: isApproved ? '#dcfce7' : isRejected ? '#fee2e2' : '#fef3c7',
                                color: isApproved ? '#15803d' : isRejected ? '#b91c1c' : '#b45309',
                                border: isApproved ? '1px solid #86efac' : isRejected ? '1px solid #fca5a5' : '1px solid #fde68a',
                              }}
                            >
                              {isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Pending Approval'}
                            </span>
                          </td>

                          <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                            {isPending ? (
                              <button
                                onClick={() => {
                                  // Open review modal for this site visit's linked lead
                                  setSelectedLeadForReview({
                                    _id: visit.leadId || visit._id,
                                    name: visit.partyName,
                                    mobileNo: visit.partyMobile,
                                    agentId: {
                                      _id: agent._id,
                                      firstName: agent.firstName,
                                      lastName: agent.lastName,
                                      username: agent.username,
                                      agentProfile: ap,
                                    },
                                    budget: 4500000,
                                    assignedFlat: visit.flatIds?.[0],
                                  });
                                  setIsReviewModalOpen(true);
                                }}
                                style={{
                                  padding: '6px 14px',
                                  borderRadius: '8px',
                                  backgroundColor: '#1a73e8',
                                  color: '#ffffff',
                                  border: 'none',
                                  fontSize: '0.74rem',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  boxShadow: '0 2px 6px rgba(26,115,232,0.3)',
                                }}
                              >
                                <ShieldCheck size={12} /> Inspect & Approve
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                                Verified by {visit.verifiedBy?.firstName || 'Inhouse'}
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
      {/* TAB 3: COMMISSION STATEMENT & LEDGER                     */}
      {/* ======================================================== */}
      {activeTab === 'commissions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            }}
          >
            {commissions.length === 0 ? (
              <div style={{ padding: '60px 24px', textAlign: 'center', color: '#64748b' }}>
                <DollarSign size={44} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
                <h4 style={{ margin: '0 0 6px', color: '#1e293b' }}>No Commission Transactions Logged</h4>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>Commission ledger entries will appear as site visits are approved.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '14px 18px', fontWeight: '700', color: '#475569' }}>Date</th>
                      <th style={{ padding: '14px 18px', fontWeight: '700', color: '#475569' }}>Transaction Type</th>
                      <th style={{ padding: '14px 18px', fontWeight: '700', color: '#475569' }}>Client / Deal Reference</th>
                      <th style={{ padding: '14px 18px', fontWeight: '700', color: '#475569' }}>Remarks</th>
                      <th style={{ padding: '14px 18px', fontWeight: '700', textAlign: 'right', color: '#475569' }}>Amount</th>
                      <th style={{ padding: '14px 18px', fontWeight: '700', textAlign: 'right', color: '#475569' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.map((comm) => {
                      const isDebit = comm.transactionType === 'debit' || comm.status === 'debited';
                      return (
                        <tr key={comm._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: '600', color: '#0f172a' }}>
                              {new Date(comm.createdAt || comm.creditedAt).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </div>
                          </td>

                          <td style={{ padding: '14px 18px' }}>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                fontWeight: '800',
                                backgroundColor: isDebit ? '#fee2e2' : '#dcfce7',
                                color: isDebit ? '#b91c1c' : '#15803d',
                              }}
                            >
                              {isDebit ? '▼ DEBIT' : '▲ CREDIT'}
                            </span>
                          </td>

                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontWeight: '700', color: '#1e293b' }}>{comm.leadName || comm.leadId?.name || 'Direct Party'}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              Base: ₹{(comm.baseAmount || 0).toLocaleString('en-IN')}
                            </div>
                          </td>

                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ color: '#475569', fontSize: '0.78rem', maxWidth: '380px' }}>
                              {comm.remarks}
                            </div>
                          </td>

                          <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: '800', fontSize: '0.92rem', color: isDebit ? '#dc2626' : '#0d904f' }}>
                            {isDebit ? '-' : '+'}₹{(comm.calculatedAmount || 0).toLocaleString('en-IN')}
                          </td>

                          <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                backgroundColor: isDebit ? '#fee2e2' : '#e6f4ea',
                                color: isDebit ? '#dc2626' : '#0d904f',
                                fontSize: '0.72rem',
                                fontWeight: '700',
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
                <History size={44} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
                <h4 style={{ margin: '0 0 6px', color: '#1e293b' }}>No Audit Logs Recorded</h4>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>All actions regarding this agent will be audited and displayed here.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
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
                            <div style={{ fontWeight: '600', color: '#0f172a' }}>
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
                            <div style={{ fontWeight: '600', color: '#334155' }}>
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
      {/* MODAL: LEAD TRACK & TIMELINE MODAL                      */}
      {/* ======================================================== */}
      {selectedLeadForTimeline && (
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
              maxWidth: '640px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <History size={22} style={{ color: '#1a73e8' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
                    Lead Activity Track & Timeline
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Prospect: <strong>{selectedLeadForTimeline.name}</strong> ({selectedLeadForTimeline.mobileNo})
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedLeadForTimeline(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Status Header */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700' }}>CURRENT STAGE</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#1e293b' }}>
                    {getStatusBadge(selectedLeadForTimeline.status).label}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700' }}>BUDGET</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0d904f' }}>
                    ₹{(selectedLeadForTimeline.budget || 4500000).toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700' }}>REQUIREMENT</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#1a73e8' }}>
                    {selectedLeadForTimeline.requirement || '2BHK'}
                  </div>
                </div>
              </div>

              {/* Follow-up Timeline */}
              <h4 style={{ margin: '8px 0 0', fontSize: '0.88rem', fontWeight: '800', color: '#334155' }}>
                Activity & Follow-Up History
              </h4>

              {(!selectedLeadForTimeline.followUps || selectedLeadForTimeline.followUps.length === 0) ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                  No follow-ups recorded yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: '2px solid #e2e8f0', marginLeft: '8px', paddingLeft: '16px' }}>
                  {selectedLeadForTimeline.followUps.map((fu, idx) => (
                    <div key={idx} style={{ position: 'relative' }}>
                      <div
                        style={{
                          position: 'absolute',
                          left: '-22px',
                          top: '4px',
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: '#1a73e8',
                        }}
                      />
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>
                        {new Date(fu.date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })} • Mode: <strong style={{ color: '#1e293b' }}>{fu.mode}</strong> • Status: <strong style={{ color: fu.status === 'completed' ? '#15803d' : '#b45309' }}>{fu.status}</strong>
                      </div>
                      <div style={{ fontSize: '0.84rem', color: '#1e293b', marginTop: '2px', backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                        {fu.notes || 'Activity recorded.'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedLeadForTimeline(null)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  backgroundColor: '#334155',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.84rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                Close Timeline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: IMAGE PREVIEW MODAL                               */}
      {/* ======================================================== */}
      {previewImageUrl && (
        <div
          onClick={() => setPreviewImageUrl(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '24px',
          }}
        >
          <img
            src={previewImageUrl}
            alt="Site Visit Selfie Proof"
            style={{ maxWidth: '90%', maxHeight: '90vh', borderRadius: '12px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: INHOUSE REVIEW & APPROVAL DESK                    */}
      {/* ======================================================== */}
      {isReviewModalOpen && selectedLeadForReview && (
        <ReviewSiteVisitModal
          isOpen={isReviewModalOpen}
          onClose={() => {
            setIsReviewModalOpen(false);
            setSelectedLeadForReview(null);
          }}
          lead={selectedLeadForReview}
          onApprovalSuccess={(msg) => {
            showToast(msg, 'success');
            loadProfileData();
          }}
        />
      )}
    </div>
  );
};

export default AgentProfilePage;
