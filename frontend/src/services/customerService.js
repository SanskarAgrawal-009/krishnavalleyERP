import { request } from './api.js';

export const customerService = {
  createCustomer: (data) => request('/customers', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  getCustomers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/customers${query ? `?${query}` : ''}`);
  },

  getCustomerById: (id) => request(`/customers/${id}`),

  updateCustomer: (id, data) => request(`/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  uploadCustomerDocument: (id, formDataOrFile) => {
    const token = localStorage.getItem('kv_token');
    let body = formDataOrFile;
    if (formDataOrFile instanceof File) {
      const fd = new FormData();
      fd.append('documentFile', formDataOrFile);
      body = fd;
    }
    return fetch(`/api/customers/${id}/documents/upload`, {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body
    }).then(async (res) => {
      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch (_) {}
      if (!res.ok) throw new Error(data.message || `Document upload failed (${res.status})`);
      return data;
    });
  },

  verifyCustomerDocument: (id, docId, data) => request(`/customers/${id}/documents/${docId}/verify`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  logCustomerCommunication: (id, formDataOrData) => {
    const token = localStorage.getItem('kv_token');
    if (formDataOrData instanceof FormData) {
      return fetch(`/api/customers/${id}/communications`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: formDataOrData
      }).then(async (res) => {
        const text = await res.text();
        let data = {};
        try { data = text ? JSON.parse(text) : {}; } catch (_) {}
        if (!res.ok) throw new Error(data.message || `Communication log failed (${res.status})`);
        return data;
      });
    }

    return request(`/customers/${id}/communications`, {
      method: 'POST',
      body: JSON.stringify(formDataOrData)
    });
  },

  deleteCustomer: (id) => request(`/customers/${id}`, {
    method: 'DELETE'
  })
};
