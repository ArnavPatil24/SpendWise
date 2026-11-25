import { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import ModalShell from '../ui/ModalShell';
import Segmented from '../ui/Segmented';
import CategorySelect from '../categories/CategorySelect';
import { useFormat } from '../../hooks/useFormat';

export const KINDS = [
  { value: 'salary', label: 'Salary (a job)', category: 'Salary' },
  { value: 'business', label: 'Side business', category: 'Business' },
  { value: 'freelance', label: 'Freelance work', category: 'Freelance' },
  { value: 'investment', label: 'Investments', category: 'Investment' },
  { value: 'other', label: 'Something else', category: 'Other income' }
];
export const kindLabel = kind => KINDS.find(k => k.value === kind)?.label || 'Income';

export default function IncomeSourceModal({ initial, onClose, onSave }) {
  const { base, fmt } = useFormat();
  const editing = Boolean(initial);
  const [name, setName] = useState(initial?.name || '');
  const [kind, setKind] = useState(initial?.kind || 'salary');
  const [schedule, setSchedule] = useState(initial?.schedule || 'monthly');
  const [amount, setAmount] = useState('');
  const [payDay, setPayDay] = useState(initial?.payDay || 1);
  const [category, setCategory] = useState(initial?.category || 'Salary');
  const [note, setNote] = useState(initial?.note || '');
  const [arrived, setArrived] = useState('yes');
  const [busy, setBusy] = useState(false);

  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  // Setting up after this month's pay day has already come: ask whether the money has arrived.
  const payDayPassed = !editing && schedule === 'monthly' && Number(payDay) >= 1 && today.getDate() >= Math.min(Number(payDay), lastDay);

  function changeKind(next) {
    setKind(next);
    if (!editing) {
      setSchedule(next === 'salary' ? 'monthly' : 'irregular');
      setCategory(KINDS.find(k => k.value === next).category);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const payload = editing
      ? { name: name.trim(), kind, category, note: note.trim(), ...(initial.schedule === 'monthly' ? { payDay: Number(payDay) } : {}) }
      : {
        name: name.trim(), kind, schedule, category, note: note.trim(),
        ...(schedule === 'monthly' ? { amount: Number(amount), payDay: Number(payDay), recordThisMonth: payDayPassed && arrived === 'yes' } : {})
      };
    const ok = await onSave(payload, initial?._id);
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <ModalShell
      title={editing ? 'Edit income source' : 'Add an income source'}
      subtitle={editing ? 'Change the details. Use “Change amount” to update what you earn.' : 'Add your salary once and it is recorded for you every month.'}
      onClose={onClose}
    >
      <form className="form" onSubmit={submit}>
        <label>What is it called?
          <input value={name} onChange={e => setName(e.target.value)} placeholder={kind === 'salary' ? 'e.g. Salary from Acme' : 'e.g. Weekend tutoring'} required minLength={2} maxLength={60} />
        </label>
        <label>Kind
          <select value={kind} onChange={e => changeKind(e.target.value)}>
            {KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
          </select>
        </label>

        {!editing && (
          <div className="picker">
            <span className="picker-label">How does the money come in?</span>
            <Segmented label="Schedule" value={schedule} onChange={setSchedule}
              options={[{ value: 'monthly', label: 'Same amount monthly' }, { value: 'irregular', label: 'Irregular' }]} />
            <small>{schedule === 'monthly' ? 'Recorded automatically on your pay day each month.' : 'You log each payment yourself and link it to this source.'}</small>
          </div>
        )}

        {schedule === 'monthly' && (
          <div className="form-row">
            {editing
              ? <label>Current amount<input value={fmt(initial.currentAmount)} readOnly /></label>
              : <label>Amount per month ({base})<input type="number" min="0.01" step="0.01" placeholder="50000" value={amount} onChange={e => setAmount(e.target.value)} required /></label>}
            <label>Pay day (1 to 31)
              <input type="number" min="1" max="31" value={payDay} onChange={e => setPayDay(e.target.value)} required />
            </label>
          </div>
        )}

        <CategorySelect type="income" value={category} onChange={setCategory} />

        {payDayPassed && (
          <fieldset className="arrived">
            <legend><CalendarClock size={15} /> Your pay day has already passed this month</legend>
            <label className="radio-row"><input type="radio" name="arrived" checked={arrived === 'yes'} onChange={() => setArrived('yes')} />
              <span><strong>Yes, it is already in my account</strong><small>Record this month’s {amount ? fmt(Number(amount)) : 'pay'} now, dated day {Math.min(Number(payDay), lastDay)}.</small></span></label>
            <label className="radio-row"><input type="radio" name="arrived" checked={arrived === 'no'} onChange={() => setArrived('no')} />
              <span><strong>No, start from next month</strong><small>Nothing is recorded for this month.</small></span></label>
          </fieldset>
        )}

        <label>Note <span className="optional">(optional)</span>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} maxLength={300} placeholder="e.g. Take-home after tax" />
        </label>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy || name.trim().length < 2}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Add income source'}</button>
        </div>
      </form>
    </ModalShell>
  );
}
