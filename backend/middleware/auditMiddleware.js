import AuditLog from '../models/AuditLog.js';

/**
 * Explicit Audit Event Logger Helper
 * Use this in controllers for precise business audits (e.g. commission debits, logins, soft-deletes)
 */
export const recordAuditEvent = async ({
  eventType = 'CRUD',
  action,
  module,
  resourceType = '',
  resourceId = '',
  resourceName = '',
  user = null,
  req = null,
  status = 'SUCCESS',
  summary = '',
  changes = null,
  errorDetails = null,
  deletionDetails = null,
}) => {
  try {
    const performedBy = {
      userId: user?._id || user?.id || req?.user?._id || req?.user?.id || null,
      username: user?.username || req?.user?.username || 'anonymous',
      name: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (req?.user?.firstName ? `${req.user.firstName} ${req.user.lastName || ''}`.trim() : 'System Action'),
      role: user?.roleCode || user?.role || req?.user?.roleCode || req?.user?.role || 'system',
      email: user?.email || req?.user?.email || '',
    };

    const ipAddress =
      req?.headers?.['x-forwarded-for'] ||
      req?.socket?.remoteAddress ||
      '127.0.0.1';

    const userAgent = req?.headers?.['user-agent'] || 'ERP Internal Client';

    const logEntry = await AuditLog.create({
      eventType,
      action,
      module,
      resourceType,
      resourceId: resourceId?.toString() || '',
      resourceName,
      performedBy,
      ipAddress: typeof ipAddress === 'string' ? ipAddress.split(',')[0].trim() : '127.0.0.1',
      userAgent,
      endpoint: req?.originalUrl || req?.url || '',
      httpMethod: req?.method || 'INTERNAL',
      statusCode: status === 'FAILURE' ? 500 : 200,
      status,
      summary: summary || `${action} operation on ${module}`,
      changes,
      errorDetails,
      deletionDetails: deletionDetails || {
        isDeletedRecord: action === 'DELETE',
        deletedItemSummary: action === 'DELETE' ? (summary || resourceName) : '',
      },
      timestamp: new Date(),
    });

    return logEntry;
  } catch (err) {
    console.error('⚠️ [AuditLog Failed to record event]:', err.message);
    return null;
  }
};

/**
 * Universal Auto-Audit Express Middleware
 * Intercepts all state-mutating requests (POST, PUT, PATCH, DELETE) and records CRUD logs
 */
export const autoAuditMiddleware = (req, res, next) => {
  // Only capture mutations and specific GET actions
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (!mutatingMethods.includes(req.method)) {
    return next();
  }

  // Skip noisy non-critical routes (like health check or static files)
  const path = req.originalUrl || req.path || '';
  if (path.includes('/api/health') || path.includes('/uploads') || path.includes('/api/audit-logs')) {
    return next();
  }

  // Determine ERP module from URL path
  let moduleName = 'system';
  if (path.includes('/api/leads')) moduleName = 'leads';
  else if (path.includes('/api/agent')) moduleName = 'agent';
  else if (path.includes('/api/sales')) moduleName = 'sales';
  else if (path.includes('/api/flats') || path.includes('/api/projects')) moduleName = 'inventory';
  else if (path.includes('/api/inventory') || path.includes('/api/materials')) moduleName = 'materials';
  else if (path.includes('/api/customers')) moduleName = 'customers';
  else if (path.includes('/api/rentals')) moduleName = 'rentals';
  else if (path.includes('/api/maintenance')) moduleName = 'maintenance';
  else if (path.includes('/api/hr')) moduleName = 'hr';
  else if (path.includes('/api/documents')) moduleName = 'documents';
  else if (path.includes('/api/notifications')) moduleName = 'notifications';
  else if (path.includes('/api/settings')) moduleName = 'settings';
  else if (path.includes('/api/users') || path.includes('/api/roles')) moduleName = 'users';
  else if (path.includes('/api/auth')) moduleName = 'auth';

  // Determine Action Type
  let actionType = 'UPDATE';
  if (req.method === 'POST') {
    if (path.includes('/login')) actionType = 'LOGIN_SUCCESS';
    else if (path.includes('/logout')) actionType = 'LOGOUT';
    else actionType = 'CREATE';
  } else if (req.method === 'DELETE') {
    actionType = 'DELETE';
  } else if (req.method === 'PUT' || req.method === 'PATCH') {
    actionType = 'UPDATE';
  }

  // Capture response payload upon completion
  const originalJson = res.json;
  res.json = function (body) {
    res.json = originalJson;

    // Process audit in background after sending response
    setImmediate(async () => {
      try {
        const isSuccess = res.statusCode >= 200 && res.statusCode < 400;
        const status = isSuccess ? 'SUCCESS' : 'FAILURE';
        
        let finalAction = actionType;
        if (actionType === 'LOGIN_SUCCESS' && !isSuccess) {
          finalAction = 'LOGIN_FAILED';
        }

        const entityData = body?.data || req.body || {};
        const entityName = entityData?.name || entityData?.title || entityData?.flatNumber || entityData?.username || entityData?.customerName || '';
        const entityMobile = entityData?.mobileNo || entityData?.phone || entityData?.customerMobile || '';
        const entityEmail = entityData?.email || '';

        const resourceId = req.params?.id || entityData?._id || body?._id || '';
        const resourceName = entityName ? `${entityName}${entityMobile ? ` (${entityMobile})` : ''}` : (resourceId || '');
        
        let summary = body?.message || `${req.method} ${path}`;
        if (finalAction === 'CREATE') {
          summary = `Created ${moduleName} record: "${entityName || 'New Entity'}"${entityMobile ? ` • Phone: ${entityMobile}` : ''}`;
        } else if (finalAction === 'UPDATE') {
          summary = `Updated ${moduleName} record: "${entityName || resourceId}"${entityMobile ? ` • Phone: ${entityMobile}` : ''}`;
        } else if (finalAction === 'DELETE') {
          summary = `Deleted ${moduleName} record: "${entityName || resourceId}"${entityMobile ? ` • Phone: ${entityMobile}` : ''}`;
        } else if (finalAction === 'LOGIN_SUCCESS') {
          summary = `User '${req.body?.identifier || req.body?.username}' logged in successfully`;
        } else if (finalAction === 'LOGIN_FAILED') {
          summary = `Failed login attempt for identifier '${req.body?.identifier || req.body?.username}'`;
        }

        // Build diff for update operations if body fields provided
        const diff = [];
        if (req.method === 'PUT' || req.method === 'PATCH') {
          const payload = { ...req.body };
          delete payload.password;
          delete payload.passwordHash;
          for (const key of Object.keys(payload)) {
            if (payload[key] !== undefined) {
              diff.push({
                field: key,
                oldValue: null,
                newValue: payload[key],
              });
            }
          }
        }

        const isDeleted = req.method === 'DELETE';

        // Check if an explicit DELETE audit was already logged for this exact resource to prevent duplicates
        if (isDeleted && resourceId) {
          const existingRecentDelete = await AuditLog.findOne({
            resourceId: resourceId.toString(),
            action: 'DELETE',
            timestamp: { $gte: new Date(Date.now() - 3000) },
          });
          if (existingRecentDelete) {
            return; // Already logged with rich controller context
          }
        }

        await recordAuditEvent({
          eventType: finalAction.startsWith('LOGIN') ? 'LOGIN' : (!isSuccess ? 'ERROR' : 'CRUD'),
          action: finalAction,
          module: moduleName,
          resourceId,
          resourceName,
          user: req.user,
          req,
          status,
          summary,
          changes: {
            newState: req.method !== 'DELETE' ? { ...req.body, password: '[REDACTED]' } : null,
            diff,
          },
          deletionDetails: isDeleted ? {
            isDeletedRecord: true,
            deletedItemSummary: `${entityName || 'Entity'} ${entityMobile ? `• ${entityMobile}` : ''} ${entityEmail ? `• ${entityEmail}` : ''} (Module: ${moduleName})`,
            fullDeletedSnapshot: entityData,
            reason: req.body?.deletionReason || 'Initiated from ERP console',
          } : null,
          errorDetails: !isSuccess ? {
            message: body?.message || 'HTTP error occurred',
            statusCode: res.statusCode,
          } : null,
        });
      } catch (logErr) {
        console.error('⚠️ [AutoAudit Middleware error]:', logErr);
      }
    });

    return originalJson.call(this, body);
  };

  next();
};
