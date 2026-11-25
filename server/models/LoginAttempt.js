const mongoose = require('mongoose');

// One record per (email + network address). The key is a SHA-256 hash, so neither the
// email nor the IP address is stored in readable form.
const loginAttemptSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  failures: { type: Number, default: 0 },
  lockedUntil: { type: Date, default: null },
  // MongoDB removes the record 24 hours after the last failed attempt,
  // which is what resets the escalation for someone who stops trying.
  lastFailureAt: { type: Date, default: Date.now, expires: 86400 }
});

module.exports = mongoose.model('LoginAttempt', loginAttemptSchema);
