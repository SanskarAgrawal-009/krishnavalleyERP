import { request } from './api.js';

export const projectService = {
  // Projects
  getProjects: () => request('/projects'),
  getProjectById: (id) => request(`/projects/${id}`),
  createProject: (data) => request('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id, data) => request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),

  // Buildings & Floors in Project
  addBuilding: (projectId, data) => request(`/projects/${projectId}/buildings`, { method: 'POST', body: JSON.stringify(data) }),
  deleteBuilding: (projectId, buildingId) => request(`/projects/${projectId}/buildings/${buildingId}`, { method: 'DELETE' }),
  addFloor: (projectId, buildingId, data) => request(`/projects/${projectId}/buildings/${buildingId}/floors`, { method: 'POST', body: JSON.stringify(data) }),

  // Flats
  getFlats: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/flats${query ? `?${query}` : ''}`);
  },
  getFlatById: (id) => request(`/flats/${id}`),
  createFlat: (data) => request('/flats', { method: 'POST', body: JSON.stringify(data) }),
  updateFlat: (id, data) => request(`/flats/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteFlat: (id) => request(`/flats/${id}`, { method: 'DELETE' })
};
