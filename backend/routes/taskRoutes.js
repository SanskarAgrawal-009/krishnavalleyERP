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

const router = express.Router();

// All task routes require authentication
router.use(authenticateToken);

// Metadata for Taskforce allocation (assignees, departments, projects)
router.get('/meta/assignees', getTaskAssigneesMeta);

// KPI Stats for dashboard & overview
router.get('/stats', getTaskStats);

// Task operations
router.get('/', getTasks);
router.get('/:id', getTaskById);
router.post('/', createTask);
router.put('/:id', updateTask);
router.patch('/:id/progress', updateTaskProgress);
router.patch('/:id/checkpoints/:checkpointId', toggleCheckpoint);
router.post('/:id/follow-up', logFollowUp);
router.post('/:id/comments', addComment);
router.delete('/:id', deleteTask);

export default router;
