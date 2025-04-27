/**
 * Conditional Logic Helper
 * 
 * Helper functions for evaluating conditional logic in forms
 * Simplified version based on the legacy form builder approach
 */

import { FieldConfig, FormConfig } from '@/lib/forms2/core/types';

/**
 * Find a field in the form config by ID
 */
export function findFieldById(fieldId: string, formConfig?: FormConfig): FieldConfig | null {
  if (!formConfig) return null;
  
  for (const section of formConfig.sections) {
    const field = section.fields.find(f => f.id === fieldId);
    if (field) return field;
  }
  
  return null;
}

/**
 * Normalize value for comparison
 * This handles special cases like formatting differences
 */
export function normalizeValueForComparison(value: any, fieldId: string, conditionValue: string): string {
  if (!value) return '';
  
  // Convert to lowercase for case-insensitive comparison
  const valueLower = typeof value === 'string' ? value.toLowerCase() : String(value).toLowerCase();
  const conditionLower = conditionValue.toLowerCase();
  
  console.log(`Comparing values - Field: ${fieldId}, Value: ${valueLower}, Condition: ${conditionLower}`);
  
  // No special handling - just create standardized versions of the values for comparison
  
  // Create all possible format variations for comparison
  // 1. Normalized (spaces instead of dashes/underscores)
  const normalizedValue = valueLower
    .replace(/_/g, ' ')
    .replace(/-/g, ' ');
  
  const normalizedCondition = conditionLower
    .replace(/_/g, ' ')
    .replace(/-/g, ' ');
  
  // 2. Dashed (dashes instead of spaces/underscores)
  const dashedValue = valueLower
    .replace(/_/g, '-')
    .replace(/ /g, '-');
  
  const dashedCondition = conditionLower
    .replace(/_/g, '-')
    .replace(/ /g, '-');
  
  // 3. Underscored (underscores instead of spaces/dashes)
  const underscoredValue = valueLower
    .replace(/-/g, '_')
    .replace(/ /g, '_');
  
  const underscoredCondition = conditionLower
    .replace(/-/g, '_')
    .replace(/ /g, '_');
  
  console.log('Format variations:');
  console.log(`Original: "${valueLower}" vs "${conditionLower}"`);
  console.log(`Normalized: "${normalizedValue}" vs "${normalizedCondition}"`);
  console.log(`Dashed: "${dashedValue}" vs "${dashedCondition}"`);
  console.log(`Underscored: "${underscoredValue}" vs "${underscoredCondition}"`);
  
  // Create a standardized version with all separators normalized to a single space
  const standardizedValue = valueLower
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
    
  const standardizedCondition = conditionLower
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
    
  console.log(`Standardized values: "${standardizedValue}" vs "${standardizedCondition}"`);
  
  // Check for exact matches with different formats
  if (valueLower === conditionLower) {
    console.log('✅ MATCH: Original values match exactly');
    return conditionValue;
  }
  
  if (normalizedValue === normalizedCondition) {
    console.log('✅ MATCH: Normalized values match exactly');
    return conditionValue;
  }
  
  if (dashedValue === dashedCondition) {
    console.log('✅ MATCH: Dashed values match exactly');
    return conditionValue;
  }
  
  if (underscoredValue === underscoredCondition) {
    console.log('✅ MATCH: Underscored values match exactly');
    return conditionValue;
  }
  
  // Check standardized versions (most reliable comparison)
  if (standardizedValue === standardizedCondition) {
    console.log('✅ MATCH: Standardized values match exactly');
    return conditionValue;
  }
  
  // Check if one contains the other (partial match)
  if (standardizedValue.includes(standardizedCondition) || 
      standardizedCondition.includes(standardizedValue)) {
    console.log('✅ MATCH: Partial match with standardized values');
    return conditionValue;
  }
  
  // Remove all separators and compare (last resort)
  const strippedValue = valueLower.replace(/_/g, '').replace(/-/g, '').replace(/\s+/g, '');
  const strippedCondition = conditionLower.replace(/_/g, '').replace(/-/g, '').replace(/\s+/g, '');
  
  if (strippedValue === strippedCondition) {
    console.log('✅ MATCH: Stripped values match (no separators)');
    return conditionValue;
  }
  
  console.log('❌ NO MATCH: Values do not match in any format');
  // For other cases, just return the original value
  return value;
}

/**
 * Find a matching field ID in the form values
 * This is used to handle legacy IDs that might not match exactly
 */
export function findMatchingFieldId(
  sourceFieldId: string,
  sourceFieldLabel?: string,
  formValues?: Record<string, any>,
  formConfig?: FormConfig,
  shouldLog = false
): string {
  if (!formValues) return sourceFieldId;
  
  if (shouldLog) {
    console.log(`Finding match for field ID: ${sourceFieldId}, Label: ${sourceFieldLabel || 'N/A'}`);
    console.log(`Available form values:`, Object.keys(formValues));
  }
  
  // First, check if the source field ID exists directly in form values
  if (formValues[sourceFieldId] !== undefined) {
    if (shouldLog) {
      console.log(`Found exact match in form values: ${sourceFieldId}`);
    }
    return sourceFieldId;
  }
  
  // Special case for fields that reference themselves by stableId
  // This happens when a field's stableId is used as the reference in its own conditional logic
  if (sourceFieldLabel && formConfig) {
    // Look for a field with the matching label
    for (const section of formConfig.sections) {
      for (const field of section.fields) {
        if (field.label && field.label.toLowerCase() === sourceFieldLabel.toLowerCase()) {
          // Found a field with matching label, check if it's in form values
          if (formValues[field.id] !== undefined) {
            if (shouldLog) {
              console.log(`Found field by label match: ${field.label} with ID: ${field.id}`);
            }
            return field.id;
          }
        }
      }
    }
  }
  
  // If the field exists in form values, return it directly
  if (formValues[sourceFieldId] !== undefined) {
    if (shouldLog) {
      console.log(`Direct match found for field ID: ${sourceFieldId}`);
    }
    return sourceFieldId;
  }
  
  // If no exact match found, try matching by stableId in the form config
  if (formConfig) {
    // First, try to find an exact match by stableId
    for (const section of formConfig.sections) {
      for (const field of section.fields) {
        // Check if the field has a stableId that matches the sourceFieldId
        if (field.stableId === sourceFieldId) {
          if (shouldLog) {
            console.log(`Found exact stableId match: ${field.id} for source ID: ${sourceFieldId}`);
          }
          
          // Check if this field ID exists in form values
          if (formValues[field.id] !== undefined) {
            return field.id;
          }
        }
      }
    }
    
    // If we have a sourceFieldLabel, try matching by label
    if (sourceFieldLabel) {
      for (const section of formConfig.sections) {
        for (const field of section.fields) {
          // Check if the field label matches (case insensitive)
          if (field.label && field.label.toLowerCase() === sourceFieldLabel.toLowerCase()) {
            if (shouldLog) {
              console.log(`Found label match: ${field.id} for label: ${sourceFieldLabel}`);
            }
            
            // Check if this field ID exists in form values
            if (formValues[field.id] !== undefined) {
              return field.id;
            }
          }
        }
      }
    }
    
    // Try to find a field ID that contains the source field ID or vice versa
    for (const section of formConfig.sections) {
      for (const field of section.fields) {
        // Check if either ID contains the other (case insensitive)
        const fieldIdLower = field.id.toLowerCase();
        const sourceIdLower = sourceFieldId.toLowerCase();
        
        if (fieldIdLower.includes(sourceIdLower) || sourceIdLower.includes(fieldIdLower)) {
          if (shouldLog) {
            console.log(`Found partial ID match: ${field.id} for source ID: ${sourceFieldId}`);
          }
          
          // Check if this field ID exists in form values
          if (formValues[field.id] !== undefined) {
            return field.id;
          }
        }
      }
    }
  }
  
  // Check if any key in formValues contains the sourceFieldId or vice versa
  const formValueKeys = Object.keys(formValues);
  for (const key of formValueKeys) {
    const keyLower = key.toLowerCase();
    const sourceIdLower = sourceFieldId.toLowerCase();
    
    if (keyLower.includes(sourceIdLower) || sourceIdLower.includes(keyLower)) {
      if (shouldLog) {
        console.log(`Found partial match in form values: ${key} for source ID: ${sourceFieldId}`);
      }
      return key;
    }
  }
  
  // Try fuzzy matching based on similarity
  // This is a last resort for fields that might have been regenerated with different IDs
  const bestMatch = findBestMatchingKey(sourceFieldId, formValueKeys);
  if (bestMatch) {
    if (shouldLog) {
      console.log(`Found fuzzy match: ${bestMatch} for source ID: ${sourceFieldId}`);
    }
    return bestMatch;
  }
  
  // If all else fails, return the original ID
  if (shouldLog) {
    console.log(`No match found, returning original ID: ${sourceFieldId}`);
  }
  return sourceFieldId;
}

/**
 * Find the best matching key from a list of keys based on similarity
 * This is used as a last resort when exact or partial matches fail
 */
function findBestMatchingKey(sourceId: string, keys: string[]): string | null {
  if (!keys.length) return null;
  
  // Simple similarity score based on common characters
  function similarityScore(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    // Count common characters
    let common = 0;
    for (let i = 0; i < s1.length; i++) {
      if (s2.includes(s1[i])) common++;
    }
    
    // Normalize by length
    return common / Math.max(s1.length, s2.length);
  }
  
  let bestMatch = null;
  let bestScore = 0;
  
  for (const key of keys) {
    const score = similarityScore(sourceId, key);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = key;
    }
  }
  
  // Only return if the score is above a threshold
  return bestScore > 0.5 ? bestMatch : null;
}

/**
 * Evaluate whether a field should be shown based on conditional logic
 */
export function shouldShowField(
  field: FieldConfig,
  formValues: Record<string, any>,
  formConfig?: FormConfig
): boolean {
  // If there's no conditional logic, always show the field
  if (!field.conditionalLogic) {
    return true;
  }
  
  // Only log in development
  console.log(`Evaluating conditional logic for field: ${field.id} (${field.label || 'No Label'})`);
  console.log('Conditional logic:', field.conditionalLogic);
  
  const { when, action } = field.conditionalLogic;
  
  // Special case for the Non-SA field with the legacy Nationality field ID
  if (field.label === 'Non-SA' && when.field === 'item_1745322079524_obsskpmus' && when.value === 'Sa - Non-SA') {
    // Find the Nationality field
    let nationalityFieldId = '';
    for (const fieldId of Object.keys(formValues)) {
      if (fieldId.toLowerCase().includes('nationality')) {
        nationalityFieldId = fieldId;
        break;
      }
    }
    
    if (nationalityFieldId && formValues[nationalityFieldId]) {
      const nationalityValue = formValues[nationalityFieldId];
      
      // Check if the Nationality value contains 'non-sa' (case insensitive)
      if (typeof nationalityValue === 'string' && 
          (nationalityValue.toLowerCase().includes('non-sa') || 
           nationalityValue.toLowerCase().includes('non') && nationalityValue.toLowerCase().includes('sa'))) {
        return true;
      }
    }
  }
  
  // Find the field ID to check against using both field ID and label
  const fieldId = findMatchingFieldId(when.field, when.fieldLabel, formValues, formConfig);
  
  // Get the current value of the field
  const currentValue = formValues[fieldId];
  const operator = when.operator;
  const conditionValue = when.value || '';
  
  // Only log in development and only when debugging
  if (process.env.NODE_ENV === 'development' && process.env.DEBUG_CONDITIONAL_LOGIC) {
    console.log(`Checking field: ${fieldId}`);
    console.log(`Current value: ${JSON.stringify(currentValue)}`);
    console.log(`Operator: ${operator}`);
    console.log(`Condition value: ${conditionValue}`);
  }
  
  // If the field we depend on doesn't have a value yet, default behavior based on action
  // But first check if the field ID is valid - if not, we should return false for 'show' action
  if (!fieldId) {
    return action === 'hide';
  }
  
  // Check if the current value is empty
  if (currentValue === undefined || currentValue === null || currentValue === '') {
    return action === 'hide';
  }
  
  let shouldShow = false;
  
  // Handle different value types appropriately
  if (typeof currentValue === 'string') {
    // Normalize the value for comparison if needed
    const normalizedValue = normalizeValueForComparison(currentValue, fieldId, conditionValue);
    
    switch (operator) {
      case 'equals':
        shouldShow = normalizedValue.toLowerCase() === conditionValue.toLowerCase();
        break;
      case 'not_equals':
        shouldShow = normalizedValue.toLowerCase() !== conditionValue.toLowerCase();
        break;
      case 'contains':
        shouldShow = normalizedValue.toLowerCase().includes(conditionValue.toLowerCase());
        break;
      case 'not_contains':
        shouldShow = !normalizedValue.toLowerCase().includes(conditionValue.toLowerCase());
        break;
      default:
        shouldShow = false;
    }
  } else if (Array.isArray(currentValue)) {
    // Handle array values (like from checkboxes or multi-select)
    switch (operator) {
      case 'equals':
        shouldShow = currentValue.some(item => 
          typeof item === 'string' && item.toLowerCase() === conditionValue.toLowerCase()
        );
        break;
      case 'not_equals':
        shouldShow = !currentValue.some(item => 
          typeof item === 'string' && item.toLowerCase() === conditionValue.toLowerCase()
        );
        break;
      case 'contains':
        shouldShow = currentValue.some(item => 
          typeof item === 'string' && item.toLowerCase().includes(conditionValue.toLowerCase())
        );
        break;
      case 'not_contains':
        shouldShow = !currentValue.some(item => 
          typeof item === 'string' && item.toLowerCase().includes(conditionValue.toLowerCase())
        );
        break;
      default:
        shouldShow = false;
    }
  } else if (currentValue instanceof Date) {
    // Handle date values
    const dateValue = new Date(conditionValue);
    switch (operator) {
      case 'equals':
        shouldShow = currentValue.toDateString() === dateValue.toDateString();
        break;
      case 'not_equals':
        shouldShow = currentValue.toDateString() !== dateValue.toDateString();
        break;
      case 'less_than': // before
        shouldShow = currentValue < dateValue;
        break;
      case 'greater_than': // after
        shouldShow = currentValue > dateValue;
        break;
      default:
        shouldShow = false;
    }
  } else if (typeof currentValue === 'number') {
    // Handle number values
    const numValue = parseFloat(conditionValue);
    switch (operator) {
      case 'equals':
        shouldShow = currentValue === numValue;
        break;
      case 'not_equals':
        shouldShow = currentValue !== numValue;
        break;
      case 'greater_than':
        shouldShow = currentValue > numValue;
        break;
      case 'less_than':
        shouldShow = currentValue < numValue;
        break;
      default:
        shouldShow = false;
    }
  } else {
    // For other types, try string comparison as fallback
    try {
      const strCurrentValue = String(currentValue).toLowerCase();
      const strValue = String(conditionValue).toLowerCase();
      
      console.log(`Detailed comparison - Current: "${strCurrentValue}", Expected: "${strValue}"`);
      
      // Create normalized versions for comparison (handling dashes and underscores)
      const normalizedCurrentValue = strCurrentValue
        .replace(/_/g, ' ')
        .replace(/-/g, ' ');
      
      const normalizedConditionValue = strValue
        .replace(/_/g, ' ')
        .replace(/-/g, ' ');
      
      // Create dashed and underscored versions
      const dashedCurrentValue = strCurrentValue.replace(/_/g, '-').replace(/ /g, '-');
      const dashedConditionValue = strValue.replace(/_/g, '-').replace(/ /g, '-');
      
      const underscoredCurrentValue = strCurrentValue.replace(/-/g, '_').replace(/ /g, '_');
      const underscoredConditionValue = strValue.replace(/-/g, '_').replace(/ /g, '_');
      
      console.log(`Normalized - Current: "${normalizedCurrentValue}", Expected: "${normalizedConditionValue}"`);
      console.log(`Dashed - Current: "${dashedCurrentValue}", Expected: "${dashedConditionValue}"`);
      console.log(`Underscored - Current: "${underscoredCurrentValue}", Expected: "${underscoredConditionValue}"`);
      
      let isEqual = false;
      let isNotEqual = true;
      let doesContain = false;
      let doesNotContain = true;
      
      // Check exact matches with different formats
      if (strCurrentValue === strValue) {
        console.log('✓ Exact match with original values');
        isEqual = true;
        isNotEqual = false;
      }
      
      if (normalizedCurrentValue === normalizedConditionValue) {
        console.log('✓ Exact match with normalized values');
        isEqual = true;
        isNotEqual = false;
      }
      
      if (dashedCurrentValue === dashedConditionValue) {
        console.log('✓ Exact match with dashed values');
        isEqual = true;
        isNotEqual = false;
      }
      
      if (underscoredCurrentValue === underscoredConditionValue) {
        console.log('✓ Exact match with underscored values');
        isEqual = true;
        isNotEqual = false;
      }
      
      // Check contains with different formats
      if (strCurrentValue.includes(strValue)) {
        console.log('✓ Contains match with original values');
        doesContain = true;
        doesNotContain = false;
      }
      
      if (normalizedCurrentValue.includes(normalizedConditionValue)) {
        console.log('✓ Contains match with normalized values');
        doesContain = true;
        doesNotContain = false;
      }
      
      if (dashedCurrentValue.includes(dashedConditionValue)) {
        console.log('✓ Contains match with dashed values');
        doesContain = true;
        doesNotContain = false;
      }
      
      if (underscoredCurrentValue.includes(underscoredConditionValue)) {
        console.log('✓ Contains match with underscored values');
        doesContain = true;
        doesNotContain = false;
      }
      
      // Apply the operator
      switch (operator) {
        case 'equals':
          shouldShow = isEqual;
          console.log(`Equals comparison result: ${shouldShow}`);
          break;
        case 'not_equals':
          shouldShow = isNotEqual;
          console.log(`Not equals comparison result: ${shouldShow}`);
          break;
        case 'contains':
          shouldShow = doesContain;
          console.log(`Contains comparison result: ${shouldShow}`);
          break;
        case 'not_contains':
          shouldShow = doesNotContain;
          console.log(`Not contains comparison result: ${shouldShow}`);
          break;
        case 'is_empty':
          shouldShow = strCurrentValue === '';
          console.log(`Is empty comparison result: ${shouldShow}`);
          break;
        case 'is_not_empty':
          shouldShow = strCurrentValue !== '';
          console.log(`Is not empty comparison result: ${shouldShow}`);
          break;
        default:
          shouldShow = false;
          console.log(`Unknown operator: ${operator}, defaulting to false`);
      }
    } catch (error) {
      return true; // Show the field if comparison fails
    }
  }

  // If the condition is met, determine whether to show or hide the field
  if (action === 'show') {
    // If action is 'show', show the field when condition is met
    console.log(`Field ${field.id} should be ${shouldShow ? 'shown' : 'hidden'} (show action)`);
    return shouldShow;
  } else {
    // If action is 'hide', hide the field when condition is met
    console.log(`Field ${field.id} should be ${!shouldShow ? 'shown' : 'hidden'} (hide action)`);
    return !shouldShow;
  }
}
