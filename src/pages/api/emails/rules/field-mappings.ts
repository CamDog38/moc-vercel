import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import { logger } from '@/util/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;
  const supabase = createClient({ req, res });
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    switch (method) {
      case 'GET':
        return await getFieldMappings(req, res, user.id);
      case 'POST':
        return await updateFieldMappings(req, res, user.id);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    logger.error('Error in field-mappings API:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' });
  }
}

async function getFieldMappings(req: NextApiRequest, res: NextApiResponse, userId: string) {
  const { ruleId, formId } = req.query;

  // If ruleId is provided, get field mappings for a specific rule
  if (ruleId && typeof ruleId === 'string') {
    const rule = await prisma.emailRule.findUnique({
      where: { id: ruleId },
      include: {
        form: true,
        template: true,
      },
    });

    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    // Parse conditions to extract field references
    let conditions = [];
    try {
      if (typeof rule.conditions === 'string') {
        conditions = JSON.parse(rule.conditions);
      } else if (rule.conditions) {
        conditions = rule.conditions as any[];
      }
    } catch (error) {
      logger.error('Error parsing rule conditions:', error);
      conditions = [];
    }

    // Get form fields
    const formFields = await prisma.formField.findMany({
      where: { formId: rule.formId },
      select: {
        id: true,
        label: true,
        type: true,
        stableId: true,
      },
    });

    // Map field references to actual fields
    const fieldMappings = formFields.map(field => {
      const isReferenced = conditions.some((condition: any) => 
        condition.field === field.id || 
        condition.field === field.stableId || 
        condition.field === field.label
      );

      return {
        fieldId: field.id,
        fieldLabel: field.label,
        fieldType: field.type,
        stableId: field.stableId,
        isReferenced,
      };
    });

    return res.status(200).json({
      rule,
      fieldMappings,
    });
  }

  // If formId is provided, get all field mappings for a form
  if (formId && typeof formId === 'string') {
    // Get all rules for this form
    const rules = await prisma.emailRule.findMany({
      where: { formId },
      include: {
        template: true,
      },
    });

    // Get all form fields
    const formFields = await prisma.formField.findMany({
      where: { formId },
      select: {
        id: true,
        label: true,
        type: true,
        stableId: true,
      },
    });

    // For each field, check which rules reference it
    const fieldMappings = await Promise.all(formFields.map(async field => {
      const referencingRules = [];

      for (const rule of rules) {
        let conditions = [];
        try {
          if (typeof rule.conditions === 'string') {
            conditions = JSON.parse(rule.conditions);
          } else if (rule.conditions) {
            conditions = rule.conditions as any[];
          }
        } catch (error) {
          logger.error(`Error parsing conditions for rule ${rule.id}:`, error);
          conditions = [];
        }

        const isReferenced = conditions.some((condition: any) => 
          condition.field === field.id || 
          condition.field === field.stableId || 
          condition.field === field.label
        );

        if (isReferenced) {
          referencingRules.push({
            id: rule.id,
            name: rule.name,
          });
        }
      }

      return {
        fieldId: field.id,
        fieldLabel: field.label,
        fieldType: field.type,
        stableId: field.stableId,
        inUseByRules: referencingRules.length > 0,
        referencingRules,
      };
    }));

    return res.status(200).json({
      formId,
      fieldMappings,
    });
  }

  // If neither ruleId nor formId is provided, return all rules with field mapping info
  const rules = await prisma.emailRule.findMany({
    include: {
      form: true,
      template: true,
    },
  });

  // For each rule, count the number of conditions
  const rulesWithConditionCount = rules.map(rule => {
    let conditionCount = 0;
    try {
      if (typeof rule.conditions === 'string') {
        conditionCount = JSON.parse(rule.conditions).length;
      } else if (Array.isArray(rule.conditions)) {
        conditionCount = rule.conditions.length;
      }
    } catch (error) {
      logger.error(`Error parsing conditions for rule ${rule.id}:`, error);
    }

    return {
      ...rule,
      conditionCount,
    };
  });

  return res.status(200).json(rulesWithConditionCount);
}

async function updateFieldMappings(req: NextApiRequest, res: NextApiResponse, userId: string) {
  const { ruleId, action } = req.query;
  const { fieldIds, ruleIds, updateType, customMapping } = req.body;

  // Validate required fields
  if (!action) {
    return res.status(400).json({ error: 'Action is required' });
  }

  // Handle bulk update of rules
  if (action === 'bulk-update-rules') {
    if (!fieldIds || !Array.isArray(fieldIds) || fieldIds.length === 0) {
      return res.status(400).json({ error: 'Field IDs are required' });
    }

    if (!ruleIds || !Array.isArray(ruleIds) || ruleIds.length === 0) {
      return res.status(400).json({ error: 'Rule IDs are required' });
    }

    if (!updateType) {
      return res.status(400).json({ error: 'Update type is required' });
    }

    // Get the fields to update
    const fields = await prisma.formField.findMany({
      where: {
        id: { in: fieldIds },
      },
      select: {
        id: true,
        label: true,
        stableId: true,
      },
    });

    // Get the rules to update
    const rules = await prisma.emailRule.findMany({
      where: {
        id: { in: ruleIds },
      },
    });

    // Update each rule
    const updatedRules = [];

    for (const rule of rules) {
      let conditions = [];
      try {
        if (typeof rule.conditions === 'string') {
          conditions = JSON.parse(rule.conditions);
        } else if (rule.conditions) {
          conditions = rule.conditions as any[];
        }
      } catch (error) {
        logger.error(`Error parsing conditions for rule ${rule.id}:`, error);
        continue;
      }

      let updated = false;

      // Update field references in conditions
      const updatedConditions = conditions.map((condition: any) => {
        const field = fields.find(f => 
          condition.field === f.id || 
          condition.field === f.stableId || 
          condition.field === f.label
        );

        if (field) {
          updated = true;
          
          // Update the field reference based on the update type
          if (updateType === 'stable-id') {
            return { ...condition, field: field.stableId };
          } else if (updateType === 'field-id') {
            return { ...condition, field: field.id };
          } else if (updateType === 'custom' && customMapping) {
            // Replace placeholders in the custom mapping
            const mapping = customMapping
              .replace('{fieldId}', field.id)
              .replace('{stableId}', field.stableId)
              .replace('{fieldName}', field.label);
            
            return { ...condition, field: mapping };
          }
        }
        
        return condition;
      });

      if (updated) {
        // Update the rule with the new conditions
        await prisma.emailRule.update({
          where: { id: rule.id },
          data: {
            conditions: JSON.stringify(updatedConditions),
          },
        });

        updatedRules.push(rule.id);
      }
    }

    return res.status(200).json({
      message: `Updated ${updatedRules.length} rules successfully`,
      updatedRules,
    });
  }

  // Handle updating a specific rule's field mappings
  if (ruleId && typeof ruleId === 'string') {
    const rule = await prisma.emailRule.findUnique({
      where: { id: ruleId as string },
    });

    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    // Parse the current conditions
    let conditions = [];
    try {
      if (typeof rule.conditions === 'string') {
        conditions = JSON.parse(rule.conditions);
      } else if (rule.conditions) {
        conditions = rule.conditions as any[];
      }
    } catch (error) {
      logger.error(`Error parsing conditions for rule ${rule.id}:`, error);
      return res.status(400).json({ error: 'Invalid rule conditions format' });
    }

    // Update the conditions based on the request body
    const { updatedConditions } = req.body;

    if (!updatedConditions || !Array.isArray(updatedConditions)) {
      return res.status(400).json({ error: 'Updated conditions are required' });
    }

    // Update the rule with the new conditions
    const updatedRule = await prisma.emailRule.update({
      where: { id: ruleId as string },
      data: {
        conditions: JSON.stringify(updatedConditions),
      },
    });

    return res.status(200).json({
      message: 'Rule updated successfully',
      rule: updatedRule,
    });
  }

  return res.status(400).json({ error: 'Invalid request' });
}