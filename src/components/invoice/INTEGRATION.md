# FastInvoiceDialog Integration Guide

This guide shows how to integrate the new FastInvoiceDialog component into your existing invoice page.

## Key Benefits

- **Zero API Calls During Editing**: All changes are kept in local state until explicitly saved
- **Instant Responsiveness**: All inputs respond immediately with no lag
- **Single Save Action**: Only one API call when the user clicks Save
- **Proper Validation**: All inputs are properly validated
- **Unsaved Changes Warning**: Warns users if they try to close with unsaved changes

## Integration Steps

### 1. Import the Component

```tsx
import { FastInvoiceDialog } from "@/components/invoice/FastInvoiceDialog";
```

### 2. Add Save Handler

```tsx
const handleSaveInvoice = async (invoiceId: string, updates: any) => {
  try {
    console.log('Saving invoice with updates:', updates);
    
    const response = await fetch(`/api/invoices/${invoiceId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || "Failed to update invoice");
    }
    
    const responseData = await response.json();
    
    // Update the invoices list with the response
    setInvoices(prevInvoices => 
      prevInvoices.map(inv => 
        inv.id === invoiceId 
          ? responseData
          : inv
      )
    );
    
    return responseData;
  } catch (error) {
    console.error("Error saving invoice:", error);
    throw error;
  }
};
```

### 3. Add Send Handler

```tsx
const handleSendInvoice = async (invoiceId: string) => {
  try {
    const response = await fetch(`/api/invoices/${invoiceId}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || "Failed to send invoice");
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error sending invoice:", error);
    throw error;
  }
};
```

### 4. Replace the Dialog Component

Replace your existing dialog with:

```tsx
<FastInvoiceDialog
  invoice={selectedInvoice}
  open={isDialogOpen}
  onOpenChange={setIsDialogOpen}
  officers={officers}
  serviceTypes={SERVICE_TYPES}
  onSave={handleSaveInvoice}
  onSendInvoice={handleSendInvoice}
/>
```

## API Endpoint Modifications

The API endpoint at `/api/invoices/[id].ts` should be able to handle the following updates format:

```typescript
{
  serviceType: string,
  serviceRate: number,
  travelCosts: number,
  officerId: string | null,
  lineItems: LineItem[],
  deletedLineItems?: { id: string, _delete: boolean }[]
}
```

If your API doesn't currently handle `deletedLineItems`, you'll need to modify it to process these separately.

## Complete Example

```tsx
import { useState } from "react";
import { FastInvoiceDialog } from "@/components/invoice/FastInvoiceDialog";

function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const handleSaveInvoice = async (invoiceId, updates) => {
    // Implementation as above
  };
  
  const handleSendInvoice = async (invoiceId) => {
    // Implementation as above
  };
  
  return (
    <div>
      {/* Your invoices list */}
      
      <FastInvoiceDialog
        invoice={selectedInvoice}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        officers={officers}
        serviceTypes={SERVICE_TYPES}
        onSave={handleSaveInvoice}
        onSendInvoice={handleSendInvoice}
      />
    </div>
  );
}
```
