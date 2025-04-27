import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useConditionalLogic } from './ConditionalLogicContext';
import { createConditionalLogic } from './helpers';
import { ConditionalLogicOperator } from './types';

export const OperatorSelector: React.FC = () => {
  const { state, updateState, onChange } = useConditionalLogic();

  const handleOperatorChange = (operator: ConditionalLogicOperator) => {
    console.log(`Operator changed to: ${operator}`);
    
    // Update local state
    updateState({ operator });
    
    // Notify parent component with the updated conditional logic
    if (onChange) {
      // Create updated conditional logic directly
      const updatedLogic = {
        action: state.action,
        when: {
          field: state.fieldId,
          fieldLabel: state.fieldLabel,
          operator: operator,
          value: state.value
        }
      };
      console.log('Updated conditional logic:', updatedLogic);
      onChange(updatedLogic);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="operator" className="text-sm font-medium">Operator</Label>
      <Select 
        value={state.operator || 'equals'} 
        onValueChange={handleOperatorChange}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select operator" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="equals">Equals</SelectItem>
          <SelectItem value="not_equals">Not equals</SelectItem>
          <SelectItem value="contains">Contains</SelectItem>
          <SelectItem value="not_contains">Does not contain</SelectItem>
          <SelectItem value="greater_than">Greater than</SelectItem>
          <SelectItem value="less_than">Less than</SelectItem>
          <SelectItem value="is_empty">Is empty</SelectItem>
          <SelectItem value="is_not_empty">Is not empty</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default OperatorSelector;
