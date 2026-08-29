import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { hrService } from '../../services/hrService.js';
import { NewEmployeeModal } from '../../components/hr/NewEmployeeModal.jsx';
import { LogAttendanceModal } from '../../components/hr/LogAttendanceModal.jsx';
import { ApplyLeaveModal } from '../../components/hr/ApplyLeaveModal.jsx';
import { GeneratePayrollModal } from '../../components/hr/GeneratePayrollModal.jsx';
import { EmployeeDetailModal } from '../../components/hr/EmployeeDetailModal.jsx';
import { DisburseSalaryModal } from '../../components/hr/DisburseSalaryModal.jsx';
import { StatusBadge } from '../../components/common/StatusBadge.jsx';

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
  FileText
} from 'lucide-react';

export const HRPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const getTabFromParam = (param) => {
    if (param === 'attendance') return 'attendance';
    if (param === 'leaves') return 'leaves';
    if (param === 'payroll') return 'payroll';
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
    monthlyPayrollOutflow: 0
  });

  // Data Collections
  const [employees, setEmployees] = useState([]);
  const [masterData, setMasterData] = useState({ departments: [], roles: [] });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Modals
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [isAttModalOpen, setIsAttModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isDisburseModalOpen, setIsDisburseModalOpen] = useState(false);
  const [selectedPayrollItem, setSelectedPayrollItem] = useState(null);

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
    } catch (err) {
      alert(err.message || 'Error processing salary disbursement');
      throw err;
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
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px'
      }}>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>ACTIVE HEADCOUNT</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#e8f0fe', color: '#1a73e8' }}>
              <Users size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#111827', marginTop: '4px' }}>
            {summary.activeStaff} <span style={{ fontSize: '0.9rem', color: '#4b5563', fontWeight: '500' }}>/ {summary.totalEmployees}</span>
          </div>
          <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>On-roll permanent employees</span>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>TODAY'S ATTENDANCE</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#e6f4ea', color: '#137333' }}>
              <Clock size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#137333', marginTop: '4px' }}>
            {summary.todayAttendancePercent}%
          </div>
          <span style={{ fontSize: '0.74rem', color: '#137333', fontWeight: '700' }}>Shift check-in status</span>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>LEAVE APPLICATIONS</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#fef7e0', color: '#b06000' }}>
              <Calendar size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#b06000', marginTop: '4px' }}>
            {summary.pendingLeavesCount}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>Awaiting HR approval</span>
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
          <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>Salary & benefits total</span>
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
          { id: 'dept_roles', label: `Departments & Roles Matrix (${masterData.departments?.length || 8})` },
          { id: 'attendance', label: `Shift Attendance (${allAttendanceLogs.length})` },
          { id: 'leaves', label: `Leave Requests (${allLeaveRequests.length})` },
          { id: 'payroll', label: `Monthly Payroll Register (${allPayrollRecords.length})` }
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
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#6b7280' }}>
                        No employees found matching the selected department/role criteria.
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
                        <td>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEmployee(emp);
                              setIsDetailModalOpen(true);
                            }}
                            style={{
                              padding: '4px 10px',
                              background: '#f3f4f5',
                              border: '1px solid #dadce0',
                              color: '#111827',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            View Profile
                          </button>
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

      {/* ================= TAB: DEPARTMENT & ROLE MATRIX ================= */}
      {activeTab === 'dept_roles' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111827' }}>Department & Role Hierarchy Matrix</h3>
              <p style={{ fontSize: '0.76rem', color: '#6b7280', margin: 0 }}>Every department maintains distinct dedicated roles and operational scopes.</p>
            </div>
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
                    <span style={{ fontSize: '0.72rem', padding: '4px 8px', borderRadius: '12px', background: '#e6f4ea', color: '#137333', fontWeight: '700' }}>
                      {deptStaffCount} Staff Active
                    </span>
                  </div>

                  <p style={{ fontSize: '0.76rem', color: '#4b5563', margin: 0, lineHeight: '1.4' }}>
                    {dept.description}
                  </p>

                  <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '10px', marginTop: '4px' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#374151', marginBottom: '6px', textTransform: 'uppercase' }}>
                      Department Roles & Designations ({deptRoles.length}):
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
                            <span style={{ fontSize: '0.7rem', fontWeight: '700', color: roleStaff > 0 ? '#1a73e8' : '#9ca3af' }}>
                              {roleStaff} staff
                            </span>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111827' }}>
              Shift Attendance Ledger ({allAttendanceLogs.length})
            </h3>
            <button
              type="button"
              onClick={() => setIsAttModalOpen(true)}
              style={{
                background: '#137333',
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
              <Clock size={15} /> Log Today's Attendance
            </button>
          </div>

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
                onClick={() => setIsAttModalOpen(true)}
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
                Log First Attendance Entry
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

      {/* ================= TAB 3: LEAVES ================= */}
      {activeTab === 'leaves' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111827' }}>
              Leave Applications & Approvals ({allLeaveRequests.length})
            </h3>
            <button
              type="button"
              onClick={() => setIsLeaveModalOpen(true)}
              style={{
                background: '#b06000',
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
              <Calendar size={15} /> Apply for Leave
            </button>
          </div>

          {allLeaveRequests.length === 0 ? (
            <div className="g-card" style={{ padding: '32px 20px', textAlign: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#fef7e0', color: '#b06000', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Calendar size={24} />
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#111827', marginBottom: '6px' }}>
                No Leave Applications Found
              </div>
              <p style={{ color: '#4b5563', fontSize: '0.85rem', maxWidth: '500px', margin: '0 auto 16px' }}>
                Leave ledger tracks Paid Leaves (PL), Casual Leaves (CL), and Sick Leaves (SL) with real-time balance and salary deductions.
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
                Submit Leave Application
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
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allLeaveRequests.map((lv, idx) => (
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
                        <td>
                          {lv.status === 'pending' ? (
                            <div style={{ display: 'flex', gap: '6px' }}>
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
                            </div>
                          ) : (
                            <span style={{ color: lv.status === 'approved' ? '#137333' : '#c5221f', fontWeight: '700', fontSize: '0.75rem' }}>
                              {lv.status === 'approved' ? '✓ Approved' : '✕ Rejected'}
                            </span>
                          )}
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

      {/* ================= TAB 4: PAYROLL ================= */}
      {activeTab === 'payroll' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111827' }}>
              Monthly Staff Payroll Register ({allPayrollRecords.length})
            </h3>
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

          {allPayrollRecords.length === 0 ? (
            <div className="g-card" style={{ padding: '32px 20px', textAlign: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#f3e8ff', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <DollarSign size={24} />
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#111827', marginBottom: '6px' }}>
                No Payroll Registers Processed Yet
              </div>
              <p style={{ color: '#4b5563', fontSize: '0.85rem', maxWidth: '500px', margin: '0 auto 16px' }}>
                Automated PF (12%), ESI, HRA allowances, and unpaid leave deductions with net disbursable calculations.
              </p>
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
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allPayrollRecords.map((pay, idx) => (
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
                        <td>
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
                                padding: '6px 14px',
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
                                gap: '5px',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.08)'
                              }}
                            >
                              <DollarSign size={13} /> Disburse Salary
                            </button>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start' }}>
                              <span style={{ color: '#137333', fontWeight: '700', fontSize: '0.75rem' }}>
                                ✓ Disbursed ({pay.paymentMethod === 'upi' ? 'UPI' : (pay.paymentMethod ? pay.paymentMethod.replace(/_/g, ' ') : 'Bank Transfer')})
                              </span>
                              {pay.paymentReference && (
                                <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                  Ref: {pay.paymentReference}
                                </span>
                              )}
                              {(pay.paymentProof?.fileUrl || pay.payslipUrl) && (
                                <a
                                  href={pay.paymentProof?.fileUrl || pay.payslipUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '0.7rem',
                                    color: '#1d4ed8',
                                    fontWeight: '700',
                                    textDecoration: 'none',
                                    backgroundColor: '#eff6ff',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    border: '1px solid #bfdbfe',
                                    marginTop: '2px'
                                  }}
                                >
                                  <FileText size={11} /> View Slip / Proof
                                </a>
                              )}
                            </div>
                          )}
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

    </div>
  );
};
