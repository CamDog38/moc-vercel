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

  // Handle GET request to fetch email rules
  if (req.method === 'GET') {
    try {
      // Parse query parameters
      const formId = req.query.formId as string | undefined;
      
      // Build the where clause
      const where: any = { userId: user.id };
      
      if (formId) {
        where.formId = formId;
      }

      // Get email rules
      const rules = await prisma.emailRule.findMany({
        where,
        include: {
          template: {
            select: {
              id: true,
              name: true,
              subject: true,
              type: true,
            },
          },
          form: {
            select: {
              id: true,
              name: true,
              type: true,
              isActive: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json(rules);
    } catch (error) {
      console.error('Error fetching email rules:', error);
      return res.status(500).json({ error: 'Failed to fetch email rules' });
    }
  }
  
  // Handle POST request to create a new email rule
  else if (req.method === 'POST') {
    try {
      const { name, formId, templateId, conditions, active } = req.body;

      // Validate required fields
      if (!name || !formId || !templateId) {
        return res.status(400).json({ error: 'Name, form ID, and template ID are required' });
      }

      // Create the email rule
      const emailRule = await prisma.emailRule.create({
        data: {
          name,
          formId,
          templateId,
          conditions: conditions || '[]',
          active: active !== undefined ? active : true,
          userId: user.id,
        },
      });

      return res.status(201).json(emailRule);
    } catch (error) {
      console.error('Error creating email rule:', error);
      return res.status(500).json({ error: 'Failed to create email rule' });
    }
  }
  
  // Handle PUT request to update an email rule
  else if (req.method === 'PUT') {
    try {
      const { id, name, formId, templateId, conditions, active } = req.body;

      // Validate required fields
      if (!id) {
        return res.status(400).json({ error: 'Rule ID is required' });
      }

      // Check if the rule exists and belongs to the user
      const existingRule = await prisma.emailRule.findFirst({
        where: {
          id,
          userId: user.id,
        },
      });

      if (!existingRule) {
        return res.status(404).json({ error: 'Email rule not found' });
      }

      // Update the email rule
      const updatedData: any = {};
      if (name !== undefined) updatedData.name = name;
      if (formId !== undefined) updatedData.formId = formId;
      if (templateId !== undefined) updatedData.templateId = templateId;
      if (conditions !== undefined) updatedData.conditions = conditions;
      if (active !== undefined) updatedData.active = active;

      const emailRule = await prisma.emailRule.update({
        where: { id },
        data: updatedData,
      });

      return res.status(200).json(emailRule);
    } catch (error) {
      console.error('Error updating email rule:', error);
      return res.status(500).json({ error: 'Failed to update email rule' });
    }
  }
  
  // Handle DELETE request to delete an email rule
  else if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Rule ID is required' });
      }

      // Check if the rule exists and belongs to the user
      const existingRule = await prisma.emailRule.findFirst({
        where: {
          id: String(id),
          userId: user.id,
        },
      });

      if (!existingRule) {
        return res.status(404).json({ error: 'Email rule not found' });
      }

      // Delete the email rule
      await prisma.emailRule.delete({
        where: { id: String(id) },
      });

      return res.status(200).json({ message: 'Email rule deleted successfully' });
    } catch (error) {
      console.error('Error deleting email rule:', error);
      return res.status(500).json({ error: 'Failed to delete email rule' });
    }
  }
  
  // Handle unsupported methods
  else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
