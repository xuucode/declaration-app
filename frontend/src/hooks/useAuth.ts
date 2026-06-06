import { useState, useEffect } from 'react';
import api from '../utils/api.js';
import { clearTokens, isLoggedIn } from '../utils/auth.js';

interface User {
  userId: string;
  email: string;
  displayName: string;
  streakCount: number;
  createdAt: string;
  subscriptionStatus?: string;
  stripeCustomerId?: string;
  subscriptionId?: string;
  goal?: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (!isLoggedIn()) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/users/me');
        setUser(res.data);
      } catch {
        clearTokens();
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const logout = () => {
    clearTokens();
    setUser(null);
    window.location.href = '/login';
  };

  return { user, loading, logout };
};