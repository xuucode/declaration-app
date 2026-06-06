import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api.js';
import { useAuth } from '../hooks/useAuth.js';
import DeclarationCard from '../components/DeclarationCard.js';
import Navigation from '../components/Navigation.js';
import { useLanguage } from '../i18n.js';

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
  isLocked?: boolean;
}

const TaskHistoryPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [declarations, setDeclarations] = useState<Declaration[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'done' | 'failed'>('all');
  const [error, setError] = useState('');

  const fetchDeclarations = useCallback(async () => {
    try {
      const res = await api.get('/declarations');
      setDeclarations(res.data.filter((d: Declaration) => d.status !== 'pending'));
    } catch {
      setError(t('declarationFetchFailed'));
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

  const filtered = filter === 'all'
    ? declarations
    : declarations.filter((d) => d.status === filter);

  if (authLoading || loading) {
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
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/tasks')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {t('back')}
          </button>
          <h2 className="text-white text-2xl font-bold">{t('completedTasks')}</h2>
        </div>

        {/* フィルター */}
        <div className="flex gap-2 mb-6">
          {[
            { label: t('all'), value: 'all' },
            { label: t('statusDone'), value: 'done' },
            { label: t('statusFailed'), value: 'failed' },
          ].map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setFilter(value as 'all' | 'done' | 'failed')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                filter === value
                  ? 'bg-white text-gray-950 border-white'
                  : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500">{t('noMatchingDeclarations')}</p>
          </div>
        ) : (
          filtered.map((d) => (
            <DeclarationCard key={d.declarationId} declaration={d} onUpdate={fetchDeclarations} />
          ))
        )}
      </div>
    </div>
  );
};

export default TaskHistoryPage;
