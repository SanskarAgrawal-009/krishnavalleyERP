import mongoose from 'mongoose';
import './User.js';
import './Project.js';
import './Task.js';

const AttendeeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      default: 'member',
      trim: true,
    },
    department: {
      type: String,
      default: 'general',
      trim: true,
    },
    email: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    attendanceStatus: {
      type: String,
      enum: ['invited', 'confirmed', 'present', 'absent', 'excused'],
      default: 'invited',
    },
  },
  { _id: true }
);

const ActionItemSchema = new mongoose.Schema(
  {
    actionItemCode: {
      type: String,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    assignedToName: {
      type: String,
      trim: true,
    },
    department: {
      type: String,
      default: 'civil',
      trim: true,
    },
    dueDate: {
      type: Date,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'converted_to_task', 'completed', 'dropped'],
      default: 'pending',
    },
    linkedTaskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
    },
    linkedTaskCode: {
      type: String,
      trim: true,
    },
  },
  { _id: true, timestamps: true }
);

const MoMAttachmentSchema = new mongoose.Schema(
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
    fileType: {
      type: String,
      default: 'document',
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const MoMSchema = new mongoose.Schema(
  {
    momStatus: {
      type: String,
      enum: ['pending', 'draft', 'published', 'approved'],
      default: 'pending',
      index: true,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    recordedByName: {
      type: String,
      trim: true,
    },
    discussionSummary: {
      type: String,
      default: '',
      trim: true,
    },
    keyDecisions: [
      {
        type: String,
        trim: true,
      },
    ],
    generalNotes: {
      type: String,
      default: '',
      trim: true,
    },
    actionItems: [ActionItemSchema],
    attachments: [MoMAttachmentSchema],
    publishedAt: {
      type: Date,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedByName: {
      type: String,
      trim: true,
    },
    approvedAt: {
      type: Date,
    },
    approvalRemarks: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const TaskforceMeetingSchema = new mongoose.Schema(
  {
    meetingCode: {
      type: String,
      unique: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Meeting title is required'],
      trim: true,
    },
    agenda: {
      type: String,
      default: '',
      trim: true,
    },
    meetingType: {
      type: String,
      enum: [
        'executive_review',    // MD Directives / Executive Review
        'department_sync',      // Department Alignment
        'site_progress',        // Site Progress & Operations
        'emergency_huddle',     // Urgent Roadblock Resolution
        'vendor_alignment',     // Contractor / Material Vendor Coordination
        'general'               // General Taskforce Sync
      ],
      default: 'site_progress',
      index: true,
    },
    department: {
      type: String,
      default: 'all',
      trim: true,
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      index: true,
    },
    scheduledDate: {
      type: Date,
      required: [true, 'Meeting date is required'],
      index: true,
    },
    startTime: {
      type: String,
      required: [true, 'Meeting start time is required'],
      trim: true,
    },
    endTime: {
      type: String,
      trim: true,
    },
    durationMinutes: {
      type: Number,
      default: 45,
    },
    locationType: {
      type: String,
      enum: ['site_office', 'in_person', 'virtual', 'hybrid'],
      default: 'site_office',
    },
    locationDetails: {
      type: String,
      default: 'Krishna Valley Site Operations Room',
      trim: true,
    },
    meetingLink: {
      type: String,
      trim: true,
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    organizerName: {
      type: String,
      trim: true,
    },
    attendees: [AttendeeSchema],
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled'],
      default: 'scheduled',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    mom: {
      type: MoMSchema,
      default: () => ({ momStatus: 'pending', keyDecisions: [], actionItems: [], attachments: [] }),
    },
    auditTrail: [
      {
        action: { type: String, required: true },
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        performedByName: { type: String },
        timestamp: { type: Date, default: Date.now },
        notes: { type: String },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Auto-generate meeting code before saving
TaskforceMeetingSchema.pre('save', async function (next) {
  if (!this.meetingCode) {
    const d = this.scheduledDate ? new Date(this.scheduledDate) : new Date();
    const yy = d.getFullYear().toString().slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const count = await mongoose.model('TaskforceMeeting').countDocuments();
    const seq = String(count + 1).padStart(3, '0');
    this.meetingCode = `MTG-${yy}${mm}-${seq || randomSuffix}`;
  }
  next();
});

export const TaskforceMeeting = mongoose.model('TaskforceMeeting', TaskforceMeetingSchema);
export default TaskforceMeeting;
