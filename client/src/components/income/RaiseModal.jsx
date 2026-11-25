import { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import ModalShell from '../ui/ModalShell';
import { dateInput } from '../../utils/format';
import { useFormat } from '../../hooks/useFormat';

/** Change what a monthly source pays, from a chosen date. Months already recorded are never touched. */
export default function RaiseModal({ source, onClose, onSave }) {
  const { base, fmt, fmtDate } = useFormat();
  const [amount, setAmount] = useState('');
  const [from, setFrom] = useState(dateInput(new Date()));
  const [busy, setBusy] = useState(false);
  const history = (source.raises || []).filter(r => new Date(r.from).getTime() > 0).sort((a, b) => new Date(b.from) - new Date(a.from));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const ok = await onSave(source._id, { amount: Number(amount), effectiveFrom: from });
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <ModalShell title={`Change ${source.name}`} subtitle={`Currently ${fmt(source.currentAmount)} a month.`} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <div className="form-row">
          <label>New amount per month ({base})
            <input type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
          </label>
          <label>Applies from
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} required />
          </label>
        </div>
        <div className="tip"><TrendingUp size={15} /><span>
          {amount ? `From ${fmtDate(`${from}T12:00:00`)}, each pay day records ${fmt(Number(amount))}.` : 'Pick the new amount and the date it starts.'} Months that are already recorded stay exactly as they are.
        </span></div>
        {history.length > 0 && (
          <ul className="raise-history" aria-label="Earlier changes">
            {history.map(r => <li key={r.from}><span>{fmtDate(r.from)}</span><strong>{fmt(r.amount)}</strong></li>)}
          </ul>
        )}
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy || !amount}>{busy ? 'Saving…' : 'Save new amount'}</button>
        </div>
      </form>
    </ModalShell>
  );
}
