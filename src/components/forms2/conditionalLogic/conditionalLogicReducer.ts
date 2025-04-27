// Conditional Logic Reducer for Form Builder
// This is a separate reducer specifically for the form builder's conditional logic

// Import types from the original form reducer
import { FormState, FormAction } from '../public/formReducer';

// Define initial state
export const initialFormState: FormState = {
  values: {},
  errors: {},
  touched: {},
  isSubmitting: false,
  isSubmitted: false,
  submitError: null
};

// Form reducer specifically for conditional logic in the form builder
export function conditionalLogicReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_FIELD_VALUE':
      // Handle field value updates, ensuring proper persistence for conditional logic
      let newValue = action.value;
      const fieldId = action.fieldId;
      const existingValue = state.values[fieldId];
      
      // Log the value change for debugging
      console.log(`[CONDITIONAL LOGIC REDUCER] Action:`, action);
      console.log(`[CONDITIONAL LOGIC REDUCER] Field ID: ${fieldId}`);
      console.log(`[CONDITIONAL LOGIC REDUCER] Current state values:`, state.values);
      console.log(`[CONDITIONAL LOGIC REDUCER] Existing value for ${fieldId}:`, existingValue);
      console.log(`[CONDITIONAL LOGIC REDUCER] New value:`, newValue);
      
      // Check if this field is part of conditional logic
      const isConditionalField = 
        fieldId.includes('when.field') || 
        fieldId.includes('when.value') || 
        fieldId.includes('operator') || 
        fieldId.includes('action');
      
      console.log(`[CONDITIONAL LOGIC REDUCER] Is conditional field: ${isConditionalField}`);
      
      // For conditional logic, ALWAYS preserve values when they are emptied
      // This is critical for the conditional logic to work properly
      if ((newValue === '' || newValue === undefined || newValue === null) && existingValue !== undefined) {
        console.log(`[CONDITIONAL LOGIC REDUCER] Empty value detected, checking if we should preserve it`);
        console.log(`[CONDITIONAL LOGIC REDUCER] Preserving value for ${fieldId}:`, existingValue);
        newValue = existingValue;
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


