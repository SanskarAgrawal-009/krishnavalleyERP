import { request, BASE_URL } from './api.js';

export const settingsService = {
  // Get all settings
  getSettings: async () => {
    return await request('/settings', {
      method: 'GET',
    });
  },

  // Update a specific section
  updateSection: async (section, data) => {
    return await request(`/settings/${section}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Test Email
  testEmail: async (recipientEmail) => {
    return await request('/settings/email/test', {
      method: 'POST',
      body: JSON.stringify({ recipientEmail }),
    });
  },

  // Test WhatsApp
  testWhatsApp: async (testPhoneNumber) => {
    return await request('/settings/whatsapp/test', {
      method: 'POST',
      body: JSON.stringify({ testPhoneNumber }),
    });
  },

  // Trigger Database Backup Snapshot
  triggerBackup: async () => {
    return await request('/settings/backup/trigger', {
      method: 'POST',
    });
  },

  // Get Backup Export URL
  getExportUrl: () => {
    const token = localStorage.getItem('kv_token');
    return `${BASE_URL}/settings/backup/export?token=${token || ''}`;
  },
  // Wipe All Customers (Super Admin Only - Danger Zone)
  wipeAllCustomers: async (confirmationPhrase) => {
    return await request('/customers/wipe-all', {
      method: 'DELETE',
      body: JSON.stringify({ confirmationPhrase }),
    });
  },
};

export default settingsService;
