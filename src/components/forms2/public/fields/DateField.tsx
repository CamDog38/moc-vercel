import React from 'react';
import { FieldConfig } from '@/lib/forms2/core/types';
import { DateTimePickerField } from '@/components/forms2/ui/DateTimePickerField';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DateFieldProps {
  field: FieldConfig;
  value: any;
  error?: string;
  onChange: (fieldId: string, value: any) => void;
  displayLabel: string;
}

export const DateField: React.FC<DateFieldProps> = ({ 
  field, 
  value, 
  error, 
  onChange,
  displayLabel
}) => {
  // Handle initial value and value changes
  const [internalValue, setInternalValue] = React.useState<string>(value || '');
  
  // Initialize with current date if value is invalid or missing
  React.useEffect(() => {
    // Check if value is missing, equal to the field ID, or otherwise invalid
    if (!value || value === field.id || !isValidDateString(value)) {
      // Set a default date (today) to ensure we have a valid date for booking forms
      const today = new Date().toISOString().split('T')[0];
      console.log(`Initializing date field ${field.id} with default value:`, today);
      setInternalValue(today);
      onChange(field.id, today);
    } else {
      setInternalValue(value);
    }
  }, [field.id, value, onChange]);
  
  // Function to check if a string is a valid date
  const isValidDateString = (dateStr: string): boolean => {
    if (!dateStr) return false;
    
    // If it's just the field ID, it's not valid
    if (dateStr === field.id) return false;
    
    // Check if it's a valid date string
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  };
  // Common props for date fields
  const commonProps = {
    id: field.id,
    name: field.id,
    disabled: field.disabled,
    required: field.required,
    placeholder: field.placeholder,
    'aria-describedby': field.helpText ? `${field.id}-description` : undefined,
  };
  
  // Only handle pure date fields in this component
  // DateTimeField handles datetime-local fields and time fields are handled separately
  const isTimeField = (field.type as string) === 'time';
  
  // For time-only fields, use a specialized time input
  if (isTimeField) {
    return (
      <div className="mb-4" key={field.id}>
        <div className="space-y-2">
          <Label htmlFor={field.id} className="text-sm font-medium">
            {displayLabel}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Input
            {...commonProps}
            type="time"
            value={value || ''}
            onChange={(e) => onChange(field.id, e.target.value)}
            className={error ? "border-destructive" : ""}
          />
          {field.helpText && (
            <p id={`${field.id}-description`} className="text-sm text-muted-foreground">
              {field.helpText}
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </div>
    );
  }
  
  // For date fields, use our custom DateTimePickerField but with time disabled
  return (
    <DateTimePickerField
      id={field.id}
      label={displayLabel}
      value={internalValue}
      onChange={(value) => {
        setInternalValue(value);
        onChange(field.id, value);
      }}
      required={field.required}
      disabled={field.disabled}
      placeholder={field.placeholder}
      helpText={field.helpText}
      error={error}
      includeTime={false} // Never include time for regular date fields
      allowTimeToggle={false} // Never allow time toggle for regular date fields
    />
  );
};
