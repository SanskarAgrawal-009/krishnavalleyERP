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
  const isMeeting = activeAlert.isMeeting || activeAlert.type === 'meeting';
  const minutes = activeAlert.minutesRemaining;
  const isPast = minutes < 0;

  const getModeIcon = () => {
    if (isMeeting) return <Users size={16} color="#0d9488" />;
    switch (activeAlert.mode) {
      case 'site_visit': return <Car size={16} color="#1d4ed8" />;
      case 'call': return <Phone size={16} color="#2563eb" />;
      case 'whatsapp': return <MessageSquare size={16} color="#0f172a" />;
      case 'meeting': return <Users size={16} color="#0d9488" />;
      default: return <Calendar size={16} color="#0284c7" />;
    }
  };

  const getModeLabel = () => {
    if (isMeeting) return 'Scheduled Meeting';
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
        border: isMeeting ? '2px solid #0d9488' : '2px solid #2563eb',
        overflow: 'hidden',
        animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        fontFamily: 'inherit'
      }}
    >
      {/* Top Banner Header */}
      <div
        style={{
          background: isMeeting
            ? 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)'
            : isSiteVisit
            ? 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)'
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
            {isMeeting
              ? (isPast ? 'Meeting in Progress!' : 'Meeting Scheduled Alert')
              : (isPast ? 'Task Due Now!' : '30-Min Reminder')}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: '800',
              backgroundColor: isPast ? '#f1f5f9' : '#ffffff',
              color: isPast ? '#0f172a' : isMeeting ? '#0f766e' : '#1e3a8a',
              padding: '2px 8px',
              borderRadius: '12px'
            }}
          >
            {isPast ? `Started ${Math.abs(minutes)}m ago` : `In ${minutes} mins`}
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
              <span style={{ fontSize: '0.76rem', fontWeight: '800', color: isMeeting ? '#0f766e' : '#475569', textTransform: 'uppercase' }}>
                {getModeLabel()}
              </span>
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>
              {activeAlert.leadName}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#0f766e' }}>
              {activeAlert.startTime || (activeAlert.scheduledTime ? new Date(activeAlert.scheduledTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '')}
            </span>
          </div>
        </div>

        {/* Contact & Unit / Venue Info */}
        <div style={{ background: isMeeting ? '#f0fdfa' : '#f8fafc', borderRadius: '8px', padding: '10px 12px', border: isMeeting ? '1px solid #ccfbf1' : '1px solid #e2e8f0', marginBottom: '12px', fontSize: '0.8rem' }}>
          {isMeeting ? (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '4px' }}>
                <MapPin size={14} color="#0d9488" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Venue: </span>
                  <span style={{ fontWeight: '700', color: '#0f172a' }}>{activeAlert.venue || activeAlert.unit || 'Site Operations Room'}</span>
                </div>
              </div>
              <div style={{ marginTop: '4px', color: '#64748b', fontSize: '0.75rem' }}>
                {activeAlert.notes}
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ color: '#64748b' }}>Phone:</span>
                <span style={{ fontWeight: '700', color: '#0f172a' }}>{activeAlert.leadPhone}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>Unit / Need:</span>
                <span style={{ fontWeight: '700', color: '#1e40af' }}>{activeAlert.unit}</span>
              </div>
              {/* Handling Member Context */}
              <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #e2e8f0', color: '#0369a1', fontSize: '0.74rem', fontWeight: '700', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Handling Advisor: {activeAlert.handlingMemberName || activeAlert.assignedToName || 'Assigned Rep'}</span>
                {isSiteVisit && <span style={{ background: '#eff6ff', color: '#1e40af', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', border: '1px solid #bfdbfe' }}>Site Visit Tour</span>}
              </div>
              {activeAlert.notes && (
                <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #f1f5f9', color: '#475569', fontStyle: 'italic', fontSize: '0.74rem' }}>
                  "{activeAlert.notes}"
                </div>
              )}
              {/* Cab Logistics if site visit */}
              {activeAlert.isCabProvided && activeAlert.cabDetails && (
                <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #bfdbfe', color: '#0369a1', fontSize: '0.74rem', fontWeight: '700' }}>
                  Cab: {activeAlert.cabDetails.cabNumber || 'Confirmed'} • Driver: {activeAlert.cabDetails.driverName || 'Assigned'}
                </div>
              )}
            </>
          )}
        </div>

        {/* Action Buttons Row */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {/* For Meetings: Dedicated Open MoM / Meeting CTA */}
          {isMeeting ? (
            <button
              type="button"
              onClick={() => {
                onDismiss(activeAlert.id);
                navigate('/taskforce?view=meetings');
              }}
              style={{
                flex: 2,
                padding: '8px 14px',
                borderRadius: '8px',
                background: '#0d9488',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.78rem',
                fontWeight: '800',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(13,148,136,0.35)',
              }}
              title="Open Taskforce Meeting and view Minutes of Meeting"
            >
              <Users size={14} />
              <span>Open Meeting & MoM</span>
              <ArrowRight size={13} />
            </button>
          ) : (
            <>
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
                    background: '#0f172a',
                    color: '#ffffff',
                    textDecoration: 'none',
                    fontSize: '0.78rem',
                    fontWeight: '800',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 5px rgba(15,23,42,0.3)',
                    marginBottom: '2px'
                  }}
                  title={`Send 30-min property tour reminder directly to client as ${activeAlert.handlingMemberName || 'Property Advisor'}`}
                >
                  <MessageSquare size={14} />
                  <span>Send Client 30-Min Reminder (WhatsApp)</span>
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
                    background: '#0f172a',
                    color: '#ffffff',
                    textDecoration: 'none',
                    fontSize: '0.76rem',
                    fontWeight: '800',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    boxShadow: '0 1px 3px rgba(15,23,42,0.3)'
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
            </>
          )}

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

          {!isMeeting && (
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
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#1d4ed8',
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
          )}
        </div>
      </div>
    </div>
  );
};

export default InAppReminderBanner;
