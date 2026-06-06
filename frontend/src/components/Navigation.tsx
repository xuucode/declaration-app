import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import structHomeLogo from '../assets/struct-home.png';
import LanguageToggle from './LanguageToggle.js';
import { useLanguage } from '../i18n.js';

const Navigation = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { t } = useLanguage();

  const navItems = [
    { label: t('navHome'), path: '/mypage' },
    { label: t('navTasks'), path: '/tasks' },
    { label: t('navHabits'), path: '/habits' },
    { label: t('navExpenses'), path: '/expenses' },
    { label: t('navProfile'), path: '/profile' },
  ];

  return (
    <header className="app-header border-b border-gray-800 px-4 py-3 bg-gray-950 sticky top-0 z-10">
      <div className="max-w-2xl mx-auto flex justify-between items-start gap-4">
        <button
          onClick={() => navigate('/mypage')}
          className="nav-brand"
          aria-label="Struct home"
        >
          <img src={structHomeLogo} alt="Struct" className="h-24 w-auto max-w-[340px]" />
        </button>
        <div className="flex items-center gap-3 pt-1">
          <div className="hidden sm:block">
            <LanguageToggle />
          </div>
          {/* ハンバーガーメニュー */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="nav-menu-button md:hidden text-gray-400 hover:text-white p-2"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            <div className="w-5 h-0.5 bg-current mb-1"></div>
            <div className="w-5 h-0.5 bg-current mb-1"></div>
            <div className="w-5 h-0.5 bg-current"></div>
          </button>
        </div>
      </div>

      {/* デスクトップナビ */}
      <nav className="nav-rail max-w-2xl mx-auto mt-2 hidden md:grid grid-cols-5 gap-2">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`nav-tab flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-colors
              ${location.pathname === item.path
                ? 'nav-tab-active bg-white text-gray-950'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* モバイルメニュー */}
      {menuOpen && (
        <div className="mobile-nav-panel md:hidden mt-3 border-t border-gray-800 pt-3">
          <div className="max-w-2xl mx-auto space-y-1">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setMenuOpen(false); }}
                className={`nav-mobile-item w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition-colors
                  ${location.pathname === item.path
                    ? 'nav-tab-active bg-white text-gray-950'
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
              {t('logout')}
            </button>
            <div className="px-4 pt-2 sm:hidden">
              <LanguageToggle />
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navigation;
