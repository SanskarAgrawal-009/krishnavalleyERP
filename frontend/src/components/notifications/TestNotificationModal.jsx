import React, { useState } from 'react';
import {
  X,
  Send,
  MessageSquare,
  Smartphone,
  Mail,
  Bell,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Zap
} from 'lucide-react';
import { notificationService } from '../../services/notificationService.js';

export const TestNotificationModal = ({ isOpen, onClose, initialChannel = 'whatsapp', onDispatched }) => {
  const [channel, setChannel] = useState(initialChannel);
  const [recipient, setRecipient] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleChannelSwitch = (ch) => {
    setChannel(ch);
    setResult(null);
    setError(null);
    if (ch === 'whatsapp') {
      setRecipient('+91 98765 43210');
      setCustomSubject('Krishna Valley ERP Notification');
      setCustomMessage('Namaste! This is a test notification from Krishna Valley ERP WhatsApp Gateway. All systems operational.');
    } else if (ch === 'sms') {
      setRecipient('+91 98765 43210');
      setCustomSubject('KVALEY');
      setCustomMessage('KV-ERP TEST: SMS gateway connection verified and operational.');
    } else if (ch === 'email') {
      setRecipient('admin@krishnavalley.com');
      setCustomSubject('Test Email: Krishna Valley ERP Gateway Status');
      setCustomMessage('This is a test email dispatched from your Krishna Valley ERP communication module to verify SMTP connectivity.');
    } else if (ch === 'push') {
      setRecipient('active_browser_session');
      setCustomSubject('Krishna Valley ERP Web Push');
      setCustomMessage('Browser push notifications are active and functioning correctly.');
    }
  };

  const handleSendTest = async (e) => {
    e.preventDefault();
    if (!recipient.trim()) {
      alert('Please enter a recipient (Phone, Email, or Token)');
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await notificationService.testChannel({
        channel,
        recipient,
        customSubject,
        customMessage
      });
      setResult(res);
      if (onDispatched) onDispatched();
    } catch (err) {
      setError(err.message || 'Failed to dispatch test notification.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: '#ffffff',
        border: '1px solid #dadce0',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: '560px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 22px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8f9fa'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={18} color="var(--primary-500)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#111827', margin: 0 }}>
              Live Channel Test Dispatcher
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#4b5563',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSendTest} style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          {/* Channel Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: '#374151', marginBottom: '6px', fontWeight: '600' }}>
              Select Delivery Channel
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleChannelSwitch('whatsapp')}
                style={{
                  padding: '8px 4px',
                  borderRadius: 'var(--radius-sm)',
                  border: channel === 'whatsapp' ? '1px solid #25d366' : '1px solid var(--border-subtle)',
                  background: channel === 'whatsapp' ? 'rgba(37, 211, 102, 0.15)' : 'var(--bg-card)',
                  color: channel === 'whatsapp' ? '#25d366' : 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <MessageSquare size={16} /> WhatsApp
              </button>

              <button
                type="button"
                onClick={() => handleChannelSwitch('sms')}
                style={{
                  padding: '8px 4px',
                  borderRadius: 'var(--radius-sm)',
                  border: channel === 'sms' ? '1px solid #3b82f6' : '1px solid var(--border-subtle)',
                  background: channel === 'sms' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-card)',
                  color: channel === 'sms' ? '#60a5fa' : 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Smartphone size={16} /> SMS
              </button>

              <button
                type="button"
                onClick={() => handleChannelSwitch('email')}
                style={{
                  padding: '8px 4px',
                  borderRadius: 'var(--radius-sm)',
                  border: channel === 'email' ? '1px solid #f59e0b' : '1px solid var(--border-subtle)',
                  background: channel === 'email' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-card)',
                  color: channel === 'email' ? '#fbbf24' : 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Mail size={16} /> Email
              </button>

              <button
                type="button"
                onClick={() => handleChannelSwitch('push')}
                style={{
                  padding: '8px 4px',
                  borderRadius: 'var(--radius-sm)',
                  border: channel === 'push' ? '1px solid #ec4899' : '1px solid var(--border-subtle)',
                  background: channel === 'push' ? 'rgba(236, 72, 153, 0.15)' : 'var(--bg-card)',
                  color: channel === 'push' ? '#f472b6' : 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Bell size={16} /> Push
              </button>
            </div>
          </div>

          {/* Recipient */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: '#374151', marginBottom: '6px', fontWeight: '600' }}>
              {channel === 'whatsapp' && 'Recipient WhatsApp Number (with country code)'}
              {channel === 'sms' && 'Recipient Mobile Number (10 digits / with country code)'}
              {channel === 'email' && 'Recipient Email Address'}
              {channel === 'push' && 'Recipient Device / Client Token'} *
            </label>
            <input
              type="text"
              required
              placeholder={
                channel === 'whatsapp' ? '+91 98765 43210' :
                channel === 'sms' ? '+91 98765 43210' :
                channel === 'email' ? 'client@example.com' : 'active_browser_client'
              }
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                background: '#f8f9fa',
                border: '1px solid #dadce0',
                borderRadius: 'var(--radius-sm)',
                color: '#111827',
                fontSize: '0.85rem'
              }}
            />
          </div>

          {/* Subject / Header */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: '#374151', marginBottom: '6px', fontWeight: '600' }}>
              {channel === 'email' ? 'Subject Line' : channel === 'whatsapp' ? 'Header / Title' : 'Title / Header Tag'}
            </label>
            <input
              type="text"
              placeholder="e.g. Krishna Valley ERP Alert"
              value={customSubject}
              onChange={(e) => setCustomSubject(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                background: '#f8f9fa',
                border: '1px solid #dadce0',
                borderRadius: 'var(--radius-sm)',
                color: '#111827',
                fontSize: '0.85rem'
              }}
            />
          </div>

          {/* Message Body */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: '#374151', marginBottom: '6px', fontWeight: '600' }}>
              Test Message Body
            </label>
            <textarea
              rows={3}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#f8f9fa',
                border: '1px solid #dadce0',
                borderRadius: 'var(--radius-sm)',
                color: '#111827',
                fontSize: '0.84rem'
              }}
            />
          </div>

          {/* Success / Error Feedback */}
          {result && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid #10b981',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: '700', fontSize: '0.82rem' }}>
                <CheckCircle size={16} />
                {result.message}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#111827', fontFamily: 'monospace' }}>
                Message ID: {result.data?.messageId || 'DELIVERED_OK'}
              </div>
            </div>
          )}

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid #ef4444',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#f87171',
              fontSize: '0.82rem'
            }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '14px',
            marginTop: '4px'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                border: '1px solid #dadce0',
                color: '#374151',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              Close
            </button>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '8px 20px',
                background: 'linear-gradient(135deg, var(--primary-600), var(--primary-700))',
                border: 'none',
                color: '#111827',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.82rem',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-glow)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {loading ? (
                <>
                  <RefreshCw size={14} className="spin" /> Sending...
                </>
              ) : (
                <>
                  <Send size={14} /> Dispatch Test Notification
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
