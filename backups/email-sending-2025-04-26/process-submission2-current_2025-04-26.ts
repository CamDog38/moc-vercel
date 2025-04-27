/**
 * API endpoint for processing email submissions for Form System 2.0
 * This handles the sending of emails based on form submissions and email rules
 */

import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { mapFieldIds, findFieldValueByStableId, replaceVariables } from '@/util/field-id-mapper2';
import { addApiLog } from '@/pages/api/debug/logs';
import sgMail from '@sendgrid/mail';

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  addApiLog('SendGrid API key is set', 'info', 'emails');
} else {
  addApiLog('SENDGRID_API_KEY is not set. Emails will not be sent via SendGrid.', 'warn', 'emails');
}

// Import nodemailer for SMTP fallback
import nodemailer from 'nodemailer';

// Create SMTP transporter if configured
let smtpTransporter: any = null;
if (process.env.DIRECT_EMAIL_HOST && process.env.DIRECT_EMAIL_PORT) {
  try {
    smtpTransporter = nodemailer.createTransport({
      host: process.env.DIRECT_EMAIL_HOST,
      port: parseInt(process.env.DIRECT_EMAIL_PORT),
      secure: process.env.DIRECT_EMAIL_SECURE === 'true',
      auth: process.env.DIRECT_EMAIL_USER && process.env.DIRECT_EMAIL_PASS ? {
        user: process.env.DIRECT_EMAIL_USER,
        pass: process.env.DIRECT_EMAIL_PASS
      } : undefined
    });
    addApiLog(`SMTP transport initialized with host: ${process.env.DIRECT_EMAIL_HOST}`, 'info', 'emails');
  } catch (error) {
    addApiLog(`Failed to initialize SMTP transport: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'emails');
  }
}

// Define types for better type safety
type EmailRule = {
  id: string;
  name: string;
  formId: string;
  conditions: any;
  recipientEmail?: string;
  recipientField?: string;
  recipientType?: string;
  ccEmails?: string;
  bccEmails?: string;
  template?: {
    id: string;
    name: string;
    subject: string;
    htmlContent: string;
    ccEmails?: string | null;
    bccEmails?: string | null;
  } | null;
};

type FormSubmission = {
  id: string;
  formId: string;
  data: any;
  createdAt: Date;
};

/**
 * Process a form submission and send emails based on matching rules
 * @param req The Next.js API request
 * @param res The Next.js API response
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

    // We now accept all forms that are routed to this endpoint
    // The form system detection happens in the submission service
    addApiLog(`Processing form with ID: ${formId}`, 'info', 'emails');

    // Log the start of processing
    addApiLog(`Processing email rules for Form System 2.0 form: ${formId}`, 'info', 'emails');

    // Get the submission data either from the request body or from the database
    let submission: FormSubmission | null = null;
    let submissionData: any = null;

    if (submissionId) {
      // Get the submission from the database
      submission = await prisma.formSubmission.findUnique({
        where: { id: submissionId },
        select: {
          id: true,
          formId: true,
          data: true,
          createdAt: true
        }
      });

      if (!submission) {
        return res.status(404).json({ error: `Submission with ID ${submissionId} not found` });
      }

      submissionData = submission.data;
    } else if (formData) {
      // Use the form data provided in the request
      submissionData = formData;
    } else {
      return res.status(400).json({ error: 'Either submissionId or formData is required' });
    }

    // Map the field IDs to stable identifiers
    const mappedData = await mapFieldIds(formId, submissionData);

    // Get all email rules for this form
    const emailRules = await prisma.emailRule.findMany({
      where: { formId },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            subject: true,
            htmlContent: true,
            ccEmails: true,
            bccEmails: true
          }
        }
      }
    });

    if (emailRules.length === 0) {
      addApiLog(`No email rules found for form: ${formId}`, 'info', 'emails');
      return res.status(200).json({ message: 'No email rules found for this form' });
    }

    addApiLog(`Found ${emailRules.length} email rules for form: ${formId}`, 'info', 'emails');

    // Debug log the structure of the first rule to understand the conditions format
    if (emailRules.length > 0) {
      const firstRule = emailRules[0];
      addApiLog(`Debug - First rule structure: ${JSON.stringify(firstRule, null, 2)}`, 'info', 'emails');
      addApiLog(`Debug - Conditions type: ${typeof firstRule.conditions}`, 'info', 'emails');
      
      if (typeof firstRule.conditions === 'string') {
        try {
          // Try to parse if it's a JSON string
          const parsedConditions = JSON.parse(firstRule.conditions);
          addApiLog(`Debug - Parsed conditions: ${JSON.stringify(parsedConditions, null, 2)}`, 'info', 'emails');
        } catch (e) {
          addApiLog(`Debug - Could not parse conditions as JSON: ${firstRule.conditions}`, 'error', 'emails');
        }
      }
    }

    // Process each rule
    const emailPromises = emailRules.map(async (rule) => {
      try {
        // Parse conditions if they are stored as a JSON string
        let parsedConditions = rule.conditions;
        if (typeof rule.conditions === 'string') {
          try {
            parsedConditions = JSON.parse(rule.conditions);
            addApiLog(`Parsed conditions for rule ${rule.id}: ${JSON.stringify(parsedConditions)}`, 'info', 'emails');
          } catch (e) {
            addApiLog(`Error parsing conditions for rule ${rule.id}: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error', 'emails');
          }
        }
        
        // Create a rule object with the necessary fields
        const emailRule: EmailRule = {
          id: rule.id,
          name: rule.name,
          formId: formId,
          conditions: parsedConditions,
          recipientEmail: rule.recipientEmail || undefined,
          recipientField: rule.recipientField || undefined,
          recipientType: rule.recipientType || undefined,
          template: rule.template
        };
        
        // Check if the rule conditions match
        const conditionsMatch = await checkRuleConditions(emailRule, formId, mappedData);

        if (!conditionsMatch) {
          addApiLog(`Rule ${emailRule.id} conditions do not match`, 'info', 'emails');
          return null;
        }

        addApiLog(`Rule ${emailRule.id} conditions match, processing actions`, 'info', 'emails');

        // Process the rule actions
        return await processRuleActions(emailRule, formId, mappedData);
      } catch (error) {
        addApiLog(`Error processing rule ${rule.id}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'emails');
        return null;
      }
    });

    // Wait for all rules to be processed
    const results = await Promise.all(emailPromises);
    const sentEmails = results.filter(Boolean);

    addApiLog(`Processed ${emailRules.length} rules, sent ${sentEmails.length} emails`, 'info', 'emails');

    return res.status(200).json({
      message: `Processed ${emailRules.length} rules, sent ${sentEmails.length} emails`,
      sentEmails
    });
  } catch (error) {
    addApiLog(`Error processing email rules: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'emails');
    console.error('Error processing email rules:', error);
    return res.status(500).json({ error: `Error processing email rules: ${error instanceof Error ? error.message : 'Unknown error'}` });
  }
}

/**
 * Check if a rule's conditions match the form data
 * @param rule The email rule to check
 * @param formId The ID of the form
 * @param formData The form data to check against
 * @returns True if the conditions match, false otherwise
 */
async function checkRuleConditions(rule: EmailRule, formId: string, formData: Record<string, any>): Promise<boolean> {
  try {
    // If there are no conditions, the rule always matches
    if (!rule.conditions || Object.keys(rule.conditions).length === 0) {
      addApiLog(`Rule ${rule.id} has no conditions, automatically matches`, 'info', 'emails');
      return true;
    }

    const conditions = rule.conditions;
    addApiLog(`Processing conditions for rule ${rule.id}: ${JSON.stringify(conditions)}`, 'info', 'emails');

    // Handle array of conditions directly (common structure in the database)
    if (Array.isArray(conditions)) {
      addApiLog(`Rule ${rule.id} has an array of ${conditions.length} conditions`, 'info', 'emails');
      // If we have an array of conditions, treat them as AND conditions by default
      for (const condition of conditions) {
        const matches = await checkSingleCondition(condition, formId, formData);
        if (!matches) {
          addApiLog(`Rule ${rule.id}: Condition failed, breaking AND chain`, 'info', 'emails');
          return false;
        }
      }
      addApiLog(`Rule ${rule.id}: All conditions in array matched`, 'info', 'emails');
      return true;
    }
    
    // Handle object with operator and conditions array
    if (conditions.operator && Array.isArray(conditions.conditions)) {
      addApiLog(`Rule ${rule.id} has a complex condition with operator: ${conditions.operator}`, 'info', 'emails');
      
      // Check if all conditions match (AND)
      if (conditions.operator === 'and') {
        // All conditions must match
        for (const condition of conditions.conditions) {
          const matches = await checkSingleCondition(condition, formId, formData);
          if (!matches) {
            addApiLog(`Rule ${rule.id}: Condition failed in AND group`, 'info', 'emails');
            return false;
          }
        }
        addApiLog(`Rule ${rule.id}: All conditions in AND group matched`, 'info', 'emails');
        return true;
      } 
      // Check if any condition matches (OR)
      else if (conditions.operator === 'or') {
        // At least one condition must match
        for (const condition of conditions.conditions) {
          const matches = await checkSingleCondition(condition, formId, formData);
          if (matches) {
            addApiLog(`Rule ${rule.id}: Condition matched in OR group`, 'info', 'emails');
            return true;
          }
        }
        addApiLog(`Rule ${rule.id}: No conditions in OR group matched`, 'info', 'emails');
        return false;
      }
    }
    
    // Handle single condition object (no operator/conditions properties)
    if (!conditions.operator && !conditions.conditions) {
      addApiLog(`Rule ${rule.id} has a single condition object`, 'info', 'emails');
      return await checkSingleCondition(conditions, formId, formData);
    }
    
    addApiLog(`Rule ${rule.id} has an unsupported condition structure`, 'error', 'emails');
    return false;
  } catch (error) {
    addApiLog(`Error checking rule conditions: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'emails');
    return false;
  }
}

/**
 * Check if a single condition matches the form data
 * @param condition The condition to check
 * @param formId The ID of the form
 * @param formData The form data to check against
 * @returns True if the condition matches, false otherwise
 */
async function checkSingleCondition(condition: any, formId: string, formData: Record<string, any>): Promise<boolean> {
  try {
    // Extract all condition properties for better debugging
    const { field, operator, value, fieldId, fieldStableId, fieldLabel } = condition;
    
    addApiLog(`Checking condition: field=${field}, operator=${operator}, value=${value}`, 'info', 'emails');
    addApiLog(`Additional field info: fieldId=${fieldId}, fieldStableId=${fieldStableId}, fieldLabel=${fieldLabel}`, 'info', 'emails');

    if (!field || !operator) {
      addApiLog(`Missing field or operator in condition`, 'error', 'emails');
      return false;
    }

    // Try different field identifiers in order of preference
    let fieldValue;
    
    // 1. First try using the stable ID if available
    if (fieldStableId) {
      fieldValue = await findFieldValueByStableId(formId, fieldStableId, formData);
      addApiLog(`Tried fieldStableId ${fieldStableId}, got value: ${fieldValue !== undefined ? fieldValue : 'undefined'}`, 'info', 'emails');
    }
    
    // 2. If no value found and we have a fieldId, try that
    if (fieldValue === undefined && fieldId) {
      fieldValue = formData[fieldId];
      addApiLog(`Tried fieldId ${fieldId}, got value: ${fieldValue !== undefined ? fieldValue : 'undefined'}`, 'info', 'emails');
    }
    
    // 3. Try the main field identifier (which should be the stable ID after our updates)
    if (fieldValue === undefined) {
      fieldValue = await findFieldValueByStableId(formId, field, formData);
      addApiLog(`Tried field ${field}, got value: ${fieldValue !== undefined ? fieldValue : 'undefined'}`, 'info', 'emails');
    }
    
    // 4. Try direct access using the field as a key
    if (fieldValue === undefined) {
      fieldValue = formData[field];
      addApiLog(`Tried direct access with field ${field}, got value: ${fieldValue !== undefined ? fieldValue : 'undefined'}`, 'info', 'emails');
    }
    
    // 5. If we have a label, try matching by label
    if (fieldValue === undefined && fieldLabel) {
      // Look for a key in formData that might match the label
      const possibleKeys = Object.keys(formData).filter(key => {
        // Check if the key contains the label or vice versa
        const normalizedKey = key.toLowerCase();
        const normalizedLabel = fieldLabel.toLowerCase();
        return normalizedKey.includes(normalizedLabel) || normalizedLabel.includes(normalizedKey);
      });
      
      if (possibleKeys.length > 0) {
        fieldValue = formData[possibleKeys[0]];
        addApiLog(`Tried matching by label ${fieldLabel}, found key ${possibleKeys[0]}, got value: ${fieldValue !== undefined ? fieldValue : 'undefined'}`, 'info', 'emails');
      }
    }

    // If the field doesn't exist after all attempts, the condition doesn't match
    if (fieldValue === undefined) {
      addApiLog(`No value found for field after all attempts`, 'error', 'emails');
      return false;
    }

    // Log the comparison we're about to make
    addApiLog(`Comparing field value: ${fieldValue} ${operator} ${value}`, 'info', 'emails');

    // Check the condition based on the operator
    let result = false;
    switch (operator) {
      case 'equals':
        result = fieldValue === value;
        break;
      case 'notEquals':
        result = fieldValue !== value;
        break;
      case 'contains':
        result = typeof fieldValue === 'string' && fieldValue.includes(value);
        break;
      case 'notContains':
        result = typeof fieldValue === 'string' && !fieldValue.includes(value);
        break;
      case 'startsWith':
        result = typeof fieldValue === 'string' && fieldValue.startsWith(value);
        break;
      case 'endsWith':
        result = typeof fieldValue === 'string' && fieldValue.endsWith(value);
        break;
      case 'greaterThan':
        result = Number(fieldValue) > Number(value);
        break;
      case 'lessThan':
        result = Number(fieldValue) < Number(value);
        break;
      case 'isEmpty':
        result = fieldValue === '' || fieldValue === null || fieldValue === undefined;
        break;
      case 'isNotEmpty':
        result = fieldValue !== '' && fieldValue !== null && fieldValue !== undefined;
        break;
      default:
        result = false;
    }
    
    addApiLog(`Condition result: ${result ? 'MATCH' : 'NO MATCH'}`, 'info', 'emails');
    return result;
  } catch (error) {
    addApiLog(`Error checking single condition: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'emails');
    return false;
  }
}

/**
 * Process a rule's actions
 * @param rule The email rule to process
 * @param formId The ID of the form
 * @param formData The form data to use
 * @returns The result of processing the actions
 */
async function processRuleActions(rule: EmailRule, formId: string, formData: Record<string, any>): Promise<any> {
  try {
    // Always process as send email action since that's the primary purpose
    return await processSendEmailAction(rule, formId, formData);
  } catch (error) {
    addApiLog(`Error processing rule actions: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'emails');
    return null;
  }
}

/**
 * Process a send email action
 * @param rule The email rule containing the action
 * @param formId The ID of the form
 * @param formData The form data to use
 * @returns The result of sending the email
 */
async function processSendEmailAction(rule: EmailRule, formId: string, formData: Record<string, any>): Promise<any> {
  const startTime = Date.now();
  try {
    // Get the email template
    const template = rule.template;

    if (!template) {
      addApiLog(`No template found for rule: ${rule.id}`, 'error', 'emails');
      return null;
    }
    
    // Log the template data for debugging
    addApiLog(`Template data for rule ${rule.id}: ${JSON.stringify({
      id: template.id,
      name: template.name,
      ccEmails: template.ccEmails,
      bccEmails: template.bccEmails
    })}`, 'info', 'emails');

    // Get the recipient email
    let recipientEmail = '';

    if (rule.recipientType === 'formField') {
      // Get the email from a form field
      const emailField = rule.recipientField || 'email';
      recipientEmail = await findFieldValueByStableId(formId, emailField, formData);

      if (!recipientEmail) {
        addApiLog(`No recipient email found in form data for field: ${emailField}`, 'error', 'emails');
        return null;
      }
    } else if (rule.recipientType === 'custom') {
      // Use a custom email address
      recipientEmail = rule.recipientEmail || '';

      if (!recipientEmail) {
        addApiLog(`No custom recipient email provided in rule: ${rule.id}`, 'error', 'emails');
        return null;
      }
    } else {
      // Default to using the email field from form data
      recipientEmail = formData.email || '';
      
      if (!recipientEmail) {
        addApiLog(`No recipient email found in form data and no recipient type specified in rule: ${rule.id}`, 'error', 'emails');
        return null;
      }
    }

    // Replace variables in the subject and body
    const subject = await replaceVariables(template.subject, formId, formData);
    const htmlContent = await replaceVariables(template.htmlContent || '', formId, formData);

    // Prepare the email
    const msg: any = {
      to: recipientEmail,
      from: process.env.DEFAULT_FROM_EMAIL || 'noreply@example.com',
      subject,
      html: htmlContent,
      text: htmlContent.replace(/<[^>]*>/g, '') // Strip HTML for text version
    };
    
    // Check for CC recipients in template first, then fall back to rule
    let ccEmails = '';
    
    // First check if the template has CC emails
    if (template.ccEmails) {
      addApiLog(`Found CC emails in template: ${template.ccEmails}`, 'info', 'emails');
      ccEmails = template.ccEmails;
    }
    // If no CC emails in template, check the rule
    else if (rule.ccEmails) {
      addApiLog(`Found CC emails in rule: ${rule.ccEmails}`, 'info', 'emails');
      ccEmails = rule.ccEmails;
    }
    else {
      addApiLog('No CC emails specified in template or rule', 'info', 'emails');
    }
    
    // Process CC emails if found
    if (ccEmails) {
      const ccList = ccEmails.split(',').map((email: string) => email.trim()).filter((email: string) => email);
      if (ccList.length > 0) {
        addApiLog(`Adding CC recipients: ${ccList.join(', ')}`, 'info', 'emails');
        msg.cc = ccList;
      }
    }
    
    // Check for BCC recipients in template first, then fall back to rule
    let bccEmails = '';
    
    // First check if the template has BCC emails
    if (template.bccEmails) {
      addApiLog(`Found BCC emails in template: ${template.bccEmails}`, 'info', 'emails');
      bccEmails = template.bccEmails;
    }
    // If no BCC emails in template, check the rule
    else if (rule.bccEmails) {
      addApiLog(`Found BCC emails in rule: ${rule.bccEmails}`, 'info', 'emails');
      bccEmails = rule.bccEmails;
    }
    else {
      addApiLog('No BCC emails specified in template or rule', 'info', 'emails');
    }
    
    // Process BCC emails if found
    if (bccEmails) {
      const bccList = bccEmails.split(',').map((email: string) => email.trim()).filter((email: string) => email);
      if (bccList.length > 0) {
        addApiLog(`Adding BCC recipients: ${bccList.join(', ')}`, 'info', 'emails');
        msg.bcc = bccList;
      }
    }

    // Send the email
    // Try SendGrid first, then fall back to SMTP if available
    let sendgridError = null;
    let smtpError = null;
    
    // Add detailed logging for debugging
    addApiLog(`Attempting to send email to ${recipientEmail} with subject: ${subject}`, 'info', 'emails');
    addApiLog(`From address: ${process.env.DEFAULT_FROM_EMAIL || 'noreply@example.com'}`, 'info', 'emails');
    
    // Try SendGrid if API key is available
    if (process.env.SENDGRID_API_KEY) {
      try {
        // Verify the from email is properly formatted
        const fromEmail = process.env.SENDGRID_FROM_EMAIL || process.env.DEFAULT_FROM_EMAIL || 'noreply@example.com';
        
        // Make sure we have a valid sender format
        const sender = fromEmail.includes('<') ? fromEmail : `MOC Forms <${fromEmail}>`;
        
        // Update the message with the properly formatted sender
        msg.from = sender;
        
        addApiLog(`Sending via SendGrid with from address: ${sender}`, 'info', 'emails');
        const sendgridStartTime = Date.now();
        const response = await sgMail.send(msg);
        const sendgridEndTime = Date.now();
        const sendgridDuration = sendgridEndTime - sendgridStartTime;
        addApiLog(`Email sent via SendGrid to ${recipientEmail} for rule: ${rule.id} in ${sendgridDuration}ms`, 'success', 'emails');
        const totalDuration = Date.now() - startTime;
        return {
          ruleId: rule.id,
          recipient: recipientEmail,
          subject,
          status: 'sent',
          provider: 'sendgrid',
          response: response[0].statusCode,
          processingTime: totalDuration,
          sendTime: sendgridDuration
        };
      } catch (error) {
        sendgridError = error;
        addApiLog(`SendGrid error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'emails');
        // Continue to SMTP fallback
      }
    }
    
    // Try SMTP if SendGrid failed or is not configured
    if (smtpTransporter) {
      try {
        addApiLog(`Falling back to SMTP for email to ${recipientEmail}`, 'info', 'emails');
        const smtpStartTime = Date.now();
        // Prepare SMTP mail options with the same CC/BCC as SendGrid
        const mailOptions: any = {
          from: process.env.DIRECT_EMAIL_FROM || process.env.DEFAULT_FROM_EMAIL || 'noreply@example.com',
          to: recipientEmail,
          subject,
          html: htmlContent,
          text: htmlContent.replace(/<[^>]*>/g, '') // Strip HTML for text version
        };
        
        // Add CC and BCC if they exist in the original message
        if (msg.cc) {
          mailOptions.cc = msg.cc;
        }
        
        if (msg.bcc) {
          mailOptions.bcc = msg.bcc;
        }
        
        const smtpResponse = await smtpTransporter.sendMail(mailOptions);
        const smtpEndTime = Date.now();
        const smtpDuration = smtpEndTime - smtpStartTime;
        
        addApiLog(`Email sent via SMTP to ${recipientEmail} for rule: ${rule.id} in ${smtpDuration}ms`, 'success', 'emails');
        const totalDuration = Date.now() - startTime;
        return {
          ruleId: rule.id,
          recipient: recipientEmail,
          subject,
          status: 'sent',
          provider: 'smtp',
          response: smtpResponse.messageId,
          processingTime: totalDuration,
          sendTime: smtpDuration
        };
      } catch (error) {
        smtpError = error;
        addApiLog(`SMTP error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'emails');
      }
    }
    
    // If we get here, both SendGrid and SMTP failed or weren't configured
    if (sendgridError) {
      const totalDuration = Date.now() - startTime;
      return {
        ruleId: rule.id,
        recipient: recipientEmail,
        subject,
        status: 'error',
        error: sendgridError instanceof Error ? sendgridError.message : 'Unknown SendGrid error',
        smtpError: smtpError instanceof Error ? smtpError.message : 'SMTP not configured or failed',
        processingTime: totalDuration
      };
    } else {
      addApiLog(`No email providers configured for rule: ${rule.id}`, 'error', 'emails');
      const totalDuration = Date.now() - startTime;
      return {
        ruleId: rule.id,
        recipient: recipientEmail,
        subject,
        status: 'not_sent',
        reason: 'No email providers configured',
        processingTime: totalDuration
      };
    }
  } catch (error) {
    addApiLog(`Error processing send email action: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'emails');
    const totalDuration = Date.now() - startTime;
    return {
      ruleId: rule.id,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: totalDuration
    };
  }
}

/**
 * Helper function to get the template for a rule
 * @param rule The email rule
 * @returns The template for the rule, or null if not found
 */
function getTemplate(rule: EmailRule): EmailRule['template'] {
  return rule.template || null;
}
