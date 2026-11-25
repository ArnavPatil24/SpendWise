const jwt = require('jsonwebtoken');
const User = require('../models/User');

function reject(res, message) {
  return res.status(401).json({ message, code: 'AUTH_REQUIRED' });
}

module.exports = async function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return reject(res, 'Please sign in to continue.');

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return reject(res, 'Your session is invalid or expired. Please sign in again.');
  }

  try {
    // One small indexed lookup per request. A token is not enough on its own: the account may have been
    // deleted, or the password changed, since the token was issued.
    const user = await User.findById(decoded.userId).select('passwordChangedAt').lean();
    if (!user) return reject(res, 'This account no longer exists. Please sign in again or create a new one.');
    if (user.passwordChangedAt && decoded.iat < Math.floor(new Date(user.passwordChangedAt).getTime() / 1000)) {
      return reject(res, 'Your password was changed. Please sign in again.');
    }
    req.userId = decoded.userId;
    return next();
  } catch (error) {
    return next(error);
  }
};
