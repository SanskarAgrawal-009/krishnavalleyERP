import mongoose from 'mongoose';

const FlatSchema = new mongoose.Schema(
  {
    flatNumber: {
      type: String,
      required: true,
      trim: true,
    },

    buildingId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },

    floor: {
      type: Number,
      default: 1,
      required: true,
      index: true,
    },

    bhkType: {
      type: String,
      default: "2BHK",
      trim: true,
    },

    carpetArea: {
      type: Number,
      default: 950,
    },

    basePrice: {
      type: Number,
      default: 4500000,
    },

    facing: {
      type: String,
      default: "East",
      trim: true,
    },

    status: {
      type: String,
      enum: [
        "available",
        "hold",
        "sold",
        "leased",
      ],
      default: "available",
      index: true,
    },

    buybackCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    takenForRental: {
      type: Boolean,
      default: false,
    },

    // =====================================================
    // BLUEPRINTS & ARCHITECTURAL FLOORPLANS (SAVED IN S3)
    // =====================================================
    blueprints: [
      {
        title: {
          type: String,
          required: true,
        },
        fileUrl: {
          type: String,
          required: true,
        },
        fileName: String,
        fileType: String,
        floorPlanType: {
          type: String,
          enum: ["2d_layout", "3d_render", "structural", "electrical", "plumbing", "other"],
          default: "2d_layout",
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      }
    ],
  },

  {
    timestamps: true,
  }
);

export const Flat = mongoose.models.Flat || mongoose.model("Flat", FlatSchema);
export default Flat;
