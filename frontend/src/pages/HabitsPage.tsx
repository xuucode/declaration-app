import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api.js';
import { useAuth } from '../hooks/useAuth.js';
import HabitCard from '../components/HabitCard.js';
import Navigation from '../components/Navigation.js';
import { createCheckoutSession } from '../utils/api.js';
import { useLanguage } from '../i18n.js';
import LoadingPage from '../components/LoadingPage.js';

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

const HabitsPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [limitType, setLimitType] = useState<'binary' | 'count'>('binary');
  const [limitValue, setLimitValue] = useState('');
  const [error, setError] = useState('');
  const isPageLoading = authLoading || loading;

  const fetchHabits = useCallback(async () => {
    try {
      const res = await api.get('/habits');
      setHabits(res.data);
    } catch {
      setError(t('habitFetchFailed'));
    }
  }, [t]);

  const [unloggedWarnings, setUnloggedWarnings] = useState<{declarationId: string, title: string, date: string}[]>([]);

  const checkAutoFail = useCallback(async () => {
    try {
      const res = await api.post('/habits/auto-fail', {});
      setUnloggedWarnings(res.data.unloggedHabits ?? []);
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
    const init = async () => {
      await checkAutoFail();
      await fetchHabits();
      setLoading(false);
    };
    init();
  }, [authLoading, user, navigate, fetchHabits, checkAutoFail]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await api.post('/habits', {
        title,
        description,
        limitType,
        limitValue: limitValue ? Number(limitValue) : null,
      });
      setTitle('');
      setDescription('');
      setLimitType('binary');
      setLimitValue('');
      setShowForm(false);
      fetchHabits();
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(message ?? t('habitCreateFailed'));
    }
  };

  if (isPageLoading) {
    return <LoadingPage active={isPageLoading} />;
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Navigation />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h2 className="text-white text-2xl font-bold mb-6">{t('habitManagement')}</h2>

        {unloggedWarnings.length > 0 && (
          <div className="bg-yellow-900/30 border border-yellow-800 rounded-xl p-4 mb-6">
            <p className="text-yellow-400 font-semibold mb-2">{t('unloggedHabits')}</p>
            <ul className="space-y-1">
              {unloggedWarnings.map((w, i) => (
                <li key={`${w.declarationId}-${w.date}-${i}`} className="text-yellow-300 text-sm">
                  ・「{w.title}」{w.date} {t('unloggedHabitRecorded')}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!showForm && (
          <button
            onClick={() => {
              setError('');
              setShowForm(true);
            }}
            className="w-full py-4 bg-white text-gray-950 font-bold rounded-xl hover:bg-gray-200 transition-colors mb-6 text-lg"
          >
            {t('addNewHabit')}
          </button>
        )}

        {showForm && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
            <h3 className="text-white font-semibold text-lg mb-4">{t('newHabit')}</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('habitName')}</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder={t('habitPlaceholder')}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('detailsOptional')}</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder={t('detailsPlaceholder')}
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">{t('type')}</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setLimitType('binary')}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                      limitType === 'binary'
                        ? 'bg-white text-gray-950 border-white'
                        : 'bg-gray-800 text-gray-400 border-gray-700'
                    }`}
                  >
                    {t('binaryType')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLimitType('count')}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                      limitType === 'count'
                        ? 'bg-white text-gray-950 border-white'
                        : 'bg-gray-800 text-gray-400 border-gray-700'
                    }`}
                  >
                    {t('countLimit')}
                  </button>
                </div>
              </div>
              {limitType === 'count' && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t('maxCount')}</label>
                  <input
                    type="number"
                    value={limitValue}
                    onChange={(e) => setLimitValue(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                    placeholder="3"
                    min="1"
                    required
                  />
                </div>
              )}
              {error && (
                <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3">
                  <p className="text-red-400 text-sm">{error}</p>
                  {error.includes('プレミアム') && (
                    <button
                      type="button"
                      onClick={async () => {
                        const url = await createCheckoutSession();
                        window.location.href = url;
                      }}
                      className="mt-3 w-full bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-semibold py-2 rounded-lg text-sm transition-colors"
                    >
                      {t('upgradePremium')}
                    </button>
                  )}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-white text-gray-950 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {t('add')}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setError(''); }}
                  className="flex-1 py-3 bg-gray-800 text-gray-300 font-semibold rounded-lg hover:bg-gray-700 transition-colors"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          </div>
        )}

        {habits.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500">{t('noHabits')}</p>
            <p className="text-gray-600 text-sm mt-2">{t('noHabitsLead')}</p>
          </div>
        ) : (
          habits.map((h) => (
            <HabitCard key={h.declarationId} habit={h} onUpdate={fetchHabits} />
          ))
        )}
      </div>
    </div>
  );
};

export default HabitsPage;
