import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowLeftRight, Gauge, PiggyBank, TrendingDown, TrendingUp } from 'lucide-react';
import SectionTitle from '../components/ui/SectionTitle';
import Segmented from '../components/ui/Segmented';
import ProgressBar from '../components/ui/ProgressBar';
import EmptyState from '../components/ui/EmptyState';
import ChartTooltip from '../components/ui/ChartTooltip';
import AnimatedMoney from '../components/ui/AnimatedMoney';
import Delta from '../components/ui/Delta';
import { PageSkeleton } from '../components/ui/Skeleton';
import { useFinance } from '../context/FinanceContext';
import { useFormat } from '../hooks/useFormat';
import { chartColors, palette } from '../constants';
import { percentChange } from '../utils/format';

const rangeOptions = [{ value: 3, label: '3M' }, { value: 6, label: '6M' }, { value: 12, label: '12M' }];

export default function Analytics() {
  const { summary, trend, trendMonths, changeTrendMonths, loading } = useFinance();
  const { fmt } = useFormat();

  const categories = useMemo(() => summary.categories.map(c => ({ name: c._id, value: c.total })), [summary.categories]);
  if (loading) return <PageSkeleton />;

  const { month, previousMonth } = summary;
  const savingsRate = month.income ? Math.round(((month.income - month.expenses) / month.income) * 100) : null;
  const max = Math.max(1, ...categories.map(c => c.value));
  const monthsWithSpend = trend.filter(t => t.expenses > 0);
  const avgSpend = monthsWithSpend.length ? monthsWithSpend.reduce((s, t) => s + t.expenses, 0) / monthsWithSpend.length : 0;
  const top = categories[0];

  return (
    <>
      <SectionTitle title="Analytics" subtitle="Spot patterns in how you earn, spend and save." />

      <section className="strip strip-4" aria-label="This month">
        <div className="strip-item">
          <div className="strip-top"><span>Income</span><i className="strip-icon pos"><TrendingUp size={16} /></i></div>
          <strong><AnimatedMoney value={month.income} /></strong>
          <Delta value={percentChange(month.income, previousMonth.income)} />
        </div>
        <div className="strip-item">
          <div className="strip-top"><span>Expenses</span><i className="strip-icon brand"><TrendingDown size={16} /></i></div>
          <strong><AnimatedMoney value={month.expenses} /></strong>
          <Delta value={percentChange(month.expenses, previousMonth.expenses)} goodWhenUp={false} />
        </div>
        <div className="strip-item">
          <div className="strip-top"><span>Savings rate</span><i className="strip-icon gold"><Gauge size={16} /></i></div>
          <strong>{savingsRate === null ? '–' : `${savingsRate}%`}</strong>
          <small className="strip-note">Share of income you kept</small>
        </div>
        <div className="strip-item">
          <div className="strip-top"><span>Transactions</span><i className="strip-icon neutral"><ArrowLeftRight size={16} /></i></div>
          <strong>{summary.counts.transactions}</strong>
          <small className="strip-note">All time</small>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div><h3>Income vs expenses</h3><p>{avgSpend ? `You spend about ${fmt(avgSpend)} in an average month` : 'Month by month comparison'}</p></div>
          <Segmented size="sm" label="Chart range" value={trendMonths} onChange={changeTrendMonths} options={rangeOptions} />
        </div>
        <div className="legend">
          <span><i style={{ background: chartColors.income }} /> Income</span>
          <span><i style={{ background: chartColors.expenses }} /> Expenses</span>
        </div>
        <div className="chart-box tall">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend} barGap={6}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--ink-3)', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} width={42} tick={{ fill: 'var(--ink-3)', fontSize: 11 }} tickFormatter={v => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--brand-soft)', opacity: 0.5 }} />
              <Bar name="Income" dataKey="income" fill={chartColors.income} radius={[6, 6, 0, 0]} />
              <Bar name="Expenses" dataKey="expenses" fill={chartColors.expenses} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div><h3>Spending by category</h3><p>{top ? `${top.name} is your biggest category this month` : 'This month, highest first'}</p></div>
        </div>
        {categories.length ? (
          <ul className="bar-list">
            {categories.map((c, i) => (
              <li key={c.name}>
                <div className="bar-list-top"><span><i style={{ background: palette[i % palette.length] }} />{c.name}</span><strong>{fmt(c.value)}</strong></div>
                <ProgressBar value={(c.value / max) * 100} height={7} color={palette[i % palette.length]} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState compact icon={PiggyBank} text="Add expenses to unlock category insights." />
        )}
      </section>
    </>
  );
}
