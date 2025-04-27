/**
 * Stable ID Migration Utility
 * 
 * This utility helps migrate existing forms to use stable IDs.
 * It can be used to add stable IDs to forms that were created before
 * the stable ID system was implemented.
 * 
 * Key features:
 * - Batch processing of forms
 * - Preservation of existing stable IDs
 * - Logging of migration results
 * - Support for dry runs to preview changes
 */

import prisma from '@/lib/prisma';
import { generateStableId, addStableIdsToFields } from './stableIdGenerator';
import { FormConfig, FieldConfig } from '../core/types';

/**
 * Migrate a single form to use stable IDs
 * 
 * @param formId The ID of the form to migrate
 * @param dryRun If true, don't save changes, just return what would be changed
 * @returns A summary of the migration results
 */
export async function migrateFormToStableIds(formId: string, dryRun: boolean = false): Promise<{
  formId: string;
  fieldsProcessed: number;
  fieldsUpdated: number;
  fieldsWithStableIds: number;
  dryRun: boolean;
  success: boolean;
  error?: string;
}> {
  try {
    // Fetch the form from the database
    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: {
        id: true,
        name: true,
        fields: true,
        sections: true
      }
    });

    if (!form) {
      return {
        formId,
        fieldsProcessed: 0,
        fieldsUpdated: 0,
        fieldsWithStableIds: 0,
        dryRun,
        success: false,
        error: `Form with ID ${formId} not found`
      };
    }

    // Parse the form configuration
    let formConfig: FormConfig | null = null;
    let sections: any[] = [];
    let fieldsProcessed = 0;
    let fieldsUpdated = 0;
    let fieldsWithStableIds = 0;

    // Try to parse the form configuration from different possible locations
    try {
      // First try to parse the sections
      if (form.sections) {
        const parsedSections = typeof form.sections === 'string' 
          ? JSON.parse(form.sections) 
          : form.sections;
          
        if (Array.isArray(parsedSections)) {
          sections = parsedSections;
        }
      }
      
      // If no sections were found, try to parse the fields
      if (sections.length === 0 && form.fields) {
        const parsedFields = typeof form.fields === 'string'
          ? JSON.parse(form.fields)
          : form.fields;
          
        if (Array.isArray(parsedFields)) {
          // Create a default section with the parsed fields
          sections = [{
            id: 'default_section',
            title: 'Default Section',
            fields: parsedFields
          }];
        }
      }
    } catch (error) {
      return {
        formId,
        fieldsProcessed: 0,
        fieldsUpdated: 0,
        fieldsWithStableIds: 0,
        dryRun,
        success: false,
        error: `Error parsing form configuration: ${error instanceof Error ? error.message : String(error)}`
      };
    }

    // Process each section and add stable IDs to fields
    const updatedSections = sections.map(section => {
      // Skip sections without fields
      if (!section.fields || !Array.isArray(section.fields)) {
        return section;
      }
      
      // Count fields before processing
      fieldsProcessed += section.fields.length;
      
      // Count fields that already have stable IDs
      fieldsWithStableIds += section.fields.filter((field: any) => field.stableId).length;
      
      // Add stable IDs to fields
      const fieldsWithStableIdsAdded = section.fields.map((field: any) => {
        // Skip fields that already have stable IDs
        if (field.stableId) {
          return field;
        }
        
        // Generate a stable ID for the field
        const stableId = generateStableId(field, section.title);
        
        // Count updated fields
        fieldsUpdated++;
        
        // Return the field with the stable ID added
        return {
          ...field,
          stableId
        };
      });
      
      // Return the section with updated fields
      return {
        ...section,
        fields: fieldsWithStableIdsAdded
      };
    });

    // If this is a dry run, don't save changes
    if (dryRun) {
      return {
        formId,
        fieldsProcessed,
        fieldsUpdated,
        fieldsWithStableIds,
        dryRun,
        success: true
      };
    }

    // Save the updated form configuration
    await prisma.form.update({
      where: { id: formId },
      data: {
        sections: JSON.stringify(updatedSections)
      }
    });

    return {
      formId,
      fieldsProcessed,
      fieldsUpdated,
      fieldsWithStableIds,
      dryRun,
      success: true
    };
  } catch (error) {
    return {
      formId,
      fieldsProcessed: 0,
      fieldsUpdated: 0,
      fieldsWithStableIds: 0,
      dryRun,
      success: false,
      error: `Error migrating form: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Migrate all forms to use stable IDs
 * 
 * @param dryRun If true, don't save changes, just return what would be changed
 * @returns A summary of the migration results for each form
 */
export async function migrateAllFormsToStableIds(dryRun: boolean = false): Promise<{
  formsProcessed: number;
  formsUpdated: number;
  totalFieldsProcessed: number;
  totalFieldsUpdated: number;
  totalFieldsWithStableIds: number;
  dryRun: boolean;
  results: Array<{
    formId: string;
    formName?: string;
    fieldsProcessed: number;
    fieldsUpdated: number;
    fieldsWithStableIds: number;
    success: boolean;
    error?: string;
  }>;
}> {
  try {
    // Fetch all forms from the database
    const forms = await prisma.form.findMany({
      select: {
        id: true,
        name: true
      }
    });

    // Process each form
    const results = [];
    let formsProcessed = 0;
    let formsUpdated = 0;
    let totalFieldsProcessed = 0;
    let totalFieldsUpdated = 0;
    let totalFieldsWithStableIds = 0;

    for (const form of forms) {
      formsProcessed++;
      
      // Migrate the form
      const result = await migrateFormToStableIds(form.id, dryRun);
      
      // Add form name to the result
      const resultWithName = {
        ...result,
        formName: form.name
      };
      
      // Update totals
      totalFieldsProcessed += result.fieldsProcessed;
      totalFieldsUpdated += result.fieldsUpdated;
      totalFieldsWithStableIds += result.fieldsWithStableIds;
      
      // Count updated forms
      if (result.fieldsUpdated > 0) {
        formsUpdated++;
      }
      
      // Add to results
      results.push(resultWithName);
    }

    return {
      formsProcessed,
      formsUpdated,
      totalFieldsProcessed,
      totalFieldsUpdated,
      totalFieldsWithStableIds,
      dryRun,
      results
    };
  } catch (error) {
    throw new Error(`Error migrating forms: ${error instanceof Error ? error.message : String(error)}`);
  }
}