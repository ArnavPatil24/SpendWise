// Turns "coffee 180 yesterday" or "salary 50k" into transaction fields.
// Everything here is plain string work, so it runs instantly in the browser.

const EXPENSE_RULES = [
  ['Food & dining', /\b(swiggy|zomato|lunch|dinner|breakfast|coffee|cafe|chai|tea|restaurant|pizza|burger|biryani|snacks?|groceries|grocery|vegetables|fruits|milk|food|dominos|mcdonalds?|kfc|starbucks|bigbasket|blinkit|zepto|dining)\b/i],
  ['Transport', /\b(uber|ola|rapido|auto|rickshaw|metro|bus|train|irctc|petrol|diesel|fuel|cab|taxi|parking|toll|fastag)\b/i],
  ['Shopping', /\b(amazon|flipkart|myntra|shopping|clothes|shoes|shirt|dress|mall|meesho|ajio|nykaa)\b/i],
  ['Entertainment', /\b(movie|movies|cinema|pvr|inox|game|gaming|concert|bookmyshow|party|pub)\b/i],
  ['Bills & utilities', /\b(rent|electricity|wifi|broadband|internet|bill|recharge|gas|jio|airtel|postpaid|prepaid|maintenance|emi|insurance)\b/i],
  ['Health', /\b(doctor|medicine|medicines|pharmacy|medical|hospital|gym|clinic|dentist|apollo|medplus|1mg)\b/i],
  ['Education', /\b(fees?|tuition|course|udemy|coursera|books?|exam|stationery|college)\b/i],
  ['Travel', /\b(flight|hotel|trip|vacation|airbnb|makemytrip|goibibo|resort|ticket|visa)\b/i],
  ['Subscriptions', /\b(netflix|spotify|prime|hotstar|subscription|icloud|chatgpt|claude|adobe|disney|zee5|sonyliv|youtube premium)\b/i]
];

const INCOME_RULES = [
  ['Salary', /\b(salary|stipend|payroll|paycheck|wages?)\b/i],
  ['Freelance', /\b(freelance|client|gig|project payment)\b/i],
  ['Business', /\b(business|sales|shop income|profit)\b/i],
  ['Investment', /\b(interest|dividend|dividends|stocks?|mutual fund|sip|returns|investment)\b/i],
  ['Gift', /\b(gift|birthday|diwali|eidi)\b/i]
];

const INCOME_HINT = /\b(salary|stipend|payroll|received|earned|income|refund|bonus|credited|cashback|dividend|interest|freelance|paycheck)\b/i;

const escapeRx = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The user's own category whose name appears in the text, if any. */
function findCustom(text, custom, type) {
  return custom.find(c => (!type || c.type === type) && new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRx(c.name)}($|[^\\p{L}\\p{N}])`, 'iu').test(text));
}

export function guessCategory(text, type = 'expense', custom = []) {
  const own = findCustom(text, custom, type);
  if (own) return own.name;
  const rules = type === 'income' ? INCOME_RULES : EXPENSE_RULES;
  const hit = rules.find(([, rx]) => rx.test(text));
  if (hit) return hit[0];
  return type === 'income' ? 'Other income' : 'Other';
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysAgo = (now, n) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - n);

/** Finds a date phrase, returns { date, matched } or null. */
function extractDate(text, now) {
  let m;
  if ((m = text.match(/\bday before yesterday\b/i))) return { date: daysAgo(now, 2), matched: m[0] };
  if ((m = text.match(/\byesterday\b/i))) return { date: daysAgo(now, 1), matched: m[0] };
  if ((m = text.match(/\btoday\b/i))) return { date: daysAgo(now, 0), matched: m[0] };
  if ((m = text.match(/\b(\d{1,3})\s+days?\s+ago\b/i))) return { date: daysAgo(now, Number(m[1])), matched: m[0] };

  if ((m = text.match(/\b(last|on)?\s*(sun|mon|tue|wed|thu|fri|sat)[a-z]*\b/i))) {
    const target = WEEKDAYS.findIndex(d => d.startsWith(m[2].toLowerCase()));
    let diff = (now.getDay() - target + 7) % 7;
    if (diff === 0 && /last/i.test(m[1] || '')) diff = 7;
    return { date: daysAgo(now, diff), matched: m[0] };
  }

  if ((m = text.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/))) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      let year = m[3] ? Number(m[3]) : now.getFullYear();
      if (year < 100) year += 2000;
      let date = new Date(year, month - 1, day);
      if (!m[3] && date > daysAgo(now, -1)) date = new Date(year - 1, month - 1, day);
      return { date, matched: m[0] };
    }
  }
  return null;
}

/**
 * parseQuickEntry("swiggy 450 yesterday")
 *   → { title: 'Swiggy', amount: 450, type: 'expense', category: 'Food & dining', date: '2026-11-20' }
 * `amount` is null when no number is found, so callers can tell it is not an entry.
 */
export function parseQuickEntry(input, now = new Date(), custom = []) {
  let text = (input || '').trim();
  if (!text) return null;

  const original = text;
  const plus = text.startsWith('+');
  const found = extractDate(text, now);
  if (found) text = text.replace(found.matched, ' ');

  // Pick the amount: a number written with a currency mark wins, otherwise the last number
  // (so "iphone 15 pro 80000" and "2 coffee 180" both read correctly).
  let amount = null;
  const amountRx = /(₹|rs\.?|inr|\$|usd|€|eur|£)?\s*(\d[\d,]*(?:\.\d+)?)\s*(k|lakhs?|lacs?)?\b/gi;
  const matches = [...text.matchAll(amountRx)];
  const am = matches.find(m => m[1]) || matches[matches.length - 1];
  if (am) {
    amount = Number(am[2].replace(/,/g, ''));
    const unit = (am[3] || '').toLowerCase();
    if (unit === 'k') amount *= 1000;
    else if (unit.startsWith('lakh') || unit.startsWith('lac')) amount *= 100000;
    amount = Math.round(amount * 100) / 100;
    text = text.slice(0, am.index) + ' ' + text.slice(am.index + am[0].length);
  }
  if (!(amount > 0)) amount = null;

  // A custom category named in the text decides the type too ("tutoring 2000" can be an income category).
  const named = findCustom(original, custom);
  const type = named ? named.type : plus || INCOME_HINT.test(original) ? 'income' : 'expense';
  const title = text
    .replace(/\b(spent|paid|pay|bought|for|on|at|to|from|of|rs|inr|a|an|the)\b/gi, ' ')
    .replace(/[+₹$€£,:;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const pretty = title ? title.charAt(0).toUpperCase() + title.slice(1) : (type === 'income' ? 'Income' : 'Expense');
  return {
    title: pretty.slice(0, 100),
    amount,
    type,
    category: guessCategory(`${title} ${original}`, type, custom),
    date: iso(found ? found.date : now)
  };
}
