import { TaskforceMember } from '../models/TaskforceMember.js';
import { Task } from '../models/Task.js';
import { User } from '../models/User.js';
import bcrypt from 'bcryptjs';

/**
 * Helper: Resolve caller's hierarchy scope and allowed IDs
 */
export const getScopedTaskforceContext = async (user) => {
  const roleCode = user?.role || user?.roleCode || '';
  const isManagerOrAdmin = ['admin', 'super_admin', 'taskforce_manager'].includes(roleCode);

  if (isManagerOrAdmin) {
    return {
      isManagerOrAdmin: true,
      hierarchyLevel: 'taskforce_manager',
      member: null,
      allowedMemberIds: null, // null means unrestricted / all
      allowedUserIds: null,
    };
  }

  // Find linked TaskforceMember record for this user
  const member = await TaskforceMember.findOne({
    $or: [{ userId: user.id }, { email: user.email?.toLowerCase() }],
    status: 'active',
  }).lean();

  if (!member) {
    // If not explicitly mapped as TaskforceMember, treat as standard user (self-only)
    return {
      isManagerOrAdmin: false,
      hierarchyLevel: 'helper',
      member: null,
      allowedMemberIds: [],
      allowedUserIds: [user.id],
    };
  }

  const level = member.hierarchyLevel; // 'helper' | 'supervisor' | 'head'

  if (level === 'helper') {
    return {
      isManagerOrAdmin: false,
      hierarchyLevel: 'helper',
      member,
      allowedMemberIds: [member._id.toString()],
      allowedUserIds: [user.id],
    };
  }

  if (level === 'supervisor') {
    // Supervisor sees self + all helpers reporting to this supervisor
    const helpers = await TaskforceMember.find({
      $or: [{ supervisorId: member._id }, { headId: member._id, hierarchyLevel: 'helper' }],
      status: 'active',
    }).lean();

    const allowedMemberIds = [member._id.toString(), ...helpers.map((h) => h._id.toString())];
    const allowedUserIds = [
      user.id,
      ...helpers.filter((h) => h.userId).map((h) => h.userId.toString()),
    ];

    return {
      isManagerOrAdmin: false,
      hierarchyLevel: 'supervisor',
      member,
      allowedMemberIds,
      allowedUserIds,
    };
  }

  if (level === 'head') {
    // Head sees self + all supervisors + all helpers under them
    const supervisors = await TaskforceMember.find({
      headId: member._id,
      hierarchyLevel: 'supervisor',
      status: 'active',
    }).lean();

    const supIds = supervisors.map((s) => s._id);

    const helpers = await TaskforceMember.find({
      $or: [{ headId: member._id }, { supervisorId: { $in: supIds } }],
      status: 'active',
    }).lean();

    const allSubs = [...supervisors, ...helpers];
    const allowedMemberIds = [member._id.toString(), ...allSubs.map((s) => s._id.toString())];
    const allowedUserIds = [
      user.id,
      ...allSubs.filter((s) => s.userId).map((s) => s.userId.toString()),
    ];

    return {
      isManagerOrAdmin: false,
      hierarchyLevel: 'head',
      member,
      allowedMemberIds,
      allowedUserIds,
    };
  }

  return {
    isManagerOrAdmin: false,
    hierarchyLevel: 'helper',
    member,
    allowedMemberIds: [member._id.toString()],
    allowedUserIds: [user.id],
  };
};

/**
 * @desc   Get list of team members with hierarchy and assigned workload
 * @route  GET /api/taskforce-manager/team
 */
export const getTeamMembers = async (req, res) => {
  try {
    const scope = await getScopedTaskforceContext(req.user);

    const query = {};
    if (!scope.isManagerOrAdmin && scope.allowedMemberIds) {
      query._id = { $in: scope.allowedMemberIds };
    }

    const members = await TaskforceMember.find(query)
      .populate('userId', 'firstName lastName username email mobileNo status')
      .populate('supervisorId', 'name trade hierarchyLevel')
      .populate('headId', 'name trade hierarchyLevel')
      .sort({ hierarchyLevel: -1, name: 1 })
      .lean();

    // Fetch active task counts for each member
    const memberIds = members.map((m) => m._id);
    const userIds = members.filter((m) => m.userId?._id).map((m) => m.userId._id);

    const tasks = await Task.find({
      $or: [
        { assignedMembers: { $in: memberIds } },
        { assignedTo: { $in: userIds } },
      ],
      status: { $nin: ['cancelled'] },
    })
      .select('assignedMembers assignedTo status progress uploads')
      .lean();

    const membersWithStats = members.map((m) => {
      const mId = m._id.toString();
      const uId = m.userId?._id?.toString();

      const memberTasks = tasks.filter((t) => {
        const hasMember = (t.assignedMembers || []).some((am) => am.toString() === mId);
        const hasUser = uId && (t.assignedTo || []).some((at) => at.toString() === uId);
        return hasMember || hasUser;
      });

      const activeTasks = memberTasks.filter((t) =>
        ['pending', 'in_progress', 'under_review'].includes(t.status)
      ).length;
      const completedTasks = memberTasks.filter((t) => t.status === 'completed').length;
      const totalTasks = memberTasks.length;

      // Count uploads submitted by this member
      let uploadCount = 0;
      tasks.forEach((t) => {
        (t.uploads || []).forEach((up) => {
          if (uId && up.uploadedBy?.toString() === uId) uploadCount++;
        });
      });

      const avgProgress =
        totalTasks > 0
          ? Math.round(memberTasks.reduce((acc, t) => acc + (t.progress || 0), 0) / totalTasks)
          : 0;

      return {
        ...m,
        stats: {
          totalTasks,
          activeTasks,
          completedTasks,
          uploadCount,
          avgProgress,
        },
      };
    });

    return res.json({
      success: true,
      currentScope: {
        hierarchyLevel: scope.hierarchyLevel,
        isManagerOrAdmin: scope.isManagerOrAdmin,
        memberId: scope.member?._id || null,
      },
      members: membersWithStats,
    });
  } catch (error) {
    console.error('Error fetching taskforce team members:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc   Add a new Taskforce team member
 * @route  POST /api/taskforce-manager/team
 */
export const addTeamMember = async (req, res) => {
  try {
    const {
      name,
      mobileNo,
      email,
      hierarchyLevel = 'helper',
      supervisorId,
      headId,
      trade = 'General Operations',
      notes,
      userId,
      createLoginUser,
      username,
      password,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Member name is required' });
    }

    let linkedUserId = userId || null;

    // Auto-create login user account if requested
    if (createLoginUser && username && password) {
      const existingUser = await User.findOne({
        $or: [{ username: username.toLowerCase().trim() }, { email: (email || '').toLowerCase().trim() }],
      });

      if (existingUser) {
        linkedUserId = existingUser._id;
      } else {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Find or fallback role for member
        const { Role } = await import('../models/Role.js');
        const defaultRole =
          (await Role.findOne({ roleCode: 'staff' })) ||
          (await Role.findOne({ roleCode: 'employee' })) ||
          (await Role.findOne());

        const newUser = await User.create({
          firstName: name.trim().split(' ')[0] || name.trim(),
          lastName: name.trim().split(' ').slice(1).join(' ') || '',
          username: username.toLowerCase().trim(),
          email: (email || `${username.toLowerCase().trim()}@krishnavalley.com`).toLowerCase().trim(),
          mobileNo: mobileNo || '',
          passwordHash,
          roleId: defaultRole?._id,
          status: 'active',
        });
        linkedUserId = newUser._id;
      }
    }

    const member = await TaskforceMember.create({
      name: name.trim(),
      mobileNo: mobileNo ? mobileNo.trim() : '',
      email: email ? email.toLowerCase().trim() : '',
      hierarchyLevel,
      supervisorId: supervisorId || null,
      headId: headId || null,
      trade: trade ? trade.trim() : 'General Operations',
      notes: notes ? notes.trim() : '',
      userId: linkedUserId,
      addedBy: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: `Team member "${member.name}" (${member.hierarchyLevel.toUpperCase()}) added successfully`,
      member,
    });
  } catch (error) {
    console.error('Error adding team member:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc   Update a team member
 * @route  PUT /api/taskforce-manager/team/:id
 */
export const updateTeamMember = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      mobileNo,
      email,
      hierarchyLevel,
      supervisorId,
      headId,
      trade,
      status,
      notes,
      userId,
    } = req.body;

    const member = await TaskforceMember.findById(id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Team member not found' });
    }

    if (name !== undefined) member.name = name.trim();
    if (mobileNo !== undefined) member.mobileNo = mobileNo.trim();
    if (email !== undefined) member.email = email.toLowerCase().trim();
    if (hierarchyLevel !== undefined) member.hierarchyLevel = hierarchyLevel;
    if (supervisorId !== undefined) member.supervisorId = supervisorId || null;
    if (headId !== undefined) member.headId = headId || null;
    if (trade !== undefined) member.trade = trade.trim();
    if (status !== undefined) member.status = status;
    if (notes !== undefined) member.notes = notes.trim();
    if (userId !== undefined) member.userId = userId || null;

    await member.save();

    return res.json({
      success: true,
      message: `Team member "${member.name}" updated`,
      member,
    });
  } catch (error) {
    console.error('Error updating team member:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc   Delete / remove team member
 * @route  DELETE /api/taskforce-manager/team/:id
 */
export const deleteTeamMember = async (req, res) => {
  try {
    const { id } = req.params;
    const member = await TaskforceMember.findById(id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Team member not found' });
    }

    await TaskforceMember.findByIdAndDelete(id);

    // Unassign from tasks
    await Task.updateMany(
      { assignedMembers: id },
      { $pull: { assignedMembers: id } }
    );

    return res.json({
      success: true,
      message: `Member "${member.name}" removed from Taskforce`,
    });
  } catch (error) {
    console.error('Error deleting team member:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc   Get Member Dashboard (Scoped strictly by Hierarchy: helper -> supervisor -> head -> admin)
 * @route  GET /api/taskforce-manager/team/:id/dashboard or /api/taskforce-manager/my-dashboard
 */
export const getMemberDashboard = async (req, res) => {
  try {
    const callerScope = await getScopedTaskforceContext(req.user);
    const targetId = req.params.id; // either member ID or 'me'

    let targetMember = null;
    if (targetId && targetId !== 'me') {
      targetMember = await TaskforceMember.findById(targetId)
        .populate('userId', 'firstName lastName username email mobileNo status')
        .populate('supervisorId', 'name trade hierarchyLevel')
        .populate('headId', 'name trade hierarchyLevel')
        .lean();

      if (!targetMember) {
        return res.status(404).json({ success: false, message: 'Member not found' });
      }

      // Hierarchy authorization check
      if (!callerScope.isManagerOrAdmin) {
        if (!callerScope.allowedMemberIds.includes(targetMember._id.toString())) {
          return res.status(403).json({
            success: false,
            message: `Access denied: As a ${callerScope.hierarchyLevel.toUpperCase()}, you cannot view this member's dashboard.`,
          });
        }
      }
    } else {
      // 'me'
      targetMember = callerScope.member;
    }

    // Determine the view level & allowed IDs for this dashboard
    let dashboardLevel = targetMember ? targetMember.hierarchyLevel : callerScope.hierarchyLevel;
    let allowedUserIds = [];
    let allowedMemberIds = [];

    if (targetMember) {
      allowedMemberIds = [targetMember._id.toString()];
      if (targetMember.userId?._id) allowedUserIds.push(targetMember.userId._id.toString());

      if (targetMember.hierarchyLevel === 'supervisor') {
        const helpers = await TaskforceMember.find({
          supervisorId: targetMember._id,
          status: 'active',
        }).lean();
        helpers.forEach((h) => {
          allowedMemberIds.push(h._id.toString());
          if (h.userId) allowedUserIds.push(h.userId.toString());
        });
      } else if (targetMember.hierarchyLevel === 'head') {
        const supervisors = await TaskforceMember.find({
          headId: targetMember._id,
          hierarchyLevel: 'supervisor',
          status: 'active',
        }).lean();
        const supIds = supervisors.map((s) => s._id);
        const helpers = await TaskforceMember.find({
          $or: [{ headId: targetMember._id }, { supervisorId: { $in: supIds } }],
          status: 'active',
        }).lean();

        [...supervisors, ...helpers].forEach((m) => {
          allowedMemberIds.push(m._id.toString());
          if (m.userId) allowedUserIds.push(m.userId.toString());
        });
      }
    } else {
      // General manager/admin personal view
      dashboardLevel = 'taskforce_manager';
      allowedUserIds = null;
      allowedMemberIds = null;
    }

    // Build Task Query
    const taskQuery = { status: { $nin: ['cancelled'] } };
    if (allowedMemberIds && allowedUserIds) {
      taskQuery.$or = [
        { assignedMembers: { $in: allowedMemberIds } },
        { assignedTo: { $in: allowedUserIds } },
      ];
    }

    const tasks = await Task.find(taskQuery)
      .populate('assignedBy', 'firstName lastName username')
      .populate('assignedTo', 'firstName lastName username email mobileNo')
      .populate('assignedMembers', 'name trade hierarchyLevel')
      .populate('apartmentDetails.projectId', 'projectName projectCode')
      .sort({ updatedAt: -1 })
      .lean();

    // Hierarchy Uploads Scoping:
    // Helper sees ONLY his uploads.
    // Supervisor sees his + helpers' uploads.
    // Head sees his + supervisors' + helpers' uploads.
    // Manager/Admin sees all uploads.
    const allUploads = [];
    const sanitizedTasks = tasks.map((t) => {
      let filteredUploads = t.uploads || [];

      if (!callerScope.isManagerOrAdmin && allowedUserIds) {
        filteredUploads = filteredUploads.filter((u) =>
          allowedUserIds.includes(u.uploadedBy?.toString())
        );
      }

      filteredUploads.forEach((up) => {
        allUploads.push({
          ...up,
          taskCode: t.taskCode,
          taskTitle: t.title,
          taskId: t._id,
          apartmentFlat: t.apartmentDetails?.flatNumber || null,
        });
      });

      return {
        ...t,
        uploads: filteredUploads,
      };
    });

    // KPI Metrics calculation
    const totalCount = sanitizedTasks.length;
    const completedCount = sanitizedTasks.filter((t) => t.status === 'completed').length;
    const inProgressCount = sanitizedTasks.filter((t) => t.status === 'in_progress').length;
    const pendingCount = sanitizedTasks.filter((t) => t.status === 'pending').length;
    const roadblockCount = sanitizedTasks.filter(
      (t) => t.roadblockAlert?.hasRoadblock && !t.roadblockAlert?.isResolved
    ).length;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const overdueCount = sanitizedTasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < startOfDay && t.status !== 'completed'
    ).length;

    const avgProgress =
      totalCount > 0
        ? Math.round(sanitizedTasks.reduce((acc, t) => acc + (t.progress || 0), 0) / totalCount)
        : 0;

    return res.json({
      success: true,
      member: targetMember,
      hierarchyLevel: dashboardLevel,
      callerLevel: callerScope.hierarchyLevel,
      kpis: {
        totalCount,
        completedCount,
        inProgressCount,
        pendingCount,
        overdueCount,
        roadblockCount,
        avgProgress,
        totalUploads: allUploads.length,
      },
      tasks: sanitizedTasks,
      uploads: allUploads.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)),
    });
  } catch (error) {
    console.error('Error in getMemberDashboard:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc   Upload task proof / site evidence document
 * @route  POST /api/tasks/:id/upload-proof
 */
export const uploadTaskProof = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks = '', stage = 'proof' } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No proof file uploaded' });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Save file to disk
    const fs = await import('fs');
    const pathModule = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = pathModule.default.dirname(__filename);

    const uploadsDir = pathModule.default.resolve(__dirname, '../uploads/taskforce_proofs');
    if (!fs.default.existsSync(uploadsDir)) {
      fs.default.mkdirSync(uploadsDir, { recursive: true });
    }

    const ext = pathModule.default.extname(req.file.originalname) || '.jpg';
    const safeName = `proof_${task.taskCode || task._id}_${Date.now()}${ext}`;
    const filePath = pathModule.default.join(uploadsDir, safeName);
    fs.default.writeFileSync(filePath, req.file.buffer);

    const fileUrl = `/uploads/taskforce_proofs/${safeName}`;

    // Get uploader's hierarchy
    const scope = await getScopedTaskforceContext(req.user);
    const uploaderRole = scope.isManagerOrAdmin ? 'taskforce_manager' : scope.hierarchyLevel;
    const uploaderName = req.user.username || scope.member?.name || 'Staff';

    const uploadEntry = {
      fileName: req.file.originalname,
      fileUrl,
      fileSize: req.file.size,
      fileType: ext.toLowerCase().includes('pdf') ? 'pdf' : 'image',
      uploadedBy: req.user.id,
      uploaderName,
      uploaderRole,
      remarks,
      stage,
      uploadedAt: new Date(),
    };

    if (!task.uploads) task.uploads = [];
    task.uploads.push(uploadEntry);

    // Audit trail
    task.auditTrail.push({
      action: 'Proof Uploaded',
      performedBy: req.user.id,
      details: `${uploaderRole.toUpperCase()} uploaded "${req.file.originalname}" (${stage})`,
      timestamp: new Date(),
    });

    await task.save();

    return res.status(201).json({
      success: true,
      message: 'Work proof uploaded successfully',
      data: uploadEntry,
      task,
    });
  } catch (error) {
    console.error('Error uploading task proof:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc   Delete task proof upload
 * @route  DELETE /api/tasks/:id/uploads/:uploadId
 */
export const deleteTaskUpload = async (req, res) => {
  try {
    const { id, uploadId } = req.params;
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const uploadItem = (task.uploads || []).id(uploadId);
    if (!uploadItem) {
      return res.status(404).json({ success: false, message: 'Upload not found' });
    }

    // Only uploader or admin/manager can delete
    const isOwner = uploadItem.uploadedBy?.toString() === req.user.id;
    const isAdmin = ['admin', 'super_admin', 'taskforce_manager'].includes(req.user.role);
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Unauthorized to delete this upload' });
    }

    task.uploads.pull(uploadId);
    await task.save();

    return res.json({ success: true, message: 'Upload deleted successfully' });
  } catch (error) {
    console.error('Error deleting task upload:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
