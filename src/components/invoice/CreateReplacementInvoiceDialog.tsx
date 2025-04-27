import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
}

interface Rate {
  serviceType: string;
  rate: number;
}

interface MarriageOfficer {
  id: string;
  firstName: string;
  lastName: string;
  title?: string;
  rates?: Rate[];
}

interface Invoice {
  id: string;
  status: string;
  serviceType: string;
  serviceRate: number;
  travelCosts: number;
  totalAmount: number;
  officerId?: string | null;
  lineItems?: LineItem[];
  bookingId: string;
  booking?: any;
}

interface CreateReplacementInvoiceDialogProps {
  originalInvoiceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  officers: MarriageOfficer[];
  serviceTypes: Record<string, string>;
  onCreateComplete: (newInvoiceId: string) => void;
}

export function CreateReplacementInvoiceDialog({
  originalInvoiceId,
  open,
  onOpenChange,
  officers,
  serviceTypes,
  onCreateComplete
}: CreateReplacementInvoiceDialogProps) {
  const [originalInvoice, setOriginalInvoice] = useState<Invoice | null>(null);
  const [officerId, setOfficerId] = useState<string>("");
  const [serviceType, setServiceType] = useState<string>("");
  const [serviceRate, setServiceRate] = useState<number>(0);
  const [travelCosts, setTravelCosts] = useState<number>(0);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch original invoice data when dialog opens
  useEffect(() => {
    if (open && originalInvoiceId) {
      fetchOriginalInvoice();
    }
  }, [open, originalInvoiceId]);

  const fetchOriginalInvoice = async () => {
    try {
      setIsLoading(true);
      console.log("Fetching original invoice with ID:", originalInvoiceId);
      
      const response = await fetch(`/api/invoices/${originalInvoiceId}/get`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch original invoice');
      }
      
      const data = await response.json();
      const invoice = data.invoice;
      setOriginalInvoice(invoice);
      
      console.log("Original invoice data:", invoice);
      console.log("Available officers:", officers);
      
      // Log the original officer information for debugging purposes only
      if (invoice.officerId && invoice.officer) {
        console.log(`Original invoice had officer: ${invoice.officer.firstName} ${invoice.officer.lastName} (${invoice.officerId})`);
        console.log("But we're treating this as a new invoice, so not pre-selecting the officer");
      } else {
        console.log("No officer found in original invoice or officer ID is missing");
      }
      
      // DO NOT pre-select the original officer - start fresh
      console.log("Starting with empty officer selection for replacement invoice");
      setOfficerId("");
      
      // DO NOT pre-select the original service type - start fresh
      console.log("Starting with empty service type for replacement invoice");
      setServiceType("");
      
      // Reset service rate and travel costs
      console.log("Resetting service rate to 0");
      setServiceRate(0);
      
      console.log("Resetting travel costs to 0");
      setTravelCosts(0);
      
      // Initialize with empty line items for replacement invoices
      // as per the user's request to handle it like a new invoice
      console.log("Setting empty line items for replacement invoice");
      setLineItems([]);
    } catch (error) {
      console.error("Error fetching original invoice:", error);
      toast.error("Failed to load original invoice details");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle service type change
  const handleServiceTypeChange = (value: string) => {
    console.log(`Setting service type to: ${value}`);
    setServiceType(value);
    
    // If we have service rates for the current officer, update the service rate
    const selectedOfficer = officers.find(o => o.id === officerId);
    if (selectedOfficer?.rates) {
      const rateForService = selectedOfficer.rates.find(r => r.serviceType === value);
      if (rateForService) {
        console.log(`Setting service rate to: ${rateForService.rate}`);
        setServiceRate(rateForService.rate);
      }
    }
  };

  // Handle officer change
  const handleOfficerChange = (value: string) => {
    console.log(`Setting officer to: ${value}`);
    setOfficerId(value);
    
    // If we have service rates for the new officer, update the service rate
    const selectedOfficer = officers.find(o => o.id === value);
    if (selectedOfficer?.rates) {
      const rateForService = selectedOfficer.rates.find(r => r.serviceType === serviceType);
      if (rateForService) {
        console.log(`Setting service rate to: ${rateForService.rate}`);
        setServiceRate(rateForService.rate);
      }
    }
  };

  // Handle line item changes
  const handleLineItemChange = (index: number, field: string, value: any) => {
    const updatedLineItems = [...lineItems];
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
    
    setLineItems(updatedLineItems);
  };

  // Add a new line item
  const handleAddLineItem = () => {
    const newLineItem: LineItem = {
      description: "New Item",
      quantity: "1",
      unitPrice: "0",
      amount: "0"
    };
    
    setLineItems([...lineItems, newLineItem]);
  };

  // Delete a line item
  const handleDeleteLineItem = (index: number) => {
    const updatedLineItems = [...lineItems];
    updatedLineItems.splice(index, 1);
    setLineItems(updatedLineItems);
  };

  // Calculate total
  const calculateTotal = () => {
    let total = 0;
    
    for (const item of lineItems) {
      const amount = parseFloat(item.amount || '0') || 
                    (parseFloat(item.quantity || '0') * parseFloat(item.unitPrice || '0'));
      total += amount;
    }
    
    return total.toFixed(2);
  };

  // Create replacement invoice
  const handleCreateReplacement = async () => {
    if (!officerId) {
      toast.error("Please select a marriage officer");
      return;
    }

    if (!serviceType) {
      toast.error("Please select a service type");
      return;
    }

    // Log the current state before submission
    console.log("Creating replacement invoice with the following data:");
    console.log("- Original Invoice ID:", originalInvoiceId);
    console.log("- Officer ID:", officerId);
    
    const selectedOfficer = officers.find(o => o.id === officerId);
    const officerName = selectedOfficer 
      ? `${selectedOfficer.firstName} ${selectedOfficer.lastName}` 
      : "Unknown Officer";
    
    console.log("- Officer Name:", officerName);
    console.log("- Service Type:", serviceType);
    console.log("- Service Rate:", serviceRate);
    console.log("- Travel Costs:", travelCosts);
    console.log("- Line Items:", lineItems);

    try {
      setIsSubmitting(true);
      
      // Double check that we have the correct officer ID
      if (!selectedOfficer) {
        console.warn(`Warning: Officer with ID ${officerId} not found in officers list`);
      }

      const response = await fetch('/api/invoices/create-replacement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          originalInvoiceId,
          officerId,
          serviceType,
          serviceRate,
          travelCosts,
          lineItems
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create replacement invoice');
      }

      const result = await response.json();
      console.log("Replacement invoice created successfully:", result);
      console.log("New invoice ID:", result.invoice.id);
      console.log("New invoice officer ID:", result.invoice.officerId);
      
      // Verify the officer was correctly set
      if (result.invoice.officerId !== officerId) {
        console.warn("Warning: Officer ID in response doesn't match selected officer ID");
        console.warn(`Expected: ${officerId}, Got: ${result.invoice.officerId}`);
      }
      
      toast.success("Replacement invoice created successfully");
      
      // Call the onCreateComplete callback with the new invoice ID
      onCreateComplete(result.invoice.id);
      
      // Close the dialog
      onOpenChange(false);
      
      // Redirect to the invoice creation page with the booking ID
      // This creates a completely fresh invoice for the same booking
      if (originalInvoice && originalInvoice.bookingId) {
        window.location.href = `/dashboard/invoices/create?bookingId=${originalInvoice.bookingId}`;
      } else {
        // Fallback if we don't have the booking ID for some reason
        console.error("Missing booking ID for replacement invoice");
        toast.error("Could not create replacement invoice - missing booking information");
        window.location.href = '/dashboard/invoices';
      }
    } catch (error) {
      console.error("Error creating replacement invoice:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create replacement invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Replacement Invoice</DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center">Loading original invoice details...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Replacement Invoice</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          {/* Service Details */}
          <div className="grid gap-4">
            <h3 className="text-lg font-semibold">Service Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Service Type</Label>
                <Select 
                  value={serviceType} 
                  onValueChange={handleServiceTypeChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select service type">
                      {serviceType && serviceTypes[serviceType] ? 
                        serviceTypes[serviceType] : 
                        "Select service type"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(serviceTypes).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {value}
                        {originalInvoice && originalInvoice.serviceType === key && " (Original)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {serviceType && 
                  <div className="text-sm text-green-600">
                    Selected: {serviceTypes[serviceType] || serviceType}
                  </div>
                }
              </div>
              
              <div className="grid gap-2">
                <Label>Marriage Officer *</Label>
                <Select 
                  value={officerId} 
                  onValueChange={handleOfficerChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select officer">
                      {officerId && officers.find(o => o.id === officerId) ? 
                        `${officers.find(o => o.id === officerId)?.firstName} ${officers.find(o => o.id === officerId)?.lastName}` : 
                        "Select officer"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {officers.map((officer) => (
                      <SelectItem key={officer.id} value={officer.id}>
                        {officer.firstName} {officer.lastName}
                        {originalInvoice && originalInvoice.officerId === officer.id && " (Original)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {officerId && 
                  <div className="text-sm text-green-600">
                    Selected: {officers.find(o => o.id === officerId)?.firstName} {officers.find(o => o.id === officerId)?.lastName}
                  </div>
                }
              </div>
              
              <div className="grid gap-2">
                <Label>Service Rate ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={serviceRate}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    setServiceRate(value);
                  }}
                />
              </div>
              
              <div className="grid gap-2">
                <Label>Travel Costs ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={travelCosts}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    setTravelCosts(value);
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
                  {lineItems.length > 0 ? (
                    lineItems.map((item, index) => (
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
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleCreateReplacement}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create Replacement Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}