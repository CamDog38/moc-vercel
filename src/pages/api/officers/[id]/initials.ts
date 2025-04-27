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

  // Get officer ID from the URL
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Officer ID is required' });
  }

  // Only admins or the officer themselves can update initials
  const isAdmin = dbUser.role === 'ADMIN' || dbUser.role === 'SUPER_ADMIN';
  
  if (!isAdmin) {
    // Check if this user is the officer
    const officer = await prisma.marriageOfficer.findUnique({
      where: { id }
    });
    
    if (!officer || officer.userId !== user.id) {
      return res.status(403).json({ error: 'Not authorized to update this officer' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { initials } = req.body;

      if (!initials) {
        return res.status(400).json({ error: 'Initials are required' });
      }

      // Validate initials format (2-4 uppercase letters)
      const initialsRegex = /^[A-Z]{1,4}$/;
      if (!initialsRegex.test(initials)) {
        return res.status(400).json({ 
          error: 'Initials must be 1-4 uppercase letters' 
        });
      }

      // Update the officer's initials
      const updatedOfficer = await prisma.marriageOfficer.update({
        where: { id },
        data: { initials }
      });

      return res.status(200).json(updatedOfficer);
    } catch (error) {
      console.error('Error updating officer initials:', error);
      return res.status(500).json({ 
        error: 'Failed to update officer initials',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  } else {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}