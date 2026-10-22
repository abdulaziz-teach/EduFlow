/**
 * Centralized Regex & Search Sanitization Utility
 *
 * Provides safe literal regex creation, metacharacter escaping,
 * and input length validation to prevent ReDoS and RegExp injection.
 */

export const MAX_SEARCH_LENGTH = 100;

/**
 * Escape all 14 standard regular expression metacharacters:
 * . * + ? ^ $ ( ) [ ] { } | \
 *
 * @param {string} str - Raw input string
 * @returns {string} - Escaped string safe for RegExp construction
 */
export function escapeRegex(str = '') {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validate that search query length does not exceed maximum allowable threshold
 *
 * @param {string} str - Input string
 * @param {number} maxLength - Maximum allowable length (default: MAX_SEARCH_LENGTH)
 * @returns {boolean}
 */
export function isSearchLengthValid(str = '', maxLength = MAX_SEARCH_LENGTH) {
  if (typeof str !== 'string') return true;
  return str.length <= maxLength;
}

/**
 * Safely create a case-insensitive literal substring matching RegExp.
 * Guaranteed never to throw SyntaxError and never execute user input as regex syntax.
 *
 * @param {string} str - Raw user input
 * @param {string} flags - RegExp flags (default: 'i')
 * @returns {RegExp|null}
 */
export function createLiteralRegex(str = '', flags = 'i') {
  if (typeof str !== 'string' || !str.trim()) return null;
  const escaped = escapeRegex(str.trim());
  return new RegExp(escaped, flags);
}

export default {
  MAX_SEARCH_LENGTH,
  escapeRegex,
  isSearchLengthValid,
  createLiteralRegex,
};
