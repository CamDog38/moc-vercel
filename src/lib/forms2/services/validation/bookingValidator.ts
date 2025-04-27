/**
 * Booking Validator
 * 
 * This file contains validation logic specific to booking forms.
 */

import * as logger from '@/util/logger';
import { 
  validateEmail, 
  validatePhone, 
  validateDate, 
  validateFutureDate,
  validateTime,
  validateFullName
} from '@/lib/forms2/utils/validationUtils';
import { FormValidationError } from './types';

/**
 * Validates booking-specific fields
 * @param mappedData The mapped form data
 */
export const validateBookingFields = (mappedData: Record<string, any>): void => {
  const errors: Record<string, string> = {};
  
  // Validate required fields for bookings with detailed error messages
  if (!mappedData.email) {
    errors.email = 'Email address is required for booking';
  }
  
  if (!mappedData.name) {
    errors.name = 'Full name is required for booking';
  }
  
  // Validate email format
  if (mappedData.email && !validateEmail(mappedData.email)) {
    errors.email = 'Please provide a valid email address in the format name@example.com';
  }
  
  // Validate name format if provided
  if (mappedData.name && !validateFullName(mappedData.name)) {
    errors.name = 'Please provide your full name (first and last name)';
  }
  
  // Validate phone format if provided
  if (mappedData.phone && !validatePhone(mappedData.phone)) {
    errors.phone = 'Please provide a valid phone number';
  }
  
  // Validate date if provided, but don't require it
  if (mappedData.date) {
    if (!validateDate(mappedData.date)) {
      errors.date = 'Please provide a valid date format';
    } else if (!validateFutureDate(mappedData.date)) {
      // Only suggest using a future date but don't make it a hard error
      logger.info(`Booking date is not in the future: ${mappedData.date}`, 'forms');
    }
  }
  
  // Validate time if provided
  if (mappedData.time && !validateTime(mappedData.time)) {
    errors.time = 'Please provide a valid time in HH:MM format';
  }
  
  // If we have any errors, throw a FormValidationError
  if (Object.keys(errors).length > 0) {
    logger.error(`Booking validation errors: ${JSON.stringify(errors)}`, 'forms');
    throw new FormValidationError('Booking validation failed', errors);
  }
};
