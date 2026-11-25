const RecurringRule = require('../models/RecurringRule');
const Transaction = require('../models/Transaction');
const AppError = require('../utils/AppError');
const { monthContext } = require('../utils/dates');
const asyncHandler = require('../utils/asyncHandler');

// Lists rules and records any that became due this month.
// Each rule is "claimed" atomically so concurrent requests can never post it twice.
exports.list = asyncHandler(async (req, res) => {
  const rules = await RecurringRule.find({ userId: req.userId }).sort({ dayOfMonth: 1 });

  const { now, year, month, day, daysInMonth, monthStart: startOfMonth } = monthContext();
  let autoExecutedCount = 0;

  for (const rule of rules) {
    // A rule set for day 31 still runs in shorter months, on the last day.
    const dueDay = Math.min(rule.dayOfMonth, daysInMonth);
    if (rule.status !== 'active' || day < dueDay) continue;

    const claimed = await RecurringRule.findOneAndUpdate(
      {
        _id: rule._id,
        status: 'active',
        $or: [{ lastExecutedDate: null }, { lastExecutedDate: { $lt: startOfMonth } }]
      },
      { lastExecutedDate: now }
    );
    if (!claimed) continue;

    try {
    await Transaction.create({
      userId: req.userId,
      type: rule.type,
      title: `${rule.title} (Scheduled)`,
      category: rule.category,
      amount: rule.amount,
      currency: rule.currency,
      exchangeRate: 1,
      convertedAmount: rule.amount,
      date: new Date(Date.UTC(year, month - 1, dueDay)),
      note: rule.note ? `${rule.note} · Auto-cut on day ${rule.dayOfMonth}` : `Auto-cut on day ${rule.dayOfMonth}`
    });

    rule.lastExecutedDate = now;
    autoExecutedCount += 1;
    } catch (error) {
      // Put the claim back so the next request retries instead of silently losing this month.
      await RecurringRule.updateOne({ _id: rule._id }, { lastExecutedDate: claimed.lastExecutedDate ?? null });
      throw error;
    }
  }

  res.json({ rules, autoExecutedCount });
});

exports.create = asyncHandler(async (req, res) => {
  const rule = await RecurringRule.create({ userId: req.userId, ...req.body, status: 'active' });
  res.status(201).json({ rule });
});

exports.update = asyncHandler(async (req, res) => {
  const rule = await RecurringRule.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    req.body,
    { new: true, runValidators: true }
  );
  if (!rule) throw new AppError('Recurring rule not found.', 404);
  res.json({ rule });
});

exports.toggle = asyncHandler(async (req, res) => {
  const rule = await RecurringRule.findOne({ _id: req.params.id, userId: req.userId });
  if (!rule) throw new AppError('Recurring rule not found.', 404);

  rule.status = rule.status === 'active' ? 'paused' : 'active';
  await rule.save();
  res.json({ rule });
});

exports.remove = asyncHandler(async (req, res) => {
  const rule = await RecurringRule.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!rule) throw new AppError('Recurring rule not found.', 404);
  res.json({ message: 'Recurring rule deleted.' });
});
