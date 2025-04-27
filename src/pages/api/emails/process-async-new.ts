import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { addApiLog } from '@/pages/api/debug/logs';
import { sendEmail } from '@/util/email-sender';
import { replaceVariables } from '@/util/email-template-helpers';

// Import our new email processing utilities
import {
  ProcessEmailAsyncParams,
  ProcessEmailResult,
  fetchTemplateById,
  processCcEmailsWithTemplate,
  processBccEmailsWithTemplate,
  processFormData
} from '@/util/email-processing';

/**
 * Extract variables from the parameters for legacy support
 */
function extractVariables(params: ProcessEmailAsyncParams) {
  // Return normalized variables from the params
  const {
    templateId,
    submissionId,
    data = {},
    leadId = null,
    userId = '',
    recipient,
    ccEmails,
    bccEmails,
    ruleId = null
  } = params;

  return {
    templateId,
    submissionId,
    data,
    leadId,
    userId,
    recipient,
    ccEmails,
    bccEmails,
    ruleId
  };
}

/**
 * Process an email synchronously directly from the API
 * This used to be async via background jobs but now processes emails directly
 * Enhanced to properly handle Form System 2.0 CC/BCC emails
 */
export async function processEmailAsync(
  paramOrTemplateId: ProcessEmailAsyncParams | string,
  submissionId?: string,
  formData?: Record<string, any>,
  leadId?: string,
  userId?: string,
  recipientEmail?: string,
  ccEmails?: string,
  bccEmails?: string
): Promise<ProcessEmailResult> {
  console.log(`[PROCESSING] Email delay functionality has been removed`);
  addApiLog('Email delay functionality has been removed', 'info', 'emails');
  
  try {
    // Support both object-based and positional parameters for backward compatibility
    let processTemplateId: string;
    let processSubmissionId: string;
    let formDataFromParams: Record<string, any> = {};
    let processLeadId: string | null = null;
    let processUserId: string = '';
    let processRecipientEmail: string;
    let processCcEmails: string | undefined;
    let processBccEmails: string | undefined;
    let processRuleId: string | null = null;

    if (typeof paramOrTemplateId === 'object') {
      // If the first param is an object, extract variables from it
      const vars = extractVariables(paramOrTemplateId);
      processTemplateId = vars.templateId;
      processSubmissionId = vars.submissionId;
      formDataFromParams = vars.data || {};
      processLeadId = vars.leadId || null;
      processUserId = vars.userId || '';
      processRecipientEmail = vars.recipient;
      processCcEmails = vars.ccEmails;
      processBccEmails = vars.bccEmails;
      processRuleId = vars.ruleId || null;
    } else {
      // Use positional parameters
      processTemplateId = paramOrTemplateId;
      processSubmissionId = submissionId || '';
      formDataFromParams = formData || {};
      processLeadId = leadId || null;
      processUserId = userId || '';
      processRecipientEmail = recipientEmail || '';
      processCcEmails = ccEmails;
      processBccEmails = bccEmails;
    }

    // Validate required parameters
    if (!processTemplateId) {
      addApiLog('Missing templateId in processEmailAsync', 'error', 'emails');
      throw new Error('Missing templateId');
    }

    if (!processSubmissionId) {
      addApiLog('Missing submissionId in processEmailAsync', 'error', 'emails');
      throw new Error('Missing submissionId');
    }

    if (!processRecipientEmail) {
      addApiLog('Missing recipient email in processEmailAsync', 'error', 'emails');
      throw new Error('Missing recipient email');
    }

    addApiLog(`Processing email for template: ${processTemplateId}, submission: ${processSubmissionId}, recipient: ${processRecipientEmail}`, 'info', 'emails');
    
    try {
      // Find the template
      const template = await fetchTemplateById(processTemplateId);
      
      if (!template) {
        throw new Error(`Template not found: ${processTemplateId}`);
      }
      
      // Ensure template has the required properties
      if (!template.subject || !template.htmlContent) {
        throw new Error(`Template ${processTemplateId} is missing required content`);
      }
      
      // Fetch the submission to get additional data
      const submission = await prisma.formSubmission.findUnique({
        where: { id: processSubmissionId },
        include: { lead: true }
      });
      
      if (!submission) {
        throw new Error(`Submission not found: ${processSubmissionId}`);
      }
      
      // Process the form data for variable replacement
      const processedData: Record<string, any> = {
        ...processFormData(submission),
        userId: processUserId,
        leadId: submission.leadId || processLeadId,
        // Add any additional data from the original request
        ...formDataFromParams
      };
      
      // Log the data structure for debugging
      addApiLog(`Data structure for variable replacement: ${JSON.stringify({
        keys: Object.keys(processedData)
      })}`, 'info', 'emails');
      
      // Check if template contains bookingLink variable
      if (template.htmlContent.includes('{{bookingLink}}')) {
        // Provide a placeholder instead of generating an actual booking link
        processedData['bookingLink'] = '[Booking Link Generation Disabled in Emails]';
        addApiLog(`Template contains bookingLink variable but generation is disabled`, 'info', 'emails');
      }
      
      // Find all variables in the template for better logging
      const templateVariables = [
        ...(template.subject?.match(/\{\{([^}]+)\}\}/g) || []),
        ...(template.htmlContent?.match(/\{\{([^}]+)\}\}/g) || [])
      ];
      
      if (templateVariables.length > 0) {
        addApiLog(`Template contains these variables: ${templateVariables.join(', ')}`, 'info', 'emails');
      }
      
      addApiLog('=== EMAIL DEBUG START ===', 'info', 'emails');
      addApiLog(`Processed data: ${JSON.stringify(processedData)}`, 'info', 'emails');
      addApiLog(`Template subject before: ${template.subject}`, 'info', 'emails');
      addApiLog(`Template HTML before: ${template.htmlContent}`, 'info', 'emails');

      const processedSubject = replaceVariables(template.subject, processedData);
      const processedHtml = replaceVariables(template.htmlContent, processedData);

      addApiLog(`Processed subject after: ${processedSubject}`, 'info', 'emails');
      addApiLog(`Processed HTML after: ${processedHtml}`, 'info', 'emails');

      const subjectVariables = template.subject.match(/\{\{([^}]+)\}\}/g) || [];
      const bodyVariables = template.htmlContent.match(/\{\{([^}]+)\}\}/g) || [];

      if (subjectVariables.length > 0) {
        addApiLog(`Processed ${subjectVariables.length} variables in async subject: ${subjectVariables.join(', ')}`, 'info', 'emails');
      }

      if (bodyVariables.length > 0) {
        addApiLog(`Processed ${bodyVariables.length} variables in async body: ${bodyVariables.join(', ')}`, 'info', 'emails');
      }

      addApiLog(`Sending email to: ${processRecipientEmail}`, 'info', 'emails');
      addApiLog(`Email subject: ${processedSubject}`, 'info', 'emails');
      addApiLog(`Email HTML: ${processedHtml}`, 'info', 'emails');

      // Process CC/BCC emails - this is the key improvement for Form System 2.0
      // It will fetch CC/BCC from the template if not provided in the parameters
      const finalCcEmails = await processCcEmailsWithTemplate(template.id, processCcEmails);
      const finalBccEmails = await processBccEmailsWithTemplate(template.id, processBccEmails);
      
      // Add detailed logging for CC/BCC recipients
      addApiLog(`CC Recipients: ${finalCcEmails || 'None'}`, 'info', 'emails');
      addApiLog(`BCC Recipients: ${finalBccEmails || 'None'}`, 'info', 'emails');
      console.log('[Forms2] Email CC Recipients:', finalCcEmails);
      console.log('[Forms2] Email BCC Recipients:', finalBccEmails);
      
      // Log the full email configuration
      const emailConfig = {
        to: processRecipientEmail,
        subject: processedSubject,
        userId: processUserId,
        templateId: template.id,
        formSubmissionId: submission.id,
        cc: finalCcEmails,
        bcc: finalBccEmails
      };
      addApiLog(`Full email configuration: ${JSON.stringify(emailConfig)}`, 'info', 'emails');
      console.log('[Forms2] Full email configuration:', emailConfig);

      const emailResult = await sendEmail({
        to: processRecipientEmail,
        subject: processedSubject,
        html: processedHtml,
        userId: processUserId,
        templateId: template.id,
        formSubmissionId: submission.id,
        cc: finalCcEmails,
        bcc: finalBccEmails
      });
      addApiLog(`Send email result: ${JSON.stringify(emailResult)}`, 'info', 'emails');
      addApiLog('=== EMAIL DEBUG END ===', 'info', 'emails');
      
      if (!emailResult.success) {
        throw new Error(emailResult.error || 'Unknown error sending email');
      }
      
      addApiLog(`Email sent successfully to ${processRecipientEmail}`, 'success', 'emails');
      
      return { 
        success: true, 
        message: 'Email sent successfully'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addApiLog(`Error sending email: ${errorMessage}`, 'error', 'emails');
      throw error;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    addApiLog(`Error in async email processing: ${errorMessage}`, 'error', 'emails');
    console.error('Error in async email processing:', error);
    return {
      success: false,
      message: `Error in async email processing: ${errorMessage}`,
      error: errorMessage
    };
  }
}

/**
 * API handler for async email processing
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      templateId,
      submissionId,
      data,
      leadId,
      userId,
      recipient,
      ccEmails,
      bccEmails,
      ruleId
    } = req.body;

    // Validate required fields
    if (!templateId) {
      return res.status(400).json({ error: 'Missing templateId' });
    }

    if (!submissionId) {
      return res.status(400).json({ error: 'Missing submissionId' });
    }

    if (!recipient) {
      return res.status(400).json({ error: 'Missing recipient' });
    }

    const result = await processEmailAsync({
      templateId,
      submissionId,
      data,
      leadId,
      userId,
      recipient,
      ccEmails,
      bccEmails,
      ruleId
    });

    if (result.success) {
      return res.status(200).json({ success: true, message: result.message });
    } else {
      return res.status(500).json({ success: false, error: result.error || 'Unknown error' });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in process-async API:', error);
    return res.status(500).json({ error: errorMessage });
  }
}
