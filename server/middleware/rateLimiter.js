const rateLimit = require('express-rate-limit');

const make = (options, message) =>
  rateLimit({
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ message }),
    ...options
  });

// Broad protection for every API call. Generous on purpose: one screen load makes a handful
// of requests, and shared networks (a college, an office) can sit behind a single IP.
const apiLimiter = make(
  { windowMs: 15 * 60 * 1000, limit: 1500 },
  'Too many requests. Please wait a few minutes and try again.'
);

// Strict limit on credential endpoints to slow brute-force attacks.
// Successful logins do not count against the limit.
const authLimiter = make(
  { windowMs: 15 * 60 * 1000, limit: 10, skipSuccessfulRequests: true },
  'Too many sign-in attempts. Please try again in 15 minutes.'
);

// Backstop for the login route only. The progressive lockout (utils/loginGuard.js) slows down
// guessing against one account; this catches one network trying many different emails.
// It is set high enough that a real person never meets it.
const loginIpLimiter = make(
  { windowMs: 15 * 60 * 1000, limit: 50, skipSuccessfulRequests: true },
  'Too many failed sign-in attempts from this network. Please try again in 15 minutes.'
);

// Reset emails cost real money and can be used to annoy someone, so they are capped hard per network.
const resetLimiter = make(
  { windowMs: 60 * 60 * 1000, limit: 5 },
  'Too many password reset requests. Please try again in an hour.'
);

module.exports = { apiLimiter, authLimiter, loginIpLimiter, resetLimiter };
