import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { EmailTemplateType } from '@prisma/client';

// Default invoice email template with invoice link variable
const DEFAULT_INVOICE_TEMPLATE = {
  name: 'Default Invoice Email',
  subject: 'Your Invoice {{invoice.invoiceNumber}} is Ready',
  type: EmailTemplateType.INVOICE,
  description: 'Default template for sending invoices to clients',
  htmlContent: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f5f5f5; padding: 20px; text-align: center; border-bottom: 3px solid #007bff; }
    .content { padding: 20px; background-color: #ffffff; }
    .invoice-details { background-color: #f9f9f9; border: 1px solid #ddd; padding: 15px; margin: 20px 0; border-radius: 5px; }
    .invoice-details table { width: 100%; border-collapse: collapse; }
    .invoice-details th, .invoice-details td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
    .button { display: inline-block; background-color: #007bff; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px; margin-top: 15px; font-weight: bold; }
    .footer { background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Invoice {{invoice.invoiceNumber}}</h1>
    </div>
    <div class="content">
      <p>Dear {{invoice.booking.name}},</p>
      <p>Thank you for choosing our services. Your invoice is now ready for review.</p>
      
      <div class="invoice-details">
        <h3>Invoice Details</h3>
        <table>
          <tr>
            <th>Invoice Number:</th>
            <td>{{invoice.invoiceNumber}}</td>
          </tr>
          <tr>
            <th>Service:</th>
            <td>{{invoice.serviceType}}</td>
          </tr>
          <tr>
            <th>Date:</th>
            <td>{{invoice.booking.date}}</td>
          </tr>
          <tr>
            <th>Time:</th>
            <td>{{invoice.booking.time}}</td>
          </tr>
          <tr>
            <th>Location:</th>
            <td>{{invoice.booking.location}}</td>
          </tr>
          <tr>
            <th>Total Amount:</th>
            <td><strong>{{invoice.totalAmount}}</strong></td>
          </tr>
        </table>
      </div>
      
      <p>To view your complete invoice and make a payment, please click the button below:</p>
      
      <div style="text-align: center;">
        <a href="{{invoiceLink}}" class="button">View Invoice</a>
      </div>
      
      <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>
      
      <p>Best regards,<br>
      {{invoice.officer.firstName}} {{invoice.officer.lastName}}</p>
    </div>
    <div class="footer">
      <p>This is an automated email. Please do not reply directly to this message.</p>
    </div>
  </div>
</body>
</html>`
};

export async function ensureInvoiceTemplate(userId: string) {
  try {
    // Check if the user already has an invoice template
    const existingTemplate = await prisma.emailTemplate.findFirst({
      where: {
        userId,
        type: EmailTemplateType.INVOICE,
      },
    });

    // If no template exists, create the default one
    if (!existingTemplate) {
      await prisma.emailTemplate.create({
        data: {
          ...DEFAULT_INVOICE_TEMPLATE,
          userId,
        },
      });
      return { created: true };
    }

    return { created: false };
  } catch (error) {
    console.error('Error ensuring invoice template:', error);
    throw error;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const result = await ensureInvoiceTemplate(userId);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in API route:', error);
    return res.status(500).json({ 
      error: 'Failed to ensure invoice template',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}