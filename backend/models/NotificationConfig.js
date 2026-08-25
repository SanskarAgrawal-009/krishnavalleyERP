import mongoose from 'mongoose';

const notificationConfigSchema = new mongoose.Schema(
  {
    // ================= WHATSAPP CONFIGURATION =================
    whatsapp: {
      enabled: { type: Boolean, default: true },
      provider: {
        type: String,
        enum: ['meta_cloud', 'twilio', 'interakt', 'aisensy', 'custom_webhook'],
        default: 'meta_cloud'
      },
      // Meta Cloud API / Provider Credentials
      apiKey: { type: String, default: '' },
      phoneNumberId: { type: String, default: '' },
      businessAccountId: { type: String, default: '' },
      senderNumber: { type: String, default: '+91 98765 43210' },
      webhookVerifyToken: { type: String, default: 'kv_whatsapp_secret_token' },
      webhookCallbackUrl: { type: String, default: 'https://api.krishnavalley.com/api/notifications/whatsapp/webhook' },
      defaultLanguage: { type: String, default: 'en_US' },
      environment: {
        type: String,
        enum: ['sandbox', 'production'],
        default: 'sandbox'
      }
    },

    // ================= SMS CONFIGURATION =================
    sms: {
      enabled: { type: Boolean, default: true },
      provider: {
        type: String,
        enum: ['fast2sms', 'twilio', 'msg91', 'textlocal', 'custom_http'],
        default: 'msg91'
      },
      apiKey: { type: String, default: '' },
      senderId: { type: String, default: 'KVALEY' }, // 6-character registered header
      entityId: { type: String, default: '1401552800000012345' }, // DLT Principal Entity ID
      route: {
        type: String,
        enum: ['transactional', 'promotional', 'service_implicit', 'service_explicit'],
        default: 'service_implicit'
      },
      customGatewayUrl: { type: String, default: '' },
      environment: {
        type: String,
        enum: ['sandbox', 'production'],
        default: 'sandbox'
      }
    },

    // ================= EMAIL (SMTP & CLOUD) CONFIGURATION =================
    email: {
      enabled: { type: Boolean, default: true },
      provider: {
        type: String,
        enum: ['smtp', 'sendgrid', 'aws_ses', 'mailgun', 'gmail'],
        default: 'smtp'
      },
      smtpHost: { type: String, default: 'smtp.gmail.com' },
      smtpPort: { type: Number, default: 587 },
      secure: { type: Boolean, default: false }, // true for 465, false for 587
      smtpUser: { type: String, default: 'notifications@krishnavalley.com' },
      smtpPassword: { type: String, default: '' },
      fromEmail: { type: String, default: 'no-reply@krishnavalley.com' },
      fromName: { type: String, default: 'Krishna Valley ERP' },
      replyTo: { type: String, default: 'support@krishnavalley.com' },
      environment: {
        type: String,
        enum: ['sandbox', 'production'],
        default: 'sandbox'
      }
    },

    // ================= PUSH NOTIFICATION CONFIGURATION =================
    push: {
      enabled: { type: Boolean, default: true },
      provider: {
        type: String,
        enum: ['web_push', 'firebase_fcm', 'onesignal'],
        default: 'web_push'
      },
      // Web Push VAPID keys
      vapidPublicKey: {
        type: String,
        default: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSPOSnfEsEdXVwt3rSKEFi44zUW5L8_WCWAE'
      },
      vapidPrivateKey: {
        type: String,
        default: 'eX9Yk1wZ2J3K4L5M6N7O8P9Q0R1S2T3U4V5W6X7Y8Z9'
      },
      vapidSubject: { type: String, default: 'mailto:admin@krishnavalley.com' },
      // Firebase Cloud Messaging
      fcmServerKey: { type: String, default: '' },
      fcmProjectId: { type: String, default: 'krishna-valley-erp' },
      environment: {
        type: String,
        enum: ['sandbox', 'production'],
        default: 'sandbox'
      }
    },

    // ================= GENERAL NOTIFICATION POLICIES =================
    general: {
      dailySummaryTime: { type: String, default: '09:00' },
      autoPaymentReminders: { type: Boolean, default: true },
      reminderDaysBeforeDue: { type: [Number], default: [7, 3, 1] },
      overdueReminderIntervalDays: { type: Number, default: 3 },
      quietHoursEnabled: { type: Boolean, default: true },
      quietHoursStart: { type: String, default: '21:00' },
      quietHoursEnd: { type: String, default: '08:00' }
    }
  },
  { timestamps: true }
);

const NotificationConfig = mongoose.model('NotificationConfig', notificationConfigSchema);
export default NotificationConfig;
