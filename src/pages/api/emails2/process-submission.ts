/**
 * Email System 2.0 API - Process Submission Endpoint
 * 
 * POST: Process email rules for a form submission
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { EmailProcessor } from '@/lib/emails2/emailProcessor';
import path from 'path';
import { addApiLog } from '@/pages/api/debug/logs';

const emailProcessor = new EmailProcessor();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Standard logging header
  const fileName = path.basename(__filename);
  const filePath = __filename;
  const fileVersion = '2.0';
  const apiSource = req.headers['referer'] || 'Unknown';
  
  console.log(`[FILE NAME] ${fileName}`);
  console.log(`[FILE PATH] ${filePath}`);
  console.log(`[${fileVersion} FILE]`);
  console.log(`[API RECEIVED FROM] ${apiSource}`);
  console.log(`[PROCESSING] Email processing handler starting`);
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log(`[ERROR] Method not allowed: ${req.method}`);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { submissionId, formId, data, source = 'api' } = req.body;
    
    console.log(`[PROCESSING] Processing email rules for form ID: ${formId}`);
    console.log(`[PROCESSING] Submission ID: ${submissionId || 'Not provided'}`);
    console.log(`[PROCESSING] Source: ${source}`);
    console.log(`[FORM DATA] Keys received: ${data ? Object.keys(data).join(', ') : 'None'}`);
    
    if (data) {
      console.log(`[FORM DATA] Email field value: ${data.email || 'Not provided'}`);
      console.log(`[FORM DATA] Name field value: ${data.name || 'Not provided'}`);
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

    // Process the submission
    console.log(`[EMAIL RULES] Calling EmailProcessor.processSubmission`);
    console.log(`[API TO TRIGGER NEXT STEP] EmailProcessor in lib/emails2/emailProcessor.ts`);
    
    const result = await emailProcessor.processSubmission({
      submissionId,
      formId,
      data: data || {},
      source,
    });
    
    console.log(`[EMAIL RULES] Processing complete with ${result.processedRules || 0} rules processed`);
    console.log(`[EMAIL RULES] Queued ${result.queuedEmails || 0} emails for sending`);
    console.log(`[EMAIL RULES] Correlation ID: ${result.correlationId || 'None'}`);
    
    if (result.success) {
      console.log(`[EMAIL RULES] Email processing completed successfully`);
      addApiLog(`Email processing completed successfully for form ID: ${formId}, processed ${result.processedRules || 0} rules, queued ${result.queuedEmails || 0} emails`, 'success', 'emails');
    } else {
      console.log(`[EMAIL RULES] Email processing completed with errors`);
      addApiLog(`Email processing completed with errors for form ID: ${formId}`, 'error', 'emails');
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
    console.error(`[ERROR] Error processing submission:`, error);
    addApiLog(`Error processing email rules: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'emails');
    return res.status(500).json({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' });
  }
}
