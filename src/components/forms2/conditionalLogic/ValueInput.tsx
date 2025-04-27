import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useConditionalLogic } from './ConditionalLogicContext';
import { createConditionalLogic, operatorRequiresValue, getOptionKey } from './helpers';

export const ValueInput: React.FC = () => {
  const { state, updateState, onChange, hasOptions, fieldOptions, selectedField, dispatch } = useConditionalLogic();

  // Don't render if the operator doesn't require a value
  if (!operatorRequiresValue(state.operator)) {
    return null;
  }
  
  // Log information about the current state for debugging
  React.useEffect(() => {
    console.log('[VALUE INPUT] Current state:', state);
    
    // Determine if this field should have options (dropdown, radio, etc.)
    // Check both the field type and if options are available
    const isDropdownType = selectedField?.type === 'select' || 
                         selectedField?.type === 'radio' || 
                         selectedField?.type === 'checkbox';
    
    // Force hasOptions to true for dropdown-type fields
    const shouldHaveOptions = isDropdownType || (fieldOptions && fieldOptions.length > 0);
    
    console.log('[VALUE INPUT] Field type:', selectedField?.type);
    console.log('[VALUE INPUT] Should have options:', shouldHaveOptions);
    console.log('[VALUE INPUT] Has options (context):', hasOptions);
    console.log('[VALUE INPUT] Field options available:', fieldOptions?.length > 0);
    
    if (shouldHaveOptions) {
      console.log('[VALUE INPUT] Field options:', fieldOptions);
      console.log('[VALUE INPUT] Current value:', state.value);
      console.log('[VALUE INPUT] Selected field:', selectedField);
    }
  }, [hasOptions, fieldOptions, state.value, selectedField, state]);

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log('[VALUE INPUT] Input value changed to:', value);
    
    // Update local state
    updateState({ value });
    
    // Notify parent component with the updated conditional logic
    if (onChange) {
      // Create updated conditional logic directly instead of using helper
      const updatedLogic = {
        action: state.action,
        when: {
          field: state.fieldId,
          fieldLabel: state.fieldLabel,
          operator: state.operator,
          value: value
        }
      };
      console.log('[VALUE INPUT] Updated conditional logic:', updatedLogic);
      onChange(updatedLogic);
    }
    
    // Also update the form state directly
    if (dispatch && value) {
      console.log('[VALUE INPUT] Dispatching text input value to form state:', value);
      dispatch({ 
        type: 'SET_FIELD_VALUE', 
        fieldId: `when.value.${state.fieldId}`, 
        value: value 
      });
    }
  };

  const handleSelectValueChange = (value: string) => {
    console.log('[VALUE INPUT] Select value changed to:', value);
    console.log('[VALUE INPUT] Previous value was:', state.value);
    
    // Find the selected option to get its label
    const selectedOption = fieldOptions.find(opt => 
      opt.value === value || 
      opt.value?.toLowerCase() === value?.toLowerCase()
    );
    console.log('[VALUE INPUT] Selected option:', selectedOption);
    
    // Check if the value is empty
    if (!value && state.value) {
      console.log('[VALUE INPUT] WARNING: Empty value detected, preserving previous value:', state.value);
      // Preserve the previous value
      return;
    }
    
    // Update local state
    console.log('[VALUE INPUT] Updating state with value:', value);
    updateState({ value });
    
    // Notify parent component
    if (onChange) {
      // Create updated conditional logic directly instead of using helper
      const updatedLogic = {
        action: state.action,
        when: {
          field: state.fieldId,
          fieldLabel: state.fieldLabel,
          operator: state.operator,
          value: value
        }
      };
      console.log('[VALUE INPUT] Updated conditional logic:', updatedLogic);
      onChange(updatedLogic);
    }
    
    // Force the value to be preserved in the form state
    if (value && dispatch) {
      console.log('[VALUE INPUT] Dispatching value to form state:', value);
      dispatch({ 
        type: 'SET_FIELD_VALUE', 
        fieldId: `when.value.${state.fieldId}`, 
        value: value 
      });
    }
  };

  // Determine if this field should have options (dropdown, radio, etc.)
  // Check both the field type and if options are available
  const isDropdownType = selectedField?.type === 'select' || 
                       selectedField?.type === 'radio' || 
                       selectedField?.type === 'checkbox';
  
  // Force hasOptions to true for dropdown-type fields
  const shouldHaveOptions = isDropdownType || (fieldOptions && fieldOptions.length > 0);
  
  return (
    <div className="space-y-2">
      <Label htmlFor="value" className="text-sm font-medium">Value</Label>
      {shouldHaveOptions ? (
        <Select 
          value={state.value || ''} 
          onValueChange={handleSelectValueChange}
          defaultOpen={false}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select value">
              {/* Display the label for the selected value if possible */}
              {state.value && fieldOptions.find(opt => 
                opt.value === state.value || 
                opt.value?.toLowerCase() === state.value?.toLowerCase()
              )?.label || state.value}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {/* Always show the current value at the top if it exists */}
            {state.value && !fieldOptions.some(opt => 
              opt.value === state.value || 
              opt.value?.toLowerCase() === state.value?.toLowerCase()
            ) && (
              <SelectItem 
                key={`current-${state.value}`} 
                value={state.value}
                className="font-medium bg-muted/50"
              >
                {state.value} (Current Value)
              </SelectItem>
            )}
            
            {/* Show all available options */}
            {fieldOptions.map((option) => {
              // Check if this option matches the current value (case insensitive)
              const isSelected = state.value && (
                option.value === state.value || 
                option.value?.toLowerCase() === state.value?.toLowerCase()
              );
              
              return (
                <SelectItem 
                  key={getOptionKey(option)} 
                  value={option.value}
                  className={isSelected ? 'font-medium bg-muted/50' : ''}
                >
                  {option.label} {isSelected ? '(Current Value)' : ''}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      ) : (
        <Input 
          id="value"
          value={state.value || ''} 
          onChange={handleValueChange} 
          placeholder="Enter value"
          className="w-full"
        />
      )}
    </div>
  );
};

export default ValueInput;
