import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { VoidInvoiceDialog } from "./VoidInvoiceDialog";
import { CreateReplacementInvoiceDialog } from "./CreateReplacementInvoiceDialog";

// Define types
interface LineItem {
  id?: string;
  description: string;
  quantity: string;
  unitPrice: string;
  amount?: string;
  _delete?: boolean;
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

interface InvoiceDialogProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  officers: MarriageOfficer[];
  serviceTypes: Record<string, string>;
  onUpdateInvoice: (invoiceId: string, updates: any) => Promise<void>;
  onSendInvoice: (invoiceId: string) => Promise<void>;
  onRefresh?: () => void;
}

export function InvoiceDialog({
  invoice,
  open,
  onOpenChange,
  officers,
  serviceTypes,
  onUpdateInvoice,
  onSendInvoice,
  onRefresh
}: InvoiceDialogProps) {
  // Local state for the invoice
  const [localInvoice, setLocalInvoice] = useState<Invoice | null>(null);
  // Track if we're currently saving
  const [isSaving, setIsSaving] = useState(false);
  // Track if we're sending
  const [isSending, setIsSending] = useState(false);
  // State for void invoice dialog
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  // State for create replacement invoice dialog
  const [replacementDialogOpen, setReplacementDialogOpen] = useState(false);

  // Update local state when invoice changes
  useEffect(() => {
    if (invoice) {
      setLocalInvoice({
        ...invoice,
        lineItems: invoice.lineItems || []
      });
    }
  }, [invoice]);

  // Handle field changes
  const handleFieldChange = (field: string, value: any) => {
    if (!localInvoice) return;
    
    setLocalInvoice(prev => {
      if (!prev) return prev;
      return { ...prev, [field]: value };
    });
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
  };

  // Add a new line item
  const handleAddLineItem = () => {
    if (!localInvoice) return;
    
    const newLineItem: LineItem = {
      description: "New Item",
      quantity: "1",
      unitPrice: "0",
      amount: "0"
    };
    
    setLocalInvoice(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        lineItems: [...(prev.lineItems || []), newLineItem]
      };
    });
  };

  // Delete a line item
  const handleDeleteLineItem = (index: number) => {
    if (!localInvoice) return;
    
    // If the line item has an ID, mark it for deletion
    const lineItem = localInvoice.lineItems?.[index];
    if (lineItem?.id) {
      // We need to send this to the server
      handleSave({
        lineItems: [{
          id: lineItem.id,
          _delete: true
        }]
      });
    } else {
      // Just remove it from local state
      setLocalInvoice(prev => {
        if (!prev) return prev;
        
        const updatedLineItems = [...(prev.lineItems || [])];
        updatedLineItems.splice(index, 1);
        
        return { ...prev, lineItems: updatedLineItems };
      });
    }
  };

  // Save changes
  const handleSave = async (specificUpdates?: any) => {
    if (!localInvoice) return;
    
    try {
      setIsSaving(true);
      
      // Determine what to save
      const updates = specificUpdates || {
        serviceType: localInvoice.serviceType,
        serviceRate: localInvoice.serviceRate,
        travelCosts: localInvoice.travelCosts,
        officerId: localInvoice.officerId,
        lineItems: localInvoice.lineItems
      };
      
      await onUpdateInvoice(localInvoice.id, updates);
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
      
      // Prepare the current invoice data to send
      const currentInvoiceData = {
        officerId: localInvoice.officerId,
        serviceType: localInvoice.serviceType,
        serviceRate: localInvoice.serviceRate,
        travelCosts: localInvoice.travelCosts,
        lineItems: localInvoice.lineItems?.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount
        }))
      };
      
      // Send the invoice with current data
      const response = await fetch(`/api/invoices/${localInvoice.id}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(currentInvoiceData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to send invoice');
      }
      
      const result = await response.json();
      
      // Check if invoice number was changed due to officer change
      if (result.invoiceNumberChanged && result.newInvoiceNumber) {
        toast.success(`Invoice re-sent successfully with new invoice number: ${result.newInvoiceNumber}`);
      } else {
        toast.success("Invoice sent successfully");
      }
      
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
    
    // Add line items
    if (localInvoice.lineItems) {
      for (const item of localInvoice.lineItems) {
        const amount = parseFloat(item.amount || '0') || 
                      (parseFloat(item.quantity || '0') * parseFloat(item.unitPrice || '0'));
        total += amount;
      }
    }
    
    return total.toFixed(2);
  };
  
  // Handle void invoice
  const handleVoidInvoice = () => {
    if (!localInvoice) return;
    setVoidDialogOpen(true);
  };
  
  // Handle void complete
  const handleVoidComplete = () => {
    if (onRefresh) {
      onRefresh();
    }
    onOpenChange(false);
  };
  
  // Handle create replacement invoice
  const handleCreateReplacement = () => {
    if (!localInvoice) return;
    setReplacementDialogOpen(true);
  };
  
  // Handle replacement creation complete
  const handleReplacementComplete = (newInvoiceId: string) => {
    if (onRefresh) {
      onRefresh();
    }
    onOpenChange(false);
  };

  if (!localInvoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                    localInvoice.lineItems.map((item, index) => (
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
          <div className="flex justify-between gap-2 mt-4">
            <div>
              {localInvoice.status === 'sent' && (
                <Button
                  variant="destructive"
                  onClick={handleVoidInvoice}
                >
                  Void Invoice
                </Button>
              )}
              {localInvoice.status === 'voided' && (
                <Button
                  variant="default"
                  onClick={handleCreateReplacement}
                >
                  Create Replacement Invoice
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              {localInvoice.status !== 'voided' && (
                <>
                  <Button
                    variant="default"
                    onClick={() => handleSave()}
                    disabled={isSaving || localInvoice.status === 'voided'}
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                  {localInvoice.status === 'sent' ? (
                    <Button
                      variant="default"
                      onClick={handleSaveAndSend}
                      disabled={isSending || localInvoice.status === 'voided'}
                    >
                      {isSending ? "Sending..." : "Re-send Invoice"}
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      onClick={handleSaveAndSend}
                      disabled={isSending || localInvoice.status === 'voided'}
                    >
                      {isSending ? "Sending..." : "Save & Send"}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
      
      {/* Void Invoice Dialog */}
      {localInvoice && (
        <VoidInvoiceDialog
          invoiceId={localInvoice.id}
          open={voidDialogOpen}
          onOpenChange={setVoidDialogOpen}
          onVoidComplete={handleVoidComplete}
        />
      )}
      
      {/* Create Replacement Invoice Dialog */}
      {localInvoice && (
        <CreateReplacementInvoiceDialog
          originalInvoiceId={localInvoice.id}
          open={replacementDialogOpen}
          onOpenChange={setReplacementDialogOpen}
          officers={officers}
          serviceTypes={serviceTypes}
          onCreateComplete={handleReplacementComplete}
        />
      )}
    </Dialog>
  );
}
