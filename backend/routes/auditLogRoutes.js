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
router.get('/stats', authorizeRoles('super_admin', 'admin', 'auditor'), getAuditStats);
router.get('/export', authorizeRoles('super_admin', 'admin', 'auditor'), exportAuditLogs);
router.get('/:id', authorizeRoles('super_admin', 'admin', 'auditor'), getAuditLogById);
router.get('/', authorizeRoles('super_admin', 'admin', 'auditor'), getAuditLogs);

export default router;
