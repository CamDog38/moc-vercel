import * as React from "react"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { format, getYear, setYear, setMonth } from "date-fns"
import { CalendarIcon, Clock } from "lucide-react"
import { Button } from "./button"

interface DateTimePickerProps {
  date: Date | undefined
  setDate: (date: Date | undefined) => void
  className?: string
  required?: boolean
  excludeTime?: boolean
  isDateOfBirth?: boolean
  showTimePicker?: boolean
}

export function DateTimePicker({
  date,
  setDate,
  className,
  required,
  excludeTime = false,
  isDateOfBirth = false,
  showTimePicker = false
}: DateTimePickerProps) {
  const [selectedDateTime, setSelectedDateTime] = React.useState<Date | undefined>(date);
  const [calendarDate, setCalendarDate] = React.useState<Date>(selectedDateTime || new Date());
  const [selectedHour, setSelectedHour] = React.useState<string>("");
  const [selectedMinute, setSelectedMinute] = React.useState<string>("");

  // Generate time options
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 30]; // 30-minute intervals

  // Update internal state when external date changes
  React.useEffect(() => {
    setSelectedDateTime(date);
    
    // Update time selectors when date changes
    if (date && !excludeTime) {
      const hours = date.getHours();
      const minutes = date.getMinutes();
      // Round minutes to nearest 30
      const roundedMinutes = minutes < 15 ? 0 : minutes < 45 ? 30 : 0;
      const adjustedHours = minutes >= 45 ? (hours + 1) % 24 : hours;
      
      setSelectedHour(adjustedHours.toString());
      setSelectedMinute(roundedMinutes.toString());
    }
  }, [date, excludeTime]);

  // Generate years array for the dropdown
  const currentYear = new Date().getFullYear()
  const startYear = isDateOfBirth ? currentYear - 100 : 1900
  const years = Array.from({ length: currentYear - startYear + 1 }, (_, i) => currentYear - i)

  // Generate months array
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  const handleDateSelect = (selected: Date | undefined) => {
    if (selected) {
      const newDate = new Date(selected);
      if (excludeTime) {
        // For date-only fields, set time to start of day
        newDate.setHours(0, 0, 0, 0);
      } else {
        // For date-time fields, preserve existing time or set to current time
        const currentHour = selectedHour ? parseInt(selectedHour, 10) : 0;
        const currentMinute = selectedMinute ? parseInt(selectedMinute, 10) : 0;
        newDate.setHours(currentHour, currentMinute, 0, 0);
      }
      setSelectedDateTime(newDate);
      setCalendarDate(newDate);
      setDate(newDate);
    } else {
      setSelectedDateTime(undefined);
      setDate(undefined);
    }
  };

  const handleTimeChange = (hour: string, minute: string) => {
    setSelectedHour(hour);
    setSelectedMinute(minute);
    
    if (selectedDateTime) {
      const newDateTime = new Date(selectedDateTime);
      newDateTime.setHours(parseInt(hour, 10), parseInt(minute, 10), 0, 0);
      setSelectedDateTime(newDateTime);
      setDate(newDateTime);
    }
  };

  const handleYearChange = (year: string) => {
    const newDate = setYear(calendarDate, parseInt(year));
    setCalendarDate(newDate);
  };

  const handleMonthChange = (monthName: string) => {
    const monthIndex = months.indexOf(monthName);
    const newDate = setMonth(calendarDate, monthIndex);
    setCalendarDate(newDate);
  };

  // Format hour for display
  const formatHour = (hour: number): string => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour} ${period}`;
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, excludeTime ? 'PPP' : 'PPP p') : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 border-b">
            <div className="flex justify-between">
              <Select
                value={months[calendarDate.getMonth()]}
                onValueChange={handleMonthChange}
              >
                <SelectTrigger className="w-[110px]">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month} value={month}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={getYear(calendarDate).toString()}
                onValueChange={handleYearChange}
              >
                <SelectTrigger className="w-[80px]">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Calendar
            mode="single"
            selected={selectedDateTime}
            onSelect={handleDateSelect}
            month={calendarDate}
            onMonthChange={setCalendarDate}
            disabled={isDateOfBirth ? { after: new Date() } : undefined}
          />
          
          {!excludeTime && (showTimePicker || !isDateOfBirth) && (
            <div className="p-3 border-t">
              <div className="space-y-3">
                <div className="flex items-center">
                  <Clock className="mr-2 h-4 w-4" />
                  <Label className="text-sm font-medium">Time</Label>
                </div>
                <div className="flex gap-2">
                  <Select
                    value={selectedHour}
                    onValueChange={(hour) => handleTimeChange(hour, selectedMinute || "0")}
                  >
                    <SelectTrigger className="w-[110px]">
                      <SelectValue placeholder="Hour" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {hours.map((hour) => (
                        <SelectItem key={hour} value={hour.toString()}>
                          {formatHour(hour)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={selectedMinute}
                    onValueChange={(minute) => handleTimeChange(selectedHour || "0", minute)}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue placeholder="Minute" />
                    </SelectTrigger>
                    <SelectContent>
                      {minutes.map((minute) => (
                        <SelectItem key={minute} value={minute.toString()}>
                          {minute === 0 ? "00" : minute}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}