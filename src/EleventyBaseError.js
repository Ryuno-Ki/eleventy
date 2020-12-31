/**
 * @module 11ty/eleventy/EleventyBaseError
 */

/**
 * Base Error for all eleventy errors
 */
class EleventyBaseError extends Error {
  /**
   * Extend Error class
   *
   * @param {string} message
   * @param {Error|undefined} originalError
   */
  constructor(message, originalError) {
    super(message);

    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor);

    if (originalError) {
      this.originalError = originalError;
    }
  }
}
module.exports = EleventyBaseError;
