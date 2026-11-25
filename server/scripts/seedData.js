// Builds a realistic demo account as plain objects. It never touches the database, so it is easy to test;
// seed.js is what writes it. Everything is dated relative to "today", so the demo always looks current,
// and the same day always produces exactly the same data.

const DEMO = { name: 'Arnav Demo', email: 'demo@spendwise.app', password: 'Demo@2026', baseCurrency: 'INR' };

const DAY = 86400000;
const utc = (y, m, d) => new Date(Date.UTC(y, m, d));

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildDemoData(now = new Date()) {
  const rng = mulberry32(20261125);
  const between = (lo, hi) => lo + rng() * (hi - lo);
  const pick = list => list[Math.floor(rng() * list.length)];
  const chance = p => rng() < p;

  const today = utc(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const start = utc(today.getUTCFullYear(), today.getUTCMonth() - 3, 1);           // about three and a half months of history
  const monthKey = d => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  const daysAgo = n => new Date(today.getTime() - n * DAY);

  const categories = [
    { name: 'Pets', type: 'expense', icon: 'paw-print', color: '#E4647C' },
    { name: 'Gym', type: 'expense', icon: 'dumbbell', color: '#5BA85B' },
    { name: 'Tutoring', type: 'income', icon: 'graduation-cap', color: '#8A6CE0' }
  ];

  // ---- income sources
  const raiseFrom = utc(today.getUTCFullYear(), today.getUTCMonth() - 1, 1);       // a raise took effect last month
  const sources = [
    {
      key: 'salary', name: 'Salary from Acme Tech', kind: 'salary', schedule: 'monthly', category: 'Salary', payDay: 1,
      raises: [{ amount: 60000, from: new Date(0) }, { amount: 65000, from: raiseFrom }],
      status: 'active', lastPostedKey: monthKey(today), note: 'Take-home after tax'
    },
    { key: 'tutoring', name: 'Weekend tutoring', kind: 'freelance', schedule: 'irregular', category: 'Tutoring', raises: [], status: 'active', lastPostedKey: null, note: '' },
    { key: 'design', name: 'Freelance design', kind: 'freelance', schedule: 'irregular', category: 'Freelance', raises: [], status: 'active', lastPostedKey: null, note: 'Logo and poster work' }
  ];

  const transactions = [];
  const add = (date, type, title, category, amount, extra = {}) => {
    if (date > today || date < start) return;
    transactions.push({ type, title, category, amount, currency: 'INR', exchangeRate: 1, convertedAmount: amount, date, note: '', ...extra });
  };

  // ---- monthly salary, at the amount in force on each pay day
  for (let m = 0; m <= 3; m += 1) {
    const payDate = utc(today.getUTCFullYear(), today.getUTCMonth() - 3 + m, 1);
    const amount = payDate >= raiseFrom ? 65000 : 60000;
    add(payDate, 'income', 'Salary from Acme Tech', 'Salary', amount, { sourceKey: 'salary', note: 'Recorded automatically on pay day' });
  }

  // ---- side income
  for (let d = 88; d >= 0; d -= Math.round(between(6, 10))) add(daysAgo(d), 'income', 'Weekend tutoring', 'Tutoring', Math.round(between(3000, 4500) / 100) * 100, { sourceKey: 'tutoring' });
  [[80, 12000, 'Logo design'], [45, 8500, 'Poster set'], [12, 15000, 'Website banners']].forEach(([n, amt, title]) => add(daysAgo(n), 'income', title, 'Freelance', amt, { sourceKey: 'design' }));
  add(daysAgo(62), 'income', 'Birthday gift received', 'Gift', 2000);
  add(daysAgo(25), 'income', 'Mutual fund dividend', 'Investment', 1450);

  // ---- everyday spending, day by day
  for (let t = start.getTime(); t <= today.getTime(); t += DAY) {
    const date = new Date(t);
    const dow = date.getUTCDay();
    const weekend = dow === 0 || dow === 6;
    const dom = date.getUTCDate();
    const food = (title, lo, hi) => add(date, 'expense', title, 'Food & dining', Math.round(between(lo, hi)));

    if (!weekend && chance(0.5)) food(pick(['Chai & snacks', 'Cafe coffee', 'Breakfast']), 60, 220);
    if (!weekend && chance(0.75)) food(pick(['Office lunch', 'Thali', 'Biryani', 'Salad bowl']), 120, 320);
    if (chance(weekend ? 0.7 : 0.4)) food(pick(['Swiggy dinner', 'Zomato order', 'Dominos pizza', 'Dinner out']), 250, 700);
    if (weekend && chance(0.5)) add(date, 'expense', pick(['Groceries', 'Vegetables & fruits', 'BigBasket order']), 'Food & dining', Math.round(between(600, 1800) / 10) * 10);

    if (!weekend && chance(0.6)) add(date, 'expense', pick(['Metro', 'Auto ride', 'Uber to office', 'Ola cab']), 'Transport', Math.round(between(40, 350)));
    if (dom % 10 === 0) add(date, 'expense', 'Petrol', 'Transport', Math.round(between(500, 900) / 10) * 10);

    if (chance(0.06)) add(date, 'expense', pick(['Amazon order', 'Myntra clothes', 'Flipkart order', 'Stationery']), 'Shopping', Math.round(between(300, 3500)));
    if (weekend && chance(0.3)) add(date, 'expense', pick(['Movie tickets', 'Gaming credits', 'Bowling night']), 'Entertainment', Math.round(between(250, 1200)));
    if (chance(0.03)) add(date, 'expense', pick(['Pharmacy', 'Doctor consultation', 'Vitamins']), 'Health', Math.round(between(200, 1500) * 2) / 2);

    if (dom === 3) add(date, 'expense', 'Gym membership', 'Gym', 1500);
    if (dom === 7) add(date, 'expense', 'Dog food', 'Pets', Math.round(between(1200, 1600) / 10) * 10);
    if (dom === 21) add(date, 'expense', 'Vet visit', 'Pets', Math.round(between(700, 1200) / 10) * 10);
  }

  // ---- a few memorable one-offs
  add(daysAgo(47), 'expense', 'Flight to Goa', 'Travel', 7800, { note: 'Return tickets' });
  add(daysAgo(46), 'expense', 'Hotel in Goa', 'Travel', 9500);
  add(daysAgo(45), 'expense', 'Goa food & fun', 'Travel', 3200);
  add(daysAgo(30), 'expense', 'Noise cancelling headphones', 'Shopping', 8999, { note: 'Birthday treat' });
  add(daysAgo(55), 'expense', 'Udemy course: React', 'Education', 649);

  // ---- bills that record themselves each month
  const rules = [
    { title: 'Apartment rent', category: 'Bills & utilities', amount: 18000, dayOfMonth: 5 },
    { title: 'Wi-Fi broadband', category: 'Bills & utilities', amount: 799, dayOfMonth: 8 },
    { title: 'Netflix', category: 'Subscriptions', amount: 649, dayOfMonth: 12 }
  ].map(rule => ({ ...rule, type: 'expense', currency: 'INR', status: 'active', note: '', lastExecutedDate: null }));

  rules.forEach(rule => {
    for (let m = 0; m <= 3; m += 1) {
      const date = utc(today.getUTCFullYear(), today.getUTCMonth() - 3 + m, rule.dayOfMonth);
      if (date <= today) {
        add(date, 'expense', `${rule.title} (Scheduled)`, rule.category, rule.amount, { note: `Auto-cut on day ${rule.dayOfMonth}` });
        rule.lastExecutedDate = date;
      }
    }
  });

  // ---- budgets for the current month, goals
  const month = today.getUTCMonth() + 1;
  const year = today.getUTCFullYear();
  const budgets = [
    ['Food & dining', 15000], ['Transport', 5000], ['Shopping', 3000], ['Entertainment', 2500], ['Pets', 2500]
  ].map(([category, amount]) => ({ category, amount, currency: 'INR', month, year }));

  const goals = [
    { title: 'Emergency fund', category: 'Emergency Fund', targetAmount: 150000, savedAmount: 62000, currency: 'INR', targetDate: utc(today.getUTCFullYear(), today.getUTCMonth() + 10, 1), status: 'in-progress' },
    { title: 'New laptop', category: 'Tech & Gadgets', targetAmount: 85000, savedAmount: 31500, currency: 'INR', targetDate: utc(today.getUTCFullYear(), today.getUTCMonth() + 5, 1), status: 'in-progress' },
    { title: 'Goa trip', category: 'Travel & Vacation', targetAmount: 40000, savedAmount: 40000, currency: 'INR', targetDate: daysAgo(40), status: 'completed' }
  ];

  transactions.sort((a, b) => a.date - b.date);
  return { user: DEMO, categories, sources, transactions, budgets, goals, rules };
}

module.exports = { DEMO, buildDemoData };
