import mongoose from 'mongoose';

const reminderTemplateSchema = new mongoose.Schema(
  {
    templateName: {
      type: String,
      required: true,
      trim: true
    },
    templateCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    category: {
      type: String,
      enum: ['Billing & Payments', 'CRM & Leads', 'Rentals & Leases', 'Maintenance', 'HR & Payroll', 'Sales & Allotments', 'General Announcement'],
      default: 'Billing & Payments'
    },
    description: {
      type: String,
      default: ''
    },
    isActive: {
      type: Boolean,
      default: true
    },
    // Available variables list for reference (e.g. ['client_name', 'amount', 'due_date'])
    variables: [{
      type: String
    }],

    // Multi-channel enabled flags for this specific template
    channels: {
      whatsapp: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },

    // ================= WHATSAPP SPECIFIC CONTENT =================
    whatsappContent: {
      templateName: { type: String, default: '' }, // Meta approved template name
      language: { type: String, default: 'en_US' },
      headerText: { type: String, default: '' },
      bodyText: { type: String, default: '' },
      footerText: { type: String, default: 'Krishna Valley Real Estate ERP' },
      buttonText: { type: String, default: 'View Details' },
      buttonUrl: { type: String, default: '' }
    },

    // ================= SMS SPECIFIC CONTENT =================
    smsContent: {
      bodyText: { type: String, default: '' },
      dltTemplateId: { type: String, default: '' } // 19-digit DLT approved ID
    },

    // ================= EMAIL SPECIFIC CONTENT =================
    emailContent: {
      subject: { type: String, default: '' },
      preheader: { type: String, default: '' },
      bodyHtml: { type: String, default: '' }
    },

    // ================= PUSH NOTIFICATION SPECIFIC CONTENT =================
    pushContent: {
      title: { type: String, default: '' },
      bodyText: { type: String, default: '' },
      actionUrl: { type: String, default: '' },
      icon: { type: String, default: '/favicon.ico' }
    }
  },
  { timestamps: true }
);

const ReminderTemplate = mongoose.model('ReminderTemplate', reminderTemplateSchema);
export default ReminderTemplate;
