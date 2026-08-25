import mongoose from 'mongoose';

const MaintenanceBillSchema = new mongoose.Schema(
  {
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
    payerType: {
      type: String,
      enum: ['owner', 'tenant'],
      required: true,
      default: 'owner'
    },
    payerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true
    },
    billNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    billingMonth: {
      type: String, // e.g. "August 2026"
      required: true
    },
    billingYear: {
      type: Number,
      default: 2026
    },
    maintenanceAmount: {
      type: Number,
      required: true,
      default: 3500
    },
    utilityCharges: {
      type: Number,
      default: 500
    },
    penaltyAmount: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      required: true
    },
    paidAmount: {
      type: Number,
      default: 0
    },
    balanceAmount: {
      type: Number,
      default: 0
    },
    dueDate: {
      type: Date,
      required: true
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'pending_approval', 'partially_paid', 'paid', 'overdue', 'waived', 'rejected'],
      default: 'unpaid',
      index: true
    },
    paidAt: Date,
    paymentMethod: {
      type: String,
      enum: ['upi', 'bank_transfer', 'cash', 'cheque', 'card', 'online_neft'],
      default: 'upi'
    },
    transactionReference: String,
    utrNumber: {
      type: String,
      trim: true,
      index: true
    },
    proofFileUrl: String,
    receiptUrl: String,
    remarks: String,

    // Approval / Verification Trail
    verificationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'not_applicable'],
      default: 'not_applicable',
      index: true
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    submittedAt: Date,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: Date,
    rejectionReason: String,

    paymentHistory: [
      {
        paidAmount: {
          type: Number,
          required: true
        },
        paymentMethod: {
          type: String,
          default: 'upi'
        },
        utrNumber: {
          type: String,
          required: true
        },
        proofFileUrl: {
          type: String,
          required: true
        },
        submittedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        submittedAt: {
          type: Date,
          default: Date.now
        },
        verificationStatus: {
          type: String,
          enum: ['pending', 'approved', 'rejected'],
          default: 'pending'
        },
        approvedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        approvedAt: Date,
        rejectionReason: String
      }
    ]
  },
  { timestamps: true }
);

export const MaintenanceBill = mongoose.models.MaintenanceBill || mongoose.model('MaintenanceBill', MaintenanceBillSchema);
export default MaintenanceBill;
