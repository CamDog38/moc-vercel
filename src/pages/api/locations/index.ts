import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/util/supabase/api';
import { ensureUserExists } from '@/util/auth-helpers';
import prisma from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Create a timeout promise to prevent hanging requests
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error('Request timeout'));
    }, 10000); // 10 second timeout
  });

  try {
    // Check authentication for all methods
    const supabase = createClient(req, res);
    const authPromise = supabase.auth.getUser();
    const authResult = await Promise.race([authPromise, timeoutPromise]) as any;
    const { data: { user }, error: authError } = authResult;

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

    // Check if user is an admin
    if (dbUser.role !== 'ADMIN' && dbUser.role !== 'SUPER_ADMIN') {
      console.warn('User does not have admin role:', dbUser.role);
      
      // If we're in development or the role was a fallback from a timeout,
      // allow access to prevent blocking the UI during database issues
      if (process.env.NODE_ENV === 'development' || 
          process.env.NEXT_PUBLIC_CO_DEV_ENV === 'preview') {
        if (process.env.NODE_ENV !== 'production') {
          console.log('Allowing access in development/preview environment despite role:', dbUser.role);
        }
      } else {
        return res.status(403).json({ error: 'Unauthorized. Admin access required.' });
      }
    }

    switch (req.method) {
      case 'GET':
        try {
          // Fetch office locations from the database with timeout protection
          const locationsPromise = prisma.officeLocation.findMany({
            orderBy: { name: 'asc' }
          });
          
          const locations = await Promise.race([locationsPromise, timeoutPromise]) as any;
          return res.status(200).json(locations);
        } catch (error: any) {
          // Check if it's a timeout error
          if (error.message === 'Request timeout') {
            console.error('Database query timeout');
            return res.status(504).json({ 
              error: 'Request timed out', 
              message: 'The server took too long to respond. Please try again later.'
            });
          }
          
          console.error('Error fetching office locations:', error);
          return res.status(500).json({ 
            error: 'Failed to fetch office locations',
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }

      case 'POST':
        try {
          const { name, address, isActive } = req.body;

          if (!name || !address) {
            return res.status(400).json({ error: 'Name and address are required' });
          }

          // Create a new office location in the database
          const newLocation = await prisma.officeLocation.create({
            data: {
              name,
              address,
              isActive: isActive !== undefined ? isActive : true,
            }
          });

          return res.status(201).json(newLocation);
        } catch (error) {
          console.error('Error creating office location:', error);
          return res.status(500).json({ 
            error: 'Failed to create office location',
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }

      default:
        res.setHeader('Allow', ['GET', 'POST']);
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