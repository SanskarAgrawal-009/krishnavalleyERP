import jwt from 'jsonwebtoken';
import { Role } from '../models/Role.js';
import { Permission } from '../models/Permission.js';
import { User } from '../models/User.js';

/**
 * Middleware to verify JWT token and inject authenticated user into req.user
 */
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.split(' ')[1]) || req.query.token;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied: Authentication token required',
    });
  }

  try {
    const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_change_in_production';
    const decoded = jwt.verify(token, secret);
    req.user = decoded; // Contains id, username, email, role, roleId, permissions, primaryBranchId

    // Real-time security sync: Verify account status & sync permissions + user overrides immediately
    try {
      const userId = decoded.id || decoded._id;
      if (userId) {
        const userDoc = await User.findById(userId).select('status roleId permissionOverrides isTaskforceMember department');
        if (userDoc) {
          if (userDoc.status && userDoc.status !== 'active') {
            return res.status(403).json({
              success: false,
              message: `Your account is currently ${userDoc.status}. Please contact your administrator.`,
              isDeactivated: true,
            });
          }

          const targetRoleId = userDoc.roleId || decoded.roleId;
          const query = targetRoleId ? { _id: targetRoleId } : { roleCode: decoded.role };
          const roleDoc = await Role.findOne(query).populate('permissions');
          if (roleDoc) {
            let effectivePerms = new Set(
              (roleDoc.permissions || [])
                .map((p) => (typeof p === 'string' ? p : p?.permissionCode))
                .filter(Boolean)
            );

            // Apply per-user permission overrides (Deny always wins over allow)
            if (Array.isArray(userDoc.permissionOverrides)) {
              for (const override of userDoc.permissionOverrides) {
                if (override.grant === 'allow') {
                  effectivePerms.add(override.permissionCode);
                } else if (override.grant === 'deny') {
                  effectivePerms.delete(override.permissionCode);
                }
              }
            }

            req.user.permissions = Array.from(effectivePerms);
            req.user.role = roleDoc.roleCode;
            req.user.roleName = roleDoc.roleName;
            req.user.roleId = roleDoc._id;
            req.user.isTaskforceMember = userDoc.isTaskforceMember;
            req.user.department = userDoc.department;
          }
        }
      }
    } catch (_) {
      // If DB check encounters a temporary issue, fallback gracefully to token claims
    }

    // Ensure permissions is guaranteed to be an array of string codes
    if (Array.isArray(req.user.permissions)) {
      req.user.permissions = req.user.permissions
        .map((p) => (typeof p === 'string' ? p : p?.permissionCode))
        .filter(Boolean);
    } else {
      req.user.permissions = [];
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Your session has expired. Please log in again.',
        isExpired: true,
      });
    }
    return res.status(403).json({
      success: false,
      message: 'Invalid or malformed authentication token',
    });
  }
};

/**
 * Optional Auth middleware - attaches req.user if token exists without failing if absent
 */
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_change_in_production';
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
  } catch (e) {
    // Ignore invalid optional tokens
  }
  next();
};

export default authenticateToken;
