const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 8 },
  baseCurrency: { type: String, default: 'INR', uppercase: true },
  // Sessions issued before this moment are rejected, so a password change or reset signs every other device out.
  passwordChangedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
