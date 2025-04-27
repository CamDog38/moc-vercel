import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';

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

    // Only admins can seed templates
    if (dbUser.role !== 'SUPER_ADMIN' && dbUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not authorized to seed templates' });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    // Check if templates already exist
    const existingTemplates = await prisma.pdfTemplate.findMany();
    
    if (existingTemplates.length > 0) {
      return res.status(400).json({ error: 'Templates already exist. Delete them first if you want to reseed.' });
    }
    
    // Get the base URL for the application
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl = `${protocol}://${host}`;
    
    // Create default invoice template
    const invoiceTemplate = await prisma.pdfTemplate.create({
      data: {
        name: 'Default Invoice Template',
        description: 'Standard invoice template with company branding',
        type: 'INVOICE',
        htmlContent: `<!DOCTYPE html>
<html>
<head>
  <title>Invoice #{{id}}</title>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div class="logo">
        <img src="/images/rect.png" alt="Company Logo" class="company-logo" />
        <h1>Marriage Services</h1>
      </div>
      <div class="invoice-details">
        <h2>INVOICE</h2>
        <table>
          <tr>
            <td>Invoice #:</td>
            <td>{{id}}</td>
          </tr>
          <tr>
            <td>Date:</td>
            <td>{{createdAtFormatted}}</td>
          </tr>
          <tr>
            <td>Status:</td>
            <td>{{status}}</td>
          </tr>
        </table>
      </div>
    </div>
    
    <div class="client-info">
      <h3>Bill To:</h3>
      <p>{{clientName}}</p>
      <p>{{clientEmail}}</p>
      <p>{{clientPhone}}</p>
    </div>
    
    <div class="service-details">
      <h3>Service Details:</h3>
      <table class="service-table">
        <tr>
          <th>Service</th>
          <th>Date</th>
          <th>Location</th>
          <th>Amount</th>
        </tr>
        <tr>
          <td>{{serviceType}}</td>
          <td>{{bookingDate}}</td>
          <td>{{location}}</td>
          <td>${{serviceRate}}</td>
        </tr>
        <tr>
          <td colspan="3">Travel Costs</td>
          <td>${{travelCosts}}</td>
        </tr>
      </table>
      
      <!-- Line Items Section -->
      {{lineItems}}
      
      <table class="service-table">
        <tr class="total-row">
          <td colspan="3"><strong>Total</strong></td>
          <td><strong>${{totalAmount}}</strong></td>
        </tr>
      </table>
    </div>
    
    <div class="officer-info">
      <h3>Marriage Officer:</h3>
      <p>{{officerName}}</p>
    </div>
    
    <div class="footer">
      <p>Thank you for choosing our services!</p>
      <p>Please make payment within 14 days of receipt.</p>
    </div>
  </div>
</body>
</html>`,
        cssContent: `body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 0;
  color: #333;
}

.invoice-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 30px;
  border-bottom: 2px solid #3b82f6;
  padding-bottom: 20px;
}

.logo {
  display: flex;
  align-items: center;
}

.company-logo {
  width: 60px;
  height: auto;
  margin-right: 15px;
}

.logo h1 {
  color: #3b82f6;
  margin: 0;
}

.invoice-details h2 {
  color: #3b82f6;
  margin-top: 0;
}

.invoice-details table {
  border-collapse: collapse;
}

.invoice-details td {
  padding: 5px 10px;
}

.client-info, .service-details, .officer-info {
  margin-bottom: 30px;
}

.service-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}

.service-table th, .service-table td {
  border: 1px solid #ddd;
  padding: 10px;
  text-align: left;
}

.service-table th {
  background-color: #f8fafc;
}

.total-row {
  background-color: #f8fafc;
}

.footer {
  margin-top: 50px;
  text-align: center;
  color: #666;
  border-top: 1px solid #ddd;
  padding-top: 20px;
}`,
        isActive: true
      }
    });
    
    // Create default booking template
    const bookingTemplate = await prisma.pdfTemplate.create({
      data: {
        name: 'Default Booking Template',
        description: 'Standard booking confirmation template',
        type: 'BOOKING',
        htmlContent: `<!DOCTYPE html>
<html>
<head>
  <title>Booking Confirmation #{{id}}</title>
</head>
<body>
  <div class="booking-container">
    <div class="header">
      <div class="logo">
        <img src="/images/rect.png" alt="Company Logo" class="company-logo" />
        <h1>Marriage Services</h1>
      </div>
      <div class="booking-details">
        <h2>BOOKING CONFIRMATION</h2>
        <table>
          <tr>
            <td>Booking #:</td>
            <td>{{id}}</td>
          </tr>
          <tr>
            <td>Date Created:</td>
            <td>{{createdAt}}</td>
          </tr>
          <tr>
            <td>Status:</td>
            <td>{{status}}</td>
          </tr>
        </table>
      </div>
    </div>
    
    <div class="client-info">
      <h3>Client Information:</h3>
      <table>
        <tr>
          <td>Name:</td>
          <td>{{name}}</td>
        </tr>
        <tr>
          <td>Email:</td>
          <td>{{email}}</td>
        </tr>
        <tr>
          <td>Phone:</td>
          <td>{{phone}}</td>
        </tr>
      </table>
    </div>
    
    <div class="event-details">
      <h3>Event Details:</h3>
      <table>
        <tr>
          <td>Date:</td>
          <td>{{date}}</td>
        </tr>
        <tr>
          <td>Time:</td>
          <td>{{time}}</td>
        </tr>
        <tr>
          <td>Location:</td>
          <td>{{location}}</td>
        </tr>
      </table>
    </div>
    
    <div class="notes">
      <h3>Notes:</h3>
      <p>{{notes}}</p>
    </div>
    
    <div class="assigned-to">
      <h3>Assigned To:</h3>
      <p>{{assignedTo}}</p>
    </div>
    
    <div class="footer">
      <p>Thank you for choosing our services!</p>
      <p>If you have any questions, please contact us.</p>
    </div>
  </div>
</body>
</html>`,
        cssContent: `body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 0;
  color: #333;
}

.booking-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 30px;
  border-bottom: 2px solid #10b981;
  padding-bottom: 20px;
}

.logo {
  display: flex;
  align-items: center;
}

.company-logo {
  width: 60px;
  height: auto;
  margin-right: 15px;
}

.logo h1 {
  color: #10b981;
  margin: 0;
}

.booking-details h2 {
  color: #10b981;
  margin-top: 0;
}

.booking-details table, .client-info table, .event-details table {
  border-collapse: collapse;
}

.booking-details td, .client-info td, .event-details td {
  padding: 5px 10px;
}

.client-info, .event-details, .notes, .assigned-to {
  margin-bottom: 30px;
}

.client-info h3, .event-details h3, .notes h3, .assigned-to h3 {
  color: #10b981;
  border-bottom: 1px solid #ddd;
  padding-bottom: 5px;
}

.footer {
  margin-top: 50px;
  text-align: center;
  color: #666;
  border-top: 1px solid #ddd;
  padding-top: 20px;
}`,
        isActive: true
      }
    });
    
    return res.status(201).json({ 
      message: 'Default templates created successfully',
      templates: [invoiceTemplate, bookingTemplate]
    });
  } catch (error) {
    console.error('Error seeding PDF templates:', error);
    return res.status(500).json({ error: 'Internal server error: ' + (error as Error).message });
  }
}