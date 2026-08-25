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
} from '../controllers/leadController.js';
import { optionalAuth, authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply optionalAuth to lead routes to capture agent identity if logged in
router.use(optionalAuth);

// Lead Core Endpoints
router.get('/', getLeads);
router.get('/:id', getLeadById);
router.post('/', createLead);
router.put('/:id', updateLead);
router.delete('/:id', deleteLead);

// Site visit maturity & inhouse approval workflow
router.post('/:id/mature-site-visit', matureSiteVisitAction);
router.post('/:id/approve-site-visit', authenticateToken, approveSiteVisitAction);
router.post('/:id/reject-site-visit', authenticateToken, rejectSiteVisitAction);

// Follow-Up Subdocument Endpoints
router.post('/:id/follow-ups', addFollowUp);
router.put('/:id/follow-ups/:followUpId', updateFollowUp);
router.delete('/:id/follow-ups/:followUpId', deleteFollowUp);

export default router;
