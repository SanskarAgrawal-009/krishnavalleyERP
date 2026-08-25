import express from 'express';
import multer from 'multer';
import {
  createMaintenanceBill,
  batchGenerateMaintenanceBills,
  getMaintenanceBills,
  recordMaintenancePayment,
  verifyMaintenancePayment,
  createServiceRequest,
  getServiceRequests,
  updateServiceRequest,
  uploadServicePhoto,
  levyPenalty,
  getPenalties,
  settlePenalty
} from '../controllers/maintenanceController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizePermission } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Multer memory storage for S3 uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

// Apply auth to all maintenance routes
router.use(authenticateToken);

// 1. Maintenance Billing
router.post('/bills', authorizePermission('maintenance:create', 'maintenance:manage'), createMaintenanceBill);
router.post('/bills/batch', authorizePermission('maintenance:create', 'maintenance:manage'), batchGenerateMaintenanceBills);
router.get('/bills', authorizePermission('maintenance:view'), getMaintenanceBills);
router.post('/bills/:id/pay', authorizePermission('maintenance:create', 'maintenance:manage', 'maintenance:view'), upload.single('proofFile'), recordMaintenancePayment);
router.put('/bills/:id/verify', authorizePermission('maintenance:manage', 'accounts:manage', 'admin:manage'), verifyMaintenancePayment);

// 2. Service Requests
router.post('/service-requests', authorizePermission('maintenance:view', 'maintenance:manage'), createServiceRequest);
router.get('/service-requests', authorizePermission('maintenance:view'), getServiceRequests);
router.put('/service-requests/:id', authorizePermission('maintenance:manage'), updateServiceRequest);
router.post('/service-requests/:id/photos', authorizePermission('maintenance:view', 'maintenance:manage'), upload.single('photoFile'), uploadServicePhoto);

// 3. Tenant Penalties & Infractions
router.post('/penalties', authorizePermission('maintenance:manage'), upload.single('evidenceFile'), levyPenalty);
router.get('/penalties', authorizePermission('maintenance:view'), getPenalties);
router.put('/penalties/:id/settle', authorizePermission('maintenance:manage'), settlePenalty);

export default router;
