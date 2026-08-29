import { request, BASE_URL } from './api.js';

export const documentService = {
  getVault: () => request('/documents/vault'),

  uploadLegalDoc: (formDataOrFile) => {
    const token = localStorage.getItem('kv_token');
    let body = formDataOrFile;
    if (formDataOrFile instanceof File) {
      const fd = new FormData();
      fd.append('legalFile', formDataOrFile);
      body = fd;
    }
    return fetch(`${BASE_URL}/documents/legal`, {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body
    }).then(async (res) => {
      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch (_) {}
      if (!res.ok) throw new Error(data.message || `Legal document upload failed (${res.status})`);
      return data;
    });
  },

  uploadBlueprint: (flatId, formDataOrFile) => {
    const token = localStorage.getItem('kv_token');
    let body = formDataOrFile;
    if (formDataOrFile instanceof File) {
      const fd = new FormData();
      fd.append('blueprintFile', formDataOrFile);
      body = fd;
    }
    return fetch(`${BASE_URL}/flats/${flatId}/blueprints`, {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body
    }).then(async (res) => {
      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch (_) {}
      if (!res.ok) throw new Error(data.message || `Blueprint upload failed (${res.status})`);
      return data;
    });
  },

  signAgreement: (data) => request('/documents/sign', {
    method: 'POST',
    body: JSON.stringify(data)
  })
};
