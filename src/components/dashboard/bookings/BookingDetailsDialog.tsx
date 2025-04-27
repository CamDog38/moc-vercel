import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDate } from "@/util/date-format";
import { Booking } from "@/lib/bookings/types/types";
import { BookingActionButtons } from "./BookingActionButtons";
import { FormSubmissionData } from "./FormSubmissionData";

interface BookingDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking | null;
}

export function BookingDetailsDialog({ open, onOpenChange, booking }: BookingDetailsDialogProps) {
  if (!booking) return null;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-start">
          <div>
            <DialogTitle className="text-xl font-semibold pb-1">Booking Details</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {booking.form?.name || 'Form'} • {booking.createdAt ? formatDate(booking.createdAt.toString()) : 'No date'}
            </p>
          </div>
          
          <BookingActionButtons booking={booking} />
        </div>
        
        <ScrollArea className="max-h-[calc(90vh-120px)] mt-4">
          <div className="pr-4">
            <FormSubmissionData booking={booking} />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default BookingDetailsDialog;
