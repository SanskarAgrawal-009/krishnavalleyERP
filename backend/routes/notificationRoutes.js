import express from 'express';
import {
  getNotificationConfig,
  updateNotificationConfig,
  testChannelDispatch,
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  seedDefaultTemplates,
  sendTemplateNotification,
  getNotificationLogs,
  clearNotificationLogs
} from '../controllers/notificationController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizePermission } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Apply auth to all notification routes
router.use(authenticateToken);

// Configuration routes
router.get('/config', authorizePermission('notifications:view'), getNotificationConfig);
router.put('/config', authorizePermission('notifications:send', 'notifications:manage'), updateNotificationConfig);

// Test channel dispatch
router.post('/test-channel', authorizePermission('notifications:send'), testChannelDispatch);

// Direct template dispatch
router.post('/send-template', authorizePermission('notifications:send'), sendTemplateNotification);

// Template management routes
router.get('/templates', authorizePermission('notifications:view'), getTemplates);
router.post('/templates', authorizePermission('notifications:send', 'notifications:manage'), createTemplate);
router.put('/templates/:id', authorizePermission('notifications:send', 'notifications:manage'), updateTemplate);
router.delete('/templates/:id', authorizePermission('notifications:manage'), deleteTemplate);
router.post('/templates/seed', authorizePermission('notifications:manage'), seedDefaultTemplates);

// Audit logs routes
router.get('/logs', authorizePermission('notifications:view'), getNotificationLogs);
router.delete('/logs', authorizePermission('notifications:manage'), clearNotificationLogs);

export default router;
