import { request } from './api.js';

export const taskforceMeetingService = {
  // Fetch meetings with filters and pagination
  getMeetings: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const qs = query.toString();
    return request(`/taskforce-meetings${qs ? `?${qs}` : ''}`);
  },

  // Meeting KPI metrics
  getMeetingStats: () => request('/taskforce-meetings/stats'),

  // Get current user's upcoming scheduled meetings (where user is attendee or organizer)
  getMyUpcomingMeetings: () => request('/taskforce-meetings/my-upcoming'),

  // Get single meeting details
  getMeetingById: (id) => request(`/taskforce-meetings/${id}`),

  // Schedule a new meeting
  createMeeting: (data) =>
    request('/taskforce-meetings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Update existing meeting details
  updateMeeting: (id, data) =>
    request(`/taskforce-meetings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Delete / cancel meeting
  deleteMeeting: (id) =>
    request(`/taskforce-meetings/${id}`, {
      method: 'DELETE',
    }),

  // Save / Publish Minutes of Meeting (MoM)
  saveMoM: (id, data) =>
    request(`/taskforce-meetings/${id}/mom`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Convert MoM Action Item to Task
  convertActionItemToTask: (meetingId, actionItemId) =>
    request(`/taskforce-meetings/${meetingId}/convert-action-item`, {
      method: 'POST',
      body: JSON.stringify({ actionItemId }),
    }),

  // Executive sign-off / approval for MoM
  approveMoM: (id, remarks = '') =>
    request(`/taskforce-meetings/${id}/approve-mom`, {
      method: 'POST',
      body: JSON.stringify({ remarks }),
    }),
};

export default taskforceMeetingService;
