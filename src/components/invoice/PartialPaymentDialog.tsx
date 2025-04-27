import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/util/format";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

type LineItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

type Invoice = {
  id: string;
  status: string;
  invoiceNumber?: string | null;
  totalAmount: number;
  balanceDue?: number | null;
  amountPaid?: number | null;
  serviceType: string;
  booking: {
    id: string;
    name: string;
    email: string;
  };
  lineItems: LineItem[];
};

interface PartialPaymentDialogProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentComplete: () => void;
}

export function PartialPaymentDialog({
  invoice,
  open,
  onOpenChange,
  onPaymentComplete,
}: PartialPaymentDialogProps) {
  const [paymentType, setPaymentType] = useState<"full" | "partial">("full");
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("Bank Transfer");
  const [selectedLineItems, setSelectedLineItems] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate the remaining balance
  const totalAmount = invoice?.totalAmount || 0;
  
  // Calculate total paid amount from payments if available, otherwise use amountPaid field
  const amountPaid = invoice?.payments && invoice.payments.length > 0
    ? invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0)
    : (invoice?.amountPaid ? Number(invoice.amountPaid) : 0);
  
  // Balance due is always total amount minus what's been paid
  const balanceDue = totalAmount - amountPaid;

  // Reset form when invoice changes
  useEffect(() => {
    if (invoice) {
      setPaymentType("full");
      setPaymentAmount(balanceDue.toString());
      setPaymentMethod("Bank Transfer");
      setSelectedLineItems({});
      setNotes("");
    }
  }, [invoice, balanceDue]);

  // Update payment amount when payment type changes
  useEffect(() => {
    if (paymentType === "full") {
      setPaymentAmount(balanceDue.toString());
    } else {
      setPaymentAmount("");
    }
  }, [paymentType, balanceDue]);

  const handlePayment = async () => {
    if (!invoice) return;

    if (!paymentAmount || isNaN(parseFloat(paymentAmount)) || parseFloat(paymentAmount) <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    if (parseFloat(paymentAmount) > balanceDue) {
      toast.error("Payment amount cannot exceed the balance due");
      return;
    }

    try {
      setIsSubmitting(true);

      // Get the selected line item if any
      const selectedLineItemIds = Object.entries(selectedLineItems)
        .filter(([_, isSelected]) => isSelected)
        .map(([id]) => id);
      
      const lineItemId = selectedLineItemIds.length === 1 ? selectedLineItemIds[0] : null;

      const response = await fetch(`/api/invoices/${invoice.id}/payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          amount: parseFloat(paymentAmount),
          paymentMethod,
          paymentType,
          lineItemId,
          notes: notes.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to process payment");
      }

      toast.success(
        paymentType === "full"
          ? "Invoice marked as fully paid"
          : "Partial payment recorded successfully"
      );
      
      onOpenChange(false);
      onPaymentComplete();
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error(error instanceof Error ? error.message : "Failed to process payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Collect Payment</DialogTitle>
        </DialogHeader>
        {invoice && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p><strong>Client:</strong> {invoice.booking.name}</p>
              <p><strong>Invoice #:</strong> {invoice.invoiceNumber || invoice.id.substring(0, 8).toUpperCase()}</p>
              <p><strong>Total Amount:</strong> {formatCurrency(invoice.totalAmount)}</p>
              {amountPaid > 0 && (
                <p><strong>Amount Paid:</strong> {formatCurrency(amountPaid)}</p>
              )}
              <p><strong>Balance Due:</strong> {formatCurrency(balanceDue)}</p>
            </div>

            <Separator />
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Payment Type</Label>
                <RadioGroup 
                  value={paymentType} 
                  onValueChange={(value) => setPaymentType(value as "full" | "partial")}
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="full" id="full-payment" />
                    <Label htmlFor="full-payment">Full Payment ({formatCurrency(balanceDue)})</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="partial" id="partial-payment" />
                    <Label htmlFor="partial-payment">Partial Payment</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="paymentAmount">Payment Amount</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  disabled={paymentType === "full"}
                />
              </div>
              
              {paymentType === "partial" && invoice.lineItems.length > 0 && (
                <div className="space-y-2">
                  <Label>Apply to Line Item (Optional)</Label>
                  <div className="space-y-2 max-h-[150px] overflow-y-auto border rounded-md p-2">
                    {invoice.lineItems.map((item) => (
                      <div key={item.id} className="flex items-start space-x-2">
                        <Checkbox
                          id={`line-item-${item.id}`}
                          checked={selectedLineItems[item.id] || false}
                          onCheckedChange={(checked) => {
                            setSelectedLineItems({
                              ...selectedLineItems,
                              [item.id]: !!checked,
                            });
                          }}
                        />
                        <Label 
                          htmlFor={`line-item-${item.id}`}
                          className="text-sm leading-tight"
                        >
                          {item.description} - {formatCurrency(Number(item.amount))}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Bank Transfer" id="bank-transfer" />
                    <Label htmlFor="bank-transfer">Bank Transfer</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Cash" id="cash" />
                    <Label htmlFor="cash">Cash</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Credit Card" id="credit-card" />
                    <Label htmlFor="credit-card">Credit Card</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add payment notes here"
                />
              </div>
            </div>
            
            <div className="pt-2">
              <p className="text-sm text-muted-foreground">
                {paymentType === "full" 
                  ? "Marking this invoice as fully paid will update its status to 'paid'."
                  : "Recording a partial payment will update the balance due on this invoice."}
              </p>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handlePayment} disabled={isSubmitting}>
            {isSubmitting ? "Processing..." : "Process Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}