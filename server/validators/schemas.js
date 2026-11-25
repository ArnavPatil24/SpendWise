const Joi = require('joi');
const { ICON_KEYS } = require('../constants/categories');

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'JPY', 'CAD', 'AUD', 'SGD'];

// ---------- Reusable field rules ----------
const currency = Joi.string().uppercase().valid(...CURRENCIES).label('Currency');
const amount = Joi.number().positive().precision(2).max(1e12).label('Amount');
const day = label => Joi.date().min('2000-01-01').max('2100-12-31').label(label);
const strongPassword = label => Joi.string().min(8).max(72)
  .pattern(/[A-Za-z]/).pattern(/\d/)
  .messages({ 'string.pattern.base': '{{#label}} must include at least one letter and one number' })
  .label(label);
const category = Joi.string().trim().min(1).max(50).label('Category');
const objectId = Joi.string().hex().length(24);
const note = (max) => Joi.string().trim().allow('').max(max).default('').label('Note');
const month = Joi.number().integer().min(1).max(12).label('Month');
const year = Joi.number().integer().min(2000).max(2100).label('Year');

// ---------- Auth ----------
const register = Joi.object({
  name: Joi.string().trim().min(2).max(80).required().label('Name'),
  email: Joi.string().trim().lowercase().email().max(254).required().label('Email'),
  // bcrypt only uses the first 72 bytes, so longer passwords add no security
  password: strongPassword('Password').required(),
  baseCurrency: currency.default('INR')
});

const login = Joi.object({
  email: Joi.string().trim().lowercase().email().required().label('Email'),
  password: Joi.string().max(72).required().label('Password')
});

const profile = Joi.object({
  name: Joi.string().trim().min(2).max(80).required().label('Name')
});

const changePassword = Joi.object({
  currentPassword: Joi.string().max(72).required().label('Current password'),
  newPassword: strongPassword('New password').required()
});

const preferences = Joi.object({
  baseCurrency: currency.required()
});

const forgotPassword = Joi.object({
  email: Joi.string().trim().lowercase().email().required().label('Email')
});

const resetPassword = Joi.object({
  token: Joi.string().hex().length(64).required().label('Reset link'),
  password: strongPassword('Password').required()
});

const deleteAccount = Joi.object({
  password: Joi.string().max(72).required().label('Password')
});

// ---------- Transactions ----------
const transactionBody = Joi.object({
  type: Joi.string().valid('income', 'expense').required().label('Type'),
  title: Joi.string().trim().min(1).max(100).required().label('Title'),
  category: category.required(),
  sourceId: objectId.allow(null).default(null).label('Income source'),
  amount: amount.required(),
  currency: currency.required(),
  exchangeRate: Joi.number().positive().max(1e9).default(1).label('Exchange rate'),
  date: day('Date').default(() => new Date()),
  note: note(500)
});

const transactionQuery = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  type: Joi.string().valid('income', 'expense'),
  category: Joi.string().trim().max(50),
  search: Joi.string().trim().allow('').max(100),
  month,
  year,
  date: Joi.date().iso().label('Date'),
  sort: Joi.string().valid('newest', 'oldest', 'highest', 'lowest').default('newest')
});

const transactionCreateQuery = Joi.object({ force: Joi.boolean().default(false) });

const transactionBulkCreate = Joi.object({
  transactions: Joi.array().items(transactionBody).min(1).max(500).required().label('Transactions'),
  skipDuplicates: Joi.boolean().default(false)
});

const transactionBulkDelete = Joi.object({
  ids: Joi.array().items(objectId).min(1).max(200).unique().required().label('Selection')
});

const transactionBulkCategory = Joi.object({
  ids: Joi.array().items(objectId).min(1).max(200).unique().required().label('Selection'),
  category: category.required()
});

const suggestionQuery = Joi.object({
  q: Joi.string().trim().allow('').max(60).default('')
});

// ---------- Budgets ----------
const budgetBody = Joi.object({
  category: category.required(),
  amount: amount.required(),
  currency: currency.required(),
  month: month.required(),
  year: year.required()
});

const budgetQuery = Joi.object({ month, year });

const budgetBulk = Joi.object({
  budgets: Joi.array().items(budgetBody).min(1).max(12).required().label('Budgets')
});

// ---------- Goals ----------
const goalBody = Joi.object({
  title: Joi.string().trim().min(1).max(100).required().label('Goal name'),
  targetAmount: Joi.number().min(1).max(1e12).required().label('Target amount'),
  savedAmount: Joi.number().min(0).max(1e12).default(0).label('Saved amount'),
  currency: currency.default('INR'),
  targetDate: day('Target date').required(),
  category: Joi.string().trim().max(50).default('General').label('Category')
});

const goalDeposit = Joi.object({
  amount: amount.required()
});

// ---------- Recurring rules ----------
const recurringBody = Joi.object({
  title: Joi.string().trim().min(1).max(100).required().label('Title'),
  type: Joi.string().valid('income', 'expense').required().label('Type'),
  category: category.required(),
  amount: amount.required(),
  currency: currency.default('INR'),
  dayOfMonth: Joi.number().integer().min(1).max(31).required().label('Day of month'),
  note: note(300)
});

// ---------- Analytics ----------
const trendQuery = Joi.object({
  months: Joi.number().valid(3, 6, 12).default(6)
});

const dailyQuery = Joi.object({ month, year });

// ---------- Custom categories ----------
const categoryName = Joi.string().trim().min(2).max(30)
  .pattern(/^[\p{L}\p{N} &'.+/-]+$/u)
  .messages({ 'string.pattern.base': 'Category names can use letters, numbers, spaces and & \' . + / -' })
  .label('Name');
const hexColor = Joi.string().pattern(/^#[0-9a-fA-F]{6}$/).label('Colour');

const categoryCreate = Joi.object({
  name: categoryName.required(),
  type: Joi.string().valid('expense', 'income').required().label('Type'),
  icon: Joi.string().valid(...ICON_KEYS).default('tag').label('Icon'),
  color: hexColor.default('#4F6BF0')
});
// The type of a category is fixed once created, so it is not accepted here.
const categoryUpdate = Joi.object({
  name: categoryName,
  icon: Joi.string().valid(...ICON_KEYS).label('Icon'),
  color: hexColor
}).min(1);
const categoryDeleteQuery = Joi.object({ reassignTo: Joi.string().trim().max(50) });

// ---------- Income sources ----------
const incomeKinds = ['salary', 'business', 'freelance', 'investment', 'other'];
const incomeCreate = Joi.object({
  name: Joi.string().trim().min(2).max(60).required().label('Name'),
  kind: Joi.string().valid(...incomeKinds).required().label('Kind'),
  schedule: Joi.string().valid('monthly', 'irregular').required().label('Schedule'),
  category: category.optional(),
  amount: Joi.when('schedule', { is: 'monthly', then: amount.required(), otherwise: Joi.any().strip() }),
  payDay: Joi.when('schedule', { is: 'monthly', then: Joi.number().integer().min(1).max(31).required().label('Pay day'), otherwise: Joi.any().strip() }),
  recordThisMonth: Joi.boolean().default(false),
  note: note(300)
});
const incomeUpdate = Joi.object({
  name: Joi.string().trim().min(2).max(60).label('Name'),
  kind: Joi.string().valid(...incomeKinds).label('Kind'),
  category,
  payDay: Joi.number().integer().min(1).max(31).label('Pay day'),
  status: Joi.string().valid('active', 'paused').label('Status'),
  note: Joi.string().trim().allow('').max(300).label('Note')
}).min(1);
const incomeRaise = Joi.object({
  amount: amount.required(),
  effectiveFrom: day('Effective from').required()
});

module.exports = {
  forgotPassword,
  resetPassword,
  deleteAccount,
  categoryCreate,
  categoryUpdate,
  categoryDeleteQuery,
  incomeCreate,
  incomeUpdate,
  incomeRaise,
  CURRENCIES,
  register,
  login,
  profile,
  changePassword,
  preferences,
  transactionBody,
  transactionQuery,
  transactionCreateQuery,
  transactionBulkCreate,
  transactionBulkDelete,
  transactionBulkCategory,
  suggestionQuery,
  budgetBulk,
  dailyQuery,
  budgetBody,
  budgetQuery,
  goalBody,
  goalDeposit,
  recurringBody,
  trendQuery
};
