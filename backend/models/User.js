import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema(
  {
    // ==========================================
    // BASIC USER INFORMATION
    // ==========================================

    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      index: true,
    },

    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    lastName: {
      type: String,
      trim: true,
    },

    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    mobileNo: {
      type: String,
      trim: true,
    },

    // ==========================================
    // AUTHENTICATION
    // ==========================================

    passwordHash: {
      type: String,
      required: true,
    },

    lastLoginAt: {
      type: Date,
    },

    passwordChangedAt: {
      type: Date,
    },

    // ==========================================
    // SYSTEM ROLE
    // ==========================================

    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AccessControl",
      required: true,
      index: true,
    },

    // ==========================================
    // BRANCH ACCESS
    // ==========================================

    branchAccess: [
      {
        branchId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Branch",
          required: true,
        },

        accessLevel: {
          type: String,
          enum: [
            "view",
            "edit",
            "manage",
          ],
          default: "view",
        },

        isPrimary: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // ==========================================
    // ACCOUNT STATUS
    // ==========================================

    status: {
      type: String,
      enum: [
        "active",
        "inactive",
        "suspended",
        "locked",
      ],
      default: "active",
      index: true,
    },

    // ==========================================
    // AGENT / CHANNEL PARTNER PROFILE
    // ==========================================

    agentProfile: {
      agentCode: {
        type: String,
        trim: true,
        uppercase: true,
        index: true,
      },
      agencyName: {
        type: String,
        trim: true,
      },
      tier: {
        type: String,
        enum: ['Standard', 'Silver', 'Gold', 'Platinum'],
        default: 'Standard',
      },
      city: {
        type: String,
        trim: true,
      },
      reraNumber: {
        type: String,
        trim: true,
      },
      commissionType: {
        type: String,
        enum: ['percentage', 'flat'],
        default: 'percentage',
      },
      commissionRate: {
        type: Number,
        default: 2, // 2% or flat amount in ₹
      },
      walletBalance: {
        type: Number,
        default: 0,
      },
      totalEarned: {
        type: Number,
        default: 0,
      },
      maturedLeadsCount: {
        type: Number,
        default: 0,
      },
      leads: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Lead',
        },
      ],
      siteVisits: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'SiteVisit',
        },
      ],
      bankDetails: {
        accountHolder: String,
        accountNumber: String,
        ifscCode: String,
        bankName: String,
        upiId: String,
      },
    },

    // ==========================================
    // SECURITY
    // ==========================================

    failedLoginAttempts: {
      type: Number,
      default: 0,
    },

    accountLockedUntil: {
      type: Date,
    },

    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },

    // ==========================================
    // AUDIT
    // ==========================================

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

// Pre-save hook: Hash password if modified
UserSchema.pre('save', async function () {
  if (!this.isModified('passwordHash')) return;

  // If the password is not already a bcrypt hash (starts with $2a$ or $2b$)
  if (!this.passwordHash.startsWith('$2a$') && !this.passwordHash.startsWith('$2b$')) {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  }
});

// Compare candidate password with stored hash
UserSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Check if account is currently locked
UserSchema.methods.isLocked = function () {
  return !!(this.accountLockedUntil && this.accountLockedUntil > Date.now());
};

// Format user object safely for responses
UserSchema.methods.toSafeObject = function () {
  const obj = this.toObject ? this.toObject() : { ...this };
  delete obj.passwordHash;
  delete obj.failedLoginAttempts;
  delete obj.accountLockedUntil;
  return obj;
};

export const User = mongoose.models.User || mongoose.model("User", UserSchema);
export default User;
