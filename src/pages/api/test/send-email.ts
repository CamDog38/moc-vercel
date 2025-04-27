import { NextApiRequest, NextApiResponse } from 'next';
import sgMail from '@sendgrid/mail';

// Initialize SendGrid
const apiKey = process.env.SENDGRID_API_KEY || '';
if (apiKey) {
  sgMail.setApiKey(apiKey);
} else {
  console.error('SendGrid API key not found in environment variables');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to } = req.body;
    
    if (!to) {
      return res.status(400).json({ error: 'Recipient email is required' });
    }
    
    // Get sender email from environment
    const from = process.env.SENDGRID_FROM_EMAIL;
    if (!from) {
      return res.status(500).json({ error: 'SENDGRID_FROM_EMAIL not configured in environment variables' });
    }
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Test Email] Attempting to send test email from ${from} to ${to}`);
    }
    
    // Create test email
    const msg = {
      to,
      from,
      subject: 'Test Email - Form Submission',
      text: 'This is a test email to verify that SendGrid is configured correctly and can send emails.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4a5568;">SendGrid Test Email</h2>
          <p>This is a test email to verify that SendGrid is configured correctly and can send emails.</p>
          <p>If you're receiving this email, it means that:</p>
          <ul>
            <li>Your SendGrid API key is valid</li>
            <li>Your sender email is verified</li>
            <li>The email sending functionality is working</li>
          </ul>
          <p>Time sent: ${new Date().toISOString()}</p>
          <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #718096;">
            This is an automated test email. Please do not reply.
          </p>
        </div>
      `,
    };
    
    // Send the email
    await sgMail.send(msg);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Test Email] Test email sent successfully to ${to}`);
    }
    
    return res.status(200).json({ 
      success: true, 
      message: 'Test email sent successfully',
      details: {
        to,
        from,
        subject: msg.subject,
      }
    });
  } catch (error) {
    console.error('[Test Email] Error sending test email:', error);
    
    // Extract SendGrid specific error information if available
    let errorDetails = {};
    if (error.response && error.response.body) {
      errorDetails = {
        statusCode: error.code || error.response.statusCode,
        errors: error.response.body.errors,
      };
      console.error('[Test Email] SendGrid error details:', JSON.stringify(errorDetails, null, 2));
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to send test email',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: errorDetails,
    });
  }
}
