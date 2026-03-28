import api from './api';

export const getStats = async () => {
  const response = await api.get('/admin/stats');
  return response.data.data;
};

export const getAllUsers = async () => {
  const response = await api.get('/admin/users');
  return response.data.data;
};

export const toggleUserStatus = async (uuid) => {
  const response = await api.patch(`/admin/users/${uuid}/toggle`);
  return response.data;
};

export const deleteUser = async (uuid) => {
  const response = await api.delete(`/admin/users/${uuid}`);
  return response.data;
};

export const getAllCoursesAdmin = async () => {
  const response = await api.get('/admin/courses');
  return response.data.data;
};

export const toggleCourseStatus = async (uuid) => {
  const response = await api.patch(`/admin/courses/${uuid}/toggle`);
  return response.data;
};

export const resetStudentFace = async (uuid) => {
  const response = await api.post('/face/reset', { student_uuid: uuid });
  return response.data;
};

export const resetAllFaces = async () => {
  const response = await api.post('/face/reset-all');
  return response.data;
};