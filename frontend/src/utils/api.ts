import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
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
