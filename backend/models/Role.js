import mongoose from 'mongoose';

const RoleSchema = new mongoose.Schema(
  {
    // ==========================================
    // ROLE INFORMATION
    // ==========================================

    roleName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    roleCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    description: {
      type: String,
      trim: true,
    },

    // ==========================================
    // PERMISSIONS
    // ==========================================

    permissions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Permission",
      },
    ],

    // ==========================================
    // USERS HAVING THIS ROLE
    // ==========================================

    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // ==========================================
    // ROLE STATUS
    // ==========================================

    isActive: {
      type: Boolean,
      default: true,
    },

    isSystemRole: {
      type: Boolean,
      default: false,
    },

    // ==========================================
    // AUDIT
    // ==========================================

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },

  {
    timestamps: true,
  }
);

export const Role = mongoose.models.Role || mongoose.model("Role", RoleSchema);
export const AccessControl = mongoose.models.AccessControl || mongoose.model("AccessControl", RoleSchema);

export default Role;
