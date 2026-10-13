import React, { useState, useEffect } from 'react';
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
  Eye,
  Plus,
  Check,
  Building2,
} from 'lucide-react';
import { taskforceManagerService } from '../../services/taskforceManagerService.js';
import { useToast } from '../../context/ToastContext.jsx';

export const AddTeamMemberModal = ({
  isOpen,
  onClose,
  existingMembers = [],
  systemUsers = [],
  initialDepartment = null,
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

  const DEFAULT_DEPARTMENTS = [
    'Human Resource',
    'I.T.',
    'Procurement',
    'Hotel',
    'Security',
    'Accounts',
    'C.R.M.',
    'Admin / Operations',
    'Maintenance',
    'Civil',
    'Licensing',
  ];

  const [managedDepartments, setManagedDepartments] = useState([]);
  const [department, setDepartment] = useState('Civil');
  const [notes, setNotes] = useState('');

  // User Account Options
  const [accountType, setAccountType] = useState('create_user'); // 'create_user' | 'link_user'
  const [selectedUserId, setSelectedUserId] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordTouched, setPasswordTouched] = useState(false);

  const handleNameChange = (val) => {
    setName(val);
    if (!usernameTouched) {
      const slug = val
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
      setNewUsername(slug);
    }
  };

  const handleMobileChange = (val) => {
    setMobileNo(val);
    if (!passwordTouched) {
      setNewPassword(val);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDepartments();
    }
  }, [isOpen, initialDepartment]);

  useEffect(() => {
    const handleDeptUpdated = () => {
      if (isOpen) loadDepartments();
    };
    window.addEventListener('departmentsUpdated', handleDeptUpdated);
    return () => window.removeEventListener('departmentsUpdated', handleDeptUpdated);
  }, [isOpen]);

  const loadDepartments = async () => {
    try {
      const res = await taskforceManagerService.getDepartments();
      let list = [];
      if (res?.success && Array.isArray(res.departments) && res.departments.length > 0) {
        list = res.departments.map((d) => d.name);
      } else {
        list = DEFAULT_DEPARTMENTS;
      }
      setManagedDepartments(list);

      if (initialDepartment) {
        setDepartment(initialDepartment);
      } else if (!department || !list.includes(department)) {
        setDepartment(list[0] || 'Civil');
      }
    } catch (err) {
      setManagedDepartments(DEFAULT_DEPARTMENTS);
      if (initialDepartment) setDepartment(initialDepartment);
    }
  };

  // Merge managed departments with existing member departments
  const existingMemberDepts = (existingMembers || [])
    .map((m) => m.department || m.trade)
    .filter(Boolean);

  const allDepartments = Array.from(
    new Set([...managedDepartments, ...DEFAULT_DEPARTMENTS, ...existingMemberDepts])
  );

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
        department: department.trim(),
        trade: department.trim(),
        notes: notes.trim(),
      };

      if (accountType === 'link_user' && selectedUserId) {
        payload.userId = selectedUserId;
      } else {
        const finalUname =
          newUsername.trim() ||
          name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        payload.createLoginUser = true;
        payload.username = finalUname;
        payload.password = newPassword.trim() || mobileNo.trim() || 'Taskforce@123';
      }

      const res = await taskforceManagerService.addTeamMember(payload);
      if (res && res.success) {
        showToast(res.message || 'Team member added successfully!', 'success');
        if (onMemberAdded) onMemberAdded(res.member);
        window.dispatchEvent(new CustomEvent('taskforceTeamUpdated', { detail: { member: res.member } }));
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
    setDepartment('Civil');
    
    setNotes('');
    setAccountType('create_user');
    setSelectedUserId('');
    setNewUsername('');
    setUsernameTouched(false);
    setNewPassword('');
    setPasswordTouched(false);
    onClose();
  };

  // Auto-fill details if existing user selected
  const handleUserSelect = (uid) => {
    setSelectedUserId(uid);
    const found = systemUsers.find((u) => u._id === uid);
    if (found) {
      if (!name) setName(`${found.firstName || ''} ${found.lastName || ''}`.trim());
      if (!mobileNo && found.mobileNo) {
        setMobileNo(found.mobileNo);
        if (!passwordTouched) setNewPassword(found.mobileNo);
      }
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
                        {s.name} ({s.department || s.trade || 'Supervisor'})
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
                        {h.name} ({h.department || h.trade || 'Head'})
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
                      {h.name} ({h.department || h.trade || 'Head'})
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
                  onChange={(e) => handleNameChange(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <div style={{ marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: '800', color: '#1e293b' }}>
                    Department <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    padding: '3px 10px',
                    gap: '8px',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ color: '#2563eb', display: 'flex', alignItems: 'center' }}>
                    <Briefcase size={15} />
                  </div>

                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    style={{
                      width: '100%',
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      fontSize: '0.82rem',
                      fontWeight: '600',
                      color: '#0f172a',
                      padding: '5px 0',
                      cursor: 'pointer',
                    }}
                  >
                    {allDepartments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Mobile Number
                </label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={mobileNo}
                  onChange={(e) => handleMobileChange(e.target.value)}
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <KeyRound size={16} color="#2563eb" />
                  Access Control & Governance Credentials
                </span>
                <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: '700', backgroundColor: '#ecfdf5', padding: '2px 8px', borderRadius: '4px', border: '1px solid #a7f3d0' }}>
                  Auto-Synchronized
                </span>
              </div>
              <p style={{ margin: '0 0 10px', fontSize: '0.72rem', color: '#64748b', lineHeight: 1.3 }}>
                This member's Login ID and Password will be registered in Access Control & Governance and visible in the User Directory.
              </p>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                {[
                  { id: 'create_user', label: 'Create New Login Credentials' },
                  { id: 'link_user', label: 'Link Existing User Account' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setAccountType(t.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
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

              {accountType === 'create_user' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                      Login User ID / Username *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ramesh_kumar"
                      value={newUsername}
                      onChange={(e) => {
                        setUsernameTouched(true);
                        setNewUsername(e.target.value);
                      }}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem' }}
                    />
                    <span style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px', display: 'block' }}>
                      Registered as @{newUsername || 'username'}
                    </span>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                      Initial Password *
                    </label>
                    <input
                      type="text"
                      placeholder={mobileNo || 'Auto-filled from Mobile No'}
                      value={newPassword}
                      onChange={(e) => {
                        setPasswordTouched(true);
                        setNewPassword(e.target.value);
                      }}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem', fontWeight: '600', color: '#2563eb' }}
                    />
                    <span style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px', display: 'block' }}>
                      {mobileNo ? 'Auto-filled from Mobile Number (editable)' : 'Auto-fills from Mobile Number (or custom password)'}
                    </span>
                  </div>
                </div>
              )}

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
