import React, { useState, useEffect } from 'react';
import { Label } from "@/components/ui/label";
import { DobPicker } from "@/components/ui/dob-picker";
import { FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface DOBFieldProps {
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
}

export const DOBField: React.FC<DOBFieldProps> = ({
  id,
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  placeholder = "DD/MM/YYYY",
  helpText,
  error,
  dateFormat = 'dd/MM/yyyy'
}) => {
  // Convert string value to Date object if it exists
  const [date, setDate] = useState<Date | undefined>(
    value ? new Date(value) : undefined
  );

  // Update the parent component when date changes
  useEffect(() => {
    if (date) {
      onChange(date.toISOString());
    } else {
      onChange('');
    }
  }, [date, onChange]);

  // Handle date change from the DOB picker
  const handleDateChange = (newDate: Date | undefined) => {
    setDate(newDate);
    console.log('DOB changed:', newDate);
  };

  return (
    <div className="mb-4">
      <div className="space-y-2">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        
        <DobPicker
          date={date}
          setDate={handleDateChange}
          required={required}
          placeholder={placeholder}
          className={error ? "border-destructive" : ""}
        />
        
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

export default DOBField;
