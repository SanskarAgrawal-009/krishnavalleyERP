import React, { useState, useEffect } from 'react';
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
      alert('✅ Payment slip proof successfully uploaded & permanently stored!');
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#111827' }}>
              Human Resources & Workforce Management
            </h2>
            <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: '#e8f0fe', color: '#1a73e8', fontWeight: '700' }}>
              STAFF HUB
            </span>
          </div>
          <p style={{ color: '#4b5563', fontSize: '0.82rem', marginTop: '2px' }}>
            Employee directory, site shift attendance rosters, leave applications, and monthly staff payroll registers.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            background: '#ffffff',
            border: '1px solid #dadce0',
            borderRadius: '6px',
            color: '#374151',
            fontSize: '0.8rem',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          Refresh Data
        </button>
      </div>

      {/* KPI Stats Ribbon */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: '12px'
      }}>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>ACTIVE HEADCOUNT</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#e8f0fe', color: '#1a73e8' }}>
              <Users size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#111827', marginTop: '4px' }}>
            {summary.activeStaff} <span style={{ fontSize: '0.85rem', color: '#4b5563', fontWeight: '500' }}>/ {summary.totalEmployees}</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#4b5563', fontWeight: '600' }}>Permanent on-roll staff</span>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>ON LEAVE TODAY</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: (summary.staffOnLeaveToday || 0) > 0 ? '#fef3c7' : '#e6f4ea', color: (summary.staffOnLeaveToday || 0) > 0 ? '#b45309' : '#137333' }}>
              <Calendar size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: (summary.staffOnLeaveToday || 0) > 0 ? '#b45309' : '#137333', marginTop: '4px' }}>
            {summary.staffOnLeaveToday || 0}
          </div>
          <span style={{ fontSize: '0.72rem', color: (summary.staffOnLeaveToday || 0) > 0 ? '#b45309' : '#137333', fontWeight: '600' }}>
            {(summary.staffOnLeaveToday || 0) > 0 ? 'Staff absent on leave' : 'Full team available'}
          </span>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>ID BADGES ISSUED</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#eff6ff', color: '#1d4ed8' }}>
              <ShieldCheck size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1d4ed8', marginTop: '4px' }}>
            {summary.totalIdCardsIssued !== undefined ? summary.totalIdCardsIssued : employees.filter(e => e.idCardDetails?.idCardIssued).length}
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}> / {employees.length}</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#1d4ed8', fontWeight: '600' }}>Official cards in circulation</span>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>PENDING LEAVES</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#fef7e0', color: '#b06000' }}>
              <Clock size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#b06000', marginTop: '4px' }}>
            {summary.pendingLeavesCount}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#4b5563', fontWeight: '600' }}>HR approval required</span>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>MONTHLY PAYROLL</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#f3e8ff', color: '#8b5cf6' }}>
              <DollarSign size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#8b5cf6', marginTop: '4px' }}>
            {formatINR(summary.monthlyPayrollOutflow)}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#4b5563', fontWeight: '600' }}>Salary & benefits total</span>
        </div>
      </div>

      {/* Sub-Tab Navigation Header */}
      <div className="g-card" style={{
        display: 'flex',
        padding: '6px',
        gap: '6px',
        overflowX: 'auto'
      }}>
        {[
          { id: 'directory', label: `Staff Directory (${filteredEmployees.length})` },
          { id: 'id_cards', label: `Staff ID Badges & Identity (${employees.length})` },
          { id: 'leaves', label: `Leave Quotas & Ledger (${allLeaveRequests.length})` },
          { id: 'attendance', label: `Daily Shift Attendance (${allAttendanceLogs.length})` },
          { id: 'payroll', label: `Monthly Payroll Register (${allPayrollRecords.length})` },
          { id: 'dept_roles', label: `Departments & Roles (${masterData.departments?.length || 8})` }
        ].map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              type="button"
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                flex: '1 1 auto',
                padding: '9px 16px',
                borderRadius: '6px',
                background: isSelected ? '#1a73e8' : 'transparent',
                color: isSelected ? '#ffffff' : '#374151',
                fontWeight: isSelected ? '800' : '600',
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
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111827' }}>Employee Directory</h3>
              <p style={{ fontSize: '0.76rem', color: '#6b7280', margin: 0 }}>Showing {filteredEmployees.length} of {employees.length} total staff members</p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              {employees.length === 0 && (
                <button
                  type="button"
                  onClick={handleSeedSampleStaff}
                  style={{
                    background: '#e6f4ea',
                    color: '#137333',
                    border: '1px solid #ceead6',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <Sparkles size={14} /> Populate Sample Staff
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsEmpModalOpen(true)}
                style={{
                  background: '#1a73e8',
                  color: '#ffffff',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  border: 'none'
                }}
              >
                <Plus size={15} /> Onboard New Employee
              </button>
            </div>
          </div>

          {/* DYNAMIC DEPARTMENT & ROLE FILTER BAR */}
          <div className="g-card" style={{ padding: '12px 16px', background: '#ffffff', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1.2 1 200px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '4px' }}>Search Staff</label>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input
                  type="text"
                  placeholder="Search name, code, email, phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: '100%', paddingLeft: '30px', fontSize: '0.82rem' }}
                />
              </div>
            </div>

            <div style={{ flex: '1 1 180px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '4px' }}>
                🏢 Department ({masterData.departments?.length || 0})
              </label>
              <select
                value={departmentFilter}
                onChange={(e) => {
                  setDepartmentFilter(e.target.value);
                  setRoleFilter(''); // Reset role when department changes
                }}
                style={{ width: '100%', fontSize: '0.82rem', borderColor: departmentFilter ? '#1a73e8' : '#dadce0', fontWeight: departmentFilter ? '700' : 'normal' }}
              >
                <option value="">All Departments</option>
                {(masterData.departments || []).map((d) => (
                  <option key={d._id || d.departmentCode} value={d.departmentCode}>
                    {d.departmentName} ({d.departmentCode})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: '1 1 180px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '4px' }}>
                💼 Role / Designation ({activeDeptRoles.length} in Dept)
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{ width: '100%', fontSize: '0.82rem', borderColor: roleFilter ? '#137333' : '#dadce0', fontWeight: roleFilter ? '700' : 'normal' }}
              >
                <option value="">{departmentFilter ? `All Roles in Dept` : `All Roles`}</option>
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
                style={{
                  padding: '7px 12px',
                  background: '#fef2f2',
                  color: '#ba1a1a',
                  borderRadius: '6px',
                  border: '1px solid #fecaca',
                  fontSize: '0.76rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  alignSelf: 'flex-end',
                  height: '34px'
                }}
              >
                Reset Filters
              </button>
            )}
          </div>

          <div className="g-card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Staff Name & Code</th>
                    <th>Department</th>
                    <th>Role Designation</th>
                    <th>Phone / Email</th>
                    <th>Monthly Salary</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#e8f0fe', color: '#1a73e8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                          <Users size={24} />
                        </div>
                        <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#111827', marginBottom: '6px' }}>
                          No Employees Found
                        </div>
                        <p style={{ color: '#4b5563', fontSize: '0.85rem', maxWidth: '460px', margin: '0 auto 16px' }}>
                          {employees.length === 0
                            ? 'Your staff directory is currently empty. You can onboard new staff manually or initialize sample staff across site engineering, architecture, accounts, and facilities.'
                            : 'No employees match the selected department, designation or search filters.'}
                        </p>
                        {employees.length === 0 && (
                          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => setIsEmpModalOpen(true)}
                              style={{
                                background: '#1a73e8',
                                color: '#ffffff',
                                padding: '8px 18px',
                                borderRadius: '6px',
                                fontSize: '0.82rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                border: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <Plus size={15} /> Onboard New Employee
                            </button>
                            <button
                              type="button"
                              onClick={handleSeedSampleStaff}
                              style={{
                                background: '#0d904f',
                                color: '#ffffff',
                                padding: '8px 18px',
                                borderRadius: '6px',
                                fontSize: '0.82rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                border: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <Sparkles size={15} /> Initialize Sample Staff (6 Members)
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <tr key={emp._id || emp.id}>
                        <td>
                          <div style={{ fontWeight: '700', color: '#111827' }}>{emp.firstName} {emp.lastName}</div>
                          <div style={{ fontSize: '0.72rem', color: '#4b5563' }}>Emp Code: {emp.employeeCode}</div>
                        </td>
                        <td style={{ color: '#374151', fontWeight: '600' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Building2 size={14} color="#1a73e8" />
                            <span>{emp.departmentName || emp.departmentId?.departmentName || emp.departmentId?.name || emp.department || 'Civil & Structural Engineering'}</span>
                          </div>
                        </td>
                        <td style={{ color: '#111827', fontWeight: '700' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Briefcase size={14} color="#137333" />
                            <span>{emp.designation || emp.roleName || emp.roleId?.roleName || emp.roleId?.name || emp.role || 'Senior Site Engineer'}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ color: '#1a73e8', fontWeight: '600' }}>{emp.phone || emp.mobileNo || 'N/A'}</div>
                          <div style={{ fontSize: '0.72rem', color: '#4b5563' }}>{emp.email || ''}</div>
                        </td>
                        <td style={{ color: '#111827', fontWeight: '800' }}>
                          {formatINR(emp.salaryStructure?.basicSalary || (emp.payroll && emp.payroll[0]?.basicSalary) || emp.salary || 45000)}
                        </td>
                        <td>
                          <StatusBadge status={emp.employmentStatus} />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                            <button
                              type="button"
                              title="Print Official Staff ID Badge"
                              onClick={() => {
                                setSelectedEmployeeForID(emp);
                                setIsIDCardModalOpen(true);
                              }}
                              style={{
                                padding: '5px 9px',
                                background: '#fef3c7',
                                border: '1px solid #fde68a',
                                color: '#92400e',
                                borderRadius: '5px',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <CreditCard size={13} /> ID Card
                            </button>
                            <button
                              type="button"
                              title="View Staff Dossier"
                              onClick={() => {
                                setSelectedEmployee(emp);
                                setIsDetailModalOpen(true);
                              }}
                              style={{
                                padding: '5px 9px',
                                background: '#f1f5f9',
                                border: '1px solid #cbd5e1',
                                color: '#0f172a',
                                borderRadius: '5px',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Eye size={13} /> Dossier
                            </button>
                            <button
                              type="button"
                              title="Edit Employee Profile"
                              onClick={() => handleOpenEdit(emp)}
                              style={{
                                padding: '5px 9px',
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                color: '#1d4ed8',
                                borderRadius: '5px',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Edit2 size={13} /> Edit
                            </button>
                            <button
                              type="button"
                              title="Delete Employee"
                              onClick={() => handleDeleteEmployee(emp)}
                              style={{
                                padding: '5px 7px',
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                color: '#dc2626',
                                borderRadius: '5px',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center'
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#111827', margin: 0 }}>
                  Official Staff Identity Cards & Badge Hub
                </h3>
                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: '#fef3c7', color: '#92400e', fontWeight: '800' }}>
                  CENTRAL HR CREDENTIALING
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#4b5563', margin: '4px 0 0 0' }}>
                Generate, review, and print physical company identification cards for all Krishna Valley staff. Standardized with official corporate branding, security QR code, emergency contacts, blood group, and government identity vault.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsEmpModalOpen(true)}
              style={{
                background: '#1a73e8',
                color: '#ffffff',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                border: 'none',
                boxShadow: '0 2px 4px rgba(26, 115, 232, 0.2)'
              }}
            >
              <Plus size={15} /> Onboard Staff For ID Card
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: '700', color: '#64748b', display: 'block' }}>TOTAL STAFF IN REGISTRY</span>
              <strong style={{ fontSize: '1.25rem', color: '#0f172a' }}>{employees.length}</strong>
              <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>Personnel on records</span>
            </div>
            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '10px 14px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: '700', color: '#047857', display: 'block' }}>PHYSICAL CARDS ISSUED</span>
              <strong style={{ fontSize: '1.25rem', color: '#065f46' }}>
                {employees.filter(e => e.idCardDetails?.idCardIssued).length}
              </strong>
              <span style={{ fontSize: '0.68rem', color: '#047857', display: 'block' }}>Badges delivered to staff</span>
            </div>
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '10px 14px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: '700', color: '#1d4ed8', display: 'block' }}>AADHAAR & PAN KYC LINKED</span>
              <strong style={{ fontSize: '1.25rem', color: '#1e40af' }}>
                {employees.filter(e => e.idCardDetails?.aadhaarNumber && e.idCardDetails?.panNumber).length}
              </strong>
              <span style={{ fontSize: '0.68rem', color: '#1d4ed8', display: 'block' }}>Govt verified IDs on file</span>
            </div>
            <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', padding: '10px 14px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: '700', color: '#be123c', display: 'block' }}>BLOOD GROUP RECORDED</span>
              <strong style={{ fontSize: '1.25rem', color: '#9f1239' }}>
                {employees.filter(e => e.bloodGroup).length}
              </strong>
              <span style={{ fontSize: '0.68rem', color: '#be123c', display: 'block' }}>Emergency medical badge tag</span>
            </div>
          </div>

          {/* Search & Department Filter Bar */}
          <div className="g-card" style={{ padding: '12px 16px', background: '#ffffff', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: '1.5 1 220px', position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                type="text"
                placeholder="Search staff by name, code, designation, phone..."
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
                <option value="">All Departments ({employees.length} Staff)</option>
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
                style={{
                  padding: '7px 12px',
                  background: '#fef2f2',
                  color: '#ba1a1a',
                  borderRadius: '6px',
                  border: '1px solid #fecaca',
                  fontSize: '0.76rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Reset Filter
              </button>
            )}
          </div>

          {/* ID Card Badges Grid */}
          {filteredIDCardEmployees.length === 0 ? (
            <div className="g-card" style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#eff6ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <ShieldCheck size={28} />
              </div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>
                No Staff ID Cards Found
              </h4>
              <p style={{ fontSize: '0.82rem', color: '#64748b', maxWidth: '420px', margin: '0 auto 16px' }}>
                No employees match your search query or department filter. Onboard new staff or reset your filter.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '16px' }}>
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
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                    }}
                  >
                    {/* Simulated Lanyard Hole */}
                    <div style={{ background: '#f8fafc', padding: '6px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'center' }}>
                      <div style={{ width: '38px', height: '8px', background: '#cbd5e1', borderRadius: '4px' }} />
                    </div>

                    {/* Official Badge Header Strip */}
                    <div style={{
                      background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
                      padding: '10px 14px',
                      color: '#ffffff',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: '900', letterSpacing: '1px', color: '#f59e0b' }}>
                          KRISHNA VALLEY
                        </div>
                        <div style={{ fontSize: '0.62rem', color: '#93c5fd', fontWeight: '700', letterSpacing: '0.5px' }}>
                          OFFICIAL IDENTITY CARD
                        </div>
                      </div>

                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.65rem',
                        fontWeight: '800',
                        background: isIssued ? '#10b981' : '#f59e0b',
                        color: '#ffffff'
                      }}>
                        {isIssued ? 'ISSUED' : 'READY TO PRINT'}
                      </span>
                    </div>

                    {/* Card Body */}
                    <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                      {/* Photo + Identity Details */}
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {/* Avatar */}
                        <div style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.2rem',
                          fontWeight: '800',
                          border: '2px solid #bfdbfe',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          flexShrink: 0
                        }}>
                          {emp.idCardDetails?.photoUrl ? (
                            <img src={emp.idCardDetails.photoUrl} alt={fullName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }} />
                          ) : (
                            initials
                          )}
                        </div>

                        {/* Text info */}
                        <div style={{ overflow: 'hidden' }}>
                          <h4 style={{ fontSize: '0.98rem', fontWeight: '800', color: '#0f172a', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {fullName}
                          </h4>
                          <div style={{ display: 'inline-block', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '1px 6px', fontSize: '0.72rem', fontWeight: '800', color: '#1d4ed8', fontFamily: 'monospace', marginTop: '2px' }}>
                            {emp.employeeCode}
                          </div>
                          <div style={{ fontSize: '0.76rem', color: '#475569', fontWeight: '700', marginTop: '2px' }}>
                            {roleName}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                            {deptName}
                          </div>
                        </div>
                      </div>

                      {/* Detail Badges Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <div>
                          <span style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: '700', display: 'block' }}>BLOOD GROUP</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Heart size={11} fill="#dc2626" /> {bloodGroup}
                          </span>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: '700', display: 'block' }}>WORK LOCATION</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#0f172a' }}>
                            {emp.workLocation || 'Site & HQ'}
                          </span>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: '700', display: 'block' }}>AADHAAR KYC</span>
                          <span style={{ fontSize: '0.72rem', fontWeight: '700', color: emp.idCardDetails?.aadhaarNumber ? '#15803d' : '#b45309' }}>
                            {emp.idCardDetails?.aadhaarNumber ? `✓ •••• ${emp.idCardDetails.aadhaarNumber.slice(-4)}` : '⚠ Missing'}
                          </span>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: '700', display: 'block' }}>PAN CARD</span>
                          <span style={{ fontSize: '0.72rem', fontWeight: '700', color: emp.idCardDetails?.panNumber ? '#15803d' : '#b45309' }}>
                            {emp.idCardDetails?.panNumber ? `✓ ${emp.idCardDetails.panNumber}` : '⚠ Missing'}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: '6px', marginTop: 'auto', paddingTop: '6px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEmployeeForID(emp);
                            setIsIDCardModalOpen(true);
                          }}
                          style={{
                            flex: 1,
                            padding: '7px 10px',
                            background: '#1e3a8a',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.76rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                            boxShadow: '0 2px 4px rgba(30, 58, 138, 0.2)'
                          }}
                        >
                          <Printer size={13} /> Print ID Card
                        </button>
                        <button
                          type="button"
                          title="Edit Employee KYC & Badges"
                          onClick={() => handleOpenEdit(emp)}
                          style={{
                            padding: '7px 10px',
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            color: '#1d4ed8',
                            borderRadius: '6px',
                            fontSize: '0.76rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Edit2 size={13} /> Edit
                        </button>
                        <button
                          type="button"
                          title="View Full Dossier"
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setIsDetailModalOpen(true);
                          }}
                          style={{
                            padding: '7px 10px',
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            color: '#0f172a',
                            borderRadius: '6px',
                            fontSize: '0.76rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center'
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
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111827' }}>Department & Role Hierarchy Matrix</h3>
              <p style={{ fontSize: '0.76rem', color: '#6b7280', margin: 0 }}>Every department maintains distinct dedicated roles and operational scopes.</p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenDeptModal(null)}
              style={{
                background: '#1a73e8',
                color: '#ffffff',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                border: 'none'
              }}
            >
              <Plus size={15} /> Add New Department
            </button>
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
                <div key={dept._id || dept.departmentCode} className="g-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '0.68rem', padding: '2px 6px', background: '#e8f0fe', color: '#1a73e8', fontWeight: '800', borderRadius: '4px' }}>
                        CODE: {dept.departmentCode}
                      </span>
                      <h4 style={{ fontSize: '0.98rem', fontWeight: '800', color: '#111827', marginTop: '4px' }}>
                        {dept.departmentName}
                      </h4>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', padding: '4px 8px', borderRadius: '12px', background: '#e6f4ea', color: '#137333', fontWeight: '700' }}>
                        {deptStaffCount} Staff
                      </span>
                      <button
                        type="button"
                        title="Edit Department"
                        onClick={() => handleOpenDeptModal(dept)}
                        style={{
                          padding: '4px 6px',
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          color: '#1d4ed8',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        <Edit2 size={12} />
                      </button>
                      {deptStaffCount === 0 && (
                        <button
                          type="button"
                          title="Delete Department"
                          onClick={() => handleDeleteDepartment(dept)}
                          style={{
                            padding: '4px 6px',
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
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

                  <p style={{ fontSize: '0.76rem', color: '#4b5563', margin: 0, lineHeight: '1.4' }}>
                    {dept.description || 'Department operational unit.'}
                  </p>

                  <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '10px', marginTop: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#374151', textTransform: 'uppercase' }}>
                        Roles & Designations ({deptRoles.length}):
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenRoleModal(dept.departmentCode, null)}
                        style={{
                          padding: '3px 8px',
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          color: '#0f172a',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Plus size={11} /> Add Role
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
                              <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#111827' }}>
                                {role.roleName}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: '#6b7280' }}>
                                Code: <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{role.roleCode}</span> • {role.description || 'Department Role'}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '0.7rem', fontWeight: '700', color: roleStaff > 0 ? '#1a73e8' : '#9ca3af' }}>
                                {roleStaff} staff
                              </span>
                              <button
                                type="button"
                                title="Edit Role"
                                onClick={() => handleOpenRoleModal(dept.departmentCode, role)}
                                style={{
                                  padding: '3px 5px',
                                  background: '#eff6ff',
                                  border: '1px solid #bfdbfe',
                                  color: '#1d4ed8',
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                              >
                                <Edit2 size={11} />
                              </button>
                              {roleStaff === 0 && (
                                <button
                                  type="button"
                                  title="Delete Role"
                                  onClick={() => handleDeleteRole(role)}
                                  style={{
                                    padding: '3px 5px',
                                    background: '#fef2f2',
                                    border: '1px solid #fecaca',
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
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111827' }}>
                Shift Attendance & Biometric Rosters
              </h3>
              <p style={{ fontSize: '0.76rem', color: '#6b7280', margin: 0 }}>
                Record daily site attendance rosters, mark presence, half-days, late arrivals, and generate attendance logs.
              </p>
            </div>

            {/* Mode Switch & Log Single Modal Button */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                <button
                  type="button"
                  onClick={() => setAttendanceViewMode('roster')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '4px',
                    border: 'none',
                    background: attendanceViewMode === 'roster' ? '#1a73e8' : 'transparent',
                    color: attendanceViewMode === 'roster' ? '#ffffff' : '#475569',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  📅 Daily Roster Mode
                </button>
                <button
                  type="button"
                  onClick={() => setAttendanceViewMode('history')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '4px',
                    border: 'none',
                    background: attendanceViewMode === 'history' ? '#1a73e8' : 'transparent',
                    color: attendanceViewMode === 'history' ? '#ffffff' : '#475569',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  📜 Attendance History Logs ({allAttendanceLogs.length})
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsAttModalOpen(true)}
                style={{
                  background: '#137333',
                  color: '#ffffff',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  border: 'none'
                }}
              >
                <Clock size={14} /> Single Entry Modal
              </button>
            </div>
          </div>

          {/* MODE A: DAILY ROSTER MODE */}
          {attendanceViewMode === 'roster' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* Date Selector & Quick Actions Ribbon */}
              <div className="g-card" style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: '#ffffff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                      Roster Date:
                    </label>
                    <input
                      type="date"
                      value={selectedAttendanceDate}
                      onChange={(e) => setSelectedAttendanceDate(e.target.value)}
                      style={{ padding: '6px 10px', fontSize: '0.85rem', fontWeight: '700', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '16px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date().toISOString().slice(0, 10);
                        setSelectedAttendanceDate(today);
                      }}
                      style={{ padding: '6px 10px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const yest = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
                        setSelectedAttendanceDate(yest);
                      }}
                      style={{ padding: '6px 10px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}
                    >
                      Yesterday
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleMarkAllPresent}
                    style={{
                      padding: '8px 16px',
                      background: '#e6f4ea',
                      color: '#137333',
                      border: '1px solid #ceead6',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <CheckCircle2 size={15} /> ⚡ Mark All Active Present
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveDailyRoster}
                    disabled={rosterLoading || rosterData.length === 0}
                    style={{
                      padding: '8px 20px',
                      background: '#1a73e8',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 4px rgba(26, 115, 232, 0.25)'
                    }}
                  >
                    <Check size={16} /> Save Daily Roster
                  </button>
                </div>
              </div>

              {/* Roster Table */}
              <div className="g-card" style={{ overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Staff Member & Code</th>
                        <th>Department & Role</th>
                        <th style={{ textAlign: 'center' }}>Attendance Status Toggle</th>
                        <th>Shift Hours</th>
                        <th>Shift Remarks / Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rosterLoading ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                            Loading roster for {selectedAttendanceDate}...
                          </td>
                        </tr>
                      ) : rosterData.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                            No active employees found to mark attendance. Onboard staff or initialize sample staff first.
                          </td>
                        </tr>
                      ) : (
                        rosterData.map((r) => {
                          const status = r.status || 'present';
                          return (
                            <tr key={r.employeeId}>
                              <td>
                                <div style={{ fontWeight: '700', color: '#111827' }}>{r.employeeName}</div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Code: {r.employeeCode}</div>
                              </td>
                              <td>
                                <div style={{ color: '#1a73e8', fontWeight: '600', fontSize: '0.8rem' }}>{r.departmentName}</div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{r.designation}</div>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <div style={{ display: 'inline-flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '6px' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleRosterStatusChange(r.employeeId, 'present')}
                                    style={{
                                      padding: '4px 10px',
                                      borderRadius: '4px',
                                      border: 'none',
                                      background: status === 'present' ? '#137333' : 'transparent',
                                      color: status === 'present' ? '#ffffff' : '#334155',
                                      fontSize: '0.72rem',
                                      fontWeight: '700',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Present
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRosterStatusChange(r.employeeId, 'late')}
                                    style={{
                                      padding: '4px 10px',
                                      borderRadius: '4px',
                                      border: 'none',
                                      background: status === 'late' ? '#b06000' : 'transparent',
                                      color: status === 'late' ? '#ffffff' : '#334155',
                                      fontSize: '0.72rem',
                                      fontWeight: '700',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Late
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRosterStatusChange(r.employeeId, 'half_day')}
                                    style={{
                                      padding: '4px 10px',
                                      borderRadius: '4px',
                                      border: 'none',
                                      background: status === 'half_day' ? '#8b5cf6' : 'transparent',
                                      color: status === 'half_day' ? '#ffffff' : '#334155',
                                      fontSize: '0.72rem',
                                      fontWeight: '700',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Half-Day
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRosterStatusChange(r.employeeId, 'absent')}
                                    style={{
                                      padding: '4px 10px',
                                      borderRadius: '4px',
                                      border: 'none',
                                      background: status === 'absent' ? '#c5221f' : 'transparent',
                                      color: status === 'absent' ? '#ffffff' : '#334155',
                                      fontSize: '0.72rem',
                                      fontWeight: '700',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Absent
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRosterStatusChange(r.employeeId, 'leave')}
                                    style={{
                                      padding: '4px 10px',
                                      borderRadius: '4px',
                                      border: 'none',
                                      background: status === 'leave' ? '#0284c7' : 'transparent',
                                      color: status === 'leave' ? '#ffffff' : '#334155',
                                      fontSize: '0.72rem',
                                      fontWeight: '700',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Leave
                                  </button>
                                </div>
                              </td>
                              <td>
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
                                  style={{ width: '65px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem', textAlign: 'center', fontWeight: '700' }}
                                />
                                <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: '4px' }}>hrs</span>
                              </td>
                              <td>
                                <input
                                  type="text"
                                  value={r.remarks || ''}
                                  onChange={(e) => handleRosterRemarksChange(r.employeeId, e.target.value)}
                                  placeholder="e.g. Regular site shift / tower B inspection"
                                  style={{ width: '100%', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.78rem' }}
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
                <div className="g-card" style={{ padding: '32px 20px', textAlign: 'center' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#e6f4ea', color: '#137333', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <Clock size={24} />
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#111827', marginBottom: '6px' }}>
                    No Attendance Logs Yet
                  </div>
                  <p style={{ color: '#4b5563', fontSize: '0.85rem', maxWidth: '500px', margin: '0 auto 16px' }}>
                    Daily biometric and manual shift rosters automatically calculate monthly present days, half-days, and overtime for payroll generation.
                  </p>
                  <button
                    type="button"
                    onClick={() => setAttendanceViewMode('roster')}
                    style={{
                      background: '#137333',
                      color: '#ffffff',
                      padding: '8px 18px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      border: 'none'
                    }}
                  >
                    Open Daily Shift Roster
                  </button>
                </div>
              ) : (
                <div className="g-card" style={{ overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Date & Shift</th>
                          <th>Staff Name & Code</th>
                          <th>Department & Role</th>
                          <th>Logged Hours</th>
                          <th>Attendance Status</th>
                          <th>Shift Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allAttendanceLogs.map((att, idx) => (
                          <tr key={att.id || att._id || idx}>
                            <td>
                              <div style={{ fontWeight: '700', color: '#111827' }}>
                                {new Date(att.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#4b5563' }}>Standard Site Shift</div>
                            </td>
                            <td>
                              <div style={{ fontWeight: '700', color: '#111827' }}>{att.employeeName}</div>
                              <div style={{ fontSize: '0.72rem', color: '#4b5563' }}>Emp Code: {att.employeeCode}</div>
                            </td>
                            <td>
                              <div style={{ color: '#1a73e8', fontWeight: '600', fontSize: '0.8rem' }}>{att.departmentName}</div>
                              <div style={{ fontSize: '0.72rem', color: '#4b5563' }}>{att.designation}</div>
                            </td>
                            <td>
                              <div style={{ fontWeight: '700', color: '#111827' }}>{att.workingHours || 8.5} hrs</div>
                            </td>
                            <td>
                              <StatusBadge status={att.status || 'present'} />
                            </td>
                            <td>
                              <div style={{ color: '#4b5563', fontSize: '0.8rem' }}>{att.remarks || 'Standard site shift'}</div>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#111827', margin: 0 }}>
                  Centralized Staff Leave Administration & Quotas
                </h3>
                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: '#fef3c7', color: '#92400e', fontWeight: '800' }}>
                  HR CENTRALIZED ONLY
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#4b5563', margin: '4px 0 0 0' }}>
                All staff leaves are recorded and tracked directly by HR Admin. Monitor live quotas (CL, SL, EL, LWP), active leaves today, and approval records without any employee self-portals.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsLeaveModalOpen(true)}
              style={{
                background: '#b06000',
                color: '#ffffff',
                padding: '8px 18px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                border: 'none',
                boxShadow: '0 2px 4px rgba(176, 96, 0, 0.25)'
              }}
            >
              <Plus size={15} /> Record Staff Leave
            </button>
          </div>

          {/* STAFF ON LEAVE TODAY BANNER */}
          <div style={{
            background: staffOnLeaveTodayList.length > 0 ? '#fffbeb' : '#f0fdf4',
            border: `1px solid ${staffOnLeaveTodayList.length > 0 ? '#fde68a' : '#bbf7d0'}`,
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: staffOnLeaveTodayList.length > 0 ? '#fef3c7' : '#dcfce7',
                color: staffOnLeaveTodayList.length > 0 ? '#b45309' : '#15803d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Calendar size={18} />
              </div>
              <div>
                <strong style={{ fontSize: '0.9rem', color: staffOnLeaveTodayList.length > 0 ? '#92400e' : '#166534', display: 'block' }}>
                  {staffOnLeaveTodayList.length > 0
                    ? `Staff Currently On Approved Leave Today (${staffOnLeaveTodayList.length} Absent)`
                    : 'Full Workforce Available: 0 Staff On Leave Today'}
                </strong>
                <span style={{ fontSize: '0.74rem', color: staffOnLeaveTodayList.length > 0 ? '#b45309' : '#15803d' }}>
                  {staffOnLeaveTodayList.length > 0
                    ? 'The following staff members have approved leave covering today\'s site/office shift:'
                    : 'All on-roll employees are scheduled for duty with no approved absences.'}
                </span>
              </div>
            </div>

            {staffOnLeaveTodayList.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {staffOnLeaveTodayList.map((lv) => (
                  <div
                    key={lv.id || lv._id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #fde68a',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span style={{ fontWeight: '800', color: '#111827' }}>{lv.employeeName}</span>
                    <span style={{ color: '#64748b' }}>•</span>
                    <span style={{ color: '#1d4ed8', fontWeight: '700', textTransform: 'capitalize' }}>{lv.leaveType}</span>
                    <span style={{ color: '#64748b' }}>•</span>
                    <span style={{ color: '#475569' }}>until {new Date(lv.toDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sub-view Switcher Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '4px', borderRadius: '8px', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setLeaveSubView('matrix')}
                style={{
                  padding: '7px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: leaveSubView === 'matrix' ? '#ffffff' : 'transparent',
                  color: leaveSubView === 'matrix' ? '#0f172a' : '#64748b',
                  fontWeight: leaveSubView === 'matrix' ? '800' : '600',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  boxShadow: leaveSubView === 'matrix' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                📊 Staff Leave Quota & Balances Matrix ({employees.length})
              </button>
              <button
                type="button"
                onClick={() => setLeaveSubView('applications')}
                style={{
                  padding: '7px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: leaveSubView === 'applications' ? '#ffffff' : 'transparent',
                  color: leaveSubView === 'applications' ? '#0f172a' : '#64748b',
                  fontWeight: leaveSubView === 'applications' ? '800' : '600',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  boxShadow: leaveSubView === 'applications' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                📋 Leave Applications & Approvals Ledger ({allLeaveRequests.length})
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
                      border: '1px solid #cbd5e1',
                      background: leaveStatusFilter === st ? '#1e3a8a' : '#ffffff',
                      color: leaveStatusFilter === st ? '#ffffff' : '#334151',
                      fontSize: '0.72rem',
                      fontWeight: '700',
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
                        <th>Staff Member & Code</th>
                        <th>Department</th>
                        <th>Casual Leave (CL)</th>
                        <th>Sick Leave (SL)</th>
                        <th>Earned Leave (EL)</th>
                        <th>LWP (Unpaid)</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>HR Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                            No staff registered. Onboard staff to initialize annual leave quotas.
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
                                <div style={{ fontWeight: '700', color: '#111827' }}>
                                  {emp.firstName} {emp.lastName}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>
                                  {emp.employeeCode}
                                </div>
                              </td>
                              <td>
                                <div style={{ color: '#1e3a8a', fontWeight: '600', fontSize: '0.8rem' }}>
                                  {emp.departmentName || 'Krishna Valley'}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                  {emp.designation || 'Staff'}
                                </div>
                              </td>
                              {/* Casual Leave */}
                              <td>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                  <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#1d4ed8' }}>{clLeft}</span>
                                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>/ {clTotal} left</span>
                                </div>
                                <span style={{ fontSize: '0.66rem', color: '#64748b' }}>{clUsed} days used</span>
                              </td>
                              {/* Sick Leave */}
                              <td>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                  <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#b45309' }}>{slLeft}</span>
                                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>/ {slTotal} left</span>
                                </div>
                                <span style={{ fontSize: '0.66rem', color: '#64748b' }}>{slUsed} days used</span>
                              </td>
                              {/* Earned Leave */}
                              <td>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                  <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#047857' }}>{elLeft}</span>
                                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>/ {elTotal} left</span>
                                </div>
                                <span style={{ fontSize: '0.66rem', color: '#64748b' }}>{elUsed} days used</span>
                              </td>
                              {/* LWP */}
                              <td>
                                <div style={{ fontSize: '0.95rem', fontWeight: '800', color: lwpUsed > 0 ? '#dc2626' : '#64748b' }}>
                                  {lwpUsed} <span style={{ fontSize: '0.72rem', fontWeight: '500' }}>days</span>
                                </div>
                                {lwpUsed > 0 && (
                                  <span style={{ fontSize: '0.64rem', color: '#dc2626', fontWeight: '700' }}>Salary Deducted</span>
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
                                      background: '#fef3c7',
                                      border: '1px solid #fde68a',
                                      color: '#92400e',
                                      borderRadius: '4px',
                                      fontSize: '0.72rem',
                                      fontWeight: '700',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    + Record Leave
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEdit(emp)}
                                    style={{
                                      padding: '4px 9px',
                                      background: '#eff6ff',
                                      border: '1px solid #bfdbfe',
                                      color: '#1d4ed8',
                                      borderRadius: '4px',
                                      fontSize: '0.72rem',
                                      fontWeight: '700',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Adjust Quotas
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedEmployee(emp);
                                      setIsDetailModalOpen(true);
                                    }}
                                    style={{
                                      padding: '4px 8px',
                                      background: '#f1f5f9',
                                      border: '1px solid #cbd5e1',
                                      color: '#0f172a',
                                      borderRadius: '4px',
                                      fontSize: '0.72rem',
                                      fontWeight: '700',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Dossier
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
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#fef7e0', color: '#b06000', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <Calendar size={24} />
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#111827', marginBottom: '6px' }}>
                    No Leave Records in Selected Filter
                  </div>
                  <p style={{ color: '#4b5563', fontSize: '0.85rem', maxWidth: '500px', margin: '0 auto 16px' }}>
                    No leave entries match status "{leaveStatusFilter}". Record staff leaves directly as Central HR Admin.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsLeaveModalOpen(true)}
                    style={{
                      background: '#b06000',
                      color: '#ffffff',
                      padding: '8px 18px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      border: 'none'
                    }}
                  >
                    + Record Staff Leave
                  </button>
                </div>
              ) : (
                <div className="g-card" style={{ overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Staff Member</th>
                          <th>Department</th>
                          <th>Leave Category</th>
                          <th>Duration & Days</th>
                          <th>Reason for Absence</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLeaveRequests.map((lv, idx) => (
                          <tr key={lv.id || lv._id || idx}>
                            <td>
                              <div style={{ fontWeight: '700', color: '#111827' }}>{lv.employeeName}</div>
                              <div style={{ fontSize: '0.72rem', color: '#4b5563' }}>Emp Code: {lv.employeeCode}</div>
                            </td>
                            <td style={{ color: '#374151', fontWeight: '600' }}>
                              {lv.departmentName}
                            </td>
                            <td>
                              <div style={{ fontWeight: '700', color: '#111827', textTransform: 'capitalize' }}>
                                {lv.leaveType} Leave
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#4b5563' }}>
                                {lv.leaveType === 'unpaid' ? 'Leave Without Pay (LWP)' : 'Paid Quota'}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontWeight: '600', color: '#111827' }}>
                                {new Date(lv.fromDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} → {new Date(lv.toDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#b06000', fontWeight: '700' }}>
                                {lv.numberOfDays} Day{lv.numberOfDays > 1 ? 's' : ''}
                              </div>
                            </td>
                            <td>
                              <div style={{ color: '#4b5563', fontSize: '0.8rem', maxWidth: '240px' }}>
                                {lv.reason || 'Personal Reason'}
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
                                        background: '#e6f4ea',
                                        border: '1px solid #ceead6',
                                        color: '#137333',
                                        borderRadius: '4px',
                                        fontSize: '0.75rem',
                                        fontWeight: '700',
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
                                        background: '#fce8e6',
                                        border: '1px solid #fad2cf',
                                        color: '#c5221f',
                                        borderRadius: '4px',
                                        fontSize: '0.75rem',
                                        fontWeight: '700',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      Reject
                                    </button>
                                  </>
                                ) : (
                                  <span style={{ color: lv.status === 'approved' ? '#137333' : '#c5221f', fontWeight: '700', fontSize: '0.75rem' }}>
                                    {lv.status === 'approved' ? '✓ Approved' : '✕ Rejected'}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  title="Cancel / Delete Leave Application"
                                  onClick={() => handleDeleteLeave(lv.employeeId, lv.id || lv._id)}
                                  style={{
                                    padding: '4px 6px',
                                    background: '#fef2f2',
                                    border: '1px solid #fecaca',
                                    color: '#dc2626',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem',
                                    fontWeight: '700',
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

      {/* ================= TAB 4: PAYROLL ================= */}
      {activeTab === 'payroll' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111827' }}>
                Monthly Staff Payroll Register ({filteredPayrollRecords.length})
              </h3>
              <p style={{ fontSize: '0.76rem', color: '#6b7280', margin: 0 }}>
                Gross calculations, statutory deductions (PF/ESI), net pay, official slips, and bank disbursements.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsPayModalOpen(true)}
              style={{
                background: '#1a73e8',
                color: '#ffffff',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                border: 'none'
              }}
            >
              <DollarSign size={15} /> Calculate & Process Payroll
            </button>
          </div>

          {/* Payroll Filter Bar */}
          <div className="g-card" style={{ padding: '12px 16px', background: '#ffffff', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 160px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '4px' }}>
                Filter Month
              </label>
              <select
                value={selectedPayrollMonth}
                onChange={(e) => setSelectedPayrollMonth(e.target.value)}
                style={{ width: '100%', fontSize: '0.82rem', borderColor: selectedPayrollMonth ? '#1a73e8' : '#dadce0', fontWeight: selectedPayrollMonth ? '700' : 'normal' }}
              >
                <option value="">All Months</option>
                {monthNames.map((name, i) => (
                  <option key={i + 1} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: '1 1 140px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '4px' }}>
                Filter Year
              </label>
              <select
                value={selectedPayrollYear}
                onChange={(e) => setSelectedPayrollYear(e.target.value)}
                style={{ width: '100%', fontSize: '0.82rem', borderColor: selectedPayrollYear ? '#1a73e8' : '#dadce0', fontWeight: selectedPayrollYear ? '700' : 'normal' }}
              >
                <option value="">All Years</option>
                {[2024, 2025, 2026, 2027].map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: '1 1 160px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '4px' }}>
                Payment Status
              </label>
              <select
                value={payrollStatusFilter}
                onChange={(e) => setPayrollStatusFilter(e.target.value)}
                style={{ width: '100%', fontSize: '0.82rem', borderColor: payrollStatusFilter ? '#137333' : '#dadce0', fontWeight: payrollStatusFilter ? '700' : 'normal' }}
              >
                <option value="">All Statuses</option>
                <option value="processed">Processed (Unpaid)</option>
                <option value="paid">Paid (Disbursed)</option>
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
                  background: '#fef2f2',
                  color: '#ba1a1a',
                  borderRadius: '6px',
                  border: '1px solid #fecaca',
                  fontSize: '0.76rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  alignSelf: 'flex-end',
                  height: '34px'
                }}
              >
                Reset Filters
              </button>
            )}
          </div>

          {filteredPayrollRecords.length === 0 ? (
            <div className="g-card" style={{ padding: '32px 20px', textAlign: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#f3e8ff', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <DollarSign size={24} />
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#111827', marginBottom: '6px' }}>
                No Payroll Records Found
              </div>
              <p style={{ color: '#4b5563', fontSize: '0.85rem', maxWidth: '500px', margin: '0 auto 16px' }}>
                {allPayrollRecords.length === 0
                  ? 'Automated PF (12%), ESI, HRA allowances, and unpaid leave deductions with net disbursable calculations.'
                  : 'No payroll records match your current month/year/status filter.'}
              </p>
              {allPayrollRecords.length === 0 && (
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(true)}
                  style={{
                    background: '#1a73e8',
                    color: '#ffffff',
                    padding: '8px 18px',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    border: 'none'
                  }}
                >
                  Run Monthly Payroll Calculations
                </button>
              )}
            </div>
          ) : (
            <div className="g-card" style={{ overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Salary Month</th>
                      <th>Staff Member</th>
                      <th>Department & Role</th>
                      <th>Basic Salary</th>
                      <th>Allowances (HRA)</th>
                      <th>Deductions</th>
                      <th>Net Disbursable</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions & Payslips</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayrollRecords.map((pay, idx) => (
                      <tr key={pay.id || pay._id || idx}>
                        <td>
                          <div style={{ fontWeight: '800', color: '#111827' }}>
                            {monthNames[(pay.month || 1) - 1]} {pay.year}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#4b5563' }}>Payroll Period</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: '700', color: '#111827' }}>{pay.employeeName}</div>
                          <div style={{ fontSize: '0.72rem', color: '#4b5563' }}>Emp Code: {pay.employeeCode}</div>
                        </td>
                        <td>
                          <div style={{ color: '#1a73e8', fontWeight: '600', fontSize: '0.78rem' }}>{pay.departmentName}</div>
                          <div style={{ fontSize: '0.72rem', color: '#4b5563' }}>{pay.designation}</div>
                        </td>
                        <td style={{ fontWeight: '700', color: '#111827' }}>
                          {formatINR(pay.basicSalary)}
                        </td>
                        <td style={{ color: '#137333', fontWeight: '700', fontSize: '0.78rem' }}>
                          +{formatINR(pay.allowances)}
                        </td>
                        <td style={{ color: '#c5221f', fontWeight: '700', fontSize: '0.78rem' }}>
                          -{formatINR((pay.deductions || 0) + (pay.unpaidLeaveDeduction || 0))}
                        </td>
                        <td>
                          <div style={{ color: '#111827', fontWeight: '800', fontSize: '0.9rem' }}>
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
                                title="Generate & Print Official Payslip"
                                onClick={() => {
                                  setPayslipItemToPrint(pay);
                                  setIsPayslipModalOpen(true);
                                }}
                                style={{
                                  padding: '5px 9px',
                                  background: '#eff6ff',
                                  border: '1px solid #bfdbfe',
                                  color: '#1d4ed8',
                                  borderRadius: '5px',
                                  fontSize: '0.75rem',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <Printer size={13} /> Payslip
                              </button>

                              {pay.status !== 'paid' ? (
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
                                    background: '#137333',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '5px',
                                    fontSize: '0.75rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.08)'
                                  }}
                                >
                                  <DollarSign size={13} /> Disburse
                                </button>
                              ) : (
                                <span style={{ color: '#137333', fontWeight: '700', fontSize: '0.74rem' }}>
                                  ✓ Disbursed
                                </span>
                              )}
                            </div>

                            {pay.status === 'paid' && (
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                {pay.paymentReference && (
                                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
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
                                      color: '#1d4ed8',
                                      fontWeight: '700',
                                      textDecoration: 'none',
                                      backgroundColor: '#eff6ff',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      border: '1px solid #bfdbfe',
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
              style={{ padding: '8px 18px', background: '#1a73e8', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700' }}
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
              style={{ padding: '8px 18px', background: '#137333', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700' }}
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
                    backgroundColor: '#1a73e8',
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
                  ✕ Close
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
                    <CheckCircle size={40} color="#16a34a" />
                    <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '1rem' }}>
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
