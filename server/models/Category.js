const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 30 },
  nameKey: { type: String, required: true }, // lower-case copy, used to keep names unique per user
  type: { type: String, enum: ['expense', 'income', 'goal'], required: true },
  icon: { type: String, default: 'tag' },
  color: { type: String, default: '#4F6BF0' }
}, { timestamps: true });

categorySchema.index({ userId: 1, nameKey: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
