import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation.js';
import { useAuth } from '../hooks/useAuth.js';
import { useLanguage } from '../i18n.js';
import api from '../utils/api.js';
import LoadingPage from '../components/LoadingPage.js';
import { useRouteTransition } from '../contexts/RouteTransitionContext.js';

const CancelPremiumPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const { navigateWithTransition } = useRouteTransition();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scheduled, setScheduled] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [authLoading, navigate, user]);

  const isPremium = user?.subscriptionStatus === 'active';
  const isAlreadyScheduled = user?.subscriptionCancelAtPeriodEnd || scheduled;

  const handleScheduleCancellation = async () => {
    setLoading(true);
    setError('');

    try {
      await api.post('/subscriptions/cancel');
      setScheduled(true);
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(message ?? t('cancelPremiumFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) {
    return <LoadingPage active={authLoading || !user} />;
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Navigation />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="relative overflow-hidden bg-gray-900 border border-gray-800 rounded-xl p-7 sm:p-9">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500" />
          <p className="text-cyan-300 text-sm font-semibold mb-3">{t('cancelPremiumKicker')}</p>
          <h2 className="text-white text-3xl font-bold mb-4">{t('cancelPremiumPageTitle')}</h2>

          {isAlreadyScheduled ? (
            <div className="space-y-5">
              <p className="text-green-300 text-base leading-relaxed">{t('cancelPremiumScheduledTitle')}</p>
              <p className="text-gray-400 leading-relaxed">{t('premiumCancelScheduled')}</p>
              <button
                type="button"
                onClick={() => navigateWithTransition('/profile')}
                className="w-full sm:w-auto px-6 py-3 bg-white text-gray-950 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
              >
                {t('backToProfile')}
              </button>
            </div>
          ) : isPremium ? (
            <div className="space-y-6">
              <p className="text-gray-200 text-lg leading-relaxed">{t('cancelPremiumPageLead')}</p>
              <p className="text-gray-400 leading-relaxed">{t('cancelPremiumPageBody')}</p>

              <div className="grid sm:grid-cols-3 gap-3">
                <div className="bg-gray-950/70 border border-gray-800 rounded-lg p-4">
                  <p className="text-white font-semibold mb-1">{t('cancelPremiumBenefitTasks')}</p>
                  <p className="text-gray-500 text-sm">{t('cancelPremiumBenefitTasksBody')}</p>
                </div>
                <div className="bg-gray-950/70 border border-gray-800 rounded-lg p-4">
                  <p className="text-white font-semibold mb-1">{t('cancelPremiumBenefitHabits')}</p>
                  <p className="text-gray-500 text-sm">{t('cancelPremiumBenefitHabitsBody')}</p>
                </div>
                <div className="bg-gray-950/70 border border-gray-800 rounded-lg p-4">
                  <p className="text-white font-semibold mb-1">{t('cancelPremiumBenefitExpenses')}</p>
                  <p className="text-gray-500 text-sm">{t('cancelPremiumBenefitExpensesBody')}</p>
                </div>
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => navigateWithTransition('/profile')}
                  className="flex-1 py-3 bg-white text-gray-950 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  {t('cancelPremiumKeep')}
                </button>
                <button
                  type="button"
                  onClick={handleScheduleCancellation}
                  disabled={loading}
                  className="flex-1 py-3 bg-red-900/30 border border-red-800 text-red-300 font-semibold rounded-xl hover:bg-red-900/50 transition-colors disabled:opacity-50"
                >
                  {loading ? t('loading') : t('cancelPremiumSchedule')}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <p className="text-gray-400 leading-relaxed">{t('cancelPremiumNotActive')}</p>
              <button
                type="button"
                onClick={() => navigateWithTransition('/profile')}
                className="w-full sm:w-auto px-6 py-3 bg-white text-gray-950 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
              >
                {t('backToProfile')}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CancelPremiumPage;
