import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // This is a debug endpoint - in production, you would want to secure this
  if (req.method === 'GET') {
    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Debug: Fetching all invoices');
      }
      
      // Get all invoices
      const invoices = await prisma.invoice.findMany({
        include: {
          booking: {
            select: {
              id: true,
              date: true,
              name: true,
              email: true,
              assignedUserId: true,
            },
          },
        },
      });

      if (process.env.NODE_ENV !== 'production') {
        console.log(`Debug: Found ${invoices.length} invoices`);
      }
      
      // Get all bookings with assignedUserId
      const bookings = await prisma.booking.findMany({
        where: {
          assignedUserId: {
            not: null
          }
        },
        select: {
          id: true,
          name: true,
          assignedUserId: true
        }
      });
      
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Debug: Found ${bookings.length} bookings with assigned users`);
      }

      return res.status(200).json({
        invoicesCount: invoices.length,
        invoices,
        bookingsWithAssignedUsers: bookings
      });
    } catch (error) {
      console.error('Debug: Error fetching invoices:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch invoices',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
