import api from './api';
import { setToken, setUser, removeToken, removeUser } from '../utils/helpers';

export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  const { token, user } = response.data.data;
  setToken(token);
  setUser(user);
  return user;
};

export const register = async (data) => {
  const response = await api.post('/auth/register', data);
  return response.data;
};

export const logout = () => {
  removeToken();
  removeUser();
};

export const getMe = async () => {
  const response = await api.get('/auth/me');
  return response.data.data;
};

export const searchStudents = async (query) => {
  const response = await api.get(`/auth/students/search?query=${query}`);
  return response.data.data;
};