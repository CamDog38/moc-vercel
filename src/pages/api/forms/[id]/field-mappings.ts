import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import { addApiLog } from '../../debug/logs';
import { updateAllFieldsRuleUsage } from '@/util/field-id-mapper';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check authentication
  const supabase = createClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Form ID is required' });
  }

  // Handle different HTTP methods
  if (req.method === 'GET') {
    return getFieldMappings(req, res, id, user.id);
  } else if (req.method === 'PUT') {
    return updateFieldMapping(req, res, id, user.id);
  } else if (req.method === 'POST' && req.query.action === 'update-rules') {
    return updateRulesToUseStableIds(req, res, id, user.id);
  } else if (req.method === 'POST' && req.query.action === 'bulk-update-rules') {
    return bulkUpdateRules(req, res, id, user.id);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function getFieldMappings(req: NextApiRequest, res: NextApiResponse, formId: string, userId: string) {
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
                type: true,
                mapping: true,
                label: true,
                stableId: true,
                inUseByRules: true
              }
            }
          }
        }
      }
    });

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    // Check if the user has access to this form
    if (form.userId !== userId) {
      return res.status(403).json({ error: 'You do not have access to this form' });
    }

    // Get all email rules for this form to find which rules reference each field
    const emailRules = await prisma.emailRule.findMany({
      where: { formId },
      select: {
        id: true,
        name: true,
        conditions: true,
        recipientType: true,
        recipientField: true
      }
    });

    // Process the form fields to create mapping information
    const fieldMappings = [];
    
    if (form.formSections && form.formSections.length > 0) {
      for (const section of form.formSections) {
        if (section.fields && section.fields.length > 0) {
          for (const field of section.fields) {
            const mappedTo = [];
            
            // Add the stable ID as the primary identifier
            mappedTo.push(field.stableId);
            
            // Add the field ID itself
            mappedTo.push(field.id);
            
            // Add the mapping if available
            if (field.mapping) {
              mappedTo.push(field.mapping);
            }
            
            // Add camelCase label as a potential mapping
            if (field.label) {
              const camelCaseLabel = field.label
                .toLowerCase()
                .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
                .replace(/[^a-zA-Z0-9]+/g, '')
                .replace(/^[A-Z]/, firstChar => firstChar.toLowerCase());
              
              if (camelCaseLabel && !mappedTo.includes(camelCaseLabel)) {
                mappedTo.push(camelCaseLabel);
              }
            }
            
            // Add common mappings for specific field types
            if (field.type === 'email' && !mappedTo.includes('email')) {
              mappedTo.push('email');
            } else if (field.type === 'tel' && !mappedTo.includes('phone')) {
              mappedTo.push('phone');
            }
            
            // Find which email rules reference this field
            const referencingRules = [];
            for (const rule of emailRules) {
              // Check if the rule uses this field in conditions
              let isReferenced = false;
              
              // Check in conditions
              const conditionsStr = typeof rule.conditions === 'string' 
                ? rule.conditions 
                : JSON.stringify(rule.conditions);
              
              // Check if any of the field identifiers are referenced in the conditions
              if (
                (field.stableId && conditionsStr.includes(field.stableId)) ||
                conditionsStr.includes(field.id) ||
                (field.mapping && conditionsStr.includes(field.mapping))
              ) {
                isReferenced = true;
              }
              
              // Check if the field is used as a recipient field
              if (rule.recipientType === 'field' && rule.recipientField === field.id) {
                isReferenced = true;
              }
              
              if (isReferenced) {
                referencingRules.push({
                  id: rule.id,
                  name: rule.name
                });
              }
            }
            
            fieldMappings.push({
              fieldId: field.id,
              fieldLabel: field.label || 'Unnamed Field',
              mappedTo,
              fieldType: field.type,
              stableId: field.stableId,
              inUseByRules: field.inUseByRules,
              referencingRules
            });
          }
        }
      }
    }

    // Update the inUseByRules flag for all fields in the background
    updateAllFieldsRuleUsage(formId).catch(error => {
      console.error('Error updating field rule usage:', error);
      addApiLog(`Error updating field rule usage: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'field-mappings');
    });

    return res.status(200).json({
      formId: form.id,
      formName: form.name,
      fieldMappings
    });
  } catch (error) {
    console.error('Error fetching field mappings:', error);
    addApiLog(`Error fetching field mappings: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'field-mappings');
    return res.status(500).json({ error: 'Failed to fetch field mappings' });
  }
}

async function updateFieldMapping(req: NextApiRequest, res: NextApiResponse, formId: string, userId: string) {
  try {
    const { fieldId, mapping } = req.body;

    if (!fieldId) {
      return res.status(400).json({ error: 'Field ID is required' });
    }

    // Get the form to check ownership
    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: { userId: true }
    });

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    // Check if the user has access to this form
    if (form.userId !== userId) {
      return res.status(403).json({ error: 'You do not have access to this form' });
    }

    // Update the field mapping
    const updatedField = await prisma.formField.update({
      where: { id: fieldId },
      data: { mapping },
      select: {
        id: true,
        mapping: true,
        stableId: true
      }
    });

    return res.status(200).json({
      success: true,
      field: updatedField
    });
  } catch (error) {
    console.error('Error updating field mapping:', error);
    addApiLog(`Error updating field mapping: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'field-mappings');
    return res.status(500).json({ error: 'Failed to update field mapping' });
  }
}

/**
 * Updates email rules to use stable IDs instead of ephemeral IDs
 */
async function updateRulesToUseStableIds(req: NextApiRequest, res: NextApiResponse, formId: string, userId: string) {
  try {
    const { fieldIds, ruleIds } = req.body;

    if (!fieldIds || !Array.isArray(fieldIds) || fieldIds.length === 0) {
      return res.status(400).json({ error: 'Field IDs are required' });
    }

    if (!ruleIds || !Array.isArray(ruleIds) || ruleIds.length === 0) {
      return res.status(400).json({ error: 'Rule IDs are required' });
    }

    // Get the form to check ownership
    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: { userId: true }
    });

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    // Check if the user has access to this form
    if (form.userId !== userId) {
      return res.status(403).json({ error: 'You do not have access to this form' });
    }

    // Get the fields with their stable IDs
    const fields = await prisma.formField.findMany({
      where: {
        id: { in: fieldIds }
      },
      select: {
        id: true,
        stableId: true
      }
    });

    // Create a mapping from field ID to stable ID
    const fieldIdToStableId = new Map();
    fields.forEach(field => {
      fieldIdToStableId.set(field.id, field.stableId);
    });

    // Get the rules to update
    const rules = await prisma.emailRule.findMany({
      where: {
        id: { in: ruleIds },
        userId
      },
      select: {
        id: true,
        conditions: true,
        recipientType: true,
        recipientField: true
      }
    });

    // Update each rule
    const updatedRules = [];
    for (const rule of rules) {
      let updated = false;
      let conditions = rule.conditions;
      
      // Parse conditions if it's a string
      let conditionsObj = typeof conditions === 'string' ? JSON.parse(conditions) : conditions;
      
      // Update field references in conditions
      if (Array.isArray(conditionsObj)) {
        const updatedConditions = conditionsObj.map((condition: any) => {
          if (fieldIds.includes(condition.field) && fieldIdToStableId.has(condition.field)) {
            updated = true;
            return {
              ...condition,
              field: fieldIdToStableId.get(condition.field)
            };
          }
          return condition;
        });
        
        if (updated) {
          conditions = JSON.stringify(updatedConditions);
        }
      }
      
      // Update recipient field if needed
      let recipientField = rule.recipientField;
      if (rule.recipientType === 'field' && fieldIds.includes(rule.recipientField) && fieldIdToStableId.has(rule.recipientField)) {
        recipientField = fieldIdToStableId.get(rule.recipientField);
        updated = true;
      }
      
      // Only update the rule if changes were made
      if (updated) {
        const updatedRule = await prisma.emailRule.update({
          where: { id: rule.id },
          data: {
            conditions,
            recipientField
          },
          select: {
            id: true,
            name: true
          }
        });
        
        updatedRules.push(updatedRule);
        
        addApiLog(`Updated rule ${rule.id} to use stable IDs`, 'info', 'field-mappings');
      }
    }

    return res.status(200).json({
      success: true,
      updatedRules,
      message: `Updated ${updatedRules.length} rules to use stable IDs`
    });
  } catch (error) {
    console.error('Error updating rules to use stable IDs:', error);
    addApiLog(`Error updating rules to use stable IDs: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'field-mappings');
    return res.status(500).json({ error: 'Failed to update rules' });
  }
}

/**
 * Bulk update email rules with different reference types
 */
async function bulkUpdateRules(req: NextApiRequest, res: NextApiResponse, formId: string, userId: string) {
  try {
    const { fieldIds, ruleIds, updateType, customMapping } = req.body;

    if (!fieldIds || !Array.isArray(fieldIds) || fieldIds.length === 0) {
      return res.status(400).json({ error: 'Field IDs are required' });
    }

    if (!ruleIds || !Array.isArray(ruleIds) || ruleIds.length === 0) {
      return res.status(400).json({ error: 'Rule IDs are required' });
    }

    if (!updateType || !['stable-id', 'field-id', 'custom'].includes(updateType)) {
      return res.status(400).json({ error: 'Valid update type is required' });
    }

    if (updateType === 'custom' && (!customMapping || typeof customMapping !== 'string')) {
      return res.status(400).json({ error: 'Custom mapping is required when update type is custom' });
    }

    // Get the form to check ownership
    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: { userId: true }
    });

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    // Check if the user has access to this form
    if (form.userId !== userId) {
      return res.status(403).json({ error: 'You do not have access to this form' });
    }

    // Get the fields with their IDs and stable IDs
    const fields = await prisma.formField.findMany({
      where: {
        id: { in: fieldIds }
      },
      select: {
        id: true,
        stableId: true,
        mapping: true,
        label: true
      }
    });

    // Create mappings based on the update type
    const fieldMappings = new Map();
    fields.forEach(field => {
      let mappingValue;
      
      if (updateType === 'stable-id') {
        mappingValue = field.stableId;
      } else if (updateType === 'field-id') {
        mappingValue = field.id;
      } else if (updateType === 'custom') {
        // For custom mapping, we'll use the provided pattern
        // We could replace placeholders like {fieldName} with actual values
        let mapping = customMapping;
        if (mapping.includes('{fieldName}') && field.label) {
          const fieldName = field.label
            .toLowerCase()
            .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
            .replace(/[^a-zA-Z0-9]+/g, '')
            .replace(/^[A-Z]/, firstChar => firstChar.toLowerCase());
          
          mapping = mapping.replace('{fieldName}', fieldName);
        }
        mappingValue = mapping;
      }
      
      fieldMappings.set(field.id, mappingValue);
    });

    // Get the rules to update
    const rules = await prisma.emailRule.findMany({
      where: {
        id: { in: ruleIds },
        userId
      },
      select: {
        id: true,
        name: true,
        conditions: true,
        recipientType: true,
        recipientField: true
      }
    });

    // Update each rule
    const updatedRules = [];
    for (const rule of rules) {
      let updated = false;
      let conditions = rule.conditions;
      
      // Parse conditions if it's a string
      let conditionsObj = typeof conditions === 'string' ? JSON.parse(conditions) : conditions;
      
      // Update field references in conditions
      if (Array.isArray(conditionsObj)) {
        const updatedConditions = conditionsObj.map((condition: any) => {
          if (fieldIds.includes(condition.field) && fieldMappings.has(condition.field)) {
            updated = true;
            return {
              ...condition,
              field: fieldMappings.get(condition.field)
            };
          }
          return condition;
        });
        
        if (updated) {
          conditions = JSON.stringify(updatedConditions);
        }
      }
      
      // Update recipient field if needed
      let recipientField = rule.recipientField;
      if (rule.recipientType === 'field' && fieldIds.includes(rule.recipientField) && fieldMappings.has(rule.recipientField)) {
        recipientField = fieldMappings.get(rule.recipientField);
        updated = true;
      }
      
      // Only update the rule if changes were made
      if (updated) {
        const updatedRule = await prisma.emailRule.update({
          where: { id: rule.id },
          data: {
            conditions,
            recipientField
          },
          select: {
            id: true,
            name: true
          }
        });
        
        updatedRules.push(updatedRule);
        
        addApiLog(`Updated rule ${rule.id} with ${updateType} references`, 'info', 'field-mappings');
      }
    }

    return res.status(200).json({
      success: true,
      updatedRules,
      message: `Updated ${updatedRules.length} rules with ${updateType} references`
    });
  } catch (error) {
    console.error('Error in bulk update rules:', error);
    addApiLog(`Error in bulk update rules: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'field-mappings');
    return res.status(500).json({ error: 'Failed to update rules' });
  }
}