import mongoose from 'mongoose';

const LegalDocumentSchema = new mongoose.Schema(
  {
    documentNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    documentType: {
      type: String,
      enum: [
        'rera_registration',
        'land_title_deed',
        'sanctioned_plan',
        'fire_noc',
        'occupancy_certificate',
        'completion_certificate',
        'environmental_clearance',
        'encumbrance_certificate',
        'maintenance_bylaws',
        'other'
      ],
      required: true,
      index: true
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      index: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    fileName: String,
    fileSize: Number,
    issueDate: Date,
    expiryDate: Date,
    issuingAuthority: String,
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'expired', 'rejected'],
      default: 'verified'
    },
    description: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

export const LegalDocument = mongoose.models.LegalDocument || mongoose.model('LegalDocument', LegalDocumentSchema);
export default LegalDocument;
