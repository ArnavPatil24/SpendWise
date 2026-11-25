import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { ArrowDownLeft, ArrowUpRight, ChevronRight, PiggyBank, Plus, Repeat, Trophy, Wallet } from 'lucide-react';
import SectionTitle from '../components/ui/SectionTitle';
import AnimatedMoney from '../components/ui/AnimatedMoney';
import Delta from '../components/ui/Delta';
import ProgressBar from '../components/ui/ProgressBar';
import EmptyState from '../components/ui/EmptyState';
import GettingStarted from '../components/ui/GettingStarted';
import { PageSkeleton } from '../components/ui/Skeleton';
import { CategoryIcon, GoalIcon } from '../components/ui/CategoryIcon';
import { HealthRing } from '../components/insights/HealthScore';
import DayCalendar from '../components/overview/DayCalendar';
import LoggingNudge from '../components/overview/LoggingNudge';
import TransactionModal from '../components/transactions/TransactionModal';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { useFinanceActions } from '../hooks/useFinanceActions';
import { useFormat } from '../hooks/useFormat';
import { calculateGoalPlan } from '../utils/goalPlan';
import { greeting, percentChange, upcomingAll } from '../utils/format';

export default function Overview() {
  const { user } = useAuth();
  const { summary, trend, goals, rules, budgets, incomeSources, health, loading } = useFinance();
  const { saveTransaction } = useFinanceActions();
  const { fmt } = useFormat();
  const navigate = useNavigate();
  const [modal, setModal] = useState(false);

  const upcoming = useMemo(() => upcomingAll(rules, incomeSources), [rules, incomeSources]);
  const scheduledIn = upcoming.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0);
  const scheduledOut = upcoming.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
  const projected = summary.totals.balance + scheduledIn - scheduledOut;
  const activeGoals = goals.filter(g => g.status !== 'completed').slice(0, 3);
  const weakest = health ? [...health.score.components].sort((a, b) => a.points / a.max - b.points / b.max)[0] : null;

  if (loading) return <PageSkeleton />;

  const { month, previousMonth } = summary;

  return (
    <>
      <SectionTitle
        title={`${greeting()}, ${user.name.split(' ')[0]}`}
        subtitle="Here is where your money stands today."
        action={<button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={17} /> Add transaction</button>}
      />

      <LoggingNudge lastLoggedAt={summary.lastLoggedAt} hasTransactions={summary.counts.transactions > 0} onAdd={() => setModal(true)} />

      <GettingStarted steps={[
        { id: 'tx', title: 'Add your first transaction', text: 'Type it naturally, like “coffee 180 yesterday”, or import a bank CSV.', done: summary.counts.transactions > 0, cta: 'Add one', run: () => setModal(true) },
        { id: 'income', title: 'Add your salary', text: 'Enter it once and it is recorded every month. Add side income too.', done: incomeSources.length > 0 || rules.some(r => r.type === 'income'), cta: 'Add income', to: '/income' },
        { id: 'budget', title: 'Set a monthly budget', text: 'Choose a limit for a category you want to keep an eye on.', done: budgets.length > 0, cta: 'Open budgets', to: '/budgets' },
        { id: 'goal', title: 'Create a savings goal', text: 'We will work out how much to put aside each month.', done: goals.length > 0, cta: 'New goal', to: '/goals' }
      ]} />

      <section className="hero" aria-label="Net balance and month-end forecast">
        <div className="hero-main">
          <span className="hero-label">Net balance</span>
          <div className="hero-value"><AnimatedMoney value={summary.totals.balance} /></div>
          <div className="hero-sub">
            {month.savings >= 0 ? 'You have saved ' : 'You are down '}
            <strong>{fmt(Math.abs(month.savings))}</strong> so far this month
          </div>
          <div className="hero-spark" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="heroFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E7C36F" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#E7C36F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="net" stroke="#E7C36F" strokeWidth={2} fill="url(#heroFill)" isAnimationActive />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="hero-forecast">
          <h3>Month-end forecast</h3>
          <dl>
            <div><dt>Balance today</dt><dd>{fmt(summary.totals.balance)}</dd></div>
            <div><dt>Still to come in</dt><dd className="pos">+{fmt(scheduledIn)}</dd></div>
            <div><dt>Still to go out</dt><dd className="neg">−{fmt(scheduledOut)}</dd></div>
            <div className="projected"><dt>Projected</dt><dd>{fmt(projected)}</dd></div>
          </dl>
          <small>Based on {upcoming.length} scheduled item{upcoming.length === 1 ? '' : 's'} left this month.</small>
        </div>
      </section>

      <section className="strip" aria-label="This month">
        <div className="strip-item">
          <div className="strip-top"><span>Income</span><i className="strip-icon pos"><ArrowDownLeft size={16} /></i></div>
          <strong><AnimatedMoney value={month.income} /></strong>
          <Delta value={percentChange(month.income, previousMonth.income)} />
        </div>
        <div className="strip-item">
          <div className="strip-top"><span>Expenses</span><i className="strip-icon brand"><ArrowUpRight size={16} /></i></div>
          <strong><AnimatedMoney value={month.expenses} /></strong>
          <Delta value={percentChange(month.expenses, previousMonth.expenses)} goodWhenUp={false} />
        </div>
        <div className="strip-item">
          <div className="strip-top"><span>Savings</span><i className="strip-icon gold"><PiggyBank size={16} /></i></div>
          <strong><AnimatedMoney value={month.savings} /></strong>
          <Delta value={percentChange(month.savings, previousMonth.savings)} />
        </div>
      </section>

      <DayCalendar />

      <div className="grid-2">
        <section className="panel">
          <div className="panel-head">
            <div><h3>Financial health</h3><p>How your money habits are shaping up</p></div>
            <Link className="link-btn" to="/reports">Full report <ChevronRight size={14} /></Link>
          </div>
          {health ? (
            <div className="health-mini">
              <HealthRing score={health.score} size={104} />
              <div>
                <strong>{health.score.grade}</strong>
                {weakest && <p><b>Biggest opportunity:</b> {weakest.label.toLowerCase()}. {weakest.hint}</p>}
              </div>
            </div>
          ) : <EmptyState compact icon={PiggyBank} text="Your score appears once there is some data." />}
        </section>

        <section className="panel">
          <div className="panel-head">
            <div><h3>Savings goals</h3><p>What you are working towards</p></div>
            <Link className="link-btn" to="/goals">All goals <ChevronRight size={14} /></Link>
          </div>
          {activeGoals.length ? (
            <ul className="goal-mini-list">
              {activeGoals.map(g => {
                const pct = Math.min(100, Math.round((g.savedAmount / g.targetAmount) * 100));
                const plan = calculateGoalPlan(g, month.savings);
                return (
                  <li key={g._id}>
                    <i className="mini-icon gold"><GoalIcon category={g.category} size={16} /></i>
                    <div className="goal-mini-body">
                      <div className="goal-mini-top"><strong>{g.title}</strong><span>{pct}%</span></div>
                      <ProgressBar value={pct} tone="gold" height={6} />
                      <small>Save {fmt(plan.monthlyNeeded)} a month, {plan.monthsLeft} month{plan.monthsLeft === 1 ? '' : 's'} left</small>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState compact icon={Trophy} text="Create a savings goal and we will work out the monthly amount."
              action={<button className="btn btn-secondary btn-sm" onClick={() => navigate('/goals')}>Create a goal</button>} />
          )}
        </section>
      </div>

      <div className="grid-2">
        <section className="panel">
          <div className="panel-head">
            <div><h3>Coming up</h3><p>Bills and income still due this month</p></div>
            <Link className="link-btn" to="/scheduled">Bills <ChevronRight size={14} /></Link>
          </div>
          {upcoming.length ? (
            <ul className="mini-list">
              {upcoming.slice(0, 5).map(r => (
                <li key={r._id}>
                  <i className={`mini-icon ${r.type === 'income' ? 'pos' : 'neg'}`}>{r.fromIncome ? <Wallet size={15} /> : <Repeat size={15} />}</i>
                  <div><strong>{r.title}</strong><small>{r.category}, day {r.dayOfMonth}</small></div>
                  <span className={`due ${r.daysLeft <= 3 ? 'soon' : ''}`}>in {r.daysLeft}d</span>
                  <b className={r.type === 'income' ? 'amount-pos' : 'amount-neg'}>{r.type === 'income' ? '+' : '−'}{fmt(r.amount)}</b>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact icon={Repeat} text="Nothing else is due this month." />
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <div><h3>Recent transactions</h3><p>Your latest money movements</p></div>
            <Link className="link-btn" to="/transactions">View all <ChevronRight size={14} /></Link>
          </div>
          {summary.recent.length ? (
            <ul className="mini-list">
              {summary.recent.slice(0, 5).map(t => (
                <li key={t._id}>
                  <i className={`mini-icon ${t.type === 'income' ? 'pos' : 'neg'}`}><CategoryIcon category={t.category} size={16} /></i>
                  <div><strong>{t.title}</strong><small>{t.category}</small></div>
                  <b className={t.type === 'income' ? 'amount-pos' : 'amount-neg'}>{t.type === 'income' ? '+' : '−'}{fmt(t.convertedAmount)}</b>
                </li>
              ))}
            </ul>
          ) : <EmptyState compact icon={Plus} text="No transactions yet. Add your first income or expense to get started." />}
        </section>
      </div>

      {modal && <TransactionModal onClose={() => setModal(false)} onSave={saveTransaction} />}
    </>
  );
}
