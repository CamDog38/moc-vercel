import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import sgMail from '@sendgrid/mail';
import { addApiLog } from '../debug/logs/index';

// Initialize SendGrid with API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    addApiLog('Method not allowed in send-invoice API', 'error', 'emails');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check authentication
  const supabase = createClient(req, res);
  let user;
  
  // Import the helper function to check if this is an internal API call
  const { isInternalApiCall } = require('@/util/api-helpers');
  const isInternal = isInternalApiCall(req);
  
  addApiLog(`Request headers: ${JSON.stringify(req.headers)}`, 'info', 'emails');
  addApiLog(`Is internal API call: ${isInternal}`, 'info', 'emails');
  
  if (isInternal) {
    addApiLog('Bypassing authentication for internal server-to-server API call', 'info', 'emails');
    // If userId is provided in the request body, use it
    if (req.body.userId) {
      // Get the user from the database using the provided userId
      const dbUser = await prisma.user.findUnique({
        where: { id: req.body.userId }
      });
      
      if (dbUser) {
        user = { id: dbUser.id, email: dbUser.email };
        addApiLog(`Using provided user ID: ${user.id} (${user.email})`, 'info', 'emails');
      } else {
        addApiLog(`Warning: Provided user ID ${req.body.userId} not found in database`, 'error', 'emails');
        return res.status(400).json({ error: 'Invalid user ID provided' });
      }
    } else {
      addApiLog('Warning: No user ID provided in internal API call', 'error', 'emails');
      return res.status(400).json({ error: 'User ID is required for internal API calls' });
    }
  } else {
    // First try to get user from auth header
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (authUser) {
      user = authUser;
    } 
    // If no user from auth header, check if userId is provided in the request body
    else if (req.body.userId) {
      // Get the user from the database using the provided userId
      const dbUser = await prisma.user.findUnique({
        where: { id: req.body.userId }
      });
      
      if (dbUser) {
        user = { id: dbUser.id, email: dbUser.email };
      }
    }
  }

  if (!user) {
    addApiLog('Unauthorized access attempt to send-invoice API', 'error', 'emails');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { invoiceId, templateId } = req.body;
    addApiLog(`Processing invoice email for invoice ID: ${invoiceId}`, 'info', 'emails');

    if (!invoiceId) {
      addApiLog('Missing invoice ID in request body', 'error', 'emails');
      return res.status(400).json({ error: 'Missing invoice ID' });
    }

    // Get the invoice
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
      },
      include: {
        booking: {
          include: {
            form: true,
          },
        },
        officer: true,
      },
    });

    if (!invoice) {
      addApiLog(`Invoice not found with ID: ${invoiceId}`, 'error', 'emails');
      return res.status(404).json({ error: 'Invoice not found' });
    }

    addApiLog(`Found invoice #${invoice.invoiceNumber || invoiceId} for ${invoice.booking?.name || 'Unknown client'}`, 'info', 'emails');

    // Get the email template
    let template;
    if (templateId) {
      template = await prisma.emailTemplate.findFirst({
        where: {
          id: templateId,
        },
      });
      addApiLog(`Using specified template ID: ${templateId}`, 'info', 'emails');
    } else {
      // Import the utility function for getting email templates
      const { ensureEmailTemplate } = require('@/util/email-template-helpers');
      
      try {
        // Get or create an invoice template for the user
        template = await ensureEmailTemplate(user.id, 'INVOICE');
        
        if (template) {
          addApiLog(`Using invoice template: ${template.name}`, 'success', 'emails');
        }
      } catch (templateError) {
        addApiLog(`Error getting invoice template: ${templateError instanceof Error ? templateError.message : 'Unknown error'}`, 'error', 'emails');
      }
    }

    if (!template) {
      addApiLog('Email template not found', 'error', 'emails');
      return res.status(404).json({ error: 'Email template not found' });
    }

    addApiLog(`Using email template: ${template.name}`, 'info', 'emails');

    // Get the recipient email
    const recipientEmail = invoice.booking?.email;
    if (!recipientEmail) {
      addApiLog('No recipient email found for this invoice', 'error', 'emails');
      return res.status(400).json({ error: 'No recipient email found for this invoice' });
    }

    // Format invoice date nicely
    let formattedInvoiceDate = '';
    try {
      const date = new Date(invoice.createdAt);
      if (!isNaN(date.getTime())) {
        // Format date as DD/MM/YYYY to match the format in the screenshot
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        formattedInvoiceDate = `${day}/${month}/${year}`;
        addApiLog(`Formatted invoice date: "${formattedInvoiceDate}"`, 'info', 'emails');
      } else {
        formattedInvoiceDate = invoice.createdAt.toLocaleDateString();
        addApiLog(`Using default invoice date format: "${formattedInvoiceDate}"`, 'info', 'emails');
      }
    } catch (error) {
      formattedInvoiceDate = invoice.createdAt.toLocaleDateString();
      addApiLog(`Error formatting invoice date: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'emails');
    }

    // Format booking date nicely
    let formattedBookingDate = '';
    if (invoice.booking?.date) {
      try {
        const date = new Date(invoice.booking.date);
        if (!isNaN(date.getTime())) {
          // Format date as DD/MM/YYYY to match the format in the screenshot
          const day = date.getDate().toString().padStart(2, '0');
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const year = date.getFullYear();
          formattedBookingDate = `${day}/${month}/${year}`;
          addApiLog(`Formatted booking date: "${formattedBookingDate}"`, 'info', 'emails');
        } else {
          formattedBookingDate = String(invoice.booking.date);
          addApiLog(`Using original booking date: "${formattedBookingDate}"`, 'info', 'emails');
        }
      } catch (error) {
        formattedBookingDate = String(invoice.booking.date);
        addApiLog(`Error formatting booking date: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'emails');
      }
    } else {
      addApiLog(`No booking date found in the invoice data`, 'info', 'emails');
    }

    // Format booking time nicely if available
    let formattedBookingTime = '';
    addApiLog(`Raw booking data: ${JSON.stringify(invoice.booking)}`, 'info', 'emails');
    
    if (invoice.booking?.time) {
      addApiLog(`Raw booking time: "${invoice.booking.time}"`, 'info', 'emails');
      try {
        // Try to parse the time string
        const timeString = invoice.booking.time;
        
        // Check if it's an ISO date string (e.g., "2025-03-10T09:37:07.138Z")
        if (timeString.includes('T') && timeString.includes('Z')) {
          // Parse the ISO date string
          const date = new Date(timeString);
          if (!isNaN(date.getTime())) {
            // Format time in 12-hour format with AM/PM
            const hours = date.getHours();
            const minutes = date.getMinutes();
            const period = hours >= 12 ? 'PM' : 'AM';
            const hours12 = hours % 12 || 12; // Convert 0 to 12 for 12 AM
            formattedBookingTime = `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
            addApiLog(`Formatted ISO date booking time: "${formattedBookingTime}"`, 'info', 'emails');
          } else {
            formattedBookingTime = timeString;
            addApiLog(`Failed to parse ISO date, using original: "${formattedBookingTime}"`, 'info', 'emails');
          }
        } 
        // Check if it's already in a time format (e.g., "14:30")
        else if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(timeString)) {
          // Parse time in 24-hour format and convert to 12-hour format with AM/PM
          const [hours, minutes] = timeString.split(':').map(Number);
          addApiLog(`Parsed time: hours=${hours}, minutes=${minutes}`, 'info', 'emails');
          const period = hours >= 12 ? 'PM' : 'AM';
          const hours12 = hours % 12 || 12; // Convert 0 to 12 for 12 AM
          formattedBookingTime = `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
          addApiLog(`Formatted booking time: "${formattedBookingTime}"`, 'info', 'emails');
        } else {
          // If it's not in a standard time format, just use it as is
          formattedBookingTime = timeString;
          addApiLog(`Using original time string: "${formattedBookingTime}"`, 'info', 'emails');
        }
      } catch (error) {
        // If there's an error parsing, just use the original time string
        formattedBookingTime = invoice.booking.time;
        addApiLog(`Error formatting booking time: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'emails');
      }
    } else {
      addApiLog(`No booking time found in the invoice data`, 'info', 'emails');
    }
    
    // Format officer name
    const officerName = invoice.officer 
      ? `${invoice.officer.firstName || ''} ${invoice.officer.lastName || ''}`.trim()
      : '';
    addApiLog(`Formatted officer name: "${officerName}"`, 'info', 'emails');
    
    // Format officer phone
    const officerPhone = invoice.officer?.phoneNumber || '';
    addApiLog(`Officer phone: "${officerPhone}"`, 'info', 'emails');
    
    // Get location name and try to find the full address
    const locationName = invoice.booking?.location || '';
    addApiLog(`Location name: "${locationName}"`, 'info', 'emails');
    
    // Try to find the location address from the database
    let locationAddress = '';
    try {
      if (locationName) {
        const locationRecord = await prisma.officeLocation.findFirst({
          where: { name: locationName }
        });
        
        if (locationRecord) {
          locationAddress = locationRecord.address;
          addApiLog(`Found location address in database: "${locationAddress}"`, 'success', 'emails');
        } else {
          addApiLog(`No location record found for name: "${locationName}"`, 'info', 'emails');
          // If no location found, use the name as the address (fallback)
          locationAddress = locationName;
        }
      }
    } catch (error) {
      addApiLog(`Error fetching location address: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'emails');
      // Fallback to using the location name
      locationAddress = locationName;
    }
    
    // Import the getBaseUrl function to get the correct URL for the current environment
    const { getBaseUrl } = require('@/util/api-helpers');
    
    // Always use the getBaseUrl function to ensure consistent URL resolution
    const baseUrl = getBaseUrl();
    addApiLog(`Using dynamically resolved base URL: ${baseUrl}`, 'info', 'emails');
    
    // Log all relevant environment variables for debugging
    addApiLog(`Environment variables for URL resolution:
      NODE_ENV: ${process.env.NODE_ENV || 'not set'}
      VERCEL_ENV: ${process.env.VERCEL_ENV || 'not set'}
      NEXT_PUBLIC_CO_DEV_ENV: ${process.env.NEXT_PUBLIC_CO_DEV_ENV || 'not set'}
      VERCEL_URL: ${process.env.VERCEL_URL ? 'set' : 'not set'}
      NEXT_PUBLIC_BASE_URL: ${process.env.NEXT_PUBLIC_BASE_URL || 'not set'}
      Resolved Base URL: ${baseUrl}
    `, 'info', 'emails');
    
    // Log all relevant environment variables for debugging
    addApiLog(`Environment variables for URL resolution:
      NODE_ENV: ${process.env.NODE_ENV || 'not set'}
      VERCEL_ENV: ${process.env.VERCEL_ENV || 'not set'}
      NEXT_PUBLIC_CO_DEV_ENV: ${process.env.NEXT_PUBLIC_CO_DEV_ENV || 'not set'}
      VERCEL_URL: ${process.env.VERCEL_URL ? 'set' : 'not set'}
      NEXT_PUBLIC_BASE_URL: ${process.env.NEXT_PUBLIC_BASE_URL || 'not set'}
    `, 'info', 'emails');
    
    const invoiceLink = `${baseUrl}/invoices/${invoice.id}/view`;
    addApiLog(`Generated invoice link: ${invoiceLink}`, 'info', 'emails');
    addApiLog(`Invoice link generated: ${invoiceLink}`, 'info', 'emails');
    
    const data = {
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: invoice.totalAmount,
      status: invoice.status,
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '',
      clientName: invoice.booking?.name || '',
      bookingDate: formattedBookingDate,
      bookingTime: formattedBookingTime, // Add formatted booking time as a top-level variable
      officerName: officerName, // Add officer name as a top-level variable
      officerPhone: officerPhone, // Add officer phone as a top-level variable
      location: locationAddress, // Use the full address for location variable
      locationName: locationName, // Add the location name as a separate variable
      bookingLocation: locationName, // Keep bookingLocation as the location name for backward compatibility
      id: invoice.id, // Add invoice ID as a top-level variable
      invoiceDate: formattedInvoiceDate, // Add formatted invoice date
      invoiceLink: invoiceLink,
      // Add invoice object for nested variable access
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: invoice.totalAmount,
        status: invoice.status,
        dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '',
        serviceRate: invoice.serviceRate,
        serviceType: invoice.serviceType,
        travelCosts: invoice.travelCosts,
        createdAt: invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : '', // Update this line
        // Add nested booking data
        booking: invoice.booking ? {
          name: invoice.booking.name || '',
          email: invoice.booking.email || '',
          phone: invoice.booking.phone || '',
          date: invoice.booking.date ? new Date(invoice.booking.date).toLocaleDateString() : '',
          time: formattedBookingTime, // Use the formatted time here too
          location: locationAddress, // Use the full address for location
          locationName: locationName, // Add the location name as a separate variable
        } : {},
        // Add nested officer data
        officer: invoice.officer ? {
          firstName: invoice.officer.firstName || '',
          lastName: invoice.officer.lastName || '',
          title: invoice.officer.title || '',
          phoneNumber: invoice.officer.phoneNumber || '',
          fullName: officerName,
        } : {},
      },
    };

    addApiLog('Prepared template variables for replacement', 'info', 'emails');

    // Replace placeholders in the HTML content and subject
    const replaceNestedVariables = (content: string, data: any) => {
      let result = content;
      
      // Log the initial content with variables
      addApiLog(`Initial content with variables: ${content.substring(0, 200)}...`, 'info', 'emails');
      
      // Create a flattened map of all variables for direct replacement
      const allVariables = new Map();
      
      // Add all top-level variables
      Object.entries(data).forEach(([key, value]) => {
        if (typeof value !== 'object') {
          allVariables.set(key, String(value));
        }
      });
      
      // Add specific variables we know are used in templates
      allVariables.set('bookingTime', data.bookingTime || '');
      allVariables.set('officerName', data.officerName || '');
      allVariables.set('officerPhone', data.officerPhone || '');
      allVariables.set('location', data.location || ''); // This is now the full address
      allVariables.set('locationName', data.locationName || ''); // This is just the location name
      allVariables.set('bookingLocation', data.bookingLocation || ''); // This is the location name for backward compatibility
      allVariables.set('id', data.invoice?.id || '');
      allVariables.set('invoiceDate', data.invoiceDate || '');
      
      // Log all variables for debugging
      addApiLog(`All variables for replacement: ${JSON.stringify(Object.fromEntries(allVariables))}`, 'info', 'emails');
      
      // Replace all variables in one pass
      allVariables.forEach((value, key) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        const matches = result.match(regex);
        if (matches) {
          addApiLog(`Replacing {{${key}}} with "${value}" (${matches.length} occurrences)`, 'info', 'emails');
          result = result.replace(regex, value);
        }
      });
      
      // Special case for bookingLocation if it's not being replaced
      result = result.replace(/{{bookingLocation}}/g, data.bookingLocation || '');
      
      // Special case for location if it's not being replaced
      result = result.replace(/{{location}}/g, data.location || '');
      
      // Special case for locationName if it's not being replaced
      result = result.replace(/{{locationName}}/g, data.locationName || '');
      
      return result;
    };
    
    // Apply the nested variable replacement to both subject and content
    let htmlContent = template.htmlContent;
    let emailSubject = template.subject;
    htmlContent = replaceNestedVariables(htmlContent, data);
    emailSubject = replaceNestedVariables(emailSubject, data);
    
    addApiLog('Template variables replaced in email content with nested variable support', 'info', 'emails');

    // Send the email
    const msg = {
      to: recipientEmail,
      from: process.env.SENDGRID_FROM_EMAIL || user.email || '',
      subject: emailSubject,
      html: htmlContent,
    };

    addApiLog(`Sending email to ${recipientEmail} with subject: ${emailSubject}`, 'info', 'emails');
    
    try {
      // Send the email without attaching the invoice HTML
      await sgMail.send(msg);
      addApiLog('Email sent successfully via SendGrid', 'success', 'emails');
    } catch (sendgridError) {
      const errorMsg = `SendGrid error: ${sendgridError instanceof Error ? sendgridError.message : 'Unknown error'}`;
      addApiLog(errorMsg, 'error', 'emails');
      throw new Error(errorMsg);
    }

    // Log the email sending
    const emailLog = await prisma.emailLog.create({
      data: {
        templateId: template.id,
        recipient: recipientEmail,
        subject: emailSubject,
        userId: user.id,
        status: 'sent',
        invoiceId: invoice.id,
      },
    });
    addApiLog(`Email log created with ID: ${emailLog.id}`, 'success', 'emails');

    // Update the invoice to mark it as sent
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        emailSent: true,
        emailSentAt: new Date(),
      },
    });
    addApiLog(`Invoice updated with emailSent=true and timestamp`, 'success', 'emails');

    addApiLog(`Invoice email process completed successfully for invoice ID: ${invoiceId}`, 'success', 'emails');
    return res.status(200).json({ 
      success: true,
      emailLogId: emailLog.id,
      invoiceId: invoice.id
    });
  } catch (error) {
    const errorMsg = `Error sending invoice email: ${error instanceof Error ? error.message : 'Unknown error'}`;
    addApiLog(errorMsg, 'error', 'emails');
    
    // Log the failed email attempt
    if (req.body.invoiceId && user) {
      try {
        const failedLog = await prisma.emailLog.create({
          data: {
            templateId: req.body.templateId || '',
            recipient: 'unknown',
            subject: 'Invoice Email',
            userId: user.id,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            invoiceId: req.body.invoiceId,
          },
        });
        addApiLog(`Created failure log entry with ID: ${failedLog.id}`, 'info', 'emails');
      } catch (logError) {
        const logErrorMsg = `Error logging email failure: ${logError instanceof Error ? logError.message : 'Unknown error'}`;
        addApiLog(logErrorMsg, 'error', 'emails');
      }
    }
    
    return res.status(500).json({ error: 'Failed to send invoice email' });
  }
}