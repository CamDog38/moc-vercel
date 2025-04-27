import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import sgMail from '@sendgrid/mail';
import { evaluateConditions } from '@/util/email-rules';
import { createClient } from '@/util/supabase/api';

// Initialize SendGrid with API key
const apiKey = process.env.SENDGRID_API_KEY || '';
if (apiKey) {
  sgMail.setApiKey(apiKey);
  if (process.env.NODE_ENV !== 'production') {
    console.log('SendGrid API key configured');
  }
} else {
  if (process.env.NODE_ENV !== 'production') {
    console.log('SendGrid API key not found in environment variables');
  }
}

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
  // Enable CORS for this debugging endpoint
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const debugLog: any[] = [];
  const logStep = (step: string, data?: any) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      step,
      ...(data && { data })
    };
    debugLog.push(logEntry);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`DEBUG [${logEntry.timestamp}] ${step}`, data || '');
    }
  };

  try {
    const { id } = req.query;
    const formData = req.body;

    logStep('Request received', { 
      formId: id, 
      formDataKeys: Object.keys(formData),
      completeFormData: JSON.stringify(formData, null, 2)  // Add complete form data logging
    });

    // Fetch the form to ensure it exists and is active
    const form = await prisma.form.findFirst({
      where: {
        id: String(id),
        isActive: true,
      },
      include: {
        formSections: {
          include: {
            fields: true
          }
        }
      }
    });

    if (!form) {
      logStep('Form not found or inactive', { formId: id });
      return res.status(404).json({ 
        error: 'Form not found or inactive',
        debugLog 
      });
    }

    logStep('Form found', { 
      formId: form.id, 
      formName: form.name, 
      formType: form.type,
      sectionsCount: form.formSections?.length || 0
    });

    // Extract field mappings from form configuration
    const mappedData: Record<string, string | null> = {
      email: null,
      name: null,
      phone: null,
      date: null,
      time: null,
      location: null,
      location_office: null,
      datetime: null,
    };

    // Function to process fields and extract mapped values
    const processFields = (fields: any[]) => {
      fields.forEach((field) => {
        if (field.mapping && formData[field.id] !== undefined) {
          logStep(`Mapping field ${field.id}`, { 
            fieldId: field.id, 
            mapping: field.mapping, 
            value: formData[field.id] 
          });
          mappedData[field.mapping] = formData[field.id];
        }
      });
    };

    // Process fields based on form structure
    if (form.formSections && form.formSections.length > 0) {
      logStep('Processing form sections', { 
        sectionCount: form.formSections.length,
        sectionIds: form.formSections.map(s => s.id)
      });
      
      form.formSections.forEach(section => {
        logStep(`Processing section ${section.id}`, { 
          sectionName: section.title,
          fieldsCount: section.fields?.length || 0
        });
        
        if (section.fields && section.fields.length > 0) {
          processFields(section.fields);
        }
      });
    } else if (form.sections) {
      // Legacy support
      logStep('Using legacy sections');
      const sections = form.sections as any[];
      sections.forEach(section => {
        if (Array.isArray(section.fields)) {
          processFields(section.fields);
        }
      });
    } else if (Array.isArray(form.fields)) {
      // Legacy support
      logStep('Using legacy fields');
      processFields(form.fields);
    }

    logStep('Mapped data', mappedData);
    
    // Try to extract email from form data if not found in mappings
    if (!mappedData.email) {
      logStep('Email not found in mapped data, trying to extract from form data directly');
      
      // First check for common email field names
      const commonEmailFields = ['email', 'Email', 'emailAddress', 'email_address', 'userEmail'];
      for (const fieldName of commonEmailFields) {
        if (formData[fieldName]) {
          logStep(`Found email in form data with field name: ${fieldName}`, { 
            email: formData[fieldName] 
          });
          mappedData.email = formData[fieldName];
          break;
        }
      }
      
      // If still not found, look for any field containing 'email' in its name
      if (!mappedData.email) {
        const emailField = Object.keys(formData).find(key => 
          key.toLowerCase().includes('email')
        );
        
        if (emailField) {
          logStep(`Found email field by partial match: ${emailField}`, { 
            email: formData[emailField] 
          });
          mappedData.email = formData[emailField];
        } else {
          logStep('No email field found in form data', { 
            availableFields: Object.keys(formData) 
          });
        }
      }
    }

    // Create a submission record for debugging purposes
    const submission = await prisma.formSubmission.create({
      data: {
        formId: form.id,
        data: {
          ...formData,
          _debug: true // Mark this as a debug submission
        },
      },
    });

    logStep('Created debug form submission', { submissionId: submission.id });

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

    logStep('Found email rules', { 
      count: rules.length,
      rules: rules.map(r => ({ id: r.id, name: r.name }))
    });

    if (rules.length === 0) {
      return res.status(200).json({ 
        message: 'No email rules found for this form',
        submissionId: submission.id,
        debugLog
      });
    }

    // Process each rule
    const ruleResults = await Promise.all(
      rules.map(async (rule) => {
        try {
          logStep(`Processing rule ${rule.id}`, { ruleName: rule.name });
          
          // Parse the conditions
          let conditions: any[] = [];
          try {
            const parsed = typeof rule.conditions === 'string' 
              ? JSON.parse(rule.conditions)
              : rule.conditions;
            conditions = Array.isArray(parsed) ? parsed : [parsed];
            logStep(`Rule ${rule.id} conditions`, conditions);
          } catch (parseError) {
            logStep(`Rule ${rule.id} has invalid JSON conditions`, { 
              error: (parseError as Error).message,
              rawConditions: rule.conditions
            });
            return {
              ruleId: rule.id,
              ruleName: rule.name,
              success: false,
              error: 'Invalid JSON in rule conditions'
            };
          }
          
          // Check if the form data matches the conditions
          logStep('Starting condition evaluation', {
            conditions,
            formDataKeys: Object.keys(formData),
            formDataValues: formData
          });

          console.log('DEBUG - Condition Evaluation Start:', {
            ruleId: rule.id,
            conditions: JSON.stringify(conditions, null, 2),
            formData: JSON.stringify(formData, null, 2)
          });

          // Create a combined form data object that includes both original field IDs and mapped names
          const combinedFormData = {
            ...formData,
            ...mappedData
          };

          // Log the complete combined form data for debugging
          logStep('Complete combined form data', {
            originalFormData: formData,
            mappedData,
            combinedFormData
          });

          console.log('DEBUG - Complete Form Data:', {
            ruleId: rule.id,
            originalFormData: JSON.stringify(formData, null, 2),
            mappedData: JSON.stringify(mappedData, null, 2),
            combinedFormData: JSON.stringify(combinedFormData, null, 2)
          });

          const conditionResults = evaluateConditions(
            conditions,
            combinedFormData, 
            {
              logging: true,
              logFn: (message) => {
                if (process.env.NODE_ENV !== 'production') {
                  console.log('DEBUG - Condition Evaluation:', message);
                }
                logStep(`Condition Evaluation: ${String(message)}`);
              },
              ruleId: rule.id
            }
          );
          
          console.log('DEBUG - Condition Evaluation Result:', {
            ruleId: rule.id,
            matched: conditionResults.matches,
            details: JSON.stringify(conditionResults.details, null, 2)
          });

          logStep(`Rule ${rule.id} condition evaluation complete`, { 
            matched: conditionResults.matches,
            details: conditionResults.details,
            rawConditions: conditions,
            relevantFormData: conditions.reduce((acc: any, condition: any) => {
              acc[condition.field] = formData[condition.field];
              return acc;
            }, {})
          });
          
          if (conditionResults.matches) {
            // Get recipient email from form data
            let recipientEmail = '';

            if (getRecipientType(rule) === 'custom' || getRecipientType(rule) === 'STATIC') {
              recipientEmail = getRecipientEmail(rule) || '';
              logStep(`Using static/custom recipient email: ${recipientEmail}`);
            } else if (getRecipientType(rule) === 'field' || getRecipientType(rule) === 'FIELD') {
              const fieldName = getRecipientField(rule) || '';
              recipientEmail = combinedFormData[fieldName] || '';
              logStep(`Using field recipient from field "${fieldName}": ${recipientEmail}`);
            } else {
              // If no recipient is specified, try to use a default email field from the form data
              logStep('No recipient type specified, looking for default email field');
              
              // Look for common email field names
              const commonEmailFields = ['email', 'Email', 'emailAddress', 'EmailAddress', 'email_address'];
              for (const fieldName of commonEmailFields) {
                if (combinedFormData[fieldName]) {
                  recipientEmail = combinedFormData[fieldName];
                  logStep(`Found default email field ${fieldName}: ${recipientEmail}`);
                  break;
                }
              }
              
              // If still no email found, check for any field with 'email' in its name
              if (!recipientEmail) {
                const emailField = Object.entries(combinedFormData).find(([key]) => 
                  key.toLowerCase().includes('email')
                );
                
                if (emailField) {
                  recipientEmail = emailField[1] as string;
                  logStep(`Found email field by name pattern: ${emailField[0]}: ${recipientEmail}`);
                }
              }
            }

            if (!recipientEmail) {
              return {
                ruleId: rule.id,
                ruleName: rule.name,
                success: false,
                error: 'No recipient email found in form data'
              };
            }

            // Prepare email data
            const template = getTemplate(rule);
            if (!template) {
              return {
                ruleId: rule.id,
                ruleName: rule.name,
                success: false,
                error: 'Email template not found'
              };
            }

            const { subject, htmlContent } = template;
            const from = process.env.SENDGRID_FROM_EMAIL || 'noreply@example.com';

            return {
              ruleId: rule.id,
              ruleName: rule.name,
              success: true,
              emailDetails: {
                to: recipientEmail,
                from,
                subject,
                htmlPreview: htmlContent.substring(0, 200) + '...'
              }
            };
          }
          
          return {
            ruleId: rule.id,
            ruleName: rule.name,
            success: false,
            error: 'Conditions not met',
            conditionResults: conditionResults.details
          };
        } catch (error) {
          logStep(`Error processing rule ${rule.id}`, { 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
          return {
            ruleId: rule.id,
            ruleName: rule.name,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error processing rule',
          };
        }
      })
    );
    
    // Check if any rules matched and would send emails
    const anyRuleMatched = ruleResults.some(r => r.success);
    
    logStep('Email rule processing completed', { 
      anyRuleMatched,
      rulesMatched: ruleResults.filter(r => r.success).length,
      totalRules: ruleResults.length
    });

    return res.status(200).json({
      success: anyRuleMatched,
      message: anyRuleMatched 
        ? 'Email rules matched (debug mode)' 
        : 'No rules matched the form data',
      submissionId: submission.id,
      results: ruleResults,
      mappedData,
      debugLog
    });
  } catch (error) {
    logStep('Error processing form submission', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return res.status(500).json({ 
      error: 'Failed to process form submission',
      details: error instanceof Error ? error.message : 'Unknown error',
      debugLog
    });
  }
}

// Helper function to replace variables in a template
function replaceVariables(template: string, data: any): string {
  if (!template) return '';
  
  // Replace variables in the format {{variableName}}
  return template.replace(/{{([^{}]+)}}/g, (match, key) => {
    const trimmedKey = key.trim();
    
    // Check if the key exists in the data
    if (data[trimmedKey] !== undefined) {
      return String(data[trimmedKey]);
    }
    
    // Special case for currentYear
    if (trimmedKey === 'currentYear') {
      return new Date().getFullYear().toString();
    }
    
    // Return the original placeholder if the key doesn't exist
    return match;
  });
}
