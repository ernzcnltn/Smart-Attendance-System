import api from './api';

export const getAttendanceStats = async (course_uuid) => {
  const response = await api.get(`/attendance/courses/${course_uuid}/stats`);
  return response.data.data;
};

export const sendLowAttendanceNotifications = async (course_uuid) => {
  const response = await api.post(`/attendance/courses/${course_uuid}/notify`);
  return response.data;
};

export const getMyNotifications = async () => {
  const response = await api.get('/attendance/notifications');
  return response.data.data;
};

export const markNotificationRead = async (id) => {
  const response = await api.patch(`/attendance/notifications/${id}/read`);
  return response.data;
};

export const deleteNotification = async (id) => {
  const response = await api.delete(`/attendance/notifications/${id}`);
  return response.data;
};

export const getMyAttendanceStats = async () => {
  const response = await api.get('/attendance/my-stats');
  return response.data.data;
};