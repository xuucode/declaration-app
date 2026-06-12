import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api.js';
import { useAuth } from '../hooks/useAuth.js';
import ExpenseCard from '../components/ExpenseCard.js';
import Navigation from '../components/Navigation.js';
import { createCheckoutSession } from '../utils/api.js';
import { useLanguage } from '../i18n.js';
import LoadingPage from '../components/LoadingPage.js';

type Currency = 'JPY' | 'USD';

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

const ExpensesPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { language, t } = useLanguage();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [limitAmount, setLimitAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>(() => language === 'en' ? 'USD' : 'JPY');
  const [period, setPeriod] = useState<'monthly' | 'weekly' | 'custom'>('monthly');
  const [customEndDate, setCustomEndDate] = useState('');
  const [error, setError] = useState('');
  const today = new Date().toISOString().slice(0, 10);

  const fetchExpenses = useCallback(async () => {
    try {
      const res = await api.get('/expenses');
      setExpenses(res.data);
    } catch {
      setError(t('expenseFetchFailed'));
    }
  }, [t]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login');
      return;
    }
    const load = async () => {
      await fetchExpenses();
      setLoading(false);
    };
    load();
  }, [authLoading, user, navigate, fetchExpenses]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (period === 'custom' && !customEndDate) {
        setError(t('customEndDateRequired'));
        return;
      }

      await api.post('/expenses', {
        title,
        description,
        limitAmount: Number(limitAmount),
        currency,
        period,
        customEndDate: period === 'custom' ? customEndDate : undefined,
      });
      setTitle('');
      setDescription('');
      setLimitAmount('');
      setCurrency(language === 'en' ? 'USD' : 'JPY');
      setPeriod('monthly');
      setCustomEndDate('');
      setShowForm(false);
      fetchExpenses();
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(message ?? t('expenseCreateFailed'));
    }
  };

  if (authLoading || loading) {
    return <LoadingPage active={authLoading || loading} />;
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Navigation />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h2 className="text-white text-2xl font-bold mb-6">{t('expenseManagement')}</h2>

        {!showForm && (
          <button
            onClick={() => {
              setError('');
              setShowForm(true);
            }}
            className="w-full py-4 bg-white text-gray-950 font-bold rounded-xl hover:bg-gray-200 transition-colors mb-6 text-lg"
          >
            {t('addExpenseManagement')}
          </button>
        )}

        {showForm && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
            <h3 className="text-white font-semibold text-lg mb-4">{t('newExpenseManagement')}</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('categoryName')}</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder={t('expenseCategoryPlaceholder')}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('detailsOptional')}</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder={t('expenseDetailsPlaceholder')}
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">{t('period')}</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPeriod('monthly');
                      setCustomEndDate('');
                    }}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                      period === 'monthly'
                        ? 'bg-white text-gray-950 border-white'
                        : 'bg-gray-800 text-gray-400 border-gray-700'
                    }`}
                  >
                    {t('monthly')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPeriod('weekly');
                      setCustomEndDate('');
                    }}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                      period === 'weekly'
                        ? 'bg-white text-gray-950 border-white'
                        : 'bg-gray-800 text-gray-400 border-gray-700'
                    }`}
                  >
                    {t('weekly')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriod('custom')}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                      period === 'custom'
                        ? 'bg-white text-gray-950 border-white'
                        : 'bg-gray-800 text-gray-400 border-gray-700'
                    }`}
                  >
                    {t('customPeriod')}
                  </button>
                </div>
              </div>
              {period === 'custom' && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t('customEndDate')}</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                    min={today}
                    required
                  />
                  <p className="text-gray-500 text-xs mt-1">{t('customPeriodHelp')}</p>
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-400 mb-2">{t('currency')}</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrency('JPY')}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                      currency === 'JPY'
                        ? 'bg-white text-gray-950 border-white'
                        : 'bg-gray-800 text-gray-400 border-gray-700'
                    }`}
                  >
                    {t('currencyJpy')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrency('USD')}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                      currency === 'USD'
                        ? 'bg-white text-gray-950 border-white'
                        : 'bg-gray-800 text-gray-400 border-gray-700'
                    }`}
                  >
                    {t('currencyUsd')}
                  </button>
                </div>
                <p className="text-gray-500 text-xs mt-1">{t('currencyLockHelp')}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('limitAmount')}</label>
                <input
                  type="number"
                  value={limitAmount}
                  onChange={(e) => setLimitAmount(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  placeholder={currency === 'JPY' ? '10000' : '100'}
                  min={currency === 'JPY' ? '1' : '0.01'}
                  step={currency === 'JPY' ? '1' : '0.01'}
                  required
                />
              </div>
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

        {expenses.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500">{t('noExpenses')}</p>
            <p className="text-gray-600 text-sm mt-2">{t('noExpensesLead')}</p>
          </div>
        ) : (
          expenses.map((e) => (
            <ExpenseCard key={e.declarationId} expense={e} onUpdate={fetchExpenses} />
          ))
        )}
      </div>
    </div>
  );
};

export default ExpensesPage;
