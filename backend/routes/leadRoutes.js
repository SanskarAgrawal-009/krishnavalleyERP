import express from 'express';
import {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  addFollowUp,
  updateFollowUp,
  deleteFollowUp,
  matureSiteVisitAction,
  approveSiteVisitAction,
  rejectSiteVisitAction,
  assignLeadsAction,
  distributeRoundRobinAction,
  updateLeadStatusAction,
  scheduleFollowUpAction,
  getSalesTeamAction,
  addSalesTeamMemberAction,
  updateSalesTeamMemberAction,
  deleteSalesTeamMemberAction,
  metaWebhookVerifyAction,
  metaWebhookReceiveAction,
  getMetaConfigAction,
  updateMetaConfigAction,
  testMetaLeadAction,
  logExternalSiteVisitAction,
  getDueRemindersAction,
  sendManualReminderAction,
  snoozeReminderAction,
  bulkUploadLeadsAction,
  downloadLeadTemplateAction,
  bulkDeleteByStageAction,
  bulkDeleteLeadsAction,
} from '../controllers/leadController.js';
import { optionalAuth, authenticateToken } from '../middleware/authMiddleware.js';
import { authorizePermission } from '../middleware/roleMiddleware.js';
import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

const router = express.Router();

// Apply optionalAuth to lead routes to capture agent/user identity if logged in
router.use(optionalAuth);

// Bulk Lead Excel Upload & Template Endpoints (Placed before /:id)
router.get('/excel-template', downloadLeadTemplateAction);
router.post('/bulk-upload', authenticateToken, authorizePermission('crm:create', 'crm:manage'), upload.single('file'), bulkUploadLeadsAction);

// Automated & Manual Reminder Engine Endpoints (Placed before /:id)
router.get('/reminders/due', authenticateToken, authorizePermission('crm:view', 'crm:edit'), getDueRemindersAction);
router.post('/reminders/send-manual', authenticateToken, authorizePermission('crm:edit', 'notifications:send'), sendManualReminderAction);
router.post('/reminders/snooze', authenticateToken, authorizePermission('crm:view', 'crm:edit'), snoozeReminderAction);

// Meta Ads (Facebook & Instagram) Webhook & API Endpoints
router.get('/meta-webhook', metaWebhookVerifyAction);
router.post('/meta-webhook', metaWebhookReceiveAction);
router.get('/meta-config', authenticateToken, authorizePermission('crm:manage', 'settings:view'), getMetaConfigAction);
router.put('/meta-config', authenticateToken, authorizePermission('crm:manage', 'settings:manage'), updateMetaConfigAction);
router.post('/meta-test-lead', authenticateToken, authorizePermission('crm:manage', 'crm:create'), testMetaLeadAction);

// Sales Team Management Endpoints (Placed before /:id)
router.get('/team', authenticateToken, authorizePermission('crm:view', 'crm:manage'), getSalesTeamAction);
router.post('/team', authenticateToken, authorizePermission('crm:manage'), addSalesTeamMemberAction);
router.put('/team/:id', authenticateToken, authorizePermission('crm:manage'), updateSalesTeamMemberAction);
router.delete('/team/:id', authenticateToken, authorizePermission('crm:manage'), deleteSalesTeamMemberAction);

// Lead Assignment & Round-Robin Distribution
router.post('/assign', authenticateToken, authorizePermission('crm:manage', 'crm:edit'), assignLeadsAction);
router.post('/distribute-round-robin', authenticateToken, authorizePermission('crm:manage'), distributeRoundRobinAction);

// Bulk Deletion Endpoints (MUST be registered before /:id)
router.post('/bulk-delete-by-stage', authenticateToken, authorizePermission('crm:delete', 'crm:manage'), bulkDeleteByStageAction);
router.post('/bulk-delete', authenticateToken, authorizePermission('crm:delete', 'crm:manage'), bulkDeleteLeadsAction);

// Lead Core Endpoints
router.get('/', getLeads);
router.get('/:id', getLeadById);
router.post('/', createLead);
router.put('/:id', updateLead);
router.delete('/:id', authenticateToken, authorizePermission('crm:delete', 'crm:manage'), deleteLead);

// Quick Status Update & Follow-Up Scheduling
router.patch('/:id/status', authenticateToken, authorizePermission('crm:edit', 'crm:manage'), updateLeadStatusAction);
router.post('/:id/schedule-follow-up', authenticateToken, authorizePermission('crm:edit', 'crm:create'), scheduleFollowUpAction);

// Site visit maturity & inhouse approval workflow
router.post('/external-site-visit', logExternalSiteVisitAction);
router.post('/:id/external-site-visit', logExternalSiteVisitAction);
router.post('/:id/mature-site-visit', authenticateToken, authorizePermission('crm:manage', 'crm:edit'), matureSiteVisitAction);
router.post('/:id/approve-site-visit', authenticateToken, authorizePermission('crm:manage'), approveSiteVisitAction);
router.post('/:id/reject-site-visit', authenticateToken, authorizePermission('crm:manage'), rejectSiteVisitAction);

// Follow-Up Subdocument Endpoints
router.post('/:id/follow-ups', addFollowUp);
router.put('/:id/follow-ups/:followUpId', updateFollowUp);
router.delete('/:id/follow-ups/:followUpId', authenticateToken, authorizePermission('crm:edit', 'crm:manage'), deleteFollowUp);

export default router;
