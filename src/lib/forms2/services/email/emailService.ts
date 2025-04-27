/**
 * DEPRECATED: Form System 2.0 Email Service
 * 
 * This file is DEPRECATED and will be removed in a future version.
 * It now redirects all calls to the email-processing services which use the bomb-proof email rule system.
 * 
 * DO NOT USE THIS FILE FOR NEW DEVELOPMENT.
 * IMPORT FROM '@/lib/forms2/services/email-processing' INSTEAD.
 */

import path from 'path';
import * as logger from '@/util/logger';

// Import the new implementations
import { processEmail2 } from '../email-processing/emailService2';
import { processEmailRules2 } from '../email-processing/ruleService2';

// Standard logging header for file
const fileName = path.basename(__filename);
const fileVersion = '1.0 (DEPRECATED)';
console.log(`[FILE NAME] ${fileName}`);
console.log(`[${fileVersion} FILE]`);
console.log(`[DEPRECATED] This file is deprecated and will be removed in a future version.`);
console.log(`[DEPRECATED] It now redirects all calls to the email-processing services which use the bomb-proof email rule system.`);
console.log(`[DEPRECATED] DO NOT USE THIS FILE FOR NEW DEVELOPMENT.`);
console.log(`[DEPRECATED] IMPORT FROM '@/lib/forms2/services/email-processing' INSTEAD.`);

// Define the SendEmailParams interface here to avoid import issues
export interface SendEmailParams {
  templateId: string;
  submissionId: string;
  leadId?: string | null;
  data: Record<string, any>;
  userId: string;
  recipient: string;
  ccEmails?: string;
  bccEmails?: string;
  ruleId?: string;
}

// Import the EmailTemplateData interface from the local file
import { EmailTemplateData } from './emailVariableHelpers';

/**
 * DEPRECATED: Process email rules for a Form System 2.0 submission
 * This function is deprecated and redirects to the new implementation in email-processing/ruleService2.ts
 * 
 * @param formId The ID of the form
 * @param submissionId The ID of the submission
 * @param formData The form submission data
 * @returns The result of processing the email rules
 */
export async function processEmailRules(formId: string, submissionId: string, formData: Record<string, any>): Promise<{
  success: boolean;
  message: string;
  error?: any;
}> {
  // Log deprecation warning
  logger.info(`[DEPRECATED] Using deprecated processEmailRules. Please import from '@/lib/forms2/services/email-processing' instead.`, 'emails');
  
  // Forward the call to the new implementation
  try {
    const result = await processEmailRules2({
      formId,
      submissionId,
      data: formData,
      correlationId: undefined
    });
    
    // Ensure we return the expected type
    return {
      success: result.success,
      message: result.message || 'Email rules processed',
      error: result.error
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Error processing email rules: ${errorMessage}`,
      error
    };
  }
}

/**
 * DEPRECATED: Sends an email using SendGrid based on a template and form submission data
 * This function is deprecated and redirects to the new implementation in email-processing/emailService2.ts
 * 
 * @param params Parameters for sending the email
 * @returns The result of sending the email
 */
export async function sendEmailWithSendGrid(params: SendEmailParams): Promise<{
  success: boolean;
  message: string;
  emailLogId?: string;
  error?: any;
}> {
  // Log deprecation warning
  logger.info(`[DEPRECATED] Using deprecated sendEmailWithSendGrid. Please import from '@/lib/forms2/services/email-processing' instead.`, 'emails');
  
  // Forward the call to the new implementation
  try {
    const result = await processEmail2({
      templateId: params.templateId,
      submissionId: params.submissionId,
      formId: '', // This is not used in the new implementation
      data: params.data,
      userId: params.userId,
      recipient: params.recipient,
      ccEmails: params.ccEmails,
      bccEmails: params.bccEmails,
      correlationId: undefined
      // Note: leadId and ruleId are not in EmailSendParams in the new implementation
    });
    
    // Ensure we return the expected type
    return {
      success: result.success,
      message: result.message || 'Email sent successfully',
      emailLogId: result.emailLogId,
      error: result.error
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Error sending email: ${errorMessage}`,
      error
    };
  }
}
