/**
 * Form Field Component
 * 
 * A wrapper component that renders the appropriate field component based on the field type.
 * This component has been refactored to use individual field components for better maintainability.
 */

import React from 'react';
import { FieldConfig, FormConfig } from '@/lib/forms2/core/types';

// Import all field components from the index file
import {
  TextField,
  TextareaField,
  SelectField,
  RadioField,
  CheckboxField,
  DateField,
  DateTimeField,
  DOBField,
  FileField
} from './fields';

// Import conditional logic helper
import { shouldShowField } from './helpers/conditionalLogicHelper';

interface FormFieldProps {
  field: FieldConfig;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  formValues: Record<string, any>;
  formConfig?: FormConfig;
}

export const FormField: React.FC<FormFieldProps> = ({ 
  field, 
  value, 
  onChange,
  error,
  formValues,
  formConfig
}) => {
  // Use the actual field label from the field configuration
  const displayLabel = field.label || field.name || 'Field';
  
  // Skip rendering if field is hidden
  if (field.hidden) return null;
  
  // Check if field should be conditionally shown/hidden based on its conditional logic
  if (field.conditionalLogic) {
    // Use the helper function to determine if the field should be shown
    const shouldShow = shouldShowField(field, formValues, formConfig);
    
    // If the field should be hidden, return null
    if (!shouldShow) {
      return null;
    }
  }

  // Render the appropriate field component based on the field type
  switch (field.type as string) {
    case 'text':
    case 'email':
    case 'tel':
    case 'number':
    case 'hidden':
      return (
        <TextField
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          displayLabel={displayLabel}
        />
      );
    case 'textarea':
      return (
        <TextareaField
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          displayLabel={displayLabel}
        />
      );
    case 'select':
    case 'multiselect':
      return (
        <SelectField
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          displayLabel={displayLabel}
        />
      );
    case 'radio':
      return (
        <RadioField
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          displayLabel={displayLabel}
        />
      );
    case 'checkbox':
      return (
        <CheckboxField
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          displayLabel={displayLabel}
        />
      );
    case 'date':
    case 'datetime':
    case 'time':
      return (
        <DateField
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          displayLabel={displayLabel}
        />
      );
    case 'datetime-local':
      return (
        <DateTimeField
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          displayLabel={displayLabel}
        />
      );
    case 'dob':
      return (
        <DOBField
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          displayLabel={displayLabel}
        />
      );
    case 'file':
      return (
        <FileField
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          displayLabel={displayLabel}
        />
      );
    default:
      console.warn(`Unknown field type: ${field.type as string}, falling back to TextField`);
      return (
        <TextField
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          displayLabel={displayLabel}
        />
      );
  }
};
