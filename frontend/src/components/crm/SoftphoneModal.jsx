import React, { useState, useEffect, useRef } from 'react';
import { callingService } from '../../services/callingService.js';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  PhoneForwarded,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Building,
  Calendar,
  X,
  FileText,
  Radio,
  Mic,
  MicOff,
  Volume2,
  RefreshCw,
  Sparkles,
  Check
} from 'lucide-react';

export const SoftphoneModal = ({
  isOpen,
  onClose,
  lead = null,
  leadId = null,
  clientPhone = null,
  clientName = null,
  customer = null,
  autoStart = true,
  onCallLogged = null
}) => {
  const [callState, setCallState] = useState('idle'); // 'idle' | 'calling' | 'in_call' | 'ended'
  const [callDuration, setCallDuration] = useState(0);
  const [activeCallId, setActiveCallId] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('browser_dialer');

  // Outcome & Notes
  const [outcome, setOutcome] = useState('interested_followup');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const timerRef = useRef(null);
  const hasAutoStartedRef = useRef(false);

  const finalLeadId = lead?._id || lead?.id || leadId || null;
  const recipientName = clientName || lead?.name || customer?.customerName || customer?.name || 'Lead Contact';
  const recipientPhone = clientPhone || lead?.mobileNo || customer?.phone || customer?.mobileNo || '';
  const recipientProject = lead?.requirement || lead?.assignedFlat?.projectId?.projectName || customer?.unitNumber || 'Krishna Heights Residency';

  const formatTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartCall = async () => {
    setCallState('calling');
    setFeedback(null);

    try {
      const res = await callingService.initiateCall({
        leadPhone: recipientPhone,
        clientName: recipientName,
        leadId: finalLeadId,
        customerId: customer?._id || customer?.id,
        notes: `Call started via Krishna Valley Softphone`
      });

      const callId = res.data?.callLogId || res.callLogId || res.data?._id;
      if (callId) {
        setActiveCallId(callId);
      }

      // Simulate connection progression for smooth UX
      setTimeout(() => {
        setCallState('in_call');
      }, 1500);
    } catch (err) {
      setCallState('idle');
      setFeedback({ type: 'error', message: err.message || 'Failed to initiate call.' });
    }
  };

  // Auto-start dialing and state reset on open
  useEffect(() => {
    if (isOpen) {
      setCallState('idle');
      setCallDuration(0);
      setActiveCallId(null);
      setIsMuted(false);
      setOutcome('interested_followup');
      setNotes('');
      setFeedback(null);
      hasAutoStartedRef.current = false;

      if (autoStart && recipientPhone) {
        hasAutoStartedRef.current = true;
        const timer = setTimeout(() => {
          handleStartCall();
        }, 300);
        return () => clearTimeout(timer);
      }
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, recipientPhone]);

  // Duration timer
  useEffect(() => {
    if (callState === 'in_call') {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  if (!isOpen) return null;

  // Auto-upload call log to database immediately on hang-up
  const handleEndCall = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const finalDuration = callDuration;
    setCallState('ended');
    setIsSubmitting(true);

    const autoStatus = finalDuration > 0 ? 'completed' : 'no_answer';
    const autoOutcome = outcome || (finalDuration > 0 ? 'general_discussion' : 'ringing_unanswered');
    const autoNotes = notes || (finalDuration > 0 ? `Call completed (${formatTimer(finalDuration)})` : 'Call ended without response');

    try {
      const res = await callingService.logCall({
        callLogId: activeCallId,
        leadId: finalLeadId,
        customerId: customer?._id || customer?.id,
        clientName: recipientName,
        clientPhone: recipientPhone,
        durationSeconds: finalDuration,
        outcome: autoOutcome,
        notes: autoNotes,
        callStatus: autoStatus
      });

      const savedId = res.data?._id || res.data?.callLogId || res.callLogId;
      if (savedId) {
        setActiveCallId(savedId);
      }

      setFeedback({
        type: 'success',
        message: `✓ Call record auto-uploaded to DB (${finalDuration}s). You can refine remarks below.`
      });

      if (onCallLogged) onCallLogged();
    } catch (err) {
      console.error('Auto-upload call log failed:', err);
      setFeedback({
        type: 'error',
        message: 'Could not auto-save call log: ' + (err.message || 'API error')
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalClose = () => {
    if (callState === 'in_call' || callState === 'calling') {
      handleEndCall();
    }
    onClose();
  };

  const handleSaveDisposition = async (e) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    try {
      await callingService.logCall({
        callLogId: activeCallId,
        leadId: finalLeadId,
        customerId: customer?._id || customer?.id,
        clientName: recipientName,
        clientPhone: recipientPhone,
        durationSeconds: callDuration,
        outcome,
        notes: notes || `Call completed (${formatTimer(callDuration)})`,
        callStatus: callDuration > 0 ? 'completed' : 'no_answer'
      });

      setFeedback({ type: 'success', message: '✓ Call outcome and notes updated in CRM ledger!' });
      if (onCallLogged) onCallLogged();

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update call log.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: '16px'
    }}>
      <div style={{
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '520px',
        maxHeight: '92vh',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <PhoneCall size={18} />
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: '800' }}>Krishna Valley Cloud Softphone</div>
              <div style={{ fontSize: '0.72rem', opacity: 0.85 }}>Live Calling API & CRM Telephony Bridge</div>
            </div>
          </div>
          <button
            onClick={handleModalClose}
            style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', opacity: 0.8 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Recipient Profile Card */}
        <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
                {recipientName}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', fontSize: '0.8rem', color: '#475569' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '700', color: '#0f766e' }}>
                  <Phone size={12} /> {recipientPhone}
                </span>
                <span>•</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Building size={12} /> {recipientProject}
                </span>
              </div>
            </div>
            <a
              href={`tel:${recipientPhone.replace(/[^0-9+]/g, '')}`}
              title="Launch Device Dialer (Sim Direct)"
              style={{
                fontSize: '0.72rem',
                padding: '4px 10px',
                borderRadius: '6px',
                background: '#e2e8f0',
                color: '#334155',
                textDecoration: 'none',
                fontWeight: '600'
              }}
            >
              Native Call
            </a>
          </div>
        </div>

        {/* Softphone Dynamic Display & Status Screen */}
        <div style={{
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: callState === 'in_call' ? '#f0fdfa' : (callState === 'calling' ? '#fefce8' : '#ffffff'),
          borderBottom: '1px solid #e2e8f0',
          transition: 'all 0.2s ease'
        }}>
          {callState === 'idle' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                background: '#ecfdf5',
                border: '2px solid #10b981',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px'
              }}>
                <Phone size={30} />
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#1e293b' }}>Ready to Connect</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                Click below to initiate an outbound call bridge via Telephony API.
              </div>

              {/* Provider Selection Pill */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
                {[
                  { id: 'browser_dialer', label: 'Cloud Softphone' },
                  { id: 'twilio', label: 'Twilio Voice' },
                  { id: 'exotel', label: 'Exotel Telephony' }
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedProvider(p.id)}
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.72rem',
                      borderRadius: '12px',
                      border: selectedProvider === p.id ? '1px solid #0d9488' : '1px solid #cbd5e1',
                      background: selectedProvider === p.id ? '#ccfbf1' : '#f8fafc',
                      color: selectedProvider === p.id ? '#0f766e' : '#64748b',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {callState === 'calling' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                background: '#fef9c3',
                border: '2px dashed #ca8a04',
                color: '#ca8a04',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px'
              }}>
                <RefreshCw size={28} className="spin" />
              </div>
              <div style={{ fontSize: '1rem', fontWeight: '800', color: '#854d0e' }}>
                Connecting &amp; Ringing...
              </div>
              <div style={{ fontSize: '0.75rem', color: '#a16207', marginTop: '4px' }}>
                Bridging call to {recipientPhone}...
              </div>
            </div>
          )}

          {callState === 'in_call' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '2rem',
                fontWeight: '900',
                color: '#0f766e',
                fontFamily: 'monospace',
                letterSpacing: '1px'
              }}>
                {formatTimer(callDuration)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '6px', fontSize: '0.78rem', color: '#059669', fontWeight: '700' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                CALL IN PROGRESS • HD AUDIO
              </div>

              {/* Call Controls */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    border: '1px solid #cbd5e1',
                    background: isMuted ? '#fee2e2' : '#ffffff',
                    color: isMuted ? '#dc2626' : '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                >
                  {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                </button>

                <button
                  type="button"
                  onClick={handleEndCall}
                  style={{
                    padding: '0 20px',
                    height: '42px',
                    borderRadius: '24px',
                    background: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: '700',
                    fontSize: '0.84rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
                  }}
                >
                  <PhoneOff size={18} /> End Call
                </button>
              </div>
            </div>
          )}

          {callState === 'ended' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#f1f5f9',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 8px'
              }}>
                <PhoneOff size={24} />
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#1e293b' }}>
                Call Ended • Duration: {formatTimer(callDuration)}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                Please record call disposition and client feedback below.
              </div>
            </div>
          )}

          {/* Quick Start Call Button for Idle */}
          {callState === 'idle' && (
            <button
              type="button"
              onClick={handleStartCall}
              style={{
                marginTop: '16px',
                padding: '10px 24px',
                borderRadius: '24px',
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                color: '#ffffff',
                border: 'none',
                fontWeight: '800',
                fontSize: '0.86rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)'
              }}
            >
              <Phone size={16} /> Place Call Now
            </button>
          )}
        </div>

        {/* CRM Disposition & Follow-Up Form */}
        <form onSubmit={handleSaveDisposition} style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              Call Disposition / Outcome *
            </label>
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                fontSize: '0.82rem',
                color: '#0f172a',
                fontWeight: '600'
              }}
            >
              <option value="interested_site_visit">🎉 Interested - Site Visit Scheduled</option>
              <option value="interested_followup">📞 Interested - Follow-up Call Requested</option>
              <option value="general_discussion">💬 General Inquiry / Discussion</option>
              <option value="ringing_unanswered">🔔 Ringing - No Answer</option>
              <option value="busy">⏳ Busy / Asked to Call Back Later</option>
              <option value="not_reachable">📵 Phone Switched Off / Out of Coverage</option>
              <option value="wrong_number">❌ Wrong / Invalid Number</option>
              <option value="not_interested">🚫 Not Interested / Budget Mismatch</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              Call Notes &amp; Client Feedback
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Discussed 3BHK flat layout, interested in Tower B 7th floor, site visit scheduled for Saturday 11am..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                fontSize: '0.82rem',
                color: '#0f172a',
                resize: 'none'
              }}
            />
          </div>

          {feedback && (
            <div style={{
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: feedback.type === 'success' ? '#ecfdf5' : '#fef2f2',
              color: feedback.type === 'success' ? '#059669' : '#dc2626',
              border: feedback.type === 'success' ? '1px solid #a7f3d0' : '1px solid #fecaca'
            }}>
              {feedback.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              {feedback.message}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
            <button
              type="button"
              onClick={handleModalClose}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: 'transparent',
                color: '#475569',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '8px 18px',
                borderRadius: '6px',
                border: 'none',
                background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
                color: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(15, 118, 110, 0.3)'
              }}
            >
              {isSubmitting ? <RefreshCw size={13} className="spin" /> : <Check size={14} />}
              Save to CRM Ledger
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SoftphoneModal;
