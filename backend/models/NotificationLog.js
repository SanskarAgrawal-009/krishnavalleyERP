import mongoose from 'mongoose';

const notificationLogSchema = new mongoose.Schema(
  {
    channel: {
      type: String,
      enum: ['whatsapp', 'sms', 'email', 'push'],
      required: true
    },
    recipient: {
      type: String,
      required: true
    },
    recipientName: {
      type: String,
      default: ''
    },
    templateCode: {
      type: String,
      default: 'MANUAL_TEST'
    },
    subject: {
      type: String,
      default: ''
    },
    contentPreview: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'failed', 'queued'],
      default: 'sent'
    },
    provider: {
      type: String,
      default: ''
    },
    responseDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    errorMessage: {
      type: String,
      default: ''
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

const NotificationLog = mongoose.model('NotificationLog', notificationLogSchema);
export default NotificationLog;
