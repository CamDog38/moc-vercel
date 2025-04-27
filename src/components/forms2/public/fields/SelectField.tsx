import React, { useEffect, useState } from 'react';
import { FieldConfig, FieldOption } from '@/lib/forms2/core/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { parseOptions, normalizeOption } from '../helpers/optionsHelper';

interface SelectFieldProps {
  field: FieldConfig;
  value: any;
  error?: string;
  onChange: (value: any) => void;
  displayLabel: string;
}

export const SelectField: React.FC<SelectFieldProps> = ({ 
  field, 
  value, 
  error, 
  onChange,
  displayLabel
}) => {
  // State to store the parsed options
  const [options, setOptions] = useState<FieldOption[]>([]);
  const [internalValue, setInternalValue] = useState<string>('placeholder');

  // State is initialized with placeholder

  // Parse options when the field changes
  useEffect(() => {
    // Only log in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log(`Parsing options for field ${field.id}`);
    }
    const parsedOptions = parseOptions((field as any).options, field.id, field.label);
    setOptions(parsedOptions);
  }, [field.id, JSON.stringify((field as any).options)]);
  
  // Sync internal state with prop value
  useEffect(() => {
    // Check if value is valid and different from current internal value
    if (value !== undefined && value !== null && value !== '' && value !== internalValue) {
      setInternalValue(value);
    } else if ((value === undefined || value === null || value === '') && internalValue !== 'placeholder') {
      setInternalValue('placeholder');
    }
  }, [value, field.id, internalValue]);
  
  // Handle value change
  const handleValueChange = (newValue: string) => {
    setInternalValue(newValue);
    
    // Only pass actual values to onChange, not the placeholder
    const finalValue = newValue === 'placeholder' ? '' : newValue;
    
    // Pass the value to parent component
    onChange(finalValue);
  };

  return (
    <div className="mb-4" key={field.id}>
      <div className="space-y-2">
        <Label htmlFor={field.id} className="text-sm font-medium">
          {displayLabel}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <Select
          value={internalValue}
          onValueChange={handleValueChange}
          name={field.id}
        >
          <SelectTrigger className={error ? "border-destructive" : ""}>
            <SelectValue placeholder={field.placeholder || "Select an option"} />
          </SelectTrigger>
          <SelectContent>
            {/* Add a placeholder option at the top */}
            <SelectItem value="placeholder">Select an option</SelectItem>
            
            {options.length > 0 ? 
              options.map((option) => {
                // Ensure we're working with a properly normalized option
                // This is critical for preventing [object Object] display issues
                let normalizedOption;
                try {
                  // First try to normalize the option
                  normalizedOption = normalizeOption(option);
                  
                  // If we still have an object without proper string values, create a readable version
                  if (typeof normalizedOption.label === 'object') {
                    const stringProps = Object.entries(normalizedOption.label)
                      .filter(([_, v]) => typeof v === 'string' || typeof v === 'number')
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(', ');
                    
                    normalizedOption.label = stringProps || 'Option';
                    normalizedOption.value = String(normalizedOption.value || normalizedOption.id || Math.random());
                  }
                } catch (e) {
                  // Fallback if normalization fails
                  console.error(`Failed to normalize option for field ${field.id}:`, e);
                  normalizedOption = {
                    id: `option-${Math.random().toString(36).substring(2, 9)}`,
                    value: `option-${Math.random().toString(36).substring(2, 9)}`,
                    label: 'Option'
                  };
                }
                
                // Skip empty values
                if (!normalizedOption.value && !normalizedOption.label) {
                  return null;
                }
                
                // Only log in development mode and only once during initial render
                // Remove this logging to prevent console spam
                
                return (
                  <SelectItem 
                    key={normalizedOption.id || normalizedOption.value || String(Math.random())}
                    value={normalizedOption.value}
                  >
                    {typeof normalizedOption.label === 'string' ? normalizedOption.label : (normalizedOption.value || "Option")}
                  </SelectItem>
                );
              }) : (
                <SelectItem value="no-options" disabled>No options available</SelectItem>
              )
            }
          </SelectContent>
        </Select>
        {field.helpText && (
          <p id={`${field.id}-description`} className="text-sm text-muted-foreground">
            {field.helpText}
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
};
