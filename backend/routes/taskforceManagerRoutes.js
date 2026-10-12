import express from 'express';
import {
  getWorkforceOverview,
  getPerformanceMetrics,
  getTimelineData,
  getDepartmentStats,
  bulkReassignTasks,
  bulkTaskAction,
} from '../controllers/taskforceManagerController.js';
import {
  getTeamMembers,
  addTeamMember,
  updateTeamMember,
  deleteTeamMember,
  getTaskforceDepartments,
  createTaskforceDepartment,
  updateTaskforceDepartment,
  deleteDepartment,
  getMemberDashboard,
} from '../controllers/taskforceTeamController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizePermission } from '../middleware/roleMiddleware.js';

const router = express.Router();

// All taskforce manager routes require authentication
router.use(authenticateToken);

// ==========================================
// TASKFORCE TEAM HIERARCHY & DEPARTMENTS
// ==========================================
router.get('/team', authorizePermission('tasks:view', 'tasks:manage'), getTeamMembers);
router.post('/team', authorizePermission('tasks:create', 'tasks:manage'), addTeamMember);
router.put('/team/:id', authorizePermission('tasks:edit', 'tasks:manage'), updateTeamMember);
router.delete('/team/:id', authorizePermission('tasks:manage'), deleteTeamMember);

// Managed Departments CRUD
router.get('/departments', authorizePermission('tasks:view', 'tasks:manage'), getTaskforceDepartments);
router.post('/departments', authorizePermission('tasks:manage', 'tasks:create'), createTaskforceDepartment);
router.put('/departments/:id', authorizePermission('tasks:manage'), updateTaskforceDepartment);
router.delete('/departments/:id', authorizePermission('tasks:manage'), deleteDepartment);
router.post('/department/delete', authorizePermission('tasks:manage'), deleteDepartment);

// Member Personal & Scoped Dashboard
router.get('/team/:id/dashboard', authorizePermission('tasks:view', 'tasks:manage'), getMemberDashboard);
router.get('/my-dashboard', authorizePermission('tasks:view', 'tasks:manage'), getMemberDashboard);

// Workforce & Team Management Overview
router.get('/workforce', authorizePermission('tasks:view', 'tasks:manage'), getWorkforceOverview);

// Performance Analytics
router.get('/performance', authorizePermission('tasks:view', 'tasks:manage'), getPerformanceMetrics);

// Gantt / Timeline View
router.get('/timeline', authorizePermission('tasks:view', 'tasks:manage'), getTimelineData);

// Department Stats
router.get('/department-stats', authorizePermission('tasks:view', 'tasks:manage'), getDepartmentStats);

// Bulk Operations (Delegation / Approval Workflow)
router.post('/bulk-reassign', authorizePermission('tasks:manage'), bulkReassignTasks);
router.post('/bulk-action', authorizePermission('tasks:manage'), bulkTaskAction);

export default router;

