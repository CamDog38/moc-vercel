/**
 * Form System 2.0 Submission Services
 * 
 * This file exports all submission-related services and types.
 */

// Export service implementations
export { validationService, validateFormSubmission, validateBookingFields } from '../validation';
export * from '../mapping'; // Use the new modular mapping service
export * from './leadService';
export * from './bookingService';
export * from './errorHandlingService';
// Export the new Form System 2.0 submission service
export { submissionService } from './submissionService2';

// Export types - avoid duplicates with validation module
export * from './types';
