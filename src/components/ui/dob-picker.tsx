import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { format, isValid, isAfter, startOfDay, parse } from "date-fns";

interface DobPickerProps {
  date?: Date;
  setDate: (date: Date | undefined) => void;
  className?: string;
  required?: boolean;
  placeholder?: string;
}

export function DobPicker({
  date,
  setDate,
  className,
  required,
  placeholder = "DD/MM/YYYY"
}: DobPickerProps) {
  // Use a mask instead of direct input value
  const [inputValue, setInputValue] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);
  
  // Initialize the input with the date if provided, otherwise use empty string
  useEffect(() => {
    if (date && isValid(date)) {
      // Only update if we have a valid date and the field isn't being actively edited
      if (inputValue !== "") {
        setInputValue(format(date, "dd/MM/yyyy"));
      }
    } else if (inputValue === "") {
      // Leave the field empty instead of showing a placeholder
      // This prevents overwriting user input with the placeholder
      setInputValue("");
    }
  }, [date, inputValue]);

  // Validate the date whenever it changes
  useEffect(() => {
    validateDate(date);
    
    // Debug logging for date changes
    console.log('DobPicker date changed:', {
      date: date,
      isValid: date ? isValid(date) : false,
      isoString: date ? date.toISOString() : null
    });
  }, [date, required]);

  // Restore cursor position after rendering
  useEffect(() => {
    if (cursorPosition !== null && inputRef.current) {
      inputRef.current.setSelectionRange(cursorPosition, cursorPosition);
      setCursorPosition(null);
    }
  }, [inputValue, cursorPosition]);

  // Validate that the date is in the past
  const validateDate = (selectedDate?: Date) => {
    if (!selectedDate) {
      if (required) {
        setError("Date of birth is required");
      } else {
        setError(null);
      }
      return;
    }

    if (!isValid(selectedDate)) {
      setError("Invalid date");
      return;
    }

    // Check if date is in the future
    if (isAfter(startOfDay(selectedDate), startOfDay(new Date()))) {
      setError("Date of birth must be in the past");
      return;
    }

    setError(null);
  };

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
    
    // Try to parse the date if we have a complete entry (DD/MM/YYYY)
    const datePattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = formattedValue.match(datePattern);
    
    if (match) {
      const [_, dayStr, monthStr, yearStr] = match;
      const day = parseInt(dayStr, 10);
      const month = parseInt(monthStr, 10) - 1; // JS months are 0-indexed
      const year = parseInt(yearStr, 10);
      
      try {
        // Create a date object (noon to avoid timezone issues)
        const parsedDate = new Date(year, month, day, 12, 0, 0, 0);
        
        // Validate the date
        if (isValid(parsedDate)) {
          // Check if it's in the past
          if (!isAfter(startOfDay(parsedDate), startOfDay(new Date()))) {
            console.log('Valid DOB entered:', parsedDate);
            setDate(parsedDate);
            setError(null);
          } else {
            console.log('Future date entered:', parsedDate);
            setError("Date of birth must be in the past");
          }
        } else {
          console.log('Invalid date entered:', { day, month, year });
          setError("Invalid date");
        }
      } catch (e) {
        console.error('Error parsing date:', e);
        setError("Invalid date");
      }
    } else {
      // Clear the date if we don't have a complete entry
      setDate(undefined);
      
      // Only show error if required and user has entered something
      if (required && formattedValue.length > 0) {
        setError("Please enter a complete date in DD/MM/YYYY format");
      } else {
        setError(null);
      }
    }
  };

  // Handle keydown to allow only valid inputs
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow navigation keys, backspace, delete, and tab
    if (
      e.key === 'ArrowLeft' || 
      e.key === 'ArrowRight' || 
      e.key === 'Backspace' || 
      e.key === 'Delete' || 
      e.key === 'Tab' ||
      e.key === 'Enter' ||
      e.ctrlKey || // Allow copy/paste shortcuts
      e.metaKey
    ) {
      return;
    }
    
    // Only allow digits and slashes
    if (!/^\d$/.test(e.key) && e.key !== '/') {
      e.preventDefault();
      return;
    }
    
    // Get current cursor position and value
    const input = e.currentTarget;
    const cursorPos = input.selectionStart || 0;
    const currentValue = input.value;
    
    // Prevent adding more than 2 slashes
    if (e.key === '/' && (currentValue.split('/').length > 2)) {
      e.preventDefault();
      return;
    }
    
    // Prevent adding digits beyond the 10-character limit (DD/MM/YYYY)
    if (currentValue.length >= 10 && !input.selectionEnd) {
      e.preventDefault();
      return;
    }
  };

  // Handle focus to prepare the field for input
  const handleFocus = () => {
    // If the field has placeholder text, clear it for input
    if (inputValue === "DD/MM/YYYY") {
      setInputValue("");
      setCursorPosition(0);
    }
  };

  // Handle blur to validate and format the date
  const handleBlur = () => {
    // If the field is empty, handle based on required status
    if (!inputValue || inputValue === "") {
      setDate(undefined);
      
      if (required) {
        setError("Date of birth is required");
      } else {
        setError(null);
      }
      return;
    }
    
    // Check if we have a complete date in DD/MM/YYYY format
    const datePattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = inputValue.match(datePattern);
    
    if (match) {
      // We already have a complete date, it was validated in handleInputChange
      return;
    }
    
    // Handle partial dates
    try {
      // Try to parse whatever format we have
      let day = 1, month = 0, year = new Date().getFullYear();
      
      // Extract what we can from the input
      const parts = inputValue.split('/');
      if (parts[0] && parts[0].length > 0) {
        day = parseInt(parts[0], 10) || 1;
      }
      if (parts[1] && parts[1].length > 0) {
        month = (parseInt(parts[1], 10) || 1) - 1; // JS months are 0-indexed
      }
      if (parts[2] && parts[2].length > 0) {
        year = parseInt(parts[2], 10) || new Date().getFullYear();
        // Handle 2-digit years
        if (year < 100) {
          year += year < 50 ? 2000 : 1900;
        }
      }
      
      // Create a date from the parts we have
      const parsedDate = new Date(year, month, day, 12, 0, 0, 0);
      
      // Ensure it's valid and in the past
      if (isValid(parsedDate) && !isAfter(startOfDay(parsedDate), startOfDay(new Date()))) {
        // Format the date properly
        setInputValue(format(parsedDate, "dd/MM/yyyy"));
        setDate(parsedDate);
        setError(null);
      } else {
        // Invalid or future date
        setError("Please enter a valid date in the past");
        // Keep the user's input for correction
      }
    } catch (e) {
      console.error('Error parsing date on blur:', e);
      setError("Invalid date format");
    }
  };

  return (
    <div className="space-y-2">
      <Input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={cn(
          "font-medium",
          error && "border-red-500",
          className
        )}
        placeholder={placeholder}
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}