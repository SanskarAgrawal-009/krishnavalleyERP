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
} from '../controllers/agentController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit for photo/proof
});

// Agent Network Directory (Admin / CRM)
router.get('/all', authenticateToken, getAllAgents);

// Agent Lookup (Allows fast verification by code)
router.get('/lookup/:code', authenticateToken, lookupAgentByCode);

// Site Visit Verification Endpoints
router.post('/site-visits', authenticateToken, upload.single('partySelfie'), recordSiteVisit);
router.get('/site-visits', authenticateToken, getSiteVisits);
router.put('/site-visits/:id/verify', authenticateToken, verifySiteVisit);

// Agent Dashboard & Leads & Audit
router.get('/dashboard', authenticateToken, getAgentDashboard);
router.get('/leads', authenticateToken, getAgentLeads);
router.post('/upload', authenticateToken, uploadAgentLead);
router.get('/commissions', authenticateToken, getAgentCommissions);
router.get('/audit-logs', authenticateToken, getAgentAuditLogs);

export default router;
