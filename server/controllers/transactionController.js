const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const IncomeSource = require('../models/IncomeSource');
const AppError = require('../utils/AppError');
const { DAY_MS, monthStart } = require('../utils/dates');
const asyncHandler = require('../utils/asyncHandler');

const EXPORT_LIMIT = 5000;
const SORTS = {
  newest: { date: -1, createdAt: -1 },
  oldest: { date: 1, createdAt: 1 },
  highest: { convertedAmount: -1, date: -1 },
  lowest: { convertedAmount: 1, date: -1 }
};

const escapeRegex = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const round2 = n => Math.round(n * 100) / 100;

function buildFilter(userId, query) {
  const { type, category, search, month, year, date } = query;
  const filter = { userId: new mongoose.Types.ObjectId(userId) };

  if (type) filter.type = type;
  if (category) filter.category = category;
  if (month && year) {
    filter.date = { $gte: monthStart(year, month), $lt: monthStart(year, month + 1) };
  }
  if (date) {
    // A single calendar day. Dates are stored at UTC midnight, so match the UTC day.
    const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    filter.date = { $gte: day, $lt: new Date(day.getTime() + DAY_MS) };
  }
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ title: rx }, { category: rx }, { note: rx }];
  }
  return filter;
}

function toDoc(body) {
  return {
    type: body.type,
    title: body.title,
    category: body.category,
    sourceId: body.sourceId || null,
    amount: body.amount,
    currency: body.currency,
    exchangeRate: body.exchangeRate,
    convertedAmount: round2(body.amount * body.exchangeRate),
    date: body.date,
    note: body.note
  };
}

// Every income source a request points at must belong to the person making it.
async function assertSourcesOwned(userId, docs) {
  const ids = [...new Set(docs.map(d => d.sourceId).filter(Boolean).map(String))];
  if (!ids.length) return;
  if ((await IncomeSource.countDocuments({ _id: { $in: ids }, userId })) !== ids.length) {
    throw new AppError('That income source was not found.', 400);
  }
}

// GET /api/transactions?page=&limit=&type=&category=&search=&month=&year=&sort=
exports.list = asyncHandler(async (req, res) => {
  const { page, limit, sort } = req.query;
  const filter = buildFilter(req.userId, req.query);

  const [transactions, total, totals] = await Promise.all([
    Transaction.find(filter)
      .sort(SORTS[sort])
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Transaction.countDocuments(filter),
    Transaction.aggregate([
      { $match: filter },
      { $group: { _id: '$type', total: { $sum: '$convertedAmount' } } }
    ])
  ]);

  const sums = Object.fromEntries(totals.map(t => [t._id, t.total]));
  const totalPages = Math.max(1, Math.ceil(total / limit));

  res.json({
    transactions,
    totals: { income: sums.income || 0, expenses: sums.expense || 0 },
    pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 }
  });
});

// GET /api/transactions/export  (same filters, no paging, capped)
exports.exportAll = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.userId, req.query);
  const rows = await Transaction.find(filter).sort(SORTS[req.query.sort]).limit(EXPORT_LIMIT + 1).lean();
  const truncated = rows.length > EXPORT_LIMIT;
  res.json({ transactions: truncated ? rows.slice(0, EXPORT_LIMIT) : rows, truncated, limit: EXPORT_LIMIT });
});

// GET /api/transactions/categories
exports.categories = asyncHandler(async (req, res) => {
  const categories = await Transaction.distinct('category', { userId: req.userId });
  res.json({ categories: categories.sort((a, b) => a.localeCompare(b)) });
});

// Same type, title and amount within a day either side of the date is probably a double entry.
// The client can confirm and resend with ?force=true.
async function findPossibleDuplicate(userId, doc) {
  const center = new Date(doc.date).getTime();
  return Transaction.findOne({
    userId,
    type: doc.type,
    amount: doc.amount,
    title: new RegExp(`^${escapeRegex(doc.title)}$`, 'i'),
    date: { $gte: new Date(center - DAY_MS), $lte: new Date(center + DAY_MS) }
  }).lean();
}

exports.create = asyncHandler(async (req, res) => {
  const doc = toDoc(req.body);
  await assertSourcesOwned(req.userId, [doc]);

  if (!req.query.force) {
    const existing = await findPossibleDuplicate(req.userId, doc);
    if (existing) {
      throw new AppError('This looks like a duplicate of a recent transaction.', 409, undefined, {
        code: 'POSSIBLE_DUPLICATE',
        existing: { title: existing.title, amount: existing.amount, currency: existing.currency, date: existing.date }
      });
    }
  }

  const transaction = await Transaction.create({ userId: req.userId, ...doc });
  res.status(201).json({ transaction });
});

exports.update = asyncHandler(async (req, res) => {
  const doc = toDoc(req.body);
  await assertSourcesOwned(req.userId, [doc]);
  const transaction = await Transaction.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    doc,
    { new: true, runValidators: true }
  );
  if (!transaction) throw new AppError('Transaction not found.', 404);
  res.json({ transaction });
});

exports.remove = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!transaction) throw new AppError('Transaction not found.', 404);
  res.json({ message: 'Transaction deleted.' });
});

// GET /api/transactions/suggestions?q=cof
// Past titles that match what the user is typing, most used first, so a repeat
// entry can be filled in with one tap.
exports.suggestions = asyncHandler(async (req, res) => {
  const q = req.query.q;
  const match = { userId: new mongoose.Types.ObjectId(req.userId) };
  if (q) match.title = new RegExp(escapeRegex(q), 'i');

  const rows = await Transaction.aggregate([
    { $match: match },
    { $sort: { date: -1, createdAt: -1 } },
    {
      $group: {
        _id: { $toLower: '$title' },
        title: { $first: '$title' },
        type: { $first: '$type' },
        category: { $first: '$category' },
        amount: { $first: '$amount' },
        currency: { $first: '$currency' },
        exchangeRate: { $first: '$exchangeRate' },
        count: { $sum: 1 },
        lastDate: { $max: '$date' }
      }
    },
    { $sort: { count: -1, lastDate: -1 } },
    { $limit: 6 },
    { $project: { _id: 0, title: 1, type: 1, category: 1, amount: 1, currency: 1, exchangeRate: 1, count: 1 } }
  ]);

  res.json({ suggestions: rows });
});

// POST /api/transactions/bulk  { transactions: [...], skipDuplicates }
// Used by CSV import and by "Undo" after a delete.
exports.bulkCreate = asyncHandler(async (req, res) => {
  const { transactions, skipDuplicates } = req.body;
  let docs = transactions.map(toDoc);
  await assertSourcesOwned(req.userId, docs);
  let skipped = 0;

  if (skipDuplicates) {
    const times = docs.map(d => new Date(d.date).getTime());
    const existing = await Transaction.find({
      userId: req.userId,
      date: { $gte: new Date(Math.min(...times) - DAY_MS), $lte: new Date(Math.max(...times) + DAY_MS) }
    }).select('type title amount date').lean();

    const dayKey = d => new Date(d).toISOString().slice(0, 10);
    const keyOf = t => `${t.type}|${t.title.trim().toLowerCase()}|${t.amount}|${dayKey(t.date)}`;
    const seen = new Set(existing.map(keyOf));

    docs = docs.filter(d => {
      const key = keyOf(d);
      if (seen.has(key)) { skipped += 1; return false; }
      seen.add(key); // also drops duplicate rows inside the file itself
      return true;
    });
  }

  if (docs.length) {
    await Transaction.insertMany(docs.map(d => ({ userId: req.userId, ...d })), { ordered: false });
  }
  res.status(201).json({ inserted: docs.length, skipped });
});

// POST /api/transactions/bulk-delete  { ids: [...] }
exports.bulkRemove = asyncHandler(async (req, res) => {
  const result = await Transaction.deleteMany({ _id: { $in: req.body.ids }, userId: req.userId });
  res.json({ deleted: result.deletedCount });
});

// PATCH /api/transactions/bulk-category  { ids: [...], category }
exports.bulkCategory = asyncHandler(async (req, res) => {
  const { ids, category } = req.body;
  const result = await Transaction.updateMany({ _id: { $in: ids }, userId: req.userId }, { category });
  res.json({ updated: result.modifiedCount });
});
