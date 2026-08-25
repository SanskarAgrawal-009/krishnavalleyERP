import { request } from './api.js';

export const authService = {
  // Authentication
  login: async (identifier, password) => {
    return await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
  },

  getMe: async () => {
    return await request('/auth/me', {
      method: 'GET',
    });
  },

  changePassword: async (currentPassword, newPassword) => {
    return await request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  logout: async () => {
    try {
      await request('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    }
  },

  // User Management
  getUsers: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await request(`/users${query ? `?${query}` : ''}`, {
      method: 'GET',
    });
  },

  getUserById: async (id) => {
    return await request(`/users/${id}`, {
      method: 'GET',
    });
  },

  createUser: async (userData) => {
    return await request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  updateUser: async (id, userData) => {
    return await request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },

  updateUserStatus: async (id, status) => {
    return await request(`/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  resetUserPassword: async (id, newPassword) => {
    return await request(`/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  },

  deleteUser: async (id) => {
    return await request(`/users/${id}`, {
      method: 'DELETE',
    });
  },

  // Role & Permissions Management
  getRoles: async () => {
    return await request('/roles', {
      method: 'GET',
    });
  },

  getRoleById: async (id) => {
    return await request(`/roles/${id}`, {
      method: 'GET',
    });
  },

  createRole: async (roleData) => {
    return await request('/roles', {
      method: 'POST',
      body: JSON.stringify(roleData),
    });
  },

  updateRole: async (id, roleData) => {
    return await request(`/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(roleData),
    });
  },

  deleteRole: async (id) => {
    return await request(`/roles/${id}`, {
      method: 'DELETE',
    });
  },

  getPermissions: async () => {
    return await request('/roles/permissions', {
      method: 'GET',
    });
  },

  getBranches: async () => {
    return await request('/roles/branches', {
      method: 'GET',
    });
  },
};

export default authService;
