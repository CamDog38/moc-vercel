import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/Header';
import { LogOut } from 'lucide-react';
import AddRateDialog from '@/components/AddRateDialog';

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
  invoice?: {
    id: string;
    serviceType: string;
    serviceRate: number;
    travelCosts: number;
    totalAmount: number;
    status: string;
  };
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
};

export default function OfficerPortal() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [officerData, setOfficerData] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    const fetchOfficerData = async () => {
      try {
        const response = await fetch('/api/officers');
        if (!response.ok) {
          throw new Error('Failed to fetch officer data');
        }
        const data = await response.json();
        if (data && data.length > 0) {
          setOfficerData(data[0]);
        }
      } catch (err) {
        console.error('Error fetching officer data:', err);
        setError('Failed to load your profile information');
      }
    };

    const fetchBookings = async () => {
      try {
        const response = await fetch('/api/portal/bookings');
        if (!response.ok) {
          throw new Error('Failed to fetch bookings');
        }
        const data = await response.json();
        setBookings(data);
      } catch (err) {
        console.error('Error fetching bookings:', err);
        setError('Failed to load your assigned bookings');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchOfficerData();
      fetchBookings();
    }
  }, [user]);

  // Get filtered bookings based on tab and date selection
  const getFilteredBookings = (tabValue: string) => {
    // First filter by tab value (upcoming/past/all)
    let filtered = bookings.filter(booking => {
      const bookingDate = new Date(booking.date);
      const today = new Date();
      
      if (tabValue === 'upcoming') return bookingDate >= today;
      if (tabValue === 'past') return bookingDate < today;
      return true; // 'all' tab
    });
    
    // Then apply date filter if a date is selected
    if (selectedDate) {
      filtered = filtered.filter(booking => {
        const bookingDate = new Date(booking.date);
        return bookingDate.toDateString() === selectedDate.toDateString();
      });
    }
    
    return filtered;
  };

  // Get all dates with bookings for the calendar
  const bookingDates = bookings.map(booking => new Date(booking.date));

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

  return (
    <ProtectedRoute allowedRoles={['MARRIAGE_OFFICER', 'ADMIN', 'SUPER_ADMIN']}>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto py-6 px-4">
          <h1 className="text-3xl font-bold mb-6">Marriage Officer Portal</h1>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>My Profile</CardTitle>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          signOut();
                          router.push('/login');
                        }}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Log out
                      </Button>
                    </div>
                    <CardDescription>Your officer information</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {officerData ? (
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-medium">{officerData.title} {officerData.firstName} {officerData.lastName}</h3>
                          <p className="text-sm text-gray-500">{officerData.user?.email}</p>
                        </div>
                        {officerData.phoneNumber && (
                          <div>
                            <p className="text-sm font-medium">Phone</p>
                            <p>{officerData.phoneNumber}</p>
                          </div>
                        )}
                        {officerData.address && (
                          <div>
                            <p className="text-sm font-medium">Address</p>
                            <p>{officerData.address}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium">Status</p>
                          <p>{officerData.isActive ? 'Active' : 'Inactive'}</p>
                        </div>
                        <Separator />
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="font-medium">My Service Rates</h3>
                            {/* Removed AddRateDialog button and dialog */}
                          </div>
                          {officerData.rates && officerData.rates.length > 0 ? (
                            <div className="space-y-2">
                              {officerData.rates.map((rate: any) => (
                                <div key={rate.id} className="bg-gray-50 p-2 rounded">
                                  <p className="font-medium">{rate.serviceType}</p>
                                  <p className="text-sm">Base Rate: R{rate.baseRate}</p>
                                  {rate.travelRatePerKm && (
                                    <p className="text-sm">Travel: R{rate.travelRatePerKm}/km</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">No service rates defined</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p>No profile information available</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Calendar</CardTitle>
                    <CardDescription>Select a date to view bookings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      className="rounded-md border"
                      modifiers={{
                        booked: bookingDates,
                      }}
                      modifiersStyles={{
                        booked: { 
                          fontWeight: 'bold',
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          borderRadius: '0',
                        }
                      }}
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="md:col-span-2">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>My Bookings</CardTitle>
                        <CardDescription>
                          {selectedDate 
                            ? `Bookings for ${format(selectedDate, 'MMMM d, yyyy')}` 
                            : 'All your assigned bookings'}
                        </CardDescription>
                      </div>
                      {selectedDate && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setSelectedDate(undefined)}
                        >
                          Clear Date Filter
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="upcoming">
                      <TabsList className="mb-4">
                        <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                        <TabsTrigger value="past">Past</TabsTrigger>
                        <TabsTrigger value="all">All</TabsTrigger>
                      </TabsList>
                      
                      {['upcoming', 'past', 'all'].map((tabValue) => {
                        const filteredResults = getFilteredBookings(tabValue);
                        return (
                          <TabsContent key={tabValue} value={tabValue} className="space-y-4">
                            {filteredResults.length === 0 ? (
                              <p className="text-center py-8 text-gray-500">
                                {selectedDate 
                                  ? `No ${tabValue} bookings found for ${format(selectedDate, 'MMMM d, yyyy')}` 
                                  : `No ${tabValue} bookings found`}
                              </p>
                            ) : (
                              filteredResults.map(booking => (
                                <Card key={booking.id} className="overflow-hidden">
                                  <div className="flex flex-col md:flex-row">
                                    <div className="p-4 md:w-1/4 bg-gray-50 flex flex-col justify-center items-center">
                                      <p className="text-xl font-bold">
                                        {format(new Date(booking.date), 'MMM d')}
                                      </p>
                                      <p className="text-lg">
                                        {format(new Date(booking.date), 'yyyy')}
                                      </p>
                                      <p className="mt-2 font-medium">
                                        {booking.time}
                                      </p>
                                    </div>
                                    <div className="p-4 md:w-3/4">
                                      <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-lg">{booking.name}</h3>
                                        {getStatusBadge(booking.status)}
                                      </div>
                                      <p className="text-sm mb-2">
                                        <span className="font-medium">Service:</span> {booking.invoice?.serviceType || 'Not specified'}
                                      </p>
                                      <p className="text-sm mb-2">
                                        <span className="font-medium">Location:</span> {booking.location || 'Not specified'}
                                      </p>
                                      <div className="flex flex-col sm:flex-row sm:justify-between mt-4">
                                        <div className="mb-2 sm:mb-0">
                                          <p className="text-sm">
                                            <span className="font-medium">Email:</span> {booking.email}
                                          </p>
                                          {booking.phone && (
                                            <p className="text-sm">
                                              <span className="font-medium">Phone:</span> {booking.phone}
                                            </p>
                                          )}
                                        </div>
                                        <div className="text-right">
                                          <p className="font-medium">Total: R{booking.invoice?.totalAmount || 0}</p>
                                          <Button 
                                            variant="outline" 
                                            size="sm"
                                            className="mt-2"
                                            onClick={() => router.push(`/portal/bookings/${booking.id}`)}
                                          >
                                            View Details
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </Card>
                              ))
                            )}
                          </TabsContent>
                        );
                      })}
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
