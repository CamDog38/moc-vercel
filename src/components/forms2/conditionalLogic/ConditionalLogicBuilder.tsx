import React from 'react';
import { ConditionalLogic, FieldConfig } from '@/lib/forms2/core/types';
import { ConditionalLogicProvider } from './ConditionalLogicContext';
import EnableSwitch from './EnableSwitch';
import ConditionalLogicForm from './ConditionalLogicForm';

interface ConditionalLogicBuilderProps {
  value?: ConditionalLogic;
  onChange: (conditionalLogic: ConditionalLogic | undefined) => void;
  availableFields: FieldConfig[];
  currentFieldId: string;
}

/**
 * ConditionalLogicBuilder Component
 * 
 * This component allows building conditional logic for form fields.
 * It has been refactored into smaller components for better maintainability.
 * 
 * @param props Component props
 * @returns React component
 */
const ConditionalLogicBuilder: React.FC<ConditionalLogicBuilderProps> = (props) => {
  return (
    <ConditionalLogicProvider {...props}>
      <div className="space-y-4">
        <EnableSwitch />
        <ConditionalLogicForm />
      </div>
    </ConditionalLogicProvider>
  );
};

export default ConditionalLogicBuilder;
