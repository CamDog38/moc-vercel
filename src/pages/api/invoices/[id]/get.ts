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
    const { id } = req.query;
    
    addApiLog(`Fetching invoice with ID: ${id}`, 'info', 'invoices');

    // Get the authenticated user
    const supabase = createClient(req, res);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      const errorMsg = `Authentication error: ${authError?.message || 'No user found'}`;
      addApiLog(errorMsg, 'error', 'invoices');
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
      addApiLog(`Permission denied: User ${dbUser.email} with role ${dbUser.role} attempted to fetch invoice`, 'error', 'invoices');
      return res.status(403).json({ error: 'You do not have permission to view invoices' });
    }

    if (!id || typeof id !== 'string') {
      addApiLog('Invalid invoice ID provided', 'error', 'invoices');
      return res.status(400).json({ error: 'Invalid invoice ID' });
    }

    // Get the invoice with booking, officer, and line items
    const invoice = await prisma.invoice.findUnique({
      where: { id: id as string },
      include: {
        booking: true,
        officer: true,
        lineItems: true
      }
    });

    if (!invoice) {
      addApiLog(`Invoice not found with ID: ${id}`, 'error', 'invoices');
      return res.status(404).json({ error: 'Invoice not found' });
    }

    addApiLog(`Successfully fetched invoice #${invoice.invoiceNumber || id}`, 'success', 'invoices');
    return res.status(200).json({ invoice });
  } catch (error) {
    const errorMsg = `Error fetching invoice: ${error instanceof Error ? error.message : 'Unknown error'}`;
    addApiLog(errorMsg, 'error', 'invoices');
    return res.status(500).json({ 
      error: 'Failed to fetch invoice',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}