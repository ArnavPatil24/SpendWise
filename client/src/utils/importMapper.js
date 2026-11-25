import { guessCategory } from './quickAdd';

const PATTERNS = {
  date: /^(date|txn date|transaction date|value date|posting date|posted( date)?)$/i,
  title: /(description|narration|particulars|merchant|payee|title|details|name)/i,
  amount: /^(amount|amt|transaction amount|value)$/i,
  debit: /(debit|withdraw|\bdr\b|paid out|money out)/i,
  credit: /(credit|deposit|\bcr\b|paid in|money in)/i,
  type: /^(type|dr\/cr|cr\/dr|transaction type|txn type)$/i,
  category: /category/i,
  note: /(remarks?|note|memo|reference|ref)/i
};

/** Guesses which column holds what, from the header row. -1 means "not found". */
export function detectColumns(headers) {
  const used = new Set();
  const find = key => {
    const i = headers.findIndex((h, idx) => !used.has(idx) && PATTERNS[key].test(h.trim()));
    if (i >= 0) used.add(i);
    return i;
  };
  const mapping = {};
  ['date', 'type', 'category', 'amount', 'debit', 'credit', 'title', 'note'].forEach(key => { mapping[key] = find(key); });
  return mapping;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const pad = n => String(n).padStart(2, '0');

/** 'DMY' (day first) or 'MDY', guessed from the data. Defaults to day first. */
export function detectDateOrder(samples) {
  for (const s of samples) {
    const m = String(s).trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-]\d{2,4}/);
    if (!m) continue;
    if (Number(m[1]) > 12) return 'DMY';
    if (Number(m[2]) > 12) return 'MDY';
  }
  return 'DMY';
}

/** Returns 'YYYY-MM-DD' or null. */
export function parseDate(value, order = 'DMY') {
  const s = String(value || '').trim();
  if (!s) return null;
  let y; let mo; let d; let m;

  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/))) { [y, mo, d] = [m[1], m[2], m[3]]; }
  else if ((m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/))) {
    [d, mo, y] = order === 'MDY' ? [m[2], m[1], m[3]] : [m[1], m[2], m[3]];
    if (y.length === 2) y = `20${y}`;
  } else if ((m = s.match(/^(\d{1,2})[\s-]([A-Za-z]{3})[a-z]*[\s,-]+(\d{2,4})/))) {
    [d, mo, y] = [m[1], MONTHS.indexOf(m[2].toLowerCase()) + 1, m[3]];
    if (String(y).length === 2) y = `20${y}`;
  } else if ((m = s.match(/^([A-Za-z]{3})[a-z]*\s+(\d{1,2}),?\s+(\d{4})/))) {
    [mo, d, y] = [MONTHS.indexOf(m[1].toLowerCase()) + 1, m[2], m[3]];
  } else return null;

  const [Y, M, D] = [Number(y), Number(mo), Number(d)];
  const check = new Date(Y, M - 1, D);
  if (!Y || M < 1 || M > 12 || D < 1 || check.getMonth() !== M - 1) return null;
  return `${Y}-${pad(M)}-${pad(D)}`;
}

/**
 * "₹1,234.50", "1.234,56" (European), "(450.00)", "-45", "450 Dr" → number.
 * Negative for brackets, a leading minus or a trailing Dr. NaN when unreadable.
 */
export function parseAmount(value) {
  let s = String(value ?? '').trim();
  if (!s) return NaN;
  let sign = 1;
  if (/^\(.*\)$/.test(s) || /\bdr\.?$/i.test(s)) sign = -1;
  s = s.replace(/\b(cr|dr)\.?$/i, '').replace(/[()]/g, '');
  if (/^-/.test(s.trim())) sign = -1;

  s = s.replace(/[^\d.,]/g, '');
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > lastDot) {
    // The comma comes last: it is the decimal mark when 1 or 2 digits follow it ("1.234,56", "12,5"),
    // otherwise it is a thousands separator ("1,234").
    const decimals = s.length - lastComma - 1;
    s = decimals <= 2 ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else {
    s = s.replace(/,/g, '');
  }

  const n = Number(s);
  return Number.isFinite(n) && n !== 0 ? sign * n : NaN;
}

const cell = (row, i) => (i >= 0 && i < row.length ? String(row[i]).trim() : '');

/**
 * Converts parsed CSV rows into transactions the API accepts.
 * direction: 'auto' | 'expense' | 'income'. Auto reads signs when the file has both signs
 * (positive = money in), otherwise treats every row as an expense.
 */
export function buildTransactions(dataRows, mapping, { direction = 'auto', dateOrder = 'DMY', currency = 'INR', customCategories = [] } = {}) {
  const valid = [];
  const invalid = [];
  const splitColumns = mapping.debit >= 0 || mapping.credit >= 0;

  const signed = dataRows
    .filter(() => !splitColumns && mapping.amount >= 0)
    .map(r => parseAmount(cell(r, mapping.amount)));
  const hasBoth = signed.some(n => n > 0) && signed.some(n => n < 0);

  dataRows.forEach((row, index) => {
    const line = index + 2; // header is line 1
    const date = parseDate(cell(row, mapping.date), dateOrder);
    if (!date) return invalid.push({ line, reason: 'Unreadable date' });

    let type;
    let amount;
    if (splitColumns) {
      const debit = parseAmount(cell(row, mapping.debit));
      const credit = parseAmount(cell(row, mapping.credit));
      if (Number.isFinite(debit)) { type = 'expense'; amount = Math.abs(debit); }
      else if (Number.isFinite(credit)) { type = 'income'; amount = Math.abs(credit); }
    } else {
      const value = parseAmount(cell(row, mapping.amount));
      if (Number.isFinite(value)) {
        amount = Math.abs(value);
        const typeText = cell(row, mapping.type);
        if (typeText) type = /^(cr|credit|income|deposit|received)\b/i.test(typeText) ? 'income' : 'expense';
        else if (direction === 'income') type = 'income';
        else if (direction === 'expense') type = 'expense';
        else type = hasBoth && value > 0 ? 'income' : 'expense';
      }
    }
    if (!amount) return invalid.push({ line, reason: 'Missing or zero amount' });

    const title = (cell(row, mapping.title) || 'Imported transaction').slice(0, 100);
    const category = (cell(row, mapping.category) || guessCategory(title, type, customCategories)).slice(0, 50);
    valid.push({
      type, title, category, amount, currency, exchangeRate: 1, date,
      note: cell(row, mapping.note).slice(0, 500)
    });
  });

  return { valid, invalid };
}

export const SAMPLE_CSV = `Date,Description,Amount
2026-11-01,Salary credited,50000
2026-11-02,Swiggy dinner,-450
2026-11-03,Uber to office,-210
2026-11-05,Netflix subscription,-649
2026-11-07,Electricity bill,-1830
2026-11-09,Amazon shopping,-2399
2026-11-12,Freelance project payment,12000
2026-11-14,Pharmacy,-380
`;
