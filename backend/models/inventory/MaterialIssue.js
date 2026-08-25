import mongoose from 'mongoose';

const MaterialIssueSchema = new mongoose.Schema(
  {
    issueNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },

    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },

    issuedTo: {
      type: String,
      trim: true,
    },

    contractorName: {
      type: String,
      trim: true,
    },

    contractorContact: {
      type: String,
      trim: true,
    },

    issuedBy: {
      type: String,
      trim: true,
    },

    issueDate: {
      type: Date,
      default: Date.now,
    },

    purpose: {
      type: String,
      trim: true,
    },

    items: [
      {
        materialId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Material",
          required: true,
        },

        quantity: {
          type: Number,
          required: true,
          min: 0,
        },

        unitRate: {
          type: Number,
          default: 0,
        },

        totalValue: {
          type: Number,
          default: 0,
        },
      },
    ],

    status: {
      type: String,
      enum: [
        "draft",
        "pending_approval",
        "approved",
        "issued",
        "cancelled",
      ],
      default: "draft",
    },

    remarks: String,

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

export const MaterialIssue = mongoose.models.MaterialIssue || mongoose.model("MaterialIssue", MaterialIssueSchema);
export default MaterialIssue;
