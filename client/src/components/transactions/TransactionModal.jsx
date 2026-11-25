import { useEffect, useRef, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Globe2, History, Sparkles } from 'lucide-react';
import api from '../../api/client';
import ModalShell from '../ui/ModalShell';
import Segmented from '../ui/Segmented';
import CategorySelect from '../categories/CategorySelect';
import { currencies, symbols } from '../../constants';
import { useCategories } from '../../context/CategoryContext';
import { useFinance } from '../../context/FinanceContext';
import { dateInput, money } from '../../utils/format';
import { parseQuickEntry } from '../../utils/quickAdd';
import { useDebounce } from '../../hooks/useDebounce';
import { useFormat } from '../../hooks/useFormat';

export default function TransactionModal({ initial, preset, defaultDate, onClose, onSave }) {
  const { base, fmtDate } = useFormat();
  const { custom, listFor } = useCategories();
  const { incomeSources } = useFinance();
  const editing = Boolean(initial);
  const seed = initial || preset || {}; // a preset fills a NEW entry (for example "add a payment" on an income source)

  const [type, setType] = useState(seed.type || 'expense');
  const [title, setTitle] = useState(seed.title || '');
  const [amount, setAmount] = useState(seed.amount ?? '');
  const [currency, setCurrency] = useState(initial?.currency || base);
  const [rate, setRate] = useState(initial?.exchangeRate ?? 1);
  const [category, setCategory] = useState(seed.category || listFor(seed.type || 'expense')[0]);
  const [sourceId, setSourceId] = useState(seed.sourceId || '');
  const [date, setDate] = useState(initial ? dateInput(initial.date) : defaultDate || dateInput(new Date()));
  const [note, setNote] = useState(initial?.note || '');
  const [busy, setBusy] = useState(false);

  const [quick, setQuick] = useState('');
  const [understood, setUnderstood] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const skipSuggest = useRef(true); // don't pop the list open for text we filled in ourselves
  const debouncedTitle = useDebounce(title, 250);


  // Autofill from history: suggest earlier entries whose title matches what is typed.
  useEffect(() => {
    if (editing || skipSuggest.current || debouncedTitle.trim().length < 2) { setSuggestions([]); return undefined; }
    let cancelled = false;
    api.get('/transactions/suggestions', { params: { q: debouncedTitle.trim() } })
      .then(res => { if (!cancelled) { setSuggestions(res.data.suggestions); setShowSuggestions(true); } })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [debouncedTitle, editing]);

  function changeType(next) {
    setType(next);
    const list = listFor(next);
    if (!list.includes(category)) setCategory(list[0]);
    if (next === 'expense') setSourceId('');
  }

  function onQuickChange(value) {
    setQuick(value);
    const parsed = parseQuickEntry(value, new Date(), custom);
    if (!parsed || !parsed.amount) { setUnderstood(null); return; }
    setUnderstood(parsed);
    skipSuggest.current = true;
    setType(parsed.type);
    setTitle(parsed.title);
    setAmount(parsed.amount);
    setCategory(parsed.category);
    setDate(parsed.date);
    setCurrency(base);
    setRate(1);
  }

  function pickSuggestion(s) {
    skipSuggest.current = true;
    setType(s.type);
    setTitle(s.title);
    setAmount(s.amount);
    setCurrency(s.currency);
    setRate(s.exchangeRate);
    setCategory(s.category);
    setShowSuggestions(false);
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const ok = await onSave({
      type, title: title.trim(), category, amount: Number(amount), currency,
      exchangeRate: Number(rate), date, note: note.trim(), sourceId: type === 'income' && sourceId ? sourceId : null
    }, initial?._id);
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <ModalShell title={editing ? 'Edit transaction' : 'Add a transaction'} subtitle="Record what happened so your totals stay accurate." onClose={onClose}>
      <form className="form" onSubmit={submit}>
        {!editing && (
          <div className="quick-entry">
            <label>
              <span className="quick-label"><Sparkles size={14} /> Quick entry</span>
              <input
                value={quick}
                onChange={e => onQuickChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
                placeholder="Try: coffee 180 yesterday, or salary 50k"
                autoComplete="off"
              />
            </label>
            {understood && (
              <div className="understood" aria-live="polite">
                <span className={`status-pill ${understood.type === 'income' ? 'ok' : 'neutral'}`}>{understood.type === 'income' ? 'Income' : 'Expense'}</span>
                <strong>{understood.title}</strong>
                <span>{money(understood.amount, base)}</span>
                <span>{understood.category}</span>
                <span>{fmtDate(understood.date)}</span>
              </div>
            )}
          </div>
        )}

        <Segmented
          label="Transaction type"
          value={type}
          onChange={changeType}
          options={[
            { value: 'expense', label: <><ArrowUpRight size={15} /> Expense</> },
            { value: 'income', label: <><ArrowDownLeft size={15} /> Income</> }
          ]}
        />

        <label className="suggest-wrap">What was it for?
          <input
            value={title}
            onChange={e => { skipSuggest.current = false; setTitle(e.target.value); }}
            onFocus={() => suggestions.length && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
            placeholder="e.g. Weekly groceries"
            required maxLength={100} autoComplete="off"
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="suggest-list" role="listbox" aria-label="Earlier entries">
              {suggestions.map(s => (
                <li key={s.title}>
                  <button type="button" role="option" onMouseDown={e => { e.preventDefault(); pickSuggestion(s); }}>
                    <History size={14} />
                    <span><strong>{s.title}</strong><small>{s.category}, {s.count} time{s.count === 1 ? '' : 's'}</small></span>
                    <b>{money(s.amount, s.currency)}</b>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </label>

        <div className="form-row">
          <label>Amount
            <input type="number" min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} required />
          </label>
          <label>Currency
            <select value={currency} onChange={e => { setCurrency(e.target.value); setRate(e.target.value === base ? 1 : ''); }}>
              {currencies.map(c => <option key={c} value={c}>{c} ({symbols[c]})</option>)}
            </select>
          </label>
        </div>
        <CategorySelect type={type} value={category} onChange={setCategory} />
        {type === 'income' && incomeSources.length > 0 && (
          <label>Income source <span className="optional">(optional)</span>
            <select value={sourceId} onChange={e => {
              setSourceId(e.target.value);
              const src = incomeSources.find(x => x._id === e.target.value);
              if (src) setCategory(src.category);
            }}>
              <option value="">Not linked to a source</option>
              {incomeSources.map(x => <option key={x._id} value={x._id}>{x.name}</option>)}
            </select>
          </label>
        )}
        <div className="form-row">
          <label>Date
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
          </label>
          <label>Rate to {base}
            <input type="number" min="0.000001" step="any" value={rate} onChange={e => setRate(e.target.value)} required />
            <small>1 {currency} = ? {base}</small>
          </label>
        </div>
        <label>Note <span className="optional">(optional)</span>
          <textarea placeholder="Add a little context" value={note} onChange={e => setNote(e.target.value)} rows={2} maxLength={500} />
        </label>
        {currency !== base && (
          <div className="tip"><Globe2 size={15} /><span>Enter the rate you want to use. Totals are stored in {base} at that rate.</span></div>
        )}
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Add transaction'}</button>
        </div>
      </form>
    </ModalShell>
  );
}
