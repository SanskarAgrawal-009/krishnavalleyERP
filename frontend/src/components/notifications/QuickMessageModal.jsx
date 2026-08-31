import React, { useState, useEffect } from 'react';
import { notificationService } from '../../services/notificationService.js';
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
  Zap,
  Eye,
  Check
} from 'lucide-react';

export const QuickMessageModal = ({
  isOpen,
  onClose,
  module = 'sales',
  record = null,
  onSent = null
}) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [recipient, setRecipient] = useState({ name: '', phone: '', email: '' });
  const [vars, setVars] = useState({});
  const [channels, setChannels] = useState({ whatsapp: true, sms: true, email: true, push: false });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      extractRecordDetails();
    }
  }, [isOpen, record, module]);

  const loadTemplates = async () => {
    try {
      const category = module === 'sales' ? 'Billing & Payments' : 'Rentals & Leases';
      const res = await notificationService.getTemplates({ category });
      if (res.data && res.data.length > 0) {
        setTemplates(res.data);
        setSelectedTemplate(res.data[0]);
      } else {
        const allRes = await notificationService.getTemplates({});
        if (allRes.data) {
          setTemplates(allRes.data);
          setSelectedTemplate(allRes.data[0] || null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const extractRecordDetails = () => {
    if (!record) return;
    if (module === 'sales') {
      const name = record.leadId?.name || record.buyerName || 'Valued Buyer';
      const phone = record.leadId?.mobileNo || record.buyerPhone || '+91 98765 43210';
      const email = record.leadId?.email || record.buyerEmail || 'buyer@example.com';
      const unit = record.assignedFlat?.flatNumber ? `${record.assignedFlat?.buildingId?.buildingName || 'Tower'} - Flat ${record.assignedFlat.flatNumber}` : 'Flat 804';
      const project = record.assignedFlat?.projectId?.projectName || 'Krishna Heights Residency';
      const pending = record.paymentPlan?.milestones?.find((m) => m.status === 'pending' || m.status === 'demand_issued');
      const amount = pending ? pending.amount : 75000;
      const milestoneName = pending ? pending.milestoneName : 'Plinth Level Slab';
      const dueDate = pending?.dueDate ? new Date(pending.dueDate).toLocaleDateString('en-IN') : new Date(Date.now() + 7 * 86400000).toLocaleDateString('en-IN');

      setRecipient({ name, phone, email });
      setVars({
        client_name: name,
        project_name: project,
        unit_number: unit,
        amount: amount.toLocaleString('en-IN'),
        due_date: dueDate,
        milestone_name: milestoneName,
        payment_link: `https://krishnavalley.com/pay/sl-${record._id || record.id || 'demo'}`,
        penalty_amount: '2,500',
        allotment_date: new Date().toLocaleDateString('en-IN'),
        download_link: `https://krishnavalley.com/docs/allotment-${record._id || 'demo'}.pdf`,
        rm_name: record.leadId?.assignedAgent || 'Amitabh Verma'
      });
    } else if (module === 'rentals') {
      const tenant = record.tenantAgreement?.tenantName || 'Priya Nair';
      const phone = record.tenantAgreement?.tenantPhone || '+91 98765 43210';
      const email = record.tenantAgreement?.tenantEmail || 'tenant@example.com';
      const unit = record.flatId?.flatNumber ? `Unit ${record.flatId.flatNumber}` : 'Unit 302';
      const project = record.flatId?.projectId?.projectName || 'Krishna Valley Luxury';
      const rentAmount = record.tenantAgreement?.monthlyRent || 35000;
      const penalty = record.penaltyRecords?.reduce((acc, p) => acc + (p.penaltyAmount || 0), 0) || 1500;

      setRecipient({ name: tenant, phone, email });
      setVars({
        client_name: tenant,
        project_name: project,
        unit_number: unit,
        amount: rentAmount.toLocaleString('en-IN'),
        penalty_amount: penalty.toLocaleString('en-IN'),
        due_date: '5th of this month',
        payment_link: `https://krishnavalley.com/rent/pay-${record._id || 'demo'}`,
        month_year: new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
      });
    }
  };

  if (!isOpen) return null;

  const replaceVars = (text) => {
    if (!text) return '';
    return text.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (match, key) => {
      return vars[key] !== undefined ? vars[key] : match;
    });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const enabledChannels = Object.keys(channels).filter((k) => channels[k]);
    if (enabledChannels.length === 0) {
      alert('Select at least one delivery channel.');
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const payload = {
        templateId: selectedTemplate?._id,
        templateCode: selectedTemplate?.templateCode,
        channels: enabledChannels,
        recipient,
        variables: vars,
        metadata: { module, referenceId: record?._id || record?.id }
      };

      const res = await notificationService.sendTemplateNotification(payload);
      setResult(res);
      if (onSent) onSent();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to send message');
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
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8f9fa'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={18} color="var(--primary-500)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#111827', margin: 0 }}>
              Send Notification to {recipient.name || 'Recipient'}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#4b5563', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSend} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
          {/* Template select */}
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', color: '#374151', marginBottom: '4px', fontWeight: '600' }}>
              Select Template
            </label>
            <select
              value={selectedTemplate?._id || ''}
              onChange={(e) => {
                const found = templates.find((t) => t._id === e.target.value);
                if (found) setSelectedTemplate(found);
              }}
              style={{
                width: '100%',
                padding: '8px 10px',
                background: '#f8f9fa',
                border: '1px solid #dadce0',
                borderRadius: 'var(--radius-sm)',
                color: '#111827',
                fontSize: '0.82rem'
              }}
            >
              {templates.map((tpl) => (
                <option key={tpl._id} value={tpl._id}>
                  {tpl.templateName} ({tpl.templateCode})
                </option>
              ))}
            </select>
          </div>

          {/* Recipient phone & email */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', color: '#374151', marginBottom: '4px' }}>
                WhatsApp / Phone
              </label>
              <input
                type="text"
                value={recipient.phone}
                onChange={(e) => setRecipient({ ...recipient, phone: e.target.value })}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  background: '#f8f9fa',
                  border: '1px solid #dadce0',
                  borderRadius: 'var(--radius-sm)',
                  color: '#25d366',
                  fontSize: '0.8rem',
                  fontWeight: '600'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', color: '#374151', marginBottom: '4px' }}>
                Email
              </label>
              <input
                type="text"
                value={recipient.email}
                onChange={(e) => setRecipient({ ...recipient, email: e.target.value })}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  background: '#f8f9fa',
                  border: '1px solid #dadce0',
                  borderRadius: 'var(--radius-sm)',
                  color: '#fbbf24',
                  fontSize: '0.8rem'
                }}
              />
            </div>
          </div>

          {/* Live Message Body Preview */}
          <div style={{
            background: '#f8f9fa',
            padding: '12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid #dadce0'
          }}>
            <div style={{ fontSize: '0.72rem', color: '#25d366', fontWeight: '700', marginBottom: '4px' }}>
              WhatsApp & SMS Message Preview:
            </div>
            <div style={{ fontSize: '0.78rem', color: '#111827', lineHeight: '1.45', whiteSpace: 'pre-line' }}>
              {replaceVars(selectedTemplate?.whatsappContent?.bodyText || selectedTemplate?.smsContent?.bodyText || 'Notice')}
            </div>
          </div>

          {/* Channel selector */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.76rem', color: '#25d366', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={channels.whatsapp}
                onChange={(e) => setChannels({ ...channels, whatsapp: e.target.checked })}
                style={{ accentColor: '#25d366' }}
              />
              WhatsApp
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.76rem', color: '#60a5fa', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={channels.sms}
                onChange={(e) => setChannels({ ...channels, sms: e.target.checked })}
                style={{ accentColor: '#3b82f6' }}
              />
              SMS
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.76rem', color: '#fbbf24', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={channels.email}
                onChange={(e) => setChannels({ ...channels, email: e.target.checked })}
                style={{ accentColor: '#f59e0b' }}
              />
              Email
            </label>
          </div>

          {result && (
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '8px 12px', borderRadius: '4px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle size={14} /> Message sent successfully!
            </div>
          )}

          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '8px 12px', borderRadius: '4px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 14px',
                background: 'transparent',
                border: '1px solid #dadce0',
                borderRadius: 'var(--radius-sm)',
                color: '#374151',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>

            {channels.whatsapp && recipient.phone && (
              <a
                href={`https://wa.me/${(recipient.phone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(replaceVars(selectedTemplate?.whatsappContent?.bodyText || ''))}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '8px 14px',
                  background: '#e6f4ea',
                  border: '1px solid #10b981',
                  borderRadius: 'var(--radius-sm)',
                  color: '#137333',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <MessageSquare size={13} />
                Open WhatsApp Web
              </a>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '8px 18px',
                background: 'linear-gradient(135deg, var(--primary-600), var(--primary-700))',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                color: '#111827',
                fontSize: '0.8rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {loading ? <RefreshCw size={13} className="spin" /> : <Send size={13} />}
              Send Now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
