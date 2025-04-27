import { useState, useRef } from "react";
import { useRouter } from "next/router";
import { MoreVertical, Trash2, Calendar, ArrowUpDown, ArrowUp, ArrowDown, FileDown, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/use-toast";
import { Booking } from "@/lib/bookings/types/types";
import { formatDate } from "@/util/date-format";

interface BookingsTableProps {
  bookings: Booking[];
  loading: boolean;
  onViewDetails: (booking: Booking) => void;
  onDeleteBooking: (booking: Booking) => void;
}

type SortField = 'date' | 'createdAt' | null;
type SortDirection = 'asc' | 'desc';

export function BookingsTable({ 
  bookings, 
  loading, 
  onViewDetails, 
  onDeleteBooking 
}: BookingsTableProps): JSX.Element {
  const router = useRouter();
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Debug flags to avoid excessive logging using refs
  const debuggedForm2 = useRef(false);
  const debuggedLegacy = useRef(false);
  
  // Function to handle column sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // Sort the bookings based on current sort field and direction
  const sortedBookings = [...bookings].sort((a, b) => {
    if (!sortField) return 0;
    
    if (sortField === 'date') {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortDirection === 'asc' 
        ? dateA - dateB
        : dateB - dateA;
    }
    
    if (sortField === 'createdAt') {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortDirection === 'asc' 
        ? dateA - dateB
        : dateB - dateA;
    }
    
    return 0;
  });

  // Function to get status badge color
  const getStatusColor = (status: string | null | undefined): string => {
    if (!status) return 'bg-gray-100 text-gray-800';
    
    switch (status.toLowerCase()) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Helper function to safely get value from booking with fallbacks
  const getBookingValue = (booking: Booking, key: string, alternateKeys: string[] = []): any => {
    // First try the booking object directly
    if ((booking as any)[key] !== undefined) {
      return (booking as any)[key];
    }

    // Try alternate keys in booking object
    for (const altKey of alternateKeys) {
      if ((booking as any)[altKey] !== undefined) {
        return (booking as any)[altKey];
      }
    }

    // Next, try mappedData
    if (booking.mappedData && booking.mappedData[key] !== undefined) {
      return booking.mappedData[key];
    }

    // Try alternate keys in mappedData
    for (const altKey of alternateKeys) {
      if (booking.mappedData && booking.mappedData[altKey] !== undefined) {
        return booking.mappedData[altKey];
      }
    }

    // If we have submissions, try to extract from there
    if (booking.submissions && booking.submissions.length > 0) {
      const submission = booking.submissions[0];
      if (submission.data && submission.data[key] !== undefined) {
        return submission.data[key];
      }

      // Try alternate keys in submission data
      for (const altKey of alternateKeys) {
        if (submission.data && submission.data[altKey] !== undefined) {
          return submission.data[altKey];
        }
      }
    }

    return undefined;
  };

  // Debug function to log booking data structure
  const debugBookingData = (booking: Booking) => {
    console.group(`===== DETAILED BOOKING ${booking.id} ANALYSIS =====`);
    
    // Log basic properties
    console.group('Basic Properties');
    console.log({
      id: booking.id,
      name: booking.name,
      email: booking.email,
      phone: booking.phone,
      date: booking.date,
      createdAt: booking.createdAt,
      isFormSystem2: booking.isFormSystem2,
      formId: (booking as any).formId || (booking.form?.id || null),
      formName: booking.form?.name || null
    });
    console.groupEnd();
    
    // Log mappedData if available
    console.group('MappedData Analysis');
    if (booking.mappedData) {
      console.log('Has mappedData: YES');
      console.log('MappedData Keys:', Object.keys(booking.mappedData));
      console.log('MappedData Values:', booking.mappedData);
      
      // Check for common fields in mappedData
      const nameFields = ['name', 'Name', 'Full Name', 'fullName'];
      const emailFields = ['email', 'Email', 'Email Address', 'emailAddress'];
      const phoneFields = ['phone', 'Phone', 'Phone Number', 'phoneNumber', 'mobile', 'Mobile'];
      
      const foundNameField = nameFields.find(field => booking.mappedData && booking.mappedData[field] !== undefined);
      const foundEmailField = emailFields.find(field => booking.mappedData && booking.mappedData[field] !== undefined);
      const foundPhoneField = phoneFields.find(field => booking.mappedData && booking.mappedData[field] !== undefined);
      
      console.log('Found name field in mappedData:', foundNameField || 'NONE');
      console.log('Found email field in mappedData:', foundEmailField || 'NONE');
      console.log('Found phone field in mappedData:', foundPhoneField || 'NONE');
    } else {
      console.log('Has mappedData: NO');
    }
    console.groupEnd();
    
    // Log form data if available
    console.group('Form Data Analysis');
    if (booking.form) {
      console.log('Has form: YES');
      console.log('Form ID:', booking.form.id);
      console.log('Form Name:', booking.form.name);
      console.log('Form Properties:', Object.keys(booking.form));
      console.log('Is Form 2.0:', (booking.form as any).formSections ? 'YES' : 'NO');
    } else {
      console.log('Has form: NO');
    }
    console.groupEnd();
    
    // Log submissions data if available
    console.group('Submissions Analysis');
    if (booking.submissions && booking.submissions.length > 0) {
      console.log('Has submissions: YES');
      console.log('Submissions count:', booking.submissions.length);
      console.log('First submission properties:', Object.keys(booking.submissions[0]));
      
      if (booking.submissions[0].data) {
        console.log('First submission data keys:', Object.keys(booking.submissions[0].data));
        console.log('First submission data:', booking.submissions[0].data);
        
        // Check for common fields in submission data
        const nameFields = ['name', 'Name', 'Full Name', 'fullName'];
        const emailFields = ['email', 'Email', 'Email Address', 'emailAddress'];
        const phoneFields = ['phone', 'Phone', 'Phone Number', 'phoneNumber', 'mobile', 'Mobile'];
        
        const foundNameField = nameFields.find(field => 
          booking.submissions && 
          booking.submissions[0].data && 
          booking.submissions[0].data[field] !== undefined
        );
        const foundEmailField = emailFields.find(field => 
          booking.submissions && 
          booking.submissions[0].data && 
          booking.submissions[0].data[field] !== undefined
        );
        const foundPhoneField = phoneFields.find(field => 
          booking.submissions && 
          booking.submissions[0].data && 
          booking.submissions[0].data[field] !== undefined
        );
        
        console.log('Found name field in submission data:', foundNameField || 'NONE');
        console.log('Found email field in submission data:', foundEmailField || 'NONE');
        console.log('Found phone field in submission data:', foundPhoneField || 'NONE');
      } else {
        console.log('First submission has no data property');
      }
    } else {
      console.log('Has submissions: NO');
    }
    console.groupEnd();
    
    // Log what getBookingValue returns for key fields
    console.group('GetBookingValue Results');
    console.log('name:', getBookingValue(booking, 'name', ['Full Name', 'fullName']));
    console.log('email:', getBookingValue(booking, 'email', ['Email Address', 'emailAddress']));
    console.log('phone:', getBookingValue(booking, 'phone', ['Phone Number', 'phoneNumber', 'mobile']));
    console.log('formName:', getBookingValue(booking, 'formName') || booking.form?.name);
    console.groupEnd();
    
    console.groupEnd(); // End DETAILED BOOKING ANALYSIS
  };

  return (
    <div className="rounded-md border">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50">
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-medium text-muted-foreground">Name</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-medium text-muted-foreground">Email</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-medium text-muted-foreground">Phone</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-medium text-muted-foreground">Form</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-medium text-muted-foreground cursor-pointer" onClick={() => handleSort('date')}>
                <div className="flex items-center gap-1">
                  Booking Date
                  {sortField === 'date' ? (
                    sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                  ) : (
                    <ArrowUpDown className="h-4 w-4" />
                  )}
                </div>
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-medium text-muted-foreground cursor-pointer" onClick={() => handleSort('createdAt')}>
                <div className="flex items-center gap-1">
                  Created Date
                  {sortField === 'createdAt' ? (
                    sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                  ) : (
                    <ArrowUpDown className="h-4 w-4" />
                  )}
                </div>
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center">
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">Loading bookings...</div>
                </td>
              </tr>
            ) : sortedBookings.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center">
                  <div className="text-sm text-muted-foreground">No bookings found</div>
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground">
                      Bookings will appear here when users complete your booking forms.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              sortedBookings.map((booking, index) => {
                // Debug ALL bookings to help diagnose unmapped data issues
                // Only log the first 10 to avoid console spam
                if (index < 10) {
                  console.log(`Booking ${index} in table: ${booking.id}`, {
                    name: booking.name || 'UNMAPPED',
                    email: booking.email || 'UNMAPPED',
                    phone: booking.phone || 'UNMAPPED',
                    formName: booking.form?.name || 'No form name',
                    formId: booking.form?.id || 'No form ID',
                    hasMappedData: !!booking.mappedData,
                    hasSubmissions: !!(booking.submissions && booking.submissions.length > 0)
                  });
                  
                  // Log detailed data for unmapped bookings
                  if (!booking.name && !booking.email && !booking.phone) {
                    console.log(`UNMAPPED BOOKING DETECTED: ${booking.id}`);
                    debugBookingData(booking);
                  }
                }
                
                // Always log the first booking in detail
                if (index === 0) {
                  console.log('FIRST BOOKING DETAILED ANALYSIS:');
                  debugBookingData(booking);
                  debuggedLegacy.current = true;
                }
                
                return (
                  <tr key={`${booking.id}-${index}`} className="border-t hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm">
                      <button 
                        className="text-left font-medium text-primary hover:underline focus:outline-none" 
                        onClick={() => {
                          // Debug the booking data structure when viewing details
                          if (booking.isFormSystem2) {
                            debugBookingData(booking);
                          }
                          onViewDetails(booking);
                        }}
                      >
                        {getBookingValue(booking, 'name', ['Full Name', 'fullName']) || "Unnamed Booking"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm">{getBookingValue(booking, 'email', ['Email Address', 'emailAddress']) || "-"}</td>
                    <td className="px-4 py-3 text-sm">{getBookingValue(booking, 'phone', ['Phone Number', 'phoneNumber', 'mobile']) || "-"}</td>
                    <td className="px-4 py-3 text-sm">
                      <div>
                        {(() => {
                          // Try to get form name from different sources
                          const formName = booking.form?.name || 
                                         getBookingValue(booking, 'formName') || 
                                         getBookingValue(booking, 'form')?.name || 
                                         "Unknown Form";
                          return formName;
                        })()}
                      </div>
                      {/* Removed Form 2.0 badge for simplicity */}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(getBookingValue(booking, 'status'))}`}>
                        {getBookingValue(booking, 'status') ? 
                          String(getBookingValue(booking, 'status')).charAt(0).toUpperCase() + String(getBookingValue(booking, 'status')).slice(1) : 
                          'Pending'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {(() => {
                        try {
                          return formatDate(booking.date.toString(), 'PPP');
                        } catch (e) {
                          return 'Invalid Date';
                        }
                      })()}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {(() => {
                        try {
                          return formatDate(booking.createdAt.toString(), 'PPP');
                        } catch (e) {
                          return 'Invalid Date';
                        }
                      })()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => onViewDetails(booking)}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={async () => {
                              try {
                                const response = await fetch(`/api/bookings/${booking.id}/document`);
                                if (!response.ok) {
                                  throw new Error('Failed to download document');
                                }
                                
                                const blob = await response.blob();
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
                              }
                            }}>
                            <FileDown className="mr-2 h-4 w-4" />
                            Download Document
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={async () => {
                              try {
                                // Check if booking already has an active invoice
                                const response = await fetch(`/api/bookings/${booking.id}/invoices`);
                                if (!response.ok) {
                                  throw new Error(`Failed to check for existing invoices: ${response.status}`);
                                }
                                
                                const data = await response.json();
                                const activeInvoices = data.filter((invoice: any) => invoice.status !== 'voided');
                                
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
                                console.error('Error checking for existing invoices:', error);
                                toast({
                                  title: "Error",
                                  description: "Failed to check for existing invoices. Please try again.",
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            Create Invoice
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => onDeleteBooking(booking)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Booking
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
