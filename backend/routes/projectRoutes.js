import express from 'express';
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  addBuilding,
  deleteBuilding,
  addFloorToBuilding
} from '../controllers/projectController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizePermission } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Apply auth to all project routes
router.use(authenticateToken);

// Projects Endpoints
router.get('/', authorizePermission('inventory:view', 'projects:view'), getProjects);
router.get('/:id', authorizePermission('inventory:view', 'projects:view'), getProjectById);
router.post('/', authorizePermission('inventory:create', 'inventory:manage'), createProject);
router.put('/:id', authorizePermission('inventory:edit', 'inventory:manage'), updateProject);
router.delete('/:id', authorizePermission('inventory:manage'), deleteProject);

// Buildings & Floors Endpoints
router.post('/:projectId/buildings', authorizePermission('inventory:create', 'inventory:manage'), addBuilding);
router.delete('/:projectId/buildings/:buildingId', authorizePermission('inventory:manage'), deleteBuilding);
router.post('/:projectId/buildings/:buildingId/floors', authorizePermission('inventory:create', 'inventory:manage'), addFloorToBuilding);

export default router;
