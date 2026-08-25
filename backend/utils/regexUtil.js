/**
 * Safely escapes special regular expression characters in a string
 * Prevents ReDoS and SyntaxError when searching with characters like '+', '(', '[', '*', etc.
 * @param {string} str - Raw input search string
 * @returns {string} - Escaped regex-safe string
 */
export const escapeRegex = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export default escapeRegex;
