import mongoose from 'mongoose';

const TenantPenaltySchema = new mongoose.Schema(
  {
    penaltyNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true
    },
    buildingId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },
    flatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Flat',
      required: true,
      index: true
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true
    },
    customerType: {
      type: String,
      enum: ['owner', 'tenant'],
      default: 'tenant',
      index: true
    },
    violationType: {
      type: String,
      enum: [
        'late_payment',
        'noise_disturbance',
        'illegal_parking',
        'property_damage',
        'garbage_disposal',
        'unauthorized_renovation',
        'pet_policy',
        'other'
      ],
      required: true,
      default: 'late_payment'
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    penaltyAmount: {
      type: Number,
      required: true,
      default: 1000
    },
    incidentDate: {
      type: Date,
      default: Date.now
    },
    evidenceDocument: {
      fileUrl: String,
      fileName: String
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'waived', 'adjusted_from_deposit'],
      default: 'pending',
      index: true
    },
    paidAt: Date,
    transactionReference: String,
    remarks: String
  },
  { timestamps: true }
);

export const TenantPenalty = mongoose.models.TenantPenalty || mongoose.model('TenantPenalty', TenantPenaltySchema);
export default TenantPenalty;
