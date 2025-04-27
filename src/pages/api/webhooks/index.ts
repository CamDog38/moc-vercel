import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import { ensureUserExists } from '@/util/auth-helpers';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check authentication
  const supabase = createClient(req, res);
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Get user role
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Ensure user exists in the database
  let dbUser;
  try {
    dbUser = await ensureUserExists(userData.user);
  } catch (error) {
    console.error('Failed to ensure user exists:', error);
    return res.status(401).json({ error: 'Failed to verify user in database' });
  }

  if (dbUser.role !== 'SUPER_ADMIN' && dbUser.role !== 'ADMIN') {
    console.warn('User does not have admin role:', dbUser.role);
    
    // If we're in development or the role was a fallback from a timeout,
    // allow access to prevent blocking the UI during database issues
    if (process.env.NODE_ENV === 'development' || 
        process.env.NEXT_PUBLIC_CO_DEV_ENV === 'preview') {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Allowing access in development/preview environment despite role:', dbUser.role);
      }
    } else {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
  }

  try {
    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        const webhooks = await prisma.zapierWebhook.findMany({
          orderBy: { createdAt: 'desc' },
        });
        return res.status(200).json(webhooks);

      case 'POST':
        const { name, url, description, isActive, variables } = req.body;
        
        if (!name || !url) {
          return res.status(400).json({ error: 'Name and URL are required' });
        }

        // Validate URL format
        try {
          new URL(url);
        } catch (error) {
          return res.status(400).json({ error: 'Invalid URL format' });
        }

        // Validate variables if provided
        let parsedVariables = {};
        if (variables) {
          try {
            if (typeof variables === 'string') {
              parsedVariables = JSON.parse(variables);
            } else {
              parsedVariables = variables;
            }
          } catch (error) {
            return res.status(400).json({ error: 'Invalid variables format. Must be valid JSON.' });
          }
        }

        const newWebhook = await prisma.zapierWebhook.create({
          data: {
            name,
            url,
            description,
            variables: parsedVariables,
            isActive: isActive ?? true,
          },
        });
        
        return res.status(201).json(newWebhook);

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Webhook API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}