import { request } from './api.js';

export const maintenanceService = {
  // 1. Maintenance Bills
  createBill: (data) => request('/maintenance/bills', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  batchGenerateBills: (data) => request('/maintenance/bills/batch', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  getBills: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/maintenance/bills${query ? `?${query}` : ''}`);
  },

  recordBillPayment: (id, formData) => {
    const token = localStorage.getItem('kv_token');
    if (formData instanceof FormData) {
      return fetch(`/api/maintenance/bills/${id}/pay`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: formData
      }).then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Failed to submit payment proof');
        return json;
      });
    }
    return request(`/maintenance/bills/${id}/pay`, {
      method: 'POST',
      body: JSON.stringify(formData)
    });
  },

  verifyBillPayment: (id, data) => request(`/maintenance/bills/${id}/verify`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  // 2. Service Requests
  createServiceRequest: (data) => request('/maintenance/service-requests', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  getServiceRequests: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/maintenance/service-requests${query ? `?${query}` : ''}`);
  },

  updateServiceRequest: (id, data) => request(`/maintenance/service-requests/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  updateServiceRequestStatus: function (id, data) {
    return this.updateServiceRequest(id, data);
  },

  uploadServicePhoto: (id, formData) => {
    const token = localStorage.getItem('kv_token');
    return fetch(`/api/maintenance/service-requests/${id}/photos`, {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: formData
    }).then(async (res) => {
      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch (_) {}
      if (!res.ok) throw new Error(data.message || `Photo upload failed (${res.status})`);
      return data;
    });
  },

  // 3. Tenant Penalties
  levyPenalty: (formDataOrData) => {
    const token = localStorage.getItem('kv_token');
    if (formDataOrData instanceof FormData) {
      return fetch('/api/maintenance/penalties', {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: formDataOrData
      }).then(async (res) => {
        const text = await res.text();
        let data = {};
        try { data = text ? JSON.parse(text) : {}; } catch (_) {}
        if (!res.ok) throw new Error(data.message || `Penalty levy failed (${res.status})`);
        return data;
      });
    }

    return request('/maintenance/penalties', {
      method: 'POST',
      body: JSON.stringify(formDataOrData)
    });
  },

  issuePenalty: function (formDataOrData) {
    return this.levyPenalty(formDataOrData);
  },

  getPenalties: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/maintenance/penalties${query ? `?${query}` : ''}`);
  },

  settlePenalty: (id, data) => request(`/maintenance/penalties/${id}/settle`, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
};
