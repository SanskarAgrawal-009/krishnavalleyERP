import mongoose from 'mongoose';

const ServiceRequestSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true
    },
    buildingId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      index: true
    },
    flatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Flat',
      required: true,
      index: true
    },
    requesterType: {
      type: String,
      enum: ['owner', 'tenant'],
      required: true,
      default: 'owner'
    },
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true
    },
    category: {
      type: String,
      enum: [
        'plumbing',
        'electrical',
        'carpentry',
        'painting',
        'civil_work',
        'hvac_ac',
        'cleaning',
        'pest_control',
        'security',
        'other'
      ],
      required: true,
      default: 'plumbing'
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    status: {
      type: String,
      enum: ['open', 'assigned', 'in_progress', 'resolved', 'closed', 'cancelled'],
      default: 'open',
      index: true
    },
    assignedTechnician: {
      name: String,
      phone: String,
      agency: String
    },
    estimatedCost: {
      type: Number,
      default: 0
    },
    finalCost: {
      type: Number,
      default: 0
    },
    billedTo: {
      type: String,
      enum: ['owner', 'tenant', 'society_fund', 'free_warranty'],
      default: 'free_warranty'
    },
    photos: [
      {
        fileUrl: String,
        fileName: String,
        uploadedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    resolutionNotes: String,
    resolvedAt: Date
  },
  { timestamps: true }
);

export const ServiceRequest = mongoose.models.ServiceRequest || mongoose.model('ServiceRequest', ServiceRequestSchema);
export default ServiceRequest;
