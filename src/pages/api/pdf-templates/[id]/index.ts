import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createClient(req, res);
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get the user's role from the database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true }
    });

    if (!dbUser) {
      return res.status(401).json({ error: 'User not found in database' });
    }

    // Only admins can manage PDF templates
    if (dbUser.role !== 'SUPER_ADMIN' && dbUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not authorized to manage PDF templates' });
    }

    const { id } = req.query;

    if (req.method === 'GET') {
      // Get a specific PDF template
      const template = await prisma.pdfTemplate.findUnique({
        where: { id: id as string }
      });
      
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      return res.status(200).json(template);
    }
    
    if (req.method === 'PUT') {
      // Update a PDF template
      const { name, description, type, htmlContent, cssContent, isActive } = req.body;
      
      const template = await prisma.pdfTemplate.findUnique({
        where: { id: id as string }
      });
      
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      const updatedTemplate = await prisma.pdfTemplate.update({
        where: { id: id as string },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(type !== undefined && { type }),
          ...(htmlContent !== undefined && { htmlContent }),
          ...(cssContent !== undefined && { cssContent }),
          ...(isActive !== undefined && { isActive })
        }
      });
      
      return res.status(200).json(updatedTemplate);
    }
    
    if (req.method === 'DELETE') {
      // Delete a PDF template
      const template = await prisma.pdfTemplate.findUnique({
        where: { id: id as string }
      });
      
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      await prisma.pdfTemplate.delete({
        where: { id: id as string }
      });
      
      return res.status(204).end();
    }
    
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  } catch (error) {
    console.error('Error in PDF templates API:', error);
    return res.status(500).json({ error: 'Internal server error: ' + (error as Error).message });
  }
}