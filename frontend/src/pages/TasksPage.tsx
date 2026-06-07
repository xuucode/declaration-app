import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api.js';
import { useAuth } from '../hooks/useAuth.js';
import DeclarationCard from '../components/DeclarationCard.js';
import ShareButton from '../components/ShareButton.js';
import Navigation from '../components/Navigation.js';
import { createCheckoutSession } from '../utils/api.js';
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
  publicSharedAt?: string;
  isLocked?: boolean;
}

const TasksPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [declarations, setDeclarations] = useState<Declaration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [error, setError] = useState('');
  const [isCustomDeadline, setIsCustomDeadline] = useState(false);
  const [confirmedDeclaration, setConfirmedDeclaration] = useState<Declaration | null>(null);

  const fetchDeclarations = useCallback(async () => {
    try {
      const res = await api.get('/declarations');
      setDeclarations(res.data);
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

  const hasUnreportedFailed = declarations.some(
    (d) => d.status === 'failed' && !d.sharedAt && !d.isLocked
  );
  const unsharedFailedDeclarations = declarations.filter(
    (d) => d.status === 'failed' && !d.sharedAt && !d.isLocked && d.declarationId !== confirmedDeclaration?.declarationId
  );

  const handleResultShare = async () => {
    if (!confirmedDeclaration) return;
    await api.patch(`/declarations/${confirmedDeclaration.declarationId}/shared`, {});
    setConfirmedDeclaration({
      ...confirmedDeclaration,
      sharedAt: new Date().toISOString(),
    });
    fetchDeclarations();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await api.post('/declarations', { title, description, deadline });
      setTitle('');
      setDescription('');
      setDeadline('');
      setShowForm(false);
      fetchDeclarations();
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(message ?? t('declarationCreateFailed'));
    }
  };

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
        <h2 className="text-white text-2xl font-bold mb-6">{t('tasks')}</h2>

        {confirmedDeclaration && !confirmedDeclaration.isLocked && (
          confirmedDeclaration.sharedAt ? (
            <div className="bg-blue-900/20 border border-blue-800 rounded-xl px-5 py-4 mb-6">
              <p className="text-blue-300 text-sm font-semibold">{t('taskResultShared')}</p>
            </div>
          ) : (
            <div className={`border rounded-xl p-5 mb-6 ${
              confirmedDeclaration.status === 'done'
                ? 'bg-green-900/20 border-green-800'
                : 'bg-red-900/20 border-red-800'
            }`}>
              <p className={`text-sm font-semibold mb-1 ${
                confirmedDeclaration.status === 'done' ? 'text-green-300' : 'text-red-300'
              }`}>
                {confirmedDeclaration.status === 'done' ? t('taskDoneConfirmedTitle') : t('taskFailedConfirmedTitle')}
              </p>
              <p className="text-white font-semibold mb-2">{confirmedDeclaration.title}</p>
              <p className="text-gray-400 text-sm mb-4">
                {confirmedDeclaration.status === 'done' ? t('taskDoneShareLead') : t('taskFailedShareLead')}
              </p>
              <ShareButton
                declarationId={confirmedDeclaration.declarationId}
                title={confirmedDeclaration.title}
                type={confirmedDeclaration.status === 'done' ? 'progress' : 'failed'}
                detail={confirmedDeclaration.status === 'done' ? t('taskDoneShareDetail') : undefined}
                onShare={handleResultShare}
              />
            </div>
          )
        )}

        {/* 宣言作成ボタン */}
        {!showForm && (
          <button
            onClick={() => {
              if (hasUnreportedFailed) {
                setError(t('shareFailedBeforeNew'));
                return;
              }
              setError('');
              setShowForm(true);
            }}
            className="w-full py-4 bg-white text-gray-950 font-bold rounded-xl hover:bg-gray-200 transition-colors mb-6 text-lg"
          >
            {t('createNewTask')}
          </button>
        )}

        {/* 宣言作成フォーム */}
        {showForm && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
            <h3 className="text-white font-semibold text-lg mb-4">{t('newDeclaration')}</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('title')}</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder={t('declareTask')}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('detailsOptional')}</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder={t('detailsPlaceholder')}
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('deadlineQuestion')}</label>
                <div className="flex gap-2 mb-2">
                  {[
                    { value: 'today', label: t('today') },
                    { value: 'tomorrow', label: t('tomorrow') },
                    { value: 'custom', label: t('custom') },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        if (value === 'custom') {
                          setIsCustomDeadline(true);
                          setDeadline('');
                          setTimeout(() => {
                            document.getElementById('deadline-input')?.focus();
                          }, 50);
                          return;
                        }
                        setIsCustomDeadline(false);
                        const d = new Date();
                        if (value === 'today') {
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
                        ${value === 'custom' && isCustomDeadline
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
                  {error.includes('プレミアム') && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const url = await createCheckoutSession();
                          window.location.href = url;
                        } catch {
                          setError(t('checkoutFailed'));
                        }
                      }}
                      className="mt-3 w-full bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-semibold py-2 rounded-lg text-sm transition-colors"
                    >
                      {t('upgradePremium')}
                    </button>
                  )}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-white text-gray-950 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {t('declare')}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setError(''); }}
                  className="flex-1 py-3 bg-gray-800 text-gray-300 font-semibold rounded-lg hover:bg-gray-700 transition-colors"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          </div>
        )}

        {error && !showForm && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
            {error.includes('プレミアム') && (
              <button
                onClick={async () => {
                  try {
                    const url = await createCheckoutSession();
                    window.location.href = url;
                  } catch {
                    setError(t('checkoutFailed'));
                  }
                }}
                className="mt-3 w-full bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-semibold py-2 rounded-lg text-sm transition-colors"
              >
                {t('upgradePremium')}
              </button>
            )}
          </div>
        )}

        {/* 未共有の未達成タスク */}
        {unsharedFailedDeclarations.length > 0 && (
      <div className="mb-6">
    <h2 className="text-white font-semibold text-lg mb-4">{t('shareRequiredTasks')}</h2>
       {unsharedFailedDeclarations.map((d) => (
        <DeclarationCard key={d.declarationId} declaration={d} onUpdate={fetchDeclarations} />
      ))}
    </div>
    )}

        {/* 進行中の宣言 */}
        <h2 className="text-white font-semibold text-lg mb-4">{t('activeDeclarations')}</h2>
        {declarations.filter((d) => d.status === 'pending').length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">{t('noActiveDeclarations')}</p>
          </div>
        ) : (
          declarations
            .filter((d) => d.status === 'pending')
            .map((d) => (
              <DeclarationCard
                key={d.declarationId}
                declaration={d}
                onUpdate={fetchDeclarations}
                onStatusConfirmed={setConfirmedDeclaration}
              />
            ))
        )}
        <button
          onClick={() => navigate('/tasks/history')}
          className="w-full py-3 bg-gray-900 border border-gray-800 text-gray-400 hover:text-white rounded-xl text-sm transition-colors mt-4"
        >
          {t('viewCompletedTasks')}
        </button>
      </div>
    </div>
  );
};

export default TasksPage;
