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
router.put('/:section', authorizeRoles('super_admin', 'admin'), updateSettingsSection);

// Live test triggers
router.post('/email/test', authorizeRoles('super_admin', 'admin'), testEmailConfig);
router.post('/whatsapp/test', authorizeRoles('super_admin', 'admin'), testWhatsAppConfig);

// Backup triggers & export
router.post('/backup/trigger', authorizeRoles('super_admin', 'admin'), triggerManualBackup);
router.get('/backup/export', authorizeRoles('super_admin', 'admin'), exportBackupData);

export default router;
