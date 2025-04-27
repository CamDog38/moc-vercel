/**
 * Type definitions for Form System 2.0 Email Processing
 */

export interface EmailProcessingParams {
  formId: string;
  submissionId: string;
  data: Record<string, any>;
  correlationId?: string;
}

export interface EmailSendParams {
  templateId: string;
  submissionId: string;
  formId: string;
  data: Record<string, any>;
  userId?: string;
  recipient: string;
  ccEmails?: string[] | string | null;
  bccEmails?: string[] | string | null;
  ruleId?: string;
  correlationId?: string;
}

export interface EmailProcessingResult {
  success: boolean;
  processedRules: number;
  queuedEmails: number;
  correlationId: string;
  logs: any[];
  message?: string;
  error?: string;
}

export interface EmailSendResult {
  success: boolean;
  message: string;
  emailLogId?: string;
  error?: string;
  fallbackUsed?: boolean;
  directEmailUsed?: boolean;
}

export interface TemplateResult {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string | null;
  ccEmails: string | null;
  bccEmails: string | null;
}

export interface EnhancedData extends Record<string, any> {
  leadId?: string;
  name?: string;
  email?: string;
  phone?: string;
  firstName?: string;
  submissionId?: string;
  formId?: string;
  timeStamp?: string;
}
