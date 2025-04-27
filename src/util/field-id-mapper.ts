/**
 * DEPRECATED: Legacy Field ID Mapper (Forms 1.0)
 * 
 * This file is deprecated and will be removed in a future version.
 * Please use the Form System 2.0 condition evaluation system instead:
 * - src/lib/emails2/conditions.ts
 */

import prisma from '@/lib/prisma';
import { addApiLog } from '@/pages/api/debug/logs';
import { evaluateConditions } from '@/lib/emails2/conditions';

/**
 * DEPRECATED: Maps form field IDs to their corresponding stable identifiers
 * @param formId The ID of the form
 * @param formData The form submission data containing field IDs as keys
 * @returns A new object with both original IDs and mapped stable identifiers
 */
export async function mapFieldIds(formId: string, formData: Record<string, any>): Promise<Record<string, any>> {
  console.log(`[DEPRECATED] Using legacy field ID mapper. Please migrate to Form System 2.0.`);
  
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
 * DEPRECATED: Maps a specific field ID to a stable identifier
 * @param formId The ID of the form
 * @param fieldId The field ID to map
 * @returns The stable identifier for the field, or the original ID if not found
 */
export async function mapSingleFieldId(formId: string, fieldId: string): Promise<string> {
  console.log(`[DEPRECATED] Using legacy mapSingleFieldId. Please migrate to Form System 2.0.`);
  
  try {
    // Get the field from the database
    const field = await prisma.formField.findUnique({
      where: { id: fieldId },
      select: {
        id: true,
        stableId: true,
        mapping: true
      }
    });

    if (!field) {
      addApiLog(`Field not found with ID: ${fieldId}`, 'error', 'field-mapping');
      return fieldId; // Return original ID if field not found
    }

    // Return the stable ID if available, otherwise the mapping, otherwise the original ID
    if (field.stableId) {
      addApiLog(`Mapped field ${fieldId} to stable ID ${field.stableId}`, 'info', 'field-mapping');
      return field.stableId;
    } else if (field.mapping) {
      addApiLog(`Mapped field ${fieldId} to ${field.mapping}`, 'info', 'field-mapping');
      return field.mapping;
    } else {
      addApiLog(`No mapping found for field ${fieldId}, using original ID`, 'info', 'field-mapping');
      return fieldId;
    }
  } catch (error) {
    addApiLog(`Error mapping field ID: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'field-mapping');
    return fieldId; // Return original ID if mapping fails
  }
}

/**
 * DEPRECATED: Finds a field ID in form data based on a stable identifier
 * @param formId The ID of the form
 * @param stableId The stable identifier to look for
 * @param formData The form submission data
 * @returns The field value if found, or undefined if not found
 */
export async function findFieldValueByStableId(formId: string, stableId: string, formData: Record<string, any>): Promise<any> {
  console.log(`[DEPRECATED] Using legacy findFieldValueByStableId. Please migrate to Form System 2.0.`);
  
  // First, check if the stable ID is directly in the form data
  if (formData[stableId] !== undefined) {
    return formData[stableId];
  }

  // Create a mock condition for the Form System 2.0 evaluateConditions function
  const mockCondition = {
    fieldStableId: stableId,
    operator: 'isNotEmpty',
    value: ''
  };

  // Use the Form System 2.0 condition evaluation which has built-in field matching
  const conditionMet = evaluateConditions([mockCondition], formData);
  
  // If the condition was met, it means the field was found
  if (conditionMet) {
    // Unfortunately we can't directly get the value from evaluateConditions
    // So we need to find it in the form data
    
    try {
      // Get the form with its sections and fields
      const form = await prisma.form.findUnique({
        where: { id: formId },
        include: {
          formSections: {
            include: {
              fields: {
                select: {
                  id: true,
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
      
      // Find the field with the matching stable ID
      const field = fields.find(f => f.stableId === stableId);
      
      if (field) {
        return formData[field.id];
      }
      
      // If we still haven't found it, look for a field ID that contains the stable ID
      const fieldWithIdContainingStableId = Object.keys(formData).find(key => 
        key.includes(stableId) || (typeof formData[key] === 'object' && formData[key]?.stableId === stableId)
      );
      
      if (fieldWithIdContainingStableId) {
        return formData[fieldWithIdContainingStableId];
      }
      
      addApiLog(`No field found for stable ID ${stableId}`, 'error', 'field-mapping');
      return undefined;
    } catch (error) {
      addApiLog(`Error finding field value by stable ID: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'field-mapping');
      return undefined;
    }
  }
  
  return undefined;
}

/**
 * DEPRECATED: Checks if a field is used in any email rules
 * @param fieldId The ID of the field to check
 * @param formId The ID of the form containing the field
 * @returns True if the field is used in any rules, false otherwise
 */
export async function isFieldUsedInRules(fieldId: string, formId: string): Promise<boolean> {
  console.log(`[DEPRECATED] Using legacy isFieldUsedInRules. Please migrate to Form System 2.0.`);
  
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
 * DEPRECATED: Updates the inUseByRules flag for a field based on whether it's used in any email rules
 * @param fieldId The ID of the field to update
 * @param formId The ID of the form containing the field
 */
export async function updateFieldRuleUsage(fieldId: string, formId: string): Promise<void> {
  console.log(`[DEPRECATED] Using legacy updateFieldRuleUsage. Please migrate to Form System 2.0.`);
  
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
 * DEPRECATED: Updates the inUseByRules flag for all fields in a form
 * @param formId The ID of the form
 */
export async function updateAllFieldsRuleUsage(formId: string): Promise<void> {
  console.log(`[DEPRECATED] Using legacy updateAllFieldsRuleUsage. Please migrate to Form System 2.0.`);
  
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
