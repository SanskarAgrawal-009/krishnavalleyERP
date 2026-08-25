import mongoose from 'mongoose';

const EmployeeSchema = new mongoose.Schema(
  {
    // =====================================================
    // EMPLOYEE BASIC DETAILS
    // =====================================================

    employeeCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
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

    mobileNo: {
      type: String,
      required: true,
      index: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },

    dateOfBirth: {
      type: Date,
    },

    gender: {
      type: String,
      enum: [
        "male",
        "female",
        "other",
      ],
    },

    joiningDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    // =====================================================
    // DEPARTMENT & ROLE
    // =====================================================

    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HRMaster",
      required: true,
      index: true,
    },

    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HRMaster",
      required: true,
      index: true,
    },

    // =====================================================
    // EMPLOYMENT
    // =====================================================

    employmentType: {
      type: String,
      enum: [
        "full_time",
        "part_time",
        "contract",
        "temporary",
        "intern",
      ],
      default: "full_time",
    },

    employmentStatus: {
      type: String,
      enum: [
        "active",
        "on_leave",
        "suspended",
        "resigned",
        "terminated",
      ],
      default: "active",
      index: true,
    },

    // =====================================================
    // PERSONAL / ADDRESS
    // =====================================================

    address: {
      addressLine1: String,
      addressLine2: String,
      city: String,
      state: String,
      pincode: String,
      country: {
        type: String,
        default: "India",
      },
    },

    emergencyContact: {
      name: String,
      relationship: String,
      mobileNo: String,
    },

    // =====================================================
    // ATTENDANCE
    // =====================================================

    attendance: [
      {
        date: {
          type: Date,
          required: true,
        },

        checkIn: {
          type: Date,
        },

        checkOut: {
          type: Date,
        },

        workingHours: {
          type: Number,
          default: 0,
        },

        status: {
          type: String,
          enum: [
            "present",
            "absent",
            "half_day",
            "late",
            "holiday",
            "leave",
          ],
          default: "present",
        },

        remarks: String,
      },
    ],

    // =====================================================
    // LEAVE
    // =====================================================

    leaves: [
      {
        leaveType: {
          type: String,
          enum: [
            "casual",
            "sick",
            "earned",
            "unpaid",
            "maternity",
            "paternity",
            "other",
          ],
          required: true,
        },

        fromDate: {
          type: Date,
          required: true,
        },

        toDate: {
          type: Date,
          required: true,
        },

        numberOfDays: {
          type: Number,
          required: true,
        },

        reason: {
          type: String,
        },

        status: {
          type: String,
          enum: [
            "pending",
            "approved",
            "rejected",
            "cancelled",
          ],
          default: "pending",
        },

        approvedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },

        approvedAt: Date,
      },
    ],

    // =====================================================
    // PAYROLL
    // =====================================================

    payroll: [
      {
        month: {
          type: Number,
          min: 1,
          max: 12,
          required: true,
        },

        year: {
          type: Number,
          required: true,
        },

        basicSalary: {
          type: Number,
          default: 0,
        },

        allowances: {
          type: Number,
          default: 0,
        },

        overtime: {
          type: Number,
          default: 0,
        },

        deductions: {
          type: Number,
          default: 0,
        },

        unpaidLeaveDeduction: {
          type: Number,
          default: 0,
        },

        grossSalary: {
          type: Number,
          default: 0,
        },

        netSalary: {
          type: Number,
          default: 0,
        },

        paymentDate: {
          type: Date,
        },

        paymentMethod: {
          type: String,
          enum: [
            "bank_transfer",
            "cash",
            "cheque",
            "other",
          ],
        },

        paymentReference: {
          type: String,
        },

        status: {
          type: String,
          enum: [
            "pending",
            "processed",
            "paid",
            "cancelled",
          ],
          default: "pending",
        },

        payslipUrl: {
          type: String,
        },
      },
    ],

    // =====================================================
    // DOCUMENTS
    // =====================================================

    documents: [
      {
        documentType: {
          type: String,
          enum: [
            "aadhaar",
            "pan",
            "joining_letter",
            "experience_letter",
            "qualification",
            "salary_slip",
            "bank_document",
            "other",
          ],
        },

        documentName: String,

        fileUrl: String,

        uploadedAt: {
          type: Date,
          default: Date.now,
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
      },
    ],

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

export const Employee = mongoose.models.Employee || mongoose.model("Employee", EmployeeSchema);
export default Employee;
