/**
 * Form System 2.0 Email Sending Service
 * 
 * This service handles sending emails via SendGrid with SMTP as a backup.
 */

import { PrismaClient } from '@prisma/client';
import sgMail, { ClientResponse } from '@sendgrid/mail';
import { EmailSendResult } from './types';
import { sendDirectEmail, initializeDirectEmailService } from './directEmailService';
import { EMAIL_TIMEOUTS, EMAIL_RETRY, withTimeout } from './emailConfig2';

// Initialize Prisma client
const prisma = new PrismaClient();

// Initialize flags to track service status
let directEmailInitialized = false;
let sendGridInitialized = false;

/**
 * Helper function to format email lists for SendGrid
 * Handles string or array inputs and returns properly formatted email addresses
 */
function formatEmailList(emails?: string[] | string | null): string[] | undefined {
  if (!emails) return undefined;
  
  if (Array.isArray(emails)) {
    return emails.filter((email: string) => email && typeof email === 'string' && email.includes('@'));
  } else if (typeof emails === 'string') {
    return emails.split(',').map((email: string) => email.trim()).filter((email: string) => email && email.includes('@'));
  }
  
  return undefined;
}

/**
 * Initialize SendGrid
 * Sets up the SendGrid API with the appropriate timeout and API key
 */
const initializeSendGrid = () => {
  // Set SendGrid timeout
  sgMail.setTimeout(EMAIL_TIMEOUTS.SENDGRID_API);
  console.log(`[EMAIL SYSTEM] Initializing SendGrid...`);
  
  if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    console.log(`[EMAIL SYSTEM] SendGrid API initialized successfully with key starting with: ${process.env.SENDGRID_API_KEY.substring(0, 5)}...`);
    console.log(`[EMAIL SYSTEM] SendGrid FROM email: ${process.env.SENDGRID_FROM_EMAIL || 'notifications@marriageofficer.co.za'}`);
    return true;
  } else {
    console.warn(`[EMAIL SYSTEM] SendGrid API key not found in environment variables, emails will not be sent`);
    console.warn(`[EMAIL SYSTEM] Make sure SENDGRID_API_KEY is set in your .env file`);
    return false;
  }
};

// Initialize services asynchronously
(async () => {
  try {
    // Initialize SendGrid as primary method
    sendGridInitialized = initializeSendGrid();
    console.log(`[EMAIL SYSTEM] SendGrid initialization result: ${sendGridInitialized}`);
    
    // Initialize direct email service as backup
    directEmailInitialized = await initializeDirectEmailService();
    console.log(`[EMAIL SYSTEM] Direct email service initialization result: ${directEmailInitialized}`);
  } catch (error) {
    console.error(`[EMAIL SYSTEM] Error during service initialization:`, error);
  }
})();

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
 * Send an email via SendGrid
 * 
 * @param recipient The recipient email address
 * @param subject The email subject
 * @param htmlContent The HTML content of the email
 * @param textContent The plain text content of the email
 * @param ccEmails Optional CC email addresses
 * @param bccEmails Optional BCC email addresses
 * @returns The result of the email sending operation
 */
export async function sendEmail2(
  recipient: string,
  subject: string,
  htmlContent: string,
  textContent: string,
  ccEmails?: string[] | string | null,
  bccEmails?: string[] | string | null
): Promise<EmailSendResult> {
  // Log the email sending attempt
  console.log(`[EMAIL SENDING] Starting email send process to ${recipient}`);
  console.log(`[EMAIL SENDING] Subject: ${subject}`);
  console.log(`[EMAIL SENDING] CC: ${ccEmails ? JSON.stringify(ccEmails) : 'None'}`);
  console.log(`[EMAIL SENDING] BCC: ${bccEmails ? JSON.stringify(bccEmails) : 'None'}`);
  
  // Validate recipient email
  if (!recipient || !recipient.includes('@')) {
    console.error(`[EMAIL SENDING] Invalid recipient email: ${recipient}`);
    addApiLog(`Failed to send email: Invalid recipient email: ${recipient}`, 'error', 'emails');
    return { success: false, message: 'Email not sent', error: `Invalid recipient email: ${recipient}` };
  }
  
  // Try SendGrid first (primary method)
  if (sendGridInitialized) {
    console.log(`[EMAIL SENDING] Using SendGrid as primary method`);
    try {
      // Format the email for SendGrid
      const msg: sgMail.MailDataRequired = {
        to: recipient,
        from: process.env.SENDGRID_FROM_EMAIL || 'notifications@marriageofficer.co.za',
        subject: subject,
        text: textContent,
        html: htmlContent,
      };
      
      // Add CC and BCC recipients if available
      const formattedCC = formatEmailList(ccEmails);
      const formattedBCC = formatEmailList(bccEmails);
      
      if (formattedCC && formattedCC.length > 0) {
        msg.cc = formattedCC;
        console.log(`[EMAIL SENDING] Added CC recipients: ${formattedCC.join(', ')}`);
      }
      
      if (formattedBCC && formattedBCC.length > 0) {
        msg.bcc = formattedBCC;
        console.log(`[EMAIL SENDING] Added BCC recipients: ${formattedBCC.join(', ')}`);
      }

      // Send the email via SendGrid
      const sendgridResponse = await withTimeout<[ClientResponse, object]>(
        () => sgMail.send(msg),
        EMAIL_TIMEOUTS.SENDGRID_API,
        'SendGrid API timeout'
      );

      if (sendgridResponse) {
        const messageId = sendgridResponse[0]?.headers?.['x-message-id'] || 'unknown';
        console.log(`[EMAIL SENDING] SendGrid email sent successfully to ${recipient} with message ID: ${messageId}`);
        addApiLog(`Email sent via SendGrid to ${recipient}`, 'success', 'emails');
        return { 
          success: true, 
          message: 'Email sent successfully via SendGrid',
          directEmailUsed: false
        };
      }
    } catch (sendgridError: any) {
      console.error(`[EMAIL SENDING] SendGrid error:`, sendgridError?.response?.body || sendgridError);
      console.log(`[EMAIL SENDING] Falling back to direct email service...`);
      addApiLog(`SendGrid failed: ${sendgridError?.message || 'Unknown error'}, trying direct email as backup`, 'warning', 'emails');
    }
  } else {
    console.warn(`[EMAIL SENDING] SendGrid not initialized, trying direct email service...`);
  }

  // Try direct email as a fallback
  if (directEmailInitialized) {
    console.log(`[EMAIL SENDING] Using direct email service as backup method`);
    try {
      const directResult = await sendDirectEmail(
        recipient,
        subject,
        htmlContent,
        textContent,
        ccEmails,
        bccEmails
      );
      
      if (directResult.success) {
        addApiLog(`Email sent via direct email service to ${recipient}`, 'success', 'emails');
        return directResult;
      } else {
        console.error(`[EMAIL SENDING] Direct email service failed: ${directResult.error}`);
        addApiLog(`Direct email service failed: ${directResult.error}`, 'error', 'emails');
        return { 
          success: false, 
          message: 'Direct email service failed',
          error: directResult.error 
        };
      }
    } catch (directError: any) {
      const errorMessage = directError?.message || String(directError);
      console.error(`[EMAIL SENDING] Error using direct email service:`, directError);
      addApiLog(`Error using direct email service: ${errorMessage}`, 'error', 'emails');
      return { 
        success: false, 
        message: 'Error using direct email service',
        error: errorMessage 
      };
    }
  }
    
  // If both SendGrid and direct email are not configured
  console.error(`[EMAIL SENDING] Both SendGrid and direct email failed or not configured. Cannot send email.`);
  addApiLog(`Failed to send email: No email service available`, 'error', 'emails');
  return { 
    success: false, 
    message: 'Email not sent',
    error: 'No email service available' 
  };
}

/**
 * Create an email log record in the database
 * 
 * @param templateId The ID of the email template
 * @param recipient The recipient email address
 * @param subject The email subject
 * @param status The status of the email
 * @param submissionId The ID of the form submission
 * @param userId The ID of the user who sent the email
 * @param ccEmails Optional CC email addresses
 * @param bccEmails Optional BCC email addresses
 * @param error Optional error message
 * @returns The created email log record
 */
export async function createEmailLog2(
  templateId: string,
  recipient: string,
  subject: string,
  status: string,
  submissionId?: string,
  userId?: string,
  ccEmails?: string | null,
  bccEmails?: string | null,
  error?: string | null
) {
  try {
    console.log(`[DATABASE] Creating email log record for email to ${recipient}`);
    
    // Log the parameters we're using
    console.log(`[DATABASE] Creating email log with the following parameters:`);
    console.log(`[DATABASE] - templateId: ${templateId}`);
    console.log(`[DATABASE] - recipient: ${recipient}`);
    console.log(`[DATABASE] - subject: ${subject}`);
    console.log(`[DATABASE] - status: ${status}`);
    console.log(`[DATABASE] - userId: ${userId || process.env.SYSTEM_USER_ID || '00000000-0000-0000-0000-000000000000'}`);
    console.log(`[DATABASE] - submissionId: ${submissionId || 'null'}`);
    
    // Create the email log record
    const emailLog = await prisma.emailLog.create({
      data: {
        templateId,
        recipient,
        subject,
        status,
        userId: userId || process.env.SYSTEM_USER_ID || '00000000-0000-0000-0000-000000000000', // Use system user ID or fallback to a default UUID
        formSubmissionId: submissionId || null,
        ccRecipients: ccEmails || null,
        bccRecipients: bccEmails || null,
        error: error || null
      }
    });
    
    console.log(`[DATABASE] Created email log record with ID: ${emailLog.id}`);
    addApiLog(`Created email log record with ID: ${emailLog.id}`, 'success', 'emails');
    
    // Return just the ID instead of the entire email log object
    return emailLog.id;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[DATABASE] Error creating email log record: ${errorMessage}`);
    console.error(`[DATABASE] Full error details:`, error);
    console.error(`[DATABASE] Attempted to create email log with templateId: ${templateId}, recipient: ${recipient}`);
    console.error(`[DATABASE] userId: ${userId || process.env.SYSTEM_USER_ID || '00000000-0000-0000-0000-000000000000'}`);
    addApiLog(`Error creating email log record: ${errorMessage}`, 'error', 'emails');
    
    // Return a dummy ID instead of throwing
    const dummyId = 'error-' + Date.now();
    console.log(`[DATABASE] Created dummy email log ID: ${dummyId}`);
    return dummyId;
  }
}
