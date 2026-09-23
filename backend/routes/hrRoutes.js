import express from 'express';
import multer from 'multer';
import {
  getHRMaster,
  addDepartment,
  updateDepartment,
  deleteDepartment,
  addRole,
  updateRole,
  deleteRole,
  getRolesByDepartment,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployees,
  getEmployeeById,
  logAttendance,
  logBulkAttendance,
  getAttendanceByDate,
  applyLeave,
  updateLeaveStatus,
  deleteLeave,
  updateLeaveBalance,
  updateEmployeeIdDetails,
  generateMonthlyPayroll,
  getMonthlyPayrollRegister,
  processPayrollPayment,
  uploadEmployeeDocument,
  getHRSummary,
  seedSampleStaff
} from '../controllers/hrController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizePermission } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Multer memory storage for S3 uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

// Apply auth to all HR routes
router.use(authenticateToken);

// HR Summary
router.get('/summary', authorizePermission('hr:view'), getHRSummary);

// 1. Master Data (Departments & Roles)
router.get('/master', authorizePermission('hr:view'), getHRMaster);
router.get('/roles', authorizePermission('hr:view'), getRolesByDepartment);
router.post('/departments', authorizePermission('hr:manage'), addDepartment);
router.put('/departments/:deptId', authorizePermission('hr:manage'), updateDepartment);
router.delete('/departments/:deptId', authorizePermission('hr:manage'), deleteDepartment);
router.post('/roles', authorizePermission('hr:manage'), addRole);
router.put('/roles/:roleId', authorizePermission('hr:manage'), updateRole);
router.delete('/roles/:roleId', authorizePermission('hr:manage'), deleteRole);

// 2. Employee CRUD & Identity
router.post('/employees', authorizePermission('hr:manage'), createEmployee);
router.get('/employees', authorizePermission('hr:view'), getEmployees);
router.get('/employees/:id', authorizePermission('hr:view'), getEmployeeById);
router.put('/employees/:id', authorizePermission('hr:edit', 'hr:manage'), updateEmployee);
router.put('/employees/:id/id-details', authorizePermission('hr:edit', 'hr:manage'), updateEmployeeIdDetails);
router.delete('/employees/:id', authorizePermission('hr:manage'), deleteEmployee);
router.post('/seed-sample-staff', authorizePermission('hr:manage'), seedSampleStaff);

// 3. Attendance
router.get('/attendance', authorizePermission('hr:view'), getAttendanceByDate);
router.post('/attendance/bulk', authorizePermission('hr:edit', 'hr:manage'), logBulkAttendance);
router.post('/employees/:id/attendance', authorizePermission('hr:edit', 'hr:manage'), logAttendance);

// 4. Centralized Leaves & Quotas
router.post('/employees/:id/leaves', authorizePermission('hr:edit', 'hr:view'), applyLeave);
router.put('/employees/:id/leaves/:leaveId', authorizePermission('hr:edit', 'hr:manage'), updateLeaveStatus);
router.delete('/employees/:id/leaves/:leaveId', authorizePermission('hr:edit', 'hr:manage'), deleteLeave);
router.put('/employees/:id/leave-balance', authorizePermission('hr:edit', 'hr:manage'), updateLeaveBalance);

// 5. Payroll
router.get('/payroll', authorizePermission('hr:payroll', 'hr:view'), getMonthlyPayrollRegister);
router.post('/payroll/generate', authorizePermission('hr:payroll', 'hr:manage'), generateMonthlyPayroll);
router.post('/employees/:id/payroll/:payrollId/pay', authorizePermission('hr:payroll', 'hr:manage'), upload.single('paymentProof'), processPayrollPayment);

// 6. Documents Vault
router.post('/employees/:id/documents', authorizePermission('hr:manage', 'documents:upload'), upload.single('documentFile'), uploadEmployeeDocument);

export default router;
