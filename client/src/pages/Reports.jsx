import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowLeftRight, ChevronLeft, ChevronRight, Gauge, PiggyBank, TrendingDown, TrendingUp } from 'lucide-react';
import api, { errorMessage } from '../api/client';
import SectionTitle from '../components/ui/SectionTitle';
import Segmented from '../components/ui/Segmented';
import ProgressBar from '../components/ui/ProgressBar';
import EmptyState from '../components/ui/EmptyState';
import ChartTooltip from '../components/ui/ChartTooltip';
import Delta from '../components/ui/Delta';
import { PageSkeleton } from '../components/ui/Skeleton';
import HealthScore from '../components/insights/HealthScore';
import { useFinance } from '../context/FinanceContext';
import { useCategories } from '../context/CategoryContext';
import { useToast } from '../context/ToastContext';
import { useFormat } from '../hooks/useFormat';
import { chartColors, palette } from '../constants';
import { monthName, percentChange } from '../utils/format';

const rangeOptions = [{ value: 3, label: '3M' }, { value: 6, label: '6M' }, { value: 12, label: '12M' }];

function Breakdown({ rows, empty, metaFor, fmt, showPrevious }) {
  const max = Math.max(1, ...rows.map(r => r.total));
  if (!rows.length) return <EmptyState compact icon={PiggyBank} text={empty} />;
  return (
    <ul className="bar-list">
      {rows.map((r, i) => {
        const color = metaFor(r.category)?.color || palette[i % palette.length];
        const change = showPrevious && r.previous !== undefined ? r.total - r.previous : null;
        return (
          <li key={r.category}>
            <div className="bar-list-top">
              <span><i style={{ background: color }} />{r.category}</span>
              <strong>{fmt(r.total)}</strong>
            </div>
            <ProgressBar value={(r.total / max) * 100} height={7} color={color} />
            {change !== null && r.previous > 0 && (
              <small className={`bar-change ${change > 0 ? 'up' : change < 0 ? 'down' : ''}`}>
                {change === 0 ? 'Same as the month before' : `${change > 0 ? '+' : '−'}${fmt(Math.abs(change))} compared with the month before`}
              </small>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** One page for how money moved: pick a month, see what came in, where it went, and how healthy it looks. */
export default function Reports() {
  const { trend, trendMonths, changeTrendMonths, health, loading, version } = useFinance();
  const { metaFor } = useCategories();
  const { fmt } = useFormat();
  const toast = useToast();

  const now = new Date();
  const [period, setPeriod] = useState({ month: now.getMonth() + 1, year: now.getFullYear() });
  const [report, setReport] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.get('/analytics/report', { params: period })
      .then(res => { if (!cancelled) setReport(res.data); })
      .catch(err => { if (!cancelled) toast.error(errorMessage(err, 'Could not load the report.')); });
    return () => { cancelled = true; };
  }, [period, version, toast]);

  if (loading || !report) return <PageSkeleton />;

  const isCurrent = period.month === now.getMonth() + 1 && period.year === now.getFullYear();
  const shift = delta => setPeriod(p => {
    const d = new Date(p.year, p.month - 1 + delta, 1);
    return { month: d.getMonth() + 1, year: d.getFullYear() };
  });
  const { totals, previous, complete } = report;
  const label = monthName(new Date(period.year, period.month - 1, 1));
  const compare = (current, before, goodWhenUp = true) => (complete ? <Delta value={percentChange(current, before)} goodWhenUp={goodWhenUp} label="the month before" /> : null);

  return (
    <>
      <SectionTitle title="Reports" subtitle="How your money moved, month by month." />

      <div className="period-bar">
        <button className="btn-icon" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft size={18} /></button>
        <strong>{label}</strong>
        <button className="btn-icon" onClick={() => shift(1)} aria-label="Next month"><ChevronRight size={18} /></button>
        {!isCurrent && <button className="link-btn inline" onClick={() => setPeriod({ month: now.getMonth() + 1, year: now.getFullYear() })}>Back to this month</button>}
        <span className={`status-pill ${complete ? 'neutral' : 'ok'}`}>{complete ? 'Finished month' : 'In progress'}</span>
      </div>

      <section className="strip strip-4" aria-label={`Totals for ${label}`}>
        <div className="strip-item">
          <div className="strip-top"><span>Income</span><i className="strip-icon pos"><TrendingUp size={16} /></i></div>
          <strong>{fmt(totals.income)}</strong>
          {compare(totals.income, previous.income) || <small className="strip-note">Last month: {fmt(previous.income)}</small>}
        </div>
        <div className="strip-item">
          <div className="strip-top"><span>Spending</span><i className="strip-icon brand"><TrendingDown size={16} /></i></div>
          <strong>{fmt(totals.expenses)}</strong>
          {compare(totals.expenses, previous.expenses, false) || <small className="strip-note">Last month: {fmt(previous.expenses)}</small>}
        </div>
        <div className="strip-item">
          <div className="strip-top"><span>Saved</span><i className="strip-icon gold"><PiggyBank size={16} /></i></div>
          <strong className={totals.savings < 0 ? 'text-neg' : ''}>{totals.savings < 0 ? '−' : ''}{fmt(Math.abs(totals.savings))}</strong>
          <small className="strip-note">Income less spending</small>
        </div>
        <div className="strip-item">
          <div className="strip-top"><span>Savings rate</span><i className="strip-icon neutral"><Gauge size={16} /></i></div>
          <strong>{totals.savingsRate === null ? '–' : `${totals.savingsRate}%`}</strong>
          <small className="strip-note">{totals.count} transaction{totals.count === 1 ? '' : 's'} this month</small>
        </div>
      </section>
      {!complete && <p className="report-note"><ArrowLeftRight size={14} /> This month is still in progress, so it is not compared with last month. Entries added later would make any comparison unfair.</p>}

      <section className="panel">
        <div className="panel-head">
          <div><h3>Money in and out</h3><p>The last few months at a glance</p></div>
          <Segmented size="sm" label="Chart range" value={trendMonths} onChange={changeTrendMonths} options={rangeOptions} />
        </div>
        <div className="legend">
          <span><i style={{ background: chartColors.income }} /> Income</span>
          <span><i style={{ background: chartColors.expenses }} /> Spending</span>
        </div>
        <div className="chart-box tall">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend} barGap={6}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--ink-3)', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} width={42} tick={{ fill: 'var(--ink-3)', fontSize: 11 }} tickFormatter={v => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--brand-soft)', opacity: 0.5 }} />
              <Bar name="Income" dataKey="income" fill={chartColors.income} radius={[6, 6, 0, 0]} />
              <Bar name="Spending" dataKey="expenses" fill={chartColors.expenses} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid-2">
        <section className="panel">
          <div className="panel-head"><div><h3>Where it came from</h3><p>{label}</p></div></div>
          <Breakdown rows={report.incomeBreakdown} empty="No income recorded for this month." metaFor={metaFor} fmt={fmt} />
        </section>
        <section className="panel">
          <div className="panel-head"><div><h3>Where it went</h3><p>{label}{complete ? ', compared with the month before' : ''}</p></div></div>
          <Breakdown rows={report.expenseCategories} empty="No spending recorded for this month." metaFor={metaFor} fmt={fmt} showPrevious={complete} />
        </section>
      </div>

      {health && (
        <section className="panel">
          <div className="panel-head"><div><h3>Financial health</h3><p>A score out of 100 you can act on</p></div></div>
          <HealthScore score={health.score} basis={health.basis} />
        </section>
      )}
    </>
  );
}
