import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api.js';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'register' | 'confirm'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/auth/register', { email, password, displayName });
      setStep('confirm');
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(message ?? '登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/auth/confirm', { email, code });
      navigate('/login');
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(message ?? '確認に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'confirm') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">メール確認</h1>
            <p className="text-gray-400">{email} に確認コードを送信しました</p>
          </div>
          <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
            <form onSubmit={handleConfirm} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">確認コード</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-center text-2xl tracking-widest"
                  placeholder="000000"
                  required
                />
              </div>
              {error && (
                <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-gray-950 font-semibold py-3 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '確認中...' : '確認する'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">新規登録</h1>
          <p className="text-gray-400">アカウントを作成して宣言を始めよう</p>
        </div>
        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">表示名</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder="山田太郎"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">メールアドレス</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder="example@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">パスワード（8文字以上・大文字・数字を含む）</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder="••••••••"
                required
              />
            </div>
            {error && (
              <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-gray-950 font-semibold py-3 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '登録中...' : '登録する'}
            </button>
          </form>
        </div>
        <p className="text-center text-gray-500 mt-6 text-sm">
          すでにアカウントをお持ちの方は{' '}
          <Link to="/login" className="text-blue-400 hover:text-blue-300">
            ログイン
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;