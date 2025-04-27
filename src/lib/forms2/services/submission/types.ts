/**
 * Form System 2.0 Submission Types
 * 
 * This file contains type definitions for the form submission services.
 */

import { FormSubmission, Lead, Booking } from '@prisma/client';

/**
 * Form field configuration types
 */
export type FieldType = 
  | 'text' 
  | 'textarea'
  | 'email' 
  | 'tel' 
  | 'date' 
  | 'time' 
  | 'datetime' 
  | 'number' 
  | 'select' 
  | 'multiselect' 
  | 'checkbox' 
  | 'radio' 
  | 'file' 
  | 'hidden';

export interface BaseFieldConfig {
  id: string;
  name: string;
  label: string;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  defaultValue?: any;
  validation?: {
    validate: (value: any) => boolean | string;
    message?: string;
  };
  conditionalLogic?: ConditionalLogic;
  fieldType?: string; // For special field types like 'name', 'address', etc.
  order?: number; // For ordering fields within a section
}

export interface TextFieldConfig extends BaseFieldConfig {
  type: 'text' | 'textarea' | 'email' | 'tel';
  minLength?: number;
  maxLength?: number;
}

export interface NumberFieldConfig extends BaseFieldConfig {
  type: 'number';
  min?: number;
  max?: number;
  step?: number;
}

export interface DateFieldConfig extends BaseFieldConfig {
  type: 'date' | 'time' | 'datetime';
  min?: string;
  max?: string;
  futureOnly?: boolean;
}

export interface SelectFieldConfig extends BaseFieldConfig {
  type: 'select' | 'multiselect';
  options: FieldOption[];
  allowOther?: boolean;
}

export interface CheckboxFieldConfig extends BaseFieldConfig {
  type: 'checkbox';
  options?: FieldOption[];
}

export interface RadioFieldConfig extends BaseFieldConfig {
  type: 'radio';
  options: FieldOption[];
  allowOther?: boolean;
}

export interface FileFieldConfig extends BaseFieldConfig {
  type: 'file';
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
}

export interface HiddenFieldConfig extends BaseFieldConfig {
  type: 'hidden';
}

export type FieldConfig = 
  | TextFieldConfig 
  | NumberFieldConfig 
  | DateFieldConfig 
  | SelectFieldConfig 
  | CheckboxFieldConfig 
  | RadioFieldConfig 
  | FileFieldConfig 
  | HiddenFieldConfig;

export interface FieldOption {
  label: string;
  value: string;
}

export interface ConditionalLogic {
  fieldId: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'notContains' | 'greaterThan' | 'lessThan';
  value: any;
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FieldConfig[];
  conditionalLogic?: ConditionalLogic;
  order?: number;
}

export interface FormConfig {
  id: string;
  title: string;
  description?: string;
  sections: FormSection[];
  submitButtonText?: string;
  successMessage?: string;
  isPublic?: boolean;
  formType?: 'inquiry' | 'booking';
  version?: number;
  status?: 'draft' | 'published' | 'archived';
}

/**
 * Form submission types
 */
export type FormSubmissionData = Record<string, any>;

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface MappingResult {
  mappedData: Record<string, any>;
  unmappedFields: string[];
}

export interface ProcessSubmissionResult {
  success: boolean;
  submissionId?: string;
  leadId?: string;
  bookingId?: string;
  errors?: Record<string, string>;
  message?: string;
}

export interface EmailProcessingResult {
  success: boolean;
  emailsSent: number;
  errors?: string[];
}

/**
 * Service interfaces
 */
export interface ValidationService {
  validateSubmission(formId: string, data: FormSubmissionData): Promise<ValidationResult>;
}

// The MappingService interface is deprecated.
// Use the mapFormFields function from @/lib/forms2/services/mapping instead.
// export interface MappingService {
//   mapFields(formId: string, data: FormSubmissionData): Promise<MappingResult>;
// }

export interface LeadService {
  createLead(formId: string, data: FormSubmissionData, mappedData: Record<string, any>): Promise<Lead>;
}

export interface BookingService {
  createBooking(formId: string, data: FormSubmissionData, mappedData: Record<string, any>, leadId?: string): Promise<Booking>;
}

export interface SubmissionService {
  processSubmission(
    formId: string, 
    data: FormSubmissionData, 
    trackingToken?: string, 
    timeStamp?: string
  ): Promise<ProcessSubmissionResult>;
}

export interface ErrorHandlingService {
  handleError(error: any, context?: string): any;
  formatValidationErrors(errors: Record<string, string>): string;
}

/**
 * Error types
 */
export class FormValidationError extends Error {
  errors: Record<string, string>;
  
  constructor(message: string, errors: Record<string, string>) {
    super(message);
    this.name = 'FormValidationError';
    this.errors = errors;
  }
}

export class FormMappingError extends Error {
  unmappedFields: string[];
  
  constructor(message: string, unmappedFields: string[]) {
    super(message);
    this.name = 'FormMappingError';
    this.unmappedFields = unmappedFields;
  }
}

export class FormSubmissionError extends Error {
  context: string;
  
  constructor(message: string, context: string) {
    super(message);
    this.name = 'FormSubmissionError';
    this.context = context;
  }
}

export class EmailProcessingError extends Error {
  submissionId: string;
  
  constructor(message: string, submissionId: string) {
    super(message);
    this.name = 'EmailProcessingError';
    this.submissionId = submissionId;
  }
}
