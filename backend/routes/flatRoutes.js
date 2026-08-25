import express from 'express';
import multer from 'multer';
import {
  getFlats,
  getFlatById,
  createFlat,
  updateFlat,
  deleteFlat,
  uploadFlatBlueprint
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

// Flats Endpoints
router.get('/', authorizePermission('inventory:view'), getFlats);
router.get('/:id', authorizePermission('inventory:view'), getFlatById);
router.post('/', authorizePermission('inventory:create', 'inventory:manage'), createFlat);
router.put('/:id', authorizePermission('inventory:edit', 'inventory:manage'), updateFlat);
router.delete('/:id', authorizePermission('inventory:manage'), deleteFlat);
router.post('/:id/blueprints', authorizePermission('inventory:edit', 'inventory:manage'), upload.single('blueprintFile'), uploadFlatBlueprint);

export default router;
