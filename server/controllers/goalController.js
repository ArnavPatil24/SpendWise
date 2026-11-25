const Goal = require('../models/Goal');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const statusFor = (saved, target) => (saved >= target ? 'completed' : 'in-progress');

exports.list = asyncHandler(async (req, res) => {
  const goals = await Goal.find({ userId: req.userId }).sort({ targetDate: 1 });
  res.json({ goals });
});

exports.create = asyncHandler(async (req, res) => {
  const { title, targetAmount, savedAmount, currency, targetDate, category } = req.body;
  const goal = await Goal.create({
    userId: req.userId,
    title,
    targetAmount,
    savedAmount,
    currency,
    targetDate,
    category,
    status: statusFor(savedAmount, targetAmount)
  });
  res.status(201).json({ goal });
});

exports.update = asyncHandler(async (req, res) => {
  const { title, targetAmount, savedAmount, currency, targetDate, category } = req.body;
  const goal = await Goal.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    { title, targetAmount, savedAmount, currency, targetDate, category, status: statusFor(savedAmount, targetAmount) },
    { new: true, runValidators: true }
  );
  if (!goal) throw new AppError('Goal not found.', 404);
  res.json({ goal });
});

// $inc is atomic, so two deposits made at the same moment can never overwrite each other.
exports.deposit = asyncHandler(async (req, res) => {
  const goal = await Goal.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    { $inc: { savedAmount: req.body.amount } },
    { new: true }
  );
  if (!goal) throw new AppError('Goal not found.', 404);

  const status = statusFor(goal.savedAmount, goal.targetAmount);
  if (goal.status !== status) {
    goal.status = status;
    await goal.save();
  }
  res.json({ goal });
});

exports.remove = asyncHandler(async (req, res) => {
  const goal = await Goal.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!goal) throw new AppError('Goal not found.', 404);
  res.json({ message: 'Savings goal deleted.' });
});
