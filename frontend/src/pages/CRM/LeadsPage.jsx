import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { leadService } from '../../services/leadService.js';
import { salesService } from '../../services/salesService.js';
import { ManualLeadModal } from '../../components/crm/ManualLeadModal.jsx';
import { ManualFollowUpModal } from '../../components/crm/ManualFollowUpModal.jsx';
import { LeadTimelineDrawer } from '../../components/crm/LeadTimelineDrawer.jsx';
import { ConvertLeadModal } from '../../components/sales/ConvertLeadModal.jsx';
import { ReviewSiteVisitModal } from '../../components/crm/ReviewSiteVisitModal.jsx';
import { SoftphoneModal } from '../../components/crm/SoftphoneModal.jsx';
import { QuickMessageModal } from '../../components/notifications/QuickMessageModal.jsx';
import {
  Users,
  UserPlus,
  Phone,
  MessageSquare,
  Mail,
  Calendar,
  Clock,
  Search,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  History,
  Home,
  Compass,
  ArrowRight,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Filter,
  Sliders,
  Download,
  CheckCircle2,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';

export const LeadsPage = ({ onNavigateToSales }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParam = searchParams.get('search') || '';
  const tabParam = searchParams.get('tab') || '';

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(searchParam);
  const [modeFilter, setModeFilter] = useState(tabParam === 'visits' ? 'site_visit' : '');
  const [statusFilter, setStatusFilter] = useState(tabParam === 'pipeline' ? 'pending' : '');
  const [quickFilter, setQuickFilter] = useState('all');
  const [expandedLeadId, setExpandedLeadId] = useState(null);
  const [copiedText, setCopiedText] = useState('');

  // Modals state
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);

  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [activeLeadForFollowUp, setActiveLeadForFollowUp] = useState(null);

  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [activeLeadForTimeline, setActiveLeadForTimeline] = useState(null);

  // Convert to Sales Modal
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [leadToConvert, setLeadToConvert] = useState(null);

  // Inhouse Review Site Visit Modal
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedLeadForReview, setSelectedLeadForReview] = useState(null);

  // Calling Softphone & Quick Message Modals
  const [callingLead, setCallingLead] = useState(null);
  const [messagingLead, setMessagingLead] = useState(null);

  // Fetch Leads
  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (modeFilter) params.mode = modeFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await leadService.getLeads(params);
      if (res.data) setLeads(res.data);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchParam) {
      setSearchTerm(searchParam);
    }
  }, [searchParam]);

  useEffect(() => {
    if (tabParam === 'visits') {
      setModeFilter('site_visit');
      setStatusFilter('');
    } else if (tabParam === 'pipeline') {
      setModeFilter('');
      setStatusFilter('pending');
    } else {
      setModeFilter('');
      setStatusFilter('');
    }
  }, [tabParam]);

  useEffect(() => {
    fetchLeads();
  }, [modeFilter, statusFilter, searchTerm]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLeads();
  };

  // Lead CRUD Handlers
  const handleSaveLead = async (data) => {
    try {
      if (editingLead) {
        await leadService.updateLead(editingLead._id, data);
      } else {
        await leadService.createLead(data);
      }
      setIsLeadModalOpen(false);
      setEditingLead(null);
      fetchLeads();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDeleteLead = async (lead) => {
    if (window.confirm(`Delete lead "${lead.name}" and all their follow-up history?`)) {
      try {
        await leadService.deleteLead(lead._id);
        fetchLeads();
      } catch (error) {
        alert(error.message);
      }
    }
  };

  // Follow-Up Handlers
  const handleSaveFollowUp = async (data) => {
    try {
      await leadService.addFollowUp(activeLeadForFollowUp._id, data);
      setIsFollowUpModalOpen(false);
      setActiveLeadForFollowUp(null);
      if (activeLeadForTimeline && activeLeadForTimeline._id === activeLeadForFollowUp?._id) {
        const updated = await leadService.getLeadById(activeLeadForFollowUp._id);
        if (updated.data) setActiveLeadForTimeline(updated.data);
      }
      fetchLeads();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleUpdateFollowUpStatus = async (leadId, followUpId, status) => {
    try {
      await leadService.updateFollowUpStatus(leadId, followUpId, status);
      if (activeLeadForTimeline && activeLeadForTimeline._id === leadId) {
        const updated = await leadService.getLeadById(leadId);
        if (updated.data) setActiveLeadForTimeline(updated.data);
      }
      fetchLeads();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDeleteFollowUp = async (leadId, followUpId) => {
    if (window.confirm('Delete this follow-up record?')) {
      try {
        await leadService.deleteFollowUp(leadId, followUpId);
        if (activeLeadForTimeline && activeLeadForTimeline._id === leadId) {
          const updated = await leadService.getLeadById(leadId);
          if (updated.data) setActiveLeadForTimeline(updated.data);
        }
        fetchLeads();
      } catch (error) {
        alert(error.message);
      }
    }
  };

  const handleMatureSiteVisit = async (lead) => {
    if (window.confirm(`Mark site visit completed for ${lead.name} and credit commission to agent?`)) {
      try {
        const res = await leadService.matureSiteVisit(lead._id, {
          feedback: 'Site visit completed and verified by CRM Manager.',
        });
        alert(res.message || 'Site visit completed and commission credited to agent wallet!');
        fetchLeads();
      } catch (error) {
        alert(error.message);
      }
    }
  };

  // Convert to Sales Handler
  const handleConvertLead = async (data) => {
    try {
      const res = await salesService.convertLead(data);
      alert(`Lead "${leadToConvert?.name}" successfully converted and shifted to Sales & Allotment!`);
      setIsConvertModalOpen(false);
      setLeadToConvert(null);
      await fetchLeads();
    } catch (err) {
      alert(err.message || 'Failed to convert lead');
    }
  };

  // Copy Handler
  const handleCopy = (text, e) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(''), 2000);
  };

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = ['Name', 'Mobile', 'Email', 'Assigned Flat', 'Total FollowUps', 'Created Date'];
    const rows = displayedLeads.map((l) => [
      `"${l.name || ''}"`,
      `"${l.mobileNo || ''}"`,
      `"${l.email || ''}"`,
      `"${l.assignedFlat?.flatNumber || 'None'}"`,
      (l.followUps || []).length,
      `"${new Date(l.createdAt).toLocaleDateString('en-IN')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CRM_Leads_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Compute CRM Top Metrics
  const totalLeads = leads.filter(l => statusFilter === 'converted' || l.status !== 'converted').length;
  let totalFollowUps = 0;
  let pendingFollowUps = 0;
  let siteVisitsCount = 0;
  let assignedFlatsCount = 0;

  leads.forEach((l) => {
    if (statusFilter !== 'converted' && l.status === 'converted') return;
    if (l.assignedFlat) assignedFlatsCount++;
    (l.followUps || []).forEach((fu) => {
      totalFollowUps++;
      if (fu.status === 'pending') pendingFollowUps++;
      if (fu.mode === 'site_visit') siteVisitsCount++;
    });
  });

  // Filter leads based on interactive quickFilter (excluding converted leads by default)
  const displayedLeads = leads.filter((lead) => {
    if (statusFilter !== 'converted' && lead.status === 'converted') return false;
    if (quickFilter === 'assigned') return Boolean(lead.assignedFlat);
    if (quickFilter === 'unassigned') return !lead.assignedFlat;
    if (quickFilter === 'pending') {
      return (lead.followUps || []).some((fu) => fu.status === 'pending');
    }
    if (quickFilter === 'visits') {
      return (lead.followUps || []).some((fu) => fu.mode === 'site_visit');
    }
    return true;
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
            CRM Leads & Prospect Management
            <span style={{ fontSize: '0.74rem', background: '#e8f0fe', color: '#1a73e8', padding: '3px 10px', borderRadius: '6px', fontWeight: '700' }}>
              ACTIVE INQUIRIES
            </span>
          </div>
          <div style={{ fontSize: '0.88rem', color: '#4b5563', marginTop: '4px', fontWeight: '500' }}>
            Track prospective homebuyers, scheduled site visits, direct calls, and convert warm leads into registered sales deals.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Sub-Tab Navigation Switcher */}
          <div style={{ display: 'flex', background: '#f3f4f5', padding: '4px', borderRadius: '8px', border: '1px solid #dadce0', gap: '4px' }}>
            <button
              type="button"
              onClick={() => {
                setModeFilter('');
                setStatusFilter('');
                setSearchParams({ tab: 'inquiries' });
              }}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: (!tabParam || tabParam === 'inquiries' || (!modeFilter && !statusFilter)) ? '#1a73e8' : 'transparent',
                color: (!tabParam || tabParam === 'inquiries' || (!modeFilter && !statusFilter)) ? '#ffffff' : '#4b5563',
                fontWeight: (!tabParam || tabParam === 'inquiries' || (!modeFilter && !statusFilter)) ? '700' : '500',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Users size={13} /> Inquiries & Leads ({totalLeads})
            </button>

            <button
              type="button"
              onClick={() => {
                setModeFilter('site_visit');
                setStatusFilter('');
                setSearchParams({ tab: 'visits' });
              }}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: (tabParam === 'visits' || modeFilter === 'site_visit') ? '#1a73e8' : 'transparent',
                color: (tabParam === 'visits' || modeFilter === 'site_visit') ? '#ffffff' : '#4b5563',
                fontWeight: (tabParam === 'visits' || modeFilter === 'site_visit') ? '700' : '500',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Calendar size={13} /> Site Visits ({siteVisitsCount})
            </button>

            <button
              type="button"
              onClick={() => {
                setModeFilter('');
                setStatusFilter('pending');
                setSearchParams({ tab: 'pipeline' });
              }}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: (tabParam === 'pipeline' || statusFilter === 'pending') ? '#1a73e8' : 'transparent',
                color: (tabParam === 'pipeline' || statusFilter === 'pending') ? '#ffffff' : '#4b5563',
                fontWeight: (tabParam === 'pipeline' || statusFilter === 'pending') ? '700' : '500',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Sliders size={13} /> Follow-up Pipeline ({pendingFollowUps})
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="btn-secondary"
            style={{ padding: '9px 16px', fontSize: '0.84rem' }}
            title="Export Leads to CSV Spreadsheet"
          >
            <Download size={15} /> Export CSV
          </button>

          <button
            onClick={() => {
              setEditingLead(null);
              setIsLeadModalOpen(true);
            }}
            className="btn-primary"
            style={{ padding: '10px 20px', fontSize: '0.88rem' }}
          >
            <UserPlus size={16} /> Add New Lead
          </button>
        </div>
      </div>

      {/* Interactive Top Metrics Ribbon (Click to Filter) */}
      <div className="grid-cols-4">
        <div
          className="stat-card"
          onClick={() => setQuickFilter(quickFilter === 'all' ? 'all' : 'all')}
          style={{
            cursor: 'pointer',
            border: quickFilter === 'all' ? '2px solid #1a73e8' : '1px solid #dadce0',
            background: quickFilter === 'all' ? '#f8fafd' : '#ffffff',
            transition: 'all 0.15s ease'
          }}
          title="Click to view all leads"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>TOTAL LEADS</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#e8f0fe', color: '#1a73e8' }}>
              <Users size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#111827', marginTop: '4px' }}>{totalLeads}</div>
          <span style={{ fontSize: '0.74rem', color: quickFilter === 'all' ? '#1a73e8' : '#4b5563', fontWeight: '700' }}>
            {quickFilter === 'all' ? 'Active Filter • All' : 'Click to show all'}
          </span>
        </div>

        <div
          className="stat-card"
          onClick={() => setQuickFilter(quickFilter === 'assigned' ? 'all' : 'assigned')}
          style={{
            cursor: 'pointer',
            border: quickFilter === 'assigned' ? '2px solid #8b5cf6' : '1px solid #dadce0',
            background: quickFilter === 'assigned' ? '#faf5ff' : '#ffffff',
            transition: 'all 0.15s ease'
          }}
          title="Click to filter by assigned flat units"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>ASSIGNED FLATS</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#f3e8ff', color: '#8b5cf6' }}>
              <Home size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#8b5cf6', marginTop: '4px' }}>{assignedFlatsCount}</div>
          <span style={{ fontSize: '0.74rem', color: quickFilter === 'assigned' ? '#8b5cf6' : '#4b5563', fontWeight: '700' }}>
            {quickFilter === 'assigned' ? 'Active Filter' : 'Click to filter assigned'}
          </span>
        </div>

        <div
          className="stat-card"
          onClick={() => setQuickFilter(quickFilter === 'pending' ? 'all' : 'pending')}
          style={{
            cursor: 'pointer',
            border: quickFilter === 'pending' ? '2px solid #b06000' : '1px solid #dadce0',
            background: quickFilter === 'pending' ? '#fefcf6' : '#ffffff',
            transition: 'all 0.15s ease'
          }}
          title="Click to filter leads with pending follow-ups"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>PENDING FOLLOW-UPS</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#fef7e0', color: '#b06000' }}>
              <Clock size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#b06000', marginTop: '4px' }}>{pendingFollowUps}</div>
          <span style={{ fontSize: '0.74rem', color: quickFilter === 'pending' ? '#b06000' : '#4b5563', fontWeight: '700' }}>
            {quickFilter === 'pending' ? 'Active Filter' : 'Click to filter pending'}
          </span>
        </div>

        <div
          className="stat-card"
          onClick={() => setQuickFilter(quickFilter === 'visits' ? 'all' : 'visits')}
          style={{
            cursor: 'pointer',
            border: quickFilter === 'visits' ? '2px solid #137333' : '1px solid #dadce0',
            background: quickFilter === 'visits' ? '#f6fbf7' : '#ffffff',
            transition: 'all 0.15s ease'
          }}
          title="Click to filter leads with site visits"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>SITE VISITS</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#e6f4ea', color: '#137333' }}>
              <Compass size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#137333', marginTop: '4px' }}>{siteVisitsCount}</div>
          <span style={{ fontSize: '0.74rem', color: quickFilter === 'visits' ? '#137333' : '#4b5563', fontWeight: '700' }}>
            {quickFilter === 'visits' ? 'Active Filter' : 'Click to filter visits'}
          </span>
        </div>
      </div>

      {/* Action Bar & Quick Filter Chips Ribbon */}
      <div className="g-card" style={{
        padding: '14px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: '1 1 280px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#4b5563' }} />
              <input
                type="text"
                placeholder="Search by prospect name, mobile no, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', paddingLeft: '32px', fontSize: '0.85rem', color: '#111827', fontWeight: '600' }}
              />
            </div>
            <button
              type="submit"
              className="btn-secondary"
              style={{ padding: '0 14px', fontSize: '0.82rem' }}
            >
              Search
            </button>
          </form>

          {/* Mode & Status Dropdowns */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              style={{ fontSize: '0.82rem', padding: '7px 10px', color: '#111827', fontWeight: '600' }}
            >
              <option value="">All Modes</option>
              <option value="call">Phone Calls</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="site_visit">Site Visits</option>
              <option value="meeting">Meetings</option>
              <option value="email">Emails</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ fontSize: '0.82rem', padding: '7px 10px', color: '#111827', fontWeight: '600' }}
            >
              <option value="">All Follow-up Statuses</option>
              <option value="pending">Pending Action</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <button
              onClick={fetchLeads}
              title="Refresh Leads"
              style={{ padding: '7px 12px', background: '#f3f4f5', border: '1px solid #dadce0', borderRadius: '6px', color: '#111827', cursor: 'pointer' }}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>

        {/* Quick Filter Segmented Control Chips */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid #f1f3f4', paddingTop: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.74rem', color: '#727785', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Quick Filter:
          </span>
          {[
            { id: 'all', label: `All (${totalLeads})` },
            { id: 'assigned', label: `Assigned Flat (${assignedFlatsCount})` },
            { id: 'unassigned', label: `Unassigned (${totalLeads - assignedFlatsCount})` },
            { id: 'pending', label: `Pending Follow-up (${pendingFollowUps})` },
            { id: 'visits', label: `Site Visits (${siteVisitsCount})` }
          ].map((chip) => {
            const isActive = quickFilter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setQuickFilter(chip.id)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  fontSize: '0.74rem',
                  fontWeight: isActive ? '700' : '600',
                  border: isActive ? '1px solid #1a73e8' : '1px solid #dadce0',
                  background: isActive ? '#e8f0fe' : '#f8f9fa',
                  color: isActive ? '#1a73e8' : '#414754',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Leads Data Table */}
      {displayedLeads.length === 0 ? (
        <div className="g-card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <Users size={48} style={{ opacity: 0.25, margin: '0 auto 16px', color: '#1a73e8' }} />
          <h3 style={{ color: '#111827', marginBottom: '8px', fontWeight: '800', fontSize: '1.2rem' }}>No CRM Leads Match Filter</h3>
          <p style={{ fontSize: '0.9rem', color: '#4b5563', marginBottom: '20px', fontWeight: '500', maxWidth: '440px', margin: '0 auto 20px' }}>
            No leads found for "{quickFilter}". Reset quick filter to view all registered leads.
          </p>
          <button
            onClick={() => setQuickFilter('all')}
            className="btn-secondary"
            style={{ padding: '9px 18px', fontSize: '0.84rem' }}
          >
            Reset Quick Filters
          </button>
        </div>
      ) : (
        <div className="g-card" style={{ padding: '0', borderRadius: '12px', overflow: 'hidden', width: '100%', boxSizing: 'border-box' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #dadce0' }}>
                <th style={{ padding: '14px 18px', width: '28%' }}>PROSPECT & CONTACT</th>
                <th style={{ padding: '14px 16px', width: '18%' }}>ASSIGNED UNIT</th>
                <th style={{ padding: '14px 16px', width: '26%' }}>LATEST FOLLOW-UP</th>
                <th style={{ padding: '14px 12px', width: '10%', textAlign: 'center' }}>LOGS</th>
                <th style={{ padding: '14px 18px', width: '18%', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {displayedLeads.map((lead) => {
                const followUps = lead.followUps || [];
                const latestFollowUp = followUps[followUps.length - 1];
                const cleanPhone = (lead.mobileNo || '').replace(/[^0-9]/g, '');
                const assignedFlat = lead.assignedFlat;
                const isExpanded = expandedLeadId === lead._id;

                return (
                  <React.Fragment key={lead._id}>
                    <tr
                      style={{
                        borderBottom: isExpanded ? 'none' : '1px solid #f1f3f4',
                        backgroundColor: isExpanded ? '#f4f8fe' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease'
                      }}
                      onClick={() => setExpandedLeadId(isExpanded ? null : lead._id)}
                      onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.backgroundColor = '#f8fafd'; }}
                      onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      {/* Column 1: Prospect & Contact Info */}
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: '#e8f0fe',
                            color: '#1a73e8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '800',
                            fontSize: '0.85rem',
                            flexShrink: 0
                          }}>
                            {lead.name ? lead.name.charAt(0).toUpperCase() : 'L'}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: '800', color: '#111827', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {lead.name}
                              </span>
                              {lead.agentId && (
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    fontWeight: '700',
                                    backgroundColor: '#eff6ff',
                                    color: '#1d4ed8',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    border: '1px solid #bfdbfe',
                                  }}
                                  title={`Transferred from Agent ${lead.agentId?.firstName || ''} ${lead.agentId?.lastName || ''} (@${lead.agentId?.username || 'partner'}) after 5-Day Maturity Window`}
                                >
                                  🏢 Agent Handover ({lead.agentId?.firstName || lead.agentId?.username || 'Partner'})
                                </span>
                              )}
                              {lead.commission?.status === 'credited' && (
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    fontWeight: '700',
                                    backgroundColor: '#e6f4ea',
                                    color: '#0d904f',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                  }}
                                  title={`Commission Credited: ₹${(lead.commission.amount || 0).toLocaleString('en-IN')}`}
                                >
                                  ₹{(lead.commission.amount || 0).toLocaleString('en-IN')} Comm ✓
                                </span>
                              )}
                              {isExpanded ? <ChevronUp size={14} color="#1a73e8" /> : <ChevronDown size={14} color="#727785" />}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCallingLead(lead);
                                }}
                                title="In-App Softphone & Voice Call"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  background: '#e8f0fe',
                                  color: '#1a73e8',
                                  border: 'none',
                                  padding: '2px 7px',
                                  borderRadius: '4px',
                                  fontSize: '0.74rem',
                                  fontWeight: '700',
                                  cursor: 'pointer'
                                }}
                              >
                                <Phone size={11} /> {lead.mobileNo}
                              </button>

                              <a
                                href={`https://wa.me/${cleanPhone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                title="Open in WhatsApp Web"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  background: '#e6f4ea',
                                  color: '#137333',
                                  padding: '2px 7px',
                                  borderRadius: '4px',
                                  textDecoration: 'none',
                                  fontSize: '0.74rem',
                                  fontWeight: '700'
                                }}
                              >
                                <MessageSquare size={11} /> WA
                              </a>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMessagingLead(lead);
                                }}
                                title="Send Template Notification (WhatsApp / SMS / Email)"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  background: '#fef3c7',
                                  color: '#92400e',
                                  border: 'none',
                                  padding: '2px 7px',
                                  borderRadius: '4px',
                                  fontSize: '0.74rem',
                                  fontWeight: '700',
                                  cursor: 'pointer'
                                }}
                              >
                                <Mail size={11} /> Notify
                              </button>

                              <button
                                type="button"
                                onClick={(e) => handleCopy(lead.mobileNo, e)}
                                title="Copy Phone Number"
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  padding: '2px',
                                  cursor: 'pointer',
                                  color: copiedText === lead.mobileNo ? '#137333' : '#727785',
                                  display: 'inline-flex',
                                  alignItems: 'center'
                                }}
                              >
                                {copiedText === lead.mobileNo ? <Check size={12} /> : <Copy size={11} />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Assigned Unit */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', overflow: 'hidden' }}>
                        {assignedFlat ? (
                          <div style={{
                            background: '#f3e8ff',
                            border: '1px solid #e9d5ff',
                            padding: '5px 8px',
                            borderRadius: '6px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                              <span style={{ fontWeight: '800', color: '#6b21a8', fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                Flat {assignedFlat.flatNumber}
                              </span>
                              <span style={{ fontSize: '0.65rem', background: '#d8b4fe', color: '#581c87', padding: '1px 5px', borderRadius: '4px', textTransform: 'capitalize', fontWeight: '700' }}>
                                {assignedFlat.status}
                              </span>
                            </div>
                            {assignedFlat.projectId?.projectName && (
                              <div style={{ fontSize: '0.7rem', color: '#6b21a8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {assignedFlat.projectId.projectName}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{
                            fontSize: '0.74rem',
                            color: '#727785',
                            background: '#f8f9fa',
                            border: '1px dashed #dadce0',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <Home size={11} /> Unassigned
                          </span>
                        )}
                      </td>

                      {/* Column 3: Latest Follow-Up Snapshot */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', overflow: 'hidden' }}>
                        {latestFollowUp ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{
                                fontSize: '0.68rem',
                                fontWeight: '700',
                                textTransform: 'capitalize',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: latestFollowUp.mode === 'site_visit' ? '#e6f4ea' : '#e8f0fe',
                                color: latestFollowUp.mode === 'site_visit' ? '#137333' : '#1a73e8'
                              }}>
                                {latestFollowUp.mode}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: '#4b5563', fontWeight: '600' }}>
                                {new Date(latestFollowUp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                              </span>
                            </div>
                            <div style={{
                              fontSize: '0.76rem',
                              color: '#1f2937',
                              fontWeight: '500',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }} title={latestFollowUp.notes}>
                              "{latestFollowUp.notes || 'No remarks'}"
                            </div>
                            {latestFollowUp.nextFollowUpDate && (
                              <div style={{ fontSize: '0.7rem', color: '#b06000', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <Calendar size={10} /> Next: {new Date(latestFollowUp.nextFollowUpDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.74rem', color: '#727785', fontStyle: 'italic' }}>
                            No follow-ups recorded
                          </span>
                        )}
                      </td>

                      {/* Column 4: Follow-Up Count Chip */}
                      <td style={{ padding: '14px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveLeadForTimeline(lead);
                            setIsTimelineOpen(true);
                          }}
                          title="View Complete Interaction Timeline"
                          style={{
                            background: followUps.length > 0 ? '#e8f0fe' : '#f8f9fa',
                            color: followUps.length > 0 ? '#1a73e8' : '#727785',
                            border: '1px solid',
                            borderColor: followUps.length > 0 ? '#d2e3fc' : '#dadce0',
                            padding: '3px 8px',
                            borderRadius: '9999px',
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                        >
                          <History size={11} />
                          {followUps.length}
                        </button>
                      </td>

                      {/* Column 5: Actions Toolbar */}
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle', textAlign: 'right', overflow: 'hidden' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                          {/* Inhouse Review & Approve Button for Agent Leads */}
                          {lead.agentId && (lead.status === 'site_visit_completed_pending_approval' || lead.siteVisitDetails?.approvalStatus === 'pending') && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLeadForReview(lead);
                                setIsReviewModalOpen(true);
                              }}
                              title="Inspect & Approve Agent Site Visit to credit commission"
                              style={{
                                padding: '5px 9px',
                                background: '#1a73e8',
                                color: '#ffffff',
                                borderRadius: '5px',
                                fontSize: '0.72rem',
                                fontWeight: '700',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                cursor: 'pointer',
                                border: 'none',
                                boxShadow: '0 1px 4px rgba(26,115,232,0.3)',
                              }}
                            >
                              <ShieldCheck size={12} /> Approve Visit
                            </button>
                          )}

                          {/* Mature Site Visit & Credit Commission Button */}
                          {lead.agentId && lead.status !== 'site_visit_completed_pending_approval' && lead.commission?.status !== 'credited' && (
                            <button
                              type="button"
                              onClick={() => handleMatureSiteVisit(lead)}
                              title="Mark Site Visit Completed & Credit Commission to Agent"
                              style={{
                                padding: '5px 9px',
                                background: '#0d904f',
                                color: '#ffffff',
                                borderRadius: '5px',
                                fontSize: '0.72rem',
                                fontWeight: '700',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                cursor: 'pointer',
                                border: 'none',
                                boxShadow: '0 1px 4px rgba(13,144,79,0.3)',
                              }}
                            >
                              <CheckCircle2 size={12} /> Mature Visit
                            </button>
                          )}

                          {/* Convert to Sales Button / Converted Badge */}
                          {lead.status === 'converted' ? (
                            <span
                              title="Lead converted to Sales Registry"
                              style={{
                                padding: '4px 8px',
                                background: '#e6f4ea',
                                color: '#137333',
                                borderRadius: '5px',
                                fontSize: '0.72rem',
                                fontWeight: '700',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                border: '1px solid #ceead6'
                              }}
                            >
                              <CheckCircle2 size={12} /> Converted
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setLeadToConvert(lead);
                                setIsConvertModalOpen(true);
                              }}
                              title="Convert to Sales Deal"
                              style={{
                                padding: '5px 9px',
                                background: '#137333',
                                color: '#ffffff',
                                borderRadius: '5px',
                                fontSize: '0.72rem',
                                fontWeight: '700',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                cursor: 'pointer',
                                border: 'none'
                              }}
                            >
                              <ShoppingBag size={12} /> Convert
                            </button>
                          )}

                          {/* Add Follow-Up Button */}
                          <button
                            onClick={() => {
                              setActiveLeadForFollowUp(lead);
                              setIsFollowUpModalOpen(true);
                            }}
                            title="Log Follow-Up"
                            className="btn-secondary"
                            style={{ padding: '5px 8px', fontSize: '0.72rem' }}
                          >
                            <Plus size={12} />
                          </button>

                          {/* Edit Lead Button */}
                          <button
                            onClick={() => {
                              setEditingLead(lead);
                              setIsLeadModalOpen(true);
                            }}
                            title="Edit Lead"
                            style={{
                              padding: '5px 7px',
                              background: '#f8f9fa',
                              border: '1px solid #dadce0',
                              borderRadius: '5px',
                              color: '#414754',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Edit size={12} />
                          </button>

                          {/* Delete Lead Button */}
                          <button
                            onClick={() => handleDeleteLead(lead)}
                            title="Delete Lead"
                            style={{
                              padding: '5px 7px',
                              background: '#ffdad6',
                              border: '1px solid #ffdad6',
                              borderRadius: '5px',
                              color: '#ba1a1a',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Inline Expanded Detail Drawer */}
                    {isExpanded && (
                      <tr style={{ background: '#f8fafd', borderBottom: '1px solid #d2e3fc' }}>
                        <td colSpan={5} style={{ padding: '16px 20px' }}>
                          <div style={{
                            background: '#ffffff',
                            border: '1px solid #dadce0',
                            borderRadius: '8px',
                            padding: '16px 20px',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                            gap: '20px'
                          }}>
                            {/* Sub-Panel 1: Contact Details & Lead Summary */}
                            <div>
                              <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#111827', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Prospect Overview
                              </div>
                              <div style={{ fontSize: '0.82rem', color: '#4b5563', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div><strong>Full Name:</strong> {lead.name}</div>
                                <div><strong>Mobile:</strong> {lead.mobileNo}</div>
                                {lead.email && <div><strong>Email:</strong> {lead.email}</div>}
                                <div><strong>Source:</strong> {lead.source || 'Direct Website Inflow'}</div>
                                <div><strong>Registered On:</strong> {new Date(lead.createdAt).toLocaleString('en-IN')}</div>
                              </div>
                            </div>

                            {/* Sub-Panel 2: Follow-Up History Summary */}
                            <div>
                              <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#111827', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Interaction Log Summary ({followUps.length})
                              </div>
                              {followUps.length === 0 ? (
                                <div style={{ fontSize: '0.8rem', color: '#727785', fontStyle: 'italic' }}>
                                  No interactions logged yet. Click "+ Follow-Up" to log the first call or site visit.
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '120px', overflowY: 'auto' }}>
                                  {followUps.map((fu, idx) => (
                                    <div key={idx} style={{ fontSize: '0.78rem', background: '#f8f9fa', padding: '6px 10px', borderRadius: '4px', border: '1px solid #edeef0' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', color: '#111827' }}>
                                        <span style={{ textTransform: 'capitalize' }}>{fu.mode} ({fu.status})</span>
                                        <span style={{ fontSize: '0.72rem', color: '#727785' }}>{new Date(fu.date).toLocaleDateString('en-IN')}</span>
                                      </div>
                                      <div style={{ color: '#4b5563', marginTop: '2px' }}>{fu.notes || 'No remarks recorded'}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Sub-Panel 3: Quick Direct Actions */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
                              <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#111827', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Instant Actions
                              </div>
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveLeadForFollowUp(lead);
                                    setIsFollowUpModalOpen(true);
                                  }}
                                  className="btn-primary"
                                  style={{ padding: '8px 14px', fontSize: '0.78rem' }}
                                >
                                  <Plus size={13} /> Log New Follow-Up
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveLeadForTimeline(lead);
                                    setIsTimelineOpen(true);
                                  }}
                                  className="btn-secondary"
                                  style={{ padding: '8px 14px', fontSize: '0.78rem' }}
                                >
                                  <History size={13} /> Full Timeline
                                </button>
                                {lead.status === 'converted' ? (
                                  <span
                                    style={{
                                      padding: '8px 14px',
                                      background: '#e6f4ea',
                                      color: '#137333',
                                      borderRadius: '8px',
                                      fontSize: '0.78rem',
                                      fontWeight: '700',
                                      border: '1px solid #ceead6',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px'
                                    }}
                                  >
                                    <CheckCircle2 size={13} /> Active in Sales Registry
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setLeadToConvert(lead);
                                      setIsConvertModalOpen(true);
                                    }}
                                    style={{
                                      padding: '8px 14px',
                                      background: '#137333',
                                      color: '#ffffff',
                                      borderRadius: '8px',
                                      fontSize: '0.78rem',
                                      fontWeight: '700',
                                      border: 'none',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px'
                                    }}
                                  >
                                    <ShoppingBag size={13} /> Convert to Sale
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {/* Table Summary Footer */}
          <div style={{
            padding: '12px 18px',
            backgroundColor: '#f8f9fa',
            borderTop: '1px solid #dadce0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8rem',
            color: '#414754',
            fontWeight: '600'
          }}>
            <div>
              Showing <span style={{ color: '#111827', fontWeight: '700' }}>{displayedLeads.length}</span> of {totalLeads} CRM Leads
            </div>
            <div style={{ display: 'flex', gap: '14px' }}>
              <span>Assigned: <strong style={{ color: '#6b21a8' }}>{assignedFlatsCount}</strong></span>
              <span>Pending Action: <strong style={{ color: '#b06000' }}>{pendingFollowUps}</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      <ManualLeadModal
        isOpen={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
        onSubmit={handleSaveLead}
        lead={editingLead}
      />

      <ManualFollowUpModal
        isOpen={isFollowUpModalOpen}
        onClose={() => setIsFollowUpModalOpen(false)}
        onSubmit={handleSaveFollowUp}
        leadName={activeLeadForFollowUp?.name}
      />

      <LeadTimelineDrawer
        isOpen={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
        lead={activeLeadForTimeline}
        onAddFollowUp={(lead) => {
          setActiveLeadForFollowUp(lead);
          setIsFollowUpModalOpen(true);
        }}
        onUpdateFollowUpStatus={handleUpdateFollowUpStatus}
        onDeleteFollowUp={handleDeleteFollowUp}
      />

      {/* CONVERT TO SALES MODAL */}
      <ConvertLeadModal
        isOpen={isConvertModalOpen}
        onClose={() => setIsConvertModalOpen(false)}
        onConvert={handleConvertLead}
        lead={leadToConvert}
      />

      {/* INHOUSE REVIEW SITE VISIT MODAL */}
      <ReviewSiteVisitModal
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false);
          setSelectedLeadForReview(null);
        }}
        lead={selectedLeadForReview}
        onApprovalSuccess={(msg) => {
          alert(msg);
          fetchLeads();
        }}
      />

      {/* IN-APP SOFTPHONE CALL MODAL */}
      {callingLead && (
        <SoftphoneModal
          isOpen={!!callingLead}
          onClose={() => setCallingLead(null)}
          lead={callingLead}
          leadId={callingLead._id}
          clientPhone={callingLead.mobileNo}
          clientName={callingLead.name}
          onCallLogged={() => {
            fetchLeads();
          }}
        />
      )}

      {/* QUICK MESSAGE NOTIFICATION MODAL */}
      {messagingLead && (
        <QuickMessageModal
          isOpen={!!messagingLead}
          onClose={() => setMessagingLead(null)}
          recipient={{
            name: messagingLead.name,
            phone: messagingLead.mobileNo,
            email: messagingLead.email
          }}
          contextType="lead"
          contextData={{
            leadName: messagingLead.name,
            unitNo: messagingLead.assignedFlat?.flatNumber || 'Selected Unit',
            projectName: 'Krishna Valley'
          }}
          onDispatched={() => {
            fetchLeads();
          }}
        />
      )}
    </div>
  );
};
