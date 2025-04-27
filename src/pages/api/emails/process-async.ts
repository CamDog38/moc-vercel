/**
 * DEPRECATED: Legacy Email Async Processing API (Forms 1.0)
 * 
 * This file is deprecated and will be removed in a future version.
 * Please use the Form System 2.0 email processing API instead:
 * - src/pages/api/emails2/process-async2.ts
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import prisma from '@/lib/prisma';
import { addApiLog } from '@/pages/api/debug/logs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Import the Form System 2.0 email processing utilities
import {
  processEmailAsync2,
  ProcessEmailAsyncParams2
} from '@/pages/api/emails2/process-async2';

// Standard logging header for file
const fileName = path.basename(__filename);
const fileVersion = '1.0 (DEPRECATED)';
console.log(`[FILE NAME] ${fileName}`);
console.log(`[${fileVersion} FILE]`);
console.log(`[DEPRECATED] This file is deprecated and will be removed in a future version.`);
console.log(`[DEPRECATED] Please use the Form System 2.0 email processing API instead.`);

// Define the interface for the function parameters
interface ProcessEmailAsyncParams {
  templateId: string;
  submissionId: string;
  data?: Record<string, any>;
  leadId?: string;
  userId?: string;
  recipient: string;
  ccEmails?: string;
  bccEmails?: string;
  ruleId?: string;
}

interface ProcessEmailResult {
  success: boolean;
  message: string;
  emailLogId?: string;
  error?: string;
}

/**
 * Extract variables from the parameters for legacy support
 */
function extractVariables(params: ProcessEmailAsyncParams) {
  // Return normalized variables from the params
  const {
    templateId,
    submissionId,
    data = {},
    leadId = null,
    userId = '',
    recipient,
    ccEmails,
    bccEmails,
    ruleId = null
  } = params;

  return {
    templateId,
    submissionId,
    data,
    leadId,
    userId,
    recipient,
    ccEmails,
    bccEmails,
    ruleId
  };
}

/**
 * DEPRECATED: Process an email synchronously directly from the API
 * This function is deprecated and will be removed in a future version.
 * Please use the Form System 2.0 email processing API instead.
 */
export async function processEmailAsync(
  paramOrTemplateId: ProcessEmailAsyncParams | string,
  submissionId?: string,
  formData?: Record<string, any>,
  leadId?: string,
  userId?: string,
  recipientEmail?: string,
  ccEmails?: string,
  bccEmails?: string
): Promise<ProcessEmailResult> {
  console.log(`[DEPRECATED] Using legacy processEmailAsync. Please migrate to Form System 2.0.`);
  console.log(`[FUNCTION] processEmailAsync starting`);
  console.log(`[VERSION] 1.0 Email Processing (DEPRECATED)`);
  
  try {
    // Support both object-based and positional parameters for backward compatibility
    console.log(`[PROCESSING] Normalizing function parameters`);
    let processTemplateId: string;
    let processSubmissionId: string;
    let processFormData: Record<string, any> = {};
    let processLeadId: string | null = null;
    let processUserId: string = '';
    let processRecipientEmail: string;
    let processCcEmails: string | undefined;
    let processBccEmails: string | undefined;
    let processRuleId: string | null = null;

    if (typeof paramOrTemplateId === 'object') {
      // If the first param is an object, extract variables from it
      console.log(`[PROCESSING] Using object parameter format`);
      const vars = extractVariables(paramOrTemplateId);
      processTemplateId = vars.templateId;
      processSubmissionId = vars.submissionId;
      processFormData = vars.data || {};
      processLeadId = vars.leadId || null;
      processUserId = vars.userId || '';
      processRecipientEmail = vars.recipient;
      processCcEmails = vars.ccEmails;
      processBccEmails = vars.bccEmails;
      processRuleId = vars.ruleId || null;
    } else {
      // Use positional parameters
      console.log(`[PROCESSING] Using positional parameter format`);
      processTemplateId = paramOrTemplateId;
      processSubmissionId = submissionId || '';
      processFormData = formData || {};
      processLeadId = leadId || null;
      processUserId = userId || '';
      processRecipientEmail = recipientEmail || '';
      processCcEmails = ccEmails;
      processBccEmails = bccEmails;
    }

    // Validate required parameters
    if (!processTemplateId) {
      addApiLog('Missing templateId in processEmailAsync', 'error', 'emails');
      throw new Error('Missing templateId');
    }

    if (!processSubmissionId) {
      addApiLog('Missing submissionId in processEmailAsync', 'error', 'emails');
      throw new Error('Missing submissionId');
    }

    if (!processRecipientEmail) {
      addApiLog('Missing recipient email in processEmailAsync', 'error', 'emails');
      throw new Error('Missing recipient email');
    }

    // Try to get the form ID from the submission
    let formId = '';
    try {
      const submission = await prisma.formSubmission.findUnique({
        where: { id: processSubmissionId },
        select: { formId: true }
      });
      
      if (submission) {
        formId = submission.formId;
      }
    } catch (error) {
      console.error(`[ERROR] Error fetching submission: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Use the Form System 2.0 email processing API
    const result = await processEmailAsync2({
      templateId: processTemplateId,
      submissionId: processSubmissionId,
      formId: formId,
      data: processFormData,
      userId: processUserId || 'system',
      recipient: processRecipientEmail,
      ccEmails: processCcEmails,
      bccEmails: processBccEmails,
      ruleId: processRuleId || undefined
    });

    // Map the result to the legacy format
    return {
      success: result.success,
      message: result.message,
      emailLogId: result.emailLogId,
      error: result.error
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    addApiLog(`Error in async email processing: ${errorMessage}`, 'error', 'emails');
    console.error('Error in async email processing:', error);
    
    return {
      success: false,
      message: `Error in async email processing: ${errorMessage}`,
      error: errorMessage
    };
  }
}

/**
 * DEPRECATED: API handler for async email processing
 * This API is deprecated and will be removed in a future version.
 * Please use the Form System 2.0 email processing API instead.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Standard logging header
  const fileName = path.basename(__filename);
  const filePath = __filename;
  const fileVersion = '1.0 (DEPRECATED)';
  const apiSource = req.headers['referer'] || 'Unknown';
  
  console.log(`[FILE NAME] ${fileName}`);
  console.log(`[FILE PATH] ${filePath}`);
  console.log(`[${fileVersion} FILE]`);
  console.log(`[DEPRECATED] This API is deprecated and will be removed in a future version.`);
  console.log(`[DEPRECATED] Please use the Form System 2.0 email processing API instead.`);
  console.log(`[API RECEIVED FROM] ${apiSource}`);
  console.log(`[PROCESSING] Email async processing API handler starting`);
  console.log(`[REQUEST] Method: ${req.method}`);
  
  if (req.method !== 'POST') {
    console.log(`[ERROR] Method not allowed: ${req.method}`);
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  console.log(`[PROCESSING] Handling POST request for async email processing`);

  try {
    console.log(`[PROCESSING] Calling processEmailAsync with request body`);
    const result = await processEmailAsync(req.body);
    console.log(`[RESPONSE] Sending 200 response with success result`);
    return res.status(200).json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[ERROR] Error in async email processing: ${errorMessage}`);
    console.log(`[RESPONSE] Sending 500 error response`);
    return res.status(500).json({ error: errorMessage });
  }
}
