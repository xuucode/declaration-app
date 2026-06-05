import { useState } from 'react';
import api from '../utils/api.js';
import ShareButton from './ShareButton.js';

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
}

interface DeclarationCardProps {
  declaration: Declaration;
  onUpdate: () => void;
}

const DeclarationCard = ({ declaration, onUpdate }: DeclarationCardProps) => {
  const [loading, setLoading] = useState(false);
  const requiresShare = declaration.status === 'failed' && !declaration.sharedAt;
  const [error, setError] = useState('');

  const isPastDeadline = new Date(declaration.deadline) < new Date();

  const handleStatus = async (status: 'done' | 'failed') => {
  setLoading(true);
  setError('');

  try {
    await api.patch(`/declarations/${declaration.declarationId}/status`, { status });
    onUpdate();
  } catch (err) {
    const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
    setError(message ?? '更新に失敗しました');
  } finally {
    setLoading(false);
  }
};


  const statusConfig = {
    pending: { label: '⏳ 進行中', className: 'bg-blue-900/30 text-blue-400 border-blue-800' },
    done: { label: '✅ 達成', className: 'bg-green-900/30 text-green-400 border-green-800' },
    failed: { label: '❌ 未達成', className: 'bg-red-900/30 text-red-400 border-red-800' },
  };

  const config = statusConfig[declaration.status] ?? statusConfig['pending'];

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-white font-semibold text-lg flex-1 mr-4">{declaration.title}</h3>
        <span className={`text-xs px-3 py-1 rounded-full border whitespace-nowrap ${config.className}`}>
          {config.label}
        </span>
      </div>

      {declaration.description && (
        <p className="text-gray-400 text-sm mb-3">{declaration.description}</p>
      )}

      <p className="text-gray-500 text-xs mb-4">
        期限：{new Date(declaration.deadline).toLocaleString('ja-JP')}
      </p>

      {/* 未達成シェア必須 */}
      {requiresShare && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-4">
          <p className="text-red-400 text-sm font-semibold mb-3">
            未達成をXでシェアしてから次の宣言を作成できます
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
      {declaration.status === 'pending' && !requiresShare && (
  <div className="flex gap-3 mt-2">
    {!isPastDeadline && (
      <button
        onClick={() => handleStatus('done')}
        disabled={loading}
        className="flex-1 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
      >
        達成した
      </button>
    )}
    {isPastDeadline && (
      <button
        onClick={() => handleStatus('failed')}
        disabled={loading}
        className="flex-1 py-2 bg-red-800 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
      >
        未達成
      </button>
    )}
  </div>
)}

      {/* 達成時の任意シェア */}
      {declaration.status === 'done' && !declaration.reportedAt && (
        <div className="mt-3">
          <p className="text-gray-500 text-xs mb-2">
            ※ シェアすることで達成率が上がると言われています
          </p>
          <ShareButton
            declarationId={declaration.declarationId}
            title={declaration.title}
            type="declaration"
            onShare={onUpdate}
          />
        </div>
      )}

      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
    </div>
  );
};

export default DeclarationCard;