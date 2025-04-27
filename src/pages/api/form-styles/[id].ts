import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createClient(req, res);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Get user from database to check role
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true }
  });

  if (!dbUser || (dbUser.role !== 'SUPER_ADMIN' && dbUser.role !== 'ADMIN')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid form style ID' });
  }

  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return getFormStyle(req, res, id);
    case 'PUT':
      return updateFormStyle(req, res, id);
    case 'DELETE':
      return deleteFormStyle(req, res, id);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Get a specific form style
async function getFormStyle(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const formStyle = await prisma.formStyle.findUnique({
      where: { id },
      include: {
        form: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    if (!formStyle) {
      return res.status(404).json({ error: 'Form style not found' });
    }
    
    return res.status(200).json(formStyle);
  } catch (error) {
    console.error('Error fetching form style:', error);
    return res.status(500).json({ error: 'Failed to fetch form style' });
  }
}

// Update a form style
async function updateFormStyle(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const { name, description, cssContent, isGlobal, formId } = req.body;
    
    // Check if the form style exists
    const existingStyle = await prisma.formStyle.findUnique({
      where: { id }
    });
    
    if (!existingStyle) {
      return res.status(404).json({ error: 'Form style not found' });
    }
    
    // Update the form style
    const updatedStyle = await prisma.formStyle.update({
      where: { id },
      data: {
        name: name || existingStyle.name,
        description,
        cssContent: cssContent || existingStyle.cssContent,
        isGlobal: isGlobal !== undefined ? isGlobal : existingStyle.isGlobal,
        formId: formId || null
      }
    });
    
    return res.status(200).json(updatedStyle);
  } catch (error) {
    console.error('Error updating form style:', error);
    return res.status(500).json({ error: 'Failed to update form style' });
  }
}

// Delete a form style
async function deleteFormStyle(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    // Check if the form style exists
    const existingStyle = await prisma.formStyle.findUnique({
      where: { id }
    });
    
    if (!existingStyle) {
      return res.status(404).json({ error: 'Form style not found' });
    }
    
    // Delete the form style
    await prisma.formStyle.delete({
      where: { id }
    });
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting form style:', error);
    return res.status(500).json({ error: 'Failed to delete form style' });
  }
}