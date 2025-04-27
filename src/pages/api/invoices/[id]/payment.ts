import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import { addApiLog } from '../../debug/logs/index';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const { amount, paymentMethod, lineItemId, paymentType, notes } = req.body;
    
    addApiLog(`Processing payment for invoice ID: ${id}`, 'info', 'payments');

    // Validate input
    if (!amount || isNaN(parseFloat(amount.toString()))) {
      addApiLog('Invalid payment amount', 'error', 'payments');
      return res.status(400).json({ error: 'Invalid payment amount' });
    }

    if (!paymentMethod) {
      addApiLog('Payment method is required', 'error', 'payments');
      return res.status(400).json({ error: 'Payment method is required' });
    }

    // Get the authenticated user
    const supabase = createClient(req, res);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      const errorMsg = `Authentication error: ${authError?.message || 'No user found'}`;
      addApiLog(errorMsg, 'error', 'payments');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get the user's role from the database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true }
    });

    if (!dbUser) {
      addApiLog('User not found in database', 'error', 'payments');
      return res.status(401).json({ error: 'User not found in database' });
    }

    // Check if user has permission to process payments
    if (dbUser.role !== 'SUPER_ADMIN' && dbUser.role !== 'ADMIN') {
      addApiLog(`Permission denied: User with role ${dbUser.role} attempted to process payment`, 'error', 'payments');
      return res.status(403).json({ error: 'Not authorized to process payments' });
    }

    // Get the invoice with line items and existing payments
    const invoice = await prisma.invoice.findUnique({
      where: { id: id as string },
      include: {
        lineItems: true,
        payments: true
      }
    });

    if (!invoice) {
      addApiLog(`Invoice not found with ID: ${id}`, 'error', 'payments');
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Calculate current total paid and balance due
    const totalPaid = invoice.payments.reduce(
      (sum, payment) => sum + Number(payment.amount), 
      0
    );
    
    const paymentAmount = parseFloat(amount.toString());
    const newTotalPaid = totalPaid + paymentAmount;
    const newBalanceDue = Number(invoice.totalAmount) - newTotalPaid;
    
    addApiLog(`Payment calculation: Total amount: ${invoice.totalAmount}, Previous payments: ${totalPaid}, New payment: ${paymentAmount}, New total paid: ${newTotalPaid}, New balance due: ${newBalanceDue}`, 'info', 'payments');

    // Create the payment record
    const payment = await prisma.invoicePayment.create({
      data: {
        invoiceId: id as string,
        amount: paymentAmount,
        paymentMethod,
        ...(lineItemId && { lineItemId }),
        ...(notes && { notes })
      }
    });

    // Update the invoice with new payment information
    const updatedInvoice = await prisma.invoice.update({
      where: { id: id as string },
      data: {
        amountPaid: newTotalPaid,
        balanceDue: newBalanceDue,
        paymentDate: new Date(),
        // If full payment, mark as paid
        ...(newBalanceDue <= 0 && { status: 'paid' })
      },
      include: {
        lineItems: true,
        payments: true,
        booking: {
          select: {
            id: true,
            name: true,
            email: true,
            date: true
          }
        }
      }
    });

    addApiLog(`Payment processed successfully for invoice #${invoice.invoiceNumber || id}`, 'success', 'payments');
    return res.status(200).json({ 
      success: true, 
      invoice: updatedInvoice,
      payment
    });
  } catch (error) {
    const errorMsg = `Error processing payment: ${error instanceof Error ? error.message : 'Unknown error'}`;
    addApiLog(errorMsg, 'error', 'payments');
    return res.status(500).json({ 
      error: 'Failed to process payment',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}