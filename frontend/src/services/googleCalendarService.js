import { request } from './api.js';

export const googleCalendarService = {
  // Test connection to Google Calendar API
  testConnection: (data = {}) =>
    request('/notifications/google-calendar/test', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Batch sync all pending follow-ups
  syncAll: (data = {}) =>
    request('/notifications/google-calendar/sync-all', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Get current status & metadata
  getStatus: () => request('/notifications/google-calendar/status'),

  /**
   * Helper to format Date into Google Calendar URL format (YYYYMMDDTHHmmssZ)
   */
  formatDateForGoogle: (date) => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  },

  /**
   * Generate 1-Click "Add to Google Calendar" URL
   * Opens Google Calendar directly with title, time, notes, location, and client details prefilled!
   */
  generateCalendarEventUrl: ({
    leadName = 'Client',
    leadMobile = '',
    leadEmail = '',
    mode = 'call',
    notes = '',
    scheduledDate,
    durationMinutes = 30,
    location = '',
  }) => {
    const start = scheduledDate ? new Date(scheduledDate) : new Date();
    const end = new Date(start.getTime() + (durationMinutes || 30) * 60 * 1000);

    const modeLabels = {
      site_visit: '🏡 Site Visit Tour',
      call: '📞 Phone Call Follow-Up',
      meeting: '🤝 In-Person Meeting',
      whatsapp: '💬 WhatsApp Discussion',
      email: '✉️ Email Consultation',
      other: '📋 Follow-Up Task',
    };

    const title = `[${modeLabels[mode] || 'Follow-Up'}] ${leadName} ${leadMobile ? `(${leadMobile})` : ''}`.trim();

    const details = [
      `🏢 KRISHNA VALLEY REAL ESTATE ERP`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `👤 Client: ${leadName}`,
      leadMobile ? `📞 Phone: ${leadMobile}` : null,
      leadEmail ? `✉️ Email: ${leadEmail}` : null,
      `📌 Mode: ${modeLabels[mode] || mode}`,
      `📝 Agenda / Notes:`,
      notes || 'Scheduled client follow-up from Krishna Valley ERP.',
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Created via Krishna Valley ERP System`,
    ]
      .filter(Boolean)
      .join('\n');

    const eventLocation = location || (mode === 'site_visit' ? 'Krishna Valley Campus, NH-19, Mathura - Vrindavan, UP 281121' : '');

    const formatGoogleDate = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const dates = `${formatGoogleDate(start)}/${formatGoogleDate(end)}`;

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      details: details,
      location: eventLocation,
      dates: dates,
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  },
};

export default googleCalendarService;
