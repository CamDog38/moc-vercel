# Phase 1: Core Architecture Technical Specification

## Overview

This document provides a detailed technical specification for Phase 1 of the form system refactoring. Phase 1 focuses on establishing the core architecture, form state management, and field registry that will serve as the foundation for the new form system.

## Directory Structure

```
/components/forms/
  /core/
    FormProvider.tsx       # Context provider for form state
    FormContext.tsx        # Context definition and hooks
    types.ts               # Type definitions for the form system
    fieldRegistry.ts       # Registry of available field types
    formReducer.ts         # State management reducer
    formActions.ts         # Action creators for form state
    formSelectors.ts       # Selectors for accessing form state
  /utils/
    fieldUtils.ts          # Utility functions for fields
    validationUtils.ts     # Utility functions for validation
    idUtils.ts             # Utility functions for ID generation
  /hooks/
    useField.ts            # Hook for field state and actions
    useForm.ts             # Hook for form state and actions
    useValidation.ts       # Hook for validation state
```

## Core Types

### Form Types

```typescript
// components/forms/core/types.ts

export type FieldType = 
  | 'text'
  | 'textarea'
  | 'email'
  | 'tel'
  | 'number'
  | 'date'
  | 'time'
  | 'datetime'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'radio'
  | 'file'
  | 'hidden';

export interface FieldValidation {
  required?: string | boolean;
  minLength?: { value: number; message: string };
  maxLength?: { value: number; message: string };
  min?: { value: number; message: string };
  max?: { value: number; message: string };
  pattern?: { value: RegExp; message: string };
  validate?: (value: any) => string | boolean | Promise<string | boolean>;
}

export interface FieldOption {
  id: string;
  label: string;
  value: string;
}

export interface FieldMapping {
  type: 'name' | 'email' | 'phone' | 'date' | 'time' | 'location' | 'location_office' | 'datetime' | 'custom';
  value: string;
  customKey?: string; // Allow setting a custom mapping key
}

export interface ConditionalLogic {
  fieldId: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'notContains' | 'greaterThan' | 'lessThan' | 'isEmpty' | 'isNotEmpty';
  value: string;
  action: 'show' | 'hide';
}

export interface BaseFieldConfig {
  id: string;
  type: FieldType;
  name: string;
  label: string;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  defaultValue?: any;
  validation?: FieldValidation;
  mapping?: FieldMapping;
  conditionalLogic?: ConditionalLogic;
  stableId?: string;
  inUseByRules?: boolean;
  metadata?: Record<string, any>;
}

export interface TextFieldConfig extends BaseFieldConfig {
  type: 'text';
  maxLength?: number;
  minLength?: number;
}

export interface EmailFieldConfig extends BaseFieldConfig {
  type: 'email';
}

export interface TelFieldConfig extends BaseFieldConfig {
  type: 'tel';
  format?: string;
}

export interface NumberFieldConfig extends BaseFieldConfig {
  type: 'number';
  min?: number;
  max?: number;
  step?: number;
}

export interface DateFieldConfig extends BaseFieldConfig {
  type: 'date' | 'time' | 'datetime';
  min?: string;
  max?: string;
  excludeTime?: boolean;
}

export interface SelectFieldConfig extends BaseFieldConfig {
  type: 'select' | 'multiselect';
  options: FieldOption[];
  allowOther?: boolean;
}

export interface CheckboxFieldConfig extends BaseFieldConfig {
  type: 'checkbox';
  options?: FieldOption[];
}

export interface RadioFieldConfig extends BaseFieldConfig {
  type: 'radio';
  options: FieldOption[];
  allowOther?: boolean;
}

export interface FileFieldConfig extends BaseFieldConfig {
  type: 'file';
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
}

export interface HiddenFieldConfig extends BaseFieldConfig {
  type: 'hidden';
}

export type FieldConfig = 
  | TextFieldConfig
  | EmailFieldConfig
  | TelFieldConfig
  | NumberFieldConfig
  | DateFieldConfig
  | SelectFieldConfig
  | CheckboxFieldConfig
  | RadioFieldConfig
  | FileFieldConfig
  | HiddenFieldConfig;

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FieldConfig[];
  order: number;
  conditionalLogic?: ConditionalLogic;
}

export interface FormConfig {
  id: string;
  title: string;
  description?: string;
  sections: FormSection[];
  isMultiPage?: boolean;
  submitButtonText?: string;
  successMessage?: string;
  version: 'modern';
  metadata?: Record<string, any>;
}

export interface FormState {
  config: FormConfig;
  values: Record<string, any>;
  errors: Record<string, string | undefined>;
  touched: Record<string, boolean>;
  isDirty: boolean;
  isSubmitting: boolean;
  isSubmitted: boolean;
  isValid: boolean;
}
```

### Form Context

```typescript
// components/forms/core/FormContext.tsx
import React, { createContext, useContext, useReducer, useMemo } from 'react';
import { FormState, FormConfig } from './types';
import { formReducer } from './formReducer';
import { FormAction } from './formActions';

interface FormContextValue {
  state: FormState;
  dispatch: React.Dispatch<FormAction>;
}

const FormContext = createContext<FormContextValue | undefined>(undefined);

export interface FormProviderProps {
  children: React.ReactNode;
  config: FormConfig;
  initialValues?: Record<string, any>;
}

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

export function useFormContext() {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useFormContext must be used within a FormProvider');
  }
  return context;
}
```

### Form Reducer

```typescript
// components/forms/core/formReducer.ts
import { FormState } from './types';
import { FormAction } from './formActions';

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
```

### Form Actions

```typescript
// components/forms/core/formActions.ts

export type FormAction =
  | { type: 'SET_FIELD_VALUE'; payload: { id: string; value: any } }
  | { type: 'SET_FIELD_ERROR'; payload: { id: string; error: string | undefined } }
  | { type: 'SET_FIELD_TOUCHED'; payload: { id: string } }
  | { type: 'RESET_FORM'; payload: { values?: Record<string, any> } }
  | { type: 'SET_SUBMITTING'; payload: { isSubmitting: boolean } }
  | { type: 'SET_SUBMITTED' };

export const setFieldValue = (id: string, value: any): FormAction => ({
  type: 'SET_FIELD_VALUE',
  payload: { id, value },
});

export const setFieldError = (id: string, error: string | undefined): FormAction => ({
  type: 'SET_FIELD_ERROR',
  payload: { id, error },
});

export const setFieldTouched = (id: string): FormAction => ({
  type: 'SET_FIELD_TOUCHED',
  payload: { id },
});

export const resetForm = (values?: Record<string, any>): FormAction => ({
  type: 'RESET_FORM',
  payload: { values },
});

export const setSubmitting = (isSubmitting: boolean): FormAction => ({
  type: 'SET_SUBMITTING',
  payload: { isSubmitting },
});

export const setSubmitted = (): FormAction => ({
  type: 'SET_SUBMITTED',
});
```

## Field Registry

```typescript
// components/forms/core/fieldRegistry.ts
import { FieldType, FieldConfig } from './types';

interface FieldRegistryEntry {
  type: FieldType;
  displayName: string;
  description: string;
  icon: string;
  defaultConfig: (id: string) => Partial<FieldConfig>;
  validate?: (value: any, config: FieldConfig) => string | undefined;
}

class FieldRegistryClass {
  private registry: Map<FieldType, FieldRegistryEntry> = new Map();

  register(entry: FieldRegistryEntry): void {
    this.registry.set(entry.type, entry);
  }

  get(type: FieldType): FieldRegistryEntry | undefined {
    return this.registry.get(type);
  }

  getAll(): FieldRegistryEntry[] {
    return Array.from(this.registry.values());
  }

  getTypes(): FieldType[] {
    return Array.from(this.registry.keys());
  }

  createDefaultConfig(type: FieldType, id: string): Partial<FieldConfig> {
    const entry = this.get(type);
    if (!entry) {
      throw new Error(`Field type "${type}" is not registered`);
    }
    return entry.defaultConfig(id);
  }

  validate(value: any, config: FieldConfig): string | undefined {
    const entry = this.get(config.type);
    if (!entry || !entry.validate) {
      return undefined;
    }
    return entry.validate(value, config);
  }
}

export const FieldRegistry = new FieldRegistryClass();

// Register default field types
FieldRegistry.register({
  type: 'text',
  displayName: 'Text',
  description: 'Single line text input',
  icon: 'text-icon',
  defaultConfig: (id) => ({
    id,
    type: 'text',
    name: `text_${id}`,
    label: 'Text Field',
    placeholder: 'Enter text',
  }),
  validate: (value, config) => {
    if (config.required && (!value || value === '')) {
      return typeof config.required === 'string' 
        ? config.required 
        : 'This field is required';
    }
    return undefined;
  },
});

// Register more field types...
```

## Hooks

### useField Hook

```typescript
// components/forms/hooks/useField.ts
import { useCallback } from 'react';
import { useFormContext } from '../core/FormContext';
import { setFieldValue, setFieldError, setFieldTouched } from '../core/formActions';
import { FieldConfig } from '../core/types';
import { FieldRegistry } from '../core/fieldRegistry';

export function useField(id: string) {
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
  
  const setValue = useCallback((newValue: any) => {
    dispatch(setFieldValue(id, newValue));
    
    // Validate the field
    const validationError = FieldRegistry.validate(newValue, fieldConfig);
    if (validationError !== error) {
      dispatch(setFieldError(id, validationError));
    }
  }, [dispatch, id, fieldConfig, error]);
  
  const setError = useCallback((error: string | undefined) => {
    dispatch(setFieldError(id, error));
  }, [dispatch, id]);
  
  const setTouched = useCallback(() => {
    dispatch(setFieldTouched(id));
  }, [dispatch, id]);
  
  return {
    value,
    error,
    touched,
    setValue,
    setError,
    setTouched,
    config: fieldConfig,
  };
}
```

### useForm Hook

```typescript
// components/forms/hooks/useForm.ts
import { useCallback } from 'react';
import { useFormContext } from '../core/FormContext';
import { resetForm, setSubmitting, setSubmitted } from '../core/formActions';
import { FieldRegistry } from '../core/fieldRegistry';

export function useForm() {
  const { state, dispatch } = useFormContext();
  
  const reset = useCallback((values?: Record<string, any>) => {
    dispatch(resetForm(values));
  }, [dispatch]);
  
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
  
  return {
    values: state.values,
    errors: state.errors,
    touched: state.touched,
    isDirty: state.isDirty,
    isSubmitting: state.isSubmitting,
    isSubmitted: state.isSubmitted,
    isValid: state.isValid,
    reset,
    validateForm,
    handleSubmit,
  };
}
```

## Utility Functions

### ID Utilities

```typescript
// components/forms/utils/idUtils.ts

/**
 * Generates a unique ID for a field
 */
export function generateFieldId(): string {
  return `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generates a stable ID for a field based on its properties
 */
export function generateStableId(fieldConfig: { type: string; label: string; name?: string }): string {
  const { type, label, name } = fieldConfig;
  
  // Use name if available, otherwise use label
  const baseText = name || label;
  
  // Convert to camelCase
  const camelCase = baseText
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/[^a-zA-Z0-9]+/g, '')
    .replace(/^[A-Z]/, firstChar => firstChar.toLowerCase());
  
  // Add type prefix for clarity
  return `${type}_${camelCase}`;
}
```

### Validation Utilities

```typescript
// components/forms/utils/validationUtils.ts

/**
 * Validates an email address
 */
export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Validates a phone number
 */
export function validatePhone(phone: string): boolean {
  const re = /^\+?[0-9]{10,15}$/;
  return re.test(phone.replace(/[^0-9+]/g, ''));
}

/**
 * Validates a date string
 */
export function validateDate(date: string): boolean {
  const d = new Date(date);
  return !isNaN(d.getTime());
}

/**
 * Creates a validation function for a field
 */
export function createValidator(config: any) {
  return (value: any): string | undefined => {
    // Required validation
    if (config.required && (!value || value === '')) {
      return typeof config.required === 'string' 
        ? config.required 
        : 'This field is required';
    }
    
    // Skip other validations if value is empty and not required
    if (!value || value === '') {
      return undefined;
    }
    
    // Type-specific validation
    switch (config.type) {
      case 'email':
        if (!validateEmail(value)) {
          return 'Please enter a valid email address';
        }
        break;
        
      case 'tel':
        if (!validatePhone(value)) {
          return 'Please enter a valid phone number';
        }
        break;
        
      case 'date':
        if (!validateDate(value)) {
          return 'Please enter a valid date';
        }
        break;
        
      case 'number':
        const num = parseFloat(value);
        if (isNaN(num)) {
          return 'Please enter a valid number';
        }
        if (config.min !== undefined && num < config.min) {
          return `Value must be at least ${config.min}`;
        }
        if (config.max !== undefined && num > config.max) {
          return `Value must be at most ${config.max}`;
        }
        break;
        
      case 'text':
      case 'textarea':
        if (config.minLength && value.length < config.minLength) {
          return `Must be at least ${config.minLength} characters`;
        }
        if (config.maxLength && value.length > config.maxLength) {
          return `Must be at most ${config.maxLength} characters`;
        }
        break;
    }
    
    // Custom validation
    if (config.validation?.validate) {
      const result = config.validation.validate(value);
      if (typeof result === 'string') {
        return result;
      }
      if (result === false) {
        return 'Invalid value';
      }
    }
    
    return undefined;
  };
}
```

## Unit Tests

```typescript
// __tests__/components/forms/core/FormContext.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FormProvider, useFormContext } from '@/components/forms/core/FormContext';
import { setFieldValue } from '@/components/forms/core/formActions';

// Test component that uses the form context
function TestComponent() {
  const { state, dispatch } = useFormContext();
  
  return (
    <div>
      <div data-testid="value">{state.values.test || 'empty'}</div>
      <button 
        onClick={() => dispatch(setFieldValue('test', 'updated'))}
        data-testid="update-button"
      >
        Update
      </button>
    </div>
  );
}

describe('FormContext', () => {
  it('provides form state to children', () => {
    render(
      <FormProvider 
        config={{
          id: 'test-form',
          title: 'Test Form',
          sections: [],
          version: 'modern',
        }}
        initialValues={{ test: 'initial' }}
      >
        <TestComponent />
      </FormProvider>
    );
    
    expect(screen.getByTestId('value')).toHaveTextContent('initial');
  });
  
  it('updates form state when dispatch is called', () => {
    render(
      <FormProvider 
        config={{
          id: 'test-form',
          title: 'Test Form',
          sections: [],
          version: 'modern',
        }}
        initialValues={{ test: 'initial' }}
      >
        <TestComponent />
      </FormProvider>
    );
    
    fireEvent.click(screen.getByTestId('update-button'));
    
    expect(screen.getByTestId('value')).toHaveTextContent('updated');
  });
});
```

## Next Steps

After implementing the core architecture in Phase 1, we will proceed to Phase 2 to implement the individual field components. The core architecture established in Phase 1 will provide the foundation for the rest of the form system refactoring.

Key deliverables from Phase 1 will be:

1. A robust form state management system
2. A flexible field type registry
3. Core utility functions for validation and ID generation
4. Unit tests for all core components

These components will enable us to build a modular, maintainable form system that addresses the current issues with the monolithic FormBuilder component.
