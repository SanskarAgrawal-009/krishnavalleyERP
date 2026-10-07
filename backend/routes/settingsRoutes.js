import express from 'express';
import {
  getSettings,
  updateSettingsSection,
  testEmailConfig,
  testWhatsAppConfig,
  triggerManualBackup,
  exportBackupData,
} from '../controllers/systemSettingsController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizeRoles, authorizePermission } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Apply authentication to all settings endpoints
router.use(authenticateToken);

// Read settings
router.get('/', authorizePermission('settings:view', 'settings:manage', 'users:view'), getSettings);

// Update section settings
router.put('/:section', authorizePermission('settings:manage'), updateSettingsSection);

// Live test triggers
router.post('/email/test', authorizePermission('settings:manage'), testEmailConfig);
router.post('/whatsapp/test', authorizePermission('settings:manage'), testWhatsAppConfig);

// Backup triggers & export
router.post('/backup/trigger', authorizePermission('settings:manage'), triggerManualBackup);
router.get('/backup/export', authorizePermission('settings:manage'), exportBackupData);

export default router;
