import mongoose from 'mongoose';

const StoreSchema = new mongoose.Schema(
  {
    storeCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    storeName: {
      type: String,
      required: true,
      trim: true,
    },

    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },

    location: {
      type: String,
      trim: true,
    },

    storeManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
  {
    timestamps: true,
  }
);

export const Store = mongoose.models.Store || mongoose.model("Store", StoreSchema);
export default Store;
