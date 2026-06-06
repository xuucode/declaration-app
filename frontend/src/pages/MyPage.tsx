import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api.js';
import { useAuth } from '../hooks/useAuth.js';
import DeclarationCard from '../components/DeclarationCard.js';
import HabitCard from '../components/HabitCard.js';
import ExpenseCard from '../components/ExpenseCard.js';
import Navigation from '../components/Navigation.js';
import { createCheckoutSession } from '../utils/api.js';
import { useLanguage } from '../i18n.js';

interface Declaration {
  declarationId: string;
  title: string;
  description: string;
  deadline: string;
  status: 'pending' | 'done' | 'failed';
  createdAt: string;
  reportedAt: string;
  ogpImageUrl: string;
  sharedAt: string;
}

interface Habit {
  declarationId: string;
  title: string;
  description: string;
  limitType: string;
  limitValue: number | null;
  status: string;
  streakCount: number;
  createdAt: string;
}

interface Expense {
  declarationId: string;
  title: string;
  description: string;
  limitAmount: number;
  period: string;
  periodStart: string;
  periodEnd: string;
  totalAmount: number;
  status: string;
  createdAt: string;
}

const MyPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [declarations, setDeclarations] = useState<Declaration[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDeclarations = useCallback(async () => {
    try {
      const res = await api.get('/declarations');
      setDeclarations(res.data);
    } catch {
      setError(t('declarationFetchFailed'));
    }
  }, []);

  const fetchHabits = useCallback(async () => {
    try {
      const res = await api.get('/habits');
      setHabits(res.data);
    } catch {
      // エラー時は何もしない
    }
  }, []);

  const fetchExpenses = useCallback(async () => {
    try {
      const res = await api.get('/expenses');
      setExpenses(res.data);
    } catch {
      // エラー時は何もしない
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login');
      return;
    }
    const load = async () => {
      await Promise.all([fetchDeclarations(), fetchHabits(), fetchExpenses()]);
      setLoading(false);
    };
    load();
  }, [authLoading, user, navigate, fetchDeclarations, fetchHabits, fetchExpenses]);

  const achievedCount = declarations.filter((d) => d.status === 'done').length;
  const totalReported = declarations.filter((d) => d.status !== 'pending').length;
  const achieveRate = totalReported > 0 ? Math.round((achievedCount / totalReported) * 100) : 0;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Navigation />
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* ユーザー情報 */}
<div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
  <div className="flex justify-between items-center mb-4">
    <div>
      <h2 className="text-white text-xl font-bold">{user?.displayName}</h2>
      {user?.goal && (
        <p className="text-gray-200 text-sm mt-1">{user.goal}</p>
      )}
    </div>
    {user?.subscriptionStatus === 'active' ? (
      <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-600 text-xs px-3 py-1 rounded-full font-semibold whitespace-nowrap">
        ⭐ Premium
      </span>
    ) : (
      <button
        onClick={async () => {
          try {
            const url = await createCheckoutSession();
            window.location.href = url;
          } catch {
            setError(t('checkoutFailed'));
          }
        }}
        className="bg-yellow-500 hover:bg-yellow-400 text-gray-950 text-xs px-3 py-1 rounded-full font-semibold transition-colors whitespace-nowrap"
      >
        {t('premiumUpgrade')}
      </button>
    )}
  </div>
  <div className="flex gap-6">
    <div className="text-center">
      <p className="text-2xl font-bold text-orange-400">🔥 {user?.streakCount}</p>
      <p className="text-gray-500 text-xs mt-1">{t('streakDays')}</p>
    </div>
    <div className="text-center">
      <p className="text-2xl font-bold text-blue-400">{achieveRate}%</p>
      <p className="text-gray-500 text-xs mt-1">{t('achievementRate')}</p>
    </div>
    <div className="text-center">
      <p className="text-2xl font-bold text-white">{declarations.length}</p>
      <p className="text-gray-500 text-xs mt-1">{t('totalDeclarations')}</p>
    </div>
  </div>
</div>

        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* 進行中のタスク */}
        <h2 className="text-white font-semibold text-lg mb-4">{t('activeTasks')}</h2>
        {declarations.filter((d) => d.status === 'pending').length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">{t('noActiveTasks')}</p>
            <button
              onClick={() => navigate('/tasks')}
              className="mt-4 px-6 py-3 bg-white text-gray-950 font-bold rounded-xl hover:bg-gray-200 transition-colors"
            >
              {t('declareTask')}
            </button>
          </div>
        ) : (
          declarations
            .filter((d) => d.status === 'pending')
            .map((d) => (
              <DeclarationCard key={d.declarationId} declaration={d} onUpdate={fetchDeclarations} />
            ))
        )}

        {/* 進行中の習慣 */}
        {habits.length > 0 && (
          <>
            <h2 className="text-white font-semibold text-lg mb-4 mt-8">{t('activeHabits')}</h2>
            {habits
              .filter((h) => h.status === 'active')
              .map((h) => (
                <HabitCard key={h.declarationId} habit={h} onUpdate={fetchHabits} />
              ))}
          </>
        )}

        {/* 支出管理 */}
        {expenses.length > 0 && (
          <>
            <h2 className="text-white font-semibold text-lg mb-4 mt-8">{t('expenses')}</h2>
            {expenses
              .filter((e) => e.status === 'active')
              .map((e) => (
                <ExpenseCard key={e.declarationId} expense={e} onUpdate={fetchExpenses} />
              ))}
          </>
        )}
        <p className="text-center text-gray-600 mt-10 text-xs flex justify-center gap-4">
          <Link to="/contact" className="hover:text-gray-300 transition-colors">
            {t('contact')}
          </Link>
          <Link to="/terms" className="hover:text-gray-300 transition-colors">
            {t('terms')}
          </Link>
          <Link to="/privacy" className="hover:text-gray-300 transition-colors">
            {t('privacy')}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default MyPage;
