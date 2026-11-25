import { NavLink, useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight, BarChart3, Banknote, LayoutDashboard, LogOut, Repeat, Settings, Target, Trophy, UserRound, X
} from 'lucide-react';
import { Logo } from '../ui/Logo';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import { useFormat } from '../../hooks/useFormat';

const groups = [
  {
    label: 'Workspace',
    items: [
      { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
      { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight, count: 'transactions' },
      { to: '/income', label: 'Income', icon: Banknote, count: 'income' },
      { to: '/budgets', label: 'Budgets', icon: Target },
      { to: '/goals', label: 'Goals', icon: Trophy, count: 'goals' },
      { to: '/scheduled', label: 'Bills', icon: Repeat, count: 'rules' }
    ]
  },
  { label: 'Insights', items: [{ to: '/reports', label: 'Reports', icon: BarChart3 }] }
];

function BudgetMeter() {
  const { budgets } = useFinance();
  const { fmt } = useFormat();
  const navigate = useNavigate();

  const planned = budgets.reduce((s, b) => s + b.amount, 0);
  const spent = budgets.reduce((s, b) => s + b.spent, 0);

  if (!planned) {
    return (
      <button className="meter meter-empty" onClick={() => navigate('/budgets')}>
        <Target size={18} />
        <span><strong>No budget yet</strong><small>Set a monthly limit</small></span>
      </button>
    );
  }

  const pct = Math.min(100, (spent / planned) * 100);
  const tone = spent > planned ? 'danger' : pct >= 80 ? 'warn' : 'ok';
  const r = 17;
  const c = 2 * Math.PI * r;

  return (
    <button className={`meter meter-${tone}`} onClick={() => navigate('/budgets')} title="Open budgets">
      <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
        <circle cx="22" cy="22" r={r} className="meter-track" />
        <circle cx="22" cy="22" r={r} className="meter-value" strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100} transform="rotate(-90 22 22)" />
      </svg>
      <span>
        <strong>{Math.round((spent / planned) * 100)}% of budget used</strong>
        <small>{spent > planned ? `${fmt(spent - planned)} over` : `${fmt(planned - spent)} left`}</small>
      </span>
    </button>
  );
}

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const { summary, goals, rules, incomeSources } = useFinance();
  const counts = {
    transactions: summary.counts.transactions,
    goals: goals.filter(g => g.status !== 'completed').length,
    rules: rules.filter(r => r.type !== 'income').length,
    income: incomeSources.length
  };

  return (
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <div className="sidebar-head">
        <NavLink to="/" onClick={onClose} aria-label="SpendWise home"><Logo size={34} /></NavLink>
        <button className="btn-icon close-sidebar" onClick={onClose} aria-label="Close menu"><X size={18} /></button>
      </div>

      <nav className="nav-groups" aria-label="Main">
        {groups.map(group => (
          <div className="nav-group" key={group.label}>
            <div className="nav-group-label">{group.label}</div>
            {group.items.map(item => (
              <NavLink key={item.to} to={item.to} end={item.end} onClick={onClose} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <item.icon size={18} strokeWidth={1.9} />
                <span>{item.label}</span>
                {item.count && counts[item.count] > 0 && <em className="nav-count">{counts[item.count]}</em>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <BudgetMeter />
        <NavLink to="/profile" onClick={onClose} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <UserRound size={18} strokeWidth={1.9} /><span>Profile</span>
        </NavLink>
        <NavLink to="/settings" onClick={onClose} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Settings size={18} strokeWidth={1.9} /><span>Settings</span>
        </NavLink>
        <div className="user-chip">
          <div className="avatar">{user.name?.[0]?.toUpperCase()}</div>
          <div className="user-chip-copy"><strong>{user.name}</strong><small>{user.email}</small></div>
          <button className="btn-icon" onClick={logout} title="Sign out" aria-label="Sign out"><LogOut size={16} /></button>
        </div>
      </div>
    </aside>
  );
}
