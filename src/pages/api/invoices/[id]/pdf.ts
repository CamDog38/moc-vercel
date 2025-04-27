import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { DEFAULT_SERVICE_TYPES } from '@/util/service-types';
import { processTemplateDirectives } from '@/util/template-helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Skip authentication for public access
    if (req.method !== 'GET') {
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    const { id } = req.query;
    const { templateId } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Invoice ID is required' });
    }
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Generating PDF for invoice ID: ${id}`);
    }
    
    // Get the invoice with all related data including line items
    const invoice = await prisma.invoice.findUnique({
      where: { id: id as string },
      include: {
        booking: true,
        officer: true,
        lineItems: true
      }
    });
    
    if (!invoice) {
      console.error(`Invoice not found: ${id}`);
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Found invoice: ${invoice.id}, with ${invoice.lineItems.length} line items`);
    }
    
    // Get the template - either the specified one or the default invoice template
    let template;
    
    if (templateId) {
      template = await prisma.pdfTemplate.findUnique({
        where: { 
          id: templateId as string,
          type: 'INVOICE'
        }
      });
    } else {
      // Get the first active invoice template
      template = await prisma.pdfTemplate.findFirst({
        where: { 
          type: 'INVOICE',
          isActive: true
        }
      });
    }
    
    if (!template) {
      console.error('No suitable template found');
      return res.status(404).json({ error: 'No suitable template found' });
    }
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Using template: ${template.id}`);
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
        console.error(`Error formatting booking date:`, error);
        formattedBookingDate = String(invoice.booking.date);
      }
    }
    
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
          const [hours, minutes] = timeString.split(':').map(Number);
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
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Processed ${lineItems.length} line items`);
    }
    
    // Get the protocol and host for base URL
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl = `${protocol}://${host}`;
    
    // Prepare data for template
    const invoiceData = {
      id: invoice.id,
      status: formattedInvoiceStatus,
      serviceType: serviceTypeDisplay,
      serviceRate: invoice.serviceRate.toFixed(2),
      travelCosts: invoice.travelCosts.toFixed(2),
      totalAmount: invoice.totalAmount.toFixed(2),
      createdAt: formattedInvoiceDate,
      invoiceDate: formattedInvoiceDate,
      clientName: invoice.booking.name,
      clientEmail: invoice.booking.email,
      clientPhone: invoice.booking.phone || 'N/A',
      bookingDate: formattedBookingDate,
      bookingTime: formattedBookingTime,
      bookingLocation: invoice.booking.location || 'N/A',
      officerName: invoice.officer ? `${invoice.officer.firstName} ${invoice.officer.lastName}` : 'N/A',
      lineItems: lineItems,
      invoiceNumber: invoice.invoiceNumber || invoice.id.substring(0, 8).toUpperCase(),
      dueDate: invoice.dueDate ? formatDate(invoice.dueDate) : formatDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)),
      baseUrl: baseUrl,
      // Add nested objects for better template variable access
      booking: {
        name: invoice.booking.name,
        email: invoice.booking.email,
        phone: invoice.booking.phone || 'N/A',
        date: formattedBookingDate,
        time: formattedBookingTime,
        Location: invoice.booking.location || 'N/A' // Note: Capital L to match the template variable
      }
    };
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('Template variables:', JSON.stringify(invoiceData, null, 2));
    }
    
    // Process the template with directives and variables
    let htmlContent = processTemplateDirectives(template.htmlContent, invoiceData);
    
    // Convert relative image paths to absolute URLs
    htmlContent = htmlContent.replace(/(src=["'])\/([^"']*["'])/g, `$1${baseUrl}/$2`);
    htmlContent = htmlContent.replace(/(src=["'])(?!http)(images\/[^"']*["'])/g, `$1${baseUrl}/$2`);
    htmlContent = htmlContent.replace(/(src=["'])(?!http|\/|data:)([^"']*["'])/g, `$1${baseUrl}/$2`);
    
    // Create a static version of the HTML by wrapping it in a container
    const staticHtmlContent = `
      <div class="invoice-static-view">
        ${htmlContent}
      </div>
    `;
    
    // Prepare a complete HTML document with proper CSS handling
    const fullHtmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            /* Base styles to ensure consistent rendering */
            body {
              margin: 0 auto;
              padding: 20px;
              font-family: Arial, sans-serif;
              font-size: 12px;
              line-height: 1.5;
              color: #333;
              background-color: white;
              max-width: 794px; /* A4 width in pixels at 96 DPI */
              box-sizing: border-box;
            }
            
            /* Print-specific styles */
            @media print {
              body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                width: 794px !important;
              }
              
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                box-sizing: border-box !important;
              }
            }
            
            /* Ensure images are loaded with correct dimensions */
            img { max-width: 100%; height: auto; }
            
            /* Make the invoice view static */
            .invoice-static-view {
              pointer-events: none !important;
              width: 100% !important;
              box-sizing: border-box !important;
            }
            
            /* Ensure table layouts are fixed */
            table {
              table-layout: fixed;
              width: 100%;
              border-collapse: collapse;
            }
            
            /* Preserve text alignment in table cells */
            td, th {
              text-align: inherit;
            }
            
            /* Ensure centered text stays centered */
            [align="center"], [style*="text-align: center"] {
              text-align: center !important;
            }
            
            /* Ensure right-aligned text stays right-aligned */
            [align="right"], [style*="text-align: right"] {
              text-align: right !important;
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
            
            /* Template CSS */
            ${template.cssContent || ''}
          </style>
        </head>
        <body>
          ${staticHtmlContent}
        </body>
      </html>
    `;
    
    // Return the HTML and CSS for client-side PDF generation
    return res.status(200).json({
      html: fullHtmlContent,
      css: template.cssContent || '',
      invoiceData: invoiceData,
      message: 'Use client-side PDF generation with jsPDF and html2canvas'
    });
    
  } catch (error) {
    console.error('Error generating invoice data for PDF:', error);
    res.status(500).json({ error: 'Failed to generate invoice data: ' + (error as Error).message });
  }
}

// Helper function to format dates consistently
function formatDate(dateInput: Date | string): string {
  try {
    const date = new Date(dateInput);
    if (!isNaN(date.getTime())) {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return new Date(dateInput).toLocaleDateString();
  } catch (error) {
    console.error(`Error formatting date:`, error);
    return new Date(dateInput).toLocaleDateString();
  }
}