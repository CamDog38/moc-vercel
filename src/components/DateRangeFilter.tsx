import React, { useState, useEffect } from 'react';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CalendarIcon, ChevronDownIcon } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { DateRange as DayPickerDateRange } from 'react-day-picker';

export type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

export type DateRangePreset = 'today' | '7days' | '30days' | 'custom' | 'alltime';

interface DateRangeFilterProps {
  onDateRangeChange: (range: DateRange) => void;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ onDateRangeChange }) => {
  const [date, setDate] = useState<DateRange>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date())
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [preset, setPreset] = useState<DateRangePreset>('today');

  // Apply preset date ranges
  const applyPreset = (newPreset: DateRangePreset) => {
    setPreset(newPreset);
    
    let newRange: DateRange = { from: undefined, to: undefined };
    
    switch (newPreset) {
      case 'today':
        newRange = {
          from: startOfDay(new Date()),
          to: endOfDay(new Date())
        };
        break;
      case '7days':
        newRange = {
          from: startOfDay(subDays(new Date(), 6)),
          to: endOfDay(new Date())
        };
        break;
      case '30days':
        newRange = {
          from: startOfDay(subDays(new Date(), 29)),
          to: endOfDay(new Date())
        };
        break;
      case 'alltime':
        // For all time, we set both dates to undefined
        // This will signal to the parent component that no date filtering should be applied
        newRange = {
          from: undefined,
          to: undefined
        };
        break;
      case 'custom':
        // Keep current range when switching to custom
        newRange = date;
        setIsCalendarOpen(true);
        break;
    }
    
    setDate(newRange);
    onDateRangeChange(newRange);
  };

  // Format the date range for display
  const formatDateRange = () => {
    if (!date.from) return 'Select date range';
    
    if (!date.to) {
      return format(date.from, 'PPP');
    }
    
    return `${format(date.from, 'PPP')} - ${format(date.to, 'PPP')}`;
  };

  // Get the display name for the current preset
  const getPresetDisplayName = () => {
    switch (preset) {
      case 'today': return 'Today';
      case '7days': return 'Last 7 Days';
      case '30days': return 'Last 30 Days';
      case 'alltime': return 'All time';
      case 'custom': return 'Custom';
      default: return 'Select date range';
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            {getPresetDisplayName()}
            <ChevronDownIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => applyPreset('today')}>
            Today
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => applyPreset('7days')}>
            Last 7 Days
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => applyPreset('30days')}>
            Last 30 Days
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => applyPreset('alltime')}>
            All time
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => applyPreset('custom')}>
            Custom
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal",
              !date.from && "text-muted-foreground"
            )}
            onClick={() => {
              setPreset('custom');
              setIsCalendarOpen(true);
            }}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex flex-col">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date.from}
              selected={date}
              onSelect={(newDate: DayPickerDateRange | undefined) => {
                if (newDate) {
                  // Convert from DayPickerDateRange to our DateRange type
                  const ourDateRange: DateRange = {
                    from: newDate.from,
                    to: newDate.to || undefined
                  };
                  setDate(ourDateRange);
                  onDateRangeChange(ourDateRange);
                  // Keep the calendar open even after both dates are selected
                  // This allows users to easily adjust their selection
                }
              }}
              numberOfMonths={1}
            />
            <div className="p-3 border-t flex justify-end">
              <Button 
                size="sm" 
                onClick={() => setIsCalendarOpen(false)}
                disabled={!date.from || !date.to}
              >
                Done
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DateRangeFilter;