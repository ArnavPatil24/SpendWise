const mongoose = require('mongoose');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { niceRound } = require('../utils/insights');
const { monthContext, monthStart: monthStartOf, shiftMonths } = require('../utils/dates');

exports.list = asyncHandler(async (req, res) => {
  const current = monthContext();
  const month = req.query.month || current.month;
  const year = req.query.year || current.year;
  const start = monthStartOf(year, month);
  const end = monthStartOf(year, month + 1);

  const [budgets, spent] = await Promise.all([
    Budget.find({ userId: req.userId, month, year }).sort({ category: 1 }).lean(),
    Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(req.userId),
          type: 'expense',
          date: { $gte: start, $lt: end }
        }
      },
      { $group: { _id: '$category', total: { $sum: '$convertedAmount' } } }
    ])
  ]);

  const spendMap = Object.fromEntries(spent.map(x => [x._id, x.total]));
  res.json({
    month,
    year,
    budgets: budgets.map(b => ({ ...b, spent: spendMap[b.category] || 0 }))
  });
});

// Creating a budget for a category/month that already exists updates it (upsert).
exports.upsert = asyncHandler(async (req, res) => {
  const { category, amount, currency, month, year } = req.body;
  const budget = await Budget.findOneAndUpdate(
    { userId: req.userId, category, month, year },
    { amount, currency },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
  res.status(201).json({ budget });
});

exports.remove = asyncHandler(async (req, res) => {
  const budget = await Budget.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!budget) throw new AppError('Budget not found.', 404);
  res.json({ message: 'Budget deleted.' });
});

// GET /api/budgets/suggestions
// Averages each category's spending over the last three months (only months that
// have data) and proposes a limit about 5% above it, for categories with no budget yet.
exports.suggestions = asyncHandler(async (req, res) => {
  const { month, year, monthStart } = monthContext();
  const start = shiftMonths(monthStart, -3);
  const end = monthStart;

  const [rows, existing] = await Promise.all([
    Transaction.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.userId), type: 'expense', date: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: { category: '$category', y: { $year: '$date' }, m: { $month: '$date' } },
          total: { $sum: '$convertedAmount' }
        }
      },
      { $group: { _id: '$_id.category', total: { $sum: '$total' }, months: { $sum: 1 } } }
    ]),
    Budget.find({ userId: req.userId, month, year }).select('category').lean()
  ]);

  const taken = new Set(existing.map(b => b.category));
  const suggestions = rows
    .filter(r => !taken.has(r._id))
    .map(r => {
      const average = r.total / r.months;
      return { category: r._id, average: Math.round(average), suggested: niceRound(average * 1.05), months: r.months };
    })
    .filter(r => r.suggested > 0)
    .sort((a, b) => b.average - a.average)
    .slice(0, 8);

  res.json({ month, year, suggestions });
});

// POST /api/budgets/bulk  { budgets: [{ category, amount, currency, month, year }] }
exports.bulkUpsert = asyncHandler(async (req, res) => {
  const ops = req.body.budgets.map(({ category, amount, currency, month, year }) => ({
    updateOne: {
      filter: { userId: new mongoose.Types.ObjectId(req.userId), category, month, year },
      update: { $set: { amount, currency } },
      upsert: true
    }
  }));
  const result = await Budget.bulkWrite(ops, { ordered: false });
  res.status(201).json({ created: result.upsertedCount, updated: result.modifiedCount });
});
