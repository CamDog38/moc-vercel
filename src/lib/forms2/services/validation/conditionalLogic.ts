/**
 * Conditional Logic Evaluator
 * 
 * This file contains functions for evaluating conditional logic for form fields and sections.
 */

import { FormSubmissionData } from '@/lib/forms2/core/types';

/**
 * Evaluates conditional logic for a field or section
 * @param conditionalLogic The conditional logic to evaluate
 * @param formData The form data to evaluate against
 * @returns Whether the condition is met
 */
export const evaluateConditionalLogic = (
  conditionalLogic: any,
  formData: FormSubmissionData
): boolean => {
  if (!conditionalLogic || !conditionalLogic.when) {
    return true; // No conditions means always show
  }
  
  const { field, operator, value } = conditionalLogic.when;
  const fieldValue = formData[field];
  
  // If the field doesn't exist in the form data, the condition is not met
  if (fieldValue === undefined) {
    return false;
  }
  
  // Evaluate the condition based on the operator
  const conditionMet = evaluateCondition(operator, fieldValue, value);
  
  // If the action is 'show', return the condition result
  // If the action is 'hide', return the opposite
  return conditionalLogic.action === 'show' ? conditionMet : !conditionMet;
};

/**
 * Evaluates a condition based on the operator
 * @param operator The operator to use for evaluation
 * @param fieldValue The field value to evaluate
 * @param value The value to compare against
 * @returns Whether the condition is met
 */
const evaluateCondition = (
  operator: string,
  fieldValue: any,
  value: string
): boolean => {
  switch (operator) {
    case 'equals':
      return fieldValue === value;
    case 'notEquals':
    case 'not_equals':
      return fieldValue !== value;
    case 'contains':
      return typeof fieldValue === 'string' && fieldValue.includes(value);
    case 'notContains':
    case 'not_contains':
      return typeof fieldValue === 'string' && !fieldValue.includes(value);
    case 'greaterThan':
    case 'greater_than':
      return Number(fieldValue) > Number(value);
    case 'lessThan':
    case 'less_than':
      return Number(fieldValue) < Number(value);
    case 'isEmpty':
    case 'is_empty':
      return fieldValue === '' || fieldValue === null || fieldValue === undefined;
    case 'isNotEmpty':
    case 'is_not_empty':
      return fieldValue !== '' && fieldValue !== null && fieldValue !== undefined;
    default:
      return false;
  }
};
