import React from 'react';
import { FieldConfig } from '@/lib/forms2/core/types';
import { DateTimePickerField } from '@/components/forms2/ui/DateTimePickerField';
import { Label } from "@/components/ui/label";

interface DateTimeFieldProps {
  field: FieldConfig;
  value: any;
  error?: string;
  onChange: (fieldId: string, value: any) => void;
  displayLabel: string;
}

export const DateTimeField: React.FC<DateTimeFieldProps> = ({ 
  field, 
  value, 
  error, 
  onChange,
  displayLabel
}) => {
  // Handle initial value and value changes
  const [internalValue, setInternalValue] = React.useState<string>(value || '');
  const [isInitialized, setIsInitialized] = React.useState<boolean>(false);
  
  // Only initialize with current date once if value is invalid or missing
  React.useEffect(() => {
    // Skip if already initialized
    if (isInitialized) return;
    
    // Check if value is missing, equal to the field ID, or otherwise invalid
    if (!value || value === field.id || !isValidDateString(value)) {
      // Set a default date (today) to ensure we have a valid date for booking forms
      const today = new Date().toISOString().split('T')[0];
      
      // Only log in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log(`Initializing datetime field ${field.id} with default value:`, today);
      }
      
      setInternalValue(today);
      onChange(field.id, today);
      setIsInitialized(true);
    } else {
      setInternalValue(value);
      setIsInitialized(true);
    }
  }, [field.id, isInitialized]);
  
  // Function to check if a string is a valid date
  const isValidDateString = (dateStr: string): boolean => {
    if (!dateStr) return false;
    
    // If it's just the field ID, it's not valid
    if (dateStr === field.id) return false;
    
    // Check if it's a valid date string
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  };

  // This is specifically for the "Date & Time (with toggle)" field type
  return (
    <DateTimePickerField
      id={field.id}
      label={displayLabel}
      value={internalValue}
      onChange={(value) => {
        // Only update if the value actually changed
        if (value !== internalValue) {
          setInternalValue(value);
          onChange(field.id, value);
        }
      }}
      required={field.required}
      disabled={field.disabled}
      placeholder={field.placeholder}
      helpText={field.helpText}
      error={error}
      includeTime={true} // Always include time by default
      allowTimeToggle={true} // Always allow time toggle
    />
  );
};
