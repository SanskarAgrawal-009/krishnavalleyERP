import express from 'express';
import {
  getMeetings,
  getMyUpcomingMeetings,
  getMeetingStats,
  getMeetingById,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  saveMoM,
  convertActionItemToTask,
  approveMoM,
} from '../controllers/taskforceMeetingController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizePermission } from '../middleware/roleMiddleware.js';

const router = express.Router();

// All meeting routes require authentication
router.use(authenticateToken);

// Current user's upcoming scheduled meetings (accessible to any authenticated attendee)
router.get('/my-upcoming', getMyUpcomingMeetings);

// Meeting listing & statistics
router.get('/', authorizePermission('tasks:view', 'tasks:manage'), getMeetings);
router.get('/stats', authorizePermission('tasks:view', 'tasks:manage'), getMeetingStats);
router.get('/:id', authorizePermission('tasks:view', 'tasks:manage'), getMeetingById);

// Scheduling & meeting updates
router.post('/', authorizePermission('tasks:create', 'tasks:manage'), createMeeting);
router.put('/:id', authorizePermission('tasks:edit', 'tasks:manage'), updateMeeting);
router.delete('/:id', authorizePermission('tasks:manage'), deleteMeeting);

// Minutes of Meeting (MoM) Management
router.put('/:id/mom', authorizePermission('tasks:create', 'tasks:edit', 'tasks:manage'), saveMoM);
router.post('/:id/convert-action-item', authorizePermission('tasks:create', 'tasks:manage'), convertActionItemToTask);
router.post('/:id/approve-mom', authorizePermission('tasks:manage'), approveMoM);

export default router;
