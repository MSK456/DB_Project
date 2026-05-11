import { api } from './api';

export const getOverviewStats = () =>
  api.get('/admin/overview').then(r => r.data);

export const getFareConfigs = () =>
  api.get('/admin/fare-config').then(r => r.data);

export const updateFareConfig = (vehicleType, data) =>
  api.patch(`/admin/fare-config/${vehicleType}`, data).then(r => r.data);

export const getRevenueByCity = (params) =>
  api.get('/admin/reports/revenue/by-city', { params }).then(r => r.data);

export const getRevenueByDay = (params) =>
  api.get('/admin/reports/revenue/by-day', { params }).then(r => r.data);

export const getRevenueByMethod = (params) =>
  api.get('/admin/reports/revenue/by-method', { params }).then(r => r.data);

export const getDriverEarnings = (params) =>
  api.get('/admin/reports/drivers/earnings', { params }).then(r => r.data);

export const getLowRatedDrivers = (params) =>
  api.get('/admin/reports/drivers/low-rated', { params }).then(r => r.data);

export const getTripCounts = (params) =>
  api.get('/admin/reports/drivers/trip-count', { params }).then(r => r.data);

export const getPromoUsage = (params) =>
  api.get('/admin/reports/promos/usage', { params }).then(r => r.data);

export const getFullTripReport = (params) =>
  api.get('/admin/reports/trips/full', { params }).then(r => r.data);

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



