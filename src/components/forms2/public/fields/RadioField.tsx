import React, { useEffect, useState } from 'react';
import { FieldConfig, FieldOption } from '@/lib/forms2/core/types';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { parseOptions, normalizeOption } from '../helpers/optionsHelper';

interface RadioFieldProps {
  field: FieldConfig;
  value: any;
  error?: string;
  onChange: (fieldId: string, value: any) => void;
  displayLabel: string;
}

export const RadioField: React.FC<RadioFieldProps> = ({ 
  field, 
  value, 
  error, 
  onChange,
  displayLabel
}) => {
  // State to store the parsed options
  const [options, setOptions] = useState<FieldOption[]>([]);

  // Effect to parse options when the field changes
  useEffect(() => {
    // Parse options using the helper function
    // Using type assertion to handle the options property
    const parsedOptions = parseOptions((field as any).options, field.id, field.label);
    
    // Log the options for debugging
    console.log('Radio field options for', field.id, parsedOptions);
    
    // Set the options in state
    setOptions(parsedOptions);
  }, [field]);
  
  return (
    <div className="mb-4" key={field.id}>
      <div className="space-y-2">
        <Label htmlFor={field.id} className="text-sm font-medium">
          {displayLabel}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <RadioGroup
          value={value || ''}
          onValueChange={(value) => onChange(field.id, value)}
          className="flex flex-col space-y-1"
        >
          {options.length > 0 ? options.map((option) => {
            // Normalize option values
            const normalizedOption = normalizeOption(option);
            
            return (
              <div 
                key={normalizedOption.value || String(Math.random())} 
                className="flex items-center space-x-3 space-y-0"
              >
                <RadioGroupItem 
                  value={normalizedOption.value} 
                  id={`${field.id}-${normalizedOption.value}`} 
                />
                <Label 
                  htmlFor={`${field.id}-${normalizedOption.value}`} 
                  className="text-sm font-normal"
                >
                  {normalizedOption.label}
                </Label>
              </div>
            );
          }) : (
            <div className="text-sm text-muted-foreground">No options available</div>
          )}
        </RadioGroup>
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
