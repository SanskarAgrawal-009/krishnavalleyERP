import mongoose from 'mongoose';

const StockTransferSchema = new mongoose.Schema(
  {
    transferNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    fromStoreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },

    toStoreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },

    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },

    transferDate: {
      type: Date,
      default: Date.now,
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

        remarks: String,
      },
    ],

    status: {
      type: String,
      enum: [
        "draft",
        "pending",
        "approved",
        "in_transit",
        "received",
        "cancelled",
      ],
      default: "draft",
    },

    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    receivedAt: Date,
  },
  {
    timestamps: true,
  }
);

export const StockTransfer = mongoose.models.StockTransfer || mongoose.model("StockTransfer", StockTransferSchema);
export default StockTransfer;
