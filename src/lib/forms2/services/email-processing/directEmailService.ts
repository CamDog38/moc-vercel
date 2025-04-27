/**
 * Direct Email Service for Form System 2.0
 * 
 * This service provides direct email sending capability without relying on third-party
 * services like SendGrid. It uses Nodemailer to send emails directly from the application.
 * 
 * To configure this service, add the following to your .env file:
 * 
 * DIRECT_EMAIL_HOST=smtp.example.com     # SMTP server hostname
 * DIRECT_EMAIL_PORT=587                  # SMTP server port (usually 587 for TLS, 465 for SSL)
 * DIRECT_EMAIL_SECURE=false              # Use TLS (false for port 587, true for port 465)
 * DIRECT_EMAIL_USER=user@example.com     # SMTP username/email
 * DIRECT_EMAIL_PASS=password             # SMTP password
 * DIRECT_EMAIL_FROM=noreply@example.com  # From email address (optional)
 * 
 * Common SMTP providers:
 * - Gmail: smtp.gmail.com (requires app password)
 * - Office 365: smtp.office365.com
 * - Outlook.com: smtp-mail.outlook.com
 * - GoDaddy: smtpout.secureserver.net
 */

import { EmailSendResult } from './types';
import nodemailer from 'nodemailer';
import { EMAIL_TIMEOUTS, EMAIL_RETRY, withTimeout } from './emailConfig2';

// Initialize nodemailer transporter with connection pool
let transporter: nodemailer.Transporter | null = null;

// Track connection status to avoid redundant connection attempts
let connectionInitialized = false;
let connectionInitializing = false;
let lastConnectionAttempt = 0;
const CONNECTION_RETRY_INTERVAL = 5000; // 5 seconds

/**
 * Initialize the direct email service with connection pooling
 * 
 * @returns Whether initialization was successful
 */
export async function initializeDirectEmailService(): Promise<boolean> {
  // Prevent multiple simultaneous initialization attempts
  if (connectionInitializing) {
    console.log('[DIRECT EMAIL] Initialization already in progress, waiting...');
    // Wait for the current initialization to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    return connectionInitialized;
  }
  
  // If we've recently tried to connect and failed, don't try again too soon
  const now = Date.now();
  if (!connectionInitialized && now - lastConnectionAttempt < CONNECTION_RETRY_INTERVAL) {
    console.log('[DIRECT EMAIL] Too soon to retry connection, skipping initialization');
    return false;
  }
  
  // If already initialized successfully, return true
  if (connectionInitialized && transporter) {
    return true;
  }
  
  connectionInitializing = true;
  lastConnectionAttempt = now;
  
  try {
    // Check if direct email is configured
    if (!process.env.DIRECT_EMAIL_HOST || 
        !process.env.DIRECT_EMAIL_USER || 
        !process.env.DIRECT_EMAIL_PASS) {
      console.warn('[DIRECT EMAIL] Not configured. Add DIRECT_EMAIL_* env variables to enable.');
      connectionInitializing = false;
      return false;
    }

    // Create transporter with connection pool and timeouts
    transporter = nodemailer.createTransport({
      host: process.env.DIRECT_EMAIL_HOST,
      port: parseInt(process.env.DIRECT_EMAIL_PORT || '587'),
      secure: process.env.DIRECT_EMAIL_SECURE === 'true',
      auth: {
        user: process.env.DIRECT_EMAIL_USER,
        pass: process.env.DIRECT_EMAIL_PASS,
      },
      // Add connection timeout settings
      connectionTimeout: EMAIL_TIMEOUTS.SMTP_CONNECTION,
      greetingTimeout: EMAIL_TIMEOUTS.SMTP_CONNECTION,
      socketTimeout: EMAIL_TIMEOUTS.SMTP_COMMAND,
      // Enable connection pool for better performance
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      // Ratelmiting to avoid being blocked by SMTP servers
      rateLimit: 5, // max 5 messages per second
    });
    
    // Verify the connection
    await withTimeout(
      async () => {
        const result = await transporter!.verify();
        return result;
      },
      EMAIL_TIMEOUTS.SMTP_CONNECTION,
      'SMTP connection verification timed out'
    );

    console.log('[DIRECT EMAIL] Service initialized successfully with connection pool');
    connectionInitialized = true;
    connectionInitializing = false;
    return true;
  } catch (error) {
    console.error('[DIRECT EMAIL] Initialization failed:', error);
    connectionInitialized = false;
    connectionInitializing = false;
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
  let retryCount = 0;
  
  // Define the send attempt function that can be retried
  async function attemptSend(): Promise<EmailSendResult> {
    try {
      // Check if direct email service is initialized
      if (!transporter) {
        const startTime = Date.now();
        console.log('[DIRECT EMAIL] Initializing email service before sending...');
        
        const initialized = await initializeDirectEmailService();
        const initTime = Date.now() - startTime;
        
        console.log(`[DIRECT EMAIL] Initialization took ${initTime}ms, result: ${initialized}`);
        
        if (!initialized) {
          return {
            success: false,
            message: 'Direct email service not configured or initialization failed',
            error: 'Direct email service not configured or initialization failed'
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

      // Send email with timeout
      const fromEmail = process.env.DIRECT_EMAIL_FROM || process.env.DIRECT_EMAIL_USER;
      const info = await withTimeout(
        async () => transporter!.sendMail({
          from: fromEmail,
          to: recipient,
          cc: cc?.join(','),
          bcc: bcc?.join(','),
          subject: subject,
          text: textContent,
          html: htmlContent,
        }),
        EMAIL_TIMEOUTS.SMTP_COMMAND,
        'SMTP send operation timed out'
      );

      console.log('[DIRECT EMAIL] Email sent successfully:', info.messageId);
      return {
        success: true,
        message: 'Email sent successfully via direct email service',
        directEmailUsed: true
      };
    } catch (error) {
      console.error(`[DIRECT EMAIL] Error sending email (attempt ${retryCount + 1}/${EMAIL_RETRY.MAX_RETRIES + 1}):`, error);
      
      // Check if we should retry
      if (retryCount < EMAIL_RETRY.MAX_RETRIES) {
        retryCount++;
        const delay = EMAIL_RETRY.RETRY_DELAY * Math.pow(2, retryCount - 1);
        console.log(`[DIRECT EMAIL] Retrying in ${delay}ms (attempt ${retryCount + 1}/${EMAIL_RETRY.MAX_RETRIES + 1})`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        return attemptSend();
      }
      
      return {
        success: false,
        message: 'Direct email sending failed after retries',
        error: error instanceof Error ? error.message : String(error),
        directEmailUsed: true
      };
    }
  }
  
  // Start the send attempt process
  return attemptSend();
}
