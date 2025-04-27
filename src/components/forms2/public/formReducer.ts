// Form state and reducer for public form view

// Initial form state
export interface FormState {
  values: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isSubmitted: boolean;
  submitError: string | null;
}

// Form actions
export type FormAction = 
  | { type: 'SET_FIELD_VALUE'; fieldId: string; value: any }
  | { type: 'SET_FIELD_ERROR'; fieldId: string; error: string }
  | { type: 'CLEAR_FIELD_ERROR'; fieldId: string }
  | { type: 'SET_FORM_SUBMITTING'; value: boolean }
  | { type: 'SET_FORM_SUBMITTED'; value: boolean }
  | { type: 'SET_FORM_ERROR'; error: string | null }
  | { type: 'RESET_FORM' };

// Initial state
export const initialFormState: FormState = {
  values: {},
  errors: {},
  touched: {},
  isSubmitting: false,
  isSubmitted: false,
  submitError: null
};

// Form reducer
export function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_FIELD_VALUE':
      // Handle field value updates, ensuring proper persistence for all field types
      let newValue = action.value;
      const fieldId = action.fieldId;
      const existingValue = state.values[fieldId];
      
      // Log the value change for debugging
      console.log(`Setting field value for ${fieldId}:`, { 
        existingValue, 
        newValue 
      });
      
      // Always preserve values when they are emptied
      // This is critical for conditional logic to work properly in the form builder
      if ((newValue === '' || newValue === undefined || newValue === null) && existingValue !== undefined) {
        // If the new value is empty but we have an existing value, keep it
        console.log(`Preserving existing value for ${fieldId}:`, existingValue);
        newValue = existingValue;
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
          console.log(`Normalized values match for ${fieldId}, using new format`);
        }
      }
      
      // Update the values object with the new or preserved value
      const updatedValues = {
        ...state.values,
        [fieldId]: newValue
      };
      
      return {
        ...state,
        values: updatedValues,
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
      return initialFormState;
    default:
      return state;
  }
}
