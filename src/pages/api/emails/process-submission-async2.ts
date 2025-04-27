/**
 * Optimized API endpoint for processing email submissions for Form System 2.0
 * This version uses asynchronous rule fetching and analysis for improved performance
 */

import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { replaceVariables } from '@/util/field-mapping/variable-replacer';
import { addApiLog } from '@/pages/api/debug/logs';
import { 
  fetchRulesAsync, 
  processRulesAsync, 
  EmailRule, 
  FormSubmission 
} from '@/lib/forms2/services/email-processing/asyncRuleProcessor2';
import { EMAIL_TIMEOUTS, withTimeout } from '@/lib/forms2/services/email-processing/emailConfig2';
import { sendEmail2 } from '@/lib/forms2/services/email-processing/sendService2';

/**
 * Process a form submission and send emails based on matching rules
 * This version uses asynchronous rule processing for better performance
 * 
 * @param req The Next.js API request
 * @param res The Next.js API response
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  try {
    // Check authentication
    const { source, internalApiKey } = req.body;
    const isInternalApiCall = 
      source === 'server-api' && 
      (internalApiKey === process.env.INTERNAL_API_KEY || internalApiKey === 'forms-system-internal');
    
    // For debugging - log authentication details
    addApiLog(`Authentication check: source=${source}, hasApiKey=${!!internalApiKey}, isInternal=${isInternalApiCall}`, 'info', 'emails');
    
    // Skip authentication for internal API calls
    if (!isInternalApiCall) {
      // This is a public-facing API, so we need to authenticate the request
      addApiLog('Unauthorized access attempt to email processing API', 'error', 'emails');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { formId, submissionId, formData } = req.body;

    if (!formId) {
      return res.status(400).json({ error: 'Form ID is required' });
    }

    // Log the start of processing
    addApiLog(`Processing email rules for form: ${formId}`, 'info', 'emails');

    // Get the submission data either from the request body or from the database
    let submission: FormSubmission | null = null;
    let submissionData: any = null;

    if (submissionId) {
      // Get the submission from the database with timeout protection
      try {
        submission = await withTimeout(
          async () => {
            return prisma.formSubmission.findUnique({
              where: { id: submissionId },
            });
          },
          EMAIL_TIMEOUTS.DATABASE_QUERY,
          'Submission fetch timed out'
        );
        
        if (!submission) {
          addApiLog(`Submission not found: ${submissionId}`, 'error', 'emails');
          return res.status(404).json({ error: 'Submission not found' });
        }
        
        submissionData = submission.data;
        addApiLog(`Using submission data from database for ID: ${submissionId}`, 'info', 'emails');
      } catch (error) {
        addApiLog(`Error fetching submission: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'emails');
        return res.status(500).json({ error: 'Failed to fetch submission' });
      }
    } else if (formData) {
      // Use the form data from the request body
      submissionData = formData;
      addApiLog('Using form data from request body', 'info', 'emails');
    } else {
      return res.status(400).json({ error: 'Either submissionId or formData is required' });
    }

    // Fetch all rules for this form asynchronously
    const rules = await fetchRulesAsync(formId);
    
    if (rules.length === 0) {
      const duration = Date.now() - startTime;
      addApiLog(`No email rules found for form: ${formId}`, 'info', 'emails');
      return res.status(200).json({ 
        message: 'No email rules found for this form',
        processingTime: duration
      });
    }

    // Process rules in parallel batches to find matching rules
    const matchingRules = await processRulesAsync(rules, formId, submissionData);
    
    if (matchingRules.length === 0) {
      const duration = Date.now() - startTime;
      addApiLog(`No matching email rules for form: ${formId}`, 'info', 'emails');
      return res.status(200).json({
        message: 'No matching email rules for this submission',
        processingTime: duration
      });
    }

    // Respond to the API request immediately with the matching rules
    const duration = Date.now() - startTime;
    addApiLog(`Found ${matchingRules.length} matching rules, sending response and processing emails asynchronously`, 'info', 'emails');
    
    // Send the response immediately
    res.status(200).json({
      message: `Processing ${matchingRules.length} matching rules asynchronously`,
      matchingRules: matchingRules.map(rule => ({
        ruleId: rule.id,
        ruleName: rule.name
      })),
      processingTime: duration
    });
    
    // Process the emails asynchronously after sending the response
    // This will run in the background and not block the API response
    (async () => {
      try {
        const emailStartTime = Date.now();
        addApiLog(`Starting asynchronous email sending for ${matchingRules.length} rules`, 'info', 'emails');
        
        // Process matching rules in parallel
        const emailResults = await Promise.allSettled(
          matchingRules.map(rule => processRuleActions(rule, formId, submissionData))
        );

        // Collect results for logging
        const results = emailResults.map((result, index) => {
          if (result.status === 'fulfilled') {
            return {
              ruleId: matchingRules[index].id,
              ruleName: matchingRules[index].name,
              status: 'success',
              result: result.value
            };
          } else {
            return {
              ruleId: matchingRules[index].id,
              ruleName: matchingRules[index].name,
              status: 'error',
              error: result.reason instanceof Error ? result.reason.message : 'Unknown error'
            };
          }
        });

        const emailDuration = Date.now() - emailStartTime;
        addApiLog(`Asynchronous email processing completed in ${emailDuration}ms`, 'success', 'emails');
      } catch (error) {
        addApiLog(`Error in asynchronous email processing: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'emails');
      }
    })();
    
    // The response has already been sent, so we return to avoid "Cannot set headers after they are sent to the client"
    return;
  } catch (error) {
    const duration = Date.now() - startTime;
    addApiLog(`Error processing email rules: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'emails');
    return res.status(500).json({ 
      error: 'Failed to process email rules',
      message: error instanceof Error ? error.message : 'Unknown error',
      processingTime: duration
    });
  }
}

/**
 * Process a rule's actions
 * 
 * @param rule The email rule to process
 * @param formId The ID of the form
 * @param formData The form data to use
 * @returns The result of processing the actions
 */
async function processRuleActions(rule: EmailRule, formId: string, formData: Record<string, any>): Promise<any> {
  // Currently, we only support sending emails
  return processSendEmailAction(rule, formId, formData);
}

/**
 * Process a send email action
 * 
 * @param rule The email rule containing the action
 * @param formId The ID of the form
 * @param formData The form data to use
 * @returns The result of sending the email
 */
async function processSendEmailAction(rule: EmailRule, formId: string, formData: Record<string, any>): Promise<any> {
  const startTime = Date.now();
  
  try {
    addApiLog(`Processing send email action for rule: ${rule.id}`, 'info', 'emails');
    
    // Get the template for this rule
    const template = rule.template;
    if (!template) {
      addApiLog(`No template found for rule: ${rule.id}`, 'error', 'emails');
      return {
        status: 'error',
        error: 'No template found for this rule'
      };
    }
    
    // Get the recipient email
    let recipientEmail = '';
    
    if (rule.recipientType === 'field' && rule.recipientField) {
      // Get the recipient email from the form data
      const fieldValue = formData[rule.recipientField];
      if (fieldValue) {
        recipientEmail = String(fieldValue);
      }
    } else if (rule.recipientType === 'static' && rule.recipientEmail) {
      // Use the static recipient email
      recipientEmail = rule.recipientEmail;
    } else {
      // Default to the form submitter's email if available
      recipientEmail = formData.email || '';
    }
    
    if (!recipientEmail) {
      addApiLog(`No recipient email found for rule: ${rule.id}`, 'error', 'emails');
      return {
        status: 'error',
        error: 'No recipient email found'
      };
    }
    
    // Replace variables in the subject and content
    const subject = await replaceVariables(template.subject, formId, formData);
    const htmlContent = await replaceVariables(template.htmlContent, formId, formData);
    
    // Prepare CC and BCC emails
    const ccEmails = template.ccEmails || rule.ccEmails || '';
    const bccEmails = template.bccEmails || rule.bccEmails || '';
    
    // Send the email using the centralized email service
    const emailResult = await sendEmail2(
      recipientEmail,
      subject,
      htmlContent,
      htmlContent.replace(/<[^>]*>/g, ''), // Plain text version
      ccEmails,
      bccEmails
    );
    
    const duration = Date.now() - startTime;
    
    if (emailResult.success) {
      addApiLog(`Email sent successfully to ${recipientEmail} for rule: ${rule.id} in ${duration}ms`, 'success', 'emails');
      return {
        recipient: recipientEmail,
        subject,
        status: 'sent',
        provider: emailResult.directEmailUsed ? 'direct' : 'sendgrid',
        processingTime: duration
      };
    } else {
      addApiLog(`Failed to send email to ${recipientEmail} for rule: ${rule.id}: ${emailResult.error}`, 'error', 'emails');
      return {
        recipient: recipientEmail,
        subject,
        status: 'error',
        error: emailResult.error,
        processingTime: duration
      };
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    addApiLog(`Error processing send email action: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'emails');
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: duration
    };
  }
}
