import express from 'express';
import multer from 'multer';
import {
  getAgentDashboard,
  getAgentLeads,
  uploadAgentLead,
  getAgentCommissions,
  lookupAgentByCode,
  recordSiteVisit,
  getSiteVisits,
  verifySiteVisit,
  getAllAgents,
  getAgentAuditLogs,
  createAgent,
} from '../controllers/agentController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizePermission } from '../middleware/roleMiddleware.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit for photo/proof
});

// Onboard New Channel Partner Agent
router.post('/', authenticateToken, authorizePermission('agent:create', 'agent:manage', 'crm:create', 'crm:manage', 'users:manage'), createAgent);
router.post('/create', authenticateToken, authorizePermission('agent:create', 'agent:manage', 'crm:create', 'crm:manage', 'users:manage'), createAgent);

// Agent Network Directory (Admin / CRM)
router.get('/all', authenticateToken, authorizePermission('agent:view', 'agent:manage', 'crm:view', 'crm:manage', 'sales:view'), getAllAgents);

// Agent Lookup (Allows fast verification by code)
router.get('/lookup/:code', authenticateToken, authorizePermission('agent:view', 'agent:manage', 'crm:view', 'crm:manage', 'sales:view', 'crm:create'), lookupAgentByCode);

// Site Visit Verification Endpoints
router.post('/site-visits', authenticateToken, authorizePermission('agent:upload', 'agent:leads', 'crm:create', 'crm:edit'), upload.single('partySelfie'), recordSiteVisit);
router.get('/site-visits', authenticateToken, authorizePermission('agent:leads', 'agent:view', 'crm:view', 'crm:manage'), getSiteVisits);
router.put('/site-visits/:id/verify', authenticateToken, authorizePermission('agent:verify', 'crm:manage', 'sales:approve', 'crm:edit'), verifySiteVisit);

// Agent Dashboard & Leads & Audit
router.get('/dashboard', authenticateToken, authorizePermission('agent:leads', 'agent:wallet', 'agent:view', 'crm:view'), getAgentDashboard);
router.get('/leads', authenticateToken, authorizePermission('agent:leads', 'crm:view'), getAgentLeads);
router.post('/upload', authenticateToken, authorizePermission('agent:upload', 'crm:create'), uploadAgentLead);
router.get('/commissions', authenticateToken, authorizePermission('agent:wallet', 'agent:manage', 'sales:view', 'reports:financial'), getAgentCommissions);
router.get('/audit-logs', authenticateToken, authorizePermission('agent:leads', 'agent:manage', 'audit:view'), getAgentAuditLogs);

export default router;
