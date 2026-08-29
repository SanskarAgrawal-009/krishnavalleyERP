import express from 'express';
import multer from 'multer';
import {
  getHRMaster,
  addDepartment,
  addRole,
  getRolesByDepartment,
  createEmployee,
  getEmployees,
  getEmployeeById,
  logAttendance,
  applyLeave,
  updateLeaveStatus,
  generateMonthlyPayroll,
  processPayrollPayment,
  uploadEmployeeDocument,
  getHRSummary
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

// 1. Master Data
router.get('/master', authorizePermission('hr:view'), getHRMaster);
router.get('/roles', authorizePermission('hr:view'), getRolesByDepartment);
router.post('/departments', authorizePermission('hr:manage'), addDepartment);
router.post('/roles', authorizePermission('hr:manage'), addRole);

// 2. Employee CRUD
router.post('/employees', authorizePermission('hr:manage'), createEmployee);
router.get('/employees', authorizePermission('hr:view'), getEmployees);
router.get('/employees/:id', authorizePermission('hr:view'), getEmployeeById);

// 3. Attendance
router.post('/employees/:id/attendance', authorizePermission('hr:edit', 'hr:manage'), logAttendance);

// 4. Leaves
router.post('/employees/:id/leaves', authorizePermission('hr:edit', 'hr:view'), applyLeave);
router.put('/employees/:id/leaves/:leaveId', authorizePermission('hr:edit', 'hr:manage'), updateLeaveStatus);

// 5. Payroll
router.post('/payroll/generate', authorizePermission('hr:payroll', 'hr:manage'), generateMonthlyPayroll);
router.post('/employees/:id/payroll/:payrollId/pay', authorizePermission('hr:payroll', 'hr:manage'), upload.single('paymentProof'), processPayrollPayment);

// 6. Documents Vault
router.post('/employees/:id/documents', authorizePermission('hr:manage', 'documents:upload'), upload.single('documentFile'), uploadEmployeeDocument);

export default router;
