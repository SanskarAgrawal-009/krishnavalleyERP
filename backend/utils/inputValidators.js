/**
 * Server-Side Input Validators & Sanitizers
 * Strict Datatype and Format Validation
 */

export const isAlphabetsOnly = (value) => {
  if (!value) return true;
  // Allows letters, spaces, standard name punctuation
  return /^[a-zA-Z\s.'-]+$/.test(String(value).trim());
};

export const isDigitsOnly = (value) => {
  if (!value) return true;
  return /^\d+$/.test(String(value).trim());
};

export const isValidPhone = (value) => {
  if (!value) return true;
  // Optional leading +, then 7-13 digits
  return /^\+?\d{7,13}$/.test(String(value).trim());
};

export const isValidPincode = (value) => {
  if (!value) return true;
  return /^\d{6}$/.test(String(value).trim());
};

export const isValidEmail = (email) => {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
};

export const isValidGovtId = (idNumber, idType = 'aadhaar') => {
  if (!idNumber) return true;
  const val = String(idNumber).trim();
  if (idType === 'aadhaar') {
    return /^\d{12}$/.test(val);
  }
  if (idType === 'pan') {
    return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(val);
  }
  return val.length >= 4;
};
