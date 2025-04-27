/**
 * Direct Email Service for Form System 2.0
 * 
 * This service provides direct email sending capability without relying on third-party
 * services like SendGrid. It uses Nodemailer to send emails directly from the application.
 */

import { EmailSendResult } from './types';
import nodemailer from 'nodemailer';

// Initialize nodemailer transporter
let transporter: nodemailer.Transporter | null = null;

/**
 * Initialize the direct email service
 * 
 * @returns Whether initialization was successful
 */
export function initializeDirectEmailService(): boolean {
  try {
    // Check if direct email is configured
    if (!process.env.DIRECT_EMAIL_HOST || 
        !process.env.DIRECT_EMAIL_USER || 
        !process.env.DIRECT_EMAIL_PASS) {
      console.warn('[DIRECT EMAIL] Not configured. Add DIRECT_EMAIL_* env variables to enable.');
      return false;
    }

    // Create transporter
    transporter = nodemailer.createTransport({
      host: process.env.DIRECT_EMAIL_HOST,
      port: parseInt(process.env.DIRECT_EMAIL_PORT || '587'),
      secure: process.env.DIRECT_EMAIL_SECURE === 'true',
      auth: {
        user: process.env.DIRECT_EMAIL_USER,
        pass: process.env.DIRECT_EMAIL_PASS,
      },
    });

    console.log('[DIRECT EMAIL] Service initialized successfully');
    return true;
  } catch (error) {
    console.error('[DIRECT EMAIL] Initialization failed:', error);
    return false;
  }
}

/**
 * Send an email using the direct email service
 * 
 * @param recipient The recipient email address
 * @param subject The email subject
 * @param htmlContent The HTML content of the email
 * @param textContent The plain text content of the email
 * @param ccEmails Optional CC email addresses
 * @param bccEmails Optional BCC email addresses
 * @returns The result of the email sending operation
 */
export async function sendDirectEmail(
  recipient: string,
  subject: string,
  htmlContent: string,
  textContent: string,
  ccEmails?: string[] | string | null,
  bccEmails?: string[] | string | null
): Promise<EmailSendResult> {
  try {
    // Check if direct email service is initialized
    if (!transporter) {
      const initialized = initializeDirectEmailService();
      if (!initialized) {
        return {
          success: false,
          message: 'Direct email service not configured',
          error: 'Direct email service not configured'
        };
      }
    }

    // Format CC and BCC emails
    let cc: string[] | undefined;
    let bcc: string[] | undefined;

    if (ccEmails) {
      cc = Array.isArray(ccEmails) ? ccEmails : ccEmails.split(',').map(email => email.trim());
    }

    if (bccEmails) {
      bcc = Array.isArray(bccEmails) ? bccEmails : bccEmails.split(',').map(email => email.trim());
    }

    // Send email
    const fromEmail = process.env.DIRECT_EMAIL_FROM || process.env.DIRECT_EMAIL_USER;
    const info = await transporter!.sendMail({
      from: fromEmail,
      to: recipient,
      cc: cc?.join(','),
      bcc: bcc?.join(','),
      subject: subject,
      text: textContent,
      html: htmlContent,
    });

    console.log('[DIRECT EMAIL] Email sent successfully:', info.messageId);
    return {
      success: true,
      message: 'Email sent successfully via direct email service',
      directEmailUsed: true
    };
  } catch (error) {
    console.error('[DIRECT EMAIL] Error sending email:', error);
    return {
      success: false,
      message: 'Direct email sending failed',
      error: error instanceof Error ? error.message : String(error),
      directEmailUsed: true
    };
  }
}
