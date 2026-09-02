import mongoose from 'mongoose';

const SalesLeadSchema = new mongoose.Schema(
  {
    // =========================
    // LEAD / CUSTOMER DETAILS
    // =========================

    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
      unique: true,
      index: true,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      index: true,
    },

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

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      index: true,
    },

    convertedAt: {
      type: Date,
      default: Date.now,
    },

    // =========================
    // PROPERTY DETAILS
    // =========================

    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },

    buildingId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    flatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Flat",
      required: true,
      index: true,
    },

    // =========================
    // SALES STATUS
    // =========================

    salesStatus: {
      type: String,

      enum: [
        "converted",
        "booking_pending",
        "booked",
        "agreement_pending",
        "agreement_completed",
        "payment_pending",
        "payment_in_progress",
        "fully_paid",
        "possession_pending",
        "possessed",
        "cancelled",
        "refunded",
      ],

      default: "converted",

      index: true,
    },

    // =========================
    // BOOKING
    // =========================

    booking: {
      isBooked: {
        type: Boolean,
        default: false,
      },

      bookingDate: {
        type: Date,
      },

      bookingAmount: {
        type: Number,
        default: 0,
        min: 0,
      },

      bookingPaymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Payment",
      },

      bookingStatus: {
        type: String,

        enum: [
          "pending",
          "payment_pending",
          "confirmed",
          "cancelled",
        ],

        default: "pending",
      },
    },

    // =========================
    // AGREEMENT
    // =========================

    agreement: {
      required: {
        type: Boolean,
        default: true,
      },

      uploaded: {
        type: Boolean,
        default: false,
      },

      documentUrl: {
        type: String,
      },

      documentName: {
        type: String,
      },

      uploadedAt: {
        type: Date,
      },

      agreementDate: {
        type: Date,
      },

      agreementNumber: {
        type: String,
        unique: true,
        sparse: true,
      },

      verificationStatus: {
        type: String,

        enum: [
          "pending",
          "under_review",
          "verified",
          "rejected",
        ],

        default: "pending",
      },
    },

    // =========================
    // BBA DOCUMENT (S3 ATTACHMENT)
    // =========================
    bbaDocument: {
      fileName: String,
      fileUrl: String,
      fileSize: Number,
      uploadedAt: Date,
      isSigned: {
        type: Boolean,
        default: false,
      },
      signedAt: Date,
      signatureHash: String,
    },

    // =========================
    // PAYMENT PLAN
    // =========================

    paymentPlan: {
      type: {
        type: String,

        enum: [
          "full_payment",
          "installment",
          "custom",
        ],

        default: "installment",
      },

      totalAmount: {
        type: Number,
        default: 0,
      },

      bookingAmount: {
        type: Number,
        default: 0,
      },

      remainingAmount: {
        type: Number,
        default: 0,
      },

      numberOfInstallments: {
        type: Number,
        default: 0,
      },

      decidedAt: {
        type: Date,
      },
    },

    // =========================
    // INSTALLMENTS
    // =========================

    installments: [
      {
        installmentNumber: {
          type: Number,
          required: true,
        },

        dueDate: {
          type: Date,
          required: true,
        },

        amount: {
          type: Number,
          required: true,
          min: 0,
        },

        paidAmount: {
          type: Number,
          default: 0,
        },

        remainingAmount: {
          type: Number,
          default: 0,
        },

        status: {
          type: String,

          enum: [
            "upcoming",
            "due",
            "partially_paid",
            "paid",
            "overdue",
            "cancelled",
          ],

          default: "upcoming",
        },

        paidAt: {
          type: Date,
        },

        paymentIds: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Payment",
          },
        ],
      },
    ],

    // =========================
    // RECEIPTS
    // =========================

    receipts: [
      {
        receiptNumber: {
          type: String,
          required: true,
        },

        paymentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Payment",
          required: false, // Made optional for manual/direct entry without separate payment collection
        },

        amount: {
          type: Number,
          required: true,
        },

        generatedAt: {
          type: Date,
          default: Date.now,
        },

        documentUrl: {
          type: String,
        },
      },
    ],

    // =========================
    // DEMAND LETTERS
    // =========================

    demandLetters: [
      {
        demandLetterNumber: {
          type: String,
          required: true,
        },

        installmentNumber: {
          type: Number,
        },

        amountDue: {
          type: Number,
          required: true,
        },

        dueDate: {
          type: Date,
          required: true,
        },

        generatedAt: {
          type: Date,
          default: Date.now,
        },

        documentUrl: {
          type: String,
        },

        status: {
          type: String,

          enum: [
            "generated",
            "sent",
            "paid",
            "overdue",
            "cancelled",
          ],

          default: "generated",
        },
      },
    ],

    // =========================
    // FOLLOW UPS
    // =========================

    followUps: [
      {
        date: {
          type: Date,
          default: Date.now,
        },

        mode: {
          type: String,

          enum: [
            "call",
            "whatsapp",
            "email",
            "meeting",
            "site_visit",
            "other",
          ],

          default: "call",
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
            "pending",
            "completed",
            "cancelled",
          ],

          default: "pending",
        },
      },
    ],

    // =========================
    // POSSESSION
    // =========================

    possession: {
      status: {
        type: String,

        enum: [
          "not_ready",
          "ready",
          "scheduled",
          "completed",
          "rejected",
        ],

        default: "not_ready",
      },

      scheduledDate: {
        type: Date,
      },

      possessionDate: {
        type: Date,
      },

      possessionLetterUrl: {
        type: String,
      },

      remarks: {
        type: String,
      },
    },

    // =========================
    // CANCELLATION
    // =========================

    cancellation: {
      isCancelled: {
        type: Boolean,
        default: false,
      },

      cancellationDate: {
        type: Date,
      },

      reason: {
        type: String,
      },

      cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },

      cancellationAmount: {
        type: Number,
        default: 0,
      },

      refundAmount: {
        type: Number,
        default: 0,
      },
    },

    // =========================
    // REFUND
    // =========================

    refund: {
      status: {
        type: String,

        enum: [
          "not_applicable",
          "pending",
          "processing",
          "completed",
          "rejected",
        ],

        default: "not_applicable",
      },

      refundAmount: {
        type: Number,
        default: 0,
      },

      refundDate: {
        type: Date,
      },

      refundReference: {
        type: String,
      },

      refundMethod: {
        type: String,

        enum: [
          "bank_transfer",
          "upi",
          "cheque",
          "cash",
          "other",
        ],
      },

      remarks: {
        type: String,
      },
    },

    // =========================
    // AUDIT
    // =========================

    convertedAt: {
      type: Date,
      default: Date.now,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },

  {
    timestamps: true,
  }
);

export const SalesLead = mongoose.models.SalesLead || mongoose.model("SalesLead", SalesLeadSchema);
export default SalesLead;
