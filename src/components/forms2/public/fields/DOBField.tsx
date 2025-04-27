import React from 'react';
import { FieldConfig } from '@/lib/forms2/core/types';
import { DateOfBirthField } from '@/components/forms2/ui/DateOfBirthField';

interface DOBFieldProps {
  field: FieldConfig;
  value: any;
  error?: string;
  onChange: (fieldId: string, value: any) => void;
  displayLabel: string;
}

export const DOBField: React.FC<DOBFieldProps> = ({ 
  field, 
  value, 
  error, 
  onChange,
  displayLabel
}) => {
  console.log('Rendering DOB field:', field);
  
  return (
    <DateOfBirthField
      id={field.id}
      label={displayLabel}
      value={value || ''}
      onChange={(value) => onChange(field.id, value)}
      required={field.required}
      disabled={field.disabled}
      placeholder={field.placeholder}
      helpText={field.helpText}
      error={error}
      dateFormat={(field as any).dateFormat || 'dd/MM/yyyy'}
      isBuilder={false} // This is the public form view
    />
  );
};
