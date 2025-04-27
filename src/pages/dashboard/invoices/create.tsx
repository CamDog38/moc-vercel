import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { toast } from "sonner";
import { DEFAULT_SERVICE_TYPES } from '@/util/service-types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

// Helper function to format service type
const formatServiceType = (serviceType: string): string => {
  if (!serviceType) return '';
  
  // Check if it's a known service type with a display name
  if (DEFAULT_SERVICE_TYPES[serviceType as keyof typeof DEFAULT_SERVICE_TYPES]) {
    return DEFAULT_SERVICE_TYPES[serviceType as keyof typeof DEFAULT_SERVICE_TYPES];
  } 
  
  // Otherwise, format it nicely
  return serviceType
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

type Booking = {
  id: string;
  date: string;
  time: string | null;
  location: string | null;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  invoice?: {
    id: string;
  } | null;
};

type MarriageOfficer = {
  id: string;
  firstName: string;
  lastName: string;
  title?: string;
  rates: ServiceRate[];
};

type ServiceRate = {
  id: string;
  serviceType: string;
  baseRate: number;
  travelRatePerKm: number | null;
};

type LineItem = {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  _delete?: boolean;
};

type Location = {
  id: string;
  name: string;
  address: string;
};

const SERVICE_TYPES = {
  REGISTRATION_OFFICE: "Registration at our offices",
  REGISTRATION_HOME: "Registration at your home",
  SMALL_CEREMONY: "Small ceremony",
  WEDDING_CEREMONY: "Wedding ceremony",
} as const;

export default function CreateInvoicePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [officers, setOfficers] = useState<MarriageOfficer[]>([]);
  const [selectedOfficer, setSelectedOfficer] = useState<string | null>(null);
  const [genericRates, setGenericRates] = useState<ServiceRate[]>([]);
  const [serviceType, setServiceType] = useState<string>("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [bookingLocation, setBookingLocation] = useState<string>('');
  const [bookingTime, setBookingTime] = useState<string>('');
  const [bookingDate, setBookingDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingOfficers, setLoadingOfficers] = useState(false);
  const [loadingGenericRates, setLoadingGenericRates] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("existing");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingBookingDetails, setIsLoadingBookingDetails] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [isFetchingInvoice, setIsFetchingInvoice] = useState(false);
  const [isBookingsFetched, setIsBookingsFetched] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  // State for editing existing invoice
  const [editMode, setEditMode] = useState(false);
  const [existingInvoiceId, setExistingInvoiceId] = useState<string | null>(null);

  // Track if we're creating from a specific booking
  const [creatingFromBooking, setCreatingFromBooking] = useState(false);

  // Add a ref to track if we've already fetched this invoice
  const invoiceIdRef = useRef<string | null>(null);
  const editModeSetRef = useRef(false);

  // Add a ref to track if we've already fetched bookings
  const bookingsFetchedRef = useRef(false);

  // Track deleted line items directly in component state
  const [deletedLineItemIds, setDeletedLineItemIds] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      const initializeData = async () => {
        setPageLoading(true);
        setAuthError(false);
        try {
          // Fetch all required data in parallel only once
          await Promise.allSettled([
            fetchBookings(),
            fetchOfficers(),
            fetchGenericRates(),
            fetchLocations(),
          ]);
          
          // Check for bookingId in query params
          if (router.query.bookingId && typeof router.query.bookingId === 'string') {
            const bookingId = router.query.bookingId;
            handleBookingSelect(bookingId);
            setActiveTab("existing");
          }
        } catch (error) {
          console.error("Error initializing data:", error);
          toast.error("Failed to load some data. Please try refreshing the page.");
        } finally {
          setPageLoading(false);
        }
      };
      
      initializeData();
    }
  }, [user, router.query]);

  useEffect(() => {
    const { invoiceId, replacementInvoiceId } = router.query;
    
    // Check if we have a replacementInvoiceId (for creating a replacement invoice)
    // or a regular invoiceId (for editing an existing invoice)
    const targetInvoiceId = replacementInvoiceId || invoiceId;
    const isReplacement = !!replacementInvoiceId;
    
    if (isReplacement) {
      console.log("Creating a replacement invoice for:", replacementInvoiceId);
    } else if (invoiceId) {
      console.log("Editing existing invoice:", invoiceId);
    }
    
    // Only fetch if:
    // 1. We have an invoice ID (either for edit or replacement)
    // 2. It's a string
    // 3. We're not already fetching
    // 4. We have a user
    if (
      targetInvoiceId && 
      typeof targetInvoiceId === "string" && 
      !isFetchingInvoice && 
      user
    ) {
      // Store the current invoice ID to prevent duplicate fetches
      invoiceIdRef.current = targetInvoiceId;
      
      // Use a flag to prevent duplicate fetches
      const fetchInvoiceData = async () => {
        try {
          setIsFetchingInvoice(true);
          setPageLoading(true);
          
          // Always log this for debugging purposes
          console.log("Fetching invoice with ID:", targetInvoiceId);
          
          const response = await fetch(`/api/invoices/${targetInvoiceId}/get`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          });
          
          if (!response.ok) {
            if (response.status === 401) {
              console.error("Authentication error when fetching invoice");
              toast.error("Session expired. Please log in again.");
              setAuthError(true);
              return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const data = await response.json();
          
          // Always log this for debugging purposes
          console.log("API response data:", data);
          
          // Check if we have a valid invoice object
          if (!data.invoice) {
            console.error("Invalid API response - missing invoice data");
            toast.error("Failed to load invoice data - invalid response format");
            setPageLoading(false);
            setIsFetchingInvoice(false);
            return;
          }
          
          const invoice = data.invoice;
          
          // Always log this for debugging purposes
          console.log("Fetched invoice for editing:", invoice);
          
          // Check if this is a replacement invoice workflow
          const isReplacementWorkflow = !!replacementInvoiceId;
          const isVoidedInvoice = invoice.status === "voided";
          
          if (isVoidedInvoice && !isReplacementWorkflow) {
            // If this is a voided invoice and not a replacement workflow, prevent editing
            toast.error("Voided invoices cannot be edited. Please create a replacement invoice instead.");
            router.push('/dashboard/invoices'); // Redirect back to invoices list
            return;
          } else if (isReplacementWorkflow || isVoidedInvoice) {
            // For replacement invoices or voided invoices, we're creating a new invoice, not editing
            if (process.env.NODE_ENV !== 'production') {
              console.log("Setting up replacement invoice workflow");
            }
            
            if (isVoidedInvoice) {
              toast.info("Creating a replacement for a voided invoice");
            } else {
              toast.info("Creating a replacement invoice");
            }
            
            // Don't set edit mode for replacements
            setEditMode(false);
            setExistingInvoiceId(null);
            
            // For replacement invoices, don't set the officer ID from the original invoice
            // This ensures we start with a clean officer selection
            setSelectedOfficer(null);
          } else {
            // For non-voided invoices, we're editing
            setEditMode(true);
            setExistingInvoiceId(typeof targetInvoiceId === 'string' ? targetInvoiceId : null);
          }
          
          // If the invoice has a booking, use it directly instead of loading all bookings
          if (invoice.booking) {
            if (process.env.NODE_ENV !== 'production') {
              console.log("Invoice has booking:", invoice.booking);
            }
            
            const bookingData = invoice.booking;
            setSelectedBooking(bookingData);
            
            // Set date, time, and location from the booking
            if (bookingData.date) {
              setBookingDate(new Date(bookingData.date));
            }
            if (bookingData.time) {
              setBookingTime(bookingData.time || '');
            }
            if (bookingData.location) {
              setBookingLocation(bookingData.location || '');
            }
          } else if (invoice.bookingId) {
            // If we have a bookingId but no booking object, fetch it directly
            if (process.env.NODE_ENV !== 'production') {
              console.log("Invoice has bookingId but no booking object:", invoice.bookingId);
            }
            
            try {
              const bookingResponse = await fetch(`/api/bookings/${invoice.bookingId}`, {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                },
                credentials: "include",
              });
              
              if (bookingResponse.ok) {
                const bookingData = await bookingResponse.json();
                if (process.env.NODE_ENV !== 'production') {
                  console.log("Fetched booking directly:", bookingData);
                }
                setSelectedBooking(bookingData);
                
                // Set date, time, and location from the booking
                if (bookingData.date) {
                  setBookingDate(new Date(bookingData.date));
                }
                if (bookingData.time) {
                  setBookingTime(bookingData.time || '');
                }
                if (bookingData.location) {
                  setBookingLocation(bookingData.location || '');
                }
              } else {
                console.error("Failed to fetch booking");
                toast.error("Failed to fetch booking details");
              }
            } catch (error) {
              console.error("Error fetching booking:", error);
              toast.error("Error fetching booking details");
            }
          }
          
          // Set service details for non-replacement invoices only
          if (!isVoidedInvoice) {
            if (process.env.NODE_ENV !== 'production') {
              console.log("Setting service details:", {
                serviceType: invoice.serviceType,
                serviceRate: invoice.serviceRate,
                travelCosts: invoice.travelCosts
              });
            }
            
            setServiceType(invoice.serviceType || "");
            
            // Set officer only for non-replacement invoices
            if (invoice.officerId) {
              if (process.env.NODE_ENV !== 'production') {
                console.log("Setting officer ID:", invoice.officerId);
              }
              setSelectedOfficer(invoice.officerId);
              
              // If we have an officer object directly from the invoice, make sure it's in our officers list
              if (invoice.officer && !officers.some(o => o.id === invoice.officerId)) {
                if (process.env.NODE_ENV !== 'production') {
                  console.log("Adding officer from invoice to officers list:", invoice.officer);
                }
                setOfficers(prev => [...prev, {
                  id: invoice.officer.id,
                  firstName: invoice.officer.firstName,
                  lastName: invoice.officer.lastName,
                  title: invoice.officer.title,
                  rates: []
                }]);
              }
            }
          } else {
            // For replacement invoices, we want to keep the original service type
            // but allow the user to change it if needed
            if (invoice.serviceType) {
              if (process.env.NODE_ENV !== 'production') {
                console.log("Setting original service type for replacement invoice:", invoice.serviceType);
              }
              setServiceType(invoice.serviceType);
            }
            
            // For replacement invoices, we should also set the original officer
            // to maintain the same service provider
            if (invoice.officerId) {
              if (process.env.NODE_ENV !== 'production') {
                console.log("Setting original officer for replacement invoice:", invoice.officerId);
              }
              
              // Check if the officer already exists in our list to prevent duplicates
              const officerExists = officers.some(o => o.id === invoice.officerId);
              
              if (process.env.NODE_ENV !== 'production') {
                console.log(`Officer ${invoice.officerId} exists in officers list: ${officerExists}`);
              }
              
              // If we have an officer object directly from the invoice, make sure it's in our officers list
              if (invoice.officer && !officerExists) {
                if (process.env.NODE_ENV !== 'production') {
                  console.log("Adding officer from invoice to officers list for replacement:", invoice.officer);
                }
                
                // Add the officer to our list with proper rates
                const newOfficer = {
                  id: invoice.officer.id,
                  firstName: invoice.officer.firstName,
                  lastName: invoice.officer.lastName,
                  title: invoice.officer.title,
                  rates: invoice.officer.rates || []
                };
                
                if (process.env.NODE_ENV !== 'production') {
                  console.log("New officer being added to list:", newOfficer);
                }
                
                setOfficers(prev => {
                  // Double check to make sure we're not adding a duplicate
                  if (prev.some(o => o.id === newOfficer.id)) {
                    console.log("Officer already exists in list, not adding duplicate");
                    return prev;
                  }
                  return [...prev, newOfficer];
                });
              }
              
              // Set the selected officer AFTER ensuring it exists in our list
              setSelectedOfficer(invoice.officerId);
            }
          }
          
          // Set line items
          if (process.env.NODE_ENV !== 'production') {
            console.log("Line items from invoice:", invoice.lineItems);
          }
          
          // Check if this is a replacement invoice workflow
          const isReplacementInvoice = !!replacementInvoiceId || isVoidedInvoice;
          
          // Always start with empty line items for replacement invoices
          if (isReplacementInvoice) {
            if (process.env.NODE_ENV !== 'production') {
              console.log("This is a replacement invoice - starting with empty line items");
            }
            // Explicitly set empty line items for replacement invoices
            setLineItems([]);
          } else if (invoice.lineItems && Array.isArray(invoice.lineItems)) {
            // For regular editing, keep the line items
            if (process.env.NODE_ENV !== 'production') {
              console.log("This is a regular edit - keeping original line items:", invoice.lineItems);
            }
            setLineItems(invoice.lineItems.map((item: any) => ({
              id: item.id,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice
            })));
          } else {
            if (process.env.NODE_ENV !== 'production') {
              console.log("No line items found or not an array");
            }
            setLineItems([]);
          }
          
          if (process.env.NODE_ENV !== 'production') {
            console.log("Invoice data loaded successfully");
          }
          
        } catch (error: any) {
          console.error("Error fetching invoice:", error);
          if (error.authError) {
            setAuthError(true);
            return;
          }
          toast.error("Failed to load invoice data");
        } finally {
          setPageLoading(false);
          setIsFetchingInvoice(false);
        }
      };
      
      fetchInvoiceData();
    }
  }, [router.query, isFetchingInvoice, user]);

  useEffect(() => {
    // Fetch bookings only when needed - when user is creating a new invoice without a specific booking
    const { bookingId, invoiceId, replacementInvoiceId } = router.query;
    const shouldFetchBookings = 
      !editMode && 
      !bookingId && 
      !invoiceId && 
      !replacementInvoiceId && 
      !isBookingsFetched && 
      !loadingBookings &&
      !bookingsFetchedRef.current;
    
    if (shouldFetchBookings) {
      if (process.env.NODE_ENV !== 'production') {
        console.log("Fetching bookings for dropdown selection");
      }
      bookingsFetchedRef.current = true;
      fetchBookings();
    }
  }, [editMode, router.query, isBookingsFetched, loadingBookings]);

  useEffect(() => {
    const { invoiceId, replacementInvoiceId, bookingId } = router.query;
    
    // Only set edit mode once to prevent multiple renders
    if (invoiceId && !replacementInvoiceId && !editModeSetRef.current) {
      if (process.env.NODE_ENV !== 'production') {
        console.log("Editing existing invoice:", invoiceId);
      }
      setEditMode(true);
      editModeSetRef.current = true;
    } else if (replacementInvoiceId && !editModeSetRef.current) {
      if (process.env.NODE_ENV !== 'production') {
        console.log("Creating replacement invoice for:", replacementInvoiceId);
      }
      // For replacement invoices, we don't want edit mode
      setEditMode(false);
      editModeSetRef.current = true;
    } else if (bookingId && !creatingFromBooking) {
      if (process.env.NODE_ENV !== 'production') {
        console.log("Creating invoice from booking:", bookingId);
      }
      setCreatingFromBooking(true);
      handleBookingSelect(bookingId as string);
    }
  }, [router.query, creatingFromBooking]);

  const fetchBookings = async () => {
    if (!user) return;
    
    try {
      setLoadingBookings(true);
      setLoading(true);
      const response = await fetch("/api/bookings", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.error("Authentication error when fetching bookings");
          toast.error("Session expired. Please log in again.");
          throw { authError: true, message: "Authentication failed" };
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      // Filter out bookings that already have invoices
      const bookingsWithoutInvoices = data.filter((booking: any) => !booking.invoice);
      setBookings(bookingsWithoutInvoices);
      setIsBookingsFetched(true);
    } catch (error: any) {
      console.error("Error fetching bookings:", error);
      if (!error.authError) {
        toast.error("Failed to load bookings");
      }
      throw error;
    } finally {
      setLoadingBookings(false);
      setLoading(false);
    }
  };

  const fetchOfficers = async () => {
    if (!user) return;
    
    try {
      setLoadingOfficers(true);
      const response = await fetch("/api/officers", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.error("Authentication error when fetching officers");
          toast.error("Session expired. Please log in again.");
          throw { authError: true, message: "Authentication failed" };
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setOfficers(data);
    } catch (error: any) {
      console.error("Error fetching officers:", error);
      if (!error.authError) {
        toast.error("Failed to load marriage officers");
      }
      throw error;
    } finally {
      setLoadingOfficers(false);
    }
  };

  const fetchGenericRates = async () => {
    if (!user) return;
    
    try {
      setLoadingGenericRates(true);
      const response = await fetch("/api/generic-rates", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.error("Authentication error when fetching generic rates");
          toast.error("Session expired. Please log in again.");
          throw { authError: true, message: "Authentication failed" };
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setGenericRates(data);
    } catch (error: any) {
      console.error("Error fetching generic rates:", error);
      if (!error.authError) {
        toast.error("Failed to load service rates");
      }
      throw error;
    } finally {
      setLoadingGenericRates(false);
    }
  };

  const fetchLocations = async () => {
    if (!user) return;
    
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
        if (response.status === 401) {
          console.error("Authentication error when fetching locations");
          toast.error("Session expired. Please log in again.");
          throw { authError: true, message: "Authentication failed" };
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setLocations(data);
    } catch (error: any) {
      console.error("Failed to fetch locations:", error);
      if (!error.authError) {
        toast.error("Failed to load locations");
      }
      throw error;
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleBookingSelect = async (bookingId: string) => {
    setIsLoadingBookingDetails(true);
    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log("Selected booking ID:", bookingId);
      }
      
      // Check if booking already has active invoices
      const invoicesResponse = await fetch(`/api/bookings/${bookingId}/invoices`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      
      if (!invoicesResponse.ok) {
        throw new Error(`Failed to check for existing invoices: ${invoicesResponse.status}`);
      }
      
      const invoicesData = await invoicesResponse.json();
      console.log('Invoices for booking:', invoicesData);
      const activeInvoices = invoicesData.filter((invoice: any) => invoice.status !== 'voided');
      
      if (activeInvoices.length > 0 && !router.query.replacementInvoiceId) {
        // If there's an active invoice and we're not creating a replacement, show a warning
        toast.error("This booking already has an active invoice. You cannot create another invoice until the existing one is voided.");
        router.push('/dashboard/invoices'); // Redirect back to invoices list
        return;
      }
      
      // Find the booking in the list
      const booking = bookings.find(b => b.id === bookingId);
      
      if (booking) {
        if (process.env.NODE_ENV !== 'production') {
          console.log("Found booking:", booking);
        }
        setSelectedBooking(booking);
        setBookingDate(booking.date ? new Date(booking.date) : null);
        setBookingLocation(booking.location || '');
        setBookingTime(booking.time || '');
      } else {
        // If not found in the list, fetch it directly
        if (process.env.NODE_ENV !== 'production') {
          console.log("Booking not found in list, fetching directly");
        }
        const response = await fetch(`/api/bookings/${bookingId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });
        
        if (response.ok) {
          const bookingData = await response.json();
          if (process.env.NODE_ENV !== 'production') {
            console.log("Fetched booking data:", bookingData);
          }
          setSelectedBooking(bookingData);
          setBookingDate(bookingData.date ? new Date(bookingData.date) : null);
          setBookingLocation(bookingData.location || '');
          setBookingTime(bookingData.time || '');
        } else {
          console.error("Failed to fetch booking");
          toast.error("Failed to fetch booking details");
        }
      }
    } catch (error) {
      console.error("Error selecting booking:", error);
      toast.error("Error selecting booking");
    } finally {
      setIsLoadingBookingDetails(false);
    }
  };

  const handleOfficerSelect = async (officerId: string) => {
    console.log(`Officer selected: ${officerId}`);
    
    // Store the previous officer ID for comparison
    const previousOfficerId = selectedOfficer;
    
    // Update the selected officer
    setSelectedOfficer(officerId);
    
    // Check if we're creating a replacement invoice
    const isReplacementInvoice = router.query.invoiceId && typeof router.query.invoiceId === 'string' && !editMode;
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Is replacement invoice: ${isReplacementInvoice}`);
      console.log(`Previous officer: ${previousOfficerId}, New officer: ${officerId}`);
    }
    
    // For replacement invoices, we want to keep the officer selection without auto-selecting service types
    if (isReplacementInvoice) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Replacement invoice workflow: Officer selected: ${officerId}, keeping selection without auto-selecting service types`);
      }
      
      // Even for replacement invoices, we should update the officer in state
      // This ensures the selection is properly maintained
      if (officerId !== "generic") {
        const officer = officers.find(o => o.id === officerId);
        if (officer) {
          console.log(`Selected officer for replacement invoice: ${officer.firstName} ${officer.lastName}`);
        } else {
          console.warn(`Selected officer ID ${officerId} not found in officers list`);
        }
      } else {
        console.log("Generic service selected for replacement invoice");
      }
      
      return;
    }
    
    if (officerId !== "generic") {
      // Officer selected
      const officer = officers.find(o => o.id === officerId);
      
      // If officer has no rates or we need to ensure we have the latest rates
      if (officer && (!officer.rates || officer.rates.length === 0)) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`Officer ${officer.firstName} ${officer.lastName} has no rates, fetching from API...`);
        }
        try {
          // Fetch rates directly from the API to ensure we have the latest data
          const response = await fetch(`/api/officers/${officerId}/rates`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          });
          
          if (response.ok) {
            const rates = await response.json();
            if (process.env.NODE_ENV !== 'production') {
              console.log(`Fetched ${rates.length} rates for officer ${officerId}:`, rates);
            }
            
            // Update the officer's rates in our local state
            const updatedOfficers = officers.map(o => {
              if (o.id === officerId) {
                return { ...o, rates };
              }
              return o;
            });
            
            setOfficers(updatedOfficers);
            
            // Update our reference to the officer
            const updatedOfficer = updatedOfficers.find(o => o.id === officerId);
            
            // If we have rates now, use the first one
            if (updatedOfficer && rates.length > 0) {
              const firstRate = rates[0];
              const serviceTypeKey = Object.entries(SERVICE_TYPES).find(
                ([key, value]) => value === firstRate.serviceType || key === firstRate.serviceType
              );
              
              const serviceType = serviceTypeKey ? serviceTypeKey[0] : firstRate.serviceType;
              setServiceType(serviceType);
              
              // Add service rate and travel costs as line items
              const baseRate = parseFloat(firstRate.baseRate.toString());
              const travelRate = firstRate.travelRatePerKm ? parseFloat(firstRate.travelRatePerKm.toString()) : 0;
              
              updateAutoLineItems(
                serviceType,
                baseRate,
                travelRate,
                updatedOfficer ? `${updatedOfficer.firstName} ${updatedOfficer.lastName}` : 'Generic'
              );
            }
          } else {
            console.error(`Failed to fetch rates for officer ${officerId}`);
            toast.error("Failed to load service types for this officer");
          }
        } catch (error) {
          console.error(`Error fetching rates for officer ${officerId}:`, error);
          toast.error("Error loading service types");
        }
      } else if (officer && officer.rates.length > 0) {
        // Officer has rates, use the first one
        const firstRate = officer.rates[0];
        const serviceTypeKey = Object.entries(SERVICE_TYPES).find(
          ([key, value]) => value === firstRate.serviceType || key === firstRate.serviceType
        );
        
        const serviceType = serviceTypeKey ? serviceTypeKey[0] : firstRate.serviceType;
        setServiceType(serviceType);
        
        // Add service rate and travel costs as line items
        const baseRate = parseFloat(firstRate.baseRate.toString());
        const travelRate = firstRate.travelRatePerKm ? parseFloat(firstRate.travelRatePerKm.toString()) : 0;
        
        updateAutoLineItems(
          serviceType,
          baseRate,
          travelRate,
          officer ? `${officer.firstName} ${officer.lastName}` : 'Generic'
        );
      }
    } else if (genericRates.length > 0) {
      // Generic services selected, set default to first generic rate
      const firstRate = genericRates[0];
      setServiceType(firstRate.serviceType);
      
      // Add service rate and travel costs as line items for generic service
      const baseRate = parseFloat(firstRate.baseRate.toString());
      const travelRate = firstRate.travelRatePerKm ? parseFloat(firstRate.travelRatePerKm.toString()) : 0;
      
      updateAutoLineItems(
        firstRate.serviceType,
        baseRate,
        travelRate,
        'Generic'
      );
    }
  };

  const handleServiceTypeSelect = (type: string) => {
    setServiceType(type);
    
    // Check if we're creating a replacement invoice
    const isReplacementInvoice = router.query.invoiceId && typeof router.query.invoiceId === 'string' && !editMode;
    
    // For replacement invoices, we want to keep the service type selection without auto-generating line items
    // but we still need to handle officer rates if an officer is selected
    if (isReplacementInvoice) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Replacement invoice workflow: Service type selected: ${type}, selectedOfficer: ${selectedOfficer}`);
      }
      
      // Even for replacement invoices, we need to ensure the officer rates are properly applied
      // when the service type changes, but we don't want to auto-generate line items
      if (selectedOfficer) {
        const officer = officers.find(o => o.id === selectedOfficer);
        if (officer) {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`Replacement invoice: Using officer ${officer.firstName} ${officer.lastName} with service type ${type}`);
          }
          // Don't return early - we want to continue with the normal flow but skip line item generation
        }
      }
    }
    
    if (selectedOfficer) {
      // Officer is selected
      const officer = officers.find(o => o.id === selectedOfficer);
      if (officer) {
        const serviceTypeValue = SERVICE_TYPES[type as keyof typeof SERVICE_TYPES];
        
        // Look for the rate with matching service type
        const rate = officer.rates.find(
          r => r.serviceType === type || r.serviceType === serviceTypeValue
        );
        
        if (rate) {
          const baseRate = parseFloat(rate.baseRate.toString());
          const travelRate = rate.travelRatePerKm ? parseFloat(rate.travelRatePerKm.toString()) : 0;
          
          // Check if we're creating a replacement invoice
          const isReplacementInvoice = router.query.invoiceId && typeof router.query.invoiceId === 'string' && !editMode;
          
          if (!isReplacementInvoice) {
            // Only auto-generate line items for new invoices, not replacements
            updateAutoLineItems(
              type, 
              baseRate, 
              travelRate, 
              officer ? `${officer.firstName} ${officer.lastName}` : 'Generic'
            );
          } else if (process.env.NODE_ENV !== 'production') {
            console.log(`Skipping auto line items for replacement invoice with officer ${officer.firstName} ${officer.lastName}`);
          }
          
          return;
        }
      }
    } else {
      // Generic service is selected
      const genericRate = genericRates.find(r => r.serviceType === type);
      
      if (genericRate) {
        const baseRate = parseFloat(genericRate.baseRate.toString());
        const travelRate = genericRate.travelRatePerKm ? parseFloat(genericRate.travelRatePerKm.toString()) : 0;
        
        // Check if we're creating a replacement invoice
        const isReplacementInvoice = router.query.invoiceId && typeof router.query.invoiceId === 'string' && !editMode;
        
        if (!isReplacementInvoice) {
          // Only auto-generate line items for new invoices, not replacements
          updateAutoLineItems(type, baseRate, travelRate, 'Generic');
        } else if (process.env.NODE_ENV !== 'production') {
          console.log(`Skipping auto line items for replacement invoice with Generic service provider`);
        }
        
        return;
      }
    }
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        description: "New Item",
        quantity: 1,
        unitPrice: 0
      }
    ]);
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updatedItems = [...lineItems];
    
    if (field === 'quantity' || field === 'unitPrice') {
      updatedItems[index][field] = typeof value === 'string' ? parseFloat(value) || 0 : value;
    } else if (field === 'description') {
      updatedItems[index][field] = value as string;
    }
    
    setLineItems(updatedItems);
  };
  
  // Function to automatically add service rate and travel costs as line items
  const updateAutoLineItems = (serviceTypeKey: string, baseRate: number, travelRate: number, providerName: string) => {
    // Format service type for display
    const serviceTypeDisplay = SERVICE_TYPES[serviceTypeKey as keyof typeof SERVICE_TYPES] || formatServiceType(serviceTypeKey);
    
    // Create new line items array starting with auto-generated items
    const newLineItems: LineItem[] = [];
    
    // Add service rate as a line item
    if (baseRate > 0) {
      newLineItems.push({
        description: `${serviceTypeDisplay} - ${providerName}`,
        quantity: 1,
        unitPrice: baseRate
      });
    }
    
    // Add travel costs as a line item if applicable
    if (travelRate > 0) {
      newLineItems.push({
        description: `Travel costs`,
        quantity: 1,
        unitPrice: travelRate
      });
    }
    
    // Keep any existing custom line items that aren't auto-generated
    // We'll identify auto-generated items by their description patterns
    const customLineItems = lineItems.filter(item => {
      // Check if this is a service type line item (contains any service type name)
      const isServiceTypeItem = Object.values(SERVICE_TYPES).some(type => 
        item.description.includes(type)
      ) || item.description.includes(providerName);
      
      // Check if this is a travel costs line item
      const isTravelItem = item.description.toLowerCase().includes('travel');
      
      // Keep items that are neither service type nor travel items
      return !isServiceTypeItem && !isTravelItem;
    });
    
    // Set the new line items array
    setLineItems([...newLineItems, ...customLineItems]);
  };

  const removeLineItem = (index: number) => {
    // Get the item to be removed
    const itemToRemove = lineItems[index];
    
    // Create a copy of the line items array
    const updatedItems = [...lineItems];
    
    // Remove the item at the specified index
    updatedItems.splice(index, 1);
    
    // Set the updated line items
    setLineItems(updatedItems);
    
    // If we're in edit mode and the item has an ID, track it for deletion
    if (editMode && itemToRemove.id) {
      setDeletedLineItemIds(prev => [...prev, itemToRemove.id as string]);
    }
  };

  const calculateTotal = () => {
    const lineItemsTotal = lineItems.reduce((total, item) => {
      return total + (item.quantity * item.unitPrice);
    }, 0);
    
    return lineItemsTotal;
  };

  const handleCreateInvoice = async (sendAfterCreate = false) => {
    if (!selectedBooking) {
      toast.error("Please select a booking first");
      return;
    }

    try {
      // Set loading state based on whether we're sending after create
      if (sendAfterCreate) {
        setIsSending(true);
      } else {
        setIsLoading(true);
      }

      // Log current values for debugging
      if (process.env.NODE_ENV !== 'production') {
        console.log("Current values before invoice creation:", {
          bookingDate: bookingDate ? bookingDate.toISOString() : null,
          originalDate: selectedBooking.date,
          bookingTime,
          originalTime: selectedBooking.time,
          bookingLocation,
          originalLocation: selectedBooking.location
        });
      }

      // Check if any booking details have changed
      const bookingNeedsUpdate = 
        (bookingDate && new Date(selectedBooking.date).toISOString().split('T')[0] !== bookingDate.toISOString().split('T')[0]) ||
        (bookingTime && selectedBooking.time !== bookingTime) ||
        (bookingLocation && selectedBooking.location !== bookingLocation);

      // Update booking if needed
      if (bookingNeedsUpdate) {
        if (process.env.NODE_ENV !== 'production') {
          console.log("Updating booking with new date, time, or location");
        }
        try {
          // Only include fields that have actually changed
          const updateData: Record<string, any> = {};
          
          if (bookingDate && new Date(selectedBooking.date).toISOString().split('T')[0] !== bookingDate.toISOString().split('T')[0]) {
            updateData.date = bookingDate.toISOString();
            if (process.env.NODE_ENV !== 'production') {
              console.log("Date changed from", new Date(selectedBooking.date).toISOString(), "to", bookingDate.toISOString());
            }
          }
          
          if (bookingTime && selectedBooking.time !== bookingTime) {
            updateData.time = bookingTime;
            if (process.env.NODE_ENV !== 'production') {
              console.log("Time changed from", selectedBooking.time, "to", bookingTime);
            }
          }
          
          if (bookingLocation && selectedBooking.location !== bookingLocation) {
            updateData.location = bookingLocation;
            if (process.env.NODE_ENV !== 'production') {
              console.log("Location changed from", selectedBooking.location, "to", bookingLocation);
            }
          }
          
          if (process.env.NODE_ENV !== 'production') {
            console.log("Booking update data:", updateData);
          }
          
          if (Object.keys(updateData).length > 0) {
            try {
              if (process.env.NODE_ENV !== 'production') {
                console.log(`Updating booking ${selectedBooking.id} with data:`, updateData);
              }
              
              // Create a new endpoint for updating booking details specifically for invoices
              const bookingUpdateResponse = await fetch(`/api/bookings/${selectedBooking.id}/invoice`, {
                method: "POST", // Using POST instead of PUT to avoid method not allowed issues
                headers: {
                  "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify(updateData),
              });

              if (!bookingUpdateResponse.ok) {
                const errorData = await bookingUpdateResponse.json().catch(() => ({}));
                console.error("Failed to update booking details:", bookingUpdateResponse.status, errorData);
                // Show error but continue with invoice creation
                toast.error("Failed to update booking details. Continuing with invoice creation.");
              } else {
                if (process.env.NODE_ENV !== 'production') {
                  console.log("Booking updated successfully");
                }
                toast.success("Booking details updated successfully");
                // Update the selected booking with the new values to keep UI in sync
                setSelectedBooking({
                  ...selectedBooking,
                  ...updateData,
                  // Ensure date is properly formatted if it was updated
                  date: updateData.date || selectedBooking.date
                });
              }
            } catch (updateError) {
              console.error("Error updating booking:", updateError);
              toast.error("Error updating booking details. Continuing with invoice creation.");
            }
          }
        } catch (error) {
          console.error("Error updating booking:", error);
          toast.error("Error updating booking details. Continuing with invoice creation.");
        }
      }

      // Check if we're creating a replacement invoice
      const isReplacementInvoice = router.query.invoiceId && typeof router.query.invoiceId === 'string' && !editMode;

      // Validate required fields for invoice creation
      if (!selectedOfficer && !isReplacementInvoice) {
        toast.error("Please select a service provider");
        return;
      }

      if (!serviceType && !isReplacementInvoice) {
        toast.error("Please select a service type");
        return;
      }

      // Prepare invoice data
      const invoiceData: any = {
        bookingId: selectedBooking.id,
        serviceType,
        officerId: selectedOfficer,
        lineItems: lineItems.map(item => ({
          id: item.id, // Include ID for existing items
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        }))
      };
      
      // If we're creating a replacement invoice, add the original invoice ID
      if (isReplacementInvoice) {
        invoiceData.originalInvoiceId = router.query.invoiceId;
        if (process.env.NODE_ENV !== 'production') {
          console.log("Creating replacement invoice for original invoice ID:", invoiceData.originalInvoiceId);
        }
      }
      
      // Check if an invoice already exists for this booking
      if (!editMode && !existingInvoiceId && !isReplacementInvoice) {
        try {
          if (process.env.NODE_ENV !== 'production') {
            console.log("Checking if invoice already exists for booking:", selectedBooking.id);
          }
          
          // Use the invoices endpoint to check for active invoices
          const checkResponse = await fetch(`/api/bookings/${selectedBooking.id}/invoices`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          });
          
          if (!checkResponse.ok) {
            throw new Error(`Failed to check for existing invoices: ${checkResponse.status}`);
          }
          
          const invoicesData = await checkResponse.json();
          console.log('Checking for active invoices:', invoicesData);
          const activeInvoices = invoicesData.filter((invoice: any) => invoice.status !== 'voided');
          
          if (activeInvoices.length > 0) {
            // If there's an active invoice, show a warning and stop the creation process
            toast.error("This booking already has an active invoice. You cannot create another invoice until the existing one is voided.");
            return;
          }
        } catch (error) {
          if (process.env.NODE_ENV !== 'production') {
            console.log("Error checking for existing invoice:", error);
          }
          toast.error("Failed to check for existing invoices. Please try again.");
          return;
        }
      }
      
      // If we're in edit mode, add the deleted items with _delete flag
      if (editMode) {
        // Add deleted items to the lineItems array with _delete flag
        if (deletedLineItemIds.length > 0) {
          // Create a new array with the proper type structure
          const finalLineItems = [...invoiceData.lineItems];
          
          for (const id of deletedLineItemIds) {
            // Add a special property that the API will recognize as a deletion marker
            // Using as any to bypass TypeScript's type checking for this specific case
            finalLineItems.push({
              id,
              description: '',
              quantity: 0,
              unitPrice: 0,
              _delete: true
            } as any);
          }
          
          // Replace the lineItems array with our new one
          invoiceData.lineItems = finalLineItems;
        }
      }
      
      if (process.env.NODE_ENV !== 'production') {
        console.log("Creating invoice with data:", JSON.stringify(invoiceData));
      }
      
      let response;
      let createdInvoice;
      
      if (editMode && existingInvoiceId) {
        // Update existing invoice
        response = await fetch(`/api/invoices/${existingInvoiceId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(invoiceData),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error("Invoice update failed:", response.status, errorData);
          throw new Error(errorData.error || "Failed to update invoice");
        }
        
        createdInvoice = await response.json();
        toast.success("Invoice updated successfully");
        setDeletedLineItemIds([]); // Clear the deleted line items array after successful update
        
      } else {
        // Create new invoice
        response = await fetch("/api/invoices", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(invoiceData),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error("Invoice creation failed:", response.status, errorData);
          throw new Error(errorData.error || "Failed to create invoice");
        }
        
        createdInvoice = await response.json();
        
        // Show appropriate success message
        if (isReplacementInvoice) {
          toast.success("Replacement invoice created successfully");
        } else {
          toast.success("Invoice created successfully");
        }
        
        // Set edit mode and existing invoice ID after creation
        setEditMode(true);
        setExistingInvoiceId(createdInvoice.id);
      }
      
      // If we need to send the invoice after creation/update
      if (sendAfterCreate && createdInvoice && createdInvoice.id) {
        try {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`Sending invoice with ID: ${createdInvoice.id}`);
          }
          const sendResponse = await fetch(`/api/invoices/${createdInvoice.id}/send`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          });
          
          if (!sendResponse.ok) {
            const errorData = await sendResponse.json();
            console.error("Failed to send invoice:", response.status, errorData);
            throw new Error(errorData.error || "Failed to send invoice");
          }
          
          toast.success("Invoice sent successfully");
          setSentSuccess(true);
        } catch (error) {
          console.error("Error sending invoice:", error);
          toast.error("Failed to send invoice. Please try again later.");
        }
      }
      
      // Redirect to invoice list page after successful creation/update
      if (!sendAfterCreate) {
        router.push("/dashboard/invoices");
      }
      
      return createdInvoice;
      
    } catch (error) {
      console.error("Error creating/updating invoice:", error);
      toast.error(error instanceof Error ? error.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
      setIsSending(false);
    }
  };

  if (!user) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="text-center">Please log in to create invoices</div>
      </div>
    );
  }

  // Check if we're creating a replacement invoice
  const isReplacementInvoice = router.query.invoiceId && typeof router.query.invoiceId === 'string' && !editMode;
  
  // Log the replacement invoice status for debugging
  if (process.env.NODE_ENV !== 'production' && isReplacementInvoice) {
    console.log("Replacement invoice workflow active:", {
      invoiceId: router.query.invoiceId,
      editMode,
      selectedOfficer,
      serviceType
    });
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          {editMode 
            ? "Edit Invoice" 
            : isReplacementInvoice 
              ? "Create Replacement Invoice" 
              : "Create Invoice"}
        </h2>
        <Button onClick={() => router.push("/dashboard/invoices")}>
          Back to Invoices
        </Button>
      </div>
      
      <Tabs defaultValue="existing" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="existing">For Existing Booking</TabsTrigger>
          <TabsTrigger value="new" disabled>For New Booking (Coming Soon)</TabsTrigger>
        </TabsList>
        
        <TabsContent value="existing">
          <Card>
            <CardHeader>
              <CardTitle>Create Invoice for Existing Booking</CardTitle>
              <CardDescription>
                Select a booking and configure the invoice details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1: Booking Information */}
              <div className="space-y-4">
                {!editMode && !creatingFromBooking ? (
                  // Only show booking selection when creating a new invoice from scratch
                  <>
                    <h3 className="text-lg font-medium">Step 1: Select Booking</h3>
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="booking">Select Booking</Label>
                        <Select 
                          value={selectedBooking ? selectedBooking.id : ""}
                          onValueChange={(value) => handleBookingSelect(value)}
                          disabled={isLoadingBookingDetails}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a booking" />
                          </SelectTrigger>
                          <SelectContent>
                            {loadingBookings ? (
                              <SelectItem value="loading" disabled>
                                Loading bookings...
                              </SelectItem>
                            ) : bookings.length === 0 ? (
                              <SelectItem value="none" disabled>
                                No bookings available without invoices
                              </SelectItem>
                            ) : (
                              bookings.map((booking) => (
                                <SelectItem key={booking.id} value={booking.id}>
                                  {booking.name} - {new Date(booking.date).toLocaleDateString()}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                ) : (
                  // Show booking information header when editing an invoice or creating from a booking
                  <h3 className="text-lg font-medium">Step 1: Booking Information</h3>
                )}
                
                {isLoadingBookingDetails ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2">Loading booking details...</span>
                  </div>
                ) : selectedBooking ? (
                  <div className="rounded-md border p-4">
                    <h3 className="font-medium">Booking Details</h3>
                    <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                      <div>
                        <span className="text-sm font-medium">Client:</span>
                        <p>{selectedBooking.name}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Email:</span>
                        <p>{selectedBooking.email}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Phone:</span>
                        <p>{selectedBooking.phone}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Date:</span>
                        <p>{new Date(selectedBooking.date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Time:</span>
                        <p>{selectedBooking.time}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Location:</span>
                        <p>{selectedBooking.location}</p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
              
              {/* Step 2: Configure Service */}
              {selectedBooking && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Step 2: Configure Service</h3>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label>Service Provider</Label>
                      <Select
                        onValueChange={handleOfficerSelect}
                        value={selectedOfficer || "generic"}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a service provider" />
                        </SelectTrigger>
                        <SelectContent>
                          {/* Generic Services Option */}
                          <SelectItem value="generic">
                            Generic Services
                          </SelectItem>
                          
                          {/* Divider */}
                          <div className="px-2 py-1.5 text-xs text-muted-foreground border-t">
                            Marriage Officers
                          </div>
                          
                          {/* Officers List */}
                          {loadingOfficers ? (
                            <SelectItem value="loading" disabled>
                              Loading officers...
                            </SelectItem>
                          ) : officers.length === 0 ? (
                            <SelectItem value="none" disabled>
                              No officers available
                            </SelectItem>
                          ) : (
                            officers.map((officer) => (
                              <SelectItem key={officer.id} value={officer.id}>
                                {officer.title ? `${officer.title} ` : ''}
                                {officer.firstName} {officer.lastName}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label>Service Type</Label>
                      <Select
                        value={serviceType}
                        onValueChange={handleServiceTypeSelect}
                        disabled={!selectedOfficer && genericRates.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a service type" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedOfficer ? (
                            (() => {
                              const officer = officers.find(o => o.id === selectedOfficer);
                              if (!officer || officer.rates.length === 0) {
                                return (
                                  <SelectItem value="none" disabled>
                                    No service types available for this officer
                                  </SelectItem>
                                );
                              }
                              
                              // Get unique service types from the officer's rates
                              const officerServiceTypes = officer.rates.map(rate => rate.serviceType);
                              
                              if (officerServiceTypes.length === 0) {
                                return (
                                  <SelectItem value="none" disabled>
                                    No service types available for this officer
                                  </SelectItem>
                                );
                              }
                              
                              // Map service types to their display names
                              return officerServiceTypes.map(serviceType => {
                                // Try to find a matching key in SERVICE_TYPES
                                const matchingKey = Object.entries(SERVICE_TYPES).find(
                                  ([key, value]) => value === serviceType || key === serviceType
                                );
                                
                                // For debugging
                                if (process.env.NODE_ENV !== 'production') {
                                  console.log(`Processing service type: ${serviceType}`, {
                                    matchingKey,
                                    isInServiceTypes: !!matchingKey 
                                  });
                                }
                                
                                const displayValue = matchingKey 
                                  ? matchingKey[1] // Use the display name from SERVICE_TYPES
                                  : formatServiceType(serviceType); // Format custom service type
                                  
                                const valueToUse = matchingKey 
                                  ? matchingKey[0] // Use the key from SERVICE_TYPES
                                  : serviceType; // Use the custom service type as is
                                  
                                return (
                                  <SelectItem key={valueToUse} value={valueToUse}>
                                    {displayValue}
                                  </SelectItem>
                                );
                              });
                            })()
                          ) : (
                            // Generic services - show all generic service rates
                            loadingGenericRates ? (
                              <SelectItem value="loading" disabled>
                                Loading generic services...
                              </SelectItem>
                            ) : genericRates.length === 0 ? (
                              <SelectItem value="none" disabled>
                                No generic services available
                              </SelectItem>
                            ) : (
                              genericRates.map(rate => (
                                <SelectItem key={rate.serviceType} value={rate.serviceType}>
                                  {formatServiceType(rate.serviceType)}
                                </SelectItem>
                              ))
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label>Date and Time</Label>
                        <DateTimePicker
                          date={(() => {
                            // Create a date object from the booking date and time
                            if (!bookingDate) return undefined;
                            
                            const dateObj = new Date(bookingDate);
                            
                            // If we have a time string, parse it and set the hours and minutes
                            if (bookingTime) {
                              const [hours, minutes] = bookingTime.split(':').map(Number);
                              dateObj.setHours(hours, minutes, 0, 0);
                            }
                            
                            return dateObj;
                          })()}
                          setDate={(newDate) => {
                            if (newDate) {
                              // Update the booking date
                              setBookingDate(new Date(newDate));
                              
                              // Format the time as HH:MM for the bookingTime state
                              const hours = newDate.getHours().toString().padStart(2, '0');
                              const minutes = newDate.getMinutes().toString().padStart(2, '0');
                              const formattedTime = `${hours}:${minutes}`;
                              
                              if (process.env.NODE_ENV !== 'production') {
                                console.log("Date and time changed to:", newDate, formattedTime);
                              }
                              
                              setBookingTime(formattedTime);
                            } else {
                              setBookingDate(null);
                              setBookingTime('');
                            }
                          }}
                          excludeTime={false}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Location</Label>
                        <Select value={bookingLocation} onValueChange={(e) => {
                          if (process.env.NODE_ENV !== 'production') {
                            console.log("Location changed to:", e);
                          }
                          setBookingLocation(e);
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a location" />
                          </SelectTrigger>
                          <SelectContent>
                            {locations.map((location) => (
                              <SelectItem key={location.id} value={location.name}>
                                {location.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Removed hardcoded fields */}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Step 3: Line Items */}
              {selectedBooking && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Step 3: Line Items</h3>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={addLineItem}
                    >
                      Add Line Item
                    </Button>
                  </div>
                  
                  <div className="border rounded-md p-2">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Description</TableHead>
                          <TableHead className="w-20">Qty</TableHead>
                          <TableHead className="w-24">Unit Price</TableHead>
                          <TableHead className="w-24">Amount</TableHead>
                          <TableHead className="w-16">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lineItems.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                              No line items added. Click "Add Line Item" to add one.
                            </TableCell>
                          </TableRow>
                        ) : (
                          lineItems.map((item, index) => (
                            <TableRow key={`item-${index}`}>
                              <TableCell>
                                <Input
                                  value={item.description}
                                  onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.quantity}
                                  onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.unitPrice}
                                  onChange={(e) => updateLineItem(index, 'unitPrice', e.target.value)}
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                R{((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeLineItem(index)}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 6h18"></path>
                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                  </svg>
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
              
              {/* Summary and Create Button */}
              {selectedBooking && (
                <div className="space-y-4">
                  <div className="flex justify-between border-t pt-4">
                    <h3 className="text-lg font-medium">Total Amount:</h3>
                    <div className="text-lg font-bold">R{calculateTotal().toFixed(2)}</div>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button 
                      onClick={() => handleCreateInvoice(editMode ? true : false)}
                      disabled={!selectedBooking || !serviceType || isLoading || isSending}
                    >
                      {isLoading || isSending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {editMode 
                            ? (isSending ? "Updating & Sending..." : "Updating...") 
                            : isReplacementInvoice
                              ? (isSending ? "Creating Replacement & Sending..." : "Creating Replacement...")
                              : (isSending ? "Creating & Sending..." : "Creating...")}
                        </>
                      ) : (
                        <>
                          {editMode 
                            ? "Update and Send" 
                            : isReplacementInvoice
                              ? "Create Replacement Invoice"
                              : "Create Invoice"}
                          {sentSuccess && (
                            <span className="ml-2 text-green-600 font-bold">✓ Sent</span>
                          )}
                        </>
                      )}
                    </Button>
                    {!editMode && (
                      <Button 
                        variant="secondary"
                        onClick={() => handleCreateInvoice(true)}
                        disabled={!selectedBooking || !serviceType || isLoading || isSending}
                      >
                        {isSending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {isReplacementInvoice ? "Creating Replacement & Sending..." : "Creating & Sending..."}
                          </>
                        ) : (
                          isReplacementInvoice ? "Create and Send Replacement" : "Create and Send Invoice"
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="new">
          <Card>
            <CardHeader>
              <CardTitle>Create Invoice for New Booking</CardTitle>
              <CardDescription>
                This feature is coming soon
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p>This feature will allow you to create a new booking and invoice in one step.</p>
                <p className="text-muted-foreground">Coming soon!</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
