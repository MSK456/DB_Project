import { api } from './api';

export const getOverviewStats = () =>
  api.get('/admin/overview').then(r => r.data);

export const getFareConfigs = () =>
  api.get('/admin/fare-config').then(r => r.data);

export const updateFareConfig = (vehicleType, data) =>
  api.patch(`/admin/fare-config/${vehicleType}`, data).then(r => r.data);

export const getRevenueByDay = (params) =>
  api.get('/admin/stats/revenue', { params }).then(r => r.data);

export const getUsers = (params) =>
  api.get('/admin/users', { params }).then(r => r.data);

export const updateUserStatus = (userId, status, reason) =>
  api.patch(`/admin/users/${userId}/status`, { status, reason }).then(r => r.data);

export const processPayout = (payoutId, data) =>
  api.patch(`/admin/payouts/${payoutId}`, data).then(r => r.data);

export const getAdminLogs = (params) =>
  api.get('/admin/logs', { params }).then(r => r.data);

export const getReport = (reportType, params) =>
  api.get(`/admin/reports/${reportType}`, { params }).then(r => r.data);

