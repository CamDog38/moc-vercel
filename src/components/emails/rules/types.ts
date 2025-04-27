/**
 * Email Rules System Type Definitions
 * 
 * This file contains all the TypeScript type definitions used throughout the email rules system.
 * It defines the structure of email templates, form fields, conditions, and rules that power
 * the automated email sending functionality based on form submissions.
 * 
 * Key features:
 * - Support for stable IDs to ensure rules remain valid even when forms are recreated
 * - Flexible condition structure for complex rule matching
 * - Comprehensive field metadata for improved UI and matching logic
 */

export type EmailTemplate = {
  id: string;
  name: string;
  type: string;
};

export type FormField = {
  id: string;
  label: string;
  type: string;
  key?: string;
  stableId?: string; // Stable ID that doesn't change when form is recreated
  options?: string[];
  originalOptions?: any[]; // Store the original option objects for Form System 2.0
};

export type FormSection = {
  id: string;
  title: string;
  fields: FormField[];
};

export type Form = {
  id: string;
  name: string;
  type: string;
  formSections?: FormSection[];
};

export type Condition = {
  id: string;
  field: string; // Primary field identifier (usually the field ID)
  operator: string;
  value: string;
  fieldId?: string; // Field ID backup
  fieldStableId?: string; // Stable ID that doesn't change when form is recreated
  fieldLabel?: string; // Human-readable field label for fallback matching
  fieldType?: string;
  fieldOptions?: string[];
  originalOptions?: any[]; // Store the original option objects for Form System 2.0
};

export type EmailRule = {
  id: string;
  name: string;
  description: string;
  templateId: string;
  formId: string;
  active: boolean;
  conditions: string;
  ccEmails?: string;
  bccEmails?: string;
  recipientType?: string;
  recipientEmail?: string;
  recipientField?: string;
  useFormSystem2?: boolean;
  template: {
    id: string;
    name: string;
  };
};
