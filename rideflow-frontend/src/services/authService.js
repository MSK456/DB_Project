import { publicApi, api } from './api';

export const login = (credentials) =>
  publicApi.post('/auth/login', credentials).then(r => r.data);

export const register = (userData) =>
  publicApi.post('/auth/register', userData).then(r => r.data);

export const logout = () =>
  api.post('/auth/logout').then(r => r.data);

export const getMe = () =>
  api.get('/auth/me').then(r => r.data);

export const updateProfile = (profileData) =>
  api.patch('/auth/profile', profileData).then(r => r.data);
