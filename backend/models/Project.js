import mongoose from 'mongoose';

const ProjectSchema = new mongoose.Schema(
  {
    projectName: {
      type: String,
      required: true,
      trim: true,
    },

    projectCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    address: {
      addressLine1: {
        type: String,
        required: true,
      },

      addressLine2: {
        type: String,
      },

      locality: {
        type: String,
      },

      city: {
        type: String,
        required: true,
      },

      state: {
        type: String,
        required: true,
      },

      pincode: {
        type: String,
        required: true,
      },

      country: {
        type: String,
        default: "India",
      },
    },

    buildings: [
      {
        buildingName: {
          type: String,
          required: true,
          trim: true,
        },

        buildingCode: {
          type: String,
          required: true,
          trim: true,
        },

        numberOfFloors: {
          type: Number,
          required: true,
          default: 1,
        },

        flatsPerFloor: {
          type: Number,
          default: 4,
        },

        totalFlats: {
          type: Number,
          default: 4,
        },

        floors: [
          {
            floorNumber: {
              type: Number,
              required: true,
            },
            numberOfFlats: {
              type: Number,
              default: 4,
            },
            flats: [
              {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Flat",
              },
            ],
          },
        ],

        flats: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Flat",
          },
        ],

        status: {
          type: String,
          enum: [
            "planned",
            "under_construction",
            "completed",
            "on_hold",
          ],
          default: "planned",
        },
      },
    ],

    status: {
      type: String,
      enum: [
        "planning",
        "under_construction",
        "completed",
        "on_hold",
        "cancelled",
      ],
      default: "planning",
    },
  },

  {
    timestamps: true,
  }
);

export const Project = mongoose.models.Project || mongoose.model("Project", ProjectSchema);
export default Project;
