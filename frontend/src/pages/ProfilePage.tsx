import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api.js';
import { useAuth } from '../hooks/useAuth.js';
import Navigation from '../components/Navigation.js';
import { clearTokens } from '../utils/auth.js';
import { useLanguage } from '../i18n.js';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();

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
  const cancelScheduled = user?.subscriptionCancelAtPeriodEnd ?? false;

  const [loading, setLoading] = useState(false);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setNameError('');
    setNameSuccess('');
    try {
      await api.patch('/users/me', { displayName });
      setNameSuccess(t('displayNameUpdated'));
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setNameError(message ?? t('updateFailed'));
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
      setGoalSuccess(t('goalUpdated'));
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setGoalError(message ?? t('updateFailed'));
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
      setPasswordError(t('passwordMismatch'));
      setLoading(false);
      return;
    }

    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      setPasswordSuccess(t('passwordUpdated'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setPasswordError(message ?? t('passwordUpdateFailed'));
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
      setEmailSuccess(t('emailConfirmSent'));
      setNewEmail('');
      setCurrentPassword('');
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setEmailError(message ?? t('emailUpdateFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    const confirmed = window.confirm(t('logoutConfirm'));
    if (!confirmed) return;
    clearTokens();
    navigate('/login');
  };

  if (authLoading) {
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
        <h2 className="text-white text-2xl font-bold mb-6">{t('profile')}</h2>

        {/* サブスクリプション状態 */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h3 className="text-white font-semibold mb-3">{t('plan')}</h3>
          {user?.subscriptionStatus === 'active' ? (
            <div className="flex items-start gap-2 min-w-0">
                <span className="shrink-0 bg-yellow-500/20 text-yellow-400 border border-yellow-600 text-[11px] sm:text-sm px-2.5 sm:px-3 py-1 rounded-full font-semibold whitespace-nowrap">
                  ⭐ Premium
                </span>
                <p className="min-w-0 flex-1 text-gray-400 text-[10px] sm:text-sm leading-relaxed">
                  {cancelScheduled ? t('premiumCancelScheduled') : t('premiumActive')}
                </p>
            </div>
          ) : (
            <div>
              <span className="bg-gray-800 text-gray-400 border border-gray-700 text-sm px-3 py-1 rounded-full">
                {t('freePlan')}
              </span>
            </div>
          )}
        </div>

        {/* 目標宣言 */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h3 className="text-white font-semibold mb-4">{t('yourGoal')}</h3>
          <form onSubmit={handleUpdateGoal} className="space-y-3">
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              placeholder={t('goalPlaceholder')}
              rows={3}
            />
            {goalError && <p className="text-red-400 text-sm">{goalError}</p>}
            {goalSuccess && <p className="text-green-400 text-sm">{goalSuccess}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-white text-gray-950 font-semibold rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {t('updateGoal')}
            </button>
          </form>
        </div>

        {/* 表示名変更 */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h3 className="text-white font-semibold mb-4">{t('changeDisplayName')}</h3>
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
              {t('updateDisplayName')}
            </button>
          </form>
        </div>

        {/* パスワード変更 */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h3 className="text-white font-semibold mb-4">{t('changePassword')}</h3>
          <form onSubmit={handleUpdatePassword} className="space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('currentPassword')}</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('newPassword')}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('confirmNewPassword')}</label>
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
              {t('updatePassword')}
            </button>
          </form>
        </div>

        {/* メールアドレス変更 */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h3 className="text-white font-semibold mb-4">{t('changeEmail')}</h3>
          <form onSubmit={handleUpdateEmail} className="space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('currentPasswordForAuth')}</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('newEmail')}</label>
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
              {t('updateEmail')}
            </button>
          </form>
        </div>

        {user?.subscriptionStatus === 'active' && (
          <div className="bg-gray-900 border border-red-900/40 rounded-xl p-6 mb-6">
            <h3 className="text-white font-semibold mb-2">{t('premiumCancelAreaTitle')}</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              {cancelScheduled ? t('premiumCancelScheduled') : t('premiumCancelAreaLead')}
            </p>
            {!cancelScheduled && (
              <button
                type="button"
                onClick={() => navigate('/cancel-premium')}
                className="w-full py-3 bg-red-900/30 border border-red-800 text-red-300 font-semibold rounded-xl hover:bg-red-900/50 transition-colors"
              >
                {t('cancelPremium')}
              </button>
            )}
          </div>
        )}

        {/* ログアウト */}
        <button
          onClick={handleLogout}
          className="w-full py-3 bg-red-900/30 border border-red-800 text-red-400 font-semibold rounded-xl hover:bg-red-900/50 transition-colors"
        >
          {t('logout')}
        </button>

        <p className="app-footer-links text-center text-gray-600 mt-10 text-[10px] sm:text-xs flex justify-center gap-2 sm:gap-4 whitespace-nowrap">
          <Link to="/contact" className="hover:text-gray-300 transition-colors">
            {t('contact')}
          </Link>
          <Link to="/terms" className="hover:text-gray-300 transition-colors">
            {t('terms')}
          </Link>
          <Link to="/privacy" className="hover:text-gray-300 transition-colors">
            {t('privacy')}
          </Link>
          <Link to="/commercial-transaction" className="hover:text-gray-300 transition-colors">
            {t('commercialTransaction')}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ProfilePage;
