# Invoice Dialog Component

This component provides a completely rewritten invoice dialog with optimized line item handling to fix the glitchy behavior.

## How to Use

Replace the existing invoice dialog in `src/pages/dashboard/invoices/index.tsx` with this new component.

## Integration Example

```tsx
import { InvoiceDialog } from "@/components/invoice/InvoiceDialog";

// In your InvoicesPage component:

// Add these handlers
const handleUpdateInvoice = async (invoiceId: string, updates: any) => {
  try {
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
    
    // Update invoices state with the response
    setInvoices(prevInvoices => 
      prevInvoices.map(inv => 
        inv.id === invoiceId 
          ? responseData
          : inv
      )
    );
    
    return responseData;
  } catch (error) {
    console.error("Error updating invoice:", error);
    throw error;
  }
};

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

// Then in your JSX:
<InvoiceDialog
  invoice={selectedInvoice}
  open={isDialogOpen}
  onOpenChange={setIsDialogOpen}
  officers={officers}
  serviceTypes={SERVICE_TYPES}
  onUpdateInvoice={handleUpdateInvoice}
  onSendInvoice={handleSendInvoice}
/>
```

## Key Features

1. **Local State Management**: All edits are managed locally first, making the UI responsive
2. **Optimized API Calls**: API calls are only made when needed
3. **Proper Type Handling**: All numeric inputs are properly handled
4. **Responsive UI**: The UI updates immediately when changes are made
5. **Error Handling**: Proper error handling and feedback

## Benefits

- No more glitchy typing in input fields
- Line items can be added, edited, and deleted smoothly
- All calculations are done correctly
- The dialog stays open until explicitly closed
- Changes are saved only when requested
