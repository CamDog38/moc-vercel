import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Booking } from "@/lib/bookings/types/types";
import { DeleteBookingDialog } from "@/components/DeleteBookingDialog";
import { BookingsTable } from "@/components/dashboard/bookings/BookingsTable";
import { BookingsFilter } from "@/components/dashboard/bookings/BookingsFilter";
import { BookingDetailsDialog } from "@/components/dashboard/bookings/BookingDetailsDialog";
import { BookingsPagination } from "@/components/dashboard/bookings/BookingsPagination";
import * as bookingsService from "@/components/dashboard/bookings/services/bookingsService";

export default function BookingsPage() {
  // State for bookings data
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [paginatedBookings, setPaginatedBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [bookingToDelete, setBookingToDelete] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined
  });
  const [activeTab, setActiveTab] = useState<string>("upcoming");
  const [useAllTimeFilter, setUseAllTimeFilter] = useState<boolean>(false);
  
  // Sorting state
  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc"); // Default to newest first
  
  // Pagination state
  const [pageSize, setPageSize] = useState<number>(10); // Default to 10 items per page
  const [currentPage, setCurrentPage] = useState<number>(1);
  
  const { user } = useAuth();

  // Fetch bookings on component mount
  useEffect(() => {
    if (user) {
      fetchBookings();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Apply filters, sorting, and pagination when dependencies change
  useEffect(() => {
    applyFiltersAndSort();
  }, [bookings, searchTerm, dateRange, activeTab, sortField, sortDirection, useAllTimeFilter]);
  
  // Apply pagination when filtered bookings or pagination settings change
  useEffect(() => {
    applyPagination();
  }, [filteredBookings, currentPage, pageSize]);

  // Function to fetch bookings
  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await bookingsService.fetchBookings();
      setBookings(data);
    } catch (err: any) {
      setError(err.message || "Failed to load bookings. Please try again.");
      toast({
        title: "Error",
        description: err.message || "Failed to fetch bookings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to view booking details
  const handleViewBookingDetails = async (booking: Booking) => {
    try {
      const detailedBooking = await bookingsService.fetchBookingDetails(booking.id);
      setSelectedBooking(detailedBooking);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to fetch booking details",
        variant: "destructive",
      });
      // Fallback to using the booking from the list
      setSelectedBooking(booking);
    }
  };

  // Function to delete a booking
  const handleDeleteBooking = async (bookingId: string) => {
    try {
      await bookingsService.deleteBooking(bookingId);
      setBookings(bookings.filter(b => b.id !== bookingId));
      toast({
        title: "Success",
        description: "Booking deleted successfully",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete booking",
        variant: "destructive",
      });
    }
  };

  // Function to apply filters and sorting
  const applyFiltersAndSort = () => {
    if (bookings.length === 0) {
      setFilteredBookings([]);
      return;
    }

    // Apply filters
    const filtered = bookingsService.filterBookings(
      bookings,
      searchTerm,
      dateRange,
      activeTab,
      useAllTimeFilter
    );

    // Apply sorting
    const sorted = bookingsService.sortBookings(
      filtered,
      sortField,
      sortDirection
    );

    setFilteredBookings(sorted);
    // Reset to first page when filters change
    setCurrentPage(1);
  };

  // Function to apply pagination
  const applyPagination = () => {
    if (filteredBookings.length === 0) {
      setPaginatedBookings([]);
      return;
    }
    
    const paginated = bookingsService.paginateBookings(
      filteredBookings,
      currentPage,
      pageSize
    );
    
    setPaginatedBookings(paginated);
  };

  return (
    <>
      <main className="container mx-auto p-8">
        <div className="rounded-lg border bg-card text-card-foreground shadow">
          <div className="flex justify-between items-center p-6">
            <h3 className="text-2xl font-semibold leading-none tracking-tight">Bookings Management</h3>
            <Button 
              onClick={fetchBookings} 
              variant="outline" 
              size="sm"
              disabled={loading}
              className="flex items-center gap-1"
            >
              {loading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-1"></div>
                  Refreshing...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                    <path d="M21 2v6h-6"></path>
                    <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
                    <path d="M3 22v-6h6"></path>
                    <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
                  </svg>
                  Refresh
                </>
              )}
            </Button>
          </div>
          
          <div className="px-6 mb-4">
            <BookingsFilter 
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onSearchChange={setSearchTerm}
              onDateRangeChange={(range) => {
                setDateRange(range);
                // If both dates are undefined, it means "All time" was selected
                setUseAllTimeFilter(!range.from && !range.to);
              }}
              initialSearch={searchTerm}
              initialDateRange={dateRange}
            />
          </div>
          
          <div className="p-6 pt-0">
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : error ? (
              <div className="flex justify-center items-center py-8 text-red-500">
                {error}
              </div>
            ) : bookings.length === 0 ? (
              <div className="flex flex-col justify-center items-center py-8 text-muted-foreground">
                <p>No bookings found</p>
                <div className="mt-4 text-xs text-muted-foreground">
                  <pre className="bg-muted p-2 rounded">
                    {JSON.stringify({ 
                      totalBookings: bookings.length, 
                      forms2Bookings: bookings.filter(b => (b as any).isFormSystem2).length 
                    }, null, 2)}
                  </pre>
                </div>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="flex flex-col justify-center items-center py-8 text-muted-foreground">
                <p>No bookings match your search criteria</p>
                <div className="mt-4 text-xs text-muted-foreground">
                  <pre className="bg-muted p-2 rounded">
                    {JSON.stringify({
                      totalBookings: bookings.length,
                      filteredBookings: filteredBookings.length,
                      forms2Bookings: bookings.filter(b => (b as any).isFormSystem2).length,
                      filteredForms2Bookings: filteredBookings.filter(b => (b as any).isFormSystem2).length
                    }, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <>
                <BookingsTable 
                  bookings={paginatedBookings}
                  loading={loading}
                  onViewDetails={handleViewBookingDetails}
                  onDeleteBooking={setBookingToDelete}
                />
                
                <BookingsPagination 
                  currentPage={currentPage}
                  pageSize={pageSize}
                  totalItems={filteredBookings.length}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setCurrentPage(1); // Reset to first page when changing page size
                  }}
                />
              </>
            )}
          </div>
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <DeleteBookingDialog
        booking={bookingToDelete}
        onClose={() => setBookingToDelete(null)}
        onDelete={() => {
          if (bookingToDelete) {
            handleDeleteBooking(bookingToDelete.id);
          }
          setBookingToDelete(null);
        }}
      />

      {/* Booking Details Dialog */}
      <BookingDetailsDialog
        open={!!selectedBooking}
        onOpenChange={(open) => !open && setSelectedBooking(null)}
        booking={selectedBooking}
      />
    </>
  );
}
