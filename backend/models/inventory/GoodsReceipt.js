import mongoose from 'mongoose';

const GoodsReceiptSchema = new mongoose.Schema(
  {
    grnNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    poId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      required: true,
      index: true,
    },

    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },

    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },

    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },

    receiptDate: {
      type: Date,
      default: Date.now,
    },

    invoiceNumber: String,

    invoiceDate: Date,

    items: [
      {
        materialId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Material",
          required: true,
        },

        orderedQuantity: {
          type: Number,
          default: 0,
        },

        receivedQuantity: {
          type: Number,
          required: true,
        },

        rejectedQuantity: {
          type: Number,
          default: 0,
        },

        unitRate: {
          type: Number,
          default: 0,
        },

        condition: {
          type: String,
          enum: [
            "good",
            "damaged",
            "rejected",
          ],
          default: "good",
        },

        remarks: String,
      },
    ],

    inspectionStatus: {
      type: String,
      enum: [
        "pending",
        "passed",
        "partially_passed",
        "failed",
      ],
      default: "pending",
    },

    status: {
      type: String,
      enum: [
        "draft",
        "received",
        "verified",
        "rejected",
      ],
      default: "draft",
    },

    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

export const GoodsReceipt = mongoose.models.GoodsReceipt || mongoose.model("GoodsReceipt", GoodsReceiptSchema);
export default GoodsReceipt;
