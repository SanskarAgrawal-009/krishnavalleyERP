import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Role } from '../models/Role.js';
import { Permission } from '../models/Permission.js';
import { Branch } from '../models/Branch.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_change_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * @desc   Authenticate user & return JWT token + profile + permissions
 * @route  POST /api/auth/login
 * @access Public
 */
export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username/email and password',
      });
    }

    const cleanIdentifier = identifier.trim().toLowerCase();

    // Query user by username OR email
    const user = await User.findOne({
      $or: [{ username: cleanIdentifier }, { email: cleanIdentifier }],
    }).populate({
      path: 'roleId',
      model: 'Role',
      populate: {
        path: 'permissions',
        model: 'Permission',
      },
    }).populate('branchAccess.branchId');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username/email or password',
      });
    }

    // Check if account is locked
    if (user.isLocked()) {
      const remainingMinutes = Math.ceil((user.accountLockedUntil - Date.now()) / (60 * 1000));
      return res.status(423).json({
        success: false,
        message: `Account is temporarily locked due to excessive failed attempts. Please try again in ${remainingMinutes} minute(s).`,
      });
    }

    // Check account status
    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Account has been suspended. Please contact your system administrator.',
      });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact your system administrator.',
      });
    }

    // Verify Password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.accountLockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
        user.status = 'locked';
        await user.save();

        return res.status(423).json({
          success: false,
          message: `Too many failed login attempts. Your account is locked for 15 minutes.`,
        });
      }

      await user.save();
      const attemptsLeft = MAX_FAILED_ATTEMPTS - user.failedLoginAttempts;

      return res.status(401).json({
        success: false,
        message: `Invalid credentials. ${attemptsLeft} attempt(s) remaining before temporary lockout.`,
      });
    }

    // Login successful: Reset lock status and update lastLoginAt
    user.failedLoginAttempts = 0;
    user.accountLockedUntil = null;
    user.status = 'active';
    user.lastLoginAt = new Date();
    await user.save();

    // Prepare role and permissions
    const roleDoc = user.roleId || {};
    const permissions = (roleDoc.permissions || []).map((p) => ({
      _id: p._id,
      permissionName: p.permissionName,
      permissionCode: p.permissionCode,
      module: p.module,
      action: p.action,
    }));
    const permissionCodes = permissions.map((p) => p.permissionCode);

    // Primary branch
    const primaryBranchObj = (user.branchAccess || []).find((b) => b.isPrimary) || user.branchAccess?.[0];

    // Generate JWT payload
    const tokenPayload = {
      id: user._id,
      username: user.username,
      email: user.email,
      role: roleDoc.roleCode || 'user',
      roleName: roleDoc.roleName || 'User',
      roleId: roleDoc._id,
      permissions: permissionCodes,
      primaryBranchId: primaryBranchObj?.branchId?._id,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return res.status(200).json({
      success: true,
      message: `Welcome back, ${user.firstName}!`,
      token,
      user: {
        _id: user._id,
        employeeId: user.employeeId,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email,
        mobileNo: user.mobileNo,
        status: user.status,
        lastLoginAt: user.lastLoginAt,
        agentProfile: user.agentProfile || null,
        role: {
          _id: roleDoc._id,
          roleName: roleDoc.roleName,
          roleCode: roleDoc.roleCode,
          description: roleDoc.description,
          isSystemRole: roleDoc.isSystemRole,
        },
        permissions,
        permissionCodes,
        branchAccess: user.branchAccess,
        primaryBranch: primaryBranchObj?.branchId,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login authentication',
      error: error.message,
    });
  }
};

/**
 * @desc   Get current authenticated user profile
 * @route  GET /api/auth/me
 * @access Private
 */
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({
        path: 'roleId',
        model: 'Role',
        populate: {
          path: 'permissions',
          model: 'Permission',
        },
      })
      .populate('branchAccess.branchId')
      .populate('employeeId');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found',
      });
    }

    const roleDoc = user.roleId || {};
    const permissions = (roleDoc.permissions || []).map((p) => ({
      _id: p._id,
      permissionName: p.permissionName,
      permissionCode: p.permissionCode,
      module: p.module,
      action: p.action,
    }));
    const permissionCodes = permissions.map((p) => p.permissionCode);

    const primaryBranchObj = (user.branchAccess || []).find((b) => b.isPrimary) || user.branchAccess?.[0];

    return res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        employeeId: user.employeeId,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email,
        mobileNo: user.mobileNo,
        status: user.status,
        lastLoginAt: user.lastLoginAt,
        agentProfile: user.agentProfile || null,
        role: {
          _id: roleDoc._id,
          roleName: roleDoc.roleName,
          roleCode: roleDoc.roleCode,
          description: roleDoc.description,
          isSystemRole: roleDoc.isSystemRole,
        },
        permissions,
        permissionCodes,
        branchAccess: user.branchAccess,
        primaryBranch: primaryBranchObj?.branchId,
      },
    });
  } catch (error) {
    console.error('getMe error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user session',
      error: error.message,
    });
  }
};

/**
 * @desc   Change user password
 * @route  POST /api/auth/change-password
 * @access Private
 */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Both current password and new password are required',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long',
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    user.passwordHash = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('changePassword error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message,
    });
  }
};

/**
 * @desc   Logout user / invalidate session
 * @route  POST /api/auth/logout
 * @access Public
 */
export const logout = (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};
