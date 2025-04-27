import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/util/supabase/api';
import prisma from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const supabase = createClient(req, res);

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    switch (req.method) {
      case 'GET':
        const invoice = await prisma.invoice.findUnique({
          where: { id: id as string },
          include: {
            booking: true,
            lineItems: true,
            officer: true,
          },
        });

        if (!invoice) {
          return res.status(404).json({ error: 'Invoice not found' });
        }

        return res.status(200).json(invoice);

      case 'PUT':
        const updates = req.body;
        const { lineItems, ...invoiceUpdates } = updates;
        
        // Calculate total amount from line items only
        let totalAmount = 0;
        
        // Handle line items if provided
        if (lineItems) {
          // Process line items
          for (const item of lineItems) {
            if (item.id) {
              // Update existing line item
              if (item._delete) {
                // Delete the line item
                await prisma.invoiceLineItem.delete({
                  where: { id: item.id },
                });
              } else {
                // Update the line item
                const amount = parseFloat(item.quantity) * parseFloat(item.unitPrice);
                await prisma.invoiceLineItem.update({
                  where: { id: item.id },
                  data: {
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    amount: amount,
                    updatedAt: new Date(),
                  },
                });
                totalAmount += amount;
              }
            } else if (!item._delete) {
              // Create new line item
              const amount = parseFloat(item.quantity) * parseFloat(item.unitPrice);
              await prisma.invoiceLineItem.create({
                data: {
                  invoiceId: id as string,
                  description: item.description,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  amount: amount,
                  updatedAt: new Date(),
                },
              });
              totalAmount += amount;
            }
          }
        } else {
          // If no line items provided, add existing line items to total
          const currentInvoice = await prisma.invoice.findUnique({
            where: { id: id as string },
            include: {
              lineItems: true,
            },
          });
          if (!currentInvoice) {
            return res.status(404).json({ error: 'Invoice not found' });
          }
          for (const item of currentInvoice.lineItems) {
            totalAmount += parseFloat(item.amount.toString());
          }
        }
        
        // Update the invoice with the new data
        const updatedInvoice = await prisma.invoice.update({
          where: { id: id as string },
          data: {
            serviceType: invoiceUpdates.serviceType,
            officerId: invoiceUpdates.officerId,
            totalAmount: totalAmount,
            updatedAt: new Date(),
          },
          include: {
            lineItems: true,
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
              },
            },
          },
        });

        return res.status(200).json(updatedInvoice);

      default:
        res.setHeader('Allow', ['GET', 'PUT']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}