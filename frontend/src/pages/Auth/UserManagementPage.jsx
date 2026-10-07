import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { authService } from '../../services/authService.js';
import {
  Users,
  Shield,
  ShieldCheck,
  ShieldAlert,
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
  ChevronUp,
  Layers,
  MapPin,
  Mail,
  Phone,
  Calendar,
  Sparkles,
  Award,
  DollarSign,
  Loader2,
  Grid,
  List,
  CheckSquare,
  Square,
  Copy,
  Briefcase,
  UserCheck,
  UserX,
  Info,
  ExternalLink,
  ChevronRight,
  TrendingUp
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

  // Main Data States
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [permissionGroups, setPermissionGroups] = useState({});
  const [loading, setLoading] = useState(true);

  // User Directory Filters & View Mode
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'

  // Role Permissions Matrix States
  const [selectedRoleForMatrix, setSelectedRoleForMatrix] = useState(null);
  const [roleSearchTerm, setRoleSearchTerm] = useState('');
  const [permSearchTerm, setPermSearchTerm] = useState('');
  const [selectedModuleCategory, setSelectedModuleCategory] = useState('All');
  const [collapsedModules, setCollapsedModules] = useState({});

  // Modals
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [targetUserForPassword, setTargetUserForPassword] = useState(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  // User Form
  const [userFormData, setUserFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    mobileNo: '',
    password: '',
    roleId: '',
    status: 'active',
    agentProfile: {
      agencyName: '',
      reraNumber: '',
      commissionType: 'percentage',
      commissionRate: 2,
    },
    branchAccess: [],
  });

  // Role Form
  const [roleFormData, setRoleFormData] = useState({
    roleName: '',
    roleCode: '',
    description: '',
    cloneFromRoleId: '',
    isActive: true,
  });

  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', type: '' });

  const showFeedback = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback({ message: '', type: '' }), 4000);
  };

  // Load Data
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
        const fetchedRoles = rolesRes.data || [];
        setRoles(fetchedRoles);
        if (fetchedRoles.length > 0) {
          if (!selectedRoleForMatrix) {
            setSelectedRoleForMatrix(fetchedRoles[0]);
          } else {
            const updatedSelected = fetchedRoles.find((r) => r._id === selectedRoleForMatrix._id);
            setSelectedRoleForMatrix(updatedSelected || fetchedRoles[0]);
          }
        }
      }
      if (branchesRes.success) setBranches(branchesRes.data || []);
      if (permsRes.success) {
        setPermissions(permsRes.data || []);
        setPermissionGroups(permsRes.grouped || {});
      }
    } catch (err) {
      console.error('Failed to load access control data:', err);
      showFeedback(err.message || 'Failed to load access data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Module Category Definitions
  const moduleCategories = {
    'Channel Partners': ['Agents'],
    'Sales & CRM': ['Leads', 'CRM', 'Visits', 'Bookings'],
    'Properties & Assets': ['Properties', 'Rentals'],
    'Workforce & Staff': ['Taskforce', 'Attendance'],
    'Finance & Billings': ['Invoices', 'Payments', 'Reports'],
    'System & Security': ['Users', 'Roles', 'Settings', 'Audit'],
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.mobileNo && u.mobileNo.includes(q)) ||
        (u.agentProfile?.agencyName && u.agentProfile.agencyName.toLowerCase().includes(q));

      const matchesRole =
        selectedRoleFilter === 'all' ||
        u.roleId?._id === selectedRoleFilter ||
        u.roleId?.roleCode === selectedRoleFilter;

      const matchesStatus =
        selectedStatusFilter === 'all' || u.status === selectedStatusFilter;

      const matchesBranch =
        selectedBranchFilter === 'all' ||
        u.branchAccess?.some((b) => (b.branchId?._id || b.branchId) === selectedBranchFilter);

      return matchesSearch && matchesRole && matchesStatus && matchesBranch;
    });
  }, [users, searchTerm, selectedRoleFilter, selectedStatusFilter, selectedBranchFilter]);

  // Filtered Roles (for Role Matrix Left Column)
  const filteredRoles = useMemo(() => {
    if (!roleSearchTerm.trim()) return roles;
    const q = roleSearchTerm.toLowerCase();
    return roles.filter(
      (r) =>
        r.roleName.toLowerCase().includes(q) ||
        r.roleCode.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q))
    );
  }, [roles, roleSearchTerm]);

  // Filtered Permission Groups (for Role Matrix Workspace)
  const filteredPermissionGroups = useMemo(() => {
    let result = {};
    const query = permSearchTerm.toLowerCase().trim();

    Object.entries(permissionGroups).forEach(([modName, perms]) => {
      // Check category match
      if (selectedModuleCategory !== 'All') {
        const allowedModules = moduleCategories[selectedModuleCategory] || [];
        if (!allowedModules.includes(modName)) return;
      }

      // Check search match
      if (query) {
        const matchingPerms = perms.filter(
          (p) =>
            p.permissionName.toLowerCase().includes(query) ||
            p.permissionCode.toLowerCase().includes(query) ||
            (p.description && p.description.toLowerCase().includes(query)) ||
            modName.toLowerCase().includes(query)
        );
        if (matchingPerms.length > 0) {
          result[modName] = matchingPerms;
        }
      } else {
        result[modName] = perms;
      }
    });

    return result;
  }, [permissionGroups, permSearchTerm, selectedModuleCategory]);

  // Role Statistics Helper
  const getRolePermissionStats = (role) => {
    if (!role) return { total: 0, granted: 0, percentage: 0 };
    if (role.roleCode === 'super_admin') {
      return { total: permissions.length, granted: permissions.length, percentage: 100 };
    }
    const granted = (role.permissions || []).length;
    const total = permissions.length || 1;
    const percentage = Math.round((granted / total) * 100);
    return { total: permissions.length, granted, percentage };
  };

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

  // Save User
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

  // Quick Status Toggle
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
    if (!window.confirm(`Are you sure you want to permanently delete user @${username}? This action cannot be undone.`)) {
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

  // Branch Access Checkbox Handler
  const handleBranchAccessChange = (branchId, field, value) => {
    setUserFormData((prev) => {
      const existingIdx = prev.branchAccess.findIndex(
        (b) => (b.branchId?._id || b.branchId) === branchId
      );
      let updated = [...prev.branchAccess];

      if (field === 'enabled') {
        if (value) {
          if (existingIdx === -1) {
            updated.push({
              branchId,
              accessLevel: 'view',
              isPrimary: updated.length === 0,
            });
          }
        } else {
          updated = updated.filter(
            (b) => (b.branchId?._id || b.branchId) !== branchId
          );
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
          isPrimary: (b.branchId?._id || b.branchId) === branchId,
        }));
      }

      return { ...prev, branchAccess: updated };
    });
  };

  // ==========================================
  // Role Matrix Permissions Handlers
  // ==========================================

  // Toggle single permission for selected role
  const handleTogglePermissionForRole = async (permissionId) => {
    if (!selectedRoleForMatrix || (selectedRoleForMatrix.isSystemRole && selectedRoleForMatrix.roleCode === 'super_admin')) {
      return;
    }

    const currentPermIds = (selectedRoleForMatrix.permissions || []).map((p) =>
      typeof p === 'object' && p !== null ? p._id : p
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
        showFeedback(`Permission updated for ${selectedRoleForMatrix.roleName}`);
      }
    } catch (err) {
      showFeedback(err.message || 'Failed to update permission', 'error');
    }
  };

  // Toggle all permissions for a specific module (Enable All / Disable All)
  const handleToggleModulePermissions = async (moduleName, grantAll) => {
    if (!selectedRoleForMatrix || (selectedRoleForMatrix.isSystemRole && selectedRoleForMatrix.roleCode === 'super_admin')) {
      return;
    }

    const modPerms = permissionGroups[moduleName] || [];
    const modPermIds = modPerms.map((p) => p._id);

    const currentPermIds = (selectedRoleForMatrix.permissions || []).map((p) =>
      typeof p === 'object' && p !== null ? p._id : p
    );

    let updatedPermIds;
    if (grantAll) {
      // Add all missing
      const toAdd = modPermIds.filter((id) => !currentPermIds.includes(id));
      updatedPermIds = [...currentPermIds, ...toAdd];
    } else {
      // Remove all
      updatedPermIds = currentPermIds.filter((id) => !modPermIds.includes(id));
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
        showFeedback(
          grantAll
            ? `Granted all ${moduleName} permissions to ${selectedRoleForMatrix.roleName}`
            : `Revoked all ${moduleName} permissions from ${selectedRoleForMatrix.roleName}`
        );
      }
    } catch (err) {
      showFeedback(err.message || 'Failed to update module permissions', 'error');
    }
  };

  // Bulk: Enable All across the whole system for selected role
  const handleGrantAllSystemPermissions = async () => {
    if (!selectedRoleForMatrix || (selectedRoleForMatrix.isSystemRole && selectedRoleForMatrix.roleCode === 'super_admin')) {
      return;
    }

    if (!window.confirm(`Grant ALL ${permissions.length} permissions to role "${selectedRoleForMatrix.roleName}"?`)) {
      return;
    }

    const allPermIds = permissions.map((p) => p._id);
    try {
      const res = await authService.updateRole(selectedRoleForMatrix._id, {
        permissions: allPermIds,
      });
      if (res.success) {
        setSelectedRoleForMatrix(res.data);
        setRoles((prev) =>
          prev.map((r) => (r._id === selectedRoleForMatrix._id ? res.data : r))
        );
        showFeedback(`All ${permissions.length} permissions granted to ${selectedRoleForMatrix.roleName}`);
      }
    } catch (err) {
      showFeedback(err.message || 'Failed to grant permissions', 'error');
    }
  };

  // Bulk: Revoke All across the whole system for selected role
  const handleRevokeAllSystemPermissions = async () => {
    if (!selectedRoleForMatrix || (selectedRoleForMatrix.isSystemRole && selectedRoleForMatrix.roleCode === 'super_admin')) {
      return;
    }

    if (!window.confirm(`Revoke ALL permissions from role "${selectedRoleForMatrix.roleName}"? Users with this role will have zero module access.`)) {
      return;
    }

    try {
      const res = await authService.updateRole(selectedRoleForMatrix._id, {
        permissions: [],
      });
      if (res.success) {
        setSelectedRoleForMatrix(res.data);
        setRoles((prev) =>
          prev.map((r) => (r._id === selectedRoleForMatrix._id ? res.data : r))
        );
        showFeedback(`All permissions revoked from ${selectedRoleForMatrix.roleName}`);
      }
    } catch (err) {
      showFeedback(err.message || 'Failed to revoke permissions', 'error');
    }
  };

  // Open Role Modal (Create or Edit)
  const handleOpenRoleModal = (role = null) => {
    if (role) {
      setEditingRole(role);
      setRoleFormData({
        roleName: role.roleName || '',
        roleCode: role.roleCode || '',
        description: role.description || '',
        cloneFromRoleId: '',
        isActive: role.isActive ?? true,
      });
    } else {
      setEditingRole(null);
      setRoleFormData({
        roleName: '',
        roleCode: '',
        description: '',
        cloneFromRoleId: '',
        isActive: true,
      });
    }
    setRoleModalOpen(true);
  };

  // Save Role
  const handleSaveRole = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (editingRole) {
        const payload = {
          roleName: roleFormData.roleName,
          description: roleFormData.description,
          isActive: roleFormData.isActive,
        };
        const res = await authService.updateRole(editingRole._id, payload);
        if (res.success) {
          showFeedback('Role updated successfully!');
          setRoleModalOpen(false);
          loadData();
        }
      } else {
        let initialPerms = [];
        if (roleFormData.cloneFromRoleId) {
          const donorRole = roles.find((r) => r._id === roleFormData.cloneFromRoleId);
          if (donorRole) {
            initialPerms = (donorRole.permissions || []).map((p) => (typeof p === 'object' ? p._id : p));
          }
        }

        const payload = {
          roleName: roleFormData.roleName,
          roleCode: roleFormData.roleCode || roleFormData.roleName.toLowerCase().replace(/\s+/g, '_'),
          description: roleFormData.description,
          permissions: initialPerms,
          isActive: roleFormData.isActive,
        };

        const res = await authService.createRole(payload);
        if (res.success) {
          showFeedback('New custom role created successfully!');
          setRoleModalOpen(false);
          loadData();
          if (res.data) setSelectedRoleForMatrix(res.data);
        }
      }
    } catch (err) {
      showFeedback(err.message || 'Failed to save role', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Custom Role
  const handleDeleteRole = async (roleId, roleName) => {
    if (!window.confirm(`Delete role "${roleName}"? This role cannot be restored.`)) {
      return;
    }
    try {
      const res = await authService.deleteRole(roleId);
      if (res.success) {
        showFeedback(`Role "${roleName}" deleted successfully`);
        setRoles((prev) => prev.filter((r) => r._id !== roleId));
        if (selectedRoleForMatrix?._id === roleId) {
          const remaining = roles.filter((r) => r._id !== roleId);
          setSelectedRoleForMatrix(remaining[0] || null);
        }
      }
    } catch (err) {
      showFeedback(err.message || 'Failed to delete role', 'error');
    }
  };

  // Toggle Module Accordion Collapse
  const toggleModuleCollapse = (moduleName) => {
    setCollapsedModules((prev) => ({
      ...prev,
      [moduleName]: !prev[moduleName],
    }));
  };

  // Get module icon
  const getModuleIcon = (modName) => {
    switch (modName) {
      case 'Agents':
        return <Award size={18} style={{ color: '#0284c7' }} />;
      case 'Leads':
      case 'CRM':
        return <Sparkles size={18} style={{ color: '#1a73e8' }} />;
      case 'Properties':
      case 'Rentals':
        return <Building2 size={18} style={{ color: '#059669' }} />;
      case 'Users':
      case 'Roles':
        return <Users size={18} style={{ color: '#6366f1' }} />;
      case 'Invoices':
      case 'Payments':
        return <DollarSign size={18} style={{ color: '#d97706' }} />;
      default:
        return <Shield size={18} style={{ color: '#475569' }} />;
    }
  };

  // Helper to format camelCase module names like AccessControl -> Access Control
  const formatModuleName = (modName) => {
    if (!modName) return '';
    return modName.replace(/([a-z])([A-Z])/g, '$1 $2');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minHeight: '100%', paddingBottom: '32px' }}>
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
            backgroundColor: feedback.type === 'error' ? '#0f172a' : '#1a73e8',
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

      {/* ======================================================== */}
      {/* HERO / EXECUTIVE HEADER                                  */}
      {/* ======================================================== */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '24px 28px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '6px',
                backgroundColor: 'rgba(26, 115, 232, 0.08)',
                color: '#1a73e8',
                fontSize: '0.74rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              <ShieldCheck size={14} />
              Access Control & Governance
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '6px',
                backgroundColor: '#ecfdf5',
                color: '#059669',
                fontSize: '0.72rem',
                fontWeight: '600',
              }}
            >
              <CheckCircle2 size={12} />
              Zero-Trust RBAC Active
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>
            Identity & Privilege Governance
          </h1>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b', marginTop: '4px' }}>
            Unified directory for ERP operator accounts, granular module permission policies, and regional multi-site authorizations.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={loadData}
            title="Reload data from database"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 14px',
              borderRadius: '9px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontSize: '0.84rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            <span>Sync</span>
          </button>

          <button
            onClick={() => handleOpenRoleModal()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 15px',
              borderRadius: '9px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              color: '#1e293b',
              fontSize: '0.84rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Shield size={15} style={{ color: '#1a73e8' }} />
            <span>Create Custom Role</span>
          </button>

          <button
            onClick={() => handleOpenUserModal()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 18px',
              borderRadius: '9px',
              border: 'none',
              backgroundColor: '#1a73e8',
              color: '#ffffff',
              fontSize: '0.86rem',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(26,115,232,0.3)',
              transition: 'all 0.15s ease',
            }}
          >
            <Plus size={16} />
            <span>New System User</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* EXECUTIVE KPI SUMMARY CARDS                              */}
      {/* ======================================================== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px' }}>
        {/* Card 1: Users */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: '#eff6ff',
              color: '#1a73e8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              System Users
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>
              {users.length}{' '}
              <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#059669' }}>
                ({users.filter((u) => u.status === 'active').length} Active)
              </span>
            </div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '3px' }}>
              {users.filter((u) => u.status === 'locked' || u.status === 'suspended').length} restricted accounts
            </div>
          </div>
        </div>

        {/* Card 2: Roles */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: '#f5f3ff',
              color: '#7c3aed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Configured Roles
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>
              {roles.length}{' '}
              <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#7c3aed' }}>
                ({roles.filter((r) => r.isSystemRole).length} Built-in)
              </span>
            </div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '3px' }}>
              {roles.filter((r) => !r.isSystemRole).length} custom operational roles
            </div>
          </div>
        </div>

        {/* Card 3: Branches */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Building2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Branch Locations
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>
              {branches.length}{' '}
              <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#059669' }}>Hubs</span>
            </div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '3px' }}>
              Head Office + regional sites
            </div>
          </div>
        </div>

        {/* Card 4: Permissions */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: '#fffbeb',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Sliders size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Permission Capabilities
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>
              {permissions.length}{' '}
              <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#d97706' }}>
                ({Object.keys(permissionGroups).length} Modules)
              </span>
            </div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '3px' }}>
              Agents, CRM, Sales, Assets & Accounts
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TABS NAVIGATION                                          */}
      {/* ======================================================== */}
      <div
        style={{
          display: 'flex',
          backgroundColor: '#f1f5f9',
          padding: '6px',
          borderRadius: '12px',
          gap: '6px',
          width: 'fit-content',
        }}
      >
        <button
          onClick={() => handleTabChange('users')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 18px',
            borderRadius: '9px',
            border: 'none',
            backgroundColor: activeTab === 'users' ? '#ffffff' : 'transparent',
            color: activeTab === 'users' ? '#0f172a' : '#64748b',
            fontWeight: activeTab === 'users' ? '700' : '600',
            fontSize: '0.88rem',
            cursor: 'pointer',
            boxShadow: activeTab === 'users' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <Users size={16} style={{ color: activeTab === 'users' ? '#1a73e8' : '#94a3b8' }} />
          <span>User Directory</span>
          <span
            style={{
              fontSize: '0.72rem',
              padding: '2px 7px',
              borderRadius: '999px',
              backgroundColor: activeTab === 'users' ? '#eff6ff' : '#e2e8f0',
              color: activeTab === 'users' ? '#1a73e8' : '#64748b',
              fontWeight: '700',
            }}
          >
            {users.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('roles')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 18px',
            borderRadius: '9px',
            border: 'none',
            backgroundColor: activeTab === 'roles' ? '#ffffff' : 'transparent',
            color: activeTab === 'roles' ? '#0f172a' : '#64748b',
            fontWeight: activeTab === 'roles' ? '700' : '600',
            fontSize: '0.88rem',
            cursor: 'pointer',
            boxShadow: activeTab === 'roles' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <ShieldCheck size={16} style={{ color: activeTab === 'roles' ? '#1a73e8' : '#94a3b8' }} />
          <span>Role Permissions Matrix</span>
          <span
            style={{
              fontSize: '0.72rem',
              padding: '2px 7px',
              borderRadius: '999px',
              backgroundColor: activeTab === 'roles' ? '#eff6ff' : '#e2e8f0',
              color: activeTab === 'roles' ? '#1a73e8' : '#64748b',
              fontWeight: '700',
            }}
          >
            {roles.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('branches')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 18px',
            borderRadius: '9px',
            border: 'none',
            backgroundColor: activeTab === 'branches' ? '#ffffff' : 'transparent',
            color: activeTab === 'branches' ? '#0f172a' : '#64748b',
            fontWeight: activeTab === 'branches' ? '700' : '600',
            fontSize: '0.88rem',
            cursor: 'pointer',
            boxShadow: activeTab === 'branches' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <Building2 size={16} style={{ color: activeTab === 'branches' ? '#1a73e8' : '#94a3b8' }} />
          <span>Branch Locations</span>
          <span
            style={{
              fontSize: '0.72rem',
              padding: '2px 7px',
              borderRadius: '999px',
              backgroundColor: activeTab === 'branches' ? '#eff6ff' : '#e2e8f0',
              color: activeTab === 'branches' ? '#1a73e8' : '#64748b',
              fontWeight: '700',
            }}
          >
            {branches.length}
          </span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: USER DIRECTORY                                    */}
      {/* ======================================================== */}
      {activeTab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Controls Bar: Unified Search, Filters & View Toggle */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '14px 18px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            {/* Search Box */}
            <div style={{ flex: '1 1 300px', minWidth: '260px', position: 'relative' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                placeholder="Search users by name, username, email, phone, or agency..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  height: '40px',
                  padding: '0 36px 0 38px',
                  borderRadius: '9px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.86rem',
                  outline: 'none',
                  backgroundColor: '#f8fafc',
                  transition: 'all 0.15s ease',
                  boxSizing: 'border-box',
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '2px',
                  }}
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Filter Dropdowns & View Switcher */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                flexWrap: 'wrap',
                flexShrink: 0,
              }}
            >
              {/* Role Filter */}
              <div style={{ position: 'relative', width: '155px', flexShrink: 0 }}>
                <select
                  value={selectedRoleFilter}
                  onChange={(e) => setSelectedRoleFilter(e.target.value)}
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 28px 0 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.83rem',
                    backgroundColor: '#ffffff',
                    color: '#1e293b',
                    fontWeight: '500',
                    cursor: 'pointer',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    boxSizing: 'border-box',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                  }}
                >
                  <option value="all">All Roles ({roles.length})</option>
                  {roles.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.roleName}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: '#94a3b8',
                  }}
                />
              </div>

              {/* Status Filter */}
              <div style={{ position: 'relative', width: '135px', flexShrink: 0 }}>
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 28px 0 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.83rem',
                    backgroundColor: '#ffffff',
                    color: '#1e293b',
                    fontWeight: '500',
                    cursor: 'pointer',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                  <option value="locked">Locked</option>
                </select>
                <ChevronDown
                  size={14}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: '#94a3b8',
                  }}
                />
              </div>

              {/* Branch Filter */}
              <div style={{ position: 'relative', width: '150px', flexShrink: 0 }}>
                <select
                  value={selectedBranchFilter}
                  onChange={(e) => setSelectedBranchFilter(e.target.value)}
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 28px 0 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.83rem',
                    backgroundColor: '#ffffff',
                    color: '#1e293b',
                    fontWeight: '500',
                    cursor: 'pointer',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    boxSizing: 'border-box',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                  }}
                >
                  <option value="all">All Branches ({branches.length})</option>
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.branchName}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: '#94a3b8',
                  }}
                />
              </div>

              {/* View Mode Switcher */}
              <div
                style={{
                  display: 'flex',
                  height: '40px',
                  backgroundColor: '#f1f5f9',
                  padding: '3px',
                  borderRadius: '8px',
                  gap: '2px',
                  alignItems: 'center',
                  flexShrink: 0,
                  boxSizing: 'border-box',
                }}
              >
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  title="Table View"
                  style={{
                    height: '34px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: viewMode === 'table' ? '#ffffff' : 'transparent',
                    color: viewMode === 'table' ? '#1a73e8' : '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: viewMode === 'table' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <List size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  title="Cards View"
                  style={{
                    height: '34px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: viewMode === 'cards' ? '#ffffff' : 'transparent',
                    color: viewMode === 'cards' ? '#1a73e8' : '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: viewMode === 'cards' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Grid size={16} />
                </button>
              </div>

              {/* Clear Filters Button */}
              {(searchTerm || selectedRoleFilter !== 'all' || selectedStatusFilter !== 'all' || selectedBranchFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedRoleFilter('all');
                    setSelectedStatusFilter('all');
                    setSelectedBranchFilter('all');
                  }}
                  title="Reset all filters"
                  style={{
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#fee2e2',
                    color: '#b91c1c',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <X size={14} />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Results Summary Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px', fontSize: '0.82rem', color: '#64748b' }}>
            <span>
              Showing <strong>{filteredUsers.length}</strong> of <strong>{users.length}</strong> system operators
            </span>
            <span>
              Click any user to view profile or reset access credentials
            </span>
          </div>

          {/* User List Presentation */}
          {loading ? (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                padding: '60px 20px',
                textAlign: 'center',
                color: '#64748b',
              }}
            >
              <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px', color: '#1a73e8' }} />
              <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>Loading operator catalog...</div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                padding: '60px 20px',
                textAlign: 'center',
                color: '#64748b',
              }}
            >
              <UserX size={36} style={{ color: '#94a3b8', margin: '0 auto 12px' }} />
              <div style={{ fontWeight: '700', fontSize: '1.05rem', color: '#1e293b' }}>No users match the search criteria</div>
              <p style={{ margin: '6px 0 16px', fontSize: '0.85rem' }}>
                Try adjusting your search query, role filter, or status selection.
              </p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedRoleFilter('all');
                  setSelectedStatusFilter('all');
                  setSelectedBranchFilter('all');
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontWeight: '600',
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                }}
              >
                Reset Search Filters
              </button>
            </div>
          ) : viewMode === 'table' ? (
            /* TABLE VIEW */
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>
                      <th style={{ padding: '14px 20px' }}>User & Identity</th>
                      <th style={{ padding: '14px 20px' }}>Role & Privileges</th>
                      <th style={{ padding: '14px 20px' }}>Primary Branch</th>
                      <th style={{ padding: '14px 20px' }}>Account Status</th>
                      <th style={{ padding: '14px 20px' }}>Last Activity</th>
                      <th style={{ padding: '14px 20px', textAlign: 'right' }}>Management Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => {
                      const primaryBranch =
                        u.branchAccess?.find((b) => b.isPrimary)?.branchId ||
                        u.branchAccess?.[0]?.branchId;
                      const isMe = currentUser?._id === u._id;
                      const isAgent = u.roleId?.roleCode === 'agent';
                      const isSuper = u.roleId?.roleCode === 'super_admin';

                      const statusBadge = {
                        active: { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
                        inactive: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
                        suspended: { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
                        locked: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
                      }[u.status] || { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };

                      return (
                        <tr
                          key={u._id}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            transition: 'background-color 0.1s ease',
                          }}
                          className="table-hover-row"
                        >
                          {/* User Details */}
                          <td style={{ padding: '14px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div
                                style={{
                                  width: '38px',
                                  height: '38px',
                                  borderRadius: '50%',
                                  backgroundColor: isSuper ? '#fef3c7' : isAgent ? '#e0f2fe' : '#eff6ff',
                                  color: isSuper ? '#d97706' : isAgent ? '#0284c7' : '#1a73e8',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: '800',
                                  fontSize: '0.88rem',
                                  flexShrink: 0,
                                  border: `1.5px solid ${isSuper ? '#fde68a' : isAgent ? '#bae6fd' : '#bfdbfe'}`,
                                }}
                              >
                                {u.firstName?.[0] || 'U'}
                                {u.lastName?.[0] || ''}
                              </div>
                              <div>
                                <div style={{ fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>{u.firstName} {u.lastName}</span>
                                  {isMe && (
                                    <span style={{ fontSize: '0.68rem', backgroundColor: '#eff6ff', color: '#1a73e8', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>
                                      You
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                                  <span>@{u.username}</span>
                                  <span>•</span>
                                  <span>{u.email}</span>
                                  {u.mobileNo && (
                                    <>
                                      <span>•</span>
                                      <span>{u.mobileNo}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td style={{ padding: '14px 20px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '3px 9px',
                                  borderRadius: '6px',
                                  backgroundColor: isSuper
                                    ? '#fef3c7'
                                    : isAgent
                                    ? '#e0f2fe'
                                    : '#f0f9ff',
                                  color: isSuper
                                    ? '#b45309'
                                    : isAgent
                                    ? '#0369a1'
                                    : '#0284c7',
                                  fontWeight: '700',
                                  fontSize: '0.78rem',
                                  border: `1px solid ${isSuper ? '#fde68a' : isAgent ? '#bae6fd' : '#bae6fd'}`,
                                }}
                              >
                                {isSuper ? (
                                  <ShieldCheck size={13} style={{ color: '#d97706' }} />
                                ) : isAgent ? (
                                  <Award size={13} style={{ color: '#0284c7' }} />
                                ) : (
                                  <Shield size={13} />
                                )}
                                {u.roleId?.roleName || 'Unassigned Role'}
                              </span>

                              {/* If Agent, display agency name & commission pill */}
                              {isAgent && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                  {u.agentProfile?.agencyName && (
                                    <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: '600' }}>
                                      {u.agentProfile.agencyName}
                                    </span>
                                  )}
                                  <span
                                    style={{
                                      fontSize: '0.7rem',
                                      color: '#0369a1',
                                      fontWeight: '700',
                                      backgroundColor: '#eff6ff',
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                    }}
                                  >
                                    {u.agentProfile?.commissionType === 'percentage'
                                      ? `${u.agentProfile?.commissionRate ?? 2}% Comm`
                                      : `₹${(u.agentProfile?.commissionRate ?? 25000).toLocaleString('en-IN')} Flat`}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Primary Branch */}
                          <td style={{ padding: '14px 20px', color: '#334155' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem' }}>
                              <Building2 size={15} style={{ color: '#94a3b8' }} />
                              <span style={{ fontWeight: '500' }}>{primaryBranch?.branchName || 'Head Office'}</span>
                              {u.branchAccess && u.branchAccess.length > 1 && (
                                <span
                                  title={`${u.branchAccess.length} branches assigned`}
                                  style={{
                                    fontSize: '0.7rem',
                                    backgroundColor: '#f1f5f9',
                                    padding: '1px 5px',
                                    borderRadius: '4px',
                                    color: '#64748b',
                                    fontWeight: '700',
                                  }}
                                >
                                  +{u.branchAccess.length - 1}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Account Status */}
                          <td style={{ padding: '14px 20px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '3px 9px',
                                borderRadius: '999px',
                                backgroundColor: statusBadge.bg,
                                color: statusBadge.text,
                                border: `1px solid ${statusBadge.border}`,
                                fontSize: '0.76rem',
                                fontWeight: '700',
                                textTransform: 'capitalize',
                              }}
                            >
                              <span
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  backgroundColor: statusBadge.text,
                                }}
                              />
                              {u.status}
                            </span>
                          </td>

                          {/* Last Active */}
                          <td style={{ padding: '14px 20px', color: '#64748b', fontSize: '0.82rem' }}>
                            {u.lastLoginAt ? (
                              <div>
                                <div style={{ color: '#1e293b', fontWeight: '500' }}>
                                  {new Date(u.lastLoginAt).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </div>
                                <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                                  {new Date(u.lastLoginAt).toLocaleTimeString('en-IN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Never logged in</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                              <button
                                onClick={() => handleOpenUserModal(u)}
                                title="Edit user profile & permissions"
                                style={{
                                  padding: '6px 9px',
                                  borderRadius: '7px',
                                  border: '1px solid #e2e8f0',
                                  backgroundColor: '#ffffff',
                                  color: '#334155',
                                  cursor: 'pointer',
                                  transition: 'all 0.1s ease',
                                }}
                              >
                                <Edit2 size={14} />
                              </button>

                              <button
                                onClick={() => {
                                  setTargetUserForPassword(u);
                                  setNewPasswordValue('');
                                  setPasswordModalOpen(true);
                                }}
                                title="Reset account password"
                                style={{
                                  padding: '6px 9px',
                                  borderRadius: '7px',
                                  border: '1px solid #e2e8f0',
                                  backgroundColor: '#ffffff',
                                  color: '#1a73e8',
                                  cursor: 'pointer',
                                  transition: 'all 0.1s ease',
                                }}
                              >
                                <KeyRound size={14} />
                              </button>

                              {u.status === 'locked' ? (
                                <button
                                  onClick={() => handleToggleStatus(u._id, 'active')}
                                  title="Unlock user account"
                                  style={{
                                    padding: '6px 9px',
                                    borderRadius: '7px',
                                    border: '1px solid #bbf7d0',
                                    backgroundColor: '#f0fdf4',
                                    color: '#15803d',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <Unlock size={14} />
                                </button>
                              ) : (
                                <button
                                  onClick={() =>
                                    handleToggleStatus(
                                      u._id,
                                      u.status === 'active' ? 'suspended' : 'active'
                                    )
                                  }
                                  title={u.status === 'active' ? 'Suspend access' : 'Activate user'}
                                  style={{
                                    padding: '6px 9px',
                                    borderRadius: '7px',
                                    border: '1px solid #e2e8f0',
                                    backgroundColor: '#ffffff',
                                    color: u.status === 'active' ? '#d97706' : '#059669',
                                    cursor: 'pointer',
                                  }}
                                >
                                  {u.status === 'active' ? <Lock size={14} /> : <Unlock size={14} />}
                                </button>
                              )}

                              {u.username !== 'admin' && !isMe && (
                                <button
                                  onClick={() => handleDeleteUser(u._id, u.username)}
                                  title="Permanently delete user"
                                  style={{
                                    padding: '6px 9px',
                                    borderRadius: '7px',
                                    border: '1px solid #fecaca',
                                    backgroundColor: '#fff1f2',
                                    color: '#e11d48',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <Trash2 size={14} />
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
            </div>
          ) : (
            /* CARDS GRID VIEW */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {filteredUsers.map((u) => {
                const primaryBranch =
                  u.branchAccess?.find((b) => b.isPrimary)?.branchId ||
                  u.branchAccess?.[0]?.branchId;
                const isMe = currentUser?._id === u._id;
                const isAgent = u.roleId?.roleCode === 'agent';
                const isSuper = u.roleId?.roleCode === 'super_admin';

                const statusBadge = {
                  active: { bg: '#ecfdf5', text: '#059669' },
                  inactive: { bg: '#f1f5f9', text: '#475569' },
                  suspended: { bg: '#fffbeb', text: '#d97706' },
                  locked: { bg: '#fef2f2', text: '#dc2626' },
                }[u.status] || { bg: '#f1f5f9', text: '#475569' };

                return (
                  <div
                    key={u._id}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '14px',
                      border: '1px solid #e2e8f0',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '16px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                      transition: 'all 0.15s ease',
                    }}
                    className="user-card-item"
                  >
                    <div>
                      {/* Top Row: Avatar & Status */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '46px',
                              height: '46px',
                              borderRadius: '50%',
                              backgroundColor: isSuper ? '#fef3c7' : isAgent ? '#e0f2fe' : '#eff6ff',
                              color: isSuper ? '#d97706' : isAgent ? '#0284c7' : '#1a73e8',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: '800',
                              fontSize: '1rem',
                              border: `2px solid ${isSuper ? '#fde68a' : isAgent ? '#bae6fd' : '#bfdbfe'}`,
                            }}
                          >
                            {u.firstName?.[0] || 'U'}
                            {u.lastName?.[0] || ''}
                          </div>
                          <div>
                            <div style={{ fontWeight: '700', fontSize: '1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{u.firstName} {u.lastName}</span>
                              {isMe && (
                                <span style={{ fontSize: '0.66rem', backgroundColor: '#eff6ff', color: '#1a73e8', padding: '1px 5px', borderRadius: '4px', fontWeight: '700' }}>
                                  You
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>@{u.username}</div>
                          </div>
                        </div>

                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '999px',
                            backgroundColor: statusBadge.bg,
                            color: statusBadge.text,
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            textTransform: 'capitalize',
                          }}
                        >
                          {u.status}
                        </span>
                      </div>

                      {/* Role Pill */}
                      <div style={{ marginBottom: '14px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            backgroundColor: isSuper ? '#fef3c7' : isAgent ? '#e0f2fe' : '#f0f9ff',
                            color: isSuper ? '#b45309' : isAgent ? '#0369a1' : '#0284c7',
                            fontWeight: '700',
                            fontSize: '0.8rem',
                            border: `1px solid ${isSuper ? '#fde68a' : isAgent ? '#bae6fd' : '#bae6fd'}`,
                          }}
                        >
                          {isSuper ? <ShieldCheck size={14} style={{ color: '#d97706' }} /> : isAgent ? <Award size={14} /> : <Shield size={14} />}
                          {u.roleId?.roleName || 'Unassigned Role'}
                        </span>
                      </div>

                      {/* Contact Details */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem', color: '#475569' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Mail size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</span>
                        </div>
                        {u.mobileNo && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Phone size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
                            <span>{u.mobileNo}</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Building2 size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
                          <span>{primaryBranch?.branchName || 'Head Office'}</span>
                        </div>
                      </div>

                      {/* Agent Commission Info if Applicable */}
                      {isAgent && u.agentProfile && (
                        <div
                          style={{
                            marginTop: '12px',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            backgroundColor: '#f0f9ff',
                            border: '1px solid #bae6fd',
                            fontSize: '0.78rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <span style={{ color: '#0369a1', fontWeight: '600' }}>
                            {u.agentProfile.agencyName || 'Direct Agent'}
                          </span>
                          <span style={{ color: '#0284c7', fontWeight: '700' }}>
                            {u.agentProfile.commissionType === 'percentage'
                              ? `${u.agentProfile.commissionRate || 2}% Comm`
                              : `₹${(u.agentProfile.commissionRate || 25000).toLocaleString('en-IN')}`}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div
                      style={{
                        paddingTop: '12px',
                        borderTop: '1px solid #f1f5f9',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                        {u.lastLoginAt ? `Active ${new Date(u.lastLoginAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : 'Never active'}
                      </span>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => handleOpenUserModal(u)}
                          title="Edit User"
                          style={{
                            padding: '6px 8px',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                            backgroundColor: '#ffffff',
                            color: '#334155',
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
                            padding: '6px 8px',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                            backgroundColor: '#ffffff',
                            color: '#1a73e8',
                            cursor: 'pointer',
                          }}
                        >
                          <KeyRound size={13} />
                        </button>
                        {u.username !== 'admin' && !isMe && (
                          <button
                            onClick={() => handleDeleteUser(u._id, u.username)}
                            title="Delete User"
                            style={{
                              padding: '6px 8px',
                              borderRadius: '6px',
                              border: '1px solid #fecaca',
                              backgroundColor: '#fff1f2',
                              color: '#e11d48',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: ROLE PERMISSION MATRIX (REDESIGNED)               */}
      {/* ======================================================== */}
      {activeTab === 'roles' && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px', alignItems: 'start' }}>
          {/* ========================================== */}
          {/* LEFT COLUMN: ROLE SELECTION HUB            */}
          {/* ========================================== */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            {/* Header & Search */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                System Roles ({roles.length})
              </div>
              <button
                onClick={() => handleOpenRoleModal()}
                title="Create a new custom operational role"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#eff6ff',
                  color: '#1a73e8',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                <Plus size={14} />
                <span>New</span>
              </button>
            </div>

            {/* Role Search */}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search roles..."
                value={roleSearchTerm}
                onChange={(e) => setRoleSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 32px',
                  borderRadius: '7px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  outline: 'none',
                  backgroundColor: '#f8fafc',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Roles List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '720px', overflowY: 'auto' }}>
              {filteredRoles.map((r) => {
                const isSelected = selectedRoleForMatrix?._id === r._id;
                const stats = getRolePermissionStats(r);
                const isSuper = r.roleCode === 'super_admin';

                return (
                  <div
                    key={r._id}
                    onClick={() => setSelectedRoleForMatrix(r)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                      border: isSelected ? '1.5px solid #1a73e8' : '1px solid #e2e8f0',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.88rem', color: isSelected ? '#1a73e8' : '#0f172a' }}>
                        {r.roleName}
                      </span>
                      {r.isSystemRole ? (
                        <span style={{ fontSize: '0.66rem', backgroundColor: isSuper ? '#fef3c7' : '#f1f5f9', color: isSuper ? '#b45309' : '#475569', padding: '1px 5px', borderRadius: '4px', fontWeight: '700' }}>
                          {isSuper ? 'Master' : 'System'}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.66rem', backgroundColor: '#ecfdf5', color: '#059669', padding: '1px 5px', borderRadius: '4px', fontWeight: '700' }}>
                          Custom
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.76rem', color: '#64748b', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <code>{r.roleCode}</code> {r.description ? `• ${r.description}` : ''}
                    </div>

                    {/* Progress Bar & Counts */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b' }}>
                        <span>{r.userCount || 0} user(s) assigned</span>
                        <strong style={{ color: isSelected ? '#1a73e8' : '#475569' }}>
                          {isSuper ? 'Full 100%' : `${stats.granted} / ${stats.total} (${stats.percentage}%)`}
                        </strong>
                      </div>
                      <div style={{ width: '100%', height: '4px', backgroundColor: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${stats.percentage}%`,
                            height: '100%',
                            backgroundColor: isSuper ? '#d97706' : '#1a73e8',
                            borderRadius: '999px',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ========================================== */}
          {/* RIGHT COLUMN: PERMISSION MATRIX WORKSPACE  */}
          {/* ========================================== */}
          {selectedRoleForMatrix ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Role Header Banner */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  padding: '22px 26px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '800', color: '#0f172a' }}>
                        {selectedRoleForMatrix.roleName}
                      </h2>
                      <code style={{ fontSize: '0.78rem', backgroundColor: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', color: '#475569', fontWeight: '600' }}>
                        {selectedRoleForMatrix.roleCode}
                      </code>
                      {selectedRoleForMatrix.isSystemRole ? (
                        <span style={{ fontSize: '0.72rem', backgroundColor: '#eff6ff', color: '#1a73e8', padding: '3px 8px', borderRadius: '6px', fontWeight: '700' }}>
                          System Protected
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', backgroundColor: '#ecfdf5', color: '#059669', padding: '3px 8px', borderRadius: '6px', fontWeight: '700' }}>
                          Custom RBAC Policy
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                      {selectedRoleForMatrix.description || 'Configurable module authorization policy for operators assigned to this role.'}
                    </p>
                  </div>

                  {/* Bulk Actions for Role */}
                  {selectedRoleForMatrix.roleCode === 'super_admin' ? (
                    <div
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        backgroundColor: '#fffbeb',
                        border: '1px solid #fde68a',
                        color: '#b45309',
                        fontSize: '0.82rem',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Sparkles size={16} />
                      <span>Permanent Master Authority (All Modules Enforced)</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        onClick={handleGrantAllSystemPermissions}
                        title="Enable all permissions for this role across all modules"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '7px 12px',
                          borderRadius: '7px',
                          border: '1px solid #bfdbfe',
                          backgroundColor: '#eff6ff',
                          color: '#1a73e8',
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                      >
                        <CheckSquare size={14} />
                        <span>Enable All</span>
                      </button>

                      <button
                        onClick={handleRevokeAllSystemPermissions}
                        title="Clear all permissions for this role"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '7px 12px',
                          borderRadius: '7px',
                          border: '1px solid #e2e8f0',
                          backgroundColor: '#f8fafc',
                          color: '#475569',
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                      >
                        <Square size={14} />
                        <span>Revoke All</span>
                      </button>

                      {!selectedRoleForMatrix.isSystemRole && (
                        <button
                          onClick={() => handleOpenRoleModal(selectedRoleForMatrix)}
                          title="Edit role title and description"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '7px 10px',
                            borderRadius: '7px',
                            border: '1px solid #e2e8f0',
                            backgroundColor: '#ffffff',
                            color: '#334155',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          <Edit2 size={13} />
                          <span>Edit Info</span>
                        </button>
                      )}

                      {!selectedRoleForMatrix.isSystemRole && (
                        <button
                          onClick={() => handleDeleteRole(selectedRoleForMatrix._id, selectedRoleForMatrix.roleName)}
                          title="Delete this custom role"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '7px 10px',
                            borderRadius: '7px',
                            border: '1px solid #fecaca',
                            backgroundColor: '#fff1f2',
                            color: '#e11d48',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Coverage Gauge Bar */}
                {(() => {
                  const stats = getRolePermissionStats(selectedRoleForMatrix);
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#475569' }}>
                        <span>
                          Role Coverage: <strong>{stats.granted} of {stats.total} privileges active</strong>
                        </span>
                        <strong style={{ color: stats.percentage === 100 ? '#059669' : '#1a73e8' }}>
                          {stats.percentage}% authorized
                        </strong>
                      </div>
                      <div style={{ width: '100%', height: '7px', backgroundColor: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${stats.percentage}%`,
                            height: '100%',
                            backgroundColor: stats.percentage === 100 ? '#059669' : '#1a73e8',
                            borderRadius: '999px',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Permission Filters Bar (Search & Category Chips) */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  padding: '14px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                }}
              >
                {/* Search Permissions */}
                <div style={{ position: 'relative' }}>
                  <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Search permissions by name or code (e.g. 'agent:create', 'leads', 'export', 'delete')..."
                    value={permSearchTerm}
                    onChange={(e) => setPermSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 36px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      outline: 'none',
                      backgroundColor: '#f8fafc',
                      boxSizing: 'border-box',
                    }}
                  />
                  {permSearchTerm && (
                    <button
                      onClick={() => setPermSearchTerm('')}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#94a3b8',
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Module Category Filter Chips */}
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {['All', ...Object.keys(moduleCategories)].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedModuleCategory(cat)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '999px',
                        border: selectedModuleCategory === cat ? '1px solid #1a73e8' : '1px solid #e2e8f0',
                        backgroundColor: selectedModuleCategory === cat ? '#eff6ff' : '#ffffff',
                        color: selectedModuleCategory === cat ? '#1a73e8' : '#64748b',
                        fontSize: '0.78rem',
                        fontWeight: selectedModuleCategory === cat ? '700' : '600',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Module Cards Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {Object.keys(filteredPermissionGroups).length === 0 ? (
                  <div
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '14px',
                      border: '1px solid #e2e8f0',
                      padding: '48px 20px',
                      textAlign: 'center',
                      color: '#64748b',
                    }}
                  >
                    <Info size={28} style={{ color: '#94a3b8', margin: '0 auto 8px' }} />
                    <div style={{ fontWeight: '600' }}>No permissions match your filter</div>
                    <p style={{ margin: '4px 0 0', fontSize: '0.82rem' }}>
                      Try clearing the search query or selecting "All" categories.
                    </p>
                  </div>
                ) : (
                  Object.entries(filteredPermissionGroups).map(([moduleName, perms]) => {
                    const rolePermIds = (selectedRoleForMatrix.permissions || []).map((p) =>
                      typeof p === 'object' && p !== null ? p._id : p
                    );
                    const isSuper = selectedRoleForMatrix.roleCode === 'super_admin';
                    const activePermsCount = isSuper
                      ? perms.length
                      : perms.filter((p) => rolePermIds.includes(p._id)).length;
                    const allActive = activePermsCount === perms.length && perms.length > 0;
                    const isCollapsed = collapsedModules[moduleName];

                    return (
                      <div
                        key={moduleName}
                        style={{
                          backgroundColor: '#ffffff',
                          borderRadius: '14px',
                          border: '1px solid #e2e8f0',
                          overflow: 'hidden',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                        }}
                      >
                        {/* Module Header Bar */}
                        <div
                          style={{
                            padding: '14px 20px',
                            backgroundColor: '#f8fafc',
                            borderBottom: isCollapsed ? 'none' : '1px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '12px',
                          }}
                        >
                          <div
                            onClick={() => toggleModuleCollapse(moduleName)}
                            style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', userSelect: 'none' }}
                          >
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                backgroundColor: '#ffffff',
                                border: '1px solid #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                              }}
                            >
                              {getModuleIcon(moduleName)}
                            </div>
                            <div>
                              <div style={{ fontWeight: '800', fontSize: '0.96rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>{formatModuleName(moduleName)} Module</span>
                                {isCollapsed ? (
                                  <ChevronDown size={16} style={{ color: '#94a3b8' }} />
                                ) : (
                                  <ChevronUp size={16} style={{ color: '#94a3b8' }} />
                                )}
                              </div>
                              <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '1px' }}>
                                {perms.length} operational privilege{perms.length > 1 ? 's' : ''} mapped
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {/* Module Count Pill */}
                            <span
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                padding: '4px 10px',
                                borderRadius: '999px',
                                backgroundColor: allActive ? '#ecfdf5' : activePermsCount > 0 ? '#eff6ff' : '#f1f5f9',
                                color: allActive ? '#059669' : activePermsCount > 0 ? '#1a73e8' : '#64748b',
                                border: `1px solid ${allActive ? '#a7f3d0' : activePermsCount > 0 ? '#bfdbfe' : '#e2e8f0'}`,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              {allActive && <Check size={12} />}
                              <span>{activePermsCount} / {perms.length} active</span>
                            </span>

                            {/* Module Quick Actions (Select All / Deselect All) */}
                            {!isSuper && (
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleModulePermissions(moduleName, true);
                                  }}
                                  disabled={allActive}
                                  title={`Enable all permissions in ${formatModuleName(moduleName)}`}
                                  style={{
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    border: '1px solid #bfdbfe',
                                    backgroundColor: allActive ? '#f8fafc' : '#eff6ff',
                                    color: allActive ? '#94a3b8' : '#1a73e8',
                                    fontSize: '0.74rem',
                                    fontWeight: '700',
                                    cursor: allActive ? 'default' : 'pointer',
                                    transition: 'all 0.15s ease',
                                  }}
                                >
                                  Enable All
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleModulePermissions(moduleName, false);
                                  }}
                                  disabled={activePermsCount === 0}
                                  title={`Disable all permissions in ${formatModuleName(moduleName)}`}
                                  style={{
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    border: '1px solid #cbd5e1',
                                    backgroundColor: activePermsCount === 0 ? '#f8fafc' : '#ffffff',
                                    color: activePermsCount === 0 ? '#94a3b8' : '#64748b',
                                    fontSize: '0.74rem',
                                    fontWeight: '700',
                                    cursor: activePermsCount === 0 ? 'default' : 'pointer',
                                    transition: 'all 0.15s ease',
                                  }}
                                >
                                  Clear
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Module Permissions Grid */}
                        {!isCollapsed && (
                          <div
                            style={{
                              padding: '16px 20px',
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                              gap: '14px',
                            }}
                          >
                            {perms.map((p) => {
                              const isChecked = isSuper || rolePermIds.includes(p._id);

                              return (
                                <div
                                  key={p._id}
                                  onClick={() => !isSuper && handleTogglePermissionForRole(p._id)}
                                  style={{
                                    padding: '14px 16px',
                                    borderRadius: '12px',
                                    border: isChecked ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                                    backgroundColor: isChecked ? '#f0f7ff' : '#ffffff',
                                    cursor: isSuper ? 'default' : 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    gap: '10px',
                                    transition: 'all 0.15s ease',
                                    userSelect: 'none',
                                    boxShadow: isChecked
                                      ? '0 2px 8px rgba(37, 99, 235, 0.08)'
                                      : '0 1px 2px rgba(0,0,0,0.02)',
                                    position: 'relative',
                                  }}
                                  className="perm-item-card"
                                >
                                  {/* Top Row: Title, Action Code & Toggle Switch */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div
                                        style={{
                                          fontSize: '0.88rem',
                                          fontWeight: '700',
                                          color: isChecked ? '#0f172a' : '#334155',
                                          lineHeight: 1.3,
                                          wordBreak: 'break-word',
                                        }}
                                      >
                                        {p.permissionName}
                                      </div>
                                      <div style={{ marginTop: '5px' }}>
                                        <code
                                          style={{
                                            fontSize: '0.72rem',
                                            backgroundColor: isChecked ? '#dbeafe' : '#f1f5f9',
                                            color: isChecked ? '#1d4ed8' : '#64748b',
                                            padding: '2px 7px',
                                            borderRadius: '4px',
                                            fontWeight: '600',
                                            fontFamily: 'monospace',
                                            display: 'inline-block',
                                          }}
                                        >
                                          {p.permissionCode}
                                        </code>
                                      </div>
                                    </div>

                                    {/* Modern Toggle Switch Indicator */}
                                    <div style={{ flexShrink: 0, marginTop: '2px' }}>
                                      {isSuper ? (
                                        <span
                                          title="Permanent Master Super Admin permission"
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '3px',
                                            padding: '2px 7px',
                                            borderRadius: '999px',
                                            backgroundColor: '#fef3c7',
                                            color: '#b45309',
                                            fontSize: '0.68rem',
                                            fontWeight: '700',
                                          }}
                                        >
                                          <Lock size={10} />
                                          <span>Locked</span>
                                        </span>
                                      ) : (
                                        <div
                                          style={{
                                            width: '38px',
                                            height: '22px',
                                            borderRadius: '999px',
                                            backgroundColor: isChecked ? '#1a73e8' : '#cbd5e1',
                                            transition: 'background-color 0.2s ease',
                                            position: 'relative',
                                            cursor: 'pointer',
                                            flexShrink: 0,
                                          }}
                                        >
                                          <div
                                            style={{
                                              width: '16px',
                                              height: '16px',
                                              borderRadius: '50%',
                                              backgroundColor: '#ffffff',
                                              position: 'absolute',
                                              top: '3px',
                                              left: isChecked ? '19px' : '3px',
                                              transition: 'left 0.2s ease',
                                              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                            }}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Description */}
                                  <div
                                    style={{
                                      fontSize: '0.75rem',
                                      color: isChecked ? '#475569' : '#64748b',
                                      lineHeight: 1.4,
                                    }}
                                  >
                                    {p.description || `Allows ${p.action} operations on the ${formatModuleName(moduleName)} module.`}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                padding: '48px',
                textAlign: 'center',
                color: '#64748b',
              }}
            >
              <Shield size={36} style={{ color: '#94a3b8', margin: '0 auto 12px' }} />
              <div style={{ fontWeight: '700', fontSize: '1rem', color: '#0f172a' }}>Select a role from the left pane</div>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>
                Choose any system role or custom role to inspect and tune module permissions.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: BRANCH LOCATIONS (REGIONAL HUBS)                  */}
      {/* ======================================================== */}
      {activeTab === 'branches' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Branch Overview Alert */}
          <div
            style={{
              backgroundColor: '#eff6ff',
              borderRadius: '12px',
              border: '1px solid #bfdbfe',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Building2 size={22} style={{ color: '#1a73e8', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: '700', fontSize: '0.92rem', color: '#1e3a8a' }}>
                  Regional Branch Hubs & Access Segregation
                </div>
                <div style={{ fontSize: '0.8rem', color: '#1e40af', marginTop: '2px' }}>
                  Operators are scoped to one or more branch facilities. Head Office staff maintain cross-branch operational governance.
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: '700',
                backgroundColor: '#ffffff',
                color: '#1a73e8',
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid #bfdbfe',
                whiteSpace: 'nowrap',
              }}
            >
              {branches.length} Active Sites
            </span>
          </div>

          {/* Branches Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '18px' }}>
            {branches.map((b) => {
              const staffCount = users.filter((u) =>
                u.branchAccess?.some((ba) => (ba.branchId?._id || ba.branchId) === b._id)
              ).length;

              return (
                <div
                  key={b._id}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    border: b.isHeadOffice ? '1.5px solid #1a73e8' : '1px solid #e2e8f0',
                    padding: '22px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    position: 'relative',
                  }}
                >
                  <div>
                    {/* Header: Icon & Badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '12px',
                          backgroundColor: b.isHeadOffice ? '#eff6ff' : '#f8fafc',
                          color: b.isHeadOffice ? '#1a73e8' : '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: `1px solid ${b.isHeadOffice ? '#bfdbfe' : '#e2e8f0'}`,
                        }}
                      >
                        <Building2 size={22} />
                      </div>

                      {b.isHeadOffice && (
                        <span
                          style={{
                            fontSize: '0.72rem',
                            backgroundColor: '#eff6ff',
                            color: '#1a73e8',
                            padding: '3px 9px',
                            borderRadius: '999px',
                            fontWeight: '800',
                            border: '1px solid #bfdbfe',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          Primary HQ
                        </span>
                      )}
                    </div>

                    <h3 style={{ margin: '0 0 4px', fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
                      {b.branchName}
                    </h3>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '14px' }}>
                      Site Code: <code style={{ backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#0f172a', fontWeight: '600' }}>{b.branchCode}</code>
                    </div>

                    {/* Contact info */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.83rem', color: '#334155' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <MapPin size={15} style={{ color: '#94a3b8', flexShrink: 0, marginTop: '2px' }} />
                        <span>
                          {b.address?.addressLine1 || 'Main Office Campus'}
                          {b.address?.city ? `, ${b.address.city}` : ''}
                          {b.address?.state ? `, ${b.address.state}` : ''}
                        </span>
                      </div>
                      {b.contactNumber && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Phone size={15} style={{ color: '#94a3b8', flexShrink: 0 }} />
                          <span>{b.contactNumber}</span>
                        </div>
                      )}
                      {b.contactEmail && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Mail size={15} style={{ color: '#94a3b8', flexShrink: 0 }} />
                          <span>{b.contactEmail}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer Stats */}
                  <div
                    style={{
                      paddingTop: '14px',
                      borderTop: '1px solid #f1f5f9',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.8rem',
                      color: '#64748b',
                    }}
                  >
                    <span>
                      Site Status: <strong style={{ color: '#059669' }}>Operational</strong>
                    </span>
                    <span>
                      Assigned Operators: <strong style={{ color: '#0f172a' }}>{staffCount}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
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
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '18px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>
                  {editingUser ? `Edit Account: @${editingUser.username}` : 'Create New System Operator'}
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                  Assign user credentials, RBAC operational role, and multi-branch site privileges.
                </div>
              </div>
              <button
                onClick={() => setUserModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveUser} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* SECTION 1: Personal Identity */}
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
                  1. Identity & Contact Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul"
                      value={userFormData.firstName}
                      onChange={(e) => setUserFormData({ ...userFormData, firstName: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                      Last Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Sharma"
                      value={userFormData.lastName}
                      onChange={(e) => setUserFormData({ ...userFormData, lastName: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                      Username * (Unique identifier)
                    </label>
                    <input
                      type="text"
                      required
                      disabled={!!editingUser}
                      placeholder="e.g. rahul_sales"
                      value={userFormData.username}
                      onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.88rem',
                        boxSizing: 'border-box',
                        backgroundColor: editingUser ? '#f1f5f9' : '#ffffff',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                      Corporate Email *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. rahul@krishnavalley.com"
                      value={userFormData.email}
                      onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                      Mobile Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={userFormData.mobileNo}
                      onChange={(e) => setUserFormData({ ...userFormData, mobileNo: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                    />
                  </div>

                  {!editingUser && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                        Initial Password * (min 6 chars)
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={userFormData.password}
                        onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 2: Role & Status */}
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
                  2. Role & Account Status
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                      System Role Assignment *
                    </label>
                    <select
                      required
                      value={userFormData.roleId}
                      onChange={(e) => setUserFormData({ ...userFormData, roleId: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box', backgroundColor: '#ffffff' }}
                    >
                      <option value="">Select Role</option>
                      {roles.map((r) => (
                        <option key={r._id} value={r._id}>
                          {r.roleName} ({r.roleCode})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                      Account Status
                    </label>
                    <select
                      value={userFormData.status}
                      onChange={(e) => setUserFormData({ ...userFormData, status: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box', backgroundColor: '#ffffff' }}
                    >
                      <option value="active">Active (Full access)</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                      <option value="locked">Locked</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Agent Configuration (if role is agent) */}
              {roles.find((r) => r._id === userFormData.roleId)?.roleCode === 'agent' && (
                <div
                  style={{
                    backgroundColor: '#f0f9ff',
                    border: '1.5px solid #bae6fd',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Award size={18} style={{ color: '#0284c7' }} />
                    <span style={{ fontWeight: '800', fontSize: '0.88rem', color: '#0369a1' }}>
                      Channel Partner & Agent Profile Setup
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#0369a1', marginBottom: '4px' }}>
                        Agency / Brokerage Firm Name
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
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #bae6fd', fontSize: '0.85rem', boxSizing: 'border-box', backgroundColor: '#ffffff' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#0369a1', marginBottom: '4px' }}>
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
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #bae6fd', fontSize: '0.85rem', boxSizing: 'border-box', backgroundColor: '#ffffff' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#0369a1', marginBottom: '4px' }}>
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
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #bae6fd', fontSize: '0.85rem', boxSizing: 'border-box', backgroundColor: '#ffffff' }}
                      >
                        <option value="percentage">Percentage (%) of Booking Amount</option>
                        <option value="flat">Flat Fixed Fee (₹) per Matured Unit</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#0369a1', marginBottom: '4px' }}>
                        Commission Rate * {userFormData.agentProfile?.commissionType === 'percentage' ? '(%)' : '(₹)'}
                      </label>
                      <input
                        type="number"
                        step={userFormData.agentProfile?.commissionType === 'percentage' ? '0.1' : '1000'}
                        required
                        value={userFormData.agentProfile?.commissionRate ?? (userFormData.agentProfile?.commissionType === 'percentage' ? 2 : 25000)}
                        onChange={(e) =>
                          setUserFormData({
                            ...userFormData,
                            agentProfile: { ...userFormData.agentProfile, commissionRate: Number(e.target.value) },
                          })
                        }
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #bae6fd', fontSize: '0.85rem', boxSizing: 'border-box', backgroundColor: '#ffffff' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 4: Branch Assignment */}
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
                  3. Multi-Branch Site Assignments
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}>
                  {branches.map((b) => {
                    const accessObj = userFormData.branchAccess.find(
                      (ba) => (ba.branchId?._id || ba.branchId) === b._id
                    );
                    const isAssigned = !!accessObj;

                    return (
                      <div
                        key={b._id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          backgroundColor: isAssigned ? '#f8fafc' : 'transparent',
                        }}
                      >
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', color: '#1e293b' }}>
                          <input
                            type="checkbox"
                            checked={isAssigned}
                            onChange={(e) => handleBranchAccessChange(b._id, 'enabled', e.target.checked)}
                            style={{ accentColor: '#1a73e8' }}
                          />
                          <span>{b.branchName}</span>
                          {b.isHeadOffice && (
                            <span style={{ fontSize: '0.68rem', backgroundColor: '#eff6ff', color: '#1a73e8', padding: '1px 5px', borderRadius: '4px' }}>
                              HQ
                            </span>
                          )}
                        </label>

                        {isAssigned && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <select
                              value={accessObj.accessLevel || 'view'}
                              onChange={(e) => handleBranchAccessChange(b._id, 'accessLevel', e.target.value)}
                              style={{ padding: '3px 6px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                            >
                              <option value="view">View Only</option>
                              <option value="manage">Manage</option>
                              <option value="full">Full Site Admin</option>
                            </select>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#475569', cursor: 'pointer' }}>
                              <input
                                type="radio"
                                name="primaryBranchRadio"
                                checked={!!accessObj.isPrimary}
                                onChange={() => handleBranchAccessChange(b._id, 'isPrimary', true)}
                                style={{ accentColor: '#1a73e8' }}
                              />
                              <span>Primary</span>
                            </label>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155', fontSize: '0.88rem', cursor: 'pointer', fontWeight: '600' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    padding: '9px 22px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#1a73e8',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    fontWeight: '700',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 6px rgba(26,115,232,0.3)',
                  }}
                >
                  {actionLoading ? 'Saving...' : editingUser ? 'Update Operator' : 'Create Operator'}
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
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '430px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <KeyRound size={20} style={{ color: '#1a73e8' }} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
                  Reset Password
                </h3>
              </div>
              <button
                onClick={() => setPasswordModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '0 0 16px', lineHeight: 1.4 }}>
              Set a new secure access credential for{' '}
              <strong>@{targetUserForPassword.username}</strong> ({targetUserForPassword.firstName} {targetUserForPassword.lastName}).
            </p>

            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  New Secure Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters..."
                  value={newPasswordValue}
                  onChange={(e) => setNewPasswordValue(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155', fontSize: '0.84rem', cursor: 'pointer', fontWeight: '600' }}
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
                    fontSize: '0.84rem',
                    fontWeight: '700',
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

      {/* ======================================================== */}
      {/* MODAL: CREATE / EDIT ROLE                                */}
      {/* ======================================================== */}
      {roleModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} style={{ color: '#1a73e8' }} />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>
                  {editingRole ? `Edit Role: ${editingRole.roleName}` : 'Create Custom Operational Role'}
                </h3>
              </div>
              <button
                onClick={() => setRoleModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRole} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  Role Display Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Regional Project Manager"
                  value={roleFormData.roleName}
                  onChange={(e) => {
                    const name = e.target.value;
                    setRoleFormData({
                      ...roleFormData,
                      roleName: name,
                      roleCode: editingRole ? roleFormData.roleCode : name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_'),
                    });
                  }}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  System Role Code * (lowercase slug)
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingRole}
                  placeholder="e.g. regional_project_manager"
                  value={roleFormData.roleCode}
                  onChange={(e) => setRoleFormData({ ...roleFormData, roleCode: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                    backgroundColor: editingRole ? '#f1f5f9' : '#ffffff',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  Role Description & Scope
                </label>
                <textarea
                  rows={2}
                  placeholder="Briefly describe what operators with this role are responsible for..."
                  value={roleFormData.description}
                  onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>

              {!editingRole && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                    Clone Initial Permissions From (Optional)
                  </label>
                  <select
                    value={roleFormData.cloneFromRoleId}
                    onChange={(e) => setRoleFormData({ ...roleFormData, cloneFromRoleId: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box', backgroundColor: '#ffffff' }}
                  >
                    <option value="">Start with Empty Permissions (0)</option>
                    {roles.map((r) => (
                      <option key={r._id} value={r._id}>
                        Clone from {r.roleName} ({r.permissions?.length || 0} permissions)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setRoleModalOpen(false)}
                  style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155', fontSize: '0.84rem', cursor: 'pointer', fontWeight: '600' }}
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
                    fontSize: '0.84rem',
                    fontWeight: '700',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {actionLoading ? 'Saving...' : editingRole ? 'Update Role' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Scoped Styling for animations and smooth transitions */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .table-hover-row:hover {
          background-color: #f8fafc !important;
        }
        .user-card-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.06) !important;
        }
        .perm-item-card {
          transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .perm-item-card:hover {
          transform: translateY(-2px);
          border-color: #2563eb !important;
          box-shadow: 0 6px 16px rgba(37, 99, 235, 0.12) !important;
        }
      `}</style>
    </div>
  );
};

export default UserManagementPage;
