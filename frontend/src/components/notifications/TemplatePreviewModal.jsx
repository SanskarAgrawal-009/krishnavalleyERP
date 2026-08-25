import React, { useState } from 'react';
import {
  X,
  MessageSquare,
  Smartphone,
  Mail,
  Bell,
  CheckCheck,
  Phone,
  Video,
  MoreVertical,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Send
} from 'lucide-react';

const DUMMY_DATA = {
  client_name: 'Rajesh Sharma',
  project_name: 'Krishna Heights Luxury Residency',
  unit_number: 'Tower A - 804',
  amount: '75,000',
  due_date: '28 Aug 2026',
  payment_link: 'https://krishnavalley.com/pay/kv-804-m5',
  milestone_name: '5th Floor Slab Completion',
  penalty_amount: '2,500',
  rm_name: 'Amitabh Verma',
  contact_number: '+91 98765 00000',
  date: '25 Aug 2026',
  time: '11:00 AM',
  location_link: 'https://maps.google.com/?q=Krishna+Valley+Residences',
  driver_name: 'Suresh Kumar',
  driver_phone: '+91 99887 76655',
  ticket_id: 'KV-SR-1092',
  status: 'Resolved',
  technician_name: 'Rajesh Electrician',
  resolution_notes: 'Replaced electrical junction breaker.',
  allotment_date: '21 Aug 2026',
  download_link: 'https://krishnavalley.com/docs/allotment-804.pdf',
  month_year: 'August 2026',
  net_salary: '95,000',
  portal_link: 'https://krishnavalley.com/hr/portal'
};

export const TemplatePreviewModal = ({ isOpen, onClose, template }) => {
  const [activePreview, setActivePreview] = useState('whatsapp'); // whatsapp | sms | email | push
  const [useSampleData, setUseSampleData] = useState(true);

  if (!isOpen || !template) return null;

  const replaceVars = (text) => {
    if (!text) return '';
    if (!useSampleData) return text;
    return text.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (match, key) => {
      return DUMMY_DATA[key] !== undefined ? DUMMY_DATA[key] : match;
    });
  };

  const wpHeader = replaceVars(template.whatsappContent?.headerText);
  const wpBody = replaceVars(template.whatsappContent?.bodyText);
  const wpFooter = template.whatsappContent?.footerText || 'Krishna Valley Real Estate';
  const wpBtn = template.whatsappContent?.buttonText || 'View Details';
  const wpUrl = replaceVars(template.whatsappContent?.buttonUrl);

  const smsBody = replaceVars(template.smsContent?.bodyText);
  const smsDlt = template.smsContent?.dltTemplateId;

  const emailSub = replaceVars(template.emailContent?.subject);
  const emailPre = replaceVars(template.emailContent?.preheader);
  const emailHtml = replaceVars(template.emailContent?.bodyHtml);

  const pushTitle = replaceVars(template.pushContent?.title);
  const pushBody = replaceVars(template.pushContent?.bodyText);
  const pushUrl = replaceVars(template.pushContent?.actionUrl);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(5px)',
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
        maxWidth: '850px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8f9fa'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                background: 'rgba(20, 184, 166, 0.15)',
                color: 'var(--primary-500)',
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '0.72rem',
                fontWeight: '700'
              }}>
                {template.category}
              </span>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                Live Device Preview: {template.templateName}
              </h3>
            </div>
            <div style={{ fontSize: '0.74rem', color: '#4b5563', marginTop: '3px' }}>
              Code: <code style={{ color: '#111827' }}>{template.templateCode}</code>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#374151', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={useSampleData}
                onChange={(e) => setUseSampleData(e.target.checked)}
                style={{ accentColor: 'var(--primary-500)' }}
              />
              Inject Sample Client Data
            </label>

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
        </div>

        {/* Channel Navigation Switcher */}
        <div style={{
          display: 'flex',
          background: '#f8f9fa',
          padding: '8px 24px',
          gap: '8px',
          borderBottom: '1px solid var(--border-subtle)'
        }}>
          <button
            onClick={() => setActivePreview('whatsapp')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: 'var(--radius-sm)',
              background: activePreview === 'whatsapp' ? '#25d366' : 'transparent',
              color: activePreview === 'whatsapp' ? '#000' : 'var(--text-secondary)',
              fontWeight: '700',
              fontSize: '0.78rem',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <MessageSquare size={14} /> WhatsApp Mockup
          </button>

          <button
            onClick={() => setActivePreview('sms')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: 'var(--radius-sm)',
              background: activePreview === 'sms' ? '#3b82f6' : 'transparent',
              color: activePreview === 'sms' ? '#fff' : 'var(--text-secondary)',
              fontWeight: '700',
              fontSize: '0.78rem',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <Smartphone size={14} /> SMS Messenger
          </button>

          <button
            onClick={() => setActivePreview('email')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: 'var(--radius-sm)',
              background: activePreview === 'email' ? '#f59e0b' : 'transparent',
              color: activePreview === 'email' ? '#000' : 'var(--text-secondary)',
              fontWeight: '700',
              fontSize: '0.78rem',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <Mail size={14} /> Email Client
          </button>

          <button
            onClick={() => setActivePreview('push')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: 'var(--radius-sm)',
              background: activePreview === 'push' ? '#ec4899' : 'transparent',
              color: activePreview === 'push' ? '#fff' : 'var(--text-secondary)',
              fontWeight: '700',
              fontSize: '0.78rem',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <Bell size={14} /> Push Notification
          </button>
        </div>

        {/* Preview Viewport */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '28px',
          background: 'radial-gradient(circle at center, #1a2234 0%, #0b0f19 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          
          {/* ================= PREVIEW 1: WHATSAPP SMARTPHONE ================= */}
          {activePreview === 'whatsapp' && (
            <div style={{
              width: '100%',
              maxWidth: '380px',
              background: '#0b141a',
              borderRadius: '24px',
              border: '8px solid #1f2c34',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              minHeight: '480px'
            }}>
              {/* WhatsApp Header */}
              <div style={{
                background: '#202c33',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#e9edef'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #128c7e, #25d366)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '0.8rem',
                    color: '#111827'
                  }}>
                    KV
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Krishna Valley Official
                      <span style={{ background: '#25d366', color: '#000', borderRadius: '50%', width: '12px', height: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px' }}>✓</span>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#8696a0' }}>Official Business Account</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', color: '#aebac1' }}>
                  <Video size={16} />
                  <Phone size={16} />
                  <MoreVertical size={16} />
                </div>
              </div>

              {/* Chat Body */}
              <div style={{
                flex: 1,
                padding: '16px 12px',
                backgroundImage: 'radial-gradient(#1f2c34 1px, transparent 1px)',
                backgroundSize: '16px 16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                gap: '8px'
              }}>
                {/* Official Message Bubble */}
                <div style={{
                  background: '#005c4b',
                  color: '#e9edef',
                  borderRadius: '12px',
                  borderTopLeftRadius: '2px',
                  padding: '12px',
                  maxWidth: '92%',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.3)'
                }}>
                  {wpHeader && (
                    <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#25d366', marginBottom: '6px' }}>
                      {wpHeader}
                    </div>
                  )}

                  <div style={{ fontSize: '0.82rem', lineHeight: '1.45', whiteSpace: 'pre-line' }}>
                    {wpBody}
                  </div>

                  {wpFooter && (
                    <div style={{ fontSize: '0.68rem', color: '#8696a0', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '4px' }}>
                      {wpFooter}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px', marginTop: '4px', fontSize: '0.64rem', color: '#8696a0' }}>
                    11:32 AM <CheckCheck size={13} color="#53bdeb" />
                  </div>
                </div>

                {/* WhatsApp Interactive Button */}
                {wpBtn && (
                  <div style={{
                    background: '#202c33',
                    borderRadius: '8px',
                    padding: '10px',
                    textAlign: 'center',
                    color: '#53bdeb',
                    fontSize: '0.82rem',
                    fontWeight: '600',
                    maxWidth: '92%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}>
                    <ExternalLink size={13} />
                    {wpBtn}
                  </div>
                )}
              </div>

              {/* Chat Input Bar */}
              <div style={{ background: '#202c33', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1, background: '#2a3942', borderRadius: '18px', padding: '6px 12px', fontSize: '0.76rem', color: '#8696a0' }}>
                  Message
                </div>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#00a884', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Send size={13} color="#fff" />
                </div>
              </div>
            </div>
          )}

          {/* ================= PREVIEW 2: SMS PHONE MESSENGER ================= */}
          {activePreview === 'sms' && (
            <div style={{
              width: '100%',
              maxWidth: '380px',
              background: '#121212',
              borderRadius: '24px',
              border: '8px solid #2d2d2d',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              minHeight: '460px'
            }}>
              {/* Header */}
              <div style={{
                background: '#1e1e1e',
                padding: '14px 16px',
                borderBottom: '1px solid #333',
                textAlign: 'center'
              }}>
                <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#111827' }}>
                  VK-KVALEY
                </div>
                <div style={{ fontSize: '0.68rem', color: '#4b5563' }}>
                  Registered DLT Header (Transactional)
                </div>
              </div>

              {/* SMS Body */}
              <div style={{
                flex: 1,
                padding: '20px 14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                gap: '12px'
              }}>
                <div style={{ textAlign: 'center', fontSize: '0.68rem', color: '#6b7280' }}>
                  Today, 11:32 AM
                </div>

                <div style={{
                  background: '#2563eb',
                  color: '#111827',
                  borderRadius: '16px',
                  borderBottomLeftRadius: '4px',
                  padding: '12px 14px',
                  fontSize: '0.82rem',
                  lineHeight: '1.45',
                  maxWidth: '88%',
                  alignSelf: 'flex-start',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>
                  {smsBody}
                </div>

                {smsDlt && (
                  <div style={{ fontSize: '0.65rem', color: '#6b7280', paddingLeft: '4px' }}>
                    DLT Principal Entity ID: <span style={{ color: '#4b5563' }}>{smsDlt}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= PREVIEW 3: EMAIL CLIENT INBOX ================= */}
          {activePreview === 'email' && (
            <div style={{
              width: '100%',
              maxWidth: '620px',
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
              overflow: 'hidden',
              color: '#1f2937'
            }}>
              {/* Email Client Top Bar */}
              <div style={{
                background: '#f3f4f6',
                padding: '12px 18px',
                borderBottom: '1px solid #e5e7eb'
              }}>
                <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
                  {emailSub}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#4b5563' }}>
                  <div>
                    <strong>From:</strong> Krishna Valley ERP &lt;no-reply@krishnavalley.com&gt;
                  </div>
                  <div>Today, 11:32 AM</div>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '3px' }}>
                  <strong>To:</strong> Rajesh Sharma &lt;rajesh.sharma@example.com&gt;
                </div>
                {emailPre && (
                  <div style={{ fontSize: '0.72rem', color: '#4b5563', marginTop: '4px', fontStyle: 'italic' }}>
                    Snippet: {emailPre}
                  </div>
                )}
              </div>

              {/* Rendered HTML Body */}
              <div style={{ padding: '24px', background: '#ffffff', minHeight: '260px' }}>
                <div dangerouslySetInnerHTML={{ __html: emailHtml }} />
              </div>
            </div>
          )}

          {/* ================= PREVIEW 4: PUSH NOTIFICATION BANNER ================= */}
          {activePreview === 'push' && (
            <div style={{
              width: '100%',
              maxWidth: '420px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              {/* Notification Banner */}
              <div style={{
                background: 'rgba(30, 41, 59, 0.95)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '16px',
                padding: '14px 16px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
                color: '#111827',
                display: 'flex',
                gap: '12px'
              }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, var(--primary-600), var(--accent-gold-500))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Bell size={20} color="#fff" />
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--primary-500)', fontWeight: '700', textTransform: 'uppercase' }}>
                      Krishna Valley ERP • Now
                    </span>
                    <span style={{ fontSize: '0.65rem', color: '#4b5563' }}>Chrome</span>
                  </div>

                  <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#111827', marginTop: '2px' }}>
                    {pushTitle}
                  </div>

                  <div style={{ fontSize: '0.78rem', color: '#374151', marginTop: '2px', lineHeight: '1.4' }}>
                    {pushBody}
                  </div>

                  {pushUrl && (
                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#38bdf8', fontWeight: '600' }}>
                      Action: Navigate to {pushUrl} <ChevronRight size={12} />
                    </div>
                  )}
                </div>
              </div>

              <div style={{ textAlign: 'center', fontSize: '0.74rem', color: '#4b5563' }}>
                Displays on Windows Action Center, Android lockscreen, and macOS notification tray.
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
