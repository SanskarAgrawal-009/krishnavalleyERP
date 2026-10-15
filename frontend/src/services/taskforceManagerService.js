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

  // Taskforce Team Hierarchy (Helper -> Supervisor -> Head)
  getTeam: () => request('/taskforce-manager/team'),

  addTeamMember: (data) =>
    request('/taskforce-manager/team', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTeamMember: (id, data) =>
    request(`/taskforce-manager/team/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteTeamMember: (id) =>
    request(`/taskforce-manager/team/${id}`, {
      method: 'DELETE',
    }),

  // Manage user credentials (User ID & Password) for taskforce member or user
  getAllCredentials: () => request('/taskforce-manager/credentials'),

  updateMemberCredentials: (id, data) =>
    request(`/taskforce-manager/team/${id}/credentials`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  updateUserCredentials: (id, data) =>
    request(`/taskforce-manager/user/${id}/credentials`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Taskforce Departments Management
  getDepartments: () => request('/taskforce-manager/departments'),

  createDepartment: (data) =>
    request('/taskforce-manager/departments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateDepartment: (id, data) =>
    request(`/taskforce-manager/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteDepartment: (department, fallbackDepartment = 'General Operations') =>
    request('/taskforce-manager/department/delete', {
      method: 'POST',
      body: JSON.stringify({ department, fallbackDepartment }),
    }),

  // Member Dashboard (Scoped by Helper / Supervisor / Head / Manager)
  getMemberDashboard: (memberId) =>
    request(`/taskforce-manager/team/${memberId || 'me'}/dashboard`),

  getMyDashboard: () =>
    request('/taskforce-manager/my-dashboard'),
};

