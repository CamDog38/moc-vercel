/**
 * Form System 2.0 - Email Rule Processing API
 * 
 * This API endpoint handles email rule processing for Form System 2.0
 * with detailed terminal logging and using the original EmailRule and EmailTemplate tables.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { addApiLog } from '@/pages/api/debug/logs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Import the Form System 2.0 email processing utilities that use the original EmailRule and EmailTemplate tables
import { processEmailRules2 } from '@/util/email-processing2';

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * API handler for email rule processing
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
  console.log(`[PROCESSING] Email rule processing API handler starting`);
  console.log(`[REQUEST] Method: ${req.method}`);
  
  if (req.method !== 'POST') {
    console.log(`[ERROR] Method not allowed: ${req.method}`);
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  console.log(`[PROCESSING] Handling POST request for email rule processing`);

  try {
    const { formId, data, source = 'api' } = req.body;
    let { submissionId } = req.body;
    
    console.log(`[PROCESSING] Processing email rules for form ID: ${formId}`);
    console.log(`[PROCESSING] Submission ID: ${submissionId || 'Not provided'}`);
    console.log(`[PROCESSING] Source: ${source}`);
    console.log(`[FORM DATA] Keys received: ${data ? Object.keys(data).join(', ') : 'None'}`);
    console.log(`[EMAIL SYSTEM] Using original EmailRule and EmailTemplate tables`);
    
    if (data) {
      console.log(`[FORM DATA] Email field value: ${data.email || 'Not provided'}`);
      console.log(`[FORM DATA] Name field value: ${data.name || 'Not provided'}`);
    }
    
    // If submissionId is not provided, we need to create a temporary submission record
    if (!submissionId && data) {
      console.log(`[SUBMISSION] No submission ID provided, creating temporary submission record`);
      try {
        const tempSubmission = await prisma.formSubmission.create({
          data: {
            formId,
            data: data as any,
            timeStamp: new Date().toISOString()
          }
        });
        console.log(`[SUBMISSION] Created temporary submission with ID: ${tempSubmission.id}`);
        addApiLog(`Created temporary submission with ID: ${tempSubmission.id}`, 'info', 'emails');
        
        // Use the newly created submission ID
        submissionId = tempSubmission.id;
      } catch (error) {
        console.error(`[ERROR] Failed to create temporary submission: ${error instanceof Error ? error.message : 'Unknown error'}`);
        addApiLog(`Failed to create temporary submission: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'emails');
      }
    }

    // Validate required parameters
    if (!formId) {
      console.log(`[ERROR] Form ID is required but was not provided`);
      return res.status(400).json({ error: 'Form ID is required' });
    }

    if (!data && !submissionId) {
      console.log(`[ERROR] Either submission ID or form data is required but neither was provided`);
      return res.status(400).json({ error: 'Either submission ID or form data is required' });
    }
    
    addApiLog(`Processing email rules for form ID: ${formId}, submission ID: ${submissionId || 'Not provided'}`, 'info', 'emails');

    // Process the email rules using the original EmailRule and EmailTemplate tables
    console.log(`[EMAIL RULES] Calling processEmailRules2 with original EmailRule and EmailTemplate tables`);
    console.log(`[EMAIL RULES] Form ID: ${formId}`);
    console.log(`[EMAIL RULES] Submission ID: ${submissionId || 'Not provided'}`);
    
    const result = await processEmailRules2(
      formId,
      submissionId,
      data || {}
    );
    
    console.log(`[EMAIL RULES] Processing complete with ${result.processedRules || 0} rules processed`);
    console.log(`[EMAIL RULES] Queued ${result.queuedEmails || 0} emails for sending`);
    console.log(`[EMAIL RULES] Correlation ID: ${result.correlationId || 'None'}`);
    
    if (result.success) {
      console.log(`[EMAIL RULES] Email rule processing completed successfully`);
      addApiLog(`Email rule processing completed successfully for form ID: ${formId}, processed ${result.processedRules || 0} rules, queued ${result.queuedEmails || 0} emails`, 'success', 'emails');
    } else {
      console.log(`[EMAIL RULES] Email rule processing completed with errors`);
      addApiLog(`Email rule processing completed with errors for form ID: ${formId}`, 'error', 'emails');
    }

    // Return the result
    console.log(`[RESPONSE] Sending response with ${result.processedRules || 0} processed rules and ${result.queuedEmails || 0} queued emails`);
    return res.status(200).json({
      success: result.success,
      processedRules: result.processedRules,
      queuedEmails: result.queuedEmails,
      correlationId: result.correlationId,
      logs: result.logs,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[ERROR] Error processing email rules: ${errorMessage}`);
    addApiLog(`Error processing email rules: ${errorMessage}`, 'error', 'emails');
    return res.status(500).json({ error: 'Internal server error', message: errorMessage });
  }
  
  console.log(`[PROCESSING] Email rule processing API handler completed`);
}
