import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Shield,
  Briefcase,
  Phone,
  Mail,
  User,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ChevronRight,
  HardHat,
  Eye
} from 'lucide-react';
import { taskforceManagerService } from '../../services/taskforceManagerService.js';
import { useToast } from '../../context/ToastContext.jsx';

export const AddTeamMemberModal = ({
  isOpen,
  onClose,
  existingMembers = [],
  systemUsers = [],
  onMemberAdded,
}) => {
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [email, setEmail] = useState('');
  const [hierarchyLevel, setHierarchyLevel] = useState('helper'); // 'helper' | 'supervisor' | 'head'
  const [supervisorId, setSupervisorId] = useState('');
  const [headId, setHeadId] = useState('');
  const [trade, setTrade] = useState('Civil & Snagging');
  const [notes, setNotes] = useState('');

  // User Account Options
  const [accountType, setAccountType] = useState('link_user'); // 'link_user' | 'create_user' | 'standalone'
  const [selectedUserId, setSelectedUserId] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('Taskforce@123');

  const TRADES = [
    'Civil & Snagging',
    'Electrical & Power',
    'Plumbing & Sanitation',
    'Painting & Waterproofing',
    'Carpentry & Woodwork',
    'Housekeeping & Deep Cleaning',
    'Security & Access Control',
    'HVAC & Air Conditioning',
    'General Site Operations',
  ];

  // Filter existing heads and supervisors for reporting chain dropdowns
  const availableHeads = existingMembers.filter((m) => m.hierarchyLevel === 'head');
  const availableSupervisors = existingMembers.filter((m) => m.hierarchyLevel === 'supervisor');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Please enter member name', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: name.trim(),
        mobileNo: mobileNo.trim(),
        email: email.trim(),
        hierarchyLevel,
        supervisorId: hierarchyLevel === 'helper' ? supervisorId || null : null,
        headId: hierarchyLevel === 'supervisor' || hierarchyLevel === 'helper' ? headId || null : null,
        trade,
        notes: notes.trim(),
      };

      if (accountType === 'link_user' && selectedUserId) {
        payload.userId = selectedUserId;
      } else if (accountType === 'create_user') {
        if (!newUsername.trim()) {
          showToast('Username is required to create a login account', 'error');
          setSubmitting(false);
          return;
        }
        payload.createLoginUser = true;
        payload.username = newUsername.trim();
        payload.password = newPassword;
      }

      const res = await taskforceManagerService.addTeamMember(payload);
      if (res && res.success) {
        showToast(res.message || 'Team member added successfully!', 'success');
        if (onMemberAdded) onMemberAdded(res.member);
        handleClose();
      } else {
        showToast(res?.message || 'Failed to add team member', 'error');
      }
    } catch (err) {
      console.error('Error adding team member:', err);
      showToast(err.message || 'Failed to add team member', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setMobileNo('');
    setEmail('');
    setHierarchyLevel('helper');
    setSupervisorId('');
    setHeadId('');
    setTrade('Civil & Snagging');
    setNotes('');
    setAccountType('link_user');
    setSelectedUserId('');
    setNewUsername('');
    setNewPassword('Taskforce@123');
    onClose();
  };

  // Auto-fill details if existing user selected
  const handleUserSelect = (uid) => {
    setSelectedUserId(uid);
    const found = systemUsers.find((u) => u._id === uid);
    if (found) {
      if (!name) setName(`${found.firstName || ''} ${found.lastName || ''}`.trim());
      if (!mobileNo && found.mobileNo) setMobileNo(found.mobileNo);
      if (!email && found.email) setEmail(found.email);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '92vh',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          border: '1px solid #cbd5e1',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserPlus size={20} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.18rem', fontWeight: '800' }}>
                Add Taskforce Team Member
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: '#cbd5e1' }}>
                Configure member in Helper → Supervisor → Head hierarchy with scoped permissions
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
            
            {/* Hierarchy Level Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>
                Hierarchy Level &amp; Data Visibility
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {/* 1. Helper */}
                <div
                  onClick={() => setHierarchyLevel('helper')}
                  style={{
                    border: hierarchyLevel === 'helper' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    background: hierarchyLevel === 'helper' ? '#eff6ff' : '#f8fafc',
                    borderRadius: '10px',
                    padding: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <HardHat size={16} color={hierarchyLevel === 'helper' ? '#2563eb' : '#64748b'} />
                    <span style={{ fontSize: '0.84rem', fontWeight: '800', color: hierarchyLevel === 'helper' ? '#1e40af' : '#1e293b' }}>
                      Helper
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b', lineHeight: 1.3 }}>
                    Field level. Can only see his own assigned tasks, uploads &amp; progress.
                  </p>
                </div>

                {/* 2. Supervisor */}
                <div
                  onClick={() => setHierarchyLevel('supervisor')}
                  style={{
                    border: hierarchyLevel === 'supervisor' ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                    background: hierarchyLevel === 'supervisor' ? '#eef2ff' : '#f8fafc',
                    borderRadius: '10px',
                    padding: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <Shield size={16} color={hierarchyLevel === 'supervisor' ? '#4f46e5' : '#64748b'} />
                    <span style={{ fontSize: '0.84rem', fontWeight: '800', color: hierarchyLevel === 'supervisor' ? '#3730a3' : '#1e293b' }}>
                      Supervisor
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b', lineHeight: 1.3 }}>
                    Middle tier. Can see his own data + all Helpers reporting to him.
                  </p>
                </div>

                {/* 3. Head */}
                <div
                  onClick={() => setHierarchyLevel('head')}
                  style={{
                    border: hierarchyLevel === 'head' ? '2px solid #0891b2' : '1px solid #cbd5e1',
                    background: hierarchyLevel === 'head' ? '#ecfeff' : '#f8fafc',
                    borderRadius: '10px',
                    padding: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <Briefcase size={16} color={hierarchyLevel === 'head' ? '#0891b2' : '#64748b'} />
                    <span style={{ fontSize: '0.84rem', fontWeight: '800', color: hierarchyLevel === 'head' ? '#155e75' : '#1e293b' }}>
                      Head
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b', lineHeight: 1.3 }}>
                    Senior lead. Can see all 3 tiers: his own, supervisors &amp; helpers data.
                  </p>
                </div>
              </div>
            </div>

            {/* Reporting Chain Config */}
            {hierarchyLevel === 'helper' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    Reporting Supervisor (Direct Lead)
                  </label>
                  <select
                    value={supervisorId}
                    onChange={(e) => setSupervisorId(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '0.78rem' }}
                  >
                    <option value="">-- No Specific Supervisor --</option>
                    {availableSupervisors.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.trade || 'Supervisor'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    Department Head (Optional)
                  </label>
                  <select
                    value={headId}
                    onChange={(e) => setHeadId(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '0.78rem' }}
                  >
                    <option value="">-- Select Head --</option>
                    {availableHeads.map((h) => (
                      <option key={h._id} value={h._id}>
                        {h.name} ({h.trade || 'Head'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {hierarchyLevel === 'supervisor' && (
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  Reporting Head
                </label>
                <select
                  value={headId}
                  onChange={(e) => setHeadId(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '0.78rem' }}
                >
                  <option value="">-- Select Reporting Head --</option>
                  {availableHeads.map((h) => (
                    <option key={h._id} value={h._id}>
                      {h.name} ({h.trade || 'Head'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Member Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Trade / Skill Area
                </label>
                <select
                  value={trade}
                  onChange={(e) => setTrade(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                >
                  {TRADES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Mobile Number
                </label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={mobileNo}
                  onChange={(e) => setMobileNo(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="name@krishnavalley.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
              </div>
            </div>

            {/* Account Mapping Options */}
            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '14px' }}>
              <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>
                ERP Login &amp; Dashboard Account
              </span>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                {[
                  { id: 'link_user', label: 'Link Existing User' },
                  { id: 'create_user', label: 'Create New Login' },
                  { id: 'standalone', label: 'Field Member (No Login)' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setAccountType(t.id)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      fontSize: '0.74rem',
                      fontWeight: accountType === t.id ? '700' : '600',
                      border: accountType === t.id ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                      background: accountType === t.id ? '#eff6ff' : '#ffffff',
                      color: accountType === t.id ? '#1e40af' : '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {accountType === 'link_user' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    Select Existing ERP User Account:
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => handleUserSelect(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem' }}
                  >
                    <option value="">-- Select User Account --</option>
                    {systemUsers.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.firstName} {u.lastName} ({u.username} • {u.roleId?.roleName || 'Staff'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {accountType === 'create_user' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                      Username *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ramesh_helper"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                      Initial Password *
                    </label>
                    <input
                      type="text"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem' }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Operational Notes &amp; Assigned Responsibilities
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Site snagging, Tower A electrical repairs, daily debris clearance..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
              />
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '14px 24px',
              background: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
            }}
          >
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: '0.82rem',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.82rem',
                fontWeight: '700',
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <UserPlus size={15} />
              <span>{submitting ? 'Adding...' : 'Add Team Member'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTeamMemberModal;
