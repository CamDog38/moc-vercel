/**
 * Form System 2.0 Template Service
 * 
 * This service handles fetching and processing email templates.
 */

import { PrismaClient } from '@prisma/client';
import { TemplateResult } from './types';

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Fetch an email template by its ID from the original EmailTemplate table
 * 
 * @param templateId The ID of the template to fetch
 * @returns The template object or null if not found
 */
export async function fetchTemplateById2(templateId: string): Promise<TemplateResult | null> {
  console.log(`[EMAIL PROCESSING2] Fetching template with ID: ${templateId}`);
  console.log(`[DATABASE] Querying EmailTemplate table for template ID: ${templateId}`);
  
  try {
    // Fetch the template from the original EmailTemplate table
    const template = await prisma.emailTemplate.findUnique({
      where: { id: templateId }
    });
    
    if (template) {
      // Convert to our TemplateResult type
      const templateResult: TemplateResult = {
        id: template.id,
        name: template.name,
        subject: template.subject,
        htmlContent: template.htmlContent,
        // The textContent field might not exist in the database schema
        // so we handle it safely with a fallback to null
        textContent: (template as any).textContent || null,
        ccEmails: template.ccEmails,
        bccEmails: template.bccEmails
      };
      
      console.log(`[DATABASE] Found template in EmailTemplate table: ${template.name}`);
      console.log(`[EMAILS] Found template in EmailTemplate table: ${template.name}`);
      return templateResult;
    } else {
      console.log(`[DATABASE] Template not found in EmailTemplate table`);
      return null;
    }
  } catch (error) {
    console.error(`[ERROR] Error fetching template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
}

/**
 * Process CC emails for a template
 * 
 * @param templateId The ID of the template
 * @param providedCcEmails CC emails provided in the request
 * @returns The final CC emails to use
 */
export async function processCcEmailsWithTemplate2(
  templateId: string,
  providedCcEmails?: string[] | string | null
): Promise<string | null> {
  console.log(`[EMAIL PROCESSING2] Processing CC emails for template ID: ${templateId}`);
  console.log(`[EMAIL PROCESSING2] Input CC emails: ${providedCcEmails || 'None'}`);
  
  // If CC emails are provided in the request, use those
  if (providedCcEmails) {
    // Handle array of emails
    if (Array.isArray(providedCcEmails)) {
      const emailString = providedCcEmails.join(', ');
      console.log(`[EMAIL PROCESSING2] Using provided CC emails (array): ${emailString}`);
      return emailString;
    }
    // Handle string emails
    console.log(`[EMAIL PROCESSING2] Using provided CC emails (string): ${providedCcEmails}`);
    return providedCcEmails;
  }
  
  // Otherwise, check if the template has CC emails
  try {
    const template = await fetchTemplateById2(templateId);
    
    if (template && template.ccEmails) {
      console.log(`[EMAIL PROCESSING2] Using template CC emails: ${template.ccEmails}`);
      return template.ccEmails;
    } else {
      console.log(`[EMAIL PROCESSING2] No CC emails found in template`);
      return null;
    }
  } catch (error) {
    console.error(`[ERROR] Error processing CC emails: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
}

/**
 * Process BCC emails for a template
 * 
 * @param templateId The ID of the template
 * @param providedBccEmails BCC emails provided in the request
 * @returns The final BCC emails to use
 */
export async function processBccEmailsWithTemplate2(
  templateId: string,
  providedBccEmails?: string[] | string | null
): Promise<string | null> {
  console.log(`[EMAIL PROCESSING2] Processing BCC emails for template ID: ${templateId}`);
  console.log(`[EMAIL PROCESSING2] Input BCC emails: ${providedBccEmails || 'None'}`);
  
  // If BCC emails are provided in the request, use those
  if (providedBccEmails) {
    // Handle array of emails
    if (Array.isArray(providedBccEmails)) {
      const emailString = providedBccEmails.join(', ');
      console.log(`[EMAIL PROCESSING2] Using provided BCC emails (array): ${emailString}`);
      return emailString;
    }
    // Handle string emails
    console.log(`[EMAIL PROCESSING2] Using provided BCC emails (string): ${providedBccEmails}`);
    return providedBccEmails;
  }
  
  // Otherwise, check if the template has BCC emails
  try {
    const template = await fetchTemplateById2(templateId);
    
    if (template && template.bccEmails) {
      console.log(`[EMAIL PROCESSING2] Using template BCC emails: ${template.bccEmails}`);
      return template.bccEmails;
    } else {
      console.log(`[EMAIL PROCESSING2] No BCC emails found in template`);
      return null;
    }
  } catch (error) {
    console.error(`[ERROR] Error processing BCC emails: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
}
