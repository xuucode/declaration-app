import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api.js';
import { useAuth } from '../hooks/useAuth.js';
import DeclarationCard from '../components/DeclarationCard.js';
import ShareButton from '../components/ShareButton.js';

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

const MyPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, logout } = useAuth();
  const [declarations, setDeclarations] = useState<Declaration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [error, setError] = useState('');
  const [newDeclaration, setNewDeclaration] = useState<Declaration | null>(null);

  const fetchDeclarations = useCallback(async () => {
    try {
      const res = await api.get('/declarations');
      setDeclarations(res.data);
    } catch {
      setError('宣言の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }
    if (!authLoading) {
      fetchDeclarations();
    }
  }, [authLoading, user, navigate, fetchDeclarations]);

  // 未達成かつ未報告の宣言があるかチェック
  const hasUnreportedFailed = declarations.some(
    (d) => d.status === 'failed' && !d.reportedAt
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const res = await api.post('/declarations', { title, description, deadline });
      setNewDeclaration(res.data);
      setTitle('');
      setDescription('');
      setDeadline('');
      setShowForm(false);
      fetchDeclarations();
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(message ?? '宣言の作成に失敗しました');
    }
  };

  const achievedCount = declarations.filter((d) => d.status === 'done').length;
  const totalReported = declarations.filter((d) => d.status !== 'pending').length;
  const achieveRate = totalReported > 0 ? Math.round((achievedCount / totalReported) * 100) : 0;

  if (authLoading || loading) return <p style={{ textAlign: 'center', marginTop: '100px' }}>読み込み中...</p>;

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0 }}>{user?.displayName}さん</h1>
          <p style={{ margin: '4px 0', color: '#666' }}>
            🔥 {user?.streakCount}日連続達成　／　達成率 {achieveRate}%
          </p>
        </div>
        <button onClick={logout} style={{ padding: '8px 16px', cursor: 'pointer' }}>
          ログアウト
        </button>
      </div>

      {/* 新規宣言作成後のシェアボタン */}
      {newDeclaration && (
        <div style={{ backgroundColor: '#f0f8ff', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
          <p style={{ fontWeight: 'bold' }}>宣言を作成しました！</p>
          <p style={{ fontSize: '14px', color: '#666' }}>
            ※ シェアすることで達成率が上がると言われています
          </p>
          <ShareButton
            declarationId={newDeclaration.declarationId}
            title={newDeclaration.title}
            type="declaration"
            onShare={() => setNewDeclaration(null)}
          />
          <button
            onClick={() => setNewDeclaration(null)}
            style={{ marginTop: '8px', width: '100%', padding: '8px', cursor: 'pointer', background: 'none', border: '1px solid #ddd', borderRadius: '8px' }}
          >
            スキップ
          </button>
        </div>
      )}

      {/* 宣言作成ボタン */}
      {!showForm && !newDeclaration && (
        <button
          onClick={() => {
            if (hasUnreportedFailed) {
              setError('未達成の宣言をシェアしてから新しい宣言を作成してください');
              return;
            }
            setShowForm(true);
          }}
          style={{ width: '100%', padding: '12px', marginBottom: '24px', cursor: 'pointer', backgroundColor: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px' }}
        >
          ＋ 新しい宣言を作る
        </button>
      )}

      {/* 宣言作成フォーム */}
      {showForm && (
        <form onSubmit={handleCreate} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
          <h3>新しい宣言</h3>
          <div style={{ marginBottom: '12px' }}>
            <label>タイトル</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ display: 'block', width: '100%', padding: '8px', marginTop: '4px' }}
              required
            />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label>詳細（任意）</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ display: 'block', width: '100%', padding: '8px', marginTop: '4px' }}
              rows={3}
            />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label>期限</label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              style={{ display: 'block', width: '100%', padding: '8px', marginTop: '4px' }}
              required
            />
          </div>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" style={{ flex: 1, padding: '10px', backgroundColor: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              宣言する
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: '10px', cursor: 'pointer' }}>
              キャンセル
            </button>
          </div>
        </form>
      )}

      {error && !showForm && <p style={{ color: 'red' }}>{error}</p>}

      <h2>宣言一覧</h2>
      {declarations.length === 0 ? (
        <p style={{ color: '#666', textAlign: 'center' }}>まだ宣言がありません</p>
      ) : (
        declarations.map((d) => (
          <DeclarationCard key={d.declarationId} declaration={d} onUpdate={fetchDeclarations} />
        ))
      )}
    </div>
  );
};

export default MyPage;