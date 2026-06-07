import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api.js';
import LanguageToggle from '../components/LanguageToggle.js';
import { useLanguage } from '../i18n.js';

interface Declaration {
  declarationId: string;
  type?: 'task' | 'habit' | 'expense';
  title: string;
  description: string;
  deadline?: string;
  status: 'pending' | 'done' | 'failed' | 'active';
  createdAt: string;
  reportedAt: string;
  ogpImageUrl: string;
  userId: string;
  sharedAt: string;
  publicSharedAt?: string;
  displayName?: string;
  shareStreakCount?: number;
  publicStats?: {
    kind: 'task' | 'habit';
    deadline?: string;
    status?: 'pending' | 'done' | 'failed' | 'active';
    reportedAt?: string;
    streakCount?: number;
    achievedCount?: number;
    totalCount?: number;
    lastUpdatedAt?: string;
  };
}

const DeclarationPage = () => {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useLanguage();
  const [declaration, setDeclaration] = useState<Declaration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDeclaration = async () => {
      try {
        const res = await api.get(`/declarations/${id}`);
        setDeclaration(res.data);
      } catch {
        setError(t('declarationNotFound'));
      } finally {
        setLoading(false);
      }
    };
    fetchDeclaration();
  }, [id]);

  const statusConfig = {
    pending: {
      label: t('statusPending'),
      bg: 'bg-gray-900',
      border: 'border-gray-700',
      text: 'text-blue-400',
    },
    done: {
      label: t('statusDone'),
      bg: 'bg-green-950',
      border: 'border-green-800',
      text: 'text-green-400',
    },
    failed: {
      label: t('statusFailed'),
      bg: 'bg-red-950',
      border: 'border-red-800',
      text: 'text-red-400',
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">{t('loading')}</p>
      </div>
    );
  }

  if (error || !declaration) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  const config = declaration.status === 'active' ? statusConfig.pending : statusConfig[declaration.status];
  const publicKind = declaration.publicStats?.kind ?? (declaration.type === 'habit' ? 'habit' : 'task');
  const isHabitPublic = publicKind === 'habit';
  const stats = declaration.publicStats;

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-white font-bold text-xl">{t('appNameAction')}</h1>
          <LanguageToggle />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className={`${config.bg} border ${config.border} rounded-2xl p-8 mb-6 text-center`}>
          <p className="text-blue-300 text-xs font-bold tracking-[0.22em] mb-3">
            {isHabitPublic ? t('publicHabitKicker') : t('publicTaskKicker')}
          </p>
          <p className={`text-sm font-semibold mb-4 ${config.text}`}>
            {isHabitPublic ? t('publicCommitmentBadge') : config.label}
          </p>
          <h2 className="text-white text-3xl font-bold mb-4 leading-snug">
            {declaration.title}
          </h2>
          {declaration.description && (
            <p className="text-gray-400 text-base mb-4">{declaration.description}</p>
          )}
          {declaration.displayName && (
            <p className="text-gray-500 text-sm mb-5">
              {t('publicCommittedBy')}：{declaration.displayName}
            </p>
          )}

          {isHabitPublic ? (
            <div className="grid grid-cols-3 gap-3 mt-6">
              <div className="bg-gray-950/60 border border-gray-800 rounded-lg p-4">
                <p className="text-orange-400 text-2xl font-bold">🔥 {stats?.streakCount ?? 0}</p>
                <p className="text-gray-500 text-xs mt-1">{t('streakDays')}</p>
              </div>
              <div className="bg-gray-950/60 border border-gray-800 rounded-lg p-4">
                <p className="text-blue-300 text-2xl font-bold">{stats?.achievedCount ?? 0}/{stats?.totalCount ?? 0}</p>
                <p className="text-gray-500 text-xs mt-1">{t('habitCompletionCount')}</p>
              </div>
              <div className="bg-gray-950/60 border border-gray-800 rounded-lg p-4">
                <p className="text-purple-300 text-2xl font-bold">𝕏 {declaration.shareStreakCount ?? 0}</p>
                <p className="text-gray-500 text-xs mt-1">{t('shareStreak')}</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 mt-6">
              <div className="bg-gray-950/60 border border-gray-800 rounded-lg p-4">
                <p className={`text-xl font-bold ${config.text}`}>{config.label}</p>
                <p className="text-gray-500 text-xs mt-1">{t('publicTaskStatus')}</p>
              </div>
              <div className="bg-gray-950/60 border border-gray-800 rounded-lg p-4">
                <p className="text-white text-sm font-semibold">
                  {declaration.deadline ? new Date(declaration.deadline).toLocaleString(locale) : '-'}
                </p>
                <p className="text-gray-500 text-xs mt-1">{t('deadline')}</p>
              </div>
            </div>
          )}
          <p className="text-gray-500 text-sm mt-6">
            {t('publicPageCommitmentLead')}
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
          <p className="text-white text-xl font-bold mb-2">
            {t('joinPrompt')}
          </p>
          <p className="text-gray-400 text-sm mb-6">
            {t('tagline')}
          </p>
          <Link to="/register">
            <button className="w-full bg-white text-gray-950 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors text-lg">
              {t('startFree')}
            </button>
          </Link>
          <p className="text-gray-600 text-sm mt-4">
            {t('publicLoginLead')}{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300">
              {t('login')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default DeclarationPage;
