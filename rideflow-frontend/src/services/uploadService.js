import { api } from './api';

export const uploadProfilePhoto = (file) => {
  const formData = new FormData();
  formData.append('photo', file);

  return api.post('/auth/profile/photo', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    // Optional: monitoring upload progress
    onUploadProgress: (progressEvent) => {
      const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
      if (window.onUploadProgress) {
        window.onUploadProgress(percentCompleted);
      }
    },
  }).then(r => r.data);
};
