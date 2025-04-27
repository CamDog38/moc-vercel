import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { evaluateConditions } from '@/util/email-rules';
import { createClient } from '@/util/supabase/api';
import { addApiLog } from '../debug/logs';

// Helper functions to match those in process-submission.ts
function getTemplate(rule: any) {
  return rule.template || rule.emailTemplate || null;
}

function getRecipientType(rule: any): string | null {
  return rule.recipientType || null;
}

function getRecipientEmail(rule: any): string | null {
  return rule.recipientEmail || null;
}

function getRecipientField(rule: any): string | null {
  return rule.recipientField || null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    addApiLog('Method not allowed in process-email-rule', 'error', 'emails');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    addApiLog('Starting email rule test process', 'info', 'emails');
    // Check authentication
    const supabase = createClient(req, res);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      addApiLog('Unauthorized access attempt to process-email-rule', 'error', 'emails');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { ruleId, formData } = req.body;

    if (!ruleId) {
      addApiLog('Missing email rule ID in request', 'error', 'emails');
      return res.status(400).json({ error: 'Email rule ID is required' });
    }

    if (!formData || typeof formData !== 'object') {
      addApiLog('Invalid form data provided to process-email-rule', 'error', 'emails');
      return res.status(400).json({ error: 'Form data must be provided as an object' });
    }

    addApiLog(`Testing rule ID: ${ruleId} with form data: ${JSON.stringify(formData)}`, 'info', 'emails');

    // Fetch the email rule
    const emailRule = await prisma.emailRule.findUnique({
      where: {
        id: ruleId,
      },
      include: {
        template: true,
        form: true,
      },
    });

    if (!emailRule) {
      addApiLog(`Email rule not found with ID: ${ruleId}`, 'error', 'emails');
      return res.status(404).json({ error: 'Email rule not found' });
    }

    // Check if the user has access to this rule
    if (emailRule.form && emailRule.form.userId !== user.id) {
      addApiLog(`Permission denied: User ${user.id} attempted to access rule owned by ${emailRule.form.userId}`, 'error', 'emails');
      return res.status(403).json({ error: 'You do not have permission to access this email rule' });
    }

    addApiLog(`Found rule: ${emailRule.name} with conditions: ${JSON.stringify(emailRule.conditions)}`, 'info', 'emails');

    // Evaluate the conditions
    try {
      const evaluationResult = evaluateConditions(emailRule.conditions, formData, {
        logging: true,
        logFn: (message, level) => addApiLog(message, level === 'error' ? 'error' : level === 'info' ? 'info' : 'success', 'emails'),
        ruleId: emailRule.id
      });
      
      const conditionsMet = evaluationResult.matches;
      
      addApiLog(`Conditions evaluation result: ${conditionsMet ? 'PASSED' : 'FAILED'}`, 'info', 'emails');
      
      // Log detailed results if conditions were not met
      if (!conditionsMet && evaluationResult.details) {
        evaluationResult.details.forEach(detail => {
          if (!detail.result) {
            addApiLog(`Condition failed: ${detail.field} ${detail.operator} ${detail.expectedValue} - ${detail.reason}`, 'info', 'emails');
          }
        });
      }

      // Get the template variables
      const template = getTemplate(emailRule);
      if (!template) {
        addApiLog('Email template not found for this rule', 'error', 'emails');
        return res.status(404).json({ error: 'Email template not found for this rule' });
      }

      // Extract recipient email based on rule configuration
      let recipientEmail = '';
      
      if (getRecipientType(emailRule) === 'custom' || getRecipientType(emailRule) === 'STATIC') {
        recipientEmail = getRecipientEmail(emailRule) || '';
        addApiLog(`Using static/custom recipient email: ${recipientEmail}`, 'info', 'emails');
      } else if (getRecipientType(emailRule) === 'field' || getRecipientType(emailRule) === 'FIELD') {
        const fieldName = getRecipientField(emailRule) || '';
        recipientEmail = formData[fieldName] || '';
        addApiLog(`Using field recipient from field "${fieldName}": ${recipientEmail}`, 'info', 'emails');
      } else {
        // If no recipient is specified, try to use a default email field from the form data
        addApiLog('No recipient type specified, looking for default email field', 'info', 'emails');
        
        // Look for common email field names
        const commonEmailFields = ['email', 'Email', 'emailAddress', 'EmailAddress', 'email_address'];
        for (const fieldName of commonEmailFields) {
          if (formData[fieldName]) {
            recipientEmail = formData[fieldName];
            addApiLog(`Found default email field ${fieldName}: ${recipientEmail}`, 'info', 'emails');
            break;
          }
        }
      }

      // Check if we have a valid recipient
      if (!recipientEmail) {
        addApiLog('Could not determine recipient email', 'error', 'emails');
        return res.status(400).json({ 
          success: false,
          error: 'Could not determine recipient email',
          details: {
            recipientType: getRecipientType(emailRule),
            recipientField: getRecipientField(emailRule),
            recipientEmail: getRecipientEmail(emailRule),
            formData: formData,
          }
        });
      }

      // Determine if the email would be sent
      const emailWouldBeSent = conditionsMet && !!recipientEmail;

      addApiLog(`Test complete. Email would ${emailWouldBeSent ? 'be sent' : 'not be sent'}`, 'info', 'emails');

      // Return the test results
      return res.status(200).json({
        success: true,
        emailWouldBeSent,
        details: {
          ruleName: emailRule.name,
          formId: emailRule.formId,
          templateId: emailRule.templateId,
          templateName: template.name,
          conditionsMet,
          conditions: emailRule.conditions,
          recipientEmail,
          recipientType: getRecipientType(emailRule),
          recipientField: getRecipientField(emailRule),
          evaluationDetails: evaluationResult.details || []
        }
      });
    } catch (conditionError) {
      addApiLog(`Error evaluating conditions: ${conditionError instanceof Error ? conditionError.message : 'Unknown error'}`, 'error', 'emails');
      return res.status(500).json({
        success: false,
        error: 'Failed to evaluate conditions',
        message: conditionError instanceof Error ? conditionError.message : 'Unknown error',
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    addApiLog(`Error testing email rule: ${errorMessage}`, 'error', 'emails');
    return res.status(500).json({
      success: false,
      error: 'Failed to test email rule',
      message: errorMessage,
    });
  }
}