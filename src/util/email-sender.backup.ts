import sgMail from '@sendgrid/mail';
import { MailDataRequired } from '@sendgrid/mail';
import prisma from '@/lib/prisma';
import { logApiError } from './api-helpers';
import path from 'path';

// Standard logging header for file
const fileName = path.basename(__filename);
const fileVersion = '1.0';
console.log(`[FILE NAME] ${fileName}`);
console.log(`[${fileVersion} FILE]`);

// Log SendGrid API key status
if (process.env.SENDGRID_API_KEY) {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[EMAIL SENDER] SendGrid API key is configured');
  }
  // Try to import addApiLog without breaking if it's not available
  try {
    const { addApiLog } = require('../pages/api/debug/logs');
    addApiLog('SendGrid API key is configured', 'info', 'emails');
  } catch (e) {
    console.warn('Could not log to API logs:', e);
  }
} else {
  console.warn('[EMAIL SENDER] SendGrid API key is not configured');
  console.error('[ERROR] SendGrid API key is missing - emails will fail');
  try {
    const { addApiLog } = require('../pages/api/debug/logs');
    addApiLog('SendGrid API key is NOT configured - emails will fail', 'error', 'emails');
  } catch (e) {
    console.warn('Could not log to API logs:', e);
  }
}

// Initialize SendGrid with API key
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

/**
 * Interface for email sending options
 */
interface SendEmailOptions {
  to: string;
  from?: string;
  subject: string;
  html: string;
  userId: string;
  templateId?: string;
  formSubmissionId?: string;
  bookingId?: string;
  invoiceId?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

/**
 * Result of sending an email
 */
interface SendEmailResult {
  success: boolean;
  emailLogId?: string;
  error?: string;
  details?: any;
}

/**
 * Sends an email using SendGrid and logs the result
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  console.log(`[EMAIL SENDER] Processing email to: ${options.to}`);
  console.log(`[PROCESSING] Sending email with subject: ${options.subject}`);
  
  if (options.templateId) {
    console.log(`[EMAIL TEMPLATE] Using template ID: ${options.templateId}`);
  }
  
  if (options.formSubmissionId) {
    console.log(`[FORM SUBMISSION] Processing email for submission ID: ${options.formSubmissionId}`);
  }
  // Validate required options
  if (!options.to || !options.subject || !options.html || !options.userId) {
    console.error('[ERROR] Missing required email fields');
    console.log(`[EMAIL SENDER] Email validation failed: missing required fields`);
    return {
      success: false,
      error: 'Missing required email fields',
    };
  }

  // Check if SendGrid API key is configured
  if (!process.env.SENDGRID_API_KEY) {
    console.error('[ERROR] SendGrid API key not configured');
    console.log(`[EMAIL SENDER] Email sending failed: API key not configured`);
    return {
      success: false,
      error: 'SendGrid API key not configured',
    };
  }

  try {
    // Create the email message
    const msg: MailDataRequired = {
      to: options.to,
      from: options.from || process.env.SENDGRID_FROM_EMAIL || '',
      subject: options.subject,
      html: options.html,
    };
    
    console.log(`[EMAIL SENDER] Created email message to: ${options.to}`);
    console.log(`[EMAIL SENDER] From: ${msg.from}`);
    console.log(`[EMAIL SENDER] Subject: ${options.subject}`);
    
    // Add CC recipients if provided
    if (options.cc) {
      // Ensure CC is properly formatted for SendGrid
      if (typeof options.cc === 'string') {
        // Split comma-separated string into array if needed
        if (options.cc.includes(',')) {
          msg.cc = options.cc.split(',').map(email => email.trim()).filter(email => email);
        } else {
          msg.cc = options.cc.trim();
        }
      } else if (Array.isArray(options.cc)) {
        // Make sure array elements are trimmed
        msg.cc = options.cc.map(email => email.trim()).filter(email => email);
      }
      
      // Add detailed logging for CC
      console.log('[EMAIL-SENDER] CC RECIPIENTS DETAILS:', {
        originalCcValue: options.cc,
        processedCcValue: msg.cc,
        type: typeof options.cc,
        isArray: Array.isArray(options.cc),
        source: options.templateId ? 'With template ID: ' + options.templateId : 'No template ID',
        formSubmissionId: options.formSubmissionId || 'none',
        bookingId: options.bookingId || 'none'
      });
      
      try {
        const { addApiLog } = require('../pages/api/debug/logs');
        addApiLog(`[EMAIL-SENDER] Setting CC recipients: ${JSON.stringify(msg.cc)}`, 'info', 'emails');
      } catch (e) {
        console.warn('Could not log to API logs:', e);
      }
    } else {
      console.log('[EMAIL-SENDER] NO CC RECIPIENTS PROVIDED:', {
        source: options.templateId ? 'With template ID: ' + options.templateId : 'No template ID',
        formSubmissionId: options.formSubmissionId || 'none',
        bookingId: options.bookingId || 'none'
      });
    }
    
    // Add BCC recipients if provided
    if (options.bcc) {
      // Ensure BCC is properly formatted for SendGrid
      if (typeof options.bcc === 'string') {
        // Split comma-separated string into array if needed
        if (options.bcc.includes(',')) {
          msg.bcc = options.bcc.split(',').map(email => email.trim()).filter(email => email);
        } else {
          msg.bcc = options.bcc.trim();
        }
      } else if (Array.isArray(options.bcc)) {
        // Make sure array elements are trimmed
        msg.bcc = options.bcc.map(email => email.trim()).filter(email => email);
      }
      
      // Add detailed logging for BCC
      console.log('[EMAIL-SENDER] BCC RECIPIENTS DETAILS:', {
        originalBccValue: options.bcc,
        processedBccValue: msg.bcc,
        type: typeof options.bcc,
        isArray: Array.isArray(options.bcc),
        source: options.templateId ? 'With template ID: ' + options.templateId : 'No template ID',
        formSubmissionId: options.formSubmissionId || 'none',
        bookingId: options.bookingId || 'none'
      });
      
      console.info(`Setting BCC recipients: ${JSON.stringify(msg.bcc)}`); 
      console.info(`Original BCC value: ${JSON.stringify(options.bcc)}`);
      try {
        const { addApiLog } = require('../pages/api/debug/logs');
        addApiLog(`Setting BCC recipients: ${JSON.stringify(msg.bcc)}`, 'info', 'emails');
      } catch (e) {
        console.warn('Could not log to API logs:', e);
      }
    }
    
    // Add environment information for debugging
    console.info(`Environment: ${process.env.NEXT_PUBLIC_CO_DEV_ENV || 'unknown'}`); 
    console.info(`Email message structure: ${JSON.stringify(msg, null, 2)}`);

    // Log that we're about to send the email with detailed recipient information
    console.info(`Attempting to send email to ${options.to}`);
    try {
      const { addApiLog } = require('../pages/api/debug/logs');
      addApiLog(`Attempting to send email to ${options.to}`, 'info', 'emails');
      
      // Add detailed recipient information for debugging
      addApiLog(`Email recipient details:
- To: ${options.to}
- CC: ${options.cc || 'none'}
- BCC: ${options.bcc || 'none'}
- Template ID: ${options.templateId || 'none'}
- Form Submission ID: ${options.formSubmissionId || 'none'}
- Booking ID: ${options.bookingId || 'none'}
- Invoice ID: ${options.invoiceId || 'none'}`, 'info', 'emails');
      
      addApiLog(`Email message: ${JSON.stringify(msg, null, 2)}`, 'info', 'emails');
    } catch (e) {
      console.warn('Could not log to API logs:', e);
    }
    
    // Send the email
    console.log(`[EMAIL SENDER] Sending email via SendGrid...`);
    const response = await sgMail.send(msg);
    console.log(`[EMAIL SENDER] Email sent successfully with status code: ${response[0].statusCode}`);
    
    // Log successful send
    console.info(`Email sent successfully to ${options.to}`);
    try {
      const { addApiLog } = require('../pages/api/debug/logs');
      addApiLog(`Email sent successfully to ${options.to}`, 'success', 'emails');
      addApiLog(`SendGrid response: ${JSON.stringify(response, null, 2)}`, 'info', 'emails');
    } catch (e) {
      console.warn('Could not log to API logs:', e);
    }

    // Format CC and BCC for logging
    const formatRecipients = (recipients: string | string[] | undefined): string | undefined => {
      if (!recipients) return undefined;
      return Array.isArray(recipients) ? recipients.join(', ') : recipients;
    };

    // Log CC and BCC information using centralized logging
    if (options.cc) {
      const ccValue = formatRecipients(options.cc);
      console.info(`Email CC: ${ccValue}`);
      try {
        // Add to API logs
        const { addApiLog } = require('../pages/api/debug/logs');
        addApiLog(`Email CC: ${ccValue}`, 'info', 'emails');
      } catch (e) {
        console.warn('Could not log to API logs:', e);
      }
    }
    if (options.bcc) {
      const bccValue = formatRecipients(options.bcc);
      console.info(`Email BCC: ${bccValue}`);
      try {
        // Add to API logs
        const { addApiLog } = require('../pages/api/debug/logs');
        addApiLog(`Email BCC: ${bccValue}`, 'info', 'emails');
      } catch (e) {
        console.warn('Could not log to API logs:', e);
      }
    }
    
    // Record the email in the database
    console.log(`[EMAIL SENDER] Recording email in database...`);
    let retries = 3;
    let emailLog;
    
    while (retries > 0) {
      try {
        console.log(`[DATABASE] Attempting to record email log (retries left: ${retries})`);
        
        const emailLogData: any = {
          recipient: options.to,
          subject: options.subject,
          status: 'SENT',
          userId: options.userId,
          ccRecipients: formatRecipients(options.cc),
          bccRecipients: formatRecipients(options.bcc),
        };
        
        // Add optional fields only if they exist
        if (options.templateId) emailLogData.templateId = options.templateId;
        if (options.formSubmissionId) emailLogData.formSubmissionId = options.formSubmissionId;
        if (options.bookingId) emailLogData.bookingId = options.bookingId;
        if (options.invoiceId) emailLogData.invoiceId = options.invoiceId;
        
        emailLog = await prisma.emailLog.create({
          data: emailLogData,
        });
        break; // Success, exit retry loop
      } catch (dbError) {
        retries--;
        console.error(`Database error recording email log (retries left: ${retries}):`, dbError);
        
        if (retries <= 0 || !(dbError instanceof Error && dbError.message.includes('connection pool'))) {
          throw dbError; // Re-throw if not a connection pool error or no retries left
        }
        
        // Wait a short time before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`[EMAIL SENDER] Email process completed successfully`);
    console.log(`[EMAIL LOG] Created email log with ID: ${emailLog?.id}`);
    
    return {
      success: true,
      emailLogId: emailLog?.id,
    };
  } catch (error) {
    // Log the error
    console.error(`[ERROR] Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.log(`[EMAIL SENDER] Email sending failed`);
    logApiError(error, 'sendEmail');

    // Extract error details for better debugging
    let errorMessage = 'Unknown error';
    let errorDetails = null;

    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Extract SendGrid specific error details if available
      if ('response' in error && error.response) {
        const response = (error as any).response;
        errorDetails = {
          status: response.status,
          body: response.body,
        };
      }
    }
    
    // Log detailed error information to API logs
    try {
      const { addApiLog } = require('../pages/api/debug/logs');
      addApiLog(`Email sending failed: ${errorMessage}`, 'error', 'emails');
      if (errorDetails) {
        addApiLog(`SendGrid error details: ${JSON.stringify(errorDetails, null, 2)}`, 'error', 'emails');
      }
      addApiLog(`Environment variables check: SENDGRID_API_KEY=${Boolean(process.env.SENDGRID_API_KEY)}, SENDGRID_FROM_EMAIL=${Boolean(process.env.SENDGRID_FROM_EMAIL)}`, 'info', 'emails');
    } catch (e) {
      console.warn('Could not log to API logs:', e);
    }

    // Format CC and BCC for logging
    const formatRecipients = (recipients: string | string[] | undefined): string | undefined => {
      if (!recipients) return undefined;
      return Array.isArray(recipients) ? recipients.join(', ') : recipients;
    };

    // Record the failed email in the database - use a simple retry mechanism for connection pool issues
    let retries = 3;
    let emailLog;
    
    while (retries > 0) {
      try {
        // Create base email log data
        const emailLogData: any = {
          recipient: options.to,
          subject: options.subject,
          status: 'FAILED',
          error: errorMessage,
          userId: options.userId,
          ccRecipients: formatRecipients(options.cc),
          bccRecipients: formatRecipients(options.bcc),
        };
        
        // Add optional fields only if they exist
        if (options.templateId) emailLogData.templateId = options.templateId;
        if (options.formSubmissionId) emailLogData.formSubmissionId = options.formSubmissionId;
        if (options.bookingId) emailLogData.bookingId = options.bookingId;
        if (options.invoiceId) emailLogData.invoiceId = options.invoiceId;
        
        emailLog = await prisma.emailLog.create({
          data: emailLogData,
        });
        break; // Success, exit retry loop
      } catch (dbError) {
        retries--;
        console.error(`Database error recording failed email log (retries left: ${retries}):`, dbError);
        
        if (retries <= 0) {
          console.error('Could not record email failure after multiple attempts');
          // Don't throw here, as we're already in an error handler
          break;
        }
        
        // Wait a short time before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return {
      success: false,
      emailLogId: emailLog?.id,
      error: errorMessage,
    };
  }
}