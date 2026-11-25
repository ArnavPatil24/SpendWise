const mongoose = require('mongoose');

const raiseSchema = new mongoose.Schema({
  amount: { type: Number, required: true, min: 0 },
  from: { type: Date, required: true }
}, { _id: false });

const incomeSourceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 60 },
  kind: { type: String, enum: ['salary', 'business', 'freelance', 'investment', 'other'], required: true },
  // monthly: recorded automatically on payDay. irregular: you log each payment yourself and tag it to this source.
  schedule: { type: String, enum: ['monthly', 'irregular'], required: true },
  category: { type: String, required: true, trim: true, maxlength: 50 },
  currency: { type: String, default: 'INR' },
  payDay: { type: Number, min: 1, max: 31 },
  // Amount history. The amount used for a pay day is the latest entry that starts on or before it,
  // so a raise never rewrites past months.
  raises: { type: [raiseSchema], default: [] },
  status: { type: String, enum: ['active', 'paused'], default: 'active' },
  lastPostedKey: { type: String, default: null }, // 'YYYY-MM' of the last month recorded
  note: { type: String, default: '', maxlength: 300 }
}, { timestamps: true });

module.exports = mongoose.model('IncomeSource', incomeSourceSchema);
