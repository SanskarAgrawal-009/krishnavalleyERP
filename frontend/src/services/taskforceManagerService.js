import { request, BASE_URL } from './api.js';

const downloadFileBlob = async (endpoint, defaultFilename) => {
  const token = localStorage.getItem('kv_token');
  
  // In dev, use relative path through Vite proxy (/api/...) to avoid CORS.
  // In production, use the full BASE_URL.
  const isLocalDev = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const fullUrl = isLocalDev ? `/api${endpoint}` : `${BASE_URL}${endpoint}`;
  console.log('[Report Export] Fetching:', fullUrl);

  let res;
  try {
    res = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch (networkErr) {
    console.error('[Report Export] Network error:', networkErr);
    throw new Error('Network error — please check your connection and try again.');
  }

  console.log('[Report Export] Status:', res.status, 'content-type:', res.headers.get('content-type'));

  if (!res.ok) {
    let msg = `Download failed (${res.status})`;
    try {
      const errorText = await res.text();
      const parsed = JSON.parse(errorText);
      if (parsed.message) msg = parsed.message;
    } catch { /* use default msg */ }
    console.error('[Report Export] Server error:', msg);
    throw new Error(msg);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    let msg = 'Server returned JSON instead of a file';
    try { const p = await res.json(); if (p.message) msg = p.message; } catch { /* ignore */ }
    throw new Error(msg);
  }

  const blob = await res.blob();
  console.log('[Report Export] Blob received — size:', blob.size, 'type:', blob.type);

  if (!blob || blob.size === 0) {
    throw new Error('Server returned an empty file. Please try again.');
  }

  const disposition = res.headers.get('content-disposition');
  let filename = defaultFilename;
  if (disposition && disposition.includes('filename=')) {
    const match = disposition.match(/filename="?([^";]+)"?/);
    if (match && match[1]) filename = match[1];
  }

  const blobUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();

  setTimeout(() => {
    if (anchor.parentNode) anchor.parentNode.removeChild(anchor);
    window.URL.revokeObjectURL(blobUrl);
  }, 5000);

  console.log('[Report Export] ✅ Download triggered:', filename, `(${Math.round(blob.size / 1024)} KB)`);
  return { success: true, filename, size: blob.size };
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

