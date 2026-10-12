import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal.jsx';
import { taskService } from '../../services/taskService.js';
import { taskforceManagerService } from '../../services/taskforceManagerService.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { canUserAssignTasks } from '../../utils/taskPermissions.js';
import {
  getDepartmentTheme,
  getDepartmentIcon,
  getHierarchyTheme,
} from '../../utils/departmentIcons.js';
import {
  Sparkles,
  Users,
  Building2,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  X,
  Plus,
  Search,
  Check,
  Trash2,
  ArrowRight,
  ArrowLeft,
  ListTodo,
  Layers,
  Shield,
  Briefcase,
  HelpCircle,
  CheckSquare,
  Filter,
  FileText,
  Zap,
  Phone,
} from 'lucide-react';

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  { value: 'medium', label: 'Medium', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  { value: 'high', label: 'High Priority', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
  { value: 'urgent', label: 'Urgent Directive', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
];

export const NewTaskModal = ({ isOpen, onClose, onTaskCreated, initialData = null }) => {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [metaAssignees, setMetaAssignees] = useState([]);
  const [metaTaskforceMembers, setMetaTaskforceMembers] = useState([]);
  const [metaDepartments, setMetaDepartments] = useState([]);
  const [metaProjects, setMetaProjects] = useState([]);

  // Form State
  const [currentStep, setCurrentStep] = useState(1); // 1: 'details', 2: 'assignees', 3: 'schedule'
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('');
  const [priority, setPriority] = useState('high');
  const [isMDDirective, setIsMDDirective] = useState(true);
  const [isApartmentRelated, setIsApartmentRelated] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [tower, setTower] = useState('');
  const [flatNumber, setFlatNumber] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [selectedTaskforceMembers, setSelectedTaskforceMembers] = useState([]);
  const [assigneeCategoryTab, setAssigneeCategoryTab] = useState('taskforce'); // 'taskforce' or 'erp'
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [followUpFrequency, setFollowUpFrequency] = useState('daily');
  const [nextFollowUpDate, setNextFollowUpDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });

  // Action Checkpoints (Sub-tasks) State
  const [checkpoints, setCheckpoints] = useState([]);
  const [newCheckpointInput, setNewCheckpointInput] = useState('');

  // Assignee Search & Filter State
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [assigneeDeptFilter, setAssigneeDeptFilter] = useState('all');
  const [autoFetchedInfo, setAutoFetchedInfo] = useState(null);
  const [showOnlyDeptMembers, setShowOnlyDeptMembers] = useState(true);

  // Load assignees and department metadata
  useEffect(() => {
    if (isOpen) {
      loadMeta();
      setCurrentStep(1);
      if (initialData) {
        setTitle(initialData.title || '');
        setDescription(initialData.description || '');
        setDepartment(initialData.department || '');
        setPriority(initialData.priority || 'high');
        setIsMDDirective(Boolean(initialData.isMDDirective));
        setIsApartmentRelated(Boolean(initialData.isApartmentRelated));
        setSelectedProjectId(
          initialData.apartmentDetails?.projectId?._id ||
            initialData.apartmentDetails?.projectId ||
            ''
        );
        setTower(initialData.apartmentDetails?.tower || '');
        setFlatNumber(initialData.apartmentDetails?.flatNumber || '');
        setSelectedAssignees(
          (initialData.assignedTo || []).map((u) => (typeof u === 'object' ? u._id : u))
        );
        setSelectedTaskforceMembers(
          (initialData.assignedMembers || []).map((m) => (typeof m === 'object' ? m._id : m))
        );
        setStartDate(
          initialData.startDate
            ? new Date(initialData.startDate).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]
        );
        setDueDate(
          initialData.dueDate ? new Date(initialData.dueDate).toISOString().split('T')[0] : ''
        );
        setFollowUpFrequency(initialData.followUpSchedule?.frequency || 'daily');
        setNextFollowUpDate(
          initialData.followUpSchedule?.nextFollowUpDate
            ? new Date(initialData.followUpSchedule.nextFollowUpDate).toISOString().split('T')[0]
            : ''
        );
        setCheckpoints(
          Array.isArray(initialData.checkpoints)
            ? initialData.checkpoints.map((c) => ({
                title: typeof c === 'string' ? c : c.title,
                isCompleted: Boolean(c.isCompleted),
              }))
            : []
        );
      } else {
        // Fresh modal defaults
        setTitle('');
        setDescription('');
        setDepartment('');
        setPriority('high');
        setIsMDDirective(true);
        setIsApartmentRelated(false);
        setSelectedProjectId('');
        setTower('');
        setFlatNumber('');
        setSelectedAssignees([]);
        setSelectedTaskforceMembers([]);
        setStartDate(new Date().toISOString().split('T')[0]);
        const defDue = new Date();
        defDue.setDate(defDue.getDate() + 3);
        setDueDate(defDue.toISOString().split('T')[0]);
        setFollowUpFrequency('daily');
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setNextFollowUpDate(tomorrow.toISOString().split('T')[0]);
        setCheckpoints([]);
        setNewCheckpointInput('');
      }
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    const handleDeptUpdated = () => {
      if (isOpen) {
        loadMeta();
      }
    };
    window.addEventListener('departmentsUpdated', handleDeptUpdated);
    return () => window.removeEventListener('departmentsUpdated', handleDeptUpdated);
  }, [isOpen]);

  const loadMeta = async () => {
    try {
      setLoadingMeta(true);
      const [res, deptRes] = await Promise.all([
        taskService.getAssigneesMeta(),
        taskforceManagerService.getDepartments().catch(() => null),
      ]);

      if (res && res.success) {
        const tf = res.taskforceMembers || [];
        const staff = res.assignees || [];
        setMetaAssignees(staff);
        setMetaTaskforceMembers(tf);

        let finalDepts = [];
        if (deptRes?.success && Array.isArray(deptRes.departments) && deptRes.departments.length > 0) {
          finalDepts = deptRes.departments.map((d) => ({
            key: d.name,
            label: d.name,
            code: d.code,
            color: d.color,
            description: d.description,
            group: 'Taskforce Operations',
          }));
        } else if (res.departments?.length > 0) {
          finalDepts = res.departments;
        }

        // Deduplicate
        const seen = new Set();
        const uniqueDepts = [];
        for (const d of finalDepts) {
          const id = (d.label || d.key || d.name || '').toLowerCase().trim();
          if (id && !seen.has(id)) {
            seen.add(id);
            uniqueDepts.push({
              key: d.key || d.name || d.label,
              label: d.label || d.name || d.key,
              code: d.code,
              color: d.color,
              description: d.description,
              group: d.group || 'Taskforce Operations',
            });
          }
        }

        setMetaDepartments(uniqueDepts);
        setMetaProjects(res.projects || []);
        if (res.projects?.length > 0 && !selectedProjectId) {
          setSelectedProjectId(res.projects[0]._id);
        }

        // If creating fresh task, auto-fetch for the initial department
        if (uniqueDepts.length > 0) {
          const currentTarget = (initialData?.department || department || '').toLowerCase().trim();
          const matchedDept =
            uniqueDepts.find((d) => {
              const dk = (d.key || '').toLowerCase().trim();
              return dk === currentTarget || (currentTarget && (dk.includes(currentTarget) || currentTarget.includes(dk)));
            }) || uniqueDepts[0];
          const initialDeptKey = matchedDept.key;
          setDepartment(initialDeptKey);
          if (!initialData) {
            autoFetchPersonnelForDept(initialDeptKey, tf, staff);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load task metadata', err);
    } finally {
      setLoadingMeta(false);
    }
  };

  const getTfMemberDetails = (member) => {
    if (!member) {
      return {
        name: 'Team Member',
        initials: 'TM',
        roleTitle: 'Field Personnel',
        bg: '#f1f5f9',
        color: '#334155',
        border: '#cbd5e1',
        badgeBg: '#f8fafc',
        badgeColor: '#475569',
        badgeBorder: '#e2e8f0',
      };
    }

    const name =
      member.name ||
      member.fullName ||
      (member.userId
        ? `${member.userId.firstName || ''} ${member.userId.lastName || ''}`.trim()
        : '') ||
      'Team Member';

    const nameParts = name.trim().split(/\s+/).filter(Boolean);
    const initials =
      nameParts.length >= 2
        ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
        : name.slice(0, 2).toUpperCase() || 'TM';

    const level = (member.hierarchyLevel || '').toLowerCase();
    if (level === 'head') {
      return {
        name,
        initials,
        roleTitle: 'Department Head',
        bg: '#fef3c7',
        color: '#92400e',
        border: '#fde68a',
        badgeBg: '#fef3c7',
        badgeColor: '#78350f',
        badgeBorder: '#fcd34d',
      };
    }
    if (level === 'supervisor') {
      return {
        name,
        initials,
        roleTitle: 'Field Supervisor',
        bg: '#eff6ff',
        color: '#1d4ed8',
        border: '#bfdbfe',
        badgeBg: '#dbeafe',
        badgeColor: '#1e40af',
        badgeBorder: '#93c5fd',
      };
    }
    return {
      name,
      initials,
      roleTitle: member.trade ? `${member.trade} Technician` : 'Field Helper',
      bg: '#f0fdf4',
      color: '#166534',
      border: '#bbf7d0',
      badgeBg: '#dcfce7',
      badgeColor: '#15803d',
      badgeBorder: '#86efac',
    };
  };

  const getErpStaffDetails = (user) => {
    if (!user) {
      return {
        name: 'ERP Staff',
        initials: 'ST',
        designation: 'Staff Member',
        department: 'General',
      };
    }
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Staff Member';
    const nameParts = name.split(/\s+/).filter(Boolean);
    const initials =
      nameParts.length >= 2
        ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
        : name.slice(0, 2).toUpperCase() || 'ST';
    const designation = user.roleId?.roleName || 'ERP Staff';
    const department = user.department || user.roleId?.roleCode || 'Staff';

    return {
      name,
      initials,
      designation,
      department,
    };
  };

  const autoFetchPersonnelForDept = (deptKey, tfList = metaTaskforceMembers, staffList = metaAssignees) => {
    if (!deptKey) return;
    const target = deptKey.toLowerCase().trim();

    // Match Taskforce members
    const matchingTf = (tfList || []).filter((m) => {
      const mDept = (m.department || m.trade || '').toLowerCase().trim();
      return (
        mDept === target ||
        mDept.includes(target) ||
        target.includes(mDept) ||
        (target.includes('civil') && mDept.includes('civil')) ||
        (target.includes('snag') && mDept.includes('snag')) ||
        (target.includes('plumb') && mDept.includes('plumb')) ||
        (target.includes('elect') && mDept.includes('elect')) ||
        (target.includes('paint') && mDept.includes('paint')) ||
        (target.includes('carpent') && mDept.includes('carpent')) ||
        (target.includes('housekeep') && mDept.includes('housekeep')) ||
        (target.includes('secur') && mDept.includes('secur')) ||
        (target.includes('hvac') && mDept.includes('hvac'))
      );
    });

    // Match ERP Staff
    const matchingStaff = (staffList || []).filter((s) => {
      const roleName = (s.roleId?.roleName || '').toLowerCase();
      const roleCode = (s.roleId?.roleCode || '').toLowerCase();
      const deptName = (s.department || '').toLowerCase();
      return (
        deptName.includes(target) ||
        roleName.includes(target) ||
        roleCode.includes(target) ||
        (target.includes('civil') && (roleName.includes('site') || roleName.includes('engineer') || roleName.includes('civil'))) ||
        (target.includes('snag') && roleName.includes('snag')) ||
        (target.includes('crm') && (roleName.includes('sales') || roleName.includes('client') || roleName.includes('crm'))) ||
        (target.includes('account') && (roleName.includes('account') || roleName.includes('finance') || roleName.includes('tax') || roleName.includes('bill'))) ||
        (target.includes('maint') && (roleName.includes('technician') || roleName.includes('maint') || roleName.includes('repair'))) ||
        (target.includes('procure') && (roleName.includes('procure') || roleName.includes('purchase') || roleName.includes('store'))) ||
        (target.includes('secur') && (roleName.includes('security') || roleName.includes('guard'))) ||
        (target.includes('hotel') && (roleName.includes('hotel') || roleName.includes('housekeep') || roleName.includes('guest')))
      );
    });

    const matchingTfIds = matchingTf.map((m) => m._id);
    const matchingStaffIds = matchingStaff.map((s) => s._id);

    // Auto-select the personnel
    if (matchingTfIds.length > 0) {
      setSelectedTaskforceMembers(matchingTfIds);
      setAssigneeCategoryTab('taskforce');
    } else {
      setSelectedTaskforceMembers([]);
    }

    if (matchingStaffIds.length > 0 && matchingTfIds.length === 0) {
      setSelectedAssignees(matchingStaffIds);
      setAssigneeCategoryTab('erp');
    }

    const headsCount = matchingTf.filter(
      (m) => (m.hierarchyLevel || '').toLowerCase() === 'head'
    ).length;
    const supervisorsCount = matchingTf.filter(
      (m) => (m.hierarchyLevel || '').toLowerCase() === 'supervisor'
    ).length;
    const helpersCount = matchingTf.filter(
      (m) => (m.hierarchyLevel || '').toLowerCase() === 'helper'
    ).length;

    setAutoFetchedInfo({
      department: deptKey,
      count: matchingTfIds.length + matchingStaffIds.length,
      tfCount: matchingTfIds.length,
      staffCount: matchingStaffIds.length,
      headsCount,
      supervisorsCount,
      helpersCount,
      tfMembers: matchingTf,
      staffMembers: matchingStaff,
    });
  };

  const handleDepartmentChange = (newDept) => {
    setDepartment(newDept);
    setAssigneeDeptFilter(newDept);
    autoFetchPersonnelForDept(newDept);
  };

  // Filtered Assignees list with real-time search & department match
  const filteredAssignees = useMemo(() => {
    return metaAssignees.filter((staff) => {
      const fullName = `${staff.firstName || ''} ${staff.lastName || ''}`.toLowerCase();
      const username = (staff.username || '').toLowerCase();
      const roleName = (staff.roleId?.roleName || '').toLowerCase();
      const searchMatch =
        !assigneeSearch.trim() ||
        fullName.includes(assigneeSearch.toLowerCase()) ||
        username.includes(assigneeSearch.toLowerCase()) ||
        roleName.includes(assigneeSearch.toLowerCase());

      if (!searchMatch) return false;

      if (assigneeDeptFilter === 'all') return true;
      const k = assigneeDeptFilter.toLowerCase();
      if (k === 'civil') {
        return roleName.includes('civil') || roleName.includes('site') || roleName.includes('engineer') || roleName.includes('construct');
      }
      if (k === 'crm') {
        return roleName.includes('crm') || roleName.includes('sales') || roleName.includes('client');
      }
      if (k === 'accounts') {
        return roleName.includes('account') || roleName.includes('finance') || roleName.includes('tax') || roleName.includes('billing');
      }
      if (k === 'hr') {
        return roleName.includes('hr') || roleName.includes('human') || roleName.includes('payroll') || roleName.includes('recruit');
      }
      if (k === 'it') {
        return roleName.includes('it') || roleName.includes('tech') || roleName.includes('software') || roleName.includes('system');
      }
      if (k === 'procurement') {
        return roleName.includes('procure') || roleName.includes('purchase') || roleName.includes('store') || roleName.includes('vendor');
      }
      if (k === 'security') {
        return roleName.includes('security') || roleName.includes('guard') || roleName.includes('safety');
      }
      if (k === 'hotel') {
        return roleName.includes('hotel') || roleName.includes('housekeep') || roleName.includes('guest');
      }
      if (k === 'hotel_restaurant') {
        return roleName.includes('restaurant') || roleName.includes('food') || roleName.includes('kitchen') || roleName.includes('f&b');
      }
      if (k === 'admin_operations') {
        return roleName.includes('admin') || roleName.includes('operat');
      }
      if (k === 'maintenance') {
        return roleName.includes('maint') || roleName.includes('plumb') || roleName.includes('elect') || roleName.includes('technician');
      }
      if (k === 'licensing') {
        return roleName.includes('licens') || roleName.includes('legal') || roleName.includes('rera');
      }
      if (k === 'viramah') {
        return roleName.includes('viramah');
      }
      return roleName.includes(k) || username.includes(k);
    });
  }, [metaAssignees, assigneeSearch, assigneeDeptFilter]);

  const handleToggleAssignee = (userId) => {
    setSelectedAssignees((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleToggleTaskforceMember = (memberId) => {
    setSelectedTaskforceMembers((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const filteredTaskforceMembers = useMemo(() => {
    const target = (department || '').toLowerCase().trim();

    return metaTaskforceMembers.filter((m) => {
      const name = (m.name || m.fullName || '').toLowerCase();
      const mDept = (m.department || m.trade || '').toLowerCase().trim();
      const role = (m.role || m.hierarchyLevel || '').toLowerCase();
      const s = assigneeSearch.toLowerCase().trim();

      const matchesSearch = !s || name.includes(s) || mDept.includes(s) || role.includes(s);
      if (!matchesSearch) return false;

      if (!showOnlyDeptMembers) return true;

      return (
        mDept === target ||
        mDept.includes(target) ||
        target.includes(mDept) ||
        (target.includes('civil') && mDept.includes('civil')) ||
        (target.includes('snag') && mDept.includes('snag')) ||
        (target.includes('plumb') && mDept.includes('plumb')) ||
        (target.includes('elect') && mDept.includes('elect')) ||
        (target.includes('paint') && mDept.includes('paint')) ||
        (target.includes('carpent') && mDept.includes('carpent')) ||
        (target.includes('housekeep') && mDept.includes('housekeep')) ||
        (target.includes('secur') && mDept.includes('secur')) ||
        (target.includes('hvac') && mDept.includes('hvac'))
      );
    });
  }, [metaTaskforceMembers, assigneeSearch, department, showOnlyDeptMembers]);

  const handleSelectAllFiltered = () => {
    if (assigneeCategoryTab === 'taskforce') {
      const ids = filteredTaskforceMembers.map((m) => m._id);
      setSelectedTaskforceMembers((prev) => Array.from(new Set([...prev, ...ids])));
    } else {
      const ids = filteredAssignees.map((a) => a._id);
      setSelectedAssignees((prev) => Array.from(new Set([...prev, ...ids])));
    }
  };

  const handleClearSelection = () => {
    setSelectedAssignees([]);
    setSelectedTaskforceMembers([]);
  };

  const handleGoToStep2 = () => {
    if (!title.trim()) {
      showToast('Please enter a task title before proceeding to assign team', 'error');
      return;
    }
    setCurrentStep(2);
  };

  const handleGoToStep3 = () => {
    if (selectedAssignees.length === 0 && selectedTaskforceMembers.length === 0) {
      showToast('Please select at least one person to assign this task', 'error');
      return;
    }
    setCurrentStep(3);
  };

  // Quick preset title applicator
  const applyPreset = (preset) => {
    setTitle(preset.title);
    if (preset.checkpoints && preset.checkpoints.length > 0) {
      setCheckpoints(preset.checkpoints.map((t) => ({ title: t, isCompleted: false })));
    }
  };

  // Checkpoints management
  const handleAddCheckpoint = () => {
    if (!newCheckpointInput.trim()) return;
    setCheckpoints([...checkpoints, { title: newCheckpointInput.trim(), isCompleted: false }]);
    setNewCheckpointInput('');
  };

  const handleRemoveCheckpoint = (index) => {
    setCheckpoints(checkpoints.filter((_, i) => i !== index));
  };

  // Quick Date Helpers
  const setQuickDeadlineDays = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setDueDate(d.toISOString().split('T')[0]);
  };

  const handleCadenceChange = (cadence) => {
    setFollowUpFrequency(cadence);
    const d = new Date();
    if (cadence === 'daily') d.setDate(d.getDate() + 1);
    else if (cadence === 'alternate_days') d.setDate(d.getDate() + 2);
    else if (cadence === 'weekly') d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setNextFollowUpDate(d.toISOString().split('T')[0]);
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!title.trim()) {
      showToast('Please provide a task title or work description', 'error');
      setCurrentStep(1);
      return;
    }

    if (selectedAssignees.length === 0 && selectedTaskforceMembers.length === 0) {
      showToast('Please allocate this task to at least one team member or taskforce staff', 'error');
      setCurrentStep(2);
      return;
    }

    try {
      setLoading(true);

      const selectedProjectObj = metaProjects.find((p) => p._id === selectedProjectId);

      // Auto-include any linked user IDs of selected taskforce members into assignedTo
      const linkedUserIds = selectedTaskforceMembers
        .map((mId) => {
          const mem = metaTaskforceMembers.find((m) => m._id === mId);
          return mem?.userId?._id || mem?.userId;
        })
        .filter(Boolean);
      const combinedAssignees = Array.from(new Set([...selectedAssignees, ...linkedUserIds]));

      const payload = {
        title: title.trim(),
        description: description.trim(),
        department,
        priority,
        isMDDirective,
        isApartmentRelated,
        apartmentDetails: isApartmentRelated
          ? {
              projectId: selectedProjectId || undefined,
              projectName: selectedProjectObj ? selectedProjectObj.projectName : '',
              tower: tower.trim(),
              flatNumber: flatNumber.trim(),
            }
          : undefined,
        assignedTo: combinedAssignees,
        assignedMembers: selectedTaskforceMembers,
        startDate,
        dueDate: dueDate || undefined,
        nextFollowUpDate: nextFollowUpDate || undefined,
        followUpFrequency,
        checkpoints: checkpoints.map((c) => ({
          title: c.title,
          isCompleted: Boolean(c.isCompleted),
        })),
      };

      if (initialData?._id) {
        await taskService.updateTask(initialData._id, payload);
        showToast('Task directive updated successfully', 'success');
      } else {
        await taskService.createTask(payload);
        showToast('Task directive dispatched to team members', 'success');
      }

      if (onTaskCreated) onTaskCreated();
      onClose();
    } catch (error) {
      console.error('Save task error:', error);
      showToast(error.message || 'Failed to dispatch task directive', 'error');
    } finally {
      setLoading(false);
    }
  };

  const totalSelectedCount = selectedAssignees.length + selectedTaskforceMembers.length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Task Directive' : 'Assign New Task Directive'}
      maxWidth="880px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* STEP PROGRESS WIZARD NAVIGATION BAR */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#f1f5f9',
            padding: '4px',
            borderRadius: '12px',
            gap: '6px',
            border: '1px solid #e2e8f0',
          }}
        >
          {/* Step 1 Tab */}
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '9px 12px',
              borderRadius: '9px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: currentStep === 1 ? '#ffffff' : 'transparent',
              color: currentStep === 1 ? '#005bbf' : '#64748b',
              fontWeight: currentStep === 1 ? 700 : 500,
              fontSize: '13px',
              boxShadow: currentStep === 1 ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: currentStep === 1 ? '#005bbf' : '#cbd5e1',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              1
            </span>
            <span>Task & Trade</span>
            {title ? (
              <span
                style={{
                  fontSize: '11px',
                  backgroundColor: '#dcfce7',
                  color: '#15803d',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontWeight: 700,
                }}
              >
                Done
              </span>
            ) : null}
          </button>

          {/* Step 2 Tab */}
          <button
            type="button"
            onClick={() => setCurrentStep(2)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '9px 12px',
              borderRadius: '9px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: currentStep === 2 ? '#ffffff' : 'transparent',
              color: currentStep === 2 ? '#005bbf' : '#64748b',
              fontWeight: currentStep === 2 ? 700 : 500,
              fontSize: '13px',
              boxShadow: currentStep === 2 ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: currentStep === 2 ? '#005bbf' : '#cbd5e1',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              2
            </span>
            <span>Assign Team</span>
            {totalSelectedCount > 0 ? (
              <span
                style={{
                  fontSize: '11px',
                  backgroundColor: currentStep === 2 ? '#e0f2fe' : '#e2e8f0',
                  color: currentStep === 2 ? '#0284c7' : '#475569',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontWeight: 700,
                }}
              >
                {totalSelectedCount} Selected
              </span>
            ) : null}
          </button>

          {/* Step 3 Tab */}
          <button
            type="button"
            onClick={() => setCurrentStep(3)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '9px 12px',
              borderRadius: '9px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: currentStep === 3 ? '#ffffff' : 'transparent',
              color: currentStep === 3 ? '#005bbf' : '#64748b',
              fontWeight: currentStep === 3 ? 700 : 500,
              fontSize: '13px',
              boxShadow: currentStep === 3 ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: currentStep === 3 ? '#005bbf' : '#cbd5e1',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              3
            </span>
            <span>Timeline & Steps</span>
            {checkpoints.length > 0 ? (
              <span
                style={{
                  fontSize: '11px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontWeight: 700,
                }}
              >
                {checkpoints.length} Steps
              </span>
            ) : null}
          </button>
        </div>

        {/* ================= STEP 1: TASK DETAILS & DEPARTMENT ================= */}
        {currentStep === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* MD Directive Banner */}
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                backgroundColor: isMDDirective ? '#fefce8' : '#f8fafc',
                border: isMDDirective ? '1.5px solid #ca8a04' : '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: isMDDirective ? '0 2px 8px rgba(202, 138, 4, 0.1)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: isMDDirective ? '#ca8a04' : '#64748b',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: isMDDirective ? '0 2px 6px rgba(202, 138, 4, 0.25)' : 'none',
                    flexShrink: 0,
                  }}
                >
                  <Sparkles size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
                    Managing Director (MD) Executive Directive
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Tags this directive for daily MD executive status tracking.
                  </div>
                </div>
              </div>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '13px',
                  color: isMDDirective ? '#854d0e' : '#64748b',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={isMDDirective}
                  onChange={(e) => setIsMDDirective(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#ca8a04' }}
                />
                <span>Active</span>
              </label>
            </div>

            {/* Department Selection with Quick-Pills & Auto-Fetch */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                    Department / Trade Category
                  </label>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    Selecting automatically loads and assigns that department’s field personnel.
                  </div>
                </div>

                {autoFetchedInfo && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: autoFetchedInfo.count > 0 ? '#eff6ff' : '#f8fafc',
                      color: autoFetchedInfo.count > 0 ? '#005bbf' : '#64748b',
                      border: `1px solid ${autoFetchedInfo.count > 0 ? '#bfdbfe' : '#e2e8f0'}`,
                      padding: '4px 10px',
                      borderRadius: '12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <i
                      className={autoFetchedInfo.count > 0 ? 'fa-solid fa-bolt-lightning' : 'fa-solid fa-circle-info'}
                      style={{ color: autoFetchedInfo.count > 0 ? '#005bbf' : '#94a3b8' }}
                    />
                    <span>
                      {autoFetchedInfo.count > 0
                        ? `Auto-fetched ${autoFetchedInfo.count} staff (${[
                            autoFetchedInfo.headsCount > 0 ? `${autoFetchedInfo.headsCount} Head` : '',
                            autoFetchedInfo.supervisorsCount > 0 ? `${autoFetchedInfo.supervisorsCount} Sup` : '',
                            autoFetchedInfo.helpersCount > 0 ? `${autoFetchedInfo.helpersCount} Helper` : '',
                          ]
                            .filter(Boolean)
                            .join(', ')})`
                        : '0 staff mapped to this department'}
                    </span>
                  </span>
                )}
              </div>

              {/* Dynamic Department Selector Chips (Fetched from Departments & Hierarchy) */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {metaDepartments.map((dept) => {
                  const deptName = dept.label || dept.name || dept.key;
                  const theme = getDepartmentTheme(deptName);
                  const isSelected = department.toLowerCase().trim() === deptName.toLowerCase().trim();

                  // Live count of members in this department
                  const count = metaTaskforceMembers.filter((m) => {
                    const mDept = (m.department || '').toLowerCase().trim();
                    const mTrade = (m.trade || '').toLowerCase().trim();
                    const t = deptName.toLowerCase().trim();
                    if (mDept === t || mTrade === t) return true;
                    if (mDept && (t.includes(mDept) || mDept.includes(t))) return true;
                    if (mTrade && (t.includes(mTrade) || mTrade.includes(t))) return true;
                    const targetTokens = t.split(/[\s&,/\\-]+/).filter((tok) => tok.length >= 3);
                    const memberTokens = `${mDept} ${mTrade}`.split(/[\s&,/\\-]+/).filter((tok) => tok.length >= 3);
                    return targetTokens.some((tt) => memberTokens.some((mt) => mt.includes(tt) || tt.includes(mt)));
                  }).length;

                  return (
                    <button
                      key={dept.key || deptName}
                      type="button"
                      onClick={() => handleDepartmentChange(deptName)}
                      style={{
                        padding: '7px 14px',
                        borderRadius: '20px',
                        border: isSelected ? `2px solid ${theme.color}` : '1px solid #cbd5e1',
                        backgroundColor: isSelected ? theme.bg : '#f8fafc',
                        color: isSelected ? theme.color : '#334155',
                        fontWeight: isSelected ? 800 : 600,
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '7px',
                        boxShadow: isSelected ? `0 2px 8px ${theme.color}30` : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <i className={theme.icon} style={{ fontSize: '13px', color: isSelected ? theme.color : '#64748b' }} />
                      <span>{deptName}</span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '1px 6px',
                          borderRadius: '10px',
                          backgroundColor: isSelected ? theme.color : '#e2e8f0',
                          color: isSelected ? '#ffffff' : '#475569',
                        }}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* All Departments Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>All Departments:</span>
                <select
                  value={department}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                  className="search-input"
                  style={{
                    flex: 1,
                    fontSize: '13px',
                    fontWeight: 600,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                  }}
                >
                  {metaDepartments.map((dept) => {
                    const deptName = dept.label || dept.name || dept.key;
                    return (
                      <option key={dept.key || deptName} value={deptName}>
                        {deptName}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Task Title & Presets */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                  Task Title / Work Directive <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  className="search-input"
                  style={{
                    width: '100%',
                    fontSize: '14px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontWeight: 600,
                    marginTop: '6px',
                  }}
                  placeholder="e.g., Tower B - Master Bedroom Wall Seepage Repair & Drain Pressure Check"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
            </div>

            {/* Visual Priority Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                Priority Level
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                {PRIORITY_OPTIONS.map((p) => {
                  const isSelected = priority === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPriority(p.value)}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '10px',
                        border: isSelected ? `2px solid ${p.color}` : '1px solid #e2e8f0',
                        backgroundColor: isSelected ? p.bg : '#ffffff',
                        color: isSelected ? p.color : '#475569',
                        fontWeight: isSelected ? 800 : 600,
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: isSelected ? `0 2px 8px ${p.border}` : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: p.color,
                          display: 'inline-block',
                        }}
                      />
                      <span>{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Apartment / Tower Link (Collapsible Card) */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '12px 16px',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '13px',
                  color: '#1e293b',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={isApartmentRelated}
                  onChange={(e) => setIsApartmentRelated(e.target.checked)}
                  style={{ width: '17px', height: '17px', cursor: 'pointer', accentColor: '#005bbf' }}
                />
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building2 size={16} color="#005bbf" />
                  Link to Specific Tower / Flat (Optional)
                </span>
              </label>

              {isApartmentRelated && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '12px',
                    marginTop: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid #e2e8f0',
                  }}
                >
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                      PROJECT
                    </label>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="search-input"
                      style={{ width: '100%', fontSize: '13px', padding: '7px 10px', borderRadius: '6px' }}
                    >
                      <option value="">Select Project</option>
                      {metaProjects.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.projectName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                      TOWER / BLOCK
                    </label>
                    <input
                      type="text"
                      list="towers-list"
                      className="search-input"
                      style={{ width: '100%', fontSize: '13px', padding: '7px 10px', borderRadius: '6px' }}
                      placeholder="e.g. Tower A"
                      value={tower}
                      onChange={(e) => setTower(e.target.value)}
                    />
                    <datalist id="towers-list">
                      {COMMON_TOWERS.map((t) => (
                        <option key={t} value={t} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                      FLAT / UNIT NUMBER
                    </label>
                    <input
                      type="text"
                      className="search-input"
                      style={{ width: '100%', fontSize: '13px', padding: '7px 10px', borderRadius: '6px' }}
                      placeholder="e.g. 402, Villa 12"
                      value={flatNumber}
                      onChange={(e) => setFlatNumber(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Scope of Work / Notes */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                Scope of Work & Technical Guidelines (Optional)
              </label>
              <textarea
                className="search-input"
                rows={2}
                style={{
                  width: '100%',
                  fontSize: '13px',
                  padding: '10px 12px',
                  lineHeight: '1.4',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                }}
                placeholder="Specify exact work guidelines, materials to carry, client contact instructions, or quality checks..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* ================= STEP 2: ASSIGN TEAM (BEAUTIFIED & SPACIOUS) ================= */}
        {currentStep === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Auto-Fetch Status Banner & Quick Action Buttons */}
            <div
              style={{
                backgroundColor: '#eff6ff',
                border: '1.5px solid #bfdbfe',
                borderRadius: '10px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} color="#005bbf" />
                <span style={{ fontSize: '13px', color: '#1e3a8a', fontWeight: 600 }}>
                  Showing team members for <strong style={{ textTransform: 'capitalize' }}>{department}</strong>
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '5px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #93c5fd',
                    color: '#005bbf',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Check size={13} />
                  Select All Filtered
                </button>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '5px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    color: '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* BEAUTIFIED SELECTED CHIPS: Person Name with Designation Badge */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                  Assigned Team ({totalSelectedCount})
                </span>
                {totalSelectedCount > 0 && (
                  <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700 }}>
                    Ready to allocate
                  </span>
                )}
              </div>

              {totalSelectedCount === 0 ? (
                <div
                  style={{
                    padding: '14px',
                    textAlign: 'center',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px dashed #cbd5e1',
                    color: '#64748b',
                    fontSize: '13px',
                  }}
                >
                  Click on any team member below to assign them to this task directive.
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '120px', overflowY: 'auto' }}>
                  {/* Selected Taskforce Members */}
                  {selectedTaskforceMembers.map((mId) => {
                    const member = metaTaskforceMembers.find((m) => m._id === mId);
                    const details = getTfMemberDetails(member);
                    return (
                      <div
                        key={mId}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '4px 10px 4px 6px',
                          borderRadius: '24px',
                          backgroundColor: details.badgeBg || '#eff6ff',
                          border: `1.5px solid ${details.badgeBorder || '#bfdbfe'}`,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        }}
                      >
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: details.color || '#005bbf',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: 800,
                          }}
                        >
                          {details.initials}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
                            {details.name}
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '6px',
                              backgroundColor: '#ffffff',
                              color: details.badgeColor || '#005bbf',
                              border: `1px solid ${details.badgeBorder || '#bfdbfe'}`,
                              display: 'inline-flex',
                              alignItems: 'center',
                            }}
                          >
                            {details.roleTitle}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleTaskforceMember(mId)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'flex',
                            color: '#64748b',
                            borderRadius: '50%',
                          }}
                          title="Remove member"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}

                  {/* Selected ERP Staff */}
                  {selectedAssignees.map((sId) => {
                    const staff = metaAssignees.find((s) => s._id === sId);
                    const details = getErpStaffDetails(staff);
                    return (
                      <div
                        key={sId}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '4px 10px 4px 6px',
                          borderRadius: '24px',
                          backgroundColor: '#f3e8ff',
                          border: '1.5px solid #d8b4fe',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        }}
                      >
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: '#7e22ce',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: 800,
                          }}
                        >
                          {details.initials}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
                            {details.name}
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '6px',
                              backgroundColor: '#ffffff',
                              color: '#7e22ce',
                              border: '1px solid #d8b4fe',
                              display: 'inline-flex',
                              alignItems: 'center',
                            }}
                          >
                            {details.designation}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleAssignee(sId)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'flex',
                            color: '#64748b',
                            borderRadius: '50%',
                          }}
                          title="Remove staff"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Category Tabs & Search Bar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                {/* Category Switcher */}
                <div style={{ display: 'flex', gap: '6px', backgroundColor: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setAssigneeCategoryTab('taskforce')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: assigneeCategoryTab === 'taskforce' ? '#ffffff' : 'transparent',
                      color: assigneeCategoryTab === 'taskforce' ? '#005bbf' : '#64748b',
                      fontWeight: assigneeCategoryTab === 'taskforce' ? 700 : 500,
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: assigneeCategoryTab === 'taskforce' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                    }}
                  >
                    <Users size={14} />
                    <span>Taskforce Field Team ({filteredTaskforceMembers.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssigneeCategoryTab('erp')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: assigneeCategoryTab === 'erp' ? '#ffffff' : 'transparent',
                      color: assigneeCategoryTab === 'erp' ? '#005bbf' : '#64748b',
                      fontWeight: assigneeCategoryTab === 'erp' ? 700 : 500,
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: assigneeCategoryTab === 'erp' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                    }}
                  >
                    <Briefcase size={14} />
                    <span>ERP Office Staff ({filteredAssignees.length})</span>
                  </button>
                </div>

                {/* Filter Department Checkbox */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={showOnlyDeptMembers}
                    onChange={(e) => setShowOnlyDeptMembers(e.target.checked)}
                    style={{ accentColor: '#005bbf', cursor: 'pointer' }}
                  />
                  <span>Show only {department} staff</span>
                </label>
              </div>

              {/* Search Bar */}
              <div style={{ position: 'relative' }}>
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                  }}
                />
                <input
                  type="text"
                  className="search-input"
                  style={{
                    width: '100%',
                    fontSize: '13px',
                    padding: '8px 12px 8px 36px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                  }}
                  placeholder="Search by name, phone, trade, or designation..."
                  value={assigneeSearch}
                  onChange={(e) => setAssigneeSearch(e.target.value)}
                />
              </div>
            </div>

            {/* INTERACTIVE TEAM MEMBER CARDS GRID */}
            <div
              style={{
                maxHeight: '320px',
                overflowY: 'auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: '10px',
                padding: '4px',
              }}
            >
              {assigneeCategoryTab === 'taskforce' ? (
                filteredTaskforceMembers.length === 0 ? (
                  <div
                    style={{
                      gridColumn: '1 / -1',
                      padding: '24px',
                      textAlign: 'center',
                      backgroundColor: '#f8fafc',
                      borderRadius: '8px',
                      color: '#64748b',
                      fontSize: '13px',
                    }}
                  >
                    No taskforce personnel found matching &quot;{assigneeSearch || department}&quot;. Uncheck &quot;Show only {department}&quot; to view all site staff.
                  </div>
                ) : (
                  [
                    {
                      title: 'Department Heads (Level 3)',
                      faIcon: 'fa-solid fa-user-tie',
                      color: '#0891b2',
                      badgeBg: '#ecfeff',
                      badgeBorder: '#a5f3fc',
                      list: filteredTaskforceMembers.filter((m) => m.hierarchyLevel === 'head'),
                    },
                    {
                      title: 'Site Supervisors (Level 2)',
                      faIcon: 'fa-solid fa-user-gear',
                      color: '#4f46e5',
                      badgeBg: '#eef2ff',
                      badgeBorder: '#c7d2fe',
                      list: filteredTaskforceMembers.filter((m) => m.hierarchyLevel === 'supervisor'),
                    },
                    {
                      title: 'Field Helpers & Technicians (Level 1)',
                      faIcon: 'fa-solid fa-person-digging',
                      color: '#2563eb',
                      badgeBg: '#eff6ff',
                      badgeBorder: '#bfdbfe',
                      list: filteredTaskforceMembers.filter((m) => m.hierarchyLevel === 'helper' || !m.hierarchyLevel),
                    },
                  ]
                    .filter((tier) => tier.list.length > 0)
                    .map((tier) => (
                      <div key={tier.title} style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '4px 2px',
                            borderBottom: '1px solid #e2e8f0',
                          }}
                        >
                          <i className={tier.faIcon} style={{ fontSize: '13px', color: tier.color }} />
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                            {tier.title}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 800,
                              padding: '1px 6px',
                              borderRadius: '8px',
                              backgroundColor: tier.badgeBg,
                              color: tier.color,
                              border: `1px solid ${tier.badgeBorder}`,
                            }}
                          >
                            {tier.list.length}
                          </span>
                        </div>

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                            gap: '10px',
                          }}
                        >
                          {tier.list.map((member) => {
                            const isSelected = selectedTaskforceMembers.includes(member._id);
                            const details = getTfMemberDetails(member);
                            const deptTheme = getDepartmentTheme(member.department || member.trade);
                            const tierTheme = getHierarchyTheme(member.hierarchyLevel);
                            const phone = member.mobileNo || member.phone;

                            return (
                              <div
                                key={member._id}
                                onClick={() => handleToggleTaskforceMember(member._id)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '10px 12px',
                                  borderRadius: '10px',
                                  backgroundColor: isSelected ? '#f0f9ff' : '#ffffff',
                                  border: isSelected ? '2px solid #005bbf' : '1px solid #e2e8f0',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                  boxShadow: isSelected ? '0 2px 8px rgba(0,91,191,0.12)' : 'none',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                  <div
                                    style={{
                                      width: '36px',
                                      height: '36px',
                                      borderRadius: '50%',
                                      backgroundColor: details.bg,
                                      color: details.color,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '12px',
                                      fontWeight: 800,
                                      flexShrink: 0,
                                    }}
                                  >
                                    {details.initials}
                                  </div>

                                  <div style={{ minWidth: 0 }}>
                                    <div
                                      style={{
                                        fontWeight: 700,
                                        fontSize: '13px',
                                        color: '#0f172a',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                      }}
                                    >
                                      {details.name}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px', flexWrap: 'wrap' }}>
                                      <span
                                        style={{
                                          fontSize: '10px',
                                          fontWeight: 700,
                                          padding: '1px 6px',
                                          borderRadius: '4px',
                                          backgroundColor: details.badgeBg,
                                          color: details.badgeColor,
                                          border: `1px solid ${details.badgeBorder}`,
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '3px',
                                        }}
                                      >
                                        <i className={tierTheme.icon} style={{ fontSize: '9px' }} />
                                        <span>{details.roleTitle}</span>
                                      </span>

                                      {(member.trade || member.department) && (
                                        <span
                                          style={{
                                            fontSize: '10px',
                                            fontWeight: 600,
                                            padding: '1px 5px',
                                            borderRadius: '4px',
                                            backgroundColor: '#f1f5f9',
                                            color: '#475569',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '3px',
                                          }}
                                        >
                                          <i className={deptTheme.icon} style={{ fontSize: '9px', color: deptTheme.color }} />
                                          <span>{member.trade || member.department}</span>
                                        </span>
                                      )}
                                    </div>
                                    {phone && (
                                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <i className="fa-solid fa-phone" style={{ fontSize: '10px', color: '#059669' }} />
                                        <span>{phone}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div
                                  style={{
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '50%',
                                    border: isSelected ? 'none' : '2px solid #cbd5e1',
                                    backgroundColor: isSelected ? '#005bbf' : 'transparent',
                                    color: '#ffffff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    marginLeft: '8px',
                                    fontSize: '11px',
                                  }}
                                >
                                  {isSelected && <i className="fa-solid fa-check" />}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                )
              ) : filteredAssignees.length === 0 ? (
                <div
                  style={{
                    gridColumn: '1 / -1',
                    padding: '24px',
                    textAlign: 'center',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    color: '#64748b',
                    fontSize: '13px',
                  }}
                >
                  No ERP staff members found matching &quot;{assigneeSearch}&quot;.
                </div>
              ) : (
                filteredAssignees.map((staff) => {
                  const isSelected = selectedAssignees.includes(staff._id);
                  const details = getErpStaffDetails(staff);
                  return (
                    <div
                      key={staff._id}
                      onClick={() => handleToggleAssignee(staff._id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        backgroundColor: isSelected ? '#faf5ff' : '#ffffff',
                        border: isSelected ? '2px solid #7e22ce' : '1px solid #e2e8f0',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 2px 8px rgba(126,34,206,0.12)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: '#f3e8ff',
                            color: '#7e22ce',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 800,
                            flexShrink: 0,
                          }}
                        >
                          {details.initials}
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: '13px',
                              color: '#0f172a',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {details.name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: '#f3e8ff',
                                color: '#7e22ce',
                                border: '1px solid #e9d5ff',
                              }}
                            >
                              {details.designation}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                            @{staff.username || 'staff'}
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          border: isSelected ? 'none' : '2px solid #cbd5e1',
                          backgroundColor: isSelected ? '#7e22ce' : 'transparent',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginLeft: '8px',
                        }}
                      >
                        {isSelected && <Check size={14} />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ================= STEP 3: TIMELINE & ACTION STEPS ================= */}
        {currentStep === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Directive Overview Summary Pill */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                  Target Directive
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                  {title || 'Untitled Directive'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    backgroundColor: '#e0f2fe',
                    color: '#0369a1',
                    textTransform: 'capitalize',
                  }}
                >
                  {department}
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    backgroundColor: '#f1f5f9',
                    color: '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <Users size={13} />
                  <span>{totalSelectedCount} Personnel</span>
                </span>
              </div>
            </div>

            {/* Target Due Date with Quick Buttons */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                  Completion Deadline / Target Date
                </label>
                {dueDate && (
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#005bbf' }}>
                    Target: {new Date(dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="date"
                  className="search-input"
                  style={{
                    fontSize: '13px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontWeight: 600,
                  }}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />

                {/* 1-Click Quick Presets */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setQuickDeadlineDays(0)}
                    style={{
                      fontSize: '12px',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#f8fafc',
                      cursor: 'pointer',
                      fontWeight: 600,
                      color: '#334155',
                    }}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDeadlineDays(1)}
                    style={{
                      fontSize: '12px',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#f8fafc',
                      cursor: 'pointer',
                      fontWeight: 600,
                      color: '#334155',
                    }}
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDeadlineDays(3)}
                    style={{
                      fontSize: '12px',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1.5px solid #005bbf',
                      backgroundColor: '#eff6ff',
                      cursor: 'pointer',
                      fontWeight: 700,
                      color: '#005bbf',
                    }}
                  >
                    +3 Days (Recommended)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDeadlineDays(7)}
                    style={{
                      fontSize: '12px',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#f8fafc',
                      cursor: 'pointer',
                      fontWeight: 600,
                      color: '#334155',
                    }}
                  >
                    +1 Week
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDeadlineDays(30)}
                    style={{
                      fontSize: '12px',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#f8fafc',
                      cursor: 'pointer',
                      fontWeight: 600,
                      color: '#334155',
                    }}
                  >
                    +1 Month
                  </button>
                </div>
              </div>
            </div>

            {/* Executive Follow-up Cadence */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                  Executive Radar & Follow-up Cadence
                </label>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  System will alert supervisors and MD dashboard at this recurring interval.
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {[
                  { value: 'daily', label: 'Daily (24h)' },
                  { value: 'alternate_days', label: 'Every 2 Days' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'none', label: 'One-off' },
                ].map((cad) => {
                  const isSelected = followUpFrequency === cad.value;
                  return (
                    <button
                      key={cad.value}
                      type="button"
                      onClick={() => handleCadenceChange(cad.value)}
                      style={{
                        padding: '9px 8px',
                        borderRadius: '8px',
                        border: isSelected ? '2px solid #005bbf' : '1px solid #e2e8f0',
                        backgroundColor: isSelected ? '#eff6ff' : '#f8fafc',
                        color: isSelected ? '#005bbf' : '#334155',
                        fontWeight: isSelected ? 800 : 600,
                        fontSize: '12px',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {cad.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Checkpoints / Steps */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                    Action Milestones & Quality Checkpoints ({checkpoints.length})
                  </label>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    Field supervisors can tick off each checkpoint as physical work progresses.
                  </div>
                </div>
              </div>

              {/* Add Checkpoint Input */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="search-input"
                  style={{
                    flex: 1,
                    fontSize: '13px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                  }}
                  placeholder="e.g., Check concealed pipe pressure for 24 hours..."
                  value={newCheckpointInput}
                  onChange={(e) => setNewCheckpointInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCheckpoint();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddCheckpoint}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#005bbf',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Plus size={16} />
                  Add Step
                </button>
              </div>

              {/* Checkpoints List */}
              {checkpoints.length === 0 ? (
                <div
                  style={{
                    padding: '14px',
                    textAlign: 'center',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px dashed #cbd5e1',
                    color: '#64748b',
                    fontSize: '12px',
                  }}
                >
                  No checkpoints added yet. Type a milestone above and click &quot;Add Step&quot; or press Enter.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                  {checkpoints.map((cp, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            backgroundColor: '#e2e8f0',
                            color: '#475569',
                            fontSize: '11px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {idx + 1}
                        </span>
                        <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: 500 }}>
                          {cp.title}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveCheckpoint(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          borderRadius: '4px',
                        }}
                        title="Remove checkpoint"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= MODAL FOOTER STEP NAVIGATION ================= */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid #e2e8f0',
            paddingTop: '14px',
            marginTop: '8px',
          }}
        >
          {/* Left Action: Back or Cancel */}
          {currentStep > 1 ? (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setCurrentStep((prev) => prev - 1)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              <ArrowLeft size={16} />
              Back to {currentStep === 2 ? 'Task & Trade' : 'Assign Team'}
            </button>
          ) : (
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
              style={{ padding: '9px 18px', fontSize: '13px' }}
            >
              Cancel
            </button>
          )}

          {/* Right Actions */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {/* Step 1 Next Button */}
            {currentStep === 1 && (
              <button
                type="button"
                className="btn-primary"
                onClick={handleGoToStep2}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 22px',
                  fontSize: '13px',
                  backgroundColor: '#005bbf',
                  fontWeight: 700,
                }}
              >
                <span>Next: Assign Team</span>
                <ArrowRight size={16} />
              </button>
            )}

            {/* Step 2 Next & Quick Dispatch Buttons */}
            {currentStep === 2 && (
              <>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || totalSelectedCount === 0 || !title.trim()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '9px 16px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    border: '1.5px solid #22c55e',
                    backgroundColor: '#f0fdf4',
                    color: '#16a34a',
                    fontWeight: 700,
                    cursor: totalSelectedCount === 0 || !title.trim() ? 'not-allowed' : 'pointer',
                    opacity: totalSelectedCount === 0 || !title.trim() ? 0.6 : 1,
                  }}
                  title="Dispatch directive immediately without extra checkpoints"
                >
                  <Zap size={15} />
                  Quick Dispatch
                </button>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleGoToStep3}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 22px',
                    fontSize: '13px',
                    backgroundColor: '#005bbf',
                    fontWeight: 700,
                  }}
                >
                  <span>Next: Timeline & Steps</span>
                  <ArrowRight size={16} />
                </button>
              </>
            )}

            {/* Step 3 Final Dispatch Button */}
            {currentStep === 3 && (
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 26px',
                  fontSize: '13px',
                  backgroundColor: isMDDirective ? '#ca8a04' : '#005bbf',
                  fontWeight: 800,
                  boxShadow: isMDDirective
                    ? '0 2px 8px rgba(202, 138, 4, 0.3)'
                    : '0 2px 8px rgba(0, 91, 191, 0.25)',
                }}
              >
                {loading ? (
                  'Allocating Directive...'
                ) : (
                  <>
                    <CheckCircle2 size={17} />
                    {initialData ? 'Save Changes' : 'Dispatch Task Directive'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
};
