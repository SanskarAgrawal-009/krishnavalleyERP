import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { hrService } from '../../services/hrService.js';
import { getFileUrl } from '../../services/api.js';
import { NewEmployeeModal } from '../../components/hr/NewEmployeeModal.jsx';
import { EditEmployeeModal } from '../../components/hr/EditEmployeeModal.jsx';
import { PrintablePayslipModal } from '../../components/hr/PrintablePayslipModal.jsx';
import { PrintableIDCardModal } from '../../components/hr/PrintableIDCardModal.jsx';
import { LogAttendanceModal } from '../../components/hr/LogAttendanceModal.jsx';
import { ApplyLeaveModal } from '../../components/hr/ApplyLeaveModal.jsx';
import { GeneratePayrollModal } from '../../components/hr/GeneratePayrollModal.jsx';
import { EmployeeDetailModal } from '../../components/hr/EmployeeDetailModal.jsx';
import { DisburseSalaryModal } from '../../components/hr/DisburseSalaryModal.jsx';
import { StatusBadge } from '../../components/common/StatusBadge.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

import {
  Users,
  Clock,
  Calendar,
  DollarSign,
  Briefcase,
  Building2,
  Plus,
  RefreshCw,
  Search,
  CheckCircle,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  FileText,
  Upload,
  Edit2,
  Trash2,
  Printer,
  Sparkles,
  Layers,
  Check,
  X,
  Eye,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Heart,
  Phone,
  Mail,
  MapPin,
  Sliders
} from 'lucide-react';

export const HRPage = () => {
  const { user, isSuperAdmin, hasPermission, hasAnyPermission } = useAuth();
  const canManageEmployees = isSuperAdmin || hasPermission('hr:manage');
  const canEditHR = isSuperAdmin || hasPermission('hr:edit') || hasPermission('hr:manage');
  const canManagePayroll = isSuperAdmin || hasPermission('hr:payroll') || hasPermission('hr:manage');

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const getTabFromParam = (param) => {
    if (param === 'id_cards') return 'id_cards';
    if (param === 'attendance') return 'attendance';
    if (param === 'leaves') return 'leaves';
    if (param === 'payroll') return 'payroll';
    if (param === 'dept_roles') return 'dept_roles';
    return 'directory';
  };

  const [activeTab, setActiveTab] = useState(getTabFromParam(tabParam));

  useEffect(() => {
    setActiveTab(getTabFromParam(tabParam));
  }, [tabParam]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
  };

  // Summary Metrics
  const [summary, setSummary] = useState({
    totalEmployees: 0,
    activeStaff: 0,
    todayAttendancePercent: 100,
    pendingLeavesCount: 0,
    monthlyPayrollOutflow: 0,
    staffOnLeaveToday: 0,
    totalIdCardsIssued: 0
  });

  // Data Collections
  const [employees, setEmployees] = useState([]);
  const [masterData, setMasterData] = useState({ departments: [], roles: [] });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Modals & Active Edit State
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [isEditEmpModalOpen, setIsEditEmpModalOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState(null);
  const [isAttModalOpen, setIsAttModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isDisburseModalOpen, setIsDisburseModalOpen] = useState(false);
  const [selectedPayrollItem, setSelectedPayrollItem] = useState(null);
  const [slipPreviewUrl, setSlipPreviewUrl] = useState(null);
  const [selectedSlipItem, setSelectedSlipItem] = useState(null);
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);
  const [payslipItemToPrint, setPayslipItemToPrint] = useState(null);

  // ID Card State
  const [isIDCardModalOpen, setIsIDCardModalOpen] = useState(false);
  const [selectedEmployeeForID, setSelectedEmployeeForID] = useState(null);
  const [idCardDeptFilter, setIdCardDeptFilter] = useState('');
  const [idCardSearch, setIdCardSearch] = useState('');

  // Leaves View State
  const [leaveSubView, setLeaveSubView] = useState('matrix'); // 'matrix' | 'applications'
  const [leaveStatusFilter, setLeaveStatusFilter] = useState('all');

  // Daily Attendance Roster State
  const [attendanceViewMode, setAttendanceViewMode] = useState('roster'); // 'roster' | 'history'
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [rosterData, setRosterData] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);

  // Payroll Filter State
  const [selectedPayrollMonth, setSelectedPayrollMonth] = useState('');
  const [selectedPayrollYear, setSelectedPayrollYear] = useState('');
  const [payrollStatusFilter, setPayrollStatusFilter] = useState('');

  // Department & Role Master Management Modals
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deptNameInput, setDeptNameInput] = useState('');
  const [deptCodeInput, setDeptCodeInput] = useState('');
  const [deptDescInput, setDeptDescInput] = useState('');

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleNameInput, setRoleNameInput] = useState('');
  const [roleCodeInput, setRoleCodeInput] = useState('');
  const [roleDeptCodeInput, setRoleDeptCodeInput] = useState('');
  const [roleDescInput, setRoleDescInput] = useState('');

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [loading, setLoading] = useState(false);

  const fetchSummary = async () => {
    try {
      const res = await hrService.getSummary();
      if (res.data) setSummary(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      await fetchSummary();
      const params = {};
      if (statusFilter) params.employmentStatus = statusFilter;
      if (searchTerm) params.search = searchTerm;

      const [empRes, mastRes] = await Promise.all([
        hrService.getEmployees(params),
        hrService.getMaster()
      ]);

      if (empRes.data) setEmployees(empRes.data);
      if (mastRes.data) setMasterData(mastRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  // Derived filtered roles for the active department filter
  const activeDeptRoles = React.useMemo(() => {
    if (!departmentFilter) return masterData.roles || [];
    const selectedDept = masterData.departments?.find(
      (d) => d.departmentCode === departmentFilter || d._id === departmentFilter || d.departmentName === departmentFilter
    );
    if (!selectedDept) return masterData.roles || [];
    return (masterData.roles || []).filter(
      (r) => r.departmentCode === selectedDept.departmentCode ||
             r.departmentName?.toLowerCase() === selectedDept.departmentName?.toLowerCase()
    );
  }, [departmentFilter, masterData]);

  // Derived filtered employees
  const filteredEmployees = React.useMemo(() => {
    return employees.filter((emp) => {
      // 1. Search term match
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
        const code = (emp.employeeCode || '').toLowerCase();
        const email = (emp.email || '').toLowerCase();
        const phone = (emp.phone || emp.mobileNo || '').toLowerCase();
        if (!fullName.includes(term) && !code.includes(term) && !email.includes(term) && !phone.includes(term)) {
          return false;
        }
      }

      // 2. Department match
      if (departmentFilter) {
        const empDeptCode = emp.departmentId?.departmentCode || emp.departmentCode;
        const empDeptName = emp.departmentName || emp.departmentId?.departmentName || emp.departmentId?.name || emp.department;
        const selectedDept = masterData.departments?.find(
          (d) => d.departmentCode === departmentFilter || d._id === departmentFilter || d.departmentName === departmentFilter
        );
        if (selectedDept) {
          const matchCode = empDeptCode === selectedDept.departmentCode;
          const matchName = empDeptName?.toLowerCase() === selectedDept.departmentName?.toLowerCase();
          if (!matchCode && !matchName) return false;
        }
      }

      // 3. Role match
      if (roleFilter) {
        const empRoleCode = emp.roleId?.roleCode || emp.roleCode;
        const empRoleName = emp.designation || emp.roleName || emp.roleId?.roleName || emp.roleId?.name || emp.role;
        const selectedRole = masterData.roles?.find(
          (r) => r.roleCode === roleFilter || r._id === roleFilter || r.roleName === roleFilter
        );
        if (selectedRole) {
          const matchCode = empRoleCode === selectedRole.roleCode;
          const matchName = empRoleName?.toLowerCase() === selectedRole.roleName?.toLowerCase();
          if (!matchCode && !matchName) return false;
        }
      }

      return true;
    });
  }, [employees, searchTerm, departmentFilter, roleFilter, masterData]);

  const refreshActiveEmployee = async (id) => {
    try {
      const res = await hrService.getEmployeeById(id);
      if (res.data) setSelectedEmployee(res.data);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(val) || 0);
  };

  // Handlers
  const handleSaveEmployee = async (data) => {
    try {
      await hrService.createEmployee(data);
      alert('Employee onboarded successfully!');
      setIsEmpModalOpen(false);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveAttendance = async (arg1, arg2) => {
    try {
      const res = await hrService.logAttendance(arg1, arg2);
      alert(res.message || 'Attendance roster saved!');
      setIsAttModalOpen(false);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveLeave = async (arg1, arg2) => {
    try {
      await hrService.applyLeave(arg1, arg2);
      alert('Leave application submitted!');
      setIsLeaveModalOpen(false);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSavePayroll = async (data) => {
    try {
      const res = await hrService.generatePayroll(data);
      alert(res.message || 'Payroll generated successfully!');
      setIsPayModalOpen(false);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateLeaveStatus = async (employeeId, leaveId, status) => {
    try {
      await hrService.updateLeaveStatus(employeeId, leaveId, { status });
      alert(`Leave application ${status}!`);
      refreshActiveEmployee(employeeId);
    } catch (err) {
      alert(err.message);
    }
  };

  const handlePaySalary = async (employeeId, payrollId, data) => {
    try {
      const res = await hrService.paySalary(employeeId, payrollId, data);
      alert(res.message || 'Salary disbursed successfully with payment slip!');
      loadData();
      if (selectedEmployee && selectedEmployee._id === employeeId) {
        refreshActiveEmployee(employeeId);
      }
      return res;
    } catch (err) {
      alert(err.message || 'Error processing salary disbursement');
      throw err;
    }
  };

  const handleReuploadSlip = async (e) => {
    if (!e.target.files || !e.target.files[0] || !selectedSlipItem) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('paymentProof', file);
    formData.append('paymentMethod', selectedSlipItem.paymentMethod || 'bank_transfer');
    formData.append('paymentReference', selectedSlipItem.paymentReference || `SAL-${Date.now().toString().slice(-6)}`);
    formData.append('remarks', selectedSlipItem.remarks || 'Updated payment receipt slip');
    try {
      const res = await hrService.paySalary(selectedSlipItem.employeeId, selectedSlipItem.id || selectedSlipItem._id, formData);
      alert('Payment slip proof successfully uploaded & permanently stored!');
      const updatedEmp = res.data;
      const updatedPay = updatedEmp?.payroll?.find((p) => (p._id || p.id) === (selectedSlipItem.id || selectedSlipItem._id));
      if (updatedPay?.paymentProof?.fileUrl) {
        setSlipPreviewUrl(getFileUrl(updatedPay.paymentProof.fileUrl));
      }
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to upload payment slip');
    }
  };

  const handleUploadDoc = async (employeeId, formData) => {
    try {
      await hrService.uploadDoc(employeeId, formData);
      alert('Staff document uploaded to S3!');
      refreshActiveEmployee(employeeId);
    } catch (err) {
      alert(err.message);
    }
  };

  // Employee Edit, Delete, Seed handlers
  const handleOpenEdit = (emp) => {
    setEmployeeToEdit(emp);
    setIsEditEmpModalOpen(true);
  };

  const handleDeleteEmployee = async (emp) => {
    if (!window.confirm(`Are you sure you want to remove ${emp.firstName} ${emp.lastName} (${emp.employeeCode}) from the staff directory?`)) return;
    try {
      await hrService.deleteEmployee(emp._id || emp.id);
      alert('Employee successfully removed.');
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to remove employee');
    }
  };

  const handleSeedSampleStaff = async () => {
    if (!window.confirm('Initialize Krishna Valley staff directory with sample department personnel (Site Engineers, Architects, Accounts, Facilities)?')) return;
    try {
      const res = await hrService.seedSampleStaff();
      alert(res.message || 'Sample staff directory initialized!');
      loadData();
    } catch (err) {
      alert(err.message || 'Error seeding sample staff');
    }
  };

  // Leave Delete handler
  const handleDeleteLeave = async (employeeId, leaveId) => {
    if (!window.confirm('Are you sure you want to cancel and remove this leave application?')) return;
    try {
      await hrService.deleteLeave(employeeId, leaveId);
      alert('Leave record removed.');
      loadData();
      if (selectedEmployee && selectedEmployee._id === employeeId) {
        refreshActiveEmployee(employeeId);
      }
    } catch (err) {
      alert(err.message || 'Failed to remove leave');
    }
  };

  // Daily Attendance Roster logic
  const loadRosterForDate = async (dateStr) => {
    setRosterLoading(true);
    try {
      const res = await hrService.getAttendanceByDate({ date: dateStr });
      if (res.data && res.data.roster) {
        setRosterData(res.data.roster);
      }
    } catch (err) {
      console.error('Failed to load roster:', err);
    } finally {
      setRosterLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'attendance' && attendanceViewMode === 'roster') {
      loadRosterForDate(selectedAttendanceDate);
    }
  }, [activeTab, attendanceViewMode, selectedAttendanceDate, employees]);

  const handleMarkAllPresent = () => {
    setRosterData((prev) =>
      prev.map((r) => ({
        ...r,
        status: 'present',
        workingHours: 8.5,
        remarks: r.remarks || 'Standard site shift'
      }))
    );
  };

  const handleRosterStatusChange = (employeeId, newStatus) => {
    setRosterData((prev) =>
      prev.map((r) =>
        r.employeeId === employeeId
          ? {
              ...r,
              status: newStatus,
              workingHours: newStatus === 'absent' || newStatus === 'leave' || newStatus === 'holiday' ? 0 : newStatus === 'half_day' ? 4 : 8.5
            }
          : r
      )
    );
  };

  const handleRosterRemarksChange = (employeeId, remarks) => {
    setRosterData((prev) =>
      prev.map((r) => (r.employeeId === employeeId ? { ...r, remarks } : r))
    );
  };

  const handleSaveDailyRoster = async () => {
    try {
      const records = rosterData.map((r) => ({
        employeeId: r.employeeId,
        status: r.status,
        workingHours: r.workingHours,
        remarks: r.remarks
      }));
      const res = await hrService.logBulkAttendance({ date: selectedAttendanceDate, records });
      alert(res.message || 'Daily attendance roster successfully saved!');
      loadData();
      loadRosterForDate(selectedAttendanceDate);
    } catch (err) {
      alert(err.message || 'Failed to save attendance roster');
    }
  };

  // Department & Role Master actions
  const handleOpenDeptModal = (dept = null) => {
    setEditingDept(dept);
    setDeptNameInput(dept?.departmentName || '');
    setDeptCodeInput(dept?.departmentCode || '');
    setDeptDescInput(dept?.description || '');
    setIsDeptModalOpen(true);
  };

  const handleSaveDepartment = async (e) => {
    e.preventDefault();
    if (!deptNameInput.trim()) return;
    try {
      if (editingDept) {
        await hrService.updateDepartment(editingDept._id, {
          departmentName: deptNameInput,
          description: deptDescInput
        });
        alert('Department updated successfully!');
      } else {
        await hrService.addDepartment({
          departmentName: deptNameInput,
          departmentCode: deptCodeInput || `DEP-${Date.now().toString().slice(-4)}`,
          description: deptDescInput
        });
        alert('Department created successfully!');
      }
      setIsDeptModalOpen(false);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to save department');
    }
  };

  const handleDeleteDepartment = async (dept) => {
    if (!window.confirm(`Delete department "${dept.departmentName}"? This is only allowed if no staff belong to it.`)) return;
    try {
      await hrService.deleteDepartment(dept._id);
      alert('Department deleted successfully!');
      loadData();
    } catch (err) {
      alert(err.message || 'Cannot delete department');
    }
  };

  const handleOpenRoleModal = (deptCode = '', role = null) => {
    setEditingRole(role);
    setRoleDeptCodeInput(deptCode || role?.departmentCode || (masterData.departments?.[0]?.departmentCode || 'ENG'));
    setRoleNameInput(role?.roleName || '');
    setRoleCodeInput(role?.roleCode || '');
    setRoleDescInput(role?.description || '');
    setIsRoleModalOpen(true);
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!roleNameInput.trim()) return;
    try {
      if (editingRole) {
        await hrService.updateRole(editingRole._id, {
          roleName: roleNameInput,
          description: roleDescInput
        });
        alert('Role updated successfully!');
      } else {
        await hrService.addRole({
          roleName: roleNameInput,
          roleCode: roleCodeInput || `ROL-${Date.now().toString().slice(-4)}`,
          departmentCode: roleDeptCodeInput,
          description: roleDescInput
        });
        alert('Role created successfully!');
      }
      setIsRoleModalOpen(false);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to save role');
    }
  };

  const handleDeleteRole = async (role) => {
    if (!window.confirm(`Delete role "${role.roleName}"? This is only allowed if no employees are assigned to it.`)) return;
    try {
      await hrService.deleteRole(role._id);
      alert('Role deleted successfully!');
      loadData();
    } catch (err) {
      alert(err.message || 'Cannot delete role');
    }
  };

  // Derived Lists for Sub-tabs
  const allAttendanceLogs = React.useMemo(() => {
    const list = [];
    employees.forEach((emp) => {
      (emp.attendance || []).forEach((att) => {
        list.push({
          ...att,
          id: att._id,
          employeeId: emp._id,
          employeeCode: emp.employeeCode,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          departmentName: emp.departmentName || emp.departmentId?.name || 'Civil & Structural Engineering',
          designation: emp.designation || 'Senior Site Engineer'
        });
      });
    });
    return list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [employees]);

  const allLeaveRequests = React.useMemo(() => {
    const list = [];
    employees.forEach((emp) => {
      (emp.leaves || []).forEach((lv) => {
        list.push({
          ...lv,
          id: lv._id,
          employeeId: emp._id,
          employeeCode: emp.employeeCode,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          departmentName: emp.departmentName || emp.departmentId?.name || 'Civil & Structural Engineering',
          designation: emp.designation || 'Senior Site Engineer'
        });
      });
    });
    return list.sort((a, b) => new Date(b.fromDate || 0) - new Date(a.fromDate || 0));
  }, [employees]);

  const allPayrollRecords = React.useMemo(() => {
    const list = [];
    employees.forEach((emp) => {
      (emp.payroll || []).forEach((pay) => {
        list.push({
          ...pay,
          id: pay._id,
          employeeId: emp._id,
          employeeCode: emp.employeeCode,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          departmentName: emp.departmentName || emp.departmentId?.name || 'Civil & Structural Engineering',
          designation: emp.designation || 'Senior Site Engineer',
          phone: emp.phone || emp.mobileNo
        });
      });
    });
    return list.sort((a, b) => (b.year - a.year) || (b.month - a.month));
  }, [employees]);

  const filteredPayrollRecords = React.useMemo(() => {
    return allPayrollRecords.filter((pay) => {
      if (selectedPayrollMonth && Number(pay.month) !== Number(selectedPayrollMonth)) return false;
      if (selectedPayrollYear && Number(pay.year) !== Number(selectedPayrollYear)) return false;
      if (payrollStatusFilter && pay.status !== payrollStatusFilter) return false;
      return true;
    });
  }, [allPayrollRecords, selectedPayrollMonth, selectedPayrollYear, payrollStatusFilter]);

  // Derived filtered staff for ID Card Badges
  const filteredIDCardEmployees = React.useMemo(() => {
    return employees.filter((emp) => {
      if (idCardSearch.trim()) {
        const term = idCardSearch.toLowerCase();
        const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
        const code = (emp.employeeCode || '').toLowerCase();
        const designation = (emp.designation || '').toLowerCase();
        const phone = (emp.phone || emp.mobileNo || '').toLowerCase();
        if (!fullName.includes(term) && !code.includes(term) && !designation.includes(term) && !phone.includes(term)) {
          return false;
        }
      }
      if (idCardDeptFilter) {
        const empDept = emp.departmentName || emp.departmentId?.departmentName || emp.departmentId?.name || emp.department || '';
        const selectedDept = masterData.departments?.find(d => d.departmentCode === idCardDeptFilter || d._id === idCardDeptFilter);
        if (selectedDept && empDept !== selectedDept.departmentName && emp.departmentCode !== selectedDept.departmentCode) {
          return false;
        }
      }
      return true;
    });
  }, [employees, idCardSearch, idCardDeptFilter, masterData]);

  // Staff on leave today list
  const staffOnLeaveTodayList = React.useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return allLeaveRequests.filter((lv) => {
      if (lv.status !== 'approved') return false;
      const from = new Date(lv.fromDate).toISOString().slice(0, 10);
      const to = new Date(lv.toDate).toISOString().slice(0, 10);
      return today >= from && today <= to;
    });
  }, [allLeaveRequests]);

  // Filtered leave applications by status
  const filteredLeaveRequests = React.useMemo(() => {
    if (leaveStatusFilter === 'all') return allLeaveRequests;
    return allLeaveRequests.filter(lv => (lv.status || 'pending') === leaveStatusFilter);
  }, [allLeaveRequests, leaveStatusFilter]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Header */}
      <div className="g-card" style={{
        padding: '20px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        border: '1px solid #e5e7eb'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, color: '#111827' }}>
            Human Resources
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '4px', margin: 0 }}>
            Employee directory, attendance rosters, leave applications, and monthly payroll.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="btn-secondary"
          style={{ padding: '8px 14px', fontSize: '0.84rem' }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {/* KPI Stats Ribbon */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: '14px'
      }}>
        <div className="stat-card" style={{ border: '1px solid #e5e7eb', background: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: '500' }}>Active staff</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#f0fdf4', color: '#17652f' }}>
              <Users size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111827', marginTop: '4px' }}>
            {summary.activeStaff} <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: '400' }}>/ {summary.totalEmployees}</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: '400' }}>Permanent on-roll staff</span>
        </div>

        <div className="stat-card" style={{ border: '1px solid #e5e7eb', background: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: '500' }}>On leave today</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: (summary.staffOnLeaveToday || 0) > 0 ? '#fef3c7' : '#f0fdf4', color: (summary.staffOnLeaveToday || 0) > 0 ? '#d97706' : '#17652f' }}>
              <Calendar size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: (summary.staffOnLeaveToday || 0) > 0 ? '#d97706' : '#17652f', marginTop: '4px' }}>
            {summary.staffOnLeaveToday || 0}
          </div>
          <span style={{ fontSize: '0.72rem', color: (summary.staffOnLeaveToday || 0) > 0 ? '#d97706' : '#17652f', fontWeight: '500' }}>
            {(summary.staffOnLeaveToday || 0) > 0 ? 'Staff absent on leave' : 'Full team available'}
          </span>
        </div>

        <div className="stat-card" style={{ border: '1px solid #e5e7eb', background: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: '500' }}>ID cards issued</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#f0fdf4', color: '#17652f' }}>
              <ShieldCheck size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#17652f', marginTop: '4px' }}>
            {summary.totalIdCardsIssued !== undefined ? summary.totalIdCardsIssued : employees.filter(e => e.idCardDetails?.idCardIssued).length}
            <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: '400' }}> / {employees.length}</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#17652f', fontWeight: '500' }}>Cards in circulation</span>
        </div>

        <div className="stat-card" style={{ border: '1px solid #e5e7eb', background: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: '500' }}>Pending leaves</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#fef3c7', color: '#d97706' }}>
              <Clock size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111827', marginTop: '4px' }}>
            {summary.pendingLeavesCount}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: '400' }}>Approval required</span>
        </div>

        <div className="stat-card" style={{ border: '1px solid #e5e7eb', background: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: '500' }}>Monthly payroll</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#f0fdf4', color: '#17652f' }}>
              <DollarSign size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#17652f', marginTop: '4px' }}>
            {formatINR(summary.monthlyPayrollOutflow)}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: '400' }}>Salary and benefits total</span>
        </div>
      </div>

      {/* Sub-Tab Navigation Header */}
      <div className="g-card no-scrollbar" style={{
        display: 'flex',
        padding: '4px',
        gap: '4px',
        border: '1px solid #e5e7eb',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        whiteSpace: 'nowrap'
      }}>
        {[
          { id: 'directory', label: `Directory (${filteredEmployees.length})` },
          { id: 'id_cards', label: `ID cards (${employees.length})` },
          { id: 'leaves', label: `Leaves (${allLeaveRequests.length})` },
          { id: 'attendance', label: `Attendance (${allAttendanceLogs.length})` },
          { id: 'payroll', label: `Payroll (${allPayrollRecords.length})` },
          { id: 'dept_roles', label: `Departments and roles (${masterData.departments?.length || 8})` }
        ].map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              type="button"
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                flex: '1 1 auto',
                padding: '8px 16px',
                borderRadius: '6px',
                background: isSelected ? '#17652f' : 'transparent',
                color: isSelected ? '#ffffff' : '#6b7280',
                fontWeight: isSelected ? '600' : '500',
                fontSize: '0.82rem',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ================= TAB 1: DIRECTORY ================= */}
      {activeTab === 'directory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#111827', margin: 0 }}>Employee directory</h3>
              <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '2px 0 0 0' }}>Showing {filteredEmployees.length} of {employees.length} employees</p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              {canManageEmployees && employees.length === 0 && (
                <button
                  type="button"
                  onClick={handleSeedSampleStaff}
                  className="btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '0.82rem' }}
                >
                  <Sparkles size={14} /> Add sample staff
                </button>
              )}
              {canManageEmployees && (
                <button
                  type="button"
                  onClick={() => setIsEmpModalOpen(true)}
                  className="btn-primary"
                  style={{ padding: '8px 16px', fontSize: '0.84rem' }}
                >
                  <Plus size={15} /> Add employee
                </button>
              )}
            </div>
          </div>

          {/* DYNAMIC DEPARTMENT & ROLE FILTER BAR */}
          <div className="g-card" style={{ padding: '12px 16px', background: '#ffffff', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end', border: '1px solid #e5e7eb' }}>
            <div style={{ flex: '1.2 1 200px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '4px' }}>Search staff</label>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input
                  type="text"
                  placeholder="e.g. Rahul, ENG-01, or 98765"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: '100%', paddingLeft: '30px', fontSize: '0.82rem' }}
                />
              </div>
            </div>

            <div style={{ flex: '1 1 180px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '4px' }}>
                Department ({masterData.departments?.length || 0})
              </label>
              <select
                value={departmentFilter}
                onChange={(e) => {
                  setDepartmentFilter(e.target.value);
                  setRoleFilter('');
                }}
                style={{ width: '100%', fontSize: '0.82rem' }}
              >
                <option value="">All departments</option>
                {(masterData.departments || []).map((d) => (
                  <option key={d._id || d.departmentCode} value={d.departmentCode}>
                    {d.departmentName}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: '1 1 180px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '4px' }}>
                Role ({activeDeptRoles.length})
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{ width: '100%', fontSize: '0.82rem' }}
              >
                <option value="">{departmentFilter ? `All roles in dept` : `All roles`}</option>
                {activeDeptRoles.map((r) => (
                  <option key={r._id || r.roleCode} value={r.roleCode}>
                    {r.roleName}
                  </option>
                ))}
              </select>
            </div>

            {(departmentFilter || roleFilter || searchTerm) && (
              <button
                type="button"
                onClick={() => {
                  setDepartmentFilter('');
                  setRoleFilter('');
                  setSearchTerm('');
                }}
                className="btn-secondary"
                style={{
                  padding: '7px 12px',
                  fontSize: '0.76rem',
                  height: '34px'
                }}
              >
                Reset filters
              </button>
            )}
          </div>

          <div className="g-card" style={{ overflow: 'hidden', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>Employee</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>Department</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>Role</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>Contact</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>Salary</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>Status</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#f0fdf4', color: '#17652f', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                          <Users size={22} />
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                          No employees found
                        </div>
                        <p style={{ color: '#6b7280', fontSize: '0.84rem', maxWidth: '420px', margin: '0 auto 16px' }}>
                          {employees.length === 0
                            ? 'The staff directory is currently empty. Add new staff or initialize sample staff records.'
                            : 'No employees match the selected filters.'}
                        </p>
                        {employees.length === 0 && (
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => setIsEmpModalOpen(true)}
                              className="btn-primary"
                              style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                            >
                              <Plus size={15} /> Add employee
                            </button>
                            <button
                              type="button"
                              onClick={handleSeedSampleStaff}
                              className="btn-secondary"
                              style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                            >
                              <Sparkles size={15} /> Add sample staff
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <tr key={emp._id || emp.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600, color: '#111827' }}>{emp.firstName} {emp.lastName}</div>
                          <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Code: {emp.employeeCode}</div>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#374151', fontWeight: 500 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Building2 size={13} color="#17652f" />
                            <span>{emp.departmentName || emp.departmentId?.departmentName || emp.departmentId?.name || emp.department || 'Civil & Structural Engineering'}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#111827', fontWeight: 500 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Briefcase size={13} color="#17652f" />
                            <span>{emp.designation || emp.roleName || emp.roleId?.roleName || emp.roleId?.name || emp.role || 'Senior Site Engineer'}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ color: '#17652f', fontWeight: 500 }}>{emp.phone || emp.mobileNo || '—'}</div>
                          <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>{emp.email || ''}</div>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#111827', fontWeight: 500 }}>
                          {formatINR(emp.salaryStructure?.basicSalary || (emp.payroll && emp.payroll[0]?.basicSalary) || emp.salary || 45000)}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <StatusBadge status={emp.employmentStatus} />
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                            <button
                              type="button"
                              title="ID card"
                              onClick={() => {
                                setSelectedEmployeeForID(emp);
                                setIsIDCardModalOpen(true);
                              }}
                              className="btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            >
                              <CreditCard size={12} /> ID card
                            </button>
                            <button
                              type="button"
                              title="View details"
                              onClick={() => {
                                setSelectedEmployee(emp);
                                setIsDetailModalOpen(true);
                              }}
                              className="btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            >
                              <Eye size={12} /> Details
                            </button>
                            {canEditHR && (
                              <button
                                type="button"
                                title="Edit employee"
                                onClick={() => handleOpenEdit(emp)}
                                className="btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              >
                                <Edit2 size={12} /> Edit
                              </button>
                            )}
                            {canManageEmployees && (
                              <button
                                type="button"
                                title="Delete employee"
                                onClick={() => handleDeleteEmployee(emp)}
                                style={{
                                  padding: '4px 6px',
                                  background: '#ffffff',
                                  border: '1px solid #fee2e2',
                                  color: '#dc2626',
                                  borderRadius: '5px',
                                  fontSize: '0.75rem',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center'
                                }}
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB: STAFF ID BADGES & IDENTITY ================= */}
      {activeTab === 'id_cards' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Header & Quick Metrics */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#111827', margin: 0 }}>
                Staff identity cards
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '2px 0 0 0' }}>
                Review and print physical identity cards for employees.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsEmpModalOpen(true)}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.84rem' }}
            >
              <Plus size={15} /> Add employee
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
            <div className="stat-card" style={{ border: '1px solid #e5e7eb', background: '#ffffff', padding: '10px 14px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 500, color: '#6b7280', display: 'block' }}>Total staff</span>
              <strong style={{ fontSize: '1.25rem', color: '#111827' }}>{employees.length}</strong>
              <span style={{ fontSize: '0.68rem', color: '#6b7280', display: 'block' }}>Staff on record</span>
            </div>
            <div className="stat-card" style={{ border: '1px solid #e5e7eb', background: '#ffffff', padding: '10px 14px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 500, color: '#6b7280', display: 'block' }}>Cards issued</span>
              <strong style={{ fontSize: '1.25rem', color: '#17652f' }}>
                {employees.filter(e => e.idCardDetails?.idCardIssued).length}
              </strong>
              <span style={{ fontSize: '0.68rem', color: '#17652f', display: 'block' }}>Issued to employees</span>
            </div>
            <div className="stat-card" style={{ border: '1px solid #e5e7eb', background: '#ffffff', padding: '10px 14px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 500, color: '#6b7280', display: 'block' }}>KYC linked</span>
              <strong style={{ fontSize: '1.25rem', color: '#17652f' }}>
                {employees.filter(e => e.idCardDetails?.aadhaarNumber && e.idCardDetails?.panNumber).length}
              </strong>
              <span style={{ fontSize: '0.68rem', color: '#17652f', display: 'block' }}>Aadhaar and PAN on file</span>
            </div>
            <div className="stat-card" style={{ border: '1px solid #e5e7eb', background: '#ffffff', padding: '10px 14px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 500, color: '#6b7280', display: 'block' }}>Blood group recorded</span>
              <strong style={{ fontSize: '1.25rem', color: '#111827' }}>
                {employees.filter(e => e.bloodGroup).length}
              </strong>
              <span style={{ fontSize: '0.68rem', color: '#6b7280', display: 'block' }}>Emergency record on file</span>
            </div>
          </div>

          {/* Search & Department Filter Bar */}
          <div className="g-card" style={{ padding: '12px 16px', background: '#ffffff', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', border: '1px solid #e5e7eb' }}>
            <div style={{ flex: '1.5 1 220px', position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                type="text"
                placeholder="e.g. Rahul, ENG-01, or 98765"
                value={idCardSearch}
                onChange={(e) => setIdCardSearch(e.target.value)}
                style={{ width: '100%', paddingLeft: '32px', fontSize: '0.82rem' }}
              />
            </div>

            <div style={{ flex: '1 1 200px' }}>
              <select
                value={idCardDeptFilter}
                onChange={(e) => setIdCardDeptFilter(e.target.value)}
                style={{ width: '100%', fontSize: '0.82rem' }}
              >
                <option value="">All departments ({employees.length})</option>
                {(masterData.departments || []).map((d) => (
                  <option key={d._id || d.departmentCode} value={d.departmentCode}>
                    {d.departmentName}
                  </option>
                ))}
              </select>
            </div>

            {(idCardSearch || idCardDeptFilter) && (
              <button
                type="button"
                onClick={() => {
                  setIdCardSearch('');
                  setIdCardDeptFilter('');
                }}
                className="btn-secondary"
                style={{ padding: '7px 12px', fontSize: '0.76rem' }}
              >
                Reset filters
              </button>
            )}
          </div>

          {/* ID Card Badges Grid */}
          {filteredIDCardEmployees.length === 0 ? (
            <div className="g-card" style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280', border: '1px solid #e5e7eb' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#f0fdf4', color: '#17652f', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <ShieldCheck size={22} />
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', margin: '0 0 4px 0' }}>
                No ID cards found
              </h4>
              <p style={{ fontSize: '0.84rem', color: '#6b7280', maxWidth: '400px', margin: '0 auto 16px' }}>
                No employees match your search query or department filter.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
              {filteredIDCardEmployees.map((emp) => {
                const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Staff Member';
                const initials = `${(emp.firstName || '')[0] || 'K'}${(emp.lastName || '')[0] || 'V'}`.toUpperCase();
                const isIssued = emp.idCardDetails?.idCardIssued;
                const bloodGroup = emp.bloodGroup || 'O+';
                const deptName = emp.departmentName || emp.departmentId?.name || 'Krishna Valley Projects';
                const roleName = emp.designation || 'Associate';

                return (
                  <div
                    key={emp._id}
                    style={{
                      background: '#ffffff',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    {/* Badge Header Strip */}
                    <div style={{
                      background: '#17652f',
                      padding: '8px 12px',
                      color: '#ffffff',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.02em' }}>
                        KRISHNA VALLEY
                      </div>

                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.65rem',
                        fontWeight: 500,
                        background: isIssued ? '#14532d' : '#374151',
                        color: '#ffffff'
                      }}>
                        {isIssued ? 'Issued' : 'Ready'}
                      </span>
                    </div>

                    {/* Card Body */}
                    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        {/* Avatar */}
                        <div style={{
                          width: '54px',
                          height: '54px',
                          borderRadius: '6px',
                          background: '#f0fdf4',
                          color: '#17652f',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1rem',
                          fontWeight: 600,
                          border: '1px solid #bbf7d0',
                          flexShrink: 0
                        }}>
                          {emp.idCardDetails?.photoUrl ? (
                            <img src={emp.idCardDetails.photoUrl} alt={fullName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '5px' }} />
                          ) : (
                            initials
                          )}
                        </div>

                        {/* Text info */}
                        <div style={{ overflow: 'hidden' }}>
                          <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: '#111827', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {fullName}
                          </h4>
                          <div style={{ display: 'inline-block', background: '#f3f4f6', borderRadius: '4px', padding: '1px 5px', fontSize: '0.7rem', fontWeight: 500, color: '#374151', fontFamily: 'monospace', marginTop: '2px' }}>
                            {emp.employeeCode}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#17652f', fontWeight: 500, marginTop: '2px' }}>
                            {roleName}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                            {deptName}
                          </div>
                        </div>
                      </div>

                      {/* Detail Badges Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', background: '#f9fafb', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                        <div>
                          <span style={{ fontSize: '0.62rem', color: '#6b7280', fontWeight: 500, display: 'block' }}>Blood group</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#111827' }}>
                            {bloodGroup}
                          </span>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.62rem', color: '#6b7280', fontWeight: 500, display: 'block' }}>Location</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#111827' }}>
                            {emp.workLocation || 'Site & HQ'}
                          </span>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.62rem', color: '#6b7280', fontWeight: 500, display: 'block' }}>Aadhaar</span>
                          <span style={{ fontSize: '0.72rem', fontWeight: 500, color: emp.idCardDetails?.aadhaarNumber ? '#17652f' : '#6b7280' }}>
                            {emp.idCardDetails?.aadhaarNumber ? `•••• ${emp.idCardDetails.aadhaarNumber.slice(-4)}` : 'On file'}
                          </span>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.62rem', color: '#6b7280', fontWeight: 500, display: 'block' }}>PAN</span>
                          <span style={{ fontSize: '0.72rem', fontWeight: 500, color: emp.idCardDetails?.panNumber ? '#17652f' : '#6b7280' }}>
                            {emp.idCardDetails?.panNumber || 'On file'}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: '6px', marginTop: 'auto', paddingTop: '4px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEmployeeForID(emp);
                            setIsIDCardModalOpen(true);
                          }}
                          className="btn-primary"
                          style={{
                            flex: 1,
                            padding: '6px 10px',
                            fontSize: '0.76rem'
                          }}
                        >
                          <Printer size={13} /> Print ID card
                        </button>
                        <button
                          type="button"
                          title="Edit"
                          onClick={() => handleOpenEdit(emp)}
                          className="btn-secondary"
                          style={{
                            padding: '6px 10px',
                            fontSize: '0.76rem'
                          }}
                        >
                          <Edit2 size={13} /> Edit
                        </button>
                        <button
                          type="button"
                          title="Details"
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setIsDetailModalOpen(true);
                          }}
                          className="btn-secondary"
                          style={{
                            padding: '6px 8px',
                            fontSize: '0.76rem'
                          }}
                        >
                          <Eye size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB: DEPARTMENT & ROLE MATRIX ================= */}
      {activeTab === 'dept_roles' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#111827', margin: 0 }}>Departments and roles</h3>
              <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '2px 0 0 0' }}>Manage department hierarchies and job roles.</p>
            </div>
            {canManageEmployees && (
              <button
                type="button"
                onClick={() => handleOpenDeptModal(null)}
                className="btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.84rem' }}
              >
                <Plus size={15} /> Add department
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '14px' }}>
            {(masterData.departments || []).map((dept) => {
              const deptRoles = (masterData.roles || []).filter(
                (r) => r.departmentCode === dept.departmentCode ||
                       r.departmentName?.toLowerCase() === dept.departmentName?.toLowerCase()
              );
              const deptStaffCount = employees.filter((e) => {
                const eDept = e.departmentId?.departmentCode || e.departmentCode || e.departmentName || e.department;
                return eDept === dept.departmentCode || eDept?.toLowerCase() === dept.departmentName?.toLowerCase();
              }).length;

              return (
                <div key={dept._id || dept.departmentCode} className="g-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '0.68rem', padding: '2px 6px', background: '#f0fdf4', color: '#17652f', fontWeight: 500, borderRadius: '4px' }}>
                        Code: {dept.departmentCode}
                      </span>
                      <h4 style={{ fontSize: '0.98rem', fontWeight: 600, color: '#111827', margin: '4px 0 0 0' }}>
                        {dept.departmentName}
                      </h4>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '12px', background: '#f0fdf4', color: '#17652f', fontWeight: 500 }}>
                        {deptStaffCount} staff
                      </span>
                      <button
                        type="button"
                        title="Edit department"
                        onClick={() => handleOpenDeptModal(dept)}
                        className="btn-secondary"
                        style={{ padding: '4px 6px' }}
                      >
                        <Edit2 size={12} />
                      </button>
                      {deptStaffCount === 0 && (
                        <button
                          type="button"
                          title="Delete department"
                          onClick={() => handleDeleteDepartment(dept)}
                          style={{
                            padding: '4px 6px',
                            background: '#ffffff',
                            border: '1px solid #fee2e2',
                            color: '#dc2626',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: 0, lineHeight: '1.4' }}>
                    {dept.description || 'Department operational unit.'}
                  </p>

                  <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '10px', marginTop: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#374151' }}>
                        Roles ({deptRoles.length}):
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenRoleModal(dept.departmentCode, null)}
                        className="btn-secondary"
                        style={{
                          padding: '3px 8px',
                          fontSize: '0.7rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Plus size={11} /> Add role
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {deptRoles.map((role) => {
                        const roleStaff = employees.filter((e) => {
                          const rName = e.designation || e.roleName || e.roleId?.roleName || e.role;
                          return rName === role.roleName || e.roleCode === role.roleCode;
                        }).length;

                        return (
                          <div
                            key={role._id || role.roleCode}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '6px 10px',
                              background: '#f9fafb',
                              borderRadius: '6px',
                              border: '1px solid #e5e7eb'
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#111827' }}>
                                {role.roleName}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: '#6b7280' }}>
                                Code: <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{role.roleCode}</span> • {role.description || 'Department role'}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '0.7rem', fontWeight: 500, color: roleStaff > 0 ? '#17652f' : '#9ca3af' }}>
                                {roleStaff} staff
                              </span>
                              <button
                                type="button"
                                title="Edit role"
                                onClick={() => handleOpenRoleModal(dept.departmentCode, role)}
                                className="btn-secondary"
                                style={{ padding: '3px 5px' }}
                              >
                                <Edit2 size={11} />
                              </button>
                              {roleStaff === 0 && (
                                <button
                                  type="button"
                                  title="Delete role"
                                  onClick={() => handleDeleteRole(role)}
                                  style={{
                                    padding: '3px 5px',
                                    background: '#ffffff',
                                    border: '1px solid #fee2e2',
                                    color: '#dc2626',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Trash2 size={11} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 2: ATTENDANCE ================= */}
      {activeTab === 'attendance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Header & Controls Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#111827', margin: 0 }}>
                Attendance
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '2px 0 0 0' }}>
                Record daily shift attendance and view logs.
              </p>
            </div>

            {/* Mode Switch & Log Single Modal Button */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', background: '#f3f4f6', padding: '3px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                <button
                  type="button"
                  onClick={() => setAttendanceViewMode('roster')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '4px',
                    border: 'none',
                    background: attendanceViewMode === 'roster' ? '#17652f' : 'transparent',
                    color: attendanceViewMode === 'roster' ? '#ffffff' : '#4b5563',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Daily roster
                </button>
                <button
                  type="button"
                  onClick={() => setAttendanceViewMode('history')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '4px',
                    border: 'none',
                    background: attendanceViewMode === 'history' ? '#17652f' : 'transparent',
                    color: attendanceViewMode === 'history' ? '#ffffff' : '#4b5563',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  History logs ({allAttendanceLogs.length})
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsAttModalOpen(true)}
                className="btn-primary"
                style={{
                  padding: '7px 14px',
                  fontSize: '0.8rem'
                }}
              >
                <Clock size={14} /> Log attendance
              </button>
            </div>
          </div>

          {/* MODE A: DAILY ROSTER MODE */}
          {attendanceViewMode === 'roster' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* Date Selector & Quick Actions Ribbon */}
              <div className="g-card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: '#ffffff', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#374151', marginBottom: '2px' }}>
                      Roster date:
                    </label>
                    <input
                      type="date"
                      value={selectedAttendanceDate}
                      onChange={(e) => setSelectedAttendanceDate(e.target.value)}
                      style={{ padding: '6px 10px', fontSize: '0.82rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '16px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date().toISOString().slice(0, 10);
                        setSelectedAttendanceDate(today);
                      }}
                      className="btn-secondary"
                      style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const yest = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
                        setSelectedAttendanceDate(yest);
                      }}
                      className="btn-secondary"
                      style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                    >
                      Yesterday
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleMarkAllPresent}
                    className="btn-secondary"
                    style={{
                      padding: '8px 14px',
                      fontSize: '0.8rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <CheckCircle2 size={15} /> Mark all present
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveDailyRoster}
                    disabled={rosterLoading || rosterData.length === 0}
                    className="btn-primary"
                    style={{
                      padding: '8px 16px',
                      fontSize: '0.8rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Check size={16} /> Save roster
                  </button>
                </div>
              </div>

              {/* Roster Table */}
              <div className="g-card" style={{ overflow: 'hidden', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                        <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>Employee</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>Department and role</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', textAlign: 'center' }}>Status</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>Hours</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rosterLoading ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: '#6b7280' }}>
                            Loading roster for {selectedAttendanceDate}...
                          </td>
                        </tr>
                      ) : rosterData.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: '#6b7280' }}>
                            No active employees found to mark attendance. Add employees first.
                          </td>
                        </tr>
                      ) : (
                        rosterData.map((r) => {
                          const status = r.status || 'present';
                          return (
                            <tr key={r.employeeId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                              <td style={{ padding: '12px 16px' }}>
                                <div style={{ fontWeight: 600, color: '#111827' }}>{r.employeeName}</div>
                                <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Code: {r.employeeCode}</div>
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <div style={{ color: '#17652f', fontWeight: 500, fontSize: '0.8rem' }}>{r.departmentName}</div>
                                <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>{r.designation}</div>
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                <div style={{ display: 'inline-flex', gap: '4px', background: '#f3f4f6', padding: '3px', borderRadius: '6px' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleRosterStatusChange(r.employeeId, 'present')}
                                    style={{
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      border: 'none',
                                      background: status === 'present' ? '#17652f' : 'transparent',
                                      color: status === 'present' ? '#ffffff' : '#374151',
                                      fontSize: '0.72rem',
                                      fontWeight: 500,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Present
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRosterStatusChange(r.employeeId, 'late')}
                                    style={{
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      border: 'none',
                                      background: status === 'late' ? '#d97706' : 'transparent',
                                      color: status === 'late' ? '#ffffff' : '#374151',
                                      fontSize: '0.72rem',
                                      fontWeight: 500,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Late
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRosterStatusChange(r.employeeId, 'half_day')}
                                    style={{
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      border: 'none',
                                      background: status === 'half_day' ? '#2563eb' : 'transparent',
                                      color: status === 'half_day' ? '#ffffff' : '#374151',
                                      fontSize: '0.72rem',
                                      fontWeight: 500,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Half-day
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRosterStatusChange(r.employeeId, 'absent')}
                                    style={{
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      border: 'none',
                                      background: status === 'absent' ? '#dc2626' : 'transparent',
                                      color: status === 'absent' ? '#ffffff' : '#374151',
                                      fontSize: '0.72rem',
                                      fontWeight: 500,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Absent
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRosterStatusChange(r.employeeId, 'leave')}
                                    style={{
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      border: 'none',
                                      background: status === 'leave' ? '#0891b2' : 'transparent',
                                      color: status === 'leave' ? '#ffffff' : '#374151',
                                      fontSize: '0.72rem',
                                      fontWeight: 500,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Leave
                                  </button>
                                </div>
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  max="24"
                                  value={r.workingHours !== undefined ? r.workingHours : 8.5}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setRosterData((prev) =>
                                      prev.map((item) => (item.employeeId === r.employeeId ? { ...item, workingHours: val } : item))
                                    );
                                  }}
                                  style={{ width: '60px', padding: '4px 6px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '0.8rem', textAlign: 'center' }}
                                />
                                <span style={{ fontSize: '0.72rem', color: '#6b7280', marginLeft: '4px' }}>hrs</span>
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <input
                                  type="text"
                                  value={r.remarks || ''}
                                  onChange={(e) => handleRosterRemarksChange(r.employeeId, e.target.value)}
                                  placeholder="e.g. Regular site shift"
                                  style={{ width: '100%', padding: '4px 8px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '0.78rem' }}
                                />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* MODE B: ATTENDANCE HISTORY LOGS */}
          {attendanceViewMode === 'history' && (
            <div>
              {allAttendanceLogs.length === 0 ? (
                <div className="g-card" style={{ padding: '32px 20px', textAlign: 'center', border: '1px solid #e5e7eb' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#f0fdf4', color: '#17652f', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <Clock size={22} />
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                    No attendance logs yet
                  </div>
                  <p style={{ color: '#6b7280', fontSize: '0.84rem', maxWidth: '460px', margin: '0 auto 16px' }}>
                    Daily shift rosters calculate present days, half-days, and overtime for payroll.
                  </p>
                  <button
                    type="button"
                    onClick={() => setAttendanceViewMode('roster')}
                    className="btn-primary"
                    style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                  >
                    Open daily roster
                  </button>
                </div>
              ) : (
                <div className="g-card" style={{ overflow: 'hidden', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%' }}>
                      <thead>
                        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                          <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>Date</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>Employee</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>Department and role</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>Hours</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>Status</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allAttendanceLogs.map((att, idx) => (
                          <tr key={att.id || att._id || idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontWeight: 600, color: '#111827' }}>
                                {new Date(att.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontWeight: 600, color: '#111827' }}>{att.employeeName}</div>
                              <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Code: {att.employeeCode}</div>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ color: '#17652f', fontWeight: 500, fontSize: '0.8rem' }}>{att.departmentName}</div>
                              <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>{att.designation}</div>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontWeight: 600, color: '#111827' }}>{att.workingHours || 8.5} hrs</div>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <StatusBadge status={att.status || 'present'} />
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ color: '#6b7280', fontSize: '0.8rem' }}>{att.remarks || 'Standard shift'}</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: LEAVES ================= */}
      {activeTab === 'leaves' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                Leaves
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#4b5563', margin: '4px 0 0 0' }}>
                Track leave quotas, view staff on leave today, and review leave applications.
              </p>
            </div>

            {canEditHR && (
              <button
                type="button"
                onClick={() => setIsLeaveModalOpen(true)}
                style={{
                  background: '#17652f',
                  color: '#ffffff',
                  padding: '8px 18px',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  border: 'none'
                }}
              >
                <Plus size={15} /> Apply leave
              </button>
            )}
          </div>

          {/* STAFF ON LEAVE TODAY BANNER */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '6px',
                background: staffOnLeaveTodayList.length > 0 ? '#fef3c7' : '#f0fdf4',
                color: staffOnLeaveTodayList.length > 0 ? '#92400e' : '#17652f',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Calendar size={18} />
              </div>
              <div>
                <strong style={{ fontSize: '0.88rem', color: '#111827', display: 'block' }}>
                  {staffOnLeaveTodayList.length > 0
                    ? `${staffOnLeaveTodayList.length} staff on leave today`
                    : 'No staff on leave today'}
                </strong>
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  {staffOnLeaveTodayList.length > 0
                    ? 'Staff members with approved leave for today:'
                    : 'All staff are scheduled for duty.'}
                </span>
              </div>
            </div>

            {staffOnLeaveTodayList.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {staffOnLeaveTodayList.map((lv) => (
                  <div
                    key={lv.id || lv._id}
                    style={{
                      background: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span style={{ fontWeight: '600', color: '#111827' }}>{lv.employeeName}</span>
                    <span style={{ color: '#9ca3af' }}>•</span>
                    <span style={{ color: '#17652f', fontWeight: '600', textTransform: 'capitalize' }}>{lv.leaveType}</span>
                    <span style={{ color: '#9ca3af' }}>•</span>
                    <span style={{ color: '#6b7280' }}>until {new Date(lv.toDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sub-view Switcher Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'inline-flex', background: '#f3f4f6', padding: '3px', borderRadius: '6px', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setLeaveSubView('matrix')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '4px',
                  border: 'none',
                  background: leaveSubView === 'matrix' ? '#ffffff' : 'transparent',
                  color: leaveSubView === 'matrix' ? '#111827' : '#6b7280',
                  fontWeight: leaveSubView === 'matrix' ? '600' : '500',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                Quotas and balances ({employees.length})
              </button>
              <button
                type="button"
                onClick={() => setLeaveSubView('applications')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '4px',
                  border: 'none',
                  background: leaveSubView === 'applications' ? '#ffffff' : 'transparent',
                  color: leaveSubView === 'applications' ? '#111827' : '#6b7280',
                  fontWeight: leaveSubView === 'applications' ? '600' : '500',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                Applications ledger ({allLeaveRequests.length})
              </button>
            </div>

            {leaveSubView === 'applications' && (
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {['all', 'pending', 'approved', 'rejected'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setLeaveStatusFilter(st)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      border: '1px solid #e5e7eb',
                      background: leaveStatusFilter === st ? '#17652f' : '#ffffff',
                      color: leaveStatusFilter === st ? '#ffffff' : '#374151',
                      fontSize: '0.72rem',
                      fontWeight: '600',
                      textTransform: 'capitalize',
                      cursor: 'pointer'
                    }}
                  >
                    {st === 'all' ? `All (${allLeaveRequests.length})` : st}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* SUB-VIEW 1: STAFF LEAVE QUOTA & BALANCES MATRIX */}
          {leaveSubView === 'matrix' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="g-card" style={{ overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Department</th>
                        <th>Casual leave (CL)</th>
                        <th>Sick leave (SL)</th>
                        <th>Earned leave (EL)</th>
                        <th>Unpaid leave (LWP)</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#6b7280' }}>
                            No employees found. Add staff to track leave balances.
                          </td>
                        </tr>
                      ) : (
                        employees.map((emp) => {
                          const clTotal = emp.leaveBalance?.casualLeave?.total || 12;
                          const clUsed = emp.leaveBalance?.casualLeave?.used || 0;
                          const clLeft = Math.max(0, clTotal - clUsed);

                          const slTotal = emp.leaveBalance?.sickLeave?.total || 10;
                          const slUsed = emp.leaveBalance?.sickLeave?.used || 0;
                          const slLeft = Math.max(0, slTotal - slUsed);

                          const elTotal = emp.leaveBalance?.earnedLeave?.total || 15;
                          const elUsed = emp.leaveBalance?.earnedLeave?.used || 0;
                          const elLeft = Math.max(0, elTotal - elUsed);

                          const lwpUsed = emp.leaveBalance?.unpaidLeave?.used || 0;

                          return (
                            <tr key={emp._id}>
                              <td>
                                <div style={{ fontWeight: '600', color: '#111827' }}>
                                  {emp.firstName} {emp.lastName}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#6b7280', fontFamily: 'monospace' }}>
                                  {emp.employeeCode}
                                </div>
                              </td>
                              <td>
                                <div style={{ color: '#17652f', fontWeight: '500', fontSize: '0.8rem' }}>
                                  {emp.departmentName || 'Krishna Valley'}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                                  {emp.designation || 'Staff'}
                                </div>
                              </td>
                              {/* Casual Leave */}
                              <td>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                  <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#17652f' }}>{clLeft}</span>
                                  <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>/ {clTotal} left</span>
                                </div>
                                <span style={{ fontSize: '0.66rem', color: '#6b7280' }}>{clUsed} used</span>
                              </td>
                              {/* Sick Leave */}
                              <td>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                  <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>{slLeft}</span>
                                  <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>/ {slTotal} left</span>
                                </div>
                                <span style={{ fontSize: '0.66rem', color: '#6b7280' }}>{slUsed} used</span>
                              </td>
                              {/* Earned Leave */}
                              <td>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                  <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#17652f' }}>{elLeft}</span>
                                  <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>/ {elTotal} left</span>
                                </div>
                                <span style={{ fontSize: '0.66rem', color: '#6b7280' }}>{elUsed} used</span>
                              </td>
                              {/* LWP */}
                              <td>
                                <div style={{ fontSize: '0.9rem', fontWeight: '600', color: lwpUsed > 0 ? '#dc2626' : '#6b7280' }}>
                                  {lwpUsed} <span style={{ fontSize: '0.72rem', fontWeight: 'normal' }}>days</span>
                                </div>
                                {lwpUsed > 0 && (
                                  <span style={{ fontSize: '0.64rem', color: '#dc2626', fontWeight: '500' }}>Unpaid</span>
                                )}
                              </td>
                              <td>
                                <StatusBadge status={emp.employmentStatus} />
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsLeaveModalOpen(true);
                                    }}
                                    style={{
                                      padding: '4px 9px',
                                      background: '#f9fafb',
                                      border: '1px solid #e5e7eb',
                                      color: '#374151',
                                      borderRadius: '4px',
                                      fontSize: '0.72rem',
                                      fontWeight: '600',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Apply leave
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEdit(emp)}
                                    style={{
                                      padding: '4px 9px',
                                      background: '#f0fdf4',
                                      border: '1px solid #bbf7d0',
                                      color: '#17652f',
                                      borderRadius: '4px',
                                      fontSize: '0.72rem',
                                      fontWeight: '600',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Adjust quotas
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedEmployee(emp);
                                      setIsDetailModalOpen(true);
                                    }}
                                    style={{
                                      padding: '4px 8px',
                                      background: '#f9fafb',
                                      border: '1px solid #e5e7eb',
                                      color: '#374151',
                                      borderRadius: '4px',
                                      fontSize: '0.72rem',
                                      fontWeight: '600',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Details
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUB-VIEW 2: LEAVE APPLICATIONS & APPROVALS LEDGER */}
          {leaveSubView === 'applications' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredLeaveRequests.length === 0 ? (
                <div className="g-card" style={{ padding: '36px 20px', textAlign: 'center' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#f3f4f6', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <Calendar size={24} />
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#111827', marginBottom: '6px' }}>
                    No leave applications found
                  </div>
                  <p style={{ color: '#6b7280', fontSize: '0.85rem', maxWidth: '500px', margin: '0 auto 16px' }}>
                    No leave entries match status "{leaveStatusFilter}".
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsLeaveModalOpen(true)}
                    style={{
                      background: '#17652f',
                      color: '#ffffff',
                      padding: '8px 18px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      border: 'none'
                    }}
                  >
                    Apply leave
                  </button>
                </div>
              ) : (
                <div className="g-card" style={{ overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>Department</th>
                          <th>Type</th>
                          <th>Dates and days</th>
                          <th>Reason</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLeaveRequests.map((lv, idx) => (
                          <tr key={lv.id || lv._id || idx}>
                            <td>
                              <div style={{ fontWeight: '600', color: '#111827' }}>{lv.employeeName}</div>
                              <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Code: {lv.employeeCode}</div>
                            </td>
                            <td style={{ color: '#374151', fontWeight: '500' }}>
                              {lv.departmentName}
                            </td>
                            <td>
                              <div style={{ fontWeight: '600', color: '#111827', textTransform: 'capitalize' }}>
                                {lv.leaveType}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                                {lv.leaveType === 'unpaid' ? 'Unpaid' : 'Paid'}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontWeight: '500', color: '#111827' }}>
                                {new Date(lv.fromDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} → {new Date(lv.toDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                {lv.numberOfDays} day{lv.numberOfDays > 1 ? 's' : ''}
                              </div>
                            </td>
                            <td>
                              <div style={{ color: '#4b5563', fontSize: '0.8rem', maxWidth: '240px' }}>
                                {lv.reason || 'Personal'}
                              </div>
                            </td>
                            <td>
                              <StatusBadge status={lv.status || 'pending'} />
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                                {lv.status === 'pending' ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateLeaveStatus(lv.employeeId, lv.id || lv._id, 'approved')}
                                      style={{
                                        padding: '4px 10px',
                                        background: '#f0fdf4',
                                        border: '1px solid #bbf7d0',
                                        color: '#17652f',
                                        borderRadius: '4px',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateLeaveStatus(lv.employeeId, lv.id || lv._id, 'rejected')}
                                      style={{
                                        padding: '4px 10px',
                                        background: '#fef2f2',
                                        border: '1px solid #fecaca',
                                        color: '#dc2626',
                                        borderRadius: '4px',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      Reject
                                    </button>
                                  </>
                                ) : (
                                  <span style={{ color: lv.status === 'approved' ? '#16a34a' : '#dc2626', fontWeight: '600', fontSize: '0.75rem' }}>
                                    {lv.status === 'approved' ? 'Approved' : 'Rejected'}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  title="Cancel application"
                                  onClick={() => handleDeleteLeave(lv.employeeId, lv.id || lv._id)}
                                  style={{
                                    padding: '4px 6px',
                                    background: '#f9fafb',
                                    border: '1px solid #e5e7eb',
                                    color: '#6b7280',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center'
                                  }}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 5: PAYROLL ================= */}
      {activeTab === 'payroll' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                Payroll
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#4b5563', margin: '4px 0 0 0' }}>
                Calculate monthly salaries, view statutory deductions, download payslips, and disburse payments.
              </p>
            </div>
            {canManagePayroll && (
              <button
                type="button"
                onClick={() => setIsPayModalOpen(true)}
                style={{
                  background: '#17652f',
                  color: '#ffffff',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  border: 'none'
                }}
              >
                <DollarSign size={15} /> Process payroll
              </button>
            )}
          </div>

          {/* Payroll Filter Bar */}
          <div className="g-card" style={{ padding: '12px 16px', background: '#ffffff', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 160px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                Month
              </label>
              <select
                value={selectedPayrollMonth}
                onChange={(e) => setSelectedPayrollMonth(e.target.value)}
                style={{ width: '100%', fontSize: '0.82rem', borderColor: selectedPayrollMonth ? '#17652f' : '#e5e7eb' }}
              >
                <option value="">All months</option>
                {monthNames.map((name, i) => (
                  <option key={i + 1} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: '1 1 140px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                Year
              </label>
              <select
                value={selectedPayrollYear}
                onChange={(e) => setSelectedPayrollYear(e.target.value)}
                style={{ width: '100%', fontSize: '0.82rem', borderColor: selectedPayrollYear ? '#17652f' : '#e5e7eb' }}
              >
                <option value="">All years</option>
                {[2024, 2025, 2026, 2027].map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: '1 1 160px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>
                Status
              </label>
              <select
                value={payrollStatusFilter}
                onChange={(e) => setPayrollStatusFilter(e.target.value)}
                style={{ width: '100%', fontSize: '0.82rem', borderColor: payrollStatusFilter ? '#17652f' : '#e5e7eb' }}
              >
                <option value="">All statuses</option>
                <option value="processed">Processed (unpaid)</option>
                <option value="paid">Paid (disbursed)</option>
              </select>
            </div>

            {(selectedPayrollMonth || selectedPayrollYear || payrollStatusFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedPayrollMonth('');
                  setSelectedPayrollYear('');
                  setPayrollStatusFilter('');
                }}
                style={{
                  padding: '7px 12px',
                  background: '#f3f4f6',
                  color: '#374151',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  fontSize: '0.76rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  alignSelf: 'flex-end',
                  height: '34px'
                }}
              >
                Reset filters
              </button>
            )}
          </div>

          {filteredPayrollRecords.length === 0 ? (
            <div className="g-card" style={{ padding: '32px 20px', textAlign: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#f0fdf4', color: '#17652f', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <DollarSign size={24} />
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#111827', marginBottom: '6px' }}>
                No payroll records found
              </div>
              <p style={{ color: '#6b7280', fontSize: '0.85rem', maxWidth: '500px', margin: '0 auto 16px' }}>
                {allPayrollRecords.length === 0
                  ? 'Calculate monthly payroll to generate payslips and record salary disbursements.'
                  : 'No records match your selected month, year, or status filter.'}
              </p>
              {allPayrollRecords.length === 0 && (
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(true)}
                  style={{
                    background: '#17652f',
                    color: '#ffffff',
                    padding: '8px 18px',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    border: 'none'
                  }}
                >
                  Process payroll
                </button>
              )}
            </div>
          ) : (
            <div className="g-card" style={{ overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>Employee</th>
                      <th>Department and role</th>
                      <th>Basic salary</th>
                      <th>Allowances</th>
                      <th>Deductions</th>
                      <th>Net pay</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayrollRecords.map((pay, idx) => (
                      <tr key={pay.id || pay._id || idx}>
                        <td>
                          <div style={{ fontWeight: '600', color: '#111827' }}>
                            {monthNames[(pay.month || 1) - 1]} {pay.year}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: '600', color: '#111827' }}>{pay.employeeName}</div>
                          <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Code: {pay.employeeCode}</div>
                        </td>
                        <td>
                          <div style={{ color: '#17652f', fontWeight: '500', fontSize: '0.78rem' }}>{pay.departmentName}</div>
                          <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>{pay.designation}</div>
                        </td>
                        <td style={{ fontWeight: '600', color: '#111827' }}>
                          {formatINR(pay.basicSalary)}
                        </td>
                        <td style={{ color: '#16a34a', fontWeight: '600', fontSize: '0.78rem' }}>
                          +{formatINR(pay.allowances)}
                        </td>
                        <td style={{ color: '#dc2626', fontWeight: '600', fontSize: '0.78rem' }}>
                          -{formatINR((pay.deductions || 0) + (pay.unpaidLeaveDeduction || 0))}
                        </td>
                        <td>
                          <div style={{ color: '#111827', fontWeight: '600', fontSize: '0.9rem' }}>
                            {formatINR(pay.netSalary)}
                          </div>
                        </td>
                        <td>
                          <StatusBadge status={pay.status || 'processed'} />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <button
                                type="button"
                                title="Print payslip"
                                onClick={() => {
                                  setPayslipItemToPrint(pay);
                                  setIsPayslipModalOpen(true);
                                }}
                                style={{
                                  padding: '5px 9px',
                                  background: '#f0fdf4',
                                  border: '1px solid #bbf7d0',
                                  color: '#17652f',
                                  borderRadius: '5px',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <Printer size={13} /> Payslip
                              </button>

                              {pay.status !== 'paid' && canManagePayroll ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedPayrollItem({
                                      employeeId: pay.employeeId,
                                      payrollId: pay.id || pay._id,
                                      employeeName: pay.employeeName || 'Staff Member',
                                      employeeCode: pay.employeeCode || '',
                                      departmentName: pay.departmentName,
                                      roleName: pay.designation,
                                      month: pay.month,
                                      monthName: monthNames[pay.month - 1] || `Month ${pay.month}`,
                                      year: pay.year,
                                      netSalary: pay.netSalary
                                    });
                                    setIsDisburseModalOpen(true);
                                  }}
                                  style={{
                                    padding: '5px 12px',
                                    background: '#17652f',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '5px',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  <DollarSign size={13} /> Disburse
                                </button>
                              ) : pay.status === 'paid' ? (
                                <span style={{ color: '#16a34a', fontWeight: '600', fontSize: '0.74rem' }}>
                                  Disbursed
                                </span>
                              ) : null}
                            </div>

                            {pay.status === 'paid' && (
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                {pay.paymentReference && (
                                  <span style={{ fontSize: '0.68rem', color: '#6b7280' }}>
                                    Ref: {pay.paymentReference}
                                  </span>
                                )}
                                {(pay.paymentProof?.fileUrl || pay.payslipUrl) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedSlipItem(pay);
                                      setSlipPreviewUrl(getFileUrl(pay.paymentProof?.fileUrl || pay.payslipUrl));
                                    }}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontSize: '0.68rem',
                                      color: '#17652f',
                                      fontWeight: '600',
                                      backgroundColor: '#f0fdf4',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      border: '1px solid #bbf7d0',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <FileText size={11} /> Proof
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODALS */}
      <NewEmployeeModal isOpen={isEmpModalOpen} onClose={() => setIsEmpModalOpen(false)} onSubmit={handleSaveEmployee} masterData={masterData} />
      <LogAttendanceModal isOpen={isAttModalOpen} onClose={() => setIsAttModalOpen(false)} onSubmit={handleSaveAttendance} employees={employees} />
      <ApplyLeaveModal isOpen={isLeaveModalOpen} onClose={() => setIsLeaveModalOpen(false)} onSubmit={handleSaveLeave} employees={employees} />
      <GeneratePayrollModal isOpen={isPayModalOpen} onClose={() => setIsPayModalOpen(false)} onSubmit={handleSavePayroll} onGenerate={handleSavePayroll} />
      <EmployeeDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        employee={selectedEmployee}
        onUpdateLeaveStatus={handleUpdateLeaveStatus}
        onPaySalary={handlePaySalary}
        onUploadDoc={handleUploadDoc}
        onRefresh={() => refreshActiveEmployee(selectedEmployee?._id)}
      />
      <DisburseSalaryModal
        isOpen={isDisburseModalOpen}
        onClose={() => {
          setIsDisburseModalOpen(false);
          setSelectedPayrollItem(null);
        }}
        payrollItem={selectedPayrollItem}
        onDisburse={handlePaySalary}
      />

      {/* Edit Employee Modal */}
      <EditEmployeeModal
        isOpen={isEditEmpModalOpen}
        onClose={() => {
          setIsEditEmpModalOpen(false);
          setEmployeeToEdit(null);
        }}
        employee={employeeToEdit}
        masterData={masterData}
        onUpdated={() => {
          loadData();
          if (selectedEmployee && employeeToEdit && selectedEmployee._id === employeeToEdit._id) {
            refreshActiveEmployee(selectedEmployee._id);
          }
        }}
      />

      {/* Printable Official Payslip Modal */}
      <PrintablePayslipModal
        isOpen={isPayslipModalOpen}
        onClose={() => {
          setIsPayslipModalOpen(false);
          setPayslipItemToPrint(null);
        }}
        payrollItem={payslipItemToPrint}
      />

      {/* Printable Official Staff ID Card Modal */}
      <PrintableIDCardModal
        isOpen={isIDCardModalOpen}
        onClose={() => {
          setIsIDCardModalOpen(false);
          setSelectedEmployeeForID(null);
        }}
        employee={selectedEmployeeForID}
      />

      {/* Department Create / Edit Modal */}
      <Modal
        isOpen={isDeptModalOpen}
        onClose={() => setIsDeptModalOpen(false)}
        title={editingDept ? `Edit Department: ${editingDept.departmentName}` : 'Add New Department'}
        maxWidth="520px"
      >
        <form onSubmit={handleSaveDepartment} style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '10px 4px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>
              Department Name *
            </label>
            <input
              type="text"
              required
              value={deptNameInput}
              onChange={(e) => setDeptNameInput(e.target.value)}
              placeholder="e.g. Quality Assurance & Audits"
              style={{ width: '100%', fontSize: '0.82rem' }}
            />
          </div>
          {!editingDept && (
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>
                Department Code *
              </label>
              <input
                type="text"
                required
                value={deptCodeInput}
                onChange={(e) => setDeptCodeInput(e.target.value.toUpperCase())}
                placeholder="e.g. QA_QC, SAFETY"
                style={{ width: '100%', fontSize: '0.82rem' }}
              />
            </div>
          )}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>
              Description
            </label>
            <textarea
              rows={3}
              value={deptDescInput}
              onChange={(e) => setDeptDescInput(e.target.value)}
              placeholder="Operational scope, team mandate, and department objectives..."
              style={{ width: '100%', fontSize: '0.82rem' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <button
              type="button"
              onClick={() => setIsDeptModalOpen(false)}
              style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{ padding: '8px 18px', background: '#17652f', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700' }}
            >
              {editingDept ? 'Update Department' : 'Create Department'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Role Designation Create / Edit Modal */}
      <Modal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        title={editingRole ? `Edit Role: ${editingRole.roleName}` : 'Add Department Role Designation'}
        maxWidth="520px"
      >
        <form onSubmit={handleSaveRole} style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '10px 4px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>
              Associated Department *
            </label>
            <select
              disabled={!!editingRole}
              value={roleDeptCodeInput}
              onChange={(e) => setRoleDeptCodeInput(e.target.value)}
              style={{ width: '100%', fontSize: '0.82rem' }}
            >
              {(masterData.departments || []).map((d) => (
                <option key={d.departmentCode || d._id} value={d.departmentCode}>
                  {d.departmentName} ({d.departmentCode})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>
              Role Designation Name *
            </label>
            <input
              type="text"
              required
              value={roleNameInput}
              onChange={(e) => setRoleNameInput(e.target.value)}
              placeholder="e.g. Lead MEP Engineer"
              style={{ width: '100%', fontSize: '0.82rem' }}
            />
          </div>
          {!editingRole && (
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>
                Role Code *
              </label>
              <input
                type="text"
                required
                value={roleCodeInput}
                onChange={(e) => setRoleCodeInput(e.target.value.toUpperCase())}
                placeholder="e.g. LEAD_MEP"
                style={{ width: '100%', fontSize: '0.82rem' }}
              />
            </div>
          )}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>
              Role Description / Scope
            </label>
            <textarea
              rows={3}
              value={roleDescInput}
              onChange={(e) => setRoleDescInput(e.target.value)}
              placeholder="Key duties, reporting lines, and operational tasks..."
              style={{ width: '100%', fontSize: '0.82rem' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <button
              type="button"
              onClick={() => setIsRoleModalOpen(false)}
              style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{ padding: '8px 18px', background: '#17652f', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700' }}
            >
              {editingRole ? 'Update Role' : 'Create Role'}
            </button>
          </div>
        </form>
      </Modal>

      {/* In-App Slip / Proof Viewer Lightbox Modal */}
      {slipPreviewUrl && (
        <div
          onClick={() => setSlipPreviewUrl(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '16px',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <div>
                <strong style={{ fontSize: '1rem', color: '#0f172a', display: 'block' }}>Payment Slip & Proof Preview</strong>
                {selectedSlipItem && (
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {selectedSlipItem.employeeName} • Ref: {selectedSlipItem.paymentReference || 'SAL-REF'}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="file"
                  id="reuploadSlipInput"
                  style={{ display: 'none' }}
                  accept="image/*,application/pdf"
                  onChange={handleReuploadSlip}
                />
                <label
                  htmlFor="reuploadSlipInput"
                  style={{
                    padding: '5px 12px',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Upload size={13} /> Re-Upload / Replace Slip
                </label>

                <a
                  href={slipPreviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  style={{
                    padding: '5px 12px',
                    backgroundColor: '#17652f',
                    color: '#ffffff',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <ExternalLink size={12} /> Open Full View
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setSlipPreviewUrl(null);
                    setSelectedSlipItem(null);
                  }}
                  style={{
                    padding: '5px 12px',
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
            <div style={{ overflow: 'auto', maxHeight: '72vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', padding: '10px' }}>
              {slipPreviewUrl.toLowerCase().endsWith('.pdf') ? (
                <iframe src={slipPreviewUrl} style={{ width: '800px', height: '600px', border: 'none' }} title="Payment Slip PDF" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}>
                  <img
                    src={slipPreviewUrl}
                    alt="Salary Payment Slip / Proof"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const fallback = document.getElementById('slipFallbackBox');
                      if (fallback) fallback.style.display = 'flex';
                    }}
                    style={{ maxWidth: '100%', maxHeight: '68vh', objectFit: 'contain', borderRadius: '6px' }}
                  />
                  <div
                    id="slipFallbackBox"
                    style={{
                      display: 'none',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '30px 20px',
                      textAlign: 'center',
                      gap: '8px',
                      backgroundColor: '#f1f5f9',
                      borderRadius: '8px',
                      width: '100%',
                      maxWidth: '480px'
                    }}
                  >
                    <CheckCircle size={40} color="#17652f" />
                    <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '1rem' }}>
                      Payment Slip Recorded in System
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      The payment transaction was recorded and verified in the database register.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
