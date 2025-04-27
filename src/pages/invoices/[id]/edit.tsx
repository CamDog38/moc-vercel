import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

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

export default function EditInvoicePage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [officers, setOfficers] = useState<MarriageOfficer[]>([]);
  const [serviceTypes, setServiceTypes] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load invoice data
  useEffect(() => {
    if (!id) return;

    const loadInvoice = async () => {
      try {
        const response = await axios.get(`/api/invoices/${id}`);
        setInvoice(response.data);
      } catch (error) {
        console.error("Error loading invoice:", error);
        toast.error("Failed to load invoice");
      }
    };

    const loadOfficers = async () => {
      try {
        const response = await axios.get("/api/officers");
        setOfficers(response.data);
      } catch (error) {
        console.error("Error loading officers:", error);
      }
    };

    const loadServiceTypes = async () => {
      try {
        const response = await axios.get("/api/service-types");
        setServiceTypes(response.data);
      } catch (error) {
        console.error("Error loading service types:", error);
      }
    };

    loadInvoice();
    loadOfficers();
    loadServiceTypes();
  }, [id]);

  // Handle field changes
  const handleFieldChange = (field: string, value: any) => {
    if (!invoice) return;
    
    setInvoice(prev => {
      if (!prev) return prev;
      return { ...prev, [field]: value };
    });
    setHasUnsavedChanges(true);
  };

  // Handle line item changes
  const handleLineItemChange = (index: number, field: string, value: any) => {
    if (!invoice) return;
    
    setInvoice(prev => {
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
    setHasUnsavedChanges(true);
  };

  // Add a new line item
  const handleAddLineItem = () => {
    if (!invoice) return;
    
    const newLineItem: LineItem = {
      description: "New Item",
      quantity: "1",
      unitPrice: "0",
      amount: "0"
    };
    
    setInvoice(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        lineItems: [...(prev.lineItems || []), newLineItem]
      };
    });
    setHasUnsavedChanges(true);
  };

  // Delete a line item
  const handleDeleteLineItem = (index: number) => {
    if (!invoice) return;
    
    setInvoice(prev => {
      if (!prev) return prev;
      
      const updatedLineItems = [...(prev.lineItems || [])];
      const lineItem = updatedLineItems[index];
      
      if (lineItem?.id) {
        // Mark existing items for deletion
        updatedLineItems[index] = { ...lineItem, _delete: true };
      } else {
        // Remove new items immediately
        updatedLineItems.splice(index, 1);
      }
      
      return { ...prev, lineItems: updatedLineItems };
    });
    setHasUnsavedChanges(true);
  };

  // Save changes
  const handleSave = async () => {
    if (!invoice) return;
    
    try {
      setIsSaving(true);
      
      // Filter out deleted items that were never saved
      const lineItems = invoice.lineItems?.filter(item => !(!item.id && item._delete));
      
      const updates = {
        serviceType: invoice.serviceType,
        serviceRate: invoice.serviceRate,
        travelCosts: invoice.travelCosts,
        officerId: invoice.officerId,
        lineItems
      };
      
      await axios.patch(`/api/invoices/${invoice.id}`, updates);
      toast.success("Invoice saved successfully");
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Error saving invoice:", error);
      toast.error("Failed to save invoice");
    } finally {
      setIsSaving(false);
    }
  };

  // Save and send invoice
  const handleSaveAndSend = async () => {
    if (!invoice) return;
    
    try {
      setIsSending(true);
      
      // First save
      await handleSave();
      
      // Then send
      await axios.post(`/api/invoices/${invoice.id}/send`, {}, {
        withCredentials: true // Include credentials with the request
      });
      
      toast.success("Invoice sent successfully");
      router.push(`/invoices/${invoice.id}`);
    } catch (error) {
      console.error("Error sending invoice:", error);
      toast.error("Failed to send invoice");
    } finally {
      setIsSending(false);
    }
  };

  // Calculate total
  const calculateTotal = () => {
    if (!invoice) return 0;
    
    let total = invoice.serviceRate + invoice.travelCosts;
    
    // Add line items
    if (invoice.lineItems) {
      for (const item of invoice.lineItems) {
        if (!item._delete) {
          const amount = parseFloat(item.amount || '0') || 
                        (parseFloat(item.quantity || '0') * parseFloat(item.unitPrice || '0'));
          total += amount;
        }
      }
    }
    
    return total.toFixed(2);
  };

  if (!invoice) return <div className="p-8">Loading...</div>;

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Invoice</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.back()}
            disabled={isSaving || isSending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || isSending || !hasUnsavedChanges}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
          {invoice.status !== 'sent' && (
            <Button
              variant="default"
              onClick={handleSaveAndSend}
              disabled={isSaving || isSending}
            >
              {isSending ? "Sending..." : "Save & Send"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-8">
        {/* Booking Info */}
        <div className="grid gap-4">
          <h2 className="text-xl font-semibold">Booking Information</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 p-4 border rounded-lg bg-muted/20">
            <div>
              <Label>Client</Label>
              <div className="mt-1 font-medium">{invoice.booking.name}</div>
            </div>
            <div>
              <Label>Email</Label>
              <div className="mt-1 font-medium">{invoice.booking.email}</div>
            </div>
            <div>
              <Label>Date</Label>
              <div className="mt-1 font-medium">
                {new Date(invoice.booking.date).toLocaleDateString()}
              </div>
            </div>
            <div>
              <Label>Time</Label>
              <div className="mt-1 font-medium">
                {invoice.booking.time || 'Not specified'}
              </div>
            </div>
            <div className="col-span-2">
              <Label>Location</Label>
              <div className="mt-1 font-medium">
                {invoice.booking.location || 'Not specified'}
              </div>
            </div>
          </div>
        </div>
        
        {/* Service Details */}
        <div className="grid gap-4">
          <h2 className="text-xl font-semibold">Service Details</h2>
          <div className="grid gap-6 p-4 border rounded-lg bg-muted/20">
            <div className="grid grid-cols-2 gap-6">
              <div className="grid gap-2">
                <Label>Service Type</Label>
                <Select 
                  value={invoice.serviceType} 
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
                  value={invoice.officerId || ''} 
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
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="grid gap-2">
                <Label>Service Rate (R)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={invoice.serviceRate}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    handleFieldChange('serviceRate', value);
                  }}
                />
              </div>
              
              <div className="grid gap-2">
                <Label>Travel Costs (R)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={invoice.travelCosts}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    handleFieldChange('travelCosts', value);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Line Items */}
        <div className="grid gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Additional Items</h2>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleAddLineItem}
            >
              Add Item
            </Button>
          </div>
          
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Description</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Price (R)</TableHead>
                  <TableHead className="text-right">Amount (R)</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.lineItems?.filter(item => !item._delete).map((item, index) => (
                  <TableRow key={item.id || index}>
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
                    <TableCell className="text-right font-medium">
                      R{parseFloat(item.amount || '0').toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteLineItem(index)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!invoice.lineItems || invoice.lineItems.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No items added yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Total */}
        <div className="flex justify-end pt-4">
          <div className="w-[300px] p-4 border rounded-lg bg-muted/20">
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Total Amount:</span>
              <span>R{calculateTotal()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
