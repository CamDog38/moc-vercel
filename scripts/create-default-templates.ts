import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const DEFAULT_TEMPLATES = [
  {
    name: 'Default Inquiry Confirmation',
    type: 'INQUIRY',
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
    `,
    isDefault: true
  },
  {
    name: 'Default Booking Confirmation',
    type: 'BOOKING_CONFIRMATION',
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
    `,
    isDefault: true
  }
];

async function createDefaultTemplates() {
  try {
    // Get the current user's session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      console.error('Error getting user session:', sessionError);
      return;
    }

    const userId = session.user.id;
    if (process.env.NODE_ENV !== 'production') {
      console.log('Creating default templates for user:', userId);
    }

    // Create or update default templates
    const results = await Promise.all(
      DEFAULT_TEMPLATES.map(async (template) => {
        const existing = await prisma.emailTemplate.findFirst({
          where: {
            type: template.type,
            isDefault: true,
            userId
          }
        });

        if (!existing) {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`Creating default template for type: ${template.type}`);
          }
          return prisma.emailTemplate.create({
            data: {
              ...template,
              userId
            }
          });
        } else {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`Default template already exists for type: ${template.type}`);
          }
          return existing;
        }
      })
    );

    if (process.env.NODE_ENV !== 'production') {
      console.log('Templates created/updated:', results);
    }
  } catch (error) {
    console.error('Error creating default templates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDefaultTemplates();
