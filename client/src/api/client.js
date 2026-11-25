import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const TOKEN_KEY = 'spendwise_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: token => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY)
};

const api = axios.create({ baseURL: API_URL, timeout: 20000 });

api.interceptors.request.use(config => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// The server tags expired/invalid sessions with code AUTH_REQUIRED, so a wrong
// password on the "change password" form does not sign the user out.
let onUnauthorized = null;
export const setUnauthorizedHandler = handler => { onUnauthorized = handler; };

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401 && error.response.data?.code === 'AUTH_REQUIRED') {
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

export function errorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (error.response?.data?.message) return error.response.data.message;
  if (error.code === 'ERR_NETWORK') return 'Cannot reach the server. Check that the API is running and try again.';
  if (error.code === 'ECONNABORTED') return 'The server took too long to respond. Please try again.';
  return fallback;
}

export default api;
