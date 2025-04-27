/**
 * Form Repository Implementation
 * 
 * This file contains the implementation of the form repository.
 */

import { Form, FormType } from '@prisma/client';
import { Form2Model, FormConfig } from '../../core/types';
import { prisma, BaseRepository } from '../baseRepository';
import { IFormRepository } from './types';
import { saveFormSectionsAndFields, deleteFormSectionsAndFields } from './sectionFieldOperations';
import { convertToFormConfig, extractFormMetadata, updateFormMetadata } from './configConverter';
import { info, error, success, warn } from '@/util/logger';

// Cache for forms to improve performance
const formCache: Record<string, { form: Form2Model, timestamp: number }> = {};

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Form Repository Implementation
 */
export class FormRepository extends BaseRepository implements IFormRepository {
  /**
   * Get all forms for a user
   */
  async getAllForms(userId: string): Promise<Form2Model[]> {
    // Find all forms for the user
    const forms = await prisma.form.findMany({
      where: {
        userId,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
    
    // Filter forms to include those with version 2.0 or with "2.0" in their name
    const form2Models = forms.filter(form => {
      // Check if the form name contains "2.0" - this is a strong indicator it's a Form 2.0 form
      if (form.name && form.name.includes('2.0')) {
        info(`Including form ${form.id} (${form.name}) as Form 2.0 based on name`, 'forms');
        return true;
      }
      
      try {
        // If no fields, check if we already included it based on name
        if (!form.fields) return false;
        
        // Handle both string and object types for fields
        let fieldsObj;
        if (typeof form.fields === 'string') {
          fieldsObj = JSON.parse(form.fields);
        } else {
          fieldsObj = form.fields;
        }
        
        // Check for version 2.0 specifically
        return fieldsObj.version === '2.0';
      } catch (e) {
        error('Error parsing form fields:', 'forms', { error: e, formId: form.id });
        return false;
      }
    });
    
    info(`Found ${form2Models.length} Form System 2.0 forms out of ${forms.length} total forms`, 'forms');
    
    // Convert to Form2Model format
    return form2Models.map(form => {
      // Extract metadata from fields
      let fieldsObj: any = {};
      try {
        if (form.fields) {
          fieldsObj = typeof form.fields === 'string' 
            ? JSON.parse(form.fields as string) 
            : form.fields;
        }
      } catch (e) {
        error('Error parsing fields for form', 'forms', { formId: form.id, error: e });
      }
      
      return {
        id: form.id,
        name: form.name,
        description: form.description || undefined,
        type: form.type,
        isActive: form.isActive,
        userId: form.userId,
        createdAt: form.createdAt,
        updatedAt: form.updatedAt,
        isMultiPage: form.isMultiPage,
        // Use metadata from fields object if available
        submitButtonText: fieldsObj.submitButtonText || undefined,
        successMessage: fieldsObj.successMessage || undefined,
        fields: typeof form.fields === 'string' ? form.fields : JSON.stringify(form.fields),
        sections: form.sections ? (typeof form.sections === 'string' ? form.sections : JSON.stringify(form.sections)) : undefined
      };
    });
  }

  /**
   * Get a form by ID with caching
   */
  async getFormById(id: string): Promise<Form2Model | null> {
    // Check cache first
    if (formCache[id]) {
      const cachedForm = formCache[id];
      const now = Date.now();
      
      // If cache is still valid
      if (now - cachedForm.timestamp < CACHE_TTL) {
        info(`Using cached form for ID: ${id}`, 'forms');
        return cachedForm.form;
      }
    }
    
    // Cache miss or expired, fetch from database
    const form = await prisma.form.findUnique({
      where: {
        id,
      },
    }) as unknown as Form2Model | null;
    
    // Cache the result if found
    if (form) {
      formCache[id] = {
        form,
        timestamp: Date.now()
      };
      info(`Cached form for ID: ${id}`, 'forms');
    }
    
    return form;
  }

  /**
   * Create a new form
   */
  async createForm(data: {
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
  }): Promise<Form> {
    // Extract fields that don't match the database schema
    const { title, isPublic, type, submitButtonText, successMessage, formConfig, ...restData } = data;
    
    // Convert string type to FormType enum
    const formType = type === 'booking' ? FormType.BOOKING : FormType.INQUIRY;
    
    // Create the form
    const form = await prisma.form.create({
      data: {
        ...restData,
        // Use name field instead of title to match the database schema
        name: data.name || title,
        isActive: data.isActive ?? true,
        type: formType,
        // Store version and other custom fields in the fields JSON field
        fields: JSON.stringify({
          version: '2.0',
          isPublic: isPublic ?? false,
          submitButtonText,
          successMessage
        }),
      },
    });
    
    // If formConfig is provided, create sections and fields
    if (formConfig) {
      await saveFormSectionsAndFields(form.id, formConfig);
    }
    
    return form;
  }

  /**
   * Update a form
   */
  async updateForm(id: string, data: any): Promise<Form> {
    const { 
      name, 
      description, 
      isActive, 
      isMultiPage, 
      type, 
      fields, 
      sections, 
      submitButtonText, 
      successMessage, 
      isPublic, 
      metadata,
      updatedAt
    } = data;
    
    console.log('Repository updateForm received isPublic:', isPublic);
    // If we have fields that need to be updated in the JSON, parse and update
    let updatedFields = undefined;
    if (submitButtonText !== undefined || successMessage !== undefined || isPublic !== undefined) {
      try {
        // Get existing form to extract current fields
        const existingForm = await this.getFormById(id);
        if (!existingForm) {
          throw new Error(`Form not found: ${id}`);
        }
        
        // Parse existing fields
        let fieldsObj = {};
        if (existingForm.fields) {
          fieldsObj = typeof existingForm.fields === 'string' 
            ? JSON.parse(existingForm.fields) 
            : existingForm.fields;
        }
        
        // Update fields with new values
        const updatedFieldsObj = {
          ...fieldsObj,
          ...(submitButtonText !== undefined && { submitButtonText }),
          ...(successMessage !== undefined && { successMessage }),
          ...(isPublic !== undefined && { isPublic }), // Add isPublic to the fields JSON
        };
        
        console.log('Updated fields object with isPublic:', updatedFieldsObj);
        
        // Stringify for database
        updatedFields = JSON.stringify(updatedFieldsObj);
      } catch (e) {
        console.error(`Error updating fields JSON for form ${id}:`, e);
      }
    }
    
    // Convert type string to FormType enum if provided
    let formType = undefined;
    if (type) {
      formType = type === 'BOOKING' ? FormType.BOOKING : FormType.INQUIRY;
    }
    
    console.log('Updating form with:', {
      name: name !== undefined ? name : undefined,
      description: description !== undefined ? description : undefined,
      isActive: isActive !== undefined ? isActive : undefined,
      isMultiPage: isMultiPage !== undefined ? isMultiPage : undefined,
      type: formType,
      fieldsUpdated: !!updatedFields
    });
    
    // Update the form
    return prisma.form.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        description: description !== undefined ? description : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        isMultiPage: isMultiPage !== undefined ? isMultiPage : undefined,
        type: formType,
        updatedAt: updatedAt || new Date(),
        fields: updatedFields
      }
    });
  }

  /**
   * Delete a form
   */
  async deleteForm(id: string): Promise<Form> {
    try {
      // Delete all sections and fields first
      await deleteFormSectionsAndFields(id);
      
      // Then delete the form
      return await prisma.form.delete({
        where: { id }
      });
    } catch (error: any) {
      // Check if this is a foreign key constraint violation
      if (error.code === 'P2003') {
        // Check which relation is causing the constraint violation
        if (error.meta?.field_name?.includes('Booking_formId')) {
          throw new Error('Cannot delete form with associated bookings. Please delete the bookings first.');
        } else if (error.meta?.field_name?.includes('Lead_formId')) {
          throw new Error('Cannot delete form with associated leads. Please delete the leads first.');
        }
      }
      
      // Re-throw the original error if it's not a constraint violation we can handle
      console.error(`Error deleting form ${id}:`, error);
      throw error;
    }
  }

  /**
   * Save form configuration
   */
  async saveFormConfig(formConfig: FormConfig, userId: string): Promise<Form> {
    // Check if a form with this title already exists for this user
    const existingForm = await prisma.form.findFirst({
      where: {
        name: formConfig.title,
        userId
      }
    });
    
    if (existingForm) {
      console.log(`Form with title "${formConfig.title}" already exists, updating instead of creating new`);
      // Update the existing form instead of creating a new one
      return this.updateFormConfig(existingForm.id, formConfig);
    }
    
    // Create a new form if no existing form found
    const form = await this.createForm({
      title: formConfig.title,
      description: formConfig.description,
      type: 'inquiry', // Default to inquiry
      userId,
      isActive: true,
      isPublic: false,
      submitButtonText: formConfig.submitButtonText || '',
      successMessage: formConfig.successMessage || '',
      // Remove formConfig as it's not part of the expected parameters
    });
    
    return form;
  }

  /**
   * Update an existing form's configuration
   */
  async updateFormConfig(formId: string, formConfig: FormConfig): Promise<Form> {
    console.log(`Starting updateFormConfig for form ${formId}`);
    console.log(`Form config has ${formConfig.sections?.length || 0} sections`);
    
    // First check if the form exists
    const existingForm = await this.getFormById(formId);
    
    if (!existingForm) {
      console.error(`Form not found: ${formId}`);
      throw new Error(`Form not found: ${formId}`);
    }
    
    console.log(`Found existing form: ${existingForm.id}, name: ${existingForm.name}`);
    
    // Extract form metadata from formConfig
    const { submitButtonText, successMessage, isMultiPage, isPublic } = formConfig;
    
    // Get existing fields data to preserve version and other metadata
    const existingMetadata = extractFormMetadata(existingForm.fields || null);
    console.log('Extracted existing metadata:', existingMetadata);
    
    // Update fields data with new values
    const updatedMetadata = {
      ...existingMetadata,
      submitButtonText,
      successMessage,
      isPublic: isPublic !== undefined ? isPublic : existingMetadata.isPublic
    };
    
    console.log('Updated metadata with isPublic:', updatedMetadata);
    
    try {
      // NO TRANSACTIONS - Do everything sequentially
      
      // Step 1: Get all sections for this form
      console.log('Fetching existing sections...');
      const sections = await prisma.formSection.findMany({
        where: { formId },
        include: { fields: true },
      });
      
      console.log(`Found ${sections.length} sections to delete`);
      
      // Step 2: Delete all fields first (due to foreign key constraints)
      console.log('Deleting existing fields...');
      for (const section of sections) {
        console.log(`Deleting ${section.fields.length} fields from section ${section.id}`);
        
        // Delete all fields in this section one by one
        for (const field of section.fields) {
          await prisma.formField.delete({
            where: { id: field.id },
          });
          console.log(`Deleted field: ${field.id}`);
        }
      }
      
      // Step 3: Delete all sections
      console.log('Deleting existing sections...');
      for (const section of sections) {
        await prisma.formSection.delete({
          where: { id: section.id },
        });
        console.log(`Deleted section: ${section.id}`);
      }
      
      console.log('Successfully deleted all sections and fields');
      
      // Step 4: Create new sections and fields
      console.log('Creating new sections and fields...');
      if (formConfig.sections && formConfig.sections.length > 0) {
        for (const [sectionIndex, section] of formConfig.sections.entries()) {
          const { title, fields } = section;
          
          // Create the section
          const createdSection = await prisma.formSection.create({
            data: {
              title: title || `Section ${sectionIndex + 1}`,
              order: sectionIndex,
              formId,
            },
          });
          
          console.log(`Created section: ${createdSection.id}`);
          
          // Create fields for this section
          if (fields && fields.length > 0) {
            for (const [fieldIndex, field] of fields.entries()) {
              // Extract field properties with safe defaults
              const type = field.type || 'text';
              const label = field.label || '';
              const placeholder = field.placeholder || null;
              const helpText = field.helpText || null;
              const required = field.required || false;
              // Handle options as any type since it varies by field type
              const options = (field as any).options || null;
              
              // Preserve the stableId if it exists, otherwise generate a new one
              const stableId = field.stableId || `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
              
              // Process conditional logic to ensure it uses stableIds
              let conditionalLogic = null;
              if (field.conditionalLogic) {
                try {
                  // Make a deep copy of the conditional logic
                  const logicCopy = JSON.parse(JSON.stringify(field.conditionalLogic));
                  
                  // Ensure the field ID in the conditional logic is using stableId
                  if (logicCopy.when && logicCopy.when.field) {
                    // Find the referenced field to get its stableId
                    const targetFieldId = logicCopy.when.field;
                    
                    // If it's already a stableId (starts with 'item_'), use it as is
                    if (targetFieldId.startsWith('item_')) {
                      console.log(`Field ID ${targetFieldId} in conditional logic is already a stableId`);
                    } else {
                      // Look for the field in the form config to get its stableId
                      let foundStableId = null;
                      let fieldLabel = logicCopy.when.fieldLabel || '';
                      
                      // Search through all sections and fields
                      for (const section of formConfig.sections) {
                        for (const f of section.fields) {
                          // Check by ID first
                          if (f.id === targetFieldId && f.stableId) {
                            foundStableId = f.stableId;
                            // Also store the field label for better matching in the public view
                            fieldLabel = f.label;
                            break;
                          }
                          
                          // If no match by ID, try matching by label
                          if (!foundStableId && f.label && fieldLabel && 
                              f.label.toLowerCase() === fieldLabel.toLowerCase() && 
                              f.stableId) {
                            foundStableId = f.stableId;
                            console.log(`Found field by label match: ${fieldLabel}`);
                            break;
                          }
                        }
                        if (foundStableId) break;
                      }
                      
                      if (foundStableId) {
                        console.log(`Updating conditional logic field ID from ${targetFieldId} to stableId ${foundStableId}`);
                        logicCopy.when.field = foundStableId;
                        // Always include the field label for better matching
                        logicCopy.when.fieldLabel = fieldLabel;
                      } else {
                        console.log(`Could not find stableId for field ${targetFieldId} in conditional logic, using as is`);
                      }
                    }
                  }
                  
                  conditionalLogic = logicCopy;
                } catch (logicError) {
                  console.error('Error processing conditional logic:', logicError);
                  conditionalLogic = field.conditionalLogic;
                }
              }
              
              const mapping = field.mapping ? JSON.stringify(field.mapping) : null;
              const inUseByRules = field.inUseByRules === true;
              
              // Create the field
              try {
                // Ensure options are properly serialized
                let serializedOptions = options;
                if (options && typeof options !== 'string') {
                  try {
                    // Validate each option has id, label, and value
                    const validatedOptions = Array.isArray(options) ? options.map(opt => ({
                      id: opt.id || `option_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                      label: opt.label || '',
                      value: opt.value || ''
                    })) : options;
                    
                    console.log('Validated options for field:', validatedOptions);
                    serializedOptions = validatedOptions;
                  } catch (optError) {
                    console.error('Error validating options:', optError);
                    // Fall back to original options
                    serializedOptions = options;
                  }
                }
                
                const createdField = await prisma.formField.create({
                  data: {
                    type,
                    label: String(label),
                    placeholder: placeholder ? String(placeholder) : null,
                    helpText: helpText ? String(helpText) : null,
                    required,
                    order: fieldIndex,
                    sectionId: createdSection.id,
                    options: serializedOptions || undefined,
                    validation: undefined,
                    conditionalLogic: conditionalLogic || undefined,
                    mapping,
                    stableId: String(field.stableId || `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`),
                    inUseByRules,
                  },
                });
                
                console.log(`Created field: ${createdField.id}`);
              } catch (fieldError) {
                console.error(`Error creating field in section ${createdSection.id}:`, fieldError);
                // Continue with other fields even if one fails
              }
            }
          }
        }
      }
      
      // Step 5: Update the form with the new configuration
      console.log('Updating form with new configuration...');
      console.log('Setting isPublic to:', isPublic);
      
      // Store isPublic in the fields JSON field since it's not a direct column in the database
      const updatedForm = await prisma.form.update({
        where: { id: formId },
        data: {
          name: formConfig.title,
          description: formConfig.description || null, // Ensure description is never undefined
          fields: JSON.stringify(updatedMetadata), // isPublic is included in updatedMetadata
          isMultiPage: isMultiPage || false,
        }
      });
      
      console.log(`Successfully updated form ${formId}`);
      return updatedForm;
    } catch (error) {
      console.error(`Error updating form configuration for ${formId}:`, error);
      throw error;
    }
  }

  /**
   * Convert database models to FormConfig
   */
  async convertToFormConfig(form: Form, sections: any[]): Promise<FormConfig> {
    return convertToFormConfig(form, sections);
  }
}
