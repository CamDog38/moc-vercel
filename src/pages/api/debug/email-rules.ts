import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import sgMail from '@sendgrid/mail';
import { Prisma, EmailRule as PrismaEmailRule } from '@prisma/client';
import { mapFieldIds } from '@/util/field-id-mapper';
import { addApiLog } from './logs';

type FormField = {
  id: string;
  type: string;
  mapping: string | null;
};

type FormSection = {
  fields: FormField[];
};

type Form = {
  id: string;
  name: string;
  sections: FormSection[];
};

type EmailTemplateType = {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
};

type EmailRule = PrismaEmailRule & {
  template?: EmailTemplateType;
  form?: Form;
};

type EmailProcessingResult = {
  ruleId: string;
  ruleName: string;
  success: boolean;
  error?: string;
  recipient?: string;
  subject?: string;
};

// Initialize SendGrid with API key
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Initialize result variable
  let result: any = {
    success: false,
    message: '',
    evaluations: [],
    fields: {}
  };

  // Check authentication
  const supabase = createClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get form ID from query parameters
    const { formId, processEmails } = req.query;
    
    if (!formId) {
      return res.status(400).json({ error: 'Form ID is required' });
    }

    // First get the form with its sections and fields
    const formData = await prisma.form.findUnique({
      where: { id: String(formId) },
      include: {
        formSections: {
          include: {
            fields: {
              select: {
                id: true,
                type: true,
                mapping: true
              }
            }
          }
        }
      }
    });

    if (!formData) {
      return res.status(404).json({ error: 'Form not found' });
    }

    // Transform the form data into our expected structure
    const form: Form = {
      id: formData.id,
      name: formData.name,
      sections: formData.formSections.map(section => ({
        fields: section.fields
      }))
    };

    // Get all active rules for this form with their templates
    const rules = await prisma.emailRule.findMany({
      where: {
        formId: String(formId),
        active: true,
        userId: user.id,
      },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            subject: true,
            htmlContent: true
          }
        },
      },
    });

    // Combine rules with form data
    const rulesWithForm = rules.map(rule => ({
      ...rule,
      form,
      template: rule.template
    })) as EmailRule[];

    // Get a sample submission for this form
    const sampleSubmission = await prisma.formSubmission.findFirst({
      where: {
        formId: String(formId),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Process emails if requested and we have a sample submission
    const emailProcessingResults: EmailProcessingResult[] = [];
    if (processEmails === 'true' && sampleSubmission) {
      const results = await processEmailRules(rulesWithForm, sampleSubmission, user.id);
      emailProcessingResults.push(...results);
    }

    // Get email logs for this form submission
    const emailLogs = await prisma.emailLog.findMany({
      where: {
        formSubmissionId: sampleSubmission?.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        template: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const submissionData = sampleSubmission?.data as Record<string, unknown> || {};
    
    // Apply field ID mapping to the sample submission data
    let mappedSubmissionData = submissionData;
    if (sampleSubmission) {
      try {
        mappedSubmissionData = await mapFieldIds(String(formId), submissionData);
        addApiLog(`Applied field ID mapping to sample submission data`, 'info', 'other');
      } catch (error) {
        addApiLog(`Error applying field ID mapping: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'other');
      }
    }

    const mockEvaluation = rulesWithForm.map((rule) => {
      const evaluation = evaluateConditions(rule.conditions, mappedSubmissionData);
      
      addApiLog(`Evaluated rule ID ${rule.id}: ${evaluation ? 'MATCH' : 'NO MATCH'}`, 'info', 'other');

      // Find fields referenced in conditions
      if (rule.conditions && Array.isArray(rule.conditions)) {
        rule.conditions.forEach((condition: any) => {
          if (condition.fieldId) {
            // Try to find the field in mappedSubmissionData first
            if (mappedSubmissionData && typeof mappedSubmissionData[condition.fieldId] !== 'undefined') {
              result.fields[condition.fieldId] = {
                value: mappedSubmissionData[condition.fieldId],
                source: 'mapped'
              };
              addApiLog(`Found field ${condition.fieldId} in mapped data: ${JSON.stringify(mappedSubmissionData[condition.fieldId])}`, 'info', 'other');
            }
            // Then try to find in original data
            else if (submissionData && typeof submissionData[condition.fieldId] !== 'undefined') {
              result.fields[condition.fieldId] = {
                value: submissionData[condition.fieldId],
                source: 'original'
              };
              addApiLog(`Found field ${condition.fieldId} in original data: ${JSON.stringify(submissionData[condition.fieldId])}`, 'info', 'other');
            }
            // Field not found in either dataset
            else {
              result.fields[condition.fieldId] = {
                value: null,
                source: 'not_found'
              };
              addApiLog(`Field ${condition.fieldId} not found in form data`, 'error', 'other');
            }
          }
        });
      }

      return {
        ruleId: rule.id,
        name: rule.name,
        match: evaluation,
        conditions: rule.conditions
      };
    });

    return res.status(200).json({
      rules: rulesWithForm,
      sampleSubmission,
      emailLogs,
      emailProcessingResults: processEmails === 'true' ? emailProcessingResults : [],
      testConditions: mockEvaluation,
      result,
    });
  } catch (error) {
    console.error('Error debugging email rules:', error);
    return res.status(500).json({ error: 'Failed to debug email rules' });
  }
}

// Helper function to process email rules
async function processEmailRules(rules: EmailRule[], submission: any, userId: string) {
  const results: EmailProcessingResult[] = [];
  
  for (const rule of rules) {
    try {
      // Parse the conditions
      const conditions = JSON.parse(String(rule.conditions));
      
      // Check if the form data matches the conditions
      const matches = evaluateConditions(conditions, submission.data);
      
      if (matches) {
        // Check if we have a template
        if (!rule.template) {
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            success: false,
            error: 'Email template not found',
          });
          continue;
        }

        // Send the email using the template
        const htmlContent = replaceVariables(rule.template.htmlContent, submission.data);
        const subject = replaceVariables(rule.template.subject, submission.data);
        
        // Determine recipient email based on rule configuration
        let emailValue = '';
        
        // Check rule recipient configuration
        if (rule.recipientType === 'custom' && rule.recipientEmail) {
          // Use custom email address from rule
          emailValue = rule.recipientEmail;
          if (process.env.NODE_ENV !== 'production') {
            console.log(`Using custom recipient email from rule: ${emailValue}`);
          }
        } else if (rule.recipientType === 'field' && rule.recipientField) {
          // Use email from specified form field
          emailValue = submission.data[rule.recipientField] as string;
          if (process.env.NODE_ENV !== 'production') {
            console.log(`Using recipient from form field '${rule.recipientField}': ${emailValue}`);
          }
        } else {
          // Default: use submitter's email from form data
          const formFields = rule.form?.sections?.flatMap(section => section.fields) || [];
          const emailField = formFields.find(field => 
            field.type === 'email' || 
            field.mapping === 'email'
          );

          // Look for email in form data by:
          // 1. Field mapping
          // 2. Field ID (if we found a matching email field)
          // 3. Any field containing "email" in its key
          emailValue = emailField 
            ? submission.data[emailField.id] as string
            : Object.entries(submission.data).find(([key, value]) => 
                key === 'email' || 
                key.toLowerCase().includes('email')
              )?.[1] as string;
          
          if (process.env.NODE_ENV !== 'production') {
            console.log(`Using form submitter's email: ${emailValue}`);
          }
        }
        
        const hasRecipientEmail = typeof emailValue === 'string' && emailValue.length > 0;
        
        if (!hasRecipientEmail) {
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            success: false,
            error: 'No recipient email found in form data',
          });
          continue;
        }
        
        if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            success: false,
            error: 'SendGrid API key or from email not configured',
          });
          continue;
        }
        
        // Send the email
        const msg = {
          to: emailValue,
          from: process.env.SENDGRID_FROM_EMAIL,
          subject,
          html: htmlContent,
        };
        
        try {
          await sgMail.send(msg);
          
          // Log the email sending
          await prisma.emailLog.create({
            data: {
              templateId: rule.templateId,
              recipient: emailValue,
              subject,
              userId,
              status: 'sent',
              formSubmissionId: submission.id,
            },
          });
          
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            success: true,
            recipient: emailValue,
            subject,
          });
        } catch (error) {
          console.error(`Error sending email for rule ${rule.id}:`, error);
          
          // Log the failed email attempt
          await prisma.emailLog.create({
            data: {
              templateId: rule.templateId,
              recipient: emailValue,
              subject,
              userId,
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error',
              formSubmissionId: submission.id,
            },
          });
          
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      } else {
        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          success: false,
          error: 'Conditions not met',
        });
      }
    } catch (error) {
      console.error(`Error processing rule ${rule.id}:`, error);
      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  
  return results;
}

// Helper function to evaluate conditions
function evaluateConditions(conditions: any, formData: any): boolean {
  // If there are no conditions, return true
  if (!conditions || !Array.isArray(conditions) || conditions.length === 0) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('No conditions to evaluate, returning true');
    }
    return true;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('Evaluating conditions:', JSON.stringify(conditions));
  }
  if (process.env.NODE_ENV !== 'production') {
    console.log('Form data:', JSON.stringify(formData));
  }

  // Check each condition
  for (const condition of conditions) {
    if (!condition || typeof condition !== 'object') {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Invalid condition format, skipping');
      }
      continue;
    }
    
    const { field, operator, value } = condition;
    
    if (!field || !operator) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Missing field or operator in condition');
      }
      return false;
    }
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Checking condition: field=${field}, operator=${operator}, expected value=${value}`);
    }
    
    // Skip if the field doesn't exist in the form data
    if (!(field in formData)) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Field "${field}" not found in form data`);
      }
      return false;
    }
    
    const fieldValue = formData[field];
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Actual field value: ${fieldValue}`);
    }
    
    let conditionMet = false;
    
    // Evaluate based on the operator
    switch (operator) {
      case 'equals':
        conditionMet = String(fieldValue) === String(value);
        break;
      case 'notEquals':
        conditionMet = String(fieldValue) !== String(value);
        break;
      case 'contains':
        conditionMet = String(fieldValue || '').includes(String(value));
        break;
      case 'notContains':
        conditionMet = !String(fieldValue || '').includes(String(value));
        break;
      case 'startsWith':
        conditionMet = String(fieldValue || '').startsWith(String(value));
        break;
      case 'endsWith':
        conditionMet = String(fieldValue || '').endsWith(String(value));
        break;
      case 'greaterThan':
        conditionMet = Number(fieldValue) > Number(value);
        break;
      case 'lessThan':
        conditionMet = Number(fieldValue) < Number(value);
        break;
      default:
        conditionMet = false;
    }
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Condition result: ${conditionMet ? 'PASSED' : 'FAILED'}`);
    }
    
    if (!conditionMet) {
      return false;
    }
  }
  
  // All conditions passed
  if (process.env.NODE_ENV !== 'production') {
    console.log('All conditions passed!');
  }
  return true;
}

// Helper function to replace variables in a template
function replaceVariables(template: string, data: any): string {
  let result = template;
  
  // Replace each variable
  Object.entries(data).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, String(value));
  });
  
  return result;
}