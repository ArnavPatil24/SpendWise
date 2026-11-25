// Express 4 does not catch rejected promises from async handlers.
// Wrapping every handler guarantees errors reach the central error middleware.
module.exports = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
