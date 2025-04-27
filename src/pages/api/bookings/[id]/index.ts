import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import { ensureUserExists } from '@/util/auth-helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;
    
    // Get the authenticated user
    const supabase = createClient(req, res);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('API: Authentication error:', authError);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Ensure user exists in the database
    let dbUser;
    try {
      dbUser = await ensureUserExists(user);
    } catch (error) {
      console.error('API: Failed to ensure user exists:', error);
      return res.status(401).json({ error: 'Failed to verify user in database' });
    }

    // Check if the booking exists
    const booking = await prisma.booking.findUnique({
      where: { id: String(id) },
      include: {
        form: {
          include: {
            formSections: {
              include: {
                fields: true
              },
              orderBy: {
                order: 'asc'
              }
            }
          }
        },
        submissions: {
          orderBy: {
            createdAt: 'desc'
          }
        },
        invoices: true
      }
    });

    if (!booking) {
      console.error(`API: Booking not found with ID: ${id}`);
      return res.status(404).json({ error: 'Booking not found' });
    }

    switch (req.method) {
      case 'GET':
        try {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`API: Successfully fetched booking with ID: ${id}`);
          }
          // Return the booking details
          return res.status(200).json(booking);
        } catch (error) {
          console.error('API: Error fetching booking:', error);
          return res.status(500).json({ error: 'Failed to fetch booking details' });
        }
        
      case 'PATCH':
        try {
          // Check user permissions
          if (dbUser.role !== 'ADMIN' && dbUser.role !== 'SUPER_ADMIN' && booking.assignedUserId !== user.id) {
            return res.status(403).json({ error: 'You do not have permission to update this booking' });
          }
          
          const { date, time, location, status, name, email, phone, notes } = req.body;
          
          // Update the booking
          const updatedBooking = await prisma.booking.update({
            where: { id: String(id) },
            data: {
              ...(date && { date: new Date(date) }),
              ...(time !== undefined && { time }),
              ...(location !== undefined && { location }),
              ...(status !== undefined && { status }),
              ...(name !== undefined && { name }),
              ...(email !== undefined && { email }),
              ...(phone !== undefined && { phone }),
              ...(notes !== undefined && { notes }),
            }
          });
          
          if (process.env.NODE_ENV !== 'production') {
            console.log(`API: Successfully updated booking with ID: ${id}`);
          }
          return res.status(200).json(updatedBooking);
        } catch (error) {
          console.error('API: Error updating booking:', error);
          return res.status(500).json({ error: 'Failed to update booking details' });
        }
        
      default:
        console.error(`API: Method ${req.method} not allowed for booking endpoint`);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API: Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
