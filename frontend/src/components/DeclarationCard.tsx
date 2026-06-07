import { useState } from 'react';
import api from '../utils/api.js';
import { createCheckoutSession } from '../utils/api.js';
import ShareButton from './ShareButton.js';
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

interface DeclarationCardProps {
  declaration: Declaration;
  onUpdate: () => void;
  onStatusConfirmed?: (declaration: Declaration) => void;
}

const DeclarationCard = ({ declaration, onUpdate, onStatusConfirmed }: DeclarationCardProps) => {
  const { t, locale } = useLanguage();
  const [loading, setLoading] = useState(false);
  const requiresShare = declaration.status === 'failed' && !declaration.sharedAt;
  const [error, setError] = useState('');

  const isPastDeadline = new Date(declaration.deadline) < new Date();

  const handleStatus = async (status: 'done' | 'failed') => {
  setLoading(true);
  setError('');

  try {
    await api.patch(`/declarations/${declaration.declarationId}/status`, { status });
    onStatusConfirmed?.({
      ...declaration,
      status,
      reportedAt: new Date().toISOString(),
    });
    onUpdate();
  } catch (err) {
    const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
    setError(message ?? t('updateFailed'));
  } finally {
    setLoading(false);
  }
};


  const statusConfig = {
    pending: { label: t('statusPending'), className: 'bg-blue-900/30 text-blue-400 border-blue-800' },
    done: { label: t('statusDone'), className: 'bg-green-900/30 text-green-400 border-green-800' },
    failed: { label: t('statusFailed'), className: 'bg-red-900/30 text-red-400 border-red-800' },
  };

  const config = statusConfig[declaration.status] ?? statusConfig['pending'];

  const handleUpgrade = async () => {
    try {
      const url = await createCheckoutSession();
      window.location.href = url;
    } catch {
      setError(t('checkoutFailed'));
    }
  };

  return (
    <div className={`bg-gray-900 border rounded-xl p-5 mb-4 ${declaration.isLocked ? 'border-yellow-700/60' : 'border-gray-800'}`}>
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-white font-semibold text-lg flex-1 mr-4">{declaration.title}</h3>
        <div className="flex flex-wrap justify-end gap-2">
          {declaration.publicSharedAt ? (
            <span className="text-xs px-3 py-1 rounded-full border whitespace-nowrap bg-blue-900/30 text-blue-300 border-blue-800">
              {t('publicCommitmentBadge')}
            </span>
          ) : (
            <span className="text-xs px-3 py-1 rounded-full border whitespace-nowrap bg-gray-800 text-gray-500 border-gray-700">
              {t('privateCommitmentBadge')}
            </span>
          )}
          <span className={`text-xs px-3 py-1 rounded-full border whitespace-nowrap ${declaration.isLocked ? 'bg-yellow-900/30 text-yellow-300 border-yellow-700' : config.className}`}>
            {declaration.isLocked ? t('premiumLockedBadge') : config.label}
          </span>
        </div>
      </div>

      {declaration.description && (
        <p className="text-gray-400 text-sm mb-3">{declaration.description}</p>
      )}

      <p className="text-gray-500 text-xs mb-4">
        {t('deadline')}：{new Date(declaration.deadline).toLocaleString(locale)}
      </p>

      {declaration.isLocked && (
        <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-300 text-sm font-semibold mb-1">{t('premiumLockedTitle')}</p>
          <p className="text-gray-400 text-sm mb-3">{t('premiumLockedTaskBody')}</p>
          <button
            type="button"
            onClick={handleUpgrade}
            className="w-full py-2 bg-yellow-500 hover:bg-yellow-400 text-gray-950 rounded-lg text-sm font-semibold transition-colors"
          >
            {t('upgradePremium')}
          </button>
        </div>
      )}

      {!declaration.publicSharedAt && declaration.status === 'pending' && !declaration.isLocked && (
        <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 mb-4">
          <p className="text-blue-300 text-sm font-semibold mb-1">{t('reduceEscapeTitle')}</p>
          <p className="text-gray-400 text-sm mb-3">{t('privateCommitmentLead')}</p>
          <ShareButton
            declarationId={declaration.declarationId}
            title={declaration.title}
            type="declaration"
            onShare={async () => {
              await api.patch(`/declarations/${declaration.declarationId}/public-shared`, {});
              onUpdate();
            }}
          />
        </div>
      )}

      {/* 未達成シェア必須 */}
      {requiresShare && !declaration.isLocked && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-4">
          <p className="text-red-400 text-sm font-semibold mb-3">
            {t('shareFailedTaskRequired')}
          </p>
          <ShareButton
            declarationId={declaration.declarationId}
            title={declaration.title}
            type="failed"
            onShare={async () => {
              await api.patch(`/declarations/${declaration.declarationId}/shared`, {});
              onUpdate();
            }}
          />
        </div>
      )}

      {/* 達成/未達成ボタン */}
      {declaration.status === 'pending' && !requiresShare && !declaration.isLocked && (
  <div className="flex gap-3 mt-2">
    {!isPastDeadline && (
      <button
        onClick={() => handleStatus('done')}
        disabled={loading}
        className="flex-1 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
      >
        {t('achievedAction')}
      </button>
    )}
    {isPastDeadline && (
      <button
        onClick={() => handleStatus('failed')}
        disabled={loading}
        className="flex-1 py-2 bg-red-800 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
      >
        {t('failedAction')}
      </button>
    )}
  </div>
)}

      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
    </div>
  );
};

export default DeclarationCard;
