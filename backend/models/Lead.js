import mongoose from 'mongoose';
import { arePhoneNumbersSame } from '../utils/phoneValidator.js';

const LeadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    mobileNo: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    alternateMobileNo: {
      type: String,
      trim: true,
      validate: {
        validator: function (val) {
          if (!val) return true;
          return !arePhoneNumbersSame(this.mobileNo, val);
        },
        message: 'Primary mobile number and alternate mobile number cannot be the same.'
      }
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },

    budget: {
      type: Number,
      default: 0,
    },

    requirement: {
      type: String,
      trim: true,
      default: '2BHK Apartment',
    },

    city: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },

    state: {
      type: String,
      trim: true,
      default: '',
    },

    country: {
      type: String,
      trim: true,
      default: 'India',
    },

    address: {
      type: String,
      trim: true,
      default: '',
    },

    pincode: {
      type: String,
      trim: true,
      default: '',
    },

    leadSource: {
      type: String,
      enum: [
        'agent',
        'direct',
        'website',
        'meta_ads',
        'facebook',
        'instagram',
        'referral',
        'campaign',
        'walk_in',
      ],
      default: 'agent',
      index: true,
    },

    // Meta Ads (Facebook & Instagram) details
    metaAdDetails: {
      leadgenId: { type: String, index: true },
      formId: String,
      formName: String,
      pageId: String,
      campaignId: String,
      campaignName: String,
      adSetId: String,
      adSetName: String,
      adId: String,
      adName: String,
      platform: { type: String, default: 'meta' }, // 'fb' | 'ig' | 'meta'
      createdTime: Date,
    },

    // Any other data / questions asked on the Meta Instant Form (shown in dedicated box)
    metaCustomQuestions: [
      {
        fieldKey: String,
        question: String,
        answer: String,
      }
    ],

    rawMetaPayload: {
      type: mongoose.Schema.Types.Mixed,
    },

    status: {
      type: String,
      enum: [
        'new',
        'contacted',
        'in_discussion',
        'followup_scheduled',
        'site_visit_scheduled',
        'site_visit_completed_pending_approval',
        'site_visit_completed',
        'site_visit_rejected',
        'matured',
        'negotiation',
        'booked',
        'converted',
        'lost',
      ],
      default: 'new',
      index: true,
    },

    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },

    assignedAt: {
      type: Date,
      index: true,
    },

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    assignmentHistory: [
      {
        assignedTo: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        assignedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        assignedAt: {
          type: Date,
          default: Date.now,
        },
        reason: {
          type: String,
          trim: true,
        },
      },
    ],

    assignedFlat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Flat',
      index: true,
    },

    siteVisitDetails: {
      scheduledDate: {
        type: Date,
      },
      completedDate: {
        type: Date,
      },
      handoverDate: {
        type: Date, // Date when 5-day agent exclusivity expires (completedDate + 5 days)
        index: true,
      },
      isHandedOver: {
        type: Boolean,
        default: false,
        index: true,
      },
      maturityPeriodDays: {
        type: Number,
        default: 5, // 5 days maturity limit
      },
      visitedBy: {
        type: String,
        trim: true,
      },
      feedback: {
        type: String,
        trim: true,
      },
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },

    commission: {
      commissionType: {
        type: String,
        enum: ['percentage', 'flat'],
      },
      commissionRate: {
        type: Number,
      },
      amount: {
        type: Number,
        default: 0,
      },
      status: {
        type: String,
        enum: [
          'pending',
          'credited',
          'debited',
          'reverted',
          'finalized',
          'paid',
          'cancelled',
        ],
        default: 'pending',
      },
      creditedAt: {
        type: Date,
      },
      debitedAt: {
        type: Date,
      },
      ledgerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CommissionLedger',
      },
      debitLedgerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CommissionLedger',
      },
      notes: {
        type: String,
        trim: true,
      },
    },

    followUps: [
      {
        date: {
          type: Date,
          default: Date.now,
        },

        mode: {
          type: String,
          enum: [
            'call',
            'whatsapp',
            'email',
            'meeting',
            'site_visit',
            'other',
          ],
          default: 'call',
        },

        notes: {
          type: String,
          trim: true,
        },

        nextFollowUpDate: {
          type: Date,
        },

        status: {
          type: String,
          enum: [
            'pending',
            'completed',
            'rescheduled',
            'cancelled',
          ],
          default: 'pending',
        },

        scheduledBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },

        assignedTo: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },

        // Team Member feedback / call resolution remarks
        feedback: {
          type: String,
          trim: true,
        },

        completedAt: {
          type: Date,
        },

        completedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },

        rescheduledTo: {
          type: Date,
        },

        reminderStatus: {
          teamNotified: { type: Boolean, default: false },
          teamNotifiedAt: Date,
          teamChannels: [String],
          clientNotified: { type: Boolean, default: false },
          clientNotifiedAt: Date,
          clientChannels: [String],
          snoozedUntil: Date,
        },

        googleCalendar: {
          eventId: { type: String, default: null },
          htmlLink: { type: String, default: null },
          syncedAt: { type: Date, default: null },
          syncStatus: {
            type: String,
            enum: ['synced', 'pending', 'failed', 'none'],
            default: 'none',
          },
          syncError: { type: String, default: null },
        },
      },
    ],

    // Log of External / Direct Lead Site Visits
    externalSiteVisits: [
      {
        visitorName: { type: String, trim: true },
        visitorPhone: { type: String, trim: true },
        visitorEmail: { type: String, trim: true },
        visitDate: { type: Date, default: Date.now },
        assignedFlat: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Flat',
        },
        flatLabel: { type: String, trim: true },
        accompaniedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        accompaniedByName: { type: String, trim: true },
        numberOfPersons: { type: Number, default: 1 },
        cabDetails: {
          isCabProvided: { type: Boolean, default: false },
          cabNumber: { type: String, trim: true },
          driverName: { type: String, trim: true },
          driverPhone: { type: String, trim: true },
          pickupLocation: { type: String, trim: true },
        },
        interestRating: { type: Number, min: 1, max: 5, default: 4 }, // 1 to 5 stars
        feedback: { type: String, trim: true },
        nextStep: { type: String, trim: true },
        loggedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        createdAt: { type: Date, default: Date.now },
        reminderStatus: {
          teamNotified: { type: Boolean, default: false },
          teamNotifiedAt: Date,
          teamChannels: [String],
          clientNotified: { type: Boolean, default: false },
          clientNotifiedAt: Date,
          clientChannels: [String],
          snoozedUntil: Date,
        },
      },
    ],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },

  {
    timestamps: true,
  }
);

LeadSchema.pre('validate', function () {
  if (this.mobileNo && this.alternateMobileNo && arePhoneNumbersSame(this.mobileNo, this.alternateMobileNo)) {
    throw new Error('Primary mobile number and alternate mobile number cannot be the same.');
  }
});

export const Lead = mongoose.models.Lead || mongoose.model('Lead', LeadSchema);
export default Lead;
