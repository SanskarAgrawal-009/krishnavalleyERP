import mongoose from 'mongoose';

const PermissionSchema = new mongoose.Schema(
  {
    permissionName: {
      type: String,
      required: true,
      trim: true,
    },
    permissionCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    module: {
      type: String,
      required: true,
      enum: [
        'Dashboard',
        'Inventory',
        'Materials',
        'CRM',
        'Sales',
        'Customers',
        'Rentals',
        'Maintenance',
        'HR',
        'Documents',
        'Notifications',
        'Reports',
        'AccessControl',
        'Settings',
      ],
      index: true,
    },
    action: {
      type: String,
      enum: ['view', 'create', 'edit', 'delete', 'manage', 'export', 'approve'],
      default: 'view',
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Permission = mongoose.models.Permission || mongoose.model('Permission', PermissionSchema);
export default Permission;
