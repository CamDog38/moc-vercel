import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check authentication
  const supabase = createClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid rule ID' });
  }

  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return getEmailRule(req, res, id, user.id);
    case 'PUT':
      return updateEmailRule(req, res, id, user.id);
    case 'DELETE':
      return deleteEmailRule(req, res, id, user.id);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Get a specific email rule
async function getEmailRule(
  req: NextApiRequest,
  res: NextApiResponse,
  ruleId: string,
  userId: string
) {
  try {
    const rule = await prisma.emailRule.findFirst({
      where: {
        id: ruleId,
        userId,
      },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            subject: true,
          },
        },
      },
    });

    if (!rule) {
      return res.status(404).json({ error: 'Email rule not found' });
    }

    return res.status(200).json(rule);
  } catch (error) {
    console.error('Error fetching email rule:', error);
    return res.status(500).json({ error: 'Failed to fetch email rule' });
  }
}

// Update an email rule
async function updateEmailRule(
  req: NextApiRequest,
  res: NextApiResponse,
  ruleId: string,
  userId: string
) {
  try {
    const { 
      name, 
      description, 
      conditions, 
      templateId, 
      formId, 
      active, 
      folder, 
      ccEmails, 
      bccEmails,
      recipientType,
      recipientEmail,
      recipientField,
      useFormSystem2 // Add form system toggle preference
    } = req.body;

    // Check if the rule exists and belongs to the user
    const existingRule = await prisma.emailRule.findFirst({
      where: {
        id: ruleId,
        userId,
      },
    });

    if (!existingRule) {
      return res.status(404).json({ error: 'Email rule not found' });
    }

    // If templateId is provided, validate that it exists and belongs to the user
    if (templateId) {
      const template = await prisma.emailTemplate.findFirst({
        where: {
          id: templateId,
          userId,
        },
      });

      if (!template) {
        return res.status(404).json({ error: 'Email template not found' });
      }
    }

    // Validate recipient information
    if (recipientType === 'custom' && !recipientEmail) {
      return res.status(400).json({ error: 'Custom recipient email is required when using custom recipient type' });
    }

    if (recipientType === 'field' && !recipientField) {
      return res.status(400).json({ error: 'Recipient field is required when using field recipient type' });
    }

    // Prepare conditions for saving
    let conditionsToSave;
    
    if (conditions !== undefined) {
      // Handle different formats of conditions
      if (typeof conditions === 'string') {
        // If it's already a string, use it directly
        conditionsToSave = conditions;
      } else if (Array.isArray(conditions)) {
        // If it's an array, stringify it
        conditionsToSave = JSON.stringify(conditions);
      } else if (typeof conditions === 'object') {
        // If it's an object (but not an array), stringify it
        conditionsToSave = JSON.stringify(conditions);
      } else {
        // Default to empty array
        conditionsToSave = '[]';
      }
    } else {
      // If no conditions provided, use existing or default to empty
      conditionsToSave = existingRule.conditions || '[]';
    }
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('Saving conditions:', conditionsToSave);
    }

    // Update the rule
    const updatedRule = await prisma.emailRule.update({
      where: { id: ruleId },
      data: {
        name: name || existingRule.name,
        conditions: conditionsToSave,
        templateId: templateId || existingRule.templateId,
        formId: formId !== undefined ? formId : existingRule.formId,
        active: active !== undefined ? active : existingRule.active,
        folder: folder !== undefined ? folder : existingRule.folder,
        ccEmails: ccEmails !== undefined ? ccEmails : existingRule.ccEmails,
        bccEmails: bccEmails !== undefined ? bccEmails : existingRule.bccEmails,
        recipientType: recipientType || existingRule.recipientType || 'form',
        recipientEmail: recipientType === 'custom' ? recipientEmail : null,
        recipientField: recipientType === 'field' ? recipientField : null,
        // Store the form system preference in the description field as metadata
        // Format: [FORM_SYSTEM:2.0] or [FORM_SYSTEM:1.0] at the beginning of the description
        description: description !== undefined ? 
          (useFormSystem2 ? `[FORM_SYSTEM:2.0] ${description}`.trim() : `[FORM_SYSTEM:1.0] ${description}`.trim()) : 
          (useFormSystem2 ? 
            existingRule.description?.replace(/^\[FORM_SYSTEM:[^\]]+\]\s*/, '[FORM_SYSTEM:2.0] ') || '[FORM_SYSTEM:2.0]' : 
            existingRule.description?.replace(/^\[FORM_SYSTEM:[^\]]+\]\s*/, '[FORM_SYSTEM:1.0] ') || '[FORM_SYSTEM:1.0]'),
      },
    });

    return res.status(200).json(updatedRule);
  } catch (error) {
    console.error('Error updating email rule:', error);
    return res.status(500).json({ error: 'Failed to update email rule' });
  }
}

// Delete an email rule
async function deleteEmailRule(
  req: NextApiRequest,
  res: NextApiResponse,
  ruleId: string,
  userId: string
) {
  try {
    // Check if the rule exists and belongs to the user
    const existingRule = await prisma.emailRule.findFirst({
      where: {
        id: ruleId,
        userId,
      },
    });

    if (!existingRule) {
      return res.status(404).json({ error: 'Email rule not found' });
    }

    // Delete the rule
    await prisma.emailRule.delete({
      where: { id: ruleId },
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting email rule:', error);
    return res.status(500).json({ error: 'Failed to delete email rule' });
  }
}