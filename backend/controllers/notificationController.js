import NotificationConfig from '../models/NotificationConfig.js';
import ReminderTemplate from '../models/ReminderTemplate.js';
import NotificationLog from '../models/NotificationLog.js';
import { escapeRegex } from '../utils/regexUtil.js';
import {
  getOrInitConfig,
  sendWhatsApp,
  sendSMS,
  sendEmail,
  sendPush,
  substituteVariables
} from '../services/notificationDispatcher.js';
import { verifySmtpConnection } from '../services/emailService.js';
import { verifyMetaWebhook, handleMetaStatusWebhook } from '../services/whatsappService.js';

// Default professional real estate templates
const DEFAULT_TEMPLATES = [
  {
    templateName: 'Payment Milestone Due Notice',
    templateCode: 'PAYMENT_MILESTONE_DUE',
    category: 'Billing & Payments',
    description: 'Automated notice sent to buyers before an upcoming construction milestone payment.',
    isActive: true,
    variables: ['client_name', 'project_name', 'unit_number', 'amount', 'due_date', 'payment_link', 'milestone_name'],
    channels: { whatsapp: true, sms: true, email: true, push: true },
    whatsappContent: {
      templateName: 'kv_payment_due_v1',
      language: 'en_US',
      headerText: 'Krishna Valley • Payment Notice',
      bodyText: 'Dear {{client_name}},\n\nThis is a friendly reminder that payment of ₹{{amount}} for the milestone *{{milestone_name}}* on Flat *{{unit_number}}* at *{{project_name}}* is due on *{{due_date}}*.\n\nPlease complete the payment online to maintain construction milestone schedules:\n{{payment_link}}\n\nFor any queries, contact your relationship manager.',
      footerText: 'Krishna Valley Real Estate ERP',
      buttonText: 'Pay Online Now',
      buttonUrl: '{{payment_link}}'
    },
    smsContent: {
      bodyText: 'KV-ERP: Dear {{client_name}}, milestone payment of Rs.{{amount}} for Flat {{unit_number}}, {{project_name}} is due on {{due_date}}. Pay online: {{payment_link}}',
      dltTemplateId: '1407161528990012345'
    },
    emailContent: {
      subject: 'Payment Reminder: Milestone Due for Unit {{unit_number}} - {{project_name}}',
      preheader: 'Payment of ₹{{amount}} due on {{due_date}}',
      bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h2 style="color: #0f766e; margin: 0;">KRISHNA VALLEY REAL ESTATE</h2>
    <p style="color: #6b7280; font-size: 13px; margin-top: 4px;">Milestone Payment Notification</p>
  </div>
  <p>Dear <strong>{{client_name}}</strong>,</p>
  <p>We are pleased to share that progress on <strong>{{project_name}}</strong> is advancing swiftly. The milestone <strong>{{milestone_name}}</strong> has been reached for your unit <strong>{{unit_number}}</strong>.</p>
  <div style="background: #f0fdfa; border-left: 4px solid #14b8a6; padding: 16px; margin: 20px 0; border-radius: 4px;">
    <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Amount Due:</strong> ₹{{amount}}</p>
    <p style="margin: 0; font-size: 14px;"><strong>Due Date:</strong> {{due_date}}</p>
  </div>
  <p style="text-align: center; margin: 30px 0;">
    <a href="{{payment_link}}" style="background: #0d9488; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Pay Milestone Online</a>
  </p>
  <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">Thank you for your valued partnership.<br>Warm regards,<br><strong>Krishna Valley Accounts Team</strong></p>
</div>`
    },
    pushContent: {
      title: 'Payment Due Notice • Flat {{unit_number}}',
      bodyText: '₹{{amount}} is due on {{due_date}} for {{project_name}} ({{milestone_name}}).',
      actionUrl: '/sales',
      icon: '/favicon.ico'
    }
  },
  {
    templateName: 'Rental Payment Overdue Alert',
    templateCode: 'RENT_OVERDUE_ALERT',
    category: 'Rentals & Leases',
    description: 'Urgent notification triggered when monthly tenant rent is past the grace period.',
    isActive: true,
    variables: ['client_name', 'unit_number', 'project_name', 'amount', 'penalty_amount', 'due_date', 'payment_link'],
    channels: { whatsapp: true, sms: true, email: true, push: true },
    whatsappContent: {
      templateName: 'kv_rent_overdue_v1',
      language: 'en_US',
      headerText: 'URGENT: Rent Overdue Notice',
      bodyText: 'Dear {{client_name}},\n\nYour monthly rental dues of ₹{{amount}} for Unit *{{unit_number}}* at *{{project_name}}* were due on *{{due_date}}* and are now overdue.\n\nA late penalty fee of ₹{{penalty_amount}} has been applied. Please clear the pending balance immediately to avoid lease violations:\n{{payment_link}}',
      footerText: 'Krishna Valley Property Management',
      buttonText: 'Pay Pending Rent',
      buttonUrl: '{{payment_link}}'
    },
    smsContent: {
      bodyText: 'KV-ERP URGENT: Rent of Rs.{{amount}} for Unit {{unit_number}} is overdue since {{due_date}}. Penalty Rs.{{penalty_amount}} applies. Pay now: {{payment_link}}',
      dltTemplateId: '1407161528990012346'
    },
    emailContent: {
      subject: 'URGENT: Rental Payment Overdue for Unit {{unit_number}} - {{project_name}}',
      preheader: 'Immediate payment required for Unit {{unit_number}}',
      bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #fff; border: 1px solid #fee2e2; border-radius: 8px;">
  <h2 style="color: #dc2626; margin-top: 0;">Notice of Overdue Rent</h2>
  <p>Dear <strong>{{client_name}}</strong>,</p>
  <p>This is a formal notice that your rent for <strong>Unit {{unit_number}} ({{project_name}})</strong> was due on <strong>{{due_date}}</strong> and remains unpaid.</p>
  <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 16px; margin: 18px 0;">
    <p style="margin: 0 0 6px 0; color: #991b1b;"><strong>Base Rent:</strong> ₹{{amount}}</p>
    <p style="margin: 0 0 6px 0; color: #991b1b;"><strong>Late Penalty:</strong> ₹{{penalty_amount}}</p>
    <p style="margin: 0; font-weight: bold; color: #7f1d1d;"><strong>Total Outstanding:</strong> ₹{{amount}} + ₹{{penalty_amount}}</p>
  </div>
  <p style="text-align: center; margin: 24px 0;">
    <a href="{{payment_link}}" style="background: #dc2626; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Clear Overdue Balance</a>
  </p>
</div>`
    },
    pushContent: {
      title: 'Rent Overdue Alert • Unit {{unit_number}}',
      bodyText: 'Monthly rent of ₹{{amount}} is overdue. Please settle balance immediately.',
      actionUrl: '/rentals',
      icon: '/favicon.ico'
    }
  },
  {
    templateName: 'CRM Lead Follow-Up Scheduled',
    templateCode: 'LEAD_FOLLOWUP_SCHEDULED',
    category: 'CRM & Leads',
    description: 'Confirmation sent to prospective clients and sales agents before a scheduled meeting or call.',
    isActive: true,
    variables: ['client_name', 'project_name', 'rm_name', 'scheduled_time', 'date', 'contact_number'],
    channels: { whatsapp: true, sms: true, email: true, push: true },
    whatsappContent: {
      templateName: 'kv_lead_followup_v1',
      language: 'en_US',
      headerText: 'Krishna Valley • Meeting Scheduled',
      bodyText: 'Namaste {{client_name}}! 🙏\n\nYour consultation regarding *{{project_name}}* is scheduled for *{{date}}* at *{{scheduled_time}}*.\n\nYour dedicated Relationship Manager is *{{rm_name}}* (📞 {{contact_number}}).\n\nWe look forward to showcasing our luxury residences.',
      footerText: 'Krishna Valley Sales Gallery',
      buttonText: 'View Property Brochure',
      buttonUrl: 'https://krishnavalley.com/brochures/{{project_name}}'
    },
    smsContent: {
      bodyText: 'KV-ERP: Hello {{client_name}}, your meeting for {{project_name}} is confirmed for {{date}} at {{scheduled_time}} with {{rm_name}} (Ph: {{contact_number}}).',
      dltTemplateId: '1407161528990012347'
    },
    emailContent: {
      subject: 'Confirmed: Meeting with Krishna Valley for {{project_name}} on {{date}}',
      preheader: 'Your consultation is confirmed for {{date}} at {{scheduled_time}}',
      bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px;">
  <h2 style="color: #0f766e; margin-top: 0;">Consultation Confirmed</h2>
  <p>Dear <strong>{{client_name}}</strong>,</p>
  <p>Thank you for your interest in <strong>{{project_name}}</strong>. Your meeting has been confirmed with our team.</p>
  <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 14px; margin: 16px 0;">
    <p style="margin: 0 0 6px 0;"><strong>Date & Time:</strong> {{date}} at {{scheduled_time}}</p>
    <p style="margin: 0;"><strong>Relationship Manager:</strong> {{rm_name}} ({{contact_number}})</p>
  </div>
  <p>We look forward to welcoming you!</p>
</div>`
    },
    pushContent: {
      title: 'Upcoming Client Meeting',
      bodyText: 'Meeting with {{client_name}} on {{date}} at {{scheduled_time}} for {{project_name}}.',
      actionUrl: '/crm',
      icon: '/favicon.ico'
    }
  },
  {
    templateName: 'Site Visit Confirmation & Directions',
    templateCode: 'SITE_VISIT_CONFIRMED',
    category: 'CRM & Leads',
    description: 'Sent to customers who booked a site tour with location link and chauffeur details.',
    isActive: true,
    variables: ['client_name', 'project_name', 'date', 'time', 'location_link', 'driver_name', 'driver_phone'],
    channels: { whatsapp: true, sms: true, email: true, push: false },
    whatsappContent: {
      templateName: 'kv_site_visit_v1',
      language: 'en_US',
      headerText: 'Krishna Valley Site Visit',
      bodyText: 'Dear {{client_name}},\n\nYour site visit to *{{project_name}}* is scheduled for *{{date}}* at *{{time}}*.\n\n📍 *Site Location Map:* {{location_link}}\n🚗 *Chauffeur Pick-up:* {{driver_name}} (📞 {{driver_phone}})\n\nPlease reach out if you need to reschedule.',
      footerText: 'Krishna Valley Concierge',
      buttonText: 'Open in Google Maps',
      buttonUrl: '{{location_link}}'
    },
    smsContent: {
      bodyText: 'KV-ERP: Site visit for {{project_name}} is confirmed for {{date}} at {{time}}. Map link: {{location_link}}. Helpdesk: +919876543210',
      dltTemplateId: '1407161528990012348'
    },
    emailContent: {
      subject: 'Confirmed: Site Tour of {{project_name}} on {{date}}',
      preheader: 'Your site visit schedule and directions',
      bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px;">
  <h2 style="color: #0f766e; margin-top: 0;">Site Visit Confirmed</h2>
  <p>Dear <strong>{{client_name}}</strong>,</p>
  <p>We are delighted to host you for an exclusive walkthrough of <strong>{{project_name}}</strong>.</p>
  <p><strong>Date:</strong> {{date}}<br><strong>Time:</strong> {{time}}<br><strong>Location:</strong> <a href="{{location_link}}">View on Google Maps</a></p>
</div>`
    },
    pushContent: {
      title: 'Site Visit Confirmed',
      bodyText: 'Site tour booked for {{project_name}} on {{date}} at {{time}}.',
      actionUrl: '/crm',
      icon: '/favicon.ico'
    }
  },
  {
    templateName: 'Maintenance Ticket Status Resolution',
    templateCode: 'MAINTENANCE_STATUS_UPDATE',
    category: 'Maintenance',
    description: 'Sent to resident when their complaint or maintenance request status changes.',
    isActive: true,
    variables: ['client_name', 'ticket_id', 'unit_number', 'status', 'technician_name', 'resolution_notes'],
    channels: { whatsapp: true, sms: true, email: true, push: true },
    whatsappContent: {
      templateName: 'kv_maint_update_v1',
      language: 'en_US',
      headerText: 'Maintenance Ticket Update',
      bodyText: 'Dear {{client_name}},\n\nUpdate on Service Request *#{{ticket_id}}* for Unit *{{unit_number}}*:\n\n• Current Status: *{{status}}*\n• Technician: {{technician_name}}\n• Remarks: {{resolution_notes}}\n\nThank you for choosing Krishna Valley Property Care.',
      footerText: 'Krishna Valley Facilities Management',
      buttonText: 'View Service Ticket',
      buttonUrl: 'https://krishnavalley.com/maintenance/ticket/{{ticket_id}}'
    },
    smsContent: {
      bodyText: 'KV-ERP: Ticket #{{ticket_id}} for Unit {{unit_number}} is now {{status}}. Assigned to {{technician_name}}.',
      dltTemplateId: '1407161528990012349'
    },
    emailContent: {
      subject: 'Service Ticket #{{ticket_id}} Status: {{status}} (Unit {{unit_number}})',
      preheader: 'Your maintenance request is now {{status}}',
      bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px;">
  <h2 style="color: #f59e0b; margin-top: 0;">Maintenance Request #{{ticket_id}}</h2>
  <p>Dear <strong>{{client_name}}</strong>,</p>
  <p>Your maintenance request for <strong>Unit {{unit_number}}</strong> has been updated to <strong>{{status}}</strong>.</p>
  <p><strong>Technician:</strong> {{technician_name}}<br><strong>Resolution Notes:</strong> {{resolution_notes}}</p>
</div>`
    },
    pushContent: {
      title: 'Ticket #{{ticket_id}} • {{status}}',
      bodyText: 'Maintenance request for Unit {{unit_number}} marked as {{status}}.',
      actionUrl: '/maintenance',
      icon: '/favicon.ico'
    }
  },
  {
    templateName: 'Allotment Letter Issued & Ready',
    templateCode: 'ALLOTMENT_LETTER_READY',
    category: 'Sales & Allotments',
    description: 'Sent to buyer immediately upon flat booking confirmation and digital allotment generation.',
    isActive: true,
    variables: ['client_name', 'project_name', 'unit_number', 'allotment_date', 'download_link'],
    channels: { whatsapp: true, sms: true, email: true, push: true },
    whatsappContent: {
      templateName: 'kv_allotment_v1',
      language: 'en_US',
      headerText: '🎉 Congratulations on Your New Home!',
      bodyText: 'Dear {{client_name}},\n\nCongratulations! Your official Allotment Letter for Flat *{{unit_number}}* at *{{project_name}}* has been issued on *{{allotment_date}}*.\n\nDownload your digitally verified Allotment Letter:\n{{download_link}}\n\nWelcome to the Krishna Valley family! 🏡',
      footerText: 'Krishna Valley Real Estate',
      buttonText: 'Download Allotment Letter',
      buttonUrl: '{{download_link}}'
    },
    smsContent: {
      bodyText: 'KV-ERP: Congratulations {{client_name}}! Allotment letter for Unit {{unit_number}}, {{project_name}} is ready: {{download_link}}',
      dltTemplateId: '1407161528990012350'
    },
    emailContent: {
      subject: 'Congratulations! Allotment Letter for Unit {{unit_number}} - {{project_name}}',
      preheader: 'Your official allotment letter is ready for download',
      bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #fff; border: 1px solid #10b981; border-radius: 8px;">
  <h2 style="color: #047857; margin-top: 0;">Welcome to Krishna Valley! 🏡</h2>
  <p>Dear <strong>{{client_name}}</strong>,</p>
  <p>We are delighted to confirm that Flat <strong>{{unit_number}}</strong> at <strong>{{project_name}}</strong> has been allotted to you on <strong>{{allotment_date}}</strong>.</p>
  <p style="text-align: center; margin: 24px 0;">
    <a href="{{download_link}}" style="background: #059669; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Download Allotment Letter</a>
  </p>
</div>`
    },
    pushContent: {
      title: 'Allotment Letter Issued! 🎉',
      bodyText: 'Unit {{unit_number}} at {{project_name}} is officially allotted.',
      actionUrl: '/sales',
      icon: '/favicon.ico'
    }
  },
  {
    templateName: 'Monthly Staff Salary Payslip Release',
    templateCode: 'SALARY_PAYSLIP_RELEASED',
    category: 'HR & Payroll',
    description: 'Notification to employees when monthly payroll has been processed.',
    isActive: true,
    variables: ['client_name', 'month_year', 'net_salary', 'portal_link'],
    channels: { whatsapp: true, sms: true, email: true, push: true },
    whatsappContent: {
      templateName: 'kv_payslip_v1',
      language: 'en_US',
      headerText: 'Krishna Valley HR & Payroll',
      bodyText: 'Hello {{client_name}},\n\nYour salary payslip for *{{month_year}}* has been processed.\n\n• Net Salary Credited: ₹{{net_salary}}\n\nAccess detailed tax breakdown & payslip:\n{{portal_link}}',
      footerText: 'Krishna Valley HR Department',
      buttonText: 'View Payslip',
      buttonUrl: '{{portal_link}}'
    },
    smsContent: {
      bodyText: 'KV-ERP HR: Payslip for {{month_year}} generated for Net Rs.{{net_salary}}. Check portal: {{portal_link}}',
      dltTemplateId: '1407161528990012351'
    },
    emailContent: {
      subject: 'Salary Slip for the Month of {{month_year}}',
      preheader: 'Your monthly payslip is ready',
      bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px;">
  <h2 style="color: #ec4899; margin-top: 0;">Krishna Valley HR Portal</h2>
  <p>Dear <strong>{{client_name}}</strong>,</p>
  <p>Your payslip for <strong>{{month_year}}</strong> has been generated with Net Salary: <strong>₹{{net_salary}}</strong>.</p>
</div>`
    },
    pushContent: {
      title: 'Payslip Released',
      bodyText: 'Salary for {{month_year}} processed. Net: ₹{{net_salary}}.',
      actionUrl: '/hr',
      icon: '/favicon.ico'
    }
  }
];

// ================= CONFIGURATION CONTROLLERS =================

// Get active configuration (initializes with defaults if none exists)
export const getNotificationConfig = async (req, res) => {
  try {
    const config = await getOrInitConfig();
    return res.json({ success: true, data: config });
  } catch (error) {
    console.error('Error fetching notification config:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update active configuration
export const updateNotificationConfig = async (req, res) => {
  try {
    const payload = req.body;
    let config = await NotificationConfig.findOne();
    if (!config) {
      config = await NotificationConfig.create(payload);
    } else {
      config = await NotificationConfig.findByIdAndUpdate(config._id, payload, {
        new: true,
        runValidators: true
      });
    }
    return res.json({ success: true, message: 'Notification settings updated successfully', data: config });
  } catch (error) {
    console.error('Error updating notification config:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ================= CHANNEL TEST CONTROLLER =================

export const testChannelDispatch = async (req, res) => {
  try {
    const { channel, recipient, customMessage, customSubject } = req.body;

    if (!channel || !recipient) {
      return res.status(400).json({ success: false, message: 'Channel and recipient are required.' });
    }

    let result;
    const testVars = {
      client_name: 'Rohit Sharma (Test User)',
      project_name: 'Krishna Heights Luxury Residency',
      unit_number: 'Tower A - Flat 804',
      amount: '75,000',
      due_date: new Date(Date.now() + 7 * 86400000).toLocaleDateString('en-IN'),
      payment_link: 'https://krishnavalley.com/pay/test-demo',
      milestone_name: '5th Floor Slab Completion',
      penalty_amount: '2,500',
      rm_name: 'Amitabh Verma',
      contact_number: '+91 98765 00000',
      date: new Date().toLocaleDateString('en-IN'),
      time: '11:30 AM',
      location_link: 'https://maps.google.com/?q=Krishna+Valley+Residences',
      driver_name: 'Suresh Kumar',
      driver_phone: '+91 99887 76655',
      ticket_id: 'KV-SR-1092',
      status: 'In Progress',
      technician_name: 'Rajesh Electrician',
      resolution_notes: 'Inspected circuit breaker, replaced fuse.',
      allotment_date: new Date().toLocaleDateString('en-IN'),
      download_link: 'https://krishnavalley.com/docs/allotment-804.pdf',
      month_year: 'August 2026',
      net_salary: '95,000',
      portal_link: 'https://krishnavalley.com/hr/portal'
    };

    if (channel === 'whatsapp') {
      result = await sendWhatsApp({
        to: recipient,
        text: customMessage || 'This is a test notification from Krishna Valley ERP WhatsApp Gateway. System status is operational.',
        headerText: customSubject || 'Krishna Valley ERP Alert',
        variables: testVars,
        isTest: true
      });
    } else if (channel === 'sms') {
      result = await sendSMS({
        to: recipient,
        text: customMessage || 'KV-ERP TEST: System SMS gateway connection is active and operational. Sender ID verified.',
        dltTemplateId: '1407161528990012999',
        variables: testVars,
        isTest: true
      });
    } else if (channel === 'email') {
      result = await sendEmail({
        to: recipient,
        subject: customSubject || 'Test Notification: Krishna Valley ERP Email Channel Verification',
        bodyHtml: customMessage ? `<div style="padding: 20px; font-family: sans-serif;"><h3>Krishna Valley ERP</h3><p>${customMessage}</p></div>` : `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #14b8a6; border-radius: 8px;">
          <h2 style="color: #0f766e; margin-top: 0;">Krishna Valley Real Estate ERP</h2>
          <p>This is a <strong>live test email</strong> from your ERP notification gateway.</p>
          <p>If you are reading this, your SMTP / Email delivery settings are properly configured and operational.</p>
          <div style="background: #f0fdfa; padding: 12px; border-radius: 4px; font-size: 13px; color: #115e59;">
            <strong>Channel:</strong> Email (SMTP)<br>
            <strong>Timestamp:</strong> ${new Date().toLocaleString()}
          </div>
        </div>`,
        variables: testVars,
        isTest: true
      });
    } else if (channel === 'push') {
      result = await sendPush({
        recipientToken: recipient,
        title: customSubject || 'Krishna Valley ERP Web Push Test',
        body: customMessage || 'Push notifications are live and connected to your browser.',
        actionUrl: '/notifications',
        variables: testVars,
        isTest: true
      });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid channel specified.' });
    }

    return res.json({
      success: true,
      message: `Test notification sent successfully via ${channel.toUpperCase()}!`,
      data: result
    });
  } catch (error) {
    console.error('Error dispatching test notification:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ================= REMINDER TEMPLATES CONTROLLERS =================

// Get all templates with optional filter
export const getTemplates = async (req, res) => {
  try {
    const { category, channel, search } = req.query;
    let filter = {};

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (channel && ['whatsapp', 'sms', 'email', 'push'].includes(channel)) {
      filter[`channels.${channel}`] = true;
    }

    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      filter.$or = [
        { templateName: regex },
        { templateCode: regex },
        { description: regex }
      ];
    }

    let templates = await ReminderTemplate.find(filter).sort({ createdAt: -1 });

    // If zero templates in database, auto seed defaults!
    if (templates.length === 0 && (!category || category === 'all') && !search) {
      await ReminderTemplate.insertMany(DEFAULT_TEMPLATES);
      templates = await ReminderTemplate.find(filter).sort({ createdAt: -1 });
    }

    return res.json({ success: true, count: templates.length, data: templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Seed default templates
export const seedDefaultTemplates = async (req, res) => {
  try {
    for (const tpl of DEFAULT_TEMPLATES) {
      await ReminderTemplate.findOneAndUpdate(
        { templateCode: tpl.templateCode },
        tpl,
        { upsert: true, new: true }
      );
    }
    const all = await ReminderTemplate.find().sort({ createdAt: -1 });
    return res.json({ success: true, message: 'Default templates seeded successfully', count: all.length, data: all });
  } catch (error) {
    console.error('Error seeding templates:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Create new template
export const createTemplate = async (req, res) => {
  try {
    const payload = req.body;
    if (!payload.templateName || !payload.templateCode) {
      return res.status(400).json({ success: false, message: 'Template name and code are required.' });
    }

    // Check unique code
    const existing = await ReminderTemplate.findOne({ templateCode: payload.templateCode.toUpperCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: `Template code ${payload.templateCode} already exists.` });
    }

    payload.templateCode = payload.templateCode.toUpperCase();
    const newTemplate = await ReminderTemplate.create(payload);
    return res.status(201).json({ success: true, message: 'Template created successfully', data: newTemplate });
  } catch (error) {
    console.error('Error creating template:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update existing template
export const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body;

    if (payload.templateCode) {
      payload.templateCode = payload.templateCode.toUpperCase();
    }

    const updated = await ReminderTemplate.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    return res.json({ success: true, message: 'Template updated successfully', data: updated });
  } catch (error) {
    console.error('Error updating template:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Delete template
export const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await ReminderTemplate.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    return res.json({ success: true, message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ================= AUDIT LOGS CONTROLLERS =================

// Get notification delivery logs
export const getNotificationLogs = async (req, res) => {
  try {
    const { channel, status, search, limit = 100 } = req.query;
    let filter = {};

    if (channel && channel !== 'all') {
      filter.channel = channel;
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      filter.$or = [
        { recipient: regex },
        { recipientName: regex },
        { subject: regex },
        { templateCode: regex }
      ];
    }

    const logs = await NotificationLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    const counts = {
      total: await NotificationLog.countDocuments(),
      whatsapp: await NotificationLog.countDocuments({ channel: 'whatsapp' }),
      sms: await NotificationLog.countDocuments({ channel: 'sms' }),
      email: await NotificationLog.countDocuments({ channel: 'email' }),
      push: await NotificationLog.countDocuments({ channel: 'push' }),
      delivered: await NotificationLog.countDocuments({ status: 'delivered' }),
      failed: await NotificationLog.countDocuments({ status: 'failed' })
    };

    return res.json({ success: true, count: logs.length, counts, data: logs });
  } catch (error) {
    console.error('Error fetching logs:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Dispatch multi-channel notification using a template or custom variables
export const sendTemplateNotification = async (req, res) => {
  try {
    const {
      templateId,
      templateCode,
      channels = ['whatsapp'],
      recipient = {},
      variables = {},
      metadata = {},
      customOverrides = {}
    } = req.body;

    let template = null;
    if (templateId) {
      template = await ReminderTemplate.findById(templateId);
    } else if (templateCode) {
      template = await ReminderTemplate.findOne({ templateCode: templateCode.toUpperCase() });
    }

    const { name: recipientName, phone, email, pushToken } = recipient;
    const resolvedVars = {
      client_name: recipientName || 'Valued Customer',
      ...variables
    };

    const results = [];
    const errors = [];

    // 1. WhatsApp Dispatch
    if (channels.includes('whatsapp') && (phone || customOverrides.phone)) {
      const targetPhone = phone || customOverrides.phone;
      const text = customOverrides.whatsappBody || template?.whatsappContent?.bodyText || 'Important notification from Krishna Valley Real Estate.';
      const header = customOverrides.whatsappHeader || template?.whatsappContent?.headerText || 'Krishna Valley Alert';
      const btnText = customOverrides.whatsappBtnText || template?.whatsappContent?.buttonText || '';
      const btnUrl = customOverrides.whatsappBtnUrl || template?.whatsappContent?.buttonUrl || '';

      try {
        const resWp = await sendWhatsApp({
          to: targetPhone,
          text,
          headerText: header,
          buttonText: btnText,
          buttonUrl: btnUrl,
          templateName: template?.templateCode || 'DIRECT_WHATSAPP',
          variables: resolvedVars
        });
        results.push({ channel: 'whatsapp', success: true, ...resWp });
      } catch (err) {
        errors.push({ channel: 'whatsapp', error: err.message });
      }
    }

    // 2. SMS Dispatch
    if (channels.includes('sms') && (phone || customOverrides.phone)) {
      const targetPhone = phone || customOverrides.phone;
      const text = customOverrides.smsBody || template?.smsContent?.bodyText || 'KV-ERP: Important notification regarding your property.';
      const dltId = template?.smsContent?.dltTemplateId || '1407160000000000000';

      try {
        const resSms = await sendSMS({
          to: targetPhone,
          text,
          dltTemplateId: dltId,
          variables: resolvedVars
        });
        results.push({ channel: 'sms', success: true, ...resSms });
      } catch (err) {
        errors.push({ channel: 'sms', error: err.message });
      }
    }

    // 3. Email Dispatch
    if (channels.includes('email') && (email || customOverrides.email)) {
      const targetEmail = email || customOverrides.email;
      const subject = customOverrides.emailSubject || template?.emailContent?.subject || 'Important Property Notice - Krishna Valley';
      const bodyHtml = customOverrides.emailHtml || template?.emailContent?.bodyHtml || `<p>Dear ${recipientName || 'Customer'},</p><p>Please check your notification from Krishna Valley.</p>`;

      try {
        const resEmail = await sendEmail({
          to: targetEmail,
          subject,
          bodyHtml,
          variables: resolvedVars
        });
        results.push({ channel: 'email', success: true, ...resEmail });
      } catch (err) {
        errors.push({ channel: 'email', error: err.message });
      }
    }

    // 4. Push Dispatch
    if (channels.includes('push')) {
      const targetPush = pushToken || 'active_device_token';
      const title = customOverrides.pushTitle || template?.pushContent?.title || 'Krishna Valley Property Update';
      const body = customOverrides.pushBody || template?.pushContent?.bodyText || 'You have an update regarding your unit.';
      const actionUrl = customOverrides.pushUrl || template?.pushContent?.actionUrl || '/dashboard';

      try {
        const resPush = await sendPush({
          recipientToken: targetPush,
          title,
          body,
          actionUrl,
          variables: resolvedVars
        });
        results.push({ channel: 'push', success: true, ...resPush });
      } catch (err) {
        errors.push({ channel: 'push', error: err.message });
      }
    }

    return res.json({
      success: errors.length === 0,
      dispatchedCount: results.length,
      failedCount: errors.length,
      results,
      errors,
      message: `Notification sent across ${results.length} channel(s).`
    });
  } catch (error) {
    console.error('Error in sendTemplateNotification:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Clear notification logs
export const clearNotificationLogs = async (req, res) => {
  try {
    await NotificationLog.deleteMany({});
    return res.json({ success: true, message: 'Notification audit logs cleared successfully' });
  } catch (error) {
    console.error('Error clearing logs:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Verify live SMTP connection
export const verifyEmailSmtp = async (req, res) => {
  try {
    const result = await verifySmtpConnection(req.body);
    return res.json(result);
  } catch (error) {
    console.error('Error verifying SMTP connection:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Meta WhatsApp Webhook Challenge verification (GET)
export const verifyWhatsAppWebhook = async (req, res) => {
  try {
    const config = await getOrInitConfig();
    const expectedToken = config.whatsapp?.webhookVerifyToken || 'kv_whatsapp_secret_token';
    const check = verifyMetaWebhook(req.query, expectedToken);
    if (check.verified) {
      return res.status(200).send(check.challenge);
    }
    return res.status(403).send('Verification token mismatch');
  } catch (error) {
    console.error('WhatsApp Webhook verification error:', error);
    return res.status(500).send(error.message);
  }
};

// Meta WhatsApp Webhook Status & Receipt update (POST)
export const handleWhatsAppWebhook = async (req, res) => {
  try {
    await handleMetaStatusWebhook(req.body);
    return res.status(200).send('EVENT_RECEIVED');
  } catch (error) {
    console.error('WhatsApp Webhook processing error:', error);
    return res.status(500).send(error.message);
  }
};


