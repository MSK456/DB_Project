import axios from 'axios';
import useAuthStore from '../store/authStore';

// Reads from VITE_API_URL env var — set in .env for local dev,
// and in Render environment settings for production.
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Public instance — no auth headers (login, register, validate promo)
export const publicApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // sends httpOnly cookies automatically
  headers: { 'Content-Type': 'application/json' },
});

// Private instance — authenticated requests
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Track if token is currently being refreshed
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve()
  );
  failedQueue = [];
};

// RESPONSE INTERCEPTOR — handles token expiry silently
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Hit refresh endpoint — backend reads httpOnly cookie automatically
        await publicApi.post('/auth/refresh-token');
        processQueue(null);
        return api(originalRequest); // retry original
      } catch (refreshError) {
        processQueue(refreshError);
        // Refresh failed — force logout
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);
