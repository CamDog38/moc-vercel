import React from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface FieldValueDisplayProps {
  value: any;
  fieldType?: string;
  className?: string;
  options?: string[];
}

/**
 * Component that displays a field value formatted according to its field type
 */
export function FieldValueDisplay({
  value,
  fieldType,
  className,
  options = []
}: FieldValueDisplayProps) {
  if (value === undefined || value === null || value === "") {
    return <span className={cn("text-muted-foreground italic", className)}>Not provided</span>;
  }
  
  // Handle object values
  if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
    try {
      // Check if it's an empty object
      if (Object.keys(value).length === 0) {
        return <span className={cn("text-muted-foreground italic", className)}>Empty object</span>;
      }
      
      // Format object as a readable table
      return (
        <div className="space-y-2">
          {Object.entries(value).map(([key, val], index) => {
            // Format the key to be more readable
            const formattedKey = key
              .replace(/([A-Z])/g, ' $1') // Add space before capital letters
              .replace(/_/g, ' ') // Replace underscores with spaces
              .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
              .trim();
              
            // Format the value
            const formattedValue = typeof val === 'object' && val !== null
              ? JSON.stringify(val)
              : String(val);
              
            return (
              <div key={index} className="grid grid-cols-2 gap-2">
                <span className="text-sm font-medium text-muted-foreground">{formattedKey}:</span>
                <span className="text-sm">{formattedValue}</span>
              </div>
            );
          })}
        </div>
      );
    } catch (e) {
      // If formatting fails, stringify the object
      return <span className={className}>{JSON.stringify(value)}</span>;
    }
  }
  
  // Try to detect date strings for DOB fields when fieldType is not provided
  if (!fieldType && typeof value === 'string') {
    // Check if it's an ISO date string
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      try {
        const dateValue = new Date(value);
        if (!isNaN(dateValue.getTime())) {
          return <span className={className}>{format(dateValue, "dd/MM/yyyy")}</span>;
        }
      } catch (error) {
        // Fall through to default handling
      }
    }
  }
  
  // Handle arrays (like checkbox values) even when fieldType is not provided
  // Fallback: Try to parse stringified arrays
  if (typeof value === 'string' && value.trim().startsWith('[') && value.trim().endsWith(']')) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        if (parsed.length === 0) {
          return <span className={cn("text-muted-foreground italic", className)}>None selected</span>;
        }
        return <span className={className}>{parsed.join(', ')}</span>;
      }
    } catch (e) {
      // Not a valid JSON array, fall through
    }
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className={cn("text-muted-foreground italic", className)}>None selected</span>;
    }
    // Render as comma-separated string for user-friendliness
    return <span className={className}>{value.join(', ')}</span>;
  }

  switch (fieldType) {
    case "date":
      try {
        const dateValue = new Date(value);
        if (isNaN(dateValue.getTime())) {
          return <span className={className}>{value}</span>;
        }
        return <span className={className}>{format(dateValue, "dd/MM/yyyy")}</span>;
      } catch (error) {
        return <span className={className}>{value}</span>;
      }
      
    case "dob":
      try {
        const dateValue = new Date(value);
        if (isNaN(dateValue.getTime())) {
          return <span className={className}>{value}</span>;
        }
        return <span className={className}>{format(dateValue, "dd/MM/yyyy")}</span>;
      } catch (error) {
        return <span className={className}>{value}</span>;
      }
      
    case "checkbox":
      if (Array.isArray(value)) {
        if (value.length === 0) {
          return <span className={cn("text-muted-foreground italic", className)}>None selected</span>;
        }
        // Render as comma-separated string for user-friendliness
        return <span className={className}>{value.join(', ')}</span>;
      }
      return <span className={className}>{value ? "Yes" : "No"}</span>;
      
    case "radio":
    case "select":
    case "segmented":
      return <span className={className}>{value}</span>;
      
    case "email":
      return (
        <a 
          href={`mailto:${value}`} 
          className={cn("text-primary hover:underline", className)}
        >
          {value}
        </a>
      );
      
    case "tel":
      return (
        <a 
          href={`tel:${value}`} 
          className={cn("text-primary hover:underline", className)}
        >
          {value}
        </a>
      );
      
    case "url":
      return (
        <a 
          href={value.startsWith("http") ? value : `https://${value}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className={cn("text-primary hover:underline", className)}
        >
          {value}
        </a>
      );
      
    case "textarea":
      return (
        <div className={cn("whitespace-pre-wrap", className)}>
          {value}
        </div>
      );
      
    default:
      return <span className={className}>{value}</span>;
  }
} 