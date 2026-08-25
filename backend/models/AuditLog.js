import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema(
  {
    // Categorization
    eventType: {
      type: String,
      enum: ['CRUD', 'LOGIN', 'ERROR', 'SYSTEM', 'SECURITY', 'BUSINESS_LOGIC', 'TRANSACTION'],
      default: 'CRUD',
      index: true,
    },

    action: {
      type: String,
      enum: [
        'CREATE',
        'READ',
        'UPDATE',
        'DELETE',
        'LOGIN_SUCCESS',
        'LOGIN_FAILED',
        'LOGOUT',
        'EXCEPTION',
        'COMMISSION_CREDIT',
        'COMMISSION_DEBIT',
        'HANDOVER',
        'BACKUP_CREATE',
        'EXPORT',
        'APPROVE',
        'REJECT',
        'SITE_VISIT_APPROVED',
        'SITE_VISIT_REJECTED',
        'SITE_VISIT_LOGGED',
        'LEAD_SUBMITTED',
      ],
      required: true,
      index: true,
    },

    module: {
      type: String,
      enum: [
        'leads',
        'agent',
        'sales',
        'inventory',
        'materials',
        'customers',
        'rentals',
        'maintenance',
        'hr',
        'documents',
        'notifications',
        'reports',
        'settings',
        'users',
        'roles',
        'auth',
        'system',
      ],
      required: true,
      index: true,
    },

    // Resource reference
    resourceType: {
      type: String,
      trim: true,
    },
    resourceId: {
      type: String,
      index: true,
    },
    resourceName: {
      type: String,
      trim: true,
    },

    // User accountability
    performedBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
      },
      username: { type: String, default: 'anonymous' },
      name: { type: String, default: 'System' },
      role: { type: String, default: 'user' },
      email: { type: String },
    },

    // Request metadata
    ipAddress: {
      type: String,
      default: '127.0.0.1',
    },
    userAgent: {
      type: String,
      default: 'ERP Web Client',
    },
    endpoint: {
      type: String,
    },
    httpMethod: {
      type: String,
    },
    statusCode: {
      type: Number,
      default: 200,
    },

    // Status and summary
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILURE', 'WARNING'],
      default: 'SUCCESS',
      index: true,
    },
    summary: {
      type: String,
      required: true,
      trim: true,
    },

    // Detailed changes for UPDATE / DELETE / CREATE
    changes: {
      previousState: { type: mongoose.Schema.Types.Mixed },
      newState: { type: mongoose.Schema.Types.Mixed },
      diff: [
        {
          field: { type: String },
          oldValue: { type: mongoose.Schema.Types.Mixed },
          newValue: { type: mongoose.Schema.Types.Mixed },
        },
      ],
    },

    // Error details if applicable
    errorDetails: {
      message: { type: String },
      stack: { type: String },
      errorCode: { type: String },
    },

    // Deleted record specifics
    deletionDetails: {
      isDeletedRecord: { type: Boolean, default: false, index: true },
      deletedItemSummary: { type: String },
      fullDeletedSnapshot: { type: mongoose.Schema.Types.Mixed },
      reason: { type: String, default: 'User initiated deletion' },
    },

    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for high performance searching
AuditLogSchema.index({ timestamp: -1, module: 1, action: 1 });
AuditLogSchema.index({ 'performedBy.userId': 1, timestamp: -1 });
AuditLogSchema.index({ 'deletionDetails.isDeletedRecord': 1, timestamp: -1 });

export const AuditLog =
  mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
export default AuditLog;
