const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Goal = require('../models/Goal');
const { monthContext, monthStart: monthStartOf, shiftMonths } = require('../utils/dates');
const { computeHealthScore } = require('../utils/insights');
const asyncHandler = require('../utils/asyncHandler');

const totalsByType = rows => {
  const map = Object.fromEntries(rows.map(r => [r._id, r.total]));
  return { income: map.income || 0, expenses: map.expense || 0 };
};

// GET /api/analytics/summary  — everything the dashboard header needs in one call
exports.summary = asyncHandler(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.userId);
  const { monthStart, nextMonth, prevStart: prevMonthStart } = monthContext();
  const sumByType = match => [{ $match: match }, { $group: { _id: '$type', total: { $sum: '$convertedAmount' } } }];

  const [all, current, previous, categories, recent, count, lastEntered] = await Promise.all([
    Transaction.aggregate(sumByType({ userId })),
    Transaction.aggregate(sumByType({ userId, date: { $gte: monthStart, $lt: nextMonth } })),
    Transaction.aggregate(sumByType({ userId, date: { $gte: prevMonthStart, $lt: monthStart } })),
    Transaction.aggregate([
      { $match: { userId, type: 'expense', date: { $gte: monthStart, $lt: nextMonth } } },
      { $group: { _id: '$category', total: { $sum: '$convertedAmount' } } },
      { $sort: { total: -1 } }
    ]),
    Transaction.find({ userId }).sort({ date: -1, createdAt: -1 }).limit(6).lean(),
    Transaction.countDocuments({ userId }),
    Transaction.findOne({ userId }).sort({ createdAt: -1 }).select('createdAt').lean()
  ]);

  const total = totalsByType(all);
  const cur = totalsByType(current);
  const prev = totalsByType(previous);

  res.json({
    totals: { income: total.income, expenses: total.expenses, balance: total.income - total.expenses },
    month: { income: cur.income, expenses: cur.expenses, savings: cur.income - cur.expenses },
    previousMonth: { income: prev.income, expenses: prev.expenses, savings: prev.income - prev.expenses },
    categories,
    recent,
    counts: { transactions: count },
    lastLoggedAt: lastEntered ? lastEntered.createdAt : null
  });
});

// GET /api/analytics/monthly?year=2026  — month-by-month rows for one calendar year
exports.monthly = asyncHandler(async (req, res) => {
  const year = Number(req.query.year) || monthContext().year;
  const rows = await Transaction.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(req.userId),
        date: { $gte: monthStartOf(year, 1), $lt: monthStartOf(year + 1, 1) }
      }
    },
    { $group: { _id: { month: { $month: '$date' }, type: '$type' }, total: { $sum: '$convertedAmount' } } },
    { $sort: { '_id.month': 1 } }
  ]);
  res.json({ rows });
});

// GET /api/analytics/trend?months=6  — income vs expenses for the last N months, zero-filled
exports.trend = asyncHandler(async (req, res) => {
  const months = req.query.months;
  const start = shiftMonths(monthContext().monthStart, -(months - 1));

  const rows = await Transaction.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(req.userId), date: { $gte: start } } },
    {
      $group: {
        _id: { year: { $year: '$date' }, month: { $month: '$date' }, type: '$type' },
        total: { $sum: '$convertedAmount' }
      }
    }
  ]);

  const lookup = new Map(rows.map(r => [`${r._id.year}-${r._id.month}-${r._id.type}`, r.total]));
  const trend = Array.from({ length: months }, (_, i) => {
    const d = shiftMonths(start, i);
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`;
    const income = lookup.get(`${key}-income`) || 0;
    const expenses = lookup.get(`${key}-expense`) || 0;
    return {
      month: d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
      year: d.getUTCFullYear(),
      income,
      expenses,
      net: income - expenses
    };
  });

  res.json({ trend });
});

// GET /api/analytics/daily?month=11&year=2026  — per-day totals for the spending calendar
exports.daily = asyncHandler(async (req, res) => {
  const current = monthContext();
  const month = req.query.month || current.month;
  const year = req.query.year || current.year;
  const start = monthStartOf(year, month);
  const end = monthStartOf(year, month + 1);

  const rows = await Transaction.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(req.userId), date: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        expenses: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$convertedAmount', 0] } },
        income: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$convertedAmount', 0] } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, date: '$_id', expenses: 1, income: 1, count: 1 } }
  ]);

  res.json({ month, year, days: rows });
});

const sumsByType = (userId, start, end) => Transaction.aggregate([
  { $match: { userId, date: { $gte: start, $lt: end } } },
  { $group: { _id: '$type', total: { $sum: '$convertedAmount' } } }
]);
const byCategory = (userId, type, start, end) => Transaction.aggregate([
  { $match: { userId, type, date: { $gte: start, $lt: end } } },
  { $group: { _id: '$category', total: { $sum: '$convertedAmount' } } },
  { $sort: { total: -1 } }
]);

// GET /api/analytics/report?month=11&year=2026
// Everything the Reports page shows for one month, plus the month before it for comparison.
exports.report = asyncHandler(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.userId);
  const current = monthContext();
  const month = req.query.month || current.month;
  const year = req.query.year || current.year;
  const start = monthStartOf(year, month);
  const end = monthStartOf(year, month + 1);
  const prevStart = monthStartOf(year, month - 1);

  const [cur, prev, expenseCats, prevExpenseCats, incomeCats, count] = await Promise.all([
    sumsByType(userId, start, end),
    sumsByType(userId, prevStart, start),
    byCategory(userId, 'expense', start, end),
    byCategory(userId, 'expense', prevStart, start),
    byCategory(userId, 'income', start, end),
    Transaction.countDocuments({ userId, date: { $gte: start, $lt: end } })
  ]);

  const now = totalsByType(cur);
  const before = totalsByType(prev);
  const prevMap = new Map(prevExpenseCats.map(c => [c._id, c.total]));
  const savings = now.income - now.expenses;

  res.json({
    month,
    year,
    // Only a finished month is compared with the one before it; a month in progress would look
    // unfairly low next to a full one, especially when entries are logged in batches.
    complete: year * 12 + month < current.year * 12 + current.month,
    totals: {
      income: now.income,
      expenses: now.expenses,
      savings,
      savingsRate: now.income > 0 ? Math.round((savings / now.income) * 100) : null,
      count
    },
    previous: { income: before.income, expenses: before.expenses },
    expenseCategories: expenseCats.map(c => ({ category: c._id, total: c.total, previous: prevMap.get(c._id) || 0 })),
    incomeBreakdown: incomeCats.map(c => ({ category: c._id, total: c.total }))
  });
});

// GET /api/analytics/health
// Scored on up to the last three COMPLETED months, so an unlogged week this month cannot distort it.
// A brand-new account with no finished month yet is scored on the current month so far.
exports.health = asyncHandler(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.userId);
  const { month, year, monthStart, nextMonth } = monthContext();
  const windowStart = shiftMonths(monthStart, -3);

  const [past, spentRows, budgets, goals, thisMonth] = await Promise.all([
    Transaction.aggregate([
      { $match: { userId, date: { $gte: windowStart, $lt: monthStart } } },
      { $group: { _id: { y: { $year: '$date' }, m: { $month: '$date' }, type: '$type' }, total: { $sum: '$convertedAmount' } } }
    ]),
    byCategory(userId, 'expense', monthStart, nextMonth),
    Budget.find({ userId, month, year }).lean(),
    Goal.find({ userId }).lean(),
    sumsByType(userId, monthStart, nextMonth)
  ]);

  const monthsWithData = new Set(past.map(r => `${r._id.y}-${r._id.m}`)).size;
  let income;
  let expenses;
  let basis;
  if (monthsWithData > 0) {
    income = past.filter(r => r._id.type === 'income').reduce((s, r) => s + r.total, 0);
    expenses = past.filter(r => r._id.type === 'expense').reduce((s, r) => s + r.total, 0);
    basis = { kind: 'completed', months: monthsWithData };
  } else {
    ({ income, expenses } = totalsByType(thisMonth));
    basis = { kind: 'current', months: 0 };
  }

  const spent = new Map(spentRows.map(c => [c._id, c.total]));
  const budgetRows = budgets.map(b => ({ amount: b.amount, spent: spent.get(b.category) || 0 }));
  res.json({ score: computeHealthScore({ income, expenses, budgets: budgetRows, goals }), basis });
});
