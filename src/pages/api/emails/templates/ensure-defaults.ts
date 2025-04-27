import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import { ensureInvoiceTemplate } from './ensure-invoice-template';
import { EmailTemplateType } from '@prisma/client';

const DEFAULT_TEMPLATES = [
  {
    name: 'Default Inquiry Confirmation',
    type: EmailTemplateType.INQUIRY,  
    subject: 'Thank you for your inquiry',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Thank you for your inquiry</h2>
        <p>Dear {{name}},</p>
        <p>Thank you for reaching out to us. We have received your inquiry and will get back to you shortly.</p>
        <h3>Your Information:</h3>
        <ul>
          <li>Name: {{name}}</li>
          <li>Email: {{email}}</li>
          {{#if phone}}<li>Phone: {{phone}}</li>{{/if}}
        </ul>
        <p>Form submitted: {{formName}}</p>
        <p>Date: {{createdAt}}</p>
        <div style="margin-top: 20px; padding: 10px; background-color: #f5f5f5;">
          <h4>Your Submission Details:</h4>
          <pre>{{submissionData}}</pre>
        </div>
        <p style="margin-top: 20px;">We will review your information and contact you as soon as possible.</p>
        <p>Best regards,<br>Your Team</p>
      </div>
    `
  },
  {
    name: 'Default Booking Confirmation',
    type: EmailTemplateType.BOOKING_CONFIRMATION,
    subject: 'Your booking confirmation',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Booking Confirmation</h2>
        <p>Dear {{name}},</p>
        <p>Thank you for your booking. Here are the details of your appointment:</p>
        <ul>
          <li>Date: {{date}}</li>
          {{#if time}}<li>Time: {{time}}</li>{{/if}}
          {{#if location}}<li>Location: {{location}}</li>{{/if}}
          <li>Service: {{formName}}</li>
        </ul>
        {{#if invoiceLink}}
        <p>You can view and pay your invoice here: <a href="{{invoiceLink}}">View Invoice</a></p>
        {{/if}}
        <p>Status: {{status}}</p>
        <p>We look forward to seeing you!</p>
        <p>Best regards,<br>Your Team</p>
      </div>
    `
  }
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const supabase = createClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEBUG] Ensuring default email templates exist');
    }
    
    // Ensure the invoice template exists
    await ensureInvoiceTemplate(user.id);
    
    const results = await Promise.all(
      DEFAULT_TEMPLATES.map(async (template) => {
        const existing = await prisma.emailTemplate.findFirst({
          where: {
            type: template.type,
            userId: user.id
          }
        });

        if (!existing) {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`[DEBUG] Creating default template for type: ${template.type}`);
          }
          return prisma.emailTemplate.create({
            data: {
              ...template,
              userId: user.id
            }
          });
        } else {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`[DEBUG] Default template already exists for type: ${template.type}`);
          }
          return existing;
        }
      })
    );

    return res.status(200).json({
      message: 'Default templates ensured',
      templates: results
    });
  } catch (error) {
    console.error('[DEBUG] Error ensuring default templates:', error);
    return res.status(500).json({ error: 'Failed to ensure default templates' });
  }
}
