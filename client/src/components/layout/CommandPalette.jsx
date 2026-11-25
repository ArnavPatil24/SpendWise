import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight, BarChart3, Banknote, CornerDownLeft, LayoutDashboard, LogOut, Moon, Plus, Repeat,
  Search, Settings, Sun, Target, Trophy, UserRound
} from 'lucide-react';
import { usePreferences } from '../../context/PreferencesContext';
import { useAuth } from '../../context/AuthContext';
import { useFinanceActions } from '../../hooks/useFinanceActions';
import { useFormat } from '../../hooks/useFormat';
import { parseQuickEntry } from '../../utils/quickAdd';
import { useCategories } from '../../context/CategoryContext';

export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = usePreferences();
  const { logout } = useAuth();
  const { saveTransaction } = useFinanceActions();
  const { base, fmtFull, fmtDate } = useFormat();
  const { custom } = useCategories();
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const input = useRef(null);
  const card = useRef(null);
  useFocusTrap(card, open);

  const commands = useMemo(() => {
    const go = to => () => navigate(to);
    const list = [
      { id: 'add', group: 'Actions', label: 'Add a transaction', icon: Plus, run: go('/transactions?new=1') },
      { id: 'theme', group: 'Actions', label: theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme', icon: theme === 'dark' ? Sun : Moon, run: toggleTheme },
      { id: 'overview', group: 'Go to', label: 'Overview', icon: LayoutDashboard, run: go('/') },
      { id: 'tx', group: 'Go to', label: 'Transactions', icon: ArrowLeftRight, run: go('/transactions') },
      { id: 'income', group: 'Go to', label: 'Income', icon: Banknote, run: go('/income') },
      { id: 'budgets', group: 'Go to', label: 'Budgets', icon: Target, run: go('/budgets') },
      { id: 'goals', group: 'Go to', label: 'Goals', icon: Trophy, run: go('/goals') },
      { id: 'scheduled', group: 'Go to', label: 'Scheduled transactions', icon: Repeat, run: go('/scheduled') },
      { id: 'reports', group: 'Go to', label: 'Reports', icon: BarChart3, run: go('/reports') },
      { id: 'profile', group: 'Go to', label: 'Profile', icon: UserRound, run: go('/profile') },
      { id: 'settings', group: 'Go to', label: 'Settings', icon: Settings, run: go('/settings') },
      { id: 'logout', group: 'Account', label: 'Sign out', icon: LogOut, run: logout }
    ];
    const q = query.trim().toLowerCase();
    const matches = q ? list.filter(c => c.label.toLowerCase().includes(q)) : list;
    if (q) {
      matches.unshift({
        id: 'search', group: 'Search', label: `Find transactions matching “${query.trim()}”`, icon: Search,
        run: () => navigate(`/transactions?q=${encodeURIComponent(query.trim())}`)
      });
    }
    // "coffee 180 yesterday" becomes a one-keystroke transaction.
    const parsed = parseQuickEntry(query, new Date(), custom);
    if (parsed?.amount && /[a-z]/i.test(query)) {
      matches.unshift({
        id: 'quick', group: 'Quick add', icon: Plus,
        label: `Add ${parsed.type === 'income' ? 'income' : 'expense'}: ${parsed.title}, ${fmtFull(parsed.amount)}, ${parsed.category}, ${fmtDate(parsed.date)}`,
        run: () => saveTransaction({
          type: parsed.type, title: parsed.title, category: parsed.category, amount: parsed.amount,
          currency: base, exchangeRate: 1, date: parsed.date, note: ''
        })
      });
    }
    return matches;
  }, [query, theme, navigate, toggleTheme, logout, saveTransaction, base, fmtFull, fmtDate, custom]);

  useEffect(() => { setIndex(0); }, [query]);
  useEffect(() => {
    if (open) { setQuery(''); setTimeout(() => input.current?.focus(), 0); }
  }, [open]);

  if (!open) return null;

  const execute = command => { onClose(); command?.run(); };

  const onKeyDown = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIndex(i => (i + 1) % commands.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex(i => (i - 1 + commands.length) % commands.length); }
    else if (e.key === 'Enter') { e.preventDefault(); execute(commands[index]); }
    else if (e.key === 'Escape') onClose();
  };

  let lastGroup = '';
  return (
    <div className="modal-backdrop palette-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="palette" ref={card} role="dialog" aria-modal="true" aria-label="Command palette">
        <div className="palette-input">
          <Search size={18} />
          <input ref={input} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={onKeyDown} placeholder="Type a page, action or search term…" aria-label="Search commands" />
          <kbd>Esc</kbd>
        </div>
        <ul className="palette-list">
          {commands.length === 0 && <li className="palette-none">No matches. Try a different word.</li>}
          {commands.map((c, i) => {
            const showGroup = c.group !== lastGroup;
            lastGroup = c.group;
            return (
              <Fragment key={c.id}>
                {showGroup && <li className="palette-group">{c.group}</li>}
                <li>
                  <button className={`palette-item ${i === index ? 'active' : ''}`} onMouseEnter={() => setIndex(i)} onClick={() => execute(c)}>
                    <c.icon size={17} /><span>{c.label}</span>{i === index && <CornerDownLeft size={14} />}
                  </button>
                </li>
              </Fragment>
            );
          })}
        </ul>
        <div className="palette-foot"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>Enter</kbd> select</span><span>Tip: type “coffee 180 yesterday” to add it instantly</span></div>
      </div>
    </div>
  );
}
