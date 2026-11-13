import { request, BASE_URL } from './api.js';

const downloadFileBlob = async (endpoint, defaultFilename) => {
  const token = localStorage.getItem('kv_token');
  
  // Build direct API URL and fallback proxy URL
  const directUrl = `${BASE_URL}${endpoint}`;
  const isLocal = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const targetUrl = isLocal ? `/api${endpoint}` : directUrl;
  
  console.log('[Report Export] Initiating download from:', targetUrl);

  let res;
  try {
    res = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch (firstErr) {
    console.warn('[Report Export] First attempt failed, trying direct URL:', directUrl, firstErr);
    // Fallback directly to backend port
    res = await fetch(directUrl, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  }

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
    let msg = 'Server returned an error response instead of file';
    try {
      const parsed = await res.json();
      if (parsed.message) msg = parsed.message;
    } catch { /* ignore */ }
    throw new Error(msg);
  }

  const arrayBuffer = await res.arrayBuffer();
  console.log('[Report Export] Received binary buffer, bytes:', arrayBuffer.byteLength);

  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    throw new Error('Server returned an empty file');
  }

  // Extract filename from header
  const disposition = res.headers.get('content-disposition');
  let filename = defaultFilename;
  if (disposition && disposition.includes('filename=')) {
    const match = disposition.match(/filename="?([^";]+)"?/);
    if (match && match[1]) filename = match[1];
  }

  // Create real binary Blob with explicit MIME type
  const mime = filename.endsWith('.xlsx')
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : filename.endsWith('.docx')
    ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    : 'application/octet-stream';

  const blob = new Blob([arrayBuffer], { type: mime });
  const blobUrl = window.URL.createObjectURL(blob);

  // Trigger download via off-screen anchor (NOT display:none to avoid Chromium/IDM block)
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.setAttribute('download', filename);
  anchor.style.position = 'fixed';
  anchor.style.top = '-9999px';
  anchor.style.left = '-9999px';
  anchor.style.opacity = '0';
  anchor.style.pointerEvents = 'none';
  document.body.appendChild(anchor);
  
  // Programmatic click
  anchor.click();

  // Also construct direct server URL with token parameter for 1-click fallback
  const directTokenUrl = `${BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}token=${encodeURIComponent(token || '')}`;

  // Keep blob URL active for 30 seconds so fallback buttons can use it
  setTimeout(() => {
    if (anchor.parentNode) anchor.parentNode.removeChild(anchor);
    window.URL.revokeObjectURL(blobUrl);
  }, 30000);

  console.log('[Report Export] ✅ File download triggered successfully:', filename, `(${Math.round(arrayBuffer.byteLength / 1024)} KB)`);
  return {
    success: true,
    filename,
    size: arrayBuffer.byteLength,
    blobUrl,
    directTokenUrl,
  };
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

