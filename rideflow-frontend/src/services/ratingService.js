import api from './api';

export const submitRating = (data) =>
  api.post('/ratings', data).then(r => r.data);

export const getMyRatings = () =>
  api.get('/ratings/my').then(r => r.data);

export const getRideRatingStatus = (rideId) =>
  api.get(`/ratings/ride/${rideId}/status`).then(r => r.data);
