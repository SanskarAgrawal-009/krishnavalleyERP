import jwt from 'jsonwebtoken';

/**
 * Middleware to verify JWT token and inject authenticated user into req.user
 */
export const authenticateToken = (req, res, next) => {
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
