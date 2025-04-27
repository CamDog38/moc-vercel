import { useState, useEffect } from "react";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { DobPicker } from "@/components/ui/dob-picker";
import { toast } from "@/components/ui/use-toast";
import StepIndicator from "@/components/forms2/ui/StepIndicator";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, GripVertical, Trash2, Plus, AlertTriangle, Info } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useForm, FieldError, Merge, FieldErrorsImpl } from "react-hook-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export type ConditionalLogic = {
  fieldId: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'notContains';
  value: string;
  action: 'show' | 'hide';
};

export type FormField = {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  mapping?: 'name' | 'email' | 'phone' | 'date' | 'time' | 'location' | 'location_office' | 'datetime' | null;
  excludeTime?: boolean;
  validation?: Record<string, any>;
  helpText?: string;
  order?: number;
  conditionalLogic?: ConditionalLogic;
  stableId?: string;
  inUseByRules?: boolean;
};

export type FormSection = {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
};

interface FormBuilderProps {
  fields: FormField[];
  sections?: FormSection[];
  isMultiPage?: boolean;
  onChange?: (data: Record<string, any>) => void;
  onSubmit?: (data: any) => void;
  viewOnly?: boolean;
  defaultValues?: Record<string, any>;
  formType?: 'INQUIRY' | 'BOOKING';
}

export function FormBuilder({ 
  fields, 
  sections = [],
  isMultiPage = false,
  onChange, 
  onSubmit,
  viewOnly = false,
  defaultValues = {},
  formType = 'INQUIRY'
}: FormBuilderProps) {
  const [newFieldType, setNewFieldType] = useState("text");
  const [activeSection, setActiveSection] = useState<string>(sections[0]?.id || "default");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, any>>(defaultValues);
  const { register, handleSubmit, formState: { errors }, setValue, getValues, trigger, watch } = useForm({
    defaultValues,
    mode: "onChange"
  });

  // Watch all form values and update formValues state
  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      if (name) {
        const newValues = {
          ...formValues,
          [name]: value[name]
        };
        setFormValues(newValues);
        
        // Notify parent component of value changes
        if (onChange) {
          onChange(newValues);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, onChange, formValues]);

  // Pre-register all fields and initialize form values
  useEffect(() => {
    const registerField = (field: FormField) => {
      if (field.id) {
        register(field.id, { 
          required: field.required ? "This field is required" : false,
          validate: {
            ...field.validation,
            required: (value: any) => {
              if (!field.required) return true;
              if (value === undefined || value === null || value === "") return "This field is required";
              if (field.type === 'date' && !value) return "This field is required";
              return true;
            }
          }
        });

        // Initialize form value if there's a default value
        if (defaultValues[field.id] !== undefined) {
          setValue(field.id, defaultValues[field.id], {
            shouldValidate: true,
            shouldDirty: false,
            shouldTouch: false
          });
          setFormValues(prev => ({
            ...prev,
            [field.id]: defaultValues[field.id]
          }));
        }
      }
    };

    // Register all fields
    if (sections.length > 0) {
      sections.forEach(section => {
        section.fields.forEach(registerField);
      });
    } else {
      fields.forEach(registerField);
    }
  }, [register, fields, sections, defaultValues]);

  const handleFormSubmit = async (data: any) => {
    if (!onSubmit) return;

    try {
      setIsSubmitting(true);
      // Validate all required fields
      const isValid = await trigger();
      if (!isValid) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "Please fill in all required fields.",
        });
        setIsSubmitting(false);
        return;
      }

      // Process the data before submission
      const processedData = Object.entries(data).reduce((acc, [key, value]) => {
        try {
          // Check if this is a DOB field
          const isDobField = 
            (sections.length > 0 && sections.some(section => 
              section.fields.some(field => field.id === key && field.type === 'dob')
            )) || 
            fields.some(field => field.id === key && field.type === 'dob');
          
          // Check if this is a date field
          const isDateField = 
            (sections.length > 0 && sections.some(section => 
              section.fields.some(field => field.id === key && field.type === 'date')
            )) || 
            fields.some(field => field.id === key && field.type === 'date');

          // Convert Date objects to ISO strings
          if (value instanceof Date) {
            // For DOB fields, ensure we set the time to noon to avoid timezone issues
            if (isDobField) {
              const normalizedDate = new Date(value);
              normalizedDate.setHours(12, 0, 0, 0);
              acc[key] = normalizedDate.toISOString();
            } else {
              acc[key] = value.toISOString();
            }
          } 
          // Ensure date values are properly formatted if they're strings
          else if (typeof value === 'string' && value && (isDobField || isDateField)) {
            try {
              // If it's already an ISO string, keep it
              if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
                acc[key] = value;
              } else {
                // Otherwise, try to parse it as a date
                const dateValue = new Date(value);
                if (!isNaN(dateValue.getTime())) {
                  // Normalize the time to noon for DOB fields
                  if (isDobField) {
                    dateValue.setHours(12, 0, 0, 0);
                  }
                  acc[key] = dateValue.toISOString();
                } else {
                  acc[key] = value; // Keep original if parsing fails
                }
              }
            } catch (error) {
              console.error(`Error processing date field ${key}:`, error);
              acc[key] = value; // Keep original if parsing fails
            }
          } 
          // For date fields that are null/undefined, set to null
          else if ((isDobField || isDateField) && (value === null || value === undefined)) {
            acc[key] = null;
          } 
          // Handle array values (from checkboxes)
          else if (Array.isArray(value)) {
            // Make sure we have a clean array with no undefined/null values
            acc[key] = value.filter(item => item !== null && item !== undefined);
          }
          // Handle all other values
          else {
            acc[key] = value;
          }
        } catch (error) {
          console.error(`Error processing field ${key}:`, error);
          // In case of error, keep the original value
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, any>);

      // Call the onSubmit handler with the processed data
      await onSubmit(processedData);
    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        variant: "destructive",
        title: "Submission Error",
        description: "There was an error submitting the form. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addField = (sectionId?: string) => {
    if (!onChange) return;
    const newField: FormField = {
      id: Math.random().toString(36).substr(2, 9),
      type: newFieldType,
      label: "",
      placeholder: "",
      required: false,
      inUseByRules: false,
      ...(newFieldType === "select" || newFieldType === "radio" || newFieldType === "checkbox" ? { options: [""] } : {}),
    };

    if (sections.length > 0 && sectionId) {
      const newSections = sections.map(section => {
        if (section.id === sectionId) {
          return {
            ...section,
            fields: [...section.fields, newField]
          };
        }
        return section;
      });
      onChange({ fields, sections: newSections, isMultiPage });
    } else {
      onChange({ fields: [...fields, newField], sections, isMultiPage });
    }
  };

  const addSection = () => {
    if (!onChange) return;
    const newSection: FormSection = {
      id: Math.random().toString(36).substr(2, 9),
      title: "New Section",
      fields: []
    };
    onChange({ fields, sections: [...sections, newSection], isMultiPage });
    setActiveSection(newSection.id);
  };

  const updateSection = (sectionId: string, updates: Partial<FormSection>) => {
    if (!onChange) return;
    const newSections = sections.map(section => 
      section.id === sectionId ? { ...section, ...updates } : section
    );
    onChange({ fields, sections: newSections, isMultiPage });
  };

  const removeSection = (sectionId: string) => {
    if (!onChange || sections.length <= 1) return;
    const newSections = sections.filter(section => section.id !== sectionId);
    onChange({ fields, sections: newSections, isMultiPage });
    setActiveSection(newSections[0].id);
  };

  const updateField = (index: number, updates: Partial<FormField>, sectionId?: string) => {
    if (!onChange) return;

    // Validate conditional logic field ID if present
    if (updates.conditionalLogic && updates.conditionalLogic !== null) {
      const availableFields = getFieldsForConditions(updates.id || '', sectionId);
      const validFieldId = availableFields.find(f => f.id === updates.conditionalLogic?.fieldId);
      
      if (!validFieldId) {
        return; // Don't update if the field ID is invalid
      }
    }

    // Check if we're explicitly removing conditionalLogic by setting it to undefined
    const isRemovingConditionalLogic = updates.conditionalLogic === undefined && 'conditionalLogic' in updates;

    if (sections.length > 0 && sectionId) {
      const newSections = sections.map(section => {
        if (section.id === sectionId) {
          const newFields = [...section.fields];
          if (isRemovingConditionalLogic) {
            // Create a completely new field without conditionalLogic
            const { conditionalLogic, ...cleanField } = newFields[index];
            newFields[index] = {
              ...cleanField,
              ...updates,
              conditionalLogic: undefined // Explicitly set to undefined to remove it
            };
          } else {
            newFields[index] = {
              ...newFields[index],
              ...updates
            };
          }
          return {
            ...section,
            fields: newFields
          };
        }
        return section;
      });
      onChange({ fields, sections: newSections, isMultiPage });
    } else {
      const newFields = [...fields];
      if (isRemovingConditionalLogic) {
        // Create a completely new field without conditionalLogic
        const { conditionalLogic, ...cleanField } = newFields[index];
        newFields[index] = {
          ...cleanField,
          ...updates,
          conditionalLogic: undefined // Explicitly set to undefined to remove it
        };
      } else {
        newFields[index] = {
          ...newFields[index],
          ...updates
        };
      }
      onChange({ fields: newFields, sections, isMultiPage });
    }
  };

  const [fieldToDelete, setFieldToDelete] = useState<{index: number, sectionId?: string, field: FormField} | null>(null);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);

  const confirmFieldDeletion = (index: number, sectionId?: string) => {
    // Find the field to delete
    const field = sectionId 
      ? sections.find(s => s.id === sectionId)?.fields[index]
      : fields[index];
    
    if (!field) return;
    
    // If the field is used in rules, show a warning
    if (field.inUseByRules) {
      setFieldToDelete({ index, sectionId, field });
      setShowDeleteWarning(true);
    } else {
      // Otherwise, delete it immediately
      removeField(index, sectionId);
    }
  };

  const removeField = (index: number, sectionId?: string) => {
    if (!onChange) return;

    if (sections.length > 0 && sectionId) {
      const newSections = sections.map(section => {
        if (section.id === sectionId) {
          const newFields = [...section.fields];
          newFields.splice(index, 1);
          return {
            ...section,
            fields: newFields
          };
        }
        return section;
      });
      onChange({ fields, sections: newSections, isMultiPage });
    } else {
      const newFields = [...fields];
      newFields.splice(index, 1);
      onChange({ fields: newFields, sections, isMultiPage });
    }
    
    // Reset the field to delete
    setFieldToDelete(null);
    setShowDeleteWarning(false);
  };

  const handleDragEnd = (result: any) => {
    if (!onChange || !result.destination) return;

    try {
      if (sections.length > 0) {
        const sourceSection = sections.find(s => s.id === result.source.droppableId);
        const destSection = sections.find(s => s.id === result.destination.droppableId);
        
        if (!sourceSection || !destSection) return;

        // Create deep copies to avoid mutation issues
        const newSections = JSON.parse(JSON.stringify(sections));
        const newSourceSection = newSections.find((s: FormSection) => s.id === sourceSection.id);
        const newDestSection = newSections.find((s: FormSection) => s.id === destSection.id);
        
        if (!newSourceSection || !newDestSection) return;
        
        // Get the field being moved
        const [movedField] = newSourceSection.fields.splice(result.source.index, 1);
        
        // Add it to the destination
        newDestSection.fields.splice(result.destination.index, 0, movedField);
        
        onChange({ fields, sections: newSections, isMultiPage });
      } else {
        // For single section forms
        const newFields = [...fields];
        const [reorderedItem] = newFields.splice(result.source.index, 1);
        newFields.splice(result.destination.index, 0, reorderedItem);
        onChange({ fields: newFields, sections, isMultiPage });
      }
    } catch (error) {
      console.error('Error during drag and drop:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "There was an error reordering the fields. Please try again.",
      });
    }
  };

  const renderField = (field: FormField) => {
    const props = {
      id: field.id,
      placeholder: field.placeholder,
      ...register(field.id, { 
        required: field.required ? "This field is required" : false,
        validate: field.validation || undefined
      })
    };

    switch (field.type) {
      case 'dob':
        return (
          <div>
            <DobPicker
              date={getValues(field.id) ? new Date(getValues(field.id)) : undefined}
              setDate={(date) => {
                try {
                  // Ensure we're setting a valid ISO string or null
                  let isoString = null;
                  
                  if (date) {
                    // Create a normalized date at noon to avoid timezone issues
                    const normalizedDate = new Date(date);
                    normalizedDate.setHours(12, 0, 0, 0);
                    isoString = normalizedDate.toISOString();
                  }
                  
                  // Set the value in the form
                  setValue(field.id, isoString, { 
                    shouldValidate: true,
                    shouldDirty: true,
                    shouldTouch: true
                  });
                  
                  // Update the form value state for conditional logic
                  updateFormValue(field.id, isoString);
                  
                  // Trigger validation
                  trigger(field.id);
                } catch (error) {
                  console.error(`Error setting DOB field ${field.id}:`, error);
                  // Set to null as fallback
                  setValue(field.id, null);
                  updateFormValue(field.id, null);
                }
              }}
              required={field.required}
              className={cn(errors[field.id] && "border-red-500")}
            />
            {errors[field.id] && (
              <p className="text-red-500 text-sm mt-1">
                {getErrorMessage(errors[field.id])}
              </p>
            )}
          </div>
        );
      case 'date':
        return (
          <div>
            <DateTimePicker
              date={getValues(field.id) ? new Date(getValues(field.id)) : undefined}
              setDate={(date) => {
                try {
                  const isoString = date ? date.toISOString() : null;
                  setValue(field.id, isoString, { 
                    shouldValidate: true,
                    shouldDirty: true,
                    shouldTouch: true
                  });
                  updateFormValue(field.id, isoString);
                  trigger(field.id);
                } catch (error) {
                  console.error(`Error setting date field ${field.id}:`, error);
                  // Set to null as fallback
                  setValue(field.id, null);
                  updateFormValue(field.id, null);
                }
              }}
              excludeTime={field.excludeTime}
              required={field.required}
              className={cn(errors[field.id] && "border-red-500")}
            />
            {errors[field.id] && (
              <p className="text-red-500 text-sm mt-1">
                {getErrorMessage(errors[field.id])}
              </p>
            )}
          </div>
        );
      case 'textarea':
        return (
          <div>
            <Textarea 
              {...props} 
              onChange={(e) => {
                if (props.onChange) {
                  props.onChange(e);
                }
                updateFormValue(field.id, e.target.value);
              }}
            />
          </div>
        );
      case 'select':
        return (
          <div>
            <Select
              value={getValues(field.id) || ''}
              onValueChange={(value) => {
                setValue(field.id, value, { 
                  shouldValidate: true,
                  shouldDirty: true,
                  shouldTouch: true
                });
                updateFormValue(field.id, value);
                trigger(field.id);
              }}
            >
              <SelectTrigger className={cn(errors[field.id] && "border-red-500")}>
                <SelectValue placeholder={field.placeholder} />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(field.options) ? (
                  field.options.map((option) => (
                    <SelectItem 
                      key={typeof option === 'object' ? option.value || option.id : option} 
                      value={typeof option === 'object' ? option.value || option.id : option}
                    >
                      {typeof option === 'object' ? option.label || option.value || option.id : option}
                    </SelectItem>
                  ))
                ) : typeof field.options === 'object' && field.options !== null ? (
                  // Handle case where options is an object but not an array
                  Object.entries(field.options).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {String(value)}
                    </SelectItem>
                  ))
                ) : (
                  // Fallback for when options is not defined or not in expected format
                  <SelectItem value="no-options" disabled>No options available</SelectItem>
                )}
              </SelectContent>
            </Select>
            {errors[field.id] && (
              <p className="text-red-500 text-sm mt-1">
                {getErrorMessage(errors[field.id])}
              </p>
            )}
          </div>
        );
      case 'checkbox':
        return (
          <div className="space-y-2">
            {field.options?.map((option, i) => (
              <div key={i} className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id={`${field.id}-option-${i}`}
                  value={option}
                  checked={Array.isArray(getValues(field.id)) && getValues(field.id)?.includes(option)}
                  onChange={(e) => {
                    // Handle multi-select checkboxes
                    const currentValues = Array.isArray(getValues(field.id)) ? getValues(field.id) : [];
                    let newValues;
                    
                    if (e.target.checked) {
                      // Add value to array if checked
                      newValues = [...currentValues, option];
                    } else {
                      // Remove value from array if unchecked
                      newValues = currentValues.filter((value: string) => value !== option);
                    }
                    
                    setValue(field.id, newValues, { 
                      shouldValidate: true,
                      shouldDirty: true,
                      shouldTouch: true
                    });
                    updateFormValue(field.id, newValues);
                  }}
                />
                <Label htmlFor={`${field.id}-option-${i}`}>{option}</Label>
              </div>
            ))}
            {errors[field.id] && (
              <p className="text-red-500 text-sm mt-1">
                {getErrorMessage(errors[field.id])}
              </p>
            )}
          </div>
        );
      case 'radio':
        return field.options?.map((option, i) => (
          <div key={i} className="flex items-center space-x-2">
            <input 
              type="radio" 
              value={option} 
              {...props} 
              onChange={(e) => {
                if (props.onChange) {
                  props.onChange(e);
                }
                updateFormValue(field.id, e.target.value);
              }}
            />
            <Label>{option}</Label>
          </div>
        ));
      default:
        return (
          <div>
            <Input 
              type={field.type} 
              {...register(field.id, {
                required: field.required ? "This field is required" : false,
                validate: field.validation
              })}
              className={cn(errors[field.id] && "border-red-500")}
              onChange={(e) => {
                if (props.onChange) {
                  props.onChange(e);
                }
                updateFormValue(field.id, e.target.value);
              }}
            />
            {errors[field.id] && (
              <p className="text-red-500 text-sm mt-1">
                {getErrorMessage(errors[field.id])}
              </p>
            )}
          </div>
        );
    }
  };

  const getMappingOptions = () => {
    const commonOptions = [
      { value: "none", label: "None" },
      { value: "name", label: "Name" },
      { value: "email", label: "Email" },
      { value: "phone", label: "Phone" },
    ];

    const bookingOptions = [
      { value: "datetime", label: "Event Date & Time (Combined)" },
      { value: "date", label: "Event Date" },
      { value: "time", label: "Event Time" },
      { value: "location", label: "Location" },
      { value: "location_office", label: "Office Location" },
    ];

    // Always return all options for both form types
    return [...commonOptions, ...bookingOptions];
  };

  const handleSectionChange = (sectionId: string) => {
    setActiveSection(sectionId);
  };

  const updateFormValue = (fieldId: string, value: any) => {
    // Update form values state for conditional logic
    setFormValues(prev => ({
      ...prev,
      [fieldId]: value
    }));
    
    // Also update the form
    setValue(fieldId, value, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true
    });
  };

  // Function to evaluate if a field should be visible based on conditional logic
  const shouldShowField = (field: FormField): boolean => {
    if (!field.conditionalLogic) {
      return true;
    }

    // Handle conditionalLogic that might be a string (JSON) or an object
    let conditionalLogic;
    if (typeof field.conditionalLogic === 'string') {
      try {
        conditionalLogic = JSON.parse(field.conditionalLogic);
      } catch (error) {
        console.error('Error parsing conditionalLogic:', error);
        return true; // Show the field if we can't parse the conditions
      }
    } else {
      conditionalLogic = field.conditionalLogic;
    }

    const { fieldId, operator, value, action } = conditionalLogic;
    const currentValue = formValues[fieldId];

    // If the field we depend on doesn't have a value yet, default behavior based on action
    if (currentValue === undefined || currentValue === null || currentValue === '') {
      return action === 'hide';
    }

    let shouldShow = false;
    
    // Handle different value types appropriately
    if (typeof currentValue === 'string') {
      switch (operator) {
        case 'equals':
          shouldShow = currentValue.toLowerCase() === value.toLowerCase();
          break;
        case 'notEquals':
          shouldShow = currentValue.toLowerCase() !== value.toLowerCase();
          break;
        case 'contains':
          shouldShow = currentValue.toLowerCase().includes(value.toLowerCase());
          break;
        case 'notContains':
          shouldShow = !currentValue.toLowerCase().includes(value.toLowerCase());
          break;
        default:
          shouldShow = false;
      }
    } else if (Array.isArray(currentValue)) {
      // Handle array values (like from checkboxes)
      switch (operator) {
        case 'equals':
          shouldShow = currentValue.some(item => 
            typeof item === 'string' && item.toLowerCase() === value.toLowerCase()
          );
          break;
        case 'notEquals':
          shouldShow = !currentValue.some(item => 
            typeof item === 'string' && item.toLowerCase() === value.toLowerCase()
          );
          break;
        case 'contains':
          shouldShow = currentValue.some(item => 
            typeof item === 'string' && item.toLowerCase().includes(value.toLowerCase())
          );
          break;
        case 'notContains':
          shouldShow = !currentValue.some(item => 
            typeof item === 'string' && item.toLowerCase().includes(value.toLowerCase())
          );
          break;
        default:
          shouldShow = false;
      }
    } else if (currentValue instanceof Date) {
      // Handle date values
      const dateValue = new Date(value);
      switch (operator) {
        case 'equals':
          shouldShow = currentValue.toDateString() === dateValue.toDateString();
          break;
        case 'notEquals':
          shouldShow = currentValue.toDateString() !== dateValue.toDateString();
          break;
        case 'before':
          shouldShow = currentValue < dateValue;
          break;
        case 'after':
          shouldShow = currentValue > dateValue;
          break;
        default:
          shouldShow = false;
      }
    } else if (typeof currentValue === 'number') {
      // Handle number values
      const numValue = parseFloat(value);
      switch (operator) {
        case 'equals':
          shouldShow = currentValue === numValue;
          break;
        case 'notEquals':
          shouldShow = currentValue !== numValue;
          break;
        case 'greaterThan':
          shouldShow = currentValue > numValue;
          break;
        case 'lessThan':
          shouldShow = currentValue < numValue;
          break;
        default:
          shouldShow = false;
      }
    } else {
      // For other types, try string comparison as fallback
      try {
        const strCurrentValue = String(currentValue).toLowerCase();
        const strValue = String(value).toLowerCase();
        
        switch (operator) {
          case 'equals':
            shouldShow = strCurrentValue === strValue;
            break;
          case 'notEquals':
            shouldShow = strCurrentValue !== strValue;
            break;
          case 'contains':
            shouldShow = strCurrentValue.includes(strValue);
            break;
          case 'notContains':
            shouldShow = !strCurrentValue.includes(strValue);
            break;
          default:
            shouldShow = false;
        }
      } catch (error) {
        console.error('Error comparing values in conditional logic:', error);
        return true; // Show the field if comparison fails
      }
    }

    return action === 'show' ? shouldShow : !shouldShow;
  };

  // Helper function to get error message
  const getErrorMessage = (error: FieldError | Merge<FieldError, FieldErrorsImpl<any>> | undefined): string => {
    if (!error) return "This field is required";
    if (typeof error.message === 'string') return error.message;
    return "This field is required";
  };

  // Helper function to render error message
  const renderErrorMessage = (error: FieldError | Merge<FieldError, FieldErrorsImpl<any>> | undefined) => (
    <p className="text-red-500 text-sm mt-1">
      {getErrorMessage(error)}
    </p>
  );

  // Format field values for display, especially for arrays from checkboxes
  const formatFieldValue = (value: any): string => {
    if (value === undefined || value === null) {
      return 'N/A';
    }
    
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return 'None selected';
      }
      // Format as bullet points list
      return value.map(item => `• ${item}`).join('\n');
    }
    
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    return String(value);
  };

  if (viewOnly) {
    if (sections.length > 0) {
      return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
          {isMultiPage ? (
            <Tabs 
              value={activeSection} 
              onValueChange={handleSectionChange}
              className="w-full"
            >
              {/* Modern step indicator */}
              <StepIndicator
                steps={sections.map(section => ({ id: section.id, title: section.title }))}
                activeStep={sections.findIndex(s => s.id === activeSection)}
                allowStepNavigation={true}
                onStepClick={(index) => {
                  if (index !== 0 && index <= sections.findIndex(s => s.id === activeSection) + 1) {
                    handleSectionChange(sections[index].id);
                  }
                }}
                showStepNumbers={true}
              />
              
              {/* Hidden tabs list for accessibility */}
              <div className="sr-only">
                <TabsList>
                  {sections.map((section) => (
                    <TabsTrigger 
                      key={section.id} 
                      value={section.id}
                    >
                      {section.title}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              {sections.map((section, index) => (
                <TabsContent 
                  key={section.id} 
                  value={section.id}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">{section.title}</h3>
                    {section.description && (
                      <p className="text-muted-foreground">{section.description}</p>
                    )}
                  </div>
                  {section.fields.map((field) => (
                    <div 
                      key={field.id} 
                      className="space-y-2"
                      style={{ display: shouldShowField(field) ? 'block' : 'none' }}
                    >
                      <Label>
                        {field.label}
                        {field.required && <span className="text-red-500">*</span>}
                      </Label>
                      {renderField(field)}
                      {errors[field.id] && renderErrorMessage(errors[field.id])}
                    </div>
                  ))}
                  <div className="flex justify-between mt-6">
                    {index > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const prevSection = sections[index - 1];
                          if (prevSection) {
                            handleSectionChange(prevSection.id);
                          }
                        }}
                      >
                        Previous
                      </Button>
                    )}
                    <div className="ml-auto">
                      {index < sections.length - 1 ? (
                        <Button
                          type="button"
                          onClick={async () => {
                            try {
                              // Get current section fields that are visible and required
                              const currentSectionFields = section.fields.filter(f => 
                                f.required && shouldShowField(f)
                              );
                              let isValid = true;

                              // Check each required field
                              for (const field of currentSectionFields) {
                                const value = getValues(field.id);
                                const fieldValid = await trigger(field.id);
                                
                                if (!fieldValid) {
                                  isValid = false;
                                  // Mark field as touched to show error
                                  setValue(field.id, value, {
                                    shouldValidate: true,
                                    shouldDirty: true,
                                    shouldTouch: true
                                  });
                                }
                              }

                              if (!isValid) {
                                toast({
                                  variant: "destructive",
                                  title: "Required Fields Missing",
                                  description: "Please fill in all required fields before proceeding.",
                                });
                                return;
                              }

                              // If validation passes, move to next section
                              const nextSection = sections[index + 1];
                              if (nextSection) {
                                handleSectionChange(nextSection.id);
                              }
                            } catch (error) {
                              console.error('Error during validation:', error);
                              toast({
                                variant: "destructive",
                                title: "Error",
                                description: "An error occurred while validating the form.",
                              });
                            }
                          }}
                        >
                          Next
                        </Button>
                      ) : (
                        onSubmit && <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? "Submitting..." : "Submit"}
                        </Button>
                      )}
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            sections.map((section) => (
              <div key={section.id} className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">{section.title}</h3>
                  {section.description && (
                    <p className="text-muted-foreground">{section.description}</p>
                  )}
                </div>
                {section.fields.map((field) => (
                  <div 
                    key={field.id} 
                    className="space-y-2"
                    style={{ display: shouldShowField(field) ? 'block' : 'none' }}
                  >
                    <Label>
                      {field.label}
                      {field.required && <span className="text-red-500">*</span>}
                    </Label>
                    {renderField(field)}
                    {errors[field.id] && renderErrorMessage(errors[field.id])}
                  </div>
                ))}
              </div>
            ))
          )}
        </form>
      );
    }

    return (
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        {fields.map((field) => (
          <div 
            key={field.id} 
            className="space-y-2"
            style={{ display: shouldShowField(field) ? 'block' : 'none' }}
          >
            <Label>
              {field.label}
              {field.required && <span className="text-red-500">*</span>}
            </Label>
            {renderField(field)}
            {errors[field.id] && renderErrorMessage(errors[field.id])}
          </div>
        ))}
        {onSubmit && (
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        )}
      </form>
    );
  }

  const getFieldsForConditions = (currentFieldId: string, sectionId?: string) => {
    if (sections.length > 0 && sectionId) {
      const availableFields: {id: string, label: string, type: string, options?: string[]}[] = [];
      sections.forEach(section => {
        section.fields.forEach(field => {
          if (field.id !== currentFieldId) {
            availableFields.push({
              id: field.id,
              label: field.label || 'Unnamed field',
              type: field.type,
              options: field.options
            });
          }
        });
      });
      return availableFields;
    } else {
      return fields.filter(f => f.id !== currentFieldId).map(f => ({
        id: f.id,
        label: f.label || 'Unnamed field',
        type: f.type,
        options: f.options
      }));
    }
  };

  const getOperatorsForFieldType = (fieldType: string) => {
    switch (fieldType) {
      case 'select':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'notEquals', label: 'Does not equal' }
        ];
      case 'text':
      case 'textarea':
      case 'email':
      case 'phone':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'notEquals', label: 'Does not equal' },
          { value: 'contains', label: 'Contains' },
          { value: 'notContains', label: 'Does not contain' }
        ];
      case 'number':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'notEquals', label: 'Does not equal' },
          { value: 'greaterThan', label: 'Greater than' },
          { value: 'lessThan', label: 'Less than' }
        ];
      case 'date':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'notEquals', label: 'Does not equal' },
          { value: 'before', label: 'Before' },
          { value: 'after', label: 'After' }
        ];
      default:
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'notEquals', label: 'Does not equal' }
        ];
    }
  };

  const renderConditionValueInput = (field: FormField, condition: ConditionalLogic, index: number, sectionId?: string) => {
    const triggerField = getFieldsForConditions(field.id, sectionId).find(f => f.id === condition.fieldId);
    if (!triggerField) return null;

    const handleValueChange = (value: string) => {
      const updatedLogic: ConditionalLogic = {
        ...condition,
        value
      };
      updateField(index, { conditionalLogic: updatedLogic }, sectionId);
    };

    switch (triggerField.type) {
      case 'select':
        return (
          <Select
            value={condition.value}
            onValueChange={handleValueChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select value" />
            </SelectTrigger>
            <SelectContent>
              {triggerField.options?.map(option => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'date':
        return (
          <Input
            type="date"
            value={condition.value}
            onChange={(e) => handleValueChange(e.target.value)}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={condition.value}
            onChange={(e) => handleValueChange(e.target.value)}
          />
        );
      default:
        return (
          <Input
            type="text"
            value={condition.value}
            onChange={(e) => handleValueChange(e.target.value)}
          />
        );
    }
  };

  const renderFieldEditor = (field: FormField, index: number, sectionId?: string) => {
    const selectFields = getFieldsForConditions(field.id, sectionId);
    
    return (
      <Card className="mb-4">
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <div className="cursor-move">
            <GripVertical className="h-5 w-5" />
          </div>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {field.type.charAt(0).toUpperCase() + field.type.slice(1)} Field
            {field.inUseByRules && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Used in Rules
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => confirmFieldDeletion(index, sectionId)}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor={`${field.id}-label`}>Label</Label>
              <Input
                id={`${field.id}-label`}
                value={field.label}
                onChange={(e) =>
                  updateField(index, { label: e.target.value }, sectionId)
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${field.id}-placeholder`}>
                Placeholder
              </Label>
              <Input
                id={`${field.id}-placeholder`}
                value={field.placeholder}
                onChange={(e) =>
                  updateField(index, { placeholder: e.target.value }, sectionId)
                }
              />
            </div>
            {(field.type === "select" || field.type === "radio" || field.type === "checkbox") && (
              <div className="grid gap-2">
                <Label>Options</Label>
                {(field.options || []).map((option, optionIndex) => (
                  <div key={`${field.id}-option-${optionIndex}`} className="flex gap-2">
                    <Input
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...(field.options || [])];
                        newOptions[optionIndex] = e.target.value;
                        updateField(index, { options: newOptions }, sectionId);
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => {
                        const newOptions = [...(field.options || [])];
                        newOptions.splice(optionIndex, 1);
                        updateField(index, { options: newOptions }, sectionId);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const newOptions = [...(field.options || []), ""];
                    updateField(index, { options: newOptions }, sectionId);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Option
                </Button>
              </div>
            )}
            {field.type === "date" && (
              <div className="flex items-center space-x-2">
                <Switch
                  id={`${field.id}-exclude-time`}
                  checked={field.excludeTime}
                  onCheckedChange={(checked) =>
                    updateField(index, { excludeTime: checked }, sectionId)
                  }
                />
                <Label htmlFor={`${field.id}-exclude-time`}>Exclude Time</Label>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Switch
                id={`${field.id}-required`}
                checked={field.required}
                onCheckedChange={(checked) =>
                  updateField(index, { required: checked }, sectionId)
                }
              />
              <Label htmlFor={`${field.id}-required`}>Required</Label>
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${field.id}-mapping`}>Map as Field</Label>
              <Select
                value={field.mapping || 'none'}
                onValueChange={(value) =>
                  updateField(index, { 
                    mapping: value === 'none' ? null : value as FormField['mapping']
                  }, sectionId)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select mapping" />
                </SelectTrigger>
                <SelectContent>
                  {getMappingOptions().map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Conditional Logic Section */}
            <div className="border-t pt-4 mt-4">
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Conditional Logic</Label>
                    <p className="text-sm text-muted-foreground">
                      Show or hide this field based on other field values
                    </p>
                  </div>
                  <Switch
                    id={`${field.id}-conditional-enabled`}
                    checked={!!field.conditionalLogic}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        const availableFields = getFieldsForConditions(field.id, sectionId);
                        const defaultField = availableFields[0];
                        const defaultOperators = getOperatorsForFieldType(defaultField?.type || 'text');
                        
                        if (defaultField) {
                          // Initialize with default values
                          const defaultCondition: ConditionalLogic = {
                            fieldId: defaultField.id,
                            operator: defaultOperators[0].value as ConditionalLogic['operator'],
                            value: defaultField.options?.[0] || '',
                            action: 'show'
                          };
                          updateField(index, { conditionalLogic: defaultCondition }, sectionId);
                        }
                      } else {
                        // When turning off, directly set conditionalLogic to undefined instead of null
                        updateField(index, { conditionalLogic: undefined }, sectionId);
                      }
                    }}
                  />
                </div>
                
                {field.conditionalLogic && (
                  <div className="grid gap-3 pl-2 border-l-2 border-muted-foreground/20">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Action</Label>
                        <Select
                          value={field.conditionalLogic.action}
                          onValueChange={(value: 'show' | 'hide') => {
                            const updatedLogic: ConditionalLogic = {
                              ...field.conditionalLogic!,
                              action: value
                            };
                            updateField(index, { conditionalLogic: updatedLogic }, sectionId);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select action" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="show">Show this field</SelectItem>
                            <SelectItem value="hide">Hide this field</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>When</Label>
                        <Select
                          value={field.conditionalLogic.fieldId}
                          onValueChange={(value) => {
                            const selectedField = getFieldsForConditions(field.id, sectionId).find(f => f.id === value);
                            if (selectedField) {
                              const operators = getOperatorsForFieldType(selectedField.type);
                              const updatedLogic: ConditionalLogic = {
                                ...field.conditionalLogic!,
                                fieldId: value,
                                operator: operators[0].value as ConditionalLogic['operator'],
                                value: selectedField.options?.[0] || ''
                              };
                              updateField(index, { conditionalLogic: updatedLogic }, sectionId);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select field" />
                          </SelectTrigger>
                          <SelectContent>
                            {getFieldsForConditions(field.id, sectionId).map(f => (
                              <SelectItem key={f.id} value={f.id}>
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Operator</Label>
                        <Select
                          value={field.conditionalLogic.operator}
                          onValueChange={(value) => {
                            const updatedLogic: ConditionalLogic = {
                              ...field.conditionalLogic!,
                              operator: value as ConditionalLogic['operator']
                            };
                            updateField(index, { conditionalLogic: updatedLogic }, sectionId);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select operator" />
                          </SelectTrigger>
                          <SelectContent>
                            {getOperatorsForFieldType(
                              getFieldsForConditions(field.id, sectionId).find(f => f.id === field.conditionalLogic!.fieldId)?.type || 'text'
                            ).map(operator => (
                              <SelectItem key={operator.value} value={operator.value}>
                                {operator.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Value</Label>
                        {renderConditionValueInput(field, field.conditionalLogic, index, sectionId)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-8">
      {/* Field Deletion Warning Dialog */}
      <AlertDialog open={showDeleteWarning} onOpenChange={setShowDeleteWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Warning: Field Used in Rules
            </AlertDialogTitle>
            <AlertDialogDescription>
              <p className="mb-2">
                This field is currently used in one or more email rules. Deleting it may break those rules.
              </p>
              <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-md border border-amber-200 dark:border-amber-800 mb-2">
                <p className="font-medium">Field Details:</p>
                <ul className="list-disc list-inside text-sm space-y-1 mt-1">
                  <li><strong>Label:</strong> {fieldToDelete?.field.label}</li>
                  <li><strong>Type:</strong> {fieldToDelete?.field.type}</li>
                  <li><strong>Stable ID:</strong> {fieldToDelete?.field.stableId}</li>
                </ul>
              </div>
              <p>Are you sure you want to delete this field?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => fieldToDelete && removeField(fieldToDelete.index, fieldToDelete.sectionId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="flex items-center justify-end space-x-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="multipage"
            checked={isMultiPage}
            onCheckedChange={(checked) => onChange?.({ fields, sections, isMultiPage: checked })}
          />
          <Label htmlFor="multipage">Multi-page Form</Label>
        </div>
        <Button onClick={() => addSection()} type="button" variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          Add Section
        </Button>
      </div>

      {sections.length > 0 ? (
        <Tabs value={activeSection} onValueChange={handleSectionChange} className="w-full">
          <div className="relative overflow-x-auto pb-1 mb-1">
            <TabsList className="flex w-max min-w-full">
              {sections.map((section, index) => (
                <TabsTrigger key={section.id} value={section.id} className="flex-shrink-0 min-w-[120px]">
                  Section {index + 1}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {sections.map((section) => (
            <TabsContent 
              key={section.id} 
              value={section.id}
              className="space-y-4"
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Input
                        value={section.title}
                        onChange={(e) => updateSection(section.id, { title: e.target.value })}
                        className="text-lg font-medium"
                        placeholder="Section Title"
                      />
                      <Textarea
                        value={section.description}
                        onChange={(e) => updateSection(section.id, { description: e.target.value })}
                        placeholder="Section Description (optional)"
                        className="text-muted-foreground"
                      />
                    </div>
                    {sections.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSection(section.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
              </Card>

              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId={section.id}>
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef}>
                      {section.fields.map((field, index) => (
                        <Draggable
                          key={field.id}
                          draggableId={field.id}
                          index={index}
                        >
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              {renderFieldEditor(field, index, section.id)}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              <Card className="mt-8">
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-4">
                    <Select value={newFieldType} onValueChange={setNewFieldType}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select field type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text Input</SelectItem>
                        <SelectItem value="textarea">Text Area</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="tel">Phone</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="dob">Date of Birth</SelectItem>
                        <SelectItem value="select">Dropdown</SelectItem>
                        <SelectItem value="checkbox">Checkbox</SelectItem>
                        <SelectItem value="radio">Radio Group</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={() => addField(section.id)} type="button" className="min-w-[120px]">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Field
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="fields">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef}>
                  {fields.map((field, index) => (
                    <Draggable
                      key={field.id}
                      draggableId={field.id}
                      index={index}
                    >
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                        >
                          {renderFieldEditor(field, index)}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          <Card className="mt-8">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-4">
                <Select value={newFieldType} onValueChange={setNewFieldType}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select field type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text Input</SelectItem>
                    <SelectItem value="textarea">Text Area</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="tel">Phone</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="dob">Date of Birth</SelectItem>
                    <SelectItem value="select">Dropdown</SelectItem>
                    <SelectItem value="checkbox">Checkbox</SelectItem>
                    <SelectItem value="radio">Radio Group</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => addField()} type="button" className="min-w-[120px]">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Field
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}