import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lead } from "./types/types";
import { toast } from "@/components/ui/use-toast";

interface BookingLinkDialogProps {
  bookingLink: string | null;
  setBookingLink: (link: string | null) => void;
}

export function BookingLinkDialog({ bookingLink, setBookingLink }: BookingLinkDialogProps) {
  const copyBookingLink = () => {
    if (bookingLink) {
      navigator.clipboard.writeText(bookingLink)
        .then(() => {
          toast({
            title: "Success",
            description: "Booking link copied to clipboard",
          });
        })
        .catch((err) => {
          console.error("Failed to copy booking link:", err);
          toast({
            title: "Error",
            description: "Failed to copy booking link",
            variant: "destructive",
          });
        });
    }
  };

  return (
    <Dialog open={!!bookingLink} onOpenChange={(open) => !open && setBookingLink(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Booking Link</DialogTitle>
          <DialogDescription>
            Share this link with the lead to allow them to complete a booking form.
            The link will track that the booking originated from this lead.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center space-x-2 mt-4">
          <Input 
            value={bookingLink || ''} 
            readOnly 
            className="flex-1"
          />
          <Button onClick={copyBookingLink}>
            Copy
          </Button>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setBookingLink(null)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BookingLinkLoadingDialog({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <div className="flex flex-col items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p>Generating booking link...</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
