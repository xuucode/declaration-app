import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api.js';
import { useAuth } from '../hooks/useAuth.js';
import { useLanguage } from '../i18n.js';
import LanguageToggle from '../components/LanguageToggle.js';

const ContactPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    // Prefill contact fields after the authenticated user is loaded.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(user.displayName ?? '');
    setEmail(user.email ?? '');
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.post('/contact', { name, email, subject, message });
      setSubject('');
      setMessage('');
      setSuccess(t('contactSuccess'));
    } catch (err) {
      const apiMessage = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(apiMessage ?? t('contactFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8">
      <div className="auth-language-toggle">
        <LanguageToggle />
      </div>
      <div className="max-w-2xl mx-auto pt-12">
        <div className="mb-6">
          <button
            onClick={() => navigate(user ? '/mypage' : '/login')}
            className="text-gray-400 hover:text-white text-sm transition-colors mb-4"
          >
            {t('backHome')}
          </button>
          <h1 className="text-white text-3xl font-bold mb-2">{t('contact')}</h1>
          <p className="text-gray-400 text-sm">{t('contactLead')}</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('name')}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                maxLength={80}
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                maxLength={200}
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('subject')}</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder={t('contactSubjectPlaceholder')}
                maxLength={120}
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('message')}</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder={t('contactMessagePlaceholder')}
                maxLength={3000}
                rows={7}
                required
              />
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
            {success && (
              <div className="bg-green-900/20 border border-green-800 rounded-lg px-4 py-3">
                <p className="text-green-400 text-sm">{success}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-gray-950 font-semibold py-3 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {loading ? t('contactSending') : t('send')}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-500 mt-6 text-sm">
          <Link to="/terms" className="text-blue-400 hover:text-blue-300 mr-4">
            {t('terms')}
          </Link>
          <Link to="/privacy" className="text-blue-400 hover:text-blue-300 mr-4">
            {t('privacy')}
          </Link>
          <Link to="/commercial-transaction" className="text-blue-400 hover:text-blue-300 mr-4">
            {t('commercialTransaction')}
          </Link>
          <Link to={user ? '/mypage' : '/login'} className="text-blue-400 hover:text-blue-300">
            {t('backHome')}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ContactPage;
