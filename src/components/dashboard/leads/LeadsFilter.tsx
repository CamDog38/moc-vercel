import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DateRangeFilter, { DateRange } from "@/components/DateRangeFilter";
import SearchFilter from "@/components/SearchFilter";
import { LeadFilters, LeadStatus } from "./types/types";

interface LeadsFilterProps {
  filters: LeadFilters;
  onFilterChange: (filters: LeadFilters) => void;
}

export function LeadsFilter({ filters, onFilterChange }: LeadsFilterProps) {
  const statusOptions: LeadStatus[] = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];
  
  // Local state for filters
  const [search, setSearch] = useState(filters.search || "");
  const [status, setStatus] = useState(filters.status || "all"); // Use 'all' instead of empty string
  const [dateRange, setDateRange] = useState<DateRange>(filters.dateRange || { from: undefined, to: undefined });

  // Handle search change
  const handleSearchChange = (value: string) => {
    setSearch(value);
    onFilterChange({ ...filters, search: value });
  };

  // Handle status change
  const handleStatusChange = (value: string) => {
    setStatus(value);
    // Only include status in filters if it's not 'all'
    onFilterChange({ 
      ...filters, 
      status: value === 'all' ? undefined : value 
    });
  };

  // Handle date range change
  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    // Convert DateRange to our filter format
    const filterDateRange = {
      from: range.from || null,
      to: range.to || null
    };
    onFilterChange({ ...filters, dateRange: filterDateRange });
  };

  // Clear all filters
  const clearFilters = () => {
    setSearch("");
    setStatus("all"); // Use 'all' instead of empty string
    setDateRange({ from: undefined, to: undefined });
    onFilterChange({});
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
        <div>
          <SearchFilter 
            onSearchChange={handleSearchChange} 
            placeholder="Search leads..." 
          />
        </div>
        <div>
          <Label htmlFor="status-filter" className="text-sm font-medium mb-1 block">Status</Label>
          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger id="status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statusOptions.map((statusOption) => (
                <SelectItem key={statusOption} value={statusOption}>
                  {statusOption.charAt(0).toUpperCase() + statusOption.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1">
          <DateRangeFilter
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
            label="Created Date"
          />
        </div>
        <div>
          <Button 
            variant="outline" 
            onClick={clearFilters}
            disabled={!search && !status && !dateRange.from && !dateRange.to}
          >
            Clear Filters
          </Button>
        </div>
      </div>
    </div>
  );
}
