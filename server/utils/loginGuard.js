const crypto = require('crypto');
const LoginAttempt = require('../models/LoginAttempt');

// Progressive lockout: the first few mistakes are free, then each further failure
// makes the wait longer. Failures 1 to 4 carry no wait; the 5th triggers the first one.
const FREE_ATTEMPTS = 4;
const WAIT_STEPS = [30, 60, 300, 900, 3600]; // seconds: 30s, 1 min, 5 min, 15 min, then 1 hour each time

const keyFor = (email, ip) => crypto.createHash('sha256').update(`${email}|${ip}`).digest('hex');

const waitAfter = failures =>
  (failures <= FREE_ATTEMPTS ? 0 : WAIT_STEPS[Math.min(failures - FREE_ATTEMPTS - 1, WAIT_STEPS.length - 1)]);

/** Seconds left on an active lockout, or 0. */
async function secondsLocked(key) {
  const record = await LoginAttempt.findOne({ key }).lean();
  if (!record?.lockedUntil) return 0;
  return Math.max(0, Math.ceil((new Date(record.lockedUntil).getTime() - Date.now()) / 1000));
}

/** Counts a failed attempt and starts a lockout when it is due. */
async function recordFailure(key) {
  const record = await LoginAttempt.findOneAndUpdate(
    { key },
    { $inc: { failures: 1 }, $set: { lastFailureAt: new Date() } },
    { new: true, upsert: true }
  );
  const wait = waitAfter(record.failures);
  if (wait > 0) await LoginAttempt.updateOne({ key }, { lockedUntil: new Date(Date.now() + wait * 1000) });
  return { wait, attemptsLeft: Math.max(0, FREE_ATTEMPTS + 1 - record.failures) };
}

const clearFailures = key => LoginAttempt.deleteOne({ key });

function describeWait(seconds) {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'}`;
  if (seconds < 3600) { const m = Math.ceil(seconds / 60); return `${m} minute${m === 1 ? '' : 's'}`; }
  const h = Math.ceil(seconds / 3600);
  return `${h} hour${h === 1 ? '' : 's'}`;
}

module.exports = { FREE_ATTEMPTS, WAIT_STEPS, keyFor, waitAfter, secondsLocked, recordFailure, clearFailures, describeWait };
