import { request } from './api.js';

export const leadService = {
  getLeads: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/leads${query ? `?${query}` : ''}`);
  },

  getLeadById: (id) => request(`/leads/${id}`),

  createLead: (data) => request('/leads', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  updateLead: (id, data) => request(`/leads/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  deleteLead: (id) => request(`/leads/${id}`, {
    method: 'DELETE'
  }),

  // Lead Assignment & Round-Robin Methods
  assignLead: (data) => request('/leads/assign', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  distributeRoundRobin: (data = {}) => request('/leads/distribute-round-robin', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  updateLeadStatus: (leadId, data) => request(`/leads/${leadId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),

  scheduleFollowUp: (leadId, data) => request(`/leads/${leadId}/schedule-follow-up`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Sales Team Pool Management
  getSalesTeam: () => request('/leads/team'),

  addSalesTeamMember: (data) => request('/leads/team', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  updateSalesTeamMember: (id, data) => request(`/leads/team/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  removeSalesTeamMember: (id) => request(`/leads/team/${id}`, {
    method: 'DELETE'
  }),

  // Meta Ads Integration Endpoints
  getMetaConfig: () => request('/leads/meta-config'),

  updateMetaConfig: (data) => request('/leads/meta-config', {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  testMetaLead: (data = {}) => request('/leads/meta-test-lead', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Follow-Up Subdocument Endpoints
  addFollowUp: (leadId, data) => request(`/leads/${leadId}/follow-ups`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  updateFollowUp: (leadId, followUpId, data) => request(`/leads/${leadId}/follow-ups/${followUpId}`, {
    method: 'PUT',
    body: JSON.stringify(typeof data === 'string' ? { status: data } : data)
  }),

  updateFollowUpStatus: (leadId, followUpId, status) => request(`/leads/${leadId}/follow-ups/${followUpId}`, {
    method: 'PUT',
    body: JSON.stringify({ status })
  }),

  deleteFollowUp: (leadId, followUpId) => request(`/leads/${leadId}/follow-ups/${followUpId}`, {
    method: 'DELETE'
  }),

  matureSiteVisit: (leadId, data = {}) => request(`/leads/${leadId}/mature-site-visit`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  approveSiteVisit: (leadId, data = {}) => request(`/leads/${leadId}/approve-site-visit`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  rejectSiteVisit: (leadId, data = {}) => request(`/leads/${leadId}/reject-site-visit`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  logExternalSiteVisit: (leadId, data) => request(leadId ? `/leads/${leadId}/external-site-visit` : '/leads/external-site-visit', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  getDueReminders: () => request('/leads/reminders/due'),

  sendManualReminder: (data) => request('/leads/reminders/send-manual', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  snoozeReminder: (data) => request('/leads/reminders/snooze', {
    method: 'POST',
    body: JSON.stringify(data)
  })
};
