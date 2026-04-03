import api from './api';

export const createSession = async (data) => {
  const response = await api.post('/sessions', data);
  return response.data;
};

export const generateQR = async (course_uuid, duration_minutes = 15) => {
  const response = await api.post(`/sessions/course/${course_uuid}/qr`, { duration_minutes });
  return response.data.data;
};

export const markAttendance = async (data) => {
  const response = await api.post('/sessions/attend', data);
  return response.data;
};

export const getSessionAttendance = async (uuid) => {
  const response = await api.get(`/sessions/${uuid}/attendance`);
  return response.data.data;
};

export const getMyAttendance = async () => {
  const response = await api.get('/sessions/my-attendance');
  return response.data.data;
};

export const getSessionsByCourse = async (course_uuid) => {
  const response = await api.get(`/sessions/course/${course_uuid}`);
  return response.data.data;
};

export const getActiveSession = async (course_uuid) => {
  const response = await api.get(`/sessions/course/${course_uuid}/active`);
  return response.data.data;
};

export const deleteSession = async (session_uuid) => {
  const response = await api.delete(`/sessions/${session_uuid}`);
  return response.data;
};