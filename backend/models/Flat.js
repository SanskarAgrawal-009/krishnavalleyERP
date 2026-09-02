import mongoose from 'mongoose';

const FlatSchema = new mongoose.Schema(
  {
    // =========================================================
    // 1. PROPERTY IDENTIFIERS & ARCHITECTURAL SPECS
    // =========================================================
    flatNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },

    buildingId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    floor: {
      type: Number,
      required: true,
      default: 1,
      index: true,
    },

    bhkType: {
      type: String,
      enum: [
        '1BHK',
        '2BHK',
        '3BHK',
        '4BHK',
        'Service Apartment',
        'Studio',
        'Penthouse',
        'Villa',
        'Commercial',
      ],
      default: '2BHK',
      trim: true,
    },

    carpetArea: {
      type: Number,
      default: 950, // in sq ft
    },

    superBuiltUpArea: {
      type: Number,
      default: 1250, // in sq ft
    },

    basePrice: {
      type: Number,
      default: 4500000,
    },

    facing: {
      type: String,
      enum: [
        'East',
        'West',
        'North',
        'South',
        'North-East',
        'North-West',
        'South-East',
        'South-West',
      ],
      default: 'East',
    },

    furnishingStatus: {
      type: String,
      enum: ['unfurnished', 'semi_furnished', 'fully_furnished', 'luxury_furnished'],
      default: 'semi_furnished',
    },

    parkingSlot: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: [
        'available',
        'hold',
        'booked',
        'sold',
        'leased',
        'resell',
        'buy_back',
        'possession_renewal',
        'under_maintenance',
        'blocked',
      ],
      default: 'available',
      index: true,
    },

    isSold: {
      type: Boolean,
      default: false,
      index: true,
    },

    takenForRental: {
      type: Boolean,
      default: false,
      index: true,
    },

    buybackCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Blueprints & Architectural floorplans (Saved in S3)
    blueprints: [
      {
        title: {
          type: String,
          required: true,
        },
        fileUrl: {
          type: String,
          required: true,
        },
        fileName: String,
        fileType: String,
        floorPlanType: {
          type: String,
          enum: ['2d_layout', '3d_render', 'structural', 'electrical', 'plumbing', 'other'],
          default: '2d_layout',
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // =========================================================
    // 2. CURRENT OWNER & OWNERSHIP HISTORY (RESALE TRAIL)
    // =========================================================
    currentOwner: {
      customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
      },
      name: String,
      mobileNo: String,
      email: String,
      address: String,
      panNumber: String,
      aadhaarNumber: String,
      ownershipStartDate: Date,
      ownershipType: {
        type: String,
        enum: ['individual', 'joint', 'corporate'],
        default: 'individual',
      },
    },

    // Ownership Trail (Past / Old Owners Archive)
    ownershipHistory: [
      {
        previousOwnerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Customer',
        },
        name: String,
        mobileNo: String,
        email: String,
        ownershipStartDate: Date,
        ownershipEndDate: Date,
        transferDate: Date,
        transferReason: {
          type: String,
          enum: ['resale', 'buyback', 'possession_renewal', 'inheritance', 'family_transfer', 'surrender'],
          default: 'resale',
        },
        transferDealValue: Number,
        remarks: String,
      },
    ],

    // =========================================================
    // 3. SALES ALLOTMENT & FINANCIAL BREAKDOWN
    // =========================================================
    salesDetails: {
      salesLeadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SalesLead',
      },
      buyerName: String,
      bookingDate: Date,
      agreedDealPrice: {
        type: Number,
        default: 0,
      },
      bookingAmountPaid: {
        type: Number,
        default: 0,
      },
      totalAmountPaid: {
        type: Number,
        default: 0,
      },
      balanceAmountDue: {
        type: Number,
        default: 0,
      },
      paymentPlanType: {
        type: String,
        enum: ['installment', 'custom', 'full_payment'],
        default: 'installment',
      },
      agreementNumber: String,
      agreementDate: Date,
      agreementVerificationStatus: {
        type: String,
        enum: ['pending', 'under_review', 'verified', 'rejected'],
        default: 'pending',
      },
      possessionStatus: {
        type: String,
        enum: ['pending', 'scheduled', 'ready', 'handed_over'],
        default: 'pending',
      },
      possessionDate: Date,
      salesStatus: {
        type: String,
        enum: [
          'new',
          'booked',
          'payment_in_progress',
          'agreement_completed',
          'fully_paid',
          'possession_completed',
          'cancelled',
        ],
        default: 'new',
      },
    },

    // =========================================================
    // 4. OWNER RENT-BACK PROGRAM, PRE-POSSESSION & RENEWAL LEDGER
    // =========================================================
    rentalDetails: {
      rentalContractId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RentalManagement',
      },
      isRentBackActive: {
        type: Boolean,
        default: false,
      },
      isPossessionRenewal: {
        type: Boolean,
        default: false,
      },
      prePossessionMonthlyRent: {
        type: Number,
        default: 0,
      },
      prePossessionTenureMonths: {
        type: Number,
        default: 0,
      },
      prePossessionTotalPaid: {
        type: Number,
        default: 0,
      },
      mouNumber: String,
      mouDate: Date,
      startDate: Date,
      endDate: Date,
      tenureMonths: {
        type: Number,
        default: 36,
      },
      dueDayOfMonth: {
        type: Number,
        default: 25,
      },
      guaranteedMonthlyRent: {
        type: Number,
        default: 0,
      },
      total36MonthCommitment: {
        type: Number,
        default: 0,
      },
      totalDisbursedToOwner: {
        type: Number,
        default: 0,
      },
      remainingPayableToOwner: {
        type: Number,
        default: 0,
      },
      // Month-by-Month Passbook Entries
      ledgerEntries: [
        {
          monthIndex: Number, // 1 to 36
          dueDate: Date,
          paymentDate: Date,
          paymentMode: String, // NEFT, RTGS, Cheque, UPI, Cash
          referenceNumber: String,
          grossAmount: Number,
          tdsDeducted: Number,
          netAmountPaid: Number,
          cumulativePaid: Number,
          remainingTenureBalance: Number,
          status: {
            type: String,
            enum: ['paid', 'due', 'upcoming', 'partial'],
            default: 'upcoming',
          },
          remarks: String,
        },
      ],

      // Sub-Lease / Third-party Tenant (Optional if flat is sub-let)
      subleaseTenant: {
        tenantId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Customer',
        },
        tenantName: String,
        tenantMobile: String,
        monthlyRentInflow: Number,
        securityDeposit: Number,
        leaseStartDate: Date,
        leaseEndDate: Date,
        allocationStatus: {
          type: String,
          enum: ['vacant', 'occupied', 'notice_period'],
          default: 'vacant',
        },
      },
    },

    // =========================================================
    // 5. MAINTENANCE & FACILITY MANAGEMENT
    // =========================================================
    maintenanceDetails: {
      monthlyMaintenanceFee: {
        type: Number,
        default: 2000,
      },
      billingCycle: {
        type: String,
        enum: ['monthly', 'quarterly', 'semi_annual', 'annual'],
        default: 'monthly',
      },
      lastBilledDate: Date,
      outstandingMaintenanceDue: {
        type: Number,
        default: 0,
      },
      maintenanceStatus: {
        type: String,
        enum: ['paid', 'due', 'overdue'],
        default: 'paid',
      },
    },
  },
  {
    timestamps: true,
  }
);

export const Flat = mongoose.models.Flat || mongoose.model('Flat', FlatSchema);
export default Flat;
