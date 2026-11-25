import { useState } from 'react';
import { CalendarDays, Coins, PartyPopper, Pencil, Plus, Sparkles, Trash2, Trophy } from 'lucide-react';
import SectionTitle from '../components/ui/SectionTitle';
import EmptyState from '../components/ui/EmptyState';
import ProgressRing from '../components/ui/ProgressRing';
import { PageSkeleton } from '../components/ui/Skeleton';
import { GoalIcon } from '../components/ui/CategoryIcon';
import GoalModal from '../components/goals/GoalModal';
import DepositModal from '../components/goals/DepositModal';
import { useFinance } from '../context/FinanceContext';
import { useFinanceActions } from '../hooks/useFinanceActions';
import { useFormat } from '../hooks/useFormat';
import { calculateGoalPlan } from '../utils/goalPlan';
import { money } from '../utils/format';

export default function Goals() {
  const { goals, summary, loading } = useFinance();
  const { saveGoal, deleteGoal, depositToGoal } = useFinanceActions();
  const { fmt } = useFormat();
  const [modal, setModal] = useState(null); // { kind: 'goal' | 'deposit', goal }

  if (loading) return <PageSkeleton />;

  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  const totalSaved = goals.reduce((s, g) => s + g.savedAmount, 0);
  const done = goals.filter(g => g.status === 'completed').length;

  return (
    <>
      <SectionTitle
        title="Savings goals"
        subtitle="Set a target and a date. We work out what to save each month."
        action={<button className="btn btn-primary" onClick={() => setModal({ kind: 'goal', goal: null })}><Plus size={17} /> New goal</button>}
      />

      <section className="strip" aria-label="Goal totals">
        <div className="strip-item"><div className="strip-top"><span>Total target</span></div><strong>{fmt(totalTarget)}</strong><small className="strip-note">Across {goals.length} goal{goals.length === 1 ? '' : 's'}</small></div>
        <div className="strip-item"><div className="strip-top"><span>Saved so far</span></div><strong className="text-pos">{fmt(totalSaved)}</strong><small className="strip-note">{totalTarget ? `${Math.round((totalSaved / totalTarget) * 100)}% of everything` : 'Start with a first goal'}</small></div>
        <div className="strip-item"><div className="strip-top"><span>Reached</span></div><strong>{done} of {goals.length}</strong><small className="strip-note">{done ? 'Nicely done' : 'None completed yet'}</small></div>
      </section>

      {goals.length ? (
        <div className="card-grid">
          {goals.map(g => {
            const pct = Math.min(100, Math.round((g.savedAmount / g.targetAmount) * 100));
            const isDone = g.status === 'completed';
            const target = new Date(g.targetDate);
            const days = Math.ceil((target - new Date()) / 86400000);
            const plan = calculateGoalPlan(g, summary.month.savings);
            return (
              <article key={g._id} className={`panel goal-card ${isDone ? 'is-done' : ''}`}>
                <div className="card-top">
                  <ProgressRing value={pct} tone={isDone ? 'pos' : 'gold'}><GoalIcon category={g.category} size={20} /></ProgressRing>
                  <span className={`status-pill ${isDone ? 'ok' : 'neutral'}`}>{isDone ? <><PartyPopper size={12} /> Reached</> : `${pct}% saved`}</span>
                </div>
                <h3>{g.title}</h3>
                <span className="muted-small">{g.category}</span>
                <div className="amount-line"><strong>{money(g.savedAmount, g.currency)}</strong><span>of {money(g.targetAmount, g.currency)}</span></div>

                {isDone ? (
                  <div className="plan-box plan-done">You have reached this goal.</div>
                ) : (
                  <div className="plan-box">
                    <div>Save <strong>{fmt(plan.monthlyNeeded)}</strong> a month to finish by {target.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
                    <span className={`feasibility ${plan.feasibility}`}><Sparkles size={12} /> {plan.message}</span>
                  </div>
                )}

                <div className="card-foot">
                  <span className="due-line"><CalendarDays size={14} />{isDone ? 'Completed' : days > 0 ? `${days} days left` : days === 0 ? 'Due today' : `${Math.abs(days)} days overdue`}</span>
                  <div className="row-actions always">
                    {!isDone && <button className="btn btn-primary btn-sm" onClick={() => setModal({ kind: 'deposit', goal: g })}><Coins size={14} /> Add funds</button>}
                    <button className="btn-icon" onClick={() => setModal({ kind: 'goal', goal: g })} aria-label={`Edit ${g.title}`}><Pencil size={15} /></button>
                    <button className="btn-icon btn-icon-danger" onClick={() => deleteGoal(g._id)} aria-label={`Delete ${g.title}`}><Trash2 size={15} /></button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <section className="panel">
          <EmptyState icon={Trophy} title="Set your first goal" text="An emergency fund, a trip or a new laptop. A target makes saving easier to stick with."
            action={<button className="btn btn-primary" onClick={() => setModal({ kind: 'goal', goal: null })}><Plus size={16} /> Create a goal</button>} />
        </section>
      )}

      {modal?.kind === 'goal' && <GoalModal initial={modal.goal} onClose={() => setModal(null)} onSave={saveGoal} />}
      {modal?.kind === 'deposit' && <DepositModal goal={modal.goal} onClose={() => setModal(null)} onDeposit={depositToGoal} />}
    </>
  );
}
