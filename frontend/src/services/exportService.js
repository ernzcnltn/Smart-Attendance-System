import { getToken } from '../utils/helpers';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const exportExcel = (course_uuid) => {
  const token = getToken();
  window.open(`${BASE_URL}/export/courses/${course_uuid}/excel?token=${token}`, '_blank');
};

export const exportPDF = (course_uuid) => {
  const token = getToken();
  window.open(`${BASE_URL}/export/courses/${course_uuid}/pdf?token=${token}`, '_blank');
};