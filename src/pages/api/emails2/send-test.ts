/**
 * Email System 2.0 API - Send Test Email Endpoint
 * 
 * POST: Send a test email using a template
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getSession({ req });

  if (!session || !session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = session.user.id as string;

  try {
    const { 
      templateId, 
      recipient, 
      testData = {}, 
      formId,
      cc,
      bcc
    } = req.body;

    // Validate required parameters
    if (!templateId) {
      return res.status(400).json({ error: 'Template ID is required' });
    }

    if (!recipient) {
      return res.status(400).json({ error: 'Recipient email is required' });
    }

    // Get the template
    const template = await prisma.emailTemplate2.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Check if the user has access to this template
    if (template.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Generate a correlation ID for tracking
    const correlationId = uuidv4();

    // Log the test email request
    await prisma.emailProcessingLog2.create({
      data: {
        level: 'info',
        message: `Test email requested for template ${template.name} (${templateId})`,
        correlationId,
        source: 'test',
        formId,
        templateId,
        timestamp: new Date(),
        details: JSON.stringify({
          recipient,
          testData,
          cc,
          bcc
        }),
      },
    });

    // Replace variables in the template
    const subject = replaceVariables(template.subject, testData);
    const html = replaceVariables(template.htmlContent, testData);
    const text = template.textContent 
      ? replaceVariables(template.textContent, testData)
      : '';

    // Create an email transport
    const transport = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST,
      port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
      secure: process.env.EMAIL_SERVER_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    });

    // Parse CC and BCC recipients
    const ccRecipients = cc ? cc.split(',').map((email: string) => email.trim()).filter(Boolean) : [];
    const bccRecipients = bcc ? bcc.split(',').map((email: string) => email.trim()).filter(Boolean) : [];

    // Send the email
    const info = await transport.sendMail({
      from: process.env.EMAIL_FROM,
      to: recipient,
      cc: ccRecipients.length > 0 ? ccRecipients.join(',') : undefined,
      bcc: bccRecipients.length > 0 ? bccRecipients.join(',') : undefined,
      subject: `[TEST] ${subject}`,
      html,
      text,
    });

    // Log the email sent
    await prisma.emailLog2.create({
      data: {
        templateId,
        formId,
        recipient,
        subject: `[TEST] ${subject}`,
        status: 'SENT',
        userId,
        ccRecipients: ccRecipients.length > 0 ? ccRecipients.join(',') : undefined,
        bccRecipients: bccRecipients.length > 0 ? bccRecipients.join(',') : undefined,
        trackingId: uuidv4(),
        deliveredAt: new Date(),
      },
    });

    // Log the successful send
    await prisma.emailProcessingLog2.create({
      data: {
        level: 'info',
        message: `Test email sent to ${recipient}`,
        correlationId,
        source: 'test',
        formId,
        templateId,
        timestamp: new Date(),
        details: JSON.stringify({
          messageId: info.messageId,
          recipient,
          cc: ccRecipients.length,
          bcc: bccRecipients.length,
        }),
      },
    });

    // Return success
    return res.status(200).json({
      success: true,
      messageId: info.messageId,
      recipient,
      subject: `[TEST] ${subject}`,
      correlationId,
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    
    // Log the error
    await prisma.emailProcessingLog2.create({
      data: {
        level: 'error',
        message: `Error sending test email: ${error.message}`,
        correlationId: uuidv4(),
        source: 'test',
        timestamp: new Date(),
        error: error.message,
        stackTrace: error.stack,
      },
    });
    
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}

/**
 * Replace variables in a template string
 */
function replaceVariables(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const keys = key.trim().split('.');
    let value = data;
    
    for (const k of keys) {
      if (value === undefined || value === null) {
        return match;
      }
      value = value[k];
    }
    
    return value !== undefined && value !== null ? value : match;
  });
}
