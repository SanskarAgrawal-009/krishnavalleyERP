import { request, BASE_URL } from './api.js';

export const hrService = {
  getSummary: () => request('/hr/summary'),

  // 1. Master Data
  getMaster: () => request('/hr/master'),
  getRolesByDepartment: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/hr/roles${query ? `?${query}` : ''}`);
  },
  addDepartment: (data) => request('/hr/departments', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  addRole: (data) => request('/hr/roles', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // 2. Employee CRUD
  createEmployee: (data) => request('/hr/employees', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getEmployees: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/hr/employees${query ? `?${query}` : ''}`);
  },
  getEmployeeById: (id) => request(`/hr/employees/${id}`),

  // 3. Attendance
  logAttendance: (idOrData, data) => {
    const id = data ? idOrData : idOrData?.employeeId;
    const payload = data || idOrData;
    return request(`/hr/employees/${id}/attendance`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  markAttendance: function (idOrData, data) {
    return this.logAttendance(idOrData, data);
  },

  // 4. Leaves
  applyLeave: (idOrData, data) => {
    const id = data ? idOrData : idOrData?.employeeId;
    const payload = data || idOrData;
    return request(`/hr/employees/${id}/leaves`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  updateLeaveStatus: (id, leaveId, data) => request(`/hr/employees/${id}/leaves/${leaveId}`, {
    method: 'PUT',
    body: JSON.stringify(typeof data === 'string' ? { status: data } : data)
  }),

  // 5. Payroll
  generatePayroll: (data) => request('/hr/payroll/generate', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  paySalary: (id, payrollId, data) => {
    const token = localStorage.getItem('kv_token');
    const isFormData = data instanceof FormData;
    return fetch(`${BASE_URL}/hr/employees/${id}/payroll/${payrollId}/pay`, {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(isFormData ? {} : { 'Content-Type': 'application/json' })
      },
      body: isFormData ? data : JSON.stringify(data)
    }).then(async (res) => {
      const text = await res.text();
      let resData = {};
      try { resData = text ? JSON.parse(text) : {}; } catch (_) {}
      if (!res.ok) throw new Error(resData.message || `Salary disbursement failed (${res.status})`);
      return resData;
    });
  },

  // 6. Documents Vault
  uploadDoc: (id, formDataOrFile) => {
    const token = localStorage.getItem('kv_token');
    let body = formDataOrFile;
    if (formDataOrFile instanceof File) {
      const fd = new FormData();
      fd.append('documentFile', formDataOrFile);
      body = fd;
    }
    return fetch(`${BASE_URL}/hr/employees/${id}/documents`, {
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

  // 7. Extended HR Operations
  updateEmployee: (id, data) => request(`/hr/employees/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteEmployee: (id) => request(`/hr/employees/${id}`, {
    method: 'DELETE'
  }),
  logBulkAttendance: (data) => request('/hr/attendance/bulk', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getAttendanceByDate: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/hr/attendance${query ? `?${query}` : ''}`);
  },
  deleteLeave: (id, leaveId) => request(`/hr/employees/${id}/leaves/${leaveId}`, {
    method: 'DELETE'
  }),
  getPayrollRegister: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/hr/payroll${query ? `?${query}` : ''}`);
  },
  updateDepartment: (deptId, data) => request(`/hr/departments/${deptId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteDepartment: (deptId) => request(`/hr/departments/${deptId}`, {
    method: 'DELETE'
  }),
  updateRole: (roleId, data) => request(`/hr/roles/${roleId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteRole: (roleId) => request(`/hr/roles/${roleId}`, {
    method: 'DELETE'
  }),
  updateLeaveBalance: (id, data) => request(`/hr/employees/${id}/leave-balance`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  updateIdDetails: (id, data) => request(`/hr/employees/${id}/id-details`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  seedSampleStaff: () => request('/hr/seed-sample-staff', {
    method: 'POST'
  })
};
