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
} from '../controllers/leadController.js';
import { optionalAuth, authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply optionalAuth to lead routes to capture agent/user identity if logged in
router.use(optionalAuth);

// Automated & Manual Reminder Engine Endpoints (Placed before /:id)
router.get('/reminders/due', authenticateToken, getDueRemindersAction);
router.post('/reminders/send-manual', authenticateToken, sendManualReminderAction);
router.post('/reminders/snooze', authenticateToken, snoozeReminderAction);

// Meta Ads (Facebook & Instagram) Webhook & API Endpoints
router.get('/meta-webhook', metaWebhookVerifyAction);
router.post('/meta-webhook', metaWebhookReceiveAction);
router.get('/meta-config', authenticateToken, getMetaConfigAction);
router.put('/meta-config', authenticateToken, updateMetaConfigAction);
router.post('/meta-test-lead', authenticateToken, testMetaLeadAction);

// Sales Team Management Endpoints (Placed before /:id)
router.get('/team', getSalesTeamAction);
router.post('/team', authenticateToken, addSalesTeamMemberAction);
router.put('/team/:id', authenticateToken, updateSalesTeamMemberAction);
router.delete('/team/:id', authenticateToken, deleteSalesTeamMemberAction);

// Lead Assignment & Round-Robin Distribution
router.post('/assign', authenticateToken, assignLeadsAction);
router.post('/distribute-round-robin', authenticateToken, distributeRoundRobinAction);

// Lead Core Endpoints
router.get('/', getLeads);
router.get('/:id', getLeadById);
router.post('/', createLead);
router.put('/:id', updateLead);
router.delete('/:id', deleteLead);

// Quick Status Update & Follow-Up Scheduling
router.patch('/:id/status', authenticateToken, updateLeadStatusAction);
router.post('/:id/schedule-follow-up', authenticateToken, scheduleFollowUpAction);

// Site visit maturity & inhouse approval workflow
router.post('/external-site-visit', logExternalSiteVisitAction);
router.post('/:id/external-site-visit', logExternalSiteVisitAction);
router.post('/:id/mature-site-visit', matureSiteVisitAction);
router.post('/:id/approve-site-visit', authenticateToken, approveSiteVisitAction);
router.post('/:id/reject-site-visit', authenticateToken, rejectSiteVisitAction);

// Follow-Up Subdocument Endpoints
router.post('/:id/follow-ups', addFollowUp);
router.put('/:id/follow-ups/:followUpId', updateFollowUp);
router.delete('/:id/follow-ups/:followUpId', deleteFollowUp);

export default router;
