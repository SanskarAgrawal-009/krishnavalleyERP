import { request } from './api.js';

export const taskforceManagerService = {
  // Workforce & Team workload overview
  getWorkforce: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const qs = query.toString();
    return request(`/taskforce-manager/workforce${qs ? `?${qs}` : ''}`);
  },

  // Performance metrics for all team members
  getPerformance: (period = 30) =>
    request(`/taskforce-manager/performance?period=${period}`),

  // Gantt / Timeline data
  getTimeline: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const qs = query.toString();
    return request(`/taskforce-manager/timeline${qs ? `?${qs}` : ''}`);
  },

  // Department-level stats
  getDepartmentStats: () =>
    request('/taskforce-manager/department-stats'),

  // Bulk reassign tasks
  bulkReassign: (data) =>
    request('/taskforce-manager/bulk-reassign', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Bulk task action (approve, reject, escalate, cancel)
  bulkAction: (data) =>
    request('/taskforce-manager/bulk-action', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
