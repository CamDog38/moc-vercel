import { Booking } from "@/lib/bookings/types/types";

/**
 * Fetch all bookings with cache-busting
 */
export async function fetchBookings(): Promise<Booking[]> {
  try {
    // Add cache-busting query parameter to ensure we get fresh data
    const timestamp = new Date().getTime();
    console.log('Fetching bookings from simplified API endpoint...');
    
    // Use our new simplified API endpoint
    const response = await fetch(`/api/bookings/all?_=${timestamp}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // Add cache control headers to prevent caching
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Fetched bookings:', data.length, 'records');
    
    // Simple logging to understand the data structure
    if (data.length > 0) {
      console.log('First booking sample:', {
        id: data[0].id,
        name: data[0].name,
        email: data[0].email,
        phone: data[0].phone,
        hasForm: !!data[0].form,
        formName: data[0].form?.name
      });
    }
    
    // No need to deduplicate as our API directly returns unique bookings
    return data;
  } catch (error) {
    console.error("Error fetching bookings:", error);
    throw error;
  }
}

/**
 * Fetch booking details by ID
 */
export async function fetchBookingDetails(bookingId: string): Promise<Booking> {
  try {
    console.log('Fetching detailed booking information for:', bookingId);
    
    // Use our new details API endpoint that handles both legacy and Form 2.0 bookings
    const response = await fetch(`/api/bookings/${bookingId}/details`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch booking details: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Received booking details with form sections:', data.form?.formSections?.length || 0);
    
    return data;
  } catch (error) {
    console.error('Error fetching booking details:', error);
    throw error;
  }
}

/**
 * Delete a booking by ID
 */
export async function deleteBooking(bookingId: string): Promise<void> {
  try {
    const response = await fetch(`/api/bookings/${bookingId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete booking');
    }
  } catch (error) {
    console.error('Error deleting booking:', error);
    throw error;
  }
}

/**
 * Download a booking document as Word (.docx)
 */
export async function downloadBookingDocument(bookingId: string): Promise<Blob> {
  try {
    const response = await fetch(`/api/bookings/${bookingId}/document`);
    if (!response.ok) {
      throw new Error('Failed to download document');
    }
    
    return await response.blob();
  } catch (error) {
    console.error('Error downloading document:', error);
    throw error;
  }
}

/**
 * Check if a booking has active invoices
 */
export async function checkBookingInvoices(bookingId: string): Promise<any[]> {
  try {
    const response = await fetch(`/api/bookings/${bookingId}/invoices`);
    if (!response.ok) {
      throw new Error(`Failed to check for existing invoices: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error checking for existing invoices:', error);
    throw error;
  }
}

/**
 * Apply filters to bookings
 */
export function filterBookings(
  bookings: Booking[], 
  searchTerm: string, 
  dateRange: { from: Date | undefined; to: Date | undefined },
  activeTab: string,
  useAllTimeFilter: boolean
): Booking[] {
  if (bookings.length === 0) {
    return [];
  }

  let filtered = [...bookings];

  // Apply search filter
  if (searchTerm.trim() !== '') {
    const search = searchTerm.toLowerCase().trim();
    filtered = filtered.filter(booking => {
      // Extract name, email, phone from all possible sources
      let name = '';
      let email = '';
      let phone = '';

      // Try to get values from the booking object directly
      name = (booking.name || '').toLowerCase();
      email = (booking.email || '').toLowerCase();
      phone = (booking.phone || '').toLowerCase();

      // Try to get values from mappedData if available
      if (booking.mappedData) {
        name = name || (
          booking.mappedData.name || 
          booking.mappedData['Full Name'] || 
          booking.mappedData.fullName || 
          ''
        ).toLowerCase();

        email = email || (
          booking.mappedData.email || 
          booking.mappedData['Email Address'] || 
          booking.mappedData.emailAddress || 
          ''
        ).toLowerCase();

        phone = phone || (
          booking.mappedData.phone || 
          booking.mappedData['Phone Number'] || 
          booking.mappedData.phoneNumber || 
          booking.mappedData.mobile || 
          ''
        ).toLowerCase();
      }

      // Try to get values from submissions if available
      if (booking.submissions && booking.submissions.length > 0) {
        const submission = booking.submissions[0];
        if (submission.data) {
          name = name || (
            submission.data.name || 
            submission.data['Full Name'] || 
            submission.data.fullName || 
            ''
          ).toLowerCase();

          email = email || (
            submission.data.email || 
            submission.data['Email Address'] || 
            submission.data.emailAddress || 
            ''
          ).toLowerCase();

          phone = phone || (
            submission.data.phone || 
            submission.data['Phone Number'] || 
            submission.data.phoneNumber || 
            submission.data.mobile || 
            ''
          ).toLowerCase();
        }
      }

      // Also search in form name if available
      const formName = (booking.form?.name || '').toLowerCase();

      return name.includes(search) || 
             email.includes(search) || 
             phone.includes(search) ||
             formName.includes(search);
    });
  }

  // Apply date range filter - skip if "All time" is selected
  if (dateRange.from && dateRange.to && !useAllTimeFilter) {
    filtered = filtered.filter(booking => {
      try {
        const bookingDate = new Date(booking.date);
        return bookingDate >= dateRange.from! && bookingDate <= dateRange.to!;
      } catch (e) {
        console.error('Error parsing date for booking:', booking.id, e);
        // If we can't parse the date, include it by default
        return true;
      }
    });
  }

  // Apply tab filter
  const now = new Date();
  console.log('Current date for filtering:', now.toISOString());
  
  if (activeTab === "upcoming") {
    filtered = filtered.filter(booking => {
      try {
        // Parse the booking date and set time to midnight for proper comparison
        const bookingDateStr = booking.date instanceof Date 
          ? booking.date.toISOString().split('T')[0] 
          : typeof booking.date === 'string' 
            ? booking.date.split('T')[0] 
            : null;
            
        if (!bookingDateStr) {
          console.error('Invalid date format for booking:', booking.id);
          return false;
        }
        
        const bookingDate = new Date(bookingDateStr + 'T00:00:00');
        const nowDate = new Date(now.toISOString().split('T')[0] + 'T00:00:00');
        
        // For debugging
        if (booking.id === filtered[0]?.id) {
          console.log('Sample upcoming comparison:', {
            bookingId: booking.id,
            bookingDateOriginal: booking.date,
            bookingDateParsed: bookingDate.toISOString(),
            nowDate: nowDate.toISOString(),
            isUpcoming: bookingDate >= nowDate
          });
        }
        
        return bookingDate >= nowDate;
      } catch (e) {
        console.error('Error parsing date for booking:', booking.id, e);
        // If we can't parse the date, exclude it from upcoming
        return false;
      }
    });
  } else if (activeTab === "past") {
    filtered = filtered.filter(booking => {
      try {
        // Parse the booking date and set time to midnight for proper comparison
        const bookingDateStr = booking.date instanceof Date 
          ? booking.date.toISOString().split('T')[0] 
          : typeof booking.date === 'string' 
            ? booking.date.split('T')[0] 
            : null;
            
        if (!bookingDateStr) {
          console.error('Invalid date format for booking:', booking.id);
          return false;
        }
        
        const bookingDate = new Date(bookingDateStr + 'T00:00:00');
        const nowDate = new Date(now.toISOString().split('T')[0] + 'T00:00:00');
        
        // For debugging
        if (booking.id === filtered[0]?.id) {
          console.log('Sample past comparison:', {
            bookingId: booking.id,
            bookingDateOriginal: booking.date,
            bookingDateParsed: bookingDate.toISOString(),
            nowDate: nowDate.toISOString(),
            isPast: bookingDate < nowDate
          });
        }
        
        return bookingDate < nowDate;
      } catch (e) {
        console.error('Error parsing date for booking:', booking.id, e);
        // If we can't parse the date, exclude it from past
        return false;
      }
    });
  }
  // "all" tab doesn't need additional filtering

  return filtered;
}

/**
 * Sort bookings by field and direction
 */
export function sortBookings(
  bookings: Booking[],
  sortField: string,
  sortDirection: "asc" | "desc"
): Booking[] {
  if (bookings.length === 0) {
    return [];
  }

  const sorted = [...bookings];
  
  sorted.sort((a, b) => {
    let valueA, valueB;
    
    // Determine which field to sort by
    if (sortField === "createdAt") {
      valueA = new Date(a.createdAt).getTime();
      valueB = new Date(b.createdAt).getTime();
    } else if (sortField === "date") {
      valueA = new Date(a.date).getTime();
      valueB = new Date(b.date).getTime();
    } else {
      // Default to createdAt if sortField is not recognized
      valueA = new Date(a.createdAt).getTime();
      valueB = new Date(b.createdAt).getTime();
    }
    
    // Apply sort direction
    return sortDirection === "asc" ? valueA - valueB : valueB - valueA;
  });

  return sorted;
}

/**
 * Paginate bookings
 */
export function paginateBookings(
  bookings: Booking[],
  currentPage: number,
  pageSize: number
): Booking[] {
  if (bookings.length === 0) {
    return [];
  }
  
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, bookings.length);
  return bookings.slice(startIndex, endIndex);
}
