import { Task } from '../models/Task.js';
import { User } from '../models/User.js';
import { DEPARTMENTS } from './taskController.js';

/**
 * @desc   Get workforce overview: per-user workload, capacity, task distribution
 * @route  GET /api/taskforce-manager/workforce
 * @access Authenticated
 */
export const getWorkforceOverview = async (req, res) => {
  try {
    const { department } = req.query;

    // Get all active users
    const userFilter = { status: 'active' };
    const users = await User.find(userFilter)
      .populate('roleId', 'roleName roleCode')
      .select('firstName lastName username email mobileNo roleId status')
      .sort({ firstName: 1 })
      .lean();

    // Get all non-cancelled tasks
    const taskFilter = { status: { $nin: ['cancelled'] } };
    if (department && department !== 'all') {
      taskFilter.department = department;
    }
    const tasks = await Task.find(taskFilter)
      .select('assignedTo status priority department progress dueDate startDate isMDDirective roadblockAlert completedAt')
      .lean();

    // Build per-user workload map
    const userWorkloadMap = {};
    users.forEach((u) => {
      userWorkloadMap[u._id.toString()] = {
        user: u,
        totalAssigned: 0,
        active: 0,
        completed: 0,
        delayed: 0,
        overdue: 0,
        urgent: 0,
        high: 0,
        medium: 0,
        low: 0,
        avgProgress: 0,
        progressSum: 0,
        activeProgressSum: 0,
        activeCount: 0,
        departments: new Set(),
        mdDirectives: 0,
        roadblocks: 0,
      };
    });

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    tasks.forEach((task) => {
      const assignees = (task.assignedTo || []).map((a) => a.toString());
      assignees.forEach((uid) => {
        if (!userWorkloadMap[uid]) return;
        const entry = userWorkloadMap[uid];
        entry.totalAssigned++;
        entry.departments.add(task.department);

        if (['pending', 'in_progress', 'under_review'].includes(task.status)) {
          entry.active++;
          entry.activeProgressSum += task.progress || 0;
          entry.activeCount++;
        }
        if (task.status === 'completed') entry.completed++;
        if (task.status === 'delayed') entry.delayed++;
        if (task.dueDate && new Date(task.dueDate) < startOfDay && task.status !== 'completed') {
          entry.overdue++;
        }

        // Priority counts
        if (task.priority === 'urgent') entry.urgent++;
        else if (task.priority === 'high') entry.high++;
        else if (task.priority === 'medium') entry.medium++;
        else entry.low++;

        entry.progressSum += task.progress || 0;
        if (task.isMDDirective) entry.mdDirectives++;
        if (task.roadblockAlert?.hasRoadblock && !task.roadblockAlert?.isResolved) {
          entry.roadblocks++;
        }
      });
    });

    // Convert to array with computed fields
    const workforce = Object.values(userWorkloadMap)
      .map((entry) => ({
        ...entry,
        departments: Array.from(entry.departments),
        avgProgress: entry.totalAssigned > 0
          ? Math.round(entry.progressSum / entry.totalAssigned)
          : 0,
        activeAvgProgress: entry.activeCount > 0
          ? Math.round(entry.activeProgressSum / entry.activeCount)
          : 0,
        completionRate: entry.totalAssigned > 0
          ? Math.round((entry.completed / entry.totalAssigned) * 100)
          : 0,
        capacityScore: Math.max(0, 100 - (entry.active * 12 + entry.urgent * 8 + entry.roadblocks * 15)),
      }))
      .filter((entry) => entry.totalAssigned > 0 || req.query.showAll === 'true')
      .sort((a, b) => b.active - a.active);

    return res.json({
      success: true,
      workforce,
      summary: {
        totalMembers: workforce.length,
        totalActiveTasks: tasks.filter((t) => ['pending', 'in_progress', 'under_review'].includes(t.status)).length,
        totalCompletedTasks: tasks.filter((t) => t.status === 'completed').length,
        averageWorkload: workforce.length > 0
          ? Math.round(workforce.reduce((s, w) => s + w.active, 0) / workforce.length)
          : 0,
        overloadedMembers: workforce.filter((w) => w.active > 8).length,
        idleMembers: workforce.filter((w) => w.active === 0).length,
      },
    });
  } catch (error) {
    console.error('Error fetching workforce overview:', error);
    return res.status(500).json({ success: false, message: 'Failed to load workforce data', error: error.message });
  }
};

/**
 * @desc   Get performance metrics for all team members
 * @route  GET /api/taskforce-manager/performance
 * @access Authenticated
 */
export const getPerformanceMetrics = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const daysAgo = parseInt(period, 10) || 30;
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - daysAgo);

    const users = await User.find({ status: 'active' })
      .populate('roleId', 'roleName roleCode')
      .select('firstName lastName username email roleId')
      .lean();

    // All tasks created or completed in the period
    const tasks = await Task.find({
      $or: [
        { createdAt: { $gte: periodStart } },
        { completedAt: { $gte: periodStart } },
        { status: { $in: ['pending', 'in_progress', 'under_review', 'delayed'] } },
      ],
    })
      .select('assignedTo status priority department progress dueDate completedAt startDate createdAt isMDDirective followUpLogs followUpSchedule')
      .lean();

    const performanceMap = {};
    users.forEach((u) => {
      performanceMap[u._id.toString()] = {
        user: u,
        tasksAssigned: 0,
        tasksCompleted: 0,
        tasksOnTime: 0,
        tasksLate: 0,
        tasksActive: 0,
        avgCompletionDays: 0,
        completionDaysTotal: 0,
        followUpsLogged: 0,
        productivityScore: 0,
        mdDirectivesCompleted: 0,
        urgentCompleted: 0,
      };
    });

    tasks.forEach((task) => {
      const assignees = (task.assignedTo || []).map((a) => a.toString());
      assignees.forEach((uid) => {
        if (!performanceMap[uid]) return;
        const p = performanceMap[uid];
        p.tasksAssigned++;

        if (task.status === 'completed') {
          p.tasksCompleted++;
          if (task.dueDate && task.completedAt) {
            const dueDate = new Date(task.dueDate);
            const completedAt = new Date(task.completedAt);
            if (completedAt <= dueDate) {
              p.tasksOnTime++;
            } else {
              p.tasksLate++;
            }
            const startDate = new Date(task.startDate || task.createdAt);
            const days = Math.max(1, Math.ceil((completedAt - startDate) / (1000 * 60 * 60 * 24)));
            p.completionDaysTotal += days;
          } else {
            p.tasksOnTime++;
          }
          if (task.isMDDirective) p.mdDirectivesCompleted++;
          if (task.priority === 'urgent') p.urgentCompleted++;
        } else if (['pending', 'in_progress', 'under_review', 'delayed'].includes(task.status)) {
          p.tasksActive++;
        }

        // Count follow-ups
        const userFollowUps = (task.followUpLogs || []).filter(
          (log) => log.loggedBy?.toString() === uid
        );
        p.followUpsLogged += userFollowUps.length;
      });
    });

    const performanceList = Object.values(performanceMap)
      .map((p) => {
        const avgDays = p.tasksCompleted > 0
          ? Math.round(p.completionDaysTotal / p.tasksCompleted)
          : 0;
        const completionRate = p.tasksAssigned > 0
          ? Math.round((p.tasksCompleted / p.tasksAssigned) * 100)
          : 0;
        const onTimeRate = p.tasksCompleted > 0
          ? Math.round((p.tasksOnTime / p.tasksCompleted) * 100)
          : 0;

        // Composite productivity score (0-100)
        let score = 0;
        score += completionRate * 0.35; // 35% weight on completion rate
        score += onTimeRate * 0.30; // 30% weight on on-time delivery
        score += Math.min(100, p.followUpsLogged * 5) * 0.15; // 15% weight on follow-up discipline
        score += Math.min(100, p.mdDirectivesCompleted * 20) * 0.10; // 10% weight on MD directives
        score += Math.min(100, p.urgentCompleted * 15) * 0.10; // 10% weight on urgent task handling

        return {
          ...p,
          avgCompletionDays: avgDays,
          completionRate,
          onTimeRate,
          productivityScore: Math.round(score),
        };
      })
      .filter((p) => p.tasksAssigned > 0)
      .sort((a, b) => b.productivityScore - a.productivityScore);

    // Team averages
    const teamAvg = {
      avgCompletionRate: performanceList.length > 0
        ? Math.round(performanceList.reduce((s, p) => s + p.completionRate, 0) / performanceList.length)
        : 0,
      avgOnTimeRate: performanceList.length > 0
        ? Math.round(performanceList.reduce((s, p) => s + p.onTimeRate, 0) / performanceList.length)
        : 0,
      avgProductivityScore: performanceList.length > 0
        ? Math.round(performanceList.reduce((s, p) => s + p.productivityScore, 0) / performanceList.length)
        : 0,
      topPerformer: performanceList[0] || null,
    };

    return res.json({
      success: true,
      performance: performanceList,
      teamAverages: teamAvg,
      period: daysAgo,
    });
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    return res.status(500).json({ success: false, message: 'Failed to load performance data', error: error.message });
  }
};

/**
 * @desc   Get Gantt / Timeline data for all active tasks
 * @route  GET /api/taskforce-manager/timeline
 * @access Authenticated
 */
export const getTimelineData = async (req, res) => {
  try {
    const { department, assignedTo, status = 'active' } = req.query;

    const query = {};
    if (status === 'active') {
      query.status = { $in: ['pending', 'in_progress', 'under_review', 'delayed'] };
    } else if (status !== 'all') {
      query.status = status;
    }
    if (department && department !== 'all') query.department = department;
    if (assignedTo && assignedTo !== 'all') query.assignedTo = assignedTo;

    const tasks = await Task.find(query)
      .populate('assignedBy', 'firstName lastName username')
      .populate('assignedTo', 'firstName lastName username')
      .populate('apartmentDetails.projectId', 'projectName')
      .select('taskCode title department status priority progress startDate dueDate completedAt assignedBy assignedTo isMDDirective roadblockAlert checkpoints apartmentDetails')
      .sort({ startDate: 1 })
      .lean();

    // Compute milestones from checkpoints
    const timelineItems = tasks.map((task) => {
      const start = task.startDate ? new Date(task.startDate) : new Date(task.createdAt || Date.now());
      const end = task.dueDate ? new Date(task.dueDate) : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
      const now = new Date();
      const totalDuration = end - start;
      const elapsed = now - start;
      const timeProgress = totalDuration > 0 ? Math.min(100, Math.round((elapsed / totalDuration) * 100)) : 0;

      const milestones = (task.checkpoints || []).map((cp, idx) => ({
        id: cp._id,
        title: cp.title,
        isCompleted: cp.isCompleted,
        completedAt: cp.completedAt,
        position: Math.round(((idx + 1) / (task.checkpoints.length + 1)) * 100),
      }));

      return {
        ...task,
        startDate: start,
        endDate: end,
        timeProgress,
        isOverdue: now > end && task.status !== 'completed',
        daysRemaining: Math.ceil((end - now) / (1000 * 60 * 60 * 24)),
        daysElapsed: Math.ceil((now - start) / (1000 * 60 * 60 * 24)),
        totalDays: Math.ceil((end - start) / (1000 * 60 * 60 * 24)),
        milestones,
      };
    });

    return res.json({
      success: true,
      timeline: timelineItems,
      departments: DEPARTMENTS,
    });
  } catch (error) {
    console.error('Error fetching timeline data:', error);
    return res.status(500).json({ success: false, message: 'Failed to load timeline data', error: error.message });
  }
};

/**
 * @desc   Get department-level analytics for team management
 * @route  GET /api/taskforce-manager/department-stats
 * @access Authenticated
 */
export const getDepartmentStats = async (req, res) => {
  try {
    const stats = await Task.aggregate([
      {
        $group: {
          _id: '$department',
          totalTasks: { $sum: 1 },
          activeTasks: {
            $sum: { $cond: [{ $in: ['$status', ['pending', 'in_progress', 'under_review']] }, 1, 0] },
          },
          completedTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          delayedTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'delayed'] }, 1, 0] },
          },
          urgentTasks: {
            $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] },
          },
          avgProgress: { $avg: '$progress' },
          mdDirectives: {
            $sum: { $cond: [{ $eq: ['$isMDDirective', true] }, 1, 0] },
          },
          roadblocks: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$roadblockAlert.hasRoadblock', true] },
                    { $ne: ['$roadblockAlert.isResolved', true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          uniqueAssignees: { $addToSet: '$assignedTo' },
        },
      },
      { $sort: { activeTasks: -1 } },
    ]);

    const departmentLabels = {};
    DEPARTMENTS.forEach((d) => { departmentLabels[d.key] = d.label; });

    const enriched = stats.map((d) => ({
      ...d,
      department: d._id,
      label: departmentLabels[d._id] || d._id,
      avgProgress: Math.round(d.avgProgress || 0),
      completionRate: d.totalTasks > 0 ? Math.round((d.completedTasks / d.totalTasks) * 100) : 0,
      memberCount: new Set((d.uniqueAssignees || []).flat().map((a) => a?.toString())).size,
    }));

    return res.json({ success: true, departments: enriched });
  } catch (error) {
    console.error('Error fetching department stats:', error);
    return res.status(500).json({ success: false, message: 'Failed to load department stats', error: error.message });
  }
};

/**
 * @desc   Bulk reassign tasks to a different user
 * @route  POST /api/taskforce-manager/bulk-reassign
 * @access Authenticated
 */
export const bulkReassignTasks = async (req, res) => {
  try {
    const { taskIds, fromUserId, toUserId } = req.body;

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Task IDs are required' });
    }
    if (!toUserId) {
      return res.status(400).json({ success: false, message: 'Target assignee is required' });
    }

    const toUser = await User.findById(toUserId).select('firstName lastName username').lean();
    if (!toUser) {
      return res.status(404).json({ success: false, message: 'Target user not found' });
    }

    let updatedCount = 0;

    for (const taskId of taskIds) {
      const task = await Task.findById(taskId);
      if (!task) continue;

      if (fromUserId) {
        // Replace specific user
        task.assignedTo = task.assignedTo.map((a) =>
          a.toString() === fromUserId ? toUserId : a
        );
      } else {
        // Add to assignees if not already present
        if (!task.assignedTo.map((a) => a.toString()).includes(toUserId)) {
          task.assignedTo.push(toUserId);
        }
      }

      task.auditTrail.push({
        action: 'Bulk Reassigned',
        performedBy: req.user.id,
        timestamp: new Date(),
        details: `Task reassigned to ${toUser.firstName} ${toUser.lastName || ''} by ${req.user.username || 'Manager'}`,
      });

      await task.save();
      updatedCount++;
    }

    return res.json({
      success: true,
      message: `${updatedCount} task(s) reassigned successfully`,
      updatedCount,
    });
  } catch (error) {
    console.error('Error bulk reassigning tasks:', error);
    return res.status(500).json({ success: false, message: 'Failed to reassign tasks', error: error.message });
  }
};

/**
 * @desc   Bulk update task status (approve/reject/escalate)
 * @route  POST /api/taskforce-manager/bulk-action
 * @access Authenticated
 */
export const bulkTaskAction = async (req, res) => {
  try {
    const { taskIds, action, reason } = req.body;

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Task IDs are required' });
    }
    if (!action) {
      return res.status(400).json({ success: false, message: 'Action is required' });
    }

    let updatedCount = 0;

    for (const taskId of taskIds) {
      const task = await Task.findById(taskId);
      if (!task) continue;

      switch (action) {
        case 'approve':
          task.status = 'completed';
          task.progress = 100;
          task.completedAt = new Date();
          break;
        case 'reject':
          task.status = 'in_progress';
          task.progress = Math.max(0, task.progress - 10);
          break;
        case 'escalate':
          task.priority = 'urgent';
          task.isMDDirective = true;
          break;
        case 'cancel':
          task.status = 'cancelled';
          break;
        default:
          continue;
      }

      task.auditTrail.push({
        action: `Bulk ${action.charAt(0).toUpperCase() + action.slice(1)}`,
        performedBy: req.user.id,
        timestamp: new Date(),
        details: reason || `Bulk ${action} by ${req.user.username || 'Manager'}`,
      });

      await task.save();
      updatedCount++;
    }

    return res.json({
      success: true,
      message: `${updatedCount} task(s) ${action}ed successfully`,
      updatedCount,
    });
  } catch (error) {
    console.error('Error performing bulk action:', error);
    return res.status(500).json({ success: false, message: 'Failed to perform bulk action', error: error.message });
  }
};
