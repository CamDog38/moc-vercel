import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import { sendEmail } from '@/util/email-sender';
import { logApiError } from '@/util/api-helpers';
import { replaceVariables } from '@/util/email-template-helpers';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Send test email API called with body:', JSON.stringify(req.body));
  }
  
  // Check authentication
  const supabase = createClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('Authentication failed: No user found');
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('Authenticated user:', user.id);
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    if (process.env.NODE_ENV !== 'production') {
      console.log('Method not allowed:', req.method);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Handle both direct HTML content and template-based emails
    const { templateId, to, html, subject } = req.body;
    
    // If HTML and subject are provided directly, send without template
    if (html && subject && to) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Sending direct test email to ${to}`);
      }
      
      // Send the email using our utility function
      const result = await sendEmail({
        to,
        subject: `[TEST] ${subject}`,
        html,
        userId: user.id
      });

      if (result.success) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('Test email sent successfully');
        }
        return res.status(200).json({ 
          success: true,
          message: `Test email sent successfully to ${to}`,
          emailLogId: result.emailLogId
        });
      } else {
        // Log the error for debugging
        console.error('Test email sending failed:', result.error, result.details);
        
        return res.status(500).json({ 
          error: 'Failed to send test email',
          message: result.error,
          details: result.details
        });
      }
    }
    
    // Otherwise, use template-based email
    if (!templateId || !to) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Missing required fields:', { templateId, to });
      }
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'Either provide templateId and to, or provide to, subject, and html content'
      });
    }

    // Get the email template
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Fetching template with ID ${templateId}`);
    }
    const template = await prisma.emailTemplate.findFirst({
      where: {
        id: templateId,
        userId: user.id,
      },
    });

    if (!template) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Template not found: ${templateId}`);
      }
      return res.status(404).json({ error: 'Email template not found' });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('Template found:', template.name);
    }

    // Create sample data with placeholder values
    // Define a type for the sample data to ensure all properties are strings
    type SampleDataType = {
      [key: string]: string;
    };
    
    const sampleData: SampleDataType = {
      // Basic contact information
      name: 'John Doe',
      firstName: 'John',
      lastName: 'Doe',
      email: to,
      phone: '555-123-4567',
      
      // Common form fields in camelCase
      fullName: 'John Doe',
      clientName: 'John Doe',
      address: '123 Main St, Anytown, USA',
      city: 'Anytown',
      state: 'CA',
      zipCode: '12345',
      country: 'USA',
      
      // Date and time information
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      bookingDate: new Date().toLocaleDateString(),
      bookingTime: new Date().toLocaleTimeString(),
      submissionDate: new Date().toLocaleDateString(),
      
      // Location information
      location: 'Sample Location',
      bookingLocation: 'Sample Location',
      venueAddress: '456 Venue Blvd, Anytown, USA',
      
      // Company information
      companyName: 'Your Company',
      businessName: 'Your Business',
      currentYear: new Date().getFullYear().toString(),
      
      // Invoice information
      invoiceNumber: 'INV-12345',
      totalAmount: '$100.00',
      invoiceLink: 'https://example.com/invoice/12345',
      dueDate: new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString(),
      
      // Service information
      serviceType: 'Wedding Ceremony',
      packageName: 'Premium Package',
      
      // Officer information
      officerName: 'Jane Smith',
      officerTitle: 'Marriage Officiant',
      officerPhone: '555-987-6543',
      
      // Booking link
      bookingLink: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/forms/test-form-id/view?tracking=test-lead-123-${Date.now()}`
    } as const;

    // Replace placeholders in the template with sample data
    let htmlContent = template.htmlContent;
    let emailSubject = `[TEST] ${template.subject}`;

    // Find all variables in the template for logging
    const htmlVariables = (htmlContent.match(/{{([^}]+)}}/g) || [])
      .map(match => match.slice(2, -2).trim());
    
    const subjectVariables = (emailSubject.match(/{{([^}]+)}}/g) || [])
      .map(match => match.slice(2, -2).trim());
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('Variables found in HTML content:', htmlVariables);
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log('Variables found in subject:', subjectVariables);
    }
    
    // Log available sample data keys for debugging
    if (process.env.NODE_ENV !== 'production') {
      console.log('Available sample data keys:', Object.keys(sampleData));
    }
    
    // Replace placeholders in the HTML content and subject
    htmlContent = htmlContent.replace(/{{([^}]+)}}/g, (match, key) => {
      // Trim any whitespace from the key
      const trimmedKey = key.trim();
      // Check if the key exists in sampleData using type-safe 'in' operator
      if (trimmedKey in sampleData) {
        const value = sampleData[trimmedKey as keyof typeof sampleData];
        if (process.env.NODE_ENV !== 'production') {
          console.log(`Replacing variable "${trimmedKey}" with "${value}"`);
        }
        return String(value);
      }
      // Log missing variable for debugging
      console.warn(`Variable not found in sample data: "${trimmedKey}"`);
      // Keep the variable as is in the output for debugging
      return match;
    });
    
    emailSubject = emailSubject.replace(/{{([^}]+)}}/g, (match, key) => {
      // Trim any whitespace from the key
      const trimmedKey = key.trim();
      // Check if the key exists in sampleData using type-safe 'in' operator
      if (trimmedKey in sampleData) {
        const value = sampleData[trimmedKey as keyof typeof sampleData];
        if (process.env.NODE_ENV !== 'production') {
          console.log(`Replacing subject variable "${trimmedKey}" with "${value}"`);
        }
        return String(value);
      }
      // Log missing variable for debugging
      console.warn(`Variable not found in sample data: "${trimmedKey}"`);
      // Keep the variable as is in the output for debugging
      return match;
    });

    // Process CC and BCC emails from template
    const ccEmails = template.ccEmails ? template.ccEmails.split(',').map(email => email.trim()).filter(email => email) : undefined;
    const bccEmails = template.bccEmails ? template.bccEmails.split(',').map(email => email.trim()).filter(email => email) : undefined;
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('CC emails:', ccEmails);
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log('BCC emails:', bccEmails);
    }

    // Send the email using our utility function
    const result = await sendEmail({
      to,
      subject: emailSubject,
      html: htmlContent,
      userId: user.id,
      templateId: template.id,
      cc: ccEmails,
      bcc: bccEmails
    });

    if (result.success) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Test email sent successfully');
      }
      return res.status(200).json({ 
        success: true,
        message: `Test email sent successfully to ${to}`,
        emailLogId: result.emailLogId
      });
    } else {
      // Log the error for debugging
      console.error('Test email sending failed:', result.error, result.details);
      
      return res.status(500).json({ 
        error: 'Failed to send test email',
        message: result.error,
        details: result.details
      });
    }
  } catch (error) {
    logApiError(error, 'emails/send-test');
    
    return res.status(500).json({ 
      error: 'Failed to send test email',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
