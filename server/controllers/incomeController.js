const mongoose = require('mongoose');
const IncomeSource = require('../models/IncomeSource');
const Transaction = require('../models/Transaction');
const RecurringRule = require('../models/RecurringRule');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { monthContext, shiftMonths } = require('../utils/dates');

const KIND_CATEGORY = { salary: 'Salary', business: 'Business', freelance: 'Freelance', investment: 'Investment', other: 'Other income' };
const CATEGORY_KIND = { Salary: 'salary', Business: 'business', Freelance: 'freelance', Investment: 'investment' };
const EPOCH = new Date(0);

const keyFor = ctx => `${ctx.year}-${String(ctx.month).padStart(2, '0')}`;
const dueDay = (source, ctx) => Math.min(source.payDay, ctx.daysInMonth);
const dueDate = (source, ctx) => new Date(Date.UTC(ctx.year, ctx.month - 1, dueDay(source, ctx)));

/** The amount in force on a date: the latest entry that starts on or before it. */
function amountOn(source, date) {
  let amount = 0;
  [...source.raises].sort((a, b) => new Date(a.from) - new Date(b.from)).forEach(r => {
    if (new Date(r.from) <= date) amount = r.amount;
  });
  return amount;
}

async function recordPay(userId, source, ctx, note) {
  const date = dueDate(source, ctx);
  const amount = amountOn(source, date);
  if (!(amount > 0)) return null;
  return Transaction.create({
    userId, type: 'income', title: source.name, category: source.category, sourceId: source._id,
    amount, currency: source.currency, exchangeRate: 1, convertedAmount: amount, date, note
  });
}

// Records every monthly income that has reached its pay day. Each source is "claimed" atomically
// for the month first, so two requests at once can never record the same pay twice.
async function postDueIncome(userId, ctx) {
  const key = keyFor(ctx);
  const sources = await IncomeSource.find({ userId, status: 'active', schedule: 'monthly' });
  let posted = 0;

  for (const source of sources) {
    if (ctx.day < dueDay(source, ctx) || source.lastPostedKey === key) continue;
    const claimed = await IncomeSource.findOneAndUpdate(
      { _id: source._id, status: 'active', lastPostedKey: { $ne: key } },
      { lastPostedKey: key }
    );
    if (!claimed) continue;
    try {
      await recordPay(userId, source, ctx, 'Recorded automatically on pay day');
      posted += 1;
      source.lastPostedKey = key;
    } catch (error) {
      await IncomeSource.updateOne({ _id: source._id }, { lastPostedKey: claimed.lastPostedKey ?? null }); // put it back so it retries
      throw error;
    }
  }
  return { sources, posted };
}

async function describe(userId, sources, ctx) {
  const received = await Transaction.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), type: 'income', sourceId: { $ne: null }, date: { $gte: ctx.monthStart, $lt: ctx.nextMonth } } },
    { $group: { _id: '$sourceId', total: { $sum: '$convertedAmount' } } }
  ]);
  const receivedMap = new Map(received.map(r => [String(r._id), r.total]));
  const key = keyFor(ctx);

  return sources.map(s => {
    const obj = typeof s.toObject === 'function' ? s.toObject() : s;
    return {
      ...obj,
      currentAmount: amountOn(obj, new Date()),
      dueDay: obj.schedule === 'monthly' ? dueDay(obj, ctx) : null,
      postedThisMonth: obj.lastPostedKey === key,
      receivedThisMonth: receivedMap.get(String(obj._id)) || 0
    };
  });
}

exports.list = asyncHandler(async (req, res) => {
  const ctx = monthContext();
  const { posted } = await postDueIncome(req.userId, ctx);
  const sources = await IncomeSource.find({ userId: req.userId });
  const ordered = [...sources].sort((a, b) => (a.schedule === b.schedule ? a.name.localeCompare(b.name) : a.schedule === 'monthly' ? -1 : 1));
  res.json({ sources: await describe(req.userId, ordered, ctx), postedCount: posted });
});

exports.create = asyncHandler(async (req, res) => {
  const ctx = monthContext();
  const { name, kind, schedule, amount, payDay, recordThisMonth, note } = req.body;
  const category = req.body.category || KIND_CATEGORY[kind];

  const source = new IncomeSource({
    userId: req.userId, name, kind, schedule, category, note,
    payDay: schedule === 'monthly' ? payDay : undefined,
    raises: schedule === 'monthly' ? [{ amount, from: EPOCH }] : []
  });

  // If this month's pay day has already come, the user says whether the money has arrived.
  // "Yes" records it now; "No" waits for next month, so nothing is recorded twice or too early.
  if (schedule === 'monthly' && ctx.day >= dueDay(source, ctx)) {
    source.lastPostedKey = keyFor(ctx);
    await source.save();
    if (recordThisMonth) await recordPay(req.userId, source, ctx, 'Recorded when the source was set up');
  } else {
    await source.save();
  }
  const [described] = await describe(req.userId, [source], ctx);
  res.status(201).json({ source: described });
});

exports.update = asyncHandler(async (req, res) => {
  const ctx = monthContext();
  const source = await IncomeSource.findOne({ _id: req.params.id, userId: req.userId });
  if (!source) throw new AppError('Income source not found.', 404);

  const { name, kind, category, payDay, status, note } = req.body;
  if (name !== undefined) source.name = name;
  if (kind !== undefined) source.kind = kind;
  if (category !== undefined) source.category = category;
  if (note !== undefined) source.note = note;
  if (payDay !== undefined && source.schedule === 'monthly') source.payDay = payDay;

  // Resuming after this month's pay day has passed skips this month rather than back-filling it.
  if (status !== undefined && status !== source.status) {
    source.status = status;
    if (status === 'active' && source.schedule === 'monthly' && ctx.day >= dueDay(source, ctx)) source.lastPostedKey = keyFor(ctx);
  }
  await source.save();
  const [described] = await describe(req.userId, [source], ctx);
  res.json({ source: described });
});

// A pay rise (or cut) from a chosen date. Months already recorded are never rewritten.
exports.raise = asyncHandler(async (req, res) => {
  const ctx = monthContext();
  const source = await IncomeSource.findOne({ _id: req.params.id, userId: req.userId });
  if (!source) throw new AppError('Income source not found.', 404);
  if (source.schedule !== 'monthly') throw new AppError('Only monthly income has a fixed amount to change.', 400);

  const from = new Date(req.body.effectiveFrom);
  const day = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  source.raises = [...source.raises.filter(r => new Date(r.from).getTime() !== day), { amount: req.body.amount, from: new Date(day) }];
  await source.save();
  const [described] = await describe(req.userId, [source], ctx);
  res.json({ source: described });
});

exports.remove = asyncHandler(async (req, res) => {
  const source = await IncomeSource.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!source) throw new AppError('Income source not found.', 404);
  // Past transactions stay in the history; they just stop being tied to a source.
  const unlinked = await Transaction.updateMany({ userId: req.userId, sourceId: source._id }, { sourceId: null });
  res.json({ unlinked: unlinked.modifiedCount });
});

// Moves an old "money in" scheduled rule over to an income source.
exports.fromRule = asyncHandler(async (req, res) => {
  const ctx = monthContext();
  const rule = await RecurringRule.findOne({ _id: req.params.ruleId, userId: req.userId });
  if (!rule || rule.type !== 'income') throw new AppError('Scheduled income not found.', 404);

  const recordedThisMonth = rule.lastExecutedDate && new Date(rule.lastExecutedDate) >= ctx.monthStart;
  const source = await IncomeSource.create({
    userId: req.userId, name: rule.title, kind: CATEGORY_KIND[rule.category] || 'other', schedule: 'monthly',
    category: rule.category, payDay: rule.dayOfMonth, raises: [{ amount: rule.amount, from: EPOCH }],
    status: rule.status === 'paused' ? 'paused' : 'active', note: rule.note || '',
    lastPostedKey: recordedThisMonth || ctx.day >= Math.min(rule.dayOfMonth, ctx.daysInMonth) ? keyFor(ctx) : null
  });
  await RecurringRule.deleteOne({ _id: rule._id });
  const [described] = await describe(req.userId, [source], ctx);
  res.status(201).json({ source: described });
});

// Income by month, split by source, for the Income page chart.
exports.summary = asyncHandler(async (req, res) => {
  const months = req.query.months;
  const ctx = monthContext();
  const start = shiftMonths(ctx.monthStart, -(months - 1));

  const [rows, sources] = await Promise.all([
    Transaction.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.userId), type: 'income', date: { $gte: start } } },
      { $group: { _id: { y: { $year: '$date' }, m: { $month: '$date' }, s: '$sourceId' }, total: { $sum: '$convertedAmount' } } }
    ]),
    IncomeSource.find({ userId: req.userId }).select('name kind').lean()
  ]);

  const kindOf = new Map(sources.map(s => [String(s._id), s.kind]));
  const series = Array.from({ length: months }, (_, i) => {
    const d = shiftMonths(start, i);
    const mine = rows.filter(r => r._id.y === d.getUTCFullYear() && r._id.m === d.getUTCMonth() + 1);
    const bySource = {};
    let salary = 0; let side = 0; let unlinked = 0;
    mine.forEach(r => {
      const id = r._id.s ? String(r._id.s) : 'none';
      bySource[id] = (bySource[id] || 0) + r.total;
      if (id === 'none') unlinked += r.total;
      else if (kindOf.get(id) === 'salary') salary += r.total;
      else side += r.total;
    });
    return {
      month: d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }), year: d.getUTCFullYear(),
      total: salary + side + unlinked, salary, side, unlinked, bySource
    };
  });
  res.json({ months: series, sources: sources.map(s => ({ id: String(s._id), name: s.name, kind: s.kind })) });
});

exports.postDueIncome = postDueIncome;
exports.amountOn = amountOn;
