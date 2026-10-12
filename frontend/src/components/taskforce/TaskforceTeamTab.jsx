import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  HardHat,
  Shield,
  Briefcase,
  UserPlus,
  Search,
  Filter,
  Eye,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  Upload,
  ArrowRight,
  TrendingUp,
  Building2,
  Phone,
  Mail,
  ChevronRight,
  Sparkles,
  Plus,
  Layers,
  AlertTriangle,
  X,
  Check,
  FolderPlus,
  ArrowUpRight,
  UserCheck
} from 'lucide-react';
import { taskforceManagerService } from '../../services/taskforceManagerService.js';
import { useToast } from '../../context/ToastContext.jsx';
import { AddTeamMemberModal } from './AddTeamMemberModal.jsx';
import {
  getDepartmentTheme,
  getDepartmentIcon,
  getHierarchyTheme,
} from '../../utils/departmentIcons.js';

export const TaskforceTeamTab = ({
  onViewMemberDashboard,
  onAssignTaskToMember,
  onAssignTask,
  systemUsers = [],
}) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedDept, setSelectedDept] = useState('all'); // 'all' or department name
  const [selectedLevelFilter, setSelectedLevelFilter] = useState('all'); // 'all' | 'head' | 'supervisor' | 'helper'
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isAddDeptModalOpen, setIsAddDeptModalOpen] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState(null);
  const [isDeletingDept, setIsDeletingDept] = useState(false);
  const [fallbackDept, setFallbackDept] = useState('General Operations');

  // Add Department Form State
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');
  const [newDeptColor, setNewDeptColor] = useState('#2563eb');
  const [newDeptHeadId, setNewDeptHeadId] = useState('');
  const [isSavingDept, setIsSavingDept] = useState(false);

  useEffect(() => {
    fetchData();

    const handleDeptUpdated = () => {
      fetchData();
    };
    window.addEventListener('departmentsUpdated', handleDeptUpdated);
    return () => window.removeEventListener('departmentsUpdated', handleDeptUpdated);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [deptRes, teamRes] = await Promise.all([
        taskforceManagerService.getDepartments().catch((err) => {
          console.warn('Departments fetch err:', err);
          return { success: false, departments: [] };
        }),
        taskforceManagerService.getTeam().catch((err) => {
          console.warn('Team fetch err:', err);
          return { success: false, members: [] };
        }),
      ]);

      if (teamRes && teamRes.success) {
        setMembers(teamRes.members || []);
      }

      if (deptRes && deptRes.success && deptRes.departments?.length > 0) {
        setDepartments(deptRes.departments);
      } else {
        // Fallback default departments if backend empty
        const defaultNames = [
          'Civil & Snagging',
          'Electrical & Power',
          'Plumbing & Sanitation',
          'Painting & Waterproofing',
          'Carpentry & Woodwork',
          'Housekeeping & Deep Cleaning',
          'Security & Access Control',
          'HVAC & Air Conditioning',
          'General Operations',
        ];
        const constructed = defaultNames.map((name) => ({
          _id: name,
          name,
          code: name.substring(0, 4).toUpperCase(),
          description: `${name} operational division`,
          color: '#2563eb',
        }));
        setDepartments(constructed);
      }
    } catch (err) {
      console.error('Error loading departments and team:', err);
      showToast(err.message || 'Error loading departments data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    if (!newDeptName.trim()) {
      showToast('Please enter a department name', 'error');
      return;
    }

    try {
      setIsSavingDept(true);
      const res = await taskforceManagerService.createDepartment({
        name: newDeptName.trim(),
        code: (newDeptCode || newDeptName.trim().substring(0, 4)).toUpperCase(),
        description: newDeptDesc.trim(),
        color: newDeptColor,
        headMemberId: newDeptHeadId || null,
      });

      if (res && res.success) {
        showToast(res.message || `Department "${newDeptName.trim()}" created!`, 'success');
        
        // Sync local storage as resilient offline cache
        try {
          const stored = localStorage.getItem('kv_custom_departments');
          const list = stored ? JSON.parse(stored) : [];
          if (!list.includes(newDeptName.trim())) {
            list.push(newDeptName.trim());
            localStorage.setItem('kv_custom_departments', JSON.stringify(list));
          }
        } catch (e) {}

        // Broadcast to NewTaskModal and AddTeamMemberModal
        window.dispatchEvent(new CustomEvent('departmentsUpdated'));

        // Reset form & close
        setNewDeptName('');
        setNewDeptCode('');
        setNewDeptDesc('');
        setNewDeptHeadId('');
        setIsAddDeptModalOpen(false);
        fetchData();
      } else {
        showToast(res?.message || 'Failed to create department', 'error');
      }
    } catch (err) {
      console.error('Error creating department:', err);
      showToast(err.message || 'Failed to create department', 'error');
    } finally {
      setIsSavingDept(false);
    }
  };

  const executeDeleteDepartment = async () => {
    if (!deptToDelete) return;
    try {
      setIsDeletingDept(true);
      const res = await taskforceManagerService.deleteDepartment(
        deptToDelete.name || deptToDelete._id,
        fallbackDept
      );

      if (res && res.success) {
        showToast(res.message || `Department "${deptToDelete.name}" deleted`, 'success');

        // Sync local storage
        try {
          const sCustom = localStorage.getItem('kv_custom_departments');
          if (sCustom) {
            const list = JSON.parse(sCustom).filter((d) => d.toLowerCase() !== deptToDelete.name.toLowerCase());
            localStorage.setItem('kv_custom_departments', JSON.stringify(list));
          }
          const sDel = localStorage.getItem('kv_deleted_departments');
          const delList = sDel ? JSON.parse(sDel) : [];
          if (!delList.includes(deptToDelete.name)) {
            delList.push(deptToDelete.name);
            localStorage.setItem('kv_deleted_departments', JSON.stringify(delList));
          }
        } catch (e) {}

        window.dispatchEvent(new CustomEvent('departmentsUpdated'));

        if (selectedDept.toLowerCase() === (deptToDelete.name || '').toLowerCase()) {
          setSelectedDept('all');
        }
        setDeptToDelete(null);
        fetchData();
      } else {
        showToast(res?.message || 'Failed to delete department', 'error');
      }
    } catch (err) {
      console.error('Error deleting department:', err);
      showToast(err.message || 'Failed to delete department', 'error');
    } finally {
      setIsDeletingDept(false);
    }
  };

  const handleDeleteMember = async (member) => {
    if (!window.confirm(`Are you sure you want to remove ${member.name} (${member.hierarchyLevel.toUpperCase()}) from the Taskforce?`)) {
      return;
    }
    try {
      const res = await taskforceManagerService.deleteTeamMember(member._id);
      if (res && res.success) {
        showToast(res.message || 'Member removed', 'success');
        fetchData();
      } else {
        showToast(res?.message || 'Failed to remove member', 'error');
      }
    } catch (err) {
      console.error('Error deleting member:', err);
      showToast(err.message || 'Failed to remove member', 'error');
    }
  };

  // Compute members belonging to selected department
  const departmentFilteredMembers = useMemo(() => {
    if (selectedDept === 'all') return members;
    const targetDept = selectedDept.toLowerCase().trim();
    return members.filter((m) => {
      const dept = (m.department || m.trade || '').toLowerCase().trim();
      return dept === targetDept;
    });
  }, [members, selectedDept]);

  // Compute search & hierarchy level filtered members
  const finalFilteredMembers = useMemo(() => {
    return departmentFilteredMembers.filter((m) => {
      if (selectedLevelFilter !== 'all' && m.hierarchyLevel !== selectedLevelFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (m.name || '').toLowerCase().includes(q);
        const matchDept = (m.department || m.trade || '').toLowerCase().includes(q);
        const matchPhone = (m.mobileNo || '').includes(q);
        const matchSup = (m.supervisorId?.name || '').toLowerCase().includes(q);
        const matchHead = (m.headId?.name || '').toLowerCase().includes(q);
        return matchName || matchDept || matchPhone || matchSup || matchHead;
      }
      return true;
    });
  }, [departmentFilteredMembers, selectedLevelFilter, searchQuery]);

  // Hierarchy grouping within current department
  const headsList = finalFilteredMembers.filter((m) => m.hierarchyLevel === 'head');
  const supervisorsList = finalFilteredMembers.filter((m) => m.hierarchyLevel === 'supervisor');
  const helpersList = finalFilteredMembers.filter((m) => m.hierarchyLevel === 'helper');

  // Active department object if not 'all'
  const currentDeptObj = useMemo(() => {
    if (selectedDept === 'all') return null;
    return departments.find((d) => (d.name || '').toLowerCase() === selectedDept.toLowerCase()) || {
      name: selectedDept,
      code: selectedDept.substring(0, 4).toUpperCase(),
      description: `${selectedDept} operations division`,
    };
  }, [departments, selectedDept]);

  // Department color palette options
  const colorOptions = ['#2563eb', '#0284c7', '#059669', '#d97706', '#dc2626', '#7c3aed', '#475569'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      
      {/* =========================================================================
          TOP BAR: TITLE, ACTIONS & TOTAL STATS
      ========================================================================= */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '22px 24px',
          boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #059669, #047857)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)',
                }}
              >
                <Building2 size={20} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '800', color: '#0f172a' }}>
                  Departments &amp; Hierarchy
                </h2>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  Centralized Department Management &amp; Strict Operational Hierarchy (Head ➔ Supervisor ➔ Helper)
                </span>
              </div>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '0.78rem', color: '#475569' }}>
              Departments managed here are the dynamic single source of truth fetched into both the <strong>Task Assignment Form</strong> and the <strong>Add Team Member Form</strong>.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setIsAddDeptModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '9px 16px',
                borderRadius: '10px',
                background: '#ffffff',
                color: '#0f172a',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.82rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#059669'; e.currentTarget.style.color = '#059669'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#0f172a'; }}
            >
              <i className="fa-solid fa-folder-plus" style={{ fontSize: '14px', color: '#059669' }} />
              <span>+ Add Department</span>
            </button>

            <button
              onClick={() => setIsAddMemberModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #059669, #047857)',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.82rem',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 3px 10px rgba(5, 150, 105, 0.28)',
              }}
            >
              <i className="fa-solid fa-user-plus" style={{ fontSize: '14px' }} />
              <span>+ Add Team Member</span>
            </button>
          </div>
        </div>

        {/* Global Summary Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
          {[
            {
              label: 'Total Departments',
              value: departments.length,
              faIcon: 'fa-solid fa-sitemap',
              color: '#059669',
              bg: '#ecfdf5',
              border: '#a7f3d0',
            },
            {
              label: 'Total Workforce',
              value: members.length,
              faIcon: 'fa-solid fa-users-gear',
              color: '#0f172a',
              bg: '#f8fafc',
              border: '#e2e8f0',
            },
            {
              label: 'Department Heads',
              value: members.filter((m) => m.hierarchyLevel === 'head').length,
              faIcon: 'fa-solid fa-user-tie',
              color: '#0891b2',
              bg: '#ecfeff',
              border: '#a5f3fc',
            },
            {
              label: 'Site Supervisors',
              value: members.filter((m) => m.hierarchyLevel === 'supervisor').length,
              faIcon: 'fa-solid fa-user-gear',
              color: '#4f46e5',
              bg: '#eef2ff',
              border: '#c7d2fe',
            },
            {
              label: 'Field Helpers',
              value: members.filter((m) => m.hierarchyLevel === 'helper').length,
              faIcon: 'fa-solid fa-person-digging',
              color: '#2563eb',
              bg: '#eff6ff',
              border: '#bfdbfe',
            },
          ].map((item, idx) => (
            <div
              key={idx}
              style={{
                background: item.bg,
                border: `1px solid ${item.border}`,
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                  {item.label}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: item.color, marginTop: '2px' }}>
                  {item.value}
                </div>
              </div>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '9px',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  color: item.color,
                  fontSize: '15px',
                }}
              >
                <i className={item.faIcon} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* =========================================================================
          DEPARTMENT SELECTOR & MANAGEMENT STRIP
      ========================================================================= */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={17} color="#059669" />
            <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: '800', color: '#0f172a' }}>
              Select Department to View &amp; Manage Hierarchy
            </h3>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
            Click any department to filter team members or manage settings
          </span>
        </div>

        {/* Scrollable / Flexible Department Cards Strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
            gap: '10px',
          }}
        >
          {/* ALL DEPARTMENTS PILL */}
          <div
            onClick={() => setSelectedDept('all')}
            style={{
              cursor: 'pointer',
              borderRadius: '12px',
              padding: '12px 14px',
              border: selectedDept === 'all' ? '2px solid #059669' : '1px solid #e2e8f0',
              background: selectedDept === 'all' ? '#ecfdf5' : '#ffffff',
              boxShadow: selectedDept === 'all' ? '0 4px 12px rgba(5, 150, 105, 0.12)' : '0 1px 3px rgba(0,0,0,0.02)',
              transition: 'all 0.15s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: selectedDept === 'all' ? '#059669' : '#ecfdf5',
                    color: selectedDept === 'all' ? '#ffffff' : '#059669',
                    border: '1px solid #a7f3d0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    flexShrink: 0,
                  }}
                >
                  <i className="fa-solid fa-sitemap" />
                </div>
                <span style={{ fontWeight: '800', fontSize: '0.84rem', color: selectedDept === 'all' ? '#047857' : '#1e293b' }}>
                  All Departments
                </span>
              </div>
              {selectedDept === 'all' && (
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669' }} />
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
              <span>{members.length} Total Members</span>
              <span style={{ fontWeight: '700', color: '#059669' }}>Organization</span>
            </div>
          </div>

          {/* INDIVIDUAL DEPARTMENTS */}
          {departments.map((dept) => {
            const isSelected = selectedDept.toLowerCase() === (dept.name || '').toLowerCase();
            const deptMemberCount = members.filter(
              (m) => (m.department || m.trade || '').toLowerCase() === (dept.name || '').toLowerCase()
            ).length;
            const theme = getDepartmentTheme(dept.name);

            return (
              <div
                key={dept._id || dept.name}
                onClick={() => setSelectedDept(dept.name)}
                style={{
                  cursor: 'pointer',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  border: isSelected ? `2px solid ${theme.color}` : '1px solid #e2e8f0',
                  background: isSelected ? theme.bg : '#ffffff',
                  boxShadow: isSelected ? `0 4px 12px ${theme.color}25` : '0 1px 3px rgba(0,0,0,0.02)',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: isSelected ? theme.color : theme.bg,
                        color: isSelected ? '#ffffff' : theme.color,
                        border: `1px solid ${theme.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px',
                        flexShrink: 0,
                      }}
                    >
                      <i className={theme.icon} />
                    </div>
                    <span
                      style={{
                        fontWeight: '800',
                        fontSize: '0.82rem',
                        color: isSelected ? '#0f172a' : '#334155',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '120px',
                      }}
                      title={dept.name}
                    >
                      {dept.name}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {dept.code && (
                      <span
                        style={{
                          fontSize: '0.62rem',
                          fontWeight: '800',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          background: isSelected ? '#ffffff' : '#f1f5f9',
                          color: isSelected ? theme.color : '#475569',
                          border: isSelected ? `1px solid ${theme.border}` : 'none',
                        }}
                      >
                        {dept.code}
                      </span>
                    )}
                    {/* Delete action button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeptToDelete(dept);
                      }}
                      title="Delete Department"
                      style={{
                        border: 'none',
                        background: 'transparent',
                        padding: '2px',
                        cursor: 'pointer',
                        color: '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: '4px',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                  <span style={{ fontWeight: '600' }}>
                    {deptMemberCount} {deptMemberCount === 1 ? 'member' : 'members'}
                  </span>
                  {dept.stats?.activeTasks !== undefined && (
                    <span style={{ color: theme.color, fontWeight: '700' }}>
                      {dept.stats.activeTasks} tasks
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          SELECTED DEPARTMENT BANNER & HIERARCHY DETAILS
      ========================================================================= */}
      {selectedDept !== 'all' && currentDeptObj && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '18px 24px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: `linear-gradient(135deg, ${getDepartmentTheme(currentDeptObj.name).color}, ${getDepartmentTheme(currentDeptObj.name).color}dd)`,
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                boxShadow: `0 4px 14px ${getDepartmentTheme(currentDeptObj.name).color}40`,
                flexShrink: 0,
              }}
            >
              <i className={getDepartmentTheme(currentDeptObj.name).icon} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
                  {currentDeptObj.name}
                </h3>
                {currentDeptObj.code && (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: '800',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: getDepartmentTheme(currentDeptObj.name).bg,
                      color: getDepartmentTheme(currentDeptObj.name).color,
                      border: `1px solid ${getDepartmentTheme(currentDeptObj.name).border}`,
                    }}
                  >
                    {currentDeptObj.code}
                  </span>
                )}
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: '8px',
                    background: '#f1f5f9',
                    color: '#334155',
                  }}
                >
                  {departmentFilteredMembers.length} Assigned Members
                </span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: '#64748b' }}>
                {currentDeptObj.description || 'Dedicated operational unit managed by Taskforce directives.'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => {
                setIsAddMemberModalOpen(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '9px',
                background: '#059669',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              <UserPlus size={14} />
              <span>+ Add Member to {currentDeptObj.code || currentDeptObj.name}</span>
            </button>

            <button
              onClick={() => setDeptToDelete(currentDeptObj)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '8px 12px',
                borderRadius: '9px',
                background: '#fee2e2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              <Trash2 size={13} />
              <span>Delete Department</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          TOOLBAR: TIER FILTER TABS & SEARCH INPUT
      ========================================================================= */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: `All Tiers (${departmentFilteredMembers.length})`, faIcon: 'fa-solid fa-layer-group', color: '#059669' },
            { id: 'head', label: `Department Heads (${departmentFilteredMembers.filter((m) => m.hierarchyLevel === 'head').length})`, faIcon: 'fa-solid fa-user-tie', color: '#0891b2' },
            { id: 'supervisor', label: `Site Supervisors (${departmentFilteredMembers.filter((m) => m.hierarchyLevel === 'supervisor').length})`, faIcon: 'fa-solid fa-user-gear', color: '#4f46e5' },
            { id: 'helper', label: `Field Helpers (${departmentFilteredMembers.filter((m) => m.hierarchyLevel === 'helper').length})`, faIcon: 'fa-solid fa-person-digging', color: '#2563eb' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedLevelFilter(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '0.76rem',
                fontWeight: selectedLevelFilter === tab.id ? '700' : '600',
                border: selectedLevelFilter === tab.id ? '1.5px solid #059669' : '1px solid #cbd5e1',
                background: selectedLevelFilter === tab.id ? '#ecfdf5' : '#ffffff',
                color: selectedLevelFilter === tab.id ? '#047857' : '#475569',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <i className={tab.faIcon} style={{ fontSize: '12px', color: selectedLevelFilter === tab.id ? '#047857' : tab.color }} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div style={{ position: 'relative' }}>
          <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '11px', top: '11px', color: '#94a3b8', fontSize: '13px' }} />
          <input
            type="text"
            placeholder="Search member name, phone, trade, lead..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '7px 12px 7px 32px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.78rem',
              width: '260px',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* =========================================================================
          HIERARCHICAL TEAM SECTIONS (HEAD -> SUPERVISOR -> HELPER)
      ========================================================================= */}
      {finalFilteredMembers.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '50px 20px',
            textAlign: 'center',
            border: '1px dashed #cbd5e1',
            color: '#64748b',
          }}
        >
          <Building2 size={40} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontWeight: '800', fontSize: '1rem', color: '#1e293b' }}>
            No team members found in {selectedDept === 'all' ? 'this filter' : `department "${selectedDept}"`}
          </div>
          <p style={{ margin: '6px 0 16px', fontSize: '0.8rem' }}>
            Add new personnel in Department Head, Site Supervisor, or Field Helper roles to establish hierarchy.
          </p>
          <button
            onClick={() => setIsAddMemberModalOpen(true)}
            style={{
              padding: '9px 18px',
              borderRadius: '9px',
              background: '#059669',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            + Add First Member
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>

          {/* TIER 1: DEPARTMENT HEADS */}
          {(selectedLevelFilter === 'all' || selectedLevelFilter === 'head') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '2px solid #e2e8f0',
                  paddingBottom: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-user-tie" style={{ fontSize: '18px', color: '#0891b2' }} />
                  <span style={{ fontSize: '0.94rem', fontWeight: '800', color: '#0f172a' }}>
                    Department Heads
                  </span>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: '800',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: '#ecfeff',
                      color: '#0891b2',
                      border: '1px solid #a5f3fc',
                    }}
                  >
                    LEVEL 3 • EXECUTIVE / STRATEGY ({headsList.length})
                  </span>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Full operational oversight across all tiers &amp; site directives
                </span>
              </div>

              {headsList.length === 0 ? (
                <div
                  style={{
                    background: '#f8fafc',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    fontSize: '0.78rem',
                    color: '#64748b',
                    border: '1px dashed #cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>No Department Head assigned in this section.</span>
                  <button
                    onClick={() => setIsAddMemberModalOpen(true)}
                    style={{
                      background: '#ecfeff',
                      color: '#0891b2',
                      border: '1px solid #a5f3fc',
                      padding: '5px 10px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    + Assign Department Head
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                  {headsList.map((m) => renderMemberCard(m, 'head'))}
                </div>
              )}
            </div>
          )}

          {/* TIER 2: FIELD SUPERVISORS */}
          {(selectedLevelFilter === 'all' || selectedLevelFilter === 'supervisor') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '2px solid #e2e8f0',
                  paddingBottom: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-user-gear" style={{ fontSize: '18px', color: '#4f46e5' }} />
                  <span style={{ fontSize: '0.94rem', fontWeight: '800', color: '#0f172a' }}>
                    Field &amp; Site Supervisors
                  </span>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: '800',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: '#eef2ff',
                      color: '#4f46e5',
                      border: '1px solid #c7d2fe',
                    }}
                  >
                    LEVEL 2 • SITE MANAGEMENT ({supervisorsList.length})
                  </span>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Supervises self + field helpers, reviews proofs &amp; verifies site stages
                </span>
              </div>

              {supervisorsList.length === 0 ? (
                <div
                  style={{
                    background: '#f8fafc',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    fontSize: '0.78rem',
                    color: '#64748b',
                    border: '1px dashed #cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>No Site Supervisors assigned in this section.</span>
                  <button
                    onClick={() => setIsAddMemberModalOpen(true)}
                    style={{
                      background: '#eef2ff',
                      color: '#4f46e5',
                      border: '1px solid #c7d2fe',
                      padding: '5px 10px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    + Add Field Supervisor
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                  {supervisorsList.map((m) => renderMemberCard(m, 'supervisor'))}
                </div>
              )}
            </div>
          )}

          {/* TIER 3: FIELD HELPERS & TECHNICIANS */}
          {(selectedLevelFilter === 'all' || selectedLevelFilter === 'helper') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '2px solid #e2e8f0',
                  paddingBottom: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-person-digging" style={{ fontSize: '18px', color: '#2563eb' }} />
                  <span style={{ fontSize: '0.94rem', fontWeight: '800', color: '#0f172a' }}>
                    Field Helpers &amp; Technicians
                  </span>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: '800',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: '#eff6ff',
                      color: '#2563eb',
                      border: '1px solid #bfdbfe',
                    }}
                  >
                    LEVEL 1 • GROUND CREW ({helpersList.length})
                  </span>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Direct task execution crew, scoped strictly to their assigned work and proofs
                </span>
              </div>

              {helpersList.length === 0 ? (
                <div
                  style={{
                    background: '#f8fafc',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    fontSize: '0.78rem',
                    color: '#64748b',
                    border: '1px dashed #cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>No Field Helpers assigned in this section.</span>
                  <button
                    onClick={() => setIsAddMemberModalOpen(true)}
                    style={{
                      background: '#eff6ff',
                      color: '#2563eb',
                      border: '1px solid #bfdbfe',
                      padding: '5px 10px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    + Add Field Helper
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                  {helpersList.map((m) => renderMemberCard(m, 'helper'))}
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* =========================================================================
          ADD DEPARTMENT MODAL
      ========================================================================= */}
      {isAddDeptModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f8fafc',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FolderPlus size={20} color="#059669" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>
                  Add Operational Department
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddDeptModalOpen(false)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddDepartment} style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Department Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fire Safety & Emergency, Landscaping"
                  value={newDeptName}
                  onChange={(e) => {
                    setNewDeptName(e.target.value);
                    if (!newDeptCode && e.target.value) {
                      setNewDeptCode(e.target.value.substring(0, 4).toUpperCase());
                    }
                  }}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.84rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Department Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. FIRE"
                    value={newDeptCode}
                    onChange={(e) => setNewDeptCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.84rem',
                      outline: 'none',
                      textTransform: 'uppercase',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Department Color
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px' }}>
                    {colorOptions.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewDeptColor(c)}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: c,
                          border: newDeptColor === c ? '2px solid #0f172a' : 'none',
                          cursor: 'pointer',
                          padding: 0,
                          transform: newDeptColor === c ? 'scale(1.15)' : 'none',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Assign Department Head (Optional)
                </label>
                <select
                  value={newDeptHeadId}
                  onChange={(e) => setNewDeptHeadId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.84rem',
                    outline: 'none',
                    background: '#ffffff',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="">-- No Department Head (Assign Later) --</option>
                  {members
                    .filter((m) => m.hierarchyLevel === 'head' || m.hierarchyLevel === 'supervisor')
                    .map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.name} ({m.hierarchyLevel.toUpperCase()} - {m.department || m.trade})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Description &amp; Operational Scope
                </label>
                <textarea
                  rows={2}
                  placeholder="Operational responsibilities, site areas covered, specializations..."
                  value={newDeptDesc}
                  onChange={(e) => setNewDeptDesc(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.84rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  onClick={() => setIsAddDeptModalOpen(false)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSavingDept}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#059669',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    color: '#ffffff',
                    cursor: isSavingDept ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSavingDept ? 'Saving...' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          DELETE DEPARTMENT MODAL
      ========================================================================= */}
      {deptToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '460px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
              overflow: 'hidden',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>
                  Delete Department "{deptToDelete.name}"?
                </h3>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  Safety Check: Personnel and tasks will be protected &amp; reassigned
                </span>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569', lineHeight: '1.5' }}>
              Removing this department will un-link it from active selection in the <strong>Task Assignment Form</strong> and <strong>Add Member Form</strong>. Any existing staff members in this department will be safely reassigned to the fallback department below.
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Reassign Members &amp; Tasks To:
              </label>
              <select
                value={fallbackDept}
                onChange={(e) => setFallbackDept(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.84rem',
                  outline: 'none',
                  background: '#ffffff',
                  boxSizing: 'border-box',
                }}
              >
                {departments
                  .filter((d) => (d.name || '').toLowerCase() !== (deptToDelete.name || '').toLowerCase())
                  .map((d) => (
                    <option key={d._id || d.name} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                <option value="General Operations">General Operations (Default)</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px' }}>
              <button
                type="button"
                onClick={() => setDeptToDelete(null)}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={executeDeleteDepartment}
                disabled={isDeletingDept}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#dc2626',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  color: '#ffffff',
                  cursor: isDeletingDept ? 'not-allowed' : 'pointer',
                }}
              >
                {isDeletingDept ? 'Deleting...' : 'Delete & Reassign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ADD TEAM MEMBER MODAL
      ========================================================================= */}
      <AddTeamMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        existingMembers={members}
        systemUsers={systemUsers}
        initialDepartment={selectedDept !== 'all' ? selectedDept : null}
        onMemberAdded={() => fetchData()}
      />
    </div>
  );

  // Helper render for individual team member card
  function renderMemberCard(m, level) {
    const isHead = level === 'head';
    const isSupervisor = level === 'supervisor';
    const isHelper = level === 'helper';

    const tierBadgeBg = isHead ? '#ecfeff' : isSupervisor ? '#eef2ff' : '#eff6ff';
    const tierBadgeColor = isHead ? '#0e7490' : isSupervisor ? '#4338ca' : '#1d4ed8';
    const tierBadgeBorder = isHead ? '#a5f3fc' : isSupervisor ? '#c7d2fe' : '#bfdbfe';

    return (
      <div
        key={m._id}
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          transition: 'all 0.15s ease',
        }}
      >
        {/* Card Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: isHead
                  ? 'linear-gradient(135deg, #0891b2, #0e7490)'
                  : isSupervisor
                  ? 'linear-gradient(135deg, #4f46e5, #4338ca)'
                  : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                flexShrink: 0,
              }}
            >
              <i className={isHead ? 'fa-solid fa-user-tie' : isSupervisor ? 'fa-solid fa-user-gear' : 'fa-solid fa-person-digging'} />
            </div>

            <div>
              <div style={{ fontWeight: '800', fontSize: '0.94rem', color: '#0f172a' }}>
                {m.name}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                <i className={getDepartmentTheme(m.department || m.trade).icon} style={{ fontSize: '11px', color: getDepartmentTheme(m.department || m.trade).color }} />
                <span>{m.department || m.trade || 'General Operations'}</span>
              </div>
            </div>
          </div>

          <span
            style={{
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '0.68rem',
              fontWeight: '800',
              textTransform: 'uppercase',
              background: tierBadgeBg,
              color: tierBadgeColor,
              border: `1px solid ${tierBadgeBorder}`,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <i className={isHead ? 'fa-solid fa-user-tie' : isSupervisor ? 'fa-solid fa-user-gear' : 'fa-solid fa-person-digging'} style={{ fontSize: '10px' }} />
            <span>{m.hierarchyLevel}</span>
          </span>
        </div>

        {/* Reporting Info Strip */}
        {(m.supervisorId || m.headId) && (
          <div
            style={{
              background: '#f8fafc',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '0.72rem',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <i className="fa-solid fa-diagram-project" style={{ fontSize: '11px', color: '#64748b' }} />
            <span style={{ fontWeight: '700', color: '#64748b' }}>Reporting:</span>
            {m.supervisorId && <span>Lead: {m.supervisorId.name}</span>}
            {m.supervisorId && m.headId && <span>•</span>}
            {m.headId && <span>Head: {m.headId.name}</span>}
          </div>
        )}

        {/* Workload Stats Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '6px',
            textAlign: 'center',
            background: '#f8fafc',
            borderRadius: '8px',
            padding: '8px',
          }}
        >
          <div>
            <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <i className="fa-solid fa-list-check" style={{ fontSize: '9px' }} /> Active
            </div>
            <div style={{ fontSize: '1rem', fontWeight: '800', color: '#2563eb', marginTop: '2px' }}>
              {m.stats?.activeTasks || 0}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <i className="fa-solid fa-circle-check" style={{ fontSize: '9px' }} /> Completed
            </div>
            <div style={{ fontSize: '1rem', fontWeight: '800', color: '#16a34a', marginTop: '2px' }}>
              {m.stats?.completedTasks || 0}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <i className="fa-solid fa-camera" style={{ fontSize: '9px' }} /> Proofs
            </div>
            <div style={{ fontSize: '1rem', fontWeight: '800', color: '#7c3aed', marginTop: '2px' }}>
              {m.stats?.uploadCount || 0}
            </div>
          </div>
        </div>

        {/* Contact & Status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#64748b' }}>
          {m.mobileNo ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <i className="fa-solid fa-phone" style={{ fontSize: '11px', color: '#059669' }} />
              <span>{m.mobileNo}</span>
            </div>
          ) : (
            <span>No Phone</span>
          )}
          {m.userId ? (
            <span style={{ color: '#16a34a', fontWeight: '700' }}>• Login Linked</span>
          ) : (
            <span style={{ color: '#94a3b8' }}>• Field Personnel</span>
          )}
        </div>

        {/* Card Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid #f1f5f9',
            paddingTop: '10px',
            marginTop: 'auto',
          }}
        >
          <button
            type="button"
            onClick={() => onViewMemberDashboard && onViewMemberDashboard(m)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '7px',
              background: '#eff6ff',
              color: '#1d4ed8',
              border: '1px solid #bfdbfe',
              fontSize: '0.74rem',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            <i className="fa-solid fa-chart-line" /> View Dashboard
          </button>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={() => {
                if (onAssignTaskToMember) onAssignTaskToMember(m);
                else if (onAssignTask) onAssignTask(m);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: '7px',
                background: '#059669',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.74rem',
                fontWeight: '700',
                cursor: 'pointer',
              }}
              title="Assign task directly to this member"
            >
              <i className="fa-solid fa-plus" /> Assign Task
            </button>

            <button
              type="button"
              onClick={() => handleDeleteMember(m)}
              style={{
                padding: '6px 8px',
                borderRadius: '6px',
                background: '#f1f5f9',
                color: '#94a3b8',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
              title="Remove member"
            >
              <i className="fa-solid fa-trash-can" />
            </button>
          </div>
        </div>
      </div>
    );
  }
};

export default TaskforceTeamTab;
