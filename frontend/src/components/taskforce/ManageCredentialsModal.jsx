import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { taskforceManagerService } from '../../services/taskforceManagerService.js';
import { useToast } from '../../context/ToastContext.jsx';
import {
  KeyRound,
  User,
  Shield,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Phone,
  Building2,
  MessageCircle,
} from 'lucide-react';

export const ManageCredentialsModal = ({
  isOpen,
  onClose,
  member,
  onCredentialsUpdated,
}) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && member) {
      const existingUser = member.userId;
      const initialUser = typeof existingUser === 'object' ? existingUser?.username : '';
      const initialPass =
        (typeof existingUser === 'object' ? existingUser?.initialPassword : '') ||
        member.mobileNo ||
        'Taskforce@123';

      setUsername(initialUser || member.name.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_'));
      setPassword(initialPass);
      setShowPassword(false);
      setCopied(false);
    }
  }, [isOpen, member]);

  const handleGeneratePassword = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const gen = `KV@${randomSuffix}`;
    setPassword(gen);
    showToast(`Generated password: ${gen}`, 'info');
  };

  const handleUseMobile = () => {
    if (member?.mobileNo) {
      setPassword(member.mobileNo);
      showToast('Set password to mobile number', 'info');
    }
  };

  const handleCopyDetails = () => {
    const rawUser = username.trim() || member?.name?.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
    const cleanUser = rawUser.startsWith('@') ? rawUser : `@${rawUser}`;
    const text = `*Krishna Valley ERP Login*\n👤 Member: ${member?.name}\n🆔 User ID: ${cleanUser}\n🔑 Password: ${password}\n🌐 Portal: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('Login details copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const rawUser = username.trim() || member?.name?.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
    const cleanUser = rawUser.startsWith('@') ? rawUser : `@${rawUser}`;
    const text = `*Krishna Valley ERP Login*\n👤 Member: ${member?.name}\n🆔 User ID: ${cleanUser}\n🔑 Password: ${password}\n🌐 Portal: ${window.location.origin}/login`;
    const encoded = encodeURIComponent(text);
    const phone = (member?.mobileNo || '').replace(/[^0-9]/g, '');
    const url = phone
      ? `https://wa.me/${phone.length === 10 ? '91' + phone : phone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      showToast('Please enter a valid User ID / username', 'error');
      return;
    }
    if (!password.trim()) {
      showToast('Please enter a password', 'error');
      return;
    }

    try {
      setLoading(true);
      const targetId = member._id || member.id || member.userId;
      const res = await taskforceManagerService.updateMemberCredentials(targetId, {
        username: username.trim(),
        password: password.trim(),
      });

      if (res?.success) {
        showToast(res.message || 'Credentials updated successfully!', 'success');
        window.dispatchEvent(new CustomEvent('taskforceTeamUpdated'));
        if (onCredentialsUpdated) onCredentialsUpdated(res.credentials);
        onClose();
      } else {
        showToast(res?.message || 'Failed to update credentials', 'error');
      }
    } catch (err) {
      console.error('Error updating credentials:', err);
      showToast(err.message || 'Error updating credentials', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!member) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="md"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#fef3c7',
              color: '#b45309',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <KeyRound size={22} />
          </div>

          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 2px 0', color: '#0f172a' }}>
              Manage User ID &amp; Password
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
              Taskforce Manager access control for {member.name}
            </p>
          </div>
        </div>

        {/* Member Identity Badge */}
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px',
          }}
        >
          <div>
            <span style={{ fontWeight: 700, color: '#1e293b' }}>{member.name}</span>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              Dept: {member.department || 'General'} • Hierarchy: <strong style={{ textTransform: 'capitalize' }}>{member.hierarchyLevel || 'Helper'}</strong>
            </div>
          </div>
          {member.mobileNo && (
            <span style={{ color: '#0369a1', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Phone size={12} /> {member.mobileNo}
            </span>
          )}
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* User ID / Username Input */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>
              User ID (Login Username) <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <User size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              <input
                type="text"
                required
                placeholder="e.g. rajesh_kumar"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                style={{
                  width: '100%',
                  padding: '8px 10px 8px 32px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              Worker uses this User ID on the login screen.
            </span>
          </div>

          {/* Password Input with Show/Hide toggle */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>
                Password <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#005bbf',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2px',
                  }}
                >
                  <Sparkles size={11} /> Auto-Generate
                </button>
                {member.mobileNo && (
                  <button
                    type="button"
                    onClick={handleUseMobile}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#059669',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Use Mobile No
                  </button>
                )}
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              <KeyRound size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Enter password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 36px 8px 32px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '8px',
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              Visible to Taskforce Manager so you can share login details directly with workers.
            </span>
          </div>

          {/* Quick Copy Box */}
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              backgroundColor: '#f1f5f9',
              border: '1px dashed #cbd5e1',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ fontSize: '11px', color: '#334155' }}>
              <div><strong>Login Credentials:</strong></div>
              <div>User ID: <code>@{username || '...'}</code></div>
              <div>Password: <code>{password ? (showPassword ? password : '••••••••') : '...'}</code></div>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={handleCopyDetails}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: copied ? '#15803d' : '#0f172a',
                  fontSize: '11px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                }}
              >
                {copied ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                {copied ? 'Copied!' : 'Copy to Send'}
              </button>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#25d366',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                }}
              >
                <MessageCircle size={12} /> WhatsApp
              </button>
            </div>
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
              style={{ padding: '7px 16px', fontSize: '12px', borderRadius: '6px' }}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{
                padding: '7px 20px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '6px',
                backgroundColor: '#ca8a04',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {loading ? 'Saving...' : 'Save & Update Credentials'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default ManageCredentialsModal;
