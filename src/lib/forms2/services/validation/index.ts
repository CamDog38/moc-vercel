/**
 * Validation Service
 * 
 * This file exports the validation service functionality.
 */

// Export types
export * from './types';

// Export core validation functions
export { validateFormSubmission } from './formValidator';
export { evaluateConditionalLogic } from './conditionalLogic';
export { validateBookingFields } from './bookingValidator';

// Export validation service
export { validationService } from './validationService';

// Default export for backward compatibility
import { validationService } from './validationService';
export default validationService;
