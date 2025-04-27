import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DateRangeFilter, { DateRange } from "@/components/DateRangeFilter";
import SearchFilter from "@/components/SearchFilter";

export interface BookingsFilterProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onDateRangeChange: (range: { from: Date | undefined; to: Date | undefined }) => void;
  initialSearch?: string;
  initialDateRange?: { from: Date | undefined; to: Date | undefined };
}

export function BookingsFilter({
  activeTab,
  onTabChange,
  onSearchChange,
  onDateRangeChange,
  initialSearch = "",
  initialDateRange = { from: undefined, to: undefined }
}: BookingsFilterProps) {
  // Local state for filters
  const [search, setSearch] = useState(initialSearch);
  const [dateRange, setDateRange] = useState<DateRange>(initialDateRange);
  
  // Handle search change
  const handleSearchChange = (value: string) => {
    setSearch(value);
    onSearchChange(value);
  };
  
  // Handle date range change
  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    onDateRangeChange(range);
  };
  
  // Clear all filters
  const clearFilters = () => {
    setSearch("");
    setDateRange({ from: undefined, to: undefined });
    onSearchChange("");
    onDateRangeChange({ from: undefined, to: undefined });
  };
  

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
        <div>
          <SearchFilter 
            onSearchChange={handleSearchChange} 
            placeholder="Search bookings..."
          />
        </div>
        <div>
          <Tabs defaultValue={activeTab} value={activeTab} onValueChange={onTabChange} className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="upcoming" className="flex-1">Upcoming</TabsTrigger>
              <TabsTrigger value="past" className="flex-1">Past</TabsTrigger>
              <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1">
          <DateRangeFilter
            onDateRangeChange={handleDateRangeChange}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={clearFilters}
            disabled={!search && !dateRange.from && !dateRange.to}
          >
            Clear Filters
          </Button>
        </div>
      </div>
    </div>
  );
}
