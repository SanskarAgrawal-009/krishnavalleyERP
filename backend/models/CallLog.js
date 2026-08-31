import mongoose from 'mongoose';

const callLogSchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      index: true
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      index: true
    },
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    clientName: {
      type: String,
      trim: true,
      default: 'Unknown Client'
    },
    clientPhone: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    agentPhone: {
      type: String,
      trim: true
    },
    direction: {
      type: String,
      enum: ['outbound', 'inbound'],
      default: 'outbound'
    },
    provider: {
      type: String,
      enum: ['twilio', 'exotel', 'browser_dialer', 'simulated'],
      default: 'browser_dialer'
    },
    callSid: {
      type: String,
      index: true
    },
    callStatus: {
      type: String,
      enum: [
        'initiated',
        'ringing',
        'in_progress',
        'completed',
        'busy',
        'no_answer',
        'failed',
        'cancelled'
      ],
      default: 'initiated'
    },
    durationSeconds: {
      type: Number,
      default: 0
    },
    outcome: {
      type: String,
      enum: [
        'interested',
        'interested_site_visit',
        'interested_followup',
        'not_interested',
        'ringing_unanswered',
        'busy',
        'not_reachable',
        'wrong_number',
        'callback_requested',
        'general_discussion',
        'other'
      ],
      default: 'general_discussion'
    },
    notes: {
      type: String,
      trim: true
    },
    recordingUrl: {
      type: String,
      trim: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

callLogSchema.index({ createdAt: -1 });

export const CallLog = mongoose.models.CallLog || mongoose.model('CallLog', callLogSchema);
export default CallLog;
