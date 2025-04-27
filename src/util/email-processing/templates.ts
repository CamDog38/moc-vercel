import { EmailTemplate } from '@prisma/client';
import prisma from '@/lib/prisma';
import { addApiLog } from '@/pages/api/debug/logs';
import { replaceVariables } from '@/util/email-template-helpers';

/**
 * Fetch template directly from database by ID
 * This is useful when we only have the template ID and not the full template object
 */
export async function fetchTemplateById(templateId: string): Promise<EmailTemplate | null> {
  try {
    const template = await prisma.emailTemplate.findUnique({
      where: { id: templateId }
    });
    
    if (template) {
      console.log('[Forms2] Template fetched from database:', {
        id: template.id,
        name: template.name,
        hasCcEmails: !!template.ccEmails,
        hasBccEmails: !!template.bccEmails
      });
    } else {
      console.log(`[Forms2] No template found with ID: ${templateId}`);
    }
    
    return template;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Forms2] Error fetching template: ${errorMessage}`);
    addApiLog(`Error fetching template: ${errorMessage}`, 'error', 'emails');
    return null;
  }
}

/**
 * Process CC emails from template or parameters
 * This ensures we get CC emails from the template if not provided as parameters
 */
export async function processCcEmailsWithTemplate(
  templateId: string, 
  providedCcEmails?: string
): Promise<string | undefined> {
  // Add detailed logging for debugging CC emails
  console.log('[Forms2] Processing CC emails - template ID:', templateId);
  console.log('[Forms2] Processing CC emails - provided CC:', providedCcEmails || 'none');
  
  // If CC emails are provided, use them
  if (providedCcEmails) {
    console.log('[Forms2] Using provided CC emails:', providedCcEmails);
    return providedCcEmails;
  }
  
  // Otherwise, try to get them from the template
  try {
    console.log('[Forms2] No CC emails provided, fetching from template:', templateId);
    const template = await fetchTemplateById(templateId);
    
    console.log('[Forms2] Template CC emails check - template found:', !!template);
    if (template) {
      console.log('[Forms2] Template CC emails check - has CC emails:', !!template.ccEmails);
      console.log('[Forms2] Template CC emails value:', template.ccEmails || 'none');
    }
    
    if (template?.ccEmails) {
      console.log('[Forms2] Using template CC emails:', template.ccEmails);
      return template.ccEmails;
    } else {
      console.log('[Forms2] No CC emails found in template');
    }
  } catch (error) {
    console.error('[Forms2] Error getting CC emails from template:', error);
  }
  
  console.log('[Forms2] Final result: No CC emails to use');
  return undefined;
}

/**
 * Process BCC emails from template or parameters
 * This ensures we get BCC emails from the template if not provided as parameters
 */
export async function processBccEmailsWithTemplate(
  templateId: string, 
  providedBccEmails?: string
): Promise<string | undefined> {
  // Add detailed logging for debugging BCC emails
  console.log('[Forms2] Processing BCC emails - template ID:', templateId);
  console.log('[Forms2] Processing BCC emails - provided BCC:', providedBccEmails || 'none');
  
  // If BCC emails are provided, use them
  if (providedBccEmails) {
    console.log('[Forms2] Using provided BCC emails:', providedBccEmails);
    return providedBccEmails;
  }
  
  // Otherwise, try to get them from the template
  try {
    console.log('[Forms2] No BCC emails provided, fetching from template:', templateId);
    const template = await fetchTemplateById(templateId);
    
    console.log('[Forms2] Template BCC emails check - template found:', !!template);
    if (template) {
      console.log('[Forms2] Template BCC emails check - has BCC emails:', !!template.bccEmails);
      console.log('[Forms2] Template BCC emails value:', template.bccEmails || 'none');
    }
    
    if (template?.bccEmails) {
      console.log('[Forms2] Using template BCC emails:', template.bccEmails);
      return template.bccEmails;
    } else {
      console.log('[Forms2] No BCC emails found in template');
    }
  } catch (error) {
    console.error('[Forms2] Error getting BCC emails from template:', error);
  }
  
  console.log('[Forms2] Final result: No BCC emails to use');
  return undefined;
}

/**
 * Replace nested variables in the form {{field.subfield}}
 */
export function replaceNestedVariables(text: string, data: Record<string, any>): string {
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
