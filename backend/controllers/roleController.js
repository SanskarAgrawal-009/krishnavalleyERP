import { Role } from '../models/Role.js';
import { Permission } from '../models/Permission.js';
import { Branch } from '../models/Branch.js';
import { User } from '../models/User.js';

/**
 * @desc   Get all roles with populated permissions & user count
 * @route  GET /api/roles
 * @access Private
 */
export const getRoles = async (req, res) => {
  try {
    const roles = await Role.find()
      .populate('permissions', 'permissionName permissionCode module action description')
      .sort({ isSystemRole: -1, createdAt: 1 });

    // Map roles to include actual user count
    const rolesWithCounts = await Promise.all(
      roles.map(async (role) => {
        const userCount = await User.countDocuments({ roleId: role._id });
        const obj = role.toObject();
        obj.userCount = userCount;
        return obj;
      })
    );

    return res.status(200).json({
      success: true,
      data: rolesWithCounts,
    });
  } catch (error) {
    console.error('getRoles error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve roles',
      error: error.message,
    });
  }
};

/**
 * @desc   Get single role by ID
 * @route  GET /api/roles/:id
 * @access Private
 */
export const getRoleById = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id).populate('permissions');
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }

    const userCount = await User.countDocuments({ roleId: role._id });
    const result = role.toObject();
    result.userCount = userCount;

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve role',
      error: error.message,
    });
  }
};

/**
 * @desc   Create new custom role
 * @route  POST /api/roles
 * @access Private (Admin)
 */
export const createRole = async (req, res) => {
  try {
    const { roleName, roleCode, description, permissions, isActive = true } = req.body;

    if (!roleName || !roleCode) {
      return res.status(400).json({
        success: false,
        message: 'Role name and role code are required',
      });
    }

    const cleanCode = roleCode.trim().toLowerCase().replace(/\s+/g, '_');

    const existingRole = await Role.findOne({
      $or: [{ roleName: roleName.trim() }, { roleCode: cleanCode }],
    });

    if (existingRole) {
      return res.status(400).json({
        success: false,
        message: 'A role with this name or code already exists',
      });
    }

    const newRole = await Role.create({
      roleName: roleName.trim(),
      roleCode: cleanCode,
      description: description ? description.trim() : '',
      permissions: permissions || [],
      isActive,
      isSystemRole: false,
      createdBy: req.user?.id,
    });

    const populatedRole = await Role.findById(newRole._id).populate('permissions');

    return res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: populatedRole,
    });
  } catch (error) {
    console.error('createRole error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create role',
      error: error.message,
    });
  }
};

/**
 * @desc   Update role & permissions
 * @route  PUT /api/roles/:id
 * @access Private (Admin)
 */
export const updateRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }

    const { roleName, description, permissions, isActive } = req.body;

    if (roleName) role.roleName = roleName.trim();
    if (description !== undefined) role.description = description.trim();
    if (permissions !== undefined) role.permissions = permissions;
    if (isActive !== undefined) role.isActive = isActive;

    role.updatedBy = req.user?.id;
    await role.save();

    const updatedRole = await Role.findById(role._id).populate('permissions');

    return res.status(200).json({
      success: true,
      message: 'Role updated successfully',
      data: updatedRole,
    });
  } catch (error) {
    console.error('updateRole error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update role',
      error: error.message,
    });
  }
};

/**
 * @desc   Delete custom role
 * @route  DELETE /api/roles/:id
 * @access Private (Admin)
 */
export const deleteRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }

    if (role.isSystemRole || role.roleCode === 'super_admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete built-in system role',
      });
    }

    const usersWithRole = await User.countDocuments({ roleId: role._id });
    if (usersWithRole > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete role. There are currently ${usersWithRole} active user(s) assigned to this role. Reassign them first.`,
      });
    }

    await Role.findByIdAndDelete(role._id);

    return res.status(200).json({
      success: true,
      message: 'Role deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete role',
      error: error.message,
    });
  }
};

/**
 * @desc   Get all permissions grouped by module
 * @route  GET /api/roles/permissions
 * @access Private
 */
export const getAllPermissions = async (req, res) => {
  try {
    const permissions = await Permission.find({ isActive: true }).sort({ module: 1, permissionName: 1 });

    const grouped = permissions.reduce((acc, perm) => {
      acc[perm.module] = acc[perm.module] || [];
      acc[perm.module].push(perm);
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      data: permissions,
      grouped,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch permissions',
      error: error.message,
    });
  }
};

/**
 * @desc   Get all branches for assignment
 * @route  GET /api/roles/branches
 * @access Private
 */
export const getBranches = async (req, res) => {
  try {
    const branches = await Branch.find({ isActive: true }).sort({ isHeadOffice: -1, branchName: 1 });
    return res.status(200).json({
      success: true,
      data: branches,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch branches',
      error: error.message,
    });
  }
};
