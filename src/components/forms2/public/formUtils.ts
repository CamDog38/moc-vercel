import { FieldConfig, FormSection, FieldType } from '@/lib/forms2/core/types';
import { createValidator, validateEmail, validatePhone, validateDate } from '@/lib/forms2/utils/validationUtils';

// Type guards for field validation properties
const hasLengthValidation = (field: FieldConfig): { minLength?: number; maxLength?: number } => {
  // Use type assertion to handle textarea which is not in the official FieldType
  if (field.type === 'text' || (field.type as string) === 'textarea') {
    return {
      minLength: 'minLength' in field ? field.minLength : undefined,
      maxLength: 'maxLength' in field ? field.maxLength : undefined
    };
  }
  return {};
};

// Type guard for number field min/max validation
const hasNumberValidation = (field: FieldConfig): { min?: number; max?: number } => {
  if (field.type === 'number') {
    return {
      min: 'min' in field ? (field as any).min : undefined,
      max: 'max' in field ? (field as any).max : undefined
    };
  }
  return {};
};

// Validate a single form field
export const validateFormField = (
  field: FieldConfig, 
  value: any
): { isValid: boolean; errorMessage?: string } => {
  // Skip validation for hidden fields
  if (field.hidden) return { isValid: true };
  
  // Skip validation for non-required fields with empty values
  if (!field.required && 
      (value === undefined || value === null || value === '')) {
    return { isValid: true };
  }
  
  // Required validation
  if (field.required && (!value || value === '')) {
    return { 
      isValid: false, 
      errorMessage: 'This field is required'
    };
  }
  
  // Skip other validations if value is empty and not required
  if (!value || value === '') {
    return { isValid: true };
  }
  
  // Type-specific validation
  switch (field.type as string) {
    case 'textarea': {
      const { minLength, maxLength } = hasLengthValidation(field);
      if (minLength && value.length < minLength) {
        return {
          isValid: false,
          errorMessage: `Must be at least ${minLength} characters`
        };
      }
      if (maxLength && value.length > maxLength) {
        return {
          isValid: false,
          errorMessage: `Must be at most ${maxLength} characters`
        };
      }
      break;
    }
      
    case 'email':
      if (!validateEmail(value)) {
        return {
          isValid: false,
          errorMessage: 'Please enter a valid email address'
        };
      }
      break;
      
    case 'tel':
      if (!validatePhone(value)) {
        return {
          isValid: false,
          errorMessage: 'Please enter a valid phone number'
        };
      }
      break;
      
    case 'date':
      if (!validateDate(value)) {
        return {
          isValid: false,
          errorMessage: 'Please enter a valid date'
        };
      }
      break;
      
    case 'number':
      const num = parseFloat(value);
      if (isNaN(num)) {
        return {
          isValid: false,
          errorMessage: 'Please enter a valid number'
        };
      }
      
      // Use type guard to safely access min/max properties
      const { min, max } = hasNumberValidation(field);
      
      if (min !== undefined && num < min) {
        return {
          isValid: false,
          errorMessage: `Value must be at least ${min}`
        };
      }
      if (max !== undefined && num > max) {
        return {
          isValid: false,
          errorMessage: `Value must be at most ${max}`
        };
      }
      break;
      
    case 'text': {
      const { minLength, maxLength } = hasLengthValidation(field);
      if (minLength && value.length < minLength) {
        return {
          isValid: false,
          errorMessage: `Must be at least ${minLength} characters`
        };
      }
      if (maxLength && value.length > maxLength) {
        return {
          isValid: false,
          errorMessage: `Must be at most ${maxLength} characters`
        };
      }
      break;
    }
  }
  
  return { isValid: true };
};

// Validate an entire form section
export const validateSection = (
  section: FormSection,
  values: Record<string, any>,
  setFieldError: (fieldId: string, error: string) => void
): boolean => {
  let isValid = true;
  
  section.fields.forEach(field => {
    // Skip validation for hidden fields
    if (field.hidden) return;
    
    // Skip validation for non-required fields with empty values
    if (!field.required && 
        (values[field.id] === undefined || 
         values[field.id] === null ||
         values[field.id] === '')) {
      return;
    }
    
    const validationResult = validateFormField(field, values[field.id]);
    
    if (!validationResult.isValid) {
      setFieldError(field.id, validationResult.errorMessage || 'Invalid value');
      isValid = false;
    }
  });
  
  return isValid;
};
