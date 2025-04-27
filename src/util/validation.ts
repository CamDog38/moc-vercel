/**
 * Utility functions for validating common data formats
 */

/**
 * Validates if a string is a valid email address
 * @param email The email string to validate
 * @returns True if the email is valid, false otherwise
 */
export const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  
  // Basic email validation regex
  // This checks for:
  // - At least one character before the @ symbol
  // - At least one character after the @ symbol and before the dot
  // - At least two characters after the last dot (TLD)
  // - No special characters except for ._-
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  return emailRegex.test(email);
};

/**
 * Validates if a string is a valid phone number
 * @param phone The phone string to validate
 * @returns True if the phone is valid, false otherwise
 */
export const isValidPhone = (phone: string): boolean => {
  if (!phone || typeof phone !== 'string') return false;
  
  // Remove all non-digit characters for validation
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Most phone numbers are between 7 and 15 digits
  return digitsOnly.length >= 7 && digitsOnly.length <= 15;
};

/**
 * Validates if a string is likely a person's name
 * @param name The name string to validate
 * @returns True if the string is likely a name, false otherwise
 */
export const isLikelyName = (name: string): boolean => {
  if (!name || typeof name !== 'string') return false;
  
  // Trim whitespace
  const trimmedName = name.trim();
  
  // Check if it's not empty and not too long
  if (trimmedName.length === 0 || trimmedName.length > 100) return false;
  
  // Check if it contains mostly letters, spaces, hyphens, and apostrophes
  // Names typically don't contain numbers or special characters
  const nameRegex = /^[A-Za-z\s\.\-']+$/;
  
  return nameRegex.test(trimmedName);
};
