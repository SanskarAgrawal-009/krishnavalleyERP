import express from 'express';
import {
  getAuditLogs,
  getAuditStats,
  getAuditLogById,
  exportAuditLogs,
} from '../controllers/auditLogController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizeRoles, authorizePermission } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Apply auth to all audit routes
router.use(authenticateToken);

// Read Audit Logs & KPIs
router.get('/stats', authorizePermission('audit:view'), getAuditStats);
router.get('/export', authorizePermission('audit:export', 'audit:view'), exportAuditLogs);
router.get('/:id', authorizePermission('audit:view'), getAuditLogById);
router.get('/', authorizePermission('audit:view'), getAuditLogs);

export default router;
