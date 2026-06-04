import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api.js';
import { useAuth } from '../hooks/useAuth.js';
import DeclarationCard from '../components/DeclarationCard.js';
import ShareButton from '../components/ShareButton.js';

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

const MyPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, logout } = useAuth();
  const [declarations, setDeclarations] = useState<Declaration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [error, setError] = useState('');
  const [newDeclaration, setNewDeclaration] = useState<Declaration | null>(null);
  const [isCustomDeadline, setIsCustomDeadline] = useState(false);

  const fetchDeclarations = useCallback(async () => {
    try {
      const res = await api.get('/declarations');
      setDeclarations(res.data);
    } catch {
      setError('宣言の取得に失敗しました');
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login');
      return;
    }
    const load = async () => {
      await fetchDeclarations();
      setLoading(false);
    };
    load();
  }, [authLoading, user, navigate, fetchDeclarations]);

  const hasUnreportedFailed = declarations.some(
  (d) => d.status === 'failed' && !d.sharedAt
);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const res = await api.post('/declarations', { title, description, deadline });
      setNewDeclaration(res.data);
      setTitle('');
      setDescription('');
      setDeadline('');
      setShowForm(false);
      fetchDeclarations();
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(message ?? '宣言の作成に失敗しました');
    }
  };

  const achievedCount = declarations.filter((d) => d.status === 'done').length;
  const totalReported = declarations.filter((d) => d.status !== 'pending').length;
  const achieveRate = totalReported > 0 ? Math.round((achievedCount / totalReported) * 100) : 0;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* ヘッダー */}
      <header className="border-b border-gray-800 px-4 py-4">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <h1 className="text-white font-bold text-xl">宣言する</h1>
          <button
            onClick={logout}
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            ログアウト
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* ユーザー情報 */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-white text-xl font-bold mb-3">{user?.displayName}</h2>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-400">🔥 {user?.streakCount}</p>
              <p className="text-gray-500 text-xs mt-1">連続達成日数</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400">{achieveRate}%</p>
              <p className="text-gray-500 text-xs mt-1">達成率</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{declarations.length}</p>
              <p className="text-gray-500 text-xs mt-1">総宣言数</p>
            </div>
          </div>
        </div>

        {/* 新規宣言作成後のシェア */}
        {newDeclaration && (
          <div className="bg-gray-900 border border-blue-800 rounded-xl p-5 mb-6">
            <p className="text-white font-semibold mb-1">宣言を作成しました！</p>
            <p className="text-gray-400 text-sm mb-4">
              ※ シェアすることで達成率が上がると言われています
            </p>
            <ShareButton
              declarationId={newDeclaration.declarationId}
              title={newDeclaration.title}
              type="declaration"
              onShare={() => setNewDeclaration(null)}
            />
            <button
              onClick={() => setNewDeclaration(null)}
              className="w-full mt-2 py-2 text-gray-500 hover:text-gray-300 text-sm transition-colors"
            >
              スキップ
            </button>
          </div>
        )}

        {/* 宣言作成ボタン */}
        {!showForm && !newDeclaration && (
          <button
            onClick={() => {
              if (hasUnreportedFailed) {
                setError('未達成の宣言をシェアしてから新しい宣言を作成してください');
                return;
              }
              setError('');
              setShowForm(true);
            }}
            className="w-full py-4 bg-white text-gray-950 font-bold rounded-xl hover:bg-gray-200 transition-colors mb-6 text-lg"
          >
            ＋ 新しい宣言を作る
          </button>
        )}

        {/* 宣言作成フォーム */}
        {showForm && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
            <h3 className="text-white font-semibold text-lg mb-4">新しい宣言</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">タイトル</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder="今日中に〇〇を終わらせる"
                  required
                />
              </div>
             <div>
  <label className="block text-sm text-gray-400 mb-1">いつまでに達成する？</label>
  <div className="flex gap-2 mb-2">
    {[
      { label: '今日中' },
      { label: '明日中' },
      { label: 'カスタム' },
    ].map(({ label }) => (
      <button
        key={label}
        type="button"
        onClick={() => {
          if (label === 'カスタム') {
            setIsCustomDeadline(true);
            setDeadline('');
            setTimeout(() => {
              document.getElementById('deadline-input')?.focus();
            }, 50);
            return;
          }
          setIsCustomDeadline(false);
          const d = new Date();
          if (label === '今日中') {
            d.setHours(23, 59, 0, 0);
          } else {
            d.setDate(d.getDate() + 1);
            d.setHours(23, 59, 0, 0);
          }
          const offset = d.getTimezoneOffset();
          const localDate = new Date(d.getTime() - offset * 60 * 1000);
          setDeadline(localDate.toISOString().slice(0, 16));
        }}
        className={`flex-1 py-2 text-sm rounded-lg border transition-colors
          ${label === 'カスタム' && isCustomDeadline
            ? 'bg-blue-900/40 border-blue-500 text-blue-300'
            : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700'
          }`}
      >
        {label}
      </button>
    ))}
  </div>
  <input
    id="deadline-input"
    type="datetime-local"
    value={deadline}
    onChange={(e) => setDeadline(e.target.value)}
    className={`w-full bg-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none transition-colors [color-scheme:dark]
  ${isCustomDeadline
    ? 'border-2 border-blue-500'
    : 'border border-gray-700 focus:border-blue-500'
  }`}
    required
  />
</div>
              {error && (
                <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-white text-gray-950 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                >
                  宣言する
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

        {error && !showForm && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* 宣言一覧 */}
        <h2 className="text-white font-semibold text-lg mb-4">宣言一覧</h2>
        {declarations.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500">まだ宣言がありません</p>
            <p className="text-gray-600 text-sm mt-2">最初の宣言を作ってみましょう</p>
          </div>
        ) : (
          declarations.map((d) => (
            <DeclarationCard key={d.declarationId} declaration={d} onUpdate={fetchDeclarations} />
          ))
        )}
      </div>
    </div>
  );
};

export default MyPage;