/**
 * Email Processor for Email Rule Service
 * 
 * This module handles processing and sending emails based on rules.
 */

import { processEmail2 } from '../emailService2';
import { RuleProcessingParams, RuleProcessingResult } from './types';

/**
 * Processes an email based on a rule
 * 
 * @param params Parameters for processing the email
 * @returns Result of the email processing
 */
export async function processRuleEmail(params: RuleProcessingParams): Promise<RuleProcessingResult> {
  const { rule, enhancedData, formId, submissionId, correlationId, logs } = params;
  
  // Check if the rule has a template
  if (!rule.template) {
    logs.push({
      type: 'warning',
      message: `Rule ${rule.id} has no template, skipping`,
      timestamp: new Date().toISOString()
    });
    return { success: false, emailSent: false, logs };
  }
  
  // Try to get recipient from the field
  let recipient: string | undefined = undefined;
  if (rule.recipientField) {
    recipient = enhancedData[rule.recipientField];
    console.log(`[FORMS2] Recipient value from field ${rule.recipientField}: ${recipient || 'NOT FOUND'}`);
  } else {
    console.log(`[FORMS2] No recipient field specified for rule ${rule.id}`);
  }
  
  // If no recipient found in the specified field, try to use the email field as a fallback
  if (!recipient && enhancedData.email) {
    console.log(`[FORMS2] No recipient found for field: ${rule.recipientField}, trying email field as fallback`);
    const fallbackRecipient = enhancedData.email;
    
    if (fallbackRecipient) {
      console.log(`[FORMS2] Using fallback recipient from email field: ${fallbackRecipient}`);
      // Use the fallback recipient
      recipient = fallbackRecipient;
    }
  }
  
  // Final check if we have a recipient
  if (!recipient) {
    console.log(`[FORMS2] No recipient found for field: ${rule.recipientField} and no fallback available`);
    logs.push({
      type: 'warning',
      message: `No recipient found for field: ${rule.recipientField}, skipping rule: ${rule.id}`,
      timestamp: new Date().toISOString()
    });
    return { success: false, emailSent: false, logs };
  }
  
  console.log(`[FORMS2] Found recipient: ${recipient} for field: ${rule.recipientField}`);
  
  // Process the email
  console.log(`[FORMS2] Preparing to send email to: ${recipient} using template: ${rule.template.name} (ID: ${rule.template.id})`);
  console.log(`[FORMS2] Template details: ID=${rule.template.id}, Name=${rule.template.name}`);
  
  logs.push({
    type: 'info',
    message: `Sending email to: ${recipient} using template: ${rule.template.name}`,
    timestamp: new Date().toISOString()
  });
  
  try {
    console.log(`[FORMS2] Calling processEmail2 with template ID: ${rule.template.id}`);
    
    console.log(`[FORMS2] Calling processEmail2 with parameters:`);
    console.log(`[FORMS2]   - templateId: ${rule.template.id}`);
    console.log(`[FORMS2]   - submissionId: ${submissionId}`);
    console.log(`[FORMS2]   - formId: ${formId}`);
    console.log(`[FORMS2]   - recipient: ${recipient}`);
    console.log(`[FORMS2]   - ccEmails: ${rule.template.ccEmails || 'None'}`);
    console.log(`[FORMS2]   - bccEmails: ${rule.template.bccEmails || 'None'}`);
    
    const emailResult = await processEmail2({
      templateId: rule.template.id,
      submissionId: submissionId,
      formId: formId,
      data: enhancedData,
      recipient: recipient,
      ccEmails: rule.template.ccEmails || undefined,
      bccEmails: rule.template.bccEmails || undefined,
      ruleId: rule.id,
      correlationId,
      userId: enhancedData.userId || process.env.SYSTEM_USER_ID || ''
    });
    
    console.log(`[FORMS2] processEmail2 result: ${JSON.stringify(emailResult)}`);
    
    if (emailResult.success) {
      logs.push({
        type: 'success',
        message: `Email queued successfully: ${emailResult.emailLogId}`,
        timestamp: new Date().toISOString()
      });
      return { success: true, emailSent: true, logs };
    } else {
      logs.push({
        type: 'error',
        message: `Failed to queue email: ${emailResult.error}`,
        timestamp: new Date().toISOString()
      });
      return { success: false, emailSent: false, logs, error: emailResult.error };
    }
  } catch (error) {
    logs.push({
      type: 'error',
      message: `Error processing email: ${error instanceof Error ? error.message : String(error)}`,
      timestamp: new Date().toISOString()
    });
    return { 
      success: false, 
      emailSent: false, 
      logs, 
      error: `Error processing email: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
