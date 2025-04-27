import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { addApiLog } from '../debug/logs';
import { replaceVariables } from '@/util/email-template-helpers';
import { debugVariableReplacement } from '@/util/debug-variable-replacement';

/**
 * Debug endpoint to test variable replacement in email templates
 * This helps diagnose issues with variables not being replaced properly
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { templateId, submissionId, bookingId, text } = req.body;

    // Validate required parameters
    if ((!templateId && !text) || !submissionId) {
      return res.status(400).json({ 
        error: 'Missing required parameters',
        required: 'Either templateId or text, plus submissionId'
      });
    }

    // Get the template if templateId is provided
    let templateText = text;
    let templateName = 'Custom text';
    
    if (templateId) {
      const template = await prisma.emailTemplate.findUnique({
        where: { id: templateId }
      });
      
      if (!template) {
        return res.status(404).json({ error: `Template not found with ID: ${templateId}` });
      }
      
      templateText = template.htmlContent;
      templateName = template.name;
    }

    // Get the submission
    const submission = await prisma.formSubmission.findUnique({
      where: { id: submissionId },
      include: { lead: true }
    });
    
    if (!submission) {
      return res.status(404).json({ error: `Submission not found with ID: ${submissionId}` });
    }

    // Get the booking if bookingId is provided
    let booking = null;
    if (bookingId) {
      booking = await prisma.booking.findUnique({
        where: { id: bookingId },
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
          }
        }
      });
      
      if (!booking) {
        return res.status(404).json({ error: `Booking not found with ID: ${bookingId}` });
      }
    }

    // Prepare data for variable replacement
    const data: Record<string, any> = {
      submission: submission,
      formSubmission: submission,
      timeStamp: submission.timeStamp || Date.now().toString(),
      formData: submission.data || {},
    };
    
    // Add booking data if available
    if (booking) {
      data.booking = booking;
      data.name = booking.name;
      data.email = booking.email;
      data.phone = booking.phone;
      data.date = booking.date;
      data.time = booking.time;
      data.location = booking.location;
      data.status = booking.status;
      data.notes = booking.notes;
      
      // Add invoice link if available
      if (booking.invoices && booking.invoices.length > 0) {
        data.invoiceLink = `${process.env.NEXT_PUBLIC_BASE_URL || ''}/invoices/${booking.invoices[0].id}/view`;
      }
    }

    // Extract variables from the template
    const variables = templateText.match(/\{\{([^}]+)\}\}/g) || [];
    
    // Log the data and variables for debugging
    addApiLog(`Testing variable replacement for template: ${templateName}`, 'info', 'emails');
    addApiLog(`Found ${variables.length} variables in template: ${variables.join(', ')}`, 'info', 'emails');
    
    // Use the debug utility to analyze variable replacement
    debugVariableReplacement(templateText, data, 'Debug endpoint');
    
    // Perform the variable replacement
    const processedText = replaceVariables(templateText, data);
    
    // Check for any remaining variables
    const remainingVariables = processedText.match(/\{\{([^}]+)\}\}/g) || [];
    
    return res.status(200).json({
      success: true,
      originalText: templateText,
      processedText: processedText,
      totalVariables: variables.length,
      replacedVariables: variables.length - remainingVariables.length,
      unreplacedVariables: remainingVariables,
      dataKeys: Object.keys(data),
      formDataKeys: Object.keys(data.formData || {})
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    addApiLog(`Error in variable replacement test: ${errorMessage}`, 'error', 'emails');
    return res.status(500).json({ error: errorMessage });
  }
}