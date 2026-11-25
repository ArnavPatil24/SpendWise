const mongoose = require('mongoose');

const recurringRuleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  type: { type: String, enum: ['income', 'expense'], required: true },
  category: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0.01 },
  currency: { type: String, required: true, uppercase: true, default: 'INR' },
  dayOfMonth: { type: Number, required: true, min: 1, max: 31 },
  status: { type: String, enum: ['active', 'paused'], default: 'active' },
  lastExecutedDate: { type: Date, default: null },
  note: { type: String, trim: true, maxlength: 300, default: '' }
}, { timestamps: true });

recurringRuleSchema.index({ userId: 1, dayOfMonth: 1 });

module.exports = mongoose.model('RecurringRule', recurringRuleSchema);
