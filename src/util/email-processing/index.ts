import prisma from '@/lib/prisma';

// Instead of using wildcard exports, we'll use specific exports to avoid conflicts
// Export from helpers.ts
export { 
  getTemplate,
  getTemplateId,
  getCcEmails,
  getBccEmails,
  getRecipientType,
  getRecipientEmail,
  getRecipientField,
  isValidEmail
} from './helpers';

// Export from templates.ts
export {
  fetchTemplateById,
  processCcEmailsWithTemplate,
  processBccEmailsWithTemplate,
  replaceNestedVariables
} from './templates';

// Export from form-system.ts
export {
  isFormSystem2,
  processFormData,
  extractFieldMappings
} from './form-system';

// Also export types for better type safety
export interface ProcessEmailAsyncParams {
  templateId: string;
  submissionId: string;
  data?: Record<string, any>;
  leadId?: string;
  userId?: string;
  recipient: string;
  ccEmails?: string;
  bccEmails?: string;
  ruleId?: string;
}

export interface ProcessEmailResult {
  success: boolean;
  message: string;
  emailLogId?: string;
  error?: string;
}
