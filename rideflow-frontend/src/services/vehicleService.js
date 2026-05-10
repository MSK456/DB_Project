import { api } from './api';

export const addVehicle = (vehicleData) =>
  api.post('/vehicles', vehicleData).then(r => r.data);

export const getMyVehicles = () =>
  api.get('/vehicles/my').then(r => r.data);

export const getPendingVehicles = () =>
  api.get('/vehicles/pending').then(r => r.data);

export const adminVerifyVehicle = (vehicleId, data) =>
  api.patch(`/vehicles/${vehicleId}/verify`, data).then(r => r.data);
