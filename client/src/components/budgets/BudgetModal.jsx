import { useState } from 'react';
import { Target } from 'lucide-react';
import ModalShell from '../ui/ModalShell';
import CategorySelect from '../categories/CategorySelect';
import { useCategories } from '../../context/CategoryContext';
import { useFormat } from '../../hooks/useFormat';

export default function BudgetModal({ defaultMonth, defaultYear, onClose, onSave }) {
  const { base } = useFormat();
  const { expenseList } = useCategories();
  const [category, setCategory] = useState(expenseList[0]);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const p = Object.fromEntries(new FormData(e.currentTarget).entries());
    p.category = category;
    p.amount = Number(p.amount);
    p.month = Number(p.month);
    p.year = Number(p.year);
    const ok = await onSave(p);
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <ModalShell title="Create a budget" subtitle="Set a monthly limit for one spending category." onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <CategorySelect type="expense" value={category} onChange={setCategory} />
        <div className="form-row">
          <label>Monthly limit
            <input name="amount" type="number" min="0.01" step="0.01" placeholder="5000" required />
          </label>
          <label>Currency
            <input value={base} readOnly />
            <input type="hidden" name="currency" value={base} />
          </label>
        </div>
        <div className="form-row">
          <label>Month
            <select name="month" defaultValue={defaultMonth}>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{new Date(2025, i, 1).toLocaleDateString('en-US', { month: 'long' })}</option>
              ))}
            </select>
          </label>
          <label>Year
            <input name="year" type="number" defaultValue={defaultYear} min="2020" max="2100" required />
          </label>
        </div>
        <div className="tip"><Target size={15} /><span>Saving a budget for a category and month that already has one replaces its limit.</span></div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save budget'}</button>
        </div>
      </form>
    </ModalShell>
  );
}
