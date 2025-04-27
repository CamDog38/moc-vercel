/**
 * Form Validator
 * 
 * This file contains the core validation logic for form submissions.
 */

import * as logger from '@/util/logger';
import { validateFormField } from '@/components/forms2/public/formUtils';
import { 
  FieldConfig, 
  FormSection, 
  FormSubmissionData,
  FormConfig
} from '@/lib/forms2/core/types';
import { ValidationResult, FormValidationError } from './types';
// Import the evaluateConditionalLogic function directly
import { evaluateConditionalLogic } from '../validation/conditionalLogic';

/**
 * Validates all form fields based on their configuration
 * @param formConfig The form configuration
 * @param formData The submitted form data
 * @returns Validation result with any errors
 */
export const validateFormSubmission = (
  formConfig: FormConfig,
  formData: FormSubmissionData
): ValidationResult => {
  const errors: Record<string, string> = {};
  let hasValidationErrors = false;
  
  // Check if this is a booking form that requires specific fields
  // Access form type from metadata or another property
  const formType = (formConfig as any).type || 
                 (formConfig.metadata && (formConfig.metadata as any).formType) || 
                 'INQUIRY';
  const isBookingForm = formType === 'BOOKING';
  
  // Required fields for booking forms
  const requiredBookingFields = {
    name: false,
    email: false,
    phone: false,
    date: false
  };
  
  // Field mappings to identify common field types
  const fieldMappings = {
    name: ['name', 'fullName', 'full_name', 'customer_name', 'client_name'],
    email: ['email', 'emailAddress', 'email_address', 'customer_email', 'client_email'],
    phone: ['phone', 'phoneNumber', 'phone_number', 'customer_phone', 'client_phone', 'tel', 'telephone', 'mobile'],
    date: ['date', 'bookingDate', 'booking_date', 'eventDate', 'event_date', 'appointment_date', 'start_date']
  };
  
  // Process each section and validate its fields
  if (formConfig?.sections && Array.isArray(formConfig.sections)) {
    // First pass: identify required booking fields
    if (isBookingForm) {
      formConfig.sections.forEach((section: FormSection) => {
        if (!section.fields || !Array.isArray(section.fields)) return;
        
        section.fields.forEach((field: FieldConfig) => {
          // Check field label or mapping property for matches
          const fieldLabel = (field.label || '').toLowerCase();
          // Safely handle field mapping which might be an object or string
          let fieldMapping = '';
          try {
            // First check if mapping exists
            if (field.mapping !== undefined && field.mapping !== null) {
              // Handle string mapping
              if (typeof field.mapping === 'string') {
                const mappingStr = field.mapping as string;
                fieldMapping = mappingStr.toLowerCase();
                // Try to parse it as JSON if it looks like JSON
                if (mappingStr.startsWith('{') && mappingStr.endsWith('}')) {
                  try {
                    const mappingObj = JSON.parse(mappingStr);
                    if (mappingObj && typeof mappingObj.value === 'string') {
                      fieldMapping = mappingObj.value.toLowerCase();
                    }
                  } catch (parseError) {
                    // Just use the original string if parsing fails
                    logger.error(`Error parsing JSON mapping: ${parseError}`, 'forms');
                  }
                }
              } 
              // Handle object mapping
              else if (typeof field.mapping === 'object' && field.mapping !== null) {
                const mappingObj = field.mapping as any;
                if (mappingObj.value) {
                  fieldMapping = mappingObj.value.toLowerCase();
                }
              }
            }
          } catch (error) {
            logger.error(`Error processing field mapping: ${error}`, 'forms');
          }
          
          // Check if this field maps to a required booking field
          if (isBookingForm) {
            for (const [key, values] of Object.entries(fieldMappings)) {
              if (values.includes(fieldMapping) || 
                  values.some(v => fieldLabel.includes(v))) {
                requiredBookingFields[key as keyof typeof requiredBookingFields] = true;
                break;
              }
            }
          }
        });
      });
    }
    
    // Second pass: validate fields
    formConfig.sections.forEach((section: FormSection) => {
      // Skip section if it has conditional logic that isn't met
      if (section.conditionalLogic && 
          !evaluateConditionalLogic(section.conditionalLogic, formData)) {
        return;
      }
      
      if (!section.fields || !Array.isArray(section.fields)) return;
      
      section.fields.forEach((field: FieldConfig) => {
        // Skip field if it has conditional logic that isn't met
        if (field.conditionalLogic && 
            !evaluateConditionalLogic(field.conditionalLogic, formData)) {
          return;
        }
        
        const fieldId = field.id;
        const fieldValue = formData[fieldId];
        
        // Validate the field
        try {
          const validationResult = validateFormField(field, fieldValue);
          
          if (!validationResult.isValid) {
            errors[fieldId] = validationResult.errorMessage || 'Invalid field value';
            hasValidationErrors = true;
          }
        } catch (error) {
          logger.error(`Error validating field ${fieldId}: ${error}`, 'forms');
          errors[fieldId] = 'Error validating field';
          hasValidationErrors = true;
        }
      });
    });
  }
  
  // Check if required booking fields are present
  if (isBookingForm) {
    if (!requiredBookingFields.name) {
      logger.warn('Booking form is missing a name field', 'forms');
    }
    
    if (!requiredBookingFields.email) {
      logger.warn('Booking form is missing an email field', 'forms');
    }
    
    if (!requiredBookingFields.phone) {
      logger.warn('Booking form is missing a phone field', 'forms');
    }
    
    if (!requiredBookingFields.date) {
      logger.warn('Booking form is missing a date field', 'forms');
    }
  }
  
  return {
    isValid: !hasValidationErrors,
    errors
  };
};
