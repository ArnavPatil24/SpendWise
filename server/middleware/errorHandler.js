const AppError = require('../utils/AppError');

function notFound(req, res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

// Central error handler: every thrown or rejected error ends up here.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Something went wrong on the server.';

  if (err.name === 'CastError') {
    status = 400;
    message = `Invalid value for ${err.path}.`;
  } else if (err.name === 'ValidationError' && err.errors) {
    status = 400;
    message = Object.values(err.errors)[0]?.message || 'Validation failed.';
  } else if (err.code === 11000) {
    status = 409;
    message = 'That record already exists.';
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Your session is invalid or expired. Please sign in again.';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'The request body is not valid JSON.';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'The request body is too large.';
  } else if (typeof err.message === 'string' && err.message.startsWith('CORS blocked')) {
    status = 403;
  }

  if (status >= 500) {
    console.error(err);
    if (process.env.NODE_ENV === 'production') message = 'Something went wrong on the server.';
  }

  const body = { message };
  if (err.details && status < 500) body.errors = err.details;
  if (err.extra && status < 500) Object.assign(body, err.extra);
  res.status(status).json(body);
}

module.exports = { notFound, errorHandler };
