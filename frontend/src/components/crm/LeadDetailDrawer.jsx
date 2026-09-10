import React, { useState } from 'react';
import { leadService } from '../../services/leadService.js';
import {
  X,
  Phone,
  MessageSquare,
  Mail,
  Calendar,
  Clock,
  Car,
  Star,
  Users,
  Building,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  MapPin,
  Globe,
  Plus,
  Zap,
  ShoppingBag,
  Trash2,
  Edit,
  History,
  Copy,
  Check,
  Award,
  ChevronRight,
  ShieldCheck,
  Compass,
  ArrowRight,
  ExternalLink,
  Tag,
  Bell
} from 'lucide-react';
import { googleCalendarService } from '../../services/googleCalendarService.js';

export const LeadDetailDrawer = ({
  isOpen,
  onClose,
  lead,
  currentUser,
  salesTeam = [],
  onLeadUpdated,
  onScheduleFollowUp,
  onLogSiteVisit,
  onConvertLead,
  onChangeStage,
  onStartCall,
  onSendMessage,
  onReviewSiteVisit,
  onEditLead,
  onDeleteLead,
  onSendReminder
}) => {
  if (!isOpen || !lead) return null;

  // Local state for inline team status updating on scheduled follow-ups
  const [activeEditingFuId, setActiveEditingFuId] = useState(null);
  const [fuStatus, setFuStatus] = useState('completed');
  const [fuFeedback, setFuFeedback] = useState('');
  const [fuRescheduleDate, setFuRescheduleDate] = useState('');
  const [updatingFu, setUpdatingFu] = useState(false);
  const [fuSuccessMsg, setFuSuccessMsg] = useState('');

  // Local state for inline Add New Follow-Up
  const [isAddingNewFu, setIsAddingNewFu] = useState(false);
  const [newFuMode, setNewFuMode] = useState('call');
  const [newFuNotes, setNewFuNotes] = useState('');
  const [newFuNextDate, setNewFuNextDate] = useState('');
  const [addingFuLoading, setAddingFuLoading] = useState(false);

  // Quick reassignment state
  const [reassigning, setReassigning] = useState(false);
  const [copiedText, setCopiedText] = useState('');

  const followUps = lead.followUps || [];
  const externalSiteVisits = lead.externalSiteVisits || [];
  const assignee = lead.assignedTo;
  const currentUserIdStr = currentUser?._id?.toString() || currentUser?.id?.toString() || '';
  const isAssignedToCurrentUser = assignee && ((assignee._id?.toString() || assignee.toString()) === currentUserIdStr);
  const isMetaLead = lead.leadSource === 'meta_ads' || lead.metaAdDetails?.leadgenId || (lead.metaCustomQuestions && lead.metaCustomQuestions.length > 0);
  const cleanPhone = (lead.mobileNo || '').replace(/[^0-9]/g, '');

  // Separate pending/scheduled follow-ups vs completed history
  const pendingFollowUps = followUps.filter(fu => fu.status === 'pending' || (!fu.status && fu.nextFollowUpDate));
  const completedFollowUps = followUps.filter(fu => fu.status === 'completed' || fu.status === 'rescheduled' || fu.status === 'cancelled');

  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(''), 2000);
  };

  // Quick Assign Lead
  const handleQuickAssign = async (newRepId) => {
    setReassigning(true);
    try {
      await leadService.assignLead({
        leadId: lead._id,
        assignedTo: newRepId === 'unassigned' ? null : newRepId,
        reason: 'Reassigned via Lead Workspace Drawer'
      });
      if (onLeadUpdated) onLeadUpdated();
    } catch (err) {
      console.error('Error reassigning lead:', err);
      alert('Failed to reassign lead: ' + err.message);
    } finally {
      setReassigning(false);
    }
  };

  // Start updating a specific follow-up
  const handleStartUpdateFu = (fu) => {
    setActiveEditingFuId(fu._id);
    setFuStatus('completed');
    setFuFeedback(fu.feedback || '');
    setFuRescheduleDate(fu.nextFollowUpDate ? new Date(fu.nextFollowUpDate).toISOString().slice(0, 16) : '');
    setFuSuccessMsg('');
  };

  // Submit Follow-Up Status & Remarks Update
  const handleSaveFuUpdate = async (fuId) => {
    setUpdatingFu(true);
    setFuSuccessMsg('');
    try {
      const payload = {
        status: fuStatus,
        feedback: fuFeedback.trim(),
        notes: fuFeedback.trim(),
        rescheduledTo: fuStatus === 'rescheduled' && fuRescheduleDate ? new Date(fuRescheduleDate).toISOString() : undefined,
        nextFollowUpDate: fuStatus === 'rescheduled' && fuRescheduleDate ? new Date(fuRescheduleDate).toISOString() : undefined,
      };

      await leadService.updateFollowUp(lead._id, fuId, payload);
      setFuSuccessMsg('Follow-up status updated successfully!');
      setActiveEditingFuId(null);
      if (onLeadUpdated) onLeadUpdated();
    } catch (err) {
      console.error('Error updating follow-up:', err);
      alert('Failed to update follow-up: ' + err.message);
    } finally {
      setUpdatingFu(false);
    }
  };

  // Add New Subsequent Follow-Up
  const handleAddNewFollowUp = async (e) => {
    e.preventDefault();
    if (!newFuNotes.trim()) {
      alert('Please enter follow-up notes.');
      return;
    }

    setAddingFuLoading(true);
    try {
      const payload = {
        mode: newFuMode,
        notes: newFuNotes.trim(),
        nextFollowUpDate: newFuNextDate ? new Date(newFuNextDate).toISOString() : undefined,
        status: newFuNextDate ? 'pending' : 'completed',
        assignedTo: lead.assignedTo?._id || lead.assignedTo || currentUser?._id,
      };

      await leadService.addFollowUp(lead._id, payload);
      setNewFuNotes('');
      setNewFuNextDate('');
      setIsAddingNewFu(false);
      setFuSuccessMsg('New follow-up interaction logged!');
      if (onLeadUpdated) onLeadUpdated();
    } catch (err) {
      console.error('Error adding follow-up:', err);
      alert('Failed to add follow-up: ' + err.message);
    } finally {
      setAddingFuLoading(false);
    }
  };

  // Delete Follow-Up
  const handleDeleteFu = async (fuId) => {
    if (!window.confirm('Are you sure you want to delete this follow-up record?')) return;
    try {
      await leadService.deleteFollowUp(lead._id, fuId);
      if (onLeadUpdated) onLeadUpdated();
    } catch (err) {
      console.error('Error deleting follow-up:', err);
      alert('Failed to delete follow-up: ' + err.message);
    }
  };

  // Pipeline Badge Colors
  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd', label: 'New Prospect' };
      case 'contacted': return { bg: '#fef3c7', color: '#92400e', border: '#fde68a', label: 'Contacted' };
      case 'in_discussion': return { bg: '#f3e8ff', color: '#7e22ce', border: '#e9d5ff', label: 'In Discussion' };
      case 'followup_scheduled': return { bg: '#ffedd5', color: '#c2410c', border: '#fed7aa', label: 'Follow-Up Scheduled' };
      case 'site_visit_scheduled': return { bg: '#fef3c7', color: '#b45309', border: '#fde68a', label: 'Visit Scheduled' };
      case 'site_visit_completed': return { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0', label: 'Site Visit Done' };
      case 'converted': return { bg: '#e6f4ea', color: '#137333', border: '#ceead6', label: 'Won Deal (Converted)' };
      case 'lost': return { bg: '#fee2e2', color: '#991b1b', border: '#fecaca', label: 'Lost Prospect' };
      default: return { bg: '#f1f5f9', color: '#334155', border: '#cbd5e1', label: (status || 'Lead').replace(/_/g, ' ') };
    }
  };

  const statusStyle = getStatusColor(lead.status);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1050, display: 'flex', justifyContent: 'flex-end' }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(3px)',
          animation: 'fadeIn 0.2s ease-out'
        }}
      />

      {/* Slide-Over Drawer Container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '720px',
          height: '100%',
          backgroundColor: '#ffffff',
          boxShadow: '-8px 0 30px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1051,
          animation: 'slideLeft 0.25s ease-out'
        }}
      >
        {/* ========================================================================= */}
        {/* DRAWER HEADER: Prospect Profile, Direct Contact, Stage & Close */}
        {/* ========================================================================= */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #e2e8f0',
          background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', minWidth: 0, flex: 1 }}>
            {/* Avatar */}
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: isAssignedToCurrentUser ? '#dcfce7' : '#e0f2fe',
              color: isAssignedToCurrentUser ? '#15803d' : '#0369a1',
              border: isAssignedToCurrentUser ? '2px solid #86efac' : '2px solid #bae6fd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              fontWeight: '800',
              flexShrink: 0
            }}>
              {lead.name ? lead.name.charAt(0).toUpperCase() : 'P'}
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  {lead.name}
                </h2>

                {/* Stage Badge */}
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: '800',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: statusStyle.bg,
                  color: statusStyle.color,
                  border: `1px solid ${statusStyle.border}`,
                  textTransform: 'capitalize'
                }}>
                  {statusStyle.label}
                </span>

                {/* Meta Ad Tag */}
                {isMetaLead && (
                  <span style={{ fontSize: '0.68rem', fontWeight: '800', background: '#e0f2fe', color: '#0284c7', padding: '2px 6px', borderRadius: '4px', border: '1px solid #bae6fd', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <Globe size={11} /> Meta Ad
                  </span>
                )}

                {/* Agent Tag */}
                {lead.agentId && (
                  <span style={{ fontSize: '0.68rem', fontWeight: '700', background: '#eff6ff', color: '#1d4ed8', padding: '2px 6px', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
                    🏢 Agent ({lead.agentId.firstName || lead.agentId.username})
                  </span>
                )}
              </div>

              {/* Direct Communication Badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                {/* Phone Call */}
                <button
                  type="button"
                  onClick={() => onStartCall && onStartCall(lead)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '5px',
                    background: '#e0f2fe',
                    color: '#0369a1',
                    fontSize: '0.76rem',
                    fontWeight: '800',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                  title="Voice Call Softphone"
                >
                  <Phone size={12} /> {lead.mobileNo}
                </button>

                {/* WhatsApp */}
                <a
                  href={`https://wa.me/${cleanPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '5px',
                    background: '#dcfce7',
                    color: '#15803d',
                    fontSize: '0.76rem',
                    fontWeight: '800',
                    textDecoration: 'none'
                  }}
                  title="Direct WhatsApp"
                >
                  <MessageSquare size={12} /> WhatsApp
                </a>

                {/* Notify Modal */}
                <button
                  type="button"
                  onClick={() => onSendMessage && onSendMessage(lead)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '5px',
                    background: '#fffbeb',
                    color: '#b45309',
                    fontSize: '0.76rem',
                    fontWeight: '800',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                  title="Send WhatsApp/Email Template"
                >
                  <Mail size={12} /> Notify
                </button>

                {/* Copy */}
                <button
                  type="button"
                  onClick={() => handleCopy(`${lead.name} - ${lead.mobileNo}`)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: copiedText ? '#16a34a' : '#94a3b8', display: 'inline-flex', alignItems: 'center' }}
                  title="Copy Contact"
                >
                  {copiedText ? <Check size={13} /> : <Copy size={13} />}
                </button>

                {/* Location */}
                {(lead.city || lead.state) && (
                  <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <MapPin size={11} /> {lead.city ? `${lead.city}, ` : ''}{lead.state || ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Top Actions: Edit, Delete, Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {onEditLead && (
              <button
                type="button"
                onClick={() => onEditLead(lead)}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.74rem',
                  fontWeight: '700',
                  color: '#334155',
                  cursor: 'pointer'
                }}
                title="Edit Lead Details"
              >
                <Edit size={13} /> Edit
              </button>
            )}

            {onDeleteLead && (
              <button
                type="button"
                onClick={() => {
                  if (onDeleteLead(lead)) {
                    onClose();
                  }
                }}
                style={{
                  background: '#fee2e2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  padding: '5px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '0.74rem',
                  color: '#b91c1c',
                  cursor: 'pointer'
                }}
                title="Delete Lead"
              >
                <Trash2 size={13} />
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#475569'
              }}
              title="Close Panel"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* QUICK ACTION TOOLBAR (Prominent, High-Contrast, Action-Driven) */}
        {/* ========================================================================= */}
        <div style={{
          padding: '10px 24px',
          background: '#f1f5f9',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          {/* 🚗 Log Site Visit Button */}
          <button
            type="button"
            onClick={() => onLogSiteVisit && onLogSiteVisit(lead)}
            style={{
              padding: '7px 14px',
              borderRadius: '7px',
              border: 'none',
              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              color: '#ffffff',
              fontSize: '0.8rem',
              fontWeight: '800',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(22,163,74,0.2)'
            }}
          >
            <Car size={14} /> 🚗 Log Site Visit
          </button>

          {/* 📅 Schedule Follow-Up Button (Sales Head / Manager Tool) */}
          <button
            type="button"
            onClick={() => onScheduleFollowUp && onScheduleFollowUp(lead)}
            style={{
              padding: '7px 14px',
              borderRadius: '7px',
              border: '1px solid #bfdbfe',
              background: '#eff6ff',
              color: '#1d4ed8',
              fontSize: '0.8rem',
              fontWeight: '800',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
            title="Schedule Follow-Up Task for Team Member"
          >
            <Calendar size={14} /> 📅 Schedule Task
          </button>

          {/* ➕ Quick Log Follow-Up Button */}
          <button
            type="button"
            onClick={() => setIsAddingNewFu(!isAddingNewFu)}
            style={{
              padding: '7px 12px',
              borderRadius: '7px',
              border: '1px solid #cbd5e1',
              background: isAddingNewFu ? '#e2e8f0' : '#ffffff',
              color: '#0f172a',
              fontSize: '0.8rem',
              fontWeight: '800',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer'
            }}
          >
            <Plus size={14} /> + New Follow-Up
          </button>

          {/* ⚡ Change Stage Button */}
          <button
            type="button"
            onClick={() => onChangeStage && onChangeStage(lead)}
            style={{
              padding: '7px 12px',
              borderRadius: '7px',
              border: '1px solid #fde68a',
              background: '#fffbeb',
              color: '#b45309',
              fontSize: '0.8rem',
              fontWeight: '800',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer'
            }}
          >
            <Zap size={14} color="#f59e0b" /> Change Stage
          </button>

          {/* 🔔 Send Reminder Button */}
          <button
            type="button"
            onClick={() => onSendReminder && onSendReminder(lead)}
            style={{
              padding: '7px 12px',
              borderRadius: '7px',
              border: '1px solid #fde68a',
              background: '#fffbeb',
              color: '#b45309',
              fontSize: '0.8rem',
              fontWeight: '800',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer'
            }}
            title="Send 30-Minute Reminder to Client (Site Visit) or Sales Rep via WhatsApp / Email"
          >
            <Bell size={14} color="#b45309" /> 🔔 Send Reminder
          </button>

          {/* 🛍️ Convert to Sales Button */}
          {lead.status !== 'converted' && (
            <button
              type="button"
              onClick={() => onConvertLead && onConvertLead(lead)}
              style={{
                padding: '7px 14px',
                borderRadius: '7px',
                border: 'none',
                background: '#0d904f',
                color: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: '800',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
                marginLeft: 'auto'
              }}
            >
              <ShoppingBag size={14} /> Won Deal
            </button>
          )}
        </div>

        {/* ========================================================================= */}
        {/* SCROLLABLE WORKSPACE BODY */}
        {/* ========================================================================= */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Success Banner */}
          {fuSuccessMsg && (
            <div style={{
              background: '#dcfce7',
              border: '1px solid #86efac',
              color: '#15803d',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.84rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircle2 size={16} />
              <span>{fuSuccessMsg}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 1: SALES HEAD ASSIGNMENT & REP STATUS CARD */}
          {/* ========================================================================= */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '14px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Sales Assignment & Ownership
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: isAssignedToCurrentUser ? '#16a34a' : '#4f46e5',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: '800'
                }}>
                  {assignee?.firstName?.charAt(0) || assignee?.username?.charAt(0) || 'U'}
                </div>
                <div>
                  <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.9rem' }}>
                    {assignee?.firstName ? `${assignee.firstName} ${assignee.lastName || ''}` : (assignee?.username || 'Unassigned (In Queue)')}
                  </span>
                  {isAssignedToCurrentUser && (
                    <span style={{ marginLeft: '6px', fontSize: '0.68rem', fontWeight: '800', background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: '4px' }}>
                      Assigned to You
                    </span>
                  )}
                </div>
              </div>
              {lead.assignedAt && (
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                  Assigned on {new Date(lead.assignedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  {lead.assignedBy && ` by ${lead.assignedBy.firstName || lead.assignedBy.username}`}
                </div>
              )}
            </div>

            {/* Sales Head Reassignment Quick-Picker */}
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', marginBottom: '3px' }}>
                👑 Sales Head Reassign:
              </div>
              <select
                value={assignee?._id || assignee || 'unassigned'}
                onChange={(e) => handleQuickAssign(e.target.value)}
                disabled={reassigning}
                style={{
                  padding: '5px 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.78rem',
                  fontWeight: '600',
                  color: '#0f172a',
                  background: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                <option value="unassigned">-- Unassigned --</option>
                {salesTeam.map((m) => {
                  const u = m.userId || m;
                  if (!u) return null;
                  return (
                    <option key={u._id} value={u._id}>
                      {u.firstName || u.username} ({u.roleId?.name?.replace(/_/g, ' ') || 'Sales'})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 2: DEDICATED META ADS FORM DATA (IF INGESTED VIA META) */}
          {/* ========================================================================= */}
          {isMetaLead && (
            <div style={{
              background: 'linear-gradient(135deg, #f0f9ff 0%, #f5f3ff 100%)',
              border: '1px solid #bae6fd',
              borderRadius: '10px',
              padding: '14px 18px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#0369a1', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Globe size={14} color="#0284c7" />
                  📋 Meta Ads Leadgen Submission
                </span>
                <span style={{ background: '#0284c7', color: '#ffffff', fontSize: '0.66rem', padding: '2px 8px', borderRadius: '12px', fontWeight: '800' }}>
                  {lead.metaAdDetails?.platform ? lead.metaAdDetails.platform.toUpperCase() : 'FACEBOOK & INSTAGRAM'}
                </span>
              </div>

              {lead.metaAdDetails?.campaignName && (
                <div style={{ fontSize: '0.74rem', color: '#475569', marginBottom: '8px' }}>
                  <strong>Campaign:</strong> {lead.metaAdDetails.campaignName}
                  {lead.metaAdDetails.formName && <span> • <strong>Form:</strong> {lead.metaAdDetails.formName}</span>}
                </div>
              )}

              {/* Custom Questions Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                {(lead.metaCustomQuestions || []).map((q, idx) => (
                  <div key={idx} style={{ background: '#ffffff', border: '1px solid #e0f2fe', padding: '8px 12px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600' }}>{q.question}</div>
                    <div style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: '800', marginTop: '2px' }}>
                      {q.answer || 'Not answered'}
                    </div>
                  </div>
                ))}
                {(!lead.metaCustomQuestions || lead.metaCustomQuestions.length === 0) && (
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontStyle: 'italic' }}>
                    Direct lead parameters parsed into standard fields.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 3: SCHEDULED FOLLOW-UPS & TASKS (CORE WORKFLOW) */}
          {/* ========================================================================= */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={16} color="#2563eb" />
                <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Active Scheduled Follow-Ups & Tasks ({pendingFollowUps.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onScheduleFollowUp && onScheduleFollowUp(lead)}
                style={{
                  fontSize: '0.74rem',
                  fontWeight: '800',
                  color: '#1d4ed8',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  padding: '3px 8px',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                + Schedule New Task
              </button>
            </div>

            {pendingFollowUps.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '24px 20px',
                background: '#f8fafc',
                border: '1px dashed #cbd5e1',
                borderRadius: '8px'
              }}>
                <Clock size={28} style={{ color: '#94a3b8', margin: '0 auto 6px' }} />
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569' }}>
                  No Pending Follow-Ups Scheduled
                </div>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '4px 0 12px' }}>
                  The sales head or team member can schedule the next call or site visit appointment.
                </p>
                <button
                  type="button"
                  onClick={() => onScheduleFollowUp && onScheduleFollowUp(lead)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '0.78rem',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  📅 Schedule Follow-Up Now
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pendingFollowUps.map((fu) => {
                  const isEditingThisFu = activeEditingFuId === fu._id;
                  const isScheduledByHead = fu.scheduledBy;
                  const fuDate = fu.nextFollowUpDate || fu.date;

                  return (
                    <div
                      key={fu._id}
                      style={{
                        background: '#ffffff',
                        border: isScheduledByHead ? '2px solid #93c5fd' : '1px solid #cbd5e1',
                        borderRadius: '10px',
                        padding: '14px 16px',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.04)',
                        position: 'relative'
                      }}
                    >
                      {/* Scheduled Header Badge */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {/* Head Scheduled Pill */}
                          {isScheduledByHead ? (
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: '800',
                              background: '#eff6ff',
                              color: '#1e40af',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              border: '1px solid #bfdbfe',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              👑 Scheduled by Sales Head ({fu.scheduledBy?.firstName || fu.scheduledBy?.username || 'Management'})
                            </span>
                          ) : (
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: '800',
                              background: '#f8fafc',
                              color: '#475569',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1'
                            }}>
                              Scheduled Follow-Up
                            </span>
                          )}

                          {/* Mode Pill */}
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            background: fu.mode === 'site_visit' ? '#fef3c7' : '#dbeafe',
                            color: fu.mode === 'site_visit' ? '#b45309' : '#1e40af',
                            padding: '2px 8px',
                            borderRadius: '4px'
                          }}>
                            {fu.mode?.replace(/_/g, ' ')}
                          </span>
                        </div>

                        {/* Due Date Badge */}
                        <div style={{
                          fontSize: '0.78rem',
                          fontWeight: '800',
                          color: '#b45309',
                          background: '#fffbeb',
                          border: '1px solid #fde68a',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <Clock size={12} />
                          {fuDate ? new Date(fuDate).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'Date not specified'}
                        </div>
                      </div>

                      {/* Instructions / Agenda from Sales Head */}
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
                          Instructions & Agenda:
                        </div>
                        <div style={{ fontSize: '0.86rem', color: '#0f172a', fontWeight: '600', marginTop: '2px', lineHeight: '1.4' }}>
                          {fu.notes || 'No specific agenda remarks provided.'}
                        </div>
                      </div>

                      {/* Assigned Team Member info */}
                      {fu.assignedTo && (
                        <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '6px' }}>
                          Assigned Rep: <strong>{fu.assignedTo?.firstName || fu.assignedTo?.username || 'Sales Rep'}</strong>
                        </div>
                      )}

                      {/* ========================================================================= */}
                      {/* TEAM MEMBER EXECUTION & STATUS UPDATE WORKSPACE */}
                      {/* ========================================================================= */}
                      <div style={{
                        marginTop: '12px',
                        borderTop: '1px solid #f1f5f9',
                        paddingTop: '10px'
                      }}>
                        {!isEditingThisFu ? (
                          /* View State: Quick Action Triggers */
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                              Status: <strong style={{ color: '#d97706' }}>Pending Execution</strong>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              {/* Google Calendar Action Link / Button */}
                              {fu.googleCalendar?.htmlLink ? (
                                <a
                                  href={fu.googleCalendar.htmlLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    background: '#eff6ff',
                                    border: '1px solid #bfdbfe',
                                    color: '#1d4ed8',
                                    fontSize: '0.74rem',
                                    fontWeight: '700',
                                    textDecoration: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                  title="View Event in Google Calendar"
                                >
                                  <Calendar size={13} /> Google Calendar <ExternalLink size={11} />
                                </a>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const url = googleCalendarService.generateCalendarEventUrl({
                                      leadName: lead.name,
                                      leadMobile: lead.mobileNo,
                                      leadEmail: lead.email,
                                      mode: fu.mode,
                                      notes: fu.notes,
                                      scheduledDate: fuDate,
                                      durationMinutes: fu.mode === 'site_visit' ? 45 : 30
                                    });
                                    window.open(url, '_blank');
                                  }}
                                  style={{
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    background: '#ffffff',
                                    border: '1px solid #dadce0',
                                    color: '#1a73e8',
                                    fontSize: '0.74rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                  title="Add to personal Google Calendar"
                                >
                                  <Calendar size={13} /> + Calendar
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleStartUpdateFu(fu)}
                                style={{
                                  padding: '5px 12px',
                                  borderRadius: '6px',
                                  background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                                  color: '#ffffff',
                                  fontSize: '0.76rem',
                                  fontWeight: '800',
                                  border: 'none',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  boxShadow: '0 1px 3px rgba(22,163,74,0.25)'
                                }}
                              >
                                <CheckCircle2 size={13} /> Update Status & Remarks
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteFu(fu._id)}
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: '6px',
                                  background: '#fee2e2',
                                  color: '#b91c1c',
                                  border: '1px solid #fecaca',
                                  fontSize: '0.76rem',
                                  cursor: 'pointer'
                                }}
                                title="Delete Task"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Edit State: Interactive Status Updater */
                          <div style={{
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            padding: '12px 14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px'
                          }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <CheckCircle2 size={14} color="#16a34a" /> Update Follow-Up Status (Team Member)
                            </div>

                            {/* Status Choice Segmented Buttons */}
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {[
                                { id: 'completed', label: '✅ Mark Completed', color: '#15803d', bg: '#dcfce7', border: '#86efac' },
                                { id: 'rescheduled', label: '⏰ Reschedule', color: '#1d4ed8', bg: '#dbeafe', border: '#93c5fd' },
                                { id: 'cancelled', label: '❌ Cancelled', color: '#b91c1c', bg: '#fee2e2', border: '#fca5a5' },
                              ].map((opt) => (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => setFuStatus(opt.id)}
                                  style={{
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    fontSize: '0.76rem',
                                    fontWeight: '800',
                                    cursor: 'pointer',
                                    border: fuStatus === opt.id ? `2px solid ${opt.border}` : '1px solid #cbd5e1',
                                    background: fuStatus === opt.id ? opt.bg : '#ffffff',
                                    color: fuStatus === opt.id ? opt.color : '#475569',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>

                            {/* Reschedule Date Picker if Rescheduled */}
                            {fuStatus === 'rescheduled' && (
                              <div>
                                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#1e40af', marginBottom: '3px' }}>
                                  New Scheduled Date & Time *
                                </label>
                                <input
                                  type="datetime-local"
                                  required
                                  value={fuRescheduleDate}
                                  onChange={(e) => setFuRescheduleDate(e.target.value)}
                                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #93c5fd', fontSize: '0.8rem' }}
                                />
                              </div>
                            )}

                            {/* Team Member Remarks */}
                            <div>
                              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                                Execution Remarks & Client Response *
                              </label>
                              <textarea
                                rows={2}
                                required
                                placeholder="e.g. Spoke with client. Confirmed budget around 65 Lakhs. Wants site visit on Sunday morning."
                                value={fuFeedback}
                                onChange={(e) => setFuFeedback(e.target.value)}
                                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                              />
                            </div>

                            {/* Buttons */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => setActiveEditingFuId(null)}
                                style={{ padding: '5px 12px', fontSize: '0.75rem', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '5px', cursor: 'pointer' }}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                disabled={updatingFu}
                                onClick={() => handleSaveFuUpdate(fu._id)}
                                style={{
                                  padding: '5px 16px',
                                  fontSize: '0.76rem',
                                  fontWeight: '800',
                                  background: '#16a34a',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '5px',
                                  cursor: updatingFu ? 'not-allowed' : 'pointer'
                                }}
                              >
                                {updatingFu ? 'Saving...' : '💾 Save Status & Remarks'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* SECTION 4: INLINE + ADD NEW SUBSEQUENT FOLLOW-UP (EXPANDABLE) */}
          {/* ========================================================================= */}
          {isAddingNewFu && (
            <div style={{
              background: '#f8fafc',
              border: '2px solid #3b82f6',
              borderRadius: '10px',
              padding: '16px 18px',
              boxShadow: '0 2px 8px rgba(59,130,246,0.15)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.86rem', fontWeight: '800', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Plus size={16} color="#2563eb" /> Log Subsequent Follow-Up Interaction
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingNewFu(false)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAddNewFollowUp} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                      Interaction Mode
                    </label>
                    <select
                      value={newFuMode}
                      onChange={(e) => setNewFuMode(e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: '600' }}
                    >
                      <option value="call">📞 Phone Call</option>
                      <option value="whatsapp">💬 WhatsApp</option>
                      <option value="site_visit">🚗 Site Visit</option>
                      <option value="meeting">🤝 Meeting</option>
                      <option value="email">✉️ Email</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                      Next Follow-Up Date (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={newFuNextDate}
                      onChange={(e) => setNewFuNextDate(e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                    Discussion Summary & Remarks *
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Enter what was discussed with the client..."
                    value={newFuNotes}
                    onChange={(e) => setNewFuNotes(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewFu(false)}
                    style={{ padding: '6px 12px', fontSize: '0.78rem', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingFuLoading}
                    style={{
                      padding: '6px 16px',
                      fontSize: '0.78rem',
                      fontWeight: '800',
                      background: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: addingFuLoading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {addingFuLoading ? 'Logging...' : 'Save Follow-Up'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 5: EXTERNAL SITE VISITS RECORD */}
          {/* ========================================================================= */}
          {externalSiteVisits.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Car size={16} color="#16a34a" />
                <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Recorded Site Visits ({externalSiteVisits.length})
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {externalSiteVisits.map((sv, svIdx) => (
                  <div
                    key={svIdx}
                    style={{
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '8px',
                      padding: '12px 16px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.84rem', fontWeight: '800', color: '#166534' }}>
                          Visited: {sv.flatLabel || 'Project Site'}
                        </span>
                        <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: '4px', fontWeight: '800' }}>
                          Rating: {sv.interestRating}/5 ⭐
                        </span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                        {new Date(sv.visitDate).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: '#334155', marginTop: '6px' }}>
                      {sv.feedback}
                    </div>

                    {sv.cabDetails?.isCabProvided && (
                      <div style={{ fontSize: '0.72rem', color: '#1e40af', background: '#eff6ff', padding: '4px 8px', borderRadius: '4px', marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Car size={11} /> Cab: {sv.cabDetails.cabNumber || 'Company Vehicle'} (Driver: {sv.cabDetails.driverName || 'Assigned'})
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 6: INTERACTION HISTORY & AUDIT TRAIL */}
          {/* ========================================================================= */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <History size={16} color="#64748b" />
              <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Completed Interaction History ({completedFollowUps.length})
              </h3>
            </div>

            {completedFollowUps.length === 0 ? (
              <div style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic', padding: '12px 0' }}>
                No completed interactions logged yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {completedFollowUps.map((fu, fuIdx) => (
                  <div
                    key={fu._id || fuIdx}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '10px 14px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: '800',
                          textTransform: 'uppercase',
                          background: fu.status === 'completed' ? '#dcfce7' : '#fee2e2',
                          color: fu.status === 'completed' ? '#15803d' : '#b91c1c',
                          padding: '1px 6px',
                          borderRadius: '4px'
                        }}>
                          {fu.mode} ({fu.status})
                        </span>

                        {fu.completedBy && (
                          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            by {fu.completedBy?.firstName || fu.completedBy?.username}
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {new Date(fu.completedAt || fu.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </div>

                    <div style={{ fontSize: '0.82rem', color: '#334155', marginTop: '5px' }}>
                      {fu.feedback || fu.notes || 'No remarks recorded'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* SECTION 7: PROSPECT OVERVIEW & UNIT INFORMATION */}
          {/* ========================================================================= */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '14px 18px'
          }}>
            <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', marginBottom: '10px' }}>
              Lead Overview & Requirements
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '0.82rem', color: '#475569' }}>
              <div><strong>Requirement:</strong> {lead.assignedFlat ? `Flat ${lead.assignedFlat.flatNumber}` : (lead.requirement || 'Not specified')}</div>
              <div><strong>Lead Source:</strong> {lead.leadSource?.replace(/_/g, ' ').toUpperCase() || 'Direct'}</div>
              <div><strong>Email:</strong> {lead.email || 'Not provided'}</div>
              <div><strong>Registered:</strong> {new Date(lead.createdAt).toLocaleDateString('en-IN')}</div>
            </div>

            {lead.assignmentHistory && lead.assignmentHistory.length > 0 && (
              <div style={{ marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>
                  Assignment History Log ({lead.assignmentHistory.length})
                </div>
                <div style={{ maxHeight: '70px', overflowY: 'auto', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {lead.assignmentHistory.map((ah, ahIdx) => (
                    <div key={ahIdx} style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      • {new Date(ah.assignedAt || ah.timestamp || Date.now()).toLocaleDateString('en-IN')} - {ah.reason || 'Assigned'}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

export default LeadDetailDrawer;
