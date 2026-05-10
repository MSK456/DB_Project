import { api } from './api';

export const toggleAvailability = (data) =>
  api.patch('/driver/availability', data).then(r => r.data);

export const getProfile = () =>
  api.get('/driver/profile').then(r => r.data);

export const getEarningsHistory = (params) =>
  api.get('/driver/earnings', { params }).then(r => r.data);

export const getStats = () =>
  api.get('/driver/stats').then(r => r.data);
