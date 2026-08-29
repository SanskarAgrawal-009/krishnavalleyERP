import { request, BASE_URL } from './api.js';

export const auditService = {
  // Get filtered audit logs
  getAuditLogs: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.tab) query.append('tab', params.tab);
    if (params.module && params.module !== 'all') query.append('module', params.module);
    if (params.action && params.action !== 'all') query.append('action', params.action);
    if (params.search) query.append('search', params.search);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);

    return await request(`/audit-logs?${query.toString()}`, {
      method: 'GET',
    });
  },

  // Get KPI Statistics
  getAuditStats: async () => {
    return await request('/audit-logs/stats', {
      method: 'GET',
    });
  },

  // Get Single Log Detail
  getAuditLogById: async (id) => {
    return await request(`/audit-logs/${id}`, {
      method: 'GET',
    });
  },

  // Export URL
  getExportUrl: (format = 'csv', tab = 'all') => {
    const token = localStorage.getItem('kv_token');
    return `${BASE_URL}/audit-logs/export?format=${format}&tab=${tab}&token=${token || ''}`;
  },
};

export default auditService;
