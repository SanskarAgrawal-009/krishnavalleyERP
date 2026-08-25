/**
 * Middleware to restrict route access to specific role codes
 * e.g. authorizeRoles('super_admin', 'project_manager')
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User not authenticated',
      });
    }

    const userRole = (req.user.role || '').toLowerCase();
    const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase());

    // Super admin always has unrestricted access
    if (userRole === 'super_admin' || userRole === 'admin' || normalizedAllowed.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Forbidden: Access restricted to roles: [${allowedRoles.join(', ')}]`,
    });
  };
};

/**
 * Middleware to restrict route access based on specific permission codes
 * e.g. authorizePermission('sales:create', 'sales:approve')
 */
export const authorizePermission = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User not authenticated',
      });
    }

    const userRole = (req.user.role || '').toLowerCase();
    // Super admin bypass
    if (userRole === 'super_admin' || userRole === 'admin') {
      return next();
    }

    const userPerms = req.user.permissions || [];
    const hasPerm = requiredPermissions.some((perm) => userPerms.includes(perm));

    if (hasPerm) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Forbidden: You do not possess the required permission [${requiredPermissions.join(', ')}] for this action`,
    });
  };
};

export default { authorizeRoles, authorizePermission };
