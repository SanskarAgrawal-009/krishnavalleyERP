import express from 'express';
import {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getAllPermissions,
  getBranches,
} from '../controllers/roleController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizeRoles, authorizePermission } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Apply auth to all role routes
router.use(authenticateToken);

// Metadata routes
router.get('/permissions', getAllPermissions);
router.get('/branches', getBranches);

// Roles CRUD
router.get('/', authorizePermission('roles:view', 'users:view', 'users:manage'), getRoles);
router.get('/:id', authorizePermission('roles:view', 'users:manage'), getRoleById);
router.post('/', authorizePermission('roles:manage', 'users:manage'), createRole);
router.put('/:id', authorizePermission('roles:manage', 'users:manage'), updateRole);
router.delete('/:id', authorizeRoles('super_admin', 'admin'), deleteRole);

export default router;
