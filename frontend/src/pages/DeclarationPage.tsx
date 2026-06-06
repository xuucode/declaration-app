import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api.js';
import LanguageToggle from '../components/LanguageToggle.js';
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
  userId: string;
  sharedAt: string;
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

  const config = statusConfig[declaration.status];

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
          <p className={`text-sm font-semibold mb-4 ${config.text}`}>
            {config.label}
          </p>
          <h2 className="text-white text-3xl font-bold mb-4 leading-snug">
            {declaration.title}
          </h2>
          {declaration.description && (
            <p className="text-gray-400 text-base mb-4">{declaration.description}</p>
          )}
          <p className="text-gray-500 text-sm">
            {t('deadline')}：{new Date(declaration.deadline).toLocaleString(locale)}
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
