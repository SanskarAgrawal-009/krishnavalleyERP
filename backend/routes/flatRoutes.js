import express from 'express';
import multer from 'multer';
import {
  getFlats,
  getFlatById,
  createFlat,
  updateFlat,
  deleteFlat,
  uploadFlatBlueprint,
  importFlatsFromExcel,
  bulkEnrollRentalSales,
  bulkDeleteFlats,
  deleteAllFlats
} from '../controllers/flatController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizePermission } from '../middleware/roleMiddleware.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 } // 30MB max
});

// Apply auth to all flat routes
router.use(authenticateToken);

// Bulk Excel / Legacy Import & Bulk Enrollment & Bulk Deletion Endpoints
router.post('/import-excel', authorizePermission('inventory:create', 'inventory:manage'), upload.single('excelFile'), importFlatsFromExcel);
router.post('/bulk-enroll-rental-sales', authorizePermission('inventory:create', 'inventory:manage', 'sales:create', 'rentals:create'), bulkEnrollRentalSales);
router.post('/bulk-delete', authorizePermission('inventory:manage'), bulkDeleteFlats);
router.delete('/delete-all-flats', authorizePermission('inventory:manage'), deleteAllFlats);

// Flats Endpoints
router.get('/', authorizePermission('inventory:view'), getFlats);
router.get('/:id', authorizePermission('inventory:view'), getFlatById);
router.post('/', authorizePermission('inventory:create', 'inventory:manage'), createFlat);
router.put('/:id', authorizePermission('inventory:edit', 'inventory:manage'), updateFlat);
router.delete('/:id', authorizePermission('inventory:manage'), deleteFlat);
router.post('/:id/blueprints', authorizePermission('inventory:edit', 'inventory:manage'), upload.single('blueprintFile'), uploadFlatBlueprint);

export default router;
