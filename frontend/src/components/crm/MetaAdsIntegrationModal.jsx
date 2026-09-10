import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { leadService } from '../../services/leadService.js';
import {
  Sparkles,
  Copy,
  Check,
  Zap,
  Globe,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Play,
  Settings,
  ShieldCheck,
  Send,
  RefreshCw,
} from 'lucide-react';

export const MetaAdsIntegrationModal = ({
  isOpen,
  onClose,
  onLeadIngested,
}) => {
  const [activeTab, setActiveTab] = useState('test'); // 'test' | 'config'
  const [config, setConfig] = useState({
    enabled: true,
    pageAccessToken: '',
    appId: '',
    appSecret: '',
    pageId: '',
    formId: '',
    verifyToken: 'krishna_valley_meta_lead_token_2026',
    autoRoundRobin: true,
  });

  const [copiedKey, setCopiedKey] = useState('');
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [ingestingTest, setIngestingTest] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Simulator Test Form Data
  const [testLead, setTestLead] = useState({
    name: 'Vikram Malhotra',
    mobileNo: '9876543210',
    email: 'vikram.malhotra@gmail.com',
    city: 'Raipur',
    state: 'Chhattisgarh',
    country: 'India',
    requirement: '3 BHK Luxury Apartment',
    budget: '7500000',
    timeline: 'Immediate / Within 15 Days',
    paymentPlan: 'Self-Funded / Partial Bank Loan',
    purpose: 'Family Home & Investment',
  });

  const webhookUrl = `${window.location.origin.replace('5173', '5000')}/api/leads/meta-webhook`;

  const fetchConfig = async () => {
    try {
      setLoadingConfig(true);
      const res = await leadService.getMetaConfig();
      if (res.data) {
        setConfig((prev) => ({ ...prev, ...res.data }));
      }
    } catch (err) {
      console.error('Error fetching Meta config:', err);
    } finally {
      setLoadingConfig(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
      setSuccessMessage('');
      setErrorMessage('');
    }
  }, [isOpen]);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2000);
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    try {
      setSavingConfig(true);
      setSuccessMessage('');
      setErrorMessage('');
      await leadService.updateMetaConfig(config);
      setSuccessMessage('Meta Ads configuration saved successfully!');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save configuration');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTestIngestion = async (e) => {
    e.preventDefault();
    try {
      setIngestingTest(true);
      setSuccessMessage('');
      setErrorMessage('');

      const res = await leadService.testMetaLead({
        name: testLead.name,
        mobileNo: testLead.mobileNo,
        email: testLead.email,
        city: testLead.city,
        state: testLead.state,
        country: testLead.country,
        requirement: testLead.requirement,
        budget: testLead.budget,
        timeline: testLead.timeline,
        paymentPlan: testLead.paymentPlan,
        purpose: testLead.purpose,
      });

      const assignedRep = res.data?.assignedTo
        ? `${res.data.assignedTo.firstName || res.data.assignedTo.username}`
        : 'Sales Team';

      setSuccessMessage(
        `🎉 Test Meta Lead "${testLead.name}" ingested successfully! Auto-assigned to @${assignedRep} via 1-by-1 Round-Robin.`
      );

      if (onLeadIngested) onLeadIngested();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to ingest test lead');
    } finally {
      setIngestingTest(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Meta Ads (Facebook & Instagram) Direct Integration"
      maxWidth="680px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('test')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'test' ? '#1a73e8' : '#f1f5f9',
              color: activeTab === 'test' ? '#ffffff' : '#475569',
              fontWeight: '700',
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Play size={13} />
            ⚡ Test Meta Lead Ingestion
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('config')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'config' ? '#1a73e8' : '#f1f5f9',
              color: activeTab === 'config' ? '#ffffff' : '#475569',
              fontWeight: '700',
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Settings size={13} />
            ⚙️ Webhook & API Credentials
          </button>
        </div>

        {/* Notifications */}
        {successMessage && (
          <div style={{
            padding: '10px 14px',
            background: '#dcfce7',
            border: '1px solid #86efac',
            borderRadius: '8px',
            color: '#15803d',
            fontSize: '0.82rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <CheckCircle2 size={16} />
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div style={{
            padding: '10px 14px',
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: '8px',
            color: '#b91c1c',
            fontSize: '0.82rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <AlertCircle size={16} />
            {errorMessage}
          </div>
        )}

        {/* TAB 1: TEST & INGEST SIMULATOR */}
        {activeTab === 'test' && (
          <form onSubmit={handleTestIngestion} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              color: '#1e40af',
            }}>
              <strong>⚡ Live Meta Ad Simulator:</strong> Simulate an instant form lead coming from your active Facebook or Instagram advertisement. The lead will be captured with all client location data and custom form questions, and automatically assigned to the sales team one-by-one via Round-Robin!
            </div>

            {/* Section 1: Standard Client Fields */}
            <div>
              <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                1. Standard Prospect Details
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginTop: '6px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b' }}>Full Name *</label>
                  <input
                    type="text"
                    required
                    value={testLead.name}
                    onChange={(e) => setTestLead({ ...testLead, name: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b' }}>Mobile Number *</label>
                  <input
                    type="text"
                    required
                    value={testLead.mobileNo}
                    onChange={(e) => setTestLead({ ...testLead, mobileNo: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b' }}>Email Address</label>
                  <input
                    type="email"
                    value={testLead.email}
                    onChange={(e) => setTestLead({ ...testLead, email: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Location Data */}
            <div>
              <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                2. Client Geographic Location
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '6px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b' }}>City</label>
                  <input
                    type="text"
                    value={testLead.city}
                    onChange={(e) => setTestLead({ ...testLead, city: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b' }}>State</label>
                  <input
                    type="text"
                    value={testLead.state}
                    onChange={(e) => setTestLead({ ...testLead, state: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b' }}>Country</label>
                  <input
                    type="text"
                    value={testLead.country}
                    onChange={(e) => setTestLead({ ...testLead, country: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Meta Instant Form Custom Questions */}
            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <HelpCircle size={14} color="#0284c7" />
                3. Meta Ad Form Questions & Answers (Stored in Custom Questions Box)
              </span>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '8px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#475569' }}>Q: Preferred Unit / BHK</label>
                  <input
                    type="text"
                    value={testLead.requirement}
                    onChange={(e) => setTestLead({ ...testLead, requirement: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#475569' }}>Q: Expected Budget</label>
                  <input
                    type="text"
                    value={testLead.budget}
                    onChange={(e) => setTestLead({ ...testLead, budget: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#475569' }}>Q: Purchase Timeline</label>
                  <input
                    type="text"
                    value={testLead.timeline}
                    onChange={(e) => setTestLead({ ...testLead, timeline: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#475569' }}>Q: Purpose of Purchase</label>
                  <input
                    type="text"
                    value={testLead.purpose}
                    onChange={(e) => setTestLead({ ...testLead, purpose: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                style={{ padding: '8px 16px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={ingestingTest}
                className="btn-primary"
                style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Send size={14} />
                {ingestingTest ? 'Ingesting Lead...' : '🚀 Ingest Meta Ad Lead Now'}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: WEBHOOK & CREDENTIALS */}
        {activeTab === 'config' && (
          <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '12px 14px',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: '800', color: '#0f172a' }}>
                  Meta Webhook Callback URL (Paste in Meta Developer App)
                </label>
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                  <input
                    type="text"
                    readOnly
                    value={webhookUrl}
                    style={{ flex: 1, padding: '7px 10px', background: '#ffffff', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', color: '#334155' }}
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(webhookUrl, 'url')}
                    style={{ padding: '7px 12px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.76rem', fontWeight: '700' }}
                  >
                    {copiedKey === 'url' ? <Check size={13} color="#16a34a" /> : <Copy size={13} />}
                    {copiedKey === 'url' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: '800', color: '#0f172a' }}>
                  Webhook Verify Token (Hub Challenge Token)
                </label>
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                  <input
                    type="text"
                    value={config.verifyToken}
                    onChange={(e) => setConfig({ ...config, verifyToken: e.target.value })}
                    style={{ flex: 1, padding: '7px 10px', background: '#ffffff', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', color: '#334155' }}
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(config.verifyToken, 'token')}
                    style={{ padding: '7px 12px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.76rem', fontWeight: '700' }}
                  >
                    {copiedKey === 'token' ? <Check size={13} color="#16a34a" /> : <Copy size={13} />}
                    {copiedKey === 'token' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            {/* Meta Page & App Credentials */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#475569' }}>Meta Page ID</label>
                <input
                  type="text"
                  placeholder="e.g. 102938475610293"
                  value={config.pageId}
                  onChange={(e) => setConfig({ ...config, pageId: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#475569' }}>Lead Form ID (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 556677889900112"
                  value={config.formId}
                  onChange={(e) => setConfig({ ...config, formId: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#475569' }}>
                  Meta System User Page Access Token (Graph API)
                </label>
                <input
                  type="password"
                  placeholder="EAA..."
                  value={config.pageAccessToken}
                  onChange={(e) => setConfig({ ...config, pageAccessToken: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
                <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '3px', display: 'block' }}>
                  Used to fetch complete question/answer field data directly from Facebook Graph API v21.0
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <input
                type="checkbox"
                id="autoRoundRobin"
                checked={config.autoRoundRobin}
                onChange={(e) => setConfig({ ...config, autoRoundRobin: e.target.checked })}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <label htmlFor="autoRoundRobin" style={{ fontSize: '0.82rem', fontWeight: '700', color: '#1e293b', cursor: 'pointer' }}>
                Automatically assign Meta Ads leads 1-by-1 sequentially via Round-Robin
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                style={{ padding: '8px 16px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingConfig}
                className="btn-primary"
                style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <ShieldCheck size={14} />
                {savingConfig ? 'Saving...' : 'Save Meta Configuration'}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
