import { ConditionalLogic, FieldConfig } from '@/lib/forms2/core/types';

export type ConditionalLogicOperator = 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';

export interface ConditionalLogicState {
  fieldId: string;
  operator: ConditionalLogicOperator;
  value: string;
  action: 'show' | 'hide';
}

export interface ConditionalLogicContextType {
  state: ConditionalLogicState;
  updateState: (updates: Partial<ConditionalLogicState>) => void;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  availableFields: FieldConfig[];
  currentFieldId: string;
  value?: ConditionalLogic;
  onChange: (conditionalLogic: ConditionalLogic | undefined) => void;
  hasOptions: boolean;
  fieldOptions: any[];
  selectedField?: FieldConfig;
}
