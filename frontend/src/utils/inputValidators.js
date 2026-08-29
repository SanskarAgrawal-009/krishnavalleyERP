/**
 * Universal Input Validators & Strict Sanitizers
 * 
 * Rules enforced across the entire ERP:
 * 1. Alphabet-only fields: Reject digits and special characters (letters and spaces only)
 * 2. Number-only fields: Reject alphabets and symbols (digits only)
 * 3. Phone fields: Digits only with optional leading '+'
 * 4. Pincode: Exactly digits up to 6 characters
 * 5. Govt IDs: Aadhaar (12 digits only), PAN (10-char uppercase alphanumeric)
 * 6. Email: Standard email format verification
 */

/**
 * Allows ONLY alphabetic letters (A-Z, a-z) and spaces.
 * Useful for: Full Name, First Name, Last Name, Father/Spouse Name, City, State, Country.
 */
export const sanitizeAlphabetsOnly = (value) => {
  if (!value) return '';
  // Keep letters, spaces, and standard name punctuation (dots, hyphens)
  return String(value).replace(/[^a-zA-Z\s.'-]/g, '');
};

/**
 * Allows ONLY numeric digits (0-9).
 * Strips all alphabets and special characters.
 */
export const sanitizeDigitsOnly = (value, maxLength = null) => {
  if (!value && value !== 0) return '';
  let digits = String(value).replace(/\D/g, '');
  if (maxLength && digits.length > maxLength) {
    digits = digits.slice(0, maxLength);
  }
  return digits;
};

/**
 * Phone Number Sanitizer:
 * Allows optional leading '+' for country code, then digits only.
 * Strips any letters or spaces. Maximum 13 digits.
 */
export const sanitizePhone = (value) => {
  if (!value) return '';
  const str = String(value).trim();
  const hasPlus = str.startsWith('+');
  let digits = str.replace(/\D/g, '');
  if (digits.length > 13) {
    digits = digits.slice(0, 13);
  }
  return hasPlus ? `+${digits}` : digits;
};

/**
 * Pincode Sanitizer:
 * Exactly up to 6 digits only. Strips all alphabets and symbols.
 */
export const sanitizePincode = (value) => {
  return sanitizeDigitsOnly(value, 6);
};

/**
 * Govt ID Sanitizer based on ID Type:
 * - Aadhaar: Exactly 12 numeric digits only (no alphabets!)
 * - PAN: 10 characters (uppercase alphanumeric)
 * - Passport: 8 characters (uppercase alphanumeric)
 * - Other: uppercase alphanumeric
 */
export const sanitizeGovtId = (value, idType = 'aadhaar') => {
  if (!value) return '';
  const val = String(value).trim();
  
  if (idType === 'aadhaar') {
    // Aadhaar must be strictly numbers only (12 digits)
    return sanitizeDigitsOnly(val, 12);
  }
  
  if (idType === 'pan') {
    // PAN card: 10 chars uppercase alphanumeric
    return val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
  }
  
  if (idType === 'passport') {
    return val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  }

  // Voter ID, Driving License, etc.
  return val.toUpperCase().replace(/[^A-Z0-9\s/-]/g, '').slice(0, 16);
};

/**
 * GST Number Sanitizer:
 * Exactly 15 alphanumeric characters uppercase.
 */
export const sanitizeGst = (value) => {
  if (!value) return '';
  return String(value).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
};

/**
 * Decimal / Amount Sanitizer:
 * Only digits and a single decimal point.
 */
export const sanitizeDecimal = (value) => {
  if (!value && value !== 0) return '';
  let str = String(value).replace(/[^0-9.]/g, '');
  const parts = str.split('.');
  if (parts.length > 2) {
    str = `${parts[0]}.${parts.slice(1).join('')}`;
  }
  return str;
};

/**
 * Email validation check:
 * Returns true if valid email format, or if empty (for optional fields).
 */
export const isValidEmail = (email) => {
  if (!email) return true;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).trim());
};

/**
 * Email Input Sanitizer:
 * Removes spaces and converts to lowercase.
 */
export const sanitizeEmail = (value) => {
  if (!value) return '';
  return String(value).replace(/\s/g, '').toLowerCase();
};
