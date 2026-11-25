import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Banknote, CalendarClock, CheckCircle2, Pause, Pencil, Play, Plus, Repeat, TrendingUp, Trash2 } from 'lucide-react';
import api, { errorMessage } from '../api/client';
import SectionTitle from '../components/ui/SectionTitle';
import Segmented from '../components/ui/Segmented';
import EmptyState from '../components/ui/EmptyState';
import ChartTooltip from '../components/ui/ChartTooltip';
import { PageSkeleton } from '../components/ui/Skeleton';
import IncomeSourceModal, { kindLabel } from '../components/income/IncomeSourceModal';
import RaiseModal from '../components/income/RaiseModal';
import TransactionModal from '../components/transactions/TransactionModal';
import { useFinance } from '../context/FinanceContext';
import { useToast } from '../context/ToastContext';
import { useFinanceActions } from '../hooks/useFinanceActions';
import { useFormat } from '../hooks/useFormat';
import { palette } from '../constants';

const rangeOptions = [{ value: 3, label: '3M' }, { value: 6, label: '6M' }, { value: 12, label: '12M' }];
const NONE = '#9AA5BD';

export default function Income() {
  const { incomeSources: sources, rules, loading, version } = useFinance();
  const { saveIncomeSource, raiseIncome, toggleIncome, deleteIncome, moveRuleToIncome, saveTransaction } = useFinanceActions();
  const { fmt } = useFormat();
  const toast = useToast();

  const [months, setMonths] = useState(6);
  const [summary, setSummary] = useState(null);
  const [modal, setModal] = useState(null); // { kind: 'source' | 'raise' | 'payment', source }

  useEffect(() => {
    let cancelled = false;
    api.get('/income/summary', { params: { months } })
      .then(res => { if (!cancelled) setSummary(res.data); })
      .catch(err => { if (!cancelled) toast.error(errorMessage(err, 'Could not load the income chart.')); });
    return () => { cancelled = true; };
  }, [months, version, toast]);

  const monthly = sources.filter(s => s.schedule === 'monthly' && s.status === 'active');
  const expected = monthly.reduce((sum, s) => sum + s.currentAmount, 0);
  const received = sources.reduce((sum, s) => sum + s.receivedThisMonth, 0);
  const legacy = rules.filter(r => r.type === 'income');

  const now = summary?.months?.[summary.months.length - 1];
  const sideShare = now && now.total > 0 ? Math.round((now.side / now.total) * 100) : null;

  const chart = useMemo(() => {
    if (!summary) return { data: [], keys: [] };
    const ids = [...new Set(summary.months.flatMap(m => Object.keys(m.bySource)))];
    const named = ids.map((id, i) => ({
      id, name: id === 'none' ? 'Not linked to a source' : summary.sources.find(s => s.id === id)?.name || 'Removed source',
      color: id === 'none' ? NONE : palette[i % palette.length]
    }));
    return { keys: named, data: summary.months.map(m => ({ month: m.month, ...Object.fromEntries(named.map(k => [k.id, m.bySource[k.id] || 0])) })) };
  }, [summary]);

  if (loading) return <PageSkeleton />;

  return (
    <>
      <SectionTitle
        title="Income"
        subtitle="Add your salary once and it is recorded every month. Add other sources too."
        action={<button className="btn btn-primary" onClick={() => setModal({ kind: 'source', source: null })}><Plus size={17} /> Add income source</button>}
      />

      {legacy.length > 0 && (
        <section className="panel suggest-panel">
          <div className="panel-head"><div><h3>Move your scheduled income here</h3><p>Income now lives on this page. These still work, and moving them keeps the same pay day.</p></div></div>
          <ul className="mini-list">
            {legacy.map(r => (
              <li key={r._id}>
                <i className="mini-icon pos"><Repeat size={15} /></i>
                <div><strong>{r.title}</strong><small>{fmt(r.amount)} on day {r.dayOfMonth}</small></div>
                <button className="btn btn-secondary btn-sm" onClick={() => moveRuleToIncome(r._id)}>Move to Income</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="strip" aria-label="This month">
        <div className="strip-item"><div className="strip-top"><span>Expected this month</span></div><strong>{fmt(expected)}</strong><small className="strip-note">From {monthly.length} monthly source{monthly.length === 1 ? '' : 's'}</small></div>
        <div className="strip-item"><div className="strip-top"><span>Received from sources</span></div><strong className="text-pos">{fmt(received)}</strong><small className="strip-note">{expected > 0 ? `${Math.min(100, Math.round((received / expected) * 100))}% of what you expect` : 'Add a monthly source to compare'}</small></div>
        <div className="strip-item"><div className="strip-top"><span>Side income share</span></div><strong>{sideShare === null ? '–' : `${sideShare}%`}</strong><small className="strip-note">Of all income this month</small></div>
      </section>

      {sources.length ? (
        <div className="card-grid">
          {sources.map(s => {
            const paused = s.status === 'paused';
            const today = new Date().getDate();
            return (
              <article key={s._id} className={`panel income-card ${paused ? 'is-paused' : ''}`}>
                <div className="card-top">
                  <span className="status-pill neutral">{kindLabel(s.kind)}</span>
                  {paused && <span className="status-pill warn"><Pause size={12} /> Paused</span>}
                </div>
                <h3>{s.name}</h3>
                <span className="muted-small">{s.category}</span>

                {s.schedule === 'monthly' ? (
                  <>
                    <div className="amount-line"><strong className="text-pos">{fmt(s.currentAmount)}</strong><span>every month, on day {s.dueDay}</span></div>
                    <div className={`pay-status ${s.postedThisMonth ? 'is-done' : ''}`}>
                      {s.postedThisMonth
                        ? <><CheckCircle2 size={15} /> Recorded this month: {fmt(s.receivedThisMonth)}</>
                        : paused ? <><Pause size={15} /> Not recorded while paused</>
                          : <><CalendarClock size={15} /> Next pay in {Math.max(0, s.dueDay - today)} day{s.dueDay - today === 1 ? '' : 's'}</>}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="amount-line"><strong className="text-pos">{fmt(s.receivedThisMonth)}</strong><span>received this month</span></div>
                    <button className="btn btn-secondary btn-sm" onClick={() => setModal({ kind: 'payment', source: s })}><Plus size={14} /> Add a payment</button>
                  </>
                )}

                <div className="card-foot">
                  <div className="row-actions always">
                    {s.schedule === 'monthly' && <button className="btn btn-secondary btn-sm" onClick={() => setModal({ kind: 'raise', source: s })}><TrendingUp size={13} /> Change amount</button>}
                    <button className="btn-icon" onClick={() => setModal({ kind: 'source', source: s })} aria-label={`Edit ${s.name}`}><Pencil size={15} /></button>
                    <button className="btn-icon" onClick={() => toggleIncome(s)} aria-label={paused ? `Resume ${s.name}` : `Pause ${s.name}`}>{paused ? <Play size={15} /> : <Pause size={15} />}</button>
                    <button className="btn-icon btn-icon-danger" onClick={() => deleteIncome(s)} aria-label={`Delete ${s.name}`}><Trash2 size={15} /></button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <section className="panel">
          <EmptyState icon={Banknote} title="Add your salary once" text="Tell SpendWise how much you earn and on which day, and it records it every month. You can add side income too."
            action={<button className="btn btn-primary" onClick={() => setModal({ kind: 'source', source: null })}><Plus size={16} /> Add income source</button>} />
        </section>
      )}

      <section className="panel">
        <div className="panel-head">
          <div><h3>Where your income comes from</h3><p>Month by month, split by source</p></div>
          <Segmented size="sm" label="Chart range" value={months} onChange={setMonths} options={rangeOptions} />
        </div>
        {chart.keys.length ? (
          <>
            <div className="legend">{chart.keys.map(k => <span key={k.id}><i style={{ background: k.color }} /> {k.name}</span>)}</div>
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart.data}>
                  <CartesianGrid stroke="var(--line)" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--ink-3)', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} width={42} tick={{ fill: 'var(--ink-3)', fontSize: 11 }} tickFormatter={v => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--brand-soft)', opacity: 0.5 }} />
                  {chart.keys.map(k => <Bar key={k.id} name={k.name} dataKey={k.id} stackId="income" fill={k.color} />)}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <EmptyState compact icon={Banknote} text="Income will appear here once it has been recorded." />
        )}
      </section>

      {modal?.kind === 'source' && <IncomeSourceModal initial={modal.source} onClose={() => setModal(null)} onSave={saveIncomeSource} />}
      {modal?.kind === 'raise' && <RaiseModal source={modal.source} onClose={() => setModal(null)} onSave={raiseIncome} />}
      {modal?.kind === 'payment' && (
        <TransactionModal
          preset={{ type: 'income', sourceId: modal.source._id, category: modal.source.category, title: modal.source.name }}
          onClose={() => setModal(null)} onSave={saveTransaction}
        />
      )}
    </>
  );
}
