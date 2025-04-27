/**
 * Email Rule Service for Form System 2.0
 * 
 * This service handles processing email rules for form submissions.
 * It uses the EmailRule and EmailTemplate tables with proper condition evaluation.
 */

import { v4 as uuidv4 } from 'uuid';
import { EmailProcessingParams, EmailProcessingResult } from './types';
import { enhanceFormData } from './dataEnhancer';
import { fetchEmailRules, evaluateRule } from './ruleEvaluator';
import { processRuleEmail } from './emailProcessor';

/**
 * Process email rules for a form submission
 * 
 * @param params Parameters for processing email rules
 * @returns The result of the email rule processing
 */
export async function processEmailRules2(params: EmailProcessingParams): Promise<EmailProcessingResult> {
  const { formId, data } = params;
  const submissionId = params.submissionId || '';
  const correlationId = params.correlationId || uuidv4();
  const logs: any[] = [];
  
  console.log(`[FORMS2] Processing email rules for form: ${formId}`);
  console.log(`[FORMS2] Submission ID: ${submissionId}`);
  console.log(`[FORMS2] Correlation ID: ${correlationId}`);
  console.log(`[FORMS2] Using EmailRule table with proper condition evaluation`);
  
  // Add a log entry for this processing run
  logs.push({
    type: 'info',
    message: `Processing email rules for form: ${formId}`,
    timestamp: new Date().toISOString()
  });
  
  try {
    // Step 1: Enhance the form data with submission and lead data
    const enhancedData = await enhanceFormData(formId, submissionId, data, logs);
    
    // Step 2: Fetch active email rules for this form
    const rules = await fetchEmailRules(formId, logs);
    
    // If no rules found, return early
    if (rules.length === 0) {
      return {
        success: true,
        processedRules: 0,
        queuedEmails: 0,
        correlationId,
        logs,
        message: `No active email rules found for form: ${formId}`
      };
    }
    
    // Step 3: Process each email rule
    let queuedEmails = 0;
    for (const rule of rules) {
      logs.push({
        type: 'info',
        message: `Processing rule: ${rule.id} (${rule.name})`,
        timestamp: new Date().toISOString()
      });
      
      // Step 3.1: Evaluate the rule's conditions
      const evaluationResult = evaluateRule(rule, enhancedData, logs);
      
      // If the rule doesn't match, skip to the next rule
      if (!evaluationResult.isMatch) {
        console.log(`[FORMS2] Rule ${rule.id} conditions do not match, skipping`);
        continue;
      }
      
      console.log(`[FORMS2] Rule ${rule.id} conditions match, proceeding with template ${rule.template?.id} (${rule.template?.name})`);
      
      // Step 3.2: Process the email for this rule
      const emailResult = await processRuleEmail({
        rule,
        enhancedData,
        formId,
        submissionId,
        correlationId,
        logs
      });
      
      if (emailResult.success) {
        queuedEmails++;
      }
    }
    
    // Return the result
    return {
      success: true,
      processedRules: rules.length,
      queuedEmails,
      correlationId,
      logs,
      message: `Processed ${rules.length} rules, queued ${queuedEmails} emails`
    };
  } catch (error) {
    console.error(`[ERROR] Error processing email rules: ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      success: false,
      processedRules: 0,
      queuedEmails: 0,
      correlationId,
      logs,
      error: `Error processing email rules: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// Export all components for direct access
export * from './types';
export * from './dataEnhancer';
export * from './ruleEvaluator';
export * from './emailProcessor';
