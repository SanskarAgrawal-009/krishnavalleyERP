import AuditLog from '../models/AuditLog.js';
import { escapeRegex } from '../utils/regexUtil.js';

/**
 * @desc   Get Filtered Audit Logs (Activity, Deleted, Updated, Logins, Errors)
 * @route  GET /api/audit-logs
 * @access Private (Admin / Super Admin / Auditor)
 */
export const getAuditLogs = async (req, res) => {
  try {
    const {
      tab = 'activity', // 'activity' | 'deleted' | 'updated' | 'logins' | 'errors'
      module,
      action,
      search,
      userId,
      startDate,
      endDate,
      page = 1,
      limit = 30,
    } = req.query;

    const query = {};

    // 1. Tab-specific filtering matching the 5 sub-sections
    if (tab === 'deleted') {
      query.$or = [
        { 'deletionDetails.isDeletedRecord': true },
        { action: 'DELETE' },
      ];
    } else if (tab === 'updated') {
      query.action = 'UPDATE';
    } else if (tab === 'logins') {
      query.$or = [
        { eventType: 'LOGIN' },
        { action: { $in: ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT'] } },
      ];
    } else if (tab === 'errors') {
      query.$or = [
        { eventType: 'ERROR' },
        { status: 'FAILURE' },
        { statusCode: { $gte: 400 } },
      ];
    } else {
      // 'activity' tab: show all CRUD and system activities
      // query is unrestricted unless filters applied
    }

    // 2. Module Filter
    if (module && module !== 'all') {
      query.module = module;
    }

    // 3. Action Filter
    if (action && action !== 'all') {
      query.action = action;
    }

    // 4. User Filter
    if (userId) {
      query['performedBy.userId'] = userId;
    }

    // 5. Date Range Filter
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    // 6. Search Term
    if (search && search.trim()) {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      query.$or = [
        { summary: searchRegex },
        { resourceName: searchRegex },
        { 'performedBy.username': searchRegex },
        { 'performedBy.name': searchRegex },
        { ipAddress: searchRegex },
      ];
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Math.min(100, Number(limit) || 30));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum),
      AuditLog.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data: logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    console.error('getAuditLogs error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc   Get KPI Statistics for Audit Dashboard
 * @route  GET /api/audit-logs/stats
 * @access Private (Admin)
 */
export const getAuditStats = async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalActivitiesToday,
      totalDeletedRecords,
      totalUpdatedRecords,
      loginSuccessToday,
      loginFailedToday,
      totalErrorsToday,
      moduleBreakdown,
    ] = await Promise.all([
      AuditLog.countDocuments({ timestamp: { $gte: todayStart } }),
      AuditLog.countDocuments({
        $or: [{ 'deletionDetails.isDeletedRecord': true }, { action: 'DELETE' }],
      }),
      AuditLog.countDocuments({ action: 'UPDATE' }),
      AuditLog.countDocuments({ action: 'LOGIN_SUCCESS', timestamp: { $gte: todayStart } }),
      AuditLog.countDocuments({ action: 'LOGIN_FAILED', timestamp: { $gte: todayStart } }),
      AuditLog.countDocuments({
        $or: [{ eventType: 'ERROR' }, { status: 'FAILURE' }, { statusCode: { $gte: 400 } }],
        timestamp: { $gte: todayStart },
      }),
      AuditLog.aggregate([
        { $group: { _id: '$module', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
    ]);

    return res.json({
      success: true,
      data: {
        totalActivitiesToday,
        totalDeletedRecords,
        totalUpdatedRecords,
        loginSuccessToday,
        loginFailedToday,
        totalErrorsToday,
        moduleBreakdown,
      },
    });
  } catch (error) {
    console.error('getAuditStats error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc   Get Single Audit Record with Full Inspection Snapshot
 * @route  GET /api/audit-logs/:id
 * @access Private (Admin)
 */
export const getAuditLogById = async (req, res) => {
  try {
    const log = await AuditLog.findById(req.params.id);
    if (!log) {
      return res.status(404).json({ success: false, message: 'Audit record not found' });
    }

    return res.json({
      success: true,
      data: log,
    });
  } catch (error) {
    console.error('getAuditLogById error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc   Export Audit Trail to CSV or JSON
 * @route  GET /api/audit-logs/export
 * @access Private (Admin / Super Admin)
 */
export const exportAuditLogs = async (req, res) => {
  try {
    const { format = 'csv', tab = 'all' } = req.query;
    const query = {};
    if (tab === 'deleted') query.action = 'DELETE';
    else if (tab === 'updated') query.action = 'UPDATE';
    else if (tab === 'logins') query.eventType = 'LOGIN';
    else if (tab === 'errors') query.status = 'FAILURE';

    const logs = await AuditLog.find(query).sort({ timestamp: -1 }).limit(1000);

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="krishna_valley_audit_export_${Date.now()}.json"`);
      return res.send(JSON.stringify(logs, null, 2));
    }

    // CSV format
    let csv = 'Timestamp,Action,Module,Resource Name,Performed By,Role,IP Address,Status,Summary\n';
    logs.forEach((l) => {
      const row = [
        `"${new Date(l.timestamp).toISOString()}"`,
        `"${l.action}"`,
        `"${l.module}"`,
        `"${(l.resourceName || '').replace(/"/g, '""')}"`,
        `"${(l.performedBy?.name || l.performedBy?.username || '').replace(/"/g, '""')}"`,
        `"${l.performedBy?.role || ''}"`,
        `"${l.ipAddress || ''}"`,
        `"${l.status}"`,
        `"${(l.summary || '').replace(/"/g, '""')}"`,
      ].join(',');
      csv += row + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="krishna_valley_audit_trail_${Date.now()}.csv"`);
    return res.send(csv);
  } catch (error) {
    console.error('exportAuditLogs error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
