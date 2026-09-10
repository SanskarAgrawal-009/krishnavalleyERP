import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { leadService } from '../../services/leadService.js';
import { salesService } from '../../services/salesService.js';
import { ManualLeadModal } from '../../components/crm/ManualLeadModal.jsx';
import { ManualFollowUpModal } from '../../components/crm/ManualFollowUpModal.jsx';
import { LeadTimelineDrawer } from '../../components/crm/LeadTimelineDrawer.jsx';
import { ConvertLeadModal } from '../../components/sales/ConvertLeadModal.jsx';
import { ReviewSiteVisitModal } from '../../components/crm/ReviewSiteVisitModal.jsx';
import { SoftphoneModal } from '../../components/crm/SoftphoneModal.jsx';
import { QuickMessageModal } from '../../components/notifications/QuickMessageModal.jsx';
import { ScheduleFollowUpModal } from '../../components/crm/ScheduleFollowUpModal.jsx';
import { QuickStatusModal } from '../../components/crm/QuickStatusModal.jsx';
import { SalesTeamManagementModal } from '../../components/crm/SalesTeamManagementModal.jsx';
import { MetaAdsIntegrationModal } from '../../components/crm/MetaAdsIntegrationModal.jsx';
import { LeadDetailDrawer } from '../../components/crm/LeadDetailDrawer.jsx';
import { ExternalSiteVisitModal } from '../../components/crm/ExternalSiteVisitModal.jsx';
import { SiteVisitsWindow } from '../../components/crm/SiteVisitsWindow.jsx';
import { SendReminderModal } from '../../components/crm/SendReminderModal.jsx';
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
  ExternalLink,
  Zap,
  UserCheck,
  UserX,
  Sparkles,
  Globe,
  MapPin,
  HelpCircle,
  X,
  Award,
  TrendingUp,
  Car,
  Star,
} from 'lucide-react';

export const LeadsPage = ({ onNavigateToSales }) => {
  const { user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParam = searchParams.get('search') || '';
  const tabParam = searchParams.get('tab') || '';

  // Three Primary Windows: 'all' | 'assigned_to_me' | 'site_visits'
  const [activeWindow, setActiveWindow] = useState('all');

  // Site Visit Window State
  const [siteVisitFilter, setSiteVisitFilter] = useState('all'); // 'all' | 'scheduled' | 'completed' | 'cab'
  const [siteVisitSearch, setSiteVisitSearch] = useState('');

  // Sales Head Assignee Scoping (in Window 1)
  const [selectedRepFilter, setSelectedRepFilter] = useState('all'); // 'all' | 'unassigned' | repUserId

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(searchParam);
  const [modeFilter, setModeFilter] = useState(tabParam === 'visits' ? 'site_visit' : '');
  const [statusFilter, setStatusFilter] = useState(tabParam === 'pipeline' ? 'pending' : '');
  const [quickFilter, setQuickFilter] = useState('all');
  // Active Lead for Full Slide-Over Workspace Drawer
  const [selectedLeadForDrawer, setSelectedLeadForDrawer] = useState(null);

  // External Site Visit Modal State
  const [isSiteVisitModalOpen, setIsSiteVisitModalOpen] = useState(false);
  const [activeLeadForSiteVisit, setActiveLeadForSiteVisit] = useState(null);
  const [isSiteVisitScheduledMode, setIsSiteVisitScheduledMode] = useState(false);

  // Manual Reminder Dispatch Modal State
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [reminderTargetLead, setReminderTargetLead] = useState(null);
  const [reminderTargetVisit, setReminderTargetVisit] = useState(null);
  const [reminderTargetFollowUp, setReminderTargetFollowUp] = useState(null);

  // Copy feedback state
  const [copiedText, setCopiedText] = useState('');

  // Sales Team & Round-Robin State
  const [salesTeamOverview, setSalesTeamOverview] = useState(null);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

  // Meta Ads Integration State
  const [isMetaModalOpen, setIsMetaModalOpen] = useState(false);

  // Follow-up Scheduling Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [activeLeadForSchedule, setActiveLeadForSchedule] = useState(null);

  // Quick Status Update Modal State
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [activeLeadForStatus, setActiveLeadForStatus] = useState(null);

  // CRUD Modals state
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

  // Fetch Sales Team Overview
  const fetchTeam = async () => {
    try {
      const res = await leadService.getSalesTeam();
      if (res) setSalesTeamOverview(res);
    } catch (error) {
      console.error('Error fetching sales team:', error);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

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
      fetchTeam();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDeleteLead = async (lead) => {
    if (!lead) return false;
    if (window.confirm(`Delete lead "${lead.name}" and all their follow-up history?`)) {
      try {
        await leadService.deleteLead(lead._id);
        if (selectedLeadForDrawer?._id === lead._id) {
          setSelectedLeadForDrawer(null);
        }
        await fetchLeads();
        await fetchTeam();
        return true;
      } catch (error) {
        alert(error.message);
        return false;
      }
    }
    return false;
  };

  // Quick Lead Reassignment Handler
  const handleQuickAssign = async (leadId, targetUserId) => {
    try {
      await leadService.assignLead({
        leadId,
        assignedTo: targetUserId === 'unassigned' ? null : targetUserId,
      });
      fetchLeads();
      fetchTeam();
    } catch (err) {
      alert(err.message || 'Failed to assign lead');
    }
  };

  // Batch Round-Robin Distribution Handler
  const handleDistributeRoundRobin = async () => {
    const unassignedLeads = leads.filter((l) => !l.assignedTo && l.status !== 'converted');
    if (unassignedLeads.length === 0) {
      alert('All active leads are already assigned to sales team members.');
      return;
    }

    if (window.confirm(`Distribute ${unassignedLeads.length} unassigned leads sequentially one-by-one across active sales team members?`)) {
      try {
        const res = await leadService.distributeRoundRobin();
        alert(res.message || 'Leads successfully distributed!');
        fetchLeads();
        fetchTeam();
      } catch (err) {
        alert(err.message || 'Failed to distribute leads');
      }
    }
  };

  // Quick Status Update Handler
  const handleStatusSubmit = async (data) => {
    try {
      await leadService.updateLeadStatus(activeLeadForStatus._id, data);
      setIsStatusModalOpen(false);
      setActiveLeadForStatus(null);
      fetchLeads();
      fetchTeam();
    } catch (err) {
      alert(err.message || 'Failed to update status');
    }
  };

  // Schedule Follow-Up Handler
  const handleScheduleFollowUpSubmit = async (data) => {
    try {
      await leadService.scheduleFollowUp(activeLeadForSchedule._id, data);
      setIsScheduleModalOpen(false);
      setActiveLeadForSchedule(null);
      fetchLeads();
      fetchTeam();
    } catch (err) {
      alert(err.message || 'Failed to schedule follow-up');
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
      await salesService.convertLead(data);
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
    const headers = ['Name', 'Mobile', 'Email', 'City', 'State', 'Source', 'Assigned Rep', 'Status', 'Flat', 'Total FollowUps', 'Created Date'];
    const rows = displayedLeads.map((l) => [
      `"${l.name || ''}"`,
      `"${l.mobileNo || ''}"`,
      `"${l.email || ''}"`,
      `"${l.city || ''}"`,
      `"${l.state || ''}"`,
      `"${l.leadSource || ''}"`,
      `"${l.assignedTo?.firstName || l.assignedTo?.username || 'Unassigned'}"`,
      `"${l.status || ''}"`,
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

  // Primary window filtering (Window 1: All Leads vs. Window 2: Assigned to Me)
  const currentUserIdStr = currentUser?._id?.toString() || currentUser?.id?.toString();
  const myLeads = leads.filter((l) => {
    const assignedId = l.assignedTo?._id?.toString() || l.assignedTo?.toString();
    return assignedId && assignedId === currentUserIdStr;
  });

  const baseLeads = activeWindow === 'assigned_to_me' ? myLeads : leads;

  const totalLeads = baseLeads.filter(l => statusFilter === 'converted' || l.status !== 'converted').length;
  let totalFollowUps = 0;
  let pendingFollowUps = 0;
  let siteVisitsCount = 0;
  let assignedFlatsCount = 0;
  let unassignedCount = 0;
  let metaLeadsCount = 0;
  let wonLeadsCount = 0;

  leads.forEach((l) => {
    if (l.status !== 'converted' && !l.assignedTo) unassignedCount++;
    if (l.status === 'converted') wonLeadsCount++;
    if (l.leadSource === 'meta_ads' || l.metaAdDetails?.leadgenId || (l.metaCustomQuestions && l.metaCustomQuestions.length > 0)) {
      metaLeadsCount++;
    }
  });

  baseLeads.forEach((l) => {
    if (statusFilter !== 'converted' && l.status === 'converted') return;
    if (l.assignedFlat) assignedFlatsCount++;
    (l.followUps || []).forEach((fu) => {
      totalFollowUps++;
      if (fu.status === 'pending') pendingFollowUps++;
      if (fu.mode === 'site_visit') siteVisitsCount++;
    });
  });

  // Filter leads based on interactive quickFilter & Sales Head Rep Selection
  const displayedLeads = baseLeads.filter((lead) => {
    if (statusFilter !== 'converted' && lead.status === 'converted') return false;

    // Sales Head Assignment Scoping (in Window 1: All Leads)
    if (activeWindow === 'all' && selectedRepFilter !== 'all') {
      if (selectedRepFilter === 'unassigned') {
        if (lead.assignedTo) return false;
      } else {
        const leadAssigneeId = lead.assignedTo?._id?.toString() || lead.assignedTo?.toString();
        if (leadAssigneeId !== selectedRepFilter) return false;
      }
    }

    if (quickFilter === 'sales_unassigned') return !lead.assignedTo;
    if (quickFilter === 'meta_ads') {
      return lead.leadSource === 'meta_ads' || lead.metaAdDetails?.leadgenId || (lead.metaCustomQuestions && lead.metaCustomQuestions.length > 0);
    }
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

  // Aggregate all site visits (both scheduled & completed) across externalSiteVisits, followUps, and stage records
  const allSiteVisits = useMemo(() => {
    const list = [];
    leads.forEach((lead) => {
      // 1. External Site Visits recorded
      (lead.externalSiteVisits || []).forEach((esv, idx) => {
        const isScheduled = esv.status === 'scheduled' || (!esv.status && new Date(esv.visitDate) > new Date());
        list.push({
          id: esv._id || `esv-${lead._id}-${idx}`,
          leadId: lead._id,
          visitorName: esv.visitorName || lead.name,
          visitorPhone: esv.visitorPhone || lead.mobileNo,
          visitorEmail: esv.visitorEmail || lead.email,
          city: lead.city || '',
          state: lead.state || '',
          visitDate: esv.visitDate,
          status: isScheduled ? 'scheduled' : 'completed',
          flatNumber: esv.assignedFlat?.flatNumber || (typeof esv.assignedFlat === 'string' ? esv.assignedFlat : (lead.assignedFlat?.flatNumber || '')),
          flatLabel: esv.flatLabel || (lead.assignedFlat ? `Flat ${lead.assignedFlat.flatNumber}` : (lead.requirement || 'Unit Inspection')),
          projectName: esv.assignedFlat?.projectId?.projectName || lead.assignedFlat?.projectId?.projectName || 'Krishna Valley',
          accompaniedBy: esv.accompaniedBy?.firstName ? `${esv.accompaniedBy.firstName} ${esv.accompaniedBy.lastName || ''}` : (esv.accompaniedByName || lead.assignedTo?.firstName || 'Sales Team'),
          accompaniedRole: esv.accompaniedBy?.roleId?.name?.replace(/_/g, ' ') || 'Sales Executive',
          partySize: esv.numberOfPersons || 1,
          isCabProvided: Boolean(esv.cabDetails?.isCabProvided),
          cabDetails: esv.cabDetails,
          interestRating: esv.interestRating,
          feedback: esv.feedback,
          nextStep: esv.nextStep,
          source: 'Site Visit Log',
          leadRef: lead
        });
      });

      // 2. Follow-ups with mode === 'site_visit'
      (lead.followUps || []).filter((fu) => fu.mode === 'site_visit').forEach((fu, idx) => {
        const targetDate = fu.nextFollowUpDate || fu.date;
        const alreadyLogged = list.some(item => item.leadId === lead._id && new Date(item.visitDate).toDateString() === new Date(targetDate).toDateString());
        if (!alreadyLogged) {
          const isScheduled = fu.status === 'pending' || (!fu.status && fu.nextFollowUpDate && new Date(fu.nextFollowUpDate) >= new Date());
          list.push({
            id: fu._id || `fu-${lead._id}-${idx}`,
            leadId: lead._id,
            visitorName: lead.name,
            visitorPhone: lead.mobileNo,
            visitorEmail: lead.email,
            city: lead.city || '',
            state: lead.state || '',
            visitDate: targetDate,
            status: isScheduled ? 'scheduled' : (fu.status === 'cancelled' ? 'cancelled' : 'completed'),
            flatNumber: lead.assignedFlat?.flatNumber || '',
            flatLabel: lead.assignedFlat ? `Flat ${lead.assignedFlat.flatNumber}` : (lead.requirement || 'Property Site Tour'),
            projectName: lead.assignedFlat?.projectId?.projectName || 'Krishna Valley',
            accompaniedBy: fu.scheduledBy?.firstName ? `${fu.scheduledBy.firstName} (Scheduled)` : (lead.assignedTo?.firstName || 'Sales Executive'),
            accompaniedRole: 'Sales Team',
            partySize: 1,
            isCabProvided: false,
            cabDetails: null,
            interestRating: null,
            feedback: fu.feedback || fu.notes,
            nextStep: fu.rescheduledTo ? `Rescheduled to ${new Date(fu.rescheduledTo).toLocaleDateString('en-IN')}` : '',
            source: 'Scheduled Follow-Up',
            leadRef: lead
          });
        }
      });

      // 3. Pipeline leads with site_visit_scheduled or site_visit_completed without previous entries
      if ((lead.status === 'site_visit_scheduled' || lead.status === 'site_visit_completed') && !list.some(item => item.leadId === lead._id)) {
        list.push({
          id: `stage-${lead._id}`,
          leadId: lead._id,
          visitorName: lead.name,
          visitorPhone: lead.mobileNo,
          visitorEmail: lead.email,
          city: lead.city || '',
          state: lead.state || '',
          visitDate: lead.siteVisitDetails?.scheduledDate || lead.siteVisitDetails?.completedDate || lead.updatedAt,
          status: lead.status === 'site_visit_scheduled' ? 'scheduled' : 'completed',
          flatNumber: lead.assignedFlat?.flatNumber || '',
          flatLabel: lead.assignedFlat ? `Flat ${lead.assignedFlat.flatNumber}` : (lead.requirement || 'Property Site Tour'),
          projectName: lead.assignedFlat?.projectId?.projectName || 'Krishna Valley',
          accompaniedBy: lead.assignedTo?.firstName || 'Sales Executive',
          accompaniedRole: 'Sales Executive',
          partySize: 1,
          isCabProvided: false,
          cabDetails: null,
          interestRating: null,
          feedback: lead.siteVisitDetails?.feedback || 'Site visit marked in pipeline',
          source: 'Pipeline Stage',
          leadRef: lead
        });
      }
    });

    // Sort: upcoming scheduled visits first, then completed visits
    return list.sort((a, b) => {
      if (a.status === 'scheduled' && b.status !== 'scheduled') return -1;
      if (b.status === 'scheduled' && a.status !== 'scheduled') return 1;
      return new Date(b.visitDate) - new Date(a.visitDate);
    });
  }, [leads]);

  // Filtered site visits based on sub-filters & search
  const displayedSiteVisits = useMemo(() => {
    return allSiteVisits.filter((v) => {
      if (siteVisitFilter === 'scheduled' && v.status !== 'scheduled') return false;
      if (siteVisitFilter === 'completed' && v.status !== 'completed') return false;
      if (siteVisitFilter === 'cab' && !v.isCabProvided) return false;
      if (siteVisitFilter === 'high_interest' && !(v.interestRating >= 4)) return false;

      if (siteVisitSearch.trim()) {
        const q = siteVisitSearch.toLowerCase();
        const matchesName = (v.visitorName || '').toLowerCase().includes(q);
        const matchesPhone = (v.visitorPhone || '').includes(q);
        const matchesFlat = (v.flatLabel || '').toLowerCase().includes(q) || (v.flatNumber || '').toLowerCase().includes(q);
        const matchesExec = (v.accompaniedBy || '').toLowerCase().includes(q);
        const matchesDriver = (v.cabDetails?.driverName || '').toLowerCase().includes(q) || (v.cabDetails?.cabNumber || '').toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesFlat && !matchesExec && !matchesDriver) return false;
      }
      return true;
    });
  }, [allSiteVisits, siteVisitFilter, siteVisitSearch]);

  const scheduledVisitsCount = allSiteVisits.filter(v => v.status === 'scheduled').length;
  const completedVisitsCount = allSiteVisits.filter(v => v.status === 'completed').length;
  const highInterestVisitsCount = allSiteVisits.filter(v => v.interestRating >= 4).length;
  const cabVisitsCount = allSiteVisits.filter(v => v.isCabProvided).length;

  // Helper for pipeline stage colors & badges
  const getStatusBadge = (status) => {
    switch (status) {
      case 'new':
        return { label: 'New Prospect', bg: '#e8f0fe', color: '#1a73e8', border: '#d2e3fc' };
      case 'contacted':
        return { label: 'Contacted', bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' };
      case 'in_discussion':
        return { label: 'In Discussion', bg: '#f3e8ff', color: '#7e22ce', border: '#e9d5ff' };
      case 'followup_scheduled':
        return { label: 'Follow-Up Scheduled', bg: '#fef3c7', color: '#b45309', border: '#fde68a' };
      case 'site_visit_scheduled':
        return { label: 'Visit Scheduled', bg: '#ffedd5', color: '#c2410c', border: '#fed7aa' };
      case 'site_visit_completed':
        return { label: 'Site Visit Done', bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' };
      case 'site_visit_completed_pending_approval':
        return { label: 'Visit Pending Review', bg: '#fef9c3', color: '#a16207', border: '#fef08a' };
      case 'negotiation':
        return { label: 'Negotiation', bg: '#e0e7ff', color: '#4338ca', border: '#c7d2fe' };
      case 'converted':
        return { label: 'Converted Deal', bg: '#d1fae5', color: '#065f46', border: '#a7f3d0' };
      case 'lost':
        return { label: 'Lost / Dropped', bg: '#fee2e2', color: '#b91c1c', border: '#fecaca' };
      default:
        return { label: (status || 'New').replace(/_/g, ' '), bg: '#f3f4f6', color: '#374151', border: '#e5e7eb' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ========================================================================= */}
      {/* 1. TOP HEADER & MAIN ACTION BUTTONS */}
      {/* ========================================================================= */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        paddingBottom: '4px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              CRM Leads Hub
            </h2>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: '800',
              background: '#e0f2fe',
              color: '#0369a1',
              padding: '2px 8px',
              borderRadius: '20px',
              border: '1px solid #bae6fd',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <Zap size={11} color="#0284c7" /> Auto Round-Robin
            </span>
          </div>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 0 0' }}>
            Direct Meta Ads Ingestion, 1-by-1 Sequential Distribution, and Sales Follow-ups
          </p>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Meta Ads Integration Button */}
          <button
            type="button"
            onClick={() => setIsMetaModalOpen(true)}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #0284c7',
              background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(37,99,235,0.25)',
              transition: 'all 0.15s ease'
            }}
            title="Configure Meta Webhook and Test Instant Lead Ingestion"
          >
            <Globe size={14} />
            ⚡ Meta Ads Integration
          </button>

          {/* Sales Team Pool Button */}
          <button
            type="button"
            onClick={() => setIsTeamModalOpen(true)}
            className="btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Users size={14} />
            Sales Team Pool ({salesTeamOverview?.totalTeamMembers || 0})
          </button>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Export Leads to CSV Spreadsheet"
          >
            <Download size={14} />
            Export CSV
          </button>

          {/* External Site Visit Logger Button */}
          <button
            type="button"
            onClick={() => {
              setActiveLeadForSiteVisit(null);
              setIsSiteVisitModalOpen(true);
            }}
            style={{
              padding: '8px 15px',
              borderRadius: '8px',
              border: '1px solid #16a34a',
              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(22,163,74,0.25)',
              transition: 'all 0.15s ease'
            }}
            title="Log an external lead or walk-in site visit"
          >
            <Car size={14} />
            🚗 Log Site Visit
          </button>

          {/* Add New Lead Button */}
          <button
            type="button"
            onClick={() => {
              setEditingLead(null);
              setIsLeadModalOpen(true);
            }}
            className="btn-primary"
            style={{ padding: '8px 18px', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <UserPlus size={15} />
            + Add New Lead
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. PRIMARY TWO-WINDOW VIEW SELECTOR (WINDOW 1: ALL LEADS | WINDOW 2: ASSIGNED TO ME) */}
      {/* ========================================================================= */}
      <div style={{
        display: 'flex',
        background: '#f1f5f9',
        padding: '5px',
        borderRadius: '14px',
        border: '1px solid #cbd5e1',
        gap: '8px',
        width: 'fit-content'
      }}>
        {/* Window 1 Button */}
        <button
          type="button"
          onClick={() => {
            setActiveWindow('all');
            setQuickFilter('all');
          }}
          style={{
            padding: '10px 24px',
            borderRadius: '10px',
            border: 'none',
            background: activeWindow === 'all' ? '#1a73e8' : 'transparent',
            color: activeWindow === 'all' ? '#ffffff' : '#334155',
            fontWeight: activeWindow === 'all' ? '800' : '700',
            fontSize: '0.92rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: activeWindow === 'all' ? '0 3px 8px rgba(26,115,232,0.3)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <Users size={17} />
          🏢 Window 1: All Leads
          <span style={{
            fontSize: '0.74rem',
            padding: '2px 8px',
            borderRadius: '20px',
            background: activeWindow === 'all' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
            color: activeWindow === 'all' ? '#ffffff' : '#475569',
            fontWeight: '800'
          }}>
            {leads.filter(l => l.status !== 'converted').length}
          </span>
        </button>

        {/* Window 2 Button */}
        <button
          type="button"
          onClick={() => {
            setActiveWindow('assigned_to_me');
            setQuickFilter('all');
          }}
          style={{
            padding: '10px 24px',
            borderRadius: '10px',
            border: 'none',
            background: activeWindow === 'assigned_to_me' ? '#16a34a' : 'transparent',
            color: activeWindow === 'assigned_to_me' ? '#ffffff' : '#334155',
            fontWeight: activeWindow === 'assigned_to_me' ? '800' : '700',
            fontSize: '0.92rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: activeWindow === 'assigned_to_me' ? '0 3px 8px rgba(22,163,74,0.3)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <UserCheck size={17} />
          👤 Window 2: Assigned to Me
          <span style={{
            fontSize: '0.74rem',
            padding: '2px 8px',
            borderRadius: '20px',
            background: activeWindow === 'assigned_to_me' ? 'rgba(255,255,255,0.25)' : (myLeads.length > 0 ? '#dcfce7' : '#e2e8f0'),
            color: activeWindow === 'assigned_to_me' ? '#ffffff' : (myLeads.length > 0 ? '#15803d' : '#475569'),
            fontWeight: '800'
          }}>
            {myLeads.filter(l => l.status !== 'converted').length}
          </span>
        </button>

        {/* Window 3 Button: Site Visits */}
        <button
          type="button"
          onClick={() => {
            setActiveWindow('site_visits');
            setSiteVisitFilter('all');
          }}
          style={{
            padding: '10px 24px',
            borderRadius: '10px',
            border: 'none',
            background: activeWindow === 'site_visits' ? '#7c3aed' : 'transparent',
            color: activeWindow === 'site_visits' ? '#ffffff' : '#334155',
            fontWeight: activeWindow === 'site_visits' ? '800' : '700',
            fontSize: '0.92rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: activeWindow === 'site_visits' ? '0 3px 8px rgba(124,58,237,0.3)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <Car size={17} />
          🚗 Window 3: Site Visits
          <span style={{
            fontSize: '0.74rem',
            padding: '2px 8px',
            borderRadius: '20px',
            background: activeWindow === 'site_visits' ? 'rgba(255,255,255,0.25)' : (allSiteVisits.length > 0 ? '#ede9fe' : '#e2e8f0'),
            color: activeWindow === 'site_visits' ? '#ffffff' : (allSiteVisits.length > 0 ? '#7c3aed' : '#475569'),
            fontWeight: '800'
          }}>
            {allSiteVisits.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 3. METRIC CARDS (DYNAMIC PER SELECTED WINDOW) */}
      {/* ========================================================================= */}
      {activeWindow === 'site_visits' ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px'
        }}>
          {/* Card 1: Total Site Visits */}
          <div
            className="g-card"
            onClick={() => setSiteVisitFilter('all')}
            style={{
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              borderRadius: '12px',
              cursor: 'pointer',
              border: siteVisitFilter === 'all' ? '2px solid #7c3aed' : '1px solid #e2e8f0',
              background: siteVisitFilter === 'all' ? '#faf5ff' : '#ffffff',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Car size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Site Visits
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#0f172a' }}>
                {allSiteVisits.length}
              </div>
            </div>
          </div>

          {/* Card 2: Scheduled / Upcoming */}
          <div
            className="g-card"
            onClick={() => setSiteVisitFilter('scheduled')}
            style={{
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              borderRadius: '12px',
              cursor: 'pointer',
              border: siteVisitFilter === 'scheduled' ? '2px solid #2563eb' : '1px solid #e2e8f0',
              background: siteVisitFilter === 'scheduled' ? '#eff6ff' : '#ffffff',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Scheduled & Upcoming
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: '900', color: scheduledVisitsCount > 0 ? '#1d4ed8' : '#0f172a' }}>
                {scheduledVisitsCount}
              </div>
            </div>
          </div>

          {/* Card 3: Completed Tours */}
          <div
            className="g-card"
            onClick={() => setSiteVisitFilter('completed')}
            style={{
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              borderRadius: '12px',
              cursor: 'pointer',
              border: siteVisitFilter === 'completed' ? '2px solid #16a34a' : '1px solid #e2e8f0',
              background: siteVisitFilter === 'completed' ? '#f0fdf4' : '#ffffff',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Completed Tours
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#15803d' }}>
                {completedVisitsCount}
              </div>
            </div>
          </div>

          {/* Card 4: High Interest (4-5 Stars) */}
          <div
            className="g-card"
            onClick={() => setSiteVisitFilter('high_interest')}
            style={{
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              borderRadius: '12px',
              cursor: 'pointer',
              border: siteVisitFilter === 'high_interest' ? '2px solid #d97706' : '1px solid #e2e8f0',
              background: siteVisitFilter === 'high_interest' ? '#fffbeb' : '#ffffff',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Star size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                High Interest Leads
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#b45309' }}>
                {highInterestVisitsCount}
              </div>
            </div>
          </div>

          {/* Card 5: Cab Transportation Assisted */}
          <div
            className="g-card"
            onClick={() => setSiteVisitFilter('cab')}
            style={{
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              borderRadius: '12px',
              cursor: 'pointer',
              border: siteVisitFilter === 'cab' ? '2px solid #0284c7' : '1px solid #e2e8f0',
              background: siteVisitFilter === 'cab' ? '#f0f9ff' : '#ffffff',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#f0f9ff', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Compass size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Cab Assisted Tours
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#0369a1' }}>
                {cabVisitsCount}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px'
        }}>
          {/* Card 1: Total Prospects */}
          <div className="g-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', borderRadius: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {activeWindow === 'assigned_to_me' ? 'My Active Leads' : 'Total Active Pipeline'}
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#0f172a' }}>
                {totalLeads}
              </div>
            </div>
          </div>

          {/* Card 2: Next Up in Rotation (Window 1) or My Portfolio Share (Window 2) */}
          <div className="g-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', borderRadius: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {activeWindow === 'assigned_to_me' ? 'My Portfolio Share' : 'Next Up in Queue'}
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {activeWindow === 'assigned_to_me'
                  ? `${leads.length > 0 ? Math.round((myLeads.length / leads.length) * 100) : 0}% of CRM`
                  : `@${salesTeamOverview?.nextInQueue?.userId?.username || 'sales_head'}`}
              </div>
            </div>
          </div>

          {/* Card 3: Unassigned Queue / 1-Click Distribute */}
          <div className="g-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserX size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Unassigned Queue
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: '900', color: unassignedCount > 0 ? '#b45309' : '#0f172a' }}>
                  {unassignedCount}
                </div>
              </div>
            </div>
            {unassignedCount > 0 && activeWindow === 'all' && (
              <button
                type="button"
                onClick={handleDistributeRoundRobin}
                style={{
                  padding: '6px 10px',
                  background: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 2px 5px rgba(22,163,74,0.3)'
                }}
                title="Equally divide unassigned leads 1-by-1 across active sales team"
              >
                <Zap size={11} /> Distribute
              </button>
            )}
          </div>

          {/* Card 4: Pending Action / Site Visits */}
          <div className="g-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', borderRadius: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#faf5ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Pending Action
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#0f172a' }}>
                {pendingFollowUps}
              </div>
            </div>
          </div>

          {/* Card 5: Meta Ads Inflow */}
          <div className="g-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', borderRadius: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#eff6ff', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Globe size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Meta Ads Inflow
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#0284c7' }}>
                {metaLeadsCount}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MAIN CONTENT AREA: WINDOW 3 (SITE VISITS) VS WINDOWS 1 & 2 (CRM LEADS)   */}
      {/* ========================================================================= */}
      {activeWindow === 'site_visits' ? (
        <SiteVisitsWindow
          allSiteVisits={allSiteVisits}
          displayedSiteVisits={displayedSiteVisits}
          siteVisitSearch={siteVisitSearch}
          setSiteVisitSearch={setSiteVisitSearch}
          siteVisitFilter={siteVisitFilter}
          setSiteVisitFilter={setSiteVisitFilter}
          scheduledVisitsCount={scheduledVisitsCount}
          completedVisitsCount={completedVisitsCount}
          highInterestVisitsCount={highInterestVisitsCount}
          cabVisitsCount={cabVisitsCount}
          loading={loading}
          onRefresh={() => { fetchLeads(); fetchTeam(); }}
          onScheduleVisit={() => {
            setIsSiteVisitScheduledMode(true);
            setActiveLeadForSiteVisit(null);
            setIsSiteVisitModalOpen(true);
          }}
          onLogWalkInVisit={() => {
            setIsSiteVisitScheduledMode(false);
            setActiveLeadForSiteVisit(null);
            setIsSiteVisitModalOpen(true);
          }}
          onCompleteTour={(visit) => {
            setActiveLeadForSiteVisit(visit.leadRef || null);
            setIsSiteVisitScheduledMode(false);
            setIsSiteVisitModalOpen(true);
          }}
          onOpenLeadDrawer={(lead) => {
            setSelectedLeadForDrawer(lead);
          }}
          onSendReminder={(visit) => {
            setReminderTargetLead(visit.leadRef || { name: visit.visitorName, mobileNo: visit.visitorPhone, email: visit.visitorEmail });
            setReminderTargetVisit(visit);
            setReminderTargetFollowUp(null);
            setIsReminderModalOpen(true);
          }}
        />
      ) : (
        <>
          {/* ========================================================================= */}
          {/* 4. SALES HEAD ASSIGNMENT FILTER BAR (SHOWN IN WINDOW 1: ALL LEADS) */}
          {/* ========================================================================= */}
          {activeWindow === 'all' && (
        <div style={{
          background: '#ffffff',
          padding: '12px 18px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'wrap',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
        }}>
          <span style={{ fontSize: '0.74rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <UserCheck size={14} color="#1a73e8" />
            Filter by Sales Rep:
          </span>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* All Reps Chip */}
            <button
              type="button"
              onClick={() => setSelectedRepFilter('all')}
              style={{
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.76rem',
                fontWeight: selectedRepFilter === 'all' ? '800' : '600',
                border: selectedRepFilter === 'all' ? '1px solid #1a73e8' : '1px solid #e2e8f0',
                background: selectedRepFilter === 'all' ? '#e8f0fe' : '#f8fafc',
                color: selectedRepFilter === 'all' ? '#1a73e8' : '#334155',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              All Representatives ({leads.filter(l => l.status !== 'converted').length})
            </button>

            {/* Rep Buttons from Sales Team */}
            {(salesTeamOverview?.teamMembers || []).map((member) => {
              const u = member.userId;
              if (!u) return null;
              const repId = u._id?.toString();
              const isSelected = selectedRepFilter === repId;
              const repLeadCount = leads.filter(l => (l.assignedTo?._id?.toString() || l.assignedTo?.toString()) === repId && l.status !== 'converted').length;

              return (
                <button
                  key={repId}
                  type="button"
                  onClick={() => setSelectedRepFilter(repId)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '0.76rem',
                    fontWeight: isSelected ? '800' : '600',
                    border: isSelected ? '1px solid #1a73e8' : '1px solid #e2e8f0',
                    background: isSelected ? '#e8f0fe' : '#ffffff',
                    color: isSelected ? '#1a73e8' : '#334155',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: member.isActiveInRoundRobin ? '#16a34a' : '#94a3b8'
                  }} />
                  {u.firstName || u.username} ({repLeadCount})
                </button>
              );
            })}

            {/* Unassigned Rep Chip */}
            <button
              type="button"
              onClick={() => setSelectedRepFilter('unassigned')}
              style={{
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.76rem',
                fontWeight: selectedRepFilter === 'unassigned' ? '800' : '600',
                border: selectedRepFilter === 'unassigned' ? '1px solid #f59e0b' : '1px solid #e2e8f0',
                background: selectedRepFilter === 'unassigned' ? '#fef3c7' : '#ffffff',
                color: selectedRepFilter === 'unassigned' ? '#92400e' : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              ⚠️ Unassigned Only ({unassignedCount})
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. SEARCH & FAST FILTER BAR */}
      {/* ========================================================================= */}
      <div className="g-card" style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '12px', borderRadius: '12px' }}>
        {/* Top Controls Row: Search Input + Non-Wrapping Filter Toolbar */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          {/* Integrated Clean Search Bar */}
          <form onSubmit={handleSearchSubmit} style={{ flex: 1, minWidth: '260px', position: 'relative', margin: 0 }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search leads by name, phone, city, state, requirement..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 36px 9px 36px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.86rem',
                outline: 'none',
                boxSizing: 'border-box',
                background: '#ffffff',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#1a73e8';
                e.target.style.boxShadow = '0 0 0 3px rgba(26,115,232,0.12)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#cbd5e1';
                e.target.style.boxShadow = 'none';
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                title="Clear Search"
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}
              >
                <X size={15} />
              </button>
            )}
          </form>

          {/* Inline Action Bar: Mode + Status + Refresh + Clear All (NEVER STACKED) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {/* Mode Selector */}
            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              style={{
                fontSize: '0.82rem',
                height: '38px',
                padding: '0 10px',
                color: '#1e293b',
                fontWeight: '600',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                cursor: 'pointer'
              }}
              title="Filter by interaction channel"
            >
              <option value="">All Interaction Modes</option>
              <option value="call">📞 Phone Calls</option>
              <option value="whatsapp">💬 WhatsApp</option>
              <option value="site_visit">🚗 Site Visits</option>
              <option value="meeting">🤝 In-Person Meetings</option>
              <option value="email">✉️ Emails</option>
            </select>

            {/* Follow-up Status Selector */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                fontSize: '0.82rem',
                height: '38px',
                padding: '0 10px',
                color: '#1e293b',
                fontWeight: '600',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                cursor: 'pointer'
              }}
              title="Filter by task progress"
            >
              <option value="">All Follow-up Statuses</option>
              <option value="pending">⏳ Pending Action</option>
              <option value="completed">✅ Completed</option>
              <option value="cancelled">❌ Cancelled</option>
            </select>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => { fetchLeads(); fetchTeam(); }}
              title="Refresh CRM leads & sales team"
              style={{
                height: '38px',
                width: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                color: '#334155',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
            >
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
            </button>

            {/* Clear All Filters Button (Shows only when filters are active) */}
            {(searchTerm || modeFilter || statusFilter || quickFilter !== 'all' || (activeWindow === 'all' && selectedRepFilter !== 'all')) && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setModeFilter('');
                  setStatusFilter('');
                  setQuickFilter('all');
                  setSelectedRepFilter('all');
                }}
                title="Reset all active filters"
                style={{
                  height: '38px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid #fecaca',
                  background: '#fef2f2',
                  color: '#dc2626',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <X size={13} /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Bottom Row: Sleek Segmented Pipeline Tabs */}
        <div style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          borderTop: '1px solid #f1f5f9',
          paddingTop: '10px',
          alignItems: 'center',
          scrollbarWidth: 'none'
        }}>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: '4px', flexShrink: 0 }}>
            Pipeline:
          </span>

          {[
            { id: 'all', label: 'All Leads', count: totalLeads },
            { id: 'pending', label: 'Pending Action', count: pendingFollowUps, color: '#d97706' },
            { id: 'visits', label: 'Site Visits', count: siteVisitsCount, icon: Car, color: '#15803d' },
            { id: 'meta_ads', label: 'Meta Ads', count: metaLeadsCount, icon: Globe, color: '#0284c7' },
            { id: 'sales_unassigned', label: 'Unassigned', count: unassignedCount, icon: UserX, color: '#b45309' },
            { id: 'assigned', label: 'Unit Assigned', count: assignedFlatsCount, icon: Home, color: '#7e22ce' },
          ].map((tab) => {
            const isActive = quickFilter === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setQuickFilter(tab.id)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '0.76rem',
                  fontWeight: isActive ? '800' : '600',
                  border: isActive ? '1px solid #1a73e8' : '1px solid #e2e8f0',
                  background: isActive ? '#e8f0fe' : '#ffffff',
                  color: isActive ? '#1a73e8' : '#475569',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? '0 1px 2px rgba(26,115,232,0.15)' : 'none'
                }}
              >
                {Icon && <Icon size={12} color={isActive ? '#1a73e8' : (tab.color || '#64748b')} />}
                <span>{tab.label}</span>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: '800',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  background: isActive ? '#1a73e8' : '#f1f5f9',
                  color: isActive ? '#ffffff' : '#64748b',
                  minWidth: '16px',
                  textAlign: 'center'
                }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. LEADS DATA TABLE & CARDS */}
      {/* ========================================================================= */}
      {displayedLeads.length === 0 ? (
        <div className="g-card" style={{ textAlign: 'center', padding: '60px 24px', borderRadius: '12px' }}>
          <Users size={48} style={{ opacity: 0.25, margin: '0 auto 16px', color: '#1a73e8' }} />
          <h3 style={{ color: '#111827', marginBottom: '8px', fontWeight: '800', fontSize: '1.2rem' }}>
            No Leads Found
          </h3>
          <p style={{ fontSize: '0.86rem', color: '#64748b', marginBottom: '20px', fontWeight: '500', maxWidth: '440px', margin: '0 auto 20px' }}>
            No CRM leads match the current filters or search query.
          </p>
          <button
            onClick={() => { setQuickFilter('all'); setSelectedRepFilter('all'); setSearchTerm(''); }}
            className="btn-secondary"
            style={{ padding: '8px 18px', fontSize: '0.84rem' }}
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="g-card" style={{ padding: '0', borderRadius: '12px', overflow: 'hidden', width: '100%', boxSizing: 'border-box' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '14px 18px', width: '28%', fontSize: '0.74rem', color: '#475569', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  PROSPECT
                </th>
                <th style={{ padding: '14px 16px', width: '20%', fontSize: '0.74rem', color: '#475569', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  ASSIGNED TO
                </th>
                <th style={{ padding: '14px 16px', width: '16%', fontSize: '0.74rem', color: '#475569', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  STAGE
                </th>
                <th style={{ padding: '14px 16px', width: '24%', fontSize: '0.74rem', color: '#475569', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  UNIT & SCHEDULED TASK
                </th>
                <th style={{ padding: '14px 18px', width: '12%', textAlign: 'right', fontSize: '0.74rem', color: '#475569', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  ACTION
                </th>
              </tr>
            </thead>
            <tbody>
              {displayedLeads.map((lead) => {
                const followUps = lead.followUps || [];
                const latestFollowUp = followUps[followUps.length - 1];
                const pendingFollowUp = followUps.slice().reverse().find((fu) => fu.status === 'pending' || fu.nextFollowUpDate);
                const assignedFlat = lead.assignedFlat;
                const assignee = lead.assignedTo;
                const isAssignedToCurrentUser = assignee && ((assignee._id?.toString() || assignee.toString()) === currentUserIdStr);
                const statusStyle = getStatusBadge(lead.status);

                const isMetaLead = lead.leadSource === 'meta_ads' || lead.metaAdDetails?.leadgenId || (lead.metaCustomQuestions && lead.metaCustomQuestions.length > 0);
                const isWalkIn = lead.leadSource === 'walk_in';
                const isSelectedInDrawer = selectedLeadForDrawer?._id === lead._id;
                const isScheduledByHead = pendingFollowUp && pendingFollowUp.scheduledBy;

                return (
                  <tr
                    key={lead._id}
                    onClick={() => setSelectedLeadForDrawer(lead)}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: isSelectedInDrawer ? '#eff6ff' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => { if (!isSelectedInDrawer) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                    onMouseLeave={(e) => { if (!isSelectedInDrawer) e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    {/* Column 1: Prospect */}
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: isAssignedToCurrentUser ? '#dcfce7' : '#e8f0fe',
                          color: isAssignedToCurrentUser ? '#15803d' : '#1a73e8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '800',
                          fontSize: '0.92rem',
                          flexShrink: 0,
                          border: isAssignedToCurrentUser ? '2px solid #86efac' : '1px solid #d2e3fc',
                          position: 'relative'
                        }}>
                          {lead.name ? lead.name.charAt(0).toUpperCase() : 'P'}
                          {isAssignedToCurrentUser && (
                            <span
                              title="Assigned to you"
                              style={{
                                position: 'absolute',
                                bottom: '-2px',
                                right: '-2px',
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                backgroundColor: '#16a34a',
                                border: '2px solid #ffffff'
                              }}
                            />
                          )}
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.92rem' }}>
                              {lead.name}
                            </span>

                            {isMetaLead && (
                              <span
                                style={{
                                  fontSize: '0.66rem',
                                  fontWeight: '800',
                                  backgroundColor: '#e0f2fe',
                                  color: '#0369a1',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  border: '1px solid #bae6fd',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px'
                                }}
                                title="Captured from Meta Ads"
                              >
                                <Globe size={10} /> Meta Ad
                              </span>
                            )}

                            {isWalkIn && (
                              <span
                                style={{
                                  fontSize: '0.66rem',
                                  fontWeight: '800',
                                  backgroundColor: '#f0fdf4',
                                  color: '#166534',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  border: '1px solid #bbf7d0',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px'
                                }}
                              >
                                <Car size={10} /> Walk-in
                              </span>
                            )}

                            {lead.agentId && (
                              <span
                                style={{
                                  fontSize: '0.66rem',
                                  fontWeight: '700',
                                  backgroundColor: '#eff6ff',
                                  color: '#1d4ed8',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  border: '1px solid #bfdbfe',
                                }}
                                title={`Transferred from Agent ${lead.agentId?.firstName || ''}`}
                              >
                                🏢 Agent
                              </span>
                            )}
                          </div>

                          <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                            <span style={{ fontWeight: '600', color: '#475569' }}>
                              📞 {lead.mobileNo || 'No phone'}
                            </span>
                            {(lead.city || lead.state) && (
                              <>
                                <span style={{ color: '#cbd5e1' }}>•</span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                  <MapPin size={11} color="#94a3b8" />
                                  {lead.city ? `${lead.city}, ` : ''}{lead.state || ''}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Column 2: ASSIGNED TO */}
                    <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                      {assignee ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: isAssignedToCurrentUser ? '#16a34a' : '#4f46e5',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: '800',
                            flexShrink: 0
                          }}>
                            {assignee.firstName ? assignee.firstName.charAt(0).toUpperCase() : (assignee.username?.charAt(0).toUpperCase() || 'S')}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.86rem' }}>
                                {assignee.firstName ? `${assignee.firstName} ${assignee.lastName || ''}` : (assignee.username || 'Sales Rep')}
                              </span>
                              {isAssignedToCurrentUser && (
                                <span style={{
                                  fontSize: '0.64rem',
                                  fontWeight: '800',
                                  background: '#dcfce7',
                                  color: '#15803d',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  border: '1px solid #86efac'
                                }}>
                                  You
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '1px' }}>
                              {assignee.roleId?.name?.replace(/_/g, ' ') || 'Sales Executive'}
                              {lead.assignedAt && (
                                <span> • {new Date(lead.assignedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '4px 9px',
                          borderRadius: '6px',
                          background: '#fffbeb',
                          color: '#b45309',
                          border: '1px dashed #f59e0b',
                          fontSize: '0.74rem',
                          fontWeight: '800'
                        }}>
                          <UserX size={12} /> Unassigned
                        </span>
                      )}
                    </td>

                    {/* Column 3: STAGE */}
                    <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                      <span
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: '800',
                          textTransform: 'capitalize',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: statusStyle.bg,
                          color: statusStyle.color,
                          border: `1px solid ${statusStyle.border}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {statusStyle.label}
                      </span>
                    </td>

                    {/* Column 4: UNIT & SCHEDULED TASK */}
                    <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                      {assignedFlat ? (
                        <div style={{
                          background: '#faf5ff',
                          border: '1px solid #e9d5ff',
                          padding: '3px 8px',
                          borderRadius: '5px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          marginBottom: '4px'
                        }}>
                          <Home size={11} color="#9333ea" />
                          <span style={{ fontWeight: '800', color: '#7e22ce', fontSize: '0.74rem' }}>
                            Flat {assignedFlat.flatNumber}
                          </span>
                          {assignedFlat.projectId?.projectName && (
                            <span style={{ fontSize: '0.68rem', color: '#a855f7' }}>
                              ({assignedFlat.projectId.projectName})
                            </span>
                          )}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '500', marginBottom: '3px' }}>
                          {lead.requirement || 'No specific unit'}
                        </div>
                      )}

                      {/* Scheduled Task Pill */}
                      {pendingFollowUp && pendingFollowUp.nextFollowUpDate ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div style={{ fontSize: '0.72rem', color: isScheduledByHead ? '#1d4ed8' : '#b45309', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {isScheduledByHead ? (
                              <span style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '1px 5px', borderRadius: '4px', fontSize: '0.65rem' }}>
                                👑 Head Task
                              </span>
                            ) : (
                              <Calendar size={11} />
                            )}
                            <span>{new Date(pendingFollowUp.nextFollowUpDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                            <span style={{ textTransform: 'capitalize', background: '#fef3c7', color: '#b45309', padding: '1px 5px', borderRadius: '3px', fontSize: '0.65rem' }}>
                              {pendingFollowUp.mode}
                            </span>
                          </div>
                          {pendingFollowUp.notes && (
                            <div style={{ fontSize: '0.7rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '210px' }} title={pendingFollowUp.notes}>
                              "{pendingFollowUp.notes}"
                            </div>
                          )}
                        </div>
                      ) : latestFollowUp ? (
                        <div style={{ fontSize: '0.71rem', color: '#64748b' }}>
                          Last {latestFollowUp.mode}: {new Date(latestFollowUp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.71rem', color: '#94a3b8' }}>
                          No upcoming task
                        </div>
                      )}
                    </td>

                    {/* Column 5: ACTION (Minimum button required) */}
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLeadForDrawer(lead);
                        }}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '7px',
                          border: '1px solid #bfdbfe',
                          background: '#eff6ff',
                          color: '#1d4ed8',
                          fontSize: '0.78rem',
                          fontWeight: '800',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          boxShadow: '0 1px 2px rgba(29,78,216,0.08)',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#dbeafe';
                          e.currentTarget.style.borderColor = '#93c5fd';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#eff6ff';
                          e.currentTarget.style.borderColor = '#bfdbfe';
                        }}
                        title="Open Lead Workspace Panel"
                      >
                        <span>Open</span>
                        <ArrowRight size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Table Summary Footer */}
          <div style={{
            padding: '12px 18px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8rem',
            color: '#475569',
            fontWeight: '600'
          }}>
            <div>
              Showing <span style={{ color: '#0f172a', fontWeight: '800' }}>{displayedLeads.length}</span> of {totalLeads} CRM Leads {activeWindow === 'assigned_to_me' ? '(Window: Assigned to Me)' : '(Window: All Pipeline Leads)'}
            </div>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <span>Meta Ads: <strong style={{ color: '#0284c7' }}>{metaLeadsCount}</strong></span>
              <span>Unassigned: <strong style={{ color: '#b45309' }}>{unassignedCount}</strong></span>
              <span>Assigned Flats: <strong style={{ color: '#7e22ce' }}>{assignedFlatsCount}</strong></span>
              <span>Pending Action: <strong style={{ color: '#d97706' }}>{pendingFollowUps}</strong></span>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* ========================================================================= */}
      {/* 7. ALL MODALS (100% PRESERVED & EXPANDED) */}
      {/* ========================================================================= */}

      {/* META ADS INTEGRATION MODAL */}
      <MetaAdsIntegrationModal
        isOpen={isMetaModalOpen}
        onClose={() => setIsMetaModalOpen(false)}
        onLeadIngested={() => {
          fetchLeads();
          fetchTeam();
        }}
      />

      {/* MANUAL LEAD MODAL */}
      <ManualLeadModal
        isOpen={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
        onSubmit={handleSaveLead}
        lead={editingLead}
        teamMembers={salesTeamOverview?.teamMembers || []}
      />

      {/* SCHEDULE FOLLOW-UP MODAL */}
      <ScheduleFollowUpModal
        isOpen={isScheduleModalOpen}
        onClose={() => {
          setIsScheduleModalOpen(false);
          setActiveLeadForSchedule(null);
        }}
        onSubmit={handleScheduleFollowUpSubmit}
        lead={activeLeadForSchedule}
        teamMembers={salesTeamOverview?.teamMembers || []}
        currentUser={currentUser}
      />

      {/* QUICK STATUS UPDATE MODAL */}
      <QuickStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => {
          setIsStatusModalOpen(false);
          setActiveLeadForStatus(null);
        }}
        onSubmit={handleStatusSubmit}
        lead={activeLeadForStatus}
      />

      {/* SALES TEAM MANAGEMENT MODAL */}
      <SalesTeamManagementModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        onTeamUpdated={() => {
          fetchTeam();
          fetchLeads();
        }}
      />

      {/* MANUAL FOLLOW-UP MODAL */}
      <ManualFollowUpModal
        isOpen={isFollowUpModalOpen}
        onClose={() => setIsFollowUpModalOpen(false)}
        onSubmit={handleSaveFollowUp}
        leadName={activeLeadForFollowUp?.name}
      />

      {/* TIMELINE DRAWER */}
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

      {/* SLIDE-OVER LEAD DETAIL WORKSPACE DRAWER (OPENS ON ROW CLICK) */}
      <LeadDetailDrawer
        isOpen={!!selectedLeadForDrawer}
        onClose={() => setSelectedLeadForDrawer(null)}
        lead={selectedLeadForDrawer}
        currentUser={currentUser}
        salesTeam={salesTeamOverview?.teamMembers || []}
        onLeadUpdated={async () => {
          await fetchLeads();
          await fetchTeam();
          if (selectedLeadForDrawer) {
            try {
              const res = await leadService.getLeadById(selectedLeadForDrawer._id);
              if (res.data) setSelectedLeadForDrawer(res.data);
            } catch (err) {
              console.error('Error refreshing drawer lead:', err);
            }
          }
        }}
        onScheduleFollowUp={(l) => {
          setActiveLeadForSchedule(l);
          setIsScheduleModalOpen(true);
        }}
        onLogSiteVisit={(l) => {
          setActiveLeadForSiteVisit(l);
          setIsSiteVisitModalOpen(true);
        }}
        onConvertLead={(l) => {
          setLeadToConvert(l);
          setIsConvertModalOpen(true);
        }}
        onChangeStage={(l) => {
          setActiveLeadForStatus(l);
          setIsStatusModalOpen(true);
        }}
        onStartCall={(l) => setCallingLead(l)}
        onSendMessage={(l) => setMessagingLead(l)}
        onEditLead={(l) => {
          setEditingLead(l);
          setIsLeadModalOpen(true);
        }}
        onDeleteLead={handleDeleteLead}
        onSendReminder={(l) => {
          setReminderTargetLead(l);
          setReminderTargetVisit(null);
          setReminderTargetFollowUp(null);
          setIsReminderModalOpen(true);
        }}
      />

      {/* EXTERNAL / DIRECT SITE VISIT MODAL */}
      <ExternalSiteVisitModal
        isOpen={isSiteVisitModalOpen}
        onClose={() => {
          setIsSiteVisitModalOpen(false);
          setActiveLeadForSiteVisit(null);
          setIsSiteVisitScheduledMode(false);
        }}
        initialScheduledOnly={isSiteVisitScheduledMode}
        lead={activeLeadForSiteVisit}
        teamMembers={salesTeamOverview?.teamMembers || []}
        currentUser={currentUser}
        onSuccess={async (msg) => {
          await fetchLeads();
          await fetchTeam();
          if (selectedLeadForDrawer) {
            try {
              const res = await leadService.getLeadById(selectedLeadForDrawer._id);
              if (res.data) setSelectedLeadForDrawer(res.data);
            } catch (err) {
              console.error('Error refreshing drawer lead:', err);
            }
          }
        }}
      />

      {/* MANUAL REMINDER DISPATCH MODAL */}
      <SendReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => {
          setIsReminderModalOpen(false);
          setReminderTargetLead(null);
          setReminderTargetVisit(null);
          setReminderTargetFollowUp(null);
        }}
        lead={reminderTargetLead}
        visit={reminderTargetVisit}
        followUp={reminderTargetFollowUp}
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
export default LeadsPage;
