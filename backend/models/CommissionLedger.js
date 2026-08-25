import mongoose from 'mongoose';

const CommissionLedgerSchema = new mongoose.Schema(
  {
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
      index: true,
    },

    leadName: {
      type: String,
      required: true,
      trim: true,
    },

    leadMobile: {
      type: String,
      trim: true,
    },

    flatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Flat',
    },

    transactionType: {
      type: String,
      enum: ['credit', 'debit'],
      default: 'credit',
      index: true,
    },

    triggerEvent: {
      type: String,
      enum: ['site_visit_completed', '5_day_expiry_debit', 'booking_confirmed', 'manual_adjustment'],
      default: 'site_visit_completed',
    },

    commissionType: {
      type: String,
      enum: ['percentage', 'flat'],
      required: true,
    },

    commissionRate: {
      type: Number,
      required: true,
    },

    baseAmount: {
      type: Number,
      default: 0, // e.g. Lead Budget or Flat Value in ₹
    },

    calculatedAmount: {
      type: Number,
      required: true, // Amount in ₹ (positive for credit, positive number for debit amount)
    },

    siteVisitDate: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      enum: [
        'credited',
        'debited',
        'paid',
        'on_hold',
        'cancelled',
      ],
      default: 'credited',
      index: true,
    },

    creditedAt: {
      type: Date,
      default: Date.now,
    },

    debitedAt: {
      type: Date,
    },

    paidAt: {
      type: Date,
    },

    paymentReference: {
      type: String,
      trim: true,
    },

    remarks: {
      type: String,
      trim: true,
    },

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },

  {
    timestamps: true,
  }
);

export const CommissionLedger =
  mongoose.models.CommissionLedger || mongoose.model('CommissionLedger', CommissionLedgerSchema);
export default CommissionLedger;
