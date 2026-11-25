import { useState } from 'react';
import { Coins } from 'lucide-react';
import ModalShell from '../ui/ModalShell';
import ProgressBar from '../ui/ProgressBar';
import { useFormat } from '../../hooks/useFormat';

export default function DepositModal({ goal, onClose, onDeposit }) {
  const { base, fmt } = useFormat();
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  const value = Number(amount || 0);
  const newTotal = goal.savedAmount + value;
  const newPct = Math.min(100, Math.round((newTotal / goal.targetAmount) * 100));

  async function submit(e) {
    e.preventDefault();
    if (value <= 0) return;
    setBusy(true);
    const ok = await onDeposit(goal._id, value);
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <ModalShell title={`Add funds to ${goal.title}`} subtitle={`${fmt(goal.savedAmount)} saved of ${fmt(goal.targetAmount)}`} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>Amount ({base})
          <input type="number" min="1" step="any" placeholder="e.g. 2000" value={amount} onChange={e => setAmount(e.target.value)} required />
        </label>
        <div className="deposit-preview">
          <div className="deposit-preview-top"><span>Progress after this deposit</span><strong>{newPct}%</strong></div>
          <ProgressBar value={newPct} tone={newPct >= 100 ? 'pos' : 'brand'} />
          {value > 0 && <small><Coins size={13} /> {fmt(newTotal)} of {fmt(goal.targetAmount)}{newPct >= 100 ? '. This completes the goal.' : ''}</small>}
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy || value <= 0}>{busy ? 'Adding…' : 'Add funds'}</button>
        </div>
      </form>
    </ModalShell>
  );
}
