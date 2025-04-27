import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { Lead, LeadFilters, LeadStatus } from "@/components/dashboard/leads/types/types";
import { LeadsTable } from "@/components/dashboard/leads/LeadsTable";
import { LeadsFilter } from "@/components/dashboard/leads/LeadsFilter";
import { LeadDetailsDialog } from "@/components/dashboard/leads/LeadDetailsDialog";
import { BookingLinkDialog, BookingLinkLoadingDialog } from "@/components/dashboard/leads/BookingLinkDialog";
import { BookingFormsDialog } from "@/components/dashboard/leads/BookingFormsDialog";
import * as leadsService from "@/components/dashboard/leads/services/leadsService";

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [detailedLead, setDetailedLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingLink, setBookingLink] = useState<string | null>(null);
  const [bookingLinkLoading, setBookingLinkLoading] = useState(false);
  const [bookingFormsOpen, setBookingFormsOpen] = useState(false);
  const [bookingForms, setBookingForms] = useState<any[]>([]);
  const [selectedForm, setSelectedForm] = useState<string>("");
  const [bookingFormsLoading, setBookingFormsLoading] = useState(false);
  const [selectedLeadForBooking, setSelectedLeadForBooking] = useState<Lead | null>(null);
  const [filters, setFilters] = useState<LeadFilters>({});
  const { user } = useAuth();

  // Fetch leads on component mount
  useEffect(() => {
    if (user) {
      fetchLeads();
    }
  }, [user]);

  // Apply filters when leads or filters change
  useEffect(() => {
    applyFilters();
  }, [leads, filters]);

  // Fetch lead details when selected lead changes
  useEffect(() => {
    if (selectedLead) {
      fetchLeadDetails(selectedLead.id);
    }
  }, [selectedLead]);

  // Function to fetch leads
  const fetchLeads = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await leadsService.fetchLeads();
      setLeads(data);
    } catch (err: any) {
      setError(err.message || "An error occurred fetching leads");
      toast({
        title: "Error",
        description: err.message || "Failed to fetch leads",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch lead details
  const fetchLeadDetails = async (leadId: string) => {
    try {
      // First fetch minimal data for faster initial loading
      const minimalData = await leadsService.fetchLeadDetails(leadId, true);
      setDetailedLead(minimalData);
      
      // Then fetch full data in the background
      const fullData = await leadsService.fetchLeadDetails(leadId, false);
      setDetailedLead(fullData);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to fetch lead details",
        variant: "destructive",
      });
    }
  };

  // Function to fetch booking forms
  const fetchBookingForms = async () => {
    setBookingFormsLoading(true);
    try {
      const data = await leadsService.fetchBookingForms();
      setBookingForms(data);
      if (data.length > 0) {
        setSelectedForm(data[0].id);
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to fetch booking forms",
        variant: "destructive",
      });
    } finally {
      setBookingFormsLoading(false);
    }
  };

  // Function to open booking forms dialog
  const openBookingFormsDialog = (lead: Lead) => {
    setSelectedLeadForBooking(lead);
    fetchBookingForms();
    setBookingFormsOpen(true);
  };

  // Function to generate a booking link with selected form
  const generateBookingLinkWithForm = async () => {
    if (!selectedLeadForBooking || !selectedForm) return;
    
    setBookingFormsOpen(false);
    setBookingLinkLoading(true);
    
    try {
      const link = await leadsService.generateBookingLinkWithForm(
        selectedLeadForBooking.id,
        selectedForm
      );
      setBookingLink(link);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to generate booking link",
        variant: "destructive",
      });
    } finally {
      setBookingLinkLoading(false);
    }
  };

  // Function to generate a booking link (legacy)
  const generateBookingLink = async (lead: Lead) => {
    setBookingLinkLoading(true);
    try {
      const link = await leadsService.generateBookingLink(lead);
      setBookingLink(link);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to generate booking link",
        variant: "destructive",
      });
    } finally {
      setBookingLinkLoading(false);
    }
  };

  // Function to update lead status
  const updateLeadStatus = async (leadId: string, status: LeadStatus) => {
    try {
      await leadsService.updateLeadStatus(leadId, status);
      // Refresh the leads list
      fetchLeads();
      toast({
        title: "Success",
        description: "Lead status updated successfully",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update lead status",
        variant: "destructive",
      });
    }
  };

  // Function to apply filters
  const applyFilters = () => {
    let result = [...leads];
    
    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(lead => 
        (lead.name && lead.name.toLowerCase().includes(searchLower)) ||
        (lead.email && lead.email.toLowerCase().includes(searchLower)) ||
        (lead.phone && lead.phone.toLowerCase().includes(searchLower)) ||
        (lead.formName && lead.formName.toLowerCase().includes(searchLower)) ||
        (lead.form?.name && lead.form.name.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply status filter
    if (filters.status) {
      result = result.filter(lead => lead.status === filters.status);
    }
    
    // Apply date range filter
    if (filters.dateRange?.from || filters.dateRange?.to) {
      result = result.filter(lead => {
        const createdDate = new Date(lead.createdAt);
        
        // Set the time to the end of the day for the 'to' date for inclusive filtering
        const toDate = filters.dateRange?.to ? new Date(filters.dateRange.to) : null;
        if (toDate) {
          toDate.setHours(23, 59, 59, 999);
        }
        
        if (filters.dateRange?.from && toDate) {
          return createdDate >= filters.dateRange.from && createdDate <= toDate;
        } else if (filters.dateRange?.from) {
          return createdDate >= filters.dateRange.from;
        } else if (toDate) {
          return createdDate <= toDate;
        }
        
        return true;
      });
    }
    
    setFilteredLeads(result);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Leads</h1>
      </div>
      
      {/* Filters */}
      <LeadsFilter 
        filters={filters} 
        onFilterChange={setFilters} 
      />
      
      {/* Leads Table */}
      <LeadsTable 
        leads={filteredLeads}
        loading={loading}
        onViewDetails={setSelectedLead}
        onGenerateBookingLink={generateBookingLink}
        onSelectBookingForm={openBookingFormsDialog}
        onUpdateStatus={updateLeadStatus}
      />
      
      {/* Lead Details Dialog */}
      <LeadDetailsDialog 
        open={!!selectedLead}
        onOpenChange={(open) => !open && setSelectedLead(null)}
        detailedLead={detailedLead}
      />
      
      {/* Booking Link Dialog */}
      <BookingLinkDialog 
        bookingLink={bookingLink}
        setBookingLink={setBookingLink}
      />
      
      {/* Booking Link Loading Dialog */}
      <BookingLinkLoadingDialog
        open={bookingLinkLoading}
        setOpen={setBookingLinkLoading}
      />
      
      {/* Booking Forms Selection Dialog */}
      <BookingFormsDialog
        open={bookingFormsOpen}
        setOpen={setBookingFormsOpen}
        bookingForms={bookingForms}
        selectedForm={selectedForm}
        setSelectedForm={setSelectedForm}
        loading={bookingFormsLoading}
        onGenerateLink={generateBookingLinkWithForm}
      />
    </div>
  );
}
