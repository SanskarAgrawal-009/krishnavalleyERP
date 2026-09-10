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

    // ================= EMAIL (RESEND, SMTP & CLOUD) CONFIGURATION =================
    email: {
      enabled: { type: Boolean, default: true },
      provider: {
        type: String,
        enum: ['resend', 'brevo', 'smtp', 'sendgrid', 'aws_ses', 'mailgun', 'gmail'],
        default: 'resend'
      },
      apiKey: { type: String, default: '' }, // Resend API Key (re_...)
      smtpHost: { type: String, default: 'smtp.resend.com' },
      smtpPort: { type: Number, default: 465 },
      secure: { type: Boolean, default: true }, // true for 465, false for 587
      smtpUser: { type: String, default: 'resend' },
      smtpPassword: { type: String, default: '' },
      fromEmail: { type: String, default: 'onboarding@resend.dev' },
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

    // ================= TELEPHONY & CALLING API CONFIGURATION =================
    telephony: {
      enabled: { type: Boolean, default: true },
      provider: {
        type: String,
        enum: ['twilio', 'exotel', 'browser_dialer', 'simulated'],
        default: 'browser_dialer'
      },
      // Twilio Voice API credentials
      twilioAccountSid: { type: String, default: '' },
      twilioAuthToken: { type: String, default: '' },
      twilioCallerId: { type: String, default: '+91 98765 43210' }, // Registered caller ID / virtual number
      // Exotel Cloud Telephony credentials
      exotelApiKey: { type: String, default: '' },
      exotelApiToken: { type: String, default: '' },
      exotelSubdomain: { type: String, default: 'api.exotel.com' },
      exotelCallerId: { type: String, default: '08088997766' },
      recordCalls: { type: Boolean, default: false },
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
    },

    // ================= GOOGLE CALENDAR DIRECT FOLLOW-UP MAPPING =================
    googleCalendar: {
      enabled: { type: Boolean, default: false },
      calendarId: { type: String, default: 'primary' },
      authType: {
        type: String,
        enum: ['service_account', 'oauth2'],
        default: 'service_account'
      },
      // Service Account Credentials
      clientEmail: { type: String, default: '' },
      privateKey: { type: String, default: '' },
      // OAuth2 alternative credentials
      clientId: { type: String, default: '' },
      clientSecret: { type: String, default: '' },
      refreshToken: { type: String, default: '' },
      // Sync & Timing Settings
      timeZone: { type: String, default: 'Asia/Kolkata' },
      autoSyncLeads: { type: Boolean, default: true },
      autoSyncSiteVisits: { type: Boolean, default: true },
      reminderMinutesBefore: { type: Number, default: 30 },
      lastSyncAt: { type: Date, default: null },
      syncStatus: {
        type: String,
        enum: ['ready', 'not_configured', 'error'],
        default: 'not_configured'
      },
      lastSyncSummary: {
        totalSynced: { type: Number, default: 0 },
        failedCount: { type: Number, default: 0 },
        message: { type: String, default: '' }
      }
    }
  },
  { timestamps: true }
);

const NotificationConfig = mongoose.model('NotificationConfig', notificationConfigSchema);
export default NotificationConfig;
