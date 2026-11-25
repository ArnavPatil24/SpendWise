const mongoose = require('mongoose');

// One pending reset per user. Only a SHA-256 hash of the token is stored, so a copy of the
// database cannot be used to reset anyone's password. MongoDB deletes expired records by itself.
const passwordResetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  tokenHash: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } }
});

module.exports = mongoose.model('PasswordReset', passwordResetSchema);
