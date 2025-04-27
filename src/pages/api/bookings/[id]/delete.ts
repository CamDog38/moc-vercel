import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'
import { createClient } from '@/util/supabase/api'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const supabase = createClient(req, res)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('Authentication error:', authError)
      return res.status(401).json({ message: 'Unauthorized', error: authError })
    }

    const bookingId = req.query.id as string
    if (!bookingId) {
      console.error('No booking ID provided')
      return res.status(400).json({ message: 'Booking ID is required' })
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`Attempting to delete booking: ${bookingId} for user: ${user.id}`);
    }

    // First check if the user is an admin or super admin
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true }
    });

    // Check if booking exists
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      console.error(`Booking not found: ${bookingId}`)
      return res.status(404).json({ message: 'Booking not found' })
    }

    // If user is not admin/super admin, check if booking belongs to user
    if (userRecord?.role !== 'ADMIN' && userRecord?.role !== 'SUPER_ADMIN') {
      if (booking.assignedUserId !== user.id) {
        console.error(`Unauthorized: User ${user.id} cannot delete booking ${bookingId}`)
        return res.status(403).json({ message: 'You are not authorized to delete this booking' })
      }
    }

    // Delete the booking
    const deletedBooking = await prisma.booking.delete({
      where: {
        id: bookingId,
      },
    })

    if (process.env.NODE_ENV !== 'production') {
      console.log(`Booking deleted successfully:`, deletedBooking);
    }
    return res.status(200).json({ message: 'Booking deleted successfully', booking: deletedBooking })
  } catch (error) {
    console.error('Error deleting booking:', error)
    return res.status(500).json({ 
      message: 'Error deleting booking',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}