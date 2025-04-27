/**
 * Form System 2.0 Validation Utilities
 * 
 * This file contains utility functions for field validation.
 */

/**
 * Validates an email address
 */
export function validateEmail(email: string): boolean {
  if (!email) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Validates a phone number
 */
export function validatePhone(phone: string): boolean {
  if (!phone) return false;
  const re = /^\+?[0-9]{10,15}$/;
  return re.test(phone.replace(/[^0-9+]/g, ''));
}

/**
 * Validates a date string
 */
export function validateDate(date: string): boolean {
  if (!date) return false;
  const d = new Date(date);
  return !isNaN(d.getTime());
}

/**
 * Validates that a date is in the future
 */
export function validateFutureDate(date: string): boolean {
  if (!validateDate(date)) return false;
  
  const selectedDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
  
  return selectedDate >= today;
}

/**
 * Validates a time string (HH:MM or HH:MM AM/PM format)
 */
export function validateTime(time: string): boolean {
  if (!time) return false;
  
  // Check for 24-hour format (HH:MM)
  const timeRegex24 = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
  
  // Check for 12-hour format (HH:MM AM/PM)
  const timeRegex12 = /^(0?[1-9]|1[0-2]):([0-5][0-9])\s?(AM|PM|am|pm)$/;
  
  return timeRegex24.test(time) || timeRegex12.test(time);
}

/**
 * Validates a name (at least two words, each at least 2 characters)
 */
export function validateFullName(name: string): boolean {
  if (!name) return false;
  
  const words = name.trim().split(/\s+/);
  if (words.length < 2) return false;
  
  // Check that each word is at least 2 characters
  return words.every(word => word.length >= 2);
}

/**
 * Creates a validation function for a field
 */
export function createValidator(config: any) {
  return (value: any): string | undefined => {
    // Required validation
    if (config.required && (!value || value === '')) {
      return typeof config.required === 'string' 
        ? config.required 
        : 'This field is required';
    }
    
    // Skip other validations if value is empty and not required
    if (!value || value === '') {
      return undefined;
    }
    
    // Type-specific validation
    switch (config.type) {
      case 'email':
        if (!validateEmail(value)) {
          return 'Please enter a valid email address';
        }
        break;
        
      case 'tel':
        if (!validatePhone(value)) {
          return 'Please enter a valid phone number';
        }
        break;
        
      case 'date':
        if (!validateDate(value)) {
          return 'Please enter a valid date';
        }
        
        // Check if date should be in the future
        if (config.futureOnly && !validateFutureDate(value)) {
          return 'Please select a future date';
        }
        break;
        
      case 'time':
        if (!validateTime(value)) {
          return 'Please enter a valid time in HH:MM format';
        }
        break;
        
      case 'datetime':
        if (!validateDate(value)) {
          return 'Please enter a valid date and time';
        }
        
        // Check if datetime should be in the future
        if (config.futureOnly) {
          const dateObj = new Date(value);
          const now = new Date();
          if (dateObj <= now) {
            return 'Please select a future date and time';
          }
        }
        break;
        
      case 'number':
        const num = parseFloat(value);
        if (isNaN(num)) {
          return 'Please enter a valid number';
        }
        if (config.min !== undefined && num < config.min) {
          return `Value must be at least ${config.min}`;
        }
        if (config.max !== undefined && num > config.max) {
          return `Value must be at most ${config.max}`;
        }
        break;
        
      case 'text':
      case 'textarea':
        if (config.minLength && value.length < config.minLength) {
          return `Must be at least ${config.minLength} characters`;
        }
        if (config.maxLength && value.length > config.maxLength) {
          return `Must be at most ${config.maxLength} characters`;
        }
        
        // If this is a name field, check for full name format
        if (config.fieldType === 'name' && !validateFullName(value)) {
          return 'Please enter your full name (first and last name)';
        }
        break;
    }
    
    // Custom validation
    if (config.validation?.validate) {
      const result = config.validation.validate(value);
      if (typeof result === 'string') {
        return result;
      }
      if (result === false) {
        return 'Invalid value';
      }
    }
    
    return undefined;
  };
}
