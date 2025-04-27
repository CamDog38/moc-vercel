/**
 * Simple Bookings API
 * 
 * This API endpoint fetches all bookings directly from the database
 * without any complex filtering or transformation logic.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Authenticate the user
  const supabase = createClient(req, res);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    console.error('API: Authentication error:', authError);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Directly query all bookings with their related data
    const bookings = await prisma.booking.findMany({
      include: {
        form: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        submissions: {
          select: {
            id: true,
            data: true
          }
        },
        invoices: {
          select: {
            id: true,
            status: true,
            totalAmount: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      },
      // Set a high limit to get all bookings
      take: 1000
    });

    console.log(`API: Successfully fetched ${bookings.length} bookings directly from the database`);
    
    return res.status(200).json(bookings);
  } catch (error) {
    console.error('API: Error fetching bookings:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch bookings', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
