/**
 * Email System 2.0 Processor
 * 
 * This file contains the core email processing logic for the Email System 2.0.
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// Import from our new modules
import { ProcessSubmissionParams, ProcessSubmissionResult } from './types';
import { evaluateConditions } from './conditions';
import { replaceVariables, extractMappedValuesFromFields, processCcEmailsWithTemplate, processBccEmailsWithTemplate } from './templates';
import { logProcessing, createLogEntry } from './logging';

const prisma = new PrismaClient();

/**
 * Email Processor Class
 * 
 * Handles email rule evaluation and processing for form submissions
 */
export class EmailProcessor {
  /**
   * Process a form submission and trigger matching email rules
   */
  async processSubmission(params: ProcessSubmissionParams): Promise<ProcessSubmissionResult> {
    // Standard logging header
    const fileName = path.basename(__filename);
    const filePath = __filename;
    const fileVersion = '2.0';
    
    console.log(`[FILE NAME] ${fileName}`);
    console.log(`[FILE PATH] ${filePath}`);
    console.log(`[${fileVersion} FILE]`);
    console.log(`[PROCESSING] EmailProcessor.processSubmission starting`);
    
    const { submissionId, formId, data, source = 'api' } = params;
    const correlationId = uuidv4();
    const logs: any[] = [];

    try {
      // Log the start of processing
      console.log(`[EMAIL RULES] Starting email processing for form ID: ${formId}`);
      console.log(`[EMAIL RULES] Submission ID: ${submissionId || 'Not provided'}`);
      console.log(`[EMAIL RULES] Correlation ID: ${correlationId}`);
      console.log(`[EMAIL RULES] Source: ${source}`);
      
      await logProcessing({
        level: 'info',
        message: `Starting email processing for submission ${submissionId}`,
        correlationId,
        source,
        formId,
        submissionId,
      });
      
      logs.push(createLogEntry('info', `Starting email processing for submission ${submissionId}`));

      // Get the submission if it exists
      let submission;
      if (submissionId) {
        console.log(`[DATABASE] Fetching submission with ID: ${submissionId}`);
        submission = await prisma.formSubmission2.findUnique({
          where: { id: submissionId },
        });

        if (!submission) {
          const errorMessage = `Submission ${submissionId} not found`;
          console.log(`[ERROR] ${errorMessage}`);
          
          await logProcessing({
            level: 'error',
            message: errorMessage,
            correlationId,
            source,
            formId,
            submissionId,
          });
          
          logs.push(createLogEntry('error', errorMessage));
          
          return {
            success: false,
            processedRules: 0,
            queuedEmails: 0,
            correlationId,
            logs,
          };
        }
        console.log(`[DATABASE] Submission found: ${!!submission}`);
      }

      // Get the form
      console.log(`[DATABASE] Fetching form with ID: ${formId}`);
      const form = await prisma.form2.findUnique({
        where: { id: formId },
      });

      if (!form) {
        const errorMessage = `Form ${formId} not found`;
        console.log(`[ERROR] ${errorMessage}`);
        
        await logProcessing({
          level: 'error',
          message: errorMessage,
          correlationId,
          source,
          formId,
          submissionId,
        });
        
        logs.push(createLogEntry('error', errorMessage));
        
        return {
          success: false,
          processedRules: 0,
          queuedEmails: 0,
          correlationId,
          logs,
        };
      }
      
      console.log(`[DATABASE] Form found: ${!!form}`);
      console.log(`[FORM INFO] Title: ${form.title || 'Not specified'}`);
      console.log(`[FORM INFO] Type: ${form.type || 'Not specified'}`);
      console.log(`[FORM INFO] User ID: ${form.userId || 'Not specified'}`);
      console.log(`[FORM DATA] Keys received: ${data ? Object.keys(data).join(', ') : 'None'}`);
      
      if (data) {
        console.log(`[FORM DATA] Email field value: ${data.email || 'Not provided'}`);
        console.log(`[FORM DATA] Name field value: ${data.name || 'Not provided'}`);
      }

      // Get all sections and fields for the form
      console.log(`[DATABASE] Fetching form sections and fields for form ID: ${formId}`);
      const sections = await prisma.formSection2.findMany({
        where: { formId },
        include: {
          fields: true,
        },
      });

      // Convert fields to a flat array
      const fields = sections.flatMap(section => section.fields);
      console.log(`[DATABASE] Found ${sections.length} sections and ${fields.length} fields`);

      // Get all active email rules for the form
      console.log(`[DATABASE] Fetching active email rules for form ID: ${formId}`);
      const rules = await prisma.emailRule2.findMany({
        where: {
          formId,
          isActive: true,
        },
        include: {
          template: true,
        },
      });

      console.log(`[EMAIL RULES] Found ${rules.length} active email rules`);
      rules.forEach((rule, index) => {
        console.log(`[EMAIL RULE ${index + 1}] ID: ${rule.id}, Name: ${rule.name || 'Unnamed rule'}`);
        console.log(`[EMAIL RULE ${index + 1}] Template ID: ${rule.templateId}`);
        console.log(`[EMAIL RULE ${index + 1}] Has template object: ${!!rule.template}`);
        if (rule.template) {
          console.log(`[EMAIL RULE ${index + 1}] Template name: ${rule.template.name}`);
          // Use optional chaining to safely access properties that might not exist
          console.log(`[EMAIL RULE ${index + 1}] Template CC emails: ${(rule.template as any).ccEmails || 'None'}`);
          console.log(`[EMAIL RULE ${index + 1}] Template BCC emails: ${(rule.template as any).bccEmails || 'None'}`);
        }
      });
      
      await logProcessing({
        level: 'info',
        message: `Found ${rules.length} active email rules for form ${formId}`,
        correlationId,
        source,
        formId,
        submissionId,
      });
      
      logs.push(createLogEntry('info', `Found ${rules.length} active email rules for form ${formId}`));

      let processedRules = 0;
      let queuedEmails = 0;

      // Process each rule
      for (const rule of rules) {
        // Log that we're processing this rule
        console.log(`[EMAIL RULE ${rule.id}] Processing rule: ${rule.name}`);
        
        await logProcessing({
          level: 'info',
          message: `Processing rule: ${rule.name}`,
          correlationId,
          source,
          formId,
          submissionId,
          ruleId: rule.id,
        });
        
        logs.push(createLogEntry('info', `Processing rule: ${rule.name}`));

        // Get the template
        const template = rule.template;
        if (!template) {
          console.log(`[EMAIL RULE ${rule.id}] No template found - skipping rule`);
          
          await logProcessing({
            level: 'error',
            message: `No template found for rule ${rule.id}`,
            correlationId,
            source,
            formId,
            submissionId,
            ruleId: rule.id,
          });
          
          logs.push(createLogEntry('error', `No template found for rule ${rule.id}`));
          
          continue;
        }
        
        console.log(`[EMAIL RULE ${rule.id}] Using template: ${template.name}`);
        
        // Extract mapped values from fields
        const mappedValues = extractMappedValuesFromFields(data, fields);
        
        // Check if the rule has conditions
        if (rule.conditions && rule.conditions.length > 0) {
          // Evaluate the conditions
          console.log(`[EMAIL RULE ${rule.id}] Evaluating conditions`);
          
          // Use a boolean flag to track if conditions are met
          let matches = false;
          
          try {
            // Call evaluateConditions with proper type handling
            // Parse conditions if it's a string, otherwise use as is
            const parsedConditions = typeof rule.conditions === 'string' 
              ? JSON.parse(rule.conditions) 
              : rule.conditions;
            const result = await evaluateConditions(parsedConditions, data);
            matches = !!result; // Convert to boolean
            
            console.log(`[EMAIL RULE ${rule.id}] Evaluation result: ${matches ? 'MATCHED' : 'NOT MATCHED'}`);
          } catch (evalError) {
            console.error(`[EMAIL RULE ${rule.id}] Error evaluating conditions:`, evalError);
            matches = false;
          }
          
          if (!matches) {
            console.log(`[EMAIL RULE ${rule.id}] Conditions not met - skipping rule`);
            
            await logProcessing({
              level: 'info',
              message: `Rule ${rule.id} conditions not met`,
              correlationId,
              source,
              formId,
              submissionId,
              ruleId: rule.id,
            });
            
            logs.push(createLogEntry('info', `Rule ${rule.id} conditions not met`));
            
            continue;
          }
          
          console.log(`[EMAIL RULE ${rule.id}] Conditions met - preparing to send email`);
        }

        // Determine the recipient
        let recipientEmail = '';
        
        if (rule.recipientType === 'static' && rule.recipientEmail) {
          recipientEmail = rule.recipientEmail;
          console.log(`[EMAIL RULE ${rule.id}] Using static recipient email: ${recipientEmail}`);
        } else if (rule.recipientType === 'field' && rule.recipientField) {
          const fieldId = rule.recipientField;
          recipientEmail = data[fieldId] || '';
          console.log(`[EMAIL RULE ${rule.id}] Using email from field ${fieldId}: ${recipientEmail}`);
        }

        if (!recipientEmail) {
          console.log(`[EMAIL RULE ${rule.id}] No recipient email found - skipping rule`);
          
          await logProcessing({
            level: 'error',
            message: `No recipient found for rule ${rule.id}`,
            correlationId,
            source,
            formId,
            submissionId,
            ruleId: rule.id,
          });
          
          logs.push(createLogEntry('error', `No recipient found for rule ${rule.id}`));
          
          continue;
        }

        // Replace variables in subject and body
        const subject = replaceVariables(template.subject, data, mappedValues || {});
        const htmlContent = replaceVariables(template.htmlContent, data, mappedValues || {});
        const textContent = template.textContent 
          ? replaceVariables(template.textContent, data, mappedValues || {}) 
          : '';

        // Process CC and BCC recipients using our utility functions
        const ccEmails = processCcEmailsWithTemplate(rule, template as any);
        const bccEmails = processBccEmailsWithTemplate(rule, template as any);
        
        console.log(`[EMAIL RULE ${rule.id}] CC emails: ${ccEmails || 'None'}`);
        console.log(`[EMAIL RULE ${rule.id}] BCC emails: ${bccEmails || 'None'}`);
        
        // Split and clean up email addresses
        const cc = ccEmails ? ccEmails.split(',').map((email: string) => email.trim()).filter(Boolean) : [];
        const bcc = bccEmails ? bccEmails.split(',').map((email: string) => email.trim()).filter(Boolean) : [];

        // Queue the email
        console.log(`[EMAIL RULE ${rule.id}] Queueing email to: ${recipientEmail}`);
        console.log(`[EMAIL RULE ${rule.id}] Subject: ${subject}`);
        console.log(`[DATABASE] Creating email queue record`);
        
        const queuedEmail = await prisma.emailQueue2.create({
          data: {
            formId,
            submissionId,
            ruleId: rule.id,
            templateId: template.id,
            recipient: recipientEmail,
            subject,
            html: htmlContent, // Use html instead of htmlContent to match the schema
            text: textContent, // Use text instead of textContent to match the schema
            cc: cc.join(','),
            bcc: bcc.join(','),
            status: 'PENDING',
            correlationId,
            source, // Add the source property from the function parameters
          },
        });
        
        console.log(`[EMAIL RULE ${rule.id}] Email queued with ID: ${queuedEmail.id}`);
        
        await logProcessing({
          level: 'info',
          message: `Email queued: ${queuedEmail.id}`,
          correlationId,
          source,
          formId,
          submissionId,
          ruleId: rule.id,
          templateId: template.id,
        });
        
        logs.push(createLogEntry('info', `Email queued: ${queuedEmail.id}`));

        queuedEmails++;
        processedRules++;
      }

      console.log(`[EMAIL RULES] Completed processing ${processedRules} rules`);
      console.log(`[EMAIL RULES] Queued ${queuedEmails} emails for sending`);
      console.log(`[COMPLETE] Email processing completed successfully`);
      
      await logProcessing({
        level: 'info',
        message: `Completed email processing for submission ${submissionId}. Processed ${processedRules} rules, queued ${queuedEmails} emails.`,
        correlationId,
        source,
        formId,
        submissionId,
      });
      
      logs.push(createLogEntry('info', `Completed email processing for submission ${submissionId}. Processed ${processedRules} rules, queued ${queuedEmails} emails.`));

      return {
        success: true,
        processedRules,
        queuedEmails,
        correlationId,
        logs,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const stackTrace = error instanceof Error ? error.stack : '';
      
      console.error(`[ERROR] Error processing submission:`, error);
      console.error(`[ERROR] ${errorMessage}`);
      
      await logProcessing({
        level: 'error',
        message: `Error processing submission: ${errorMessage}`,
        correlationId,
        source,
        formId,
        submissionId,
        error: errorMessage,
        stackTrace,
      });
      
      logs.push(createLogEntry('error', `Error processing submission: ${errorMessage}`));

      return {
        success: false,
        processedRules: 0,
        queuedEmails: 0,
        correlationId,
        logs,
      };
    }
  }
}
