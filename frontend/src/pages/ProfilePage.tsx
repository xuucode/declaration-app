import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api.js';
import { useAuth } from '../hooks/useAuth.js';
import Navigation from '../components/Navigation.js';
import { clearTokens } from '../utils/auth.js';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [goal, setGoal] = useState(user?.goal ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [nameSuccess, setNameSuccess] = useState('');
  const [goalSuccess, setGoalSuccess] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');

  const [nameError, setNameError] = useState('');
  const [goalError, setGoalError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [emailError, setEmailError] = useState('');

  const [loading, setLoading] = useState(false);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setNameError('');
    setNameSuccess('');
    try {
      await api.patch('/users/me', { displayName });
      setNameSuccess('表示名を更新しました');
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setNameError(message ?? '更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setGoalError('');
    setGoalSuccess('');
    try {
      await api.patch('/users/me', { goal });
      setGoalSuccess('目標を更新しました');
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setGoalError(message ?? '更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('新しいパスワードが一致しません');
      setLoading(false);
      return;
    }

    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      setPasswordSuccess('パスワードを更新しました');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setPasswordError(message ?? 'パスワードの更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setEmailError('');
    setEmailSuccess('');

    try {
      await api.post('/auth/change-email', {
        newEmail,
        currentPassword,
      });
      setEmailSuccess('確認メールを送信しました。メールを確認してください。');
      setNewEmail('');
      setCurrentPassword('');
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setEmailError(message ?? 'メールアドレスの更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    const confirmed = window.confirm('ログアウトしますか？');
    if (!confirmed) return;
    clearTokens();
    navigate('/login');
  };

  if (authLoading) {
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
        <h2 className="text-white text-2xl font-bold mb-6">プロフィール</h2>

        {/* サブスクリプション状態 */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h3 className="text-white font-semibold mb-3">プラン</h3>
          {user?.subscriptionStatus === 'active' ? (
            <div className="flex items-center gap-3">
              <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-600 text-sm px-3 py-1 rounded-full font-semibold">
                ⭐ Premium
              </span>
              <p className="text-gray-400 text-sm">プレミアムプランをご利用中です</p>
            </div>
          ) : (
            <div>
              <span className="bg-gray-800 text-gray-400 border border-gray-700 text-sm px-3 py-1 rounded-full">
                無料プラン
              </span>
            </div>
          )}
        </div>

        {/* 目標宣言 */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h3 className="text-white font-semibold mb-4">あなたの目標</h3>
          <form onSubmit={handleUpdateGoal} className="space-y-3">
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              placeholder="どんな人になりたいですか？あなたの目標を宣言しましょう"
              rows={3}
            />
            {goalError && <p className="text-red-400 text-sm">{goalError}</p>}
            {goalSuccess && <p className="text-green-400 text-sm">{goalSuccess}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-white text-gray-950 font-semibold rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              目標を更新する
            </button>
          </form>
        </div>

        {/* 表示名変更 */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h3 className="text-white font-semibold mb-4">表示名の変更</h3>
          <form onSubmit={handleUpdateName} className="space-y-3">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              required
            />
            {nameError && <p className="text-red-400 text-sm">{nameError}</p>}
            {nameSuccess && <p className="text-green-400 text-sm">{nameSuccess}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-white text-gray-950 font-semibold rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              表示名を更新する
            </button>
          </form>
        </div>

        {/* パスワード変更 */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h3 className="text-white font-semibold mb-4">パスワードの変更</h3>
          <form onSubmit={handleUpdatePassword} className="space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">現在のパスワード</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">新しいパスワード</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">新しいパスワード（確認）</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            {passwordError && <p className="text-red-400 text-sm">{passwordError}</p>}
            {passwordSuccess && <p className="text-green-400 text-sm">{passwordSuccess}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-white text-gray-950 font-semibold rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              パスワードを更新する
            </button>
          </form>
        </div>

        {/* メールアドレス変更 */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h3 className="text-white font-semibold mb-4">メールアドレスの変更</h3>
          <form onSubmit={handleUpdateEmail} className="space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">現在のパスワード（認証用）</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">新しいメールアドレス</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            {emailError && <p className="text-red-400 text-sm">{emailError}</p>}
            {emailSuccess && <p className="text-green-400 text-sm">{emailSuccess}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-white text-gray-950 font-semibold rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              メールアドレスを更新する
            </button>
          </form>
        </div>

        {/* ログアウト */}
        <button
          onClick={handleLogout}
          className="w-full py-3 bg-red-900/30 border border-red-800 text-red-400 font-semibold rounded-xl hover:bg-red-900/50 transition-colors"
        >
          ログアウト
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;