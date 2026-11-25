import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import ModalShell from '../ui/ModalShell';
import { goalCategories } from '../../constants';
import { dateInput } from '../../utils/format';
import { useFormat } from '../../hooks/useFormat';

export default function GoalModal({ initial, onClose, onSave }) {
  const { base } = useFormat();
  const [busy, setBusy] = useState(false);
  const defaultDate = new Date();
  defaultDate.setMonth(defaultDate.getMonth() + 3);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const p = Object.fromEntries(new FormData(e.currentTarget).entries());
    p.targetAmount = Number(p.targetAmount);
    p.savedAmount = Number(p.savedAmount || 0);
    p.currency = base;
    const ok = await onSave(p, initial?._id);
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <ModalShell title={initial ? 'Edit savings goal' : 'Create a savings goal'} subtitle="Pick a target and a date. We work out the monthly amount." onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>Goal name
          <input name="title" placeholder="e.g. Emergency fund or new laptop" defaultValue={initial?.title || ''} required maxLength={100} />
        </label>
        <div className="form-row">
          <label>Target amount ({base})
            <input name="targetAmount" type="number" min="1" step="any" placeholder="50000" defaultValue={initial?.targetAmount || ''} required />
          </label>
          <label>Already saved
            <input name="savedAmount" type="number" min="0" step="any" placeholder="0" defaultValue={initial?.savedAmount || 0} />
          </label>
        </div>
        <div className="form-row">
          <label>Category
            <select name="category" defaultValue={initial?.category || goalCategories[0]}>
              {goalCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label>Target date
            <input name="targetDate" type="date" defaultValue={dateInput(initial ? initial.targetDate : defaultDate)} required />
          </label>
        </div>
        <div className="tip"><Sparkles size={15} /><span>The target date sets how much you need to save each month.</span></div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : initial ? 'Save changes' : 'Create goal'}</button>
        </div>
      </form>
    </ModalShell>
  );
}
