import express from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserStatus,
  resetUserPassword,
  deleteUser,
} from '../controllers/userController.js';
import { getBranches } from '../controllers/roleController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizeRoles, authorizePermission } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Apply auth to all user routes
router.use(authenticateToken);

router.get('/branches', getBranches);
router.get('/', authorizePermission('users:view', 'users:manage'), getUsers);
router.get('/:id', authorizePermission('users:view', 'users:manage'), getUserById);
router.post('/', authorizePermission('users:manage'), createUser);
router.put('/:id', authorizePermission('users:manage'), updateUser);
router.patch('/:id/status', authorizePermission('users:manage'), updateUserStatus);
router.post('/:id/reset-password', authorizePermission('users:manage'), resetUserPassword);
router.delete('/:id', authorizeRoles('super_admin', 'admin'), deleteUser);

export default router;
