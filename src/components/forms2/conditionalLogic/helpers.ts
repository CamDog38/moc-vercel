import { ConditionalLogic } from '@/lib/forms2/core/types';
import { ConditionalLogicState, ConditionalLogicOperator } from './types';

/**
 * Creates a conditional logic object from the state
 */
export const createConditionalLogic = (state: ConditionalLogicState): ConditionalLogic => {
  return {
    action: state.action,
    when: {
      field: state.fieldId,
      operator: state.operator,
      value: state.value,
    },
  };
};

/**
 * Checks if the operator requires a value input
 */
export const operatorRequiresValue = (operator: ConditionalLogicOperator): boolean => {
  return operator !== 'is_empty' && operator !== 'is_not_empty';
};

/**
 * Gets a unique key for a field option
 */
export const getOptionKey = (option: any): string => {
  return option.id || option.value || String(Math.random());
};
