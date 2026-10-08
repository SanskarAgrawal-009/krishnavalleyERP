import mongoose from 'mongoose';

const TaskforceMemberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      default: null,
    },

    name: {
      type: String,
      required: [true, 'Member name is required'],
      trim: true,
    },

    mobileNo: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    // Hierarchy Level: Helper -> Supervisor -> Head
    hierarchyLevel: {
      type: String,
      enum: ['helper', 'supervisor', 'head'],
      default: 'helper',
      required: true,
      index: true,
    },

    // Reporting Chain
    supervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskforceMember',
      default: null,
    },

    headId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskforceMember',
      default: null,
    },

    trade: {
      type: String,
      trim: true,
      default: 'General Operations', // e.g. Civil, Electrical, Plumbing, Snagging, Painting, Housekeeping
    },

    status: {
      type: String,
      enum: ['active', 'inactive', 'on_leave'],
      default: 'active',
      index: true,
    },

    notes: {
      type: String,
      trim: true,
    },

    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Virtual index for fast hierarchy lookup
TaskforceMemberSchema.index({ hierarchyLevel: 1, supervisorId: 1, headId: 1 });

export const TaskforceMember =
  mongoose.models.TaskforceMember || mongoose.model('TaskforceMember', TaskforceMemberSchema);
export default TaskforceMember;
