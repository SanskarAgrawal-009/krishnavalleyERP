import express from 'express';
import multer from 'multer';
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
  getRecentTaskChats,
} from '../controllers/taskController.js';
import {
  uploadTaskProof,
  deleteTaskUpload,
} from '../controllers/taskforceTeamController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizePermission } from '../middleware/roleMiddleware.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 } // 30MB max
});

// All task routes require authentication
router.use(authenticateToken);

// Metadata for Taskforce allocation (assignees, departments, projects)
router.get('/meta/assignees', authorizePermission('tasks:view', 'tasks:manage', 'tasks:create'), getTaskAssigneesMeta);

// KPI Stats for dashboard & overview
router.get('/stats', authorizePermission('tasks:view', 'tasks:manage'), getTaskStats);

// Task operations
router.get('/chats/recent', authorizePermission('tasks:view', 'tasks:manage'), getRecentTaskChats);
router.get('/', authorizePermission('tasks:view', 'tasks:manage'), getTasks);
router.get('/:id', authorizePermission('tasks:view', 'tasks:manage'), getTaskById);
router.post('/', authorizePermission('tasks:create', 'tasks:manage'), createTask);
router.put('/:id', authorizePermission('tasks:edit', 'tasks:manage'), updateTask);
router.patch('/:id/progress', authorizePermission('tasks:edit', 'tasks:manage'), updateTaskProgress);
router.patch('/:id/checkpoints/:checkpointId', authorizePermission('tasks:edit', 'tasks:manage'), toggleCheckpoint);
router.post('/:id/follow-up', authorizePermission('tasks:edit', 'tasks:manage'), logFollowUp);
router.post('/:id/comments', authorizePermission('tasks:view', 'tasks:edit', 'tasks:manage'), addComment);

// Proof & Work Evidence Uploads
router.post('/:id/upload-proof', authorizePermission('tasks:edit', 'tasks:manage', 'tasks:view'), upload.any(), uploadTaskProof);
router.delete('/:id/uploads/:uploadId', authorizePermission('tasks:edit', 'tasks:manage'), deleteTaskUpload);

router.delete('/:id', authorizePermission('tasks:manage'), deleteTask);

export default router;

