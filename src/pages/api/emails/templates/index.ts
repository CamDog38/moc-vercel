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

  // Handle GET request to fetch all email templates
  if (req.method === 'GET') {
    try {
      const templates = await prisma.emailTemplate.findMany({
        where: {
          userId: user.id,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      return res.status(200).json(templates);
    } catch (error) {
      console.error('Error fetching email templates:', error);
      return res.status(500).json({ error: 'Failed to fetch email templates' });
    }
  }

  // Handle POST request to create a new email template
  if (req.method === 'POST') {
    try {
      const { name, subject, htmlContent } = req.body;

      if (!name || !subject) {
        return res.status(400).json({ error: 'Name and subject are required' });
      }

      const template = await prisma.emailTemplate.create({
        data: {
          name,
          subject,
          htmlContent: htmlContent || '<p>Your email content here</p>',
          userId: user.id,
        },
      });

      return res.status(201).json(template);
    } catch (error) {
      console.error('Error creating email template:', error);
      return res.status(500).json({ error: 'Failed to create email template' });
    }
  }

  // Return 405 Method Not Allowed for other HTTP methods
  return res.status(405).json({ error: 'Method not allowed' });
}
