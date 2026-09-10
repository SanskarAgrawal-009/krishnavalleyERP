import mongoose from 'mongoose';

const SalesTeamMemberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    roleTitle: {
      type: String,
      default: 'Sales Executive',
      trim: true,
    },

    isActiveInRoundRobin: {
      type: Boolean,
      default: true,
      index: true,
    },

    order: {
      type: Number,
      default: 0,
    },

    leadsAssignedCount: {
      type: Number,
      default: 0,
    },

    lastAssignedAt: {
      type: Date,
    },

    maxActiveLeads: {
      type: Number,
      default: 50,
    },

    phoneExtension: {
      type: String,
      trim: true,
    },

    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

export const SalesTeamMember =
  mongoose.models.SalesTeamMember || mongoose.model('SalesTeamMember', SalesTeamMemberSchema);

export default SalesTeamMember;
