const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['income', 'expense'], required: true },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  category: { type: String, required: true, trim: true },
  // Set when the money came from one of the user's income sources (see IncomeSource).
  sourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'IncomeSource', default: null, index: true },
  amount: { type: Number, required: true, min: 0.01 },
  currency: { type: String, required: true, uppercase: true, default: 'INR' },
  // User-provided conversion rate from transaction currency to their base currency.
  exchangeRate: { type: Number, required: true, min: 0.000001, default: 1 },
  convertedAmount: { type: Number, required: true, min: 0 },
  date: { type: Date, required: true, default: Date.now },
  note: { type: String, trim: true, maxlength: 500, default: '' }
}, { timestamps: true });

transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, type: 1, date: -1 });
transactionSchema.index({ userId: 1, title: 1 });
transactionSchema.index({ userId: 1, createdAt: -1 });
module.exports = mongoose.model('Transaction', transactionSchema);
