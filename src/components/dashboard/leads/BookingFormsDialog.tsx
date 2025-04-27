import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form } from "./types/types";

interface BookingFormsDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  bookingForms: Form[];
  selectedForm: string;
  setSelectedForm: (formId: string) => void;
  loading: boolean;
  onGenerateLink: () => void;
}

export function BookingFormsDialog({
  open,
  setOpen,
  bookingForms,
  selectedForm,
  setSelectedForm,
  loading,
  onGenerateLink
}: BookingFormsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Booking Form</DialogTitle>
          <DialogDescription>
            Choose a booking form to generate a link for the lead.
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p>Loading booking forms...</p>
          </div>
        ) : bookingForms.length === 0 ? (
          <div className="text-center py-4">
            <p>No booking forms available.</p>
            <p className="text-sm text-muted-foreground mt-2">Create a booking form in Forms section first.</p>
          </div>
        ) : (
          <div className="py-4">
            <Select value={selectedForm} onValueChange={setSelectedForm}>
              <SelectTrigger>
                <SelectValue placeholder="Select a booking form" />
              </SelectTrigger>
              <SelectContent>
                {bookingForms.map(form => (
                  <SelectItem key={form.id} value={form.id}>{form.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        <DialogFooter className="flex justify-between mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={onGenerateLink} 
            disabled={!selectedForm || loading}
          >
            Generate Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
