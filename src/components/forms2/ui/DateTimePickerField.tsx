import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";

interface DateTimePickerFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  helpText?: string;
  error?: string;
  includeTime?: boolean;
  allowTimeToggle?: boolean;
}

export const DateTimePickerField: React.FC<DateTimePickerFieldProps> = ({
  id,
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  placeholder = "Select date",
  helpText,
  error,
  includeTime = false,
  allowTimeToggle = false,
}) => {
  // Safely parse the date value
  const parseInitialDate = () => {
    if (!value) return undefined;
    
    try {
      // Try to parse the date string
      const parsedDate = new Date(value);
      
      // Check if the date is valid
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
      return undefined;
    } catch (error) {
      console.error('Error parsing initial date value:', error);
      return undefined;
    }
  };
  
  const [date, setDate] = useState<Date | undefined>(parseInitialDate());
  const [showTime, setShowTime] = useState<boolean>(includeTime);
  
  // Safely get the initial time value
  const getInitialTime = () => {
    if (!value || !includeTime) return '09:00';
    
    try {
      const parsedDate = new Date(value);
      if (!isNaN(parsedDate.getTime())) {
        return format(parsedDate, 'HH:mm');
      }
      return '09:00';
    } catch (error) {
      console.error('Error formatting time value:', error);
      return '09:00';
    }
  };
  
  const [time, setTime] = useState<string>(getInitialTime());

  // Generate time options in 30-minute intervals
  const timeOptions = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const formattedHour = hour.toString().padStart(2, '0');
      const formattedMinute = minute.toString().padStart(2, '0');
      timeOptions.push(`${formattedHour}:${formattedMinute}`);
    }
  }

  // Update the combined value when date or time changes
  useEffect(() => {
    if (!date) {
      onChange('');
      return;
    }

    const newDate = new Date(date);
    
    if (showTime && time) {
      const [hours, minutes] = time.split(':').map(Number);
      newDate.setHours(hours, minutes);
    } else {
      // Reset time to midnight if not showing time
      newDate.setHours(0, 0, 0, 0);
    }
    
    onChange(newDate.toISOString());
  }, [date, time, showTime, onChange]);

  // Handle time toggle
  const handleTimeToggle = (checked: boolean) => {
    setShowTime(checked);
  };

  return (
    <div className="mb-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={id} className="text-sm font-medium">
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
          
          {allowTimeToggle && (
            <div className="flex items-center space-x-2">
              <Label htmlFor={`${id}-time-toggle`} className="text-sm">Include time</Label>
              <Switch
                id={`${id}-time-toggle`}
                checked={showTime}
                onCheckedChange={handleTimeToggle}
                disabled={disabled}
              />
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Date Picker */}
          <div className="flex-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`w-full justify-start text-left font-normal ${
                    !date && "text-muted-foreground"
                  } ${error ? "border-destructive" : ""}`}
                  disabled={disabled}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PP') : placeholder}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Picker */}
          {showTime && (
            <div className="w-40">
              <Select
                value={time}
                onValueChange={setTime}
                disabled={disabled}
              >
                <SelectTrigger className={`${error ? "border-destructive" : ""}`}>
                  <Clock className="mr-2 h-4 w-4 inline" />
                  <SelectValue placeholder="Time">{time}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((timeOption) => (
                    <SelectItem key={timeOption} value={timeOption}>
                      {timeOption}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {helpText && (
          <p id={`${id}-description`} className="text-sm text-muted-foreground">
            {helpText}
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
};
