import express from 'express';
import {
  getSalesReport,
  getRentalReport,
  getCollectionReport,
  getMaintenanceReport,
  getInventoryReport,
  getFinanceReport,
  getCRMReport,
  getHRReport
} from '../controllers/reportController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizePermission } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Apply auth to all report routes
router.use(authenticateToken);

router.get('/sales', authorizePermission('reports:view', 'sales:view'), getSalesReport);
router.get('/rental', authorizePermission('reports:view', 'rentals:view'), getRentalReport);
router.get('/collection', authorizePermission('reports:financial', 'reports:view'), getCollectionReport);
router.get('/maintenance', authorizePermission('reports:view', 'maintenance:view'), getMaintenanceReport);
router.get('/inventory', authorizePermission('reports:view', 'inventory:view'), getInventoryReport);
router.get('/finance', authorizePermission('reports:financial'), getFinanceReport);
router.get('/crm', authorizePermission('reports:view', 'crm:view'), getCRMReport);
router.get('/hr', authorizePermission('reports:view', 'hr:view'), getHRReport);

export default router;
