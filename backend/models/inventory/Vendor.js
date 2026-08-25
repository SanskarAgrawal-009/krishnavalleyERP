import mongoose from 'mongoose';

const VendorSchema = new mongoose.Schema(
  {
    vendorCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    vendorName: {
      type: String,
      required: true,
      trim: true,
    },

    contactPerson: {
      name: String,
      mobileNo: String,
      email: String,
    },

    phone: String,

    email: String,

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

    gstNumber: {
      type: String,
    },

    panNumber: {
      type: String,
    },

    paymentTerms: {
      type: String,
    },

    status: {
      type: String,
      enum: [
        "active",
        "inactive",
        "blacklisted",
      ],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

export const Vendor = mongoose.models.Vendor || mongoose.model("Vendor", VendorSchema);
export default Vendor;
