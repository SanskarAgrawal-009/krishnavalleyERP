import mongoose from 'mongoose';

const SiteVisitSchema = new mongoose.Schema(
  {
    visitCode: {
      type: String,
      unique: true,
      trim: true,
      index: true,
    },

    // Agent Details
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    agentCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    agentName: {
      type: String,
      required: true,
      trim: true,
    },
    agencyName: {
      type: String,
      trim: true,
    },
    agentPhone: {
      type: String,
      trim: true,
    },

    // Customer / Party Details
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      index: true,
    },
    partyName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    partyMobile: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    partyEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },

    // Property Visit Information
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    buildingId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    flatIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Flat',
      },
    ],

    visitDate: {
      type: Date,
      default: Date.now,
    },
    visitNotes: {
      type: String,
      trim: true,
    },

    // Verification & Proofs
    partySelfieUrl: {
      type: String, // Photo / Selfie with party at project site
      trim: true,
    },
    locationCoordinates: {
      latitude: Number,
      longitude: Number,
    },

    // Maker-Checker Site Visit Approval
    verificationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    verificationNotes: {
      type: String,
      trim: true,
    },

    // Booking & Automated Commission Status
    bookingStatus: {
      type: String,
      enum: ['not_booked', 'booked'],
      default: 'not_booked',
      index: true,
    },
    salesLeadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalesLead',
    },
    bookedFlatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Flat',
    },
    bookedAt: {
      type: Date,
    },

    commissionStatus: {
      type: String,
      enum: ['pending', 'credited', 'debited', 'not_applicable'],
      default: 'pending',
      index: true,
    },
    commissionAmount: {
      type: Number,
      default: 0,
    },
    commissionLedgerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommissionLedger',
    },

    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to generate sequential Visit Code
SiteVisitSchema.pre('save', async function () {
  if (!this.visitCode) {
    const count = await mongoose.models.SiteVisit.countDocuments();
    const suffix = String(count + 1).padStart(4, '0');
    this.visitCode = `SV-${suffix}`;
  }
});

export const SiteVisit =
  mongoose.models.SiteVisit || mongoose.model('SiteVisit', SiteVisitSchema);
export default SiteVisit;
