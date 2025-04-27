import React, { useState, useEffect, useRef } from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format, subYears, parse, isValid } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DateOfBirthFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  helpText?: string;
  error?: string;
  dateFormat?: 'dd/MM/yyyy' | 'MM/dd/yyyy'; // Allow different date formats
  isBuilder?: boolean; // Whether this is being rendered in the form builder
}

export const DateOfBirthField: React.FC<DateOfBirthFieldProps> = ({
  id,
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  placeholder = "DD/MM/YYYY",
  helpText,
  error,
  dateFormat = 'dd/MM/yyyy',
  isBuilder = false
}) => {
  // Initialize date format option first
  const [dateFormatOption, setDateFormatOption] = useState<'dd/MM/yyyy' | 'MM/dd/yyyy'>(dateFormat);
  
  // Use a mask instead of direct input value
  const [inputValue, setInputValue] = useState<string>(dateFormat === 'dd/MM/yyyy' ? "DD/MM/YYYY" : "MM/DD/YYYY");
  
  // Safely parse the date value
  const parseInitialDate = () => {
    if (!value) return undefined;
    
    try {
      // Try to parse the date string
      const parsedDate = new Date(value);
      
      // Check if the date is valid
      if (isValid(parsedDate)) {
        return parsedDate;
      }
      return undefined;
    } catch (error) {
      console.error('Error parsing initial date value:', error);
      return undefined;
    }
  };
  
  const [date, setDate] = useState<Date | undefined>(parseInitialDate());
  const inputRef = useRef<HTMLInputElement>(null);
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);
  
  // Set default calendar view to 18 years ago
  const defaultCalendarDate = subYears(new Date(), 18);

  // Calculate age based on selected date
  const calculateAge = (birthDate: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  // Initialize the input with the date if provided, otherwise use empty string
  useEffect(() => {
    if (date && isValid(date)) {
      // Only update if the formatted date is different from current input value
      const formattedDate = format(date, dateFormatOption);
      if (formattedDate !== inputValue && inputValue !== "") {
        setInputValue(formattedDate);
      }
    } else if (inputValue === "") {
      // Only set placeholder when field is completely empty
      // This prevents overwriting user input with the placeholder
      const maskTemplate = "";
      setInputValue(maskTemplate);
    }
  }, [date, dateFormatOption, inputValue]);

  // Update cursor position after input changes
  useEffect(() => {
    if (inputRef.current && cursorPosition !== null) {
      // Use setTimeout to ensure the DOM has updated before setting cursor position
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.selectionStart = cursorPosition;
          inputRef.current.selectionEnd = cursorPosition;
          setCursorPosition(null);
        }
      }, 0);
    }
  }, [inputValue, cursorPosition]);

  // Handle input changes with a simpler approach
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    const oldValue = inputValue;
    
    // Special handling for empty field - allow direct typing
    if (oldValue === "" && newValue.length === 1 && /^\d$/.test(newValue)) {
      // First digit entered - just set it directly
      setInputValue(newValue);
      setCursorPosition(1);
      return;
    }
    
    // Handle backspace over slashes
    if (newValue.length < oldValue.length) {
      // User is deleting characters
      if ((oldValue.charAt(cursorPos) === '/' || cursorPos === 3 || cursorPos === 6) && 
          (cursorPos === 2 || cursorPos === 5 || cursorPos === 3 || cursorPos === 6)) {
        // User is trying to delete a slash or character after slash
        // Remove the slash and the digit before it
        const beforeSlash = newValue.substring(0, Math.max(0, cursorPos - 1));
        const afterSlash = newValue.substring(cursorPos);
        const updatedValue = beforeSlash + afterSlash;
        setInputValue(updatedValue);
        setCursorPosition(Math.max(0, cursorPos - 1));
        return;
      }
    }
    
    // Filter out any non-numeric characters (except slashes)
    let formattedValue = newValue.replace(/[^0-9\/]/g, '');
    
    // Auto-insert slashes if needed
    if (formattedValue.length === 2 && !/\//.test(formattedValue)) {
      // Add slash after day
      formattedValue = formattedValue + '/';
      setCursorPosition(3);
    } else if (formattedValue.length === 5 && formattedValue.indexOf('/') === 2 && formattedValue.lastIndexOf('/') === 2) {
      // Add slash after month
      formattedValue = formattedValue + '/';
      setCursorPosition(6);
    }
    
    // Ensure we don't exceed max length
    if (formattedValue.length > 10) {
      formattedValue = formattedValue.substring(0, 10);
    }
    
    // Update the input value
    setInputValue(formattedValue);
    
    // Calculate new cursor position based on the number of slashes before the cursor
    let newCursorPos = cursorPos;
    
    // Adjust cursor position for automatic slash insertion
    if (formattedValue.length > 0) {
      // Count digits in the new value up to the cursor position
      const digitsBeforeCursor = newValue.substring(0, cursorPos).replace(/[^0-9]/g, '').length;
      
      // Calculate new cursor position based on digit count and expected slash positions
      if (digitsBeforeCursor <= 2) {
        // In the day part
        newCursorPos = digitsBeforeCursor;
      } else if (digitsBeforeCursor <= 4) {
        // In the month part (add 1 for the first slash)
        newCursorPos = digitsBeforeCursor + 1;
      } else {
        // In the year part (add 2 for both slashes)
        newCursorPos = digitsBeforeCursor + 2;
      }
      
      // If we just added a slash, move cursor past it
      if (formattedValue.length > oldValue.length && 
          (formattedValue.length === 3 || formattedValue.length === 6)) {
        newCursorPos++;
      }
    }
    
    // Set the new cursor position
    setCursorPosition(Math.min(newCursorPos, formattedValue.length));
    
    // Max length is already enforced in the formatting logic above
    
    // Try to parse the date if we have a complete entry (DD/MM/YYYY or MM/DD/YYYY)
    const datePattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = formattedValue.match(datePattern);
    
    if (match) {
      const [_, firstPart, secondPart, yearStr] = match;
      let day, month;
      
      // Parse according to the selected format
      if (dateFormatOption === 'dd/MM/yyyy') {
        day = parseInt(firstPart, 10);
        month = parseInt(secondPart, 10) - 1; // JS months are 0-indexed
      } else {
        month = parseInt(firstPart, 10) - 1; // JS months are 0-indexed
        day = parseInt(secondPart, 10);
      }
      
      const year = parseInt(yearStr, 10);
      
      try {
        // Create a date object (noon to avoid timezone issues)
        const parsedDate = new Date(year, month, day, 12, 0, 0, 0);
        
        // Validate the date
        if (isValid(parsedDate)) {
          console.log('Valid DOB entered:', parsedDate);
          setDate(parsedDate);
        } else {
          console.log('Invalid date entered:', { day, month, year });
          setDate(undefined);
        }
      } catch (e) {
        console.error('Error parsing date:', e);
        setDate(undefined);
      }
    } else {
      // Clear the date if we don't have a complete entry
      setDate(undefined);
    }
  };

  // Update the parent component when date changes
  useEffect(() => {
    if (date) {
      // Always set time to midnight (00:00:00) for DOB fields
      // This ensures we're only capturing the date portion
      const newDate = new Date(date);
      newDate.setHours(0, 0, 0, 0);
      
      // Format as YYYY-MM-DD to strip time completely
      const year = newDate.getFullYear();
      const month = String(newDate.getMonth() + 1).padStart(2, '0');
      const day = String(newDate.getDate()).padStart(2, '0');
      const dateOnlyString = `${year}-${month}-${day}`;
      
      // Only update if the value has actually changed
      if (dateOnlyString !== value) {
        onChange(dateOnlyString);
      }
    } else if (value) {
      // Only clear if there's currently a value
      onChange('');
    }
  }, [date, onChange, value]);

  return (
    <div className="mb-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={id} className="text-sm font-medium">
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
          
          {/* Date format selector - only shown in builder mode */}
          {isBuilder && (
            <Select
              value={dateFormatOption}
              onValueChange={(value: 'dd/MM/yyyy' | 'MM/dd/yyyy') => setDateFormatOption(value)}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Date format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dd/MM/yyyy">DD/MM/YYYY</SelectItem>
                <SelectItem value="MM/dd/yyyy">MM/DD/YYYY</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex space-x-2">
          {/* Masked input for date */}
          <div className="flex-1">
            <Input
              id={id}
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              className={`${error ? "border-destructive" : ""}`}
              placeholder={dateFormatOption === 'dd/MM/yyyy' ? "DD/MM/YYYY" : "MM/DD/YYYY"}
              required={required}
              disabled={disabled}
              aria-describedby={helpText ? `${id}-description` : undefined}
              onFocus={(e) => {
                // If the field has placeholder text, clear it for input
                if (inputValue === "DD/MM/YYYY" || inputValue === "MM/DD/YYYY") {
                  setInputValue("");
                  setCursorPosition(0);
                }
              }}
              onBlur={() => {
                // If the field is empty, handle appropriately
                if (!inputValue || inputValue === "") {
                  setDate(undefined);
                  return;
                }
                
                // Check if we have a complete date in the correct format
                const datePattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
                const match = inputValue.match(datePattern);
                
                if (!match) {
                  // Try to format partial input
                  setInputValue("");
                  setDate(undefined);
                }
              }}
            />
          </div>
          
          {/* Calendar popup button */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={`${error ? "border-destructive" : ""}`}
                disabled={disabled}
              >
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                defaultMonth={date || defaultCalendarDate}
                initialFocus
                disabled={(date) => {
                  // Disable future dates
                  return date > new Date();
                }}
                fromYear={1900}
                toYear={new Date().getFullYear()}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Display age if a valid date is selected */}
        {date && isValid(date) && (
          <p className="text-sm text-muted-foreground">
            Age: {calculateAge(date)}
          </p>
        )}

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
