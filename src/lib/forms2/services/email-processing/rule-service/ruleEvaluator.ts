/**
 * Rule Evaluator for Email Rule Service
 * 
 * This module handles fetching and evaluating email rules.
 */

import { PrismaClient, EmailRule } from '@prisma/client';
import { evaluateConditions } from '@/lib/emails2/conditions';
import { EnhancedData, RuleEvaluationResult } from './types';

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Fetches active email rules for a form
 * 
 * @param formId The ID of the form
 * @param logs Array to store log messages
 * @returns Array of email rules with their templates
 */
export async function fetchEmailRules(
  formId: string,
  logs: any[]
): Promise<(EmailRule & { 
  template: { 
    id: string; 
    name: string; 
    ccEmails?: string | null; 
    bccEmails?: string | null; 
  } 
})[]> {
  logs.push({
    type: 'info',
    message: `Fetching email rules for form: ${formId}`,
    timestamp: new Date().toISOString()
  });
  
  // Fetch active email rules for this form
  const rules = await prisma.emailRule.findMany({
    where: {
      formId: formId,
      active: true
    },
    include: {
      template: {
        select: {
          id: true,
          name: true,
          ccEmails: true,
          bccEmails: true
        }
      }
    },
    orderBy: {
      createdAt: 'asc'
    }
  });
  
  console.log(`[FORMS2] Found ${rules.length} active email rules for form: ${formId}`);
  
  logs.push({
    type: 'info',
    message: `Found ${rules.length} active email rules`,
    timestamp: new Date().toISOString()
  });
  
  // Sort rules to prioritize those with conditions
  const sortedRules = rules.sort((a, b) => {
    const aHasConditions = a.conditions && a.conditions !== '[]';
    const bHasConditions = b.conditions && b.conditions !== '[]';
    
    if (aHasConditions && !bHasConditions) return -1;
    if (!aHasConditions && bHasConditions) return 1;
    return 0;
  });
  
  return sortedRules;
}

/**
 * Checks if a rule has valid conditions
 * 
 * @param rule The email rule to check
 * @returns True if the rule has valid conditions, false otherwise
 */
export function hasValidConditions(rule: EmailRule): boolean {
  const hasNoConditions = !rule.conditions || 
    rule.conditions === '[]' || 
    rule.conditions === '{}' || 
    rule.conditions === 'null' || 
    rule.conditions === '' || 
    (typeof rule.conditions === 'string' && JSON.parse(rule.conditions).length === 0) || 
    (Array.isArray(rule.conditions) && rule.conditions.length === 0);
    
  return !hasNoConditions;
}

/**
 * Evaluates if a rule's conditions match the form data
 * 
 * @param rule The email rule to evaluate
 * @param enhancedData The enhanced form data
 * @param logs Array to store log messages
 * @returns Result of the rule evaluation
 */
export function evaluateRule(
  rule: EmailRule,
  enhancedData: EnhancedData,
  logs: any[]
): RuleEvaluationResult {
  // If there are no conditions, don't process this rule
  if (!hasValidConditions(rule)) {
    console.log(`[FORMS2] Rule ${rule.id} has no conditions, skipping. Rules must have conditions to be processed.`);
    logs.push({
      type: 'warning',
      message: `Rule ${rule.id} has no conditions, skipping. Rules must have conditions to be processed.`,
      timestamp: new Date().toISOString()
    });
    return { isMatch: false, logs };
  }
  
  // Evaluate conditions if they exist
  if (rule.conditions) {
    console.log(`[FORMS2] Evaluating conditions for rule: ${rule.id}`);
    logs.push({
      type: 'info',
      message: `Evaluating conditions for rule: ${rule.id}`,
      timestamp: new Date().toISOString()
    });
    
    let parsedConditions;
    try {
      // Parse the conditions if they're a string
      parsedConditions = typeof rule.conditions === 'string' 
        ? JSON.parse(rule.conditions) 
        : rule.conditions;
    } catch (error) {
      console.error(`[ERROR] Failed to parse conditions for rule ${rule.id}: ${error instanceof Error ? error.message : String(error)}`);
      logs.push({
        type: 'error',
        message: `Failed to parse conditions for rule ${rule.id}: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString()
      });
      return { isMatch: false, logs };
    }
    
    // If there are no conditions after parsing, skip this rule
    if (!Array.isArray(parsedConditions) || parsedConditions.length === 0) {
      console.log(`[FORMS2] No valid conditions found for rule: ${rule.id}, skipping`);
      logs.push({
        type: 'warning',
        message: `No valid conditions found for rule: ${rule.id}, skipping`,
        timestamp: new Date().toISOString()
      });
      return { isMatch: false, logs };
    }
    
    // Evaluate the conditions against the form data
    const conditionResult = evaluateConditions(parsedConditions, enhancedData);
    console.log(`[FORMS2] Condition evaluation result for rule ${rule.id}: ${conditionResult}`);
    
    logs.push({
      type: conditionResult ? 'success' : 'info',
      message: `Condition evaluation result for rule ${rule.id}: ${conditionResult ? 'MATCH' : 'NO MATCH'}`,
      timestamp: new Date().toISOString()
    });
    
    return { isMatch: conditionResult, logs };
  }
  
  // If we get here, there are no conditions to evaluate
  return { isMatch: false, logs };
}
