// frontend/src/lib/validation.ts

/**
 * Validation utilities matching backend requirements
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate password strength (matches backend requirements)
 * - Min 8 characters
 * - At least 1 digit
 * - At least 1 special character
 */
export function validatePasswordStrength(password: string): ValidationResult {
  if (password.length < 8) {
    return { isValid: false, error: "Password must be at least 8 characters long" };
  }

  if (!/\d/.test(password)) {
    return { isValid: false, error: "Password must contain at least 1 digit" };
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(password)) {
    return { isValid: false, error: "Password must contain at least 1 special character" };
  }

  return { isValid: true };
}

/**
 * Validate full name (matches backend requirements)
 * - Only letters, spaces, dots, hyphens, and apostrophes
 * - 2-50 characters
 */
export function validateFullName(name: string): ValidationResult {
  if (name.length < 2) {
    return { isValid: false, error: "Name must be at least 2 characters long" };
  }

  if (name.length > 50) {
    return { isValid: false, error: "Name must not exceed 50 characters" };
  }

  if (!/^[a-zA-Z\s\.\-']+$/.test(name)) {
    return { isValid: false, error: "Name can only contain letters, spaces, dots, hyphens, and apostrophes" };
  }

  return { isValid: true };
}

/**
 * Validate Indian phone number format
 * - Accepts +91-XXXXXXXXXX or 10 digits
 */
export function validateIndianPhone(phone: string): ValidationResult {
  if (!phone) {
    return { isValid: true }; // Phone is optional
  }

  // Remove any spaces, dashes, or parentheses
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');

  // Check for +91 prefix
  if (cleaned.startsWith('+91')) {
    const number = cleaned.slice(3); // Remove +91
    if (!/^\d{10}$/.test(number)) {
      return { isValid: false, error: "Phone number must be 10 digits after +91 prefix" };
    }
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    // Accept 91XXXXXXXXXX format
    const number = cleaned.slice(2);
    if (!/^\d{10}$/.test(number)) {
      return { isValid: false, error: "Invalid phone number format" };
    }
  } else if (/^\d{10}$/.test(cleaned)) {
    // Accept 10-digit format
    return { isValid: true };
  } else {
    return { isValid: false, error: "Please enter a valid Indian phone number (+91-XXXXXXXXXX or 10 digits)" };
  }

  return { isValid: true };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return { isValid: false, error: "Please enter a valid email address" };
  }

  return { isValid: true };
}

/**
 * Normalize Indian phone number to +91-XXXXXXXXXX format
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';

  // Remove any spaces, dashes, or parentheses
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');

  // If it starts with +91, format it properly
  if (cleaned.startsWith('+91')) {
    const number = cleaned.slice(3);
    return `+91-${number}`;
  }

  // If it starts with 91 and has 12 digits total
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    const number = cleaned.slice(2);
    return `+91-${number}`;
  }

  // If it's 10 digits, add +91 prefix
  if (/^\d{10}$/.test(cleaned)) {
    return `+91-${cleaned}`;
  }

  // Return as is if it doesn't match expected patterns
  return phone;
}