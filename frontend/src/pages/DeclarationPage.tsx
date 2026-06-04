import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api.js';

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
  const [declaration, setDeclaration] = useState<Declaration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDeclaration = async () => {
      try {
        const res = await api.get(`/declarations/${id}`);
        setDeclaration(res.data);
      } catch {
        setError('宣言が見つかりません');
      } finally {
        setLoading(false);
      }
    };
    fetchDeclaration();
  }, [id]);

  const statusConfig = {
    pending: {
      label: '⏳ 進行中',
      bg: 'bg-gray-900',
      border: 'border-gray-700',
      text: 'text-blue-400',
    },
    done: {
      label: '✅ 達成',
      bg: 'bg-green-950',
      border: 'border-green-800',
      text: 'text-green-400',
    },
    failed: {
      label: '❌ 未達成',
      bg: 'bg-red-950',
      border: 'border-red-800',
      text: 'text-red-400',
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">読み込み中...</p>
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
        <div className="max-w-2xl mx-auto">
          <h1 className="text-white font-bold text-xl">宣言する</h1>
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
            期限：{new Date(declaration.deadline).toLocaleString('ja-JP')}
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
          <p className="text-white text-xl font-bold mb-2">
            あなたも宣言してみませんか？
          </p>
          <p className="text-gray-400 text-sm mb-6">
            公開宣言で、やり遂げる力を手に入れよう
          </p>
          <Link to="/register">
            <button className="w-full bg-white text-gray-950 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors text-lg">
              無料で始める
            </button>
          </Link>
          <p className="text-gray-600 text-sm mt-4">
            すでにアカウントをお持ちの方は{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300">
              ログイン
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default DeclarationPage;