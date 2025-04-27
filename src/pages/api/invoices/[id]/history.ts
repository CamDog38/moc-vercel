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
      addApiLog(`Authentication error: ${authError?.message || 'No user found'}`, 'error', 'invoices');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Ensure user exists in the database
    let dbUser;
    try {
      dbUser = await ensureUserExists(user);
      addApiLog(`User verified: ${dbUser.email} (${dbUser.role})`, 'info', 'invoices');
    } catch (error) {
      const errorMsg = `Failed to verify user in database: ${error instanceof Error ? error.message : 'Unknown error'}`;
      addApiLog(errorMsg, 'error', 'invoices');
      return res.status(401).json({ error: 'Failed to verify user in database' });
    }

    // Check if user is an admin or marriage officer
    if (dbUser.role !== 'ADMIN' && dbUser.role !== 'SUPER_ADMIN' && dbUser.role !== 'MARRIAGE_OFFICER') {
      addApiLog(`Permission denied: User ${dbUser.email} with role ${dbUser.role} attempted to access invoice history`, 'error', 'invoices');
      return res.status(403).json({ error: 'You do not have permission to access this resource' });
    }

    // Get the invoice ID from the URL
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      addApiLog('Invoice ID is required', 'error', 'invoices');
      return res.status(400).json({ error: 'Invoice ID is required' });
    }

    // First, get the current invoice
    const currentInvoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        booking: true,
      }
    });

    if (!currentInvoice) {
      addApiLog(`Invoice not found: ${id}`, 'error', 'invoices');
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Get the booking ID to find all related invoices
    const bookingId = currentInvoice.bookingId;

    // Get all invoices for this booking
    const allInvoices = await prisma.invoice.findMany({
      where: {
        bookingId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    addApiLog(`Found ${allInvoices.length} invoices in history for booking ${bookingId}`, 'info', 'invoices');
    return res.status(200).json(allInvoices);
  } catch (error) {
    const errorMsg = `Error fetching invoice history: ${error instanceof Error ? error.message : 'Unknown error'}`;
    addApiLog(errorMsg, 'error', 'invoices');
    return res.status(500).json({ error: 'Failed to fetch invoice history' });
  }
}