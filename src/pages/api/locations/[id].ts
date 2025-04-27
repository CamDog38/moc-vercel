import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/util/supabase/api';
import { ensureUserExists } from '@/util/auth-helpers';
import prisma from '@/lib/prisma';

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

  try {
    // Ensure user exists in the database
    let dbUser;
    try {
      dbUser = await ensureUserExists(user);
    } catch (error) {
      console.error('Failed to ensure user exists:', error);
      return res.status(401).json({ error: 'Failed to verify user in database' });
    }

    // Check if user is an admin
    if (dbUser.role !== 'ADMIN' && dbUser.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Unauthorized. Admin access required.' });
    }

    // Get the location ID from the URL
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid location ID' });
    }

    // Check if the location exists
    const existingLocation = await prisma.officeLocation.findUnique({
      where: { id }
    });

    if (!existingLocation) {
      return res.status(404).json({ error: 'Office location not found' });
    }

    switch (req.method) {
      case 'GET':
        // Return the location
        return res.status(200).json(existingLocation);

      case 'PUT':
        try {
          // Update the location
          const { name, address, isActive } = req.body;

          if (!name && !address && isActive === undefined) {
            return res.status(400).json({ error: 'At least one field must be provided for update' });
          }

          const updatedLocation = await prisma.officeLocation.update({
            where: { id },
            data: {
              ...(name && { name }),
              ...(address && { address }),
              ...(isActive !== undefined && { isActive }),
            }
          });

          return res.status(200).json(updatedLocation);
        } catch (error) {
          console.error('Error updating office location:', error);
          return res.status(500).json({ 
            error: 'Failed to update office location',
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }

      case 'DELETE':
        try {
          // Delete the location
          await prisma.officeLocation.delete({
            where: { id }
          });

          return res.status(200).json({ message: 'Office location deleted successfully' });
        } catch (error) {
          console.error('Error deleting office location:', error);
          return res.status(500).json({ 
            error: 'Failed to delete office location',
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}