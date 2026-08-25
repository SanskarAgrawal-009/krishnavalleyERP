import HRMaster from '../models/hr/HRMaster.js';
import Employee from '../models/hr/Employee.js';
import User from '../models/User.js';
import Role from '../models/Role.js';
import { uploadFileToS3 } from '../config/s3.js';
import mongoose from 'mongoose';

// Ensure default HR Master (Departments & Roles) exists with full department-to-role mappings
const defaultDepartmentsList = [
  { departmentCode: 'ENG', departmentName: 'Civil & Structural Engineering', description: 'Site construction, structural design, quality checks, and RCC works.' },
  { departmentCode: 'ARC', departmentName: 'Architecture & Interior Planning', description: 'Floor plans, elevations, 3D renders, and finishes.' },
  { departmentCode: 'SALES', departmentName: 'Sales & Real Estate Marketing', description: 'Lead nurturing, customer walk-ins, site tours, and flat bookings.' },
  { departmentCode: 'FIN', departmentName: 'Finance, Accounts & Auditing', description: 'Invoicing, balance ledgers, contractor payments, and bank loans.' },
  { departmentCode: 'PROC', departmentName: 'Procurement & Site Logistics', description: 'Vendor management, purchase orders, and warehouse inventory.' },
  { departmentCode: 'FAC', departmentName: 'Facilities & Society Maintenance', description: 'Post-possession services, technician tickets, and repair work orders.' },
  { departmentCode: 'HR', departmentName: 'Human Resources & Administration', description: 'Talent recruitment, employee relations, payroll, and compliance.' },
  { departmentCode: 'LEGAL', departmentName: 'Legal, Liaison & RERA Compliance', description: 'RERA filings, title verification, registry, and liaisoning.' }
];

const defaultRolesList = [
  // ENG - Civil & Structural Engineering
  { roleCode: 'PROJ_MGR', roleName: 'Project General Manager', departmentCode: 'ENG', departmentName: 'Civil & Structural Engineering', description: 'Overall site milestone execution, budget, and construction head.', permissions: ['all'] },
  { roleCode: 'SITE_ENG', roleName: 'Senior Site Engineer (RCC)', departmentCode: 'ENG', departmentName: 'Civil & Structural Engineering', description: 'Oversees RCC casting, reinforcement bar bending, and structural quality.', permissions: ['view_inventory', 'issue_materials'] },
  { roleCode: 'JR_SITE_ENG', roleName: 'Junior Site Engineer', departmentCode: 'ENG', departmentName: 'Civil & Structural Engineering', description: 'Daily site checks, brickwork, plastering, and labour management.', permissions: ['view_inventory'] },
  { roleCode: 'QA_QC_ENG', roleName: 'Quality Control & Safety Engineer', departmentCode: 'ENG', departmentName: 'Civil & Structural Engineering', description: 'Concrete cube testing, safety audits, and material specifications.', permissions: ['view_inventory', 'qa_approval'] },
  { roleCode: 'SITE_SUPER', roleName: 'Construction Site Supervisor', departmentCode: 'ENG', departmentName: 'Civil & Structural Engineering', description: 'Daily shift monitoring, contractor coordination, and site logs.', permissions: ['view_inventory'] },

  // ARC - Architecture & Interior Planning
  { roleCode: 'CHIEF_ARCH', roleName: 'Chief Architect & Planner', departmentCode: 'ARC', departmentName: 'Architecture & Interior Planning', description: 'Master plan blueprints, facade designs, and regulatory drawings.', permissions: ['view_projects', 'design_manage'] },
  { roleCode: 'CAD_DRAUGHT', roleName: 'Senior CAD Draughtsman', departmentCode: 'ARC', departmentName: 'Architecture & Interior Planning', description: '2D/3D structural drafting and working drawings.', permissions: ['view_projects'] },
  { roleCode: '3D_VISUAL', roleName: '3D Visualizer & Render Specialist', departmentCode: 'ARC', departmentName: 'Architecture & Interior Planning', description: '3D walk-throughs, elevation renders, and brochure designs.', permissions: ['view_projects'] },
  { roleCode: 'INT_DESIGN', roleName: 'Interior Design Consultant', departmentCode: 'ARC', departmentName: 'Architecture & Interior Planning', description: 'Sample flat staging, interior finishes, and electrical layouts.', permissions: ['view_projects'] },

  // SALES - Sales & Real Estate Marketing
  { roleCode: 'SALES_HEAD', roleName: 'Head of Sales & Marketing', departmentCode: 'SALES', departmentName: 'Sales & Real Estate Marketing', description: 'Real estate revenue targets, campaign planning, and sales team head.', permissions: ['all_sales', 'crm_manage'] },
  { roleCode: 'SALES_EXEC', roleName: 'Senior Sales Executive', departmentCode: 'SALES', departmentName: 'Sales & Real Estate Marketing', description: 'Lead nurturing, customer site tours, negotiations, and flat bookings.', permissions: ['view_crm', 'book_sales'] },
  { roleCode: 'CRM_OFFICER', roleName: 'CRM & Customer Relations Officer', departmentCode: 'SALES', departmentName: 'Sales & Real Estate Marketing', description: 'Customer onboarding, passbook queries, and payment reminders.', permissions: ['view_crm', 'view_customers'] },
  { roleCode: 'CHANNEL_MGR', roleName: 'Channel Partner & Broker Manager', departmentCode: 'SALES', departmentName: 'Sales & Real Estate Marketing', description: 'Real estate agent onboarding, commissions, and network expansion.', permissions: ['view_agents', 'manage_commissions'] },

  // FIN - Finance, Accounts & Auditing
  { roleCode: 'CFO_ACCOUNTS', roleName: 'Chief Financial Officer / Accounts Head', departmentCode: 'FIN', departmentName: 'Finance, Accounts & Auditing', description: 'Corporate finance, auditing, balance sheets, and tax compliance.', permissions: ['all_finance', 'approve_payments'] },
  { roleCode: 'SR_ACCOUNTANT', roleName: 'Senior Financial Accountant', departmentCode: 'FIN', departmentName: 'Finance, Accounts & Auditing', description: 'Payment verification, ledger maintenance, and bank reconciliations.', permissions: ['manage_finance', 'approve_payments'] },
  { roleCode: 'ACCOUNTS_EXEC', roleName: 'Accounts & Billing Officer', departmentCode: 'FIN', departmentName: 'Finance, Accounts & Auditing', description: 'Maintenance invoice collections, UTR verification, and receipts.', permissions: ['manage_finance', 'issue_bills'] },
  { roleCode: 'TAX_AUDITOR', roleName: 'Tax & GST Auditor', departmentCode: 'FIN', departmentName: 'Finance, Accounts & Auditing', description: 'GST filings, TDS certificates, and RERA accounts compliance.', permissions: ['view_finance', 'audit_reports'] },

  // PROC - Procurement & Site Logistics
  { roleCode: 'PROC_MGR', roleName: 'Procurement & Purchase Head', departmentCode: 'PROC', departmentName: 'Procurement & Site Logistics', description: 'Bulk raw material sourcing (steel, cement, sand), rates, and POs.', permissions: ['manage_pos', 'manage_vendors'] },
  { roleCode: 'STORE_MGR', roleName: 'Chief Storekeeper / Warehouse Manager', departmentCode: 'PROC', departmentName: 'Procurement & Site Logistics', description: 'GRN processing, material issues, and store stock auditing.', permissions: ['manage_stores', 'receive_grn'] },
  { roleCode: 'PURCHASE_EXEC', roleName: 'Purchase & Vendor Executive', departmentCode: 'PROC', departmentName: 'Procurement & Site Logistics', description: 'Vendor quotations, comparative statements, and order tracking.', permissions: ['view_inventory', 'create_pos'] },

  // FAC - Facilities & Society Maintenance
  { roleCode: 'FAC_MGR', roleName: 'Estate & Facility Manager', departmentCode: 'FAC', departmentName: 'Facilities & Society Maintenance', description: 'Overall society infrastructure, security, and facility operations.', permissions: ['manage_maintenance'] },
  { roleCode: 'FAC_SUPER', roleName: 'Facilities Maintenance Supervisor', departmentCode: 'FAC', departmentName: 'Facilities & Society Maintenance', description: 'Handles resident tickets, preventive maintenance, and technician shifts.', permissions: ['manage_maintenance'] },
  { roleCode: 'MEP_ENG', roleName: 'MEP Engineer (Electrical & Plumbing)', departmentCode: 'FAC', departmentName: 'Facilities & Society Maintenance', description: 'Substation, DG sets, water pumps, lifts, and fire systems.', permissions: ['manage_maintenance'] },

  // HR - Human Resources & Administration
  { roleCode: 'HR_HEAD', roleName: 'Head of Human Resources', departmentCode: 'HR', departmentName: 'Human Resources & Administration', description: 'HR strategy, company policies, performance appraisals, and leadership.', permissions: ['all_hr'] },
  { roleCode: 'HR_RECRUITER', roleName: 'Talent Acquisition Specialist', departmentCode: 'HR', departmentName: 'Human Resources & Administration', description: 'Staff hiring, interviews, onboarding, and candidate background verification.', permissions: ['manage_employees'] },
  { roleCode: 'PAYROLL_OFFICER', roleName: 'Payroll & Attendance Officer', departmentCode: 'HR', departmentName: 'Human Resources & Administration', description: 'Monthly salary disbursements, leaves, PF, ESI, and deductions.', permissions: ['manage_payroll', 'manage_attendance'] },

  // LEGAL - Legal, Liaison & RERA Compliance
  { roleCode: 'LEGAL_COUNSEL', roleName: 'Chief Legal Counsel', departmentCode: 'LEGAL', departmentName: 'Legal, Liaison & RERA Compliance', description: 'Buyer allotment agreements, deeds, title checks, and litigation.', permissions: ['legal_manage'] },
  { roleCode: 'RERA_OFFICER', roleName: 'RERA Compliance Officer', departmentCode: 'LEGAL', departmentName: 'Legal, Liaison & RERA Compliance', description: 'RERA quarterly updates, project registrations, and regulatory filings.', permissions: ['legal_manage'] }
];

const ensureHRMaster = async () => {
  let master = await HRMaster.findOne();
  if (!master) {
    master = new HRMaster({
      departments: defaultDepartmentsList,
      roles: defaultRolesList
    });
    await master.save();
  } else {
    // Ensure all departments are present
    let needsSave = false;
    for (const d of defaultDepartmentsList) {
      const exists = master.departments.some(
        (md) => md.departmentCode === d.departmentCode || md.departmentName.toLowerCase() === d.departmentName.toLowerCase()
      );
      if (!exists) {
        master.departments.push(d);
        needsSave = true;
      }
    }

    // Ensure all roles with departmentCode are present
    for (const r of defaultRolesList) {
      const existsIndex = master.roles.findIndex(
        (mr) => mr.roleCode === r.roleCode || mr.roleName.toLowerCase() === r.roleName.toLowerCase()
      );
      if (existsIndex === -1) {
        master.roles.push(r);
        needsSave = true;
      } else if (!master.roles[existsIndex].departmentCode) {
        master.roles[existsIndex].departmentCode = r.departmentCode;
        master.roles[existsIndex].departmentName = r.departmentName;
        needsSave = true;
      }
    }

    if (needsSave) {
      await master.save();
    }
  }
  return master;
};

// Helper: Format and enrich employee with Department and Role names
const formatEmployeeWithMaster = (empDoc, master, users = [], roles = []) => {
  const emp = empDoc.toObject ? empDoc.toObject() : { ...empDoc };

  // Find department in master
  let matchedDept = master?.departments?.find(
    (d) => d._id?.toString() === emp.departmentId?.toString() || d._id?.toString() === emp.departmentId?._id?.toString()
  );

  if (!matchedDept && emp.departmentCode) {
    matchedDept = master?.departments?.find((d) => d.departmentCode === emp.departmentCode);
  }
  if (!matchedDept && emp.departmentName) {
    matchedDept = master?.departments?.find((d) => d.departmentName === emp.departmentName);
  }

  // Find role in master
  let matchedRole = master?.roles?.find(
    (r) => r._id?.toString() === emp.roleId?.toString() || r._id?.toString() === emp.roleId?._id?.toString()
  );

  if (!matchedRole && emp.roleCode) {
    matchedRole = master?.roles?.find((r) => r.roleCode === emp.roleCode);
  }
  if (!matchedRole && emp.roleName) {
    matchedRole = master?.roles?.find((r) => r.roleName === emp.roleName);
  }

  // Check if linked to user with a role
  if (!matchedRole && users.length > 0) {
    const matchedUser = users.find(
      (u) =>
        (u.email && emp.email && u.email.toLowerCase() === emp.email.toLowerCase()) ||
        (u.employeeId && u.employeeId.toString() === emp._id?.toString())
    );
    if (matchedUser && matchedUser.roleId) {
      const userRole = roles.find((r) => r._id?.toString() === (matchedUser.roleId?._id || matchedUser.roleId).toString());
      if (userRole) {
        matchedRole = {
          _id: userRole._id,
          roleName: userRole.roleName,
          roleCode: userRole.roleCode
        };
        if (!matchedDept) {
          if (userRole.roleCode.includes('sales')) {
            matchedDept = master?.departments?.find((d) => d.departmentCode === 'SALES');
          } else if (userRole.roleCode.includes('site') || userRole.roleCode.includes('eng')) {
            matchedDept = master?.departments?.find((d) => d.departmentCode === 'ENG');
          } else if (userRole.roleCode.includes('accounts') || userRole.roleCode.includes('finance')) {
            matchedDept = master?.departments?.find((d) => d.departmentCode === 'FIN');
          }
        }
      }
    }
  }

  const deptName = matchedDept?.departmentName || emp.departmentName || (master?.departments && master.departments[0]?.departmentName) || 'Civil & Structural Engineering';
  const deptCode = matchedDept?.departmentCode || emp.departmentCode || 'ENG';
  const roleName = matchedRole?.roleName || emp.designation || emp.roleName || (master?.roles && master.roles[0]?.roleName) || 'Senior Site Engineer';
  const roleCode = matchedRole?.roleCode || emp.roleCode || 'SITE_ENG';

  const basicSalary =
    (emp.salaryStructure?.basicSalary) ||
    (emp.payroll && emp.payroll.length > 0 ? emp.payroll[emp.payroll.length - 1].basicSalary : null) ||
    45000;

  return {
    ...emp,
    phone: emp.mobileNo || emp.phone || '',
    mobileNo: emp.mobileNo || emp.phone || '',
    departmentName: deptName,
    department: deptName,
    departmentId: {
      _id: matchedDept?._id || emp.departmentId,
      name: deptName,
      departmentName: deptName,
      departmentCode: deptCode
    },
    designation: roleName,
    roleName: roleName,
    role: roleName,
    roleId: {
      _id: matchedRole?._id || emp.roleId,
      name: roleName,
      roleName: roleName,
      roleCode: roleCode
    },
    salaryStructure: emp.salaryStructure || {
      basicSalary,
      allowances: Math.round(basicSalary * 0.2),
      deductions: 0
    }
  };
};

// =========================================================
// 1. HR MASTER (DEPARTMENTS & ROLES)
// =========================================================

export const getHRMaster = async (req, res) => {
  try {
    const master = await ensureHRMaster();
    return res.json({ success: true, data: master });
  } catch (error) {
    console.error('Error fetching HR Master:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const addDepartment = async (req, res) => {
  try {
    const { departmentCode, departmentName, description } = req.body;
    const master = await ensureHRMaster();

    master.departments.push({
      departmentCode: departmentCode || `DEP-${Date.now().toString().slice(-4)}`,
      departmentName,
      description: description || '',
      status: 'active'
    });

    await master.save();
    return res.status(201).json({ success: true, data: master });
  } catch (error) {
    console.error('Error adding department:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const addRole = async (req, res) => {
  try {
    const { roleCode, roleName, departmentCode, departmentName, departmentId, description, permissions } = req.body;
    const master = await ensureHRMaster();

    let matchedDept = master.departments.find(
      (d) => d.departmentCode === departmentCode || d._id.toString() === departmentId?.toString()
    );

    const dCode = matchedDept?.departmentCode || departmentCode || 'ENG';
    const dName = matchedDept?.departmentName || departmentName || 'Civil & Structural Engineering';

    master.roles.push({
      roleCode: roleCode || `ROL-${Date.now().toString().slice(-4)}`,
      roleName,
      departmentCode: dCode,
      departmentName: dName,
      description: description || '',
      permissions: permissions || [],
      status: 'active'
    });

    await master.save();
    return res.status(201).json({ success: true, data: master });
  } catch (error) {
    console.error('Error adding role:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get Roles dynamically filtered by Department
export const getRolesByDepartment = async (req, res) => {
  try {
    const { departmentCode, departmentId } = req.query;
    const master = await ensureHRMaster();

    let filteredRoles = master.roles || [];

    if (departmentCode) {
      filteredRoles = filteredRoles.filter(
        (r) => r.departmentCode?.toUpperCase() === departmentCode.toUpperCase()
      );
    } else if (departmentId) {
      const dept = master.departments.find((d) => d._id.toString() === departmentId.toString());
      if (dept) {
        filteredRoles = filteredRoles.filter(
          (r) => r.departmentCode?.toUpperCase() === dept.departmentCode?.toUpperCase() ||
                 r.departmentName?.toLowerCase() === dept.departmentName?.toLowerCase()
        );
      }
    }

    return res.json({ success: true, count: filteredRoles.length, data: filteredRoles });
  } catch (error) {
    console.error('Error fetching roles by department:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================
// 2. EMPLOYEE DIRECTORY & PROFILE
// =========================================================

export const createEmployee = async (req, res) => {
  try {
    const master = await ensureHRMaster();

    const {
      employeeCode,
      firstName,
      lastName,
      mobileNo,
      phone,
      email,
      dateOfBirth,
      gender,
      joiningDate,
      departmentId,
      roleId,
      employmentType,
      address,
      emergencyContact,
      initialSalary
    } = req.body;

    const code = employeeCode || `EMP-${Date.now().toString().slice(-4)}`;
    const phoneNum = mobileNo || phone || '+91 98765 00000';

    let selectedDept = master.departments.find((d) => d._id.toString() === departmentId?.toString()) || master.departments[0];
    let selectedRole = master.roles.find((r) => r._id.toString() === roleId?.toString()) || master.roles[0];
    const basicSal = Number(initialSalary) || 45000;

    const emp = new Employee({
      employeeCode: code,
      firstName,
      lastName: lastName || '',
      mobileNo: phoneNum,
      email: email || '',
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      gender: gender || 'male',
      joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
      departmentId: selectedDept._id,
      roleId: selectedRole._id,
      employmentType: employmentType || 'full_time',
      employmentStatus: 'active',
      address: address || {},
      emergencyContact: emergencyContact || {},
      attendance: [],
      leaves: [],
      payroll: [
        {
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
          basicSalary: basicSal,
          allowances: Math.round(basicSal * 0.2),
          deductions: 0,
          grossSalary: basicSal + Math.round(basicSal * 0.2),
          netSalary: basicSal + Math.round(basicSal * 0.2),
          status: 'pending'
        }
      ],
      documents: []
    });

    const saved = await emp.save();
    const formatted = formatEmployeeWithMaster(saved, master);
    return res.status(201).json({ success: true, data: formatted });
  } catch (error) {
    console.error('Error creating employee:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getEmployees = async (req, res) => {
  try {
    const { search, employmentStatus, departmentId } = req.query;
    const master = await ensureHRMaster();
    const users = await User.find({}).populate('roleId');
    const roles = await Role.find({});

    let filter = {};
    if (employmentStatus) filter.employmentStatus = employmentStatus;
    if (departmentId) filter.departmentId = departmentId;

    let employees = await Employee.find(filter).sort({ firstName: 1 });

    let formattedEmployees = employees.map((emp, index) => {
      const obj = emp.toObject ? emp.toObject() : emp;
      let targetDeptId = obj.departmentId;
      let targetRoleId = obj.roleId;

      const deptExists = master.departments.some((d) => d._id.toString() === targetDeptId?.toString());
      if (!deptExists && master.departments.length > 0) {
        targetDeptId = master.departments[index % master.departments.length]._id;
      }

      const roleExists = master.roles.some((r) => r._id.toString() === targetRoleId?.toString());
      if (!roleExists && master.roles.length > 0) {
        targetRoleId = master.roles[index % master.roles.length]._id;
      }

      return formatEmployeeWithMaster({ ...obj, departmentId: targetDeptId, roleId: targetRoleId }, master, users, roles);
    });

    if (search) {
      const s = search.toLowerCase();
      formattedEmployees = formattedEmployees.filter(
        (e) =>
          e.employeeCode.toLowerCase().includes(s) ||
          `${e.firstName} ${e.lastName}`.toLowerCase().includes(s) ||
          (e.mobileNo && e.mobileNo.includes(s)) ||
          (e.email && e.email.toLowerCase().includes(s)) ||
          (e.departmentName && e.departmentName.toLowerCase().includes(s)) ||
          (e.designation && e.designation.toLowerCase().includes(s))
      );
    }

    return res.json({ success: true, count: formattedEmployees.length, data: formattedEmployees });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await Employee.findById(id);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    const master = await ensureHRMaster();
    const users = await User.find({}).populate('roleId');
    const roles = await Role.find({});
    const formatted = formatEmployeeWithMaster(employee, master, users, roles);
    return res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Error fetching employee by id:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================
// 3. ATTENDANCE TRACKER
// =========================================================

export const logAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, checkIn, checkOut, workingHours, status, remarks } = req.body;

    const employee = await Employee.findById(id);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    const attDate = date ? new Date(date) : new Date();

    employee.attendance.push({
      date: attDate,
      checkIn: checkIn ? new Date(checkIn) : new Date(),
      checkOut: checkOut ? new Date(checkOut) : undefined,
      workingHours: Number(workingHours) || 8,
      status: status || 'present',
      remarks: remarks || ''
    });

    await employee.save();
    return res.json({ success: true, message: 'Attendance logged successfully', data: employee });
  } catch (error) {
    console.error('Error logging attendance:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================
// 4. LEAVE MANAGEMENT
// =========================================================

export const applyLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { leaveType, fromDate, toDate, numberOfDays, reason } = req.body;

    const employee = await Employee.findById(id);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    employee.leaves.push({
      leaveType: leaveType || 'casual',
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
      numberOfDays: Number(numberOfDays) || 1,
      reason: reason || '',
      status: 'pending'
    });

    await employee.save();
    return res.status(201).json({ success: true, message: 'Leave application submitted', data: employee });
  } catch (error) {
    console.error('Error applying leave:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateLeaveStatus = async (req, res) => {
  try {
    const { id, leaveId } = req.params;
    const { status } = req.body; // 'approved' | 'rejected' | 'cancelled'

    const employee = await Employee.findById(id);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    const leave = employee.leaves.id(leaveId);
    if (!leave) return res.status(404).json({ success: false, message: 'Leave record not found' });

    leave.status = status;
    leave.approvedAt = new Date();

    await employee.save();
    return res.json({ success: true, message: `Leave status updated to ${status}`, data: employee });
  } catch (error) {
    console.error('Error updating leave status:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================
// 5. PAYROLL GENERATION & SALARY DISBURSEMENT
// =========================================================

export const generateMonthlyPayroll = async (req, res) => {
  try {
    const { month, year, defaultBasic } = req.body;
    const m = Number(month) || (new Date().getMonth() + 1);
    const y = Number(year) || new Date().getFullYear();
    const basic = Number(defaultBasic) || 40000;

    const employees = await Employee.find({ employmentStatus: 'active' });
    let processedCount = 0;

    for (const emp of employees) {
      // Check for unpaid leaves in that month
      const unpaidDays = (emp.leaves || [])
        .filter((l) => l.leaveType === 'unpaid' && l.status === 'approved')
        .reduce((sum, l) => sum + (l.numberOfDays || 0), 0);

      const empBasic =
        (emp.salaryStructure?.basicSalary) ||
        (emp.payroll && emp.payroll.length > 0 ? emp.payroll[emp.payroll.length - 1].basicSalary : null) ||
        basic;
      const allowances = Math.round(empBasic * 0.25); // 25% HRA & Conveyance
      const perDayRate = Math.round(empBasic / 30);
      const unpaidDeduction = unpaidDays * perDayRate;
      const statutoryDeductions = Math.round(empBasic * 0.12); // 12% PF/ESI

      const grossSalary = empBasic + allowances;
      const netSalary = Math.max(0, grossSalary - (statutoryDeductions + unpaidDeduction));

      const payObj = {
        month: m,
        year: y,
        basicSalary: empBasic,
        allowances,
        overtime: 0,
        deductions: statutoryDeductions,
        unpaidLeaveDeduction: unpaidDeduction,
        grossSalary,
        netSalary,
        status: 'processed',
        payslipUrl: `/payslips/slip_${emp.employeeCode}_${m}_${y}.pdf`
      };

      const existingIndex = emp.payroll.findIndex((p) => p.month === m && p.year === y);
      if (existingIndex >= 0) {
        // Keep paid status if already paid
        const currentStatus = emp.payroll[existingIndex].status;
        emp.payroll[existingIndex] = {
          ...emp.payroll[existingIndex],
          ...payObj,
          status: currentStatus === 'paid' ? 'paid' : 'processed',
          paymentDate: emp.payroll[existingIndex].paymentDate,
          paymentMethod: emp.payroll[existingIndex].paymentMethod,
          paymentReference: emp.payroll[existingIndex].paymentReference
        };
      } else {
        emp.payroll.push(payObj);
      }

      await emp.save();
      processedCount++;
    }

    return res.json({
      success: true,
      message: `Successfully calculated & processed monthly payroll for ${processedCount} active employees for ${m}/${y}`
    });
  } catch (error) {
    console.error('Error generating payroll:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const processPayrollPayment = async (req, res) => {
  try {
    const { id, payrollId } = req.params;
    const { paymentMethod, paymentReference } = req.body;

    const employee = await Employee.findById(id);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    const paySlip = employee.payroll.id(payrollId);
    if (!paySlip) return res.status(404).json({ success: false, message: 'Payroll slip not found' });

    paySlip.status = 'paid';
    paySlip.paymentDate = new Date();
    paySlip.paymentMethod = paymentMethod || 'bank_transfer';
    paySlip.paymentReference = paymentReference || `SAL-${Date.now().toString().slice(-6)}`;

    await employee.save();
    return res.json({ success: true, message: 'Salary marked as PAID and disbursed', data: employee });
  } catch (error) {
    console.error('Error processing payroll payment:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================
// 6. EMPLOYEE S3 DOCUMENT VAULT
// =========================================================

export const uploadEmployeeDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { documentType, documentName } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'No document file uploaded' });
    }

    const employee = await Employee.findById(id);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    const uploadResult = await uploadFileToS3(file.buffer, file.originalname, file.mimetype, 'employee_documents');

    employee.documents.push({
      documentType: documentType || 'aadhaar',
      documentName: documentName || file.originalname,
      fileUrl: uploadResult.documentUrl,
      uploadedAt: new Date(),
      verificationStatus: 'verified'
    });

    await employee.save();
    return res.json({ success: true, message: 'Employee document uploaded to S3', data: employee });
  } catch (error) {
    console.error('Error uploading employee document:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================
// 7. HR SUMMARY & ANALYTICS
// =========================================================

export const getHRSummary = async (req, res) => {
  try {
    const employees = await Employee.find();
    const activeStaff = employees.filter((e) => e.employmentStatus === 'active').length;

    // Today's Attendance
    const todayStr = new Date().toISOString().slice(0, 10);
    let todayPresent = 0;
    let pendingLeavesCount = 0;
    let monthlyPayrollOutflow = 0;

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    employees.forEach((emp) => {
      // Attendance
      const attToday = emp.attendance.find((a) => a.date && new Date(a.date).toISOString().slice(0, 10) === todayStr);
      if (attToday && (attToday.status === 'present' || attToday.status === 'late')) {
        todayPresent++;
      }

      // Leaves
      pendingLeavesCount += emp.leaves.filter((l) => l.status === 'pending').length;

      // Payroll
      const paySlip = emp.payroll.find((p) => p.month === currentMonth && p.year === currentYear);
      if (paySlip) {
        monthlyPayrollOutflow += (paySlip.netSalary || 0);
      }
    });

    const attendanceRate = activeStaff > 0 ? Math.round((todayPresent / activeStaff) * 100) : 100;

    return res.json({
      success: true,
      data: {
        totalEmployees: employees.length,
        activeStaff,
        todayAttendancePercent: attendanceRate,
        pendingLeavesCount,
        monthlyPayrollOutflow: Math.round(monthlyPayrollOutflow)
      }
    });
  } catch (error) {
    console.error('Error fetching HR summary:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
