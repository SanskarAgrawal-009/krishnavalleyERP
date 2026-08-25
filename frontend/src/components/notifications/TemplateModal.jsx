import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Trash2,
  Check,
  MessageSquare,
  Smartphone,
  Mail,
  Bell,
  Code,
  Info,
  Sparkles
} from 'lucide-react';

const COMMON_VARIABLES = [
  { key: 'client_name', label: 'Client Name', sample: 'Rajesh Sharma' },
  { key: 'project_name', label: 'Project Name', sample: 'Krishna Heights Luxury' },
  { key: 'unit_number', label: 'Unit / Flat #', sample: 'Tower A - 804' },
  { key: 'amount', label: 'Amount (₹)', sample: '75,000' },
  { key: 'due_date', label: 'Due Date', sample: '28 Aug 2026' },
  { key: 'payment_link', label: 'Payment Link', sample: 'https://krishnavalley.com/pay/xyz' },
  { key: 'milestone_name', label: 'Milestone Name', sample: '5th Floor Slab' },
  { key: 'penalty_amount', label: 'Penalty (₹)', sample: '2,500' },
  { key: 'rm_name', label: 'RM Name', sample: 'Amitabh Verma' },
  { key: 'contact_number', label: 'Contact Phone', sample: '+91 98765 00000' },
  { key: 'date', label: 'Date', sample: '25 Aug 2026' },
  { key: 'time', label: 'Time', sample: '11:00 AM' },
  { key: 'location_link', label: 'Maps Link', sample: 'https://maps.google.com/?q=KrishnaValley' },
  { key: 'ticket_id', label: 'Ticket #', sample: 'KV-SR-1092' },
  { key: 'status', label: 'Status', sample: 'Resolved' },
  { key: 'technician_name', label: 'Technician', sample: 'Suresh Kumar' },
  { key: 'download_link', label: 'Download Link', sample: 'https://krishnavalley.com/doc.pdf' },
  { key: 'month_year', label: 'Month/Year', sample: 'August 2026' },
  { key: 'net_salary', label: 'Net Salary', sample: '95,000' }
];

const CATEGORIES = [
  'Billing & Payments',
  'CRM & Leads',
  'Rentals & Leases',
  'Maintenance',
  'Sales & Allotments',
  'HR & Payroll',
  'General Announcement'
];

export const TemplateModal = ({ isOpen, onClose, onSubmit, template = null }) => {
  const [activeChannelTab, setActiveChannelTab] = useState('whatsapp'); // whatsapp | sms | email | push
  const [focusedField, setFocusedField] = useState(null);

  const [formData, setFormData] = useState({
    templateName: '',
    templateCode: '',
    category: 'Billing & Payments',
    description: '',
    isActive: true,
    channels: {
      whatsapp: true,
      sms: true,
      email: true,
      push: true
    },
    whatsappContent: {
      templateName: '',
      language: 'en_US',
      headerText: '',
      bodyText: '',
      footerText: 'Krishna Valley Real Estate ERP',
      buttonText: 'View Details',
      buttonUrl: ''
    },
    smsContent: {
      bodyText: '',
      dltTemplateId: ''
    },
    emailContent: {
      subject: '',
      preheader: '',
      bodyHtml: ''
    },
    pushContent: {
      title: '',
      bodyText: '',
      actionUrl: '',
      icon: '/favicon.ico'
    }
  });

  useEffect(() => {
    if (template) {
      setFormData({
        templateName: template.templateName || '',
        templateCode: template.templateCode || '',
        category: template.category || 'Billing & Payments',
        description: template.description || '',
        isActive: template.isActive !== undefined ? template.isActive : true,
        channels: {
          whatsapp: template.channels?.whatsapp ?? true,
          sms: template.channels?.sms ?? true,
          email: template.channels?.email ?? true,
          push: template.channels?.push ?? true
        },
        whatsappContent: {
          templateName: template.whatsappContent?.templateName || '',
          language: template.whatsappContent?.language || 'en_US',
          headerText: template.whatsappContent?.headerText || '',
          bodyText: template.whatsappContent?.bodyText || '',
          footerText: template.whatsappContent?.footerText || 'Krishna Valley Real Estate ERP',
          buttonText: template.whatsappContent?.buttonText || 'View Details',
          buttonUrl: template.whatsappContent?.buttonUrl || ''
        },
        smsContent: {
          bodyText: template.smsContent?.bodyText || '',
          dltTemplateId: template.smsContent?.dltTemplateId || ''
        },
        emailContent: {
          subject: template.emailContent?.subject || '',
          preheader: template.emailContent?.preheader || '',
          bodyHtml: template.emailContent?.bodyHtml || ''
        },
        pushContent: {
          title: template.pushContent?.title || '',
          bodyText: template.pushContent?.bodyText || '',
          actionUrl: template.pushContent?.actionUrl || '',
          icon: template.pushContent?.icon || '/favicon.ico'
        }
      });
    } else {
      setFormData({
        templateName: '',
        templateCode: '',
        category: 'Billing & Payments',
        description: '',
        isActive: true,
        channels: {
          whatsapp: true,
          sms: true,
          email: true,
          push: true
        },
        whatsappContent: {
          templateName: '',
          language: 'en_US',
          headerText: 'Krishna Valley • Notice',
          bodyText: 'Dear {{client_name}},\n\nYour update for {{project_name}} (Unit {{unit_number}}) is ready.',
          footerText: 'Krishna Valley Real Estate ERP',
          buttonText: 'View Details',
          buttonUrl: '{{payment_link}}'
        },
        smsContent: {
          bodyText: 'KV-ERP: Dear {{client_name}}, your update for Unit {{unit_number}} is available.',
          dltTemplateId: '1407161500000000000'
        },
        emailContent: {
          subject: 'Update regarding {{project_name}} - Unit {{unit_number}}',
          preheader: 'Important communication from Krishna Valley',
          bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
  <h2 style="color: #0f766e;">Krishna Valley Real Estate</h2>
  <p>Dear <strong>{{client_name}}</strong>,</p>
  <p>Please find your notification details for <strong>{{project_name}} (Unit {{unit_number}})</strong>.</p>
</div>`
        },
        pushContent: {
          title: 'Notice for Unit {{unit_number}}',
          bodyText: 'You have a new update for {{project_name}}.',
          actionUrl: '/dashboard',
          icon: '/favicon.ico'
        }
      });
    }
  }, [template, isOpen]);

  if (!isOpen) return null;

  const handleInsertVariable = (varName) => {
    const placeholder = `{{${varName}}}`;

    if (activeChannelTab === 'whatsapp') {
      setFormData((prev) => ({
        ...prev,
        whatsappContent: {
          ...prev.whatsappContent,
          bodyText: (prev.whatsappContent.bodyText || '') + ' ' + placeholder
        }
      }));
    } else if (activeChannelTab === 'sms') {
      setFormData((prev) => ({
        ...prev,
        smsContent: {
          ...prev.smsContent,
          bodyText: (prev.smsContent.bodyText || '') + ' ' + placeholder
        }
      }));
    } else if (activeChannelTab === 'email') {
      setFormData((prev) => ({
        ...prev,
        emailContent: {
          ...prev.emailContent,
          bodyHtml: (prev.emailContent.bodyHtml || '') + ' ' + placeholder
        }
      }));
    } else if (activeChannelTab === 'push') {
      setFormData((prev) => ({
        ...prev,
        pushContent: {
          ...prev.pushContent,
          bodyText: (prev.pushContent.bodyText || '') + ' ' + placeholder
        }
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const smsLength = formData.smsContent.bodyText?.length || 0;
  const smsSegments = Math.ceil(smsLength / 160) || 1;

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
        maxWidth: '900px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8f9fa'
        }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="var(--primary-500)" />
              {template ? 'Edit Reminder & Notification Template' : 'Create New Multi-Channel Template'}
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#4b5563', margin: '4px 0 0 0' }}>
              Define automated notification copy with dynamic variable substitution for WhatsApp, SMS, Email, and Push.
            </p>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Top Meta Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#374151', marginBottom: '6px', fontWeight: '600' }}>
                Template Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Milestone Payment Due Notice"
                value={formData.templateName}
                onChange={(e) => setFormData({ ...formData, templateName: e.target.value })}
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

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#374151', marginBottom: '6px', fontWeight: '600' }}>
                System Template Code (Unique ID) *
              </label>
              <input
                type="text"
                required
                disabled={!!template}
                placeholder="e.g. PAYMENT_MILESTONE_DUE"
                value={formData.templateCode}
                onChange={(e) => setFormData({ ...formData, templateCode: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') })}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: template ? 'rgba(255,255,255,0.04)' : 'var(--bg-card)',
                  border: '1px solid #dadce0',
                  borderRadius: 'var(--radius-sm)',
                  color: template ? 'var(--text-muted)' : '#fff',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#374151', marginBottom: '6px', fontWeight: '600' }}>
                Category / Module
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: '#f8f9fa',
                  border: '1px solid #dadce0',
                  borderRadius: 'var(--radius-sm)',
                  color: '#111827',
                  fontSize: '0.85rem'
                }}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: '#374151', marginBottom: '6px', fontWeight: '600' }}>
              Description & Trigger Scenario
            </label>
            <input
              type="text"
              placeholder="When is this template triggered? (e.g. Automated 7 days before payment due date)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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

          {/* Channels Enabled Selector */}
          <div style={{
            background: '#f8f9fa',
            padding: '14px 18px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid #dadce0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#111827' }}>Enabled Dispatch Channels</div>
              <div style={{ fontSize: '0.72rem', color: '#4b5563' }}>Select which channels will receive this reminder</div>
            </div>

            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#111827', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.channels.whatsapp}
                  onChange={(e) => setFormData({
                    ...formData,
                    channels: { ...formData.channels, whatsapp: e.target.checked }
                  })}
                  style={{ accentColor: '#25d366' }}
                />
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#25d366', fontWeight: '600' }}>
                  <MessageSquare size={14} /> WhatsApp
                </span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#111827', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.channels.sms}
                  onChange={(e) => setFormData({
                    ...formData,
                    channels: { ...formData.channels, sms: e.target.checked }
                  })}
                  style={{ accentColor: '#3b82f6' }}
                />
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#60a5fa', fontWeight: '600' }}>
                  <Smartphone size={14} /> SMS
                </span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#111827', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.channels.email}
                  onChange={(e) => setFormData({
                    ...formData,
                    channels: { ...formData.channels, email: e.target.checked }
                  })}
                  style={{ accentColor: '#f59e0b' }}
                />
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fbbf24', fontWeight: '600' }}>
                  <Mail size={14} /> Email
                </span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#111827', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.channels.push}
                  onChange={(e) => setFormData({
                    ...formData,
                    channels: { ...formData.channels, push: e.target.checked }
                  })}
                  style={{ accentColor: '#ec4899' }}
                />
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f472b6', fontWeight: '600' }}>
                  <Bell size={14} /> Push
                </span>
              </label>
            </div>
          </div>

          {/* Dynamic Variables Toolbelt */}
          <div style={{
            background: 'rgba(20, 184, 166, 0.06)',
            border: '1px dashed var(--primary-600)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--primary-500)', fontWeight: '700', marginBottom: '8px' }}>
              <Code size={14} />
              Insert Dynamic Variable Placeholder (Click tag to append to current channel):
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {COMMON_VARIABLES.map((v) => (
                <button
                  type="button"
                  key={v.key}
                  onClick={() => handleInsertVariable(v.key)}
                  title={`Sample value: ${v.sample}`}
                  style={{
                    background: '#f8f9fa',
                    border: '1px solid #dadce0',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '0.74rem',
                    fontFamily: 'monospace',
                    color: '#111827',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary-500)';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    e.currentTarget.style.color = '#e2e8f0';
                  }}
                >
                  <Plus size={11} color="var(--primary-500)" />
                  {`{{${v.key}}}`}
                </button>
              ))}
            </div>
          </div>

          {/* Channel Editor Tabs */}
          <div>
            <div style={{
              display: 'flex',
              borderBottom: '1px solid var(--border-subtle)',
              marginBottom: '16px',
              gap: '6px'
            }}>
              <button
                type="button"
                onClick={() => setActiveChannelTab('whatsapp')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  border: 'none',
                  borderBottom: activeChannelTab === 'whatsapp' ? '2px solid #25d366' : '2px solid transparent',
                  background: activeChannelTab === 'whatsapp' ? 'rgba(37, 211, 102, 0.1)' : 'transparent',
                  color: activeChannelTab === 'whatsapp' ? '#25d366' : 'var(--text-secondary)',
                  fontWeight: '600',
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                <MessageSquare size={14} /> WhatsApp Template
              </button>

              <button
                type="button"
                onClick={() => setActiveChannelTab('sms')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  border: 'none',
                  borderBottom: activeChannelTab === 'sms' ? '2px solid #3b82f6' : '2px solid transparent',
                  background: activeChannelTab === 'sms' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  color: activeChannelTab === 'sms' ? '#60a5fa' : 'var(--text-secondary)',
                  fontWeight: '600',
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                <Smartphone size={14} /> SMS Template
              </button>

              <button
                type="button"
                onClick={() => setActiveChannelTab('email')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  border: 'none',
                  borderBottom: activeChannelTab === 'email' ? '2px solid #f59e0b' : '2px solid transparent',
                  background: activeChannelTab === 'email' ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                  color: activeChannelTab === 'email' ? '#fbbf24' : 'var(--text-secondary)',
                  fontWeight: '600',
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                <Mail size={14} /> Email Template
              </button>

              <button
                type="button"
                onClick={() => setActiveChannelTab('push')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  border: 'none',
                  borderBottom: activeChannelTab === 'push' ? '2px solid #ec4899' : '2px solid transparent',
                  background: activeChannelTab === 'push' ? 'rgba(236, 72, 153, 0.1)' : 'transparent',
                  color: activeChannelTab === 'push' ? '#f472b6' : 'var(--text-secondary)',
                  fontWeight: '600',
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                <Bell size={14} /> Push Notification
              </button>
            </div>

            {/* TAB 1: WHATSAPP CONTENT */}
            {activeChannelTab === 'whatsapp' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', color: '#374151', marginBottom: '4px' }}>
                      Meta Approved Template Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. kv_payment_milestone_v1"
                      value={formData.whatsappContent.templateName}
                      onChange={(e) => setFormData({
                        ...formData,
                        whatsappContent: { ...formData.whatsappContent, templateName: e.target.value }
                      })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: '#f8f9fa',
                        border: '1px solid #dadce0',
                        borderRadius: 'var(--radius-sm)',
                        color: '#111827',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', color: '#374151', marginBottom: '4px' }}>
                      Header Text (Bold title)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Krishna Valley • Milestone Due"
                      value={formData.whatsappContent.headerText}
                      onChange={(e) => setFormData({
                        ...formData,
                        whatsappContent: { ...formData.whatsappContent, headerText: e.target.value }
                      })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: '#f8f9fa',
                        border: '1px solid #dadce0',
                        borderRadius: 'var(--radius-sm)',
                        color: '#111827',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', color: '#374151', marginBottom: '4px' }}>
                    WhatsApp Message Body (Supports markdown: *bold*, _italic_) *
                  </label>
                  <textarea
                    rows={5}
                    value={formData.whatsappContent.bodyText}
                    onChange={(e) => setFormData({
                      ...formData,
                      whatsappContent: { ...formData.whatsappContent, bodyText: e.target.value }
                    })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: '#f8f9fa',
                      border: '1px solid #dadce0',
                      borderRadius: 'var(--radius-sm)',
                      color: '#111827',
                      fontSize: '0.84rem',
                      lineHeight: '1.5',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', color: '#374151', marginBottom: '4px' }}>
                      Action Button Text (Interactive CTA)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Pay Online Now"
                      value={formData.whatsappContent.buttonText}
                      onChange={(e) => setFormData({
                        ...formData,
                        whatsappContent: { ...formData.whatsappContent, buttonText: e.target.value }
                      })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: '#f8f9fa',
                        border: '1px solid #dadce0',
                        borderRadius: 'var(--radius-sm)',
                        color: '#111827',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', color: '#374151', marginBottom: '4px' }}>
                      Button Action URL / Link
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. {{payment_link}}"
                      value={formData.whatsappContent.buttonUrl}
                      onChange={(e) => setFormData({
                        ...formData,
                        whatsappContent: { ...formData.whatsappContent, buttonUrl: e.target.value }
                      })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: '#f8f9fa',
                        border: '1px solid #dadce0',
                        borderRadius: 'var(--radius-sm)',
                        color: '#111827',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SMS CONTENT */}
            {activeChannelTab === 'sms' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label style={{ fontSize: '0.76rem', color: '#374151' }}>
                      SMS Text Message Body *
                    </label>
                    <span style={{ fontSize: '0.72rem', color: smsLength > 160 ? '#f59e0b' : 'var(--text-muted)' }}>
                      {smsLength} characters ({smsSegments} SMS {smsSegments > 1 ? 'segments' : 'segment'})
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={formData.smsContent.bodyText}
                    onChange={(e) => setFormData({
                      ...formData,
                      smsContent: { ...formData.smsContent, bodyText: e.target.value }
                    })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: '#f8f9fa',
                      border: '1px solid #dadce0',
                      borderRadius: 'var(--radius-sm)',
                      color: '#111827',
                      fontSize: '0.84rem',
                      lineHeight: '1.5'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', color: '#374151', marginBottom: '4px' }}>
                    DLT Registered Template ID (India Telecom Regulatory Compliance)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1407161528990012345 (19-digit numerical DLT ID)"
                    value={formData.smsContent.dltTemplateId}
                    onChange={(e) => setFormData({
                      ...formData,
                      smsContent: { ...formData.smsContent, dltTemplateId: e.target.value }
                    })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: '#f8f9fa',
                      border: '1px solid #dadce0',
                      borderRadius: 'var(--radius-sm)',
                      color: '#111827',
                      fontSize: '0.82rem',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
              </div>
            )}

            {/* TAB 3: EMAIL CONTENT */}
            {activeChannelTab === 'email' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', color: '#374151', marginBottom: '4px' }}>
                      Email Subject Line *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Important Notice: Milestone Due for Unit {{unit_number}}"
                      value={formData.emailContent.subject}
                      onChange={(e) => setFormData({
                        ...formData,
                        emailContent: { ...formData.emailContent, subject: e.target.value }
                      })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: '#f8f9fa',
                        border: '1px solid #dadce0',
                        borderRadius: 'var(--radius-sm)',
                        color: '#111827',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', color: '#374151', marginBottom: '4px' }}>
                      Preheader Text (Inbox preview)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Due amount ₹{{amount}}"
                      value={formData.emailContent.preheader}
                      onChange={(e) => setFormData({
                        ...formData,
                        emailContent: { ...formData.emailContent, preheader: e.target.value }
                      })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: '#f8f9fa',
                        border: '1px solid #dadce0',
                        borderRadius: 'var(--radius-sm)',
                        color: '#111827',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', color: '#374151', marginBottom: '4px' }}>
                    Email Body HTML / Rich Text *
                  </label>
                  <textarea
                    rows={7}
                    value={formData.emailContent.bodyHtml}
                    onChange={(e) => setFormData({
                      ...formData,
                      emailContent: { ...formData.emailContent, bodyHtml: e.target.value }
                    })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: '#f8f9fa',
                      border: '1px solid #dadce0',
                      borderRadius: 'var(--radius-sm)',
                      color: '#111827',
                      fontSize: '0.82rem',
                      fontFamily: 'monospace',
                      lineHeight: '1.4'
                    }}
                  />
                </div>
              </div>
            )}

            {/* TAB 4: PUSH CONTENT */}
            {activeChannelTab === 'push' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', color: '#374151', marginBottom: '4px' }}>
                      Push Notification Title *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Payment Notice • Flat {{unit_number}}"
                      value={formData.pushContent.title}
                      onChange={(e) => setFormData({
                        ...formData,
                        pushContent: { ...formData.pushContent, title: e.target.value }
                      })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: '#f8f9fa',
                        border: '1px solid #dadce0',
                        borderRadius: 'var(--radius-sm)',
                        color: '#111827',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', color: '#374151', marginBottom: '4px' }}>
                      Target Route / Action URL
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. /sales or /crm"
                      value={formData.pushContent.actionUrl}
                      onChange={(e) => setFormData({
                        ...formData,
                        pushContent: { ...formData.pushContent, actionUrl: e.target.value }
                      })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: '#f8f9fa',
                        border: '1px solid #dadce0',
                        borderRadius: 'var(--radius-sm)',
                        color: '#111827',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', color: '#374151', marginBottom: '4px' }}>
                    Push Notification Body Text *
                  </label>
                  <textarea
                    rows={3}
                    value={formData.pushContent.bodyText}
                    onChange={(e) => setFormData({
                      ...formData,
                      pushContent: { ...formData.pushContent, bodyText: e.target.value }
                    })}
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
              </div>
            )}
          </div>

          {/* Active status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="isActiveCheck"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              style={{ accentColor: 'var(--primary-500)', width: '16px', height: '16px' }}
            />
            <label htmlFor="isActiveCheck" style={{ fontSize: '0.82rem', color: '#111827', cursor: 'pointer' }}>
              Activate this template for automated dispatch & manual workflows
            </label>
          </div>

          {/* Footer Actions */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '16px',
            marginTop: '8px'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 18px',
                background: 'transparent',
                border: '1px solid #dadce0',
                color: '#374151',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.84rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '9px 22px',
                background: 'linear-gradient(135deg, var(--primary-600), var(--primary-700))',
                border: 'none',
                color: '#111827',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.84rem',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-glow)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Check size={16} />
              {template ? 'Save Changes' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
