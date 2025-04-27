/**
 * DEPRECATED: Legacy Email Sender (Forms 1.0)
 * 
 * This file is deprecated and will be removed in a future version.
 * Please use the Form System 2.0 email services instead:
 * - src/lib/forms2/services/email-processing/sendService2.ts
 * - src/lib/forms2/services/email-processing/emailService2.ts
 */

import sgMail from '@sendgrid/mail';
import { MailDataRequired } from '@sendgrid/mail';
import prisma from '@/lib/prisma';
import { logApiError } from './api-helpers';
import path from 'path';
import { sendEmail2 } from '@/lib/forms2/services/email-processing/sendService2';
import { createEmailLog2 } from '@/lib/forms2/services/email-processing/sendService2';

// Standard logging header for file
const fileName = path.basename(__filename);
const fileVersion = '1.0 (DEPRECATED)';
console.log(`[FILE NAME] ${fileName}`);
console.log(`[${fileVersion} FILE]`);
console.log(`[DEPRECATED] This file is deprecated and will be removed in a future version.`);
console.log(`[DEPRECATED] Please use the Form System 2.0 email services instead.`);

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
 * DEPRECATED: Sends an email using SendGrid and logs the result
 * This function is deprecated and will be removed in a future version.
 * Please use the Form System 2.0 email services instead.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  console.log(`[DEPRECATED] Using legacy email sender. Please migrate to Form System 2.0 email services.`);
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
    // Format CC and BCC recipients for the new system
    const formatRecipients = (recipients: string | string[] | undefined): string[] | undefined => {
      if (!recipients) return undefined;
      
      if (typeof recipients === 'string') {
        // Split comma-separated string into array if needed
        if (recipients.includes(',')) {
          return recipients.split(',').map(email => email.trim()).filter(email => email);
        } else {
          return [recipients.trim()];
        }
      } else if (Array.isArray(recipients)) {
        // Make sure array elements are trimmed
        return recipients.map(email => email.trim()).filter(email => email);
      }
      
      return undefined;
    };

    // Use the new Form System 2.0 email service
    const result = await sendEmail2(
      options.to,
      options.subject,
      options.html,
      options.html.replace(/<[^>]*>/g, ''), // Simple HTML to text conversion
      formatRecipients(options.cc),
      formatRecipients(options.bcc)
    );

    if (result.success) {
      // Create an email log entry using the new system
      const emailLogId = await createEmailLog2(
        options.templateId || '00000000-0000-0000-0000-000000000000',
        options.to,
        options.subject,
        'SENT',
        options.formSubmissionId,
        options.userId,
        typeof options.cc === 'string' ? options.cc : options.cc?.join(', '),
        typeof options.bcc === 'string' ? options.bcc : options.bcc?.join(', ')
      );

      return {
        success: true,
        emailLogId,
      };
    } else {
      return {
        success: false,
        error: result.error || 'Unknown error',
      };
    }
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
    } catch (e) {
      console.warn('Could not log to API logs:', e);
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}
