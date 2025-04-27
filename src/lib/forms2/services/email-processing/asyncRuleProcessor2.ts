/**
 * Asynchronous Email Rule Processing
 * 
 * This module provides optimized rule fetching and analysis for email processing,
 * using parallel processing and batching to improve performance.
 */

import prisma from '@/lib/prisma';
import { addApiLog } from '@/pages/api/debug/logs';
import { EMAIL_TIMEOUTS, withTimeout } from './emailConfig2';
import { findFieldValueByStableIdBatch, batchProcessFieldValues } from './batch-field-processor2';

// Define types for better type safety
export type EmailRule = {
  id: string;
  name: string;
  formId: string;
  conditions: any;
  recipientEmail?: string;
  recipientField?: string;
  recipientType?: string;
  ccEmails?: string;
  bccEmails?: string;
  templateId?: string;
  template?: {
    id: string;
    name: string;
    subject: string;
    htmlContent: string;
    ccEmails?: string | null;
    bccEmails?: string | null;
  } | null;
};

export type FormSubmission = {
  id: string;
  formId: string;
  data: any;
  createdAt: Date;
};

/**
 * Fetch all email rules for a form asynchronously
 * 
 * @param formId The ID of the form to fetch rules for
 * @returns Array of email rules for the form
 */
export async function fetchRulesAsync(formId: string): Promise<EmailRule[]> {
  try {
    const startTime = Date.now();
    addApiLog(`Fetching email rules for form: ${formId}`, 'info', 'emails');
    
    // Fetch rules with timeout to prevent hanging
    const rules = await withTimeout(
      async () => {
        return prisma.emailRule.findMany({
          where: {
            formId: formId,
            active: true // Using 'active' instead of 'isActive' to match Prisma schema
          },
          include: {
            template: true
          }
        });
      },
      EMAIL_TIMEOUTS.EMAIL_PROCESSING_API,
      'Rule fetching timed out'
    );
    
    const duration = Date.now() - startTime;
    addApiLog(`Fetched ${rules.length} email rules for form ${formId} in ${duration}ms`, 'info', 'emails');
    
    return rules as EmailRule[];
  } catch (error) {
    addApiLog(`Error fetching email rules: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'emails');
    return [];
  }
}

/**
 * Process email rules in parallel batches
 * 
 * @param rules Array of email rules to process
 * @param formId The ID of the form
 * @param formData The form data to check against
 * @returns Array of matching rules
 */
export async function processRulesAsync(
  rules: EmailRule[],
  formId: string,
  formData: Record<string, any>
): Promise<EmailRule[]> {
  try {
    const startTime = Date.now();
    addApiLog(`Processing ${rules.length} email rules for form: ${formId}`, 'info', 'emails');
    
    if (rules.length === 0) {
      addApiLog('No rules to process', 'info', 'emails');
      return [];
    }
    
    // Process rules in parallel batches for better performance
    const BATCH_SIZE = 5; // Process 5 rules at a time
    const matchingRules: EmailRule[] = [];
    
    // Process rules in batches
    for (let i = 0; i < rules.length; i += BATCH_SIZE) {
      const batchRules = rules.slice(i, i + BATCH_SIZE);
      addApiLog(`Processing batch of ${batchRules.length} rules (${i+1}-${Math.min(i+BATCH_SIZE, rules.length)} of ${rules.length})`, 'info', 'emails');
      
      // Set up a timeout for the entire batch
      const batchTimeout = Math.min(
        EMAIL_TIMEOUTS.VARIABLE_REPLACEMENT * batchRules.length,
        EMAIL_TIMEOUTS.MAX_VARIABLE_REPLACEMENT
      );
      
      try {
        // Process the batch with a timeout
        const batchResults = await Promise.race([
          processBatch(batchRules, formId, formData),
          createTimeout<EmailRule[]>(batchTimeout, `Rule processing batch timed out after ${batchTimeout}ms`)
        ]);
        
        // Add matching rules from this batch to the overall results
        matchingRules.push(...batchResults);
      } catch (batchError) {
        addApiLog(`Error processing rule batch: ${batchError instanceof Error ? batchError.message : 'Unknown error'}`, 'error', 'emails');
        // Continue with the next batch even if this one failed
      }
    }
    
    const duration = Date.now() - startTime;
    addApiLog(`Found ${matchingRules.length} matching rules out of ${rules.length} in ${duration}ms`, 'info', 'emails');
    
    return matchingRules;
  } catch (error) {
    addApiLog(`Error in rule processing: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'emails');
    return [];
  }
}

/**
 * Process a batch of rules in parallel
 * 
 * @param rules Batch of rules to process
 * @param formId The ID of the form
 * @param formData The form data to check against
 * @returns Array of matching rules from the batch
 */
export async function processBatch(
  rules: EmailRule[],
  formId: string,
  formData: Record<string, any>
): Promise<EmailRule[]> {
  try {
    // Log the rule conditions for debugging
    rules.forEach(rule => {
      if (rule.conditions && Array.isArray(rule.conditions)) {
        try {
          addApiLog(`Rule ${rule.id} conditions: ${JSON.stringify(rule.conditions)}`, 'info', 'emails');
        } catch (e) {
          addApiLog(`Rule ${rule.id} has conditions but they could not be stringified`, 'info', 'emails');
        }
      }
    });
    
    // Collect all unique field IDs from all rule conditions to batch process them
    const fieldIds = new Set<string>();
    rules.forEach(rule => {
      if (rule.conditions && Array.isArray(rule.conditions)) {
        rule.conditions.forEach(condition => {
          if (condition && condition.field) {
            fieldIds.add(condition.field);
            // If condition has a fieldId property, add that too
            if (condition.fieldId) {
              fieldIds.add(condition.fieldId);
            }
          }
        });
      }
    });
    
    // Log the form data for debugging
    addApiLog(`Form data keys: ${Object.keys(formData).join(', ')}`, 'info', 'emails');
    
    // Batch process all field values at once
    const fieldValues = await batchProcessFieldValues(formId, Array.from(fieldIds), formData);
    
    // Store the field values in a local cache for use during rule checking
    const fieldValueCache = new Map<string, any>(Object.entries(fieldValues));
    
    // Process each rule in parallel with the pre-fetched field values
    const rulePromises = rules.map(rule => 
      checkRuleConditionsAsync(rule, formId, formData, fieldValueCache)
        .then(matches => ({ rule, matches }))
    );
    
    // Wait for all rules to be checked
    const ruleResults = await Promise.all(rulePromises);
    
    // Filter out rules that don't match
    const matchingRules = ruleResults
      .filter(result => result.matches)
      .map(result => result.rule);
    
    return matchingRules;
  } catch (error) {
    addApiLog(`Error processing rule batch: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'emails');
    return [];
  }
}

/**
 * Check if a rule's conditions match the form data asynchronously
 * 
 * @param rule The email rule to check
 * @param formId The ID of the form
 * @param formData The form data to check against
 * @param fieldValueCache A cache of pre-fetched field values
 * @returns True if the conditions match, false otherwise
 */
export async function checkRuleConditionsAsync(
  rule: EmailRule,
  formId: string,
  formData: Record<string, any>,
  fieldValueCache?: Map<string, any>
): Promise<boolean> {
  try {
    const startTime = Date.now();
    addApiLog(`Checking conditions for rule: ${rule.id}`, 'info', 'emails');
    
    // Parse the conditions
    let conditions: any[] = [];
    try {
      if (typeof rule.conditions === 'string') {
        conditions = JSON.parse(rule.conditions);
      } else if (Array.isArray(rule.conditions)) {
        conditions = rule.conditions;
      } else if (rule.conditions && typeof rule.conditions === 'object') {
        conditions = [rule.conditions];
      }
    } catch (parseError) {
      addApiLog(`Error parsing conditions for rule ${rule.id}: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`, 'error', 'emails');
      return false;
    }
    
    // If there are no conditions, the rule matches
    if (!conditions || conditions.length === 0) {
      addApiLog(`Rule ${rule.id} has no conditions, automatically matches`, 'info', 'emails');
      return true;
    }
    
    // Process conditions in parallel for better performance
    const conditionPromises = conditions.map(condition => 
      checkSingleConditionAsync(condition, formId, formData, fieldValueCache)
    );
    
    // Wait for all conditions to be checked
    const conditionResults = await Promise.all(conditionPromises);
    
    // Check if all conditions match (AND logic)
    const allMatch = conditionResults.every(result => result);
    
    const duration = Date.now() - startTime;
    addApiLog(`Rule ${rule.id} ${allMatch ? 'matches' : 'does not match'} (checked ${conditions.length} conditions in ${duration}ms)`, 'info', 'emails');
    
    return allMatch;
  } catch (error) {
    addApiLog(`Error checking rule conditions: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'emails');
    return false;
  }
}

/**
 * Check if a single condition matches the form data asynchronously
 * 
 * @param condition The condition to check
 * @param formId The ID of the form
 * @param formData The form data to check against
 * @returns True if the condition matches, false otherwise
 */
export async function checkSingleConditionAsync(
  condition: any,
  formId: string,
  formData: Record<string, any>,
  fieldValueCache?: Map<string, any>
): Promise<boolean> {
  try {
    const startTime = Date.now();
    
    // If the condition is invalid, it doesn't match
    if (!condition || !condition.field) {
      return false;
    }
    
    // Try to get the field value from the cache first
    let fieldValue;
    
    // Check if condition has a fieldId property (direct mapping to form data)
    if (condition.fieldId && formData[condition.fieldId] !== undefined) {
      fieldValue = formData[condition.fieldId];
      addApiLog(`Using direct fieldId mapping for ${condition.field} -> ${condition.fieldId}: ${fieldValue}`, 'info', 'emails');
    }
    // Try the cache next
    else if (fieldValueCache && fieldValueCache.has(condition.field)) {
      fieldValue = fieldValueCache.get(condition.field);
      addApiLog(`Using cached value for field ${condition.field}: ${fieldValue}`, 'info', 'emails');
    } 
    // If not in cache, get it using the batch field processor
    else {
      fieldValue = await findFieldValueByStableIdBatch(formId, condition.field, formData);
    }
    
    // If the field doesn't exist, the condition doesn't match
    if (fieldValue === undefined || fieldValue === null) {
      return false;
    }
    
    // Convert values to strings for comparison
    const fieldValueStr = String(fieldValue).toLowerCase();
    const conditionValueStr = condition.value ? String(condition.value).toLowerCase() : '';
    
    // Check the condition based on the operator
    let matches = false;
    switch (condition.operator) {
      case 'equals':
        matches = fieldValueStr === conditionValueStr;
        break;
      case 'notEquals':
        matches = fieldValueStr !== conditionValueStr;
        break;
      case 'contains':
        matches = fieldValueStr.includes(conditionValueStr);
        break;
      case 'notContains':
        matches = !fieldValueStr.includes(conditionValueStr);
        break;
      case 'startsWith':
        matches = fieldValueStr.startsWith(conditionValueStr);
        break;
      case 'endsWith':
        matches = fieldValueStr.endsWith(conditionValueStr);
        break;
      case 'exists':
        matches = true; // If we got here, the field exists
        break;
      case 'notExists':
        matches = false; // If we got here, the field exists, so this is always false
        break;
      case 'greaterThan':
        matches = parseFloat(fieldValueStr) > parseFloat(conditionValueStr);
        break;
      case 'lessThan':
        matches = parseFloat(fieldValueStr) < parseFloat(conditionValueStr);
        break;
      default:
        matches = false;
    }
    
    const duration = Date.now() - startTime;
    addApiLog(`Condition check: field=${condition.field}, operator=${condition.operator}, value=${condition.value}, matches=${matches} (${duration}ms)`, 'info', 'emails');
    
    return matches;
  } catch (error) {
    addApiLog(`Error checking condition: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'emails');
    return false;
  }
}

/**
 * Create a promise that rejects after a timeout
 * 
 * @param ms Timeout in milliseconds
 * @param message Error message
 * @returns A promise that rejects after the specified timeout
 */
function createTimeout<T>(ms: number, message: string): Promise<T> {
  return new Promise<T>((_, reject) => {
    setTimeout(() => {
      reject(new Error(message));
    }, ms);
  });
}
