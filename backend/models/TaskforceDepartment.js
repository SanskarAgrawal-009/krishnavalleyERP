import mongoose from 'mongoose';

const TaskforceDepartmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Department name is required'],
      unique: true,
      trim: true,
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    color: {
      type: String,
      default: '#2563eb',
    },
    headMemberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskforceMember',
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
      index: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Fast index on name & status
TaskforceDepartmentSchema.index({ name: 1, status: 1 });

export const TaskforceDepartment =
  mongoose.models.TaskforceDepartment || mongoose.model('TaskforceDepartment', TaskforceDepartmentSchema);
export default TaskforceDepartment;
