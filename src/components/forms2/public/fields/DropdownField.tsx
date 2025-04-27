import React, { useState } from 'react';
import { FieldConfig } from '@/lib/forms2/core/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { parseOptions, normalizeOption } from '../helpers/optionsHelper';

interface DropdownFieldProps {
  field: FieldConfig;
  value: any;
  error?: string;
  onChange: (fieldId: string, value: any) => void;
  displayLabel: string;
}

export const DropdownField: React.FC<DropdownFieldProps> = ({ 
  field, 
  value, 
  error, 
  onChange,
  displayLabel
}) => {
  const [isAddingOption, setIsAddingOption] = useState(false);
  const [newOptionValue, setNewOptionValue] = useState('');
  
  // Parse options using the helper function
  // Using type assertion to handle the options property
  const parsedOptions = parseOptions((field as any).options, field.id, field.label);
  
  // Function to handle adding a new option
  const handleAddOption = () => {
    if (!newOptionValue.trim()) return;
    
    // Create a new option
    const newOption = {
      id: `option-${Date.now()}`,
      value: newOptionValue,
      label: newOptionValue
    };
    
    // Update the field with the new option
    // This would typically call a backend API to save the new option
    const updatedOptions = [...parsedOptions, newOption];
    
    // Here you would call your backend API to save the new option
    // For now, we'll just update the local state
    console.log('Adding new option:', newOption);
    console.log('Updated options:', updatedOptions);
    
    // Reset the new option input
    setNewOptionValue('');
    setIsAddingOption(false);
    
    // Select the newly added option
    onChange(field.id, newOption.value);
  };
  
  return (
    <div className="mb-4" key={field.id}>
      <div className="space-y-2">
        <Label htmlFor={field.id} className="text-sm font-medium">
          {displayLabel}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <div className="relative">
          <Select
            value={value || ''}
            onValueChange={(value) => onChange(field.id, value)}
          >
            <SelectTrigger className={error ? "border-destructive" : ""}>
              <SelectValue placeholder={field.placeholder || "Select an option"} />
            </SelectTrigger>
            <SelectContent>
              {parsedOptions.length > 0 ? 
                parsedOptions.map((option) => {
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
                  
                  return (
                    <SelectItem 
                      key={normalizedOption.id || normalizedOption.value || String(Math.random())}
                      value={normalizedOption.value}
                    >
                      {typeof normalizedOption.label === 'string' ? normalizedOption.label : (normalizedOption.value || "Option")}
                    </SelectItem>
                  );
                }) : (
                  <SelectItem value="no-options">No options available</SelectItem>
                )
              }
              {/* Option to add a new value */}
              <div className="px-2 py-1.5 border-t">
                {isAddingOption ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Enter new option"
                      value={newOptionValue}
                      onChange={(e) => setNewOptionValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddOption();
                        }
                      }}
                      autoFocus
                    />
                    <Button 
                      type="button" 
                      size="sm" 
                      onClick={handleAddOption}
                    >
                      Add
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                    onClick={() => setIsAddingOption(true)}
                  >
                    <PlusCircle className="h-4 w-4" />
                    <span>Add new option</span>
                  </button>
                )}
              </div>
            </SelectContent>
          </Select>
        </div>
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
