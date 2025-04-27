/**
 * Evaluates a set of conditions against form data
 * @param conditions Array of condition objects with field, operator, and value
 * @param formData Object containing form field values
 * @param options Optional configuration for logging and debugging
 * @returns Result object containing evaluation results
 */
import { findFieldValueByStableId } from './field-id-mapper';
import path from 'path';

export interface EvaluationResult {
  matches: boolean;
  details?: Array<{
    field: string;
    operator: string;
    expectedValue: any;
    actualValue: any;
    result: boolean;
    reason?: string;
  }>;
}

export interface EvaluationOptions {
  logging?: boolean;
  logFn?: (message: string, level?: string) => void;
  ruleId?: string;
  formId?: string; // Added formId to support field mapping
}

export async function evaluateConditions(
  conditions: any[] | string | any,
  formData: Record<string, any>,
  options: EvaluationOptions = {}
): Promise<EvaluationResult> {
  // Standard logging header for internal functions
  const fileName = path.basename(__filename);
  const fileVersion = '1.0';
  
  if (options.logging) {
    console.log(`[FILE NAME] ${fileName}`);
    console.log(`[${fileVersion} FILE]`);
    console.log(`[PROCESSING] Evaluating email rule conditions`);
  }
  
  const { logging = false, logFn = console.log, ruleId = '', formId = '' } = options;
  const details: EvaluationResult['details'] = [];
  
  const log = (message: string, level: string = 'info') => {
    if (logging && logFn) {
      // Use standardized logging format
      const prefix = ruleId ? `[EMAIL RULE ${ruleId}]` : '[EMAIL RULES]';
      logFn(`${prefix} ${message}`, level);
    }
  };

  // Parse conditions if needed
  let parsedConditions: any[] = [];
  if (typeof conditions === 'string') {
    try {
      parsedConditions = JSON.parse(conditions);
      log(`Parsed conditions from string: ${conditions}`);
    } catch (error) {
      log(`Error parsing conditions string: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      console.error(`[ERROR] Error parsing conditions string: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { matches: false, details: [{ field: '', operator: '', expectedValue: '', actualValue: '', result: false, reason: 'Invalid JSON in conditions' }] };
    }
  } else if (Array.isArray(conditions)) {
    parsedConditions = conditions;
  } else if (conditions && typeof conditions === 'object') {
    parsedConditions = [conditions];
  } else {
    log(`Invalid conditions format: ${typeof conditions}`, 'error');
    console.error(`[ERROR] Invalid conditions format: ${typeof conditions}`);
    return { matches: false, details: [{ field: '', operator: '', expectedValue: '', actualValue: '', result: false, reason: 'Invalid conditions format' }] };
  }

  // If no conditions or empty array, treat as always met
  if (!parsedConditions || !Array.isArray(parsedConditions) || parsedConditions.length === 0) {
    log('No conditions to evaluate, treating as met');
    return { matches: true, details: [{ field: '', operator: '', expectedValue: '', actualValue: '', result: true, reason: 'No conditions defined' }] };
  }

  // Log available form data fields
  log(`Available form data fields: ${Object.keys(formData).join(', ')}`);

  // Check each condition
  for (const condition of parsedConditions) {
    // Validate condition format
    if (!condition || typeof condition !== 'object') {
      log('Invalid condition format', 'error');
      details.push({ field: '', operator: '', expectedValue: '', actualValue: '', result: false, reason: 'Invalid condition format' });
      return { matches: false, details };
    }

    const { field, operator, value } = condition;
    
    // Check required properties
    if (!field || !operator) {
      log('Missing required condition properties', 'error');
      details.push({ field: field || '', operator: operator || '', expectedValue: value, actualValue: '', result: false, reason: 'Missing required properties' });
      return { matches: false, details };
    }

    // Get field value, either directly or through mapping
    let fieldValue;
    
    // First check if the field exists directly in form data
    if (field in formData) {
      fieldValue = formData[field];
      log(`Found field "${field}" directly in form data with value: ${JSON.stringify(fieldValue)}`);
      console.log(`[FORM DATA] Field "${field}" found with value: ${JSON.stringify(fieldValue)}`);
    } 
    // If formId is provided, try to find the field using the mapping system
    else if (formId) {
      log(`Field "${field}" not found directly, attempting to find via mapping`);
      console.log(`[FORM DATA] Field "${field}" not found directly, attempting mapping with formId: ${formId}`);
      try {
        fieldValue = await findFieldValueByStableId(formId, field, formData);
        if (fieldValue !== undefined) {
          log(`Found field "${field}" via mapping with value: ${JSON.stringify(fieldValue)}`);
          console.log(`[FORM DATA] Field "${field}" found via mapping with value: ${JSON.stringify(fieldValue)}`);
        } else {
          log(`Field "${field}" not found via mapping`, 'error');
          console.error(`[ERROR] Field "${field}" not found via mapping`);
          details.push({ field, operator, expectedValue: value, actualValue: undefined, result: false, reason: 'Field not found in form data or via mapping' });
          // Return false immediately if field is missing in mapping
          return { matches: false, details };
        }
      } catch (error) {
        log(`Error finding field via mapping: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        console.error(`[ERROR] Error finding field via mapping: ${error instanceof Error ? error.message : 'Unknown error'}`);
        details.push({ field, operator, expectedValue: value, actualValue: undefined, result: false, reason: `Mapping error: ${error instanceof Error ? error.message : 'Unknown error'}` });
        // Return false immediately if there's an error in mapping
        return { matches: false, details };
      }
    } else {
      log(`Field "${field}" not found in form data`, 'error');
      console.error(`[ERROR] Field "${field}" not found in form data`);
      details.push({ field, operator, expectedValue: value, actualValue: undefined, result: false, reason: 'Field not found in form data' });
      // Return false immediately if field is missing
      return { matches: false, details };
    }

    log(`Evaluating condition: ${field} ${operator} ${value} (actual value: ${JSON.stringify(fieldValue)})`);

    let result = false;
    let reason = '';

    try {
      switch (operator) {
        case 'equals':
          result = String(fieldValue) === String(value);
          reason = result ? 'Values match' : 'Values do not match';
          break;
        case 'contains':
          result = String(fieldValue || '').includes(String(value));
          reason = result ? 'Value is contained' : 'Value is not contained';
          break;
        case 'notEquals':
          result = String(fieldValue) !== String(value);
          reason = result ? 'Values are different' : 'Values are the same';
          break;
        case 'startsWith':
          result = String(fieldValue || '').startsWith(String(value));
          reason = result ? 'Value starts with expected' : 'Value does not start with expected';
          break;
        case 'endsWith':
          result = String(fieldValue || '').endsWith(String(value));
          reason = result ? 'Value ends with expected' : 'Value does not end with expected';
          break;
        case 'greaterThan':
          result = Number(fieldValue) > Number(value);
          reason = result ? 'Value is greater' : 'Value is not greater';
          break;
        case 'lessThan':
          result = Number(fieldValue) < Number(value);
          reason = result ? 'Value is less' : 'Value is not less';
          break;
        case 'isEmpty':
          result = fieldValue === undefined || fieldValue === null || fieldValue === '';
          reason = result ? 'Value is empty' : 'Value is not empty';
          break;
        case 'isNotEmpty':
          result = fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
          reason = result ? 'Value is not empty' : 'Value is empty';
          break;
        default:
          log(`Unknown operator: ${operator}`, 'error');
          result = false;
          reason = `Unknown operator: ${operator}`;
      }
    } catch (error) {
      log(`Error evaluating condition: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      result = false;
      reason = `Evaluation error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    details.push({
      field,
      operator,
      expectedValue: value,
      actualValue: fieldValue,
      result,
      reason
    });

    log(`Condition result: ${result ? 'PASSED' : 'FAILED'} - ${reason}`);

    if (!result) {
      return { matches: false, details };
    }
  }

  // All conditions passed
  log('All conditions passed');
  return { matches: true, details };
}

// Backward compatibility function for code that doesn't support async/await
export function evaluateConditionsSync(
  conditions: any[] | string | any,
  formData: Record<string, any>,
  options: EvaluationOptions = {}
): EvaluationResult {
  const { logging = false, logFn = console.log, ruleId = '' } = options;
  const details: EvaluationResult['details'] = [];
  
  const log = (message: string, level: string = 'info') => {
    if (logging && logFn) {
      logFn(`${ruleId ? `[Rule ${ruleId}] ` : ''}${message}`, level);
    }
  };

  // Parse conditions if needed
  let parsedConditions: any[] = [];
  if (typeof conditions === 'string') {
    try {
      parsedConditions = JSON.parse(conditions);
      log(`Parsed conditions from string: ${conditions}`);
    } catch (error) {
      log(`Error parsing conditions string: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      return { matches: false, details: [{ field: '', operator: '', expectedValue: '', actualValue: '', result: false, reason: 'Invalid JSON in conditions' }] };
    }
  } else if (Array.isArray(conditions)) {
    parsedConditions = conditions;
  } else if (conditions && typeof conditions === 'object') {
    parsedConditions = [conditions];
  }

  // If no conditions or empty array, treat as always met
  if (!parsedConditions || !Array.isArray(parsedConditions) || parsedConditions.length === 0) {
    log('No conditions to evaluate, treating as met');
    return { matches: true, details: [{ field: '', operator: '', expectedValue: '', actualValue: '', result: true, reason: 'No conditions defined' }] };
  }

  // Log available form data fields
  log(`Available form data fields: ${Object.keys(formData).join(', ')}`);

  // Check each condition
  for (const condition of parsedConditions) {
    // Validate condition format
    if (!condition || typeof condition !== 'object') {
      log('Invalid condition format', 'error');
      details.push({ field: '', operator: '', expectedValue: '', actualValue: '', result: false, reason: 'Invalid condition format' });
      return { matches: false, details };
    }

    const { field, operator, value } = condition;
    
    // Check required properties
    if (!field || !operator) {
      log('Missing required condition properties', 'error');
      details.push({ field: field || '', operator: operator || '', expectedValue: value, actualValue: '', result: false, reason: 'Missing required properties' });
      return { matches: false, details };
    }
    
    // Check if field exists in form data
    if (!(field in formData)) {
      log(`Field "${field}" not found in form data`, 'error');
      details.push({ field, operator, expectedValue: value, actualValue: undefined, result: false, reason: 'Field not found in form data' });
      return { matches: false, details }; // Return false immediately if field is missing
    }
    
    const fieldValue = formData[field];
    log(`Evaluating condition: ${field} ${operator} ${value} (actual value: ${JSON.stringify(fieldValue)})`);

    let result = false;
    let reason = '';
    
    try {
      switch (operator) {
        case 'equals':
          result = String(fieldValue) === String(value);
          reason = result ? 'Values match' : 'Values do not match';
          break;
        case 'contains':
          result = String(fieldValue || '').includes(String(value));
          reason = result ? 'Value is contained' : 'Value is not contained';
          break;
        case 'notEquals':
          result = String(fieldValue) !== String(value);
          reason = result ? 'Values are different' : 'Values are the same';
          break;
        case 'startsWith':
          result = String(fieldValue || '').startsWith(String(value));
          reason = result ? 'Value starts with expected' : 'Value does not start with expected';
          break;
        case 'endsWith':
          result = String(fieldValue || '').endsWith(String(value));
          reason = result ? 'Value ends with expected' : 'Value does not end with expected';
          break;
        case 'greaterThan':
          result = Number(fieldValue) > Number(value);
          reason = result ? 'Value is greater' : 'Value is not greater';
          break;
        case 'lessThan':
          result = Number(fieldValue) < Number(value);
          reason = result ? 'Value is less' : 'Value is not less';
          break;
        case 'isEmpty':
          result = fieldValue === undefined || fieldValue === null || fieldValue === '';
          reason = result ? 'Value is empty' : 'Value is not empty';
          break;
        case 'isNotEmpty':
          result = fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
          reason = result ? 'Value is not empty' : 'Value is empty';
          break;
        default:
          log(`Unknown operator: ${operator}`, 'error');
          result = false;
          reason = `Unknown operator: ${operator}`;
      }
    } catch (error) {
      log(`Error evaluating condition: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      result = false;
      reason = `Evaluation error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    details.push({
      field,
      operator,
      expectedValue: value,
      actualValue: fieldValue,
      result,
      reason
    });

    log(`Condition result: ${result ? 'PASSED' : 'FAILED'} - ${reason}`);

    if (!result) {
      return { matches: false, details };
    }
  }

  // All conditions passed
  log('All conditions passed');
  return { matches: true, details };
}