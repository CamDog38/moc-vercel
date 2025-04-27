import { useState } from "react";
import { formatDate } from "@/util/date-format";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Calendar, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Lead, LeadStatus } from "./types/types";

interface LeadsTableProps {
  leads: Lead[];
  loading: boolean;
  onViewDetails: (lead: Lead) => void;
  onGenerateBookingLink: (lead: Lead) => void;
  onSelectBookingForm: (lead: Lead) => void;
  onUpdateStatus: (leadId: string, status: LeadStatus) => void;
}

type SortField = 'status' | 'createdAt' | null;
type SortDirection = 'asc' | 'desc';

export function LeadsTable({
  leads,
  loading,
  onViewDetails,
  onGenerateBookingLink,
  onSelectBookingForm,
  onUpdateStatus
}: LeadsTableProps) {
  // Status options for the dropdown
  const statusOptions: LeadStatus[] = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
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
  
  // Sort the leads based on current sort field and direction
  const sortedLeads = [...leads].sort((a, b) => {
    if (!sortField) return 0;
    
    if (sortField === 'status') {
      const statusA = a.status?.toLowerCase() || '';
      const statusB = b.status?.toLowerCase() || '';
      return sortDirection === 'asc' 
        ? statusA.localeCompare(statusB)
        : statusB.localeCompare(statusA);
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
  const getStatusColor = (status: string | null | undefined) => {
    // Default to empty string if status is null or undefined
    const statusValue = status || '';
    switch (statusValue.toLowerCase()) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'contacted': return 'bg-purple-100 text-purple-800';
      case 'qualified': return 'bg-green-100 text-green-800';
      case 'proposal': return 'bg-yellow-100 text-yellow-800';
      case 'won': return 'bg-emerald-100 text-emerald-800';
      case 'lost': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-medium text-muted-foreground cursor-pointer" onClick={() => handleSort('status')}>
                <div className="flex items-center gap-1">
                  Status
                  {sortField === 'status' ? (
                    sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                  ) : (
                    <ArrowUpDown className="h-4 w-4" />
                  )}
                </div>
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-medium text-muted-foreground">Form</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-medium text-muted-foreground cursor-pointer" onClick={() => handleSort('createdAt')}>
                <div className="flex items-center gap-1">
                  Created
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
                <td colSpan={7} className="px-4 py-8 text-center">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">Loading leads...</div>
                </td>
              </tr>
            ) : sortedLeads.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center">
                  <div className="text-sm text-muted-foreground">No leads found</div>
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground">
                      Leads will appear here when users submit your forms.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              sortedLeads.map((lead) => (
                <tr key={lead.id} className="border-t hover:bg-muted/50">
                  <td className="px-4 py-3 text-sm">
                    <button 
                      className="text-left font-medium text-primary hover:underline focus:outline-none" 
                      onClick={() => onViewDetails(lead)}
                    >
                      {lead.name || "Unnamed Lead"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm">{lead.email || "-"}</td>
                  <td className="px-4 py-3 text-sm">{lead.phone || "-"}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(lead.status)}`}>
                      {lead.status ? lead.status.charAt(0).toUpperCase() + lead.status.slice(1) : 'Unknown'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{lead.formName || lead.form?.name || "-"}</td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    {formatDate(lead.createdAt, 'PP')}
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
                        <DropdownMenuItem onClick={() => onViewDetails(lead)}>
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                        {statusOptions.map((status) => (
                          <DropdownMenuItem 
                            key={status}
                            onClick={() => onUpdateStatus(lead.id, status)}
                            className={lead.status === status ? "bg-muted" : ""}
                          >
                            <div className={`mr-2 h-2 w-2 rounded-full ${getStatusColor(status)}`} />
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onSelectBookingForm(lead)}>
                          <Calendar className="mr-2 h-4 w-4" />
                          Create Booking
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
