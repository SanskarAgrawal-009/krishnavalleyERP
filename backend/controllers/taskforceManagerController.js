import { Task } from '../models/Task.js';
import { User } from '../models/User.js';
import { TaskforceMember } from '../models/TaskforceMember.js';
import { DEPARTMENTS } from './taskController.js';
import { getScopedTaskforceContext } from './taskforceTeamController.js';
import { escapeRegex } from '../utils/regexUtil.js';

/**
 * @desc   Get workforce overview: per-member workload, capacity, task distribution (Taskforce Team ONLY)
 * @route  GET /api/taskforce-manager/workforce
 * @access Authenticated
 */
export const getWorkforceOverview = async (req, res) => {
  try {
    const { department } = req.query;

    // Query Taskforce Members strictly (exclude unrelated ERP staff)
    const memberFilter = { status: { $ne: 'deleted' } };
    if (department && department !== 'all') {
      memberFilter.$or = [
        { department: { $regex: new RegExp(`^${department.trim()}$`, 'i') } },
        { trade: { $regex: new RegExp(`^${department.trim()}$`, 'i') } },
      ];
    }

    const members = await TaskforceMember.find(memberFilter)
      .populate('userId', 'firstName lastName username email mobileNo roleId status')
      .populate('supervisorId', 'name trade department hierarchyLevel')
      .populate('headId', 'name trade department hierarchyLevel')
      .sort({ hierarchyLevel: -1, name: 1 })
      .lean();

    // Get all non-cancelled tasks
    const taskFilter = { status: { $nin: ['cancelled'] } };
    if (department && department !== 'all') {
      taskFilter.department = { $regex: new RegExp(`^${department.trim()}$`, 'i') };
    }
    const tasks = await Task.find(taskFilter)
      .select('assignedTo assignedMembers status priority department progress dueDate startDate isMDDirective roadblockAlert completedAt')
      .lean();

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Build per-member workload array
    const workforce = members.map((member) => {
      const mId = member._id.toString();
      const uId = member.userId?._id?.toString();

      // Find tasks assigned to this member via assignedMembers or linked assignedTo
      const memberTasks = tasks.filter((t) => {
        const hasMember = (t.assignedMembers || []).some((am) => am.toString() === mId);
        const hasUser = uId && (t.assignedTo || []).some((at) => at.toString() === uId);
        return hasMember || hasUser;
      });

      let active = 0;
      let completed = 0;
      let delayed = 0;
      let overdue = 0;
      let urgent = 0;
      let high = 0;
      let medium = 0;
      let low = 0;
      let progressSum = 0;
      let activeProgressSum = 0;
      let mdDirectives = 0;
      let roadblocks = 0;
      const memberDepts = new Set();
      if (member.department) memberDepts.add(member.department);
      if (member.trade) memberDepts.add(member.trade);

      memberTasks.forEach((task) => {
        if (task.department) memberDepts.add(task.department);

        if (['pending', 'in_progress', 'under_review'].includes(task.status)) {
          active++;
          activeProgressSum += task.progress || 0;
        }
        if (task.status === 'completed') completed++;
        if (task.status === 'delayed') delayed++;
        if (task.dueDate && new Date(task.dueDate) < startOfDay && task.status !== 'completed') {
          overdue++;
        }

        if (task.priority === 'urgent') urgent++;
        else if (task.priority === 'high') high++;
        else if (task.priority === 'medium') medium++;
        else low++;

        progressSum += task.progress || 0;
        if (task.isMDDirective) mdDirectives++;
        if (task.roadblockAlert?.hasRoadblock && !task.roadblockAlert?.isResolved) {
          roadblocks++;
        }
      });

      const totalAssigned = memberTasks.length;
      const avgProgress = totalAssigned > 0 ? Math.round(progressSum / totalAssigned) : 0;
      const activeAvgProgress = active > 0 ? Math.round(activeProgressSum / active) : 0;
      const completionRate = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;
      const capacityScore = Math.max(0, 100 - (active * 12 + urgent * 8 + roadblocks * 15));

      const nameParts = (member.name || '').trim().split(' ');
      const firstName = nameParts[0] || member.name;
      const lastName = nameParts.slice(1).join(' ');

      return {
        user: {
          _id: member.userId?._id || member._id,
          memberId: member._id,
          firstName,
          lastName,
          username: member.userId?.username || member.name,
          email: member.email || member.userId?.email || '',
          mobileNo: member.mobileNo || member.userId?.mobileNo || '',
          status: member.status || 'active',
          roleId: {
            roleName: `${member.hierarchyLevel.toUpperCase()} • ${member.department || member.trade || 'Taskforce'}`,
            roleCode: member.hierarchyLevel,
          },
          hierarchyLevel: member.hierarchyLevel,
          trade: member.trade,
          department: member.department,
          supervisor: member.supervisorId?.name || null,
          head: member.headId?.name || null,
        },
        totalAssigned,
        active,
        completed,
        delayed,
        overdue,
        urgent,
        high,
        medium,
        low,
        avgProgress,
        activeAvgProgress,
        completionRate,
        capacityScore,
        departments: Array.from(memberDepts),
        mdDirectives,
        roadblocks,
      };
    });

    workforce.sort((a, b) => b.active - a.active);

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

    const [users, taskforceMembers] = await Promise.all([
      User.find({ status: 'active' })
        .populate('roleId', 'roleName roleCode')
        .select('firstName lastName username email roleId department')
        .lean(),
      TaskforceMember.find({ status: 'active' })
        .select('name trade department hierarchyLevel userId mobileNo email')
        .lean(),
    ]);

    const memberToUserMap = {};
    taskforceMembers.forEach((m) => {
      if (m.userId) {
        memberToUserMap[m._id.toString()] = m.userId.toString();
      }
    });

    // All tasks created or completed in the period
    const tasks = await Task.find({
      $or: [
        { createdAt: { $gte: periodStart } },
        { completedAt: { $gte: periodStart } },
        { status: { $in: ['pending', 'in_progress', 'under_review', 'delayed'] } },
      ],
    })
      .select('assignedTo assignedMembers status priority department progress dueDate completedAt startDate createdAt isMDDirective followUpLogs followUpSchedule')
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
      const assigneeIds = new Set();
      (task.assignedTo || []).forEach((a) => assigneeIds.add(a.toString()));
      (task.assignedMembers || []).forEach((m) => {
        const mStr = m.toString();
        const mappedUid = memberToUserMap[mStr];
        if (mappedUid) {
          assigneeIds.add(mappedUid);
        }
      });

      assigneeIds.forEach((uid) => {
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
    if (department && department !== 'all') {
      const escaped = escapeRegex(department.trim());
      const dotted = escaped.split('').join('\\.?');
      query.department = { $regex: new RegExp(`^(${escaped}|${dotted})$`, 'i') };
    }
    if (assignedTo && assignedTo !== 'all') {
      query.$or = [{ assignedTo }, { assignedMembers: assignedTo }];
    }

    // Scoping for hierarchy
    const scope = await getScopedTaskforceContext(req.user);
    if (!scope.isManagerOrAdmin) {
      const orClauses = [];
      if (scope.allowedUserIds && scope.allowedUserIds.length) {
        orClauses.push({ assignedTo: { $in: scope.allowedUserIds } });
      }
      if (scope.allowedMemberIds && scope.allowedMemberIds.length) {
        orClauses.push({ assignedMembers: { $in: scope.allowedMemberIds } });
      }
      orClauses.push({ assignedBy: req.user.id });
      if (scope.hierarchyLevel === 'head' && scope.member?.department) {
        orClauses.push({
          department: { $regex: new RegExp(`^${escapeRegex(scope.member.department.trim())}$`, 'i') },
        });
      }
      if (orClauses.length) {
        query.$and = query.$and || [];
        query.$and.push({ $or: orClauses });
      }
    }

    const tasks = await Task.find(query)
      .populate('assignedBy', 'firstName lastName username')
      .populate('assignedTo', 'firstName lastName username')
      .populate('assignedMembers', 'name trade department hierarchyLevel')
      .populate('apartmentDetails.projectId', 'projectName')
      .select('taskCode title department status priority progress startDate dueDate completedAt assignedBy assignedTo assignedMembers isMDDirective roadblockAlert checkpoints apartmentDetails')
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

    const statsMap = {};
    stats.forEach((d) => {
      statsMap[d._id] = d;
    });

    // Ensure all defined KV departments & administration appear in manager analytics
    const enriched = DEPARTMENTS.map((dept) => {
      const d = statsMap[dept.key] || {
        _id: dept.key,
        totalTasks: 0,
        activeTasks: 0,
        completedTasks: 0,
        delayedTasks: 0,
        roadblocks: 0,
        avgProgress: 0,
        uniqueAssignees: [],
      };
      return {
        ...d,
        department: dept.key,
        label: dept.label,
        icon: dept.icon,
        group: dept.group,
        avgProgress: Math.round(d.avgProgress || 0),
        completionRate: d.totalTasks > 0 ? Math.round((d.completedTasks / d.totalTasks) * 100) : 0,
        memberCount: new Set((d.uniqueAssignees || []).flat().map((a) => a?.toString())).size,
      };
    });

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

    // Authorization: Admin, Taskforce Manager, VP Department, Department Heads, and users with tasks:manage permission
    const callerRole = (req.user?.role || '').toLowerCase();
    let callerDept = '';
    try {
      const callerUser = await User.findById(req.user.id).select('department designation role');
      callerDept = (callerUser?.department || '').toLowerCase().trim();
    } catch (_) {}

    const perms = (req.user?.permissions || req.user?.permissionCodes || []).map((p) =>
      typeof p === 'string' ? p : p.permissionCode
    ).filter(Boolean);
    const hasTaskManagePerm = perms.includes('tasks:manage') || perms.includes('tasks:admin');

    const isAdmin = callerRole === 'admin' || callerRole === 'super_admin';
    const isTaskforceManager = callerRole === 'taskforce_manager' || callerRole === 'taskforce_mgr';
    const isHead = callerRole === 'head' || callerRole === 'taskforce_lead' || req.user?.taskforceHierarchyLevel === 'head';
    const isVPDept =
      callerDept === "vp's" ||
      callerDept === 'vp' ||
      callerDept.startsWith('vp') ||
      callerDept.includes('vice president') ||
      callerRole === 'vp' ||
      callerRole.includes('vp');

    if (!isAdmin && !isTaskforceManager && !isVPDept && !hasTaskManagePerm && !isHead) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to assign and reassign tasks.',
      });
    }

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Task IDs are required' });
    }
    if (!toUserId) {
      return res.status(400).json({ success: false, message: 'Target assignee is required' });
    }

    // Resolve target assignee: can be User or TaskforceMember
    let targetUser = await User.findById(toUserId).select('firstName lastName username').lean();
    let targetMember = null;

    if (!targetUser) {
      targetMember = await TaskforceMember.findById(toUserId).lean();
      if (targetMember && targetMember.userId) {
        targetUser = await User.findById(targetMember.userId).select('firstName lastName username').lean();
      }
    } else {
      targetMember = await TaskforceMember.findOne({ userId: targetUser._id }).lean();
    }

    if (!targetUser && !targetMember) {
      return res.status(404).json({ success: false, message: 'Target assignee not found' });
    }

    const targetDisplayName = targetUser
      ? `${targetUser.firstName} ${targetUser.lastName || ''}`.trim()
      : targetMember.name;
    const finalUserId = targetUser?._id ? targetUser._id.toString() : null;
    const finalMemberId = targetMember?._id ? targetMember._id.toString() : null;

    let updatedCount = 0;

    for (const taskId of taskIds) {
      const task = await Task.findById(taskId);
      if (!task) continue;

      if (fromUserId) {
        const fromStr = fromUserId.toString();
        // Replace in assignedTo
        task.assignedTo = (task.assignedTo || []).map((a) => {
          if (a.toString() === fromStr) {
            return finalUserId || a;
          }
          return a;
        });
        // Replace in assignedMembers
        task.assignedMembers = (task.assignedMembers || []).map((m) => {
          if (m.toString() === fromStr) {
            return finalMemberId || m;
          }
          return m;
        });
      } else {
        // Add to assignees if not already present
        if (finalUserId) {
          const atList = (task.assignedTo || []).map((a) => a.toString());
          if (!atList.includes(finalUserId)) {
            task.assignedTo.push(finalUserId);
          }
        }
        if (finalMemberId) {
          const amList = (task.assignedMembers || []).map((m) => m.toString());
          if (!amList.includes(finalMemberId)) {
            task.assignedMembers.push(finalMemberId);
          }
        }
      }

      task.auditTrail.push({
        action: 'Bulk Reassigned',
        performedBy: req.user.id,
        timestamp: new Date(),
        details: `Task reassigned to ${targetDisplayName} by ${req.user.username || 'Manager'}`,
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
