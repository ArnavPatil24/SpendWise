const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const RecurringRule = require('../models/RecurringRule');
const IncomeSource = require('../models/IncomeSource');
const Goal = require('../models/Goal');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { EXPENSE_CATEGORIES, INCOME_CATEGORIES, GOAL_CATEGORIES, BUILT_IN_BY_TYPE } = require('../constants/categories');

const MAX_CUSTOM = 40;

const countUsage = async (userId, name) => {
  const [transactions, budgets, rules, sources, goals] = await Promise.all([
    Transaction.countDocuments({ userId, category: name }),
    Budget.countDocuments({ userId, category: name }),
    RecurringRule.countDocuments({ userId, category: name }),
    IncomeSource.countDocuments({ userId, category: name }),
    Goal.countDocuments({ userId, category: name })
  ]);
  return { transactions, budgets, rules, sources, goals, total: transactions + budgets + rules + sources + goals };
};

async function assertNameFree(userId, name, type, ignoreId) {
  const key = name.toLowerCase();
  if (BUILT_IN_BY_TYPE[type]?.has(key)) throw new AppError(`“${name}” is already a built-in category.`, 409);
  const clash = await Category.findOne({ userId, nameKey: key }).lean();
  if (clash && String(clash._id) !== String(ignoreId)) throw new AppError('You already have a category with that name.', 409);
}

exports.list = asyncHandler(async (req, res) => {
  const categories = await Category.find({ userId: req.userId }).sort({ type: 1, name: 1 }).lean();
  res.json({ categories });
});

exports.create = asyncHandler(async (req, res) => {
  const { name, type, icon, color } = req.body;
  if ((await Category.countDocuments({ userId: req.userId })) >= MAX_CUSTOM) {
    throw new AppError(`You can have up to ${MAX_CUSTOM} custom categories.`, 400);
  }
  await assertNameFree(req.userId, name, type);
  const category = await Category.create({ userId: req.userId, name, nameKey: name.toLowerCase(), type, icon, color });
  res.status(201).json({ category });
});

// Renaming updates everything that used the old name, so history stays consistent.
exports.update = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ _id: req.params.id, userId: req.userId });
  if (!category) throw new AppError('Category not found.', 404);

  const { name, icon, color } = req.body;
  const oldName = category.name;
  const renamed = name !== undefined && name !== oldName;
  if (renamed) await assertNameFree(req.userId, name, category.type, category._id);

  if (name !== undefined) { category.name = name; category.nameKey = name.toLowerCase(); }
  if (icon !== undefined) category.icon = icon;
  if (color !== undefined) category.color = color;
  await category.save();

  if (renamed) {
    const where = { userId: req.userId, category: oldName };
    await Promise.all([
      Transaction.updateMany(where, { category: name }),
      Budget.updateMany(where, { category: name }),
      RecurringRule.updateMany(where, { category: name }),
      IncomeSource.updateMany(where, { category: name }),
      Goal.updateMany(where, { category: name })
    ]);
  }
  res.json({ category });
});

exports.usage = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ _id: req.params.id, userId: req.userId }).lean();
  if (!category) throw new AppError('Category not found.', 404);
  res.json({ usage: await countUsage(req.userId, category.name) });
});

// A category in use can only be deleted by choosing where its entries move to.
// Budgets for it are removed instead, because a budget is a limit on that one category.
exports.remove = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ _id: req.params.id, userId: req.userId });
  if (!category) throw new AppError('Category not found.', 404);

  const usage = await countUsage(req.userId, category.name);
  const needsTarget = usage.transactions + usage.rules + usage.sources + usage.goals > 0;
  const target = req.query.reassignTo;

  if (needsTarget) {
    if (!target) throw new AppError('Choose a category to move the existing entries to.', 400, undefined, { code: 'REASSIGN_REQUIRED', usage });
    const builtIn = category.type === 'income' ? INCOME_CATEGORIES : category.type === 'goal' ? GOAL_CATEGORIES : EXPENSE_CATEGORIES;
    const custom = await Category.findOne({ userId: req.userId, type: category.type, name: target }).lean();
    if (target === category.name || (!builtIn.includes(target) && !custom)) {
      throw new AppError('That is not a valid category to move entries to.', 400);
    }
    const where = { userId: req.userId, category: category.name };
    await Promise.all([
      Transaction.updateMany(where, { category: target }),
      RecurringRule.updateMany(where, { category: target }),
      IncomeSource.updateMany(where, { category: target }),
      Goal.updateMany(where, { category: target })
    ]);
  }

  const budgets = await Budget.deleteMany({ userId: req.userId, category: category.name });
  await Category.deleteOne({ _id: category._id });
  res.json({
    moved: needsTarget ? { to: target, transactions: usage.transactions, rules: usage.rules, sources: usage.sources, goals: usage.goals } : null,
    budgetsRemoved: budgets.deletedCount
  });
});
