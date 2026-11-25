import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Pause, Pencil, Play, Plus, Repeat, Trash2 } from 'lucide-react';
import SectionTitle from '../components/ui/SectionTitle';
import EmptyState from '../components/ui/EmptyState';
import { PageSkeleton } from '../components/ui/Skeleton';
import RecurringModal from '../components/recurring/RecurringModal';
import { useFinance } from '../context/FinanceContext';
import { useFinanceActions } from '../hooks/useFinanceActions';
import { useFormat } from '../hooks/useFormat';

/** Bills and subscriptions that record themselves each month. Money coming in lives on the Income page. */
export default function Scheduled() {
  const { rules, loading } = useFinance();
  const { saveRule, deleteRule, toggleRule } = useFinanceActions();
  const { fmt } = useFormat();
  const [modal, setModal] = useState(null);

  if (loading) return <PageSkeleton />;

  const bills = rules.filter(r => r.type !== 'income');
  const movedIncome = rules.length - bills.length;
  const active = bills.filter(r => r.status === 'active');
  const outgoing = active.reduce((s, r) => s + r.amount, 0);

  return (
    <>
      <SectionTitle
        title="Bills and subscriptions"
        subtitle="Rent, bills and subscriptions that record themselves on a set day each month."
        action={<button className="btn btn-primary" onClick={() => setModal({ initial: null })}><Plus size={17} /> Schedule a bill</button>}
      />

      {movedIncome > 0 && (
        <div className="tip tip-block">
          <Repeat size={15} />
          <span>You have {movedIncome} scheduled income item{movedIncome === 1 ? '' : 's'}. Income now lives on the <Link className="link-btn inline-link" to="/income">Income page</Link>, where you can move {movedIncome === 1 ? 'it' : 'them'}.</span>
        </div>
      )}

      <section className="strip" aria-label="Bill totals">
        <div className="strip-item"><div className="strip-top"><span>Money out each month</span></div><strong className="text-neg">−{fmt(outgoing)}</strong><small className="strip-note">Across {active.length} active bill{active.length === 1 ? '' : 's'}</small></div>
        <div className="strip-item"><div className="strip-top"><span>Active</span></div><strong>{active.length} of {bills.length}</strong><small className="strip-note">Recorded automatically</small></div>
        <div className="strip-item"><div className="strip-top"><span>Paused</span></div><strong>{bills.length - active.length}</strong><small className="strip-note">Not recorded until resumed</small></div>
      </section>

      {bills.length ? (
        <div className="card-grid">
          {bills.map(rule => {
            const paused = rule.status === 'paused';
            return (
              <article key={rule._id} className={`panel rule-card ${paused ? 'is-paused' : ''}`}>
                <div className="card-top">
                  <span className="status-pill neutral">Bill</span>
                  {paused && <span className="status-pill warn"><Pause size={12} /> Paused</span>}
                </div>
                <h3>{rule.title}</h3>
                <span className="muted-small">{rule.category}</span>
                <div className="day-chip"><Clock size={13} /> Day <strong>{rule.dayOfMonth}</strong> of every month</div>
                <div className="amount-line push-down"><strong className="text-neg">−{fmt(rule.amount)}</strong><span>per month</span></div>
                {rule.note && <p className="rule-note">{rule.note}</p>}
                <div className="card-foot">
                  <button className="btn btn-secondary btn-sm" onClick={() => toggleRule(rule._id)}>
                    {paused ? <><Play size={13} /> Resume</> : <><Pause size={13} /> Pause</>}
                  </button>
                  <div className="row-actions always">
                    <button className="btn-icon" onClick={() => setModal({ initial: rule })} aria-label={`Edit ${rule.title}`}><Pencil size={15} /></button>
                    <button className="btn-icon btn-icon-danger" onClick={() => deleteRule(rule._id)} aria-label={`Delete ${rule.title}`}><Trash2 size={15} /></button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <section className="panel">
          <EmptyState icon={Repeat} title="No bills scheduled yet"
            text="Add rent on the 5th or a subscription and it is recorded for you every month."
            action={<button className="btn btn-primary" onClick={() => setModal({ initial: null })}><Plus size={16} /> Schedule a bill</button>} />
        </section>
      )}

      {modal && <RecurringModal initial={modal.initial} onClose={() => setModal(null)} onSave={saveRule} />}
    </>
  );
}
