import mongoose from 'mongoose';
import { arePhoneNumbersSame } from '../utils/phoneValidator.js';

const CustomerSchema = new mongoose.Schema(
  {
    // =====================================================
    // CUSTOMER TYPE
    // =====================================================

    customerType: {
      type: String,
      enum: ["owner", "tenant"],
      required: true,
      index: true,
    },

    // =====================================================
    // BASIC INFORMATION
    // =====================================================

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

    address: {
      addressLine1: String,
      addressLine2: String,
      locality: String,
      city: String,
      state: String,
      pincode: String,
      country: {
        type: String,
        default: "India",
      },
    },

    // =====================================================
    // OWNER DETAILS
    // =====================================================

    ownerDetails: {
      propertyIds: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Flat",
        },
      ],

      ownershipType: {
        type: String,
        enum: [
          "individual",
          "company",
          "joint",
        ],
        default: "individual",
      },

      ownershipPercentage: {
        type: Number,
        min: 0,
        max: 100,
        default: 100,
      },
    },

    // =====================================================
    // TENANT DETAILS
    // =====================================================

    tenantDetails: {
      tenantType: {
        type: String,
        enum: [
          "individual",
          "company",
        ],
        default: "individual",
      },

      // -------------------------
      // Individual Tenant
      // -------------------------

      individual: {
        fatherName: String,

        dateOfBirth: Date,

        governmentIdType: {
          type: String,
          enum: [
            "aadhaar",
            "pan",
            "passport",
            "voter_id",
            "driving_license",
            "other",
          ],
          default: "aadhaar",
        },

        governmentIdNumber: String,
      },

      // -------------------------
      // Company Tenant
      // -------------------------

      company: {
        companyName: String,

        registrationNumber: String,

        gstNumber: String,

        panNumber: String,

        registeredAddress: String,

        contactPerson: {
          name: String,
          mobileNo: String,
          email: String,
          designation: String,
        },
      },

      // -------------------------
      // Rental Details
      // -------------------------

      rentalDetails: {
        flatId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Flat",
        },

        leaseStartDate: Date,

        leaseEndDate: Date,

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
          min: 1,
          max: 31,
          default: 5,
        },

        rentStatus: {
          type: String,
          enum: [
            "active",
            "overdue",
            "terminated",
            "expired",
          ],
          default: "active",
        },
      },
    },

    // =====================================================
    // DOCUMENT MANAGEMENT
    // =====================================================

    documents: [
      {
        documentType: {
          type: String,

          enum: [
            // Identity
            "aadhaar",
            "pan",
            "passport",
            "voter_id",
            "driving_license",

            // Ownership
            "sale_deed",
            "registry",
            "ownership_proof",
            "property_tax_document",

            // Rental
            "rental_agreement",
            "lease_agreement",
            "rent_receipt",

            // Company
            "company_registration",
            "gst_certificate",
            "company_pan",
            "authorization_letter",

            // Other
            "address_proof",
            "bank_document",
            "other",
          ],

          required: true,
        },

        documentName: {
          type: String,
          required: true,
        },

        documentNumber: {
          type: String,
        },

        fileUrl: {
          type: String,
          required: true,
        },

        fileName: {
          type: String,
        },

        fileType: {
          type: String,
        },

        fileSize: {
          type: Number,
        },

        uploadedAt: {
          type: Date,
          default: Date.now,
        },

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
    ],

    // =====================================================
    // COMMUNICATION HISTORY
    // =====================================================

    communications: [
      {
        communicationDate: {
          type: Date,
          default: Date.now,
        },

        mode: {
          type: String,

          enum: [
            "call",
            "whatsapp",
            "email",
            "sms",
            "meeting",
            "site_visit",
            "letter",
            "other",
          ],

          required: true,
        },

        direction: {
          type: String,

          enum: [
            "inbound",
            "outbound",
          ],

          required: true,
        },

        subject: {
          type: String,
          trim: true,
        },

        message: {
          type: String,
          trim: true,
        },

        outcome: {
          type: String,
          trim: true,
        },

        nextFollowUpDate: {
          type: Date,
        },

        status: {
          type: String,

          enum: [
            "completed",
            "pending",
            "cancelled",
          ],

          default: "completed",
        },

        attachmentUrl: {
          type: String,
        },

        callRecordingUrl: {
          type: String,
        },

        recordedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],

    // =====================================================
    // CUSTOMER STATUS
    // =====================================================

    status: {
      type: String,

      enum: [
        "active",
        "inactive",
        "blocked",
      ],

      default: "active",

      index: true,
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

CustomerSchema.pre('validate', function () {
  if (this.mobileNo && this.alternateMobileNo && arePhoneNumbersSame(this.mobileNo, this.alternateMobileNo)) {
    throw new Error('Primary mobile number and alternate mobile number cannot be the same.');
  }
});

export const Customer = mongoose.models.Customer || mongoose.model("Customer", CustomerSchema);
export default Customer;
