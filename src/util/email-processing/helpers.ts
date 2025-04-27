import { EmailRule, EmailTemplate } from '@prisma/client';
import prisma from '@/lib/prisma';
import { addApiLog } from '@/pages/api/debug/logs';

/**
 * Helper function to get template from rule regardless of source
 * Works with both Form System 1.0 and 2.0 structures
 */
export function getTemplate(rule: any): EmailTemplate | null {
  // Add detailed logging to debug template retrieval
  console.log('[Forms2] Getting template from rule:', {
    hasTemplate: !!rule.template,
    hasEmailTemplate: !!rule.emailTemplate,
    templateId: rule.templateId,
    ruleId: rule.id
  });
  
  // Try to get the template directly from the rule
  const template = rule.template || rule.emailTemplate || null;
  
  // If we have a template, log its properties
  if (template) {
    console.log('[Forms2] Template found with properties:', {
      id: template.id,
      hasCcEmails: !!template.ccEmails,
      hasBccEmails: !!template.bccEmails
    });
  }
  
  return template;
}

/**
 * Helper function to get template ID from rule
 */
export function getTemplateId(rule: any): string | null {
  const template = getTemplate(rule);
  return template?.id || rule.templateId || null;
}

/**
 * Helper function to get CC emails from rule or template
 */
export function getCcEmails(rule: any): string | null {
  const template = getTemplate(rule);
  const ccEmails = template?.ccEmails || rule.ccEmails || null;
  
  // Add detailed logging for CC emails
  console.log('[Forms2] Getting CC emails:', {
    fromTemplate: template?.ccEmails,
    fromRule: rule.ccEmails,
    result: ccEmails
  });
  
  return ccEmails;
}

/**
 * Helper function to get BCC emails from rule or template
 */
export function getBccEmails(rule: any): string | null {
  const template = getTemplate(rule);
  const bccEmails = template?.bccEmails || rule.bccEmails || null;
  
  // Add detailed logging for BCC emails
  console.log('[Forms2] Getting BCC emails:', {
    fromTemplate: template?.bccEmails,
    fromRule: rule.bccEmails,
    result: bccEmails
  });
  
  return bccEmails;
}

/**
 * Helper function to get recipient type
 */
export function getRecipientType(rule: any): string | null {
  return rule.recipientType || null;
}

/**
 * Helper function to get recipient email
 */
export function getRecipientEmail(rule: any): string | null {
  return rule.recipientEmail || null;
}

/**
 * Helper function to get recipient field
 */
export function getRecipientField(rule: any): string | null {
  return rule.recipientField || null;
}

/**
 * Validate if a string is a valid email address
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  
  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
