import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Role } from '../models/Role.js';
import { Branch } from '../models/Branch.js';
import { escapeRegex } from '../utils/regexUtil.js';
import { recordAuditEvent } from '../middleware/auditMiddleware.js';

/**
 * @desc   Get all users with optional filters & search
 * @route  GET /api/users
 * @access Private (Admin / User Manager)
 */
export const getUsers = async (req, res) => {
  try {
    const { search, role, status, branchId, page = 1, limit = 50 } = req.query;

    const query = {};

    if (search) {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { username: searchRegex },
        { email: searchRegex },
        { mobileNo: searchRegex },
      ];
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (role && role !== 'all') {
      query.roleId = role;
    }

    if (branchId && branchId !== 'all') {
      query['branchAccess.branchId'] = branchId;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [users, total] = await Promise.all([
      User.find(query)
        .populate({
          path: 'roleId',
          model: 'Role',
          select: 'roleName roleCode isSystemRole',
        })
        .populate('branchAccess.branchId', 'branchName branchCode isHeadOffice')
        .populate('employeeId', 'employeeCode firstName lastName departmentId')
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: users,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit),
      },
    });
  } catch (error) {
    console.error('getUsers error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve users',
      error: error.message,
    });
  }
};

/**
 * @desc   Get user by ID
 * @route  GET /api/users/:id
 * @access Private
 */
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate({
        path: 'roleId',
        model: 'Role',
        populate: {
          path: 'permissions',
          model: 'Permission',
        },
      })
      .populate('branchAccess.branchId')
      .populate('employeeId')
      .select('-passwordHash');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user details',
      error: error.message,
    });
  }
};

/**
 * @desc   Create new user
 * @route  POST /api/users
 * @access Private (Admin / User Manager)
 */
export const createUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      username,
      email,
      mobileNo,
      password,
      roleId,
      branchAccess,
      employeeId,
      agentProfile,
      status = 'active',
    } = req.body;

    if (!firstName || !username || !email || !password || !roleId) {
      return res.status(400).json({
        success: false,
        message: 'First name, username, email, password, and role are required',
      });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    // Check duplicate username or email
    const existing = await User.findOne({
      $or: [{ username: cleanUsername }, { email: cleanEmail }],
    });

    if (existing) {
      const field = existing.username === cleanUsername ? 'Username' : 'Email address';
      return res.status(400).json({
        success: false,
        message: `${field} is already in use by another account`,
      });
    }

    // Verify role exists
    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(400).json({
        success: false,
        message: 'Specified role not found',
      });
    }

    // Process branch access
    let formattedBranchAccess = branchAccess || [];
    if (!formattedBranchAccess.length) {
      const headOffice = await Branch.findOne({ isHeadOffice: true }) || await Branch.findOne();
      if (headOffice) {
        formattedBranchAccess = [{ branchId: headOffice._id, accessLevel: 'view', isPrimary: true }];
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      firstName: firstName.trim(),
      lastName: lastName ? lastName.trim() : '',
      username: cleanUsername,
      email: cleanEmail,
      mobileNo: mobileNo ? mobileNo.trim() : '',
      passwordHash,
      roleId,
      branchAccess: formattedBranchAccess,
      employeeId: employeeId || null,
      agentProfile: agentProfile || undefined,
      status,
      createdBy: req.user?.id,
    });

    // Add user to role.users
    if (!role.users.includes(savedUser._id)) {
      role.users.push(savedUser._id);
      await role.save();
    }

    const populatedUser = await User.findById(savedUser._id)
      .populate({ path: 'roleId', model: 'Role', select: 'roleName roleCode' })
      .populate('branchAccess.branchId', 'branchName branchCode')
      .select('-passwordHash');

    await recordAuditEvent({
      eventType: 'CRUD',
      action: 'CREATE',
      module: role.roleCode === 'agent' ? 'agent' : 'users',
      resourceType: 'User',
      resourceId: savedUser._id,
      resourceName: `${savedUser.firstName} ${savedUser.lastName || ''} (@${savedUser.username})`,
      req,
      summary: `Created ${role.roleCode === 'agent' ? 'Channel Partner Agent' : 'User'} account for "${savedUser.firstName} ${savedUser.lastName || ''}" (@${savedUser.username}) with Role "${role.roleName}"`,
      changes: {
        role: role.roleName,
        agentProfile: savedUser.agentProfile,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: populatedUser,
    });
  } catch (error) {
    console.error('createUser error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message,
    });
  }
};

/**
 * @desc   Update user details
 * @route  PUT /api/users/:id
 * @access Private (Admin / User Manager)
 */
export const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const {
      firstName,
      lastName,
      email,
      mobileNo,
      roleId,
      branchAccess,
      employeeId,
      agentProfile,
      status,
    } = req.body;

    if (email && email.trim().toLowerCase() !== user.email) {
      const cleanEmail = email.trim().toLowerCase();
      const existingEmail = await User.findOne({ email: cleanEmail, _id: { $ne: user._id } });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email address already in use',
        });
      }
      user.email = cleanEmail;
    }

    if (firstName) user.firstName = firstName.trim();
    if (lastName !== undefined) user.lastName = lastName.trim();
    if (mobileNo !== undefined) user.mobileNo = mobileNo.trim();
    if (status) user.status = status;
    if (employeeId !== undefined) user.employeeId = employeeId || null;
    if (branchAccess) user.branchAccess = branchAccess;
    if (agentProfile) user.agentProfile = { ...user.agentProfile, ...agentProfile };

    // Handle role change
    if (roleId && roleId.toString() !== user.roleId.toString()) {
      const oldRole = await Role.findById(user.roleId);
      if (oldRole) {
        oldRole.users = oldRole.users.filter((id) => id.toString() !== user._id.toString());
        await oldRole.save();
      }

      const newRole = await Role.findById(roleId);
      if (newRole) {
        if (!newRole.users.includes(user._id)) {
          newRole.users.push(user._id);
          await newRole.save();
        }
      }
      user.roleId = roleId;
    }

    user.updatedBy = req.user?.id;
    await user.save();

    const updatedUser = await User.findById(user._id)
      .populate({ path: 'roleId', model: 'Role', select: 'roleName roleCode' })
      .populate('branchAccess.branchId', 'branchName branchCode')
      .select('-passwordHash');

    const isAgent = updatedUser.roleId?.roleCode === 'agent';
    await recordAuditEvent({
      eventType: 'CRUD',
      action: 'UPDATE',
      module: isAgent ? 'agent' : 'users',
      resourceType: 'User',
      resourceId: updatedUser._id,
      resourceName: `${updatedUser.firstName} ${updatedUser.lastName || ''} (@${updatedUser.username})`,
      req,
      summary: `Updated ${isAgent ? 'Channel Partner Agent' : 'User'} profile for "${updatedUser.firstName} ${updatedUser.lastName || ''}" (@${updatedUser.username})`,
      changes: {
        agentProfile: updatedUser.agentProfile,
        status: updatedUser.status,
        email: updatedUser.email,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    console.error('updateUser error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message,
    });
  }
};

/**
 * @desc   Update user status (active, inactive, suspended, locked)
 * @route  PATCH /api/users/:id/status
 * @access Private (Admin)
 */
export const updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'inactive', 'suspended', 'locked'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value',
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.status = status;
    if (status === 'active') {
      user.failedLoginAttempts = 0;
      user.accountLockedUntil = null;
    }

    user.updatedBy = req.user?.id;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `User status changed to ${status}`,
      status: user.status,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update status',
      error: error.message,
    });
  }
};

/**
 * @desc   Reset user password by admin
 * @route  POST /api/users/:id/reset-password
 * @access Private (Admin)
 */
export const resetUserPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters',
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.passwordChangedAt = new Date();
    user.failedLoginAttempts = 0;
    user.accountLockedUntil = null;
    user.updatedBy = req.user?.id;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `Password reset successfully for @${user.username}`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      error: error.message,
    });
  }
};

/**
 * @desc   Delete user
 * @route  DELETE /api/users/:id
 * @access Private (Admin)
 */
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.username === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete primary system administrator account',
      });
    }

    // Remove from role's users array
    if (user.roleId) {
      await Role.findByIdAndUpdate(user.roleId, {
        $pull: { users: user._id },
      });
    }

    await User.findByIdAndDelete(user._id);

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message,
    });
  }
};
