import prisma from '../src/lib/prisma';

async function updateInvoiceTemplate() {
  try {
    // Find the default invoice template
    const invoiceTemplate = await prisma.pdfTemplate.findFirst({
      where: {
        type: 'INVOICE',
        isActive: true
      }
    });

    if (!invoiceTemplate) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('No active invoice template found');
      }
      return;
    }

    // Update the HTML content to include payment details
    const updatedHtmlContent = `<!DOCTYPE html>
<html>
<head>
  <title>Invoice #{{invoiceNumber}}</title>
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
            <td>{{invoiceNumber}}</td>
          </tr>
          <tr>
            <td>Date:</td>
            <td>{{invoiceDate}}</td>
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
          <td>R{{serviceRate}}</td>
        </tr>
        <tr>
          <td colspan="3">Travel Costs</td>
          <td>R{{travelCosts}}</td>
        </tr>
      </table>
      
      <!-- Line Items Section -->
      {{#if lineItems.length}}
      <h4>Additional Items:</h4>
      <table class="service-table">
        <tr>
          <th>Description</th>
          <th>Quantity</th>
          <th>Unit Price</th>
          <th>Amount</th>
        </tr>
        {{#each lineItems}}
        <tr>
          <td>{{description}}</td>
          <td>{{quantity}}</td>
          <td>R{{unitPrice}}</td>
          <td>R{{amount}}</td>
        </tr>
        {{/each}}
      </table>
      {{/if}}
      
      <table class="service-table">
        <tr class="total-row">
          <td colspan="3"><strong>Total</strong></td>
          <td><strong>R{{totalAmount}}</strong></td>
        </tr>
      </table>
    </div>
    
    <!-- Payment Details Section -->
    {{#if isPaid}}
    <div class="payment-details">
      <h3>Payment Details</h3>
      <p><span class="payment-badge paid">PAID</span></p>
      <p><strong>Amount Paid:</strong> R{{amountPaid}}</p>
      <p><strong>Payment Method:</strong> {{paymentMethod}}</p>
      <p><strong>Payment Date:</strong> {{paymentDate}}</p>
    </div>
    {{else}}
    <div class="payment-details">
      <h3>Payment Status</h3>
      <p><span class="payment-badge pending">PENDING</span></p>
      <p>Please make payment within 14 days of receipt.</p>
    </div>
    {{/if}}
    
    <div class="officer-info">
      <h3>Marriage Officer:</h3>
      <p>{{officerName}}</p>
    </div>
    
    <div class="footer">
      <p>Thank you for choosing our services!</p>
    </div>
  </div>
</body>
</html>`;

    // Update the CSS content to include payment details styling
    const updatedCssContent = `body {
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

.client-info, .service-details, .officer-info, .payment-details {
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

.payment-details {
  margin-top: 20px;
  padding: 15px;
  border: 1px solid #e2e8f0;
  border-radius: 5px;
  background-color: #f8fafc;
}

.payment-details h3 {
  margin-top: 0;
  font-size: 1.1rem;
  color: #334155;
}

.payment-details p {
  margin: 5px 0;
}

.payment-badge {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
}

.payment-badge.paid {
  background-color: #dcfce7;
  color: #166534;
}

.payment-badge.pending {
  background-color: #fef3c7;
  color: #92400e;
}

.footer {
  margin-top: 50px;
  text-align: center;
  color: #666;
  border-top: 1px solid #ddd;
  padding-top: 20px;
}`;

    // Update the template
    await prisma.pdfTemplate.update({
      where: { id: invoiceTemplate.id },
      data: {
        htmlContent: updatedHtmlContent,
        cssContent: updatedCssContent
      }
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log('Invoice template updated successfully');
    }
  } catch (error) {
    console.error('Error updating invoice template:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateInvoiceTemplate()
  .then(() => console.log('Done'))
  .catch(console.error);