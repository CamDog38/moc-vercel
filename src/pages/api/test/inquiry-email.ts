import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import sgMail from '@sendgrid/mail';
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

function getCcEmails(rule: any): string | null {
  const template = getTemplate(rule);
  return template?.ccEmails || rule.ccEmails || null;
}

function getBccEmails(rule: any): string | null {
  const template = getTemplate(rule);
  return template?.bccEmails || rule.bccEmails || null;
}

// Initialize SendGrid with API key
const apiKey = process.env.SENDGRID_API_KEY || '';
if (apiKey) {
  sgMail.setApiKey(apiKey);
  addApiLog('SendGrid API key configured', 'info', 'emails');
} else {
  addApiLog('SendGrid API key not found in environment variables', 'error', 'emails');
}

// Function to replace variables in templates
function replaceNestedVariables(text: string, data: Record<string, any>): string {
  if (!text) return '';
  
  // Replace nested variables in the form {{field.subfield}}
  return text.replace(/\{\{([^}]+)\}\}/g, function(match: string, variableName: string): string {
    variableName = variableName.trim();
    // Check if this is a nested variable
    if (variableName.includes('.')) {
      const parts = variableName.split('.');
      let value = data;
      
      // Navigate through the object hierarchy
      for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
          value = value[part];
        } else {
          // If any part of the path doesn't exist, return empty string
          return '';
        }
      }
      
      // Convert the final value to string
      return String(value || '');
    } else {
      // Handle simple variables
      return String(data[variableName] || '');
    }
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  addApiLog('Inquiry Email Test API called', 'info', 'emails');
  
  // Check authentication
  const supabase = createClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    addApiLog('Authentication failed: No user found', 'error', 'emails');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  addApiLog(`Authenticated user: ${user.id}`, 'info', 'emails');

  // Only allow POST requests
  if (req.method !== 'POST') {
    addApiLog(`Method not allowed: ${req.method}`, 'error', 'emails');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { formId, email } = req.body;
    
    if (!formId) {
      addApiLog('Missing form ID in request', 'error', 'emails');
      return res.status(400).json({ error: 'Form ID is required' });
    }
    
    if (!email) {
      addApiLog('Missing email address in request', 'error', 'emails');
      return res.status(400).json({ error: 'Email address is required' });
    }
    
    // Get form details
    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        formSections: {
          include: {
            fields: true
          }
        }
      }
    });
    
    if (!form) {
      addApiLog(`Form not found with ID: ${formId}`, 'error', 'emails');
      return res.status(404).json({ error: 'Form not found' });
    }
    
    addApiLog(`Testing inquiry email for form: ${form.name} (${form.id})`, 'info', 'emails');
    
    // Create a test submission with sample data
    const testData = {
      email: email,
      name: 'Test User',
      phone: '123-456-7890',
      message: 'This is a test inquiry submission',
      id: 'test-submission-' + Date.now(),
      formId: form.id,
      userId: user.id,
      companyName: 'Your Company',
      currentYear: new Date().getFullYear().toString()
    };
    
    // Find all active rules for this form
    const rules = await prisma.emailRule.findMany({
      where: {
        formId: form.id,
        active: true,
      },
      include: {
        template: true,
      },
    });
    
    addApiLog(`Found ${rules.length} email rules for form ${form.id}`, 'info', 'emails');
    
    if (rules.length === 0) {
      return res.status(200).json({ 
        message: 'No email rules found for this form',
        success: false,
        form: {
          id: form.id,
          name: form.name,
          type: form.type
        }
      });
    }
    
    // Process each rule
    const results = await Promise.all(
      rules.map(async (rule) => {
        try {
          addApiLog(`Processing rule: ${rule.name} (${rule.id})`, 'info', 'emails');
          
          // For test purposes, we'll consider all conditions matched
          addApiLog('Test mode: Bypassing condition evaluation', 'info', 'emails');
          
          // Determine recipient email
          let recipientEmail = email; // Default to the provided test email
          
          if (getRecipientType(rule) === 'custom' || getRecipientType(rule) === 'STATIC') {
            // Use the custom recipient from the rule if available
            const customEmail = getRecipientEmail(rule);
            if (customEmail) {
              recipientEmail = customEmail;
              addApiLog(`Using custom recipient email from rule: ${recipientEmail}`, 'info', 'emails');
            }
          }
          
          // Get the template
          const template = getTemplate(rule);
          if (!template) {
            addApiLog(`No template found for rule: ${rule.name}`, 'error', 'emails');
            return {
              ruleId: rule.id,
              ruleName: rule.name,
              success: false,
              error: 'No template found'
            };
          }
          
          // Process template with variables
          const htmlContent = replaceNestedVariables(template.htmlContent, testData);
          const subject = replaceNestedVariables(template.subject, testData);
            
          // Get sender email from environment
          const from = process.env.SENDGRID_FROM_EMAIL || '';
          if (!from) {
            addApiLog('No sender email configured in SENDGRID_FROM_EMAIL', 'error', 'emails');
            return {
              ruleId: rule.id,
              ruleName: rule.name,
              success: false,
              error: 'No sender email configured in SENDGRID_FROM_EMAIL environment variable'
            };
          }
          
          addApiLog(`Preparing email from ${from} to ${recipientEmail}`, 'info', 'emails');
          addApiLog(`Subject: ${subject}`, 'info', 'emails');
          
          // Get CC and BCC emails
          const ccEmails = getCcEmails(rule);
          const bccEmails = getBccEmails(rule);
          
          if (ccEmails) {
            addApiLog(`Including CC: ${ccEmails}`, 'info', 'emails');
          }
          
          if (bccEmails) {
            addApiLog(`Including BCC: ${bccEmails}`, 'info', 'emails');
          }
          
          // Send the email
          const msg = {
            to: recipientEmail,
            from,
            subject,
            html: htmlContent,
            cc: ccEmails || undefined,
            bcc: bccEmails || undefined
          };
          
          await sgMail.send(msg);
          addApiLog('Email sent successfully', 'success', 'emails');
          
          // Log the email sending
          await prisma.emailLog.create({
            data: {
              templateId: template.id,
              recipient: recipientEmail,
              subject,
              userId: user.id,
              status: 'test',
              ccRecipients: ccEmails,
              bccRecipients: bccEmails,
              formSubmissionId: null,
            },
          });
          
          return {
            ruleId: rule.id,
            ruleName: rule.name,
            success: true,
            emailDetails: {
              to: recipientEmail,
              from,
              subject,
              cc: ccEmails || undefined,
              bcc: bccEmails || undefined,
              htmlPreview: htmlContent.substring(0, 200) + '...'
            }
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          addApiLog(`Error processing rule ${rule.id}: ${errorMessage}`, 'error', 'emails');
          return {
            ruleId: rule.id,
            ruleName: rule.name,
            success: false,
            error: errorMessage,
          };
        }
      })
    );
    
    // Check if any rules matched and would send emails
    const anyRuleMatched = results.some(r => r.success);
    
    addApiLog(`Test completed. Success: ${anyRuleMatched}`, 'info', 'emails');
    
    return res.status(200).json({
      success: anyRuleMatched,
      message: anyRuleMatched 
        ? 'Test emails sent successfully' 
        : 'Failed to send test emails',
      results,
      form: {
        id: form.id,
        name: form.name,
        type: form.type
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    addApiLog(`Error processing test inquiry email: ${errorMessage}`, 'error', 'emails');
    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
}
