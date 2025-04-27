import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

// Define types
interface LineItem {
  id?: string;
  description: string;
  quantity: string;
  unitPrice: string;
  amount?: string;
  _delete?: boolean;
  _isNew?: boolean;
}

interface Booking {
  id: string;
  date: string;
  time: string | null;
  location: string | null;
  name: string;
  email: string;
}

interface MarriageOfficer {
  id: string;
  firstName: string;
  lastName: string;
  title?: string;
}

interface Invoice {
  id: string;
  status: string;
  createdAt: string;
  booking: Booking;
  serviceType: string;
  serviceRate: number;
  travelCosts: number;
  totalAmount: number;
  officerId?: string | null;
  officer?: MarriageOfficer | null;
  lineItems?: LineItem[];
}

interface InvoiceUpdates {
  serviceType: string;
  serviceRate: number;
  travelCosts: number;
  officerId?: string | null;
  lineItems?: LineItem[];
  deletedLineItems?: { id?: string; _delete: boolean }[];
}

interface InvoiceDialogProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  officers: MarriageOfficer[];
  serviceTypes: Record<string, string>;
  onSave: (invoiceId: string, updates: InvoiceUpdates) => Promise<void>;
  onSendInvoice: (invoiceId: string) => Promise<void>;
}

export function FastInvoiceDialog({
  invoice,
  open,
  onOpenChange,
  officers,
  serviceTypes,
  onSave,
  onSendInvoice
}: InvoiceDialogProps) {
  // Local state for the invoice - completely decoupled from parent state
  const [localInvoice, setLocalInvoice] = useState<Invoice | null>(null);
  // Track if we're currently saving
  const [isSaving, setIsSaving] = useState(false);
  // Track if we're sending
  const [isSending, setIsSending] = useState(false);
  // Track if there are unsaved changes
  const [isDirty, setIsDirty] = useState(false);

  // Reset and initialize local state when dialog opens with a new invoice
  useEffect(() => {
    if (open && invoice) {
      // Deep clone the invoice to avoid reference issues
      setLocalInvoice(JSON.parse(JSON.stringify({
        ...invoice,
        lineItems: invoice.lineItems || []
      })));
      setIsDirty(false);
    }
  }, [open, invoice]);

  // Handle field changes
  const handleFieldChange = (field: string, value: any) => {
    if (!localInvoice) return;
    
    setLocalInvoice(prev => {
      if (!prev) return prev;
      return { ...prev, [field]: value };
    });
    
    setIsDirty(true);
  };

  // Handle line item changes
  const handleLineItemChange = (index: number, field: string, value: any) => {
    if (!localInvoice) return;
    
    setLocalInvoice(prev => {
      if (!prev) return prev;
      
      const updatedLineItems = [...(prev.lineItems || [])];
      updatedLineItems[index] = {
        ...updatedLineItems[index],
        [field]: value
      };
      
      // Update amount if quantity or unitPrice changed
      if (field === 'quantity' || field === 'unitPrice') {
        const quantity = field === 'quantity' ? value : updatedLineItems[index].quantity;
        const unitPrice = field === 'unitPrice' ? value : updatedLineItems[index].unitPrice;
        
        const numQuantity = parseFloat(quantity) || 0;
        const numUnitPrice = parseFloat(unitPrice) || 0;
        updatedLineItems[index].amount = (numQuantity * numUnitPrice).toString();
      }
      
      return { ...prev, lineItems: updatedLineItems };
    });
    
    setIsDirty(true);
  };

  // Add a new line item
  const handleAddLineItem = () => {
    if (!localInvoice) return;
    
    const newLineItem: LineItem = {
      description: "New Item",
      quantity: "1",
      unitPrice: "0",
      amount: "0",
      _isNew: true
    };
    
    setLocalInvoice(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        lineItems: [...(prev.lineItems || []), newLineItem]
      };
    });
    
    setIsDirty(true);
  };

  // Delete a line item
  const handleDeleteLineItem = (index: number) => {
    if (!localInvoice) return;
    
    setLocalInvoice(prev => {
      if (!prev) return prev;
      
      const updatedLineItems = [...(prev.lineItems || [])];
      
      // If it has an ID, mark for deletion, otherwise just remove it
      if (updatedLineItems[index].id) {
        updatedLineItems[index] = {
          ...updatedLineItems[index],
          _delete: true
        };
      } else {
        updatedLineItems.splice(index, 1);
      }
      
      return { ...prev, lineItems: updatedLineItems };
    });
    
    setIsDirty(true);
  };



  // Save all changes at once
  const handleSave = async () => {
    if (!localInvoice) return;
    
    try {
      setIsSaving(true);
      
      // Prepare updates object
      const updates: InvoiceUpdates = {
        serviceType: localInvoice.serviceType,
        serviceRate: localInvoice.serviceRate,
        travelCosts: localInvoice.travelCosts,
        officerId: localInvoice.officerId,
        // Only include non-deleted line items
        lineItems: localInvoice.lineItems?.filter(item => !item._delete)
      };
      
      // Add deleted items with _delete flag
      const deletedItems = localInvoice.lineItems?.filter(item => item._delete && item.id);
      if (deletedItems && deletedItems.length > 0) {
        updates.deletedLineItems = deletedItems.map(item => ({ id: item.id, _delete: true }));
      }
      
      await onSave(localInvoice.id, updates);
      setIsDirty(false);
      toast.success("Invoice saved successfully");
    } catch (error) {
      console.error("Error saving invoice:", error);
      toast.error("Failed to save invoice");
    } finally {
      setIsSaving(false);
    }
  };

  // Save and send invoice
  const handleSaveAndSend = async () => {
    if (!localInvoice) return;
    
    try {
      setIsSending(true);
      
      // First save if there are changes
      if (isDirty) {
        await handleSave();
      }
      
      // Then send
      await onSendInvoice(localInvoice.id);
      
      toast.success("Invoice sent successfully");
      onOpenChange(false);
    } catch (error) {
      console.error("Error sending invoice:", error);
      toast.error("Failed to send invoice");
    } finally {
      setIsSending(false);
    }
  };

  // Calculate total
  const calculateTotal = () => {
    if (!localInvoice) return 0;
    
    // Calculate total from line items only
    let total = 0;
    
    // Add line items (excluding deleted ones)
    if (localInvoice.lineItems) {
      for (const item of localInvoice.lineItems) {
        if (item._delete) continue;
        
        const amount = parseFloat(item.amount || '0') || 
                      (parseFloat(item.quantity || '0') * parseFloat(item.unitPrice || '0'));
        total += amount;
      }
    }
    
    return total.toFixed(2);
  };

  // Handle dialog close with confirmation if there are unsaved changes
  const handleDialogClose = (open: boolean) => {
    if (!open && isDirty) {
      if (confirm("You have unsaved changes. Are you sure you want to close?")) {
        onOpenChange(false);
      }
    } else {
      onOpenChange(open);
    }
  };

  if (!localInvoice) return null;

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invoice Details</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          {/* Booking Info */}
          <div className="grid gap-2">
            <h3 className="text-lg font-semibold">Booking Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Client</Label>
                <div>{localInvoice.booking.name}</div>
              </div>
              <div>
                <Label>Email</Label>
                <div>{localInvoice.booking.email}</div>
              </div>
              <div>
                <Label>Date</Label>
                <div>{new Date(localInvoice.booking.date).toLocaleDateString()}</div>
              </div>
              <div>
                <Label>Time</Label>
                <div>{localInvoice.booking.time || 'Not specified'}</div>
              </div>
              <div>
                <Label>Location</Label>
                <div>{localInvoice.booking.location || 'Not specified'}</div>
              </div>
            </div>
          </div>
          
          {/* Service Details */}
          <div className="grid gap-4">
            <h3 className="text-lg font-semibold">Service Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Service Type</Label>
                <Select 
                  value={localInvoice.serviceType} 
                  onValueChange={(value) => handleFieldChange('serviceType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select service type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(serviceTypes).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label>Marriage Officer</Label>
                <Select 
                  value={localInvoice.officerId || ''} 
                  onValueChange={(value) => handleFieldChange('officerId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select officer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {officers.map((officer) => (
                      <SelectItem key={officer.id} value={officer.id}>
                        {officer.firstName} {officer.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label>Service Rate ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={localInvoice.serviceRate}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    handleFieldChange('serviceRate', value);
                  }}
                />
              </div>
              
              <div className="grid gap-2">
                <Label>Travel Costs ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={localInvoice.travelCosts}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    handleFieldChange('travelCosts', value);
                  }}
                />
              </div>
            </div>
          </div>
          
          {/* Line Items */}
          <div className="grid gap-2 mt-4">
            <div className="flex justify-between items-center">
              <Label className="text-lg font-semibold">Line Items</Label>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleAddLineItem}
              >
                Add Line Item
              </Button>
            </div>
            
            <div className="border rounded-md p-2 mt-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Price ($)</TableHead>
                    <TableHead className="text-right">Amount ($)</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {localInvoice.lineItems && localInvoice.lineItems.length > 0 ? (
                    localInvoice.lineItems
                      .filter(item => !item._delete) // Don't show deleted items
                      .map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Input
                              type="text"
                              value={item.description}
                              onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => handleLineItemChange(index, 'unitPrice', e.target.value)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            ${parseFloat(item.amount || '0').toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteLineItem(index)}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M3 6h18" />
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                <line x1="10" y1="11" x2="10" y2="17" />
                                <line x1="14" y1="11" x2="14" y2="17" />
                              </svg>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        No line items yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          
          {/* Total */}
          <div className="flex justify-end items-center gap-2 mt-4">
            <Label className="text-lg font-semibold">Total:</Label>
            <span className="text-lg">${calculateTotal()}</span>
          </div>
          
          {/* Actions */}
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => handleDialogClose(false)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleSave}
              disabled={isSaving || !isDirty}
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
            <Button
              variant="default"
              onClick={handleSaveAndSend}
              disabled={isSending}
            >
              {isSending ? "Sending..." : "Save & Send"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
