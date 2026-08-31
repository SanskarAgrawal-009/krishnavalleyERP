import jwt from 'jsonwebtoken';

/**
 * Middleware to verify JWT token and inject authenticated user into req.user
 */
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

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

    // Real-time permission sync: Ensure any newly assigned permissions to the role take effect immediately
    // without requiring the user to clear browser storage or manually re-login.
    try {
      const { Role } = await import('../models/Role.js');
      await import('../models/Permission.js');
      if (decoded.roleId || decoded.role) {
        const query = decoded.roleId ? { _id: decoded.roleId } : { roleCode: decoded.role };
        const roleDoc = await Role.findOne(query).populate('permissions');
        if (roleDoc && roleDoc.permissions) {
          const liveCodes = roleDoc.permissions.map((p) => p.permissionCode);
          req.user.permissions = liveCodes;
          req.user.role = roleDoc.roleCode;
        }
      }
    } catch (_) {
      // If DB lookup fails for any reason, fallback gracefully to token permissions
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
