import api from './api';

export const getAllCourses = async () => {
  const response = await api.get('/courses');
  return response.data.data;
};

export const getMyCourses = async () => {
  const response = await api.get('/courses/my');
  return response.data.data;
};

export const getCourseByUUID = async (uuid) => {
  const response = await api.get(`/courses/${uuid}`);
  return response.data.data;
};

export const createCourse = async (data) => {
  const response = await api.post('/courses', data);
  return response.data;
};

export const enrollStudent = async (data) => {
  const response = await api.post('/courses/enroll', data);
  return response.data;
};

export const getCourseStudents = async (uuid) => {
  const response = await api.get(`/courses/${uuid}/students`);
  return response.data.data;
};

export const deleteCourse = async (course_uuid) => {
  const response = await api.delete(`/courses/${course_uuid}`);
  return response.data;
};