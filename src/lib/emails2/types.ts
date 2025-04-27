/**
 * Email System 2.0 Types
 * 
 * This file contains type definitions for the Email System 2.0.
 */

/**
 * Email processing parameters
 */
export interface ProcessSubmissionParams {
  submissionId: string;
  formId: string;
  data: Record<string, any>;
  source?: string;
}

/**
 * Email processing result
 */
export interface ProcessSubmissionResult {
  success: boolean;
  processedRules: number;
  queuedEmails: number;
  correlationId: string;
  logs: any[];
}

/**
 * Logging parameters
 */
export interface LogProcessingParams {
  level: 'info' | 'warning' | 'error';
  message: string;
  correlationId: string;
  source: string;
  formId?: string;
  submissionId?: string;
  ruleId?: string;
  templateId?: string;
  details?: string;
  error?: string;
  stackTrace?: string;
}

/**
 * Email rule condition
 */
export interface EmailRuleCondition {
  field?: string;
  fieldId?: string; // Support both field and fieldId for backward compatibility
  fieldStableId?: string; // Stable ID that doesn't change when form is recreated
  fieldLabel?: string; // Human-readable field label for fallback matching
  operator: string;
  value: string;
}

/**
 * Email template with CC/BCC fields
 */
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  type?: string;
  ccEmails?: string;
  bccEmails?: string;
}

/**
 * Email rule with template
 */
export interface EmailRule {
  id: string;
  formId: string;
  name: string;
  isActive: boolean;
  conditions: any[];
  template: EmailTemplate;
  ccEmails?: string;
  bccEmails?: string;
  templateId?: string;
}
