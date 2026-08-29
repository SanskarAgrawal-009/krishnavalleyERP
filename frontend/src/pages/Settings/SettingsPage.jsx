import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { settingsService } from '../../services/settingsService.js';
import {
  Settings as SettingsIcon,
  Building2,
  Calendar,
  Percent,
  CreditCard,
  Mail,
  MessageSquare,
  HardDrive,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
  Download,
  Send,
  Zap,
  Lock,
  Unlock,
  Plus,
  Trash2,
  Sparkles,
  Loader2,
  Clock,
  ShieldCheck,
  Globe,
  Database
} from 'lucide-react';

export const SettingsPage = () => {
  const { user: currentUser, isSuperAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState(tabParam || 'company');

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);

  // Toast feedback
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 4000);
  };

  // Section Form Data States
  const [companyForm, setCompanyForm] = useState({});
  const [fyForm, setFyForm] = useState({});
  const [taxForm, setTaxForm] = useState({});
  const [pgForm, setPgForm] = useState({});
  const [emailForm, setEmailForm] = useState({});
  const [waForm, setWaForm] = useState({});
  const [backupForm, setBackupForm] = useState({});
  const [prefForm, setPrefForm] = useState({});

  // Test Modal States
  const [testEmailModal, setTestEmailModal] = useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [testEmailLoading, setTestEmailLoading] = useState(false);

  const [testWaModal, setTestWaModal] = useState(false);
  const [testWaNumber, setTestWaNumber] = useState('');
  const [testWaLoading, setTestWaLoading] = useState(false);

  const [backupLoading, setBackupLoading] = useState(false);

  // Fetch Settings
  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await settingsService.getSettings();
      if (res.success && res.data) {
        setSettings(res.data);
        setCompanyForm(res.data.company || {});
        setFyForm(res.data.financialYear || {});
        setTaxForm(res.data.taxes || {});
        setPgForm(res.data.paymentGateway || {});
        setEmailForm(res.data.email || {});
        setWaForm(res.data.whatsappApi || {});
        setBackupForm(res.data.backup || {});
        setPrefForm(res.data.systemPreferences || {});
      }
    } catch (err) {
      showToast(err.message || 'Failed to load system settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  // Save Section Handler
  const handleSaveSection = async (sectionName, formData) => {
    setSaving(true);
    try {
      const res = await settingsService.updateSection(sectionName, formData);
      if (res.success) {
        showToast(`${sectionName.charAt(0).toUpperCase() + sectionName.slice(1)} settings saved successfully!`);
        loadSettings();
      }
    } catch (err) {
      showToast(err.message || 'Failed to update settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Trigger Live Test Email
  const handleTestEmail = async (e) => {
    e.preventDefault();
    setTestEmailLoading(true);
    try {
      const res = await settingsService.testEmail(testEmailRecipient);
      if (res.success) {
        showToast(res.message || 'Test email dispatched successfully!');
        setTestEmailModal(false);
        loadSettings();
      }
    } catch (err) {
      showToast(err.message || 'Failed to dispatch test email', 'error');
    } finally {
      setTestEmailLoading(false);
    }
  };

  // Trigger Live Test WhatsApp
  const handleTestWhatsApp = async (e) => {
    e.preventDefault();
    setTestWaLoading(true);
    try {
      const res = await settingsService.testWhatsApp(testWaNumber);
      if (res.success) {
        showToast(res.message || 'WhatsApp Cloud API connection verified!');
        setTestWaModal(false);
        loadSettings();
      }
    } catch (err) {
      showToast(err.message || 'Failed to test WhatsApp connection', 'error');
    } finally {
      setTestWaLoading(false);
    }
  };

  // Trigger Manual Database Backup
  const handleTriggerBackup = async () => {
    if (!window.confirm('Create a live database backup snapshot right now?')) return;
    setBackupLoading(true);
    try {
      const res = await settingsService.triggerBackup();
      if (res.success) {
        showToast(res.message || 'Database snapshot created successfully!');
        loadSettings();
      }
    } catch (err) {
      showToast(err.message || 'Failed to trigger backup snapshot', 'error');
    } finally {
      setBackupLoading(false);
    }
  };

  // Navigation Items
  const navTabs = [
    { id: 'company', label: 'Company', icon: Building2, desc: 'Legal entity, branding & banking' },
    { id: 'financialYear', label: 'Financial Year', icon: Calendar, desc: 'Active FY & sequence numbering' },
    { id: 'taxes', label: 'Taxes', icon: Percent, desc: 'GST slabs & TDS rate rules' },
    { id: 'paymentGateway', label: 'Payment Gateway', icon: CreditCard, desc: 'Razorpay, PayU & UPI QR' },
    { id: 'email', label: 'Email', icon: Mail, desc: 'SMTP dispatcher & notifications' },
    { id: 'whatsappApi', label: 'WhatsApp API', icon: MessageSquare, desc: 'Meta Cloud API & webhook' },
    { id: 'backup', label: 'Backup', icon: HardDrive, desc: 'Database snapshots & S3 sync' },
    { id: 'systemPreferences', label: 'System Preferences', icon: Sliders, desc: 'Currency, 5-day agent window & formats' },
  ];

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px', color: '#1a73e8' }} />
        <p style={{ fontWeight: '600', fontSize: '0.95rem' }}>Loading Krishna Valley ERP System Settings...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toast Alert */}
      {toast.message && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 9999,
            padding: '14px 22px',
            borderRadius: '12px',
            backgroundColor: toast.type === 'error' ? '#ba1a1a' : '#0d904f',
            color: '#ffffff',
            fontWeight: '600',
            fontSize: '0.9rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1b5e20 0%, #2e7d32 60%, #43a047 100%)',
          borderRadius: '20px',
          padding: '28px 32px',
          color: '#ffffff',
          boxShadow: '0 12px 36px rgba(27, 94, 32, 0.25)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div style={{ maxWidth: '650px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '20px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(8px)',
                fontSize: '0.78rem',
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              <SettingsIcon size={14} />
              Module 14 • System Governance
            </span>
          </div>
          <h1 style={{ margin: '0 0 6px', fontSize: '1.85rem', fontWeight: '800', letterSpacing: '-0.02em' }}>
            System Settings & Administration
          </h1>
          <p style={{ margin: 0, fontSize: '0.92rem', color: '#e8f5e9', lineHeight: 1.5 }}>
            Configure company legal profiles, active financial years, GST/TDS tax matrices, payment gateways, live SMTP & WhatsApp APIs, database backups, and global ERP policies.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={loadSettings}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: '#ffffff',
              fontWeight: '700',
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <RefreshCw size={16} />
            <span>Reload</span>
          </button>
        </div>
      </div>

      {/* Main Settings Grid: Navigation Left + Form Panel Right */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '280px 1fr',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* Navigation Sidebar */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '18px',
            border: '1px solid #e2e8f0',
            padding: '12px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: isActive ? '#e8f5e9' : 'transparent',
                  color: isActive ? '#1b5e20' : '#475569',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: isActive ? '#2e7d32' : '#f1f5f9',
                    color: isActive ? '#ffffff' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={18} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: isActive ? '800' : '600' }}>
                    {tab.label}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: isActive ? '#2e7d32' : '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {tab.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Settings Content Area */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '18px',
            border: '1px solid #e2e8f0',
            padding: '28px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
          }}
        >
          {/* ========================================================================= */}
          {/* 1. COMPANY PROFILE                                                        */}
          {/* ========================================================================= */}
          {activeTab === 'company' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                <div>
                  <h2 style={{ margin: '0 0 4px', fontSize: '1.3rem', fontWeight: '800', color: '#0f172a' }}>
                    Company Profile & Legal Entity
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                    Configure official branding, statutory registrations (CIN, GSTIN, PAN), and banking passbook details.
                  </p>
                </div>
                <button
                  onClick={() => handleSaveSection('company', companyForm)}
                  disabled={saving}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    borderRadius: '10px',
                    backgroundColor: '#1b5e20',
                    color: '#ffffff',
                    fontWeight: '700',
                    fontSize: '0.88rem',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <Save size={16} />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>

              {/* Branding */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Company Display Name
                  </label>
                  <input
                    type="text"
                    value={companyForm.companyName || ''}
                    onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Legal Registered Entity Name
                  </label>
                  <input
                    type="text"
                    value={companyForm.legalName || ''}
                    onChange={(e) => setCompanyForm({ ...companyForm, legalName: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Brand Name / Trademark
                  </label>
                  <input
                    type="text"
                    value={companyForm.brandName || ''}
                    onChange={(e) => setCompanyForm({ ...companyForm, brandName: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              {/* Statutory Registrations */}
              <div style={{ backgroundColor: '#f8fafc', padding: '18px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 14px', fontSize: '0.92rem', fontWeight: '800', color: '#1e293b' }}>
                  Statutory & Tax Compliance Numbers
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>CIN Number</label>
                    <input
                      type="text"
                      value={companyForm.cin || ''}
                      onChange={(e) => setCompanyForm({ ...companyForm, cin: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>GSTIN Number</label>
                    <input
                      type="text"
                      value={companyForm.gstin || ''}
                      onChange={(e) => setCompanyForm({ ...companyForm, gstin: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>PAN Card Number</label>
                    <input
                      type="text"
                      value={companyForm.pan || ''}
                      onChange={(e) => setCompanyForm({ ...companyForm, pan: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>RERA Registration</label>
                    <input
                      type="text"
                      value={companyForm.reraNumber || ''}
                      onChange={(e) => setCompanyForm({ ...companyForm, reraNumber: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
              </div>

              {/* Address & Contact */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Registered Office Address</label>
                  <input
                    type="text"
                    value={companyForm.address?.addressLine1 || ''}
                    onChange={(e) => setCompanyForm({ ...companyForm, address: { ...companyForm.address, addressLine1: e.target.value } })}
                    placeholder="Address Line 1"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', marginBottom: '8px' }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input
                      type="text"
                      value={companyForm.address?.city || ''}
                      onChange={(e) => setCompanyForm({ ...companyForm, address: { ...companyForm.address, city: e.target.value } })}
                      placeholder="City"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                    <input
                      type="text"
                      value={companyForm.address?.pincode || ''}
                      onChange={(e) => setCompanyForm({ ...companyForm, address: { ...companyForm.address, pincode: e.target.value } })}
                      placeholder="Pincode"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                {/* Bank Escrow Details */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Escrow Bank Account (RERA)</label>
                  <input
                    type="text"
                    value={companyForm.bankDetails?.bankName || ''}
                    onChange={(e) => setCompanyForm({ ...companyForm, bankDetails: { ...companyForm.bankDetails, bankName: e.target.value } })}
                    placeholder="Bank Name (e.g. HDFC Bank)"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', marginBottom: '8px' }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input
                      type="text"
                      value={companyForm.bankDetails?.accountNumber || ''}
                      onChange={(e) => setCompanyForm({ ...companyForm, bankDetails: { ...companyForm.bankDetails, accountNumber: e.target.value } })}
                      placeholder="Account Number"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                    <input
                      type="text"
                      value={companyForm.bankDetails?.ifscCode || ''}
                      onChange={(e) => setCompanyForm({ ...companyForm, bankDetails: { ...companyForm.bankDetails, ifscCode: e.target.value } })}
                      placeholder="IFSC Code"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. FINANCIAL YEAR                                                         */}
          {/* ========================================================================= */}
          {activeTab === 'financialYear' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                <div>
                  <h2 style={{ margin: '0 0 4px', fontSize: '1.3rem', fontWeight: '800', color: '#0f172a' }}>
                    Financial Year & Sequence Numbering
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                    Configure the active accounting period, year-end lock periods, and invoice/receipt numbering series.
                  </p>
                </div>
                <button
                  onClick={() => handleSaveSection('financialYear', fyForm)}
                  disabled={saving}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    borderRadius: '10px',
                    backgroundColor: '#1b5e20',
                    color: '#ffffff',
                    fontWeight: '700',
                    fontSize: '0.88rem',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <Save size={16} />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>

              {/* Active FY Card */}
              <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '18px 22px', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#166534', fontWeight: '700', textTransform: 'uppercase' }}>Current Active Accounting Year</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#14532d', marginTop: '2px' }}>
                    FY {fyForm.activeFY || '2025-2026'}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#15803d', marginTop: '4px' }}>
                    Period: 01-Apr-2025 to 31-Mar-2026 • Transactions & Demand Letters are mapped to this period
                  </div>
                </div>
                <select
                  value={fyForm.activeFY || '2025-2026'}
                  onChange={(e) => setFyForm({ ...fyForm, activeFY: e.target.value })}
                  style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid #86efac', backgroundColor: '#ffffff', fontWeight: '700', fontSize: '0.9rem', color: '#166534' }}
                >
                  <option value="2024-2025">FY 2024 - 2025</option>
                  <option value="2025-2026">FY 2025 - 2026 (Active)</option>
                  <option value="2026-2027">FY 2026 - 2027 (Upcoming)</option>
                </select>
              </div>

              {/* Document Numbering Prefixes */}
              <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 14px', fontSize: '0.95rem', fontWeight: '800', color: '#1e293b' }}>
                  Document Serial Numbering Prefixes
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>Invoice Series Prefix</label>
                    <input
                      type="text"
                      value={fyForm.sequencePrefixes?.invoicePrefix || 'KV-INV-'}
                      onChange={(e) => setFyForm({ ...fyForm, sequencePrefixes: { ...fyForm.sequencePrefixes, invoicePrefix: e.target.value } })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>Payment Receipt Prefix</label>
                    <input
                      type="text"
                      value={fyForm.sequencePrefixes?.receiptPrefix || 'KV-REC-'}
                      onChange={(e) => setFyForm({ ...fyForm, sequencePrefixes: { ...fyForm.sequencePrefixes, receiptPrefix: e.target.value } })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>Demand Letter Prefix</label>
                    <input
                      type="text"
                      value={fyForm.sequencePrefixes?.demandLetterPrefix || 'KV-DL-'}
                      onChange={(e) => setFyForm({ ...fyForm, sequencePrefixes: { ...fyForm.sequencePrefixes, demandLetterPrefix: e.target.value } })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>Maintenance Bill Prefix</label>
                    <input
                      type="text"
                      value={fyForm.sequencePrefixes?.maintenancePrefix || 'KV-MAINT-'}
                      onChange={(e) => setFyForm({ ...fyForm, sequencePrefixes: { ...fyForm.sequencePrefixes, maintenancePrefix: e.target.value } })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 3. TAXES (GST & TDS)                                                      */}
          {/* ========================================================================= */}
          {activeTab === 'taxes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                <div>
                  <h2 style={{ margin: '0 0 4px', fontSize: '1.3rem', fontWeight: '800', color: '#0f172a' }}>
                    Taxes, GST Slabs & TDS Rules
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                    Indian Real Estate GST rates (5% Residential, 18% Commercial) and TDS withholding rules under Section 194-IA / 194C / 194H.
                  </p>
                </div>
                <button
                  onClick={() => handleSaveSection('taxes', taxForm)}
                  disabled={saving}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    borderRadius: '10px',
                    backgroundColor: '#1b5e20',
                    color: '#ffffff',
                    fontWeight: '700',
                    fontSize: '0.88rem',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <Save size={16} />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>

              {/* GST Slabs Table */}
              <div>
                <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: '800', color: '#1e293b' }}>
                  Goods & Services Tax (GST) Slabs
                </h4>
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>
                        <th style={{ padding: '12px 16px' }}>Category / Property Type</th>
                        <th style={{ padding: '12px 16px' }}>Total GST</th>
                        <th style={{ padding: '12px 16px' }}>CGST</th>
                        <th style={{ padding: '12px 16px' }}>SGST</th>
                        <th style={{ padding: '12px 16px' }}>IGST</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(taxForm.gstSlabs || []).map((slab, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 16px', fontWeight: '700', color: '#0f172a' }}>
                            {slab.label}
                            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '400', marginTop: '2px' }}>{slab.description}</div>
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: '800', color: '#1b5e20' }}>{slab.rate}%</td>
                          <td style={{ padding: '12px 16px', color: '#334155' }}>{slab.cgst}%</td>
                          <td style={{ padding: '12px 16px', color: '#334155' }}>{slab.sgst}%</td>
                          <td style={{ padding: '12px 16px', color: '#334155' }}>{slab.igst}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* TDS Rules Table */}
              <div>
                <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: '800', color: '#1e293b' }}>
                  Tax Deducted at Source (TDS) Withholding Matrix
                </h4>
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>
                        <th style={{ padding: '12px 16px' }}>Section</th>
                        <th style={{ padding: '12px 16px' }}>Description</th>
                        <th style={{ padding: '12px 16px' }}>TDS Rate</th>
                        <th style={{ padding: '12px 16px' }}>Threshold Limit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(taxForm.tdsRules || []).map((rule, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 16px', fontWeight: '800', color: '#1e293b' }}>{rule.section}</td>
                          <td style={{ padding: '12px 16px', color: '#334155' }}>{rule.label}</td>
                          <td style={{ padding: '12px 16px', fontWeight: '800', color: '#0d904f' }}>{rule.rate}%</td>
                          <td style={{ padding: '12px 16px', color: '#64748b' }}>₹{(rule.threshold || 0).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 4. PAYMENT GATEWAY                                                        */}
          {/* ========================================================================= */}
          {activeTab === 'paymentGateway' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                <div>
                  <h2 style={{ margin: '0 0 4px', fontSize: '1.3rem', fontWeight: '800', color: '#0f172a' }}>
                    Payment Gateway Configurations
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                    Manage online payment gateways (Razorpay, PayU, Cashfree) and direct UPI QR collections.
                  </p>
                </div>
                <button
                  onClick={() => handleSaveSection('paymentGateway', pgForm)}
                  disabled={saving}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    borderRadius: '10px',
                    backgroundColor: '#1b5e20',
                    color: '#ffffff',
                    fontWeight: '700',
                    fontSize: '0.88rem',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <Save size={16} />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>

              {/* Active Selector & Mode */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Primary Online Payment Gateway</label>
                  <select
                    value={pgForm.activeGateway || 'razorpay'}
                    onChange={(e) => setPgForm({ ...pgForm, activeGateway: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', backgroundColor: '#ffffff' }}
                  >
                    <option value="razorpay">Razorpay (Recommended for India)</option>
                    <option value="payu">PayU Money</option>
                    <option value="cashfree">Cashfree Payments</option>
                    <option value="stripe">Stripe Payments</option>
                    <option value="offline">Bank Transfer / UPI Offline Only</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Gateway Environment Mode</label>
                  <select
                    value={pgForm.environment || 'test'}
                    onChange={(e) => setPgForm({ ...pgForm, environment: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', backgroundColor: '#ffffff' }}
                  >
                    <option value="test">Sandbox / Test Mode</option>
                    <option value="live">Live Production Mode</option>
                  </select>
                </div>
              </div>

              {/* Razorpay Credentials Card */}
              <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 14px', fontSize: '0.95rem', fontWeight: '800', color: '#1e293b' }}>
                  Razorpay API Credentials
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>Key ID</label>
                    <input
                      type="text"
                      value={pgForm.razorpay?.keyId || ''}
                      onChange={(e) => setPgForm({ ...pgForm, razorpay: { ...pgForm.razorpay, keyId: e.target.value } })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>Key Secret</label>
                    <input
                      type="password"
                      value={pgForm.razorpay?.keySecret || ''}
                      onChange={(e) => setPgForm({ ...pgForm, razorpay: { ...pgForm.razorpay, keySecret: e.target.value } })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>Webhook Secret</label>
                    <input
                      type="text"
                      value={pgForm.razorpay?.webhookSecret || ''}
                      onChange={(e) => setPgForm({ ...pgForm, razorpay: { ...pgForm.razorpay, webhookSecret: e.target.value } })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 5. EMAIL (SMTP)                                                           */}
          {/* ========================================================================= */}
          {activeTab === 'email' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                <div>
                  <h2 style={{ margin: '0 0 4px', fontSize: '1.3rem', fontWeight: '800', color: '#0f172a' }}>
                    Email Server & SMTP Dispatcher
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                    Configure the SMTP email server for automated demand letters, payment receipts, and staff alerts.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setTestEmailModal(true)}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '10px',
                      backgroundColor: '#f1f5f9',
                      color: '#1e293b',
                      fontWeight: '700',
                      fontSize: '0.85rem',
                      border: '1px solid #cbd5e1',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Send size={15} />
                    <span>Send Test Email</span>
                  </button>
                  <button
                    onClick={() => handleSaveSection('email', emailForm)}
                    disabled={saving}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 20px',
                      borderRadius: '10px',
                      backgroundColor: '#1b5e20',
                      color: '#ffffff',
                      fontWeight: '700',
                      fontSize: '0.88rem',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <Save size={16} />
                    <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </div>

              {/* SMTP Settings */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>SMTP Host Server</label>
                  <input
                    type="text"
                    value={emailForm.smtp?.host || ''}
                    onChange={(e) => setEmailForm({ ...emailForm, smtp: { ...emailForm.smtp, host: e.target.value } })}
                    placeholder="e.g. smtp.gmail.com"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>SMTP Port</label>
                  <input
                    type="number"
                    value={emailForm.smtp?.port || 587}
                    onChange={(e) => setEmailForm({ ...emailForm, smtp: { ...emailForm.smtp, port: Number(e.target.value) } })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Sender From Email</label>
                  <input
                    type="email"
                    value={emailForm.smtp?.fromEmail || ''}
                    onChange={(e) => setEmailForm({ ...emailForm, smtp: { ...emailForm.smtp, fromEmail: e.target.value } })}
                    placeholder="notifications@krishnavalley.com"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Sender Display Name</label>
                  <input
                    type="text"
                    value={emailForm.smtp?.fromName || ''}
                    onChange={(e) => setEmailForm({ ...emailForm, smtp: { ...emailForm.smtp, fromName: e.target.value } })}
                    placeholder="Krishna Valley ERP"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 6. WHATSAPP API                                                           */}
          {/* ========================================================================= */}
          {activeTab === 'whatsappApi' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                <div>
                  <h2 style={{ margin: '0 0 4px', fontSize: '1.3rem', fontWeight: '800', color: '#0f172a' }}>
                    WhatsApp Business Cloud API
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                    Connect your verified Meta WhatsApp Business Account for automated customer and tenant messaging.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setTestWaModal(true)}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '10px',
                      backgroundColor: '#f1f5f9',
                      color: '#1e293b',
                      fontWeight: '700',
                      fontSize: '0.85rem',
                      border: '1px solid #cbd5e1',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Zap size={15} />
                    <span>Test API Connection</span>
                  </button>
                  <button
                    onClick={() => handleSaveSection('whatsappApi', waForm)}
                    disabled={saving}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 20px',
                      borderRadius: '10px',
                      backgroundColor: '#1b5e20',
                      color: '#ffffff',
                      fontWeight: '700',
                      fontSize: '0.88rem',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <Save size={16} />
                    <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </div>

              {/* Cloud API Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Phone Number ID</label>
                  <input
                    type="text"
                    value={waForm.cloudApi?.phoneNumberId || ''}
                    onChange={(e) => setWaForm({ ...waForm, cloudApi: { ...waForm.cloudApi, phoneNumberId: e.target.value } })}
                    placeholder="109876543210987"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>WABA Account ID</label>
                  <input
                    type="text"
                    value={waForm.cloudApi?.wabaId || ''}
                    onChange={(e) => setWaForm({ ...waForm, cloudApi: { ...waForm.cloudApi, wabaId: e.target.value } })}
                    placeholder="209876543210987"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Permanent System User Access Token</label>
                  <input
                    type="password"
                    value={waForm.cloudApi?.accessToken || ''}
                    onChange={(e) => setWaForm({ ...waForm, cloudApi: { ...waForm.cloudApi, accessToken: e.target.value } })}
                    placeholder="EAAG..."
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 7. BACKUP & RECOVERY                                                      */}
          {/* ========================================================================= */}
          {activeTab === 'backup' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                <div>
                  <h2 style={{ margin: '0 0 4px', fontSize: '1.3rem', fontWeight: '800', color: '#0f172a' }}>
                    Database Backup & Cloud Snapshots
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                    Create instant full-system JSON snapshots or configure scheduled cloud backups to AWS S3.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={handleTriggerBackup}
                    disabled={backupLoading}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '10px',
                      backgroundColor: '#1b5e20',
                      color: '#ffffff',
                      fontWeight: '700',
                      fontSize: '0.88rem',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <HardDrive size={16} />
                    <span>{backupLoading ? 'Creating Snapshot...' : 'Create Backup Snapshot Now'}</span>
                  </button>

                  <a
                    href={settingsService.getExportUrl()}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: '10px 16px',
                      borderRadius: '10px',
                      backgroundColor: '#f1f5f9',
                      color: '#1e293b',
                      fontWeight: '700',
                      fontSize: '0.88rem',
                      border: '1px solid #cbd5e1',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <Download size={16} />
                    <span>Download JSON Export</span>
                  </a>
                </div>
              </div>

              {/* Backup History Table */}
              <div>
                <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: '800', color: '#1e293b' }}>
                  Snapshot Ledger & Recovery History
                </h4>
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>
                        <th style={{ padding: '12px 16px' }}>Snapshot ID</th>
                        <th style={{ padding: '12px 16px' }}>Timestamp</th>
                        <th style={{ padding: '12px 16px' }}>Records Backed Up</th>
                        <th style={{ padding: '12px 16px' }}>Size</th>
                        <th style={{ padding: '12px 16px' }}>Triggered By</th>
                        <th style={{ padding: '12px 16px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(backupForm.backupHistory || []).map((bkp, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 16px', fontWeight: '800', color: '#0f172a' }}>{bkp.backupId}</td>
                          <td style={{ padding: '12px 16px', color: '#475569' }}>
                            {new Date(bkp.timestamp).toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: '700', color: '#1b5e20' }}>
                            {bkp.totalRecords || 142} entities
                          </td>
                          <td style={{ padding: '12px 16px', color: '#64748b' }}>
                            {((bkp.sizeBytes || 482910) / 1024).toFixed(1)} KB
                          </td>
                          <td style={{ padding: '12px 16px', color: '#334155' }}>{bkp.triggeredBy}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '6px', backgroundColor: '#e8f5e9', color: '#1b5e20', fontWeight: '700', fontSize: '0.75rem' }}>
                              Completed ✓
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 8. SYSTEM PREFERENCES                                                     */}
          {/* ========================================================================= */}
          {activeTab === 'systemPreferences' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                <div>
                  <h2 style={{ margin: '0 0 4px', fontSize: '1.3rem', fontWeight: '800', color: '#0f172a' }}>
                    System Preferences & Global ERP Policies
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                    Configure Indian Rupee formatting, date standards, session timeouts, and the 5-day agent maturity window.
                  </p>
                </div>
                <button
                  onClick={() => handleSaveSection('systemPreferences', prefForm)}
                  disabled={saving}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    borderRadius: '10px',
                    backgroundColor: '#1b5e20',
                    color: '#ffffff',
                    fontWeight: '700',
                    fontSize: '0.88rem',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <Save size={16} />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>

              {/* Agent 5-Day Maturity Window Setting Card */}
              <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '20px', borderRadius: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <Clock size={20} style={{ color: '#1d4ed8' }} />
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: '#1e40af' }}>
                    Channel Partner Agent Maturity Time Limit Policy
                  </h4>
                </div>
                <p style={{ margin: '0 0 14px', fontSize: '0.85rem', color: '#1e3a8a', lineHeight: 1.4 }}>
                  Defines how many exclusive days an Agent has post site-visit to convert a lead before the lead automatically hands over to the inhouse CRM sales team and unclosed commission is debited.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={prefForm.agentMaturityWindowDays || 5}
                    onChange={(e) => setPrefForm({ ...prefForm, agentMaturityWindowDays: Number(e.target.value) })}
                    style={{ width: '100px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #93c5fd', fontSize: '0.95rem', fontWeight: '700', textAlign: 'center' }}
                  />
                  <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1e40af' }}>Days Exclusive Window (Default: 5 Days)</span>
                </div>
              </div>

              {/* Locale & Formats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Currency Symbol & Code</label>
                  <input
                    type="text"
                    value="₹ INR (Indian Rupee)"
                    disabled
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', backgroundColor: '#f1f5f9', color: '#64748b' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Date Format</label>
                  <select
                    value={prefForm.dateFormat || 'DD/MM/YYYY'}
                    onChange={(e) => setPrefForm({ ...prefForm, dateFormat: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', backgroundColor: '#ffffff' }}
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY (Indian Standard)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (ISO Standard)</option>
                    <option value="DD-MMM-YYYY">DD-MMM-YYYY (e.g. 24-Aug-2026)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Default Main Branch</label>
                  <input
                    type="text"
                    value={prefForm.defaultBranch || 'Vrindavan Campus'}
                    onChange={(e) => setPrefForm({ ...prefForm, defaultBranch: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Test Email Modal */}
      {testEmailModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', maxWidth: '440px', width: '100%' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: '800' }}>Send Test Email</h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: '#64748b' }}>Verify SMTP delivery by sending a test alert.</p>
            <form onSubmit={handleTestEmail}>
              <input
                type="email"
                required
                placeholder="Recipient Email Address"
                value={testEmailRecipient}
                onChange={(e) => setTestEmailRecipient(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', marginBottom: '16px' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setTestEmailModal(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}>Cancel</button>
                <button type="submit" disabled={testEmailLoading} style={{ padding: '8px 18px', borderRadius: '8px', backgroundColor: '#1b5e20', color: '#ffffff', border: 'none', fontWeight: '700' }}>
                  {testEmailLoading ? 'Sending...' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Test WhatsApp Modal */}
      {testWaModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', maxWidth: '440px', width: '100%' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: '800' }}>Test WhatsApp Cloud API</h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: '#64748b' }}>Send a test payload to verify Meta API connection.</p>
            <form onSubmit={handleTestWhatsApp}>
              <input
                type="text"
                required
                placeholder="+91 98765 43210"
                value={testWaNumber}
                onChange={(e) => setTestWaNumber(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', marginBottom: '16px' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setTestWaModal(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}>Cancel</button>
                <button type="submit" disabled={testWaLoading} style={{ padding: '8px 18px', borderRadius: '8px', backgroundColor: '#1b5e20', color: '#ffffff', border: 'none', fontWeight: '700' }}>
                  {testWaLoading ? 'Connecting...' : 'Test Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
