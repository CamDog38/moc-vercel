/**
 * Form System 2.0 Reducer
 * 
 * This file contains the reducer function for the Form System 2.0 state management.
 */

import { FormState } from './types';
import { FormAction } from './formActions';

/**
 * Form reducer function
 * 
 * Handles state changes based on dispatched actions
 */
export function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_FIELD_VALUE':
      return {
        ...state,
        values: {
          ...state.values,
          [action.payload.id]: action.payload.value,
        },
        isDirty: true,
      };
      
    case 'SET_FIELD_ERROR':
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.payload.id]: action.payload.error,
        },
        isValid: Object.values({
          ...state.errors,
          [action.payload.id]: action.payload.error,
        }).every(error => !error),
      };
      
    case 'SET_FIELD_TOUCHED':
      return {
        ...state,
        touched: {
          ...state.touched,
          [action.payload.id]: true,
        },
      };
      
    case 'RESET_FORM':
      return {
        ...state,
        values: action.payload.values || {},
        errors: {},
        touched: {},
        isDirty: false,
        isSubmitted: false,
      };
      
    case 'SET_SUBMITTING':
      return {
        ...state,
        isSubmitting: action.payload.isSubmitting,
      };
      
    case 'SET_SUBMITTED':
      return {
        ...state,
        isSubmitted: true,
        isSubmitting: false,
      };
      
    default:
      return state;
  }
}
