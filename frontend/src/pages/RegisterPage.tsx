import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api.js';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'register' | 'confirm'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/auth/register', { email, password, displayName });
      setStep('confirm');
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(message ?? '登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/auth/confirm', { email, code });
      navigate('/login');
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(message ?? '確認に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'confirm') {
    return (
      <div style={{ maxWidth: '400px', margin: '100px auto', padding: '24px' }}>
        <h1>メール確認</h1>
        <p>{email}に確認コードを送信しました。</p>
        <form onSubmit={handleConfirm}>
          <div style={{ marginBottom: '16px' }}>
            <label>確認コード</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{ display: 'block', width: '100%', padding: '8px', marginTop: '4px' }}
              required
            />
          </div>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px' }}>
            {loading ? '確認中...' : '確認する'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '24px' }}>
      <h1>新規登録</h1>
      <form onSubmit={handleRegister}>
        <div style={{ marginBottom: '16px' }}>
          <label>表示名</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            style={{ display: 'block', width: '100%', padding: '8px', marginTop: '4px' }}
            required
          />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label>メールアドレス</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ display: 'block', width: '100%', padding: '8px', marginTop: '4px' }}
            required
          />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label>パスワード（8文字以上・大文字・数字を含む）</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ display: 'block', width: '100%', padding: '8px', marginTop: '4px' }}
            required
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px' }}>
          {loading ? '登録中...' : '登録する'}
        </button>
      </form>
      <p style={{ marginTop: '16px' }}>
        すでにアカウントをお持ちの方は<Link to="/login">ログイン</Link>
      </p>
    </div>
  );
};

export default RegisterPage;