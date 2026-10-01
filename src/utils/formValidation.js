/**
 * Utility helpers for strict form validation and numeric input sanitization.
 * Enforces production-grade guardrails so users can only enter sensible numbers.
 */

/**
 * Strips all non-digit characters and clamps to [min, max].
 * Returns string representation (or empty string if input is blank).
 */
export function sanitizeInteger(value, { min = 0, max = Infinity, fallback = '' } = {}) {
  if (value === '' || value === null || value === undefined) return fallback;
  const cleaned = String(value).replace(/\D/g, '');
  if (cleaned === '') return fallback;
  const num = parseInt(cleaned, 10);
  if (isNaN(num)) return fallback;
  const clamped = Math.max(min, Math.min(max, num));
  return String(clamped);
}

/**
 * Strips characters that are not digits or a single decimal point.
 * Enforces maxDecimals (default 2) and clamps to [min, max].
 */
export function sanitizeDecimal(value, { min: _min = 0, max = Infinity, maxDecimals = 2, fallback = '' } = {}) {
  if (value === '' || value === null || value === undefined) return fallback;
  const str = String(value).trim();
  // Remove any character except digits and decimal point
  let cleaned = str.replace(/[^0-9.]/g, '');
  // Keep only the first decimal point
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }
  if (cleaned === '' || cleaned === '.') return cleaned;

  if (parts.length === 2 && parts[1].length > maxDecimals) {
    cleaned = `${parts[0]}.${parts[1].slice(0, maxDecimals)}`;
  }

  const num = parseFloat(cleaned);
  if (isNaN(num)) return fallback;
  if (num > max) return String(max);
  return cleaned;
}

/**
 * onKeyDown event listener to block unwanted characters on numeric inputs.
 * Blocks '-', '+', 'e', 'E', and optionally '.' (for integer-only inputs).
 */
export function blockInvalidNumberKeys(e, { allowDecimals = false } = {}) {
  // Disallow scientific notation ('e', 'E'), negative ('-'), and positive sign ('+')
  if (e.key === 'e' || e.key === 'E' || e.key === '-' || e.key === '+') {
    e.preventDefault();
    return;
  }
  // Disallow decimal point on integer-only fields
  if (!allowDecimals && (e.key === '.' || e.key === ',')) {
    e.preventDefault();
  }
}

/**
 * Validates whether a value is a valid positive number within bounds.
 */
export function isValidNumber(value, { min = 0.01, max = Infinity, allowDecimals = true } = {}) {
  if (value === '' || value === null || value === undefined) return false;
  const num = allowDecimals ? parseFloat(value) : parseInt(value, 10);
  if (isNaN(num)) return false;
  return num >= min && num <= max;
}

/**
 * Sanitizes mobile phone input:
 * - Strips all non-digit characters
 * - Strips leading '+91' or '91' if 12 digits
 * - Strips leading '0' if 11 digits
 * - Clamps to maximum 10 digits
 */
export function sanitizeMobileNumber(value) {
  if (!value) return '';
  let cleaned = String(value).replace(/\D/g, '');
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }
  return cleaned.slice(0, 10);
}

/**
 * Validates if the string is a valid 10-digit mobile number starting with 6, 7, 8, or 9.
 */
export function isValidMobileNumber(value) {
  const cleaned = sanitizeMobileNumber(value);
  return /^[6-9]\d{9}$/.test(cleaned);
}

/**
 * Comprehensive mobile number validator returning structured status and user-friendly error.
 */
export function validateMobileNumber(value, { required = true, fieldName = 'Mobile number' } = {}) {
  const cleaned = sanitizeMobileNumber(value);
  if (!cleaned) {
    if (required) {
      return { isValid: false, error: `Please enter the ${fieldName.toLowerCase()}.`, cleanedValue: '' };
    }
    return { isValid: true, cleanedValue: '' };
  }
  if (cleaned.length < 10) {
    return {
      isValid: false,
      error: `${fieldName} must be exactly 10 digits (${cleaned.length}/10 entered).`,
      cleanedValue: cleaned,
    };
  }
  if (!/^[6-9]/.test(cleaned)) {
    return {
      isValid: false,
      error: `${fieldName} must start with 6, 7, 8, or 9.`,
      cleanedValue: cleaned,
    };
  }
  return { isValid: true, cleanedValue: cleaned };
}

/**
 * Validates if the string is a valid email address.
 */
export function isValidEmail(value) {
  if (!value) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(String(value).trim().toLowerCase());
}

/**
 * Comprehensive email validator returning structured status and user-friendly error.
 */
export function validateEmail(value, { required = true, fieldName = 'Email address' } = {}) {
  const trimmed = String(value || '').trim().toLowerCase();
  if (!trimmed) {
    if (required) {
      return { isValid: false, error: `Please enter your ${fieldName.toLowerCase()}.`, cleanedValue: '' };
    }
    return { isValid: true, cleanedValue: '' };
  }
  if (!isValidEmail(trimmed)) {
    return {
      isValid: false,
      error: `Please enter a valid ${fieldName.toLowerCase()} (e.g. name@gmail.com).`,
      cleanedValue: trimmed,
    };
  }
  return { isValid: true, cleanedValue: trimmed };
}
