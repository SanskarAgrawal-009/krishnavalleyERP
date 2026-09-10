import Lead from '../models/Lead.js';
import User from '../models/User.js';
import '../models/Flat.js';
import '../models/Project.js';
import {
  sendWhatsApp,
  sendEmail,
  sendSMS,
  sendPush,
  getOrInitConfig
} from './notificationDispatcher.js';
import { generateWhatsAppWebUrl, sanitizeWhatsAppPhone } from './whatsappService.js';

let schedulerInterval = null;

/**
 * Format date & time helper for Indian locale
 */
export const formatTime = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

export const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

/**
 * Compose message content for Client Site Visit
 * Sent by or on behalf of the assigned team member handling that client
 */
export const composeClientSiteVisitReminder = (lead, visit) => {
  const timeStr = formatTime(visit.visitDate || visit.nextFollowUpDate);
  const dateStr = formatDate(visit.visitDate || visit.nextFollowUpDate);
  const flatNumber = visit.assignedFlat?.flatNumber || (typeof visit.assignedFlat === 'string' ? visit.assignedFlat : (lead.assignedFlat?.flatNumber || ''));
  const projectName = visit.assignedFlat?.projectId?.projectName || lead.assignedFlat?.projectId?.projectName || 'Krishna Valley';
  const unitStr = flatNumber ? `Flat ${flatNumber} (${projectName})` : (visit.flatLabel || lead.requirement || 'Property Tour');
  const execName = visit.accompaniedBy?.firstName ? `${visit.accompaniedBy.firstName} ${visit.accompaniedBy.lastName || ''}`.trim() : (lead.assignedTo?.firstName || 'Relationship Manager');
  const execPhone = visit.accompaniedBy?.mobileNo || lead.assignedTo?.mobileNo || '+91 98765 43210';
  const cab = visit.cabDetails || {};

  let text = `Hello ${lead.name},\n\n`;
  text += `This is a reminder that your private property tour at Krishna Valley is scheduled for today at ${timeStr} (${dateStr}).\n\n`;
  text += `Property: ${unitStr}\n`;
  text += `Your Property Advisor: ${execName} (${execPhone})\n`;

  if (cab.isCabProvided) {
    text += `Chauffeur: ${cab.driverName || 'Assigned'} (${cab.driverPhone || 'Contact executive'}) • Vehicle: ${cab.cabNumber || 'Confirmed'}\n`;
    if (cab.pickupLocation) text += `Pickup Point: ${cab.pickupLocation}\n`;
  }

  text += `Location: https://maps.google.com/?q=Krishna+Valley+Vrindavan\n\n`;
  text += `Your advisor ${execName} will be pleased to welcome you on site. If you need any assistance, feel free to call directly.\n\nWarm regards,\nKrishna Valley Client Services`;

  const html = `
    <p style="font-size: 16px; color: #0f172a; margin: 0 0 14px 0;">Dear <strong>${lead.name}</strong>,</p>
    <p style="color: #334155; line-height: 1.6; margin: 0 0 16px 0;">
      This is a reminder that your private site walkthrough at <strong>Krishna Valley</strong> is scheduled for today at <strong>${timeStr}</strong> (${dateStr}).
    </p>

    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin: 18px 0;">
      <tr>
        <td style="padding: 10px 14px; font-size: 13px; color: #64748b; font-weight: 600; width: 130px; border-bottom: 1px solid #edf2f7;">Property:</td>
        <td style="padding: 10px 14px; font-size: 14px; color: #0f172a; font-weight: 500; border-bottom: 1px solid #edf2f7;">${unitStr}</td>
      </tr>
      <tr>
        <td style="padding: 10px 14px; font-size: 13px; color: #64748b; font-weight: 600; border-bottom: 1px solid #edf2f7;">Advisor:</td>
        <td style="padding: 10px 14px; font-size: 14px; color: #0f172a; border-bottom: 1px solid #edf2f7;">${execName} (${execPhone})</td>
      </tr>
      ${cab.isCabProvided ? `
      <tr>
        <td style="padding: 10px 14px; font-size: 13px; color: #64748b; font-weight: 600;">Chauffeur:</td>
        <td style="padding: 10px 14px; font-size: 13px; color: #0f172a;">${cab.driverName || 'Assigned'} (${cab.driverPhone || 'On-duty'}) • ${cab.cabNumber || 'Confirmed'}</td>
      </tr>
      ` : ''}
    </table>

    <div style="margin: 22px 0;">
      <a href="https://maps.google.com/?q=Krishna+Valley+Vrindavan" style="background-color: #0f766e; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; font-size: 13px; display: inline-block;">
        Open Location in Google Maps
      </a>
    </div>

    <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0;">
      Your advisor <strong>${execName}</strong> will be waiting to assist you upon arrival. If you have any questions or need directions, please feel free to reach out directly.
    </p>
  `;

  return { text, html, subject: `Site Visit Reminder: ${unitStr} at ${timeStr}` };
};

/**
 * Compose message content for Team Member Follow-up (Sent 30 minutes before task)
 */
export const composeTeamFollowUpReminder = (lead, fu) => {
  const timeStr = formatTime(fu.nextFollowUpDate || fu.date);
  const taskMode = (fu.mode || 'call').toUpperCase();
  const unitStr = lead.assignedFlat?.flatNumber ? `Flat ${lead.assignedFlat.flatNumber}` : (lead.requirement || 'Property Requirement');

  let text = `Task Alert: Scheduled ${taskMode} with ${lead.name}\n\n`;
  text += `Time: ${timeStr} (in ~30 minutes)\n`;
  text += `Phone: ${lead.mobileNo}\n`;
  text += `Interest: ${unitStr}\n`;
  if (fu.notes) text += `Notes: ${fu.notes}\n`;
  text += `\nLead Pipeline: https://erp.krishnavalley.com/crm`;

  const html = `
    <p style="font-size: 15px; color: #0f172a; margin: 0 0 12px 0;">Hello,</p>
    <p style="color: #334155; line-height: 1.6; margin: 0 0 14px 0;">
      You have an upcoming follow-up scheduled with prospect <strong>${lead.name}</strong> at <strong>${timeStr}</strong> today.
    </p>

    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin: 16px 0;">
      <tr>
        <td style="padding: 10px 14px; font-size: 13px; color: #64748b; font-weight: 600; width: 120px; border-bottom: 1px solid #edf2f7;">Prospect:</td>
        <td style="padding: 10px 14px; font-size: 14px; color: #0f172a; font-weight: 500; border-bottom: 1px solid #edf2f7;">${lead.name} (${lead.mobileNo})</td>
      </tr>
      <tr>
        <td style="padding: 10px 14px; font-size: 13px; color: #64748b; font-weight: 600; border-bottom: 1px solid #edf2f7;">Task:</td>
        <td style="padding: 10px 14px; font-size: 14px; color: #0f172a; border-bottom: 1px solid #edf2f7;">${taskMode}</td>
      </tr>
      <tr>
        <td style="padding: 10px 14px; font-size: 13px; color: #64748b; font-weight: 600;">Requirement:</td>
        <td style="padding: 10px 14px; font-size: 14px; color: #0f172a;">${unitStr}</td>
      </tr>
      ${fu.notes ? `
      <tr>
        <td style="padding: 10px 14px; font-size: 13px; color: #64748b; font-weight: 600; border-top: 1px solid #edf2f7;">Notes:</td>
        <td style="padding: 10px 14px; font-size: 13px; color: #475569; border-top: 1px solid #edf2f7;">${fu.notes}</td>
      </tr>
      ` : ''}
    </table>

    <p style="margin: 18px 0 0 0;">
      <a href="https://erp.krishnavalley.com/crm" style="color: #0f766e; font-weight: 600; text-decoration: none; font-size: 14px;">
        Open CRM Pipeline &rarr;
      </a>
    </p>
  `;

  return { text, html, subject: `Follow-Up Notice: ${lead.name} at ${timeStr}` };
};

/**
 * Main function that checks all pending follow-ups and site visits in the 30-minute window
 */
export const checkAndDispatchReminders = async () => {
  try {
    const now = new Date();
    // 32-minute forward window to reliably catch tasks scheduled in ~30 minutes
    const windowStart = new Date(now.getTime() - 15 * 60 * 1000); // include recent overdue from last 15m
    const windowEnd = new Date(now.getTime() + 32 * 60 * 1000);

    // -------------------------------------------------------------
    // 1. TEAM FOLLOW-UP REMINDERS (All Modes: Call, WhatsApp, Meeting, Site Visit)
    // -------------------------------------------------------------
    const leadsWithTeamReminders = await Lead.find({
      'followUps': {
        $elemMatch: {
          status: 'pending',
          nextFollowUpDate: { $gte: windowStart, $lte: windowEnd },
          'reminderStatus.teamNotified': { $ne: true }
        }
      }
    })
      .populate('assignedTo', 'firstName lastName email mobileNo')
      .populate('followUps.assignedTo', 'firstName lastName email mobileNo')
      .populate('followUps.scheduledBy', 'firstName lastName email mobileNo')
      .populate('assignedFlat', 'flatNumber projectId');

    for (const lead of leadsWithTeamReminders) {
      let modified = false;

      for (const fu of lead.followUps) {
        if (
          fu.status === 'pending' &&
          fu.nextFollowUpDate &&
          new Date(fu.nextFollowUpDate) >= windowStart &&
          new Date(fu.nextFollowUpDate) <= windowEnd &&
          !fu.reminderStatus?.teamNotified
        ) {
          const assignee = fu.assignedTo || lead.assignedTo || fu.scheduledBy;
          const { text, html, subject } = composeTeamFollowUpReminder(lead, fu);
          const channelsSent = ['in_app'];

          // Dispatch WhatsApp to Sales Executive if phone exists
          if (assignee?.mobileNo) {
            try {
              await sendWhatsApp({
                to: assignee.mobileNo,
                text,
                headerText: 'Krishna Valley • Follow-Up Reminder',
                variables: { client_name: lead.name }
              });
              channelsSent.push('whatsapp');
              console.log(`💬 [Reminder Engine] Dispatched 30-min WhatsApp reminder to ${assignee.mobileNo} for lead "${lead.name}".`);
            } catch (err) {
              console.warn(`Could not dispatch team WhatsApp reminder for lead ${lead._id}:`, err.message);
            }
          }

          // Dispatch Email to Sales Executive if email exists
          if (assignee?.email) {
            try {
              await sendEmail({
                to: assignee.email,
                subject,
                bodyHtml: html,
                text
              });
              channelsSent.push('email');
              console.log(`📧 [Reminder Engine] Dispatched 30-min email reminder to ${assignee.email} for lead "${lead.name}".`);
            } catch (err) {
              console.warn(`Could not dispatch team email reminder for lead ${lead._id}:`, err.message);
            }
          }

          // Update reminderStatus
          if (!fu.reminderStatus) fu.reminderStatus = {};
          fu.reminderStatus.teamNotified = true;
          fu.reminderStatus.teamNotifiedAt = new Date();
          fu.reminderStatus.teamChannels = channelsSent;
          modified = true;
        }
      }

      if (modified) {
        await lead.save();
      }
    }

    // -------------------------------------------------------------
    // 2. CLIENT REMINDERS (ONLY FOR SITE VISITS!)
    // -------------------------------------------------------------
    // Check scheduled external site visits
    const leadsWithClientVisits = await Lead.find({
      $or: [
        {
          'externalSiteVisits': {
            $elemMatch: {
              visitDate: { $gte: windowStart, $lte: windowEnd },
              'reminderStatus.clientNotified': { $ne: true }
            }
          }
        },
        {
          'followUps': {
            $elemMatch: {
              mode: 'site_visit',
              status: 'pending',
              nextFollowUpDate: { $gte: windowStart, $lte: windowEnd },
              'reminderStatus.clientNotified': { $ne: true }
            }
          }
        }
      ]
    })
      .populate('assignedTo', 'firstName lastName mobileNo')
      .populate('assignedFlat', 'flatNumber projectId')
      .populate('externalSiteVisits.assignedFlat', 'flatNumber projectId')
      .populate('externalSiteVisits.accompaniedBy', 'firstName lastName mobileNo');

    for (const lead of leadsWithClientVisits) {
      let modified = false;

      // Check externalSiteVisits
      for (const esv of lead.externalSiteVisits || []) {
        if (
          esv.visitDate &&
          new Date(esv.visitDate) >= windowStart &&
          new Date(esv.visitDate) <= windowEnd &&
          !esv.reminderStatus?.clientNotified
        ) {
          const { text, html, subject } = composeClientSiteVisitReminder(lead, esv);
          const channelsSent = [];

          // WhatsApp to Client
          if (lead.mobileNo) {
            try {
              await sendWhatsApp({
                to: lead.mobileNo,
                text,
                headerText: 'Krishna Valley • Site Visit Reminder',
                variables: { client_name: lead.name }
              });
              channelsSent.push('whatsapp');
            } catch (err) {
              console.warn(`Could not dispatch client WhatsApp reminder for lead ${lead._id}:`, err.message);
            }
          }

          // Email to Client
          if (lead.email) {
            try {
              await sendEmail({
                to: lead.email,
                subject,
                bodyHtml: html,
                text
              });
              channelsSent.push('email');
              console.log(`📧 [Reminder Engine] Dispatched 30-min client site visit email to ${lead.email} for "${lead.name}".`);
            } catch (err) {
              console.warn(`Could not dispatch client email reminder for lead ${lead._id}:`, err.message);
            }
          }

          if (!esv.reminderStatus) esv.reminderStatus = {};
          esv.reminderStatus.clientNotified = true;
          esv.reminderStatus.clientNotifiedAt = new Date();
          esv.reminderStatus.clientChannels = channelsSent;
          modified = true;
        }
      }

      // Check followUps with mode === 'site_visit'
      for (const fu of lead.followUps || []) {
        if (
          fu.mode === 'site_visit' &&
          fu.status === 'pending' &&
          fu.nextFollowUpDate &&
          new Date(fu.nextFollowUpDate) >= windowStart &&
          new Date(fu.nextFollowUpDate) <= windowEnd &&
          !fu.reminderStatus?.clientNotified
        ) {
          const { text, html, subject } = composeClientSiteVisitReminder(lead, fu);
          const channelsSent = [];

          if (lead.mobileNo) {
            try {
              await sendWhatsApp({
                to: lead.mobileNo,
                text,
                headerText: 'Krishna Valley • Site Visit Reminder',
                variables: { client_name: lead.name }
              });
              channelsSent.push('whatsapp');
            } catch (err) {
              console.warn(`Could not dispatch client WhatsApp reminder for lead ${lead._id}:`, err.message);
            }
          }

          if (lead.email) {
            try {
              await sendEmail({
                to: lead.email,
                subject,
                bodyHtml: html,
                text
              });
              channelsSent.push('email');
              console.log(`📧 [Reminder Engine] Dispatched 30-min client site visit email to ${lead.email} for "${lead.name}".`);
            } catch (err) {
              console.warn(`Could not dispatch client email reminder for lead ${lead._id}:`, err.message);
            }
          }

          if (!fu.reminderStatus) fu.reminderStatus = {};
          fu.reminderStatus.clientNotified = true;
          fu.reminderStatus.clientNotifiedAt = new Date();
          fu.reminderStatus.clientChannels = channelsSent;
          modified = true;
        }
      }

      if (modified) {
        await lead.save();
      }
    }
  } catch (err) {
    console.error('Error in checkAndDispatchReminders ticker:', err);
  }
};

/**
 * Get all due and upcoming reminders for a specific logged-in user
 */
export const getDueRemindersForUser = async (user) => {
  const userId = user._id || user.id;
  const isHead = user.role?.roleName === 'admin' || user.role?.roleName === 'super_admin' || user.role?.roleName === 'sales_head';

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const thirtyMinWindow = new Date(now.getTime() + 32 * 60 * 1000);

  const query = isHead
    ? { status: { $ne: 'converted' } }
    : { assignedTo: userId, status: { $ne: 'converted' } };

  const leads = await Lead.find(query)
    .populate('assignedTo', 'firstName lastName mobileNo')
    .populate('assignedFlat', 'flatNumber projectId')
    .populate('externalSiteVisits.assignedFlat', 'flatNumber projectId')
    .populate('externalSiteVisits.accompaniedBy', 'firstName lastName mobileNo');

  const upcoming30Min = [];
  const dueToday = [];
  const overdue = [];

  for (const lead of leads) {
    // 1. Follow-ups
    for (const fu of lead.followUps || []) {
      if (fu.status === 'pending' && fu.nextFollowUpDate) {
        const d = new Date(fu.nextFollowUpDate);
        const minutesDiff = Math.round((d.getTime() - now.getTime()) / (60 * 1000));
        const isDueIn30 = minutesDiff >= -5 && minutesDiff <= 32;

        const item = {
          id: fu._id?.toString(),
          type: 'follow_up',
          mode: fu.mode,
          leadId: lead._id?.toString(),
          leadName: lead.name,
          leadPhone: lead.mobileNo,
          leadEmail: lead.email,
          scheduledTime: fu.nextFollowUpDate,
          minutesRemaining: minutesDiff,
          isDueIn30Min: isDueIn30,
          isDueIn10Min: isDueIn30, // backward compatibility alias
          isOverdue: minutesDiff < -5,
          unit: lead.assignedFlat?.flatNumber ? `Flat ${lead.assignedFlat.flatNumber}` : (lead.requirement || 'Unit'),
          notes: fu.notes || '',
          assignedToName: lead.assignedTo?.firstName || 'Sales Rep',
          handlingMemberName: lead.assignedTo?.firstName ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName || ''}`.trim() : 'Sales Rep',
          handlingMemberPhone: lead.assignedTo?.mobileNo || '',
          whatsAppClickUrl: generateWhatsAppWebUrl(lead.mobileNo, composeTeamFollowUpReminder(lead, fu).text)
        };

        if (item.isDueIn30Min) upcoming30Min.push(item);
        if (d >= todayStart && d <= todayEnd) dueToday.push(item);
        if (item.isOverdue) overdue.push(item);
      }
    }

    // 2. External Site Visits
    for (const esv of lead.externalSiteVisits || []) {
      const isScheduled = esv.status === 'scheduled' || (!esv.status && new Date(esv.visitDate) > now);
      if (isScheduled && esv.visitDate) {
        const d = new Date(esv.visitDate);
        const minutesDiff = Math.round((d.getTime() - now.getTime()) / (60 * 1000));
        const clientTemplate = composeClientSiteVisitReminder(lead, esv);
        const isDueIn30 = minutesDiff >= -5 && minutesDiff <= 32;

        const handlingName = esv.accompaniedBy?.firstName 
          ? `${esv.accompaniedBy.firstName} ${esv.accompaniedBy.lastName || ''}`.trim()
          : (lead.assignedTo?.firstName ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName || ''}`.trim() : 'Sales Rep');
        const handlingPhone = esv.accompaniedBy?.mobileNo || lead.assignedTo?.mobileNo || '';

        const item = {
          id: esv._id?.toString(),
          type: 'site_visit',
          mode: 'site_visit',
          leadId: lead._id?.toString(),
          leadName: esv.visitorName || lead.name,
          leadPhone: esv.visitorPhone || lead.mobileNo,
          leadEmail: esv.visitorEmail || lead.email,
          scheduledTime: esv.visitDate,
          minutesRemaining: minutesDiff,
          isDueIn30Min: isDueIn30,
          isDueIn10Min: isDueIn30, // backward compatibility alias
          isOverdue: minutesDiff < -5,
          unit: esv.assignedFlat?.flatNumber ? `Flat ${esv.assignedFlat.flatNumber}` : (esv.flatLabel || 'Site Tour'),
          notes: esv.feedback || '',
          cabDetails: esv.cabDetails,
          isCabProvided: Boolean(esv.cabDetails?.isCabProvided),
          assignedToName: handlingName,
          handlingMemberName: handlingName,
          handlingMemberPhone: handlingPhone,
          clientWhatsAppUrl: generateWhatsAppWebUrl(esv.visitorPhone || lead.mobileNo, clientTemplate.text),
          clientMessageText: clientTemplate.text
        };

        if (item.isDueIn30Min) upcoming30Min.push(item);
        if (d >= todayStart && d <= todayEnd) dueToday.push(item);
        if (item.isOverdue) overdue.push(item);
      }
    }
  }

  // Sort chronologically
  upcoming30Min.sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));
  dueToday.sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));
  overdue.sort((a, b) => new Date(b.scheduledTime) - new Date(a.scheduledTime));

  return {
    upcoming30Min,
    upcoming10Min: upcoming30Min, // backward-compat alias
    dueToday,
    overdue,
    totalDueSoon: upcoming30Min.length,
    totalOverdue: overdue.length
  };
};

/**
 * Trigger an immediate manual reminder via WhatsApp / Email / SMS
 */
export const dispatchManualReminder = async ({
  leadId,
  targetType = 'client', // 'client' | 'team'
  channel = 'whatsapp',   // 'whatsapp' | 'email' | 'sms'
  siteVisitId = null,
  followUpId = null,
  customText = null,
  user = null
}) => {
  const lead = await Lead.findById(leadId)
    .populate('assignedTo', 'firstName lastName email mobileNo')
    .populate('assignedFlat', 'flatNumber projectId')
    .populate('externalSiteVisits.assignedFlat', 'flatNumber projectId')
    .populate('externalSiteVisits.accompaniedBy', 'firstName lastName mobileNo');

  if (!lead) throw new Error('Lead not found.');

  let targetPhone = lead.mobileNo;
  let targetEmail = lead.email;
  let text = '';
  let html = '';
  let subject = '';

  if (targetType === 'client') {
    // Client Site Visit Reminder
    const visit = (lead.externalSiteVisits || []).find(v => v._id?.toString() === siteVisitId) ||
                  (lead.followUps || []).find(f => f._id?.toString() === followUpId) ||
                  { visitDate: new Date(), flatLabel: lead.requirement };

    const comp = composeClientSiteVisitReminder(lead, visit);
    text = customText || comp.text;
    html = comp.html;
    subject = comp.subject;
  } else {
    // Team Follow-Up Reminder
    const fu = (lead.followUps || []).find(f => f._id?.toString() === followUpId) ||
               { nextFollowUpDate: new Date(), mode: 'call', notes: '' };

    const assignee = lead.assignedTo;
    targetPhone = assignee?.mobileNo || lead.mobileNo;
    targetEmail = assignee?.email || user?.email;

    const comp = composeTeamFollowUpReminder(lead, fu);
    text = customText || comp.text;
    html = comp.html;
    subject = comp.subject;
  }

  const clickToChatUrl = generateWhatsAppWebUrl(targetPhone, text);

  // Dispatch via chosen channel
  let dispatchResult = null;
  if (channel === 'whatsapp') {
    try {
      dispatchResult = await sendWhatsApp({
        to: targetPhone,
        text,
        headerText: 'Krishna Valley Reminder',
        variables: { client_name: lead.name }
      });
    } catch (err) {
      // In sandbox / unconfigured WhatsApp API, provide direct click-to-chat URL
      dispatchResult = {
        success: true,
        channel: 'whatsapp',
        note: 'WhatsApp direct link generated.',
        clickToChatUrl
      };
    }
  } else if (channel === 'email') {
    if (!targetEmail) throw new Error('Recipient email address is missing.');
    dispatchResult = await sendEmail({
      to: targetEmail,
      subject,
      bodyHtml: html,
      text
    });
  } else if (channel === 'sms') {
    dispatchResult = await sendSMS({
      to: targetPhone,
      text
    });
  }

  return {
    success: true,
    channel,
    targetType,
    recipientPhone: targetPhone,
    recipientEmail: targetEmail,
    previewText: text,
    clickToChatUrl,
    dispatchResult
  };
};

/**
 * Start recurring 60-second ticker in backend
 */
export const initReminderScheduler = () => {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }

  console.log('⏰ [Reminder Engine] Initialized automated 30-minute reminder ticker (interval: 60s).');

  // Run initial check after 5 seconds to catch current reminders
  setTimeout(() => {
    checkAndDispatchReminders();
  }, 5000);

  // Periodic ticker every 60 seconds
  schedulerInterval = setInterval(() => {
    checkAndDispatchReminders();
  }, 60000);

  return schedulerInterval;
};

export default {
  initReminderScheduler,
  checkAndDispatchReminders,
  getDueRemindersForUser,
  dispatchManualReminder,
  composeClientSiteVisitReminder,
  composeTeamFollowUpReminder
};
