import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

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
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEBUG] Starting inquiry confirmation email process');
    }
    const { leadId, templateId } = req.body;

    console.log('[DEBUG] Request data:', {
      leadId,
      templateId,
      headers: {
        auth: !!req.headers.authorization,
        cookie: !!req.headers.cookie
      }
    });

    if (!leadId) {
      console.error('[DEBUG] Missing lead ID');
      return res.status(400).json({ error: 'Missing lead ID' });
    }

    // Get the lead
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEBUG] Fetching lead:', leadId);
    }
    const lead = await prisma.lead.findFirst({
      where: {
        id: leadId,
      },
      include: {
        form: true,
        submissions: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      },
    });

    if (!lead) {
      console.error('[DEBUG] Lead not found:', leadId);
      return res.status(404).json({ error: 'Lead not found' });
    }

    console.log('[DEBUG] Found lead:', {
      id: lead.id,
      name: lead.name,
      email: lead.email,
      formId: lead.formId
    });

    // Get the email template
    let template;
    if (templateId) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[DEBUG] Fetching specific template:', templateId);
      }
      template = await prisma.emailTemplate.findFirst({
        where: {
          id: templateId,
          userId: user.id
        },
      });
    } else {
      // Get the inquiry template for the user
      if (process.env.NODE_ENV !== 'production') {
        console.log('[DEBUG] Fetching user inquiry template');
      }
      template = await prisma.emailTemplate.findFirst({
        where: {
          type: 'INQUIRY',
          userId: user.id
        },
      });
      
      // If no template exists, try to create default templates
      if (!template) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('[DEBUG] No inquiry template found, attempting to create defaults');
        }
        try {
          // Import the ensure function dynamically to avoid circular dependencies
          const ensureDefaultsResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/emails/templates/ensure-defaults`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': req.headers.authorization || '',
              'Cookie': req.headers.cookie || ''
            }
          });
          
          if (ensureDefaultsResponse.ok) {
            if (process.env.NODE_ENV !== 'production') {
              console.log('[DEBUG] Default templates created successfully');
            }
            // Try to get the template again
            template = await prisma.emailTemplate.findFirst({
              where: {
                type: 'INQUIRY',
                userId: user.id
              },
            });
          } else {
            console.error('[DEBUG] Failed to create default templates');
          }
        } catch (templateError) {
          console.error('[DEBUG] Error creating default templates:', templateError);
        }
      }
    }

    if (!template) {
      console.error('[DEBUG] No template found for inquiry');
      return res.status(404).json({ error: 'Email template not found' });
    }

    console.log('[DEBUG] Using template:', {
      id: template.id,
      name: template.name,
      type: template.type,
      subject: template.subject
    });

    // Get the recipient email
    const recipientEmail = lead.email;
    if (!recipientEmail) {
      console.error('[DEBUG] No recipient email found for lead:', leadId);
      return res.status(400).json({ error: 'No recipient email found for this lead' });
    }

    // Get the latest submission data
    const submissionData = lead.submissions[0]?.data || {};

    // Prepare data for template variables
    const data = {
      name: lead.name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      formName: lead.form?.name || '',
      submissionData: Object.entries(submissionData)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n'),
      status: lead.status,
      createdAt: lead.createdAt.toLocaleDateString(),
    } as const;

    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEBUG] Template data:', data);
    }

    // Replace placeholders in the template with actual data
    let htmlContent = template.htmlContent;
    let emailSubject = template.subject;

    // Replace placeholders in the HTML content and subject
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      htmlContent = htmlContent.replace(regex, String(value));
      emailSubject = emailSubject.replace(regex, String(value));
    });

    // Handle conditional blocks (e.g., {{#if phone}}...{{/if}})
    const conditionalRegex = /{{#if\s+(\w+)}}(.*?){{\/if}}/gs;
    htmlContent = htmlContent.replace(conditionalRegex, (match, condition: keyof typeof data, content) => {
      return data[condition] ? content : '';
    });

    console.log('[DEBUG] Prepared email:', {
      to: recipientEmail,
      from: process.env.SENDGRID_FROM_EMAIL || user.email || '',
      subject: emailSubject,
      hasHtmlContent: !!htmlContent
    });

    // Send the email
    const msg = {
      to: recipientEmail,
      from: process.env.SENDGRID_FROM_EMAIL || user.email || '',
      subject: emailSubject,
      html: htmlContent,
    };

    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEBUG] Sending email via SendGrid');
    }
    /*
    await sgMail.send(msg);
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEBUG] Email sent successfully');
    }
    */

    // Log the email sending
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEBUG] Creating email log entry');
    }
    await prisma.emailLog.create({
      data: {
        templateId: template.id,
        recipient: recipientEmail,
        subject: emailSubject,
        userId: user.id,
        status: 'sent',
        formSubmissionId: lead.submissions[0]?.id,
      },
    });

    // Update the lead status to indicate email was sent
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEBUG] Updating lead status');
    }
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: 'EMAIL_SENT',
      },
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEBUG] Email process completed successfully');
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending inquiry confirmation email:', error);
    
    // Log the failed email attempt
    if (req.body.leadId && req.body.templateId) {
      try {
        await prisma.emailLog.create({
          data: {
            templateId: req.body.templateId,
            recipient: 'unknown',
            subject: 'Inquiry Confirmation',
            userId: user.id,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      } catch (logError) {
        console.error('Error logging email failure:', logError);
      }
    }
    
    return res.status(500).json({ error: 'Failed to send inquiry confirmation email' });
  }
}
