import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/util/supabase/api';
import prisma from '@/lib/prisma';
import { ensureUserExists } from '@/util/auth-helpers';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check authentication for all methods
  const supabase = createClient(req, res);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('Authentication error:', authError);
    return res.status(401).json({ 
      error: 'Authentication failed',
      details: authError?.message || 'User not authenticated'
    });
  }

  // Ensure user exists in the database
  let dbUser;
  try {
    dbUser = await ensureUserExists(user);
  } catch (error) {
    console.error('Failed to ensure user exists:', error);
    return res.status(401).json({ error: 'Failed to verify user in database' });
  }

  // Only admins can access settings
  if (dbUser.role !== 'ADMIN' && dbUser.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Not authorized to access settings' });
  }

  if (req.method === 'GET') {
    try {
      const settings = await prisma.systemSettings.findMany();
      return res.status(200).json(settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch settings',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  } else if (req.method === 'PUT') {
    try {
      const { key, value, description } = req.body;

      if (!key || value === undefined) {
        return res.status(400).json({ error: 'Key and value are required' });
      }

      // Update or create the setting
      const setting = await prisma.systemSettings.upsert({
        where: { key },
        update: { 
          value: value.toString(),
          description: description || undefined,
          updatedAt: new Date()
        },
        create: {
          key,
          value: value.toString(),
          description: description || undefined
        }
      });

      return res.status(200).json(setting);
    } catch (error) {
      console.error('Error updating setting:', error);
      return res.status(500).json({ 
        error: 'Failed to update setting',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}