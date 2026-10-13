import mongoose from 'mongoose';
import './User.js';
import './Project.js';
import './Flat.js';

const TaskFollowUpLogSchema = new mongoose.Schema(
  {
    loggedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    loggedAt: {
      type: Date,
      default: Date.now,
    },
    remarks: {
      type: String,
      required: true,
      trim: true,
    },
    outcome: {
      type: String,
      enum: ['on_track', 'needs_attention', 'roadblock', 'milestone_reached', 'rescheduled'],
      default: 'on_track',
    },
    previousProgress: {
      type: Number,
      default: 0,
    },
    newProgress: {
      type: Number,
      default: 0,
    },
    nextFollowUpDate: {
      type: Date,
    },
  },
  { _id: true }
);

const TaskCommentSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    isMDNote: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const TaskAuditTrailSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    details: {
      type: String,
    },
  },
  { _id: true }
);

const TaskCheckpointSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { _id: true }
);

const TaskUploadSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileUrl: {
      type: String,
      required: true,
      trim: true,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    fileType: {
      type: String,
      default: 'document',
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    uploaderName: {
      type: String,
      trim: true,
    },
    uploaderRole: {
      type: String,
      default: 'helper',
    },
    caption: {
      type: String,
      trim: true,
    },
    remarks: {
      type: String,
      trim: true,
    },
    stage: {
      type: String,
      enum: ['before', 'in_progress', 'during', 'after', 'completed', 'completion', 'milestone', 'inspection', 'proof', 'other'],
      default: 'proof',
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const TaskSchema = new mongoose.Schema(
  {
    taskCode: {
      type: String,
      unique: true,
      index: true,
      trim: true,
    },

    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: '',
    },

    // Department Allocation (KV- Departments & Administration, Taskforce Departments, & Custom Units)
    department: {
      type: String,
      trim: true,
      default: 'civil',
      index: true,
    },

    // Apartment / Flat / Property Context
    isApartmentRelated: {
      type: Boolean,
      default: false,
    },

    apartmentDetails: {
      projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
      },
      projectName: {
        type: String,
        trim: true,
      },
      tower: {
        type: String,
        trim: true,
      },
      flatId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Flat',
      },
      flatNumber: {
        type: String,
        trim: true,
      },
    },

    // MD Directive Flag for Executive Visibility
    isMDDirective: {
      type: Boolean,
      default: false,
      index: true,
    },

    priority: {
      type: String,
      enum: ['urgent', 'high', 'medium', 'low'],
      default: 'high',
      index: true,
    },

    status: {
      type: String,
      enum: ['pending', 'in_progress', 'under_review', 'completed', 'delayed', 'cancelled'],
      default: 'pending',
      index: true,
    },

    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // Roadblock / Issue Escalation
    roadblockAlert: {
      hasRoadblock: {
        type: Boolean,
        default: false,
      },
      reason: {
        type: String,
        trim: true,
      },
      reportedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      reportedAt: {
        type: Date,
      },
      isResolved: {
        type: Boolean,
        default: false,
      },
      resolvedAt: {
        type: Date,
      },
    },

    // Personnel Allocation
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    assignedTo: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
      },
    ],

    // Specific Taskforce Team Member Allocations
    assignedMembers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TaskforceMember',
        index: true,
      },
    ],

    startDate: {
      type: Date,
      default: Date.now,
    },

    dueDate: {
      type: Date,
      index: true,
    },

    completedAt: {
      type: Date,
    },

    // Follow-up Tracking
    followUpSchedule: {
      nextFollowUpDate: {
        type: Date,
        index: true,
      },
      frequency: {
        type: String,
        enum: ['once', 'daily', 'alternate_days', 'weekly', 'custom'],
        default: 'daily',
      },
      followUpCount: {
        type: Number,
        default: 0,
      },
      lastFollowUpDate: {
        type: Date,
      },
    },

    followUpLogs: [TaskFollowUpLogSchema],

    comments: [TaskCommentSchema],

    checkpoints: [TaskCheckpointSchema],

    uploads: [TaskUploadSchema],

    auditTrail: [TaskAuditTrailSchema],

    tags: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Pre-save hook: auto-assign taskCode if not present
TaskSchema.pre('save', async function () {
  if (!this.taskCode) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Task').countDocuments();
    const sequence = String(count + 1).padStart(4, '0');
    this.taskCode = `TSK-${year}-${sequence}`;
  }
});

export const Task = mongoose.model('Task', TaskSchema);
