import { api, publicApi } from './api';

export const validatePromo = (data) =>
  publicApi.post('/promos/validate', data).then(r => r.data);

export const createPromo = (promoData) =>
  api.post('/promos', promoData).then(r => r.data);

export const listPromos = (params) =>
  api.get('/promos', { params }).then(r => r.data);

export const deactivatePromo = (code) =>
  api.patch(`/promos/${code}/deactivate`).then(r => r.data);
