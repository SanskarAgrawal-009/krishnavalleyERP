import React, { useState, useEffect } from 'react';
import { notificationService } from '../../services/notificationService.js';
import {
  MessageSquare,
  Smartphone,
  Mail,
  Bell,
  Send,
  Sparkles,
  User,
  Building2,
  CheckCircle,
  AlertCircle,
  Eye,
  RefreshCw,
  Clock,
  DollarSign,
  FileText,
  Sliders,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Zap,
  Users
} from 'lucide-react';

export const ModuleMessagingCenter = ({
  module = 'sales', // 'sales' | 'rentals'
  records = [], // list of salesLeads or rentals
  selectedRecordId = null,
  onRecordSelect = null
}) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Selected Target Record
  const [activeRecordId, setActiveRecordId] = useState(selectedRecordId || (records[0]?._id || records[0]?.id || ''));
  const [activeChannelPreview, setActiveChannelPreview] = useState('whatsapp');

  // Channels to send
  const [channels, setChannels] = useState({
    whatsapp: true,
    sms: true,
    email: true,
    push: false
  });

  // Dynamic Variable Overrides
  const [vars, setVars] = useState({});

  // Recipient details
  const [recipient, setRecipient] = useState({
    name: '',
    phone: '',
    email: ''
  });

  // Sending state
  const [dispatching, setDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState(null);
  const [dispatchError, setDispatchError] = useState(null);

  // History logs for this module
  const [moduleLogs, setModuleLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Load Templates matching module category
  const loadModuleTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const category = module === 'sales' ? 'Billing & Payments' : 'Rentals & Leases';
      const res = await notificationService.getTemplates({ category });
      if (res.data && res.data.length > 0) {
        setTemplates(res.data);
        setSelectedTemplate(res.data[0]);
      } else {
        // Fallback: get all templates
        const allRes = await notificationService.getTemplates({});
        if (allRes.data) {
          setTemplates(allRes.data);
          setSelectedTemplate(allRes.data[0] || null);
        }
      }
    } catch (err) {
      console.error('Error loading module templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Load Communication Logs
  const loadModuleLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await notificationService.getLogs({ limit: 30 });
      if (res.data) setModuleLogs(res.data);
    } catch (err) {
      console.error('Error loading logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadModuleTemplates();
    loadModuleLogs();
  }, [module]);

  useEffect(() => {
    if (selectedRecordId) {
      setActiveRecordId(selectedRecordId);
    }
  }, [selectedRecordId]);

  // Helper for safe currency and date formatting
  const safeINR = (num, fallback = '0') => {
    if (num === null || num === undefined || isNaN(Number(num))) return fallback;
    return Number(num).toLocaleString('en-IN');
  };

  const safeDate = (d) => {
    if (!d) return new Date().toLocaleDateString('en-IN');
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? new Date().toLocaleDateString('en-IN') : parsed.toLocaleDateString('en-IN');
  };

  useEffect(() => {
    if (!activeRecordId && records.length > 0) {
      setActiveRecordId(records[0]._id || records[0].id || '');
    }
  }, [records, activeRecordId]);

  // When active record or template changes, extract variables!
  useEffect(() => {
    const rec = records.find((r) => (r._id === activeRecordId || r.id === activeRecordId)) || records[0];
    if (rec) {
      if (module === 'sales') {
        // Sales Lead extraction
        const name = rec.customerName || rec.leadId?.name || rec.buyerName || 'Valued Buyer';
        const phone = rec.customerPhone || rec.leadId?.phone || rec.leadId?.mobileNo || rec.buyerPhone || '+91 98765 43210';
        const email = rec.customerEmail || rec.leadId?.email || rec.buyerEmail || 'buyer@example.com';
        const unit = rec.flatId?.unitNumber || rec.flatNumber || (rec.assignedFlat?.flatNumber ? `Flat ${rec.assignedFlat.flatNumber}` : 'Flat 101');
        const project = rec.projectId?.name || rec.assignedFlat?.projectId?.projectName || 'Krishna Valley';
        const total = rec.paymentPlan?.totalAmount || rec.booking?.bookingAmount || 5000000;
        const pending = rec.paymentPlan?.milestones?.find((m) => m.status === 'pending' || m.status === 'demand_issued');
        const amount = pending?.amount !== undefined ? pending.amount : 75000;
        const milestoneName = pending?.milestoneName || pending?.name || 'Plinth Level Slab';
        const dueDate = pending?.dueDate ? safeDate(pending.dueDate) : safeDate(Date.now() + 7 * 86400000);

        setRecipient({ name, phone, email });
        setVars({
          client_name: name,
          project_name: project,
          unit_number: unit,
          amount: safeINR(amount, '75,000'),
          due_date: dueDate,
          milestone_name: milestoneName,
          payment_link: `https://krishnavalley.com/pay/sl-${rec._id || rec.id || 'demo'}`,
          penalty_amount: '2,500',
          allotment_date: safeDate(rec.booking?.bookingDate || Date.now()),
          download_link: `https://krishnavalley.com/docs/allotment-${rec._id || 'demo'}.pdf`,
          rm_name: rec.leadId?.assignedAgent || rec.salesAgent || 'Sales Desk',
          contact_number: '+91 98765 00000'
        });
      } else if (module === 'rentals') {
        // Rental Contract extraction
        const tenant = rec.tenantAgreement?.tenantName || rec.customerId?.name || 'Priya Nair';
        const phone = rec.tenantAgreement?.tenantPhone || rec.customerId?.mobileNo || '+91 98765 43210';
        const email = rec.tenantAgreement?.tenantEmail || rec.customerId?.email || 'tenant@example.com';
        const unit = rec.flatId?.unitNumber || (rec.flatId?.flatNumber ? `Unit ${rec.flatId.flatNumber}` : 'Unit 302');
        const project = rec.projectId?.name || rec.flatId?.projectId?.projectName || 'Krishna Valley Luxury';
        const rentAmount = rec.tenantAgreement?.monthlyRent || 35000;
        const penalty = rec.penaltyRecords?.reduce((acc, p) => acc + (p.penaltyAmount || 0), 0) || 1500;
        const dueDate = rec.tenantAgreement?.rentDueDay ? `Day ${rec.tenantAgreement.rentDueDay} of month` : '5th of this month';

        setRecipient({ name: tenant, phone, email });
        setVars({
          client_name: tenant,
          project_name: project,
          unit_number: unit,
          amount: safeINR(rentAmount, '35,000'),
          penalty_amount: safeINR(penalty, '1,500'),
          due_date: dueDate,
          payment_link: `https://krishnavalley.com/rent/pay-${rec._id || 'demo'}`,
          month_year: new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
          ticket_id: rec.contractCode || 'KV-RENT-102',
          status: rec.status || 'Active'
        });
      }
    } else {
      // Manual default dummy values
      setRecipient({
        name: 'Rajesh Sharma',
        phone: '+91 98765 43210',
        email: 'rajesh.sharma@example.com'
      });
      setVars({
        client_name: 'Rajesh Sharma',
        project_name: 'Krishna Heights Luxury Residency',
        unit_number: 'Tower A - Flat 804',
        amount: '75,000',
        due_date: safeDate(Date.now() + 7 * 86400000),
        milestone_name: '5th Floor Slab Completion',
        payment_link: 'https://krishnavalley.com/pay/demo',
        penalty_amount: '2,500',
        allotment_date: safeDate(Date.now()),
        download_link: 'https://krishnavalley.com/docs/allotment-demo.pdf',
        rm_name: 'Amitabh Verma',
        contact_number: '+91 98765 00000',
        month_year: 'August 2026'
      });
    }
  }, [activeRecordId, records, module]);

  // Interpolate text
  const replaceVars = (text) => {
    if (!text) return '';
    return text.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (match, key) => {
      return vars[key] !== undefined ? vars[key] : match;
    });
  };

  // Dispatch Notification Handler
  const handleDispatch = async () => {
    if (!recipient.phone && !recipient.email) {
      alert('Please provide a recipient phone number or email.');
      return;
    }

    const enabledChannels = Object.keys(channels).filter((k) => channels[k]);
    if (enabledChannels.length === 0) {
      alert('Please select at least one delivery channel (WhatsApp, SMS, Email, Push).');
      return;
    }

    setDispatching(true);
    setDispatchResult(null);
    setDispatchError(null);

    try {
      const payload = {
        templateId: selectedTemplate?._id,
        templateCode: selectedTemplate?.templateCode,
        channels: enabledChannels,
        recipient: {
          name: recipient.name,
          phone: recipient.phone,
          email: recipient.email
        },
        variables: vars,
        metadata: {
          module,
          referenceId: activeRecordId
        }
      };

      const res = await notificationService.sendTemplateNotification(payload);
      setDispatchResult(res);
      loadModuleLogs();
    } catch (err) {
      setDispatchError(err.message || 'Failed to dispatch notification.');
    } finally {
      setDispatching(false);
    }
  };

  const selectedRecord = records.find((r) => (r._id === activeRecordId || r.id === activeRecordId));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Banner */}
      <div style={{
        background: module === 'sales'
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(17, 24, 39, 0.95) 100%)'
          : 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(17, 24, 39, 0.95) 100%)',
        border: '1px solid #dadce0',
        borderRadius: 'var(--radius-lg)',
        padding: '22px 26px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: module === 'sales'
              ? 'linear-gradient(135deg, #10b981, #059669)'
              : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#111827',
            boxShadow: 'var(--shadow-glow)'
          }}>
            <MessageSquare size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {module === 'sales' ? 'Buyer Messaging & Milestone Demands' : 'Tenant & Owner Messaging Hub'}
              <span style={{
                fontSize: '0.72rem',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '4px',
                background: 'rgba(255,255,255,0.1)',
                color: '#111827'
              }}>
                AUTOMATED TEMPLATES
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#374151', marginTop: '3px' }}>
              {module === 'sales'
                ? 'Send instant payment reminders, allotment letters, demand notices, and booking confirmations to property buyers.'
                : 'Send rent overdue alerts, monthly dues, lease renewal notices, and rent-back payment confirmations.'}
            </div>
          </div>
        </div>

        <button
          onClick={loadModuleTemplates}
          style={{
            padding: '7px 14px',
            background: '#f8f9fa',
            border: '1px solid #dadce0',
            borderRadius: 'var(--radius-sm)',
            color: '#374151',
            fontSize: '0.78rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={13} className={loadingTemplates ? 'spin' : ''} /> Refresh Templates
        </button>
      </div>

      {/* Main 2-Column Console Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
        
        {/* ================= COLUMN 1: TARGET SELECTION & TEMPLATE CONFIG ================= */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #dadce0',
          borderRadius: 'var(--radius-lg)',
          padding: '22px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px'
        }}>
          
          {/* Target Record Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: '#374151', marginBottom: '6px', fontWeight: '700' }}>
              {module === 'sales' ? '1. Select Buyer / Sales Record' : '1. Select Tenant / Rental Contract'}
            </label>
            <select
              value={activeRecordId}
              onChange={(e) => setActiveRecordId(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                background: '#f8f9fa',
                border: '1px solid #dadce0',
                borderRadius: 'var(--radius-sm)',
                color: '#111827',
                fontSize: '0.84rem',
                cursor: 'pointer'
              }}
            >
              {records.length === 0 ? (
                <option value="">No {module === 'sales' ? 'sales leads' : 'rental contracts'} found</option>
              ) : (
                records.map((r) => {
                  const id = r._id || r.id;
                  let label = '';
                  if (module === 'sales') {
                    const bName = r.customerName || r.leadId?.name || r.buyerName || 'Buyer';
                    const flat = r.flatId?.unitNumber || r.flatNumber || (r.assignedFlat?.flatNumber ? `Flat ${r.assignedFlat.flatNumber}` : 'Flat 101');
                    label = `${bName} — ${flat} (${r.salesStatus || 'booked'})`;
                  } else {
                    const tName = r.tenantAgreement?.tenantName || r.customerId?.name || 'Tenant';
                    const flat = r.flatId?.unitNumber || (r.flatId?.flatNumber ? `Unit ${r.flatId.flatNumber}` : 'Unit 302');
                    label = `${tName} — ${flat} (Rent: ₹${(r.tenantAgreement?.monthlyRent || 0).toLocaleString('en-IN')})`;
                  }
                  return (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  );
                })
              )}
            </select>
          </div>

          {/* Recipient Contact Card */}
          <div style={{
            background: '#f8f9fa',
            padding: '14px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid #dadce0',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '12px'
          }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#4b5563' }}>Recipient Name</div>
              <input
                type="text"
                value={recipient.name}
                onChange={(e) => {
                  setRecipient({ ...recipient, name: e.target.value });
                  setVars({ ...vars, client_name: e.target.value });
                }}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--border-subtle)',
                  color: '#111827',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  padding: '2px 0'
                }}
              />
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: '#4b5563' }}>WhatsApp / Mobile</div>
              <input
                type="text"
                value={recipient.phone}
                onChange={(e) => setRecipient({ ...recipient, phone: e.target.value })}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--border-subtle)',
                  color: '#25d366',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  padding: '2px 0'
                }}
              />
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: '#4b5563' }}>Email Address</div>
              <input
                type="text"
                value={recipient.email}
                onChange={(e) => setRecipient({ ...recipient, email: e.target.value })}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--border-subtle)',
                  color: '#fbbf24',
                  fontSize: '0.82rem',
                  padding: '2px 0'
                }}
              />
            </div>
          </div>

          {/* Template Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: '#374151', marginBottom: '6px', fontWeight: '700' }}>
              2. Choose Communication Template
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
              {templates.map((tpl) => (
                <div
                  key={tpl._id}
                  onClick={() => setSelectedTemplate(tpl)}
                  style={{
                    background: selectedTemplate?._id === tpl._id ? 'rgba(20, 184, 166, 0.15)' : 'var(--bg-card)',
                    border: selectedTemplate?._id === tpl._id ? '1px solid var(--primary-500)' : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 14px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: '700', color: selectedTemplate?._id === tpl._id ? 'var(--primary-500)' : '#fff' }}>
                      {tpl.templateName}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#4b5563', marginTop: '2px' }}>
                      {tpl.description || tpl.templateCode}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    {tpl.channels?.whatsapp && <span title="WhatsApp"><MessageSquare size={12} color="#25d366" /></span>}
                    {tpl.channels?.sms && <span title="SMS"><Smartphone size={12} color="#60a5fa" /></span>}
                    {tpl.channels?.email && <span title="Email"><Mail size={12} color="#fbbf24" /></span>}
                    {tpl.channels?.push && <span title="Push"><Bell size={12} color="#f472b6" /></span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dynamic Variable Customizer Table */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: '#374151', marginBottom: '6px', fontWeight: '700' }}>
              3. Dynamic Variables for this Message
            </label>
            <div style={{
              background: '#f8f9fa',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid #dadce0',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '10px'
            }}>
              {Object.keys(vars).map((key) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontFamily: 'monospace', color: '#4b5563' }}>
                    {`{{${key}}}`}
                  </label>
                  <input
                    type="text"
                    value={vars[key]}
                    onChange={(e) => setVars({ ...vars, [key]: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '5px 8px',
                      background: '#ffffff',
                      border: '1px solid #dadce0',
                      borderRadius: '4px',
                      color: '#111827',
                      fontSize: '0.78rem'
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Active Channels Checkboxes */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: '#374151', marginBottom: '8px', fontWeight: '700' }}>
              4. Select Dispatch Channels
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              <label style={{
                background: channels.whatsapp ? 'rgba(37, 211, 102, 0.15)' : 'var(--bg-card)',
                border: channels.whatsapp ? '1px solid #25d366' : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                fontSize: '0.78rem',
                fontWeight: '700',
                color: channels.whatsapp ? '#25d366' : 'var(--text-secondary)'
              }}>
                <input
                  type="checkbox"
                  checked={channels.whatsapp}
                  onChange={(e) => setChannels({ ...channels, whatsapp: e.target.checked })}
                  style={{ accentColor: '#25d366' }}
                />
                <MessageSquare size={14} /> WhatsApp
              </label>

              <label style={{
                background: channels.sms ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-card)',
                border: channels.sms ? '1px solid #3b82f6' : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                fontSize: '0.78rem',
                fontWeight: '700',
                color: channels.sms ? '#60a5fa' : 'var(--text-secondary)'
              }}>
                <input
                  type="checkbox"
                  checked={channels.sms}
                  onChange={(e) => setChannels({ ...channels, sms: e.target.checked })}
                  style={{ accentColor: '#3b82f6' }}
                />
                <Smartphone size={14} /> SMS
              </label>

              <label style={{
                background: channels.email ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-card)',
                border: channels.email ? '1px solid #f59e0b' : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                fontSize: '0.78rem',
                fontWeight: '700',
                color: channels.email ? '#fbbf24' : 'var(--text-secondary)'
              }}>
                <input
                  type="checkbox"
                  checked={channels.email}
                  onChange={(e) => setChannels({ ...channels, email: e.target.checked })}
                  style={{ accentColor: '#f59e0b' }}
                />
                <Mail size={14} /> Email
              </label>

              <label style={{
                background: channels.push ? 'rgba(236, 72, 153, 0.15)' : 'var(--bg-card)',
                border: channels.push ? '1px solid #ec4899' : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                fontSize: '0.78rem',
                fontWeight: '700',
                color: channels.push ? '#f472b6' : 'var(--text-secondary)'
              }}>
                <input
                  type="checkbox"
                  checked={channels.push}
                  onChange={(e) => setChannels({ ...channels, push: e.target.checked })}
                  style={{ accentColor: '#ec4899' }}
                />
                <Bell size={14} /> Push
              </label>
            </div>
          </div>

          {/* Feedback message */}
          {dispatchResult && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid #10b981',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              color: '#10b981',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <CheckCircle size={16} />
              {dispatchResult.message || 'Notification dispatched successfully!'}
            </div>
          )}

          {dispatchError && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid #ef4444',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              color: '#f87171',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <AlertCircle size={16} />
              {dispatchError}
            </div>
          )}

          {/* Send Button */}
          <button
            onClick={handleDispatch}
            disabled={dispatching}
            style={{
              padding: '12px 24px',
              background: module === 'sales'
                ? 'linear-gradient(135deg, #10b981, #059669)'
                : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              color: '#111827',
              fontSize: '0.92rem',
              fontWeight: '800',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-glow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {dispatching ? (
              <>
                <RefreshCw size={16} className="spin" /> Dispatching Notification...
              </>
            ) : (
              <>
                <Send size={16} /> Send Notification to {recipient.name || 'Recipient'}
              </>
            )}
          </button>
        </div>

        {/* ================= COLUMN 2: LIVE DEVICE PREVIEW ================= */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #dadce0',
          borderRadius: 'var(--radius-lg)',
          padding: '22px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#111827', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Eye size={16} color="var(--primary-500)" />
              Live Message Preview
            </div>

            {/* Preview switcher */}
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setActiveChannelPreview('whatsapp')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  background: activeChannelPreview === 'whatsapp' ? '#25d366' : 'var(--bg-card)',
                  color: activeChannelPreview === 'whatsapp' ? '#000' : 'var(--text-secondary)',
                  fontSize: '0.74rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                WhatsApp
              </button>

              <button
                type="button"
                onClick={() => setActiveChannelPreview('sms')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  background: activeChannelPreview === 'sms' ? '#3b82f6' : 'var(--bg-card)',
                  color: activeChannelPreview === 'sms' ? '#fff' : 'var(--text-secondary)',
                  fontSize: '0.74rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                SMS
              </button>

              <button
                type="button"
                onClick={() => setActiveChannelPreview('email')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  background: activeChannelPreview === 'email' ? '#f59e0b' : 'var(--bg-card)',
                  color: activeChannelPreview === 'email' ? '#000' : 'var(--text-secondary)',
                  fontSize: '0.74rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Email
              </button>

              <button
                type="button"
                onClick={() => setActiveChannelPreview('push')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  background: activeChannelPreview === 'push' ? '#ec4899' : 'var(--bg-card)',
                  color: activeChannelPreview === 'push' ? '#fff' : 'var(--text-secondary)',
                  fontSize: '0.74rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Push
              </button>
            </div>
          </div>

          {/* Simulator Viewport */}
          <div style={{
            flex: 1,
            background: 'radial-gradient(circle at center, #1a2234 0%, #0b0f19 100%)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '380px'
          }}>
            {/* WHATSAPP MOCKUP */}
            {activeChannelPreview === 'whatsapp' && (
              <div style={{
                width: '100%',
                maxWidth: '340px',
                background: '#0b141a',
                borderRadius: '16px',
                border: '4px solid #1f2c34',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ fontSize: '0.72rem', color: '#25d366', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Krishna Valley Official <span style={{ fontSize: '8px', background: '#25d366', color: '#000', borderRadius: '50%', padding: '0 3px' }}>✓</span>
                </div>

                <div style={{
                  background: '#005c4b',
                  color: '#e9edef',
                  borderRadius: '10px',
                  padding: '10px',
                  fontSize: '0.78rem',
                  lineHeight: '1.4',
                  whiteSpace: 'pre-line'
                }}>
                  {selectedTemplate?.whatsappContent?.headerText && (
                    <div style={{ fontWeight: '700', color: '#25d366', marginBottom: '4px' }}>
                      {replaceVars(selectedTemplate.whatsappContent.headerText)}
                    </div>
                  )}
                  {replaceVars(selectedTemplate?.whatsappContent?.bodyText || 'Important property update.')}
                </div>

                {selectedTemplate?.whatsappContent?.buttonText && (
                  <div style={{
                    background: '#202c33',
                    color: '#53bdeb',
                    padding: '8px',
                    borderRadius: '6px',
                    textAlign: 'center',
                    fontSize: '0.76rem',
                    fontWeight: '700'
                  }}>
                    {selectedTemplate.whatsappContent.buttonText}
                  </div>
                )}
              </div>
            )}

            {/* SMS MOCKUP */}
            {activeChannelPreview === 'sms' && (
              <div style={{
                width: '100%',
                maxWidth: '340px',
                background: '#121212',
                borderRadius: '16px',
                border: '4px solid #2d2d2d',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ textAlign: 'center', fontSize: '0.72rem', color: '#4b5563', fontWeight: '700' }}>
                  VK-KVALEY
                </div>
                <div style={{
                  background: '#2563eb',
                  color: '#111827',
                  borderRadius: '12px',
                  padding: '10px 12px',
                  fontSize: '0.78rem',
                  lineHeight: '1.4'
                }}>
                  {replaceVars(selectedTemplate?.smsContent?.bodyText || 'KV-ERP notification.')}
                </div>
              </div>
            )}

            {/* EMAIL MOCKUP */}
            {activeChannelPreview === 'email' && (
              <div style={{
                width: '100%',
                maxWidth: '380px',
                background: '#ffffff',
                color: '#1f2937',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                overflow: 'hidden'
              }}>
                <div style={{ background: '#f3f4f6', padding: '8px 12px', borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#111827' }}>
                    {replaceVars(selectedTemplate?.emailContent?.subject || 'Property Notice')}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#6b7280' }}>
                    From: notifications@krishnavalley.com
                  </div>
                </div>
                <div style={{ padding: '14px', fontSize: '0.78rem' }}>
                  <div dangerouslySetInnerHTML={{ __html: replaceVars(selectedTemplate?.emailContent?.bodyHtml || '<p>Notification</p>') }} />
                </div>
              </div>
            )}

            {/* PUSH MOCKUP */}
            {activeChannelPreview === 'push' && (
              <div style={{
                width: '100%',
                maxWidth: '340px',
                background: 'rgba(30, 41, 59, 0.95)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '12px',
                padding: '12px 14px',
                color: '#111827',
                display: 'flex',
                gap: '10px'
              }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bell size={16} color="#fff" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: '700' }}>
                    {replaceVars(selectedTemplate?.pushContent?.title || 'Krishna Valley Alert')}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#374151', marginTop: '2px' }}>
                    {replaceVars(selectedTemplate?.pushContent?.bodyText || 'Update regarding your unit.')}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ================= RECENT MODULE COMMUNICATION LOGS ================= */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #dadce0',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#111827', margin: 0 }}>
              Recent {module === 'sales' ? 'Buyer Reminders & Notices' : 'Tenant & Owner Notices'}
            </h4>
            <div style={{ fontSize: '0.74rem', color: '#4b5563' }}>
              Audit trail of sent messages for this module
            </div>
          </div>

          <button
            onClick={loadModuleLogs}
            style={{
              padding: '5px 10px',
              background: '#f8f9fa',
              border: '1px solid #dadce0',
              borderRadius: 'var(--radius-sm)',
              color: '#374151',
              fontSize: '0.74rem',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={12} className={loadingLogs ? 'spin' : ''} /> Refresh Logs
          </button>
        </div>

        {moduleLogs.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#4b5563', fontSize: '0.8rem' }}>
            No message history recorded yet. Use the tool above to dispatch the first notification!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '1px solid var(--border-subtle)', color: '#374151' }}>
                  <th style={{ padding: '8px 12px' }}>Channel</th>
                  <th style={{ padding: '8px 12px' }}>Recipient</th>
                  <th style={{ padding: '8px 12px' }}>Subject / Template</th>
                  <th style={{ padding: '8px 12px' }}>Message Preview</th>
                  <th style={{ padding: '8px 12px' }}>Status</th>
                  <th style={{ padding: '8px 12px' }}>Sent At</th>
                </tr>
              </thead>
              <tbody>
                {moduleLogs.slice(0, 10).map((log) => (
                  <tr key={log._id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '3px',
                        fontSize: '0.68rem',
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
                    <td style={{ padding: '8px 12px', color: '#111827', fontWeight: '600' }}>
                      {log.recipient}
                      {log.recipientName && <div style={{ fontSize: '0.68rem', color: '#4b5563' }}>{log.recipientName}</div>}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#374151' }}>
                      {log.subject || log.templateCode}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#4b5563', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.contentPreview}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '3px',
                        fontSize: '0.68rem',
                        fontWeight: '700',
                        background: log.status === 'delivered' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: log.status === 'delivered' ? '#10b981' : '#ef4444'
                      }}>
                        {log.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', color: '#4b5563', fontSize: '0.72rem' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
