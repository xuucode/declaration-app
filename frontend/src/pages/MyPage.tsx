import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api.js';
import { useAuth } from '../hooks/useAuth.js';
import DeclarationCard from '../components/DeclarationCard.js';
import HabitCard from '../components/HabitCard.js';
import ExpenseCard from '../components/ExpenseCard.js';
import Navigation from '../components/Navigation.js';
import { confirmCheckoutSession, createCheckoutSession } from '../utils/api.js';
import { useLanguage } from '../i18n.js';

type Currency = 'JPY' | 'USD';

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
  publicSharedAt?: string;
  isLocked?: boolean;
}

interface Habit {
  declarationId: string;
  title: string;
  description: string;
  limitType: string;
  limitValue: number | null;
  status: string;
  streakCount: number;
  achievedCount?: number;
  totalCount?: number;
  publicSharedAt?: string;
  createdAt: string;
  isLocked?: boolean;
}

interface Expense {
  declarationId: string;
  title: string;
  description: string;
  limitAmount: number;
  currency?: Currency;
  period: string;
  periodStart: string;
  periodEnd: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  isLocked?: boolean;
}

interface CalendarDay {
  date: string;
  achievementRate: number | null;
  achieved: number;
  total: number;
  expenseAmount: number;
  expenseAmounts?: Record<Currency, number>;
}

const MyPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading, refreshUser } = useAuth();
  const { t, locale } = useLanguage();
  const [declarations, setDeclarations] = useState<Declaration[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingSubscription, setConfirmingSubscription] = useState(false);
  const [processedSessionId, setProcessedSessionId] = useState('');
  const [error, setError] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);

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

  const fetchCalendar = useCallback(async () => {
    try {
      const res = await api.get('/users/calendar', { params: { month: calendarMonth } });
      setCalendarDays(res.data.days ?? []);
    } catch {
      // ホームの主要情報を優先するため、カレンダー取得失敗時は空表示に留める。
      setCalendarDays([]);
    }
  }, [calendarMonth]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login');
      return;
    }
    const load = async () => {
      await Promise.all([fetchDeclarations(), fetchHabits(), fetchExpenses(), fetchCalendar()]);
      setLoading(false);
    };
    load();
  }, [authLoading, user, navigate, fetchDeclarations, fetchHabits, fetchExpenses, fetchCalendar]);

  useEffect(() => {
    if (authLoading || !user) return;

    const subscriptionResult = searchParams.get('subscription');
    const sessionId = searchParams.get('session_id');
    if (subscriptionResult !== 'success' || !sessionId || sessionId === processedSessionId) return;

    const confirmSubscription = async () => {
      setProcessedSessionId(sessionId);
      setConfirmingSubscription(true);
      setError('');

      try {
        await confirmCheckoutSession(sessionId);
        await refreshUser();
        navigate('/mypage', { replace: true });
      } catch {
        setError(t('subscriptionConfirmFailed'));
      } finally {
        setConfirmingSubscription(false);
      }
    };

    confirmSubscription();
  }, [authLoading, navigate, processedSessionId, refreshUser, searchParams, t, user]);

  const achievedCount = declarations.filter((d) => d.status === 'done').length;
  const totalReported = declarations.filter((d) => d.status !== 'pending').length;
  const achieveRate = totalReported > 0 ? Math.round((achievedCount / totalReported) * 100) : 0;
  const activeDeclarations = declarations.filter((d) => d.status === 'pending');
  const activeHabits = habits.filter((h) => h.status === 'active');
  const activeExpenses = expenses.filter((e) => e.status === 'active');
  const formatAmount = (value: number, currency: Currency) => new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2,
  }).format(value);
  const totalExpenseOverAmounts = activeExpenses.reduce<Record<Currency, number>>(
    (sum, expense) => {
      const currency = expense.currency ?? 'JPY';
      sum[currency] += Math.max(expense.totalAmount - expense.limitAmount, 0);
      return sum;
    },
    { JPY: 0, USD: 0 }
  );
  const overAmountLabels = (Object.entries(totalExpenseOverAmounts) as [Currency, number][])
    .filter(([, amount]) => amount > 0)
    .map(([currency, amount]) => formatAmount(amount, currency));
  const hasActiveItems = activeDeclarations.length > 0 || activeHabits.length > 0 || activeExpenses.length > 0;
  const calendarMonthDate = new Date(`${calendarMonth}-01T00:00:00`);
  const calendarStartPadding = calendarMonthDate.getDay();
  const calendarCells = [
    ...Array.from({ length: calendarStartPadding }, () => null),
    ...calendarDays,
  ];
  const calendarMonthLabel = calendarMonthDate.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
  });
  const weekdayLabels = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(2026, 1, index + 1);
    return date.toLocaleDateString(locale, { weekday: 'short' });
  });

  const moveCalendarMonth = (offset: number) => {
    const next = new Date(`${calendarMonth}-01T00:00:00`);
    next.setMonth(next.getMonth() + offset);
    const year = next.getFullYear();
    const month = String(next.getMonth() + 1).padStart(2, '0');
    setCalendarMonth(`${year}-${month}`);
  };

  if (authLoading || loading || confirmingSubscription) {
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
        <div className="dashboard-hero bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <div className="flex justify-between items-start gap-4 mb-5">
            <div>
              <p className="dashboard-kicker">STRUCT DASHBOARD</p>
              <h2 className="text-white text-xl font-bold">{user?.displayName}</h2>
              {user?.goal && (
                <p className="text-gray-200 text-sm mt-1">{t('goalLabel')}：{user.goal}</p>
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
          <div className="dashboard-stats grid grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-orange-400">🔥 {user?.streakCount}</p>
              <p className="text-gray-500 text-xs mt-1">{t('streakDays')}</p>
            </div>
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-blue-400">{achieveRate}%</p>
              <p className="text-gray-500 text-xs mt-1">{t('achievementRate')}</p>
            </div>
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-white">{declarations.length}</p>
              <p className="text-gray-500 text-xs mt-1">{t('totalDeclarations')}</p>
            </div>
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-purple-300">𝕏 {user?.shareStreakCount ?? 0}</p>
              <p className="text-gray-500 text-xs mt-1">{t('shareStreak')}</p>
            </div>
            <div className="text-center">
              {overAmountLabels.length > 0 ? (
                <p className="text-red-400 text-sm sm:text-lg md:text-xl font-bold break-words">
                  {overAmountLabels.join(' / ')}
                </p>
              ) : (
                <p className="text-green-400 text-xl sm:text-2xl font-bold">OK</p>
              )}
              <p className="text-gray-500 text-xs mt-1">{t('budgetStatusTitle')}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="dashboard-kicker">{t('calendarKicker')}</p>
              <h2 className="text-white font-semibold text-lg">{calendarMonthLabel}</h2>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => moveCalendarMonth(-1)}
                className="h-9 w-9 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                aria-label={t('previousMonth')}
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => moveCalendarMonth(1)}
                className="h-9 w-9 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                aria-label={t('nextMonth')}
              >
                ›
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2">
            {weekdayLabels.map((day) => (
              <p key={day} className="text-center text-gray-600 text-[11px] font-semibold">
                {day}
              </p>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {calendarCells.map((day, index) => (
              <div
                key={day?.date ?? `empty-${index}`}
                className={`min-h-[68px] rounded-lg border p-2 ${
                  day
                    ? 'bg-gray-950/60 border-gray-800'
                    : 'bg-transparent border-transparent'
                }`}
              >
                {day && (
                  <>
                    <p className="text-gray-500 text-[11px] leading-none mb-2">
                      {Number(day.date.slice(8, 10))}
                    </p>
                    <p className={`text-[11px] sm:text-sm font-bold ${
                      day.achievementRate === null
                        ? 'text-gray-700'
                        : day.achievementRate === 100
                          ? 'text-yellow-300'
                          : day.achievementRate <= 70
                            ? 'text-red-400'
                            : 'text-green-400'
                    }`}>
                      {day.achievementRate === null ? '-' : `${day.achievementRate}%`}
                    </p>
                    {day.total > 0 && (
                      <p className="hidden sm:block text-[11px] text-gray-600 mt-1">
                        {day.achieved}/{day.total}
                      </p>
                    )}
                    {(Object.entries(day.expenseAmounts ?? { JPY: day.expenseAmount, USD: 0 }) as [Currency, number][])
                      .filter(([, amount]) => amount > 0)
                      .map(([currency, amount]) => (
                        <p key={currency} className="calendar-expense-amount text-[11px] text-red-300 mt-1 truncate">
                          -{formatAmount(amount, currency)}
                        </p>
                      ))}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {!hasActiveItems && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
            <p className="text-white font-bold text-lg">{t('emptyHomeTitle')}</p>
            <p className="text-gray-400 text-sm mt-2">{t('emptyHomeLead')}</p>
            <button
              onClick={() => navigate('/tasks')}
              className="mt-4 px-6 py-3 bg-white text-gray-950 font-bold rounded-xl hover:bg-gray-200 transition-colors"
            >
              {t('declareTask')}
            </button>
          </div>
        )}

        {/* 進行中のタスク */}
        {activeDeclarations.length > 0 && (
          <>
            <h2 className="text-white font-semibold text-lg mb-4">{t('activeTasks')}</h2>
            {activeDeclarations.map((d) => (
              <DeclarationCard
                key={d.declarationId}
                declaration={d}
                onUpdate={() => {
                  fetchDeclarations();
                  refreshUser();
                }}
              />
            ))}
          </>
        )}

        {/* 進行中の習慣 */}
        {activeHabits.length > 0 && (
          <>
            <h2 className="text-white font-semibold text-lg mb-4 mt-8">{t('activeHabits')}</h2>
            {activeHabits.map((h) => (
              <HabitCard
                key={h.declarationId}
                habit={h}
                onUpdate={() => {
                  fetchHabits();
                  refreshUser();
                }}
              />
            ))}
          </>
        )}

        {/* 支出管理 */}
        {activeExpenses.length > 0 && (
          <>
            <h2 className="text-white font-semibold text-lg mb-4 mt-8">{t('expenses')}</h2>
            {activeExpenses.map((e) => (
              <ExpenseCard
                key={e.declarationId}
                expense={e}
                onUpdate={() => {
                  fetchExpenses();
                  refreshUser();
                }}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default MyPage;
