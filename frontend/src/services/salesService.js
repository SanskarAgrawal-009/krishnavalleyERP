import { request, BASE_URL } from './api.js';

export const salesService = {
  convertLead: (data) => request('/sales/convert', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  getSalesLeads: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/sales${query ? `?${query}` : ''}`);
  },

  getSalesLeadById: (id) => request(`/sales/${id}`),

  updateBooking: (id, data) => request(`/sales/${id}/booking`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  updateAgreement: (id, data) => request(`/sales/${id}/agreement`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  uploadAgreementFile: (id, formDataOrFile) => {
    const token = localStorage.getItem('kv_token');
    let body = formDataOrFile;
    if (formDataOrFile instanceof File) {
      const fd = new FormData();
      fd.append('agreementFile', formDataOrFile);
      body = fd;
    }
    return fetch(`${BASE_URL}/sales/${id}/agreement/upload`, {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body
    }).then(async (res) => {
      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch (_) {}
      if (!res.ok) throw new Error(data.message || `Agreement upload failed (${res.status})`);
      return data;
    });
  },

  uploadAgreementDoc: function (id, formDataOrFile) {
    return this.uploadAgreementFile(id, formDataOrFile);
  },

  setupPaymentPlan: (id, data) => request(`/sales/${id}/payment-plan`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  recordInstallmentPayment: (id, data) => request(`/sales/${id}/installments/pay`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  recordPayment: function (id, data) {
    return this.recordInstallmentPayment(id, data);
  },

  generateDemandLetter: (id, data) => request(`/sales/${id}/demand-letters`, {
    method: 'POST',
    body: JSON.stringify(typeof data === 'object' ? data : { installmentNumber: data })
  }),

  addSalesFollowUp: (id, data) => request(`/sales/${id}/follow-ups`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  updatePossession: (id, data) => request(`/sales/${id}/possession`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  processCancellation: (id, data) => request(`/sales/${id}/cancel-refund`, {
    method: 'POST',
    body: JSON.stringify(data)
  })
};
