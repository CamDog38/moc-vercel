/**
 * Form System 2.0 useField2 Hook
 * 
 * This hook provides access to field state and actions for managing individual fields.
 */

import { useCallback } from 'react';
import { useFormContext } from '../core/formContext';
import { setFieldValue, setFieldError, setFieldTouched } from '../core/formActions';
import { FieldConfig } from '../core/types';
import { FieldRegistry } from '../core/fieldRegistry';

/**
 * useField2 Hook
 * 
 * Provides field state and actions for field management
 */
export function useField2(id: string) {
  const { state, dispatch } = useFormContext();
  
  // Find the field config
  const fieldConfig = state.config.sections
    .flatMap(section => section.fields)
    .find(field => field.id === id) as FieldConfig | undefined;
  
  if (!fieldConfig) {
    throw new Error(`Field with id "${id}" not found`);
  }
  
  const value = state.values[id];
  const error = state.errors[id];
  const touched = state.touched[id];
  
  /**
   * Set the value of the field
   */
  const setValue = useCallback((newValue: any) => {
    dispatch(setFieldValue(id, newValue));
    
    // Validate the field
    const validationError = FieldRegistry.validate(newValue, fieldConfig);
    if (validationError !== error) {
      dispatch(setFieldError(id, validationError));
    }
  }, [dispatch, id, fieldConfig, error]);
  
  /**
   * Set the error message for the field
   */
  const setError = useCallback((error: string | undefined) => {
    dispatch(setFieldError(id, error));
  }, [dispatch, id]);
  
  /**
   * Mark the field as touched (user has interacted with it)
   */
  const setTouched = useCallback(() => {
    dispatch(setFieldTouched(id));
  }, [dispatch, id]);
  
  /**
   * Handle field change event
   */
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const newValue = e.target.type === 'checkbox' 
      ? (e.target as HTMLInputElement).checked 
      : e.target.value;
    
    setValue(newValue);
  }, [setValue]);
  
  /**
   * Handle field blur event
   */
  const handleBlur = useCallback(() => {
    setTouched();
    
    // Validate on blur
    const validationError = FieldRegistry.validate(value, fieldConfig);
    if (validationError !== error) {
      dispatch(setFieldError(id, validationError));
    }
  }, [dispatch, id, setTouched, value, fieldConfig, error]);
  
  /**
   * Check if the field is visible based on conditional logic
   */
  const isVisible = useCallback(() => {
    if (!fieldConfig.conditionalLogic) {
      return true;
    }
    
    const { fieldId, operator, value, action } = fieldConfig.conditionalLogic;
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
  }, [fieldConfig, state.values]);
  
  return {
    value,
    error,
    touched,
    setValue,
    setError,
    setTouched,
    handleChange,
    handleBlur,
    isVisible,
    config: fieldConfig,
  };
}
