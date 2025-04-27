import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { DEFAULT_SERVICE_TYPES } from '@/util/service-types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { debug, error as logError } from "@/util/logger";
import DateRangeFilter, { DateRange } from "@/components/DateRangeFilter";
import { MoreHorizontal, Eye, Edit, FileX, Copy } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { VoidInvoiceDialog } from "@/components/invoice/VoidInvoiceDialog";

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

type Invoice = {
  id: string;
  status: string;
  createdAt: string;
  booking: {
    id: string;
    date: string;
    time: string | null;
    location: string | null;
    name: string;
    email: string;
  };
  serviceType: string;
  serviceRate: number;
  travelCosts: number;
  totalAmount: number;
  officerId?: string | null;
  invoiceNumber?: string | null;
  amountPaid?: number | null;
  paymentMethod?: string | null;
  paymentDate?: string | null;
  voidReason?: string | null;
  voidComment?: string | null;
  voidedAt?: string | null;
  replacementInvoiceId?: string | null;
  originalInvoiceId?: string | null;
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

const SERVICE_TYPES = {
  REGISTRATION_OFFICE: "Registration at our offices",
  REGISTRATION_HOME: "Registration at your home",
  SMALL_CEREMONY: "Small ceremony",
  WEDDING_CEREMONY: "Wedding ceremony",
} as const;

export default function InvoicesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [officers, setOfficers] = useState<MarriageOfficer[]>([]);
  const [loadingOfficers, setLoadingOfficers] = useState(false);
  const [genericRates, setGenericRates] = useState<ServiceRate[]>([]);
  const [loadingGenericRates, setLoadingGenericRates] = useState(false);
  const [bookingDate, setBookingDate] = useState<Date | undefined>(undefined);
  const [bookingLocation, setBookingLocation] = useState<string>("");
  const [officeLocations, setOfficeLocations] = useState<{id: string, name: string, address: string}[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>("sent");
  const [selectedOfficerId, setSelectedOfficerId] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined
  });
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [invoiceToVoid, setInvoiceToVoid] = useState<string | null>(null);

  const fetchInvoices = async () => {
    if (!user) {
      setError("Please log in to view invoices");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Build URL with date range parameters if they exist
      let url = "/api/invoices";
      const params = new URLSearchParams();
      
      if (dateRange.from && dateRange.to) {
        params.append('fromDate', dateRange.from.toISOString());
        params.append('toDate', dateRange.to.toISOString());
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        cache: "no-store",
      });
      
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData?.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          console.error('Error parsing error response:', e);
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format');
      }
      
      setAllInvoices(data);
      setFilteredInvoices(data);
      setError(null);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load invoices";
      setError(errorMessage);
      toast.error(`Error fetching invoices: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchInvoices();
      fetchOfficers();
      fetchGenericRates();
      fetchLocations();
      fetchBookings();
    }
  }, [user]);
  
  // Refetch invoices when date range changes
  useEffect(() => {
    if (user && (dateRange.from || dateRange.to)) {
      fetchInvoices();
    }
  }, [dateRange]);
  
  // Apply filters when selectedOfficerId changes
  useEffect(() => {
    if (allInvoices.length > 0) {
      let filtered = [...allInvoices];
      
      // Apply officer filter if not "all"
      if (selectedOfficerId !== "all") {
        filtered = filtered.filter(invoice => invoice.officerId === selectedOfficerId);
      }
      
      setFilteredInvoices(filtered);
    }
  }, [selectedOfficerId, allInvoices]);

  const fetchOfficers = async () => {
    if (!user) return;
    
    try {
      setLoadingOfficers(true);
      const response = await fetch("/api/officers", {
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
      setOfficers(data);
    } catch (error) {
      console.error("Error fetching officers:", error);
      toast.error("Failed to load marriage officers");
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
        credentials: "same-origin",
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setGenericRates(data);
    } catch (error) {
      console.error("Error fetching generic rates:", error);
      toast.error("Failed to load generic service rates");
    } finally {
      setLoadingGenericRates(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/locations');
      const data = await response.json();
      if (response.ok) {
        setOfficeLocations(data);
      } else {
        console.error('Failed to fetch locations:', data.error);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const fetchBookings = async () => {
    if (bookings.length > 0) return; // Prevent duplicate fetch if bookings are already loaded
    
    try {
      setLoading(true);
      const response = await fetch("/api/bookings", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch bookings");
      }
      
      const data = await response.json();
      debug("Received bookings data:", data, "invoices");
      setBookings(data);
    } catch (error) {
      logError("Error fetching bookings", "invoices", error);
      toast.error("Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateInvoice = async (invoiceId: string, updates: any) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to update invoice");
      }
      
      toast.success("Invoice updated successfully");
      fetchInvoices();
    } catch (error) {
      console.error("Error updating invoice:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update invoice");
    }
  };

  const handleUpdateBooking = async (bookingId: string, updates: any) => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Refresh invoices to get updated data
      fetchInvoices();
      toast.success("Booking details updated successfully");
    } catch (error) {
      console.error("Error updating booking:", error);
      toast.error("Failed to update booking details");
    }
  };

  // Filter invoices based on active tab
  const sentInvoices = filteredInvoices.filter(invoice => invoice.status !== "paid" && invoice.status !== "voided");
  const paidInvoices = filteredInvoices.filter(invoice => invoice.status === "paid");
  const voidedInvoices = filteredInvoices.filter(invoice => invoice.status === "voided");

  if (!user) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="text-center">Please log in to view invoices</div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Invoices</h2>
        <Button onClick={() => router.push("/dashboard/invoices/create")}>
          Create Invoice
        </Button>
      </div>

      <div className="flex items-center justify-between mb-6 bg-muted/40 p-4 rounded-lg">
        <div className="flex items-center gap-4">
          <div>
            <Label htmlFor="officerFilter" className="text-sm font-medium mb-1 block">Filter by Marriage Officer</Label>
            <Select 
              value={selectedOfficerId} 
              onValueChange={setSelectedOfficerId}
            >
              <SelectTrigger id="officerFilter" className="w-[240px]">
                <SelectValue placeholder="All Marriage Officers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Marriage Officers</SelectItem>
                {officers.map((officer) => (
                  <SelectItem key={officer.id} value={officer.id}>
                    {officer.title ? `${officer.title} ` : ''}{officer.firstName} {officer.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-sm font-medium mb-1 block">Filter by Date</Label>
            <DateRangeFilter onDateRangeChange={setDateRange} />
          </div>
        </div>
      </div>

      <Tabs defaultValue="sent" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="sent">Sent Invoices</TabsTrigger>
          <TabsTrigger value="paid">Paid Invoices</TabsTrigger>
          <TabsTrigger value="voided">Voided Invoices</TabsTrigger>
        </TabsList>
        
        <TabsContent value="sent" className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Booking Ref</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead>Wedding Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Service Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Marriage Officer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center text-red-500">{error}</TableCell>
                  </TableRow>
                ) : sentInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center">No sent invoices found</TableCell>
                  </TableRow>
                ) : (
                  sentInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>{invoice.invoiceNumber || invoice.id.substring(0, 8).toUpperCase()}</TableCell>
                      <TableCell>
                        <div className="font-mono text-xs">{invoice.booking.id.substring(0, 8).toUpperCase()}</div>
                      </TableCell>
                      <TableCell>{new Date(invoice.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(invoice.booking.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{invoice.booking.name}</div>
                          <div className="text-sm text-muted-foreground">{invoice.booking.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{formatServiceType(invoice.serviceType)}</TableCell>
                      <TableCell>R{invoice.totalAmount.toFixed(2)}</TableCell>
                      <TableCell>
                        {invoice.officerId ? 
                          officers.find(o => o.id === invoice.officerId)
                            ? `${officers.find(o => o.id === invoice.officerId)?.firstName} ${officers.find(o => o.id === invoice.officerId)?.lastName}`
                            : "Unknown Officer"
                          : "No Officer Assigned"
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => {
                              window.open(`/invoices/${invoice.id}/view?admin=true`, '_blank');
                            }}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Invoice
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              router.push(`/dashboard/invoices/create?invoiceId=${invoice.id}`);
                            }}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Invoice
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => {
                                setInvoiceToVoid(invoice.id);
                                setVoidDialogOpen(true);
                              }}
                              className="text-destructive focus:text-destructive"
                            >
                              <FileX className="mr-2 h-4 w-4" />
                              Void Invoice
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
        
        <TabsContent value="paid" className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Booking Ref</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead>Wedding Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Service Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Marriage Officer</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center text-red-500">{error}</TableCell>
                  </TableRow>
                ) : paidInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center">No paid invoices found</TableCell>
                  </TableRow>
                ) : (
                  paidInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>{invoice.invoiceNumber || invoice.id.substring(0, 8).toUpperCase()}</TableCell>
                      <TableCell>
                        <div className="font-mono text-xs">{invoice.booking.id.substring(0, 8).toUpperCase()}</div>
                      </TableCell>
                      <TableCell>{new Date(invoice.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(invoice.booking.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{invoice.booking.name}</div>
                          <div className="text-sm text-muted-foreground">{invoice.booking.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{formatServiceType(invoice.serviceType)}</TableCell>
                      <TableCell>R{invoice.totalAmount.toFixed(2)}</TableCell>
                      <TableCell>
                        {invoice.officerId ? 
                          officers.find(o => o.id === invoice.officerId)
                            ? `${officers.find(o => o.id === invoice.officerId)?.firstName} ${officers.find(o => o.id === invoice.officerId)?.lastName}`
                            : "Unknown Officer"
                          : "No Officer Assigned"
                        }
                      </TableCell>
                      <TableCell>{invoice.paymentMethod || 'N/A'}</TableCell>
                      <TableCell>{invoice.paymentDate ? new Date(invoice.paymentDate).toLocaleDateString() : 'N/A'}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => {
                              window.open(`/invoices/${invoice.id}/view?admin=true`, '_blank');
                            }}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Invoice
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              router.push(`/dashboard/invoices/create?invoiceId=${invoice.id}`);
                            }}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Invoice
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
        
        <TabsContent value="voided" className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Booking Ref</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead>Wedding Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Service Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Marriage Officer</TableHead>
                  <TableHead>Void Reason</TableHead>
                  <TableHead>Voided At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center text-red-500">{error}</TableCell>
                  </TableRow>
                ) : voidedInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center">No voided invoices found</TableCell>
                  </TableRow>
                ) : (
                  voidedInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>{invoice.invoiceNumber || invoice.id.substring(0, 8).toUpperCase()}</TableCell>
                      <TableCell>
                        <div className="font-mono text-xs">{invoice.booking.id.substring(0, 8).toUpperCase()}</div>
                      </TableCell>
                      <TableCell>{new Date(invoice.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(invoice.booking.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{invoice.booking.name}</div>
                          <div className="text-sm text-muted-foreground">{invoice.booking.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{formatServiceType(invoice.serviceType)}</TableCell>
                      <TableCell>R{invoice.totalAmount.toFixed(2)}</TableCell>
                      <TableCell>
                        {invoice.officerId ? 
                          officers.find(o => o.id === invoice.officerId)
                            ? `${officers.find(o => o.id === invoice.officerId)?.firstName} ${officers.find(o => o.id === invoice.officerId)?.lastName}`
                            : "Unknown Officer"
                          : "No Officer Assigned"
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">
                          {invoice.voidReason || "Unknown"}
                        </Badge>
                        {invoice.voidComment && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {invoice.voidComment}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {invoice.voidedAt 
                          ? new Date(invoice.voidedAt).toLocaleDateString() + " " + 
                            new Date(invoice.voidedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                          : "N/A"
                        }
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => {
                              window.open(`/invoices/${invoice.id}/view?admin=true`, '_blank');
                            }}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Invoice
                            </DropdownMenuItem>
                            {!invoice.replacementInvoiceId && (
                              <DropdownMenuItem onClick={() => {
                                // Use the booking ID to create a completely fresh invoice
                                router.push(`/dashboard/invoices/create?bookingId=${invoice.booking.id}`);
                              }}>
                                <Copy className="mr-2 h-4 w-4" />
                                Create Replacement
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Void Invoice Dialog */}
      <VoidInvoiceDialog
        invoiceId={invoiceToVoid || ""}
        open={voidDialogOpen}
        onOpenChange={setVoidDialogOpen}
        onVoidComplete={() => {
          fetchInvoices();
          setInvoiceToVoid(null);
        }}
      />
    </div>
  );
}