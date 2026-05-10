import { api } from './api';

export const getBalance = () =>
  api.get('/wallet/balance').then(r => r.data);

export const topUp = (data) =>
  api.post('/wallet/topup', data).then(r => r.data);

export const getTransactions = (params) =>
  api.get('/wallet/transactions', { params }).then(r => r.data);

export const requestPayout = (data) =>
  api.post('/wallet/payout', data).then(r => r.data);

export const getPayoutHistory = (params) =>
  api.get('/wallet/payouts', { params }).then(r => r.data);

export const getAdminPayouts = (params) =>
  api.get('/wallet/admin/payouts', { params }).then(r => r.data);
