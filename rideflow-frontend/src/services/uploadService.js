import { api } from './api';

export const uploadProfilePhoto = (file) => {
  const formData = new FormData();
  formData.append('profile_photo', file);
  return api.post('/upload/profile-photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data);
};
