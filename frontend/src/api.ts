import axios from 'axios';
import type { AuthUser } from './types';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
const AUTH_TOKEN_KEY = 'poskios.auth.token';
const AUTH_USER_KEY = 'poskios.auth.user';

export const api = axios.create({
  baseURL: apiBaseUrl,
});

export function getAuthToken() {
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getStoredAuthUser(): AuthUser | null {
  const raw = window.localStorage.getItem(AUTH_USER_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    window.localStorage.removeItem(AUTH_USER_KEY);
    return null;
  }
}

export function setAuthSession(accessToken: string, user: AuthUser) {
  window.localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);
}

api.interceptors.request.use((config) => {
  const token = getAuthToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && getAuthToken()) {
      clearAuthSession();
      window.location.reload();
    }

    return Promise.reject(error);
  },
);
