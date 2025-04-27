import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { DEFAULT_SERVICE_TYPES } from '@/util/service-types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PartialPaymentDialog } from "@/components/invoice/PartialPaymentDialog";
import { formatCurrency } from "@/util/format";
import DateRangeFilter, { DateRange } from "@/components/DateRangeFilter";
import { Search } from "lucide-react";

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

type LineItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

type Payment = {
  id: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  lineItemId?: string | null;
  notes?: string | null;
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
  balanceDue?: number | null;
  paymentMethod?: string | null;
  paymentDate?: string | null;
  lineItems: LineItem[];
  payments?: Payment[];
};

export default function PaymentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("unpaid");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [officers, setOfficers] = useState<any[]>([]);
  const [selectedOfficerId, setSelectedOfficerId] = useState("all");

  const fetchInvoices = async () => {
    if (!user) {
      setError("Please log in to view invoices");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Build query parameters for date filtering
      let queryParams = "include=lineItems,payments";
      
      if (dateRange.from) {
        const fromDate = new Date(dateRange.from);
        queryParams += `&fromDate=${fromDate.toISOString()}`;
      }
      
      if (dateRange.to) {
        const toDate = new Date(dateRange.to);
        queryParams += `&toDate=${toDate.toISOString()}`;
      }
      
      const response = await fetch(`/api/invoices?${queryParams}`, {
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
      
      // Process invoices to ensure they have lineItems array and correct balance due
      const processedInvoices = data.map(invoice => {
        // Calculate total paid from payments if available
        const totalPaid = invoice.payments && invoice.payments.length > 0
          ? invoice.payments.reduce((sum: number, payment: Payment) => sum + Number(payment.amount), 0)
          : invoice.amountPaid || 0;
          
        return {
          ...invoice,
          lineItems: invoice.lineItems || [],
          amountPaid: totalPaid,
          balanceDue: invoice.totalAmount - totalPaid
        };
      });
      
      setAllInvoices(processedInvoices);
      setFilteredInvoices(processedInvoices);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      setLoading(false);
    }
  };
  
  const fetchOfficers = async () => {
    if (!user) return;
    
    try {
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
      console.error('Error fetching officers:', error);
      toast.error("Failed to load marriage officers");
    }
  };

  useEffect(() => {
    if (user) {
      fetchInvoices();
      fetchOfficers();
    }
  }, [user]);
  
  // Refetch invoices when date range changes
  useEffect(() => {
    if (user && (dateRange.from || dateRange.to)) {
      fetchInvoices();
    }
  }, [dateRange]);
  
  // Apply search and officer filters
  useEffect(() => {
    if (allInvoices.length > 0) {
      let filtered = [...allInvoices];
      
      // Apply search filter
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(invoice => {
          return (
            // Search by invoice number
            (invoice.invoiceNumber && invoice.invoiceNumber.toLowerCase().includes(query)) ||
            // Search by client name
            (invoice.booking.name && invoice.booking.name.toLowerCase().includes(query)) ||
            // Search by client email
            (invoice.booking.email && invoice.booking.email.toLowerCase().includes(query)) ||
            // Search by booking ID
            (invoice.booking.id && invoice.booking.id.toLowerCase().includes(query))
          );
        });
      }
      
      // Apply officer filter
      if (selectedOfficerId !== "all") {
        filtered = filtered.filter(invoice => invoice.officerId === selectedOfficerId);
      }
      
      setFilteredInvoices(filtered);
    }
  }, [searchQuery, selectedOfficerId, allInvoices]);

  // Handle payment completion
  const handlePaymentComplete = () => {
    fetchInvoices(); // Refresh the list
  };

  // Filter invoices based on payment status
  const unpaidInvoices = filteredInvoices.filter(invoice => 
    invoice.status !== "voided" && 
    (!invoice.amountPaid || Number(invoice.amountPaid) < invoice.totalAmount)
  );
  
  const partiallyPaidInvoices = filteredInvoices.filter(invoice => 
    invoice.status !== "voided" && 
    invoice.amountPaid && 
    Number(invoice.amountPaid) > 0 && 
    Number(invoice.amountPaid) < invoice.totalAmount
  );
  
  const paidInvoices = filteredInvoices.filter(invoice => 
    invoice.status !== "voided" && 
    invoice.amountPaid && 
    Number(invoice.amountPaid) >= invoice.totalAmount
  );

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Payments</h2>
      </div>
      
      <div className="flex items-center justify-between mb-6 bg-muted/40 p-4 rounded-lg">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative w-[300px]">
            <Label htmlFor="search" className="text-sm font-medium mb-1 block">Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search by client name, email, or invoice #"
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
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
            <Label className="text-sm font-medium mb-1 block">Filter by Payment Date</Label>
            <DateRangeFilter onDateRangeChange={setDateRange} />
          </div>
        </div>
      </div>
      
      <Tabs defaultValue="unpaid" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="unpaid">Unpaid Invoices</TabsTrigger>
          <TabsTrigger value="partially-paid">Partially Paid Invoices</TabsTrigger>
          <TabsTrigger value="paid">Paid Invoices</TabsTrigger>
        </TabsList>
        
        <TabsContent value="unpaid" className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Service Type</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Balance Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-red-500">{error}</TableCell>
                  </TableRow>
                ) : unpaidInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">No unpaid invoices found</TableCell>
                  </TableRow>
                ) : (
                  unpaidInvoices.map((invoice) => {
                    // Calculate balance due - should be total amount if no payments exist
                    const totalPaid = invoice.payments && invoice.payments.length > 0 
                      ? invoice.payments.reduce((sum: number, payment: Payment) => sum + Number(payment.amount), 0)
                      : (invoice.amountPaid ? Number(invoice.amountPaid) : 0);
                    
                    const balanceDue = invoice.totalAmount - totalPaid;
                    
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell>{invoice.invoiceNumber || invoice.id.substring(0, 8).toUpperCase()}</TableCell>
                        <TableCell>{new Date(invoice.booking.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{invoice.booking.name}</div>
                            <div className="text-sm text-muted-foreground">{invoice.booking.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>{formatServiceType(invoice.serviceType)}</TableCell>
                        <TableCell>{formatCurrency(invoice.totalAmount)}</TableCell>
                        <TableCell>
                          <span className={balanceDue < invoice.totalAmount ? "text-amber-500 font-medium" : ""}>
                            {formatCurrency(balanceDue)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              variant="default" 
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setIsPaymentDialogOpen(true);
                              }}
                            >
                              Collect Payment
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                window.open(`/invoices/${invoice.id}/view?admin=true`, '_blank');
                              }}
                              title="View HTML version"
                            >
                              View Invoice
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
        
        <TabsContent value="partially-paid" className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Service Type</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Balance Due</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-red-500">{error}</TableCell>
                  </TableRow>
                ) : partiallyPaidInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">No partially paid invoices found</TableCell>
                  </TableRow>
                ) : (
                  partiallyPaidInvoices.map((invoice) => {
                    const balanceDue = invoice.totalAmount - (invoice.amountPaid || 0);
                    const hasMultiplePayments = invoice.payments && invoice.payments.length > 1;
                    
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell>{invoice.invoiceNumber || invoice.id.substring(0, 8).toUpperCase()}</TableCell>
                        <TableCell>{new Date(invoice.booking.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{invoice.booking.name}</div>
                            <div className="text-sm text-muted-foreground">{invoice.booking.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>{formatServiceType(invoice.serviceType)}</TableCell>
                        <TableCell>{formatCurrency(invoice.totalAmount)}</TableCell>
                        <TableCell>
                          <div className="font-medium text-amber-600 dark:text-amber-500">
                            {formatCurrency(Number(invoice.amountPaid || 0))}
                          </div>
                          {hasMultiplePayments && (
                            <div className="text-xs text-muted-foreground">
                              {invoice.payments?.length} payments
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-amber-500 font-medium">
                            {formatCurrency(balanceDue)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              variant="default" 
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setIsPaymentDialogOpen(true);
                              }}
                            >
                              Complete Payment
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                window.open(`/invoices/${invoice.id}/view?admin=true`, '_blank');
                              }}
                              title="View HTML version"
                            >
                              View Invoice
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
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
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Amount Paid</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Last Payment</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-red-500">{error}</TableCell>
                  </TableRow>
                ) : paidInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">No paid invoices found</TableCell>
                  </TableRow>
                ) : (
                  paidInvoices.map((invoice) => {
                    const hasMultiplePayments = invoice.payments && invoice.payments.length > 1;
                    const lastPayment = invoice.payments && invoice.payments.length > 0 
                      ? invoice.payments.sort((a, b) => 
                          new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
                        )[0]
                      : null;
                    
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell>{invoice.invoiceNumber || invoice.id.substring(0, 8).toUpperCase()}</TableCell>
                        <TableCell>{new Date(invoice.booking.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{invoice.booking.name}</div>
                            <div className="text-sm text-muted-foreground">{invoice.booking.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(invoice.totalAmount)}</TableCell>
                        <TableCell>
                          <div>
                            {invoice.amountPaid && (
                              <div className="font-medium text-green-600 dark:text-green-500">
                                {formatCurrency(Number(invoice.amountPaid))}
                              </div>
                            )}
                            {hasMultiplePayments && (
                              <div className="text-xs text-muted-foreground">
                                {invoice.payments?.length} payments
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {lastPayment?.paymentMethod || invoice.paymentMethod || "N/A"}
                        </TableCell>
                        <TableCell>
                          {lastPayment?.paymentDate 
                            ? new Date(lastPayment.paymentDate).toLocaleDateString() + " " + 
                              new Date(lastPayment.paymentDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                            : invoice.paymentDate 
                              ? new Date(invoice.paymentDate).toLocaleDateString() + " " + 
                                new Date(invoice.paymentDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                              : "N/A"
                          }
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              window.open(`/invoices/${invoice.id}/view?admin=true`, '_blank');
                            }}
                            title="View HTML version"
                          >
                            View Invoice
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Partial Payment Dialog */}
      <PartialPaymentDialog
        invoice={selectedInvoice}
        open={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        onPaymentComplete={handlePaymentComplete}
      />
    </div>
  );
}