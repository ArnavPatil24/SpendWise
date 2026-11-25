class AppError extends Error {
  /**
   * @param {string} message  human-readable message
   * @param {number} status   HTTP status code
   * @param {Array}  details  optional per-field validation details
   * @param {object} extra    optional machine-readable fields merged into the JSON body (e.g. { code })
   */
  constructor(message, status = 500, details, extra) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    if (details) this.details = details;
    if (extra) this.extra = extra;
  }
}

module.exports = AppError;
