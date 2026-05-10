import { api } from './api';

export const pay = (paymentData) =>
  api.post('/payments/pay', paymentData).then(r => r.data);

export const getMyPayments = (params) =>
  api.get('/payments/history', { params }).then(r => r.data);

export const getReceipt = (rideId) =>
  api.get(`/payments/receipt/${rideId}`).then(r => r.data);
