/**
 * Form System 2.0 useForm2 Hook
 * 
 * This hook provides access to form state and actions for managing forms.
 */

import { useCallback } from 'react';
import { useFormContext } from '../core/formContext';
import { resetForm, setSubmitting, setSubmitted } from '../core/formActions';
import { FieldRegistry } from '../core/fieldRegistry';

/**
 * useForm2 Hook
 * 
 * Provides form state and actions for form management
 */
export function useForm2() {
  const { state, dispatch } = useFormContext();
  
  /**
   * Reset the form to its initial state
   */
  const reset = useCallback((values?: Record<string, any>) => {
    dispatch(resetForm(values));
  }, [dispatch]);
  
  /**
   * Validate all fields in the form
   */
  const validateForm = useCallback(() => {
    const fields = state.config.sections.flatMap(section => section.fields);
    
    let isValid = true;
    
    fields.forEach(field => {
      const value = state.values[field.id];
      const error = FieldRegistry.validate(value, field);
      
      if (error) {
        isValid = false;
      }
    });
    
    return isValid;
  }, [state]);
  
  /**
   * Handle form submission
   */
  const handleSubmit = useCallback((onSubmit: (values: Record<string, any>) => void | Promise<void>) => {
    return async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
      }
      
      dispatch(setSubmitting(true));
      
      const isValid = validateForm();
      
      if (isValid) {
        try {
          await onSubmit(state.values);
          dispatch(setSubmitted());
        } catch (error) {
          console.error('Form submission error:', error);
        } finally {
          dispatch(setSubmitting(false));
        }
      } else {
        dispatch(setSubmitting(false));
      }
    };
  }, [dispatch, validateForm, state.values]);
  
  /**
   * Get all visible fields based on conditional logic
   */
  const getVisibleFields = useCallback(() => {
    const fields = state.config.sections.flatMap(section => section.fields);
    
    return fields.filter(field => {
      if (!field.conditionalLogic) {
        return true;
      }
      
      const { fieldId, operator, value, action } = field.conditionalLogic;
      const fieldValue = state.values[fieldId];
      
      let conditionMet = false;
      
      switch (operator) {
        case 'equals':
          conditionMet = fieldValue === value;
          break;
        case 'notEquals':
          conditionMet = fieldValue !== value;
          break;
        case 'contains':
          conditionMet = typeof fieldValue === 'string' && fieldValue.includes(value);
          break;
        case 'notContains':
          conditionMet = typeof fieldValue === 'string' && !fieldValue.includes(value);
          break;
        case 'greaterThan':
          conditionMet = parseFloat(fieldValue) > parseFloat(value);
          break;
        case 'lessThan':
          conditionMet = parseFloat(fieldValue) < parseFloat(value);
          break;
        case 'isEmpty':
          conditionMet = !fieldValue || fieldValue === '';
          break;
        case 'isNotEmpty':
          conditionMet = fieldValue && fieldValue !== '';
          break;
      }
      
      return action === 'show' ? conditionMet : !conditionMet;
    });
  }, [state]);
  
  return {
    values: state.values,
    errors: state.errors,
    touched: state.touched,
    isDirty: state.isDirty,
    isSubmitting: state.isSubmitting,
    isSubmitted: state.isSubmitted,
    isValid: state.isValid,
    config: state.config,
    reset,
    validateForm,
    handleSubmit,
    getVisibleFields,
  };
}
