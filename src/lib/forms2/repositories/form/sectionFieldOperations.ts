/**
 * Form Section and Field Operations
 * 
 * This file contains operations for managing form sections and fields.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../baseRepository';
import { FormConfig, FormSection, FieldConfig } from '../../core/types';
import * as logger from '@/util/logger';

// Import the correct LogSource type from the logger module
type LogSource = 'leads' | 'bookings' | 'emails' | 'forms' | 'invoices' | 'api' | 'auth' | 'system' | 'other';

// Use the correct log source for forms
const FORMS_LOG_SOURCE: LogSource = 'forms';

// Define a more comprehensive field config type that includes all properties we need
interface ExtendedFieldConfig {
  id: string;
  type: string;
  label: string;
  name?: string;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  order?: number;
  stableId?: string;
  inUseByRules?: boolean;
  conditionalLogic?: any;
  mapping?: any;
  [key: string]: any; // Allow for any additional properties
}

/**
 * Save form sections and fields
 */
export async function saveFormSectionsAndFields(formId: string, formConfig: FormConfig): Promise<void> {
  console.log(`Saving form configuration for form ${formId}`);
  logger.info(`Saving form configuration for form ${formId} with ${formConfig.sections?.length || 0} sections`, FORMS_LOG_SOURCE);
  
  // Validate formConfig structure
  if (!formConfig) {
    const error = new Error('Form configuration is null or undefined');
    console.error('Invalid form configuration:', error);
    logger.error(`Invalid form configuration: ${error.message}`, FORMS_LOG_SOURCE);
    throw error;
  }
  
  if (!formConfig.sections || !Array.isArray(formConfig.sections)) {
    const error = new Error(`Form sections is not an array: ${typeof formConfig.sections}`);
    console.error('Invalid form sections:', error);
    logger.error(`Invalid form sections: ${error.message}`, FORMS_LOG_SOURCE);
    throw error;
  }
  
  console.log(`Processing ${formConfig.sections.length} sections`);
  
  // Create sections and fields based on the formConfig
  for (const section of formConfig.sections) {
    console.log(`Processing section: ${section.title}, with ${section.fields?.length || 0} fields`);
    
    // Process conditional logic for the section
    let sectionConditionalLogicJson = null;
    if (section.conditionalLogic) {
      try {
        sectionConditionalLogicJson = JSON.stringify(section.conditionalLogic);
      } catch (error) {
        console.error('Error stringifying section conditional logic:', error);
        logger.error(`Error stringifying section conditional logic: ${error instanceof Error ? error.message : String(error)}`, FORMS_LOG_SOURCE);
      }
    }
    
    try {
      // Create the section
      const createdSection = await prisma.formSection.create({
        data: {
          title: section.title,
          description: section.description || null,
          order: typeof section.order === 'number' ? section.order : 0,
          formId: formId,
          // Store conditional logic as JSON in the database
          // This assumes the schema has been updated to support it
          ...(sectionConditionalLogicJson ? { conditionalLogic: JSON.parse(sectionConditionalLogicJson) as Prisma.JsonObject } : {})
        },
      });

      console.log(`Created section ${createdSection.id} with ${section.fields?.length || 0} fields`);
      logger.info(`Created section ${createdSection.id} with ${section.fields?.length || 0} fields`, FORMS_LOG_SOURCE);

      // Validate fields array
      if (!section.fields || !Array.isArray(section.fields)) {
        const error = new Error(`Section fields is not an array: ${typeof section.fields}`);
        console.error('Invalid section fields:', error);
        logger.error(`Invalid section fields: ${error.message}`, FORMS_LOG_SOURCE);
        throw error;
      }
      
      // Create fields for this section
      await createFieldsForSection(createdSection.id, section.fields);
    } catch (error) {
      console.error(`Error creating section for form ${formId}:`, error);
      logger.error(`Error creating section for form ${formId}: ${error instanceof Error ? error.message : String(error)}`, FORMS_LOG_SOURCE);
      throw error;
    }
  }
}

/**
 * Create fields for a section
 */
async function createFieldsForSection(sectionId: string, fields: ExtendedFieldConfig[]): Promise<void> {
  console.log(`Creating ${fields.length} fields for section ${sectionId}`);
  
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    console.log(`Processing field ${i+1}/${fields.length}: ${field.id} of type ${field.type}`);
    
    try {
      // Extract field properties
      const { 
        id, type, label, placeholder, helpText, required, 
        order, stableId, inUseByRules, conditionalLogic, mapping, name,
        // Ignore any other properties not in the schema
        ...otherProps 
      } = field;

      // Log field details for debugging
      console.log(`Field details: id=${id}, type=${type}, label=${label}, required=${required}`);
      logger.debug(`Processing field ${id} of type ${type}, required: ${required}`, FORMS_LOG_SOURCE);

      // Automatically set up mappings for common field types if not already defined
      let fieldMapping = mapping;
      if (!fieldMapping) {
        if (type === 'email') {
          fieldMapping = { type: 'email', value: 'email' };
        } else if (type === 'tel') {
          fieldMapping = { type: 'phone', value: 'phone' };
        } else if (label?.toLowerCase().includes('name') && type === 'text') {
          fieldMapping = { type: 'name', value: 'name' };
        }
      }

      // Prepare conditional logic for storage
      let fieldConditionalLogic = null;
      if (conditionalLogic) {
        console.log(`Field ${id} has conditional logic:`, conditionalLogic);
        try {
          // If conditionalLogic is already a string, use it directly
          if (typeof conditionalLogic === 'string') {
            fieldConditionalLogic = conditionalLogic;
          } else {
            // Otherwise stringify the object
            fieldConditionalLogic = JSON.stringify(conditionalLogic);
          }
        } catch (error) {
          console.error(`Error stringifying conditional logic for field ${id}:`, error);
          logger.error(`Error stringifying field conditional logic: ${error instanceof Error ? error.message : String(error)}`, FORMS_LOG_SOURCE);
        }
      }

      // Include the name in the options JSON since it's not a direct field in the database schema
      if (name) {
        otherProps.name = name;
      }
      
      // Store type-specific config in options if needed
      const options = Object.keys(otherProps).length > 0 ? JSON.stringify(otherProps) : null;
      if (options) {
        console.log(`Field ${id} has additional options:`, otherProps);
      }

      // Ensure required is properly handled as a boolean
      const isRequired = required === true;

      // Create the field with explicit type handling
      console.log(`Creating field in database: ${id}, type=${type}, section=${sectionId}`);
      const createdField = await prisma.formField.create({
        data: {
          type: String(type),
          label: String(label || ''),
          // Remove the name field as it's not in the database schema
          // We've stored it in the options JSON instead
          placeholder: placeholder ? String(placeholder) : null,
          helpText: helpText ? String(helpText) : null,
          required: isRequired, // Explicitly use the boolean value
          order: typeof order === 'number' ? order : 0,
          sectionId: sectionId,
          options: options ? (options as any) : Prisma.JsonNull,
          validation: Prisma.JsonNull,
          conditionalLogic: fieldConditionalLogic ? (fieldConditionalLogic as any) : Prisma.JsonNull,
          mapping: fieldMapping ? JSON.stringify(fieldMapping) : null,
          stableId: String(stableId || id),
          inUseByRules: inUseByRules === true,
        },
      });
      console.log(`Successfully created field: ${createdField.id}`);
    } catch (error) {
      console.error(`Error creating field in section ${sectionId}:`, error);
      logger.error(`Error creating field in section ${sectionId}: ${error instanceof Error ? error.message : String(error)}`, FORMS_LOG_SOURCE);
      throw error; // Re-throw to ensure the transaction fails
    }
  }
  
  console.log(`Successfully created all ${fields.length} fields for section ${sectionId}`);
}

/**
 * Delete form sections and fields
 */
export async function deleteFormSectionsAndFields(formId: string): Promise<void> {
  logger.info(`Deleting existing sections and fields for form ${formId}`, FORMS_LOG_SOURCE);
  
  try {
    // Get all sections for this form
    const sections = await prisma.formSection.findMany({
      where: { formId },
      include: { fields: true },
    });

    logger.info(`Found ${sections.length} sections to delete`, FORMS_LOG_SOURCE);

    // Use a single transaction for all deletions to ensure consistency
    await prisma.$transaction(async (tx) => {
      // Delete all fields first (due to foreign key constraints)
      for (const section of sections) {
        logger.info(`Deleting ${section.fields.length} fields from section ${section.id}`, FORMS_LOG_SOURCE);
        
        // Delete all fields in this section
        for (const field of section.fields) {
          await tx.formField.delete({
            where: { id: field.id },
          });
        }
        
        // Then delete the section
        await tx.formSection.delete({
          where: { id: section.id },
        });
      }
      
      logger.info(`Successfully deleted all sections and fields for form ${formId}`, FORMS_LOG_SOURCE);
    });
  } catch (error) {
    logger.error(`Error deleting form sections and fields for form ${formId}: ${error instanceof Error ? error.message : String(error)}`, FORMS_LOG_SOURCE);
    throw error; // Re-throw to ensure the caller knows about the failure
  }
}
