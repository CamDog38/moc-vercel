/**
 * DEPRECATED: Form System 2.0 Email Variable Helpers
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
import { replaceVariables2 } from '../email-processing/variableService2';

// Standard logging header for file
const fileName = path.basename(__filename);
const fileVersion = '1.0 (DEPRECATED)';
console.log(`[FILE NAME] ${fileName}`);
console.log(`[${fileVersion} FILE]`);
console.log(`[DEPRECATED] This file is deprecated and will be removed in a future version.`);
console.log(`[DEPRECATED] It now redirects all calls to the email-processing services which use the bomb-proof email rule system.`);
console.log(`[DEPRECATED] DO NOT USE THIS FILE FOR NEW DEVELOPMENT.`);
console.log(`[DEPRECATED] IMPORT FROM '@/lib/forms2/services/email-processing' INSTEAD.`);

/**
 * DEPRECATED: Interface for email template data
 */
export interface EmailTemplateData {
  subject: string;
  htmlContent?: string;
  textContent?: string;
}

/**
 * DEPRECATED: Interface for variable replacement options
 */
export interface VariableReplacementOptions {
  formId: string;
  submissionId?: string;
  formData: Record<string, any>;
}

/**
 * DEPRECATED: Process variables in an email template
 * This function is deprecated and redirects to the new implementation in email-processing/variableService2.ts
 * 
 * @param template The email template containing subject and content
 * @param options Options for variable replacement
 * @returns Processed template with variables replaced
 */
export async function processEmailVariables(
  template: EmailTemplateData,
  options: VariableReplacementOptions
): Promise<EmailTemplateData> {
  // Log deprecation warning
  logger.info(`[DEPRECATED] Using deprecated processEmailVariables. Please import from '@/lib/forms2/services/email-processing' instead.`, 'emails');
  
  // Use the new implementation to replace variables
  const processedSubject = replaceVariables2(template.subject, options.formData);
  const processedHtml = replaceVariables2(template.htmlContent || '', options.formData);
  const processedText = template.textContent
    ? replaceVariables2(template.textContent, options.formData)
    : replaceVariables2((template.htmlContent || '').replace(/<[^>]*>/g, ''), options.formData);
  
  // Return the processed template
  return {
    subject: processedSubject,
    htmlContent: processedHtml,
    textContent: processedText
  };
}

/**
 * DEPRECATED: Extract recipient email from form data
 * This function is deprecated but maintained for backward compatibility
 * 
 * @param formData Form data to search for email
 * @returns Found email address or empty string
 */
export function extractRecipientEmail(formData: Record<string, any>): string {
  // Log deprecation warning
  logger.info(`[DEPRECATED] Using deprecated extractRecipientEmail. Please import from '@/lib/forms2/services/email-processing' instead.`, 'emails');
  
  // Try to find an email field in the form data
  for (const key in formData) {
    const value = formData[key];
    if (typeof value === 'string' && value.includes('@') && value.includes('.')) {
      logger.info(`[Forms2] Found email in form data: ${value} (field: ${key})`, 'emails');
      return value;
    }
  }
  
  // Look for common email field names
  const commonEmailFields = ['email', 'emailAddress', 'userEmail', 'contactEmail'];
  for (const fieldName of commonEmailFields) {
    if (formData[fieldName] && typeof formData[fieldName] === 'string') {
      return formData[fieldName];
    }
  }
  
  logger.error(`[Forms2] No recipient email found in form data`, 'emails');
  return '';
}
