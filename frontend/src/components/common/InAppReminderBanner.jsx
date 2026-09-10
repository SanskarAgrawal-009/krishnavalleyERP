import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Clock,
  Car,
  Phone,
  MessageSquare,
  Users,
  X,
  ArrowRight,
  ExternalLink,
  MapPin,
  Calendar
} from 'lucide-react';

export const InAppReminderBanner = ({
  activeAlert,
  onDismiss,
  onSnooze,
  onOpenWorkspace
}) => {
  const navigate = useNavigate();

  if (!activeAlert) return null;

  const isSiteVisit = activeAlert.type === 'site_visit' || activeAlert.mode === 'site_visit';
  const minutes = activeAlert.minutesRemaining;
  const isPast = minutes < 0;

  const getModeIcon = () => {
    switch (activeAlert.mode) {
      case 'site_visit': return <Car size={16} color="#16a34a" />;
      case 'call': return <Phone size={16} color="#2563eb" />;
      case 'whatsapp': return <MessageSquare size={16} color="#15803d" />;
      case 'meeting': return <Users size={16} color="#9333ea" />;
      default: return <Calendar size={16} color="#0284c7" />;
    }
  };

  const getModeLabel = () => {
    switch (activeAlert.mode) {
      case 'site_visit': return 'Property Site Visit';
      case 'call': return 'Phone Consultation';
      case 'whatsapp': return 'WhatsApp Follow-Up';
      case 'meeting': return 'In-Person Meeting';
      default: return 'Follow-Up Task';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 2500,
        width: '380px',
        maxWidth: 'calc(100vw - 32px)',
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.18), 0 2px 8px rgba(0, 0, 0, 0.08)',
        border: '2px solid #2563eb',
        overflow: 'hidden',
        animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        fontFamily: 'inherit'
      }}
    >
      {/* Top Banner Header */}
      <div
        style={{
          background: isSiteVisit
            ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)'
            : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          color: '#ffffff',
          padding: '10px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Bell size={13} color="#ffffff" />
          </div>
          <span style={{ fontSize: '0.82rem', fontWeight: '800', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            {isPast ? '⚠️ Task Due Now!' : '⏰ 30-Min Reminder'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: '800',
              backgroundColor: isPast ? '#fee2e2' : '#ffffff',
              color: isPast ? '#b91c1c' : '#1e3a8a',
              padding: '2px 8px',
              borderRadius: '12px'
            }}
          >
            {isPast ? `Overdue by ${Math.abs(minutes)}m` : `In ${minutes} mins`}
          </span>
          <button
            type="button"
            onClick={() => onDismiss(activeAlert.id)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.85)',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Dismiss Alert"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Alert Content Body */}
      <div style={{ padding: '14px 16px' }}>
        {/* Task Mode & Prospect Row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
              {getModeIcon()}
              <span style={{ fontSize: '0.76rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>
                {getModeLabel()}
              </span>
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>
              {activeAlert.leadName}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b' }}>
              {new Date(activeAlert.scheduledTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </span>
          </div>
        </div>

        {/* Contact & Unit Info */}
        <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 12px', border: '1px solid #e2e8f0', marginBottom: '12px', fontSize: '0.8rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ color: '#64748b' }}>Phone:</span>
            <span style={{ fontWeight: '700', color: '#0f172a' }}>📞 {activeAlert.leadPhone}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b' }}>Unit / Need:</span>
            <span style={{ fontWeight: '700', color: '#7c3aed' }}>{activeAlert.unit}</span>
          </div>
          {/* Handling Member Context */}
          <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #e2e8f0', color: '#0369a1', fontSize: '0.74rem', fontWeight: '700', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>👤 Handling Advisor: {activeAlert.handlingMemberName || activeAlert.assignedToName || 'Assigned Rep'}</span>
            {isSiteVisit && <span style={{ background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem' }}>Site Visit Tour</span>}
          </div>
          {activeAlert.notes && (
            <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #f1f5f9', color: '#475569', fontStyle: 'italic', fontSize: '0.74rem' }}>
              "{activeAlert.notes}"
            </div>
          )}
          {/* Cab Logistics if site visit */}
          {activeAlert.isCabProvided && activeAlert.cabDetails && (
            <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #bfdbfe', color: '#0369a1', fontSize: '0.74rem', fontWeight: '700' }}>
              🚗 Cab: {activeAlert.cabDetails.cabNumber || 'Confirmed'} • Driver: {activeAlert.cabDetails.driverName || 'Assigned'}
            </div>
          )}
        </div>

        {/* Action Buttons Row */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {/* For Site Visits: Prominent Client Reminder dispatch by Handling Member */}
          {isSiteVisit && (
            <a
              href={activeAlert.clientWhatsAppUrl || `https://wa.me/${activeAlert.leadPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                background: '#25D366',
                color: '#ffffff',
                textDecoration: 'none',
                fontSize: '0.78rem',
                fontWeight: '800',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 2px 5px rgba(37,211,102,0.3)',
                marginBottom: '2px'
              }}
              title={`Send 30-min property tour reminder directly to client as ${activeAlert.handlingMemberName || 'Property Advisor'}`}
            >
              <MessageSquare size={14} />
              <span>📲 Send Client 30-Min Reminder (WhatsApp)</span>
            </a>
          )}

          {/* Regular WhatsApp Action if not site visit */}
          {!isSiteVisit && (
            <a
              href={activeAlert.whatsAppClickUrl || `https://wa.me/${activeAlert.leadPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1,
                padding: '7px 10px',
                borderRadius: '7px',
                background: '#25D366',
                color: '#ffffff',
                textDecoration: 'none',
                fontSize: '0.76rem',
                fontWeight: '800',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                boxShadow: '0 1px 3px rgba(37,211,102,0.3)'
              }}
              title="Send pre-filled WhatsApp follow-up reminder"
            >
              <MessageSquare size={13} />
              <span>WhatsApp</span>
            </a>
          )}

          {/* Call Action */}
          <a
            href={`tel:${activeAlert.leadPhone}`}
            style={{
              flex: 1,
              padding: '7px 10px',
              borderRadius: '7px',
              background: '#2563eb',
              color: '#ffffff',
              textDecoration: 'none',
              fontSize: '0.76rem',
              fontWeight: '800',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              boxShadow: '0 1px 3px rgba(37,99,235,0.3)'
            }}
          >
            <Phone size={13} />
            <span>Call Now</span>
          </a>

          {/* Snooze 5 Min */}
          <button
            type="button"
            onClick={() => onSnooze(activeAlert, 5)}
            style={{
              padding: '7px 10px',
              borderRadius: '7px',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              color: '#475569',
              fontSize: '0.74rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px'
            }}
            title="Snooze reminder for 5 minutes"
          >
            <Clock size={12} />
            <span>+5m</span>
          </button>

          {/* View in CRM Workspace */}
          <button
            type="button"
            onClick={() => {
              onDismiss(activeAlert.id);
              if (onOpenWorkspace) {
                onOpenWorkspace(activeAlert);
              } else {
                navigate(`/crm?search=${encodeURIComponent(activeAlert.leadPhone || activeAlert.leadName)}`);
              }
            }}
            style={{
              padding: '7px 10px',
              borderRadius: '7px',
              background: '#ede9fe',
              border: '1px solid #c4b5fd',
              color: '#6d28d9',
              fontSize: '0.74rem',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px'
            }}
            title="Open Lead Workspace"
          >
            <span>Open</span>
            <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InAppReminderBanner;
