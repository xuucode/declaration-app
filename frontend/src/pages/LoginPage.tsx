import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api.js';
import { saveTokens } from '../utils/auth.js';
import structLogo from '../assets/struct.png';
import LanguageToggle from '../components/LanguageToggle.js';
import { useLanguage } from '../i18n.js';

const LoginPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/login', { email, password });
      saveTokens(res.data.accessToken, res.data.idToken, res.data.refreshToken);
      navigate('/mypage');
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(message ?? t('loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  const overviewSignals = [
    [t('overviewSignalPublic'), t('overviewSignalPublicBody')],
    [t('overviewSignalHabit'), t('overviewSignalHabitBody')],
    [t('overviewSignalExpense'), t('overviewSignalExpenseBody')],
  ];

  const overviewMetrics = [
    [t('overviewMetricShare'), t('overviewMetricShareBody')],
    [t('overviewMetricRecord'), t('overviewMetricRecordBody')],
    [t('overviewMetricForce'), t('overviewMetricForceBody')],
  ];

  return (
    <div className="auth-shell min-h-screen bg-gray-950 px-4 py-8">
      <div className="auth-grid" aria-hidden="true" />
      <div className="auth-scanline" aria-hidden="true" />
      <div className="auth-language-toggle">
        <LanguageToggle />
      </div>
      <div className="relative z-10 grid min-h-[calc(100vh-4rem)] w-full max-w-6xl mx-auto items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="auth-overview">
          <div className="auth-kicker">{t('overviewKicker')}</div>
          <img src={structLogo} alt="Struct" className="h-52 w-auto max-w-full mb-6" />
          <h1 className="text-white text-4xl md:text-5xl font-bold leading-tight mb-5">
            {t('overviewTitle')}
          </h1>
          <p className="text-gray-400 text-base md:text-lg leading-8 max-w-2xl mb-8">
            {t('overviewLead')}
          </p>
          <div className="auth-copy-panel mb-8">
            <p className="text-gray-300 text-sm leading-7">{t('overviewAudience')}</p>
            <p className="text-white text-sm leading-7 mt-3">{t('overviewFuture')}</p>
          </div>

          <div className="auth-metrics mb-8">
            {overviewMetrics.map(([label, body]) => (
              <div key={label} className="auth-metric">
                <p className="text-white text-sm font-semibold">{label}</p>
                <p className="text-gray-500 text-xs mt-1">{body}</p>
              </div>
            ))}
          </div>

          <div className="auth-frame">
            {overviewSignals.map(([label, body], index) => (
              <div key={label} className="auth-signal">
                <span className="auth-signal-index">0{index + 1}</span>
                <div>
                  <p className="text-white text-sm font-semibold">{label}</p>
                  <p className="text-gray-400 text-sm mt-1 leading-6">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="w-full max-w-md lg:ml-auto">
          <div className="text-center mb-6 lg:hidden">
            <img src={structLogo} alt="Struct" className="h-40 w-auto max-w-full mx-auto mb-4" />
            <p className="text-gray-400">{t('tagline')}</p>
          </div>

          <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
            <div className="mb-6">
              <p className="text-gray-500 text-xs uppercase tracking-[0.18em] mb-2">Struct access</p>
              <h2 className="text-2xl font-semibold text-white">{t('login')}</h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
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
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('password')}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="text-right">
                <Link to="/forgot-password" className="text-blue-400 hover:text-blue-300 text-sm">
                  {t('forgotPasswordLink')}
                </Link>
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
                {loading ? t('loggingIn') : t('login')}
              </button>
            </form>
          </div>

          <p className="text-center text-gray-500 mt-6 text-sm">
            {t('noAccount')}{' '}
            <Link to="/register" className="text-blue-400 hover:text-blue-300">
              {t('register')}
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
            <Link to="/commercial-transaction" className="hover:text-gray-300 transition-colors">
              {t('commercialTransaction')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
