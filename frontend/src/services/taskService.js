import { request } from './api.js';

export const taskService = {
  // Fetch tasks with filters
  getTasks: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const qs = query.toString();
    return request(`/tasks${qs ? `?${qs}` : ''}`);
  },

  // KPI Dashboard stats
  getStats: () => request('/tasks/stats'),

  // Single task details
  getTaskById: (id) => request(`/tasks/${id}`),

  // Create new task & assign to multiple staff / departments
  createTask: (data) =>
    request('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Update full task metadata
  updateTask: (id, data) =>
    request(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Update progress slider (0-100), status, or report/resolve roadblock
  updateProgress: (id, data) =>
    request(`/tasks/${id}/progress`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Log follow-up conversation / inspection outcome & schedule next check
  logFollowUp: (id, data) =>
    request(`/tasks/${id}/follow-up`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Post communication message or MD directive note
  addComment: (id, data) =>
    request(`/tasks/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Delete task
  deleteTask: (id) =>
    request(`/tasks/${id}`, {
      method: 'DELETE',
    }),

  // Toggle subtask checkpoint completion
  toggleCheckpoint: (taskId, checkpointId) =>
    request(`/tasks/${taskId}/checkpoints/${checkpointId}`, {
      method: 'PATCH',
    }),

  // Metadata: active users, departments, projects, and flats
  getAssigneesMeta: () => request('/tasks/meta/assignees'),
};
