import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { leadService } from '../../services/leadService.js';
import {
  Bell,
  MessageSquare,
  Mail,
  Smartphone,
  ExternalLink,
  Car,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Send
} from 'lucide-react';

export const SendReminderModal = ({
  isOpen,
  onClose,
  lead,
  visit = null,
  followUp = null,
  initialTarget = 'client' // 'client' | 'team'
}) => {
  const [targetType, setTargetType] = useState(initialTarget);
  const [channel, setChannel] = useState('whatsapp');
  const [customText, setCustomText] = useState('');
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [whatsappWebUrl, setWhatsappWebUrl] = useState('');

  const isSiteVisit = Boolean(visit || (followUp && followUp.mode === 'site_visit'));

  useEffect(() => {
    if (!lead) return;

    setTargetType(isSiteVisit ? 'client' : 'team');
    setChannel('whatsapp');
    setErrorMsg('');
    setSuccessMsg('');

    // Pre-compose default message
    const targetDate = visit?.visitDate || followUp?.nextFollowUpDate || new Date();
    const timeStr = new Date(targetDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateStr = new Date(targetDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const flatStr = visit?.flatNumber ? `Flat ${visit.flatNumber}` : (visit?.flatLabel || lead.assignedFlat?.flatNumber ? `Flat ${lead.assignedFlat.flatNumber}` : (lead.requirement || 'Krishna Valley Property Tour'));
    const execName = visit?.accompaniedBy || lead.assignedTo?.firstName || 'Relationship Manager';
    const execPhone = visit?.accompaniedByPhone || lead.assignedTo?.mobileNo || '+91 98765 43210';
    const cab = visit?.cabDetails || {};

    if (isSiteVisit) {
      let msg = `Namaste ${lead.name}! 🙏\n\n`;
      msg += `This is a reminder from *Krishna Valley* that your private property tour is scheduled in 30 minutes at *${timeStr}* (${dateStr}).\n\n`;
      msg += `🏡 *Property:* ${flatStr}\n`;
      msg += `👤 *Your Property Advisor:* ${execName} (📞 ${execPhone})\n`;
      if (cab.isCabProvided) {
        msg += `🚗 *Cab:* ${cab.cabNumber || 'Confirmed'} • Driver: ${cab.driverName || 'Assigned'} (📞 ${cab.driverPhone || 'On duty'})\n`;
        if (cab.pickupLocation) msg += `📍 *Pickup Point:* ${cab.pickupLocation}\n`;
      }
      msg += `\n🗺️ *Location Map:* https://maps.google.com/?q=Krishna+Valley+Vrindavan\n\n`;
      msg += `Your advisor *${execName}* is ready to assist and welcome you to Krishna Valley!`;
      setCustomText(msg);

      const cleanPhone = (lead.mobileNo || '').replace(/\D/g, '');
      const phoneWithCode = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
      setWhatsappWebUrl(`https://wa.me/${phoneWithCode}?text=${encodeURIComponent(msg)}`);
    } else {
      let msg = `🔔 *30-Minute Follow-Up Reminder!*\n\n`;
      msg += `Prospect: *${lead.name}* (📞 ${lead.mobileNo})\n`;
      msg += `Task: *${(followUp?.mode || 'Call').toUpperCase()}*\n`;
      msg += `Scheduled Time: *${timeStr}* (in ~30 minutes)\n`;
      msg += `Unit / Interest: *${flatStr}*\n`;
      if (followUp?.notes) msg += `Notes: "${followUp.notes}"\n`;
      msg += `\n⚡ Open Lead Workspace: https://erp.krishnavalley.com/crm`;
      setCustomText(msg);

      const cleanPhone = (lead.mobileNo || '').replace(/\D/g, '');
      const phoneWithCode = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
      setWhatsappWebUrl(`https://wa.me/${phoneWithCode}?text=${encodeURIComponent(msg)}`);
    }
  }, [lead, visit, followUp, isOpen, isSiteVisit]);

  // Update WhatsApp deep link when text changes
  const handleTextChange = (text) => {
    setCustomText(text);
    const cleanPhone = (lead?.mobileNo || '').replace(/\D/g, '');
    const phoneWithCode = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    setWhatsappWebUrl(`https://wa.me/${phoneWithCode}?text=${encodeURIComponent(text)}`);
  };

  const handleSendReminder = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setSending(true);
    try {
      const res = await leadService.sendManualReminder({
        leadId: lead._id,
        targetType,
        channel,
        siteVisitId: visit?.id || visit?._id || null,
        followUpId: followUp?._id || null,
        customText
      });

      if (res && res.success) {
        setSuccessMsg(`Reminder sent via ${channel.toUpperCase()} successfully!`);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setErrorMsg(res?.message || 'Failed to dispatch reminder');
      }
    } catch (err) {
      console.error('Error dispatching reminder:', err);
      setErrorMsg(err.message || 'Server error while dispatching reminder.');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen || !lead) return null;

  const handlingAdvisorName = visit?.accompaniedBy || lead.assignedTo?.firstName || 'Assigned Executive';
  const handlingAdvisorPhone = visit?.accompaniedByPhone || lead.assignedTo?.mobileNo || '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🔔 Send 30-Minute Reminder"
      maxWidth="640px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {errorMsg && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '10px 14px', borderRadius: '8px', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Recipient Context */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase' }}>
                {targetType === 'client' ? 'Client Recipient (Site Visit)' : 'Sales Team Recipient'}
              </div>
              <div style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>
                {lead.name}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#475569', display: 'flex', gap: '10px', marginTop: '2px' }}>
                <span>📞 {lead.mobileNo}</span>
                {lead.email && <span>✉️ {lead.email}</span>}
              </div>
            </div>

            {/* Target Toggle */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setTargetType('client')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: '800',
                  border: targetType === 'client' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                  background: targetType === 'client' ? '#dcfce7' : '#ffffff',
                  color: targetType === 'client' ? '#15803d' : '#475569',
                  cursor: 'pointer'
                }}
              >
                Client (Site Visit)
              </button>
              <button
                type="button"
                onClick={() => setTargetType('team')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: '800',
                  border: targetType === 'team' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  background: targetType === 'team' ? '#dbeafe' : '#ffffff',
                  color: targetType === 'team' ? '#1d4ed8' : '#475569',
                  cursor: 'pointer'
                }}
              >
                Sales Rep
              </button>
            </div>
          </div>

          {/* Sender Context: Highlight that client reminders are sent by the handling team member */}
          {targetType === 'client' && (
            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', padding: '6px 10px', fontSize: '0.74rem', color: '#065f46', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
              <span>👤 <strong>Handling Executive (Sender):</strong> {handlingAdvisorName} {handlingAdvisorPhone ? `(📞 ${handlingAdvisorPhone})` : ''}</span>
              <span style={{ fontSize: '0.7rem', color: '#047857', fontWeight: '600' }}>✓ Sent directly by handling member to client</span>
            </div>
          )}
        </div>

        {/* Channel Selector */}
        <div>
          <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '800', color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Select Dispatch Channel
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setChannel('whatsapp')}
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                border: channel === 'whatsapp' ? '2px solid #25D366' : '1px solid #cbd5e1',
                background: channel === 'whatsapp' ? '#f0fdf4' : '#ffffff',
                color: channel === 'whatsapp' ? '#166534' : '#334155',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: '800',
                fontSize: '0.82rem'
              }}
            >
              <MessageSquare size={16} color="#25D366" />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => setChannel('email')}
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                border: channel === 'email' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                background: channel === 'email' ? '#eff6ff' : '#ffffff',
                color: channel === 'email' ? '#1d4ed8' : '#334155',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: '800',
                fontSize: '0.82rem'
              }}
            >
              <Mail size={16} color="#2563eb" />
              <span>Email (HTML)</span>
            </button>

            <button
              type="button"
              onClick={() => setChannel('sms')}
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                border: channel === 'sms' ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                background: channel === 'sms' ? '#faf5ff' : '#ffffff',
                color: channel === 'sms' ? '#6d28d9' : '#334155',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: '800',
                fontSize: '0.82rem'
              }}
            >
              <Smartphone size={16} color="#7c3aed" />
              <span>SMS Gateway</span>
            </button>
          </div>
        </div>

        {/* Message Content Preview / Editor */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ fontSize: '0.76rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Reminder Message Preview & Customization
            </label>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              {customText.length} characters
            </span>
          </div>
          <textarea
            rows={7}
            value={customText}
            onChange={(e) => handleTextChange(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              lineHeight: '1.45',
              fontFamily: 'inherit',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Actions Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '14px', flexWrap: 'wrap', gap: '10px' }}>
          {/* Direct 1-Click WhatsApp Link */}
          {channel === 'whatsapp' && whatsappWebUrl && (
            <a
              href={whatsappWebUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                background: '#25D366',
                color: '#ffffff',
                textDecoration: 'none',
                fontWeight: '800',
                fontSize: '0.82rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 5px rgba(37,211,102,0.3)'
              }}
              title="Open WhatsApp Web or WhatsApp Desktop with this pre-filled message"
            >
              <MessageSquare size={15} />
              <span>Open in WhatsApp Web</span>
              <ExternalLink size={13} />
            </a>
          )}

          <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={sending}
              style={{ padding: '8px 16px', fontSize: '0.84rem' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSendReminder}
              disabled={sending}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                border: 'none',
                background: channel === 'whatsapp'
                  ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)'
                  : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                fontWeight: '800',
                fontSize: '0.84rem',
                cursor: sending ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 5px rgba(0,0,0,0.15)'
              }}
            >
              <Send size={14} />
              <span>{sending ? 'Sending...' : `Send via ${channel.toUpperCase()}`}</span>
            </button>
          </div>
        </div>

      </div>
    </Modal>
  );
};

export default SendReminderModal;
