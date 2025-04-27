import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/Header';
import { ArrowLeft, Calendar, Clock, MapPin, Mail, Phone, FileText, DollarSign, Edit, Download, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';

type Booking = {
  id: string;
  date: string;
  time: string;
  location: string;
  status: string;
  name: string;
  email: string;
  phone: string;
  notes?: string;
  formId: string;
};

type Invoice = {
  id: string;
  bookingId: string;
  status: string;
  serviceType: string;
  serviceRate: number;
  travelCosts: number;
  totalAmount: number;
  booking: Booking;
  invoiceNumber?: string;
  officer?: {
    title: string;
    firstName: string;
    lastName: string;
  };
};

type FormField = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  order: number;
  sectionId: string;
};

type FormSection = {
  id: string;
  title: string;
  description?: string;
  order: number;
  isPage: boolean;
  fields: FormField[];
};

type Form = {
  id: string;
  name: string;
  description?: string;
  formSections: FormSection[];
};

type FormSubmission = {
  id: string;
  formId: string;
  data: any;
  bookingId: string;
  form?: Form;
};

interface UpdateInvoiceDialogProps {
  booking: Booking;
  invoice: Invoice;
  onUpdate: () => void;
}

function UpdateInvoiceDialog({ booking, invoice, onUpdate }: UpdateInvoiceDialogProps) {
  const [open, setOpen] = useState(false);
  const [dateTime, setDateTime] = useState<Date | undefined>(booking.date ? new Date(booking.date) : undefined);
  const [location, setLocation] = useState(booking.location || '');
  const [loading, setLoading] = useState(false);
  const [officeLocations, setOfficeLocations] = useState<{id: string, name: string, address: string}[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // Set initial time if available
  useEffect(() => {
    if (dateTime && booking.time) {
      try {
        // Parse the time string (e.g., "2:00 PM")
        const timeMatch = booking.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (timeMatch) {
          const [_, hours, minutes, ampm] = timeMatch;
          let hour = parseInt(hours);
          const minute = parseInt(minutes);
          
          // Convert to 24-hour format
          if (ampm.toUpperCase() === 'PM' && hour < 12) {
            hour += 12;
          } else if (ampm.toUpperCase() === 'AM' && hour === 12) {
            hour = 0;
          }
          
          // Set the time on the dateTime object
          const newDateTime = new Date(dateTime);
          newDateTime.setHours(hour, minute);
          
          // Only update if the time is actually different to prevent infinite loops
          if (newDateTime.getTime() !== dateTime.getTime()) {
            setDateTime(newDateTime);
          }
        }
      } catch (error) {
        console.error('Error parsing time:', error);
      }
    }
  }, [booking.time]);

  // Fetch office locations from the API
  useEffect(() => {
    if (open) {
      const fetchLocations = async () => {
        try {
          setLoadingLocations(true);
          const response = await fetch("/api/locations", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include", // Important for authentication
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            setOfficeLocations(data);
          } else {
            // Fallback to default locations if API returns empty array
            setOfficeLocations([
              { id: "1", name: "Main Office", address: "123 Main St" },
              { id: "2", name: "Downtown Branch", address: "456 Downtown Ave" },
              { id: "3", name: "Satellite Office", address: "789 Satellite Rd" }
            ]);
          }
        } catch (error) {
          console.error('Error fetching locations:', error);
          // Fallback to default locations if API throws error
          setOfficeLocations([
            { id: "1", name: "Main Office", address: "123 Main St" },
            { id: "2", name: "Downtown Branch", address: "456 Downtown Ave" },
            { id: "3", name: "Satellite Office", address: "789 Satellite Rd" }
          ]);
        } finally {
          setLoadingLocations(false);
        }
      };
      
      fetchLocations();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Format time from dateTime
      let formattedTime = '';
      if (dateTime) {
        const hours = dateTime.getHours();
        const minutes = dateTime.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const formattedHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
        const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
        formattedTime = `${formattedHours}:${formattedMinutes} ${ampm}`;
      }

      const response = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: dateTime?.toISOString(),
          time: formattedTime,
          location,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update booking details');
      }

      toast({
        title: 'Success',
        description: 'Booking details updated successfully',
      });
      
      setOpen(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating booking:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update booking details',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="ml-2">
          <Edit className="h-4 w-4 mr-2" />
          Update Details
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Booking Details</DialogTitle>
          <DialogDescription>
            Update the date, time, and location for this booking.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="datetime">Event Date & Time</Label>
              <DateTimePicker
                date={dateTime}
                setDate={setDateTime}
                className="w-full"
                showTimePicker={true}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter location"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="office-location">Or Select Office Location</Label>
              <Select
                value={location}
                onValueChange={setLocation}
              >
                <SelectTrigger id="office-location">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {officeLocations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.name}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Booking'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function BookingDetails() {
  const { user } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  
  const [booking, setBooking] = useState<Booking | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookingData = async () => {
      if (!id) return;
      
      try {
        // Fetch booking details
        const bookingResponse = await fetch(`/api/bookings/${id}`);
        if (!bookingResponse.ok) {
          throw new Error('Failed to fetch booking details');
        }
        const bookingData = await bookingResponse.json();
        setBooking(bookingData);
        
        // Fetch invoice details
        const invoiceResponse = await fetch(`/api/bookings/${id}/invoice`);
        if (invoiceResponse.ok) {
          const invoiceData = await invoiceResponse.json();
          setInvoice(invoiceData);
        }
        
        // Fetch form submissions
        const submissionsResponse = await fetch('/api/submissions');
        if (submissionsResponse.ok) {
          const submissionsData = await submissionsResponse.json();
          const bookingSubmissions = submissionsData.filter(
            (sub: FormSubmission) => sub.bookingId === id
          );
          
          // Fetch form structure for each submission
          const submissionsWithForms = await Promise.all(
            bookingSubmissions.map(async (submission: FormSubmission) => {
              try {
                const formResponse = await fetch(`/api/forms/${submission.formId}`);
                if (formResponse.ok) {
                  const formData = await formResponse.json();
                  return { ...submission, form: formData };
                }
                return submission;
              } catch (error) {
                console.error(`Error fetching form data for submission ${submission.id}:`, error);
                return submission;
              }
            })
          );
          
          setSubmissions(submissionsWithForms);
        }
      } catch (err) {
        console.error('Error fetching booking data:', err);
        setError('Failed to load booking information');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchBookingData();
    }
  }, [user, id]);

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'confirmed':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Confirmed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Cancelled</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleUpdate = async () => {
    // Refetch booking data
    if (!id) return;
    
    setLoading(true);
    try {
      // Fetch booking details
      const bookingResponse = await fetch(`/api/bookings/${id}`);
      if (!bookingResponse.ok) {
        throw new Error('Failed to fetch booking details');
      }
      const bookingData = await bookingResponse.json();
      setBooking(bookingData);
      
      // Fetch invoice details
      const invoiceResponse = await fetch(`/api/bookings/${id}/invoice`);
      if (invoiceResponse.ok) {
        const invoiceData = await invoiceResponse.json();
        setInvoice(invoiceData);
      }
    } catch (err) {
      console.error('Error fetching booking data:', err);
      setError('Failed to refresh booking information');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['MARRIAGE_OFFICER', 'ADMIN', 'SUPER_ADMIN']}>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto py-6 px-4">
          <div className="flex items-center mb-6">
            <Button 
              variant="ghost" 
              onClick={() => router.push('/portal')}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Portal
            </Button>
            <h1 className="text-3xl font-bold">Booking Details</h1>
          </div>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
          ) : booking ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-2xl">{booking.name}</CardTitle>
                        <CardDescription>Booking ID: {booking.id}</CardDescription>
                      </div>
                      {getStatusBadge(booking.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start">
                        <Calendar className="h-5 w-5 mr-2 text-gray-500" />
                        <div>
                          <p className="font-medium">Date & Time</p>
                          <p>
                            {booking.date ? format(new Date(booking.date), 'MMMM d, yyyy') : 'Not specified'}
                            {booking.time ? ` at ${booking.time}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <MapPin className="h-5 w-5 mr-2 text-gray-500" />
                        <div>
                          <p className="font-medium">Location</p>
                          <p>{booking.location || 'Not specified'}</p>
                        </div>
                      </div>
                      {invoice && (
                        <div className="flex items-start">
                          <FileText className="h-5 w-5 mr-2 text-gray-500" />
                          <div>
                            <p className="font-medium">Service Type</p>
                            <p>{invoice.serviceType}</p>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex justify-end mt-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            const weddingDetailsSection = document.getElementById('wedding-details-section');
                            if (weddingDetailsSection) {
                              weddingDetailsSection.scrollIntoView({ behavior: 'smooth' });
                            } else {
                              // Fallback to the general form submissions section
                              const formSubmissionsSection = document.getElementById('wedding-details');
                              if (formSubmissionsSection) {
                                formSubmissionsSection.scrollIntoView({ behavior: 'smooth' });
                              }
                            }
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Wedding Details
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-medium mb-2">Contact Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start">
                          <Mail className="h-5 w-5 mr-2 text-gray-500" />
                          <div>
                            <p className="font-medium">Email</p>
                            <p>{booking.email}</p>
                          </div>
                        </div>
                        {booking.phone && (
                          <div className="flex items-start">
                            <Phone className="h-5 w-5 mr-2 text-gray-500" />
                            <div>
                              <p className="font-medium">Phone</p>
                              <p>{booking.phone}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {booking.notes && (
                      <>
                        <Separator />
                        <div>
                          <h3 className="font-medium mb-2">Notes</h3>
                          <p className="whitespace-pre-line">{booking.notes}</p>
                        </div>
                      </>
                    )}

                    {submissions.length > 0 && (
                      <>
                        <Separator />
                        <div id="wedding-details">
                          <h3 className="font-medium mb-4">Form Submissions</h3>
                          <div className="space-y-4">
                            {submissions.map((submission) => (
                              <Card key={submission.id}>
                                <CardHeader className="py-3">
                                  <CardTitle className="text-base">
                                    {submission.form?.name || 'Form Submission'}
                                  </CardTitle>
                                  {submission.form?.description && (
                                    <CardDescription>
                                      {submission.form.description}
                                    </CardDescription>
                                  )}
                                </CardHeader>
                                <CardContent className="py-2">
                                  {submission.form && submission.form.formSections ? (
                                    // Organized by sections
                                    <div className="space-y-6">
                                      {submission.form.formSections
                                        .sort((a, b) => a.order - b.order)
                                        .map((section) => (
                                          <div 
                                            key={section.id} 
                                            className="space-y-4 border rounded-md p-4 bg-muted/10"
                                            id={section.title === "Wedding Details" ? "wedding-details-section" : undefined}
                                          >
                                            <div className="border-b pb-2 mb-3">
                                              <h4 className="font-medium">{section.title}</h4>
                                              {section.description && (
                                                <p className="text-sm text-muted-foreground mt-1">
                                                  {section.description}
                                                </p>
                                              )}
                                            </div>
                                            <div className="space-y-4 pl-2 border-l-2 border-primary/30">
                                              {section.fields
                                                .sort((a, b) => a.order - b.order)
                                                .map((field) => {
                                                  const value = submission.data[field.id];
                                                  if (value === undefined) return null;
                                                  
                                                  let formattedValue = value;
                                                  
                                                  // Handle date values
                                                  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
                                                    try {
                                                      formattedValue = new Date(value).toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                      });
                                                    } catch (e) {
                                                      formattedValue = value;
                                                    }
                                                  }
                                                  
                                                  // Handle boolean values
                                                  if (typeof value === 'boolean') {
                                                    formattedValue = value ? 'Yes' : 'No';
                                                  }
                                                  
                                                  // Handle array values
                                                  if (Array.isArray(value)) {
                                                    formattedValue = value.join(', ');
                                                  }
                                                  
                                                  // Handle object values
                                                  if (typeof value === 'object' && value !== null) {
                                                    formattedValue = JSON.stringify(value, null, 2);
                                                  }

                                                  return (
                                                    <div key={field.id} className="grid grid-cols-3 items-start gap-4">
                                                      <label className="text-sm font-medium text-muted-foreground pt-1">
                                                        {field.label}
                                                        {field.required && <span className="text-red-500 ml-1">*</span>}
                                                      </label>
                                                      <div className="col-span-2 text-sm break-words whitespace-pre-wrap">
                                                        {String(formattedValue)}
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                            </div>
                                          </div>
                                        ))}
                                    </div>
                                  ) : (
                                    // Fallback for when form structure is not available
                                    <div className="space-y-4">
                                      {Object.entries(submission.data).map(([key, value]) => {
                                        let formattedValue = value;
                                        // Find the field label from the form structure
                                        let fieldLabel = key;
                                        
                                        // Handle date values
                                        if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
                                          try {
                                            formattedValue = new Date(value).toLocaleDateString('en-US', {
                                              year: 'numeric',
                                              month: 'long',
                                              day: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            });
                                          } catch (e) {
                                            formattedValue = value;
                                          }
                                        }
                                        
                                        // Handle boolean values
                                        if (typeof value === 'boolean') {
                                          formattedValue = value ? 'Yes' : 'No';
                                        }
                                        
                                        // Handle array values
                                        if (Array.isArray(value)) {
                                          formattedValue = value.join(', ');
                                        }
                                        
                                        // Handle object values
                                        if (typeof value === 'object' && value !== null) {
                                          formattedValue = JSON.stringify(value, null, 2);
                                        }

                                        return (
                                          <div key={key} className="grid grid-cols-3 items-start gap-4">
                                            <label className="text-sm font-medium text-muted-foreground pt-1">
                                              {fieldLabel}
                                            </label>
                                            <div className="col-span-2 text-sm break-words whitespace-pre-wrap">
                                              {String(formattedValue)}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {invoice && (
                <div className="md:col-span-1">
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle>Invoice Details</CardTitle>
                          <CardDescription>
                            {invoice.invoiceNumber ? `Invoice #${invoice.invoiceNumber}` : `Invoice ID: ${invoice.id}`}
                          </CardDescription>
                        </div>
                        <UpdateInvoiceDialog 
                          booking={booking} 
                          invoice={invoice} 
                          onUpdate={handleUpdate} 
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm font-medium">Status</p>
                        <Badge 
                          variant="outline" 
                          className={
                            invoice.status.toLowerCase() === 'paid' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }
                        >
                          {invoice.status}
                        </Badge>
                      </div>
                      
                      <Separator />
                      
                      {/* Simplified Invoice with only essential details */}
                      <div className="space-y-4">
                        {/* 1. Name */}
                        <div>
                          <h3 className="font-medium mb-1">Client</h3>
                          <p>{booking.name}</p>
                        </div>
                        
                        {/* 2. Contact Details */}
                        <div>
                          <h3 className="font-medium mb-1">Contact</h3>
                          <p>{booking.email}</p>
                          {booking.phone && <p>{booking.phone}</p>}
                        </div>
                        
                        {/* 3. Location */}
                        <div>
                          <h3 className="font-medium mb-1">Location</h3>
                          <p>{booking.location || 'Not specified'}</p>
                        </div>
                        
                        {/* 4. Services */}
                        <div>
                          <h3 className="font-medium mb-1">Service</h3>
                          <p>{invoice.serviceType}</p>
                        </div>
                        
                        {/* 5. Marriage Officer */}
                        {invoice.officer && (
                          <div>
                            <h3 className="font-medium mb-1">Marriage Officer</h3>
                            <p>{invoice.officer.title} {invoice.officer.firstName} {invoice.officer.lastName}</p>
                          </div>
                        )}
                        
                        {/* 6. Fees/Costs */}
                        <div className="p-4 border rounded-lg mt-4">
                          <h3 className="font-semibold mb-2">Invoice Details</h3>
                          <div className="space-y-2">
                            <Separator />
                            <div className="flex justify-between font-bold">
                              <p>Total:</p>
                              <p>R{invoice.totalAmount.toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-center pt-2 pb-4">
                      <Button 
                        variant="outline"
                        className="w-full"
                        onClick={async () => {
                          try {
                            if (!invoice) {
                              throw new Error('No invoice found');
                            }
                            
                            // Open the invoice view in a new tab
                            window.open(`/invoices/${invoice.id}/view?admin=true`, '_blank');
                          } catch (error) {
                            console.error('Error opening invoice:', error);
                            toast({
                              title: "Error",
                              description: "Failed to open invoice",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        View Invoice
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <h2 className="text-xl font-medium mb-2">Booking Not Found</h2>
              <p className="text-gray-500 mb-6">The booking you're looking for doesn't exist or you don't have permission to view it.</p>
              <Button onClick={() => router.push('/portal')}>
                Return to Portal
              </Button>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}