import { useState, useCallback, useEffect } from 'react';
import api from '../utils/api.js';
import { clearTokens, isLoggedIn } from '../utils/auth.js';

interface User {
  userId: string;
  email: string;
  displayName: string;
  streakCount: number;
  shareStreakCount?: number;
  createdAt: string;
  subscriptionStatus?: string;
  stripeCustomerId?: string;
  subscriptionId?: string;
  subscriptionCancelAtPeriodEnd?: boolean;
  goal?: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!isLoggedIn()) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.get('/users/me');
      setUser(res.data);
    } catch {
      clearTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial authentication sync is intentionally kicked off once on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshUser();
  }, [refreshUser]);

  const logout = () => {
    clearTokens();
    setUser(null);
    window.location.href = '/login';
  };

  return { user, loading, logout, refreshUser };
};
