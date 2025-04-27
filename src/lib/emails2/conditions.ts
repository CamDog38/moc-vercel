/**
 * Email System 2.0 Conditions
 * 
 * This file contains functions for evaluating conditions in email rules.
 */

import { EmailRuleCondition } from './types';

// Type guard to check if the condition is valid
function isValidCondition(condition: any): condition is EmailRuleCondition {
  // Check if condition is an object with the required properties
  const isBasicValid = condition && typeof condition === 'object' && 
    'operator' in condition && 
    'value' in condition;
  
  if (!isBasicValid) return false;
  
  // For new three-phased fallback approach, require field/fieldId AND stableId AND label
  const hasNewFormat = ('field' in condition || 'fieldId' in condition) && 
                      'stableId' in condition && 
                      'label' in condition;
  
  // If using new format, all three identifiers must be present
  if (hasNewFormat) {
    console.log(`[Forms2] Using new three-phased fallback format for condition:`, condition);
    return true;
  }
  
  // Legacy format is no longer supported - log an error and reject it
  const hasLegacyFormat = 'field' in condition || 'fieldId' in condition || 
                         'fieldStableId' in condition || 'fieldLabel' in condition;
  
  if (hasLegacyFormat) {
    console.log(`[Forms2] ERROR: Legacy condition format rejected. Missing three-phased fallback:`, condition);
    console.log(`[Forms2] Rules must be updated to use the new format with field/fieldId, stableId, and label`);
    return false;
  }
  
  return false;
}

/**
 * Evaluate conditions against form data
 * 
 * @param conditions Array of conditions to evaluate
 * @param data Form submission data
 * @returns Boolean indicating if all conditions are met
 */
export function evaluateConditions(
  conditions: any[],
  data: Record<string, any>
): boolean {
  // If there are no conditions, return true
  if (!conditions || conditions.length === 0) {
    return true;
  }

  // Check each condition (AND logic)
  for (const condition of conditions) {
    if (!isValidCondition(condition)) {
      console.log(`[Forms2] Invalid condition structure:`, condition);
      return false;
    }
    
    // Implement a fallback mechanism to find the field value
    // Try multiple identifiers in order: field/fieldId, fieldStableId, fieldLabel
    const { operator, value } = condition;
    
    // 1. Try primary field identifier (field or fieldId)
    const primaryFieldKey = condition.field || condition.fieldId;
    let fieldValue = primaryFieldKey ? data[primaryFieldKey] : undefined;
    let fieldKeyUsed = primaryFieldKey;
    
    // 2. If not found and we have a stable ID, try that
    if (fieldValue === undefined && condition.fieldStableId) {
      // Look for a field with this stable ID in the data
      // First check if there's a direct match with the stable ID
      fieldValue = data[condition.fieldStableId];
      if (fieldValue !== undefined) {
        fieldKeyUsed = condition.fieldStableId;
        console.log(`[Forms2] Field found using stable ID: ${condition.fieldStableId}`);
      } else {
        // Try to find a field that might have this stable ID in its metadata
        // This would require the form data to include field metadata
        // This is a placeholder for future implementation
      }
    }
    
    // 3. If still not found and we have a label, try case-insensitive matching on keys
    if (fieldValue === undefined && condition.fieldLabel) {
      const normalizedLabel = condition.fieldLabel.toLowerCase().replace(/\s+/g, '');
      
      // Try to find a field with a similar key or value
      for (const [key, val] of Object.entries(data)) {
        // Check if the key contains the normalized label
        if (key.toLowerCase().replace(/\s+/g, '').includes(normalizedLabel)) {
          fieldValue = val;
          fieldKeyUsed = key;
          console.log(`[Forms2] Field found using label match on key: ${key} for label: ${condition.fieldLabel}`);
          break;
        }
        
        // If the value is an object with a 'label' property, check that too
        if (val && typeof val === 'object' && 'label' in val && 
            typeof val.label === 'string' && 
            val.label.toLowerCase().replace(/\s+/g, '').includes(normalizedLabel)) {
          fieldValue = val.value || val;
          fieldKeyUsed = key;
          console.log(`[Forms2] Field found using label match on value's label: ${key} for label: ${condition.fieldLabel}`);
          break;
        }
      }
    }
    
    // Skip if the field doesn't exist in the data after all fallback attempts
    if (fieldValue === undefined) {
      console.log(`[Forms2] Field not found in data for condition evaluation after trying:`);
      console.log(`[Forms2] - Primary field: ${primaryFieldKey || 'not provided'}`);
      console.log(`[Forms2] - Stable ID: ${condition.fieldStableId || 'not provided'}`);
      console.log(`[Forms2] - Label: ${condition.fieldLabel || 'not provided'}`);
      return false;
    }
    
    console.log(`[Forms2] Evaluating condition using field: ${fieldKeyUsed}`);
    console.log(`[Forms2] Field value: ${fieldValue}, Expected value: ${value}, Operator: ${operator}`);
    

    let conditionMet = false;

    switch (operator) {
      case 'equals':
        conditionMet = fieldValue === value;
        break;
      case 'notEquals':
        conditionMet = fieldValue !== value;
        break;
      case 'contains':
        conditionMet = typeof fieldValue === 'string' && fieldValue.includes(value);
        break;
      case 'notContains':
        conditionMet = typeof fieldValue === 'string' && !fieldValue.includes(value);
        break;
      case 'greaterThan':
        conditionMet = parseFloat(fieldValue) > parseFloat(value);
        break;
      case 'lessThan':
        conditionMet = parseFloat(fieldValue) < parseFloat(value);
        break;
      case 'isEmpty':
        conditionMet = !fieldValue || fieldValue === '';
        break;
      case 'isNotEmpty':
        conditionMet = fieldValue && fieldValue !== '';
        break;
      default:
        conditionMet = false;
    }

    // If any condition is not met, return false (AND logic)
    if (!conditionMet) {
      console.log(`[Forms2] Condition not met: ${fieldKeyUsed} ${operator} ${value}`);
      console.log(`[Forms2] Field value: ${fieldValue}`);
      return false;
    }
  }

  // All conditions were met
  return true;
}
