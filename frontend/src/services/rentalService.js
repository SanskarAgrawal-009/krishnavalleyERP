import { request, BASE_URL } from './api.js';

export const rentalService = {
  createRental: (data) => request('/rentals', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  getRentals: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/rentals${query ? `?${query}` : ''}`);
  },

  getRentalById: (id) => request(`/rentals/${id}`),

  updateRental: (id, data) => request(`/rentals/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  
  getOwnerByFlat: (flatId) => request(`/rentals/flat-owner/${flatId}`),

  updateRentBack: (id, data) => request(`/rentals/${id}/rent-back`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  updateTenantAgreement: (id, data) => request(`/rentals/${id}/tenant-agreement`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  uploadRentBackDoc: (id, formDataOrFile) => {
    const token = localStorage.getItem('kv_token');
    let body = formDataOrFile;
    if (formDataOrFile instanceof File) {
      const fd = new FormData();
      fd.append('agreementFile', formDataOrFile);
      body = fd;
    }
    return fetch(`${BASE_URL}/rentals/${id}/rent-back/upload`, {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body
    }).then(async (res) => {
      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch (_) {}
      if (!res.ok) throw new Error(data.message || `Rent-Back document upload failed (${res.status})`);
      return data;
    });
  },

  uploadTenantAgreementDoc: (id, formDataOrFile) => {
    const token = localStorage.getItem('kv_token');
    let body = formDataOrFile;
    if (formDataOrFile instanceof File) {
      const fd = new FormData();
      fd.append('agreementFile', formDataOrFile);
      body = fd;
    }
    return fetch(`${BASE_URL}/rentals/${id}/tenant-agreement/upload`, {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body
    }).then(async (res) => {
      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch (_) {}
      if (!res.ok) throw new Error(data.message || `Tenant agreement upload failed (${res.status})`);
      return data;
    });
  },

  updateAllocation: (id, data) => request(`/rentals/${id}/allocation`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  recordDepositPayment: (id, data) => request(`/rentals/${id}/deposits/pay`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  terminateContract: (id, data = {}) => request(`/rentals/${id}/terminate`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  processTermination: function (id, data) {
    return this.terminateContract(id, data);
  },

  deleteRental: (id) => request(`/rentals/${id}`, {
    method: 'DELETE'
  }),

  addPenalty: (id, data) => request(`/maintenance/penalties`, {
    method: 'POST',
    body: JSON.stringify({ ...data, rentalId: id })
  }),

  recordOwnerPayout: (id, data) => request(`/rentals/${id}/payout`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  importRentalLedger: (payload, format = 'single_passbook') => request(`/rentals/import-ledger`, {
    method: 'POST',
    body: JSON.stringify({ payload, format })
  })
};
