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
    return res.status(400).json({ error: 'Invalid template ID' });
  }

  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return getEmailTemplate(req, res, id, user.id);
    case 'PUT':
      return updateEmailTemplate(req, res, id, user.id);
    case 'DELETE':
      return deleteEmailTemplate(req, res, id, user.id);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Get a specific email template
async function getEmailTemplate(
  req: NextApiRequest,
  res: NextApiResponse,
  templateId: string,
  userId: string
) {
  try {
    const template = await prisma.emailTemplate.findFirst({
      where: {
        id: templateId,
        userId,
      },
    });

    if (!template) {
      return res.status(404).json({ error: 'Email template not found' });
    }

    return res.status(200).json(template);
  } catch (error) {
    console.error('Error fetching email template:', error);
    return res.status(500).json({ error: 'Failed to fetch email template' });
  }
}

// Update an email template
async function updateEmailTemplate(
  req: NextApiRequest,
  res: NextApiResponse,
  templateId: string,
  userId: string
) {
  try {
    const { name, subject, htmlContent, type, description, folder, ccEmails, bccEmails } = req.body;

    // Check if the template exists and belongs to the user
    const existingTemplate = await prisma.emailTemplate.findFirst({
      where: {
        id: templateId,
        userId,
      },
    });

    if (!existingTemplate) {
      return res.status(404).json({ error: 'Email template not found' });
    }

    // Update the template
    const updatedTemplate = await prisma.emailTemplate.update({
      where: { id: templateId },
      data: {
        name: name || existingTemplate.name,
        subject: subject || existingTemplate.subject,
        htmlContent: htmlContent || existingTemplate.htmlContent,
        type: type || existingTemplate.type,
        description: description !== undefined ? description : existingTemplate.description,
        folder: folder !== undefined ? folder : existingTemplate.folder,
        ccEmails: ccEmails !== undefined ? ccEmails : existingTemplate.ccEmails,
        bccEmails: bccEmails !== undefined ? bccEmails : existingTemplate.bccEmails,
      },
    });

    return res.status(200).json(updatedTemplate);
  } catch (error) {
    console.error('Error updating email template:', error);
    return res.status(500).json({ error: 'Failed to update email template' });
  }
}

// Delete an email template
async function deleteEmailTemplate(
  req: NextApiRequest,
  res: NextApiResponse,
  templateId: string,
  userId: string
) {
  try {
    // Check if the template exists and belongs to the user
    const existingTemplate = await prisma.emailTemplate.findFirst({
      where: {
        id: templateId,
        userId,
      },
    });

    if (!existingTemplate) {
      return res.status(404).json({ error: 'Email template not found' });
    }

    // Delete the template
    await prisma.emailTemplate.delete({
      where: { id: templateId },
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting email template:', error);
    return res.status(500).json({ error: 'Failed to delete email template' });
  }
}