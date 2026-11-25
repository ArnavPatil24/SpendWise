import { symbols } from '../constants';

// INR uses the lakh/crore grouping people expect to read (12,34,567), others use US style.
const LOCALES = { INR: 'en-IN' };
const formatters = new Map();
function formatterFor(currency) {
  if (!formatters.has(currency)) {
    formatters.set(currency, new Intl.NumberFormat(LOCALES[currency] || 'en-US', {
      style: 'currency', currency, maximumFractionDigits: currency === 'JPY' ? 0 : 2
    }));
  }
  return formatters.get(currency);
}

export function money(value, currency = 'INR', compact = false) {
  const num = Number(value || 0);
  const abs = Math.abs(num);
  if (compact && abs >= 1000) {
    const sym = symbols[currency] || currency;
    const sign = num < 0 ? '−' : '';
    if (abs >= 10000000) return `${sign}${sym}${(abs / 10000000).toFixed(2)}Cr`;
    if (abs >= 100000) return `${sign}${sym}${(abs / 100000).toFixed(1)}L`;
    return `${sign}${sym}${(abs / 1000).toFixed(1)}k`;
  }
  return formatterFor(currency).format(num);
}

const pad = n => String(n).padStart(2, '0');

export function formatDate(date, format = 'standard') {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  if (format === 'DD/MM/YYYY') return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  if (format === 'YYYY-MM-DD') return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export const monthName = d => new Date(d).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

export const dateInput = d => {
  const x = new Date(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
};

export const greeting = (date = new Date()) => {
  const h = date.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

/** Percentage change from previous to current, or null when there is no baseline. */
export function percentChange(current, previous) {
  if (!previous) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

/** The day a monthly rule actually fires: day 31 falls back to the last day of shorter months. */
export function effectiveDueDay(rule, date = new Date()) {
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return Math.min(rule.dayOfMonth, daysInMonth);
}

/** Active rules that have not fired yet this month, soonest first. */
export function upcomingRules(rules, date = new Date()) {
  return rules
    .filter(r => r.status === 'active' && effectiveDueDay(r, date) > date.getDate())
    .map(r => ({ ...r, daysLeft: effectiveDueDay(r, date) - date.getDate() }))
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

/** Income sources whose pay day is still to come this month (not yet recorded), as list items. */
export function upcomingIncome(sources, date = new Date()) {
  return sources
    .filter(s => s.schedule === 'monthly' && s.status === 'active' && !s.postedThisMonth && s.dueDay > date.getDate())
    .map(s => ({
      _id: `income-${s._id}`, title: s.name, type: 'income', category: s.category, amount: s.currentAmount,
      dayOfMonth: s.dueDay, daysLeft: s.dueDay - date.getDate(), fromIncome: true
    }));
}

/** Everything still due this month, bills and income together, soonest first. */
export const upcomingAll = (rules, sources, date = new Date()) =>
  [...upcomingRules(rules, date), ...upcomingIncome(sources, date)].sort((a, b) => a.daysLeft - b.daysLeft);
