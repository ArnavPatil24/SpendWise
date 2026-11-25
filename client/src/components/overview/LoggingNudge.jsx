import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Plus, Upload, X } from 'lucide-react';

const KEY = 'spendwise_nudge_dismissed_on';
const todayKey = () => new Date().toISOString().slice(0, 10);

/**
 * A gentle reminder, not a warning. Entries are often added in batches, so this only appears after a
 * few quiet days, says nothing about how the numbers look, and stays hidden for the rest of the day once dismissed.
 */
export default function LoggingNudge({ lastLoggedAt, hasTransactions, onAdd }) {
  const navigate = useNavigate();
  const [hidden, setHidden] = useState(() => localStorage.getItem(KEY) === todayKey());
  if (hidden || !hasTransactions || !lastLoggedAt) return null;

  const days = Math.floor((Date.now() - new Date(lastLoggedAt).getTime()) / 86400000);
  if (days < 3) return null;

  return (
    <section className="nudge" aria-label="Catch up reminder">
      <i><History size={18} /></i>
      <div>
        <strong>You last added something {days} days ago</strong>
        <span>Catching up keeps your balance and reports accurate. Anything you add can be dated on the day it happened.</span>
      </div>
      <div className="nudge-actions">
        <button className="btn btn-primary btn-sm" onClick={onAdd}><Plus size={14} /> Add now</button>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/transactions?import=1')}><Upload size={14} /> Import a CSV</button>
        <button className="btn-icon" aria-label="Dismiss for today" onClick={() => { localStorage.setItem(KEY, todayKey()); setHidden(true); }}><X size={16} /></button>
      </div>
    </section>
  );
}
