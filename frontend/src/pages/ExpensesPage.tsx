import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api.js';
import { useAuth } from '../hooks/useAuth.js';
import ExpenseCard from '../components/ExpenseCard.js';
import Navigation from '../components/Navigation.js';
import { createCheckoutSession } from '../utils/api.js';

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

const ExpensesPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [limitAmount, setLimitAmount] = useState('');
  const [period, setPeriod] = useState<'monthly' | 'weekly'>('monthly');
  const [error, setError] = useState('');

  const fetchExpenses = useCallback(async () => {
    try {
      const res = await api.get('/expenses');
      setExpenses(res.data);
    } catch {
      setError('支出の取得に失敗しました');
    }
  }, []);

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
      await api.post('/expenses', {
        title,
        description,
        limitAmount: Number(limitAmount),
        period,
      });
      setTitle('');
      setDescription('');
      setLimitAmount('');
      setPeriod('monthly');
      setShowForm(false);
      fetchExpenses();
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(message ?? '支出管理の作成に失敗しました');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Navigation />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-white text-2xl font-bold">支出管理</h2>
          {user?.subscriptionStatus === 'active' && (
            <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-600 text-xs px-3 py-1 rounded-full font-semibold">
              ⭐ Premium
            </span>
          )}
        </div>

        {!showForm && (
          <button
            onClick={() => {
              setError('');
              setShowForm(true);
            }}
            className="w-full py-4 bg-white text-gray-950 font-bold rounded-xl hover:bg-gray-200 transition-colors mb-6 text-lg"
          >
            ＋ 支出管理を追加
          </button>
        )}

        {showForm && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
            <h3 className="text-white font-semibold text-lg mb-4">新しい支出管理</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">カテゴリ名</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder="娯楽費 / 食費 / 交際費"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">詳細（任意）</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder="管理する支出の詳細..."
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">期間</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setPeriod('monthly')}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                      period === 'monthly'
                        ? 'bg-white text-gray-950 border-white'
                        : 'bg-gray-800 text-gray-400 border-gray-700'
                    }`}
                  >
                    月単位
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriod('weekly')}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                      period === 'weekly'
                        ? 'bg-white text-gray-950 border-white'
                        : 'bg-gray-800 text-gray-400 border-gray-700'
                    }`}
                  >
                    週単位
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">上限金額（円）</label>
                <input
                  type="number"
                  value={limitAmount}
                  onChange={(e) => setLimitAmount(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  placeholder="10000"
                  min="1"
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
                      ⭐ Premiumにアップグレード
                    </button>
                  )}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-white text-gray-950 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                >
                  追加する
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setError(''); }}
                  className="flex-1 py-3 bg-gray-800 text-gray-300 font-semibold rounded-lg hover:bg-gray-700 transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        )}

        {expenses.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500">まだ支出管理がありません</p>
            <p className="text-gray-600 text-sm mt-2">食費・娯楽費など支出をコントロールしましょう</p>
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