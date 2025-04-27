import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // For GET requests with a formId parameter, allow public access for form viewing
  const isPublicStyleRequest = req.method === 'GET' && req.query.formId;
  
  if (!isPublicStyleRequest) {
    // For all other requests, require authentication
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
  }

  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return getFormStyles(req, res);
    case 'POST':
      // For POST requests, we've already verified user is authenticated above
      const supabase = createClient(req, res);
      const { data: { user } } = await supabase.auth.getUser();
      return createFormStyle(req, res, user!.id);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Get all form styles
async function getFormStyles(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { formId, formSystemType } = req.query;
    
    // Build the query based on parameters
    const query: any = {};
    
    // If formId is provided, filter by that form or global styles
    if (formId) {
      const formIdStr = formId as string;
      const isForm2 = formIdStr.startsWith('form2_') || formIdStr.startsWith('cm');
      
      console.log(`[FormStyles] Fetching styles for form ID: ${formIdStr}, isForm2: ${isForm2}`);
      
      // Build query for form-specific and global styles
      query.OR = [
        { isGlobal: true },
        { formId: formIdStr }
      ];
      
      // For Form System 2.0, check additional ID formats
      if (isForm2) {
        // Add additional form ID formats to the OR condition
        query.OR.push({ formId: `form2_${formIdStr}` });
        query.OR.push({ formId: formIdStr.replace('form2_', '') });
      }
      
      // Add debug log
      console.log(`[FormStyles] Query: ${JSON.stringify(query)}`);
    } else if (formSystemType) {
      // This parameter is ignored for now since we don't have the field in the database
      console.log(`[FormStyles] formSystemType parameter provided but not implemented yet`);
      // Just return all styles for now
    }
    
    const formStyles = await prisma.formStyle.findMany({
      where: query,
      orderBy: { updatedAt: 'desc' },
      include: {
        form: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    return res.status(200).json(formStyles);
  } catch (error) {
    console.error('Error fetching form styles:', error);
    return res.status(500).json({ error: 'Failed to fetch form styles' });
  }
}

// Create a new form style
async function createFormStyle(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    const { name, description, cssContent, isGlobal, formId } = req.body;
    
    if (!name || !cssContent) {
      return res.status(400).json({ error: 'Name and CSS content are required' });
    }
    
    // Create the form style
    const formStyle = await prisma.formStyle.create({
      data: {
        name,
        description,
        cssContent,
        isGlobal: isGlobal || false,
        formId: formId || null
      }
    });
    
    console.log(`[FormStyles] Created new form style: ${name} for form: ${formId || 'global'}`);
    return res.status(201).json(formStyle);
  } catch (error) {
    console.error('Error creating form style:', error);
    return res.status(500).json({ error: 'Failed to create form style' });
  }
}