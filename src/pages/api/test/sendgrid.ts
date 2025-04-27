import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/util/supabase/api';
import sgMail from '@sendgrid/mail';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check authentication
  const supabase = createClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Import API logging
    const { addApiLog } = require('../debug/logs');
    addApiLog('SendGrid test endpoint called', 'info', 'emails');

    // Check environment variables
    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || user.email;
    const envInfo = {
      SENDGRID_API_KEY: Boolean(sendgridApiKey),
      SENDGRID_FROM_EMAIL: Boolean(process.env.SENDGRID_FROM_EMAIL),
      USER_EMAIL: Boolean(user.email),
      FROM_EMAIL: Boolean(fromEmail),
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_CO_DEV_ENV: process.env.NEXT_PUBLIC_CO_DEV_ENV || 'not set'
    };
    
    // Log environment info
    addApiLog(`SendGrid environment check: ${JSON.stringify(envInfo)}`, 'info', 'emails');

    // Check if SendGrid API key is configured
    if (!sendgridApiKey) {
      addApiLog('SendGrid API key is not configured', 'error', 'emails');
      return res.status(500).json({
        success: false,
        error: 'SendGrid API key is not configured',
        configStatus: {
          apiKey: false,
          fromEmail: Boolean(fromEmail),
          environmentInfo: envInfo
        }
      });
    }

    // Initialize SendGrid with API key
    sgMail.setApiKey(sendgridApiKey);
    addApiLog('SendGrid API key set successfully', 'info', 'emails');

    // Check if sender email is configured
    if (!fromEmail) {
      addApiLog('Sender email is not configured', 'error', 'emails');
      return res.status(500).json({
        success: false,
        error: 'Sender email is not configured',
        configStatus: {
          apiKey: true,
          fromEmail: false,
          environmentInfo: envInfo
        }
      });
    }

    // Optional: Send a test email if requested
    if (req.body.sendTestEmail && req.body.testRecipient) {
      const testRecipient = req.body.testRecipient;
      addApiLog(`Sending test email to ${testRecipient}`, 'info', 'emails');
      
      const msg = {
        to: testRecipient,
        from: fromEmail,
        subject: 'SendGrid Test Email',
        text: 'This is a test email to verify SendGrid integration.',
        html: '<strong>This is a test email to verify SendGrid integration.</strong>',
      };

      try {
        addApiLog(`Test email message: ${JSON.stringify(msg)}`, 'info', 'emails');
        const response = await sgMail.send(msg);
        addApiLog(`Test email sent successfully to ${testRecipient}`, 'success', 'emails');
        addApiLog(`SendGrid response: ${JSON.stringify(response)}`, 'info', 'emails');
        
        return res.status(200).json({
          success: true,
          message: 'SendGrid is properly configured and test email was sent successfully',
          configStatus: {
            apiKey: true,
            fromEmail: true,
            testEmailSent: true,
            environmentInfo: envInfo,
            response: response
          }
        });
      } catch (emailError) {
        const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown error';
        let errorDetails = null;
        
        if (emailError instanceof Error && 'response' in emailError) {
          const response = (emailError as any).response;
          errorDetails = {
            status: response?.status,
            body: response?.body,
          };
        }
        
        addApiLog(`Test email failed: ${errorMessage}`, 'error', 'emails');
        if (errorDetails) {
          addApiLog(`SendGrid error details: ${JSON.stringify(errorDetails)}`, 'error', 'emails');
        }
        
        return res.status(500).json({
          success: false,
          error: 'SendGrid is configured but failed to send test email',
          details: errorMessage,
          errorDetails: errorDetails,
          configStatus: {
            apiKey: true,
            fromEmail: true,
            testEmailSent: false,
            environmentInfo: envInfo
          }
        });
      }
    }

    // If not sending a test email, just return the configuration status
    addApiLog('SendGrid configuration check completed successfully', 'success', 'emails');
    return res.status(200).json({
      success: true,
      message: 'SendGrid is properly configured',
      configStatus: {
        apiKey: true,
        fromEmail: Boolean(fromEmail),
        environmentInfo: envInfo
      }
    });
  } catch (error) {
    console.error('Error testing SendGrid:', error);
    
    // Try to log to API logs
    try {
      const { addApiLog } = require('../debug/logs');
      addApiLog(`Error testing SendGrid: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'emails');
    } catch (e) {
      console.warn('Could not log to API logs:', e);
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to test SendGrid configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}