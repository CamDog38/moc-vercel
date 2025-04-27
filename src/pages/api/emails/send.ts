import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import { sendEmail } from '@/util/email-sender';
import { logApiError } from '@/util/api-helpers';

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
    const { templateId, to, data, subject, formSubmissionId, bookingId, invoiceId } = req.body;

    if (!templateId || !to) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get the email template
    const template = await prisma.emailTemplate.findFirst({
      where: {
        id: templateId,
        userId: user.id,
      },
    });

    if (!template) {
      return res.status(404).json({ error: 'Email template not found' });
    }

    // Replace placeholders in the template with actual data
    let htmlContent = template.htmlContent;
    let emailSubject = subject || template.subject;

    if (data) {
      // Replace placeholders in the HTML content and subject
      htmlContent = htmlContent.replace(/{{([^}]+)}}/g, (match: string, key: string) => {
        // Trim any whitespace from the key
        const trimmedKey = key.trim();
        // Check if the key exists in data
        if (data[trimmedKey] !== undefined) {
          return String(data[trimmedKey]);
        }
        // Log missing variable for debugging
        console.warn(`Variable not found in email data: ${trimmedKey}`);
        return '';
      });
      
      emailSubject = emailSubject.replace(/{{([^}]+)}}/g, (match: string, key: string) => {
        // Trim any whitespace from the key
        const trimmedKey = key.trim();
        // Check if the key exists in data
        if (data[trimmedKey] !== undefined) {
          return String(data[trimmedKey]);
        }
        // Log missing variable for debugging
        console.warn(`Variable not found in email data: ${trimmedKey}`);
        return '';
      });
    }

    // Process CC and BCC emails from template
    const ccEmails = template.ccEmails ? template.ccEmails.split(',').map(email => email.trim()).filter(email => email) : undefined;
    const bccEmails = template.bccEmails ? template.bccEmails.split(',').map(email => email.trim()).filter(email => email) : undefined;
    
    // Log BCC information for debugging using centralized logging
    if (template.ccEmails) {
      console.info(`Template CC emails: ${template.ccEmails}`);
      console.info(`Processed CC emails: ${JSON.stringify(ccEmails)}`);
      // Add to API logs
      const { addApiLog } = require('../debug/logs');
      addApiLog(`Template CC emails: ${template.ccEmails}`, 'info', 'emails');
      addApiLog(`Processed CC emails: ${JSON.stringify(ccEmails)}`, 'info', 'emails');
    }
    
    if (template.bccEmails) {
      console.info(`Template BCC emails: ${template.bccEmails}`);
      console.info(`Processed BCC emails: ${JSON.stringify(bccEmails)}`);
      // Add to API logs
      const { addApiLog } = require('../debug/logs');
      addApiLog(`Template BCC emails: ${template.bccEmails}`, 'info', 'emails');
      addApiLog(`Processed BCC emails: ${JSON.stringify(bccEmails)}`, 'info', 'emails');
    }

    /*
    // Send the email using our utility function
    const result = await sendEmail({
      to,
      from: process.env.SENDGRID_FROM_EMAIL || user.email || '',
      subject: emailSubject,
      html: htmlContent,
      userId: user.id,
      templateId: template.id,
      formSubmissionId,
      bookingId,
      invoiceId,
      cc: ccEmails,
      bcc: bccEmails
    });

    if (result.success) {
      return res.status(200).json({ 
        success: true,
        emailLogId: result.emailLogId
      });
    } else {
      // Log the error for debugging
      console.error('Email sending failed:', result.error, result.details);
      
      return res.status(500).json({ 
        error: 'Failed to send email',
        message: result.error,
        details: result.details
      });
    }
    */
  } catch (error) {
    logApiError(error, 'emails/send');
    
    return res.status(500).json({ 
      error: 'Failed to send email',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
