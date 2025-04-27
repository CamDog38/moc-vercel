import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface DeleteBookingDialogProps {
  booking: any | null
  onClose: () => void
  onDelete: () => void
}

export function DeleteBookingDialog({ booking, onClose, onDelete }: DeleteBookingDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!booking) return;
    
    setIsDeleting(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/bookings/${booking.id}/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      let data;
      try {
        data = await response.json();
      } catch (e) {
        // If response is not JSON, handle it gracefully
        console.error('Failed to parse response as JSON:', e);
        data = { message: 'Server returned an invalid response' };
      }

      if (!response.ok) {
        let errorMessage = 'Failed to delete booking';
        
        if (response.status === 404) {
          errorMessage = 'Booking not found. It may have been already deleted.';
        } else if (response.status === 403) {
          errorMessage = 'You do not have permission to delete this booking.';
        } else if (data && data.message) {
          errorMessage = data.message;
        }
        
        throw new Error(errorMessage);
      }

      onDelete();
    } catch (error) {
      console.error('Error deleting booking:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete booking');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={!!booking} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Booking</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this booking? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}