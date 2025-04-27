import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { DEFAULT_SERVICE_TYPES } from '@/util/service-types';
import { processTemplateDirectives } from '@/util/template-helpers';
import { formatCurrency } from '@/util/format-helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const invoiceId = req.query.id as string;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        booking: {
          include: {
            form: true,
            submissions: true,
          }
        },
        officer: true,
        lineItems: true,
      }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const pdfTemplate = await prisma.pdfTemplate.findFirst({
      where: {
        type: 'INVOICE',
        isActive: true
      }
    });

    if (!pdfTemplate) {
      return res.status(404).json({ error: 'PDF template not found' });
    }

    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl = `${protocol}://${host}`;

    // Format booking time nicely if available
    let formattedBookingTime = '';
    if (invoice.booking?.time) {
      try {
        const timeString = invoice.booking.time;
        if (process.env.NODE_ENV !== 'production') {
          console.log(`Raw booking time: "${timeString}"`);
        }
        
        // Check if it's an ISO date string (e.g., "2025-03-10T09:37:07.138Z")
        if (typeof timeString === 'string' && timeString.includes('T') && timeString.includes('Z')) {
          const date = new Date(timeString);
          if (!isNaN(date.getTime())) {
            const hours = date.getHours();
            const minutes = date.getMinutes();
            const period = hours >= 12 ? 'PM' : 'AM';
            const hours12 = hours % 12 || 12; // Convert 0 to 12 for 12 AM
            formattedBookingTime = `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
            if (process.env.NODE_ENV !== 'production') {
              console.log(`Formatted booking time from ISO: "${formattedBookingTime}"`);
            }
          }
        } 
        // Check if it's already in a time format (e.g., "14:30")
        else if (typeof timeString === 'string' && /^\d{1,2}:\d{2}(:\d{2})?$/.test(timeString)) {
          const timeParts = timeString.split(':');
          const hoursStr = timeParts[0] ?? '';
          const minutesStr = timeParts[1] ?? '';
          const hours = Number(hoursStr);
          const minutes = Number(minutesStr);
          const period = hours >= 12 ? 'PM' : 'AM';
          const hours12 = hours % 12 || 12; // Convert 0 to 12 for 12 AM
          formattedBookingTime = `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
          if (process.env.NODE_ENV !== 'production') {
            console.log(`Formatted booking time from 24h: "${formattedBookingTime}"`);
          }
        } 
        else {
          // If it's not in a standard time format, just use it as is
          formattedBookingTime = String(timeString);
          if (process.env.NODE_ENV !== 'production') {
            console.log(`Using original time string: "${formattedBookingTime}"`);
          }
        }
      } catch (error) {
        console.error(`Error formatting booking time:`, error);
        formattedBookingTime = String(invoice.booking.time);
      }
    } 
    // If no booking time is available but we have a booking date with time component
    else if (invoice.booking?.date) {
      try {
        const bookingDate = invoice.booking.date;
        if (process.env.NODE_ENV !== 'production') {
          console.log(`Checking booking date for time: "${bookingDate}"`);
        }
        
        // Since date is a DateTime in the Prisma schema, it will be a Date object
        // or a string that can be parsed as a date
        const date = new Date(bookingDate);
        if (!isNaN(date.getTime())) {
          const hours = date.getHours();
          const minutes = date.getMinutes();
          const period = hours >= 12 ? 'PM' : 'AM';
          const hours12 = hours % 12 || 12; // Convert 0 to 12 for 12 AM
          formattedBookingTime = `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
          if (process.env.NODE_ENV !== 'production') {
            console.log(`Extracted booking time from date: "${formattedBookingTime}"`);
          }
        }
      } catch (error) {
        console.error(`Error extracting time from booking date:`, error);
      }
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
        } else {
          formattedBookingDate = String(invoice.booking.date);
        }
      } catch (error) {
        formattedBookingDate = String(invoice.booking.date);
      }
    }

    // Format invoice date
    let formattedInvoiceDate = '';
    try {
      const date = new Date(invoice.createdAt);
      if (!isNaN(date.getTime())) {
        // Format date as DD/MM/YYYY
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        formattedInvoiceDate = `${day}/${month}/${year}`;
      } else {
        formattedInvoiceDate = invoice.createdAt.toLocaleDateString();
      }
    } catch (error) {
      console.error(`Error formatting invoice date:`, error);
      formattedInvoiceDate = invoice.createdAt.toLocaleDateString();
    }

    // Format invoice status nicely
    let formattedInvoiceStatus = 'Pending';
    if (invoice.status) {
      // Capitalize the first letter of the status
      formattedInvoiceStatus = invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1).toLowerCase();
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Formatted invoice status: "${formattedInvoiceStatus}"`);
      }
    }

    // Format service type nicely
    let serviceTypeDisplay = invoice.serviceType || '';
    try {
      if (invoice.serviceType) {
        // Check if it's a known service type with a display name
        if (DEFAULT_SERVICE_TYPES[invoice.serviceType as keyof typeof DEFAULT_SERVICE_TYPES]) {
          serviceTypeDisplay = DEFAULT_SERVICE_TYPES[invoice.serviceType as keyof typeof DEFAULT_SERVICE_TYPES];
          if (process.env.NODE_ENV !== 'production') {
            console.log(`Using default service type display: "${serviceTypeDisplay}"`);
          }
        } 
        // Otherwise, format it nicely
        else {
          serviceTypeDisplay = invoice.serviceType
            .replace(/_/g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .trim()
            .toLowerCase()
            .replace(/\b\w/g, (c) => c.toUpperCase());
          if (process.env.NODE_ENV !== 'production') {
            console.log(`Formatted service type: "${serviceTypeDisplay}"`);
          }
        }
      }
    } catch (error) {
      console.error(`Error formatting service type:`, error);
    }

    // Format line items for the template
    const lineItems = invoice.lineItems.map(item => ({
      description: item.description,
      quantity: parseFloat(item.quantity.toString()).toFixed(2),
      unitPrice: parseFloat(item.unitPrice.toString()).toFixed(2),
      amount: parseFloat(item.amount.toString()).toFixed(2)
    }));

    // Format payment date if available
    let formattedPaymentDate = '';
    if (invoice.paymentDate) {
      try {
        const date = new Date(invoice.paymentDate);
        if (!isNaN(date.getTime())) {
          // Format date as DD/MM/YYYY
          const day = date.getDate().toString().padStart(2, '0');
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const year = date.getFullYear();
          formattedPaymentDate = `${day}/${month}/${year}`;
        } else {
          formattedPaymentDate = String(invoice.paymentDate);
        }
      } catch (error) {
        console.error(`Error formatting payment date:`, error);
        formattedPaymentDate = String(invoice.paymentDate);
      }
    }

    // Create a map of all template variables
    const templateVariables = {
      id: invoice.id,
      createdAt: formattedInvoiceDate, // Use formatted date instead of ISO string
      updatedAt: new Date(invoice.updatedAt).toLocaleDateString(), // Format updated date too
      invoiceDate: formattedInvoiceDate,
      totalAmount: invoice.totalAmount.toFixed(2),
      serviceRate: invoice.serviceRate.toFixed(2),
      travelCosts: invoice.travelCosts.toFixed(2),
      status: formattedInvoiceStatus,
      bookingDate: formattedBookingDate,
      bookingTime: formattedBookingTime,
      location: invoice.booking?.location || '',
      bookingLocation: invoice.booking?.location || '',
      officerName: invoice.officer ? `${invoice.officer.firstName} ${invoice.officer.lastName}` : '',
      clientName: invoice.booking?.name || '',
      clientEmail: invoice.booking?.email || '',
      clientPhone: invoice.booking?.phone || '',
      serviceType: serviceTypeDisplay,
      baseUrl: baseUrl,
      lineItems: lineItems, // Add line items array
      invoiceNumber: invoice.invoiceNumber || invoice.id.substring(0, 8).toUpperCase(),
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      // Payment details
      amountPaid: invoice.amountPaid ? parseFloat(invoice.amountPaid.toString()).toFixed(2) : null,
      paymentMethod: invoice.paymentMethod || null,
      paymentDate: formattedPaymentDate || null,
      isPaid: invoice.status === 'paid',
      // Add formatted currency values for template
      subtotal: formatCurrency(invoice.serviceRate?.toString() ?? '0'),
      tax: formatCurrency(invoice.travelCosts?.toString() ?? '0'),
      total: formatCurrency(invoice.totalAmount?.toString() ?? '0')
    };

    // Log all template variables for debugging
    if (process.env.NODE_ENV !== 'production') {
      console.log('Template variables:', JSON.stringify(templateVariables, null, 2));
    }
    
    // Process the template with directives and variables
    let html = processTemplateDirectives(pdfTemplate.htmlContent, templateVariables);

    // Convert relative image paths to absolute URLs
    html = html.replace(/(src=["'])\/([^"']*["'])/g, `$1${baseUrl}/$2`);
    html = html.replace(/(src=["'])(?!http)(images\/[^"']*["'])/g, `$1${baseUrl}/$2`);

    // Create a static version of the HTML by removing all interactive elements
    // This is a more aggressive approach to ensure view-only mode
    const staticHtml = `
      <div class="invoice-static-view">
        ${html}
      </div>
    `;

    const additionalCss = `
      /* Base styles for consistent rendering */
      body {
        margin: 0 auto;
        padding: 20px;
        font-family: Arial, sans-serif;
        line-height: 1.5;
        color: #333;
        background-color: white;
        max-width: 800px;
      }
      
      /* Image handling */
      img { 
        max-width: 100%; 
        height: auto; 
        display: inline-block;
      }
      
      /* Print-specific styles */
      @media print {
        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
      
      /* Make the invoice view static */
      .invoice-static-view {
        pointer-events: none !important;
      }
      
      /* Hide all interactive elements */
      button, 
      [role="button"],
      [contenteditable="true"],
      input,
      select,
      textarea,
      .edit-button,
      .add-button,
      .add,
      [aria-label="Edit"],
      [aria-label="Add"] {
        display: none !important;
      }
    `;

    return res.status(200).json({ 
      html: staticHtml,
      css: (pdfTemplate.cssContent || '') + additionalCss
    });
  } catch (error) {
    console.error('Error generating invoice HTML:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ 
      error: 'Failed to generate invoice HTML',
      details: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
}