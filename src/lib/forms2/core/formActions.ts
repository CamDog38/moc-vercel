/**
 * Form System 2.0 Action Creators
 * 
 * This file contains all the action creators for the Form System 2.0 state management.
 */

/**
 * Form Action Types
 */
export type FormAction =
  | { type: 'SET_FIELD_VALUE'; payload: { id: string; value: any } }
  | { type: 'SET_FIELD_ERROR'; payload: { id: string; error: string | undefined } }
  | { type: 'SET_FIELD_TOUCHED'; payload: { id: string } }
  | { type: 'RESET_FORM'; payload: { values?: Record<string, any> } }
  | { type: 'SET_SUBMITTING'; payload: { isSubmitting: boolean } }
  | { type: 'SET_SUBMITTED' };

/**
 * Sets the value of a field
 */
export const setFieldValue = (id: string, value: any): FormAction => ({
  type: 'SET_FIELD_VALUE',
  payload: { id, value },
});

/**
 * Sets the error message for a field
 */
export const setFieldError = (id: string, error: string | undefined): FormAction => ({
  type: 'SET_FIELD_ERROR',
  payload: { id, error },
});

/**
 * Marks a field as touched (user has interacted with it)
 */
export const setFieldTouched = (id: string): FormAction => ({
  type: 'SET_FIELD_TOUCHED',
  payload: { id },
});

/**
 * Resets the form state
 */
export const resetForm = (values?: Record<string, any>): FormAction => ({
  type: 'RESET_FORM',
  payload: { values },
});

/**
 * Sets the submitting state of the form
 */
export const setSubmitting = (isSubmitting: boolean): FormAction => ({
  type: 'SET_SUBMITTING',
  payload: { isSubmitting },
});

/**
 * Marks the form as submitted
 */
export const setSubmitted = (): FormAction => ({
  type: 'SET_SUBMITTED',
});
