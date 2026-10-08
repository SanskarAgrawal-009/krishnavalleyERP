import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal.jsx';
import { taskService } from '../../services/taskService.js';
import { useToast } from '../../context/ToastContext.jsx';
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
  ListTodo,
  Layers,
  Shield,
  Briefcase,
  HelpCircle,
  CheckSquare
} from 'lucide-react';

const DEPARTMENT_PRESETS = {
  civil: [
    {
      title: 'Tower A - Final Snagging Inspection & Balcony Waterproofing',
      checkpoints: [
        'Inspect joint sealant & waterproofing in balcony area',
        'Verify electrical main switchboard & MCB trip test',
        'Check tile grouting, hollow sound test, and plumbing drain flow',
        'Record final photographic evidence and obtain site engineer sign-off',
      ],
    },
    {
      title: 'Site Concreting & Structural Curing Audit',
      checkpoints: [
        'Check concrete cube test compressive strength reports',
        'Ensure continuous 14-day water ponding curing on roof slab',
        'Inspect formwork deshutting safety clearances',
      ],
    },
  ],
  crm: [
    {
      title: 'Milestone Demand Notices Dispatch & High-Value Follow-ups',
      checkpoints: [
        'Extract list of enrolled buyers with pending slab demands',
        'Verify ledger balances with Accounts team',
        'Dispatch formal demand notices via WhatsApp & Speed Post',
        'Log phone call responses from all prioritized customers',
      ],
    },
    {
      title: 'Allotment Agreement Signatures & Buyer KYC Verification',
      checkpoints: [
        'Draft tripartite allotment agreement copy',
        'Collect buyer KYC, PAN, and passport size photographs',
        'Schedule sub-registrar appointment with legal counsel',
      ],
    },
  ],
  accounts: [
    {
      title: 'Sub-Contractor Billing & Vendor Reconciliation',
      checkpoints: [
        'Cross-check store Goods Receipt Notes (GRN) with vendor tax invoice',
        'Audit GST compliance & TDS deductions',
        'Seek MD approval for net RTGS disbursement',
      ],
    },
  ],
  maintenance: [
    {
      title: 'Apartment Snags & Plumbing Pressure Investigation',
      checkpoints: [
        'Inspect bathroom pressure pump & concealed pipe joints for seepages',
        'Replace faulty drainage trap or washers if required',
        'Obtain written satisfaction certificate from flat resident',
      ],
    },
    {
      title: 'Elevator & Common Area Power Backup Preventive AMC',
      checkpoints: [
        'Inspect elevator brake shoe, emergency alarm & ARD battery',
        'Check diesel generator fuel levels and radiator coolant',
        'Service common staircase illumination lights',
      ],
    },
  ],
  hr: [
    {
      title: 'Monthly Biometric Attendance Audit & Payroll Processing',
      checkpoints: [
        'Reconcile site muster roll with biometric punch data',
        'Calculate overtime, site allowances, and leaves',
        'Prepare bank salary disbursement file for approval',
      ],
    },
  ],
  it: [
    {
      title: 'ERP Server Backup, Network Security & Biometric Machine Check',
      checkpoints: [
        'Perform incremental database snapshot and offsite sync',
        'Check site CCTV DVR live feed status across all towers',
        'Test site biometric punch terminal internet connectivity',
      ],
    },
  ],
  procurement: [
    {
      title: 'Bulk Material Purchase Order & Steel/Cement Rate Quotations',
      checkpoints: [
        'Collect 3 competitive vendor quotations for Grade 53 cement',
        'Prepare comparative cost analysis sheet',
        'Generate purchase order (PO) with staggered site delivery dates',
      ],
    },
  ],
  security: [
    {
      title: 'Perimeter Security Inspection & Night Guard Patrolling Audit',
      checkpoints: [
        'Inspect main entry gate barrier and RFID vehicle scanner',
        'Verify night guard checkpoint biometric logs',
        'Audit visitor register & vendor gate passes',
      ],
    },
  ],
  hotel: [
    {
      title: 'Guest Rooms Quality Audit & Housekeeping Readiness',
      checkpoints: [
        'Inspect air conditioning temperature & HVAC duct cleanliness',
        'Check linen replenishment, minibar, and bathroom amenities',
        'Verify electronic door lock batteries & keycard encoding',
      ],
    },
  ],
  hotel_restaurant: [
    {
      title: 'Restaurant F&B Stock Inventory & Kitchen Hygiene Audit',
      checkpoints: [
        'Audit dry pantry items, dairy, and fresh produce stock expiry',
        'Inspect kitchen cold room temperature logs',
        'Conduct deep cleaning sanitation audit of cook stations',
      ],
    },
  ],
  admin_operations: [
    {
      title: 'Estate Operations & Common Utility Bill Clearing',
      checkpoints: [
        'Verify monthly electricity substation DISCOM bill calculation',
        'Inspect water filtration plant backwash and TDS levels',
        'Audit common area housekeeping staff attendance & consumables',
      ],
    },
  ],
  licensing: [
    {
      title: 'UPRERA Portal Compliance & Fire Safety NOC Renewal',
      checkpoints: [
        'Update quarterly construction progress on UPRERA website',
        'Submit chartered engineer financial escrow audit certificate',
        'Schedule Fire Department inspection for NOC renewal',
      ],
    },
  ],
  viramah: [
    {
      title: 'Viramah Luxury Villas Maintenance & Landscape Inspection',
      checkpoints: [
        'Inspect private pool filtration and chemical dosing',
        'Audit landscaped garden sprinkler timing & horticulture pruning',
        'Check villa exterior lighting & architectural facade illumination',
      ],
    },
  ],
};

const COMMON_TOWERS = ['Tower A', 'Tower B', 'Tower C', 'Tower D', 'Clubhouse / Commercial'];

export const NewTaskModal = ({ isOpen, onClose, onTaskCreated, initialData = null }) => {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [metaAssignees, setMetaAssignees] = useState([]);
  const [metaTaskforceMembers, setMetaTaskforceMembers] = useState([]);
  const [metaDepartments, setMetaDepartments] = useState([]);
  const [metaProjects, setMetaProjects] = useState([]);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('civil');
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

  // Load assignees and department metadata
  useEffect(() => {
    if (isOpen) {
      loadMeta();
      if (initialData) {
        setTitle(initialData.title || '');
        setDescription(initialData.description || '');
        setDepartment(initialData.department || 'civil');
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
        setDepartment('civil');
        setPriority('high');
        setIsMDDirective(true);
        setIsApartmentRelated(false);
        setSelectedProjectId('');
        setTower('');
        setFlatNumber('');
        setSelectedAssignees([]);
        setSelectedTaskforceMembers([]);
        setStartDate(new Date().toISOString().split('T')[0]);
        // Set deadline to 3 days ahead as default
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

  const loadMeta = async () => {
    try {
      setLoadingMeta(true);
      const res = await taskService.getAssigneesMeta();
      if (res && res.success) {
        setMetaAssignees(res.assignees || []);
        setMetaTaskforceMembers(res.taskforceMembers || []);
        setMetaDepartments(res.departments || []);
        setMetaProjects(res.projects || []);
        if (res.projects?.length > 0 && !selectedProjectId) {
          setSelectedProjectId(res.projects[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to load task metadata', err);
    } finally {
      setLoadingMeta(false);
    }
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
    return metaTaskforceMembers.filter((m) => {
      const name = (m.fullName || '').toLowerCase();
      const trade = (m.trade || '').toLowerCase();
      const role = (m.role || '').toLowerCase();
      const s = assigneeSearch.toLowerCase();
      return !s || name.includes(s) || trade.includes(s) || role.includes(s);
    });
  }, [metaTaskforceMembers, assigneeSearch]);

  const handleSelectAllFiltered = () => {
    const ids = filteredAssignees.map((a) => a._id);
    const combined = Array.from(new Set([...selectedAssignees, ...ids]));
    setSelectedAssignees(combined);
  };

  const handleClearSelection = () => {
    setSelectedAssignees([]);
    setSelectedTaskforceMembers([]);
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
    e.preventDefault();
    if (!title.trim()) {
      showToast('Please provide a task title or work description', 'error');
      return;
    }

    if (selectedAssignees.length === 0 && selectedTaskforceMembers.length === 0) {
      showToast('Please allocate this task to at least one team member or taskforce staff', 'error');
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Task Directive' : 'Assign New Task Directive'}
      maxWidth="880px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
        {/* TOP: MD Directive Banner */}
        <div
          style={{
            padding: '14px 18px',
            borderRadius: '12px',
            backgroundColor: isMDDirective ? '#fefce8' : '#f8fafc',
            border: isMDDirective ? '1.5px solid #ca8a04' : '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: isMDDirective ? '0 3px 12px rgba(202, 138, 4, 0.12)' : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: isMDDirective ? '#ca8a04' : '#64748b',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isMDDirective ? '0 2px 8px rgba(202, 138, 4, 0.3)' : 'none',
                flexShrink: 0,
              }}
            >
              <Sparkles size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
                Managing Director (MD) Executive Directive
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                Tags this assignment with top executive priority, elevated follow-up radar, and daily MD tracking.
              </div>
            </div>
          </div>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              gap: '8px',
              backgroundColor: isMDDirective ? '#fef08a' : '#ffffff',
              padding: '6px 12px',
              borderRadius: '20px',
              border: isMDDirective ? '1px solid #ca8a04' : '1px solid #cbd5e1',
            }}
          >
            <input
              type="checkbox"
              checked={isMDDirective}
              onChange={(e) => setIsMDDirective(e.target.checked)}
              style={{ width: '17px', height: '17px', accentColor: '#ca8a04', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '12px', fontWeight: 700, color: isMDDirective ? '#854d0e' : '#475569' }}>
              {isMDDirective ? 'MD DIRECTIVE ACTIVE' : 'Standard Work'}
            </span>
          </label>
        </div>

        {/* SECTION 1: Task Title & Department Presets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
              Task Title / Action Item <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              Click preset below to auto-fill title & checklist
            </span>
          </div>

          <input
            type="text"
            className="search-input"
            style={{ width: '100%', height: '44px', fontSize: '14px', fontWeight: 500 }}
            placeholder="e.g. Tower A - Complete Flat 402 Final Snagging & Handover Inspection"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          {/* Quick Department Presets */}
          {DEPARTMENT_PRESETS[department] && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                Suggested Templates:
              </span>
              {DEPARTMENT_PRESETS[department].map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  style={{
                    padding: '3px 10px',
                    borderRadius: '14px',
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    fontSize: '11px',
                    color: '#0f172a',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e2e8f0')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                >
                  + {preset.title.slice(0, 38)}...
                </button>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 2: Department & Priority Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Target Department <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              className="search-input"
              style={{ width: '100%', height: '42px', fontSize: '13px', fontWeight: 500 }}
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value);
                setAssigneeDeptFilter(e.target.value);
              }}
            >
              {metaDepartments.map((dept) => (
                <option key={dept.key} value={dept.key}>
                  {dept.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Priority Level <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              className="search-input"
              style={{ width: '100%', height: '42px', fontSize: '13px', fontWeight: 600 }}
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="urgent">Urgent (Immediate Escalation & Daily Check)</option>
              <option value="high">High Priority (Elevated Attention)</option>
              <option value="medium">Medium Priority (Standard Timeline)</option>
              <option value="low">Low Priority (Routine Backlog)</option>
            </select>
          </div>
        </div>

        {/* SECTION 3: Multiple Assignee Allocation (Enhanced & Responsive) */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Header Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  backgroundColor: '#eff6ff',
                  color: '#005bbf',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Users size={16} />
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                Allocate Personnel (Multiple Assignees) <span style={{ color: '#ef4444' }}>*</span>
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#005bbf',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Select All Filtered
              </button>
              {selectedAssignees.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#dc2626',
                    cursor: 'pointer',
                  }}
                >
                  Clear ({selectedAssignees.length})
                </button>
              )}
            </div>
          </div>

          {/* Selected Personnel Chips Row */}
          {(selectedTaskforceMembers.length > 0 || selectedAssignees.length > 0) ? (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                padding: '10px 12px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              {/* Taskforce Members Chips */}
              {selectedTaskforceMembers.map((mId) => {
                const member = metaTaskforceMembers.find((m) => m._id === mId);
                if (!member) return null;
                const tierColor =
                  member.hierarchyLevel === 'head'
                    ? { bg: '#fef3c7', text: '#92400e', border: '#fde68a', icon: '👑' }
                    : member.hierarchyLevel === 'supervisor'
                    ? { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', icon: '🛡️' }
                    : { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1', icon: '👷' };
                return (
                  <div
                    key={mId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      backgroundColor: tierColor.bg,
                      border: `1.5px solid ${tierColor.border}`,
                      fontSize: '12px',
                      fontWeight: 600,
                      color: tierColor.text,
                    }}
                  >
                    <span>{tierColor.icon}</span>
                    <span>{member.fullName}</span>
                    <span style={{ fontSize: '10px', opacity: 0.8 }}>({member.trade || member.hierarchyLevel})</span>
                    <button
                      type="button"
                      onClick={() => handleToggleTaskforceMember(mId)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: tierColor.text,
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                );
              })}

              {/* ERP User Chips */}
              {selectedAssignees.map((userId) => {
                const user = metaAssignees.find((u) => u._id === userId);
                if (!user) return null;
                const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
                return (
                  <div
                    key={userId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      backgroundColor: '#eff6ff',
                      border: '1.5px solid #93c5fd',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#1d4ed8',
                    }}
                  >
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#1d4ed8',
                        color: '#ffffff',
                        fontSize: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {initials}
                    </div>
                    <span>{user.firstName} {user.lastName}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleAssignee(userId)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#1d4ed8',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
              No team members allocated yet. Select assignees from the Taskforce Team or ERP Staff below.
            </div>
          )}

          {/* Category Switcher Tabs */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', paddingBottom: '2px' }}>
            <button
              type="button"
              onClick={() => setAssigneeCategoryTab('taskforce')}
              style={{
                padding: '6px 14px',
                border: 'none',
                background: 'none',
                fontWeight: 700,
                fontSize: '12px',
                color: assigneeCategoryTab === 'taskforce' ? '#005bbf' : '#64748b',
                borderBottom: assigneeCategoryTab === 'taskforce' ? '2px solid #005bbf' : '2px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>👷 Taskforce Field Team ({metaTaskforceMembers.length})</span>
              {selectedTaskforceMembers.length > 0 && (
                <span style={{ backgroundColor: '#005bbf', color: '#fff', borderRadius: '10px', padding: '1px 6px', fontSize: '10px' }}>
                  {selectedTaskforceMembers.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setAssigneeCategoryTab('erp')}
              style={{
                padding: '6px 14px',
                border: 'none',
                background: 'none',
                fontWeight: 700,
                fontSize: '12px',
                color: assigneeCategoryTab === 'erp' ? '#005bbf' : '#64748b',
                borderBottom: assigneeCategoryTab === 'erp' ? '2px solid #005bbf' : '2px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>🏢 ERP Department Staff ({metaAssignees.length})</span>
              {selectedAssignees.length > 0 && (
                <span style={{ backgroundColor: '#005bbf', color: '#fff', borderRadius: '10px', padding: '1px 6px', fontSize: '10px' }}>
                  {selectedAssignees.length}
                </span>
              )}
            </button>
          </div>

          {/* Search Toolbar */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
              <Search size={14} color="#64748b" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              <input
                type="text"
                placeholder={assigneeCategoryTab === 'taskforce' ? 'Search taskforce by name, trade or role...' : 'Search staff by name or role...'}
                value={assigneeSearch}
                onChange={(e) => setAssigneeSearch(e.target.value)}
                style={{
                  width: '100%',
                  height: '34px',
                  paddingLeft: '32px',
                  paddingRight: '12px',
                  borderRadius: '6px',
                  border: '1px solid #dadce0',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
            </div>

            {assigneeCategoryTab === 'erp' && (
              <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px' }}>
                {[
                  { key: 'all', label: 'All Staff' },
                  { key: 'civil', label: 'Civil' },
                  { key: 'crm', label: 'C.R.M.' },
                  { key: 'accounts', label: 'Accounts' },
                  { key: 'hr', label: 'HR' },
                  { key: 'it', label: 'I.T.' },
                  { key: 'procurement', label: 'Procurement' },
                  { key: 'security', label: 'Security' },
                  { key: 'hotel', label: 'Hotel' },
                  { key: 'hotel_restaurant', label: 'Hotel & Rest.' },
                  { key: 'admin_operations', label: 'Admin / Ops' },
                  { key: 'maintenance', label: 'Maintenance' },
                  { key: 'licensing', label: 'Licensing' },
                  { key: 'viramah', label: 'Viramah' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setAssigneeDeptFilter(tab.key)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      border: 'none',
                      backgroundColor: assigneeDeptFilter === tab.key ? '#005bbf' : '#f1f5f9',
                      color: assigneeDeptFilter === tab.key ? '#ffffff' : '#475569',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* TAB 1: TASKFORCE FIELD TEAM MEMBERS */}
          {assigneeCategoryTab === 'taskforce' && (
            <div
              style={{
                maxHeight: '220px',
                overflowY: 'auto',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '8px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: '8px',
                backgroundColor: '#fafbfc',
              }}
            >
              {loadingMeta ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                  Loading taskforce members...
                </div>
              ) : filteredTaskforceMembers.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '12px', gridColumn: '1 / -1' }}>
                  No taskforce members found. Add team members in the "Team & Hierarchy" tab of the Task Force Manager.
                </div>
              ) : (
                filteredTaskforceMembers.map((member) => {
                  const isSelected = selectedTaskforceMembers.includes(member._id);
                  const tierBadge =
                    member.hierarchyLevel === 'head'
                      ? { label: '👑 HEAD', bg: '#fef3c7', color: '#92400e' }
                      : member.hierarchyLevel === 'supervisor'
                      ? { label: '🛡️ SUPERVISOR', bg: '#eff6ff', color: '#1d4ed8' }
                      : { label: '👷 HELPER', bg: '#f1f5f9', color: '#334155' };

                  return (
                    <div
                      key={member._id}
                      onClick={() => handleToggleTaskforceMember(member._id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: isSelected ? '1.5px solid #005bbf' : '1px solid #e2e8f0',
                        backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                        boxShadow: isSelected ? '0 2px 6px rgba(0, 91, 191, 0.1)' : '0 1px 2px rgba(0,0,0,0.03)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        style={{ cursor: 'pointer', accentColor: '#005bbf', width: '16px', height: '16px', flexShrink: 0 }}
                      />

                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: tierBadge.bg,
                          color: tierBadge.color,
                          fontSize: '12px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {member.fullName?.charAt(0) || 'M'}
                      </div>

                      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              fontSize: '13px',
                              fontWeight: 700,
                              color: '#0f172a',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {member.fullName}
                          </span>
                          <span
                            style={{
                              fontSize: '9px',
                              fontWeight: 700,
                              padding: '1px 5px',
                              borderRadius: '4px',
                              backgroundColor: tierBadge.bg,
                              color: tierBadge.color,
                              flexShrink: 0,
                            }}
                          >
                            {tierBadge.label}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: '#64748b',
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {member.trade || member.role || 'Field Personnel'}
                          {member.supervisorId?.fullName && ` • Reports to: ${member.supervisorId.fullName}`}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: GENERAL ERP STAFF */}
          {assigneeCategoryTab === 'erp' && (
            <div
              style={{
                maxHeight: '190px',
                overflowY: 'auto',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '8px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: '8px',
                backgroundColor: '#fafbfc',
              }}
            >
              {loadingMeta ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                  Loading staff members...
                </div>
              ) : filteredAssignees.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                  No personnel found matching your filter.
                </div>
              ) : (
                filteredAssignees.map((user) => {
                  const isSelected = selectedAssignees.includes(user._id);
                  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();

                  return (
                    <div
                      key={user._id}
                      onClick={() => handleToggleAssignee(user._id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: isSelected ? '1.5px solid #005bbf' : '1px solid #e2e8f0',
                        backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                        boxShadow: isSelected ? '0 2px 6px rgba(0, 91, 191, 0.1)' : '0 1px 2px rgba(0,0,0,0.03)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        style={{ cursor: 'pointer', accentColor: '#005bbf', width: '16px', height: '16px', flexShrink: 0 }}
                      />

                      {/* Colored Avatar */}
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: isSelected ? '#005bbf' : '#64748b',
                          color: '#ffffff',
                          fontSize: '11px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {initials}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: 700,
                            color: '#0f172a',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {user.firstName} {user.lastName}
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: isSelected ? '#005bbf' : '#64748b',
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {user.roleId?.roleName || user.username}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* SECTION 4: Apartment / Flat / Property Context (Optional) */}
        <div
          style={{
            padding: '14px 16px',
            borderRadius: '10px',
            backgroundColor: isApartmentRelated ? '#f0f9ff' : '#ffffff',
            border: isApartmentRelated ? '1.5px solid #bae6fd' : '1px solid #e2e8f0',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
              <Building2 size={18} color={isApartmentRelated ? '#0284c7' : '#64748b'} />
              Is this work tied to a specific Apartment / Flat / Tower?
            </label>
            <input
              type="checkbox"
              checked={isApartmentRelated}
              onChange={(e) => setIsApartmentRelated(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: '#005bbf', cursor: 'pointer' }}
            />
          </div>

          {isApartmentRelated && (
            <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Project & Flat Number Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Select Project Site
                  </label>
                  <select
                    className="search-input"
                    style={{ width: '100%', height: '38px', fontSize: '12px' }}
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                  >
                    {metaProjects.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.projectName} ({p.projectCode || 'Site'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Flat / Unit Number
                  </label>
                  <input
                    type="text"
                    className="search-input"
                    style={{ width: '100%', height: '38px', fontSize: '12px' }}
                    placeholder="e.g. Flat 402, 3BHK"
                    value={flatNumber}
                    onChange={(e) => setFlatNumber(e.target.value)}
                  />
                </div>
              </div>

              {/* Quick Tower Selector Pills */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Tower / Building
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {COMMON_TOWERS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTower(t)}
                      style={{
                        padding: '4px 12px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        border: tower === t ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                        backgroundColor: tower === t ? '#e0f2fe' : '#ffffff',
                        color: tower === t ? '#0369a1' : '#334155',
                        cursor: 'pointer',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                  <input
                    type="text"
                    placeholder="Or enter tower..."
                    value={tower}
                    onChange={(e) => setTower(e.target.value)}
                    style={{
                      height: '30px',
                      padding: '0 8px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '11px',
                      width: '130px',
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 5: Schedule & Follow-up Cadence (Responsive Grid) */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} color="#ca8a04" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
              Schedule & Systematic Follow-up Tracking
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Start Date
              </label>
              <input
                type="date"
                className="search-input"
                style={{ width: '100%', height: '38px', fontSize: '12px' }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                  Target Deadline
                </label>
              </div>
              <input
                type="date"
                className="search-input"
                style={{ width: '100%', height: '38px', fontSize: '12px' }}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
              {/* Quick Presets */}
              <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                {[
                  { label: '+1D', days: 1 },
                  { label: '+3D', days: 3 },
                  { label: '+1W', days: 7 },
                  { label: '+1M', days: 30 },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setQuickDeadlineDays(item.days)}
                    style={{
                      padding: '2px 6px',
                      fontSize: '10px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#f8fafc',
                      color: '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Follow-up Cadence
              </label>
              <select
                className="search-input"
                style={{ width: '100%', height: '38px', fontSize: '12px' }}
                value={followUpFrequency}
                onChange={(e) => handleCadenceChange(e.target.value)}
              >
                <option value="daily">Daily Follow-up (Every 24h)</option>
                <option value="alternate_days">Alternate Days (Every 48h)</option>
                <option value="weekly">Weekly Check-in</option>
                <option value="once">One-off Final Review</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#ca8a04', marginBottom: '4px' }}>
                Next Follow-Up Due
              </label>
              <input
                type="date"
                className="search-input"
                style={{ width: '100%', height: '38px', fontSize: '12px', borderColor: '#ca8a04', backgroundColor: '#fefce8' }}
                value={nextFollowUpDate}
                onChange={(e) => setNextFollowUpDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* SECTION 6: Action Checkpoints / Subtasks (NEW & HIGHLY DETAILED) */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ListTodo size={18} color="#005bbf" />
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                Action Checkpoints & Sub-deliverables ({checkpoints.length})
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              Assignees can check off each milestone as they progress
            </span>
          </div>

          {/* Add Checkpoint Input */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              className="search-input"
              style={{ flex: 1, height: '38px', fontSize: '13px' }}
              placeholder="e.g. 1. Inspect water joint, 2. Run leak test, 3. Upload photo sign-off..."
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
              className="btn-secondary"
              onClick={handleAddCheckpoint}
              style={{
                padding: '0 16px',
                height: '38px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Plus size={14} /> Add Step
            </button>
          </div>

          {/* Checkpoint list */}
          {checkpoints.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
              {checkpoints.map((cp, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#1e293b' }}>
                    <span
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#e2e8f0',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#475569',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {idx + 1}
                    </span>
                    <span>{cp.title}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveCheckpoint(idx)}
                    style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '2px' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 7: Scope of Work / MD Instructions */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
            Detailed Scope of Work & Guidelines
          </label>
          <textarea
            className="search-input"
            rows={3}
            style={{ width: '100%', height: '80px', fontSize: '13px', padding: '10px', lineHeight: '1.5' }}
            placeholder="Specify work details, material requirements, contractor coordination notes, or escalation rules..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Modal Footer Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            borderTop: '1px solid #edeef0',
            paddingTop: '16px',
          }}
        >
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={loading}
            style={{ padding: '9px 20px', fontSize: '13px' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{
              padding: '9px 26px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: isMDDirective ? '#ca8a04' : '#005bbf',
            }}
          >
            {loading ? (
              'Allocating...'
            ) : (
              <>
                <CheckCircle2 size={16} />
                {initialData ? 'Save Changes' : 'Dispatch Directive'}
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
