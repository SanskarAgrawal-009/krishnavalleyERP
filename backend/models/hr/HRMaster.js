import mongoose from 'mongoose';

const HRMasterSchema = new mongoose.Schema(
  {
    // =====================================================
    // DEPARTMENTS
    // =====================================================

    departments: [
      {
        departmentCode: {
          type: String,
          required: true,
        },

        departmentName: {
          type: String,
          required: true,
          trim: true,
        },

        description: {
          type: String,
        },

        departmentHead: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Employee",
        },

        status: {
          type: String,
          enum: [
            "active",
            "inactive",
          ],
          default: "active",
        },
      },
    ],

    // =====================================================
    // ROLES
    // =====================================================

    roles: [
      {
        roleCode: {
          type: String,
          required: true,
        },

        roleName: {
          type: String,
          required: true,
          trim: true,
        },

        departmentCode: {
          type: String,
          required: true,
          index: true,
        },

        departmentName: {
          type: String,
          trim: true,
        },

        description: {
          type: String,
        },

        permissions: [
          {
            type: String,
          },
        ],

        status: {
          type: String,
          enum: [
            "active",
            "inactive",
          ],
          default: "active",
        },
      },
    ],
  },

  {
    timestamps: true,
  }
);

export const HRMaster = mongoose.models.HRMaster || mongoose.model("HRMaster", HRMasterSchema);
export default HRMaster;
