// Public Form View Reducer
// This is a modified version of the form reducer specifically for the public form view
// It allows text fields to be cleared while preserving dropdown values

import { FormState, FormAction } from './formReducer';
import { initialFormState } from './formReducer';

// Re-export initialFormState
export { initialFormState };

// Public form reducer - allows clearing text fields
export function publicFormReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_FIELD_VALUE':
      // Handle field value updates, with special handling for text fields
      let newValue = action.value;
      const fieldId = action.fieldId;
      const existingValue = state.values[fieldId];
      
      // Log the value change for debugging
      console.log(`[Public Form] Setting field value for ${fieldId}:`, { 
        existingValue, 
        newValue 
      });
      
      // Special handling for empty values
      if ((newValue === '' || newValue === undefined || newValue === null) && existingValue !== undefined) {
        // Check if this is a dropdown field (values typically contain dashes or underscores)
        const isDropdownField = (
          // Check value format (dropdowns often have dashes or underscores)
          (typeof existingValue === 'string' && 
           (existingValue.includes('-') || existingValue.includes('_'))) ||
          // Check field ID for dropdown indicators
          fieldId.includes('select') || 
          fieldId.includes('dropdown') || 
          fieldId.includes('option') ||
          // Check if the field is commonly used in conditional logic
          fieldId.includes('nationality') || 
          fieldId.includes('service') || 
          fieldId.includes('type')
        );
        
        if (isDropdownField) {
          // For dropdown fields, preserve the existing value
          console.log(`[Public Form] Preserving dropdown value for ${fieldId}:`, existingValue);
          newValue = existingValue;
        } else {
          // For text input fields, allow clearing the value
          console.log(`[Public Form] Allowing empty value for text field ${fieldId}`);
          // Keep newValue as empty
        }
      }
      
      // Special handling for values with hyphens or underscores
      if (typeof newValue === 'string' && 
          (newValue.includes('-') || newValue.includes('_')) && 
          typeof existingValue === 'string') {
        // Normalize both values for comparison
        const normalizedNew = newValue.replace(/-/g, ' ').replace(/_/g, ' ').toLowerCase();
        const normalizedExisting = existingValue.replace(/-/g, ' ').replace(/_/g, ' ').toLowerCase();
        
        // If they're essentially the same value with different formatting, keep the new format
        if (normalizedNew === normalizedExisting) {
          console.log(`[Public Form] Normalized values match for ${fieldId}, using new format`);
        }
      }
      
      return {
        ...state,
        values: {
          ...state.values,
          [fieldId]: newValue
        },
        touched: {
          ...state.touched,
          [fieldId]: true
        }
      };
      
    case 'SET_FIELD_ERROR':
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.fieldId]: action.error
        }
      };
      
    case 'CLEAR_FIELD_ERROR':
      const newErrors = { ...state.errors };
      delete newErrors[action.fieldId];
      return {
        ...state,
        errors: newErrors
      };
      
    case 'SET_FORM_SUBMITTING':
      return {
        ...state,
        isSubmitting: action.value
      };
      
    case 'SET_FORM_SUBMITTED':
      return {
        ...state,
        isSubmitted: action.value
      };
      
    case 'SET_FORM_ERROR':
      return {
        ...state,
        submitError: action.error
      };
      
    case 'RESET_FORM':
      return {
        ...initialFormState
      };
      
    default:
      return state;
  }
}
