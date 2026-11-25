const mongoose = require('mongoose');
const AppError = require('../utils/AppError');

const JOI_OPTIONS = {
  abortEarly: false,
  stripUnknown: true,
  convert: true,
  errors: { wrap: { label: false } }
};

/**
 * Validates req[source] against a Joi schema.
 * On success the sanitised value replaces the original (unknown keys are stripped).
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const { value, error } = schema.validate(req[source] || {}, JOI_OPTIONS);
    if (error) {
      // For array payloads (bulk import) say which row failed: "Row 3: Amount must be ..."
      const details = error.details.map(d => {
        const row = d.path.find(part => typeof part === 'number');
        return { field: d.path.join('.'), message: row === undefined ? d.message : `Row ${row + 1}: ${d.message}` };
      });
      return next(new AppError(details[0].message, 400, details));
    }
    req[source] = value;
    return next();
  };
}

/** Rejects malformed ObjectIds before they reach Mongoose. */
function validateObjectId(param = 'id') {
  return (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params[param])) {
      return next(new AppError('That record id is not valid.', 400));
    }
    return next();
  };
}

module.exports = { validate, validateObjectId };
