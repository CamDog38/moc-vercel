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

  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return getEmailTemplates(req, res, user.id);
    case 'POST':
      return createEmailTemplate(req, res, user.id);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Get all email templates for the user
async function getEmailTemplates(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    const templates = await prisma.emailTemplate.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    
    return res.status(200).json(templates);
  } catch (error) {
    console.error('Error fetching email templates:', error);
    return res.status(500).json({ error: 'Failed to fetch email templates' });
  }
}

// Create a new email template
async function createEmailTemplate(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    const { name, subject, htmlContent, type, description, folder } = req.body;

    if (!name || !subject || !htmlContent || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const template = await prisma.emailTemplate.create({
      data: {
        name,
        subject,
        htmlContent,
        type,
        description: description || '',
        folder: folder || null,
        userId,
      },
    });

    return res.status(201).json(template);
  } catch (error) {
    console.error('Error creating email template:', error);
    return res.status(500).json({ error: 'Failed to create email template' });
  }
}