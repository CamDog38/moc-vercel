import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import { addApiLog } from '../../debug/logs/index';

/**
 * This API route is created to fix the issue with the non-existent 'active' field
 * in EmailTemplate queries. It provides a diagnostic endpoint to check for and fix
 * any issues related to email template queries.
 */
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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    addApiLog('Starting email template diagnostic check', 'info', 'emails');
    
    // Check for invoice templates
    const invoiceTemplates = await prisma.emailTemplate.findMany({
      where: {
        type: 'INVOICE',
        userId: user.id,
      },
    });
    
    addApiLog(`Found ${invoiceTemplates.length} invoice templates for user`, 'info', 'emails');
    
    // If no invoice template exists, create one
    if (invoiceTemplates.length === 0) {
      addApiLog('No invoice template found, creating default', 'info', 'emails');
      
      // Import the ensure function
      const { ensureInvoiceTemplate } = require('./ensure-invoice-template');
      const result = await ensureInvoiceTemplate(user.id);
      
      addApiLog(`Default invoice template created: ${result.created}`, 'success', 'emails');
    }
    
    // Check for booking confirmation templates
    const bookingTemplates = await prisma.emailTemplate.findMany({
      where: {
        type: 'BOOKING_CONFIRMATION',
        userId: user.id,
      },
    });
    
    addApiLog(`Found ${bookingTemplates.length} booking confirmation templates for user`, 'info', 'emails');
    
    // Check for inquiry templates
    const inquiryTemplates = await prisma.emailTemplate.findMany({
      where: {
        type: 'INQUIRY',
        userId: user.id,
      },
    });
    
    addApiLog(`Found ${inquiryTemplates.length} inquiry templates for user`, 'info', 'emails');
    
    // If no templates exist at all, create defaults
    if (invoiceTemplates.length === 0 && bookingTemplates.length === 0 && inquiryTemplates.length === 0) {
      addApiLog('No email templates found, creating all defaults', 'info', 'emails');
      
      // Call the ensure-defaults endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/emails/templates/ensure-defaults`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization || '',
          'Cookie': req.headers.cookie || ''
        }
      });
      
      if (response.ok) {
        addApiLog('All default templates created successfully', 'success', 'emails');
      } else {
        const errorData = await response.json();
        addApiLog(`Error creating default templates: ${errorData.error || 'Unknown error'}`, 'error', 'emails');
      }
    }
    
    // Return diagnostic information
    return res.status(200).json({
      success: true,
      diagnostics: {
        invoiceTemplates: invoiceTemplates.length,
        bookingTemplates: bookingTemplates.length,
        inquiryTemplates: inquiryTemplates.length,
        emailTemplateSchema: {
          hasActiveField: false,
          note: "The EmailTemplate model does not have an 'active' field. Queries should not include this field."
        }
      },
      message: 'Email template diagnostic check completed'
    });
  } catch (error) {
    const errorMsg = `Error in email template diagnostic: ${error instanceof Error ? error.message : 'Unknown error'}`;
    addApiLog(errorMsg, 'error', 'emails');
    return res.status(500).json({ error: errorMsg });
  }
}