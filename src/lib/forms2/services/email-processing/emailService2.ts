/**
 * Form System 2.0 Email Service
 * 
 * This service handles processing and sending emails for form submissions.
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { EmailSendParams, EmailSendResult } from './types';
import { fetchTemplateById2, processCcEmailsWithTemplate2, processBccEmailsWithTemplate2 } from './templateService2';
import { replaceVariables2 } from './variableService2';
import { sendEmail2, createEmailLog2 } from './sendService2';
import { updateEmailLog2 } from './updateEmailLog2';

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Log a message to the API logs
 * 
 * @param message The message to log
 * @param type The type of log (success, error, info, warning)
 * @param category The category of the log
 */
function addApiLog(message: string, type: 'success' | 'error' | 'info' | 'warning', category: string) {
  console.log(`[API LOG] [${type.toUpperCase()}] [${category}] ${message}`);
}

/**
 * Process and send an email for a form submission
 * 
 * @param params Parameters for processing the email
 * @returns The result of the email processing
 */
export async function processEmail2(params: EmailSendParams): Promise<EmailSendResult> {
  const correlationId = params.correlationId || uuidv4();
  
  console.log(`[EMAIL PROCESSING2] Processing email with correlation ID: ${correlationId}`);
  console.log(`[EMAIL PROCESSING2] Template ID: ${params.templateId}`);
  console.log(`[EMAIL PROCESSING2] Submission ID: ${params.submissionId}`);
  console.log(`[EMAIL PROCESSING2] Form ID: ${params.formId}`);
  console.log(`[EMAIL PROCESSING2] Recipient: ${params.recipient}`);
  
  try {
    // Fetch the submission data
    console.log(`[DATABASE] Fetching submission data for ID: ${params.submissionId}`);
    const submission = await prisma.formSubmission.findUnique({
      where: { id: params.submissionId }
    });
    
    if (!submission) {
      console.log(`[ERROR] Submission not found in FormSubmission table`);
      addApiLog(`Submission not found with ID: ${params.submissionId}`, 'error', 'emails');
      return {
        success: false,
        message: `Submission not found with ID: ${params.submissionId}`,
        error: 'Submission not found'
      };
    } else {
      console.log(`[DATABASE] Found submission in FormSubmission table`);
    }
    
    // Fetch the template
    console.log(`[DATABASE] Fetching template with ID: ${params.templateId}`);
    const template = await fetchTemplateById2(params.templateId);
    
    if (!template) {
      console.log(`[ERROR] Template not found with ID: ${params.templateId}`);
      addApiLog(`Template not found with ID: ${params.templateId}`, 'error', 'emails');
      return {
        success: false,
        message: `Template not found with ID: ${params.templateId}`,
        error: 'Template not found'
      };
    }
    
    console.log(`[EMAIL PROCESSING2] Using template: ${template.name}`);
    
    // Process the template variables
    console.log(`[EMAIL PROCESSING2] Processing template variables`);
    const processedSubject = replaceVariables2(template.subject, params.data);
    const processedHtml = replaceVariables2(template.htmlContent, params.data);
    const processedText = template.textContent 
      ? replaceVariables2(template.textContent, params.data)
      : replaceVariables2(template.htmlContent.replace(/<[^>]*>/g, ''), params.data);
    
    console.log(`[EMAIL PROCESSING2] Processed subject: ${processedSubject}`);
    
    // Process CC and BCC emails
    const finalCcEmails = await processCcEmailsWithTemplate2(template.id, params.ccEmails);
    const finalBccEmails = await processBccEmailsWithTemplate2(template.id, params.bccEmails);
    
    // Skip EmailQueue creation since it's not set up yet
    console.log(`[LEGACY EMAIL SYSTEM] Skipping EmailQueue creation as it's not set up yet`);
    
    // Create an email log record in the original EmailLog table
    const emailLogId = await createEmailLog2(
      template.id,
      params.recipient,
      processedSubject,
      'QUEUED',
      params.submissionId,
      params.userId,
      finalCcEmails,
      finalBccEmails
    );
    
    // Send the email using SendGrid
    try {
      const sendResult = await sendEmail2(
        params.recipient,
        processedSubject,
        processedHtml,
        processedText,
        finalCcEmails,
        finalBccEmails
      );
      
      if (sendResult.success) {
        // Update the email log with the sent status
        await updateEmailLog2(emailLogId, 'SENT');
        
        return {
          success: true,
          message: 'Email sent successfully',
          emailLogId
        };
      } else {
        // Update the email log with the error status
        await updateEmailLog2(emailLogId, 'FAILED', sendResult.error);
        
        return {
          success: false,
          message: `Email queued but sending failed: ${sendResult.error}`,
          emailLogId,
          error: sendResult.error
        };
      }
    } catch (sendError) {
      const sendErrorMessage = sendError instanceof Error ? sendError.message : 'Unknown error';
      
      // Update the email log with the error status
      await updateEmailLog2(emailLogId, 'FAILED', sendErrorMessage);
      
      return {
        success: false,
        message: `Email queued but sending failed: ${sendErrorMessage}`,
        emailLogId,
        error: sendErrorMessage
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[ERROR] Error processing email: ${errorMessage}`);
    addApiLog(`Error processing email: ${errorMessage}`, 'error', 'emails');
    
    return {
      success: false,
      message: `Error processing email: ${errorMessage}`,
      error: errorMessage
    };
  }
}
