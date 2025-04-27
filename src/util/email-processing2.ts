/**
 * Form System 2.0 Email Processing Utilities (Forwarding File)
 * 
 * This file forwards to the modular email processing system in @/lib/forms2/services/email-processing
 * It maintains backward compatibility with existing code that imports from this file.
 */

import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { 
  replaceVariables2 as replaceVariablesImpl,
  processEmail2 as processEmailImpl,
  processEmailRules2 as processEmailRulesImpl
} from '../lib/forms2/services/email-processing';

import type {
  EmailSendParams,
  EmailProcessingParams,
  EmailSendResult,
  EmailProcessingResult,
  EnhancedData
} from '../lib/forms2/services/email-processing/types';

// Standard logging header for file
const fileName = path.basename(__filename);
const fileVersion = '2.0';
console.log(`[FILE NAME] ${fileName}`);
console.log(`[${fileVersion} FILE]`);
console.log(`[LEGACY EMAIL SYSTEM] Using original EmailRule and EmailTemplate tables with Form System 2.0 processing`);
console.log(`[LEGACY EMAIL SYSTEM] This is a forwarding file to the modular email-processing system`);
console.log(`[LEGACY EMAIL SYSTEM] The actual implementation is in @/lib/forms2/services/email-processing`);

// Re-export types
export type { 
  EmailSendParams,
  EmailProcessingParams,
  EmailSendResult,
  EmailProcessingResult,
  EnhancedData
};

/**
 * Replace variables in a text with values from the data object
 * 
 * @param text The text containing variables to replace
 * @param data The data object containing values for the variables
 * @returns The text with variables replaced
 */
export function replaceVariables2(text: string, data: Record<string, any>): string {
  return replaceVariablesImpl(text, data);
}

/**
 * Process email rules for a form submission
 * 
 * @param formId The ID of the form
 * @param submissionId The ID of the form submission (optional)
 * @param data The form data
 * @returns The result of the email rule processing
 */
export async function processEmailRules2(
  formId: string, 
  submissionId?: string, 
  data: Record<string, any> = {}
): Promise<EmailProcessingResult> {
  // Generate a correlation ID
  const correlationId = uuidv4();
  
  console.log(`[LEGACY EMAIL SYSTEM] Forwarding to modular implementation with correlation ID: ${correlationId}`);
  console.log(`[LEGACY EMAIL SYSTEM] Form ID: ${formId}`);
  console.log(`[LEGACY EMAIL SYSTEM] Submission ID: ${submissionId || 'Not provided'}`);
  
  if (!formId) {
    console.error('[LEGACY EMAIL SYSTEM] Form ID is required for email processing');
    return {
      success: false,
      processedRules: 0,
      queuedEmails: 0,
      correlationId,
      logs: [],
      error: 'Form ID is required for email processing'
    };
  }
  
  // Call the implementation with the parameters
  return processEmailRulesImpl({
    formId,
    submissionId: submissionId || '', // Ensure submissionId is never undefined
    data: data || {},
    correlationId
  }) as Promise<EmailProcessingResult>;
}

/**
 * Process an email for a form submission
 * 
 * @param params Parameters for processing the email
 * @returns The result of the email processing
 */
export async function processEmail2(params: {
  templateId: string;
  submissionId: string;
  formId: string;
  data: Record<string, any>;
  userId?: string;
  recipient: string;
  ccEmails?: string;
  bccEmails?: string;
  ruleId?: string;
  correlationId?: string;
}): Promise<EmailSendResult> {
  // Generate a correlation ID if not provided
  const correlationId = params.correlationId || uuidv4();
  
  console.log(`[LEGACY EMAIL SYSTEM] Forwarding to modular implementation with correlation ID: ${correlationId}`);
  
  // Call the implementation with the parameters
  return processEmailImpl({
    ...params,
    correlationId
  }) as Promise<EmailSendResult>;
}
