import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, Moon, Plus, Search, Sun } from 'lucide-react';
import NotificationBell from './NotificationBell';
import { usePreferences } from '../../context/PreferencesContext';
import { useAuth } from '../../context/AuthContext';

const titles = {
  '/': 'Overview', '/transactions': 'Transactions', '/income': 'Income', '/budgets': 'Budgets', '/goals': 'Goals',
  '/scheduled': 'Bills', '/reports': 'Reports', '/profile': 'Profile', '/settings': 'Settings'
};

export default function Topbar({ onMenu, onSearch }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = usePreferences();
  const { user } = useAuth();
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="btn-icon mobile-menu" onClick={onMenu} aria-label="Open menu"><Menu size={20} /></button>
        <h2 className="topbar-title">{titles[pathname] || 'SpendWise'}</h2>
      </div>

      <button className="search-trigger" onClick={onSearch} aria-label="Search and quick actions">
        <Search size={16} />
        <span>Search or jump to…</span>
        <kbd>{isMac ? '⌘' : 'Ctrl'} K</kbd>
      </button>

      <div className="topbar-actions">
        <button className="btn btn-primary btn-sm quick-add" onClick={() => navigate('/transactions?new=1')}>
          <Plus size={16} /><span>Add</span>
        </button>
        <button className="btn-icon" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} title="Toggle theme">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <NotificationBell />
        <button className="top-avatar" onClick={() => navigate('/profile')} aria-label="Open profile">{user.name?.[0]?.toUpperCase()}</button>
      </div>
    </header>
  );
}
