/**
 * Validation Service Types
 * 
 * This file contains type definitions for the validation service.
 */

import { FormSubmissionData } from '@/lib/forms2/core/types';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Form validation error class
 */
export class FormValidationError extends Error {
  errors: Record<string, string>;
  
  constructor(message: string, errors: Record<string, string>) {
    super(message);
    this.name = 'FormValidationError';
    this.errors = errors;
  }
}

/**
 * Validation service interface
 */
export interface ValidationService {
  validateSubmission(formId: string, data: FormSubmissionData): Promise<ValidationResult>;
}
