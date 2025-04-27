/**
 * Form System 2.0 - Async Email Processing API
 * 
 * This API endpoint handles asynchronous email processing for Form System 2.0
 * with detailed terminal logging and compatibility with Form System 1.0.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { addApiLog } from '@/pages/api/debug/logs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Import the Form System 2.0 email processing utilities
import {
  processEmail2,
  processEmailRules2,
  ProcessEmailParams2,
  ProcessEmailResult2
} from '@/util/email-processing2';

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Interface for the function parameters
 */
export interface ProcessEmailAsyncParams2 {
  templateId: string;
  submissionId: string;
  formId: string;
  data?: Record<string, any>;
  userId: string;
  recipient: string;
  ccEmails?: string;
  bccEmails?: string;
  ruleId?: string;
}

/**
 * Extract variables from the parameters
 */
function extractVariables2(params: ProcessEmailAsyncParams2) {
  // Return normalized variables from the params
  const {
    templateId,
    submissionId,
    formId,
    data = {},
    userId,
    recipient,
    ccEmails,
    bccEmails,
    ruleId
  } = params;

  return {
    templateId,
    submissionId,
    formId,
    data,
    userId,
    recipient,
    ccEmails,
    bccEmails,
    ruleId
  };
}

/**
 * Process an email asynchronously
 */
export async function processEmailAsync2(
  paramOrTemplateId: ProcessEmailAsyncParams2 | string,
  submissionId?: string,
  formId?: string,
  formData?: Record<string, any>,
  userId?: string,
  recipientEmail?: string,
  ccEmails?: string,
  bccEmails?: string,
  ruleId?: string
): Promise<ProcessEmailResult2> {
  // Standard logging header
  const fileName = path.basename(__filename);
  const fileVersion = '2.0';
  console.log(`[FILE NAME] ${fileName}`);
  console.log(`[${fileVersion} FILE]`);
  console.log(`[FUNCTION] processEmailAsync2 starting`);
  
  console.log(`[PROCESSING] Email delay functionality not needed in Form System 2.0`);
  addApiLog('Email delay functionality not needed in Form System 2.0', 'info', 'emails');
  
  try {
    // Support both object-based and positional parameters for backward compatibility
    console.log(`[PROCESSING] Normalizing function parameters`);
    let processTemplateId: string;
    let processSubmissionId: string;
    let processFormId: string;
    let processFormData: Record<string, any> = {};
    let processUserId: string = '';
    let processRecipientEmail: string;
    let processCcEmails: string | undefined;
    let processBccEmails: string | undefined;
    let processRuleId: string | undefined;

    if (typeof paramOrTemplateId === 'object') {
      // If the first param is an object, extract variables from it
      console.log(`[PROCESSING] Using object parameter format`);
      const vars = extractVariables2(paramOrTemplateId);
      processTemplateId = vars.templateId;
      processSubmissionId = vars.submissionId;
      processFormId = vars.formId;
      processFormData = vars.data || {};
      processUserId = vars.userId;
      processRecipientEmail = vars.recipient;
      processCcEmails = vars.ccEmails;
      processBccEmails = vars.bccEmails;
      processRuleId = vars.ruleId;
      
      console.log(`[PARAMS] Template ID: ${processTemplateId}`);
      console.log(`[PARAMS] Submission ID: ${processSubmissionId}`);
      console.log(`[PARAMS] Form ID: ${processFormId}`);
      console.log(`[PARAMS] Recipient: ${processRecipientEmail}`);
    } else {
      // Use positional parameters
      console.log(`[PROCESSING] Using positional parameter format`);
      processTemplateId = paramOrTemplateId;
      processSubmissionId = submissionId || '';
      processFormId = formId || '';
      processFormData = formData || {};
      processUserId = userId || '';
      processRecipientEmail = recipientEmail || '';
      processCcEmails = ccEmails;
      processBccEmails = bccEmails;
      processRuleId = ruleId;
      
      console.log(`[PARAMS] Template ID: ${processTemplateId}`);
      console.log(`[PARAMS] Submission ID: ${processSubmissionId}`);
      console.log(`[PARAMS] Form ID: ${processFormId}`);
      console.log(`[PARAMS] Recipient: ${processRecipientEmail}`);
    }
    
    // Validate required parameters
    if (!processTemplateId) {
      const errorMessage = 'Template ID is required';
      console.error(`[ERROR] ${errorMessage}`);
      addApiLog(errorMessage, 'error', 'emails');
      return { success: false, message: errorMessage, error: 'MISSING_TEMPLATE_ID' };
    }
    
    if (!processSubmissionId) {
      const errorMessage = 'Submission ID is required';
      console.error(`[ERROR] ${errorMessage}`);
      addApiLog(errorMessage, 'error', 'emails');
      return { success: false, message: errorMessage, error: 'MISSING_SUBMISSION_ID' };
    }
    
    if (!processFormId) {
      const errorMessage = 'Form ID is required';
      console.error(`[ERROR] ${errorMessage}`);
      addApiLog(errorMessage, 'error', 'emails');
      return { success: false, message: errorMessage, error: 'MISSING_FORM_ID' };
    }
    
    if (!processRecipientEmail) {
      const errorMessage = 'Recipient email is required';
      console.error(`[ERROR] ${errorMessage}`);
      addApiLog(errorMessage, 'error', 'emails');
      return { success: false, message: errorMessage, error: 'MISSING_RECIPIENT' };
    }
    
    // Process the email
    console.log(`[PROCESSING] Processing email with Form System 2.0 utilities`);
    const result = await processEmail2({
      templateId: processTemplateId,
      submissionId: processSubmissionId,
      formId: processFormId,
      data: processFormData,
      userId: processUserId,
      recipient: processRecipientEmail,
      ccEmails: processCcEmails,
      bccEmails: processBccEmails,
      ruleId: processRuleId
    });
    
    console.log(`[PROCESSING] Email processing completed with result: ${result.success ? 'SUCCESS' : 'FAILURE'}`);
    if (result.success) {
      console.log(`[PROCESSING] Email queued successfully with log ID: ${result.emailLogId}`);
      addApiLog(`Email queued successfully with log ID: ${result.emailLogId}`, 'success', 'emails');
    } else {
      console.error(`[ERROR] Error processing email: ${result.error}`);
      addApiLog(`Error processing email: ${result.error}`, 'error', 'emails');
    }
    
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[ERROR] Error in async email processing: ${errorMessage}`);
    addApiLog(`Error in async email processing: ${errorMessage}`, 'error', 'emails');
    
    return {
      success: false,
      message: `Error in async email processing: ${errorMessage}`,
      error: errorMessage
    };
  }
}

/**
 * API handler for async email processing
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Standard logging header
  const fileName = path.basename(__filename);
  const filePath = __filename;
  const fileVersion = '2.0';
  const apiSource = req.headers['referer'] || 'Unknown';
  
  console.log(`[FILE NAME] ${fileName}`);
  console.log(`[FILE PATH] ${filePath}`);
  console.log(`[${fileVersion} FILE]`);
  console.log(`[API RECEIVED FROM] ${apiSource}`);
  console.log(`[PROCESSING] Email async processing API handler starting`);
  console.log(`[REQUEST] Method: ${req.method}`);
  
  if (req.method !== 'POST') {
    console.log(`[ERROR] Method not allowed: ${req.method}`);
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  console.log(`[PROCESSING] Handling POST request for async email processing`);

  try {
    console.log(`[PROCESSING] Calling processEmailAsync2 with request body`);
    const result = await processEmailAsync2(req.body);
    console.log(`[RESPONSE] Sending 200 response with success result`);
    return res.status(200).json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[ERROR] Error in async email processing: ${errorMessage}`);
    console.log(`[RESPONSE] Sending 500 error response`);
    return res.status(500).json({ error: errorMessage });
  }
  
  console.log(`[PROCESSING] Email async processing API handler completed`);
}
