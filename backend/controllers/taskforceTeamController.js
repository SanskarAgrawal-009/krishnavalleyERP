import { TaskforceMember } from '../models/TaskforceMember.js';
import { TaskforceDepartment } from '../models/TaskforceDepartment.js';
import { Task } from '../models/Task.js';
import { User } from '../models/User.js';
import { Role } from '../models/Role.js';
import { Branch } from '../models/Branch.js';
import bcrypt from 'bcryptjs';

/**
 * Helper to ensure a TaskforceMember has a corresponding User in Access Control & Governance
 */
export const ensureUserForTaskforceMember = async (member, plainPassword = null, customUsername = null) => {
  try {
    let existing = null;
    if (member.userId) {
      existing = await User.findById(member.userId);
    }
    if (!existing && member.email) {
      existing = await User.findOne({ email: member.email.toLowerCase().trim() });
    }
    if (!existing && customUsername) {
      existing = await User.findOne({ username: customUsername.toLowerCase().trim() });
    }

    if (existing) {
      let changed = false;
      if (member.department && existing.department !== member.department) {
        existing.department = member.department;
        changed = true;
      }
      if (!existing.isTaskforceMember) {
        existing.isTaskforceMember = true;
        changed = true;
      }
      if (member.hierarchyLevel && existing.taskforceHierarchyLevel !== member.hierarchyLevel) {
        existing.taskforceHierarchyLevel = member.hierarchyLevel;
        changed = true;
      }
      if (!existing.initialPassword) {
        existing.initialPassword = plainPassword || 'Taskforce@123';
        changed = true;
      }
      if (changed) await existing.save();

      if (!member.userId || member.userId.toString() !== existing._id.toString()) {
        member.userId = existing._id;
        await member.save();
      }
      return existing;
    }

    // Derive username
    let cleanUsername = (customUsername || '').toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
    if (!cleanUsername) {
      cleanUsername = (member.name || 'member')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9_]/g, '_');
    }

    // Check if username taken, append suffix if needed
    let finalUsername = cleanUsername;
    let counter = 1;
    while (await User.findOne({ username: finalUsername })) {
      finalUsername = `${cleanUsername}_${counter++}`;
    }

    // Check if email taken, fallback if needed
    let finalEmail = (member.email || `${finalUsername}@krishnavalley.com`).toLowerCase().trim();
    if (await User.findOne({ email: finalEmail })) {
      finalEmail = `${finalUsername}_${Date.now()}@krishnavalley.com`;
    }

    const pwd = plainPassword || 'Taskforce@123';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(pwd, salt);

    // Role resolution
    let roleDoc = null;
    if (member.hierarchyLevel === 'head') {
      roleDoc = (await Role.findOne({ roleCode: 'taskforce_lead' })) || (await Role.findOne({ roleCode: 'head' }));
    } else if (member.hierarchyLevel === 'supervisor') {
      roleDoc = (await Role.findOne({ roleCode: 'taskforce_supervisor' })) || (await Role.findOne({ roleCode: 'supervisor' }));
    } else {
      roleDoc = (await Role.findOne({ roleCode: 'taskforce_member' })) || (await Role.findOne({ roleCode: 'helper' })) || (await Role.findOne({ roleCode: 'staff' }));
    }
    if (!roleDoc) {
      roleDoc = (await Role.findOne({ roleCode: 'staff' })) || (await Role.findOne({ roleCode: 'employee' })) || (await Role.findOne());
    }

    // Default branch
    const branch = (await Branch.findOne({ isHeadOffice: true })) || (await Branch.findOne());
    const branchAccess = branch ? [{ branchId: branch._id, accessLevel: 'view', isPrimary: true }] : [];

    const nameParts = (member.name || 'Taskforce Member').trim().split(' ');
    const firstName = nameParts[0] || 'Taskforce';
    const lastName = nameParts.slice(1).join(' ') || (member.department || 'Operations');

    const newUser = await User.create({
      firstName,
      lastName,
      username: finalUsername,
      email: finalEmail,
      mobileNo: member.mobileNo || '',
      passwordHash,
      initialPassword: pwd,
      department: member.department || 'General Operations',
      isTaskforceMember: true,
      taskforceHierarchyLevel: member.hierarchyLevel || 'helper',
      roleId: roleDoc?._id,
      branchAccess,
      status: 'active',
    });

    member.userId = newUser._id;
    await member.save();

    return newUser;
  } catch (err) {
    console.error(`Error creating user for member "${member.name}":`, err);
    return null;
  }
};

/**
 * Auto-sync all TaskforceMembers without a user account to Access Control & Governance
 */
export const syncAllTaskforceMembersToUsers = async () => {
  try {
    const allMembers = await TaskforceMember.find({
      status: { $ne: 'deleted' },
    });

    for (const m of allMembers) {
      await ensureUserForTaskforceMember(m, 'Taskforce@123');
    }
  } catch (err) {
    console.error('Error auto-syncing taskforce members to user accounts:', err);
  }
};

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
    // Auto-sync any existing unlinked taskforce members so they exist in Access Control & Governance
    await syncAllTaskforceMembersToUsers();

    const scope = await getScopedTaskforceContext(req.user);

    const query = {};
    if (!scope.isManagerOrAdmin && scope.allowedMemberIds) {
      query._id = { $in: scope.allowedMemberIds };
    }

    const members = await TaskforceMember.find(query)
      .populate('userId', 'firstName lastName username email mobileNo status initialPassword')
      .populate('supervisorId', 'name trade department hierarchyLevel')
      .populate('headId', 'name trade department hierarchyLevel')
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
      department,
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

    const deptValue = (department || trade || 'General Operations').trim();

    // 1. Create the Taskforce Member
    const member = new TaskforceMember({
      name: name.trim(),
      mobileNo: mobileNo ? mobileNo.trim() : '',
      email: email ? email.toLowerCase().trim() : '',
      hierarchyLevel,
      supervisorId: hierarchyLevel === 'helper' ? supervisorId || null : null,
      headId: headId || null,
      department: deptValue,
      trade: deptValue,
      notes: notes ? notes.trim() : '',
      userId: userId || null,
      addedBy: req.user.id,
    });

    // 2. Guarantee that an account with ID and Password exists in Access Control & Governance
    const linkedUser = await ensureUserForTaskforceMember(
      member,
      password || 'Taskforce@123',
      username || null
    );

    if (linkedUser) {
      member.userId = linkedUser._id;
    }
    await member.save();

    return res.status(201).json({
      success: true,
      message: `Team member "${member.name}" added successfully and registered in Access Control & Governance! (User ID: @${linkedUser?.username || 'member'}, Password: ${linkedUser?.initialPassword || password || 'Taskforce@123'})`,
      member: {
        ...member.toObject(),
        userId: linkedUser
          ? {
              _id: linkedUser._id,
              username: linkedUser.username,
              initialPassword: linkedUser.initialPassword,
              email: linkedUser.email,
              department: linkedUser.department,
            }
          : null,
      },
      credentials: {
        username: linkedUser?.username,
        initialPassword: linkedUser?.initialPassword || password || 'Taskforce@123',
      },
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
      department,
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
    if (trade !== undefined || department !== undefined) {
      const dVal = (department || trade || '').trim();
      member.department = dVal;
      member.trade = dVal;
    }
    if (status !== undefined) member.status = status;
    if (notes !== undefined) member.notes = notes.trim();
    if (userId !== undefined) member.userId = userId || null;

    await member.save();

    // Sync changes into linked User in Access Control & Governance
    if (member.userId) {
      try {
        const u = await User.findById(member.userId);
        if (u) {
          let uChanged = false;
          if (name !== undefined) {
            const parts = name.trim().split(' ');
            u.firstName = parts[0] || u.firstName;
            u.lastName = parts.slice(1).join(' ') || u.lastName;
            uChanged = true;
          }
          if (mobileNo !== undefined && mobileNo !== u.mobileNo) {
            u.mobileNo = mobileNo;
            uChanged = true;
          }
          if (email !== undefined && email !== u.email) {
            u.email = email;
            uChanged = true;
          }
          if (member.department && u.department !== member.department) {
            u.department = member.department;
            uChanged = true;
          }
          if (hierarchyLevel !== undefined && u.taskforceHierarchyLevel !== hierarchyLevel) {
            u.taskforceHierarchyLevel = hierarchyLevel;
            uChanged = true;
          }
          if (uChanged) await u.save();
        }
      } catch (uErr) {
        console.error('Error syncing User on updateTeamMember:', uErr);
      }
    }

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

export const DEFAULT_TASKFORCE_DEPTS = [
  { name: 'Human Resource', code: 'HR', color: '#8b5cf6', description: 'Human Resource management, staff welfare & recruitment', order: 1 },
  { name: 'I.T.', code: 'IT', color: '#0284c7', description: 'Information Technology, software, systems & IT infrastructure', order: 2 },
  { name: 'Procurement', code: 'PROC', color: '#d97706', description: 'Material procurement, purchase orders & vendor logistics', order: 3 },
  { name: 'Hotel', code: 'HOTEL', color: '#ec4899', description: 'Hotel property operations, hospitality & guest amenities', order: 4 },
  { name: 'Security', code: 'SEC', color: '#475569', description: 'Surveillance, perimeter access control & site safety', order: 5 },
  { name: 'Accounts', code: 'ACC', color: '#10b981', description: 'Billing, financial accounts, audits & payments', order: 6 },
  { name: 'C.R.M.', code: 'CRM', color: '#f59e0b', description: 'Customer relationship management, client coordination & support', order: 7 },
  { name: 'Admin / Operations', code: 'ADMIN', color: '#6366f1', description: 'Administrative operations, site coordination & facility oversight', order: 8 },
  { name: 'Maintenance', code: 'MAINT', color: '#06b6d4', description: 'Preventive maintenance, utility upkeep & repairs', order: 9 },
  { name: 'Civil', code: 'CIVIL', color: '#ea580c', description: 'Civil works, masonry, structural snagging & construction', order: 10 },
  { name: 'Licensing', code: 'LIC', color: '#eab308', description: 'Statutory compliance, legal permits & licensing', order: 11 },
];

/**
 * @desc   Get all Taskforce departments with hierarchy stats & member breakdowns
 * @route  GET /api/taskforce-manager/departments
 */
export const getTaskforceDepartments = async (req, res) => {
  try {
    // Auto-seed defaults if collection empty
    const count = await TaskforceDepartment.countDocuments();
    if (count === 0) {
      await TaskforceDepartment.insertMany(DEFAULT_TASKFORCE_DEPTS);
    }

    const departments = await TaskforceDepartment.find({ status: 'active' })
      .populate('headMemberId', 'name mobileNo email hierarchyLevel')
      .sort({ order: 1, name: 1 })
      .lean();

    // Query active members to aggregate hierarchy stats per department
    const members = await TaskforceMember.find({ status: { $ne: 'deleted' } })
      .select('_id name department trade hierarchyLevel')
      .lean();

    // Query tasks to get active/completed counts per department
    const tasks = await Task.find({ status: { $nin: ['cancelled'] } })
      .select('department status')
      .lean();

    const enrichedDepts = departments.map((dept) => {
      const deptName = dept.name;
      const deptLower = deptName.toLowerCase();

      const deptMembers = members.filter((m) => {
        const md = (m.department || m.trade || '').toLowerCase();
        return md === deptLower;
      });

      const deptTasks = tasks.filter((t) => (t.department || '').toLowerCase() === deptLower);

      const headsCount = deptMembers.filter((m) => m.hierarchyLevel === 'head').length;
      const supervisorsCount = deptMembers.filter((m) => m.hierarchyLevel === 'supervisor').length;
      const helpersCount = deptMembers.filter((m) => m.hierarchyLevel === 'helper').length;
      const activeTasks = deptTasks.filter((t) => ['pending', 'in_progress', 'under_review'].includes(t.status)).length;
      const completedTasks = deptTasks.filter((t) => t.status === 'completed').length;

      return {
        ...dept,
        stats: {
          totalMembers: deptMembers.length,
          headsCount,
          supervisorsCount,
          helpersCount,
          activeTasks,
          completedTasks,
        },
      };
    });

    const totalActiveTasks = tasks.filter((t) => ['pending', 'in_progress', 'under_review'].includes(t.status)).length;

    return res.json({
      success: true,
      departments: enrichedDepts,
      summary: {
        totalDepartments: enrichedDepts.length,
        totalMembers: members.length,
        totalActiveTasks,
      },
    });
  } catch (error) {
    console.error('Error fetching taskforce departments:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc   Create new Taskforce Department
 * @route  POST /api/taskforce-manager/departments
 */
export const createTaskforceDepartment = async (req, res) => {
  try {
    const { name, code, description, color, headMemberId } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Department name is required' });
    }

    const trimmedName = name.trim();
    const existing = await TaskforceDepartment.findOne({
      name: { $regex: new RegExp(`^${trimmedName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') },
      status: 'active',
    });

    if (existing) {
      return res.status(400).json({ success: false, message: `Department "${trimmedName}" already exists` });
    }

    const department = await TaskforceDepartment.create({
      name: trimmedName,
      code: code ? code.trim().toUpperCase() : trimmedName.substring(0, 4).toUpperCase(),
      description: (description || '').trim(),
      color: color || '#2563eb',
      headMemberId: headMemberId || null,
      createdBy: req.user?.id || null,
      status: 'active',
    });

    return res.status(201).json({
      success: true,
      message: `Department "${department.name}" created successfully`,
      department,
    });
  } catch (error) {
    console.error('Error creating department:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc   Update Taskforce Department
 * @route  PUT /api/taskforce-manager/departments/:id
 */
export const updateTaskforceDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description, color, headMemberId } = req.body;

    const department = await TaskforceDepartment.findById(id);
    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    const oldName = department.name;
    if (name && name.trim() && name.trim() !== oldName) {
      const newName = name.trim();
      const duplicate = await TaskforceDepartment.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${newName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') },
        status: 'active',
      });
      if (duplicate) {
        return res.status(400).json({ success: false, message: `Department "${newName}" already exists` });
      }

      department.name = newName;
      // Reassign existing members
      await TaskforceMember.updateMany(
        { $or: [{ department: oldName }, { trade: oldName }] },
        { $set: { department: newName, trade: newName } }
      );
      // Reassign existing tasks
      await Task.updateMany(
        { department: oldName },
        { $set: { department: newName } }
      );
    }

    if (code !== undefined) department.code = code.trim().toUpperCase();
    if (description !== undefined) department.description = description.trim();
    if (color !== undefined) department.color = color;
    if (headMemberId !== undefined) department.headMemberId = headMemberId || null;

    await department.save();

    return res.json({
      success: true,
      message: `Department "${department.name}" updated successfully`,
      department,
    });
  } catch (error) {
    console.error('Error updating department:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc   Delete / remove department from Taskforce (reassign members & tasks to fallback department)
 * @route  POST /api/taskforce-manager/department/delete or DELETE /api/taskforce-manager/departments/:id
 */
export const deleteDepartment = async (req, res) => {
  try {
    const departmentIdent = req.params?.id || req.body?.department || req.body?.id || req.query?.department;
    if (!departmentIdent || (typeof departmentIdent === 'string' && !departmentIdent.trim())) {
      return res.status(400).json({ success: false, message: 'Department identifier is required' });
    }

    const fallbackDepartment = (req.body?.fallbackDepartment || 'General Operations').trim();
    const rawIdent = typeof departmentIdent === 'string' ? departmentIdent.trim() : '';

    // Check if Mongo ID or Name
    let deptDoc = null;
    if (rawIdent.match(/^[0-9a-fA-F]{24}$/)) {
      deptDoc = await TaskforceDepartment.findById(rawIdent);
    }
    if (!deptDoc && rawIdent) {
      deptDoc = await TaskforceDepartment.findOne({
        name: { $regex: new RegExp(`^${rawIdent.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') },
      });
    }

    const deptName = deptDoc ? deptDoc.name : rawIdent;

    if (deptDoc) {
      await TaskforceDepartment.findByIdAndDelete(deptDoc._id);
    }

    // Reassign any existing members with this department/trade
    const memberResult = await TaskforceMember.updateMany(
      { $or: [{ department: deptName }, { trade: deptName }] },
      { $set: { department: fallbackDepartment, trade: fallbackDepartment } }
    );

    // Reassign tasks
    await Task.updateMany(
      { department: deptName },
      { $set: { department: fallbackDepartment } }
    );

    return res.json({
      success: true,
      message: `Department "${deptName}" deleted. ${memberResult.modifiedCount} member(s) updated to "${fallbackDepartment}".`,
      modifiedCount: memberResult.modifiedCount,
      department: deptName,
      fallbackDepartment,
    });
  } catch (error) {
    console.error('Error deleting department:', error);
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
        .populate('supervisorId', 'name trade department hierarchyLevel')
        .populate('headId', 'name trade department hierarchyLevel')
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
      .populate('assignedMembers', 'name trade department hierarchyLevel')
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
