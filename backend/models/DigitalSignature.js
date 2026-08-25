import mongoose from 'mongoose';

const DigitalSignatureSchema = new mongoose.Schema(
  {
    certificateNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    certificateCode: {
      type: String,
      index: true
    },
    agreementType: {
      type: String,
      enum: ['sale_agreement', 'rental_agreement', 'maintenance_agreement', 'legal_deed', 'kyc_declaration', 'contract_service'],
      required: true,
      index: true
    },
    referenceId: {
      type: String,
      required: true,
      index: true
    },
    documentTitle: {
      type: String,
      required: true,
      trim: true
    },
    documentUrl: {
      type: String,
      required: true
    },
    signerName: {
      type: String,
      required: true,
      trim: true
    },
    signerEmail: {
      type: String,
      trim: true
    },
    signerRole: {
      type: String,
      enum: [
        'seller_authorized_signatory',
        'buyer',
        'tenant',
        'owner',
        'notary',
        'witness',
        'builder',
        'partner',
        'authorized_signatory'
      ],
      default: 'seller_authorized_signatory',
      index: true
    },
    role: {
      type: String
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      index: true
    },
    flatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Flat',
      index: true
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      index: true
    },
    signatureDataUrl: {
      type: String, // Base64 canvas data or S3 URL of digital signature graphic
      required: true
    },
    signatureHash: {
      type: String, // SHA-256 Hash of signature + document
      required: true,
      index: true
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1'
    },
    signedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    verificationStatus: {
      type: String,
      enum: ['valid', 'revoked', 'expired'],
      default: 'valid',
      index: true
    }
  },
  { timestamps: true }
);

// Virtual alias for role
DigitalSignatureSchema.pre('save', function (next) {
  if (this.signerRole && !this.role) {
    this.role = this.signerRole;
  }
  if (this.certificateNumber && !this.certificateCode) {
    this.certificateCode = this.certificateNumber;
  }
  next();
});

export const DigitalSignature = mongoose.models.DigitalSignature || mongoose.model('DigitalSignature', DigitalSignatureSchema);
export default DigitalSignature;
