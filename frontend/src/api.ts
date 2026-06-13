import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';
const userId = import.meta.env.VITE_USER_ID ?? '2';

export const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'x-user-id': userId,
  },
});
