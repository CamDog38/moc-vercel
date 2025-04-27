import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import { sendEmail } from '@/util/email-sender';
import { addApiLog } from '../debug/logs';
import { replaceVariables } from '@/util/email-template-helpers';

interface BookingWithDetails {
  id: string;
  date: Date;
  time: string | null;
  location: string | null;
  status: string;
  email: string;
  phone: string | null;
  name: string;
  notes: string | null;
  form?: {
    name: string;
  };
  invoices?: {
    id: string;
    status: string;
  }[];
  confirmationEmailSentAt: Date | null;
  formSubmissions?: {
    id: string;
    data: any;
  }[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check authentication
  const supabase = createClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    addApiLog('Unauthorized access attempt to send-booking-confirmation', 'error', 'emails');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    addApiLog(`Method not allowed: ${req.method}`, 'error', 'emails');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { bookingId, templateId } = req.body;

    if (!bookingId) {
      addApiLog('Missing booking ID in request body', 'error', 'emails');
      return res.status(400).json({ error: 'Missing booking ID' });
    }

    addApiLog(`Processing booking confirmation for booking ID: ${bookingId}`, 'info', 'emails');

    // Get the booking with form submissions
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
      },
      include: {
        form: true,
        invoices: {
          orderBy: {
            createdAt: 'desc'
          },
          where: {
            status: { not: 'voided' }
          },
          take: 1
        },
        formSubmissions: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      },
    }) as unknown as BookingWithDetails;

    if (!booking) {
      addApiLog(`Booking not found with ID: ${bookingId}`, 'error', 'emails');
      return res.status(404).json({ error: 'Booking not found' });
    }

    addApiLog(`Found booking: ${booking.name} (${booking.email})`, 'success', 'emails');

    // Get the email template
    let template;
    if (templateId) {
      template = await prisma.emailTemplate.findFirst({
        where: {
          id: templateId,
        },
      });
      addApiLog(`Using specific template ID: ${templateId}`, 'info', 'emails');
    } else {
      // Get the default booking confirmation template
      template = await prisma.emailTemplate.findFirst({
        where: {
          type: 'BOOKING_CONFIRMATION',
        },
      });
      addApiLog(`Using default BOOKING_CONFIRMATION template`, 'info', 'emails');
    }

    if (!template) {
      addApiLog('Email template not found', 'error', 'emails');
      return res.status(404).json({ error: 'Email template not found' });
    }

    addApiLog(`Found template: ${template.name}`, 'success', 'emails');

    // Get the recipient email
    const recipientEmail = booking.email;
    if (!recipientEmail) {
      addApiLog('No recipient email found for this booking', 'error', 'emails');
      return res.status(400).json({ error: 'No recipient email found for this booking' });
    }

    // Prepare comprehensive data for template variables
    const formSubmissionData = booking.formSubmissions && booking.formSubmissions.length > 0 
      ? booking.formSubmissions[0].data || {} 
      : {};

    const data = {
      // Basic booking info
      name: booking.name,
      firstName: booking.name.split(' ')[0] || booking.name,
      date: booking.date ? new Date(booking.date).toLocaleDateString() : '',
      time: booking.time || '',
      location: booking.location || '',
      formName: booking.form?.name || '',
      status: booking.status,
      email: booking.email,
      phone: booking.phone || '',
      notes: booking.notes || '',
      
      // Form submission data
      ...formSubmissionData,
      
      // Invoice link
      invoiceLink: booking.invoices && booking.invoices.length > 0 
        ? `${process.env.NEXT_PUBLIC_BASE_URL || ''}/invoices/${booking.invoices[0].id}/view` 
        : '',
      
      // Add submission and booking objects for direct access
      submission: booking.formSubmissions && booking.formSubmissions.length > 0 
        ? booking.formSubmissions[0] 
        : null,
      booking: booking,
      
      // Add timeStamp for tracking
      timeStamp: Date.now().toString()
    };

    addApiLog(`Prepared data for template variables with ${Object.keys(data).length} fields`, 'info', 'emails');

    // Use the replaceVariables utility for consistent variable replacement
    const processedSubject = replaceVariables(template.subject, data);
    const processedHtml = replaceVariables(template.htmlContent, data);

    addApiLog(`Sending email to: ${recipientEmail}`, 'info', 'emails');
    addApiLog(`Email subject: ${processedSubject}`, 'info', 'emails');

    // Use the centralized sendEmail utility
    const emailResult = await sendEmail({
      to: recipientEmail,
      subject: processedSubject,
      html: processedHtml,
      userId: user.id,
      templateId: template.id,
      bookingId: booking.id,
      formSubmissionId: booking.formSubmissions && booking.formSubmissions.length > 0 
        ? booking.formSubmissions[0].id 
        : undefined
    });

    if (!emailResult.success) {
      throw new Error(emailResult.error || 'Failed to send email');
    }

    addApiLog(`Email sent successfully to ${recipientEmail}`, 'success', 'emails');

    // Update the booking to mark confirmation email as sent
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        confirmationEmailSent: true,
        confirmationEmailSentAt: new Date(),
      },
    });

    addApiLog(`Booking updated with confirmationEmailSent=true`, 'success', 'emails');

    return res.status(200).json({ 
      success: true,
      message: 'Booking confirmation email sent successfully',
      emailLogId: emailResult.emailLogId
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    addApiLog(`Error sending booking confirmation email: ${errorMessage}`, 'error', 'emails');
    console.error('Error sending booking confirmation email:', error);
    
    // Log the failed email attempt
    if (req.body.bookingId && req.body.templateId) {
      try {
        await prisma.emailLog.create({
          data: {
            templateId: req.body.templateId,
            recipient: 'unknown',
            subject: 'Booking Confirmation',
            userId: user.id,
            status: 'FAILED',
            error: errorMessage,
            bookingId: req.body.bookingId,
          },
        });
      } catch (logError) {
        console.error('Error logging email failure:', logError);
      }
    }
    
    return res.status(500).json({ 
      error: 'Failed to send booking confirmation email',
      details: errorMessage
    });
  }
}
