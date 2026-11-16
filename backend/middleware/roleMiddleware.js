import { recordAuditEvent } from './auditMiddleware.js';

/**
 * Helper to safely extract and normalize string role code
 */
export const normalizeRoleCode = (role) => {
  if (!role) return '';
  if (typeof role === 'string') return role.toLowerCase().trim();
  if (typeof role === 'object') {
    return (role.roleCode || role.code || role.roleName || role.name || '').toLowerCase().trim();
  }
  return String(role).toLowerCase().trim();
};

/**
 * Super administrators have unrestricted access across the entire ERP platform
 */
export const isSuperAdminRole = (role) => {
  const code = normalizeRoleCode(role);
  return ['super_admin', 'superadmin', 'admin', 'director', 'system_admin'].includes(code);
};

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

    const userRole = normalizeRoleCode(req.user.role);
    const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase().trim());

    // Super admin always has unrestricted access
    if (isSuperAdminRole(userRole) || normalizedAllowed.includes(userRole)) {
      return next();
    }

    // Security Audit Log: Record denied access attempt
    try {
      recordAuditEvent({
        eventType: 'SECURITY',
        action: 'ACCESS_DENIED',
        module: 'security',
        resourceType: 'API_ENDPOINT',
        resourceName: req.originalUrl || req.url,
        req,
        status: 'FAILURE',
        summary: `Unauthorized role attempt for ${req.method} ${req.originalUrl || req.url}. Required roles: [${allowedRoles.join(', ')}]`,
        errorDetails: {
          allowedRoles,
          userRole,
        },
      }).catch(() => {});
    } catch (_) {}

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

    const userRole = normalizeRoleCode(req.user.role);

    // Super admin and admin bypass all operational restrictions
    if (isSuperAdminRole(userRole)) {
      return next();
    }

    // Taskforce Manager role has full operational access to all taskforce and operational report operations
    const isTaskforceOp = requiredPermissions.some(
      (perm) =>
        perm.startsWith('tasks:') ||
        perm.startsWith('reports:') ||
        perm === 'users:view' ||
        perm === 'roles:view'
    );
    if ((userRole === 'taskforce_manager' || userRole === 'taskforce_mgr') && isTaskforceOp) {
      return next();
    }

    // Extract user permission string codes safely
    const rawPerms = Array.isArray(req.user.permissions) ? req.user.permissions : [];
    const userPermCodes = new Set(
      rawPerms
        .map((p) => (typeof p === 'string' ? p : (p?.permissionCode || p?.code)))
        .filter(Boolean)
    );

    // Any *:manage permission automatically satisfies *:view for that module
    for (const code of userPermCodes) {
      if (code.endsWith(':manage')) {
        const mod = code.split(':')[0];
        userPermCodes.add(`${mod}:view`);
      }
    }

    const hasPerm = requiredPermissions.some((perm) => userPermCodes.has(perm));

    if (hasPerm) {
      return next();
    }

    // Security Audit Log: Record denied access attempt
    try {
      recordAuditEvent({
        eventType: 'SECURITY',
        action: 'ACCESS_DENIED',
        module: requiredPermissions[0]?.split(':')[0] || 'security',
        resourceType: 'API_ENDPOINT',
        resourceName: req.originalUrl || req.url,
        req,
        status: 'FAILURE',
        summary: `Unauthorized access attempt for ${req.method} ${req.originalUrl || req.url}. Required permissions: [${requiredPermissions.join(', ')}]`,
        errorDetails: {
          requiredPermissions,
          userRole,
        },
      }).catch(() => {});
    } catch (_) {}

    return res.status(403).json({
      success: false,
      message: `Forbidden: You do not possess the required permission [${requiredPermissions.join(', ')}] for this action`,
    });
  };
};

export default { authorizeRoles, authorizePermission, isSuperAdminRole, normalizeRoleCode };
