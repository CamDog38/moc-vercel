import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import { ensureUserExists } from '@/util/auth-helpers';
import { addApiLog } from '../../debug/logs/index';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the authenticated user
    const supabase = createClient(req, res);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      addApiLog(`Authentication error: ${authError?.message || 'No user found'}`, 'error', 'other');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Ensure user exists in the database
    let dbUser;
    try {
      dbUser = await ensureUserExists(user);
      addApiLog(`User verified: ${dbUser.email} (${dbUser.role})`, 'info', 'other');
    } catch (error) {
      const errorMsg = `Failed to verify user in database: ${error instanceof Error ? error.message : 'Unknown error'}`;
      addApiLog(errorMsg, 'error', 'other');
      return res.status(401).json({ error: 'Failed to verify user in database' });
    }

    // Check if user is an admin or marriage officer
    if (dbUser.role !== 'ADMIN' && dbUser.role !== 'SUPER_ADMIN' && dbUser.role !== 'MARRIAGE_OFFICER') {
      addApiLog(`Permission denied: User ${dbUser.email} with role ${dbUser.role} attempted to access booking invoices`, 'error', 'other');
      return res.status(403).json({ error: 'You do not have permission to access this resource' });
    }

    // Get the booking ID from the URL
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      addApiLog('Booking ID is required', 'error', 'other');
      return res.status(400).json({ error: 'Booking ID is required' });
    }

    // Get all invoices for the booking
    const invoices = await prisma.invoice.findMany({
      where: {
        bookingId: id
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    addApiLog(`Found ${invoices.length} invoices for booking ${id}`, 'info', 'other');
    return res.status(200).json(invoices);
  } catch (error) {
    const errorMsg = `Error fetching booking invoices: ${error instanceof Error ? error.message : 'Unknown error'}`;
    addApiLog(errorMsg, 'error', 'other');
    return res.status(500).json({ error: 'Failed to fetch booking invoices' });
  }
}
