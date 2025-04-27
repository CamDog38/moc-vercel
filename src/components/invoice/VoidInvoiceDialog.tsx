import { useState } from "react";
import { useRouter } from "next/router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface VoidInvoiceDialogProps {
  invoiceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVoidComplete: () => void;
}

const voidReasons = [
  { value: "OFFICER_CHANGE", label: "Marriage Officer changes" },
  { value: "NO_REPLY", label: "Couple did not reply" },
  { value: "NO_PAYMENT", label: "Couple did not pay" },
  { value: "ALTERNATIVE", label: "Couple found an alternative" },
  { value: "OTHER", label: "Other" }
];

export function VoidInvoiceDialog({
  invoiceId,
  open,
  onOpenChange,
  onVoidComplete
}: VoidInvoiceDialogProps) {
  const router = useRouter();
  const [voidReason, setVoidReason] = useState<string>("");
  const [voidComment, setVoidComment] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createReplacement, setCreateReplacement] = useState(false);

  const handleVoidInvoice = async () => {
    if (!voidReason) {
      toast.error("Please select a reason for voiding the invoice");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch(`/api/invoices/${invoiceId}/void`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          voidReason,
          voidComment
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to void invoice');
      }

      toast.success("Invoice voided successfully");
      
      // If user wants to create a replacement invoice, redirect to the create page
      if (createReplacement) {
        // Close the dialog first
        onOpenChange(false);
        
        // Redirect to create invoice page with the original invoice ID
        router.push(`/dashboard/invoices/create?replacementInvoiceId=${invoiceId}`);
      } else {
        // Just close the dialog and refresh the list
        onVoidComplete();
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Error voiding invoice:", error);
      toast.error(error instanceof Error ? error.message : "Failed to void invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Void Invoice</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="voidReason">Reason for voiding *</Label>
            <Select
              value={voidReason}
              onValueChange={setVoidReason}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {voidReasons.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="voidComment">Additional comments</Label>
            <Textarea
              id="voidComment"
              value={voidComment}
              onChange={(e) => setVoidComment(e.target.value)}
              placeholder="Enter any additional details about why this invoice is being voided"
              rows={4}
            />
          </div>
          
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox 
              id="createReplacement" 
              checked={createReplacement}
              onCheckedChange={(checked) => setCreateReplacement(checked === true)}
            />
            <Label 
              htmlFor="createReplacement" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Create replacement invoice after voiding
            </Label>
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
            variant="destructive"
            onClick={handleVoidInvoice}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Voiding..." : "Void Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}