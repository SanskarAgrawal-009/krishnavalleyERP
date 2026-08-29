/**
 * Phone Number Validation and Normalization Utilities
 * Enforces business rule: Primary mobile number and alternate mobile number cannot be the same.
 */

export const normalizePhoneNumber = (phone) => {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';
  // For standard 10-digit Indian phone numbers (handles +91, 0, or raw 10-digit)
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
};

export const arePhoneNumbersSame = (phone1, phone2) => {
  if (!phone1 || !phone2) return false;
  const p1 = normalizePhoneNumber(phone1);
  const p2 = normalizePhoneNumber(phone2);
  if (!p1 || !p2) return false;
  return p1 === p2;
};

export const validateDifferentPhones = (phone1, phone2, label1 = 'Primary mobile number', label2 = 'alternate mobile number') => {
  if (arePhoneNumbersSame(phone1, phone2)) {
    return {
      isValid: false,
      message: `${label1} and ${label2} cannot be the same.`
    };
  }
  return { isValid: true };
};
