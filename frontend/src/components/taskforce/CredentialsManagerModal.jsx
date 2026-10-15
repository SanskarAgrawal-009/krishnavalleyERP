import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal.jsx';
import { taskforceManagerService } from '../../services/taskforceManagerService.js';
import { useToast } from '../../context/ToastContext.jsx';
import { ManageCredentialsModal } from './ManageCredentialsModal.jsx';
import {
  KeyRound,
  Search,
  Users,
  Shield,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Phone,
  Building2,
  ExternalLink,
  MessageCircle,
  UserCheck,
  AlertCircle,
  Plus,
  Filter,
} from 'lucide-react';
import {
  getDepartmentTheme,
  getDepartmentIcon,
  getHierarchyTheme,
} from '../../utils/departmentIcons.js';

export const CredentialsManagerModal = ({
  isOpen,
  onClose,
  onOpenAddMember,
}) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('all'); // 'all' | 'head' | 'supervisor' | 'helper' | 'unlinked'
  const [deptFilter, setDeptFilter] = useState('all');

  // Revealed passwords state map { id: boolean }
  const [revealedMap, setRevealedMap] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  // Individual edit modal state
  const [editingTarget, setEditingTarget] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadCredentials();
    }
  }, [isOpen]);

  const loadCredentials = async () => {
    try {
      setLoading(true);
      const res = await taskforceManagerService.getAllCredentials();
      if (res && res.success && Array.isArray(res.data)) {
        setCredentials(res.data);
      } else {
        setCredentials([]);
      }
    } catch (err) {
      console.error('Failed to load credentials:', err);
      showToast('Error loading workforce credentials', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleRevealPassword = (id) => {
    setRevealedMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCopyCredentials = (person) => {
    const rawUser = person.username || person.name.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
    const cleanUser = rawUser.startsWith('@') ? rawUser : `@${rawUser}`;
    const pwd = person.initialPassword || person.mobileNo || 'Taskforce@123';

    const text = `*Krishna Valley ERP Login*\n👤 Name: ${person.name}\n🆔 User ID: ${cleanUser}\n🔑 Password: ${pwd}\n🌐 Portal: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    setCopiedId(person.id);
    showToast(`Login credentials copied for ${person.name}!`, 'success');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleShareWhatsApp = (person) => {
    const rawUser = person.username || person.name.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
    const cleanUser = rawUser.startsWith('@') ? rawUser : `@${rawUser}`;
    const pwd = person.initialPassword || person.mobileNo || 'Taskforce@123';

    const text = `*Krishna Valley ERP Login*\n👤 Name: ${person.name}\n🆔 User ID: ${cleanUser}\n🔑 Password: ${pwd}\n🌐 Portal: ${window.location.origin}/login`;
    const encoded = encodeURIComponent(text);
    const phone = (person.mobileNo || '').replace(/[^0-9]/g, '');
    const url = phone
      ? `https://wa.me/${phone.length === 10 ? '91' + phone : phone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  // Distinct departments for filter dropdown
  const departmentsList = useMemo(() => {
    const depts = new Set();
    credentials.forEach((c) => {
      if (c.department) depts.add(c.department);
    });
    return Array.from(depts).sort();
  }, [credentials]);

  // Filtered credentials list
  const filteredList = useMemo(() => {
    return credentials.filter((c) => {
      // Tier filter
      if (tierFilter === 'head' && c.hierarchyLevel !== 'head') return false;
      if (tierFilter === 'supervisor' && c.hierarchyLevel !== 'supervisor') return false;
      if (tierFilter === 'helper' && c.hierarchyLevel !== 'helper') return false;
      if (tierFilter === 'unlinked' && c.hasUserAccount) return false;

      // Department filter
      if (deptFilter !== 'all' && c.department !== deptFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (c.name || '').toLowerCase().includes(q);
        const matchesUser = (c.username || '').toLowerCase().includes(q);
        const matchesPhone = (c.mobileNo || '').toLowerCase().includes(q);
        const matchesDept = (c.department || '').toLowerCase().includes(q);
        return matchesName || matchesUser || matchesPhone || matchesDept;
      }

      return true;
    });
  }, [credentials, tierFilter, deptFilter, searchQuery]);

  // Summary counts
  const stats = useMemo(() => {
    const total = credentials.length;
    const linked = credentials.filter((c) => c.hasUserAccount).length;
    const heads = credentials.filter((c) => c.hierarchyLevel === 'head').length;
    const supervisors = credentials.filter((c) => c.hierarchyLevel === 'supervisor').length;
    const helpers = credentials.filter((c) => c.hierarchyLevel === 'helper').length;
    const unlinked = credentials.filter((c) => !c.hasUserAccount).length;
    return { total, linked, heads, supervisors, helpers, unlinked };
  }, [credentials]);

  if (!isOpen) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title=""
        size="xl"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '82vh' }}>
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #e2e8f0',
              paddingBottom: '14px',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  backgroundColor: '#fef3c7',
                  color: '#b45309',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <KeyRound size={24} />
              </div>

              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 2px 0', color: '#0f172a' }}>
                  User &amp; Team ID/Pass Manager
                </h2>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                  Taskforce Manager Access Control • View, reset passwords &amp; share login credentials directly
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={loadCredentials}
                disabled={loading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
                title="Reload credentials list"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>

              {onOpenAddMember && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAddMember();
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#059669',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={14} />
                  <span>+ Add Member</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Stats Summary Strip */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '10px',
            }}
          >
            <div style={{ padding: '8px 12px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Total Personnel</span>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{stats.total}</div>
            </div>

            <div style={{ padding: '8px 12px', borderRadius: '8px', background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
              <span style={{ fontSize: '11px', color: '#047857', fontWeight: 600 }}>Active Logins Linked</span>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#065f46' }}>{stats.linked}</div>
            </div>

            <div style={{ padding: '8px 12px', borderRadius: '8px', background: '#ecfeff', border: '1px solid #a5f3fc' }}>
              <span style={{ fontSize: '11px', color: '#0e7490', fontWeight: 600 }}>Department Heads</span>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#155e75' }}>{stats.heads}</div>
            </div>

            <div style={{ padding: '8px 12px', borderRadius: '8px', background: '#eef2ff', border: '1px solid #c7d2fe' }}>
              <span style={{ fontSize: '11px', color: '#4338ca', fontWeight: 600 }}>Site Supervisors</span>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#3730a3' }}>{stats.supervisors}</div>
            </div>

            <div style={{ padding: '8px 12px', borderRadius: '8px', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <span style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: 600 }}>Field Helpers</span>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#1e40af' }}>{stats.helpers}</div>
            </div>

            {stats.unlinked > 0 && (
              <div style={{ padding: '8px 12px', borderRadius: '8px', background: '#fffbeb', border: '1px solid #fde68a' }}>
                <span style={{ fontSize: '11px', color: '#b45309', fontWeight: 600 }}>Pending Account Setup</span>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#92400e' }}>{stats.unlinked}</div>
              </div>
            )}
          </div>

          {/* Search & Filter Toolbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            {/* Search Input */}
            <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: '380px' }}>
              <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              <input
                type="text"
                placeholder="Search by name, user ID, mobile, department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 32px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                style={{
                  padding: '7px 10px',
                  borderRadius: '7px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  fontWeight: 600,
                  outline: 'none',
                  background: '#ffffff',
                }}
              >
                <option value="all">All Departments</option>
                {departmentsList.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              {[
                { id: 'all', label: 'All' },
                { id: 'head', label: 'Heads' },
                { id: 'supervisor', label: 'Supervisors' },
                { id: 'helper', label: 'Helpers' },
                ...(stats.unlinked > 0 ? [{ id: 'unlinked', label: `Pending (${stats.unlinked})` }] : []),
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTierFilter(tab.id)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: tierFilter === tab.id ? 700 : 500,
                    border: tierFilter === tab.id ? '1px solid #ca8a04' : '1px solid #cbd5e1',
                    background: tierFilter === tab.id ? '#fefce8' : '#ffffff',
                    color: tierFilter === tab.id ? '#a16207' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Credentials Table / Cards Container */}
          <div
            style={{
              overflowY: 'auto',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              maxHeight: '52vh',
            }}
          >
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px' }} />
                <p style={{ margin: 0, fontSize: '13px' }}>Loading credentials database...</p>
              </div>
            ) : filteredList.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                <Users size={32} color="#cbd5e1" style={{ margin: '0 auto 10px' }} />
                <p style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                  No members or users match your criteria
                </p>
                <p style={{ margin: 0, fontSize: '12px' }}>
                  Try adjusting search query or filter tags.
                </p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>Personnel / User</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>Department &amp; Tier</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>Mobile No</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>User ID (Login)</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>Password</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((person, idx) => {
                    const isHead = person.hierarchyLevel === 'head';
                    const isSupervisor = person.hierarchyLevel === 'supervisor';
                    const isHelper = person.hierarchyLevel === 'helper';
                    const isRevealed = Boolean(revealedMap[person.id]);
                    const hasPassword = Boolean(person.initialPassword || person.mobileNo);
                    const plainPassword = person.initialPassword || person.mobileNo || 'Taskforce@123';
                    const cleanUsername = person.username || person.name.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
                    const isCopied = copiedId === person.id;

                    const tierBg = isHead ? '#ecfeff' : isSupervisor ? '#eef2ff' : '#eff6ff';
                    const tierColor = isHead ? '#0e7490' : isSupervisor ? '#4338ca' : '#1d4ed8';

                    return (
                      <tr
                        key={person.id || idx}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                          transition: 'background-color 0.1s ease',
                        }}
                      >
                        {/* Name & Account Status */}
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                background: tierBg,
                                color: tierColor,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '13px',
                                flexShrink: 0,
                              }}
                            >
                              {person.name?.[0] || 'U'}
                            </div>

                            <div>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>
                                {person.name}
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {person.hasUserAccount ? (
                                  <span style={{ color: '#16a34a', fontWeight: 600 }}>• Active Login</span>
                                ) : (
                                  <span style={{ color: '#d97706', fontWeight: 600 }}>• Account Pending</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Department & Tier */}
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontWeight: 600, color: '#334155' }}>
                            {person.department || 'General'}
                          </div>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              background: tierBg,
                              color: tierColor,
                              marginTop: '2px',
                            }}
                          >
                            {person.hierarchyLevel || 'Helper'}
                          </span>
                        </td>

                        {/* Mobile Number */}
                        <td style={{ padding: '10px 14px' }}>
                          {person.mobileNo ? (
                            <span style={{ color: '#0369a1', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Phone size={12} /> {person.mobileNo}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>—</span>
                          )}
                        </td>

                        {/* User ID */}
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <code
                              style={{
                                background: '#f1f5f9',
                                padding: '3px 6px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                color: '#0f172a',
                                fontWeight: 700,
                              }}
                            >
                              @{cleanUsername}
                            </code>
                          </div>
                        </td>

                        {/* Password */}
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <code
                              style={{
                                background: '#fef3c7',
                                padding: '3px 6px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                color: '#92400e',
                                fontWeight: 700,
                                minWidth: '70px',
                                display: 'inline-block',
                              }}
                            >
                              {isRevealed ? plainPassword : '••••••••'}
                            </code>

                            <button
                              type="button"
                              onClick={() => toggleRevealPassword(person.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#64748b',
                                cursor: 'pointer',
                                padding: '2px',
                                display: 'flex',
                              }}
                              title={isRevealed ? 'Hide password' : 'View password'}
                            >
                              {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <button
                              type="button"
                              onClick={() => setEditingTarget(person)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '5px 8px',
                                borderRadius: '6px',
                                background: '#fef3c7',
                                color: '#92400e',
                                border: '1px solid #fde68a',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                              title="Edit user ID or set custom password"
                            >
                              <KeyRound size={12} /> Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleCopyCredentials(person)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '5px 8px',
                                borderRadius: '6px',
                                background: '#f1f5f9',
                                color: isCopied ? '#15803d' : '#334155',
                                border: '1px solid #cbd5e1',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                              title="Copy credentials formatted for WhatsApp / SMS"
                            >
                              {isCopied ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                              {isCopied ? 'Copied' : 'Copy'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleShareWhatsApp(person)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '5px 8px',
                                borderRadius: '6px',
                                background: '#25d366',
                                color: '#ffffff',
                                border: 'none',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                              title="Directly send login credentials via WhatsApp"
                            >
                              <MessageCircle size={12} /> WhatsApp
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer note */}
          <div
            style={{
              paddingTop: '10px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: '#64748b',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <span>
              💡 <strong>Taskforce Tip:</strong> Passwords can be auto-generated or set to personnel mobile number for easy login.
            </span>

            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '6px' }}
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Individual Single-Member Edit Modal */}
      {editingTarget && (
        <ManageCredentialsModal
          isOpen={Boolean(editingTarget)}
          onClose={() => setEditingTarget(null)}
          member={editingTarget}
          onCredentialsUpdated={() => {
            loadCredentials();
            window.dispatchEvent(new CustomEvent('taskforceTeamUpdated'));
          }}
        />
      )}
    </>
  );
};

export default CredentialsManagerModal;
