/**
 * Form System 2.0 Context Provider
 * 
 * This file contains the context provider for the Form System 2.0 state management.
 */

import React, { createContext, useContext, useReducer, useMemo } from 'react';
import { FormState, FormConfig } from './types';
import { formReducer } from './formReducer';
import { FormAction } from './formActions';

/**
 * Form Context Value
 */
interface FormContextValue {
  state: FormState;
  dispatch: React.Dispatch<FormAction>;
}

/**
 * Form Context
 */
const FormContext = createContext<FormContextValue | undefined>(undefined);

/**
 * Form Provider Props
 */
export interface FormProviderProps {
  children: React.ReactNode;
  config: FormConfig;
  initialValues?: Record<string, any>;
}

/**
 * Form Provider Component
 * 
 * Provides form state and dispatch function to all child components
 */
export function FormProvider({ children, config, initialValues = {} }: FormProviderProps) {
  const initialState: FormState = {
    config,
    values: initialValues,
    errors: {},
    touched: {},
    isDirty: false,
    isSubmitting: false,
    isSubmitted: false,
    isValid: true,
  };

  const [state, dispatch] = useReducer(formReducer, initialState);
  
  const contextValue = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <FormContext.Provider value={contextValue}>
      {children}
    </FormContext.Provider>
  );
}

/**
 * useFormContext Hook
 * 
 * Hook for accessing the form context
 */
export function useFormContext() {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useFormContext must be used within a FormProvider');
  }
  return context;
}
