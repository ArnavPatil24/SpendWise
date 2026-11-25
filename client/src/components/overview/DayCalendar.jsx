import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, ChevronRight as Arrow, Plus, Repeat } from 'lucide-react';
import api, { errorMessage } from '../../api/client';
import SpendHeatmap from '../insights/SpendHeatmap';
import TransactionModal from '../transactions/TransactionModal';
import EmptyState from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { CategoryIcon } from '../ui/CategoryIcon';
import { useFinance } from '../../context/FinanceContext';
import { useToast } from '../../context/ToastContext';
import { useFinanceActions } from '../../hooks/useFinanceActions';
import { useFormat } from '../../hooks/useFormat';
import { monthName, upcomingAll } from '../../utils/format';

const pad = n => String(n).padStart(2, '0');
const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const DAY_LIMIT = 50;

/**
 * Spending calendar plus a panel for whichever day is selected.
 * Days are shaded by spending; picking one shows that day's money in and out,
 * and "Add for this day" opens the form already set to it (handy for logging things late).
 */
export default function DayCalendar() {
  const { version, rules, incomeSources } = useFinance();
  const { saveTransaction } = useFinanceActions();
  const { fmt, fmtDate } = useFormat();
  const toast = useToast();

  const today = new Date();
  const todayKey = keyOf(today);
  const [period, setPeriod] = useState({ month: today.getMonth() + 1, year: today.getFullYear() });
  const [selected, setSelected] = useState(todayKey);
  const [days, setDays] = useState([]);
  const [day, setDay] = useState({ loading: true, transactions: [], totals: { income: 0, expenses: 0 }, total: 0 });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get('/analytics/daily', { params: period })
      .then(res => { if (!cancelled) setDays(res.data.days); })
      .catch(err => { if (!cancelled) toast.error(errorMessage(err, 'Could not load the calendar.')); });
    return () => { cancelled = true; };
  }, [period, version, toast]);

  useEffect(() => {
    let cancelled = false;
    setDay(d => ({ ...d, loading: true }));
    api.get('/transactions', { params: { date: selected, limit: DAY_LIMIT, sort: 'newest' } })
      .then(res => {
        if (!cancelled) setDay({ loading: false, transactions: res.data.transactions, totals: res.data.totals, total: res.data.pagination.total });
      })
      .catch(err => { if (!cancelled) { setDay(d => ({ ...d, loading: false })); toast.error(errorMessage(err, 'Could not load that day.')); } });
    return () => { cancelled = true; };
  }, [selected, version, toast]);

  const isCurrentMonth = period.month === today.getMonth() + 1 && period.year === today.getFullYear();
  const shift = delta => {
    const d = new Date(period.year, period.month - 1 + delta, 1);
    const next = { month: d.getMonth() + 1, year: d.getFullYear() };
    setPeriod(next);
    setSelected(next.month === today.getMonth() + 1 && next.year === today.getFullYear() ? todayKey : `${next.year}-${pad(next.month)}-01`);
  };

  // Scheduled items that have not been recorded yet, for a day later this month.
  const inCurrentMonth = selected.slice(0, 7) === todayKey.slice(0, 7);
  const scheduled = inCurrentMonth && selected > todayKey
    ? upcomingAll(rules, incomeSources, today).filter(r => today.getDate() + r.daysLeft === Number(selected.slice(8)))
    : [];

  const label = new Date(`${selected}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const net = day.totals.income - day.totals.expenses;
  const isFuture = selected > todayKey;

  return (
    <div className="cal-row">
      <section className="panel">
        <div className="panel-head">
          <div><h3>Spending calendar</h3><p>Darker days cost more. Pick a day to see it.</p></div>
        </div>
        <div className="period-bar period-inline">
          <button className="btn-icon" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft size={18} /></button>
          <strong>{monthName(new Date(period.year, period.month - 1, 1))}</strong>
          <button className="btn-icon" onClick={() => shift(1)} aria-label="Next month"><ChevronRight size={18} /></button>
        </div>
        {!isCurrentMonth && (
          <button className="link-btn cal-today" onClick={() => { setPeriod({ month: today.getMonth() + 1, year: today.getFullYear() }); setSelected(todayKey); }}>Back to today</button>
        )}
        <SpendHeatmap year={period.year} month={period.month} days={days} selected={selected} onPick={setSelected} />
      </section>

      <section className="panel day-panel" aria-live="polite">
        <div className="day-head">
          <div>
            <h3>{label}</h3>
            <p>{selected === todayKey ? 'Today' : isFuture ? 'Coming up' : 'Past day'}</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}><Plus size={15} /> Add for this day</button>
        </div>

        <div className="day-summary">
          <div><span>Spent</span><strong className={day.totals.expenses ? 'amount-neg' : ''}>{fmt(day.totals.expenses)}</strong></div>
          <div><span>Earned</span><strong className={day.totals.income ? 'amount-pos' : ''}>{fmt(day.totals.income)}</strong></div>
          <div><span>Net</span><strong className={net < 0 ? 'text-neg' : net > 0 ? 'text-pos' : ''}>{net < 0 ? '−' : ''}{fmt(Math.abs(net))}</strong></div>
        </div>

        {day.loading && day.transactions.length === 0 ? (
          <div className="day-skeleton"><Skeleton height={44} radius={12} /><Skeleton height={44} radius={12} /></div>
        ) : (
          <>
            {scheduled.length > 0 && (
              <ul className="mini-list day-scheduled">
                {scheduled.map(r => (
                  <li key={r._id}>
                    <i className={`mini-icon ${r.type === 'income' ? 'pos' : 'neg'}`}><Repeat size={15} /></i>
                    <div><strong>{r.title}</strong><small>{r.fromIncome ? 'Income, recorded automatically that day' : 'Scheduled, recorded automatically that day'}</small></div>
                    <b className={r.type === 'income' ? 'amount-pos' : 'amount-neg'}>{r.type === 'income' ? '+' : '−'}{fmt(r.amount)}</b>
                  </li>
                ))}
              </ul>
            )}

            {day.transactions.length > 0 ? (
              <ul className="mini-list">
                {day.transactions.map(t => (
                  <li key={t._id}>
                    <i className={`mini-icon ${t.type === 'income' ? 'pos' : 'neg'}`}><CategoryIcon category={t.category} size={16} /></i>
                    <div><strong>{t.title}</strong><small>{t.category}</small></div>
                    <b className={t.type === 'income' ? 'amount-pos' : 'amount-neg'}>{t.type === 'income' ? '+' : '−'}{fmt(t.convertedAmount)}</b>
                  </li>
                ))}
              </ul>
            ) : scheduled.length === 0 && (
              <EmptyState
                compact icon={CalendarDays}
                text={isFuture ? 'Nothing is scheduled for this day.' : `Nothing recorded for ${fmtDate(`${selected}T12:00:00`)}. Forgot to log something? Add it now.`}
              />
            )}

            {day.total > 0 && (
              <Link className="link-btn day-open" to={`/transactions?date=${selected}`}>
                {day.total > DAY_LIMIT ? `Showing ${DAY_LIMIT} of ${day.total}. Open all` : 'Open in Transactions'} <Arrow size={14} />
              </Link>
            )}
          </>
        )}
      </section>

      {adding && <TransactionModal defaultDate={selected} onClose={() => setAdding(false)} onSave={saveTransaction} />}
    </div>
  );
}
