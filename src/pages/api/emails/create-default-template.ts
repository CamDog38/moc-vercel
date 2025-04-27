import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check authentication
    const supabase = createClient(req, res);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { formId, formType } = req.body;

    if (!formId) {
      return res.status(400).json({ error: 'Form ID is required' });
    }

    // Check if the form exists and belongs to the user
    const form = await prisma.form.findFirst({
      where: {
        id: String(formId),
        userId: user.id,
      },
    });

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    // Check if there are already email rules for this form
    const existingRules = await prisma.emailRule.count({
      where: {
        formId: String(formId),
        userId: user.id,
      },
    });

    // If there are already rules, don't create a default one
    if (existingRules > 0) {
      return res.status(200).json({ 
        message: 'Form already has email rules', 
        created: false 
      });
    }

    // Create a default email template based on form type
    const templateType = form.type === 'INQUIRY' ? 'INQUIRY' : 'BOOKING_CONFIRMATION';
    
    // Default template content
    let templateName = '';
    let templateSubject = '';
    let templateHtml = '';

    if (form.type === 'INQUIRY') {
      templateName = `Default Inquiry Response - ${form.name}`;
      templateSubject = 'Thank you for your inquiry';
      templateHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Thank you for your inquiry</h2>
          <p>Dear {{name}},</p>
          <p>Thank you for contacting us. We have received your inquiry and will get back to you as soon as possible.</p>
          <p>Here's a summary of the information you provided:</p>
          <ul>
            <li><strong>Name:</strong> {{name}}</li>
            <li><strong>Email:</strong> {{email}}</li>
            ${form.type === 'INQUIRY' ? '<li><strong>Phone:</strong> {{phone}}</li>' : ''}
            ${form.type === 'INQUIRY' ? '<li><strong>Message:</strong> {{message}}</li>' : ''}
          </ul>
          <p>If you have any further questions, please don't hesitate to contact us.</p>
          <p>Best regards,<br>Your Team</p>
        </div>
      `;
    } else {
      templateName = `Default Booking Confirmation - ${form.name}`;
      templateSubject = 'Your booking confirmation';
      templateHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Booking Confirmation</h2>
          <p>Dear {{name}},</p>
          <p>Thank you for your booking. This email confirms that we have received your booking request.</p>
          <p>Here's a summary of your booking:</p>
          <ul>
            <li><strong>Name:</strong> {{name}}</li>
            <li><strong>Email:</strong> {{email}}</li>
            <li><strong>Phone:</strong> {{phone}}</li>
            <li><strong>Date:</strong> {{bookingDate}}</li>
            ${form.type === 'BOOKING' ? '<li><strong>Time:</strong> {{bookingTime}}</li>' : ''}
            ${form.type === 'BOOKING' ? '<li><strong>Location:</strong> {{bookingLocation}}</li>' : ''}
          </ul>
          <p>If you need to make any changes to your booking, please contact us as soon as possible.</p>
          <p>Best regards,<br>Your Team</p>
        </div>
      `;
    }

    // Create the email template
    const template = await prisma.emailTemplate.create({
      data: {
        name: templateName,
        subject: templateSubject,
        htmlContent: templateHtml,
        type: templateType as any,
        userId: user.id,
        description: 'Default template created automatically',
      },
    });

    // Create a default rule with no conditions (always triggers)
    const rule = await prisma.emailRule.create({
      data: {
        name: `Default Rule - ${form.name}`,
        description: 'Automatically created default rule that always triggers',
        conditions: '[]', // Empty array means no conditions, so it always matches
        templateId: template.id,
        formId: String(formId),
        active: true,
        userId: user.id,
      },
    });

    return res.status(200).json({
      message: 'Default email template and rule created successfully',
      created: true,
      template,
      rule,
    });
  } catch (error) {
    console.error('Error creating default email template:', error);
    return res.status(500).json({ error: 'Failed to create default email template' });
  }
}