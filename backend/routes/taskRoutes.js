import express from 'express';
import {
  getTasks,
  getTaskStats,
  getTaskById,
  createTask,
  updateTask,
  updateTaskProgress,
  logFollowUp,
  addComment,
  deleteTask,
  getTaskAssigneesMeta,
  toggleCheckpoint,
} from '../controllers/taskController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizePermission } from '../middleware/roleMiddleware.js';

const router = express.Router();

// All task routes require authentication
router.use(authenticateToken);

// Metadata for Taskforce allocation (assignees, departments, projects)
router.get('/meta/assignees', authorizePermission('tasks:view', 'tasks:manage', 'tasks:create'), getTaskAssigneesMeta);

// KPI Stats for dashboard & overview
router.get('/stats', authorizePermission('tasks:view', 'tasks:manage'), getTaskStats);

// Task operations
router.get('/', authorizePermission('tasks:view', 'tasks:manage'), getTasks);
router.get('/:id', authorizePermission('tasks:view', 'tasks:manage'), getTaskById);
router.post('/', authorizePermission('tasks:create', 'tasks:manage'), createTask);
router.put('/:id', authorizePermission('tasks:edit', 'tasks:manage'), updateTask);
router.patch('/:id/progress', authorizePermission('tasks:edit', 'tasks:manage'), updateTaskProgress);
router.patch('/:id/checkpoints/:checkpointId', authorizePermission('tasks:edit', 'tasks:manage'), toggleCheckpoint);
router.post('/:id/follow-up', authorizePermission('tasks:edit', 'tasks:manage'), logFollowUp);
router.post('/:id/comments', authorizePermission('tasks:view', 'tasks:edit', 'tasks:manage'), addComment);
router.delete('/:id', authorizePermission('tasks:manage'), deleteTask);

export default router;
