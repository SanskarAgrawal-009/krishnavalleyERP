import mongoose from 'mongoose';

const StockSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },

    materialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Material",
      required: true,
      index: true,
    },

    quantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    reservedQuantity: {
      type: Number,
      default: 0,
    },

    availableQuantity: {
      type: Number,
      default: 0,
    },

    averageRate: {
      type: Number,
      default: 0,
    },

    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

StockSchema.index(
  { storeId: 1, materialId: 1 },
  { unique: true }
);

export const Stock = mongoose.models.Stock || mongoose.model("Stock", StockSchema);
export default Stock;
