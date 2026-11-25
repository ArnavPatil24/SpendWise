// Creates (or refreshes) a demo account full of realistic data.
//
//   npm run seed
//
// Sign in with:  demo@spendwise.app  /  Demo@2026
// Running it again removes the old demo data first, so it is always safe to repeat.
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Category = require('../models/Category');
const IncomeSource = require('../models/IncomeSource');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Goal = require('../models/Goal');
const RecurringRule = require('../models/RecurringRule');
const PasswordReset = require('../models/PasswordReset');
const { buildDemoData } = require('./seedData');

async function main() {
  if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
    throw new Error('Refusing to add demo data while NODE_ENV=production. Add --force if you really mean it.');
  }
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is missing. Set it in server/.env first.');

  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
  const data = buildDemoData();

  const previous = await User.findOne({ email: data.user.email });
  if (previous) {
    const owned = { userId: previous._id };
    await Promise.all([Transaction, Budget, Goal, RecurringRule, IncomeSource, Category, PasswordReset].map(model => model.deleteMany(owned)));
    await User.deleteOne({ _id: previous._id });
  }

  const user = await User.create({
    name: data.user.name, email: data.user.email, baseCurrency: data.user.baseCurrency,
    password: await bcrypt.hash(data.user.password, 12)
  });
  const userId = user._id;

  await Category.insertMany(data.categories.map(c => ({ ...c, userId, nameKey: c.name.toLowerCase() })));

  const sourceIds = {};
  for (const { key, ...fields } of data.sources) {
    const source = await IncomeSource.create({ ...fields, userId });
    sourceIds[key] = source._id;
  }

  await Transaction.insertMany(data.transactions.map(({ sourceKey, ...t }) => ({ ...t, userId, sourceId: sourceKey ? sourceIds[sourceKey] : null })));
  await Budget.insertMany(data.budgets.map(b => ({ ...b, userId })));
  await Goal.insertMany(data.goals.map(g => ({ ...g, userId })));
  await RecurringRule.insertMany(data.rules.map(r => ({ ...r, userId })));

  console.log('\nDemo account ready.\n');
  console.log(`  Email:     ${data.user.email}`);
  console.log(`  Password:  ${data.user.password}\n`);
  console.log(`  ${data.transactions.length} transactions, ${data.sources.length} income sources, ${data.categories.length} custom categories,`);
  console.log(`  ${data.budgets.length} budgets, ${data.goals.length} goals, ${data.rules.length} bills.\n`);
  await mongoose.disconnect();
}

main().catch(async error => {
  console.error(`\nSeed failed: ${error.message}\n`);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
