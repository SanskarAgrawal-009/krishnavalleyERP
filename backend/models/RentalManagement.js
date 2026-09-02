import mongoose from 'mongoose';

const RentalManagementSchema = new mongoose.Schema(
  {
    // =====================================================
    // PROPERTY
    // =====================================================

    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },

    buildingId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      index: true,
    },

    flatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Flat",
      required: true,
      index: true,
    },

    // =====================================================
    // MULTI-UNIT LEASING SUPPORT (Corporate / Bundle Lease)
    // =====================================================
    flatIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Flat",
      },
    ],

    leasedUnits: [
      {
        flatId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Flat",
        },
        ownerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Customer",
        },
        flatNumber: String,
        buildingName: String,
        monthlyRentBack: {
          type: Number,
          default: 0,
        },
        monthlyTenantRent: {
          type: Number,
          default: 0,
        },
        depositAmount: {
          type: Number,
          default: 0,
        },
      },
    ],

    isMultiUnit: {
      type: Boolean,
      default: false,
    },

    totalUnitsCount: {
      type: Number,
      default: 1,
    },

    // =====================================================
    // CONTRACT IDENTIFIERS
    // =====================================================
    contractNumber: {
      type: String,
      index: true
    },

    contractCode: {
      type: String,
      index: true
    },

    tenantType: {
      type: String,
      default: 'Standard'
    },

    // =====================================================
    // OWNER
    // Existing Customer
    // =====================================================

    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },

    // =====================================================
    // TENANT
    // (Optional for Pure Owner Rent-Back Agreements)
    // =====================================================

    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: false,
      index: true,
    },

    // =====================================================
    // RENT-BACK
    // Company takes flat from owner (Guaranteed Yield)
    // =====================================================

    rentBack: {
      enabled: {
        type: Boolean,
        default: false,
      },

      agreementNumber: {
        type: String,
        unique: true,
        sparse: true,
      },

      mouDate: Date,

      startDate: Date,

      endDate: Date,

      monthlyRent: {
        type: Number,
        default: 0,
      },

      securityDeposit: {
        type: Number,
        default: 0,
      },

      rentDueDay: {
        type: Number,
        default: 25,
        min: 1,
        max: 31,
      },

      agreementDocument: {
        fileUrl: String,
        fileName: String,
        uploadedAt: Date,

        verificationStatus: {
          type: String,
          enum: [
            "pending",
            "verified",
            "rejected",
          ],
          default: "pending",
        },

        verifiedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },

        verifiedAt: Date,

        rejectionReason: String,
      },

      status: {
        type: String,
        enum: [
          "pending",
          "active",
          "expired",
          "terminated",
        ],
        default: "pending",
      },
    },

    // =====================================================
    // 36-MONTH OWNER RENTAL LEDGER / PASSBOOK
    // =====================================================
    rentBackLedger: {
      mouDate: Date,
      startDate: Date,
      endDate: Date,
      dueDay: {
        type: Number,
        default: 25
      },
      tenureMonths: {
        type: Number,
        default: 36
      },
      monthlyRent: {
        type: Number,
        default: 0
      },
      totalTenureAmount: {
        type: Number,
        default: 0
      },
      totalPaidToOwner: {
        type: Number,
        default: 0
      },
      remainingPayableToOwner: {
        type: Number,
        default: 0
      },
      entries: [
        {
          monthIndex: {
            type: Number,
            required: true
          },
          dueDate: Date,
          paymentDate: Date,
          paymentMode: {
            type: String,
            default: 'NEFT'
          },
          referenceNumber: String,
          grossAmount: {
            type: Number,
            default: 0
          },
          tdsDeducted: {
            type: Number,
            default: 0
          },
          netAmountPaid: {
            type: Number,
            default: 0
          },
          cumulativePaid: {
            type: Number,
            default: 0
          },
          remainingTenureBalance: {
            type: Number,
            default: 0
          },
          status: {
            type: String,
            enum: ['paid', 'due', 'upcoming', 'partial'],
            default: 'upcoming'
          },
          remarks: String
        }
      ]
    },

    // =====================================================
    // TENANT ALLOCATION
    // =====================================================

    allocation: {
      status: {
        type: String,

        enum: [
          "available",
          "reserved",
          "allocated",
          "occupied",
          "vacated",
        ],

        default: "available",
      },

      allocationDate: Date,

      moveInDate: Date,

      moveOutDate: Date,
    },

    // =====================================================
    // TENANT AGREEMENT
    // =====================================================

    tenantAgreement: {
      agreementNumber: {
        type: String,
        unique: true,
        sparse: true,
      },

      startDate: Date,

      endDate: Date,

      monthlyRent: {
        type: Number,
        default: 0,
      },

      rentDueDay: {
        type: Number,
        min: 1,
        max: 31,
      },

      agreementDocument: {
        fileUrl: String,

        fileName: String,

        uploadedAt: Date,

        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },

        verificationStatus: {
          type: String,

          enum: [
            "pending",
            "verified",
            "rejected",
          ],

          default: "pending",
        },

        verifiedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },

        verifiedAt: Date,

        rejectionReason: String,
      },

      status: {
        type: String,

        enum: [
          "draft",
          "pending",
          "active",
          "expired",
          "terminated",
        ],

        default: "draft",
      },
    },

    // =====================================================
    // SECURITY DEPOSIT
    // =====================================================

    securityDeposit: {
      tenantDeposit: {
        requiredAmount: {
          type: Number,
          default: 0,
        },

        paidAmount: {
          type: Number,
          default: 0,
        },

        outstandingAmount: {
          type: Number,
          default: 0,
        },

        status: {
          type: String,

          enum: [
            "pending",
            "partially_paid",
            "paid",
            "adjusted",
            "refunded",
          ],

          default: "pending",
        },
      },

      ownerDeposit: {
        requiredAmount: {
          type: Number,
          default: 0,
        },

        paidAmount: {
          type: Number,
          default: 0,
        },

        outstandingAmount: {
          type: Number,
          default: 0,
        },

        status: {
          type: String,

          enum: [
            "pending",
            "partially_paid",
            "paid",
            "adjusted",
            "refunded",
          ],

          default: "pending",
        },
      },
    },

    // =====================================================
    // RENTAL STATUS
    // =====================================================

    status: {
      type: String,

      enum: [
        "draft",
        "rent_back_active",
        "tenant_pending",
        "tenant_allocated",
        "occupied",
        "vacated",
        "terminated",
      ],

      default: "draft",

      index: true,
    },

    // =====================================================
    // NOTES
    // =====================================================

    remarks: {
      type: String,
      trim: true,
    },

    // =====================================================
    // AUDIT
    // =====================================================

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

export const RentalManagement = mongoose.models.RentalManagement || mongoose.model("RentalManagement", RentalManagementSchema);
export default RentalManagement;
