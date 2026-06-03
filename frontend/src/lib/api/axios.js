import axios from 'axios';
import { getAuth, useAuthStore } from '@/store/authStore';

const baseURL = (import.meta.env.VITE_API_URL || '') + '/api';

export const api = axios.create({ baseURL });

// ── Request: attach access token ──
api.interceptors.request.use((config) => {
  const { accessToken } = getAuth();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// ── Response: auto-refresh on 401 ──
let isRefreshing = false;
let queue = [];

const processQueue = (error, token = null) => {
  queue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  queue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    if (status === 401 && !original._retry) {
      const { refreshToken } = getAuth();
      if (!refreshToken) {
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject });
        }).then((token) => {
          original._retry = true; // qayta urinishda yana 401 bo'lsa refresh siklini boshlamasin
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
        useAuthStore.getState().setAuth({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        });
        processQueue(null, data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (e) {
        processQueue(e, null);
        useAuthStore.getState().logout();
        return Promise.reject(error); // asl so'rov xatosini qaytaramiz (refresh xatosini emas)
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

/** Extract a human (uz) error message from an axios error. */
export function apiError(error, fallback = 'Xatolik yuz berdi') {
  const msg = error?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  return msg || fallback;
}
