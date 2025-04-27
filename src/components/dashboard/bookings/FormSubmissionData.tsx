import { FieldValueDisplay } from "@/components/ui/field-value-display";
import { Booking } from "@/lib/bookings/types/types";
import { organizeFormDataBySections } from "@/lib/bookings/utils/fieldMapping";
import { useState, useEffect, useRef } from "react";

interface FormSubmissionDataProps {
  booking: Booking;
}

// Define our section type
interface Section {
  id: string;
  title: string;
  order: number;
  fields: Array<{ id: string; label: string; value: any; type?: string }>;
}

// Define a type for section data
type SectionData = {
  title?: string;
  fields?: string[];
  order?: number;
  fieldMetadata?: Record<string, { label: string; type: string; required?: boolean }>;
};

export function FormSubmissionData({ booking }: FormSubmissionDataProps) {
  // State to store the processed sections
  const [sections, setSections] = useState<Section[]>([]);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Process submission data on component mount
  useEffect(() => {
    // Get submission data
    const submissionData = booking.submissions?.[0]?.data as Record<string, any> || {};
    
    // Combine with any additional data
    const allData = {
      ...submissionData,
      ...booking.mappedData
    };
    
    // Process sections
    const processedSections = processBookingSections(allData);
    
    // Set sections and active section
    setSections(processedSections);
    if (processedSections.length > 0) {
      setActiveSection(processedSections[0].id);
    }
  }, [booking]);

  // Function to process booking sections
  const processBookingSections = (data: Record<string, any>): Section[] => {
    const result: Section[] = [];
    
    // Check for section info in the data
    if (data.__sectionInfo && typeof data.__sectionInfo === 'object') {
      try {
        // Parse section info if it's a string
        let sectionInfo = data.__sectionInfo as Record<string, SectionData>;
        if (typeof sectionInfo === 'string') {
          sectionInfo = JSON.parse(sectionInfo);
        }
        
        // Create sections from section info
        Object.entries(sectionInfo).forEach(([sectionId, sectionData]) => {
          // Get section title and order
          const title = sectionData.title || sectionId;
          const order = sectionData.order || 0;
          
          // Get fields for this section
          const sectionFields = sectionData.fields || [];
          const fieldMetadata = sectionData.fieldMetadata || {};
          
          // Map fields to our format
          const fieldsWithValues = sectionFields
            .filter(fieldId => 
              data[fieldId] !== undefined && 
              data[fieldId] !== null && 
              data[fieldId] !== ''
            )
            .map(fieldId => {
              // Get field metadata
              const metaKey = `_meta_${fieldId}`;
              const fieldMeta = data[metaKey] || fieldMetadata[fieldId] || {};
              
              // Get field value
              const value = data[fieldId];
              
              // Determine field type
              const type = fieldMeta.type || getFieldType(fieldId, value);
              
              // Format field value
              const formattedValue = formatFieldValue(value, type);
              
              return {
                id: fieldId,
                label: fieldMeta.label || formatFieldLabel(fieldId),
                value: formattedValue,
                type
              };
            });
          
          // Add section if it has fields
          if (fieldsWithValues.length > 0) {
            result.push({
              id: sectionId,
              title,
              order,
              fields: fieldsWithValues
            });
          }
        });
      } catch (error) {
        console.error('Error processing section info:', error);
      }
    } 
    // Check for mapped fields
    else if (data.__mappedFields && typeof data.__mappedFields === 'object') {
      try {
        // Parse mapped fields if it's a string
        let mappedFields = data.__mappedFields;
        if (typeof mappedFields === 'string') {
          mappedFields = JSON.parse(mappedFields);
        }
        
        // Use the utility function to organize data
        const organizedData = organizeFormDataBySections(data);
        
        if (organizedData && organizedData.sections) {
          organizedData.sections.forEach((section: any, index: number) => {
            // Map fields to our format
            const fieldsWithValues = section.fields.map((field: any) => ({
              id: field.id,
              label: field.label,
              value: formatFieldValue(field.value, getFieldType(field.id, field.value)),
              type: getFieldType(field.id, field.value)
            }));
            
            // Add section if it has fields
            if (fieldsWithValues.length > 0) {
              result.push({
                id: section.id || `section-${index}`,
                title: section.title || `Section ${index + 1}`,
                order: index,
                fields: fieldsWithValues
              });
            }
          });
        }
      } catch (error) {
        console.error('Error processing mapped fields:', error);
      }
    }
    
    // Sort sections by order
    return result.sort((a, b) => a.order - b.order);
  };

  // Helper function to determine field type
  const getFieldType = (key: string, value: any): string => {
    // Check key for common patterns
    if (/email/i.test(key)) return 'email';
    if (/phone|tel|mobile/i.test(key)) return 'tel';
    if (/date|dob|birthday/i.test(key)) return 'date';
    if (/time/i.test(key)) return 'time';
    if (/url|website|link/i.test(key)) return 'url';
    
    // Check value type
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (Array.isArray(value)) return 'array';
    if (value instanceof Date) return 'date';
    
    // Default to text
    return 'text';
  };

  // Helper function to format field values
  const formatFieldValue = (value: any, type?: string): any => {
    if (value === null || value === undefined) return '';
    
    // Format based on type
    switch (type) {
      case 'date':
        return value instanceof Date 
          ? value.toLocaleDateString() 
          : new Date(value).toLocaleDateString();
      case 'boolean':
        return value ? 'Yes' : 'No';
      case 'array':
        return Array.isArray(value) ? value.join(', ') : value;
      default:
        return value;
    }
  };

  // Helper function to format field labels
  const formatFieldLabel = (id: string): string => {
    if (!id) return '';
    
    // Remove common prefixes
    let label = id.replace(/^(field_|form_|input_|f_)/, '');
    
    // Replace underscores and hyphens with spaces
    label = label.replace(/[_-]/g, ' ');
    
    // Capitalize each word
    return label.replace(/\b\w/g, (char) => char.toUpperCase());
  };

  // Handle section click
  const handleSectionClick = (sectionId: string) => {
    setActiveSection(sectionId);
    
    // Find the section element and scroll to it
    if (contentRef.current) {
      const sectionElement = contentRef.current.querySelector(`#${sectionId}`);
      if (sectionElement) {
        sectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // Create a list of all sections for navigation
  const navigationSections = sections.map(section => ({
    id: section.id,
    title: section.title
  }));

  // Basic info section
  const BasicInfoFields = () => {
    // Get basic info from booking
    const basicInfo = [
      { label: "Form", value: booking.formName || booking.form?.name || booking.formId },
      { label: "Status", value: booking.status },
      { label: "Created At", value: booking.createdAt ? new Date(booking.createdAt).toLocaleString() : '' },
      { label: "Updated At", value: booking.updatedAt ? new Date(booking.updatedAt).toLocaleString() : '' }
    ];
    
    return (
      <div className="space-y-4">
        {basicInfo.map((field, index) => (
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
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Fixed header with navigation tabs */}
      <div className="flex-none border-b bg-background">
        {navigationSections.length > 1 && (
          <div className="flex flex-wrap gap-2 p-4">
            {navigationSections.map(section => (
              <button
                key={section.id}
                onClick={() => handleSectionClick(section.id)}
                className={`px-3 py-1.5 text-sm rounded-md ${
                  activeSection === section.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {section.title}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto" ref={contentRef}>
        <div className="p-6 space-y-8">
          {/* Basic Info Section */}
          <div className="mb-8" id="basic-info">
            <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
            <div className="p-5 bg-muted/50 rounded-md">
              <BasicInfoFields />
            </div>
          </div>
          
          {/* Form Sections */}
          {sections.map(section => (
            <div key={section.id} className="mb-8" id={section.id}>
              <h3 className="text-lg font-semibold mb-4">{section.title}</h3>
              <div className="p-5 bg-muted/50 rounded-md space-y-5">
                {section.fields.map(field => (
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
                ))}
              </div>
            </div>
          ))}
          
          {/* No data message */}
          {sections.length === 0 && (
            <div className="text-center p-8 text-muted-foreground">
              No booking data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
