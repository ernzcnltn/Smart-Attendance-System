import api from './api';

export const getSettings = async () => {
  const response = await api.get('/settings');
  return response.data.data;
};

export const updateSetting = async (key, value) => {
  const response = await api.patch(`/settings/${key}`, { value });
  return response.data;
};