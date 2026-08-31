import express from 'express';
import {
  initiateOutboundCall,
  logCall,
  getCallHistory,
  getTelephonyConfig,
  updateTelephonyConfig,
  handleWebhookStatus,
  handleTwiMLResponse
} from '../controllers/callingController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizePermission } from '../middleware/roleMiddleware.js';

const router = express.Router();

// ================= PUBLIC WEBHOOK ROUTES =================
// Twilio / Exotel webhooks execute without Bearer JWT token
router.post('/webhook/status', handleWebhookStatus);
router.all('/webhook/twiml', handleTwiMLResponse);

// ================= AUTHENTICATED ROUTES =================
router.use(authenticateToken);

// Initiate Outbound Click-to-Call
router.post('/initiate', initiateOutboundCall);

// Log Call Disposition & Notes
router.post('/log', logCall);

// Call Logs / Telephony Audit History
router.get('/logs', getCallHistory);

// Telephony Gateway Configuration
router.get('/config', authorizePermission('notifications:view', 'settings:view'), getTelephonyConfig);
router.put('/config', authorizePermission('notifications:manage', 'settings:edit'), updateTelephonyConfig);

export default router;
