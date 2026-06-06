import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

const Navigation = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const navItems = [
  { label: '🏠 ホーム', path: '/mypage' },
  { label: '📋 タスク', path: '/tasks' },
  { label: '🔄 習慣', path: '/habits' },
  { label: '💰 支出', path: '/expenses' },
  { label: '👤 プロフィール', path: '/profile' },
];
  return (
    <header className="border-b border-gray-800 px-4 py-4 bg-gray-950 sticky top-0 z-10">
      <div className="max-w-2xl mx-auto flex justify-between items-center">
        <h1 className="text-white font-bold text-xl">Stract</h1>
        <div className="flex items-center gap-4">
          {/* デスクトップナビ */}
          <nav className="hidden md:flex gap-2">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors
                  ${location.pathname === item.path
                    ? 'bg-white text-gray-950'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* ハンバーガーメニュー */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-gray-400 hover:text-white p-2"
          >
            <div className="w-5 h-0.5 bg-current mb-1"></div>
            <div className="w-5 h-0.5 bg-current mb-1"></div>
            <div className="w-5 h-0.5 bg-current"></div>
          </button>
        </div>
      </div>

      {/* モバイルメニュー */}
      {menuOpen && (
        <div className="md:hidden mt-3 border-t border-gray-800 pt-3">
          <div className="max-w-2xl mx-auto space-y-1">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition-colors
                  ${location.pathname === item.path
                    ? 'bg-white text-gray-950'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={logout}
              className="w-full text-left px-4 py-3 rounded-lg text-sm text-gray-500 hover:text-white transition-colors"
            >
              ログアウト
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navigation;