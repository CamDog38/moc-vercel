import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/util/supabase/api';
import prisma from '@/lib/prisma';
import { ensureUserExists } from '@/util/auth-helpers';
import { generateCustomInvoiceId } from '@/util/invoice-helpers';
import { addApiLog } from '../debug/logs/index';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // No need for CORS headers in same-origin requests

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
        console.log('Fetching invoices for user:', user.id);
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
          // Show invoices assigned to this officer
          whereClause = { officerId: officer.id };
        } else {
          // If user is a marriage officer but doesn't have an officer record,
          // don't show any invoices
          whereClause = { id: 'none' }; // This ensures no results
        }
      }
      
      // Add date range filter if provided
      const { fromDate, toDate } = req.query;
      if (fromDate && toDate) {
        try {
          const from = new Date(fromDate as string);
          const to = new Date(toDate as string);
          
          // Set the time to the beginning and end of the day
          from.setHours(0, 0, 0, 0);
          to.setHours(23, 59, 59, 999);
          
          whereClause.createdAt = {
            gte: from,
            lte: to
          };
          
          if (process.env.NODE_ENV !== 'production') {
            console.log('Date range filter:', { from, to });
          }
        } catch (error) {
          console.error('Invalid date format:', error);
        }
      }
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('Using where clause:', whereClause);
      }
      
      // Check if we should include line items and payments
      const { include } = req.query;
      const includeParams = include ? (include as string).split(',') : [];
      
      addApiLog(`Fetching invoices with include params: ${includeParams.join(', ')}`, 'info', 'invoices');
      
      const invoices = await prisma.invoice.findMany({
        where: whereClause,
        include: {
          booking: {
            select: {
              id: true,
              date: true,
              time: true,
              location: true,
              status: true,
              name: true,
              email: true,
              phone: true,
              notes: true,
            },
          },
          officer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              title: true,
            },
          },
          lineItems: includeParams.includes('lineItems'),
          payments: includeParams.includes('payments'),
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return res.status(200).json(invoices);
    } catch (dbError) {
      console.error('Database error:', dbError);
      return res.status(500).json({ 
        error: 'Failed to fetch invoices',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      });
    }
  } else if (req.method === 'POST') {
    try {
      const { bookingId, serviceType, officerId, lineItems } = req.body;

      if (!bookingId) {
        return res.status(400).json({ error: 'Booking ID is required' });
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
        console.log('User role for invoice creation:', dbUser.role);
      }

      // Build the where clause based on user role
      let bookingWhereClause: any = { id: bookingId };
      
      // If user is a marriage officer, they can only create invoices for their bookings or unassigned bookings
      if (dbUser.role === 'MARRIAGE_OFFICER') {
        bookingWhereClause.OR = [
          { assignedUserId: user.id },
          { assignedUserId: null }
        ];
      }
      // Admins can create invoices for any booking
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('Using booking where clause:', bookingWhereClause);
      }
      
      const booking = await prisma.booking.findFirst({
        where: bookingWhereClause
      });

      if (!booking) {
        return res.status(404).json({ error: 'Booking not found or unauthorized' });
      }

      // Check if any active (non-voided) invoices exist for this booking
      const existingInvoices = await prisma.invoice.findMany({
        where: {
          bookingId: bookingId,
          status: { not: 'voided' }
        }
      });

      if (existingInvoices.length > 0) {
        return res.status(400).json({ error: 'An active invoice already exists for this booking. Please void the existing invoice before creating a new one.' });
      }

      // Calculate base amount
      let baseAmount = 0;
      
      // Calculate line items total
      let lineItemsTotal = 0;
      if (lineItems && Array.isArray(lineItems) && lineItems.length > 0) {
        lineItemsTotal = lineItems.reduce((total, item: { quantity: string | number; unitPrice: string | number }) => {
          const quantity = parseFloat(item.quantity.toString()) || 0;
          const unitPrice = parseFloat(item.unitPrice.toString()) || 0;
          return total + (quantity * unitPrice);
        }, 0);
      }
      
      // Calculate total amount
      const totalAmount = baseAmount + lineItemsTotal;

      // Generate custom invoice ID - always create a new one for each invoice
      const invoiceNumber = await generateCustomInvoiceId(officerId);
      
      // Log the invoice number being generated
      console.log(`Generating new invoice number: ${invoiceNumber} for booking: ${bookingId}`);
      
      // Create the invoice with line items if provided
      const invoice = await prisma.invoice.create({
        data: {
          bookingId,
          serviceType: serviceType || 'REGISTRATION_OFFICE',
          serviceRate: 0,
          travelCosts: 0,
          totalAmount,
          status: 'pending',
          officerId: officerId || null,
          invoiceNumber, // Always use the newly generated invoice number
          // Always create line items from the provided line items, never reuse old ones
          lineItems: {
            create: lineItems && Array.isArray(lineItems) && lineItems.length > 0 ? 
              lineItems.map((item: { description: string; quantity: string | number; unitPrice: string | number }) => {
                const quantity = parseFloat(item.quantity.toString()) || 0;
                const unitPrice = parseFloat(item.unitPrice.toString()) || 0;
                const amount = quantity * unitPrice;
                return {
                  description: item.description,
                  quantity,
                  unitPrice,
                  amount
                };
              }) : []
          }
        },
        include: {
          booking: {
            select: {
              id: true,
              date: true,
              time: true,
              location: true,
              status: true,
              name: true,
              email: true,
              phone: true,
              notes: true,
            },
          },
          lineItems: true,
        },
      });

      return res.status(201).json(invoice);
    } catch (error) {
      console.error('Error creating invoice:', error);
      return res.status(500).json({ 
        error: 'Failed to create invoice',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}