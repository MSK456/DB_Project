import { api } from './api';

export const requestRide = (rideData) =>
  api.post('/rides/request', rideData).then(r => r.data);

export const getActiveRide = () =>
  api.get('/rides/active').then(r => r.data);

export const startTrip = (rideId) =>
  api.patch(`/rides/${rideId}/start`).then(r => r.data);

export const completeTrip = (rideId, tripData) =>
  api.patch(`/rides/${rideId}/complete`, tripData).then(r => r.data);

export const cancelRide = (rideId) =>
  api.patch(`/rides/${rideId}/cancel`).then(r => r.data);

export const getRideHistory = (params) =>
  api.get('/rides/history', { params }).then(r => r.data);

export const estimateFare = (data) =>
  api.post('/rides/estimate', data).then(r => r.data);
