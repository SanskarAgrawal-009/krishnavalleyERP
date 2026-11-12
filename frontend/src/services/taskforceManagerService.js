import { request, BASE_URL } from './api.js';

const downloadFileBlob = async (endpoint, defaultFilename) => {
  const token = localStorage.getItem('kv_token');
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const errorText = await res.text();
    let msg = 'Failed to download report';
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.message) msg = parsed.message;
    } catch {
      if (errorText) msg = errorText;
    }
    throw new Error(msg);
  }
  const blob = await res.blob();
  const disposition = res.headers.get('content-disposition');
  let filename = defaultFilename;
  if (disposition && disposition.indexOf('filename=') !== -1) {
    const filenameMatch = disposition.match(/filename="?([^";]+)"?/);
    if (filenameMatch && filenameMatch[1]) filename = filenameMatch[1];
  }
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

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

  // Weekly Reports & Performance Analytics
  getWeeklyReports: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const qs = query.toString();
    return request(`/taskforce-manager/weekly-reports${qs ? `?${qs}` : ''}`);
  },

  exportWeeklyReportExcel: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const qs = query.toString();
    return downloadFileBlob(
      `/taskforce-manager/weekly-reports/export-excel${qs ? `?${qs}` : ''}`,
      'Krishna_Valley_Taskforce_Weekly_Report.xlsx'
    );
  },

  exportWeeklyReportWord: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const qs = query.toString();
    return downloadFileBlob(
      `/taskforce-manager/weekly-reports/export-word${qs ? `?${qs}` : ''}`,
      'Krishna_Valley_Taskforce_Weekly_Report.docx'
    );
  },
};

