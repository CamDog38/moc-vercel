import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import { ensureUserExists } from '@/util/auth-helpers';
import { addApiLog } from '../../debug/logs/index';
import { generateCustomInvoiceId } from '@/util/invoice-helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const { officerId, lineItems, serviceType, serviceRate, travelCosts } = req.body;
    
    addApiLog(`Starting invoice send process for invoice ID: ${id}`, 'info', 'emails');
    addApiLog(`Request body: ${JSON.stringify(req.body)}`, 'info', 'emails');

    // Get the authenticated user
    const supabase = createClient(req, res);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      const errorMsg = `Authentication error: ${authError?.message || 'No user found'}`;
      addApiLog(errorMsg, 'error', 'emails');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Ensure user exists in the database
    let dbUser;
    try {
      dbUser = await ensureUserExists(user);
      addApiLog(`User verified: ${dbUser.email} (${dbUser.role})`, 'info', 'emails');
    } catch (error) {
      const errorMsg = `Failed to verify user in database: ${error instanceof Error ? error.message : 'Unknown error'}`;
      addApiLog(errorMsg, 'error', 'emails');
      return res.status(401).json({ error: 'Failed to verify user in database' });
    }

    // Check if user is an admin or marriage officer
    if (dbUser.role !== 'ADMIN' && dbUser.role !== 'SUPER_ADMIN' && dbUser.role !== 'MARRIAGE_OFFICER') {
      addApiLog(`Permission denied: User ${dbUser.email} with role ${dbUser.role} attempted to send invoice`, 'error', 'emails');
      return res.status(403).json({ error: 'You do not have permission to send invoices' });
    }

    if (!id || typeof id !== 'string') {
      addApiLog('Invalid invoice ID provided', 'error', 'emails');
      return res.status(400).json({ error: 'Invalid invoice ID' });
    }

    // Get the invoice with booking and officer details
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        booking: true,
        officer: true
      }
    });

    if (!invoice) {
      addApiLog(`Invoice not found with ID: ${id}`, 'error', 'emails');
      return res.status(404).json({ error: 'Invoice not found' });
    }

    addApiLog(`Found invoice #${invoice.invoiceNumber || id} for ${invoice.booking?.name || 'Unknown client'}`, 'info', 'emails');

    // Check if the invoice has an assigned officer
    if (!invoice.officerId) {
      addApiLog('Invoice missing assigned marriage officer', 'error', 'emails');
      return res.status(400).json({ error: 'Invoice must have an assigned marriage officer before sending' });
    }

    // Check if the invoice has a valid booking
    if (!invoice.booking) {
      addApiLog('Invoice missing associated booking', 'error', 'emails');
      return res.status(400).json({ error: 'Invoice must be associated with a valid booking' });
    }

    // Check if the booking has an email
    if (!invoice.booking.email) {
      addApiLog('Booking missing email address', 'error', 'emails');
      return res.status(400).json({ error: 'Booking must have an email address to send the invoice' });
    }

    // Check if we need to update the marriage officer
    let newInvoiceNumber = null;
    let officerChanged = false;
    
    const currentInvoice = await prisma.invoice.findUnique({
      where: { id },
      select: { officerId: true }
    });
    
    if (officerId && currentInvoice && officerId !== currentInvoice.officerId) {
      officerChanged = true;
      // Generate a new invoice number based on the new officer
      newInvoiceNumber = await generateCustomInvoiceId(officerId);
      addApiLog(`Officer changed. Generated new invoice number: ${newInvoiceNumber}`, 'info', 'emails');
    }
    
    // Prepare update data
    const updateData: any = {
      status: 'sent'
    };
    
    // If officer changed, update the officer and invoice number
    if (officerChanged) {
      updateData.officerId = officerId;
      updateData.invoiceNumber = newInvoiceNumber;
    }
    
    // If service details were provided, update them
    if (serviceType) updateData.serviceType = serviceType;
    if (serviceRate !== undefined) updateData.serviceRate = serviceRate;
    if (travelCosts !== undefined) updateData.travelCosts = travelCosts;
    
    // Update the invoice
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: updateData
    });
    
    // If line items were provided, update them
    if (lineItems && Array.isArray(lineItems)) {
      // First, delete all existing line items
      await prisma.invoiceLineItem.deleteMany({
        where: { invoiceId: id }
      });
      
      // Then create the new line items
      for (const item of lineItems) {
        await prisma.invoiceLineItem.create({
          data: {
            invoiceId: id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount || (parseFloat(item.quantity) * parseFloat(item.unitPrice))
          }
        });
      }
      
      // Calculate and update the total amount
      const totalAmount = lineItems.reduce((sum, item) => {
        const amount = parseFloat(item.amount) || (parseFloat(item.quantity) * parseFloat(item.unitPrice));
        return sum + amount;
      }, 0);
      
      await prisma.invoice.update({
        where: { id },
        data: { totalAmount }
      });
      
      addApiLog(`Updated ${lineItems.length} line items and total amount: ${totalAmount}`, 'success', 'emails');
    }
    
    addApiLog(`Updated invoice status to 'sent'`, 'success', 'emails');

    // Now call the email sending API to send the actual email
    try {
      addApiLog('Calling email sending API...', 'info', 'emails');
      
      // Get the default invoice template for the user
      const invoiceTemplate = await prisma.emailTemplate.findFirst({
        where: {
          type: 'INVOICE',
          userId: user.id
        }
      });
      
      if (!invoiceTemplate) {
        addApiLog('No default invoice email template found', 'error', 'emails');
        throw new Error('No default invoice email template found');
      }
      
      addApiLog(`Using email template: ${invoiceTemplate.name} (ID: ${invoiceTemplate.id})`, 'info', 'emails');
      
      // Import axios
      const axios = require('axios');
      
      // Use the getBaseUrl utility function to get the appropriate base URL
      const { getBaseUrl } = require('@/util/api-helpers');
      const baseUrl = getBaseUrl();
      
      if (!baseUrl) {
        addApiLog('Base URL is empty, cannot call email API', 'error', 'emails');
        throw new Error('Base URL is empty, cannot call email API. Please set NEXT_PUBLIC_BASE_URL environment variable.');
      }
      
      addApiLog(`Using base URL for email API: ${baseUrl}`, 'info', 'emails');
      
      try {
        // Extract the authentication token from the request
        const authToken = await supabase.auth.getSession();
        
        // Add a special header to identify this as an internal server-to-server API call
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken.data.session?.access_token || ''}`,
          'X-Internal-API-Call': 'true',
          'X-User-ID': user.id
        };
        
        // Construct the API URL using the base URL
        const apiUrl = `${baseUrl}/api/emails/send-invoice`;
        addApiLog(`Making internal API call to ${apiUrl} with headers: ${JSON.stringify(headers)}`, 'info', 'emails');
        
        // Call the email sending API using axios
        const emailResponse = await axios.post(
          apiUrl,
          {
            invoiceId: id,
            templateId: invoiceTemplate.id,
            // Include user ID in the request body for authentication
            userId: user.id
          },
          {
            headers: headers
          }
        );
        
        // Check if the response is successful
        if (emailResponse.status >= 200 && emailResponse.status < 300) {
          addApiLog('Invoice email sent successfully', 'success', 'emails');
        } else {
          addApiLog(`Failed to send invoice email: ${JSON.stringify(emailResponse.data)}`, 'error', 'emails');
          throw new Error(emailResponse.data?.error || 'Unknown error sending email');
        }
      } catch (error) {
        addApiLog(`Error sending invoice email: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'emails');
        
        // Check if the error has a response (axios error)
        const axiosError = error as any;
        if (axiosError.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          addApiLog(`Email API response error: ${JSON.stringify({
            status: axiosError.response.status,
            data: axiosError.response.data
          })}`, 'error', 'emails');
        } else if (axiosError.request) {
          // The request was made but no response was received
          addApiLog('Email API request made but no response received', 'error', 'emails');
        } else {
          // Something happened in setting up the request
          const errorMessage = axiosError.message || 'Unknown error';
          addApiLog(`Email API request setup error: ${errorMessage}`, 'error', 'emails');
        }
        
        // We don't want to fail the entire request if just the email fails
        // The invoice is already marked as sent
      }
      
      addApiLog('Invoice email sent successfully', 'success', 'emails');
    } catch (emailError) {
      const errorMsg = `Error sending invoice email: ${emailError instanceof Error ? emailError.message : 'Unknown error'}`;
      addApiLog(errorMsg, 'error', 'emails');
      // We don't want to fail the entire request if just the email fails
      // The invoice is already marked as sent
    }

    // Check if there are any Zapier webhooks to trigger
    const webhooks = await prisma.zapierWebhook.findMany({
      where: { isActive: true }
    });

    // If there are active webhooks, trigger them with the invoice data
    if (webhooks.length > 0) {
      try {
        addApiLog(`Triggering ${webhooks.length} Zapier webhooks`, 'info', 'emails');
        
        // Prepare the payload with all relevant invoice data
        const payload = {
          invoice: {
            id: invoice.id,
            status: 'sent',
            serviceType: invoice.serviceType,
            serviceRate: invoice.serviceRate,
            travelCosts: invoice.travelCosts,
            totalAmount: invoice.totalAmount,
            createdAt: invoice.createdAt,
            updatedAt: new Date()
          },
          booking: {
            id: invoice.booking.id,
            name: invoice.booking.name,
            email: invoice.booking.email,
            phone: invoice.booking.phone,
            date: invoice.booking.date,
            time: invoice.booking.time,
            location: invoice.booking.location
          },
          officer: invoice.officer ? {
            id: invoice.officer.id,
            name: `${invoice.officer.firstName} ${invoice.officer.lastName}`,
            title: invoice.officer.title,
            phoneNumber: invoice.officer.phoneNumber
          } : null
        };

        // Send the payload to each active webhook
        const webhookPromises = webhooks.map(webhook => 
          fetch(webhook.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          })
        );

        // Wait for all webhook calls to complete
        const webhookResults = await Promise.allSettled(webhookPromises);
        
        // Log webhook results
        webhookResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            addApiLog(`Webhook ${index + 1} triggered successfully`, 'success', 'emails');
          } else {
            addApiLog(`Webhook ${index + 1} failed: ${result.reason}`, 'error', 'emails');
          }
        });
      } catch (webhookError) {
        const errorMsg = `Error triggering webhooks: ${webhookError instanceof Error ? webhookError.message : 'Unknown error'}`;
        addApiLog(errorMsg, 'error', 'emails');
        // We don't want to fail the request if webhooks fail
      }
    }

    addApiLog(`Invoice send process completed successfully for invoice ID: ${id}`, 'success', 'emails');
    return res.status(200).json({ 
      message: 'Invoice sent successfully',
      invoice: updatedInvoice,
      invoiceNumberChanged: officerChanged,
      newInvoiceNumber: newInvoiceNumber
    });
  } catch (error) {
    const errorMsg = `Error sending invoice: ${error instanceof Error ? error.message : 'Unknown error'}`;
    addApiLog(errorMsg, 'error', 'emails');
    return res.status(500).json({ 
      error: 'Failed to send invoice',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}