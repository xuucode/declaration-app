import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api.js';
import { useAuth } from '../hooks/useAuth.js';
import HabitCard from '../components/HabitCard.js';
import Navigation from '../components/Navigation.js';
import { createCheckoutSession } from '../utils/api.js';

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

const HabitsPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [limitType, setLimitType] = useState<'binary' | 'count'>('binary');
  const [limitValue, setLimitValue] = useState('');
  const [error, setError] = useState('');

  const fetchHabits = useCallback(async () => {
    try {
      const res = await api.get('/habits');
      setHabits(res.data);
    } catch {
      setError('習慣の取得に失敗しました');
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login');
      return;
    }
    const load = async () => {
      await fetchHabits();
      setLoading(false);
    };
    load();
  }, [authLoading, user, navigate, fetchHabits]);

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
      setError(message ?? '習慣の作成に失敗しました');
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
          <h2 className="text-white text-2xl font-bold">習慣管理</h2>
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
            ＋ 新しい習慣を追加
          </button>
        )}

        {showForm && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
            <h3 className="text-white font-semibold text-lg mb-4">新しい習慣</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">習慣名</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder="タバコを吸わない / SNSを30分以下にする"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">詳細（任意）</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder="目標の詳細を入力..."
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">タイプ</label>
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
                    やる/やらない
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
                    回数制限
                  </button>
                </div>
              </div>
              {limitType === 'count' && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">上限回数</label>
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

        {habits.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500">まだ習慣がありません</p>
            <p className="text-gray-600 text-sm mt-2">禁煙・SNS制限など悪習慣を断ち切りましょう</p>
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