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

    if (req.method === 'GET') {
      // Get query parameters for filtering
      const { type, active } = req.query;
      
      // Build where clause based on filters
      const whereClause: any = {};
      
      if (type) {
        whereClause.type = type as string;
      }
      
      if (active === 'true') {
        whereClause.isActive = true;
      } else if (active === 'false') {
        whereClause.isActive = false;
      }
      
      // Get PDF templates with filters
      const templates = await prisma.pdfTemplate.findMany({
        where: whereClause,
        orderBy: { updatedAt: 'desc' }
      });
      
      return res.status(200).json(templates);
    }
    
    if (req.method === 'POST') {
      // Create a new PDF template
      const { name, description, type, htmlContent, cssContent } = req.body;
      
      if (!name || !type || !htmlContent) {
        return res.status(400).json({ error: 'Name, type, and HTML content are required' });
      }
      
      const newTemplate = await prisma.pdfTemplate.create({
        data: {
          name,
          description,
          type,
          htmlContent,
          cssContent: cssContent || null,
          isActive: true
        }
      });
      
      return res.status(201).json(newTemplate);
    }
    
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  } catch (error) {
    console.error('Error in PDF templates API:', error);
    return res.status(500).json({ error: 'Internal server error: ' + (error as Error).message });
  }
}