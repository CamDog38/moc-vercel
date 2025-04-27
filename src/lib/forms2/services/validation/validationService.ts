/**
 * Validation Service Implementation
 * 
 * This file contains the implementation of the validation service.
 */

import * as logger from '@/util/logger';
import { FormRepository } from '@/lib/forms2/repositories/formRepository';
import { FormSubmissionData } from '@/lib/forms2/core/types';
import { ValidationResult, ValidationService } from './types';
import { validateFormSubmission } from './formValidator';

/**
 * Validation service implementation
 */
export class ValidationServiceImpl implements ValidationService {
  private formRepository: FormRepository;
  
  constructor(formRepository: FormRepository) {
    this.formRepository = formRepository;
  }
  
  /**
   * Validates a form submission
   * @param formId The ID of the form
   * @param data The form submission data
   * @returns The validation result
   */
  async validateSubmission(formId: string, data: FormSubmissionData): Promise<ValidationResult> {
    try {
      // Get the form configuration
      const form = await this.formRepository.getFormById(formId);
      
      if (!form) {
        logger.error(`Form not found: ${formId}`, 'forms');
        throw new Error(`Form not found: ${formId}`);
      }
      
      // Get the form configuration
      const formConfig = form.fields ? JSON.parse(form.fields as string) : null;
      
      if (!formConfig) {
        logger.error(`Invalid form configuration for form: ${formId}`, 'forms');
        throw new Error(`Invalid form configuration for form: ${formId}`);
      }
      
      // Get the form sections
      const sections = form.sections ? JSON.parse(form.sections as string) : [];
      
      // Create a complete form config object
      const completeFormConfig = {
        ...formConfig,
        sections: sections
      };
      
      // Validate the form submission
      return validateFormSubmission(completeFormConfig, data);
    } catch (error) {
      logger.error(`Error validating form submission: ${error}`, 'forms');
      return {
        isValid: false,
        errors: { _form: 'Error validating form submission' }
      };
    }
  }
}

// Create and export the validation service
export const validationService = new ValidationServiceImpl(
  new FormRepository()
);
