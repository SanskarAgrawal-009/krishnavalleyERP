import express from 'express';
import {
  getWorkforceOverview,
  getPerformanceMetrics,
  getTimelineData,
  getDepartmentStats,
  bulkReassignTasks,
  bulkTaskAction,
} from '../controllers/taskforceManagerController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizePermission } from '../middleware/roleMiddleware.js';

const router = express.Router();

// All taskforce manager routes require authentication
router.use(authenticateToken);

// Workforce & Team Management
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
