const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Goal = require('../models/Goal');
const RecurringRule = require('../models/RecurringRule');
const IncomeSource = require('../models/IncomeSource');
const Category = require('../models/Category');
const PasswordReset = require('../models/PasswordReset');
const mailer = require('../utils/mailer');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const guard = require('../utils/loginGuard');

const BCRYPT_ROUNDS = 12;
const RESET_MINUTES = 30;
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const appUrl = () => (process.env.APP_URL || (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0]).trim().replace(/\/+$/, '');
let dummyHash; // used to keep login timing similar when the email does not exist

const makeToken = userId => jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

const publicUser = user => ({
  id: user._id,
  name: user.name,
  email: user.email,
  baseCurrency: user.baseCurrency,
  createdAt: user.createdAt
});

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, baseCurrency } = req.body;

  if (await User.exists({ email })) {
    throw new AppError('An account with this email already exists.', 409);
  }

  const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await User.create({ name, email, password: hashed, baseCurrency });
  res.status(201).json({ token: makeToken(user._id), user: publicUser(user) });
});

function lockedError(res, seconds) {
  res.set('Retry-After', String(seconds));
  return new AppError(`Too many sign-in attempts. Try again in ${guard.describeWait(seconds)}.`, 429, undefined, {
    code: 'LOGIN_LOCKED',
    retryAfter: seconds
  });
}

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const key = guard.keyFor(email, req.ip);

  // Checked first, so a locked-out client costs us no password hashing at all.
  const locked = await guard.secondsLocked(key);
  if (locked > 0) throw lockedError(res, locked);

  const user = await User.findOne({ email });
  dummyHash ||= bcrypt.hashSync('spendwise-timing-guard', BCRYPT_ROUNDS);
  const valid = await bcrypt.compare(password, user ? user.password : dummyHash);

  if (!user || !valid) {
    // Counted whether or not the email exists, so the lockout reveals nothing about which emails are registered.
    const { wait, attemptsLeft } = await guard.recordFailure(key);
    if (wait > 0) throw lockedError(res, wait);
    const hint = attemptsLeft > 0 && attemptsLeft <= 2
      ? ` ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} left before a short wait.`
      : '';
    throw new AppError(`Email or password is incorrect.${hint}`, 401);
  }

  await guard.clearFailures(key);
  res.json({ token: makeToken(user._id), user: publicUser(user) });
});

exports.me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId).select('-password');
  if (!user) throw new AppError('Account not found.', 404);
  res.json({ user: publicUser(user) });
});

exports.updatePreferences = asyncHandler(async (req, res) => {
  const { baseCurrency } = req.body;
  const user = await User.findById(req.userId);
  if (!user) throw new AppError('Account not found.', 404);

  if (user.baseCurrency !== baseCurrency && (await Transaction.exists({ userId: req.userId }))) {
    throw new AppError(
      'To keep historical totals accurate, choose your base currency before adding transactions. Existing transaction conversions are not automatically recalculated.',
      400
    );
  }

  user.baseCurrency = baseCurrency;
  await user.save();
  res.json({ user: publicUser(user) });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) throw new AppError('Account not found.', 404);

  user.name = req.body.name;
  await user.save();
  res.json({ user: publicUser(user), message: 'Profile updated successfully.' });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.userId);
  if (!user) throw new AppError('Account not found.', 404);

  if (!(await bcrypt.compare(currentPassword, user.password))) {
    throw new AppError('Current password does not match.', 400);
  }

  user.password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  user.passwordChangedAt = new Date(); // signs out every other device
  await user.save();
  // This device gets a fresh token so the person changing the password stays signed in.
  res.json({ message: 'Password changed successfully.', token: makeToken(user._id) });
});

// POST /api/auth/forgot-password
// The reply is identical whether or not the email has an account, so it cannot be used to find out who is registered.
exports.forgotPassword = asyncHandler(async (req, res) => {
  const reply = { message: 'If an account exists for that email, a reset link is on its way. It expires in 30 minutes.' };
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.json(reply);

  const token = crypto.randomBytes(32).toString('hex');
  await PasswordReset.findOneAndUpdate(
    { userId: user._id },
    { tokenHash: sha256(token), expiresAt: new Date(Date.now() + RESET_MINUTES * 60 * 1000) },
    { upsert: true, new: true }
  );

  const link = `${appUrl()}/reset-password?token=${token}`;
  try {
    const { sent } = await mailer.sendMail({
      to: user.email,
      subject: 'Reset your SpendWise password',
      text: `Hi ${user.name},\n\nUse this link to choose a new password. It works once and expires in ${RESET_MINUTES} minutes:\n${link}\n\nIf you did not ask for this, you can ignore this email. Your password has not changed.`,
      html: `<p>Hi ${user.name.replace(/[<>&]/g, '')},</p><p>Use the button below to choose a new password. It works once and expires in ${RESET_MINUTES} minutes.</p><p><a href="${link}" style="background:#2f4bd8;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Choose a new password</a></p><p>If you did not ask for this, you can ignore this email. Your password has not changed.</p>`
    });
    if (!sent) console.log(`[password reset] No email server is configured. Reset link for ${user.email}: ${link}`);
  } catch (error) {
    console.error('Could not send the reset email:', error.message);
    console.log(`[password reset] Reset link for ${user.email}: ${link}`);
  }

  // Demo convenience only: show the link on screen when there is no email server. Never honoured in production.
  if (process.env.RESET_LINK_IN_RESPONSE === 'true' && process.env.NODE_ENV !== 'production') reply.devResetLink = link;
  return res.json(reply);
});

// POST /api/auth/reset-password
// The token is consumed atomically, so a link works exactly once even if it is submitted twice at the same moment.
exports.resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const invalid = () => new AppError('This reset link is invalid or has expired. Please request a new one.', 400);

  const record = await PasswordReset.findOneAndDelete({ tokenHash: sha256(token), expiresAt: { $gt: new Date() } });
  if (!record) throw invalid();

  const user = await User.findById(record.userId);
  if (!user) throw invalid();

  user.password = await bcrypt.hash(password, BCRYPT_ROUNDS);
  user.passwordChangedAt = new Date();
  await user.save();
  res.json({ message: 'Your password has been updated. You can now sign in.' });
});

// DELETE /api/auth/account  { password }
// Removes the account and everything it owns. The user record goes last, so a failure part-way can simply be retried.
exports.deleteAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) throw new AppError('Account not found.', 404);
  if (!(await bcrypt.compare(req.body.password, user.password))) throw new AppError('That password is not correct.', 400);

  const owned = { userId: user._id };
  const [transactions, budgets, goals, rules, sources, categories] = await Promise.all([
    Transaction.deleteMany(owned), Budget.deleteMany(owned), Goal.deleteMany(owned),
    RecurringRule.deleteMany(owned), IncomeSource.deleteMany(owned), Category.deleteMany(owned)
  ]);
  await PasswordReset.deleteMany(owned);
  await User.deleteOne({ _id: user._id });

  res.json({
    message: 'Your account and all of its data have been deleted.',
    deleted: {
      transactions: transactions.deletedCount, budgets: budgets.deletedCount, goals: goals.deletedCount,
      bills: rules.deletedCount, incomeSources: sources.deletedCount, categories: categories.deletedCount
    }
  });
});
