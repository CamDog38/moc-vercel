import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import { logger } from '@/util/logger';

// Helper functions for email rules (same as in submit.ts)
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
  const template = rule.template || {};
  return template.ccEmails || rule.ccEmails || null;
}

function getBccEmails(rule: any): string | null {
  const template = rule.template || {};
  return template.bccEmails || rule.bccEmails || null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Add logging as requested
  logger.info("Email recipient test API called", "emails", { method: req.method });
  logger.info("Email settings:", "emails", { 
    SENDGRID_API_KEY: !!process.env.SENDGRID_API_KEY,
    SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL
  });

  // Check authentication
  const supabase = createClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Handle GET request for rule mapping data
    if (req.method === 'GET') {
      // Get rule ID from query
      const { ruleId } = req.query;
      
      if (!ruleId) {
        return res.status(400).json({ error: 'Rule ID is required' });
      }
      
      // Fetch the rule with template
      const rule = await prisma.emailRule.findFirst({
        where: {
          id: String(ruleId),
          userId: user.id,
        },
        include: {
          template: true,
          form: {
            include: {
              formSections: {
                include: {
                  fields: true
                }
              }
            }
          }
        }
      });
      
      if (!rule) {
        return res.status(404).json({ error: 'Rule not found' });
      }
      
      // Get recipient information
      const recipientTypeRaw = getRecipientType(rule);
      const recipientTypeLower = recipientTypeRaw ? recipientTypeRaw.toLowerCase() : '';
      const recipientEmail = getRecipientEmail(rule);
      const recipientField = getRecipientField(rule);
      const ccEmails = getCcEmails(rule);
      const bccEmails = getBccEmails(rule);
      
      // Get form fields for reference
      const formFields = rule.form?.formSections?.flatMap(section => section.fields) || [];
      
      // Prepare response
      const response = {
        rule: {
          id: rule.id,
          name: rule.name,
          recipientType: recipientTypeRaw,
          recipientTypeLower,
          recipientEmail,
          recipientField,
          ccEmails,
          bccEmails,
        },
        form: {
          id: rule.form?.id,
          name: rule.form?.name,
          fields: formFields.map(field => ({
            id: field.id,
            label: field.label,
            type: field.type,
            mapping: field.mapping
          }))
        },
        template: {
          id: rule.template.id,
          name: rule.template.name,
          ccEmails: rule.template.ccEmails,
          bccEmails: rule.template.bccEmails
        },
        analysis: {
          recipientSource: recipientTypeLower === 'custom' || recipientTypeLower === 'static' 
            ? 'Custom email address' 
            : recipientTypeLower === 'field' 
              ? 'Form field' 
              : 'Form submitter email',
          recipientValue: recipientTypeLower === 'custom' || recipientTypeLower === 'static'
            ? recipientEmail
            : recipientTypeLower === 'field'
              ? `Field: ${recipientField}`
              : 'Default email field from submission',
          hasCc: !!ccEmails,
          hasBcc: !!bccEmails,
          potentialIssues: [],
          mappingIssues: [] // New field for recipient mapping issues
        }
      };
      
      // Check for potential issues
      const issues = [];
      const mappingIssues = [];
      
      if (recipientTypeLower === 'custom' || recipientTypeLower === 'static') {
        if (!recipientEmail) {
          issues.push('Custom recipient type is set but no recipient email is specified');
        } else if (!isValidEmail(recipientEmail)) {
          issues.push(`Custom recipient email "${recipientEmail}" does not appear to be a valid email address`);
        }
      }
      
      if (recipientTypeLower === 'field') {
        if (!recipientField) {
          issues.push('Field recipient type is set but no field is specified');
          mappingIssues.push({
            type: 'missing_field_selection',
            message: 'No form field has been selected as the recipient source',
            severity: 'critical'
          });
        } else {
          const targetField = formFields.find(field => field.id === recipientField);
          if (!targetField) {
            issues.push(`Specified recipient field "${recipientField}" does not exist in the form`);
            mappingIssues.push({
              type: 'field_not_found',
              message: `The selected field "${recipientField}" does not exist in the form`,
              severity: 'critical',
              fieldId: recipientField
            });
          } else {
            // Check if the field type is appropriate for email
            if (targetField.type !== 'email') {
              issues.push(`Recipient field "${targetField.label}" is not an email field (type: ${targetField.type})`);
              mappingIssues.push({
                type: 'invalid_field_type',
                message: `The selected field "${targetField.label}" is not an email field (type: ${targetField.type})`,
                severity: 'warning',
                fieldId: recipientField,
                fieldType: targetField.type,
                fieldLabel: targetField.label
              });
            }
            
            // Check if there are email fields in the form that might be better choices
            const emailFields = formFields.filter(field => field.type === 'email' && field.id !== recipientField);
            if (emailFields.length > 0 && targetField.type !== 'email') {
              mappingIssues.push({
                type: 'better_field_available',
                message: `There are ${emailFields.length} email fields in the form that might be better choices`,
                severity: 'suggestion',
                alternativeFields: emailFields.map(field => ({
                  id: field.id,
                  label: field.label
                }))
              });
            }
          }
        }
      }
      
      // Check if the form has any email fields at all
      const hasEmailFields = formFields.some(field => field.type === 'email');
      if (!hasEmailFields && recipientTypeLower === 'field') {
        issues.push('The form does not have any email fields');
        mappingIssues.push({
          type: 'no_email_fields',
          message: 'The form does not have any email fields, which may cause issues with recipient selection',
          severity: 'critical'
        });
      }
      
      // Check for fields with email mapping
      const emailMappedFields = formFields.filter(field => field.mapping === 'email');
      if (recipientTypeLower === 'field' && emailMappedFields.length > 0) {
        const isUsingMappedField = emailMappedFields.some(field => field.id === recipientField);
        if (!isUsingMappedField) {
          mappingIssues.push({
            type: 'mapped_field_not_used',
            message: 'There are fields mapped as "email" that are not being used as the recipient',
            severity: 'suggestion',
            mappedFields: emailMappedFields.map(field => ({
              id: field.id,
              label: field.label
            }))
          });
        }
      }
      
      response.analysis.potentialIssues = issues;
      response.analysis.mappingIssues = mappingIssues;
      
      // Check database schema for EmailRule table
      try {
        const schemaInfo = await prisma.$queryRaw`
          SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns 
          WHERE table_name = 'EmailRule'
        `;
        
        // Add schema information to response
        response.databaseSchema = {
          emailRuleColumns: schemaInfo
        };
        
        // Check if required columns exist
        const hasRecipientType = (schemaInfo as any[]).some(col => col.column_name === 'recipientType');
        const hasRecipientEmail = (schemaInfo as any[]).some(col => col.column_name === 'recipientEmail');
        const hasRecipientField = (schemaInfo as any[]).some(col => col.column_name === 'recipientField');
        
        if (!hasRecipientType || !hasRecipientEmail || !hasRecipientField) {
          issues.push('Database schema is missing required columns for recipient configuration');
          
          if (!hasRecipientType) issues.push('Missing recipientType column in EmailRule table');
          if (!hasRecipientEmail) issues.push('Missing recipientEmail column in EmailRule table');
          if (!hasRecipientField) issues.push('Missing recipientField column in EmailRule table');
        }
      } catch (schemaError) {
        console.error('Error checking database schema:', schemaError);
        response.databaseSchema = { error: 'Failed to check database schema' };
      }
      
      return res.status(200).json(response);
    }
    
    // Handle POST request for test submission
    if (req.method === 'POST') {
      const { ruleId, testData } = req.body;
      
      if (!ruleId) {
        return res.status(400).json({ error: 'Rule ID is required' });
      }
      
      if (!testData || !testData.email) {
        return res.status(400).json({ error: 'Test data with email is required' });
      }
      
      logger.info("Processing test submission for rule", "emails", { ruleId, testData });
      
      // Fetch the rule with template
      const rule = await prisma.emailRule.findFirst({
        where: {
          id: String(ruleId),
          userId: user.id,
        },
        include: {
          template: true,
          form: {
            include: {
              formSections: {
                include: {
                  fields: true
                }
              }
            }
          }
        }
      });
      
      if (!rule) {
        return res.status(404).json({ error: 'Rule not found' });
      }
      
      // Get recipient information
      const recipientTypeRaw = getRecipientType(rule);
      const recipientTypeLower = recipientTypeRaw ? recipientTypeRaw.toLowerCase() : '';
      const recipientEmail = getRecipientEmail(rule);
      const recipientField = getRecipientField(rule);
      
      // Get form fields for reference
      const formFields = rule.form?.formSections?.flatMap(section => section.fields) || [];
      
      // Simulate recipient resolution process
      let resolvedRecipient = '';
      let recipientSource = '';
      let issues: string[] = [];
      let recommendations: string[] = [];
      let isSubmitterEmail = false;
      
      // Log the recipient resolution process
      logger.info("Recipient resolution process", "emails", {
        recipientType: recipientTypeLower,
        recipientEmail,
        recipientField,
        testEmail: testData.email
      });
      
      if (recipientTypeLower === 'custom' || recipientTypeLower === 'static') {
        // Custom email address
        if (recipientEmail) {
          resolvedRecipient = recipientEmail;
          recipientSource = 'Custom email address defined in rule';
          
          // Check if it's a valid email
          if (!isValidEmail(recipientEmail)) {
            issues.push(`The custom recipient email "${recipientEmail}" is not a valid email format`);
            recommendations.push('Update the rule to use a valid email address format');
          }
        } else {
          // No custom email defined, fallback to submitter
          resolvedRecipient = testData.email;
          recipientSource = 'Fallback to submitter email (custom email not defined)';
          isSubmitterEmail = true;
          
          issues.push('Custom recipient type is set but no recipient email is specified');
          recommendations.push('Add a valid recipient email to the rule configuration');
        }
      } else if (recipientTypeLower === 'field') {
        // Field-based recipient
        if (recipientField) {
          const targetField = formFields.find(field => field.id === recipientField);
          
          if (targetField) {
            // In a real submission, we would get the value from the field
            // For this test, we'll use the test email as a placeholder for field value
            resolvedRecipient = testData.email; // Simulating field value
            recipientSource = `Form field: ${targetField.label}`;
            
            // Check if it's an email field
            if (targetField.type !== 'email') {
              issues.push(`The selected recipient field "${targetField.label}" is not an email field (type: ${targetField.type})`);
              recommendations.push('Select an email field as the recipient field or change the field type to email');
            }
            
            // Check for email-mapped fields that might be better choices
            const emailMappedFields = formFields.filter(field => field.mapping === 'email' && field.id !== recipientField);
            if (emailMappedFields.length > 0) {
              recommendations.push(`Consider using one of the ${emailMappedFields.length} fields mapped as "email" as the recipient field`);
            }
          } else {
            // Field not found, fallback to submitter
            resolvedRecipient = testData.email;
            recipientSource = 'Fallback to submitter email (field not found)';
            isSubmitterEmail = true;
            
            issues.push(`The specified recipient field ID "${recipientField}" does not exist in the form`);
            recommendations.push('Update the rule to use an existing field from the form');
          }
        } else {
          // No field specified, fallback to submitter
          resolvedRecipient = testData.email;
          recipientSource = 'Fallback to submitter email (no field specified)';
          isSubmitterEmail = true;
          
          issues.push('Field recipient type is set but no field is specified');
          recommendations.push('Select a form field to use as the recipient source');
        }
      } else {
        // Submitter email (default)
        resolvedRecipient = testData.email;
        recipientSource = 'Form submitter email (default)';
        isSubmitterEmail = true;
        
        // This is expected behavior, but we can add a note
        recommendations.push('This rule is configured to send emails to the form submitter');
      }
      
      // Prepare response
      const response = {
        rule: {
          id: rule.id,
          name: rule.name,
          recipientType: recipientTypeRaw,
        },
        testData: {
          email: testData.email,
        },
        originalRecipient: recipientTypeLower === 'custom' ? recipientEmail : 
                          recipientTypeLower === 'field' ? `Field: ${recipientField}` : 
                          'Submitter Email',
        resolvedRecipient,
        recipientSource,
        isSubmitterEmail,
        issues,
        recommendations
      };
      
      // Add debug log entry
      await prisma.debugLog.create({
        data: {
          userId: user.id,
          type: 'EMAIL_RECIPIENT_TEST',
          message: `Email recipient test for rule: ${rule.name}`,
          metadata: {
            ruleId: rule.id,
            testData,
            result: response
          }
        }
      });
      
      return res.status(200).json(response);
    }
    
    // Handle unsupported methods
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    logger.error('Error in email recipient test:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Helper function to validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}