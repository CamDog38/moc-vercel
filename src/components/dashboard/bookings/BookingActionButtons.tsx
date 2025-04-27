import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { useState } from "react";
import { downloadBookingDocument, checkBookingInvoices } from "./services/bookingsService";
import { FileDown, FileText } from "lucide-react";
import { Booking } from "@/lib/bookings/types/types";

interface BookingActionButtonsProps {
  booking: Booking;
}

export function BookingActionButtons({ booking }: BookingActionButtonsProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  
  // Handle document download
  const handleDownloadDocument = async () => {
    setIsDownloading(true);
    try {
      // Direct fetch implementation for consistency with existing code
      const response = await fetch(`/api/bookings/${booking.id}/document`);
      if (!response.ok) {
        throw new Error('Failed to download document');
      }
      
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `booking-${booking.id}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Success",
        description: "Document downloaded successfully",
      });
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: "Error",
        description: "Failed to download document",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };
  
  // Handle invoice creation
  const handleCreateInvoice = async () => {
    setIsCreatingInvoice(true);
    try {
      // First check if there are existing invoices using the /api/bookings/[id]/invoices endpoint
      const response = await fetch(`/api/bookings/${booking.id}/invoices`);
      if (!response.ok) {
        throw new Error(`Failed to check for existing invoices: ${response.status}`);
      }
      
      const existingInvoices = await response.json();
      const activeInvoices = existingInvoices.filter((invoice: any) => invoice.status !== 'voided');
      
      if (activeInvoices.length > 0) {
        // If there are active invoices, ask the user if they want to create a new one
        toast({
          title: "Existing Invoices",
          description: `This booking already has ${activeInvoices.length} active invoice(s). Would you like to create a new one?`,
          action: (
            <Button 
              variant="outline" 
              onClick={() => {
                // Redirect to the invoice creation page with the booking ID
                window.open(`/dashboard/invoices/create?bookingId=${booking.id}`, '_blank');
              }}
            >
              Create New
            </Button>
          ),
        });
      } else {
        // If there are no active invoices, update the booking details first if needed
        // This uses the /api/bookings/[id]/invoice POST endpoint to update booking details
        if (booking.date || booking.time || booking.location) {
          try {
            // Only update if these fields exist
            const updateResponse = await fetch(`/api/bookings/${booking.id}/invoice`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                date: booking.date,
                time: booking.time,
                location: booking.location
              })
            });
            
            if (!updateResponse.ok) {
              console.warn('Failed to update booking details for invoice, but continuing anyway');
            }
          } catch (updateError) {
            console.warn('Error updating booking details:', updateError);
            // Continue anyway - non-critical error
          }
        }
        
        // Redirect to the invoice creation page
        window.open(`/dashboard/invoices/create?bookingId=${booking.id}`, '_blank');
      }
    } catch (error) {
      console.error('Error checking invoices:', error);
      toast({
        title: "Error",
        description: "Failed to check existing invoices",
        variant: "destructive",
      });
    } finally {
      setIsCreatingInvoice(false);
    }
  };
  
  return (
    <div className="flex flex-col space-y-2">
      <h3 className="text-sm font-medium">Actions</h3>
      <div className="flex flex-col space-y-1">
        <Button 
          variant="ghost" 
          size="sm" 
          className="justify-start px-2 h-8 hover:bg-muted"
          onClick={handleDownloadDocument}
          disabled={isDownloading}
        >
          <FileDown className="mr-2 h-4 w-4" />
          <span className="text-sm">{isDownloading ? 'Downloading...' : 'Download Document'}</span>
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="justify-start px-2 h-8 hover:bg-muted"
          onClick={handleCreateInvoice}
          disabled={isCreatingInvoice}
        >
          <FileText className="mr-2 h-4 w-4" />
          <span className="text-sm">{isCreatingInvoice ? 'Creating...' : 'Create Invoice'}</span>
        </Button>
      </div>
    </div>
  );
}
