import axios from 'axios';
import { API_BASE_URL } from '../config.js';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// リクエスト時にJWTトークンを自動付与
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const createCheckoutSession = async () => {
  const res = await api.post('/subscriptions/checkout');
  return res.data.url as string;
};

export const confirmCheckoutSession = async (sessionId: string) => {
  await api.post('/subscriptions/confirm', { sessionId });
};

export default api;
