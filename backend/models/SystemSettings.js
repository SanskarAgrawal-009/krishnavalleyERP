import mongoose from 'mongoose';

const SystemSettingsSchema = new mongoose.Schema(
  {
    singletonKey: {
      type: String,
      default: 'GLOBAL_ERP_SETTINGS',
      unique: true,
      index: true,
    },

    // 1. Company Profile & Legal Details
    company: {
      companyName: {
        type: String,
        default: 'Krishna Valley Infrastructure & Developers Pvt. Ltd.',
        trim: true,
      },
      legalName: {
        type: String,
        default: 'Krishna Valley Realty & Hospitality Private Limited',
        trim: true,
      },
      brandName: {
        type: String,
        default: 'Krishna Valley',
        trim: true,
      },
      cin: {
        type: String,
        default: 'U45200UP2021PTC148900',
        trim: true,
      },
      gstin: {
        type: String,
        default: '09AAACK9876Q1Z5',
        trim: true,
      },
      pan: {
        type: String,
        default: 'AAACK9876Q',
        trim: true,
      },
      tan: {
        type: String,
        default: 'KNPK12345D',
        trim: true,
      },
      reraNumber: {
        type: String,
        default: 'UPRERAPRJ876543/12/2026',
        trim: true,
      },
      logoUrl: {
        type: String,
        default: '',
      },
      address: {
        addressLine1: { type: String, default: 'Krishna Valley Heights, Near NH-19' },
        addressLine2: { type: String, default: 'Chhatikara-Vrindavan Road' },
        city: { type: String, default: 'Mathura - Vrindavan' },
        state: { type: String, default: 'Uttar Pradesh' },
        pincode: { type: String, default: '281121' },
        country: { type: String, default: 'India' },
      },
      contact: {
        supportEmail: { type: String, default: 'support@krishnavalley.com' },
        accountsEmail: { type: String, default: 'accounts@krishnavalley.com' },
        salesEmail: { type: String, default: 'sales@krishnavalley.com' },
        phone: { type: String, default: '+91 98765 43210' },
        tollFree: { type: String, default: '1800-120-KV-ERP' },
        website: { type: String, default: 'https://krishnavalley.com' },
      },
      bankDetails: {
        bankName: { type: String, default: 'HDFC Bank Ltd.' },
        accountHolderName: { type: String, default: 'Krishna Valley Escrow Account' },
        accountNumber: { type: String, default: '50200088997766' },
        ifscCode: { type: String, default: 'HDFC0001234' },
        branchName: { type: String, default: 'Vrindavan Main Branch' },
        upiId: { type: String, default: 'krishnavalley@hdfcbank' },
      },
    },

    // 2. Financial Year Configuration
    financialYear: {
      activeFY: {
        type: String,
        default: '2025-2026',
      },
      startDate: {
        type: Date,
        default: () => new Date('2025-04-01'),
      },
      endDate: {
        type: Date,
        default: () => new Date('2026-03-31'),
      },
      fyList: [
        {
          fyCode: { type: String, required: true },
          label: { type: String, required: true },
          startDate: { type: Date, required: true },
          endDate: { type: Date, required: true },
          isLocked: { type: Boolean, default: false },
          isDefault: { type: Boolean, default: false },
        },
      ],
      sequencePrefixes: {
        invoicePrefix: { type: String, default: 'KV-INV-' },
        receiptPrefix: { type: String, default: 'KV-REC-' },
        demandLetterPrefix: { type: String, default: 'KV-DL-' },
        bookingPrefix: { type: String, default: 'KV-BK-' },
        agreementPrefix: { type: String, default: 'KV-AGR-' },
        maintenancePrefix: { type: String, default: 'KV-MAINT-' },
      },
    },

    // 3. Taxes (GST & TDS)
    taxes: {
      gstEnabled: {
        type: Boolean,
        default: true,
      },
      defaultGSTRate: {
        type: Number,
        default: 5, // 5% for residential housing
      },
      gstSlabs: [
        {
          label: { type: String, required: true },
          rate: { type: Number, required: true },
          cgst: { type: Number, required: true },
          sgst: { type: Number, required: true },
          igst: { type: Number, required: true },
          description: { type: String },
        },
      ],
      tdsRules: [
        {
          section: { type: String, required: true },
          label: { type: String, required: true },
          rate: { type: Number, required: true },
          threshold: { type: Number, default: 0 },
          description: { type: String },
        },
      ],
    },

    // 4. Payment Gateway Settings
    paymentGateway: {
      activeGateway: {
        type: String,
        enum: ['razorpay', 'payu', 'cashfree', 'stripe', 'offline'],
        default: 'razorpay',
      },
      environment: {
        type: String,
        enum: ['test', 'live'],
        default: 'test',
      },
      razorpay: {
        keyId: { type: String, default: 'rzp_test_KV9876543210' },
        keySecret: { type: String, default: 'secret_KV_test_key_sample' },
        webhookSecret: { type: String, default: 'whsec_KV_sample' },
        isEnabled: { type: Boolean, default: true },
      },
      payu: {
        merchantKey: { type: String, default: '' },
        merchantSalt: { type: String, default: '' },
        isEnabled: { type: Boolean, default: false },
      },
      cashfree: {
        appId: { type: String, default: '' },
        secretKey: { type: String, default: '' },
        isEnabled: { type: Boolean, default: false },
      },
      stripe: {
        publishableKey: { type: String, default: '' },
        secretKey: { type: String, default: '' },
        webhookSecret: { type: String, default: '' },
        isEnabled: { type: Boolean, default: false },
      },
      upi: {
        vpa: { type: String, default: 'krishnavalley@hdfcbank' },
        qrCodeUrl: { type: String, default: '' },
        isEnabled: { type: Boolean, default: true },
      },
    },

    // 5. Email (SMTP Configuration)
    email: {
      provider: {
        type: String,
        enum: ['smtp', 'sendgrid', 'ses'],
        default: 'smtp',
      },
      smtp: {
        host: { type: String, default: 'smtp.gmail.com' },
        port: { type: Number, default: 587 },
        secure: { type: Boolean, default: false },
        user: { type: String, default: 'notifications@krishnavalley.com' },
        pass: { type: String, default: '••••••••••••••••' },
        fromEmail: { type: String, default: 'notifications@krishnavalley.com' },
        fromName: { type: String, default: 'Krishna Valley ERP' },
      },
      testStatus: {
        lastTestedAt: { type: Date },
        isWorking: { type: Boolean, default: true },
        lastError: { type: String, default: '' },
      },
    },

    // 6. WhatsApp Cloud API Configuration
    whatsappApi: {
      provider: {
        type: String,
        enum: ['cloud_api', 'wati', 'twilio', 'gupshup'],
        default: 'cloud_api',
      },
      cloudApi: {
        phoneNumberId: { type: String, default: '109876543210987' },
        wabaId: { type: String, default: '209876543210987' },
        accessToken: { type: String, default: 'EAAGsample_token_KV_whatsapp_meta' },
        webhookToken: { type: String, default: 'krishna_valley_wa_verify_2026' },
        isEnabled: { type: Boolean, default: true },
      },
      wati: {
        apiUrl: { type: String, default: '' },
        accessToken: { type: String, default: '' },
        isEnabled: { type: Boolean, default: false },
      },
      twilio: {
        accountSid: { type: String, default: '' },
        authToken: { type: String, default: '' },
        fromNumber: { type: String, default: '' },
        isEnabled: { type: Boolean, default: false },
      },
      status: {
        isConnected: { type: Boolean, default: true },
        lastVerifiedAt: { type: Date, default: Date.now },
      },
    },

    // 7. Backup & Recovery
    backup: {
      autoBackupEnabled: {
        type: Boolean,
        default: true,
      },
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
        default: 'daily',
      },
      storageTarget: {
        type: String,
        enum: ['local', 's3', 'cloud'],
        default: 'cloud',
      },
      s3Config: {
        bucketName: { type: String, default: 'krishna-valley-backups' },
        region: { type: String, default: 'ap-south-1' },
        pathPrefix: { type: String, default: 'mongodb-snapshots/' },
      },
      lastBackupAt: {
        type: Date,
        default: Date.now,
      },
      backupHistory: [
        {
          backupId: { type: String, required: true },
          filename: { type: String, required: true },
          timestamp: { type: Date, default: Date.now },
          sizeBytes: { type: Number, default: 0 },
          totalRecords: { type: Number, default: 0 },
          status: { type: String, default: 'completed' },
          triggeredBy: { type: String, default: 'System Automated' },
          collectionsBackedUp: [{ type: String }],
        },
      ],
    },

    // 8. System Preferences & Global Policies
    systemPreferences: {
      currency: {
        code: { type: String, default: 'INR' },
        symbol: { type: String, default: '₹' },
        locale: { type: String, default: 'en-IN' },
      },
      dateFormat: {
        type: String,
        default: 'DD/MM/YYYY',
      },
      timeZone: {
        type: String,
        default: 'Asia/Kolkata',
      },
      defaultBranch: {
        type: String,
        default: 'Vrindavan Campus',
      },
      agentMaturityWindowDays: {
        type: Number,
        default: 5, // 5-day agent exclusive conversion window before auto-handover
      },
      autoAssignLeads: {
        type: Boolean,
        default: true,
      },
      sessionTimeoutMinutes: {
        type: Number,
        default: 60,
      },
      auditLoggingEnabled: {
        type: Boolean,
        default: true,
      },
      maintenanceMode: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  }
);

export const SystemSettings =
  mongoose.models.SystemSettings || mongoose.model('SystemSettings', SystemSettingsSchema);
export default SystemSettings;
