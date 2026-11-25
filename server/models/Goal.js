const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  targetAmount: { type: Number, required: true, min: 1 },
  savedAmount: { type: Number, default: 0, min: 0 },
  currency: { type: String, required: true, uppercase: true, default: 'INR' },
  targetDate: { type: Date, required: true },
  category: { type: String, trim: true, default: 'General' },
  status: { type: String, enum: ['in-progress', 'completed'], default: 'in-progress' }
}, { timestamps: true });

goalSchema.index({ userId: 1, targetDate: 1 });

module.exports = mongoose.model('Goal', goalSchema);
