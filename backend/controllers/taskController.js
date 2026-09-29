import { Task } from '../models/Task.js';
import { User } from '../models/User.js';
import { Project } from '../models/Project.js';
import { Flat } from '../models/Flat.js';
import { escapeRegex } from '../utils/regexUtil.js';

// Department dictionary for consistent labelling and filtering
export const DEPARTMENTS = [
  { key: 'sales', label: 'Sales & Allotments' },
  { key: 'crm', label: 'CRM & Client Relations' },
  { key: 'construction', label: 'Civil & Construction' },
  { key: 'maintenance', label: 'Maintenance & Facility' },
  { key: 'accounts', label: 'Accounts & Finance' },
  { key: 'hr', label: 'HR & Administration' },
  { key: 'legal', label: 'Legal & Compliance' },
  { key: 'rentals', label: 'Rentals & Leases' },
  { key: 'operations', label: 'Site Operations' },
  { key: 'management', label: 'Executive Management' },
  { key: 'general', label: 'General / Miscellaneous' },
];

/**
 * @desc   Get list of tasks with filters
 * @route  GET /api/tasks
 * @access Authenticated
 */
export const getTasks = async (req, res) => {
  try {
    const {
      search,
      status,
      department,
      priority,
      isMDDirective,
      assignedTo,
      followUpFilter,
      hasRoadblock,
      page = 1,
      limit = 100,
    } = req.query;

    const query = {};

    if (search) {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { taskCode: searchRegex },
        { 'apartmentDetails.flatNumber': searchRegex },
        { 'apartmentDetails.projectName': searchRegex },
      ];
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (department && department !== 'all') {
      query.department = department;
    }

    if (priority && priority !== 'all') {
      query.priority = priority;
    }

    if (isMDDirective !== undefined && isMDDirective !== 'all' && isMDDirective !== '') {
      query.isMDDirective = isMDDirective === 'true';
    }

    if (assignedTo) {
      if (assignedTo === 'me') {
        query.assignedTo = req.user.id;
      } else if (assignedTo !== 'all') {
        query.assignedTo = assignedTo;
      }
    }

    if (hasRoadblock === 'true') {
      query['roadblockAlert.hasRoadblock'] = true;
      query['roadblockAlert.isResolved'] = false;
    }

    // Follow-up date filters
    if (followUpFilter) {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      if (followUpFilter === 'due_today') {
        query['followUpSchedule.nextFollowUpDate'] = {
          $gte: startOfDay,
          $lte: endOfDay,
        };
        query.status = { $nin: ['completed', 'cancelled'] };
      } else if (followUpFilter === 'overdue') {
        query['followUpSchedule.nextFollowUpDate'] = {
          $lt: startOfDay,
        };
        query.status = { $nin: ['completed', 'cancelled'] };
      } else if (followUpFilter === 'upcoming') {
        query['followUpSchedule.nextFollowUpDate'] = {
          $gt: endOfDay,
        };
        query.status = { $nin: ['completed', 'cancelled'] };
      }
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [tasks, total] = await Promise.all([
      Task.find(query)
        .populate('assignedBy', 'firstName lastName username email role')
        .populate('assignedTo', 'firstName lastName username email mobileNo')
        .populate('apartmentDetails.projectId', 'projectName projectCode')
        .populate('apartmentDetails.flatId', 'flatNumber floor tower status')
        .populate('followUpLogs.loggedBy', 'firstName lastName username')
        .populate('comments.sender', 'firstName lastName username')
        .sort({ isMDDirective: -1, 'followUpSchedule.nextFollowUpDate': 1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Task.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data: tasks,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit),
      },
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load tasks',
      error: error.message,
    });
  }
};

/**
 * @desc   Get KPI metrics and counts for Taskforce dashboard
 * @route  GET /api/tasks/stats
 * @access Authenticated
 */
export const getTaskStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const [
      totalTasks,
      activeTasks,
      completedTasks,
      followUpsDueToday,
      overdueFollowUps,
      mdDirectivesActive,
      roadblocksCount,
      departmentStats,
    ] = await Promise.all([
      Task.countDocuments(),
      Task.countDocuments({ status: { $in: ['pending', 'in_progress', 'under_review'] } }),
      Task.countDocuments({ status: 'completed' }),
      Task.countDocuments({
        'followUpSchedule.nextFollowUpDate': { $gte: startOfDay, $lte: endOfDay },
        status: { $nin: ['completed', 'cancelled'] },
      }),
      Task.countDocuments({
        'followUpSchedule.nextFollowUpDate': { $lt: startOfDay },
        status: { $nin: ['completed', 'cancelled'] },
      }),
      Task.countDocuments({
        isMDDirective: true,
        status: { $nin: ['completed', 'cancelled'] },
      }),
      Task.countDocuments({
        'roadblockAlert.hasRoadblock': true,
        'roadblockAlert.isResolved': false,
      }),
      Task.aggregate([
        {
          $group: {
            _id: '$department',
            count: { $sum: 1 },
            active: {
              $sum: {
                $cond: [{ $in: ['$status', ['pending', 'in_progress', 'under_review']] }, 1, 0],
              },
            },
            completed: {
              $sum: {
                $cond: [{ $eq: ['$status', 'completed'] }, 1, 0],
              },
            },
          },
        },
      ]),
    ]);

    return res.json({
      success: true,
      stats: {
        totalTasks,
        activeTasks,
        completedTasks,
        followUpsDueToday,
        overdueFollowUps,
        mdDirectivesActive,
        roadblocksCount,
        departmentStats,
      },
    });
  } catch (error) {
    console.error('Error fetching task stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to compute task statistics',
      error: error.message,
    });
  }
};

/**
 * @desc   Get single task by ID with full populate
 * @route  GET /api/tasks/:id
 * @access Authenticated
 */
export const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedBy', 'firstName lastName username email role')
      .populate('assignedTo', 'firstName lastName username email mobileNo')
      .populate('apartmentDetails.projectId', 'projectName projectCode')
      .populate('apartmentDetails.flatId', 'flatNumber floor tower status')
      .populate('followUpLogs.loggedBy', 'firstName lastName username')
      .populate('comments.sender', 'firstName lastName username')
      .populate('roadblockAlert.reportedBy', 'firstName lastName username')
      .populate('auditTrail.performedBy', 'firstName lastName username');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    return res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error('Error fetching task by ID:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load task details',
      error: error.message,
    });
  }
};

/**
 * @desc   Create new task & assign to multiple people / department
 * @route  POST /api/tasks
 * @access Authenticated with task creation rights
 */
export const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      department = 'general',
      isApartmentRelated = false,
      apartmentDetails = {},
      isMDDirective = false,
      priority = 'high',
      assignedTo = [],
      startDate = new Date(),
      dueDate,
      nextFollowUpDate,
      followUpFrequency = 'daily',
      tags = [],
      checkpoints = [],
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Task title is required',
      });
    }

    // Normalize assignedTo to an array of valid IDs
    const assignees = Array.isArray(assignedTo)
      ? assignedTo.filter(Boolean)
      : assignedTo
      ? [assignedTo]
      : [];

    // Set initial follow-up date: provided or defaulted to tomorrow/dueDate
    let computedFollowUpDate = nextFollowUpDate ? new Date(nextFollowUpDate) : null;
    if (!computedFollowUpDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      computedFollowUpDate = tomorrow;
    }

    const formattedCheckpoints = Array.isArray(checkpoints)
      ? checkpoints
          .map((c) => ({
            title: typeof c === 'string' ? c.trim() : (c.title || '').trim(),
            isCompleted: Boolean(c.isCompleted),
          }))
          .filter((c) => c.title)
      : [];

    const newTask = new Task({
      title: title.trim(),
      description: (description || '').trim(),
      department,
      isApartmentRelated: Boolean(isApartmentRelated),
      apartmentDetails: isApartmentRelated
        ? {
            projectId: apartmentDetails.projectId || undefined,
            projectName: apartmentDetails.projectName || '',
            tower: apartmentDetails.tower || '',
            flatId: apartmentDetails.flatId || undefined,
            flatNumber: apartmentDetails.flatNumber || '',
          }
        : undefined,
      isMDDirective: Boolean(isMDDirective),
      priority,
      status: 'pending',
      progress: 0,
      assignedBy: req.user.id,
      assignedTo: assignees,
      startDate: startDate ? new Date(startDate) : new Date(),
      dueDate: dueDate ? new Date(dueDate) : undefined,
      checkpoints: formattedCheckpoints,
      followUpSchedule: {
        nextFollowUpDate: computedFollowUpDate,
        frequency: followUpFrequency,
        followUpCount: 0,
      },
      tags: Array.isArray(tags) ? tags : [],
      auditTrail: [
        {
          action: 'Created & Assigned',
          performedBy: req.user.id,
          timestamp: new Date(),
          details: `Task created by ${req.user.username || 'System'}${
            isMDDirective ? ' as MD DIRECTIVE' : ''
          } with ${assignees.length} assigned member(s).`,
        },
      ],
    });

    await newTask.save();

    const populated = await Task.findById(newTask._id)
      .populate('assignedBy', 'firstName lastName username email')
      .populate('assignedTo', 'firstName lastName username email mobileNo')
      .populate('apartmentDetails.projectId', 'projectName projectCode')
      .populate('apartmentDetails.flatId', 'flatNumber floor tower status');

    return res.status(201).json({
      success: true,
      message: 'Task created and allocated successfully',
      data: populated,
    });
  } catch (error) {
    console.error('Error creating task:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create task',
      error: error.message,
    });
  }
};

/**
 * @desc   Update core task details
 * @route  PUT /api/tasks/:id
 * @access Authenticated
 */
export const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    const {
      title,
      description,
      department,
      isApartmentRelated,
      apartmentDetails,
      isMDDirective,
      priority,
      status,
      assignedTo,
      dueDate,
      startDate,
      nextFollowUpDate,
      followUpFrequency,
      tags,
    } = req.body;

    if (title) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();
    if (department) task.department = department;
    if (priority) task.priority = priority;
    if (isMDDirective !== undefined) task.isMDDirective = Boolean(isMDDirective);
    if (isApartmentRelated !== undefined) task.isApartmentRelated = Boolean(isApartmentRelated);
    if (apartmentDetails) {
      task.apartmentDetails = {
        projectId: apartmentDetails.projectId || undefined,
        projectName: apartmentDetails.projectName || '',
        tower: apartmentDetails.tower || '',
        flatId: apartmentDetails.flatId || undefined,
        flatNumber: apartmentDetails.flatNumber || '',
      };
    }
    if (assignedTo !== undefined) {
      task.assignedTo = Array.isArray(assignedTo) ? assignedTo.filter(Boolean) : [assignedTo];
    }
    if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : null;
    if (startDate !== undefined) task.startDate = startDate ? new Date(startDate) : task.startDate;
    if (tags !== undefined) task.tags = Array.isArray(tags) ? tags : [];

    if (req.body.checkpoints !== undefined) {
      task.checkpoints = Array.isArray(req.body.checkpoints)
        ? req.body.checkpoints
            .map((c) => ({
              title: typeof c === 'string' ? c.trim() : (c.title || '').trim(),
              isCompleted: Boolean(c.isCompleted),
              completedAt: c.isCompleted ? c.completedAt || new Date() : undefined,
            }))
            .filter((c) => c.title)
        : [];
    }

    if (nextFollowUpDate !== undefined) {
      task.followUpSchedule.nextFollowUpDate = nextFollowUpDate ? new Date(nextFollowUpDate) : null;
    }
    if (followUpFrequency) {
      task.followUpSchedule.frequency = followUpFrequency;
    }

    if (status && status !== task.status) {
      task.status = status;
      if (status === 'completed') {
        task.progress = 100;
        task.completedAt = new Date();
      }
    }

    task.auditTrail.push({
      action: 'Details Updated',
      performedBy: req.user.id,
      timestamp: new Date(),
      details: `Updated by ${req.user.username || 'Staff'}`,
    });

    await task.save();

    const populated = await Task.findById(task._id)
      .populate('assignedBy', 'firstName lastName username email')
      .populate('assignedTo', 'firstName lastName username email mobileNo')
      .populate('apartmentDetails.projectId', 'projectName projectCode')
      .populate('apartmentDetails.flatId', 'flatNumber floor tower status');

    return res.json({
      success: true,
      message: 'Task updated successfully',
      data: populated,
    });
  } catch (error) {
    console.error('Error updating task:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update task',
      error: error.message,
    });
  }
};

/**
 * @desc   Update task progress (0-100), status, or report/resolve roadblock
 * @route  PATCH /api/tasks/:id/progress
 * @access Authenticated
 */
export const updateTaskProgress = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    const { progress, status, roadblock } = req.body;

    const prevProgress = task.progress;

    if (typeof progress === 'number') {
      task.progress = Math.min(100, Math.max(0, progress));
      if (task.progress === 100 && task.status !== 'completed') {
        task.status = 'completed';
        task.completedAt = new Date();
      } else if (task.progress > 0 && task.status === 'pending') {
        task.status = 'in_progress';
      }
    }

    if (status) {
      task.status = status;
      if (status === 'completed') {
        task.progress = 100;
        task.completedAt = new Date();
      }
    }

    // Handle roadblock raise or resolution
    if (roadblock) {
      if (roadblock.action === 'raise') {
        task.roadblockAlert = {
          hasRoadblock: true,
          reason: roadblock.reason || 'Roadblock encountered during execution',
          reportedBy: req.user.id,
          reportedAt: new Date(),
          isResolved: false,
        };
        task.status = 'delayed';
        task.auditTrail.push({
          action: 'Roadblock Raised',
          performedBy: req.user.id,
          timestamp: new Date(),
          details: `Roadblock: ${roadblock.reason || 'Work blocked'}`,
        });
      } else if (roadblock.action === 'resolve') {
        task.roadblockAlert.isResolved = true;
        task.roadblockAlert.hasRoadblock = false;
        task.roadblockAlert.resolvedAt = new Date();
        if (task.status === 'delayed') {
          task.status = 'in_progress';
        }
        task.auditTrail.push({
          action: 'Roadblock Resolved',
          performedBy: req.user.id,
          timestamp: new Date(),
          details: `Roadblock resolved by ${req.user.username || 'Staff'}`,
        });
      }
    }

    task.auditTrail.push({
      action: 'Progress Updated',
      performedBy: req.user.id,
      timestamp: new Date(),
      details: `Progress changed from ${prevProgress}% to ${task.progress}% (Status: ${task.status})`,
    });

    await task.save();

    return res.json({
      success: true,
      message: 'Progress updated successfully',
      data: task,
    });
  } catch (error) {
    console.error('Error updating task progress:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update progress',
      error: error.message,
    });
  }
};

/**
 * @desc   Log a follow-up interaction, record remarks, outcome, and set next follow-up
 * @route  POST /api/tasks/:id/follow-up
 * @access Authenticated
 */
export const logFollowUp = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    const {
      remarks,
      outcome = 'on_track',
      newProgress,
      nextFollowUpDate,
    } = req.body;

    if (!remarks || !remarks.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Follow-up remarks are required',
      });
    }

    const previousProgress = task.progress;
    let updatedProgress = previousProgress;

    if (typeof newProgress === 'number') {
      updatedProgress = Math.min(100, Math.max(0, newProgress));
      task.progress = updatedProgress;
      if (updatedProgress === 100) {
        task.status = 'completed';
        task.completedAt = new Date();
      } else if (updatedProgress > 0 && task.status === 'pending') {
        task.status = 'in_progress';
      }
    }

    // Compute or set next follow-up date
    let computedNextDate = nextFollowUpDate ? new Date(nextFollowUpDate) : null;
    if (!computedNextDate) {
      const freq = task.followUpSchedule?.frequency || 'daily';
      const d = new Date();
      if (freq === 'daily') d.setDate(d.getDate() + 1);
      else if (freq === 'alternate_days') d.setDate(d.getDate() + 2);
      else if (freq === 'weekly') d.setDate(d.getDate() + 7);
      else d.setDate(d.getDate() + 1);
      computedNextDate = d;
    }

    // Append log entry
    task.followUpLogs.push({
      loggedBy: req.user.id,
      loggedAt: new Date(),
      remarks: remarks.trim(),
      outcome,
      previousProgress,
      newProgress: updatedProgress,
      nextFollowUpDate: computedNextDate,
    });

    // Update follow-up schedule
    task.followUpSchedule.lastFollowUpDate = new Date();
    task.followUpSchedule.followUpCount = (task.followUpSchedule.followUpCount || 0) + 1;
    task.followUpSchedule.nextFollowUpDate = computedNextDate;

    if (outcome === 'roadblock') {
      task.roadblockAlert = {
        hasRoadblock: true,
        reason: remarks.trim(),
        reportedBy: req.user.id,
        reportedAt: new Date(),
        isResolved: false,
      };
      task.status = 'delayed';
    } else if (outcome === 'milestone_reached' && task.status !== 'completed') {
      task.status = 'under_review';
    }

    task.auditTrail.push({
      action: 'Follow-up Recorded',
      performedBy: req.user.id,
      timestamp: new Date(),
      details: `Follow-up #${task.followUpSchedule.followUpCount}: ${outcome.toUpperCase()} - "${remarks.trim()}"`,
    });

    await task.save();

    const populated = await Task.findById(task._id)
      .populate('assignedBy', 'firstName lastName username email')
      .populate('assignedTo', 'firstName lastName username email mobileNo')
      .populate('followUpLogs.loggedBy', 'firstName lastName username')
      .populate('comments.sender', 'firstName lastName username');

    return res.json({
      success: true,
      message: 'Follow-up logged successfully',
      data: populated,
    });
  } catch (error) {
    console.error('Error logging follow-up:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to record follow-up',
      error: error.message,
    });
  }
};

/**
 * @desc   Post a comment / communication message to the task
 * @route  POST /api/tasks/:id/comments
 * @access Authenticated
 */
export const addComment = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    const { message, isMDNote = false } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot be empty',
      });
    }

    const newComment = {
      sender: req.user.id,
      message: message.trim(),
      isMDNote: Boolean(isMDNote),
      createdAt: new Date(),
    };

    task.comments.push(newComment);
    await task.save();

    const populated = await Task.findById(task._id)
      .populate('comments.sender', 'firstName lastName username');

    return res.status(201).json({
      success: true,
      message: 'Update posted successfully',
      comments: populated.comments,
    });
  } catch (error) {
    console.error('Error posting comment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to post comment',
      error: error.message,
    });
  }
};

/**
 * @desc   Delete task
 * @route  DELETE /api/tasks/:id
 * @access Super Admin / Task Creator
 */
export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    await Task.findByIdAndDelete(req.params.id);

    return res.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete task',
      error: error.message,
    });
  }
};

/**
 * @desc   Get Assignees & Department metadata for creating/filtering tasks
 * @route  GET /api/tasks/meta/assignees
 * @access Authenticated
 */
export const getTaskAssigneesMeta = async (req, res) => {
  try {
    const [users, projects] = await Promise.all([
      User.find({ status: 'active' })
        .populate('roleId', 'roleName roleCode')
        .select('firstName lastName username email mobileNo roleId')
        .sort({ firstName: 1 }),
      Project.find().select('projectName projectCode buildings').lean(),
    ]);

    return res.json({
      success: true,
      assignees: users,
      departments: DEPARTMENTS,
      projects,
    });
  } catch (error) {
    console.error('Error fetching assignees meta:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load task metadata',
      error: error.message,
    });
  }
};

/**
 * @desc   Toggle a subtask/checkpoint status and recalculate overall progress
 * @route  PATCH /api/tasks/:id/checkpoints/:checkpointId
 * @access Authenticated
 */
export const toggleCheckpoint = async (req, res) => {
  try {
    const { id, checkpointId } = req.params;
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const cp = task.checkpoints.id(checkpointId);
    if (!cp) {
      return res.status(404).json({ success: false, message: 'Checkpoint not found' });
    }

    cp.isCompleted = !cp.isCompleted;
    if (cp.isCompleted) {
      cp.completedAt = new Date();
      cp.completedBy = req.user.id;
    } else {
      cp.completedAt = undefined;
      cp.completedBy = undefined;
    }

    if (task.checkpoints && task.checkpoints.length > 0) {
      const completedCount = task.checkpoints.filter((c) => c.isCompleted).length;
      task.progress = Math.round((completedCount / task.checkpoints.length) * 100);
      if (task.progress === 100 && task.status !== 'completed') {
        task.status = 'completed';
        task.completedAt = new Date();
      } else if (task.progress > 0 && task.status === 'pending') {
        task.status = 'in_progress';
      }
    }

    task.auditTrail.push({
      action: 'Checkpoint Toggled',
      performedBy: req.user.id,
      timestamp: new Date(),
      details: `Checkpoint "${cp.title}" marked as ${cp.isCompleted ? 'COMPLETED' : 'PENDING'}. Overall progress: ${task.progress}%.`,
    });

    await task.save();

    const populated = await Task.findById(task._id)
      .populate('assignedBy', 'firstName lastName username email')
      .populate('assignedTo', 'firstName lastName username email mobileNo')
      .populate('followUpLogs.loggedBy', 'firstName lastName username')
      .populate('comments.sender', 'firstName lastName username');

    return res.json({
      success: true,
      message: `Checkpoint updated (${task.progress}% complete)`,
      data: populated,
    });
  } catch (error) {
    console.error('Error toggling checkpoint:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
