/**
 * Utility for mapping form field IDs to stable identifiers
 * This helps with email rules that need to reference fields even when IDs change
 */

import prisma from '@/lib/prisma';
import { addApiLog } from '@/pages/api/debug/logs';

/**
 * Maps form field IDs to their corresponding stable identifiers
 * @param formId The ID of the form
 * @param formData The form submission data containing field IDs as keys
 * @returns A new object with both original IDs and mapped stable identifiers
 */
export async function mapFieldIds(formId: string, formData: Record<string, any>): Promise<Record<string, any>> {
  try {
    // Create a copy of the original form data
    const mappedData = { ...formData };
    
    // Get the form with its sections and fields
    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        formSections: {
          include: {
            fields: {
              select: {
                id: true,
                type: true,
                mapping: true,
                label: true,
                stableId: true
              }
            }
          }
        }
      }
    });

    if (!form) {
      addApiLog(`Form not found with ID: ${formId}`, 'error', 'field-mapping');
      return mappedData;
    }

    // Get all fields from all sections
    const fields = form.formSections.flatMap(section => section.fields);
    
    // Log the fields we found for debugging
    addApiLog(`Found ${fields.length} fields in form ${formId}`, 'info', 'field-mapping');
    
    // Create mappings based on field properties
    fields.forEach(field => {
      // Skip fields that don't have a value in the form data
      if (formData[field.id] === undefined) {
        return;
      }
      
      // Add the field value using its ID (original)
      mappedData[field.id] = formData[field.id];
      
      // Add the field value using its stable ID (primary stable identifier)
      if (field.stableId) {
        mappedData[field.stableId] = formData[field.id];
        addApiLog(`Mapped field ${field.id} to stable ID ${field.stableId}`, 'info', 'field-mapping');
      }
      
      // Add mappings based on additional field properties for backward compatibility
      
      // 1. Use the mapping property if available
      if (field.mapping) {
        mappedData[field.mapping] = formData[field.id];
        addApiLog(`Mapped field ${field.id} to ${field.mapping}`, 'info', 'field-mapping');
      }
      
      // 2. Use the field label converted to camelCase as a fallback
      if (field.label) {
        const camelCaseLabel = field.label
          .toLowerCase()
          .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
          .replace(/[^a-zA-Z0-9]+/g, '')
          .replace(/^[A-Z]/, firstChar => firstChar.toLowerCase());
        
        if (camelCaseLabel && camelCaseLabel !== field.mapping) {
          mappedData[camelCaseLabel] = formData[field.id];
          addApiLog(`Mapped field ${field.id} to ${camelCaseLabel} (from label)`, 'info', 'field-mapping');
        }
      }
      
      // 3. Use field type as a mapping for common fields
      if (field.type === 'email') {
        mappedData['email'] = formData[field.id];
        addApiLog(`Mapped field ${field.id} to email (from type)`, 'info', 'field-mapping');
      } else if (field.type === 'tel') {
        mappedData['phone'] = formData[field.id];
        addApiLog(`Mapped field ${field.id} to phone (from type)`, 'info', 'field-mapping');
      }
    });
    
    // Log the keys in the mapped data for debugging
    addApiLog(`Mapped data keys: ${Object.keys(mappedData).join(', ')}`, 'info', 'field-mapping');
    
    return mappedData;
  } catch (error) {
    addApiLog(`Error mapping field IDs: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'field-mapping');
    return formData; // Return original data if mapping fails
  }
}

/**
 * Maps a specific field ID to a stable identifier
 * @param formId The ID of the form
 * @param fieldId The field ID to map
 * @returns The stable identifier for the field, or the original ID if not found
 */
export async function mapSingleFieldId(formId: string, fieldId: string): Promise<string> {
  try {
    // Get the form with its sections and fields
    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        formSections: {
          include: {
            fields: {
              where: { id: fieldId },
              select: {
                id: true,
                mapping: true,
                label: true,
                stableId: true
              }
            }
          }
        }
      }
    });

    if (!form) {
      addApiLog(`Form not found with ID: ${formId}`, 'error', 'field-mapping');
      return fieldId;
    }

    // Find the field in all sections
    const field = form.formSections.flatMap(section => section.fields)[0];
    
    if (!field) {
      addApiLog(`Field not found with ID: ${fieldId} in form ${formId}`, 'error', 'field-mapping');
      return fieldId;
    }
    
    // Return the stableId if available (primary stable identifier)
    if (field.stableId) {
      addApiLog(`Mapped field ${fieldId} to stable ID ${field.stableId}`, 'info', 'field-mapping');
      return field.stableId;
    }
    
    // Return the mapping if available as fallback
    if (field.mapping) {
      addApiLog(`Mapped field ${fieldId} to ${field.mapping}`, 'info', 'field-mapping');
      return field.mapping;
    }
    
    // Use the field label as a fallback
    if (field.label) {
      const camelCaseLabel = field.label
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
        .replace(/[^a-zA-Z0-9]+/g, '')
        .replace(/^[A-Z]/, firstChar => firstChar.toLowerCase());
      
      if (camelCaseLabel) {
        addApiLog(`Mapped field ${fieldId} to ${camelCaseLabel} (from label)`, 'info', 'field-mapping');
        return camelCaseLabel;
      }
    }
    
    // Return the original ID if no mapping is found
    return fieldId;
  } catch (error) {
    addApiLog(`Error mapping field ID: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'field-mapping');
    return fieldId; // Return original ID if mapping fails
  }
}

/**
 * Finds a field ID in form data based on a stable identifier
 * @param formId The ID of the form
 * @param stableId The stable identifier to look for
 * @param formData The form submission data
 * @returns The field value if found, or undefined if not found
 */
export async function findFieldValueByStableId(formId: string, stableId: string, formData: Record<string, any>): Promise<any> {
  try {
    // First check if the stable ID exists directly in the form data
    if (formData[stableId] !== undefined) {
      return formData[stableId];
    }
    
    // Get the form with its sections and fields
    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        formSections: {
          include: {
            fields: {
              select: {
                id: true,
                mapping: true,
                label: true,
                type: true,
                stableId: true
              }
            }
          }
        }
      }
    });

    if (!form) {
      addApiLog(`Form not found with ID: ${formId}`, 'error', 'field-mapping');
      return undefined;
    }

    // Get all fields from all sections
    const fields = form.formSections.flatMap(section => section.fields);
    
    // Find a field with a matching stableId
    const fieldWithStableId = fields.find(field => field.stableId === stableId);
    if (fieldWithStableId && formData[fieldWithStableId.id] !== undefined) {
      addApiLog(`Found field ${fieldWithStableId.id} with stable ID ${stableId}`, 'info', 'field-mapping');
      return formData[fieldWithStableId.id];
    }
    
    // Find a field with a matching mapping
    const fieldWithMapping = fields.find(field => field.mapping === stableId);
    if (fieldWithMapping && formData[fieldWithMapping.id] !== undefined) {
      addApiLog(`Found field ${fieldWithMapping.id} with mapping ${stableId}`, 'info', 'field-mapping');
      return formData[fieldWithMapping.id];
    }
    
    // Find a field with a matching label
    const fieldWithMatchingLabel = fields.find(field => {
      if (!field.label) return false;
      
      const camelCaseLabel = field.label
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
        .replace(/[^a-zA-Z0-9]+/g, '')
        .replace(/^[A-Z]/, firstChar => firstChar.toLowerCase());
      
      return camelCaseLabel === stableId;
    });
    
    if (fieldWithMatchingLabel && formData[fieldWithMatchingLabel.id] !== undefined) {
      addApiLog(`Found field ${fieldWithMatchingLabel.id} with label matching ${stableId}`, 'info', 'field-mapping');
      return formData[fieldWithMatchingLabel.id];
    }
    
    // Find a field with a matching type for common fields
    if (stableId === 'email') {
      const emailField = fields.find(field => field.type === 'email');
      if (emailField && formData[emailField.id] !== undefined) {
        addApiLog(`Found email field ${emailField.id} for stable ID ${stableId}`, 'info', 'field-mapping');
        return formData[emailField.id];
      }
    } else if (stableId === 'phone') {
      const phoneField = fields.find(field => field.type === 'tel');
      if (phoneField && formData[phoneField.id] !== undefined) {
        addApiLog(`Found phone field ${phoneField.id} for stable ID ${stableId}`, 'info', 'field-mapping');
        return formData[phoneField.id];
      }
    }
    
    // If all else fails, look for a field ID that contains the stable ID
    const fieldWithIdContainingStableId = Object.keys(formData).find(key => 
      key.includes(stableId) || stableId.includes(key)
    );
    
    if (fieldWithIdContainingStableId) {
      addApiLog(`Found field ${fieldWithIdContainingStableId} containing stable ID ${stableId}`, 'info', 'field-mapping');
      return formData[fieldWithIdContainingStableId];
    }
    
    addApiLog(`No field found for stable ID ${stableId}`, 'error', 'field-mapping');
    return undefined;
  } catch (error) {
    addApiLog(`Error finding field value by stable ID: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'field-mapping');
    return undefined;
  }
}

/**
 * Checks if a field is used in any email rules
 * @param fieldId The ID of the field to check
 * @param formId The ID of the form containing the field
 * @returns True if the field is used in any rules, false otherwise
 */
export async function isFieldUsedInRules(fieldId: string, formId: string): Promise<boolean> {
  try {
    // Get the field to find its stableId
    const field = await prisma.formField.findUnique({
      where: { id: fieldId },
      select: { stableId: true, mapping: true }
    });

    if (!field) {
      addApiLog(`Field not found with ID: ${fieldId}`, 'error', 'field-mapping');
      return false;
    }

    // Get all email rules for this form
    const rules = await prisma.emailRule.findMany({
      where: { formId },
      select: { id: true, conditions: true }
    });

    // Check if any rule conditions reference this field's stableId or mapping
    for (const rule of rules) {
      const conditions = rule.conditions as Record<string, any>;
      
      // Check if conditions contain references to the field's stableId or mapping
      const conditionsStr = JSON.stringify(conditions);
      
      if (
        (field.stableId && conditionsStr.includes(field.stableId)) ||
        (field.mapping && conditionsStr.includes(field.mapping))
      ) {
        addApiLog(`Field ${fieldId} is used in rule ${rule.id}`, 'info', 'field-mapping');
        return true;
      }
    }

    return false;
  } catch (error) {
    addApiLog(`Error checking if field is used in rules: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'field-mapping');
    return false;
  }
}

/**
 * Updates the inUseByRules flag for a field based on whether it's used in any email rules
 * @param fieldId The ID of the field to update
 * @param formId The ID of the form containing the field
 */
export async function updateFieldRuleUsage(fieldId: string, formId: string): Promise<void> {
  try {
    const isUsed = await isFieldUsedInRules(fieldId, formId);
    
    await prisma.formField.update({
      where: { id: fieldId },
      data: { inUseByRules: isUsed }
    });
    
    addApiLog(`Updated inUseByRules flag for field ${fieldId} to ${isUsed}`, 'info', 'field-mapping');
  } catch (error) {
    addApiLog(`Error updating field rule usage: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'field-mapping');
  }
}

/**
 * Updates the inUseByRules flag for all fields in a form
 * @param formId The ID of the form
 */
export async function updateAllFieldsRuleUsage(formId: string): Promise<void> {
  try {
    // Get all fields for this form
    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        formSections: {
          include: {
            fields: {
              select: {
                id: true
              }
            }
          }
        }
      }
    });

    if (!form) {
      addApiLog(`Form not found with ID: ${formId}`, 'error', 'field-mapping');
      return;
    }

    // Get all fields from all sections
    const fields = form.formSections.flatMap(section => section.fields);
    
    // Update each field's inUseByRules flag
    for (const field of fields) {
      await updateFieldRuleUsage(field.id, formId);
    }
    
    addApiLog(`Updated inUseByRules flag for all fields in form ${formId}`, 'info', 'field-mapping');
  } catch (error) {
    addApiLog(`Error updating all fields rule usage: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'field-mapping');
  }
}