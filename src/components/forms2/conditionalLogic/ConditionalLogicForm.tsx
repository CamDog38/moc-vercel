import React from 'react';
import { Card } from '@/components/ui/card';
import { useConditionalLogic } from './ConditionalLogicContext';
import ActionSelector from './ActionSelector';
import FieldSelector from './FieldSelector';
import OperatorSelector from './OperatorSelector';
import ValueInput from './ValueInput';

export const ConditionalLogicForm: React.FC = () => {
  const { enabled, value } = useConditionalLogic();

  // Only render if conditional logic is enabled and we have a value
  if (!enabled || !value) {
    return null;
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <ActionSelector />
        <FieldSelector />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <OperatorSelector />
        <ValueInput />
      </div>
    </Card>
  );
};

export default ConditionalLogicForm;
