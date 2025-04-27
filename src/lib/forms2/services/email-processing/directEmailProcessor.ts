/**
 * Direct Email Processing Utility
 * 
 * This utility provides a way to process email rules directly without making internal API calls,
 * which is more reliable in serverless environments like Vercel.
 */

import prisma from '@/lib/prisma';
import { addApiLog } from '@/pages/api/debug/logs';
import { replaceVariables } from '@/util/field-mapping/variable-replacer';
import { sendEmail2 } from './sendService2';
import { initializeDirectEmailService } from './directEmailService';
import { 
  fetchRulesAsync, 
  processRulesAsync, 
  EmailRule
} from './asyncRuleProcessor2';

// Pre-connect to SMTP server to speed up email sending
// This is especially important in serverless environments like Vercel
// where cold starts can add significant delay
let smtpInitialized = false;

// Initialize SMTP connection in the background
function initializeSmtpConnection() {
  if (smtpInitialized) return;
  
  console.log('[DIRECT EMAIL] Pre-connecting to SMTP server...');
  initializeDirectEmailService()
    .then(success => {
      smtpInitialized = success;
      console.log(`[DIRECT EMAIL] SMTP pre-connection ${success ? 'successful' : 'failed'}`);
    })
    .catch(error => {
      console.error('[DIRECT EMAIL] SMTP pre-connection error:', error);
    });
}

// Trigger SMTP pre-connection immediately
initializeSmtpConnection();

/**
 * Process email rules for a form submission directly
 * 
 * @param formId The ID of the form
 * @param formData The form data
 * @param submissionId Optional submission ID
 * @returns Results of email processing
 */
export async function processEmailRulesDirect(
  formId: string,
  formData: Record<string, any>,
  submissionId?: string
): Promise<{
  success: boolean;
  message: string;
  matchingRules?: Array<{id: string, name: string}>;
  emailResults?: Array<any>;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    addApiLog(`[DIRECT] Processing email rules for form: ${formId}`, 'info', 'emails');
    console.log(`[DIRECT EMAIL] Processing email rules for form: ${formId}`);
    
    // Fetch all email rules for this form
    const rules = await fetchRulesAsync(formId);
    
    if (rules.length === 0) {
      addApiLog(`[DIRECT] No email rules found for form: ${formId}`, 'info', 'emails');
      console.log(`[DIRECT EMAIL] No email rules found for form: ${formId}`);
      return {
        success: true,
        message: 'No email rules found for this form'
      };
    }
    
    // Process rules to find matching ones
    const matchingRules = await processRulesAsync(rules, formId, formData);
    
    if (matchingRules.length === 0) {
      addApiLog(`[DIRECT] No matching email rules for form: ${formId}`, 'info', 'emails');
      console.log(`[DIRECT EMAIL] No matching email rules for form: ${formId}`);
      return {
        success: true,
        message: 'No matching email rules for this submission'
      };
    }
    
    addApiLog(`[DIRECT] Found ${matchingRules.length} matching rules, processing emails`, 'info', 'emails');
    console.log(`[DIRECT EMAIL] Found ${matchingRules.length} matching rules, processing emails`);
    
    // Process matching rules in parallel
    const emailPromises = matchingRules.map(rule => processRuleActionsDirect(rule, formId, formData));
    const emailResults = await Promise.allSettled(emailPromises);
    
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
    
    // Log email processing results
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    
    const duration = Date.now() - startTime;
    addApiLog(`[DIRECT] Email processing completed in ${duration}ms: ${successCount} sent, ${errorCount} failed`, 'success', 'emails');
    console.log(`[DIRECT EMAIL] Email processing completed in ${duration}ms: ${successCount} sent, ${errorCount} failed`);
    
    // If we have a submission ID, update the email log
    if (submissionId) {
      try {
        await prisma.emailLog.create({
          data: {
            formSubmissionId: submissionId,
            status: errorCount > 0 ? 'partial' : 'success',
            templateId: 'direct-processing', // Required field
            recipient: 'system',             // Required field
            subject: `Email processing for submission ${submissionId}`,
            userId: '00000000-0000-0000-0000-000000000000' // Required field
          }
        });
        addApiLog(`[DIRECT] Created email log for submission: ${submissionId}`, 'success', 'emails');
      } catch (logError) {
        addApiLog(`[DIRECT] Error creating email log: ${logError instanceof Error ? logError.message : 'Unknown error'}`, 'error', 'emails');
      }
    }
    
    return {
      success: true,
      message: `Processed ${matchingRules.length} rules, sent ${successCount} emails, ${errorCount} failed`,
      matchingRules: matchingRules.map(rule => ({ id: rule.id, name: rule.name })),
      emailResults: results
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    addApiLog(`[DIRECT] Error processing email rules: ${errorMessage}`, 'error', 'emails');
    console.error('[DIRECT EMAIL] Error processing email rules:', error);
    
    return {
      success: false,
      message: 'Failed to process email rules',
      error: errorMessage
    };
  }
}

/**
 * Process a rule's actions directly
 * 
 * @param rule The email rule to process
 * @param formId The ID of the form
 * @param formData The form data to use
 * @returns The result of processing the actions
 */
async function processRuleActionsDirect(rule: EmailRule, formId: string, formData: Record<string, any>): Promise<any> {
  // Currently, we only support sending emails
  return processSendEmailActionDirect(rule, formId, formData);
}

/**
 * Process a send email action directly
 * 
 * @param rule The email rule containing the action
 * @param formId The ID of the form
 * @param formData The form data to use
 * @returns The result of sending the email
 */
async function processSendEmailActionDirect(rule: EmailRule, formId: string, formData: Record<string, any>): Promise<any> {
  const startTime = Date.now();
  
  try {
    addApiLog(`[DIRECT] Processing send email action for rule: ${rule.id}`, 'info', 'emails');
    
    // Get the template for this rule
    const template = rule.template;
    if (!template) {
      addApiLog(`[DIRECT] No template found for rule: ${rule.id}`, 'error', 'emails');
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
      addApiLog(`[DIRECT] No recipient email found for rule: ${rule.id}`, 'error', 'emails');
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
      addApiLog(`[DIRECT] Email sent successfully to ${recipientEmail} for rule: ${rule.id} in ${duration}ms`, 'success', 'emails');
      return {
        recipient: recipientEmail,
        subject,
        status: 'sent',
        provider: emailResult.directEmailUsed ? 'direct' : 'sendgrid',
        processingTime: duration
      };
    } else {
      addApiLog(`[DIRECT] Failed to send email to ${recipientEmail} for rule: ${rule.id}: ${emailResult.error}`, 'error', 'emails');
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
    addApiLog(`[DIRECT] Error processing send email action: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'emails');
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: duration
    };
  }
}
