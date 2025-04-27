import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import { ensureUserExists } from '@/util/auth-helpers';

// Function to handle booking updates for invoices
async function handleBookingUpdate(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV !== 'production') {
    console.log('API: Handling booking update for invoice');
  }
  // Get the booking ID from the URL
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid booking ID' });
  }

  try {
    // Get the user session
    const supabase = createClient(req, res);
    const { data } = await supabase.auth.getSession();
    const session = data.session;

    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = session.user;
    if (process.env.NODE_ENV !== 'production') {
      console.log('API: User attempting to update booking for invoice:', user.id);
    }
    
    // Check if user is an admin or has special roles
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true }
    });
    
    const isAdmin = userRecord?.role === 'ADMIN' || userRecord?.role === 'SUPER_ADMIN';
    if (process.env.NODE_ENV !== 'production') {
      console.log('API: User is admin:', isAdmin);
    }
    
    // Get the booking to check permissions
    const existingBooking = await prisma.booking.findUnique({
      where: { id },
      select: { 
        assignedUserId: true,
        id: true,
        date: true,
        time: true,
        location: true
      }
    });
    
    if (!existingBooking) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('API: Booking not found with ID:', id);
      }
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('API: Found existing booking:', JSON.stringify(existingBooking));
    }
    
    // Check if user is the assigned user for this booking
    const isAssignedUser = existingBooking.assignedUserId === user.id;
    if (process.env.NODE_ENV !== 'production') {
      console.log('API: User is assigned to booking:', isAssignedUser);
    }
    
    // Only allow updates to date, time, location for invoice purposes
    const { date, time, location } = req.body;
    const updateData: any = {};
    
    if (date !== undefined) updateData.date = date;
    if (time !== undefined) updateData.time = time;
    if (location !== undefined) updateData.location = location;
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('API: Updating booking with data:', JSON.stringify(updateData));
    }
    
    try {
      const updatedBooking = await prisma.booking.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          date: true,
          time: true,
          location: true
        }
      });
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('API: Booking updated successfully for invoice');
      }
      return res.status(200).json(updatedBooking);
    } catch (updateError) {
      console.error('API: Error in Prisma update operation:', updateError);
      return res.status(500).json({ 
        error: 'Failed to update booking in database',
        details: updateError instanceof Error ? updateError.message : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('API: Error updating booking for invoice:', error);
    return res.status(500).json({ 
      error: 'Failed to update booking',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Allow both GET and POST methods
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Handle POST requests for updating booking details for invoices
  if (req.method === 'POST') {
    return handleBookingUpdate(req, res);
  }

  try {
    const { id } = req.query;
    const supabase = createClient(req, res);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Ensure user exists in the database
    let dbUser;
    try {
      dbUser = await ensureUserExists(user);
    } catch (error) {
      console.error('Failed to ensure user exists:', error);
      return res.status(401).json({ error: 'Failed to verify user in database' });
    }

    // Check if the booking exists
    const booking = await prisma.booking.findUnique({
      where: { id: String(id) }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check if invoices exist for this booking and get the most recent active one
    const invoices = await prisma.invoice.findMany({
      where: { 
        bookingId: String(id),
        status: { not: 'voided' } // Exclude voided invoices
      },
      orderBy: {
        createdAt: 'desc' // Get the most recent one first
      },
      include: {
        booking: true,
        officer: true
      }
    });
    
    // Get the most recent invoice
    const invoice = invoices.length > 0 ? invoices[0] : null;

    if (!invoice) {
      return res.status(404).json({ error: 'No invoice found for this booking' });
    }

    // If user is a marriage officer, check if they have access to this invoice
    if (dbUser.role === 'MARRIAGE_OFFICER') {
      const officer = await prisma.marriageOfficer.findUnique({
        where: { userId: user.id }
      });

      if (!officer || (invoice.officerId && invoice.officerId !== officer.id)) {
        return res.status(403).json({ error: 'You do not have permission to access this invoice' });
      }
    }

    // Return the invoice data
    return res.status(200).json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
}