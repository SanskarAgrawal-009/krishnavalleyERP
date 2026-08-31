import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { authService } from '../../services/authService.js';
import {
  Users,
  Shield,
  ShieldCheck,
  Building2,
  KeyRound,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Lock,
  Unlock,
  Edit2,
  Trash2,
  RefreshCw,
  MoreVertical,
  Check,
  X,
  Eye,
  Sliders,
  ChevronDown,
  Layers,
  MapPin,
  Mail,
  Phone,
  Calendar,
  Sparkles,
  Award,
  DollarSign,
  Loader2
} from 'lucide-react';

export const UserManagementPage = () => {
  const { user: currentUser, isSuperAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const getTabFromParam = (param) => {
    if (param === 'roles') return 'roles';
    if (param === 'branches') return 'branches';
    return 'users';
  };

  const [activeTab, setActiveTab] = useState(getTabFromParam(tabParam));

  useEffect(() => {
    setActiveTab(getTabFromParam(tabParam));
  }, [tabParam]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
  };
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [permissionGroups, setPermissionGroups] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');

  // Modal states
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [targetUserForPassword, setTargetUserForPassword] = useState(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [selectedRoleForMatrix, setSelectedRoleForMatrix] = useState(null);

  // Form states for user modal
  const [userFormData, setUserFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    mobileNo: '',
    password: '',
    roleId: '',
    status: 'active',
    branchAccess: [],
  });

  // Form states for role modal
  const [roleFormData, setRoleFormData] = useState({
    roleName: '',
    roleCode: '',
    description: '',
    permissions: [],
    isActive: true,
  });

  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', type: '' });

  const showFeedback = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback({ message: '', type: '' }), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes, branchesRes, permsRes] = await Promise.all([
        authService.getUsers({ limit: 100 }),
        authService.getRoles(),
        authService.getBranches(),
        authService.getPermissions(),
      ]);

      if (usersRes.success) setUsers(usersRes.data || []);
      if (rolesRes.success) {
        setRoles(rolesRes.data || []);
        if (rolesRes.data?.length > 0 && !selectedRoleForMatrix) {
          setSelectedRoleForMatrix(rolesRes.data[0]);
        }
      }
      if (branchesRes.success) setBranches(branchesRes.data || []);
      if (permsRes.success) {
        setPermissions(permsRes.data || []);
        setPermissionGroups(permsRes.grouped || {});
      }
    } catch (err) {
      console.error('Failed to load access control data:', err);
      showFeedback(err.message || 'Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      searchTerm === '' ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.mobileNo && u.mobileNo.includes(searchTerm));

    const matchesRole =
      selectedRoleFilter === 'all' ||
      u.roleId?._id === selectedRoleFilter ||
      u.roleId?.roleCode === selectedRoleFilter;

    const matchesStatus =
      selectedStatusFilter === 'all' || u.status === selectedStatusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Open User Modal
  const handleOpenUserModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setUserFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        username: user.username || '',
        email: user.email || '',
        mobileNo: user.mobileNo || '',
        password: '',
        roleId: user.roleId?._id || user.roleId || '',
        status: user.status || 'active',
        agentProfile: {
          agencyName: user.agentProfile?.agencyName || '',
          reraNumber: user.agentProfile?.reraNumber || '',
          commissionType: user.agentProfile?.commissionType || 'percentage',
          commissionRate: user.agentProfile?.commissionRate ?? 2,
        },
        branchAccess: user.branchAccess?.map((b) => ({
          branchId: b.branchId?._id || b.branchId,
          accessLevel: b.accessLevel || 'view',
          isPrimary: b.isPrimary || false,
        })) || [],
      });
    } else {
      setEditingUser(null);
      const defaultRole = roles.find((r) => r.roleCode === 'sales_head') || roles[0];
      const primaryBranch = branches.find((b) => b.isHeadOffice) || branches[0];
      setUserFormData({
        firstName: '',
        lastName: '',
        username: '',
        email: '',
        mobileNo: '',
        password: '',
        roleId: defaultRole?._id || '',
        status: 'active',
        agentProfile: {
          agencyName: '',
          reraNumber: '',
          commissionType: 'percentage',
          commissionRate: 2,
        },
        branchAccess: primaryBranch
          ? [{ branchId: primaryBranch._id, accessLevel: 'manage', isPrimary: true }]
          : [],
      });
    }
    setUserModalOpen(true);
  };

  // Submit User
  const handleSaveUser = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (editingUser) {
        const updatePayload = {
          firstName: userFormData.firstName,
          lastName: userFormData.lastName,
          email: userFormData.email,
          mobileNo: userFormData.mobileNo,
          roleId: userFormData.roleId,
          status: userFormData.status,
          branchAccess: userFormData.branchAccess,
          agentProfile: userFormData.agentProfile,
        };
        const res = await authService.updateUser(editingUser._id, updatePayload);
        if (res.success) {
          showFeedback('User account updated successfully!');
          setUserModalOpen(false);
          loadData();
        }
      } else {
        if (!userFormData.password) {
          showFeedback('Password is required for new users', 'error');
          setActionLoading(false);
          return;
        }
        const res = await authService.createUser(userFormData);
        if (res.success) {
          showFeedback('New user created successfully!');
          setUserModalOpen(false);
          loadData();
        }
      }
    } catch (err) {
      showFeedback(err.message || 'Failed to save user', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Status Change
  const handleToggleStatus = async (userId, newStatus) => {
    try {
      const res = await authService.updateUserStatus(userId, newStatus);
      if (res.success) {
        showFeedback(`User status changed to ${newStatus}`);
        setUsers((prev) =>
          prev.map((u) => (u._id === userId ? { ...u, status: newStatus } : u))
        );
      }
    } catch (err) {
      showFeedback(err.message || 'Failed to update status', 'error');
    }
  };

  // Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPasswordValue || newPasswordValue.length < 6) {
      showFeedback('Password must be at least 6 characters', 'error');
      return;
    }
    setActionLoading(true);
    try {
      const res = await authService.resetUserPassword(targetUserForPassword._id, newPasswordValue);
      if (res.success) {
        showFeedback(`Password updated for @${targetUserForPassword.username}!`);
        setPasswordModalOpen(false);
        setNewPasswordValue('');
      }
    } catch (err) {
      showFeedback(err.message || 'Failed to reset password', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete User
  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`Are you sure you want to permanently delete user @${username}?`)) {
      return;
    }
    try {
      const res = await authService.deleteUser(userId);
      if (res.success) {
        showFeedback('User deleted successfully');
        setUsers((prev) => prev.filter((u) => u._id !== userId));
      }
    } catch (err) {
      showFeedback(err.message || 'Failed to delete user', 'error');
    }
  };

  // Save Role Permissions Matrix
  const handleTogglePermissionForRole = async (permissionId) => {
    if (!selectedRoleForMatrix || selectedRoleForMatrix.isSystemRole && selectedRoleForMatrix.roleCode === 'super_admin') {
      return;
    }

    const currentPermIds = (selectedRoleForMatrix.permissions || []).map((p) =>
      typeof p === 'object' ? p._id : p
    );

    let updatedPermIds;
    if (currentPermIds.includes(permissionId)) {
      updatedPermIds = currentPermIds.filter((id) => id !== permissionId);
    } else {
      updatedPermIds = [...currentPermIds, permissionId];
    }

    try {
      const res = await authService.updateRole(selectedRoleForMatrix._id, {
        permissions: updatedPermIds,
      });
      if (res.success) {
        setSelectedRoleForMatrix(res.data);
        setRoles((prev) =>
          prev.map((r) => (r._id === selectedRoleForMatrix._id ? res.data : r))
        );
        showFeedback(`Permissions saved for role: ${selectedRoleForMatrix.roleName}`);
      }
    } catch (err) {
      showFeedback(err.message || 'Failed to update permissions', 'error');
    }
  };

  // Branch Access Helper
  const handleBranchAccessChange = (branchId, field, value) => {
    setUserFormData((prev) => {
      const existingIdx = prev.branchAccess.findIndex((b) => b.branchId === branchId);
      let updated = [...prev.branchAccess];

      if (field === 'enabled') {
        if (value) {
          if (existingIdx === -1) {
            updated.push({ branchId, accessLevel: 'view', isPrimary: updated.length === 0 });
          }
        } else {
          updated = updated.filter((b) => b.branchId !== branchId);
          if (updated.length > 0 && !updated.some((b) => b.isPrimary)) {
            updated[0].isPrimary = true;
          }
        }
      } else if (field === 'accessLevel') {
        if (existingIdx !== -1) {
          updated[existingIdx].accessLevel = value;
        }
      } else if (field === 'isPrimary') {
        updated = updated.map((b) => ({
          ...b,
          isPrimary: b.branchId === branchId,
        }));
      }

      return { ...prev, branchAccess: updated };
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toast Notification Alert */}
      {feedback.message && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 9999,
            padding: '14px 20px',
            borderRadius: '10px',
            backgroundColor: feedback.type === 'error' ? '#ba1a1a' : '#0d904f',
            color: '#ffffff',
            fontWeight: '500',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {feedback.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: 'rgba(26, 115, 232, 0.1)',
                color: '#1a73e8',
                fontSize: '0.75rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              <ShieldCheck size={13} />
              Access Control & Governance
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '700', color: '#1f2937', letterSpacing: '-0.02em' }}>
            User & Role Management
          </h1>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#6b7280', marginTop: '2px' }}>
            Configure system accounts, role assignments, multi-branch site permissions, and module privilege matrices.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={loadData}
            title="Refresh list"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 14px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              backgroundColor: '#ffffff',
              color: '#374151',
              fontSize: '0.85rem',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => handleOpenUserModal()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#1a73e8',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(26,115,232,0.3)',
            }}
          >
            <Plus size={16} />
            <span>New System User</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#e8f0fe', color: '#1a73e8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: '500' }}>Active Users</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#111827' }}>
              {users.filter((u) => u.status === 'active').length} <span style={{ fontSize: '0.85rem', fontWeight: '400', color: '#9ca3af' }}>/ {users.length} total</span>
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#e6f4ea', color: '#0d904f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: '500' }}>Configured Roles</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#111827' }}>{roles.length}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#fef7e0', color: '#e37400', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: '500' }}>Active Site Branches</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#111827' }}>{branches.length}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#f3e8fd', color: '#9334e6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sliders size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: '500' }}>Total Permissions</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#111827' }}>{permissions.length}</div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', gap: '28px' }}>
        <button
          onClick={() => handleTabChange('users')}
          style={{
            padding: '12px 4px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'users' ? '2px solid #1a73e8' : '2px solid transparent',
            color: activeTab === 'users' ? '#1a73e8' : '#6b7280',
            fontWeight: activeTab === 'users' ? '600' : '500',
            fontSize: '0.92rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Users size={17} />
          <span>User Directory ({users.length})</span>
        </button>

        <button
          onClick={() => handleTabChange('roles')}
          style={{
            padding: '12px 4px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'roles' ? '2px solid #1a73e8' : '2px solid transparent',
            color: activeTab === 'roles' ? '#1a73e8' : '#6b7280',
            fontWeight: activeTab === 'roles' ? '600' : '500',
            fontSize: '0.92rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <ShieldCheck size={17} />
          <span>Role Permissions Matrix</span>
        </button>

        <button
          onClick={() => handleTabChange('branches')}
          style={{
            padding: '12px 4px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'branches' ? '2px solid #1a73e8' : '2px solid transparent',
            color: activeTab === 'branches' ? '#1a73e8' : '#6b7280',
            fontWeight: activeTab === 'branches' ? '600' : '500',
            fontSize: '0.92rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Building2 size={17} />
          <span>Branch Locations</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: USER DIRECTORY                                    */}
      {/* ======================================================== */}
      {activeTab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Filter and Search Bar */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              padding: '14px 18px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', flex: 1, minWidth: '260px', position: 'relative' }}>
              <Search
                size={16}
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}
              />
              <input
                type="text"
                placeholder="Search by name, @username, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '0.85rem',
                  backgroundColor: '#ffffff',
                  color: '#374151',
                }}
              >
                <option value="all">All Roles</option>
                {roles.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.roleName}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '0.85rem',
                  backgroundColor: '#ffffff',
                  color: '#374151',
                }}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
                <option value="locked">Locked</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              overflow: 'hidden',
            }}
          >
            {loading ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#6b7280' }}>
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
                <span>Loading users catalog...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#6b7280' }}>
                <p style={{ margin: 0, fontSize: '0.95rem' }}>No users match the selected criteria.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontWeight: '600' }}>
                      <th style={{ padding: '12px 18px' }}>User Details</th>
                      <th style={{ padding: '12px 18px' }}>Assigned Role</th>
                      <th style={{ padding: '12px 18px' }}>Primary Branch</th>
                      <th style={{ padding: '12px 18px' }}>Status</th>
                      <th style={{ padding: '12px 18px' }}>Last Active</th>
                      <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => {
                      const primaryBranch = u.branchAccess?.find((b) => b.isPrimary)?.branchId || u.branchAccess?.[0]?.branchId;
                      const isMe = currentUser?._id === u._id;

                      const statusColors = {
                        active: { bg: '#e6f4ea', text: '#0d904f' },
                        inactive: { bg: '#f3f4f6', text: '#4b5563' },
                        suspended: { bg: '#fef3c7', text: '#d97706' },
                        locked: { bg: '#fee2e2', text: '#dc2626' },
                      }[u.status] || { bg: '#f3f4f6', text: '#4b5563' };

                      return (
                        <tr key={u._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          {/* User Identity */}
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div
                                style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '50%',
                                  backgroundColor: '#e8f0fe',
                                  color: '#1a73e8',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: '700',
                                  fontSize: '0.85rem',
                                  flexShrink: 0,
                                }}
                              >
                                {u.firstName?.[0] || 'U'}{u.lastName?.[0] || ''}
                              </div>
                              <div>
                                <div style={{ fontWeight: '600', color: '#111827', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>{u.firstName} {u.lastName}</span>
                                  {isMe && (
                                    <span style={{ fontSize: '0.68rem', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: '4px' }}>
                                      You
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                                  @{u.username} • {u.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Role Badge */}
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  backgroundColor: u.roleId?.roleCode === 'agent' ? '#f0fdf4' : '#f0f9ff',
                                  color: u.roleId?.roleCode === 'agent' ? '#166534' : '#0284c7',
                                  fontWeight: '600',
                                  fontSize: '0.78rem',
                                  border: u.roleId?.roleCode === 'agent' ? '1px solid #bbf7d0' : '1px solid #bae6fd',
                                }}
                              >
                                {u.roleId?.roleCode === 'agent' ? <Award size={12} style={{ color: '#16a34a' }} /> : <Shield size={12} />}
                                {u.roleId?.roleName || 'Unassigned'}
                              </span>

                              {u.roleId?.roleCode === 'agent' && u.agentProfile && (
                                <span
                                  style={{
                                    fontSize: '0.72rem',
                                    color: '#0d904f',
                                    fontWeight: '700',
                                    backgroundColor: '#e6f4ea',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                  }}
                                >
                                  {u.agentProfile.commissionType === 'percentage'
                                    ? `${u.agentProfile.commissionRate || 2}% Comm`
                                    : `₹${(u.agentProfile.commissionRate || 25000).toLocaleString('en-IN')} Flat`}
                                  {' • '}₹{(u.agentProfile.walletBalance || 0).toLocaleString('en-IN')} Wallet
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Branch */}
                          <td style={{ padding: '14px 18px', color: '#374151' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}>
                              <Building2 size={14} style={{ color: '#9ca3af' }} />
                              <span>{primaryBranch?.branchName || 'Head Office'}</span>
                            </div>
                          </td>

                          {/* Status */}
                          <td style={{ padding: '14px 18px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 9px',
                                borderRadius: '12px',
                                backgroundColor: statusColors.bg,
                                color: statusColors.text,
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                textTransform: 'capitalize',
                              }}
                            >
                              {u.status}
                            </span>
                          </td>

                          {/* Last Login */}
                          <td style={{ padding: '14px 18px', color: '#6b7280', fontSize: '0.8rem' }}>
                            {u.lastLoginAt
                              ? new Date(u.lastLoginAt).toLocaleString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Never'}
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                              <button
                                onClick={() => handleOpenUserModal(u)}
                                title="Edit User Details"
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #e5e7eb',
                                  backgroundColor: '#ffffff',
                                  color: '#374151',
                                  cursor: 'pointer',
                                }}
                              >
                                <Edit2 size={13} />
                              </button>

                              <button
                                onClick={() => {
                                  setTargetUserForPassword(u);
                                  setNewPasswordValue('');
                                  setPasswordModalOpen(true);
                                }}
                                title="Reset Password"
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #e5e7eb',
                                  backgroundColor: '#ffffff',
                                  color: '#374151',
                                  cursor: 'pointer',
                                }}
                              >
                                <KeyRound size={13} />
                              </button>

                              {u.status === 'locked' && (
                                <button
                                  onClick={() => handleToggleStatus(u._id, 'active')}
                                  title="Unlock Account"
                                  style={{
                                    padding: '5px 8px',
                                    borderRadius: '6px',
                                    border: '1px solid #fed7aa',
                                    backgroundColor: '#fff7ed',
                                    color: '#c2410c',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <Unlock size={13} />
                                </button>
                              )}

                              {u.username !== 'admin' && (
                                <button
                                  onClick={() => handleDeleteUser(u._id, u.username)}
                                  title="Delete User"
                                  style={{
                                    padding: '5px 8px',
                                    borderRadius: '6px',
                                    border: '1px solid #fee2e2',
                                    backgroundColor: '#fff5f5',
                                    color: '#dc2626',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: ROLE PERMISSION MATRIX                            */}
      {/* ======================================================== */}
      {activeTab === 'roles' && (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', alignItems: 'start' }}>
          {/* Roles Selector Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Select Role to Configure
            </div>

            {roles.map((r) => {
              const isSelected = selectedRoleForMatrix?._id === r._id;
              const permCount = r.permissions?.length || 0;

              return (
                <div
                  key={r._id}
                  onClick={() => setSelectedRoleForMatrix(r)}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '10px',
                    backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                    border: isSelected ? '1.5px solid #1a73e8' : '1px solid #e5e7eb',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.9rem', color: isSelected ? '#1a73e8' : '#1f2937' }}>
                      {r.roleName}
                    </span>
                    {r.isSystemRole && (
                      <span style={{ fontSize: '0.68rem', backgroundColor: '#f3f4f6', color: '#6b7280', padding: '1px 6px', borderRadius: '4px' }}>
                        System
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '0 0 8px', fontSize: '0.78rem', color: '#6b7280', lineHeight: 1.4 }}>
                    {r.description || 'No description provided'}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#9ca3af' }}>
                    <span>{r.userCount || 0} user(s) assigned</span>
                    <span style={{ color: '#1a73e8', fontWeight: '600' }}>{permCount} permissions</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Permissions Matrix Detail */}
          {selectedRoleForMatrix && (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#111827' }}>
                      {selectedRoleForMatrix.roleName}
                    </h3>
                    <code style={{ fontSize: '0.75rem', backgroundColor: '#f3f4f6', padding: '2px 6px', borderRadius: '4px', color: '#6b7280' }}>
                      {selectedRoleForMatrix.roleCode}
                    </code>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#6b7280' }}>
                    Toggle individual permissions granted to users with this role.
                  </p>
                </div>

                {selectedRoleForMatrix.roleCode === 'super_admin' && (
                  <span style={{ fontSize: '0.8rem', backgroundColor: '#e6f4ea', color: '#0d904f', padding: '4px 10px', borderRadius: '6px', fontWeight: '600' }}>
                    Full Unrestricted Master Access
                  </span>
                )}
              </div>

              {/* Module-wise Grouped Permissions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {Object.entries(permissionGroups).map(([moduleName, perms]) => {
                  const rolePermIds = (selectedRoleForMatrix.permissions || []).map((p) =>
                    typeof p === 'object' ? p._id : p
                  );

                  return (
                    <div key={moduleName} style={{ border: '1px solid #f3f4f6', borderRadius: '8px', overflow: 'hidden' }}>
                      <div
                        style={{
                          backgroundColor: '#f9fafb',
                          padding: '10px 14px',
                          fontWeight: '700',
                          fontSize: '0.85rem',
                          color: '#374151',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderBottom: '1px solid #f3f4f6',
                        }}
                      >
                        <span>{moduleName} Module</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: '500', color: '#9ca3af' }}>
                          {perms.filter((p) => rolePermIds.includes(p._id)).length} / {perms.length} enabled
                        </span>
                      </div>

                      <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                        {perms.map((p) => {
                          const isChecked = selectedRoleForMatrix.roleCode === 'super_admin' || rolePermIds.includes(p._id);
                          const isSuper = selectedRoleForMatrix.roleCode === 'super_admin';

                          return (
                            <label
                              key={p._id}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '10px',
                                padding: '8px',
                                borderRadius: '6px',
                                cursor: isSuper ? 'default' : 'pointer',
                                backgroundColor: isChecked ? '#f8fafc' : 'transparent',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isSuper}
                                onChange={() => handleTogglePermissionForRole(p._id)}
                                style={{ marginTop: '3px', accentColor: '#1a73e8', cursor: isSuper ? 'default' : 'pointer' }}
                              />
                              <div>
                                <div style={{ fontSize: '0.82rem', fontWeight: '600', color: '#1f2937' }}>
                                  {p.permissionName}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                                  {p.description || p.permissionCode}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: BRANCH LOCATIONS                                  */}
      {/* ======================================================== */}
      {activeTab === 'branches' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {branches.map((b) => (
            <div
              key={b._id}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '14px',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#e8f0fe', color: '#1a73e8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building2 size={20} />
                  </div>
                  {b.isHeadOffice && (
                    <span style={{ fontSize: '0.72rem', backgroundColor: '#e6f4ea', color: '#0d904f', padding: '3px 8px', borderRadius: '6px', fontWeight: '700' }}>
                      Headquarters
                    </span>
                  )}
                </div>

                <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: '700', color: '#111827' }}>
                  {b.branchName}
                </h3>
                <div style={{ fontSize: '0.78rem', color: '#6b7280', marginBottom: '12px' }}>
                  Code: <code style={{ backgroundColor: '#f3f4f6', padding: '2px 5px', borderRadius: '4px' }}>{b.branchCode}</code>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem', color: '#4b5563' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={14} style={{ color: '#9ca3af', flexShrink: 0 }} />
                    <span>{b.address?.addressLine1 || 'Main Location'}, {b.address?.city || ''}</span>
                  </div>
                  {b.contactNumber && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Phone size={14} style={{ color: '#9ca3af', flexShrink: 0 }} />
                      <span>{b.contactNumber}</span>
                    </div>
                  )}
                  {b.contactEmail && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Mail size={14} style={{ color: '#9ca3af', flexShrink: 0 }} />
                      <span>{b.contactEmail}</span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ paddingTop: '12px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#6b7280' }}>
                <span>Status: <strong style={{ color: '#0d904f' }}>Active Site</strong></span>
                <span>Assigned Staff: <strong>{users.filter((u) => u.branchAccess?.some((ba) => (ba.branchId?._id || ba.branchId) === b._id)).length}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CREATE / EDIT USER                                */}
      {/* ======================================================== */}
      {userModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '620px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#111827' }}>
                {editingUser ? `Edit User: @${editingUser.username}` : 'Create New ERP User'}
              </h3>
              <button
                onClick={() => setUserModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveUser} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Name fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={userFormData.firstName}
                    onChange={(e) => setUserFormData({ ...userFormData, firstName: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={userFormData.lastName}
                    onChange={(e) => setUserFormData({ ...userFormData, lastName: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Username & Email */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                    Username * (Unique identifier)
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingUser}
                    value={userFormData.username}
                    onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.88rem', boxSizing: 'border-box', backgroundColor: editingUser ? '#f3f4f6' : '#ffffff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                    Corporate Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Mobile & Password (only for new users) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={userFormData.mobileNo}
                    onChange={(e) => setUserFormData({ ...userFormData, mobileNo: e.target.value })}
                    placeholder="+91 98765 00000"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  />
                </div>

                {!editingUser && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                      Initial Password *
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Minimum 6 characters"
                      value={userFormData.password}
                      onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.88rem', boxSizing: 'border-box' }}
                    />
                  </div>
                )}
              </div>

              {/* Role & Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                    System Role *
                  </label>
                  <select
                    required
                    value={userFormData.roleId}
                    onChange={(e) => setUserFormData({ ...userFormData, roleId: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.88rem', boxSizing: 'border-box', backgroundColor: '#ffffff' }}
                  >
                    <option value="">Select Role</option>
                    {roles.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.roleName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                    Account Status
                  </label>
                  <select
                    value={userFormData.status}
                    onChange={(e) => setUserFormData({ ...userFormData, status: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.88rem', boxSizing: 'border-box', backgroundColor: '#ffffff' }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                    <option value="locked">Locked</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Agent / Channel Partner Commission Configuration */}
              {roles.find((r) => r._id === userFormData.roleId)?.roleCode === 'agent' && (
                <div
                  style={{
                    backgroundColor: '#f0fdf4',
                    border: '1.5px solid #86efac',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <DollarSign size={18} style={{ color: '#0d904f' }} />
                    <span style={{ fontWeight: '700', fontSize: '0.88rem', color: '#166534' }}>
                      Agent Commission Setup (Credited upon Matured Site Visits)
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#166534', marginBottom: '4px' }}>
                        Agency / Channel Partner Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Vrindavan Prime Realty"
                        value={userFormData.agentProfile?.agencyName || ''}
                        onChange={(e) =>
                          setUserFormData({
                            ...userFormData,
                            agentProfile: { ...userFormData.agentProfile, agencyName: e.target.value },
                          })
                        }
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #86efac', fontSize: '0.85rem', boxSizing: 'border-box', backgroundColor: '#ffffff' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#166534', marginBottom: '4px' }}>
                        RERA Registration Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. UPRERAAGT12894"
                        value={userFormData.agentProfile?.reraNumber || ''}
                        onChange={(e) =>
                          setUserFormData({
                            ...userFormData,
                            agentProfile: { ...userFormData.agentProfile, reraNumber: e.target.value },
                          })
                        }
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #86efac', fontSize: '0.85rem', boxSizing: 'border-box', backgroundColor: '#ffffff' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#166534', marginBottom: '4px' }}>
                        Commission Calculation Model *
                      </label>
                      <select
                        value={userFormData.agentProfile?.commissionType || 'percentage'}
                        onChange={(e) =>
                          setUserFormData({
                            ...userFormData,
                            agentProfile: {
                              ...userFormData.agentProfile,
                              commissionType: e.target.value,
                              commissionRate: e.target.value === 'percentage' ? 2 : 25000,
                            },
                          })
                        }
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #86efac', fontSize: '0.85rem', boxSizing: 'border-box', backgroundColor: '#ffffff' }}
                      >
                        <option value="percentage">Percentage (%) of Lead Budget / Unit Price</option>
                        <option value="flat">Flat Fixed Amount (₹) per Matured Visit</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#166534', marginBottom: '4px' }}>
                        Commission Rate * {userFormData.agentProfile?.commissionType === 'percentage' ? '(in %)' : '(in ₹)'}
                      </label>
                      <input
                        type="number"
                        step={userFormData.agentProfile?.commissionType === 'percentage' ? '0.1' : '1000'}
                        required
                        placeholder={userFormData.agentProfile?.commissionType === 'percentage' ? '2.0' : '25000'}
                        value={userFormData.agentProfile?.commissionRate ?? (userFormData.agentProfile?.commissionType === 'percentage' ? 2 : 25000)}
                        onChange={(e) =>
                          setUserFormData({
                            ...userFormData,
                            agentProfile: { ...userFormData.agentProfile, commissionRate: Number(e.target.value) },
                          })
                        }
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #86efac', fontSize: '0.85rem', boxSizing: 'border-box', backgroundColor: '#ffffff' }}
                      />
                    </div>
                  </div>
                </div>
              )}



              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#ffffff', color: '#374151', fontSize: '0.88rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    padding: '9px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#1a73e8',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    fontWeight: '600',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {actionLoading ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: RESET PASSWORD                                    */}
      {/* ======================================================== */}
      {passwordModalOpen && targetUserForPassword && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '420px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <KeyRound size={20} style={{ color: '#1a73e8' }} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#111827' }}>
                  Reset Password
                </h3>
              </div>
              <button
                onClick={() => setPasswordModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '0 0 16px' }}>
              Set a new secure password for <strong>@{targetUserForPassword.username}</strong> ({targetUserForPassword.firstName} {targetUserForPassword.lastName}).
            </p>

            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                  New Password (min 6 characters)
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter new password..."
                  value={newPasswordValue}
                  onChange={(e) => setNewPasswordValue(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.88rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#ffffff', color: '#374151', fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#1a73e8',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {actionLoading ? 'Updating...' : 'Set Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default UserManagementPage;
