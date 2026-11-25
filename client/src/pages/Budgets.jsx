import { useEffect, useState } from 'react';
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Plus, Sparkles, Target, Trash2 } from 'lucide-react';
import api, { errorMessage } from '../api/client';
import SectionTitle from '../components/ui/SectionTitle';
import ProgressBar from '../components/ui/ProgressBar';
import EmptyState from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { CategoryIcon } from '../components/ui/CategoryIcon';
import BudgetModal from '../components/budgets/BudgetModal';
import { useFinance } from '../context/FinanceContext';
import { useToast } from '../context/ToastContext';
import { usePreferences } from '../context/PreferencesContext';
import { useFinanceActions } from '../hooks/useFinanceActions';
import { useFormat } from '../hooks/useFormat';
import { palette } from '../constants';
import { monthName, money } from '../utils/format';

export default function Budgets() {
  const now = new Date();
  const [period, setPeriod] = useState({ month: now.getMonth() + 1, year: now.getFullYear() });
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const { version } = useFinance();
  const { budgetAlerts } = usePreferences();
  const { saveBudget, deleteBudget, applyBudgetSuggestions } = useFinanceActions();
  const { base, fmt } = useFormat();
  const [suggestions, setSuggestions] = useState([]);
  const [skipped, setSkipped] = useState(() => new Set());
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get('/budgets', { params: period })
      .then(res => { if (!cancelled) setBudgets(res.data.budgets); })
      .catch(err => { if (!cancelled) toast.error(errorMessage(err, 'Could not load budgets.')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [period, version, toast]);

  // Suggested limits from the last three months, for categories with no budget yet.
  useEffect(() => {
    api.get('/budgets/suggestions').then(res => { setSuggestions(res.data.suggestions); setSkipped(new Set()); }).catch(() => {});
  }, [version]);

  const chosen = suggestions.filter(x => !skipped.has(x.category));
  const toggleSuggestion = category => setSkipped(prev => { const next = new Set(prev); if (next.has(category)) next.delete(category); else next.add(category); return next; });
  const applySuggestions = () => applyBudgetSuggestions(chosen.map(x => ({
    category: x.category, amount: x.suggested, currency: base, month: now.getMonth() + 1, year: now.getFullYear()
  })));

  const shift = delta => setPeriod(p => {
    const d = new Date(p.year, p.month - 1 + delta, 1);
    return { month: d.getMonth() + 1, year: d.getFullYear() };
  });

  const total = budgets.reduce((s, b) => s + b.amount, 0);
  const spent = budgets.reduce((s, b) => s + b.spent, 0);
  const label = monthName(new Date(period.year, period.month - 1, 1));
  const isCurrent = period.month === now.getMonth() + 1 && period.year === now.getFullYear();

  return (
    <>
      <SectionTitle
        title="Budgets"
        subtitle="Give each category a monthly limit and watch it fill up."
        action={<button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={17} /> Create budget</button>}
      />

      <div className="period-bar">
        <button className="btn-icon" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft size={18} /></button>
        <strong>{label}</strong>
        <button className="btn-icon" onClick={() => shift(1)} aria-label="Next month"><ChevronRight size={18} /></button>
        {!isCurrent && <button className="link-btn inline" onClick={() => setPeriod({ month: now.getMonth() + 1, year: now.getFullYear() })}>Back to this month</button>}
      </div>

      {isCurrent && suggestions.length > 0 && (
        <section className="panel suggest-panel">
          <div className="panel-head">
            <div><h3><Sparkles size={16} /> Suggested budgets</h3><p>Based on what you actually spent over the last three months. Untick any you don’t want.</p></div>
            <button className="btn btn-primary btn-sm" disabled={!chosen.length} onClick={applySuggestions}>Create {chosen.length} budget{chosen.length === 1 ? '' : 's'}</button>
          </div>
          <div className="suggest-chips">
            {suggestions.map(x => {
              const on = !skipped.has(x.category);
              return (
                <button key={x.category} className={`suggest-chip ${on ? 'on' : ''}`} onClick={() => toggleSuggestion(x.category)} aria-pressed={on}>
                  <i>{on && <Check size={12} />}</i>
                  <span>{x.category}</span>
                  <strong>{fmt(x.suggested)}</strong>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="strip" aria-label="Budget totals">
        <div className="strip-item"><div className="strip-top"><span>Planned</span></div><strong>{fmt(total)}</strong><small className="strip-note">Across {budgets.length} categor{budgets.length === 1 ? 'y' : 'ies'}</small></div>
        <div className="strip-item"><div className="strip-top"><span>Spent</span></div><strong>{fmt(spent)}</strong><small className="strip-note">{total ? `${Math.round((spent / total) * 100)}% of the plan` : 'No budgets for this month'}</small></div>
        <div className="strip-item"><div className="strip-top"><span>Remaining</span></div><strong className={total - spent < 0 ? 'text-neg' : ''}>{fmt(total - spent)}</strong><small className="strip-note">{total - spent < 0 ? 'Over the plan' : 'Still available'}</small></div>
      </section>

      {loading && budgets.length === 0 ? (
        <div className="card-grid">{[0, 1, 2].map(i => <Skeleton key={i} height={168} radius={18} />)}</div>
      ) : budgets.length ? (
        <div className="card-grid">
          {budgets.map((b, i) => {
            const pct = b.amount ? (b.spent / b.amount) * 100 : 0;
            const over = b.spent > b.amount;
            const warn = !over && budgetAlerts && pct >= 80;
            const color = palette[i % palette.length];
            return (
              <article className={`panel budget-card ${over ? 'is-over' : warn ? 'is-warn' : ''}`} key={b._id}>
                <div className="card-top">
                  <i className="tile" style={{ background: `${color}22`, color }}><CategoryIcon category={b.category} size={20} /></i>
                  {(over || warn) && <span className={`status-pill ${over ? 'danger' : 'warn'}`}><AlertTriangle size={12} /> {over ? 'Over budget' : 'Almost there'}</span>}
                  <button className="btn-icon btn-icon-danger" onClick={() => deleteBudget(b._id)} aria-label={`Delete ${b.category} budget`}><Trash2 size={15} /></button>
                </div>
                <h3>{b.category}</h3>
                <div className="amount-line"><strong>{fmt(b.spent)}</strong><span>of {money(b.amount, b.currency)}</span></div>
                <ProgressBar value={Math.min(100, pct)} tone={over ? 'neg' : warn ? 'warn' : 'brand'} />
                <div className="card-foot">
                  <span>{over ? `${fmt(b.spent - b.amount)} over the limit` : `${fmt(b.amount - b.spent)} left`}</span>
                  <strong className={over ? 'text-neg' : ''}>{Math.round(pct)}%</strong>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <section className="panel">
          <EmptyState icon={Target} title={`No budgets for ${label}`} text="Create one to keep a category's spending intentional."
            action={<button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={16} /> Create a budget</button>} />
        </section>
      )}

      {modal && <BudgetModal defaultMonth={period.month} defaultYear={period.year} onClose={() => setModal(false)} onSave={saveBudget} />}
    </>
  );
}
