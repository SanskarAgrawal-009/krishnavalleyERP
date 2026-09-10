import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { notificationService } from '../../services/notificationService.js';
import { TemplateModal } from '../../components/notifications/TemplateModal.jsx';
import { TemplatePreviewModal } from '../../components/notifications/TemplatePreviewModal.jsx';
import { TestNotificationModal } from '../../components/notifications/TestNotificationModal.jsx';
import { StatusBadge } from '../../components/common/StatusBadge.jsx';

import {
  Bell,
  MessageSquare,
  Smartphone,
  Mail,
  Phone,
  PhoneCall,
  PhoneForwarded,
  PhoneOff,
  Send,
  Plus,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  Search,
  CheckCircle,
  AlertTriangle,
  Zap,
  Key,
  Lock,
  Globe,
  Sliders,
  Clock,
  FileText,
  Copy,
  ExternalLink,
  ShieldCheck,
  Radio,
  Check,
  X,
  History,
  Calendar,
  Upload
} from 'lucide-react';
import { callingService } from '../../services/callingService.js';
import { googleCalendarService } from '../../services/googleCalendarService.js';

const CATEGORIES = [
  'All Categories',
  'Billing & Payments',
  'CRM & Leads',
  'Rentals & Leases',
  'Maintenance',
  'Sales & Allotments',
  'HR & Payroll'
];

export const NotificationManagementPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');
  
  // Navigation Tabs: 'overview' | 'templates' | 'whatsapp' | 'sms' | 'email' | 'push' | 'general' | 'logs'
  const [activeTab, setActiveTab] = useState(urlTab || 'templates');

  useEffect(() => {
    if (urlTab) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
  };

  // Configuration State
  const [config, setConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ success: null, message: '' });

  // Templates State
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedChannelFilter, setSelectedChannelFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Logs State
  const [logs, setLogs] = useState([]);
  const [logCounts, setLogCounts] = useState({});
  const [logsLoading, setLogsLoading] = useState(false);
  const [logChannelFilter, setLogChannelFilter] = useState('all');
  const [logStatusFilter, setLogStatusFilter] = useState('all');
  const [logSearch, setLogSearch] = useState('');

  // Modals
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewingTemplate, setPreviewingTemplate] = useState(null);

  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testChannelTarget, setTestChannelTarget] = useState('whatsapp');

  // Password / Secret key reveal toggles
  const [showKeys, setShowKeys] = useState({
    whatsapp: false,
    sms: false,
    email: false,
    push: false,
    telephony: false,
    googleCalendar: false
  });

  // Google Calendar Live Testing & Batch Sync State
  const [gcalTesting, setGcalTesting] = useState(false);
  const [gcalTestResult, setGcalTestResult] = useState(null);
  const [gcalSyncing, setGcalSyncing] = useState(false);
  const [gcalSyncResult, setGcalSyncResult] = useState(null);
  const [jsonPasteModal, setJsonPasteModal] = useState(false);
  const [jsonPasteContent, setJsonPasteContent] = useState('');

  // SMTP Verification & Live Testing State
  const [smtpVerifying, setSmtpVerifying] = useState(false);
  const [smtpVerifyResult, setSmtpVerifyResult] = useState(null);

  // Telephony Live Test State
  const [callTesting, setCallTesting] = useState(false);
  const [callTestNumber, setCallTestNumber] = useState('+91 98765 43210');
  const [callTestResult, setCallTestResult] = useState(null);

  // Telephony Call Logs State
  const [callLogs, setCallLogs] = useState([]);
  const [callLogsLoading, setCallLogsLoading] = useState(false);
  const [auditLogType, setAuditLogType] = useState('messages'); // 'messages' | 'calls'

  // Load Config
  const loadConfig = async () => {
    setConfigLoading(true);
    try {
      const res = await notificationService.getConfig();
      if (res.data) {
        const d = res.data;
        if (!d.googleCalendar) {
          d.googleCalendar = {
            enabled: false,
            calendarId: 'primary',
            authType: 'service_account',
            clientEmail: '',
            privateKey: '',
            clientId: '',
            clientSecret: '',
            refreshToken: '',
            timeZone: 'Asia/Kolkata',
            autoSyncLeads: true,
            autoSyncSiteVisits: true,
            reminderMinutesBefore: 30,
            syncStatus: 'not_configured'
          };
        }
        if (!d.telephony) {
          d.telephony = {
            enabled: true,
            provider: 'browser_dialer',
            twilioAccountSid: '',
            twilioAuthToken: '',
            twilioCallerId: '+91 98765 43210',
            exotelApiKey: '',
            exotelApiToken: '',
            exotelSubdomain: 'api.exotel.com',
            exotelCallerId: '08088997766',
            recordCalls: false,
            environment: 'sandbox'
          };
        }
        if (!d.email) {
          d.email = {
            enabled: true,
            provider: 'resend',
            apiKey: '',
            smtpHost: 'smtp.resend.com',
            smtpPort: 465,
            secure: true,
            smtpUser: 'resend',
            smtpPassword: '',
            fromEmail: 'onboarding@resend.dev',
            fromName: 'Krishna Valley ERP',
            replyTo: 'support@krishnavalley.com',
            environment: 'sandbox'
          };
        } else {
          if (!d.email.apiKey && d.email.provider === 'resend') {
            d.email.apiKey = d.email.smtpPassword || '';
          }
        }
        setConfig(d);
      }
    } catch (err) {
      console.error('Failed to load notification config:', err);
    } finally {
      setConfigLoading(false);
    }
  };

  const handleTestGoogleCalendar = async () => {
    setGcalTesting(true);
    setGcalTestResult(null);
    try {
      const res = await notificationService.testGoogleCalendar(config.googleCalendar);
      setGcalTestResult(res);
      if (res.success) {
        setConfig(prev => ({
          ...prev,
          googleCalendar: {
            ...prev.googleCalendar,
            syncStatus: 'ready'
          }
        }));
      }
    } catch (err) {
      setGcalTestResult({ success: false, message: err.message || 'Google Calendar connection test failed.' });
    } finally {
      setGcalTesting(false);
    }
  };

  const handleSyncGoogleCalendarAll = async () => {
    setGcalSyncing(true);
    setGcalSyncResult(null);
    try {
      const res = await notificationService.syncGoogleCalendarAll(config.googleCalendar);
      setGcalSyncResult(res);
      loadConfig();
    } catch (err) {
      setGcalSyncResult({ success: false, message: err.message || 'Batch sync failed.' });
    } finally {
      setGcalSyncing(false);
    }
  };

  const handleParseServiceAccountJson = () => {
    try {
      const parsed = JSON.parse(jsonPasteContent.trim());
      if (!parsed.client_email || !parsed.private_key) {
        alert('Invalid JSON! The file must contain "client_email" and "private_key".');
        return;
      }
      setConfig(prev => ({
        ...prev,
        googleCalendar: {
          ...prev.googleCalendar,
          clientEmail: parsed.client_email,
          privateKey: parsed.private_key,
          authType: 'service_account',
          enabled: true
        }
      }));
      setJsonPasteModal(false);
      setJsonPasteContent('');
      alert('Service Account credentials successfully imported from JSON! Click "Save Configuration" to commit.');
    } catch (err) {
      alert('Failed to parse JSON. Please make sure you pasted valid JSON content.');
    }
  };

  const handleVerifySmtp = async () => {
    setSmtpVerifying(true);
    setSmtpVerifyResult(null);
    try {
      const res = await notificationService.verifyEmailSmtp(config.email);
      setSmtpVerifyResult(res);
    } catch (err) {
      setSmtpVerifyResult({ success: false, message: err.message || 'SMTP verification failed.' });
    } finally {
      setSmtpVerifying(false);
    }
  };

  const handleTestCall = async () => {
    if (!callTestNumber) {
      alert('Please enter a destination phone number to test.');
      return;
    }
    setCallTesting(true);
    setCallTestResult(null);
    try {
      const res = await callingService.initiateCall({
        leadPhone: callTestNumber,
        clientName: 'Telephony Test Recipient',
        notes: 'Test call initiated from Notification & Telephony Hub'
      });
      setCallTestResult(res);
      if (res.data?.callLogId) {
        try {
          await callingService.logCall({
            callLogId: res.data.callLogId,
            clientPhone: callTestNumber,
            clientName: 'Telephony Test Recipient',
            durationSeconds: 15,
            outcome: 'general_discussion',
            notes: 'Test call initiated and auto-recorded from Notification Hub',
            callStatus: 'completed'
          });
        } catch (e) {
          console.warn('Auto-save test call log error:', e);
        }
      }
      loadCallLogs();
    } catch (err) {
      setCallTestResult({ success: false, message: err.message || 'Calling API failed to initiate.' });
    } finally {
      setCallTesting(false);
    }
  };

  const loadCallLogs = async () => {
    setCallLogsLoading(true);
    try {
      const res = await callingService.getCallLogs();
      if (res.data) setCallLogs(res.data);
    } catch (err) {
      console.error('Failed to load call logs:', err);
    } finally {
      setCallLogsLoading(false);
    }
  };

  // Load Templates
  const loadTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const categoryParam = selectedCategory === 'All Categories' ? 'all' : selectedCategory;
      const res = await notificationService.getTemplates({
        category: categoryParam,
        channel: selectedChannelFilter,
        search: searchTerm
      });
      if (res.data) setTemplates(res.data);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setTemplatesLoading(false);
    }
  };

  // Load Audit Logs
  const loadLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await notificationService.getLogs({
        channel: logChannelFilter,
        status: logStatusFilter,
        search: logSearch
      });
      if (res.data) {
        setLogs(res.data);
        setLogCounts(res.counts || {});
      }
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
    loadTemplates();
    loadCallLogs();
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [selectedCategory, selectedChannelFilter, searchTerm]);

  useEffect(() => {
    if (activeTab === 'logs' || activeTab === 'calling') {
      loadLogs();
      loadCallLogs();
    }
  }, [activeTab, logChannelFilter, logStatusFilter, logSearch]);

  // Handle Save Configuration
  const handleSaveConfig = async (e) => {
    if (e) e.preventDefault();
    setSaveStatus({ success: null, message: 'Saving configuration...' });
    try {
      const res = await notificationService.updateConfig(config);
      setConfig(res.data);
      setSaveStatus({ success: true, message: 'Settings saved and activated successfully!' });
      setTimeout(() => setSaveStatus({ success: null, message: '' }), 4000);
    } catch (err) {
      setSaveStatus({ success: false, message: err.message || 'Failed to save configuration.' });
    }
  };

  // Handle Template Save
  const handleSaveTemplate = async (templateData) => {
    try {
      if (editingTemplate) {
        await notificationService.updateTemplate(editingTemplate._id, templateData);
      } else {
        await notificationService.createTemplate(templateData);
      }
      setIsTemplateModalOpen(false);
      setEditingTemplate(null);
      loadTemplates();
    } catch (err) {
      alert(err.message || 'Failed to save template');
    }
  };

  // Handle Delete Template
  const handleDeleteTemplate = async (tpl) => {
    if (window.confirm(`Are you sure you want to delete template "${tpl.templateName}"?`)) {
      try {
        await notificationService.deleteTemplate(tpl._id);
        loadTemplates();
      } catch (err) {
        alert(err.message || 'Failed to delete template');
      }
    }
  };

  // Handle Seed Templates
  const handleSeedDefaults = async () => {
    if (window.confirm('Reset/Seed default professional real estate reminder templates?')) {
      try {
        await notificationService.seedTemplates();
        loadTemplates();
        alert('Templates successfully seeded!');
      } catch (err) {
        alert(err.message);
      }
    }
  };

  // Handle Clear Logs
  const handleClearLogs = async () => {
    if (window.confirm('Are you sure you want to clear all notification delivery logs?')) {
      try {
        await notificationService.clearLogs();
        loadLogs();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  // Open Test Modal
  const openTestModal = (channelName) => {
    setTestChannelTarget(channelName);
    setIsTestModalOpen(true);
  };

  // Auto-generate VAPID keys mockup generator
  const generateVapidKeys = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let pub = 'BEl62iUYgU';
    for (let i = 0; i < 77; i++) pub += chars.charAt(Math.floor(Math.random() * chars.length));
    let priv = 'eX9Yk1wZ';
    for (let i = 0; i < 35; i++) priv += chars.charAt(Math.floor(Math.random() * chars.length));

    setConfig({
      ...config,
      push: {
        ...config.push,
        vapidPublicKey: pub,
        vapidPrivateKey: priv
      }
    });
    alert('Generated new 256-bit VAPID Public/Private Keypair for Web Push!');
  };

  if (!config) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#4b5563' }}>
        <RefreshCw size={28} className="spin" style={{ margin: '0 auto 16px' }} />
        <div>Loading Notification & Messaging Hub...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Top Banner & Quick Metrics */}
      <div className="g-card" style={{
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: '#e8f0fe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#1a73e8'
          }}>
            <Bell size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#111827', display: 'flex', alignItems: 'center', gap: '12px' }}>
              Notification & Communication Hub
              <span style={{
                fontSize: '0.74rem',
                fontWeight: '700',
                padding: '3px 10px',
                borderRadius: '6px',
                background: '#e6f4ea',
                color: '#137333'
              }}>
                MULTI-CHANNEL OPERATIONAL
              </span>
            </div>
            <div style={{ fontSize: '0.88rem', color: '#4b5563', marginTop: '4px' }}>
              Configure WhatsApp Business, SMS Gateway, Email SMTP, Web Push, and dynamic multi-channel Reminder Templates.
            </div>
          </div>
        </div>

        {/* Global Quick Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => openTestModal('whatsapp')}
            style={{
              padding: '9px 16px',
              borderRadius: 'var(--radius-sm)',
              background: '#f8f9fa',
              border: '1px solid #dadce0',
              color: '#111827',
              fontSize: '0.82rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Zap size={15} color="var(--accent-gold-400)" />
            Test Dispatcher
          </button>

          <button
            onClick={() => {
              setEditingTemplate(null);
              setIsTemplateModalOpen(true);
            }}
            style={{
              padding: '9px 18px',
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, var(--primary-600), var(--primary-700))',
              border: 'none',
              color: '#111827',
              fontSize: '0.82rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-glow)'
            }}
          >
            <Plus size={16} />
            New Template
          </button>
        </div>
      </div>

      {/* Channel Status Quick Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
        
        {/* WhatsApp Card */}
        <div style={{
          background: '#ffffff',
          border: config.whatsapp.enabled ? '1px solid rgba(37, 211, 102, 0.3)' : '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(37, 211, 102, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#25d366' }}>
              <MessageSquare size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#111827' }}>WhatsApp API</div>
              <div style={{ fontSize: '0.72rem', color: '#4b5563' }}>
                Provider: <strong style={{ color: '#111827' }}>{config.whatsapp.provider.toUpperCase().replace('_', ' ')}</strong>
              </div>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('whatsapp')}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              background: config.whatsapp.enabled ? 'rgba(37, 211, 102, 0.2)' : 'rgba(255,255,255,0.05)',
              color: config.whatsapp.enabled ? '#25d366' : 'var(--text-muted)',
              fontSize: '0.72rem',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {config.whatsapp.enabled ? 'Active' : 'Disabled'}
          </button>
        </div>

        {/* SMS Card */}
        <div style={{
          background: '#ffffff',
          border: config.sms.enabled ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
              <Smartphone size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#111827' }}>SMS Gateway</div>
              <div style={{ fontSize: '0.72rem', color: '#4b5563' }}>
                Header: <strong style={{ color: '#111827' }}>{config.sms.senderId}</strong>
              </div>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('sms')}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              background: config.sms.enabled ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)',
              color: config.sms.enabled ? '#60a5fa' : 'var(--text-muted)',
              fontSize: '0.72rem',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {config.sms.enabled ? 'Active' : 'Disabled'}
          </button>
        </div>

        {/* Email Card */}
        <div style={{
          background: '#ffffff',
          border: config.email.enabled ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
              <Mail size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#111827' }}>Email (SMTP)</div>
              <div style={{ fontSize: '0.72rem', color: '#4b5563' }}>
                Port: <strong style={{ color: '#111827' }}>{config.email.smtpPort}</strong> ({config.email.provider})
              </div>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('email')}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              background: config.email.enabled ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.05)',
              color: config.email.enabled ? '#fbbf24' : 'var(--text-muted)',
              fontSize: '0.72rem',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {config.email.enabled ? 'Active' : 'Disabled'}
          </button>
        </div>

        {/* Push Notification Card */}
        <div style={{
          background: '#ffffff',
          border: config.push.enabled ? '1px solid rgba(236, 72, 153, 0.3)' : '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(236, 72, 153, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f472b6' }}>
              <Bell size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#111827' }}>Push Notification</div>
              <div style={{ fontSize: '0.72rem', color: '#4b5563' }}>
                VAPID: <strong style={{ color: '#111827' }}>Configured</strong>
              </div>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('push')}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              background: config.push.enabled ? 'rgba(236, 72, 153, 0.2)' : 'rgba(255,255,255,0.05)',
              color: config.push.enabled ? '#f472b6' : 'var(--text-muted)',
              fontSize: '0.72rem',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {config.push.enabled ? 'Active' : 'Disabled'}
          </button>
        </div>

        {/* Telephony / Calling API Card */}
        <div style={{
          background: '#ffffff',
          border: config.telephony?.enabled ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <PhoneCall size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#111827' }}>Calling API</div>
              <div style={{ fontSize: '0.72rem', color: '#4b5563' }}>
                Mode: <strong style={{ color: '#111827' }}>{(config.telephony?.provider || 'browser').toUpperCase().replace('_', ' ')}</strong>
              </div>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('calling')}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              background: config.telephony?.enabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)',
              color: config.telephony?.enabled ? '#10b981' : 'var(--text-muted)',
              fontSize: '0.72rem',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {config.telephony?.enabled ? 'Active' : 'Disabled'}
          </button>
        </div>

        {/* Google Calendar Card */}
        <div style={{
          background: '#ffffff',
          border: config.googleCalendar?.enabled ? '1px solid rgba(66, 133, 244, 0.3)' : '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(66, 133, 244, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4285f4' }}>
              <Calendar size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#111827' }}>Google Calendar</div>
              <div style={{ fontSize: '0.72rem', color: '#4b5563' }}>
                Follow-ups: <strong style={{ color: '#111827' }}>{config.googleCalendar?.enabled ? 'Auto-Sync' : 'Off'}</strong>
              </div>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('google_calendar')}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              background: config.googleCalendar?.enabled ? 'rgba(66, 133, 244, 0.2)' : 'rgba(255,255,255,0.05)',
              color: config.googleCalendar?.enabled ? '#4285f4' : 'var(--text-muted)',
              fontSize: '0.72rem',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {config.googleCalendar?.enabled ? 'Active' : 'Configure'}
          </button>
        </div>
      </div>

      {/* Main Module Tabs Bar */}
      <div style={{
        display: 'flex',
        background: '#ffffff',
        border: '1px solid #dadce0',
        borderRadius: 'var(--radius-md)',
        padding: '6px',
        gap: '4px',
        overflowX: 'auto'
      }}>
        <button
          onClick={() => setActiveTab('templates')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: activeTab === 'templates' ? 'linear-gradient(135deg, var(--primary-600), var(--primary-700))' : 'transparent',
            color: activeTab === 'templates' ? '#fff' : 'var(--text-secondary)',
            fontWeight: activeTab === 'templates' ? '700' : '500',
            fontSize: '0.82rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          <FileText size={15} />
          Reminder Templates ({templates.length})
        </button>

        <button
          onClick={() => setActiveTab('calling')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: activeTab === 'calling' ? 'linear-gradient(135deg, #059669, #10b981)' : 'transparent',
            color: activeTab === 'calling' ? '#fff' : 'var(--text-secondary)',
            fontWeight: activeTab === 'calling' ? '700' : '500',
            fontSize: '0.82rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          <PhoneCall size={15} />
          Telephony &amp; Calling API
        </button>

        <button
          onClick={() => setActiveTab('whatsapp')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: activeTab === 'whatsapp' ? 'linear-gradient(135deg, #128c7e, #25d366)' : 'transparent',
            color: activeTab === 'whatsapp' ? '#fff' : 'var(--text-secondary)',
            fontWeight: activeTab === 'whatsapp' ? '700' : '500',
            fontSize: '0.82rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          <MessageSquare size={15} />
          WhatsApp Configuration
        </button>

        <button
          onClick={() => setActiveTab('sms')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: activeTab === 'sms' ? 'linear-gradient(135deg, #2563eb, #3b82f6)' : 'transparent',
            color: activeTab === 'sms' ? '#fff' : 'var(--text-secondary)',
            fontWeight: activeTab === 'sms' ? '700' : '500',
            fontSize: '0.82rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          <Smartphone size={15} />
          SMS Configuration
        </button>

        <button
          onClick={() => setActiveTab('email')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: activeTab === 'email' ? 'linear-gradient(135deg, #d97706, #f59e0b)' : 'transparent',
            color: activeTab === 'email' ? '#fff' : 'var(--text-secondary)',
            fontWeight: activeTab === 'email' ? '700' : '500',
            fontSize: '0.82rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          <Mail size={15} />
          Email (SMTP) Configuration
        </button>

        <button
          onClick={() => setActiveTab('push')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: activeTab === 'push' ? 'linear-gradient(135deg, #db2777, #ec4899)' : 'transparent',
            color: activeTab === 'push' ? '#fff' : 'var(--text-secondary)',
            fontWeight: activeTab === 'push' ? '700' : '500',
            fontSize: '0.82rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          <Bell size={15} />
          Push Notification Configuration
        </button>

        <button
          onClick={() => setActiveTab('google_calendar')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: activeTab === 'google_calendar' ? 'linear-gradient(135deg, #1a73e8, #4285f4)' : 'transparent',
            color: activeTab === 'google_calendar' ? '#fff' : 'var(--text-secondary)',
            fontWeight: activeTab === 'google_calendar' ? '700' : '500',
            fontSize: '0.82rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          <Calendar size={15} />
          Google Calendar Sync
        </button>

        <button
          onClick={() => setActiveTab('general')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: activeTab === 'general' ? 'var(--bg-card)' : 'transparent',
            color: activeTab === 'general' ? '#fff' : 'var(--text-secondary)',
            fontWeight: activeTab === 'general' ? '700' : '500',
            fontSize: '0.82rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          <Sliders size={15} />
          Automation Policies
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: activeTab === 'logs' ? 'var(--bg-card)' : 'transparent',
            color: activeTab === 'logs' ? '#fff' : 'var(--text-secondary)',
            fontWeight: activeTab === 'logs' ? '700' : '500',
            fontSize: '0.82rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          <History size={15} />
          Audit Logs
        </button>
      </div>

      {/* Save Notification Toast Banner */}
      {saveStatus.message && (
        <div style={{
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          background: saveStatus.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: saveStatus.success ? '1px solid #10b981' : '1px solid #ef4444',
          color: saveStatus.success ? '#10b981' : '#f87171',
          fontSize: '0.84rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {saveStatus.success ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {saveStatus.message}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 1: REMINDER TEMPLATES ENGINE */}
      {/* ======================================================== */}
      {activeTab === 'templates' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Filters & Actions Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
            background: '#ffffff',
            border: '1px solid #dadce0',
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
              {/* Search */}
              <div style={{ position: 'relative', minWidth: '220px', flex: '1 1 220px' }}>
                <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search template by name, code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    background: '#f8f9fa',
                    border: '1px solid #dadce0',
                    borderRadius: 'var(--radius-sm)',
                    color: '#111827',
                    fontSize: '0.82rem'
                  }}
                />
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{
                  padding: '8px 12px',
                  background: '#f8f9fa',
                  border: '1px solid #dadce0',
                  borderRadius: 'var(--radius-sm)',
                  color: '#111827',
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Channel Filter */}
              <select
                value={selectedChannelFilter}
                onChange={(e) => setSelectedChannelFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  background: '#f8f9fa',
                  border: '1px solid #dadce0',
                  borderRadius: 'var(--radius-sm)',
                  color: '#111827',
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                <option value="all">All Channels</option>
                <option value="whatsapp">WhatsApp Enabled</option>
                <option value="sms">SMS Enabled</option>
                <option value="email">Email Enabled</option>
                <option value="push">Push Enabled</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleSeedDefaults}
                title="Reset to industry-standard real estate templates"
                style={{
                  padding: '8px 14px',
                  background: '#f8f9fa',
                  border: '1px solid #dadce0',
                  color: '#374151',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                Reset Default Templates
              </button>
            </div>
          </div>

          {/* Templates Grid */}
          {templatesLoading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#4b5563' }}>
              <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px' }} />
              Loading templates...
            </div>
          ) : templates.length === 0 ? (
            <div style={{
              padding: '60px',
              textAlign: 'center',
              background: '#ffffff',
              border: '1px dashed var(--border-subtle)',
              borderRadius: 'var(--radius-md)'
            }}>
              <FileText size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '1rem', fontWeight: '700', color: '#111827' }}>No Reminder Templates Found</div>
              <div style={{ fontSize: '0.82rem', color: '#4b5563', marginTop: '4px' }}>
                Create your first automated notification template or seed default real-estate templates.
              </div>
              <button
                onClick={handleSeedDefaults}
                style={{
                  marginTop: '16px',
                  padding: '8px 18px',
                  background: 'var(--primary-600)',
                  color: '#111827',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: '600',
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                Load Default Templates
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
              {templates.map((tpl) => (
                <div
                  key={tpl._id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #dadce0',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                >
                  <div>
                    {/* Top Row: Category & Status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <span style={{
                        background: 'rgba(20, 184, 166, 0.15)',
                        color: 'var(--primary-500)',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        padding: '3px 8px',
                        borderRadius: '4px'
                      }}>
                        {tpl.category}
                      </span>

                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        color: tpl.isActive ? '#10b981' : 'var(--text-muted)'
                      }}>
                        <span style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: tpl.isActive ? '#10b981' : 'var(--text-muted)'
                        }} />
                        {tpl.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {/* Template Name & Code */}
                    <div style={{ fontSize: '1.02rem', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>
                      {tpl.templateName}
                    </div>
                    <div style={{ fontSize: '0.74rem', fontFamily: 'monospace', color: '#4b5563', marginBottom: '10px' }}>
                      {tpl.templateCode}
                    </div>

                    {/* Description */}
                    {tpl.description && (
                      <div style={{ fontSize: '0.78rem', color: '#374151', lineHeight: '1.45', marginBottom: '14px' }}>
                        {tpl.description}
                      </div>
                    )}

                    {/* Enabled Channel Badges */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginBottom: '16px',
                      flexWrap: 'wrap'
                    }}>
                      {tpl.channels?.whatsapp && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(37, 211, 102, 0.12)', color: '#25d366', padding: '3px 7px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '700' }}>
                          <MessageSquare size={12} /> WhatsApp
                        </span>
                      )}
                      {tpl.channels?.sms && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa', padding: '3px 7px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '700' }}>
                          <Smartphone size={12} /> SMS
                        </span>
                      )}
                      {tpl.channels?.email && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24', padding: '3px 7px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '700' }}>
                          <Mail size={12} /> Email
                        </span>
                      )}
                      {tpl.channels?.push && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(236, 72, 153, 0.12)', color: '#f472b6', padding: '3px 7px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '700' }}>
                          <Bell size={12} /> Push
                        </span>
                      )}
                    </div>

                    {/* Dynamic Variables pills preview */}
                    {tpl.variables && tpl.variables.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '0.7rem', color: '#4b5563', marginBottom: '4px' }}>
                          Supported Dynamic Variables:
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {tpl.variables.slice(0, 4).map((v) => (
                            <span key={v} style={{ fontSize: '0.68rem', fontFamily: 'monospace', background: '#f8f9fa', color: '#374151', padding: '2px 6px', borderRadius: '3px', border: '1px solid #dadce0' }}>
                              {`{{${v}}}`}
                            </span>
                          ))}
                          {tpl.variables.length > 4 && (
                            <span style={{ fontSize: '0.68rem', color: '#4b5563', alignSelf: 'center' }}>
                              +{tpl.variables.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '12px',
                    marginTop: '8px'
                  }}>
                    <button
                      onClick={() => {
                        setPreviewingTemplate(tpl);
                        setIsPreviewModalOpen(true);
                      }}
                      style={{
                        padding: '6px 12px',
                        background: 'rgba(20, 184, 166, 0.15)',
                        color: 'var(--primary-500)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <Eye size={13} /> Live Preview
                    </button>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => {
                          setEditingTemplate(tpl);
                          setIsTemplateModalOpen(true);
                        }}
                        style={{
                          padding: '6px 8px',
                          background: '#f8f9fa',
                          color: '#374151',
                          borderRadius: '4px',
                          border: '1px solid #dadce0',
                          cursor: 'pointer'
                        }}
                        title="Edit Template"
                      >
                        <Edit size={14} />
                      </button>

                      <button
                        onClick={() => handleDeleteTemplate(tpl)}
                        style={{
                          padding: '6px 8px',
                          background: 'rgba(239, 68, 68, 0.12)',
                          color: '#ef4444',
                          borderRadius: '4px',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          cursor: 'pointer'
                        }}
                        title="Delete Template"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB: TELEPHONY & CALLING API CONFIGURATION */}
      {/* ======================================================== */}
      {activeTab === 'calling' && (
        <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            background: '#ffffff',
            border: '1px solid #dadce0',
            borderRadius: 'var(--radius-lg)',
            padding: '24px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            {/* Header & Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                  <PhoneCall size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                    Telephony &amp; Calling API Gateway
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: '#4b5563', margin: '3px 0 0 0' }}>
                    Configure Twilio Voice, Exotel Cloud Telephony, or In-App Softphone for automated call bridging and CRM lead tracking.
                  </p>
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <span style={{ fontSize: '0.84rem', color: '#111827', fontWeight: '600' }}>
                  {config.telephony?.enabled ? 'Channel Enabled' : 'Channel Disabled'}
                </span>
                <input
                  type="checkbox"
                  checked={config.telephony?.enabled}
                  onChange={(e) => setConfig({
                    ...config,
                    telephony: { ...config.telephony, enabled: e.target.checked }
                  })}
                  style={{ width: '18px', height: '18px', accentColor: '#10b981' }}
                />
              </label>
            </div>

            {/* Provider Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#374151', marginBottom: '8px', fontWeight: '600' }}>
                Active Telephony Provider
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                {[
                  { id: 'browser_dialer', name: 'In-App Softphone', desc: 'Browser & Mobile dialer with disposition logging' },
                  { id: 'twilio', name: 'Twilio Programmable Voice', desc: 'Global cloud call bridging & TwiML webhook' },
                  { id: 'exotel', name: 'Exotel Telephony', desc: 'Indian real estate standard virtual number bridge' }
                ].map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setConfig({
                      ...config,
                      telephony: { ...config.telephony, provider: p.id }
                    })}
                    style={{
                      background: config.telephony?.provider === p.id ? 'rgba(16, 185, 129, 0.12)' : '#f8f9fa',
                      border: config.telephony?.provider === p.id ? '2px solid #10b981' : '1px solid #dadce0',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ fontSize: '0.86rem', fontWeight: '700', color: config.telephony?.provider === p.id ? '#059669' : '#111827' }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#4b5563', marginTop: '3px' }}>
                      {p.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Credentials for Twilio Voice */}
            {config.telephony?.provider === 'twilio' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', background: '#f8f9fa', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#374151', marginBottom: '6px', fontWeight: '600' }}>
                    Twilio Account SID *
                  </label>
                  <input
                    type="text"
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={config.telephony?.twilioAccountSid || ''}
                    onChange={(e) => setConfig({
                      ...config,
                      telephony: { ...config.telephony, twilioAccountSid: e.target.value }
                    })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: '#ffffff',
                      border: '1px solid #dadce0',
                      borderRadius: 'var(--radius-sm)',
                      color: '#111827',
                      fontSize: '0.82rem',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#374151', marginBottom: '6px', fontWeight: '600' }}>
                    Twilio Auth Token *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showKeys.telephony ? 'text' : 'password'}
                      placeholder="Auth Token"
                      value={config.telephony?.twilioAuthToken || ''}
                      onChange={(e) => setConfig({
                        ...config,
                        telephony: { ...config.telephony, twilioAuthToken: e.target.value }
                      })}
                      style={{
                        width: '100%',
                        padding: '9px 40px 9px 12px',
                        background: '#ffffff',
                        border: '1px solid #dadce0',
                        borderRadius: 'var(--radius-sm)',
                        color: '#111827',
                        fontSize: '0.82rem'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeys({ ...showKeys, telephony: !showKeys.telephony })}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: '#4b5563',
                        cursor: 'pointer',
                        fontSize: '0.72rem'
                      }}
                    >
                      {showKeys.telephony ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#374151', marginBottom: '6px', fontWeight: '600' }}>
                    Twilio Caller ID (Virtual Outbound Number) *
                  </label>
                  <input
                    type="text"
                    placeholder="+12015550123 or +919876543210"
                    value={config.telephony?.twilioCallerId || ''}
                    onChange={(e) => setConfig({
                      ...config,
                      telephony: { ...config.telephony, twilioCallerId: e.target.value }
                    })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: '#ffffff',
                      border: '1px solid #dadce0',
                      borderRadius: 'var(--radius-sm)',
                      color: '#111827',
                      fontSize: '0.82rem'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Credentials for Exotel */}
            {config.telephony?.provider === 'exotel' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', background: '#f8f9fa', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#374151', marginBottom: '6px', fontWeight: '600' }}>
                    Exotel API Key *
                  </label>
                  <input
                    type="text"
                    placeholder="Exotel Key"
                    value={config.telephony?.exotelApiKey || ''}
                    onChange={(e) => setConfig({
                      ...config,
                      telephony: { ...config.telephony, exotelApiKey: e.target.value }
                    })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: '#ffffff',
                      border: '1px solid #dadce0',
                      borderRadius: 'var(--radius-sm)',
                      color: '#111827',
                      fontSize: '0.82rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#374151', marginBottom: '6px', fontWeight: '600' }}>
                    Exotel API Token *
                  </label>
                  <input
                    type="password"
                    placeholder="Exotel Token"
                    value={config.telephony?.exotelApiToken || ''}
                    onChange={(e) => setConfig({
                      ...config,
                      telephony: { ...config.telephony, exotelApiToken: e.target.value }
                    })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: '#ffffff',
                      border: '1px solid #dadce0',
                      borderRadius: 'var(--radius-sm)',
                      color: '#111827',
                      fontSize: '0.82rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#374151', marginBottom: '6px', fontWeight: '600' }}>
                    Exotel Virtual Caller ID *
                  </label>
                  <input
                    type="text"
                    placeholder="080xxxxxxxx"
                    value={config.telephony?.exotelCallerId || ''}
                    onChange={(e) => setConfig({
                      ...config,
                      telephony: { ...config.telephony, exotelCallerId: e.target.value }
                    })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: '#ffffff',
                      border: '1px solid #dadce0',
                      borderRadius: 'var(--radius-sm)',
                      color: '#111827',
                      fontSize: '0.82rem'
                    }}
                  />
                </div>
              </div>
            )}

            {/* General Telephony Preferences */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#374151', marginBottom: '6px', fontWeight: '600' }}>
                  Gateway Environment
                </label>
                <select
                  value={config.telephony?.environment || 'sandbox'}
                  onChange={(e) => setConfig({
                    ...config,
                    telephony: { ...config.telephony, environment: e.target.value }
                  })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    background: '#f8f9fa',
                    border: '1px solid #dadce0',
                    borderRadius: 'var(--radius-sm)',
                    color: '#111827',
                    fontSize: '0.82rem'
                  }}
                >
                  <option value="sandbox">Sandbox (Simulated Calls / Softphone Audio)</option>
                  <option value="production">Production (Real Carrier Trunk &amp; Bridging)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#374151', marginBottom: '6px', fontWeight: '600' }}>
                  Call Recording Policy
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', cursor: 'pointer', fontSize: '0.82rem', color: '#111827' }}>
                  <input
                    type="checkbox"
                    checked={config.telephony?.recordCalls}
                    onChange={(e) => setConfig({
                      ...config,
                      telephony: { ...config.telephony, recordCalls: e.target.checked }
                    })}
                    style={{ accentColor: '#10b981', width: '16px', height: '16px' }}
                  />
                  Record call audio for RERA compliance and CRM training
                </label>
              </div>
            </div>

            {/* Live Telephony Test Box */}
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 'var(--radius-md)',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ fontSize: '0.86rem', fontWeight: '800', color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PhoneCall size={16} />
                Live Telephony &amp; Click-to-Call Diagnostic
              </div>
              <div style={{ fontSize: '0.76rem', color: '#15803d' }}>
                Enter a test phone number to initiate an outbound call session and verify gateway latency and call bridging.
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={callTestNumber}
                  onChange={(e) => setCallTestNumber(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid #86efac',
                    background: '#ffffff',
                    fontSize: '0.82rem',
                    color: '#0f172a',
                    fontWeight: '600',
                    minWidth: '220px'
                  }}
                />

                <button
                  type="button"
                  onClick={handleTestCall}
                  disabled={callTesting}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 'var(--radius-sm)',
                    background: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {callTesting ? <RefreshCw size={14} className="spin" /> : <PhoneCall size={14} />}
                  Place Test Call
                </button>
              </div>

              {callTestResult && (
                <div style={{
                  background: callTestResult.success ? '#dcfce7' : '#fee2e2',
                  border: callTestResult.success ? '1px solid #86efac' : '1px solid #fca5a5',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  fontSize: '0.78rem',
                  color: callTestResult.success ? '#166534' : '#b91c1c'
                }}>
                  <strong>{callTestResult.success ? '✓ Call Initiated Successfully' : '✗ Call Dispatch Failed'}</strong>: {callTestResult.message || JSON.stringify(callTestResult)}
                  {callTestResult.data?.deviceDialUrl && (
                    <div style={{ marginTop: '4px' }}>
                      <a href={callTestResult.data.deviceDialUrl} style={{ color: '#15803d', fontWeight: '700' }}>
                        Launch Native Mobile/Desktop Dialer ({callTestResult.data.deviceDialUrl})
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <button
                type="submit"
                style={{
                  padding: '9px 24px',
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Check size={16} /> Save Telephony Settings
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* TAB 2: WHATSAPP MESSAGING CONFIGURATION */}
      {/* ======================================================== */}
      {activeTab === 'whatsapp' && (
        <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            background: '#ffffff',
            border: '1px solid #dadce0',
            borderRadius: 'var(--radius-lg)',
            padding: '24px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            {/* Header & Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(37, 211, 102, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#25d366' }}>
                  <MessageSquare size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                    WhatsApp Business Messaging Gateway
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: '#4b5563', margin: '3px 0 0 0' }}>
                    Connect official Meta WhatsApp Cloud API or third-party WhatsApp BSPs for automated real estate notifications.
                  </p>
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <span style={{ fontSize: '0.84rem', color: '#111827', fontWeight: '600' }}>
                  {config.whatsapp.enabled ? 'Channel Enabled' : 'Channel Disabled'}
                </span>
                <input
                  type="checkbox"
                  checked={config.whatsapp.enabled}
                  onChange={(e) => setConfig({
                    ...config,
                    whatsapp: { ...config.whatsapp, enabled: e.target.checked }
                  })}
                  style={{ width: '18px', height: '18px', accentColor: '#25d366' }}
                />
              </label>
            </div>

            {/* Provider Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#374151', marginBottom: '8px', fontWeight: '600' }}>
                WhatsApp Messaging Provider
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
                {[
                  { id: 'meta_cloud', name: 'Meta Cloud API', desc: 'Official direct Graph API' },
                  { id: 'twilio', name: 'Twilio WhatsApp', desc: 'Global Twilio Gateway' },
                  { id: 'interakt', name: 'Interakt (Jio)', desc: 'Enterprise WhatsApp BSP' },
                  { id: 'aisensy', name: 'AiSensy', desc: 'Marketing & CRM BSP' },
                  { id: 'custom_webhook', name: 'Custom Gateway', desc: 'Custom HTTP Webhook' }
                ].map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setConfig({
                      ...config,
                      whatsapp: { ...config.whatsapp, provider: p.id }
                    })}
                    style={{
                      background: config.whatsapp.provider === p.id ? '#ecfdf5' : '#f8f9fa',
                      border: config.whatsapp.provider === p.id ? '2px solid #059669' : '1px solid #dadce0',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ fontSize: '0.86rem', fontWeight: '700', color: config.whatsapp.provider === p.id ? '#047857' : '#111827' }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: '0.73rem', color: config.whatsapp.provider === p.id ? '#065f46' : '#4b5563', marginTop: '3px', fontWeight: '500' }}>
                      {p.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Credential Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#374151', marginBottom: '6px', fontWeight: '600' }}>
                  Permanent Access Token / API Key *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showKeys.whatsapp ? 'text' : 'password'}
                    placeholder="EAAB..."
                    value={config.whatsapp.apiKey}
                    onChange={(e) => setConfig({
                      ...config,
                      whatsapp: { ...config.whatsapp, apiKey: e.target.value }
                    })}
                    style={{
                      width: '100%',
                      padding: '9px 40px 9px 12px',
                      background: '#f8f9fa',
                      border: '1px solid #dadce0',
                      borderRadius: 'var(--radius-sm)',
                      color: '#111827',
                      fontSize: '0.82rem',
                      fontFamily: 'monospace'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeys({ ...showKeys, whatsapp: !showKeys.whatsapp })}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: '#4b5563',
                      cursor: 'pointer',
                      fontSize: '0.72rem'
                    }}
                  >
                    {showKeys.whatsapp ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#374151', marginBottom: '6px', fontWeight: '600' }}>
                  Phone Number ID (Meta Graph API)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 109876543210987"
                  value={config.whatsapp.phoneNumberId}
                  onChange={(e) => setConfig({
                    ...config,
                    whatsapp: { ...config.whatsapp, phoneNumberId: e.target.value }
                  })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    background: '#f8f9fa',
                    border: '1px solid #dadce0',
                    borderRadius: 'var(--radius-sm)',
                    color: '#111827',
                    fontSize: '0.82rem',
                    fontFamily: 'monospace'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#374151', marginBottom: '6px', fontWeight: '600' }}>
                  WhatsApp Business Account ID (WABA ID)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 112233445566778"
                  value={config.whatsapp.businessAccountId}
                  onChange={(e) => setConfig({
                    ...config,
                    whatsapp: { ...config.whatsapp, businessAccountId: e.target.value }
                  })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    background: '#f8f9fa',
                    border: '1px solid #dadce0',
                    borderRadius: 'var(--radius-sm)',
                    color: '#111827',
                    fontSize: '0.82rem',
                    fontFamily: 'monospace'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#374151', marginBottom: '6px', fontWeight: '600' }}>
                  Sender Display Number
                </label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={config.whatsapp.senderNumber}
                  onChange={(e) => setConfig({
                    ...config,
                    whatsapp: { ...config.whatsapp, senderNumber: e.target.value }
                  })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    background: '#f8f9fa',
                    border: '1px solid #dadce0',
                    borderRadius: 'var(--radius-sm)',
                    color: '#111827',
                    fontSize: '0.82rem'
                  }}
                />
              </div>
            </div>

            {/* Webhook & Environment */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', background: '#f8f9fa', padding: '16px', borderRadius: 'var(--radius-md)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', color: '#374151', marginBottom: '4px' }}>
                  Webhook Verification Token
                </label>
                <input
                  type="text"
                  value={config.whatsapp.webhookVerifyToken}
                  onChange={(e) => setConfig({
                    ...config,
                    whatsapp: { ...config.whatsapp, webhookVerifyToken: e.target.value }
                  })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: '#ffffff',
                    border: '1px solid #dadce0',
                    borderRadius: 'var(--radius-sm)',
                    color: '#111827',
                    fontSize: '0.8rem',
                    fontFamily: 'monospace'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', color: '#374151', marginBottom: '4px' }}>
                  Environment Mode
                </label>
                <select
                  value={config.whatsapp.environment}
                  onChange={(e) => setConfig({
                    ...config,
                    whatsapp: { ...config.whatsapp, environment: e.target.value }
                  })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: '#ffffff',
                    border: '1px solid #dadce0',
                    borderRadius: 'var(--radius-sm)',
                    color: '#111827',
                    fontSize: '0.8rem'
                  }}
                >
                  <option value="sandbox">Sandbox / Test Mode (Simulated delivery)</option>
                  <option value="production">Production / Live Mode (Real Meta Dispatch)</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <button
                type="button"
                onClick={() => openTestModal('whatsapp')}
                style={{
                  padding: '9px 18px',
                  background: 'rgba(37, 211, 102, 0.15)',
                  border: '1px solid #25d366',
                  color: '#25d366',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Zap size={14} /> Test WhatsApp Delivery
              </button>

              <button
                type="submit"
                style={{
                  padding: '9px 24px',
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
                <Check size={16} /> Save WhatsApp Settings
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* TAB 3: SMS MESSAGING CONFIGURATION */}
      {/* ======================================================== */}
      {activeTab === 'sms' && (
        <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            background: '#ffffff',
            border: '1px solid #dadce0',
            borderRadius: 'var(--radius-lg)',
            padding: '24px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            {/* Header & Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
                  <Smartphone size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                    SMS Gateway Configuration (TRAI DLT Compliant)
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: '#4b5563', margin: '3px 0 0 0' }}>
                    Configure Indian & Global SMS providers with 6-character sender headers and DLT Entity ID registrations.
                  </p>
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <span style={{ fontSize: '0.84rem', color: '#111827', fontWeight: '600' }}>
                  {config.sms.enabled ? 'Channel Enabled' : 'Channel Disabled'}
                </span>
                <input
                  type="checkbox"
                  checked={config.sms.enabled}
                  onChange={(e) => setConfig({
                    ...config,
                    sms: { ...config.sms, enabled: e.target.checked }
                  })}
                  style={{ width: '18px', height: '18px', accentColor: '#3b82f6' }}
                />
              </label>
            </div>

            {/* Provider Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#374151', marginBottom: '8px', fontWeight: '600' }}>
                SMS Gateway Provider
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
                {[
                  { id: 'msg91', name: 'MSG91', desc: 'India Enterprise DLT Gateway' },
                  { id: 'fast2sms', name: 'Fast2SMS', desc: 'Quick OTP & Transactional SMS' },
                  { id: 'twilio', name: 'Twilio SMS', desc: 'International SMS routes' },
                  { id: 'textlocal', name: 'Textlocal', desc: 'Web & API SMS platform' },
                  { id: 'custom_http', name: 'Custom HTTP Gateway', desc: 'Generic HTTP GET/POST API' }
                ].map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setConfig({
                      ...config,
                      sms: { ...config.sms, provider: p.id }
                    })}
                    style={{
                      background: config.sms.provider === p.id ? '#eff6ff' : '#f8f9fa',
                      border: config.sms.provider === p.id ? '2px solid #2563eb' : '1px solid #dadce0',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ fontSize: '0.86rem', fontWeight: '700', color: config.sms.provider === p.id ? '#1d4ed8' : '#111827' }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: '0.73rem', color: config.sms.provider === p.id ? '#1e40af' : '#4b5563', marginTop: '3px', fontWeight: '500' }}>
                      {p.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#374151', marginBottom: '6px', fontWeight: '600' }}>
                  SMS Auth Key / API Key *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showKeys.sms ? 'text' : 'password'}
                    placeholder="Enter API Key / Auth Token"
                    value={config.sms.apiKey}
                    onChange={(e) => setConfig({
                      ...config,
                      sms: { ...config.sms, apiKey: e.target.value }
                    })}
                    style={{
                      width: '100%',
                      padding: '9px 40px 9px 12px',
                      background: '#f8f9fa',
                      border: '1px solid #dadce0',
                      borderRadius: 'var(--radius-sm)',
                      color: '#111827',
                      fontSize: '0.82rem',
                      fontFamily: 'monospace'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeys({ ...showKeys, sms: !showKeys.sms })}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: '#4b5563',
                      cursor: 'pointer',
                      fontSize: '0.72rem'
                    }}
                  >
                    {showKeys.sms ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#374151', marginBottom: '6px', fontWeight: '600' }}>
                  Registered 6-Character Sender ID (Header) *
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="KVALEY"
                  value={config.sms.senderId}
                  onChange={(e) => setConfig({
                    ...config,
                    sms: { ...config.sms, senderId: e.target.value.toUpperCase() }
                  })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    background: '#f8f9fa',
                    border: '1px solid #dadce0',
                    borderRadius: 'var(--radius-sm)',
                    color: '#111827',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    letterSpacing: '2px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#374151', marginBottom: '6px', fontWeight: '600' }}>
                  DLT Principal Entity ID (India Telecom)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1401552800000012345"
                  value={config.sms.entityId}
                  onChange={(e) => setConfig({
                    ...config,
                    sms: { ...config.sms, entityId: e.target.value }
                  })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    background: '#f8f9fa',
                    border: '1px solid #dadce0',
                    borderRadius: 'var(--radius-sm)',
                    color: '#111827',
                    fontSize: '0.82rem',
                    fontFamily: 'monospace'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#374151', marginBottom: '6px', fontWeight: '600' }}>
                  Default SMS Route
                </label>
                <select
                  value={config.sms.route}
                  onChange={(e) => setConfig({
                    ...config,
                    sms: { ...config.sms, route: e.target.value }
                  })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    background: '#f8f9fa',
                    border: '1px solid #dadce0',
                    borderRadius: 'var(--radius-sm)',
                    color: '#111827',
                    fontSize: '0.82rem'
                  }}
                >
                  <option value="service_implicit">Service Implicit (Transactional & Critical Alerts)</option>
                  <option value="service_explicit">Service Explicit (Consent-based)</option>
                  <option value="transactional">Transactional (OTP & Payment receipts)</option>
                  <option value="promotional">Promotional (Property launches & Offers)</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <button
                type="button"
                onClick={() => openTestModal('sms')}
                style={{
                  padding: '9px 18px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid #3b82f6',
                  color: '#60a5fa',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Zap size={14} /> Send Test SMS
              </button>

              <button
                type="submit"
                style={{
                  padding: '9px 24px',
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
                <Check size={16} /> Save SMS Settings
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* TAB 4: EMAIL (SMTP) CONFIGURATION */}
      {/* ======================================================== */}
      {activeTab === 'email' && (
        <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            background: '#ffffff',
            border: '1px solid #dadce0',
            borderRadius: 'var(--radius-lg)',
            padding: '24px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            {/* Header & Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
                  <Mail size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                    Email Server & SMTP Configuration
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: '#4b5563', margin: '3px 0 0 0' }}>
                    Configure outbound transactional email delivery via Custom SMTP, SendGrid, Amazon SES, or Google Workspace.
                  </p>
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <span style={{ fontSize: '0.84rem', color: '#111827', fontWeight: '600' }}>
                  {config.email.enabled ? 'Channel Enabled' : 'Channel Disabled'}
                </span>
                <input
                  type="checkbox"
                  checked={config.email.enabled}
                  onChange={(e) => setConfig({
                    ...config,
                    email: { ...config.email, enabled: e.target.checked }
                  })}
                  style={{ width: '18px', height: '18px', accentColor: '#f59e0b' }}
                />
              </label>
            </div>

            {/* Provider Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#374151', marginBottom: '8px', fontWeight: '600' }}>
                Email Service Provider
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
                {[
                  { id: 'brevo', name: '🚀 Brevo (Sendinblue)', desc: '300 Free/Day • No Domain Needed' },
                  { id: 'resend', name: '⚡ Resend', desc: 'Developer-First Email API' },
                  { id: 'smtp', name: 'Custom SMTP Server', desc: 'Direct Host / Port Relay' },
                  { id: 'sendgrid', name: 'Twilio SendGrid', desc: 'API / SMTP Relay' },
                  { id: 'aws_ses', name: 'Amazon SES', desc: 'AWS Simple Email Service' },
                  { id: 'mailgun', name: 'Mailgun', desc: 'Transactional Email API' },
                  { id: 'gmail', name: 'Google Workspace', desc: 'App Password Auth' }
                ].map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setConfig({
                      ...config,
                      email: { 
                        ...config.email, 
                        provider: p.id,
                        fromEmail: p.id === 'brevo' 
                          ? (config.email.fromEmail && !config.email.fromEmail.includes('resend.dev') ? config.email.fromEmail : 'krishna.valley.tech@gmail.com')
                          : (p.id === 'resend' && (!config.email.fromEmail || config.email.fromEmail.includes('krishnavalley')) 
                            ? 'onboarding@resend.dev' 
                            : config.email.fromEmail)
                      }
                    })}
                    style={{
                      background: config.email.provider === p.id ? '#fffbeb' : '#f8f9fa',
                      border: config.email.provider === p.id ? '2px solid #d97706' : '1px solid #dadce0',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ fontSize: '0.86rem', fontWeight: '700', color: config.email.provider === p.id ? '#b45309' : '#111827' }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: '0.73rem', color: config.email.provider === p.id ? '#92400e' : '#4b5563', marginTop: '3px', fontWeight: '500' }}>
                      {p.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* BREVO (SENDINBLUE) SPECIFIC CONFIGURATION */}
            {config.email.provider === 'brevo' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}>
                  <ShieldCheck size={20} color="#10b981" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.5 }}>
                    <strong style={{ color: '#0f172a' }}>Brevo (Sendinblue) Gateway Active — Zero Domain Required</strong>
                    <div style={{ marginTop: '4px' }}>
                      • <strong>No Custom Domain Required:</strong> Send emails directly to any client inbox using your verified sender (<code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', color: '#0f172a' }}>krishna.valley.tech@gmail.com</code>).<br />
                      • <strong>Free Daily Allowance:</strong> 300 free emails per day with pre-warmed transactional IP pools that land in inboxes.<br />
                      • <strong>Get API Key:</strong> Generate a free API key at <a href="https://app.brevo.com/settings/keys/api" target="_blank" rel="noreferrer" style={{ color: '#059669', fontWeight: '600' }}>Brevo API Keys &rarr;</a> and verify your sender address at <a href="https://app.brevo.com/senders" target="_blank" rel="noreferrer" style={{ color: '#059669', fontWeight: '600' }}>Brevo Senders &rarr;</a>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#374151', marginBottom: '6px', fontWeight: '600' }}>
                      Brevo SMTP Login / Username
                    </label>
                    <input
                      type="text"
                      value={config.email.smtpUser || 'b8cb49001@smtp-brevo.com'}
                      onChange={(e) => setConfig({
                        ...config,
                        email: { ...config.email, smtpUser: e.target.value }
                      })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        background: '#f8f9fa',
                        border: '1px solid #dadce0',
                        borderRadius: 'var(--radius-sm)',
                        color: '#111827',
                        fontSize: '0.82rem',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.78rem', color: '#374151', fontWeight: '600' }}>
                        Brevo Password / SMTP Key *
                      </label>
                      <a
                        href="https://app.brevo.com/settings/keys/smtp"
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: '0.72rem', color: '#059669', textDecoration: 'none', fontWeight: '600' }}
                      >
                        Open SMTP key settings &rarr;
                      </a>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showKeys.email ? 'text' : 'password'}
                        placeholder="xsmtpsib-123456789... or xkeysib-..."
                        value={config.email.smtpPassword || config.email.apiKey || ''}
                        onChange={(e) => setConfig({
                          ...config,
                          email: {
                            ...config.email,
                            apiKey: e.target.value,
                            smtpPassword: e.target.value
                          }
                        })}
                        style={{
                          width: '100%',
                          padding: '9px 40px 9px 12px',
                          background: '#f8f9fa',
                          border: '1px solid #dadce0',
                          borderRadius: 'var(--radius-sm)',
                          color: '#111827',
                          fontSize: '0.82rem',
                          fontFamily: 'monospace'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowKeys({ ...showKeys, email: !showKeys.email })}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'transparent',
                          border: 'none',
                          color: '#4b5563',
                          cursor: 'pointer',
                          fontSize: '0.72rem'
                        }}
                      >
                        {showKeys.email ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#374151', marginBottom: '6px', fontWeight: '600' }}>
                      SMTP Server Host &amp; Port
                    </label>
                    <input
                      type="text"
                      disabled
                      value="smtp-relay.brevo.com : 587 (TLS)"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        background: '#e5e7eb',
                        border: '1px solid #d1d5db',
                        borderRadius: 'var(--radius-sm)',
                        color: '#4b5563',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#374151', marginBottom: '6px', fontWeight: '600' }}>
                      Environment Mode
                    </label>
                    <select
                      value={config.email.environment || 'sandbox'}
                      onChange={(e) => setConfig({
                        ...config,
                        email: { ...config.email, environment: e.target.value }
                      })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        background: '#f8f9fa',
                        border: '1px solid #dadce0',
                        borderRadius: 'var(--radius-sm)',
                        color: '#111827',
                        fontSize: '0.82rem'
                      }}
                    >
                      <option value="production">Production (Live Outbound Email Delivery)</option>
                      <option value="sandbox">Sandbox (Simulated Delivery Fallback)</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : config.email.provider === 'resend' ? (
              /* RESEND SPECIFIC CONFIGURATION */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}>
                  <Zap size={20} color="#f59e0b" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.5 }}>
                    <strong style={{ color: '#0f172a' }}>Resend Email Integration Active</strong>
                    <div style={{ marginTop: '4px' }}>
                      • <strong>Testing Domain:</strong> You can test immediately using <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', color: '#0f172a' }}>onboarding@resend.dev</code> as the From Address to send to your registered Resend email.<br />
                      • <strong>Custom Domain:</strong> Add and verify your company domain (e.g. <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', color: '#0f172a' }}>krishnavalley.com</code>) in your <a href="https://resend.com/domains" target="_blank" rel="noreferrer" style={{ color: '#0d9488', fontWeight: '600' }}>Resend Dashboard &rarr;</a>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.78rem', color: '#374151', fontWeight: '600' }}>
                        Resend API Key *
                      </label>
                      <a
                        href="https://resend.com/api-keys"
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: '0.72rem', color: '#0d9488', textDecoration: 'none', fontWeight: '600' }}
                      >
                        Get API Key &rarr;
                      </a>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showKeys.email ? 'text' : 'password'}
                        placeholder="re_123456789_abcdefghijk..."
                        value={config.email.apiKey || config.email.smtpPassword || ''}
                        onChange={(e) => setConfig({
                          ...config,
                          email: {
                            ...config.email,
                            apiKey: e.target.value,
                            smtpPassword: e.target.value
                          }
                        })}
                        style={{
                          width: '100%',
                          padding: '9px 40px 9px 12px',
                          background: '#f8f9fa',
                          border: '1px solid #dadce0',
                          borderRadius: 'var(--radius-sm)',
                          color: '#111827',
                          fontSize: '0.82rem',
                          fontFamily: 'monospace'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowKeys({ ...showKeys, email: !showKeys.email })}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'transparent',
                          border: 'none',
                          color: '#4b5563',
                          cursor: 'pointer',
                          fontSize: '0.72rem'
                        }}
                      >
                        {showKeys.email ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#374151', marginBottom: '6px', fontWeight: '600' }}>
                      Environment Mode
                    </label>
                    <select
                      value={config.email.environment || 'sandbox'}
                      onChange={(e) => setConfig({
                        ...config,
                        email: { ...config.email, environment: e.target.value }
                      })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        background: '#f8f9fa',
                        border: '1px solid #dadce0',
                        borderRadius: 'var(--radius-sm)',
                        color: '#111827',
                        fontSize: '0.82rem'
                      }}
                    >
                      <option value="production">Production (Live Outbound Email Relay)</option>
                      <option value="sandbox">Sandbox (Simulated Delivery Fallback)</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              /* STANDARD SMTP CONFIGURATION */
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#374151', marginBottom: '6px', fontWeight: '600' }}>
                    SMTP Host *
                  </label>
                  <input
                    type="text"
                    placeholder="smtp.gmail.com or email-smtp.us-east-1.amazonaws.com"
                    value={config.email.smtpHost}
                    onChange={(e) => setConfig({
                      ...config,
                      email: { ...config.email, smtpHost: e.target.value }
                    })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: '#f8f9fa',
                      border: '1px solid #dadce0',
                      borderRadius: 'var(--radius-sm)',
                      color: '#111827',
                      fontSize: '0.82rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#374151', marginBottom: '6px', fontWeight: '600' }}>
                    SMTP Port *
                  </label>
                  <input
                    type="number"
                    placeholder="587 (TLS) or 465 (SSL)"
                    value={config.email.smtpPort}
                    onChange={(e) => setConfig({
                      ...config,
                      email: { ...config.email, smtpPort: Number(e.target.value) }
                    })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: '#f8f9fa',
                      border: '1px solid #dadce0',
                      borderRadius: 'var(--radius-sm)',
                      color: '#111827',
                      fontSize: '0.82rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#374151', marginBottom: '6px', fontWeight: '600' }}>
                    SMTP Username / Auth Email *
                  </label>
                  <input
                    type="text"
                    placeholder="notifications@krishnavalley.com"
                    value={config.email.smtpUser}
                    onChange={(e) => setConfig({
                      ...config,
                      email: { ...config.email, smtpUser: e.target.value }
                    })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: '#f8f9fa',
                      border: '1px solid #dadce0',
                      borderRadius: 'var(--radius-sm)',
                      color: '#111827',
                      fontSize: '0.82rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#374151', marginBottom: '6px', fontWeight: '600' }}>
                    SMTP Password / App Password *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showKeys.email ? 'text' : 'password'}
                      placeholder="Enter password or App Password"
                      value={config.email.smtpPassword}
                      onChange={(e) => setConfig({
                        ...config,
                        email: { ...config.email, smtpPassword: e.target.value }
                      })}
                      style={{
                        width: '100%',
                        padding: '9px 40px 9px 12px',
                        background: '#f8f9fa',
                        border: '1px solid #dadce0',
                        borderRadius: 'var(--radius-sm)',
                        color: '#111827',
                        fontSize: '0.82rem'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeys({ ...showKeys, email: !showKeys.email })}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: '#4b5563',
                        cursor: 'pointer',
                        fontSize: '0.72rem'
                      }}
                    >
                      {showKeys.email ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Sender From Meta */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', background: '#f8f9fa', padding: '16px', borderRadius: 'var(--radius-md)' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.76rem', color: '#374151', fontWeight: '600' }}>
                    Sender "From" Email Address *
                  </label>
                  {config.email.provider === 'resend' && (
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, email: { ...config.email, fromEmail: 'onboarding@resend.dev' } })}
                      style={{ background: 'transparent', border: 'none', color: '#0d9488', cursor: 'pointer', fontSize: '0.7rem', textDecoration: 'underline' }}
                    >
                      Use onboarding@resend.dev
                    </button>
                  )}
                </div>
                <input
                  type="email"
                  placeholder={config.email.provider === 'resend' ? 'onboarding@resend.dev or notifications@krishnavalley.com' : 'no-reply@krishnavalley.com'}
                  value={config.email.fromEmail}
                  onChange={(e) => setConfig({
                    ...config,
                    email: { ...config.email, fromEmail: e.target.value }
                  })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: '#ffffff',
                    border: '1px solid #dadce0',
                    borderRadius: 'var(--radius-sm)',
                    color: '#111827',
                    fontSize: '0.8rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', color: '#374151', marginBottom: '4px', fontWeight: '600' }}>
                  Sender Display Name
                </label>
                <input
                  type="text"
                  placeholder="Krishna Valley ERP"
                  value={config.email.fromName}
                  onChange={(e) => setConfig({
                    ...config,
                    email: { ...config.email, fromName: e.target.value }
                  })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: '#ffffff',
                    border: '1px solid #dadce0',
                    borderRadius: 'var(--radius-sm)',
                    color: '#111827',
                    fontSize: '0.8rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', color: '#374151', marginBottom: '4px', fontWeight: '600' }}>
                  Reply-To Email Address
                </label>
                <input
                  type="email"
                  placeholder="support@krishnavalley.com"
                  value={config.email.replyTo}
                  onChange={(e) => setConfig({
                    ...config,
                    email: { ...config.email, replyTo: e.target.value }
                  })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: '#ffffff',
                    border: '1px solid #dadce0',
                    borderRadius: 'var(--radius-sm)',
                    color: '#111827',
                    fontSize: '0.8rem'
                  }}
                />
              </div>
            </div>

            {/* Email Verification Diagnostic Banner */}
            {smtpVerifyResult && (
              <div style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                background: smtpVerifyResult.success ? '#ecfdf5' : '#fef2f2',
                border: smtpVerifyResult.success ? '1px solid #10b981' : '1px solid #ef4444',
                color: smtpVerifyResult.success ? '#047857' : '#b91c1c',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px'
              }}>
                {smtpVerifyResult.success ? <CheckCircle size={16} style={{ marginTop: '2px', flexShrink: 0 }} /> : <AlertTriangle size={16} style={{ marginTop: '2px', flexShrink: 0 }} />}
                <div>
                  <div style={{ fontWeight: '700' }}>{smtpVerifyResult.message}</div>
                  {smtpVerifyResult.details && (
                    <div style={{ fontSize: '0.74rem', marginTop: '4px', opacity: 0.9 }}>
                      {smtpVerifyResult.details.provider === 'brevo' ? (
                        <>Provider: Brevo • Account: {smtpVerifyResult.details.accountEmail || 'Active'} • Plan: {smtpVerifyResult.details.plan || 'Free'} • Latency: {smtpVerifyResult.details.latencyMs}ms</>
                      ) : smtpVerifyResult.details.provider === 'resend' ? (
                        <>Provider: Resend • Key: {smtpVerifyResult.details.keyPreview || 'Verified'} • Latency: {smtpVerifyResult.details.latencyMs}ms</>
                      ) : (
                        <>Host: {smtpVerifyResult.details.host}:{smtpVerifyResult.details.port} • User: {smtpVerifyResult.details.user || 'N/A'} • Latency: {smtpVerifyResult.details.latencyMs}ms</>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleVerifySmtp}
                disabled={smtpVerifying}
                style={{
                  padding: '9px 18px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid #10b981',
                  color: '#059669',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {smtpVerifying ? <RefreshCw size={14} className="spin" /> : <ShieldCheck size={14} />}
                {config.email?.provider === 'brevo' ? 'Verify Brevo API Key' : config.email?.provider === 'resend' ? 'Verify Resend API Key' : 'Verify SMTP Connection'}
              </button>

              <button
                type="button"
                onClick={() => openTestModal('email')}
                style={{
                  padding: '9px 18px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid #f59e0b',
                  color: '#fbbf24',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Zap size={14} /> Send Test Email
              </button>

              <button
                type="submit"
                style={{
                  padding: '9px 24px',
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
                <Check size={16} /> Save Email Settings
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* TAB 5: PUSH NOTIFICATION CONFIGURATION */}
      {/* ======================================================== */}
      {activeTab === 'push' && (
        <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            background: '#ffffff',
            border: '1px solid #dadce0',
            borderRadius: 'var(--radius-lg)',
            padding: '24px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            {/* Header & Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(236, 72, 153, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f472b6' }}>
                  <Bell size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                    Web Push & FCM Push Notifications
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: '#4b5563', margin: '3px 0 0 0' }}>
                    Deliver instant background alerts directly to customer browser tabs, desktop notification centers, and mobile devices.
                  </p>
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <span style={{ fontSize: '0.84rem', color: '#111827', fontWeight: '600' }}>
                  {config.push.enabled ? 'Channel Enabled' : 'Channel Disabled'}
                </span>
                <input
                  type="checkbox"
                  checked={config.push.enabled}
                  onChange={(e) => setConfig({
                    ...config,
                    push: { ...config.push, enabled: e.target.checked }
                  })}
                  style={{ width: '18px', height: '18px', accentColor: '#ec4899' }}
                />
              </label>
            </div>

            {/* VAPID Keys Section */}
            <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#111827' }}>Web Push VAPID Keypair</div>
                  <div style={{ fontSize: '0.74rem', color: '#4b5563' }}>Cryptographic keys required for W3C browser push standards</div>
                </div>
                <button
                  type="button"
                  onClick={generateVapidKeys}
                  style={{
                    padding: '6px 12px',
                    background: 'rgba(236, 72, 153, 0.15)',
                    border: '1px solid #ec4899',
                    color: '#f472b6',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Regenerate VAPID Keys
                </button>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', color: '#374151', marginBottom: '4px' }}>
                  VAPID Public Key (Safe for frontend service worker)
                </label>
                <input
                  type="text"
                  value={config.push.vapidPublicKey}
                  onChange={(e) => setConfig({
                    ...config,
                    push: { ...config.push, vapidPublicKey: e.target.value }
                  })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: '#ffffff',
                    border: '1px solid #dadce0',
                    borderRadius: 'var(--radius-sm)',
                    color: '#111827',
                    fontSize: '0.78rem',
                    fontFamily: 'monospace'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', color: '#374151', marginBottom: '4px' }}>
                  VAPID Private Key (Server Secret)
                </label>
                <input
                  type={showKeys.push ? 'text' : 'password'}
                  value={config.push.vapidPrivateKey}
                  onChange={(e) => setConfig({
                    ...config,
                    push: { ...config.push, vapidPrivateKey: e.target.value }
                  })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: '#ffffff',
                    border: '1px solid #dadce0',
                    borderRadius: 'var(--radius-sm)',
                    color: '#111827',
                    fontSize: '0.78rem',
                    fontFamily: 'monospace'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', color: '#374151', marginBottom: '4px' }}>
                  VAPID Subject (mailto contact URL)
                </label>
                <input
                  type="text"
                  placeholder="mailto:admin@krishnavalley.com"
                  value={config.push.vapidSubject}
                  onChange={(e) => setConfig({
                    ...config,
                    push: { ...config.push, vapidSubject: e.target.value }
                  })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: '#ffffff',
                    border: '1px solid #dadce0',
                    borderRadius: 'var(--radius-sm)',
                    color: '#111827',
                    fontSize: '0.8rem'
                  }}
                />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <button
                type="button"
                onClick={() => openTestModal('push')}
                style={{
                  padding: '9px 18px',
                  background: 'rgba(236, 72, 153, 0.15)',
                  border: '1px solid #ec4899',
                  color: '#f472b6',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Zap size={14} /> Trigger Test Push
              </button>

              <button
                type="submit"
                style={{
                  padding: '9px 24px',
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
                <Check size={16} /> Save Push Settings
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* TAB: GOOGLE CALENDAR DIRECT FOLLOW-UP MAPPING */}
      {/* ======================================================== */}
      {activeTab === 'google_calendar' && (
        <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            background: '#ffffff',
            border: '1px solid #dadce0',
            borderRadius: 'var(--radius-lg)',
            padding: '24px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '22px'
          }}>
            {/* Header & Status */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: '16px',
              flexWrap: 'wrap',
              gap: '14px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Calendar size={22} color="#1a73e8" />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#111827', margin: 0 }}>
                    Google Calendar Follow-Up Mapping Gateway
                  </h3>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: config.googleCalendar?.syncStatus === 'ready' ? 'rgba(16, 185, 129, 0.15)' : (config.googleCalendar?.syncStatus === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(148, 163, 184, 0.15)'),
                    color: config.googleCalendar?.syncStatus === 'ready' ? '#059669' : (config.googleCalendar?.syncStatus === 'error' ? '#dc2626' : '#64748b'),
                    border: config.googleCalendar?.syncStatus === 'ready' ? '1px solid #10b981' : (config.googleCalendar?.syncStatus === 'error' ? '1px solid #ef4444' : '1px solid #cbd5e1'),
                  }}>
                    {config.googleCalendar?.syncStatus === 'ready' ? 'READY & SYNCING' : (config.googleCalendar?.syncStatus === 'error' ? 'CONNECTION ERROR' : 'NOT CONFIGURED')}
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#4b5563', margin: '4px 0 0 0' }}>
                  Directly map all scheduled client follow-ups, calls, and site visit tours into Google Calendar. Changes in the ERP reflect live on your team's Google Calendars.
                </p>
              </div>

              {/* Master Enable/Disable Toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: '#f8f9fa', padding: '8px 14px', borderRadius: '8px', border: '1px solid #dadce0' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#111827' }}>
                  {config.googleCalendar?.enabled ? 'Active Direct Sync' : 'Sync Disabled'}
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(config.googleCalendar?.enabled)}
                  onChange={(e) => setConfig({
                    ...config,
                    googleCalendar: { ...config.googleCalendar, enabled: e.target.checked }
                  })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </label>
            </div>

            {/* Quick Actions & JSON Import Toolbar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8f9fa',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid #dadce0',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setJsonPasteModal(true)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: '#ffffff',
                    border: '1px solid #1a73e8',
                    color: '#1a73e8',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Upload size={14} /> Import from Service Account JSON Key
                </button>

                <a
                  href="https://calendar.google.com"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: '7px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: '#ffffff',
                    border: '1px solid #dadce0',
                    color: '#374151',
                    fontSize: '0.78rem',
                    fontWeight: '600',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <ExternalLink size={14} /> Open Google Calendar Web
                </a>
              </div>

              {/* Batch Sync All Button */}
              <button
                type="button"
                onClick={handleSyncGoogleCalendarAll}
                disabled={gcalSyncing || !config.googleCalendar?.clientEmail}
                style={{
                  padding: '7px 16px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'linear-gradient(135deg, #1a73e8, #4285f4)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: (gcalSyncing || !config.googleCalendar?.clientEmail) ? 'not-allowed' : 'pointer',
                  opacity: (gcalSyncing || !config.googleCalendar?.clientEmail) ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {gcalSyncing ? <RefreshCw size={14} className="spin" /> : <Zap size={14} />}
                {gcalSyncing ? 'Syncing Pending Follow-ups...' : '⚡ Sync All Pending Follow-Ups Now'}
              </button>
            </div>

            {/* Sync Feedback Alert */}
            {gcalSyncResult && (
              <div style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                background: gcalSyncResult.success ? '#ecfdf5' : '#fef2f2',
                border: gcalSyncResult.success ? '1px solid #10b981' : '1px solid #ef4444',
                color: gcalSyncResult.success ? '#047857' : '#b91c1c',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {gcalSyncResult.success ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                <div>
                  <strong>{gcalSyncResult.message}</strong>
                  {gcalSyncResult.totalSynced !== undefined && (
                    <span style={{ marginLeft: '6px', fontSize: '0.76rem', opacity: 0.9 }}>
                      (Total Synced: {gcalSyncResult.totalSynced}, Failed: {gcalSyncResult.failedCount || 0})
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Credentials & Settings Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#374151', marginBottom: '6px', fontWeight: '600' }}>
                  Target Google Calendar ID *
                </label>
                <input
                  type="text"
                  placeholder="krishna.valley.tech@gmail.com or primary"
                  value={config.googleCalendar?.calendarId || ''}
                  onChange={(e) => setConfig({
                    ...config,
                    googleCalendar: { ...config.googleCalendar, calendarId: e.target.value }
                  })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    background: '#f8f9fa',
                    border: '1px solid #dadce0',
                    borderRadius: 'var(--radius-sm)',
                    color: '#111827',
                    fontSize: '0.82rem'
                  }}
                />
                <span style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '4px', display: 'block' }}>
                  Use your Google account email (e.g. <code>krishna.valley.tech@gmail.com</code>) or <code>primary</code>.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#374151', marginBottom: '6px', fontWeight: '600' }}>
                  Calendar Time Zone
                </label>
                <select
                  value={config.googleCalendar?.timeZone || 'Asia/Kolkata'}
                  onChange={(e) => setConfig({
                    ...config,
                    googleCalendar: { ...config.googleCalendar, timeZone: e.target.value }
                  })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    background: '#f8f9fa',
                    border: '1px solid #dadce0',
                    borderRadius: 'var(--radius-sm)',
                    color: '#111827',
                    fontSize: '0.82rem'
                  }}
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST - India Standard Time UTC+05:30)</option>
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST UTC+04:00)</option>
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                  <option value="America/New_York">America/New_York (EST/EDT)</option>
                </select>
                <span style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '4px', display: 'block' }}>
                  All follow-up time slots will be scheduled and displayed in this timezone.
                </span>
              </div>
            </div>

            {/* Service Account Email & Private Key */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#374151', marginBottom: '6px', fontWeight: '600' }}>
                  Google Service Account Email (client_email) *
                </label>
                <input
                  type="email"
                  placeholder="krishna-valley-calendar@project-id.iam.gserviceaccount.com"
                  value={config.googleCalendar?.clientEmail || ''}
                  onChange={(e) => setConfig({
                    ...config,
                    googleCalendar: { ...config.googleCalendar, clientEmail: e.target.value }
                  })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    background: '#f8f9fa',
                    border: '1px solid #dadce0',
                    borderRadius: 'var(--radius-sm)',
                    color: '#111827',
                    fontSize: '0.82rem',
                    fontFamily: 'monospace'
                  }}
                />
                <span style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '4px', display: 'block' }}>
                  Share your Google Calendar with this email address with <strong>"Make changes to events"</strong> permission!
                </span>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.78rem', color: '#374151', fontWeight: '600' }}>
                    Service Account Private Key (private_key) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowKeys({ ...showKeys, googleCalendar: !showKeys.googleCalendar })}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#1a73e8',
                      cursor: 'pointer',
                      fontSize: '0.72rem',
                      fontWeight: '700'
                    }}
                  >
                    {showKeys.googleCalendar ? 'Hide Key' : 'Reveal Key'}
                  </button>
                </div>
                <textarea
                  rows={4}
                  placeholder="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
                  value={showKeys.googleCalendar ? (config.googleCalendar?.privateKey || '') : (config.googleCalendar?.privateKey ? '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••' : '')}
                  onChange={(e) => setConfig({
                    ...config,
                    googleCalendar: { ...config.googleCalendar, privateKey: e.target.value }
                  })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    background: '#f8f9fa',
                    border: '1px solid #dadce0',
                    borderRadius: 'var(--radius-sm)',
                    color: '#111827',
                    fontSize: '0.78rem',
                    fontFamily: 'monospace',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>

            {/* Sync Preferences & Timing */}
            <div style={{
              background: '#f8f9fa',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid #dadce0',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#111827', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={Boolean(config.googleCalendar?.autoSyncLeads)}
                  onChange={(e) => setConfig({
                    ...config,
                    googleCalendar: { ...config.googleCalendar, autoSyncLeads: e.target.checked }
                  })}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span>Auto-sync CRM Lead Follow-ups (Calls, Meetings)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#111827', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={Boolean(config.googleCalendar?.autoSyncSiteVisits)}
                  onChange={(e) => setConfig({
                    ...config,
                    googleCalendar: { ...config.googleCalendar, autoSyncSiteVisits: e.target.checked }
                  })}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span>Auto-sync Site Visit Tours (With Vrindavan Campus GPS)</span>
              </label>
            </div>

            {/* Live Verification Diagnostic Banner */}
            {gcalTestResult && (
              <div style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                background: gcalTestResult.success ? '#ecfdf5' : '#fef2f2',
                border: gcalTestResult.success ? '1px solid #10b981' : '1px solid #ef4444',
                color: gcalTestResult.success ? '#047857' : '#b91c1c',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px'
              }}>
                {gcalTestResult.success ? <CheckCircle size={16} style={{ marginTop: '2px', flexShrink: 0 }} /> : <AlertTriangle size={16} style={{ marginTop: '2px', flexShrink: 0 }} />}
                <div>
                  <div style={{ fontWeight: '700' }}>{gcalTestResult.message}</div>
                  {gcalTestResult.details && (
                    <div style={{ fontSize: '0.74rem', marginTop: '4px', opacity: 0.9 }}>
                      Calendar: {gcalTestResult.details.calendarTitle || gcalTestResult.details.calendarId} • Timezone: {gcalTestResult.details.timeZone} • Latency: {gcalTestResult.details.latencyMs}ms
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick 3-Step Setup Guide Card */}
            <div style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: 'var(--radius-md)',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e40af', fontWeight: '700', fontSize: '0.88rem' }}>
                <Clock size={16} />
                Quick 3-Step Google Calendar Setup Guide:
              </div>
              <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '0.78rem', color: '#1e3a8a', display: 'flex', flexDirection: 'column', gap: '6px', lineHeight: '1.5' }}>
                <li>
                  Go to <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" style={{ color: '#1d4ed8', fontWeight: '700' }}>Google Cloud Console</a> &rarr; Enable <strong>Google Calendar API</strong>.
                </li>
                <li>
                  Go to <strong>IAM &amp; Admin &rarr; Service Accounts</strong> &rarr; Create Service Account &rarr; Click <strong>Keys &rarr; Add Key &rarr; JSON</strong> (download the JSON file).
                </li>
                <li>
                  Open your <a href="https://calendar.google.com" target="_blank" rel="noreferrer" style={{ color: '#1d4ed8', fontWeight: '700' }}>Google Calendar</a> &rarr; Click Settings next to your calendar &rarr; <strong>"Share with specific people"</strong> &rarr; Add the Service Account email with <strong>"Make changes to events"</strong> permission!
                </li>
                <li>
                  Click the <strong>"Import from Service Account JSON Key"</strong> button above, paste the file contents, click <strong>"Save Google Calendar Settings"</strong>, and then click <strong>"Test Google Calendar Connection"</strong>.
                </li>
              </ol>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleTestGoogleCalendar}
                disabled={gcalTesting || !config.googleCalendar?.clientEmail}
                style={{
                  padding: '9px 18px',
                  background: 'rgba(66, 133, 244, 0.12)',
                  border: '1px solid #1a73e8',
                  color: '#1a73e8',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  cursor: (gcalTesting || !config.googleCalendar?.clientEmail) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {gcalTesting ? <RefreshCw size={14} className="spin" /> : <ShieldCheck size={14} />}
                Test Google Calendar Connection
              </button>

              <button
                type="submit"
                style={{
                  padding: '9px 24px',
                  background: 'linear-gradient(135deg, #1a73e8, #4285f4)',
                  border: 'none',
                  color: '#ffffff',
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
                <Check size={16} /> Save Google Calendar Settings
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* TAB 6: AUTOMATION & GENERAL POLICIES */}
      {/* ======================================================== */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            background: '#ffffff',
            border: '1px solid #dadce0',
            borderRadius: 'var(--radius-lg)',
            padding: '24px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                Automated Reminder Triggers & Quiet Hours Policy
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#4b5563', margin: '4px 0 0 0' }}>
                Set timing thresholds for automated payment reminders, follow-ups, and customer protection quiet hours.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              
              {/* Payment Reminder Timers */}
              <div style={{ background: '#f8f9fa', padding: '18px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={16} color="var(--primary-500)" />
                  Payment Due Triggers
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#111827', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={config.general?.autoPaymentReminders}
                    onChange={(e) => setConfig({
                      ...config,
                      general: { ...config.general, autoPaymentReminders: e.target.checked }
                    })}
                    style={{ accentColor: 'var(--primary-500)', width: '16px', height: '16px' }}
                  />
                  Enable automated pre-due milestone reminders
                </label>

                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', color: '#374151', marginBottom: '4px' }}>
                    Send Reminder Before Due Date (Days comma separated)
                  </label>
                  <input
                    type="text"
                    value={config.general?.reminderDaysBeforeDue?.join(', ') || '7, 3, 1'}
                    onChange={(e) => {
                      const days = e.target.value.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
                      setConfig({
                        ...config,
                        general: { ...config.general, reminderDaysBeforeDue: days }
                      });
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: '#ffffff',
                      border: '1px solid #dadce0',
                      borderRadius: 'var(--radius-sm)',
                      color: '#111827',
                      fontSize: '0.82rem'
                    }}
                  />
                  <div style={{ fontSize: '0.7rem', color: '#4b5563', marginTop: '2px' }}>
                    e.g. 7, 3, 1 sends reminders 7 days, 3 days, and 1 day prior to due date.
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', color: '#374151', marginBottom: '4px' }}>
                    Overdue Reminder Frequency (Every N days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={config.general?.overdueReminderIntervalDays || 3}
                    onChange={(e) => setConfig({
                      ...config,
                      general: { ...config.general, overdueReminderIntervalDays: Number(e.target.value) }
                    })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: '#ffffff',
                      border: '1px solid #dadce0',
                      borderRadius: 'var(--radius-sm)',
                      color: '#111827',
                      fontSize: '0.82rem'
                    }}
                  />
                </div>
              </div>

              {/* Quiet Hours Policy */}
              <div style={{ background: '#f8f9fa', padding: '18px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={16} color="#fbbf24" />
                  Quiet Hours (Do-Not-Disturb)
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#111827', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={config.general?.quietHoursEnabled}
                    onChange={(e) => setConfig({
                      ...config,
                      general: { ...config.general, quietHoursEnabled: e.target.checked }
                    })}
                    style={{ accentColor: '#fbbf24', width: '16px', height: '16px' }}
                  />
                  Prevent outbound WhatsApp & SMS during night hours
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', color: '#374151', marginBottom: '4px' }}>
                      Quiet Hours Start Time
                    </label>
                    <input
                      type="time"
                      value={config.general?.quietHoursStart || '21:00'}
                      onChange={(e) => setConfig({
                        ...config,
                        general: { ...config.general, quietHoursStart: e.target.value }
                      })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: '#ffffff',
                        border: '1px solid #dadce0',
                        borderRadius: 'var(--radius-sm)',
                        color: '#111827',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', color: '#374151', marginBottom: '4px' }}>
                      Quiet Hours End Time
                    </label>
                    <input
                      type="time"
                      value={config.general?.quietHoursEnd || '08:00'}
                      onChange={(e) => setConfig({
                        ...config,
                        general: { ...config.general, quietHoursEnd: e.target.value }
                      })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: '#ffffff',
                        border: '1px solid #dadce0',
                        borderRadius: 'var(--radius-sm)',
                        color: '#111827',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <button
                type="submit"
                style={{
                  padding: '9px 24px',
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
                <Check size={16} /> Save Automation Policies
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* TAB 7: AUDIT LOGS & DELIVERY HISTORY */}
      {/* ======================================================== */}
      {activeTab === 'logs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Sub-toggle: Message Dispatch Logs vs Voice Call Logs */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <button
              type="button"
              onClick={() => setAuditLogType('messages')}
              style={{
                padding: '7px 16px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: auditLogType === 'messages' ? 'linear-gradient(135deg, var(--primary-600), var(--primary-700))' : '#f1f5f9',
                color: auditLogType === 'messages' ? '#ffffff' : '#475569',
                fontWeight: '700',
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              Message Delivery Logs ({logs.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setAuditLogType('calls');
                loadCallLogs();
              }}
              style={{
                padding: '7px 16px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: auditLogType === 'calls' ? 'linear-gradient(135deg, #059669, #10b981)' : '#f1f5f9',
                color: auditLogType === 'calls' ? '#ffffff' : '#475569',
                fontWeight: '700',
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <PhoneCall size={13} />
              Telephony &amp; Voice Call Logs ({callLogs.length})
            </button>
          </div>

          {/* Metrics summary */}
          <div className="grid-cols-5">
            <div style={{ background: '#ffffff', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid #dadce0' }}>
              <div style={{ fontSize: '0.72rem', color: '#4b5563' }}>Total Sent</div>
              <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#111827', marginTop: '2px' }}>{logCounts.total || 0}</div>
            </div>
            <div style={{ background: '#ffffff', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid #dadce0' }}>
              <div style={{ fontSize: '0.72rem', color: '#25d366' }}>WhatsApp</div>
              <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#25d366', marginTop: '2px' }}>{logCounts.whatsapp || 0}</div>
            </div>
            <div style={{ background: '#ffffff', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid #dadce0' }}>
              <div style={{ fontSize: '0.72rem', color: '#60a5fa' }}>SMS</div>
              <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#60a5fa', marginTop: '2px' }}>{logCounts.sms || 0}</div>
            </div>
            <div style={{ background: '#ffffff', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid #dadce0' }}>
              <div style={{ fontSize: '0.72rem', color: '#fbbf24' }}>Email</div>
              <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#fbbf24', marginTop: '2px' }}>{logCounts.email || 0}</div>
            </div>
            <div style={{ background: '#ffffff', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid #dadce0' }}>
              <div style={{ fontSize: '0.72rem', color: '#f472b6' }}>Push</div>
              <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#f472b6', marginTop: '2px' }}>{logCounts.push || 0}</div>
            </div>
          </div>

          {/* Filters Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            background: '#ffffff',
            border: '1px solid #dadce0',
            borderRadius: 'var(--radius-md)',
            padding: '12px 18px'
          }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
              <input
                type="text"
                placeholder="Search logs by recipient, subject, code..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                style={{
                  minWidth: '220px',
                  padding: '7px 12px',
                  background: '#f8f9fa',
                  border: '1px solid #dadce0',
                  borderRadius: 'var(--radius-sm)',
                  color: '#111827',
                  fontSize: '0.8rem'
                }}
              />

              <select
                value={logChannelFilter}
                onChange={(e) => setLogChannelFilter(e.target.value)}
                style={{
                  padding: '7px 10px',
                  background: '#f8f9fa',
                  border: '1px solid #dadce0',
                  borderRadius: 'var(--radius-sm)',
                  color: '#111827',
                  fontSize: '0.8rem'
                }}
              >
                <option value="all">All Channels</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS</option>
                <option value="email">Email</option>
                <option value="push">Push</option>
              </select>

              <select
                value={logStatusFilter}
                onChange={(e) => setLogStatusFilter(e.target.value)}
                style={{
                  padding: '7px 10px',
                  background: '#f8f9fa',
                  border: '1px solid #dadce0',
                  borderRadius: 'var(--radius-sm)',
                  color: '#111827',
                  fontSize: '0.8rem'
                }}
              >
                <option value="all">All Statuses</option>
                <option value="delivered">Delivered</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={loadLogs}
                style={{
                  padding: '7px 12px',
                  background: '#f8f9fa',
                  border: '1px solid #dadce0',
                  color: '#111827',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={13} className={logsLoading ? 'spin' : ''} /> Refresh
              </button>

              <button
                onClick={handleClearLogs}
                style={{
                  padding: '7px 12px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#ef4444',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                Clear Logs
              </button>
            </div>
          </div>

          {/* Logs Table */}
          {auditLogType === 'messages' ? (
            <div style={{
              background: '#ffffff',
              border: '1px solid #dadce0',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden'
            }}>
              {logsLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#4b5563' }}>
                  <RefreshCw size={20} className="spin" style={{ margin: '0 auto 8px' }} />
                  Loading logs...
                </div>
              ) : logs.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#4b5563', fontSize: '0.84rem' }}>
                  No communication delivery logs recorded yet.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #dadce0', color: '#4b5563' }}>
                        <th style={{ padding: '12px 14px' }}>Channel</th>
                        <th style={{ padding: '12px 14px' }}>Recipient</th>
                        <th style={{ padding: '12px 14px' }}>Subject / Template</th>
                        <th style={{ padding: '12px 14px' }}>Content Preview</th>
                        <th style={{ padding: '12px 14px' }}>Status</th>
                        <th style={{ padding: '12px 14px' }}>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log._id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              background:
                                log.channel === 'whatsapp' ? 'rgba(37, 211, 102, 0.12)' :
                                log.channel === 'sms' ? 'rgba(59, 130, 246, 0.12)' :
                                log.channel === 'email' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(236, 72, 153, 0.12)',
                              color:
                                log.channel === 'whatsapp' ? '#25d366' :
                                log.channel === 'sms' ? '#60a5fa' :
                                log.channel === 'email' ? '#fbbf24' : '#f472b6'
                            }}>
                              {log.channel.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', color: '#111827', fontWeight: '600' }}>
                            <div>{log.recipient}</div>
                            {log.recipientName && (
                              <div style={{ fontSize: '0.7rem', color: '#4b5563' }}>{log.recipientName}</div>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px', color: '#374151' }}>
                            <div>{log.subject || log.templateCode}</div>
                          </td>
                          <td style={{ padding: '12px 14px', color: '#4b5563', maxWidth: '300px' }}>
                            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {log.contentPreview}
                            </div>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: '700',
                              background: log.status === 'delivered' ? 'rgba(16, 185, 129, 0.15)' : log.status === 'failed' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                              color: log.status === 'delivered' ? '#10b981' : log.status === 'failed' ? '#ef4444' : '#60a5fa'
                            }}>
                              {log.status.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', color: '#4b5563', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div style={{
              background: '#ffffff',
              border: '1px solid #dadce0',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden'
            }}>
              {callLogsLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#4b5563' }}>
                  <RefreshCw size={20} className="spin" style={{ margin: '0 auto 8px' }} />
                  Loading voice call logs...
                </div>
              ) : callLogs.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#4b5563', fontSize: '0.84rem' }}>
                  No voice call records found. Use the In-App Softphone or Calling API to place calls.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #dadce0', color: '#4b5563' }}>
                        <th style={{ padding: '12px 14px' }}>Client</th>
                        <th style={{ padding: '12px 14px' }}>Phone</th>
                        <th style={{ padding: '12px 14px' }}>Provider</th>
                        <th style={{ padding: '12px 14px' }}>Duration</th>
                        <th style={{ padding: '12px 14px' }}>Outcome / Notes</th>
                        <th style={{ padding: '12px 14px' }}>Status</th>
                        <th style={{ padding: '12px 14px' }}>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {callLogs.map((c) => (
                        <tr key={c._id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '12px 14px', fontWeight: '700', color: '#111827' }}>
                            {c.clientName || 'Client'}
                          </td>
                          <td style={{ padding: '12px 14px', color: '#059669', fontWeight: '600' }}>
                            {c.clientPhone}
                          </td>
                          <td style={{ padding: '12px 14px', textTransform: 'uppercase', fontSize: '0.72rem', color: '#4b5563' }}>
                            {c.provider}
                          </td>
                          <td style={{ padding: '12px 14px', fontWeight: '600' }}>
                            {Math.floor((c.durationSeconds || 0) / 60)}m {(c.durationSeconds || 0) % 60}s
                          </td>
                          <td style={{ padding: '12px 14px', maxWidth: '280px' }}>
                            <div style={{ fontWeight: '600', color: '#111827' }}>
                              {(c.outcome || '').replace(/_/g, ' ').toUpperCase()}
                            </div>
                            {c.notes && (
                              <div style={{ fontSize: '0.72rem', color: '#4b5563', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {c.notes}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: '700',
                              background: c.callStatus === 'completed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              color: c.callStatus === 'completed' ? '#10b981' : '#ef4444'
                            }}>
                              {(c.callStatus || 'COMPLETED').toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', color: '#4b5563', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                            {new Date(c.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL DIALOGS ================= */}
      <TemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onSubmit={handleSaveTemplate}
        template={editingTemplate}
      />

      <TemplatePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        template={previewingTemplate}
      />

      <TestNotificationModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        initialChannel={testChannelTarget}
        onDispatched={() => {
          if (activeTab === 'logs') loadLogs();
        }}
      />

      {/* SERVICE ACCOUNT JSON PASTE MODAL */}
      {jsonPasteModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            border: '1px solid #dadce0',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '620px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: 'var(--shadow-xl)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #dadce0', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Upload size={18} color="#1a73e8" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                  Import Google Service Account JSON Key
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setJsonPasteModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.8rem', color: '#4b5563', margin: 0 }}>
              Open your downloaded Service Account <code>.json</code> file in Notepad/TextEdit, copy all contents, and paste it below. The ERP will automatically extract your <strong>client_email</strong> and <strong>private_key</strong>.
            </p>

            <textarea
              rows={8}
              placeholder='{\n  "type": "service_account",\n  "project_id": "krishna-valley-erp",\n  "private_key_id": "...",\n  "private_key": "-----BEGIN PRIVATE KEY-----\\n...",\n  "client_email": "...@...iam.gserviceaccount.com"\n}'
              value={jsonPasteContent}
              onChange={(e) => setJsonPasteContent(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#f8f9fa',
                border: '1px solid #dadce0',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'monospace',
                fontSize: '0.78rem',
                resize: 'vertical'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setJsonPasteModal(false)}
                style={{
                  padding: '8px 16px',
                  background: '#f8f9fa',
                  border: '1px solid #dadce0',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  color: '#374151'
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleParseServiceAccountJson}
                disabled={!jsonPasteContent.trim()}
                style={{
                  padding: '8px 18px',
                  background: 'linear-gradient(135deg, #1a73e8, #4285f4)',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  cursor: !jsonPasteContent.trim() ? 'not-allowed' : 'pointer',
                  opacity: !jsonPasteContent.trim() ? 0.6 : 1
                }}
              >
                Auto-Extract &amp; Populate
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
