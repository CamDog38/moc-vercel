import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, User, FileText, DollarSign, Mail, Eye, Phone, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { FieldValueDisplay } from "@/components/ui/field-value-display";

type Booking = {
  id: string;
  date: string;
  time: string | null;
  location: string | null;
  name: string;
  email: string;
  status: string;
  formId: string;
  form: {
    name: string;
  };
  invoice?: {
    id: string;
    status: string;
    totalAmount: number;
  } | null;
  phone?: string;
  notes?: string;
  title?: string;
};

interface ViewBookingDetailsDialogProps {
  booking: Booking;
}

function ViewBookingDetailsDialog({ booking }: ViewBookingDetailsDialogProps) {
  const [open, setOpen] = useState(false);
  const [formSubmissions, setFormSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch form submissions when dialog opens
  useEffect(() => {
    if (open) {
      fetchFormSubmissions();
    } else {
      // Reset form submissions when dialog closes
      setFormSubmissions([]);
    }
  }, [open, booking.id]);

  const fetchFormSubmissions = async () => {
    try {
      setLoading(true);
      // First try to get submissions specific to this booking
      const response = await fetch(`/api/submissions?bookingId=${booking.id}`);
      
      if (!response.ok) {
        console.error('Error fetching submissions:', response.statusText);
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      
      // Filter submissions for this booking if the API doesn't filter them already
      const bookingSubmissions = Array.isArray(data) ? data.filter((sub: any) => sub.bookingId === booking.id) : [];
      
      if (bookingSubmissions.length === 0) {
        // No submissions found, stop loading
        setLoading(false);
        return;
      }
      
      // Fetch form structure for each submission
      const submissionsWithForms = await Promise.all(
        bookingSubmissions.map(async (submission: any) => {
          try {
            if (!submission.formId) {
              return submission;
            }
            
            const formResponse = await fetch(`/api/forms/${submission.formId}`);
            if (formResponse.ok) {
              const formData = await formResponse.json();
              return { ...submission, form: formData };
            }
            return submission;
          } catch (error) {
            console.error(`Error fetching form data for submission:`, error);
            return submission;
          }
        })
      );
      
      setFormSubmissions(submissionsWithForms);
    } catch (error) {
      console.error('Error fetching form submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get the appropriate badge variant for booking status
  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return "default";
      case 'pending':
        return "secondary";
      case 'cancelled':
        return "destructive";
      case 'completed':
        return "default";
      default:
        return "secondary";
    }
  };

  const hasWeddingDetails = () => {
    return formSubmissions.some((submission: any) => {
      return submission.form && submission.form.formSections && submission.form.formSections.some((section: any) => section.title === "Wedding Details");
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4 mr-2" />
          View Details
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{booking.name}</span>
            <Badge variant={getStatusVariant(booking.status)}>{booking.status}</Badge>
          </DialogTitle>
          <DialogDescription>Booking ID: {booking.id}</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <h2 className="text-xl font-semibold">{booking.title || booking.name}</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start">
              <Calendar className="h-5 w-5 mr-2 text-gray-500" />
              <div>
                <p className="font-medium">Date & Time</p>
                <p>
                  {format(new Date(booking.date), 'MMMM do, yyyy')}{' '}
                  at{' '}
                  {format(new Date(booking.date), 'h:mm a')}
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
          </div>
          
          <Separator />
          
          <h3 className="font-medium">Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start">
              <Mail className="h-5 w-5 mr-2 text-gray-500" />
              <div>
                <p className="font-medium">Email</p>
                <p>{booking.email}</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <Phone className="h-5 w-5 mr-2 text-gray-500" />
              <div>
                <p className="font-medium">Phone</p>
                <p>{booking.phone || 'Not provided'}</p>
              </div>
            </div>
          </div>

          {booking.form && (
            <div className="flex items-start">
              <FileText className="h-5 w-5 mr-2 text-gray-500" />
              <div>
                <p className="font-medium">Service Type</p>
                <p>{booking.form.name}</p>
              </div>
            </div>
          )}
          
          <div className="flex justify-end mt-2 space-x-2">
            {hasWeddingDetails() && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const weddingDetailsSection = document.getElementById('wedding-details-section-dialog');
                  if (weddingDetailsSection) {
                    weddingDetailsSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Wedding Details
              </Button>
            )}
          </div>
        </div>
        
        {formSubmissions.length > 0 ? (
          <>
            <Separator />
            <div id="wedding-details-dialog">
              <h3 className="font-medium mb-4">Form Submissions</h3>
              <div className="space-y-4">
                {formSubmissions.map((submission) => (
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
                            .sort((a: any, b: any) => a.order - b.order)
                            .map((section: any) => (
                              <div 
                                key={section.id} 
                                className="space-y-4 border rounded-md p-4 bg-muted/10"
                                id={section.title === "Wedding Details" ? "wedding-details-section-dialog" : undefined}
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
                                    .sort((a: any, b: any) => a.order - b.order)
                                    .map((field: any) => {
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
                                          </label>
                                          <div className="col-span-2 text-sm break-words whitespace-pre-wrap">
                                            <FieldValueDisplay value={value} />
                                          </div>
                                        </div>
                                      );
                                    })}
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        // Flat list of key-value pairs
                        <div className="space-y-4">
                          {Object.entries(submission.data).map(([key, value]) => {
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
                              <div key={key} className="grid grid-cols-3 items-start gap-4">
                                <label className="text-sm font-medium text-muted-foreground pt-1">
                                  {key}
                                </label>
                                <div className="col-span-2 text-sm break-words whitespace-pre-wrap">
                                  <FieldValueDisplay value={value} />
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
        ) : loading ? (
          <div className="flex justify-center items-center h-20">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <>
            <Separator />
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-4">No form submissions found for this booking.</p>
              <Link href={`/dashboard/bookings/${booking.id}`}>
                <Button variant="outline">
                  View Full Booking Details
                </Button>
              </Link>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Dashboard() {
  // Use React.useState to ensure it's properly referenced
  const { user } = useAuth();
  const [upcomingBookings, setUpcomingBookings] = React.useState<Booking[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Use React.useEffect to ensure it's properly referenced
  React.useEffect(() => {
    if (user) {
      fetchUpcomingBookings();
    }
  }, [user]);

  const fetchUpcomingBookings = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/bookings?upcoming=true", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setUpcomingBookings(data);
      setError(null);
    } catch (error) {
      console.error("Error fetching upcoming bookings:", error);
      setError("Failed to load upcoming bookings");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="container mx-auto p-8 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Welcome to Your Dashboard</CardTitle>
          <CardDescription>
            Manage your marriage services, bookings, and client information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/dashboard/forms">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-medium">Forms</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Create and manage your forms for bookings and inquiries
                  </p>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/dashboard/bookings">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-medium">Bookings</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    View and manage all your upcoming and past bookings
                  </p>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/dashboard/invoices">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-medium">Invoices</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Create and manage invoices for your services
                  </p>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/dashboard/emails">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-medium">Emails</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Manage email templates and automated responses
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Bookings</CardTitle>
          <CardDescription>
            Your next scheduled appointments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading upcoming bookings...</div>
          ) : error ? (
            <div className="text-center py-4 text-red-500">{error}</div>
          ) : upcomingBookings.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No upcoming bookings found
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingBookings.map((booking) => (
                <Card key={booking.id} className="overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    <div className="bg-primary/10 p-4 flex flex-col justify-center items-center md:w-1/4">
                      <div className="text-2xl font-bold">
                        {new Date(booking.date).getDate()}
                      </div>
                      <div className="text-sm uppercase">
                        {new Date(booking.date).toLocaleDateString('en-US', { month: 'short' })}
                      </div>
                      <div className="text-sm mt-2">
                        {booking.time || 'No time set'}
                      </div>
                    </div>
                    <div className="p-4 flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{booking.title || booking.name}</h3>
                          <p className="text-sm text-muted-foreground">{booking.email}</p>
                        </div>
                        <Badge variant={
                          booking.status === 'CONFIRMED' ? 'default' : 
                          booking.status === 'PENDING' ? 'secondary' : 
                          booking.status === 'CANCELLED' ? 'destructive' : 
                          'outline'
                        }>
                          {booking.status.toLowerCase()}
                        </Badge>
                      </div>
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center text-sm">
                          <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>{booking.location || 'No location set'}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>{booking.form.name}</span>
                        </div>
                        {booking.invoice && (
                          <div className="flex items-center text-sm">
                            <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span>
                              Invoice: R{booking.invoice.totalAmount.toFixed(2)} - 
                              <Badge variant={booking.invoice.status === 'paid' ? 'default' : 'secondary'} className="ml-2">
                                {booking.invoice.status}
                              </Badge>
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="mt-4">
                        <ViewBookingDetailsDialog booking={booking} />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}