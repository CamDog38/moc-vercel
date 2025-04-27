import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import { triggerInvoiceWebhooks } from '@/util/webhooks';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createClient(req, res);
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get the user's role from the database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true }
    });

    if (!dbUser) {
      return res.status(401).json({ error: 'User not found in database' });
    }

    const { id } = req.query;

    if (req.method === 'PUT') {
      const { 
        officerId, 
        serviceType, 
        serviceRate, 
        travelCosts, 
        status, 
        sendEmail,
        lineItems,
        amountPaid,
        paymentMethod,
        paymentDate
      } = req.body;

      // Check if invoice exists
      const invoice = await prisma.invoice.findUnique({
        where: { id: id as string },
        include: {
          booking: true,
          lineItems: true
        }
      });

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      // Check if user has permission to update this invoice
      if (dbUser.role !== 'SUPER_ADMIN' && dbUser.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Not authorized to update invoices' });
      }

      // Handle line items if provided
      let lineItemsOperations = {};
      if (lineItems && Array.isArray(lineItems)) {
        // Process line items
        const itemsToCreate = lineItems.filter(item => !item.id && !item._delete);
        const itemsToUpdate = lineItems.filter(item => item.id && !item._delete);
        const itemsToDelete = lineItems.filter(item => item.id && item._delete);

        // Create operations object for Prisma
        lineItemsOperations = {
          // Create new items
          ...(itemsToCreate.length > 0 && {
            create: itemsToCreate.map(item => {
              const quantity = parseFloat(item.quantity) || 0;
              const unitPrice = parseFloat(item.unitPrice) || 0;
              const amount = quantity * unitPrice;
              
              return {
                description: item.description,
                quantity,
                unitPrice,
                amount
              };
            })
          }),
          
          // Update existing items
          ...(itemsToUpdate.length > 0 && {
            updateMany: itemsToUpdate.map(item => {
              const quantity = parseFloat(item.quantity) || 0;
              const unitPrice = parseFloat(item.unitPrice) || 0;
              const amount = quantity * unitPrice;
              
              return {
                where: { id: item.id },
                data: {
                  description: item.description,
                  quantity,
                  unitPrice,
                  amount
                }
              };
            })
          }),
          
          // Delete items
          ...(itemsToDelete.length > 0 && {
            deleteMany: {
              id: { in: itemsToDelete.map(item => item.id) }
            }
          })
        };
      }

      // Calculate total amount including line items
      let baseAmount = 
        ((serviceRate !== undefined && !isNaN(parseFloat(serviceRate.toString()))) 
          ? parseFloat(serviceRate.toString()) 
          : invoice.serviceRate || 0) + 
        ((travelCosts !== undefined && !isNaN(parseFloat(travelCosts.toString()))) 
          ? parseFloat(travelCosts.toString()) 
          : invoice.travelCosts || 0);
      
      // Calculate line items total
      let lineItemsTotal = 0;
      
      // Include existing line items that aren't being deleted
      if (invoice.lineItems) {
        const lineItemsToDelete = lineItems?.filter(item => item.id && item._delete)?.map(item => item.id) || [];
        
        for (const item of invoice.lineItems) {
          if (!lineItemsToDelete.includes(item.id)) {
            lineItemsTotal += Number(item.amount);
          }
        }
      }
      
      // Add new line items
      if (lineItems && Array.isArray(lineItems)) {
        const newItems = lineItems.filter(item => !item.id && !item._delete);
        for (const item of newItems) {
          const quantity = parseFloat(item.quantity) || 0;
          const unitPrice = parseFloat(item.unitPrice) || 0;
          lineItemsTotal += quantity * unitPrice;
        }
        
        // Update existing items
        const updatedItems = lineItems.filter(item => item.id && !item._delete);
        for (const item of updatedItems) {
          const quantity = parseFloat(item.quantity) || 0;
          const unitPrice = parseFloat(item.unitPrice) || 0;
          lineItemsTotal += quantity * unitPrice;
          
          // Subtract the original amount that we added earlier
          const originalItem = invoice.lineItems.find(li => li.id === item.id);
          if (originalItem) {
            lineItemsTotal -= Number(originalItem.amount);
          }
        }
      }
      
      const totalAmount = baseAmount + lineItemsTotal;

      // Update the invoice
      const updatedInvoice = await prisma.invoice.update({
        where: { id: id as string },
        data: {
          ...(officerId !== undefined && { officerId }),
          ...(serviceType && { serviceType }),
          ...(serviceRate !== undefined && !isNaN(parseFloat(serviceRate.toString())) && { 
            serviceRate: parseFloat(serviceRate.toString()) 
          }),
          ...(travelCosts !== undefined && !isNaN(parseFloat(travelCosts.toString())) && { 
            travelCosts: parseFloat(travelCosts.toString()) 
          }),
          ...(status && { status }),
          ...(amountPaid !== undefined && !isNaN(parseFloat(amountPaid.toString())) && {
            amountPaid: parseFloat(amountPaid.toString())
          }),
          ...(paymentMethod && { paymentMethod }),
          ...(paymentDate && { paymentDate: new Date(paymentDate) }),
          totalAmount,
          ...(Object.keys(lineItemsOperations).length > 0 && { lineItems: lineItemsOperations })
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

      // If sendEmail is true, send the invoice to the client
      if (sendEmail) {
        // TODO: Implement email sending functionality
        // For now, we'll just log that we would send an email
        if (process.env.NODE_ENV !== 'production') {
          console.log(`Would send invoice ${id} to ${invoice.booking.email}`);
        }
      }

      // Trigger Zapier webhooks
      try {
        await triggerInvoiceWebhooks(id as string);
      } catch (webhookError) {
        console.error('Error triggering webhooks:', webhookError);
        // Continue with the response even if webhook triggering fails
      }

      return res.status(200).json(updatedInvoice);
    }

    res.setHeader('Allow', ['PUT']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  } catch (error) {
    console.error('Error in invoices API:', error);
    return res.status(500).json({ error: 'Internal server error: ' + (error as Error).message });
  }
}
