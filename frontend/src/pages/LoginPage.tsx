import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api.js';
import { saveTokens } from '../utils/auth.js';

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/login', { email, password });
      saveTokens(res.data.accessToken, res.data.idToken, res.data.refreshToken);
      navigate('/mypage');
   } catch (err) {
     const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
     setError(message ?? 'ログインに失敗しました');
}
  };

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '24px' }}>
      <h1>ログイン</h1>
      <form onSubmit={handleSubmit}>
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
          <label>パスワード</label>
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
          {loading ? 'ログイン中...' : 'ログイン'}
        </button>
      </form>
      <p style={{ marginTop: '16px' }}>
        アカウントをお持ちでない方は<Link to="/register">新規登録</Link>
      </p>
    </div>
  );
};

export default LoginPage;