import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useConditionalLogic } from './ConditionalLogicContext';
import { createConditionalLogic } from './helpers';

export const EnableSwitch: React.FC = () => {
  const { enabled, setEnabled, state, onChange } = useConditionalLogic();

  const handleEnableChange = (checked: boolean) => {
    setEnabled(checked);
    
    if (checked) {
      // If enabling, create a new conditional logic object
      const newValue = createConditionalLogic(state);
      onChange(newValue);
    } else {
      // If disabling, remove the conditional logic
      onChange(undefined);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Switch 
        id="conditional-logic-enabled"
        checked={enabled}
        onCheckedChange={handleEnableChange}
      />
      <Label htmlFor="conditional-logic-enabled" className="text-sm">
        Show or hide this field based on other field values
      </Label>
    </div>
  );
};

export default EnableSwitch;
