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
  })
};
