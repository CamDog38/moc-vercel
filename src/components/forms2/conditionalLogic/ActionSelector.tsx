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

export const ActionSelector: React.FC = () => {
  const { state, updateState, onChange } = useConditionalLogic();

  const handleActionChange = (action: 'show' | 'hide') => {
    console.log(`Action changed to: ${action}`);
    
    // Update local state
    updateState({ action });
    
    // Notify parent component with the updated conditional logic
    if (onChange) {
      // Create updated conditional logic directly
      const updatedLogic = {
        action: action,
        when: {
          field: state.fieldId,
          fieldLabel: state.fieldLabel,
          operator: state.operator,
          value: state.value
        }
      };
      console.log('Updated conditional logic:', updatedLogic);
      onChange(updatedLogic);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="action" className="text-sm font-medium">Action</Label>
      <Select 
        value={state.action || 'show'} 
        onValueChange={(val) => handleActionChange(val as 'show' | 'hide')}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select action" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="show">Show this field</SelectItem>
          <SelectItem value="hide">Hide this field</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default ActionSelector;
