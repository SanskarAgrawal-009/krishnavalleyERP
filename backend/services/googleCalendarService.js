import { google } from 'googleapis';
import dotenv from 'dotenv';
import NotificationConfig from '../models/NotificationConfig.js';
import Lead from '../models/Lead.js';

dotenv.config();

/**
 * Format private key correctly (handling escaped \n in env or database)
 */
export const sanitizePrivateKey = (key) => {
  if (!key) return '';
  let cleaned = key.trim();
  // If wrapped in quotes, strip them
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1);
  }
  // Replace literal string "\n" with real newlines
  cleaned = cleaned.replace(/\\n/g, '\n');
  return cleaned;
};

/**
 * Helper to retrieve active Google Calendar configuration with fallback to environment variables
 */
export const resolveGoogleCalendarConfig = async (overrideConfig = null) => {
  let dbCfg = null;
  try {
    const configDoc = await NotificationConfig.findOne();
    if (configDoc && configDoc.googleCalendar) {
      dbCfg = configDoc.googleCalendar.toObject ? configDoc.googleCalendar.toObject() : configDoc.googleCalendar;
    }
  } catch (err) {
    console.warn('Could not read NotificationConfig from DB, using fallback env:', err.message);
  }

  const cfg = overrideConfig || dbCfg || {};

  const enabled = cfg.enabled !== undefined ? Boolean(cfg.enabled) : (process.env.GOOGLE_CALENDAR_ENABLED === 'true');
  const authType = cfg.authType || process.env.GOOGLE_AUTH_TYPE || 'service_account';
  const calendarId = (cfg.calendarId || process.env.GOOGLE_CALENDAR_ID || 'primary').trim();
  const timeZone = cfg.timeZone || process.env.GOOGLE_CALENDAR_TIMEZONE || 'Asia/Kolkata';

  // Service Account credentials
  const clientEmail = (cfg.clientEmail || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
  const privateKey = sanitizePrivateKey(cfg.privateKey || process.env.GOOGLE_PRIVATE_KEY || '');

  // OAuth2 credentials (optional fallback)
  const clientId = (cfg.clientId || process.env.GOOGLE_CLIENT_ID || '').trim();
  const clientSecret = (cfg.clientSecret || process.env.GOOGLE_CLIENT_SECRET || '').trim();
  const refreshToken = (cfg.refreshToken || process.env.GOOGLE_REFRESH_TOKEN || '').trim();

  const autoSyncLeads = cfg.autoSyncLeads !== undefined ? Boolean(cfg.autoSyncLeads) : true;
  const autoSyncSiteVisits = cfg.autoSyncSiteVisits !== undefined ? Boolean(cfg.autoSyncSiteVisits) : true;
  const reminderMinutesBefore = Number(cfg.reminderMinutesBefore || 30);

  return {
    enabled,
    authType,
    calendarId,
    timeZone,
    clientEmail,
    privateKey,
    clientId,
    clientSecret,
    refreshToken,
    autoSyncLeads,
    autoSyncSiteVisits,
    reminderMinutesBefore,
    lastSyncAt: cfg.lastSyncAt || null,
    syncStatus: cfg.syncStatus || 'not_configured',
  };
};

/**
 * Initialize an authenticated Google Calendar v3 API client
 */
export const getCalendarClient = async (overrideConfig = null) => {
  const config = await resolveGoogleCalendarConfig(overrideConfig);

  if (config.authType === 'service_account') {
    if (!config.clientEmail || !config.privateKey) {
      throw new Error('Google Calendar Service Account is missing client_email or private_key.');
    }

    const auth = new google.auth.JWT({
      email: config.clientEmail,
      key: config.privateKey,
      scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
      ],
    });

    const calendar = google.calendar({ version: 'v3', auth });
    return { calendar, config };
  } else if (config.authType === 'oauth2') {
    if (!config.clientId || !config.clientSecret || !config.refreshToken) {
      throw new Error('Google Calendar OAuth2 credentials (client_id, client_secret, refresh_token) are missing.');
    }

    const oAuth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      'http://localhost:5000/api/notifications/google-calendar/oauth-callback'
    );
    oAuth2Client.setCredentials({ refresh_token: config.refreshToken });

    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    return { calendar, config };
  }

  throw new Error(`Unsupported Google Calendar auth type: ${config.authType}`);
};

/**
 * Test Google Calendar connection and access permissions
 */
export const testCalendarConnection = async (overrideConfig = null) => {
  const startTime = Date.now();
  try {
    const { calendar, config } = await getCalendarClient(overrideConfig);
    const targetCalendarId = config.calendarId || 'primary';

    // Try fetching the calendar metadata or upcoming events list
    let calInfo = null;
    try {
      const res = await calendar.calendars.get({ calendarId: targetCalendarId });
      calInfo = res.data;
    } catch (fetchErr) {
      // If primary or specific calendar, try listing events as permission check
      const listRes = await calendar.events.list({
        calendarId: targetCalendarId,
        maxResults: 1,
        singleEvents: true,
      });
      calInfo = {
        summary: targetCalendarId,
        timeZone: listRes.data.timeZone || config.timeZone,
      };
    }

    const latencyMs = Date.now() - startTime;

    // Update NotificationConfig status in DB
    try {
      await NotificationConfig.findOneAndUpdate(
        {},
        {
          $set: {
            'googleCalendar.syncStatus': 'ready',
            'googleCalendar.lastSyncSummary.message': `Connected successfully to "${calInfo.summary || targetCalendarId}" (${latencyMs}ms)`,
          },
        }
      );
    } catch (dbErr) {
      console.warn('Could not update syncStatus in DB:', dbErr.message);
    }

    return {
      success: true,
      message: `Google Calendar connected successfully! Calendar: "${calInfo.summary || targetCalendarId}"`,
      details: {
        calendarId: targetCalendarId,
        calendarTitle: calInfo.summary,
        timeZone: calInfo.timeZone || config.timeZone,
        clientEmail: config.clientEmail,
        latencyMs,
        testedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    let friendlyMessage = error.message;

    if (error.code === 404 || error.message?.includes('Not Found')) {
      friendlyMessage = `Google Calendar "${overrideConfig?.calendarId || 'primary'}" not found or not shared with the Service Account. In Google Calendar Settings, add your Service Account email to "Share with specific people" with "Make changes to events" permission.`;
    } else if (error.message?.includes('invalid_grant') || error.message?.includes('PEM routines')) {
      friendlyMessage = 'Invalid Service Account Private Key or Email. Please check that the private_key includes -----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY-----.';
    }

    // Update DB with error status
    try {
      await NotificationConfig.findOneAndUpdate(
        {},
        {
          $set: {
            'googleCalendar.syncStatus': 'error',
            'googleCalendar.lastSyncSummary.message': friendlyMessage,
          },
        }
      );
    } catch (dbErr) {
      // Ignore
    }

    return {
      success: false,
      message: friendlyMessage,
      details: {
        code: error.code || 'CONNECTION_ERROR',
        rawError: error.message,
        latencyMs,
        testedAt: new Date().toISOString(),
      },
    };
  }
};

/**
 * Format mode label and icon for follow-up event title
 */
const getModeDisplay = (mode) => {
  switch (mode) {
    case 'site_visit':
      return { icon: '🏡', label: 'Site Visit' };
    case 'call':
      return { icon: '📞', label: 'Phone Call' };
    case 'meeting':
      return { icon: '🤝', label: 'Meeting' };
    case 'whatsapp':
      return { icon: '💬', label: 'WhatsApp' };
    case 'email':
      return { icon: '✉️', label: 'Email Follow-up' };
    default:
      return { icon: '📋', label: 'Follow-up' };
  }
};

/**
 * Generate 1-Click "Add to Google Calendar" Web URL
 * Opens directly in user's browser without needing any API setup!
 */
export const generateGoogleCalendarWebUrl = ({
  title,
  description = '',
  location = '',
  startTime,
  endTime = null,
}) => {
  const start = startTime ? new Date(startTime) : new Date();
  const end = endTime ? new Date(endTime) : new Date(start.getTime() + 30 * 60 * 1000);

  const formatGoogleDate = (d) => {
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const datesParam = `${formatGoogleDate(start)}/${formatGoogleDate(end)}`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title || 'Krishna Valley Follow-up',
    details: description,
    location: location,
    dates: datesParam,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

/**
 * Create or Update a Follow-up event in Google Calendar
 */
export const createOrUpdateFollowUpEvent = async ({
  lead,
  followUp,
  assignedUser = null,
  overrideConfig = null,
}) => {
  const config = await resolveGoogleCalendarConfig(overrideConfig);

  // If Google Calendar integration is disabled, generate web URL only
  if (!config.enabled) {
    const modeInfo = getModeDisplay(followUp.mode);
    const webUrl = generateGoogleCalendarWebUrl({
      title: `${modeInfo.icon} ${modeInfo.label}: ${lead.name} (${lead.mobileNo})`,
      description: `Client: ${lead.name}\nPhone: ${lead.mobileNo}\nNotes: ${followUp.notes || 'Scheduled Follow-up'}\nKrishna Valley ERP`,
      location: followUp.mode === 'site_visit' ? 'Krishna Valley Campus, NH-19, Mathura - Vrindavan, UP 281121' : '',
      startTime: followUp.nextFollowUpDate || followUp.date,
    });
    return {
      synced: false,
      reason: 'disabled',
      webUrl,
    };
  }

  // Check if credentials are present
  if (!config.clientEmail || !config.privateKey) {
    return {
      synced: false,
      reason: 'missing_credentials',
      message: 'Google Service Account credentials not configured.',
    };
  }

  try {
    const { calendar } = await getCalendarClient(overrideConfig);
    const targetCalendarId = config.calendarId || 'primary';

    const modeInfo = getModeDisplay(followUp.mode);
    const scheduledStart = new Date(followUp.nextFollowUpDate || followUp.date || Date.now());
    // Default duration: 45 minutes for site visits, 30 minutes for others
    const durationMinutes = followUp.mode === 'site_visit' ? 45 : 30;
    const scheduledEnd = new Date(scheduledStart.getTime() + durationMinutes * 60 * 1000);

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const leadLink = `${clientUrl}/crm?search=${encodeURIComponent(lead.mobileNo || lead.name)}`;

    const eventSummary = `${modeInfo.icon} [${modeInfo.label}] ${lead.name} (${lead.mobileNo})`;

    const eventDescription = [
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `🏢 KRISHNA VALLEY ERP - SCHEDULED FOLLOW-UP`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `👤 Client Name: ${lead.name}`,
      `📞 Phone: ${lead.mobileNo}`,
      lead.email ? `✉️ Email: ${lead.email}` : null,
      `🏷️ Status: ${(lead.status || 'Active').toUpperCase()}`,
      `📍 City/Location: ${lead.city || 'N/A'}, ${lead.state || ''}`,
      lead.budget ? `💰 Budget Range: ${lead.budget}` : null,
      lead.propertyInterest ? `🏡 Interest: ${lead.propertyInterest}` : null,
      assignedUser?.firstName ? `👔 Assigned Rep: ${assignedUser.firstName} ${assignedUser.lastName || ''} (${assignedUser.mobileNo || ''})` : null,
      `📌 Follow-Up Mode: ${modeInfo.label}`,
      `📝 Notes / Agenda:`,
      `${followUp.notes || 'Follow-up with client regarding property tour/pricing.'}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `🔗 Open Lead in ERP: ${leadLink}`,
    ]
      .filter(Boolean)
      .join('\n');

    const eventLocation = followUp.mode === 'site_visit'
      ? 'Krishna Valley Vrindavan Campus, NH-19, Mathura - Vrindavan, Uttar Pradesh 281121'
      : (lead.city ? `${lead.city}, ${lead.state || ''}` : 'Phone / Online');

    const eventBody = {
      summary: eventSummary,
      description: eventDescription,
      location: eventLocation,
      start: {
        dateTime: scheduledStart.toISOString(),
        timeZone: config.timeZone,
      },
      end: {
        dateTime: scheduledEnd.toISOString(),
        timeZone: config.timeZone,
      },
      colorId: followUp.mode === 'site_visit' ? '11' : (followUp.mode === 'call' ? '9' : '5'), // 11=Red/Orange (Site Visit), 9=Blue (Call), 5=Yellow (Meeting)
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: config.reminderMinutesBefore || 30 },
          { method: 'popup', minutes: 1440 }, // 1 day before
        ],
      },
      extendedProperties: {
        private: {
          erpSource: 'krishna_valley_erp',
          leadId: String(lead._id),
          followUpId: String(followUp._id),
        },
      },
    };

    let calendarResponse;
    const existingEventId = followUp.googleCalendar?.eventId;

    if (existingEventId) {
      try {
        calendarResponse = await calendar.events.patch({
          calendarId: targetCalendarId,
          eventId: existingEventId,
          requestBody: eventBody,
        });
      } catch (patchErr) {
        // If event was deleted from Google Calendar externally (404/410), re-insert as new event
        if (patchErr.code === 404 || patchErr.code === 410) {
          calendarResponse = await calendar.events.insert({
            calendarId: targetCalendarId,
            requestBody: eventBody,
          });
        } else {
          throw patchErr;
        }
      }
    } else {
      calendarResponse = await calendar.events.insert({
        calendarId: targetCalendarId,
        requestBody: eventBody,
      });
    }

    const eventData = calendarResponse.data;

    // Update the followUp record in MongoDB directly
    await Lead.updateOne(
      { _id: lead._id, 'followUps._id': followUp._id },
      {
        $set: {
          'followUps.$.googleCalendar': {
            eventId: eventData.id,
            htmlLink: eventData.htmlLink,
            syncedAt: new Date(),
            syncStatus: 'synced',
            syncError: null,
          },
        },
      }
    );

    return {
      synced: true,
      eventId: eventData.id,
      htmlLink: eventData.htmlLink,
    };
  } catch (error) {
    console.error('Google Calendar event dispatch error:', error.message);

    // Save sync failure status on the follow-up record
    try {
      await Lead.updateOne(
        { _id: lead._id, 'followUps._id': followUp._id },
        {
          $set: {
            'followUps.$.googleCalendar.syncStatus': 'failed',
            'followUps.$.googleCalendar.syncError': error.message,
          },
        }
      );
    } catch (saveErr) {
      // Ignore
    }

    return {
      synced: false,
      error: error.message,
    };
  }
};

/**
 * Delete a Follow-up event from Google Calendar
 */
export const deleteFollowUpEvent = async ({ eventId, overrideConfig = null }) => {
  if (!eventId) return;
  try {
    const config = await resolveGoogleCalendarConfig(overrideConfig);
    if (!config.enabled || !config.clientEmail || !config.privateKey) return;

    const { calendar } = await getCalendarClient(overrideConfig);
    const targetCalendarId = config.calendarId || 'primary';

    await calendar.events.delete({
      calendarId: targetCalendarId,
      eventId,
    });
    return { success: true };
  } catch (err) {
    if (err.code === 404 || err.code === 410) {
      // Event already deleted or not found
      return { success: true };
    }
    console.warn('Could not delete Google Calendar event:', err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Sync all pending future follow-ups across all leads into Google Calendar
 */
export const syncAllPendingFollowUps = async (overrideConfig = null) => {
  const config = await resolveGoogleCalendarConfig(overrideConfig);

  if (!config.enabled && !overrideConfig?.enabled) {
    throw new Error('Google Calendar integration is not enabled. Please enable it in Notification Settings first.');
  }

  // Find all active leads having pending follow-ups
  const now = new Date();
  const leads = await Lead.find({
    'followUps': {
      $elemMatch: {
        status: 'pending',
        nextFollowUpDate: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }, // from yesterday onwards
      },
    },
  })
    .populate('assignedTo', 'firstName lastName email mobileNo')
    .populate('followUps.assignedTo', 'firstName lastName email mobileNo');

  let totalSynced = 0;
  let failedCount = 0;
  const syncedEvents = [];

  for (const lead of leads) {
    for (const fu of lead.followUps || []) {
      if (fu.status === 'pending' && fu.nextFollowUpDate && new Date(fu.nextFollowUpDate) >= new Date(now.getTime() - 24 * 60 * 60 * 1000)) {
        try {
          const assignedUser = fu.assignedTo || lead.assignedTo;
          const result = await createOrUpdateFollowUpEvent({
            lead,
            followUp: fu,
            assignedUser,
            overrideConfig,
          });

          if (result.synced) {
            totalSynced++;
            syncedEvents.push({
              leadName: lead.name,
              mode: fu.mode,
              date: fu.nextFollowUpDate,
              htmlLink: result.htmlLink,
            });
          } else if (result.error) {
            failedCount++;
          }
        } catch (itemErr) {
          failedCount++;
          console.error(`Failed to sync follow-up for lead ${lead.name}:`, itemErr.message);
        }
      }
    }
  }

  // Record sync stats in NotificationConfig
  try {
    await NotificationConfig.findOneAndUpdate(
      {},
      {
        $set: {
          'googleCalendar.lastSyncAt': new Date(),
          'googleCalendar.syncStatus': failedCount === 0 && totalSynced > 0 ? 'ready' : (failedCount > 0 && totalSynced === 0 ? 'error' : 'ready'),
          'googleCalendar.lastSyncSummary': {
            totalSynced,
            failedCount,
            message: `Batch sync finished: ${totalSynced} follow-ups mapped into Google Calendar (${failedCount} failed).`,
          },
        },
      }
    );
  } catch (dbErr) {
    console.warn('Could not record sync stats in DB:', dbErr.message);
  }

  return {
    success: true,
    totalSynced,
    failedCount,
    syncedEvents,
    message: `Batch sync complete! Successfully mapped ${totalSynced} follow-ups into Google Calendar.`,
  };
};

export default {
  resolveGoogleCalendarConfig,
  getCalendarClient,
  testCalendarConnection,
  createOrUpdateFollowUpEvent,
  deleteFollowUpEvent,
  syncAllPendingFollowUps,
  generateGoogleCalendarWebUrl,
};
