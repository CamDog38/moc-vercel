import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import { ensureUserExists } from '@/util/auth-helpers';
import { addApiLog } from '../debug/logs/index';
import { generateCustomInvoiceId } from '@/util/invoice-helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { originalInvoiceId, officerId, serviceType, serviceRate, travelCosts, lineItems } = req.body;
    
    addApiLog(`Starting replacement invoice creation for original invoice ID: ${originalInvoiceId}`, 'info', 'other');

    // Get the authenticated user
    const supabase = createClient(req, res);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      const errorMsg = `Authentication error: ${authError?.message || 'No user found'}`;
      addApiLog(errorMsg, 'error', 'other');
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
      addApiLog(`Permission denied: User ${dbUser.email} with role ${dbUser.role} attempted to create replacement invoice`, 'error', 'other');
      return res.status(403).json({ error: 'You do not have permission to create replacement invoices' });
    }

    // Validate required fields
    if (!originalInvoiceId) {
      addApiLog('Original invoice ID is required', 'error', 'other');
      return res.status(400).json({ error: 'Original invoice ID is required' });
    }

    if (!officerId) {
      addApiLog('Marriage officer ID is required', 'error', 'other');
      return res.status(400).json({ error: 'Marriage officer ID is required' });
    }

    // Get the original invoice
    const originalInvoice = await prisma.invoice.findUnique({
      where: { id: originalInvoiceId },
      include: {
        booking: true,
        lineItems: true
      }
    });

    if (!originalInvoice) {
      addApiLog(`Original invoice not found with ID: ${originalInvoiceId}`, 'error', 'other');
      return res.status(404).json({ error: 'Original invoice not found' });
    }

    // Check if original invoice is voided
    if (originalInvoice.status !== 'voided') {
      addApiLog(`Original invoice ${originalInvoiceId} is not voided`, 'error', 'other');
      return res.status(400).json({ error: 'Original invoice must be voided before creating a replacement' });
    }

    // Generate a new invoice number
    const invoiceNumber = await generateCustomInvoiceId(officerId);
    addApiLog(`Generated new invoice number: ${invoiceNumber}`, 'info', 'other');

    // Calculate total amount from line items
    let totalAmount = 0;
    if (lineItems && Array.isArray(lineItems)) {
      totalAmount = lineItems.reduce((sum, item) => {
        const amount = parseFloat(item.amount) || (parseFloat(item.quantity) * parseFloat(item.unitPrice));
        return sum + amount;
      }, 0);
    }

    // Log the original invoice data for debugging
    addApiLog(`Original invoice data - serviceType: ${originalInvoice.serviceType}, serviceRate: ${originalInvoice.serviceRate}, travelCosts: ${originalInvoice.travelCosts}`, 'info', 'other');
    addApiLog(`New invoice data - serviceType: ${serviceType}, serviceRate: ${serviceRate}, travelCosts: ${travelCosts}`, 'info', 'other');
    addApiLog(`Using officerId: ${officerId} (original was: ${originalInvoice.officerId})`, 'info', 'other');
    
    // Create the new invoice - ONLY use the booking ID from the original invoice
    // All other data comes from the request body
    const newInvoice = await prisma.invoice.create({
      data: {
        bookingId: originalInvoice.bookingId,
        status: 'pending',
        serviceType: serviceType,
        serviceRate: serviceRate,
        travelCosts: travelCosts,
        totalAmount: totalAmount,
        officerId: officerId,
        invoiceNumber: invoiceNumber,
        userId: dbUser.id
      }
    });
    
    // Update the original invoice to point to the replacement
    // Using Prisma's raw SQL to avoid type issues
    await prisma.$executeRaw`UPDATE "Invoice" SET "replacementInvoiceId" = ${newInvoice.id} WHERE "id" = ${originalInvoiceId}`;    
    
    // Update the new invoice to reference the original
    await prisma.$executeRaw`UPDATE "Invoice" SET "originalInvoiceId" = ${originalInvoiceId} WHERE "id" = ${newInvoice.id}`;

    addApiLog(`Updated original invoice ${originalInvoiceId} with replacementInvoiceId ${newInvoice.id}`, 'info', 'other');

    // Create line items if provided
    if (lineItems && Array.isArray(lineItems)) {
      for (const item of lineItems) {
        await prisma.invoiceLineItem.create({
          data: {
            invoiceId: newInvoice.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount || (parseFloat(item.quantity) * parseFloat(item.unitPrice))
          }
        });
      }
    }
    // We no longer copy line items from the original invoice - always start fresh

    addApiLog(`Replacement invoice created successfully with ID: ${newInvoice.id}`, 'success', 'other');
    return res.status(200).json({ 
      message: 'Replacement invoice created successfully',
      invoice: newInvoice
    });
  } catch (error) {
    const errorMsg = `Error creating replacement invoice: ${error instanceof Error ? error.message : 'Unknown error'}`;
    addApiLog(errorMsg, 'error', 'other');
    return res.status(500).json({ 
      error: 'Failed to create replacement invoice',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}