/**
 * Form System 2.0 Core Type Definitions
 * 
 * This file contains all the core type definitions for the Form System 2.0,
 * including field types, validation, mapping, and form state.
 */

/**
 * Field Types
 */
export type FieldType = 
  | 'text'
  | 'textarea'
  | 'email'
  | 'tel'
  | 'number'
  | 'date'
  | 'time'
  | 'datetime'
  | 'datetime-local'
  | 'dob'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'radio'
  | 'file'
  | 'hidden';

/**
 * Field Validation
 */
export interface FieldValidation {
  required?: string | boolean;
  minLength?: { value: number; message: string };
  maxLength?: { value: number; message: string };
  min?: { value: number; message: string };
  max?: { value: number; message: string };
  pattern?: { value: RegExp; message: string };
  validate?: (value: any) => string | boolean | Promise<string | boolean>;
}

/**
 * Field Option
 */
export interface FieldOption {
  id: string;
  label: string;
  value: string;
}

/**
 * Field Mapping
 */
export interface FieldMapping {
  type: 'name' | 'email' | 'phone' | 'date' | 'time' | 'location' | 'location_office' | 'datetime' | 'custom';
  value: string;
  customKey?: string; // Allow setting a custom mapping key
}

/**
 * Conditional Logic
 */
export interface ConditionalLogic {
  action: 'show' | 'hide';
  when: {
    field: string;
    fieldLabel?: string; // Optional field label to help with field matching
    operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
    value: string;
  };
}

/**
 * Base Field Configuration
 */
export interface BaseFieldConfig {
  id: string;
  type: FieldType;
  name: string;
  label: string;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  defaultValue?: any;
  validation?: FieldValidation;
  mapping?: FieldMapping;
  conditionalLogic?: ConditionalLogic;
  stableId?: string;
  inUseByRules?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Text Field Configuration
 */
export interface TextFieldConfig extends BaseFieldConfig {
  type: 'text';
  maxLength?: number;
  minLength?: number;
}

/**
 * Text Area Field Configuration
 */
export interface TextAreaFieldConfig extends BaseFieldConfig {
  type: 'textarea';
  maxLength?: number;
  minLength?: number;
  rows?: number;
}

/**
 * Email Field Configuration
 */
export interface EmailFieldConfig extends BaseFieldConfig {
  type: 'email';
}

/**
 * Telephone Field Configuration
 */
export interface TelFieldConfig extends BaseFieldConfig {
  type: 'tel';
  format?: string;
}

/**
 * Number Field Configuration
 */
export interface NumberFieldConfig extends BaseFieldConfig {
  type: 'number';
  min?: number;
  max?: number;
  step?: number;
}

/**
 * Date Field Configuration
 */
export interface DateFieldConfig extends BaseFieldConfig {
  type: 'date' | 'time' | 'datetime' | 'datetime-local' | 'dob';
  min?: string;
  max?: string;
  excludeTime?: boolean;
  includeTime?: boolean;
  allowTimeToggle?: boolean;
}

/**
 * Select Field Configuration
 */
export interface SelectFieldConfig extends BaseFieldConfig {
  type: 'select' | 'multiselect';
  options: FieldOption[];
  allowOther?: boolean;
}

/**
 * Checkbox Field Configuration
 */
export interface CheckboxFieldConfig extends BaseFieldConfig {
  type: 'checkbox';
  options?: FieldOption[];
}

/**
 * Radio Field Configuration
 */
export interface RadioFieldConfig extends BaseFieldConfig {
  type: 'radio';
  options: FieldOption[];
  allowOther?: boolean;
}

/**
 * File Field Configuration
 */
export interface FileFieldConfig extends BaseFieldConfig {
  type: 'file';
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
}

/**
 * Hidden Field Configuration
 */
export interface HiddenFieldConfig extends BaseFieldConfig {
  type: 'hidden';
}

/**
 * Field Configuration Union Type
 */
export type FieldConfig = 
  | TextFieldConfig
  | TextAreaFieldConfig
  | EmailFieldConfig
  | TelFieldConfig
  | NumberFieldConfig
  | DateFieldConfig
  | SelectFieldConfig
  | CheckboxFieldConfig
  | RadioFieldConfig
  | FileFieldConfig
  | HiddenFieldConfig;

/**
 * Form Section
 */
export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FieldConfig[];
  order: number;
  conditionalLogic?: ConditionalLogic;
}

/**
 * Form Configuration
 */
export interface FormConfig {
  id: string;
  title: string;
  description?: string;
  sections: FormSection[];
  isMultiPage?: boolean;
  isPublic?: boolean;
  submitButtonText?: string;
  successMessage?: string;
  version: 'modern';
  metadata?: Record<string, any>;
}

/**
 * Form State
 */
export interface FormState {
  config: FormConfig;
  values: Record<string, any>;
  errors: Record<string, string | undefined>;
  touched: Record<string, boolean>;
  isDirty: boolean;
  isSubmitting: boolean;
  isSubmitted: boolean;
  isValid: boolean;
}

/**
 * Form Submission Data
 */
export type FormSubmissionData = Record<string, any>;

/**
 * Database Models
 */

/**
 * Form2 Database Model - Aligned with Prisma schema
 */
export interface Form2Model {
  id: string;
  name: string; // This is the title in the UI but 'name' in the database
  description?: string;
  type: 'INQUIRY' | 'BOOKING'; // Enum in Prisma
  isActive: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  isMultiPage?: boolean;
  submitButtonText?: string;
  successMessage?: string;
  // JSON fields stored as strings
  fields?: string; // Stores version, isPublic, and other metadata
  sections?: string; // For potential future use
  metadata?: Record<string, any>; // Additional metadata for the form
}

/**
 * FormSection2 Database Model - Aligned with Prisma schema
 */
export interface FormSection2Model {
  id: string;
  title: string;
  description?: string;
  order: number;
  formId: string;
  createdAt: Date;
  updatedAt: Date;
  conditionalLogic?: string; // JSON stored as string
  fields?: FormField2Model[]; // For eager loading
}

/**
 * FormField2 Database Model - Aligned with Prisma schema
 */
export interface FormField2Model {
  id: string;
  type: string;
  label: string;
  name: string;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  order: number;
  sectionId: string;
  createdAt: Date;
  updatedAt: Date;
  config?: string; // JSON stored as string
  validation?: string; // JSON stored as string
  conditionalLogic?: string; // JSON stored as string
  mapping?: string; // JSON stored as string
  stableId: string;
  inUseByRules: boolean;
}

/**
 * FormSubmission2 Database Model - Aligned with Prisma schema
 */
export interface FormSubmission2Model {
  id: string;
  formId: string;
  userId?: string | null;
  data: string; // JSON stored as string
  metadata?: string | null; // JSON stored as string
  createdAt: Date;
  updatedAt: Date;
}
