import { useState } from 'react';
import { Clock } from 'lucide-react';
import ModalShell from '../ui/ModalShell';
import CategorySelect from '../categories/CategorySelect';
import { useCategories } from '../../context/CategoryContext';
import { useFormat } from '../../hooks/useFormat';

export default function RecurringModal({ initial, onClose, onSave }) {
  const { base } = useFormat();
  const { expenseList } = useCategories();
  const [category, setCategory] = useState(initial?.category || expenseList[0]);
  const [day, setDay] = useState(initial?.dayOfMonth || 1);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const p = Object.fromEntries(new FormData(e.currentTarget).entries());
    p.type = 'expense';
    p.category = category;
    p.amount = Number(p.amount);
    p.dayOfMonth = Number(p.dayOfMonth);
    p.currency = base;
    const ok = await onSave(p, initial?._id);
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <ModalShell
      title={initial ? 'Edit scheduled bill' : 'Schedule a bill'}
      subtitle="Rent, bills and subscriptions are recorded automatically on a set day each month. Salary and other income live on the Income page."
      onClose={onClose}
    >
      <form className="form" onSubmit={submit}>
        <label>Title
          <input name="title" placeholder="e.g. Apartment rent" defaultValue={initial?.title || ''} required maxLength={100} />
        </label>
        <div className="form-row">
          <label>Amount ({base})
            <input name="amount" type="number" min="0.01" step="0.01" placeholder="15000" defaultValue={initial?.amount || ''} required />
          </label>
          <label>Day of the month (1–31)
            <input name="dayOfMonth" type="number" min="1" max="31" value={day} onChange={e => setDay(e.target.value)} required />
          </label>
        </div>
        <CategorySelect type="expense" value={category} onChange={setCategory} />
        <label>Note <span className="optional">(optional)</span>
          <textarea name="note" placeholder="e.g. Net banking auto-debit" defaultValue={initial?.note || ''} rows={2} maxLength={300} />
        </label>
        <div className="tip"><Clock size={15} /><span>Recorded on day <strong>{day || '–'}</strong> of every month. Months with fewer days use the last day.</span></div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : initial ? 'Save changes' : 'Schedule'}</button>
        </div>
      </form>
    </ModalShell>
  );
}
