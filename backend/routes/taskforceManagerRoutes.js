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

const router = express.Router();

// All taskforce manager routes require authentication
router.use(authenticateToken);

// Workforce & Team Management
router.get('/workforce', getWorkforceOverview);

// Performance Analytics
router.get('/performance', getPerformanceMetrics);

// Gantt / Timeline View
router.get('/timeline', getTimelineData);

// Department Stats
router.get('/department-stats', getDepartmentStats);

// Bulk Operations (Delegation / Approval Workflow)
router.post('/bulk-reassign', bulkReassignTasks);
router.post('/bulk-action', bulkTaskAction);

export default router;
