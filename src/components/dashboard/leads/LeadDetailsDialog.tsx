import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { formatDate } from "@/util/date-format";
import { FieldValueDisplay } from "@/components/ui/field-value-display";
import { Lead } from "./types/types";
import { useMemo, useState } from "react";

interface LeadDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detailedLead: Lead | null;
  isLoading?: boolean;
  error?: string;
}

export function LeadDetailsDialog({ 
  open, 
  onOpenChange, 
  detailedLead,
  isLoading = false,
  error = ""
}: LeadDetailsDialogProps) {
  if (!detailedLead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Lead Details</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="text-destructive py-4">{error}</div>
        ) : (
          <div className="space-y-6">
            {/* Form Submission Data */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Form Submission Data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-y-4">
                  {(!detailedLead.mappedData || Object.keys(detailedLead.mappedData).length === 0) && 
                   (!detailedLead.submissions || !detailedLead.submissions[0] || !detailedLead.submissions[0].data || Object.keys(detailedLead.submissions[0].data).length === 0) ? (
                    <div className="text-sm text-muted-foreground">No form data available</div>
                  ) : (
                    <FormSubmissionData detailedLead={detailedLead} />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Lead Information */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Lead Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-y-4">
                  <LeadInfoFields lead={detailedLead} />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FormSubmissionData({ detailedLead }: { detailedLead: Lead }) {
  // Get submission data
  const submissionData = useMemo(() => {
    let data = detailedLead.submissions?.[0]?.data as Record<string, any> || {};
    
    // Check if the submission data might be a JSON string broken into characters
    // This happens sometimes with Form 2.0 submissions
    const keys = Object.keys(data);
    const isSequentialNumbers = keys.every(key => !isNaN(Number(key)));
    const hasSequentialIndices = isSequentialNumbers && 
      keys.length > 5 && // Only try to reconstruct if there are enough characters
      keys.some(key => Number(key) === 0) && // Should start from 0
      keys.some(key => Number(key) === keys.length - 1); // Should have the last index
    
    // If it looks like a JSON string broken into characters, try to reconstruct it
    if (hasSequentialIndices) {
      try {
        // Sort keys numerically and join the values to reconstruct the string
        const sortedKeys = keys.sort((a, b) => Number(a) - Number(b));
        const jsonString = sortedKeys.map(key => data[key]).join('');
        
        // Try to parse the reconstructed string as JSON
        const parsedData = JSON.parse(jsonString);
        
        // If successful, use the parsed data instead
        if (parsedData && typeof parsedData === 'object') {
          data = parsedData;
        }
      } catch (e) {
        // If parsing fails, keep the original data
        console.error('Failed to parse JSON string from submission data:', e);
      }
    }
    
    return data;
  }, [detailedLead.submissions]);
  
  // Priority fields to display at the top
  const priorityFields = useMemo(() => {
    // Define field patterns to recognize important fields regardless of exact naming
    const fieldPatterns = [
      // Contact information patterns
      { pattern: /first[_-]?name|fname/i, label: 'First Name', priority: 10 },
      { pattern: /last[_-]?name|lname/i, label: 'Last Name', priority: 11 },
      { pattern: /full[_-]?name|name/i, label: 'Name', priority: 12 },
      { pattern: /email/i, label: 'Email', priority: 20 },
      { pattern: /phone|mobile|tel/i, label: 'Phone', priority: 30 },
      
      // Date and time patterns
      { pattern: /preferred[_-]?date|wedding[_-]?date|event[_-]?date/i, label: 'Preferred Date & Time', priority: 40 },
      { pattern: /date/i, label: 'Date', priority: 41 },
      { pattern: /time/i, label: 'Time', priority: 42 },
      
      // Location patterns
      { pattern: /province|state|region/i, label: 'Province', priority: 50 },
      { pattern: /city|town/i, label: 'City', priority: 51 },
      { pattern: /venue/i, label: 'Venue', priority: 52 },
      { pattern: /address/i, label: 'Address', priority: 53 },
      
      // Other common patterns
      { pattern: /nationality|citizenship/i, label: 'Nationality of Couple', priority: 60 },
      { pattern: /comment|message|question/i, label: 'Questions/Comments', priority: 70 },
      { pattern: /registration[_-]?type|package|plan/i, label: 'Registration Type', priority: 80 },
      { pattern: /guests|attendees/i, label: 'Number of Guests', priority: 90 },
      { pattern: /budget/i, label: 'Budget', priority: 100 },
    ];
    
    // Define known fields with exact matches
    const knownFields: Record<string, { label: string, priority: number }> = {
      'first_name': { label: 'First Name', priority: 10 },
      'last_name': { label: 'Last Name', priority: 11 },
      'name': { label: 'Name', priority: 12 },
      'email': { label: 'Email', priority: 20 },
      'phone': { label: 'Phone', priority: 30 },
      'preferred_date': { label: 'Preferred Date & Time', priority: 40 },
      'wedding_date': { label: 'Wedding Date', priority: 41 },
      'event_date': { label: 'Event Date', priority: 42 },
      'province': { label: 'Province', priority: 50 },
      'city': { label: 'City', priority: 51 },
      'venue': { label: 'Venue', priority: 52 },
      'address': { label: 'Address', priority: 53 },
      'nationality': { label: 'Nationality of Couple', priority: 60 },
      'comments': { label: 'Questions/Comments', priority: 70 },
      'message': { label: 'Message', priority: 71 },
      'registration_type': { label: 'Registration Type', priority: 80 },
      'guests': { label: 'Number of Guests', priority: 90 },
      'budget': { label: 'Budget', priority: 100 },
    };
    
    return { fieldPatterns, knownFields };
  }, []);
  
  // Helper function to determine field type
  const getFieldType = (key: string, value: any): string | undefined => {
    // Check key for hints
    if (/email/i.test(key)) return 'email';
    if (/phone|tel|mobile/i.test(key)) return 'tel';
    if (/date|time/i.test(key)) return 'date';
    if (/url|website|link/i.test(key)) return 'url';
    
    // Check value type
    if (typeof value === 'boolean') return 'checkbox';
    if (Array.isArray(value)) return 'checkbox';
    if (typeof value === 'string') {
      // Check for date strings
      if (/^\d{4}-\d{2}-\d{2}/.test(value) || /^\d{2}\/\d{2}\/\d{4}/.test(value)) {
        return 'date';
      }
      // Check for email
      if (/^[^@]+@[^@]+\.[^@]+$/.test(value)) {
        return 'email';
      }
      // Check for phone numbers
      if (/^[+]?[\d\s()-]{7,}$/.test(value)) {
        return 'tel';
      }
      // Check for snake_case or kebab-case options
      if (/^[a-z0-9_-]+$/i.test(value)) {
        return 'option';
      }
    }
    
    return undefined;
  };
  
  // Helper function to format option values
  const formatOptionValue = (value: string): string => {
    if (!value) return '';
    
    // Handle common option formats
    if (/^(please_|please-|select_|select-)/.test(value)) {
      value = value.replace(/^(please_|please-|select_|select-)/, '');
    }
    
    // Replace underscores and hyphens with spaces
    value = value.replace(/[_-]/g, ' ');
    
    // Handle special cases
    if (/^both/.test(value)) {
      value = value.replace(/^both_/, 'Both ');
    }
    
    // Handle province/location codes
    if (/^(western_cape|eastern_cape|northern_cape|free_state|gauteng|kwazulu_natal|limpopo|mpumalanga|north_west)$/i.test(value)) {
      // Convert province codes to proper names
      const provinceMap: Record<string, string> = {
        'western_cape': 'Western Cape',
        'eastern_cape': 'Eastern Cape',
        'northern_cape': 'Northern Cape',
        'free_state': 'Free State',
        'gauteng': 'Gauteng',
        'kwazulu_natal': 'KwaZulu-Natal',
        'limpopo': 'Limpopo',
        'mpumalanga': 'Mpumalanga',
        'north_west': 'North West'
      };
      
      const key = value.toLowerCase().replace(/[\s-]/g, '_');
      if (provinceMap[key]) {
        return provinceMap[key];
      }
    }
    
    // Handle nationality options
    if (/^both_south_african$/i.test(value)) {
      return 'Both South African';
    }
    if (/^one_south_african$/i.test(value)) {
      return 'One South African';
    }
    if (/^neither_south_african$/i.test(value)) {
      return 'Neither South African';
    }
    
    // Title case the result
    return value.split(' ')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };
  
  // Helper function to format field labels
  const formatFieldLabel = (key: string): string => {
    // Remove common prefixes
    let label = key.replace(/^(inquiry_form_|form_|field_|input_|select_|checkbox_|radio_|textarea_|file_|date_|time_|email_|phone_|tel_|url_|name_)/i, '');
    
    // Replace underscores and hyphens with spaces
    label = label.replace(/[_-]/g, ' ');
    
    // Title case the result
    label = label.split(' ')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    return label || 'Unnamed Field';
  };
  
  // Helper function to format field values
  const formatFieldValue = (value: any, type?: string): any => {
    if (value === null || value === undefined) {
      return 'Not provided';
    }
    
    // Format dates
    if (typeof value === 'string') {
      if (type === 'date' || /^\d{4}-\d{2}-\d{2}/.test(value) || /^\d{2}\/\d{2}\/\d{4}/.test(value)) {
        try {
          return formatDate(value, 'PP');
        } catch (e) {
          // If date parsing fails, keep the original value
        }
      }
    }
    
    // Format arrays
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : '(Empty array)';
    }
    
    // Format objects
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      try {
        return JSON.stringify(value, null, 2);
      } catch (e) {
        return 'Complex object';
      }
    }
    
    // Format booleans
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    return value;
  };
  
  // Organize data for display
  const organizedData = useMemo(() => {
    const result: Array<{id: string, label: string, type?: string, value: any, priority: number}> = [];
    const { fieldPatterns, knownFields } = priorityFields;
    const processedKeys = new Set<string>();
    
    // Create a map to deduplicate fields by their semantic meaning
    const fieldGroups: Record<string, {ids: string[], value: any, priority: number}> = {};
    
    // Process all form data
    const allData = { ...submissionData };
    
    // Add mapped data if available
    if (detailedLead.mappedData && typeof detailedLead.mappedData === 'object') {
      Object.entries(detailedLead.mappedData).forEach(([key, value]) => {
        if (!allData[key] && !key.startsWith('_')) {
          allData[key] = value;
        }
      });
    }
    
    // First pass: categorize and deduplicate fields
    Object.entries(allData).forEach(([key, value]) => {
      if (!key.startsWith('_') && value !== undefined && value !== null) {
        // Skip if already processed
        if (processedKeys.has(key)) return;
        
        let fieldLabel = '';
        let fieldPriority = 999; // Default low priority
        let groupKey = '';
        
        // Check if this is a known field
        if (knownFields[key]) {
          fieldLabel = knownFields[key].label;
          fieldPriority = knownFields[key].priority;
          groupKey = fieldLabel.toLowerCase();
        } else {
          // Try to match against patterns
          for (const pattern of fieldPatterns) {
            if (pattern.pattern.test(key)) {
              fieldLabel = pattern.label;
              fieldPriority = pattern.priority;
              groupKey = fieldLabel.toLowerCase();
              break;
            }
          }
          
          // If no pattern matched, use a formatted version of the field key
          if (!fieldLabel) {
            // Check if this is a field ID (starts with letters followed by numbers and letters)
            if (/^[a-zA-Z][a-zA-Z0-9]{5,}$/.test(key) || /^cm[0-9a-z]{10,}/i.test(key)) {
              // This looks like a field ID, hide it by default
              fieldLabel = 'Field ID: ' + key.substring(0, 8) + '...';
              fieldPriority = 1000;
              groupKey = 'field_id_' + String(value).toLowerCase().replace(/\s+/g, '_');
            } else {
              fieldLabel = formatFieldLabel(key);
              fieldPriority = 500; // Medium priority for other fields
              groupKey = fieldLabel.toLowerCase();
            }
          }
        }
        
        // Add to field groups for deduplication
        if (!fieldGroups[groupKey]) {
          fieldGroups[groupKey] = {
            ids: [key],
            value,
            priority: fieldPriority
          };
        } else {
          // If we already have this field type, only add it if it's a higher priority
          if (fieldPriority < fieldGroups[groupKey].priority) {
            fieldGroups[groupKey].value = value;
            fieldGroups[groupKey].priority = fieldPriority;
          }
          fieldGroups[groupKey].ids.push(key);
        }
        
        processedKeys.add(key);
      }
    });
    
    // Second pass: create result array from deduplicated fields
    Object.entries(fieldGroups).forEach(([groupKey, group]) => {
      // Skip field IDs with duplicate values
      if (groupKey.startsWith('field_id_')) {
        // Only include field IDs if we don't already have this value in a named field
        const valueStr = String(group.value).toLowerCase();
        const isDuplicate = Object.entries(fieldGroups).some(([otherKey, otherGroup]) => 
          !otherKey.startsWith('field_id_') && 
          String(otherGroup.value).toLowerCase() === valueStr
        );
        
        if (isDuplicate) return;
      }
      
      // Get the primary field ID (first one in the group)
      const primaryId = group.ids[0];
      const fieldType = getFieldType(primaryId, group.value);
      
      result.push({
        id: primaryId,
        label: groupKey.startsWith('field_id_') 
          ? 'Field ID: ' + primaryId.substring(0, 8) + '...' 
          : fieldPatterns.find(p => p.label.toLowerCase() === groupKey)?.label || 
            formatFieldLabel(primaryId),
        value: group.value,
        type: fieldType || (/^[a-z0-9_-]+$/i.test(String(group.value)) ? 'option' : undefined),
        priority: group.priority
      });
    });
    
    // Sort by priority (highest first) and then by label
    return result.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.label.localeCompare(b.label);
    });
  }, [submissionData, detailedLead.mappedData, priorityFields, formatFieldLabel, getFieldType]);

  return (
    <>
      {organizedData.length > 0 ? (
        organizedData.map(field => {
          // Handle option values specially
          if (field.type === 'option' && typeof field.value === 'string') {
            field.value = formatOptionValue(field.value);
          }
          
          return (
            <div key={field.id} className="grid grid-cols-3 items-start gap-4">
              <label className="text-sm font-medium text-muted-foreground pt-1">
                {field.label}
              </label>
              <div className="col-span-2 text-sm break-words whitespace-pre-wrap">
                {field.type === 'email' ? (
                  <a 
                    href={`mailto:${field.value}`} 
                    className="text-primary hover:underline"
                  >
                    {field.value}
                  </a>
                ) : field.type === 'tel' ? (
                  <a 
                    href={`tel:${field.value}`} 
                    className="text-primary hover:underline"
                  >
                    {field.value}
                  </a>
                ) : (
                  <FieldValueDisplay 
                    value={field.value} 
                    fieldType={field.type}
                  />
                )}
              </div>
            </div>
          );
        })
      ) : (
        <div className="text-sm text-muted-foreground">No submission data available</div>
      )}
    </>
  );
}

function LeadInfoFields({ lead }: { lead: Lead }) {
  const fields = [
    { label: "Status", value: lead.status },
    { label: "Source", value: lead.source },
    { label: "Created At", value: formatDate(lead.createdAt, 'PPpp') },
    { label: "Updated At", value: formatDate(lead.updatedAt, 'PPpp') },
    { label: "Form", value: lead.formName || lead.form?.name || lead.formId },
    { label: "Notes", value: lead.notes }
  ];

  return (
    <>
      {fields.map((field, index) => (
        field.value && (
          <div key={index} className="grid grid-cols-3 items-start gap-4">
            <label className="text-sm font-medium text-muted-foreground pt-1">
              {field.label}
            </label>
            <div className="col-span-2 text-sm break-words whitespace-pre-wrap">
              {field.value}
            </div>
          </div>
        )
      ))}
    </>
  );
}
