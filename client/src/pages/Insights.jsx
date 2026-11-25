import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { AlertTriangle, CheckCircle2, Lightbulb, Info } from 'lucide-react';
import SectionTitle from '../components/ui/SectionTitle';
import ChartTooltip from '../components/ui/ChartTooltip';
import ProgressBar from '../components/ui/ProgressBar';
import EmptyState from '../components/ui/EmptyState';
import { PageSkeleton } from '../components/ui/Skeleton';
import HealthScore from '../components/insights/HealthScore';
import { useFinance } from '../context/FinanceContext';
import { useFormat } from '../hooks/useFormat';
import { buildInsightCards } from '../utils/insightText';
import { palette } from '../constants';

const toneIcon = { good: CheckCircle2, warn: AlertTriangle, info: Info };

export default function Insights() {
  const { insights, loading } = useFinance();
  const { fmt, fmtDate } = useFormat();

  if (loading || !insights) return <PageSkeleton />;

  const { score, pace, weekday } = insights;
  const cards = buildInsightCards(insights, fmt, fmtDate);
  const peak = Math.max(...weekday.byDay.map(d => d.average), 0);
  const paceMax = Math.max(pace.reliable ? pace.projected : 0, pace.spent, pace.lastMonth, pace.budgetTotal || 0, 1);

  return (
    <>
      <SectionTitle title="Insights" subtitle="Plain-language takeaways drawn from your own numbers." />

      <div className="grid-2-1">
        <section className="panel">
          <div className="panel-head"><div><h3>Financial health</h3><p>A score out of 100 you can actually act on</p></div></div>
          <HealthScore score={score} />
        </section>

        <section className="panel">
          <div className="panel-head"><div><h3>Month-end pace</h3><p>Day {pace.daysElapsed} of {pace.daysInMonth}</p></div></div>
          <ul className="pace-list">
            <li>
              <div><span>Spent so far</span><strong>{fmt(pace.spent)}</strong></div>
              <ProgressBar value={(pace.spent / paceMax) * 100} tone="brand" height={8} />
            </li>
            {pace.reliable ? (
              <li>
                <div><span>Projected by month end</span><strong>{fmt(pace.projected)}</strong></div>
                <ProgressBar value={(pace.projected / paceMax) * 100} tone="gold" height={8} />
              </li>
            ) : (
              <li><div><span>Projected by month end</span><strong>Day 5+</strong></div><small>Projections start once there is a few days of data.</small></li>
            )}
            <li>
              <div><span>Last month total</span><strong>{fmt(pace.lastMonth)}</strong></div>
              <ProgressBar value={(pace.lastMonth / paceMax) * 100} tone="pos" height={8} />
            </li>
            {pace.budgetTotal && (
              <li>
                <div><span>Combined budgets</span><strong>{fmt(pace.budgetTotal)}</strong></div>
                <ProgressBar value={(pace.budgetTotal / paceMax) * 100} tone="warn" height={8} />
              </li>
            )}
          </ul>
          <small className="pace-note">Daily average: {fmt(pace.dailyAverage)}</small>
        </section>
      </div>

      <section className="panel">
        <div className="panel-head"><div><h3>What stands out</h3><p>Worth a look this month</p></div></div>
        {cards.length ? (
          <div className="insight-grid">
            {cards.map(c => {
              const Icon = toneIcon[c.tone];
              return (
                <article key={c.id} className={`insight-card insight-${c.tone}`}>
                  <i className="insight-icon"><Icon size={17} /></i>
                  <div><strong>{c.title}</strong><p>{c.text}</p></div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState compact icon={Lightbulb} text="Add a few transactions and insights will appear here." />
        )}
      </section>

      <section className="panel">
        <div className="panel-head"><div><h3>Spending by weekday</h3><p>Average spend, last 90 days</p></div></div>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekday.byDay}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'var(--ink-3)', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} width={42} tick={{ fill: 'var(--ink-3)', fontSize: 11 }} tickFormatter={v => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--brand-soft)', opacity: 0.5 }} />
              <Bar name="Average" dataKey="average" radius={[6, 6, 0, 0]}>
                {weekday.byDay.map((d, i) => <Cell key={d.day} fill={d.average === peak && peak > 0 ? palette[2] : palette[0]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </>
  );
}
