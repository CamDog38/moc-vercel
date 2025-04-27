/**
 * Form Repository Types
 * 
 * This file contains type definitions for the form repository.
 */

import { Form } from '@prisma/client';
import { Form2Model, FormConfig } from '../../core/types';

/**
 * Form Repository Interface
 */
export interface IFormRepository {
  /**
   * Get all forms for a user
   */
  getAllForms(userId: string): Promise<Form2Model[]>;
  
  /**
   * Get a form by ID
   */
  getFormById(id: string): Promise<Form2Model | null>;
  
  /**
   * Create a new form
   */
  createForm(data: {
    title: string;
    description?: string;
    type: string;
    userId: string;
    isActive?: boolean;
    isPublic?: boolean;
    submitButtonText?: string;
    successMessage?: string;
    formConfig?: FormConfig;
    name?: string;
    legacyFormId?: string;
  }): Promise<Form>;
  
  /**
   * Update a form
   */
  updateForm(id: string, data: Partial<Form2Model>): Promise<Form>;
  
  /**
   * Delete a form
   */
  deleteForm(id: string): Promise<Form>;
  
  /**
   * Save form configuration
   */
  saveFormConfig(formConfig: FormConfig, userId: string): Promise<Form>;
  
  /**
   * Update an existing form's configuration
   */
  updateFormConfig(formId: string, formConfig: FormConfig): Promise<Form>;
  
  /**
   * Convert database models to FormConfig
   */
  convertToFormConfig(form: Form, sections: any[]): Promise<FormConfig>;
}
