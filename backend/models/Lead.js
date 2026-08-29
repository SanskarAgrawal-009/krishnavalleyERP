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

    leadSource: {
      type: String,
      enum: [
        'agent',
        'direct',
        'website',
        'referral',
        'campaign',
        'walk_in',
      ],
      default: 'agent',
      index: true,
    },

    status: {
      type: String,
      enum: [
        'new',
        'contacted',
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
            'cancelled',
          ],
          default: 'pending',
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

LeadSchema.pre('validate', function (next) {
  if (this.mobileNo && this.alternateMobileNo && arePhoneNumbersSame(this.mobileNo, this.alternateMobileNo)) {
    return next(new Error('Primary mobile number and alternate mobile number cannot be the same.'));
  }
  next();
});

LeadSchema.pre('save', function (next) {
  if (this.mobileNo && this.alternateMobileNo && arePhoneNumbersSame(this.mobileNo, this.alternateMobileNo)) {
    return next(new Error('Primary mobile number and alternate mobile number cannot be the same.'));
  }
  next();
});

export const Lead = mongoose.models.Lead || mongoose.model('Lead', LeadSchema);
export default Lead;
