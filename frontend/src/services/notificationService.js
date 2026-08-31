import { request } from './api.js';

export const notificationService = {
  // Configuration
  getConfig: () => request('/notifications/config'),
  updateConfig: (data) =>
    request('/notifications/config', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  // Test Channel Dispatch
  testChannel: (data) =>
    request('/notifications/test-channel', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Verify SMTP Connection Live
  verifyEmailSmtp: (data) =>
    request('/notifications/email/verify', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Reminder Templates CRUD
  getTemplates: (params = {}) => {
    const query = new URLSearchParams();
    if (params.category && params.category !== 'all') query.append('category', params.category);
    if (params.channel && params.channel !== 'all') query.append('channel', params.channel);
    if (params.search) query.append('search', params.search);
    const qs = query.toString();
    return request(`/notifications/templates${qs ? `?${qs}` : ''}`);
  },

  createTemplate: (data) =>
    request('/notifications/templates', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateTemplate: (id, data) =>
    request(`/notifications/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  deleteTemplate: (id) =>
    request(`/notifications/templates/${id}`, {
      method: 'DELETE'
    }),

  seedTemplates: () =>
    request('/notifications/templates/seed', {
      method: 'POST'
    }),

  // Send multi-channel template notification
  sendTemplateNotification: (data) =>
    request('/notifications/send-template', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Audit Logs
  getLogs: (params = {}) => {
    const query = new URLSearchParams();
    if (params.channel && params.channel !== 'all') query.append('channel', params.channel);
    if (params.status && params.status !== 'all') query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    if (params.limit) query.append('limit', params.limit);
    const qs = query.toString();
    return request(`/notifications/logs${qs ? `?${qs}` : ''}`);
  },

  clearLogs: () =>
    request('/notifications/logs', {
      method: 'DELETE'
    })
};
