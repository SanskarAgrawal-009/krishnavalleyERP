import { request } from './api.js';

export const agentService = {
  // Get Agent Dashboard KPIs and summary (supports ?agentId for inhouse viewing)
  getDashboard: (agentId) => {
    const query = agentId ? `?agentId=${agentId}` : '';
    return request(`/agent/dashboard${query}`);
  },

  // Get Agent's leads (supports agentId for inhouse viewing)
  getLeads: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/agent/leads${query ? `?${query}` : ''}`);
  },

  // Upload/Register a new lead by agent
  uploadLead: (data) =>
    request('/agent/upload', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Get Agent commission ledger history (supports agentId for inhouse viewing)
  getCommissions: (agentId) => {
    const query = agentId ? `?agentId=${agentId}` : '';
    return request(`/agent/commissions${query}`);
  },

  // Lookup Agent by Agent Code (e.g. AGT-101)
  lookupAgentByCode: (code) => request(`/agent/lookup/${encodeURIComponent(code)}`),

  // Record a new verified site visit (supports FormData for selfie/photo proof)
  recordSiteVisit: (data) => {
    if (data instanceof FormData) {
      return request('/agent/site-visits', {
        method: 'POST',
        body: data,
      });
    }
    return request('/agent/site-visits', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get all site visits with filtering (supports agentId for inhouse viewing)
  getSiteVisits: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/agent/site-visits${query ? `?${query}` : ''}`);
  },

  // Admin / Management verify & approve site visit
  verifySiteVisit: (id, data) =>
    request(`/agent/site-visits/${id}/verify`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Mark site visit completed and trigger commission credit
  matureSiteVisit: (leadId, data = {}) =>
    request(`/leads/${leadId}/mature-site-visit`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Get all agents directory with pagination, search, filters
  getAllAgents: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/agent/all${query ? `?${query}` : ''}`);
  },

  // Get Agent audit logs & activity history
  getAgentAuditLogs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/agent/audit-logs${query ? `?${query}` : ''}`);
  },
};

export default agentService;
