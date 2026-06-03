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
}

interface DeclarationCardProps {
  declaration: Declaration;
  onUpdate: () => void;
}

const DeclarationCard = ({ declaration, onUpdate }: DeclarationCardProps) => {
  const [loading, setLoading] = useState(false);
  const [requiresShare, setRequiresShare] = useState(false);
  const [error, setError] = useState('');

  const isPastDeadline = new Date(declaration.deadline) < new Date();

  const handleStatus = async (status: 'done' | 'failed') => {
    setLoading(true);
    setError('');

    try {
      const res = await api.patch(`/declarations/${declaration.declarationId}/status`, { status });
      if (res.data.requiresShare) {
        setRequiresShare(true);
      } else {
        onUpdate();
      }
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(message ?? '更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const statusLabel = {
    pending: '⏳ 進行中',
    done: '✅ 達成',
    failed: '❌ 未達成',
  };

  return (
    <div style={{
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '16px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h3 style={{ margin: 0 }}>{declaration.title}</h3>
        <span>{statusLabel[declaration.status]}</span>
      </div>
      {declaration.description && (
        <p style={{ color: '#666', marginBottom: '8px' }}>{declaration.description}</p>
      )}
      <p style={{ fontSize: '14px', color: '#999' }}>
        期限：{new Date(declaration.deadline).toLocaleString('ja-JP')}
      </p>

      {/* 未達成シェア必須 */}
      {requiresShare && (
        <div style={{ backgroundColor: '#fff3f3', padding: '16px', borderRadius: '8px', marginTop: '8px' }}>
          <p style={{ color: '#c0392b', fontWeight: 'bold' }}>
            未達成をXでシェアしてください。シェア後に次の宣言が作れます。
          </p>
          <ShareButton
            declarationId={declaration.declarationId}
            title={declaration.title}
            type="failed"
            onShare={onUpdate}
          />
        </div>
      )}

      {/* 達成/未達成ボタン */}
      {declaration.status === 'pending' && isPastDeadline && !requiresShare && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <button
            onClick={() => handleStatus('done')}
            disabled={loading}
            style={{ flex: 1, padding: '10px', backgroundColor: '#1a8a4a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            達成した
          </button>
          <button
            onClick={() => handleStatus('failed')}
            disabled={loading}
            style={{ flex: 1, padding: '10px', backgroundColor: '#c0392b', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            未達成
          </button>
        </div>
      )}

      {/* 達成時の任意シェア */}
      {declaration.status === 'done' && !declaration.reportedAt && (
        <div style={{ marginTop: '12px' }}>
          <p style={{ fontSize: '14px', color: '#666' }}>
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

      {error && <p style={{ color: 'red', marginTop: '8px' }}>{error}</p>}
    </div>
  );
};

export default DeclarationCard;