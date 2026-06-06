import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api.js';
import LanguageToggle from '../components/LanguageToggle.js';
import { useLanguage } from '../i18n.js';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/auth/forgot-password', { email });
      setStep('confirm');
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(message ?? t('resetCodeFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/confirm-forgot-password', { email, code, newPassword });
      navigate('/login');
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(message ?? t('resetFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (step === 'confirm') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="absolute right-4 top-4">
          <LanguageToggle />
        </div>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">{t('passwordReset')}</h1>
            <p className="text-gray-400">
              {language === 'ja' ? `${email} ${t('sentResetCode')}` : `${t('sentResetCode')} ${email}`}
            </p>
          </div>
          <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
            <form onSubmit={handleConfirm} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('resetCode')}</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-center text-2xl tracking-widest [color-scheme:dark]"
                  placeholder="000000"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('newPassword')}</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder="••••••••"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('confirmNewPassword')}</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                className="w-full bg-white text-gray-950 font-semibold py-3 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {loading ? t('resetting') : t('resetPassword')}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="absolute right-4 top-4">
        <LanguageToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">{t('forgotPasswordTitle')}</h1>
          <p className="text-gray-400">{t('forgotPasswordLead')}</p>
        </div>
        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
          <form onSubmit={handleRequest} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder="example@email.com"
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
              className="w-full bg-white text-gray-950 font-semibold py-3 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {loading ? t('sending') : t('sendResetCode')}
            </button>
          </form>
        </div>
        <p className="text-center text-gray-500 mt-6 text-sm">
          <Link to="/login" className="text-blue-400 hover:text-blue-300">
            {t('backToLogin')}
          </Link>
        </p>
        <p className="text-center text-gray-600 mt-4 text-xs flex justify-center gap-4">
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

export default ForgotPasswordPage;
