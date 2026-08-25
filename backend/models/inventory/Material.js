import mongoose from 'mongoose';

const MaterialSchema = new mongoose.Schema(
  {
    materialCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    materialName: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    subCategory: {
      type: String,
      trim: true,
    },

    description: {
      type: String,
    },

    unit: {
      type: String,
      required: true,
      enum: [
        "kg",
        "gram",
        "ton",
        "liter",
        "meter",
        "sq_meter",
        "cu_meter",
        "piece",
        "box",
        "bag",
        "bundle",
        "set",
        "other",
      ],
    },

    minimumStockLevel: {
      type: Number,
      default: 0,
    },

    reorderLevel: {
      type: Number,
      default: 0,
    },

    maximumStockLevel: {
      type: Number,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

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

export const Material = mongoose.models.Material || mongoose.model("Material", MaterialSchema);
export default Material;
