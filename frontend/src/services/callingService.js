import { request } from './api.js';

export const callingService = {
  // Initiate outbound call via Calling API / Softphone
  initiateCall: (data) =>
    request('/calls/initiate', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Log call outcome, notes, and duration
  logCall: (data) =>
    request('/calls/log', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Get call history & logs
  getCallLogs: (params = {}) => {
    const query = new URLSearchParams();
    if (params.leadId) query.append('leadId', params.leadId);
    if (params.customerId) query.append('customerId', params.customerId);
    if (params.agentId) query.append('agentId', params.agentId);
    if (params.status && params.status !== 'all') query.append('status', params.status);
    if (params.outcome && params.outcome !== 'all') query.append('outcome', params.outcome);
    if (params.search) query.append('search', params.search);
    if (params.limit) query.append('limit', params.limit);
    if (params.page) query.append('page', params.page);
    const qs = query.toString();
    return request(`/calls/logs${qs ? `?${qs}` : ''}`);
  },

  // Telephony configuration
  getConfig: () => request('/calls/config'),
  updateConfig: (data) =>
    request('/calls/config', {
      method: 'PUT',
      body: JSON.stringify(data)
    })
};

export default callingService;
