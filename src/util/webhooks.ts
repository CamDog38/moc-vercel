import prisma from '@/lib/prisma';

/**
 * Sends invoice data to all active Zapier webhooks
 * @param invoiceId The ID of the invoice to send
 */
export async function triggerInvoiceWebhooks(invoiceId: string): Promise<void> {
  try {
    // Get the invoice with related data
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        booking: {
          include: {
            form: true,
            submissions: true,
          }
        },
        officer: true,
      }
    });

    if (!invoice) {
      console.error(`Invoice with ID ${invoiceId} not found`);
      return;
    }

    // Get all active webhooks
    const webhooks = await prisma.zapierWebhook.findMany({
      where: { isActive: true }
    });

    if (webhooks.length === 0) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('No active webhooks found');
      }
      return;
    }

    // Prepare the default payload
    const defaultPayload = {
      event: 'invoice.updated',
      invoice: {
        id: invoice.id,
        status: invoice.status,
        serviceRate: invoice.serviceRate,
        serviceType: invoice.serviceType,
        totalAmount: invoice.totalAmount,
        travelCosts: invoice.travelCosts,
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt,
      },
      booking: {
        id: invoice.booking.id,
        name: invoice.booking.name,
        email: invoice.booking.email,
        phone: invoice.booking.phone,
        date: invoice.booking.date,
        time: invoice.booking.time,
        location: invoice.booking.location,
        status: invoice.booking.status,
      },
      officer: invoice.officer ? {
        id: invoice.officer.id,
        name: `${invoice.officer.title || ''} ${invoice.officer.firstName} ${invoice.officer.lastName}`.trim(),
        phoneNumber: invoice.officer.phoneNumber,
        address: invoice.officer.address,
      } : null,
    };

    // Send to all webhooks
    const results = await Promise.allSettled(
      webhooks.map(webhook => {
        // Merge default payload with custom variables if they exist
        let finalPayload = defaultPayload;
        
        if (webhook.variables && typeof webhook.variables === 'object') {
          // Create a deep copy of the default payload
          finalPayload = JSON.parse(JSON.stringify(defaultPayload));
          
          // Merge with custom variables
          try {
            const customVars = webhook.variables as Record<string, any>;
            Object.keys(customVars).forEach(key => {
              // Use dot notation to access nested properties
              const path = key.split('.');
              let current = finalPayload;
              
              // Navigate to the parent object
              for (let i = 0; i < path.length - 1; i++) {
                if (!current[path[i]]) {
                  current[path[i]] = {};
                }
                current = current[path[i]];
              }
              
              // Set the value
              const lastKey = path[path.length - 1];
              current[lastKey] = customVars[key];
            });
          } catch (error) {
            console.error(`Error applying custom variables for webhook ${webhook.id}:`, error);
          }
        }
        
        return fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(finalPayload),
        });
      })
    );

    // Log results
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`Successfully triggered webhook ${webhooks[index].name}`);
        }
      } else {
        console.error(`Failed to trigger webhook ${webhooks[index].name}:`, result.reason);
      }
    });
  } catch (error) {
    console.error('Error triggering webhooks:', error);
  }
}