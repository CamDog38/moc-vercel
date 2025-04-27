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

  if (req.method === 'GET') {
    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Fetching portal bookings for user:', user.id);
      }
      
      // Ensure user exists in the database
      let dbUser;
      try {
        dbUser = await ensureUserExists(user);
      } catch (error) {
        console.error('Failed to ensure user exists:', error);
        return res.status(401).json({ error: 'Failed to verify user in database' });
      }

      if (process.env.NODE_ENV !== 'production') {
        console.log('User role:', dbUser.role);
      }
      
      // Build the where clause based on user role
      let whereClause: any = {};
      
      if (dbUser.role === 'MARRIAGE_OFFICER') {
        // First, find the marriage officer record for this user
        const officer = await prisma.marriageOfficer.findUnique({
          where: { userId: user.id }
        });
        
        if (officer) {
          // Get bookings assigned to this officer through invoices
          whereClause = {
            invoices: {
              some: {
                officerId: officer.id
              }
            }
          };
        } else {
          // If user is a marriage officer but doesn't have an officer record,
          // don't show any bookings
          whereClause = { id: 'none' }; // This ensures no results
        }
      }
      // Admins can see all bookings
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('Using where clause for bookings:', whereClause);
      }
      
      const bookings = await prisma.booking.findMany({
        where: whereClause,
        include: {
          invoices: {
            select: {
              id: true,
              serviceType: true,
              serviceRate: true,
              travelCosts: true,
              totalAmount: true,
              status: true,
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 1 // Get only the most recent invoice
          },
        },
        orderBy: {
          date: 'asc',
        },
      });

      return res.status(200).json(bookings);
    } catch (dbError) {
      console.error('Database error:', dbError);
      return res.status(500).json({ 
        error: 'Failed to fetch bookings',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}