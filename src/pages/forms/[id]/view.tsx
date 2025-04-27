/**
 * Public Form View
 * 
 * This component handles the public-facing form view for both inquiry and booking forms.
 * It ensures consistent handling of form submissions and email processing.
 */

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { FormBuilder } from '@/components/FormBuilder';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import type { FormField, FormSection } from '@/components/FormBuilder';
import * as logger from '@/util/logger';
import { startFormSession, updateFormSession, completeFormSession, debounce } from '@/util/form-session-tracker';
import Head from 'next/head';

interface Form {
  id: string;
  name: string;
  description?: string;
  fields: FormField[];
  sections?: FormSection[];
  isMultiPage?: boolean;
  type: 'INQUIRY' | 'BOOKING';
}

interface FormSectionFromAPI {
  id: string;
  title: string;
  description?: string;
  order: number;
  isPage: boolean;
  fields: Array<{
    id: string;
    type: string;
    label: string;
    placeholder?: string;
    helpText?: string;
    required: boolean;
    options?: any;
    validation?: any;
    order: number;
    excludeTime?: boolean;
    mapping?: any;
    conditionalLogic?: {
      fieldId: string;
      operator: 'equals' | 'notEquals' | 'contains' | 'notContains';
      value: string;
      action: 'show' | 'hide';
    };
  }>;
}

interface FormFieldFromAPI {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  options?: any;
  validation?: any;
  order: number;
  excludeTime?: boolean;
  mapping?: any;
  conditionalLogic?: {
    fieldId: string;
    operator: 'equals' | 'notEquals' | 'contains' | 'notContains';
    value: string;
    action: 'show' | 'hide';
  };
}

interface LegacyFormField {
  id: string;
  type?: string;
  label?: string;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  options?: any[];
  validation?: any;
  order?: number;
  excludeTime?: boolean;
  mapping?: any;
  conditionalLogic?: {
    fieldId: string;
    operator: 'equals' | 'notEquals' | 'contains' | 'notContains';
    value: string;
    action: 'show' | 'hide';
  };
}

interface LegacyFormSection {
  id: string;
  title: string;
  description?: string;
  fields: LegacyFormField[];
}

export default function PublicFormView() {
  const router = useRouter();
  const { id, preview, styleId } = router.query;
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const debouncedUpdateSession = useRef(debounce(updateFormSession, 2000)).current;
  const [customCss, setCustomCss] = useState<string>('');
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  // Helper function to add debug logs
  const addDebugLog = (message: string) => {
    const timestamp = new Date().toISOString().substring(11, 19); // HH:MM:SS
    setDebugLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    logger.debug(message, 'forms');
  };

  // Helper function to find field values by mapping or label
  const findFieldValue = (data: any, mapping: string, fields: any[]) => {
    addDebugLog(`Looking for field with mapping '${mapping}'`);
    
    // First try to find by mapping
    for (const field of fields) {
      if (field.mapping === mapping && data[field.id] !== undefined) {
        addDebugLog(`Found field with mapping '${mapping}': ${data[field.id]}`);
        return data[field.id];
      }
    }
    
    // Then try to find by label
    const searchTerm = mapping.toLowerCase();
    for (const field of fields) {
      if (field.label && field.label.toLowerCase().includes(searchTerm) && data[field.id] !== undefined) {
        addDebugLog(`Found field with label containing '${mapping}': ${data[field.id]}`);
        return data[field.id];
      }
    }
    
    addDebugLog(`No field found with mapping or label '${mapping}'`);
    return undefined;
  };

  // Helper function to extract all fields from form sections
  const getAllFields = (form: Form) => {
    if (!form) return [];
    
    if (form.sections && form.sections.length > 0) {
      return form.sections.flatMap(section => section.fields || []);
    }
    
    return form.fields || [];
  };

  // Start a form session when the component mounts
  useEffect(() => {
    if (id && typeof id === 'string') {
      // Start a form session
      const initSession = async () => {
        try {
          // Check for tracking token in URL query parameters
          let trackingToken = null;
          try {
            const { parseTrackingTokenFromQuery } = require('@/util/tracking-links');
            trackingToken = parseTrackingTokenFromQuery(router.query);
            if (trackingToken) {
              addDebugLog(`Found tracking token: ${trackingToken}`);
            }
          } catch (error) {
            console.error('Error parsing tracking token:', error);
            addDebugLog(`Error parsing tracking token: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
          
          const newSessionId = await startFormSession(id, {}, trackingToken);
          if (newSessionId) {
            setSessionId(newSessionId);
            addDebugLog(`Form session started: ${newSessionId}`);
          }
        } catch (error) {
          console.error('Error starting form session:', error);
          addDebugLog(`Error starting form session: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      };
      
      initSession();
    }
  }, [id, router.query]);

  // Fetch form styles
  useEffect(() => {
    if (id) {
      const fetchFormStyles = async () => {
        try {
          // If we're in preview mode and have a styleId, fetch that specific style
          if (preview === 'true' && styleId) {
            const styleResponse = await fetch(`/api/form-styles/${styleId}`);
            if (styleResponse.ok) {
              const styleData = await styleResponse.json();
              setCustomCss(styleData.cssContent || '');
              addDebugLog(`Loaded preview style with ID: ${styleId}`);
              return;
            } else {
              console.error('Error fetching specific form style:', 
                `Status: ${styleResponse.status} ${styleResponse.statusText}`);
              addDebugLog(`Error fetching preview style: ${styleResponse.status} ${styleResponse.statusText}`);
            }
          }
          
          // Otherwise, fetch styles for this form (including global styles)
          const response = await fetch(`/api/form-styles?formId=${id}`);
          if (response.ok) {
            const styles = await response.json();
            if (styles.length > 0) {
              // Combine all applicable styles, with form-specific styles taking precedence over global ones
              const formSpecificStyles = styles.filter((s: any) => !s.isGlobal);
              const globalStyles = styles.filter((s: any) => s.isGlobal);
              
              addDebugLog(`Loaded ${globalStyles.length} global styles and ${formSpecificStyles.length} form-specific styles`);
              
              // Apply global styles first, then form-specific ones
              let combinedCss = '';
              globalStyles.forEach((style: any) => {
                combinedCss += style.cssContent + '\n\n';
              });
              formSpecificStyles.forEach((style: any) => {
                combinedCss += style.cssContent + '\n\n';
              });
              
              setCustomCss(combinedCss);
            } else {
              addDebugLog('No styles found for this form');
            }
          } else {
            console.error('Error fetching form styles:', 
              `Status: ${response.status} ${response.statusText}`);
            addDebugLog(`Error fetching form styles: ${response.status} ${response.statusText}`);
          }
        } catch (error) {
          console.error('Error fetching form styles:', error);
          addDebugLog(`Error fetching form styles: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      };
      
      fetchFormStyles();
    }
  }, [id, preview, styleId]);

  // Fetch form data
  useEffect(() => {
    if (id) {
      addDebugLog(`Fetching form with ID: ${id}`);

      fetch(`/api/forms/${id}`)
        .then(async (res) => {
          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || 'Failed to fetch form');
          }
          return res.json();
        })
        .then((data) => {
          addDebugLog('Received form data');
          
          // Transform formSections into the expected format
          let sections: FormSection[] = [];
          let fields: FormField[] = [];
          let isMultiPage = data.isMultiPage || false;

          addDebugLog(`Form type: ${data.type || 'BOOKING'}`);

          if (data.formSections && data.formSections.length > 0) {
            addDebugLog(`Processing ${data.formSections.length} form sections`);
            sections = data.formSections
              .sort((a: FormSectionFromAPI, b: FormSectionFromAPI) => a.order - b.order)
              .map((section: FormSectionFromAPI) => ({
                id: section.id,
                title: section.title || '',
                description: section.description || '',
                isPage: section.isPage || false,
                fields: Array.isArray(section.fields) ? section.fields
                  .sort((a: FormFieldFromAPI, b: FormFieldFromAPI) => (a.order || 0) - (b.order || 0))
                  .map((field: FormFieldFromAPI) => ({
                    id: field.id,
                    type: field.type || 'text',
                    label: field.label || '',
                    placeholder: field.placeholder || '',
                    helpText: field.helpText || '',
                    required: Boolean(field.required),
                    options: (() => {
                      // Handle different formats of options data
                      if (Array.isArray(field.options)) {
                        return field.options;
                      } else if (typeof field.options === 'string') {
                        try {
                          return JSON.parse(field.options);
                        } catch (e) {
                          console.error(`Error parsing options string for field ${field.id}:`, e);
                          return [];
                        }
                      } else if (field.options && typeof field.options === 'object') {
                        try {
                          return Object.entries(field.options).map(([key, value]) => ({
                            id: key,
                            value: key,
                            label: value as string
                          }));
                        } catch (e) {
                          console.error(`Error converting options object for field ${field.id}:`, e);
                          return [];
                        }
                      }
                      return [];
                    })(),
                    validation: field.validation || null,
                    excludeTime: Boolean(field.excludeTime),
                    mapping: field.mapping || null,
                    conditionalLogic: field.conditionalLogic || null,
                    order: field.order || 0
                  })) : []
              }));
          } else if (data.sections && Array.isArray(data.sections) && data.sections.length > 0) {
            // Legacy support
            addDebugLog('Using legacy sections data');
            sections = data.sections.map((section: LegacyFormSection) => ({
              ...section,
              fields: Array.isArray(section.fields) ? section.fields.map((field: LegacyFormField) => ({
                ...field,
                type: field.type || 'text',
                required: Boolean(field.required),
                options: Array.isArray(field.options) ? field.options : [],
                validation: field.validation || null,
                excludeTime: Boolean(field.excludeTime),
                mapping: field.mapping || null,
                conditionalLogic: field.conditionalLogic || null
              })) : []
            }));
          } else if (data.fields && Array.isArray(data.fields)) {
            // Legacy support
            addDebugLog('Using legacy fields data');
            fields = data.fields.map((field: LegacyFormField) => ({
              ...field,
              type: field.type || 'text',
              required: Boolean(field.required),
              options: Array.isArray(field.options) ? field.options : [],
              validation: field.validation || null,
              excludeTime: Boolean(field.excludeTime),
              mapping: field.mapping || null,
              conditionalLogic: field.conditionalLogic || null
            }));
          }

          setForm({
            id: data.id,
            name: data.name,
            description: data.description || '',
            type: data.type || 'BOOKING',
            isMultiPage,
            sections,
            fields
          });
          setError(null);
          addDebugLog('Form loaded successfully');
        })
        .catch((error) => {
          logger.error('Error fetching form', 'forms', error);
          setError(error.message);
          addDebugLog(`Error loading form: ${error.message}`);
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [id]);

  // Handle form submission
  const handleSubmit = async (data: any) => {
    try {
      // Prevent duplicate submissions
      if (submitting) {
        addDebugLog('Submission already in progress, ignoring duplicate request');
        return;
      }
      
      setSubmitting(true);
      addDebugLog('Starting form submission process');
      
      // Mark the form session as completed
      if (sessionId) {
        await completeFormSession(sessionId, data);
        addDebugLog(`Form session ${sessionId} marked as completed`);
      }
      
      if (!form) {
        throw new Error('Form not loaded');
      }
      
      // Check for tracking token in URL query parameters using the utility function
      try {
        const { parseTrackingTokenFromQuery, extractLeadIdFromToken } = require('@/util/tracking-links');
        
        // Use the utility function to parse the tracking token from the query
        const trackingToken = parseTrackingTokenFromQuery(router.query);
        
        if (trackingToken) {
          addDebugLog(`Found tracking token in URL: ${trackingToken}`);
          // Add tracking token to form data
          data._trackingToken = trackingToken;
          
          // Try to extract source lead ID from tracking token
          const sourceLeadId = extractLeadIdFromToken(trackingToken);
          if (sourceLeadId) {
            addDebugLog(`Extracted source lead ID from token: ${sourceLeadId}`);
            data._sourceLeadId = sourceLeadId;
          }
        }
      } catch (error) {
        console.error('Error processing tracking token:', error);
        addDebugLog(`Error processing tracking token: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      // Extract required fields from the form data
      const allFields = getAllFields(form);
      addDebugLog(`Processing ${allFields.length} form fields`);
      
      // First try direct access to common field names
      let name = data.name || data.fullName || data.full_name;
      let email = data.email || data.emailAddress || data.email_address;
      let date = data.date || data.bookingDate || data.booking_date || data.eventDate || data.event_date;
      let phone = data.phone || data.phoneNumber || data.phone_number;
      
      addDebugLog(`Initial field extraction - Name: ${name || 'not found'}, Email: ${email || 'not found'}, Date: ${date || 'not found'}, Phone: ${phone || 'not found'}`);
      
      // Then try to find by field mapping
      if (!name) name = findFieldValue(data, 'name', allFields);
      if (!email) email = findFieldValue(data, 'email', allFields);
      if (!date) date = findFieldValue(data, 'date', allFields);
      if (!phone) phone = findFieldValue(data, 'phone', allFields);
      
      // For date fields, ensure we have a string that can be parsed as a date
      if (date && date instanceof Date) {
        date = date.toISOString();
      } else if (date && typeof date === 'string') {
        // Try to ensure the date is in ISO format
        try {
          date = new Date(date).toISOString();
        } catch (e) {
          logger.error('Failed to parse date', 'forms', { date, error: e });
          addDebugLog(`Failed to parse date: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }
      
      // Determine if this is an inquiry or booking form
      const isInquiryForm = form.type === 'INQUIRY';
      addDebugLog(`Form type: ${isInquiryForm ? 'INQUIRY' : 'BOOKING'}`);
      
      // Validate required fields based on form type
      if (isInquiryForm) {
        // For inquiry forms, we need name and email
        if (!name || !email || !form?.id) {
          addDebugLog('Missing required fields for inquiry');
          throw new Error('Please fill in all required fields (name and email)');
        }
      } else {
        // For booking forms, we need name, email, and date
        if (!name || !email || !date || !form?.id) {
          addDebugLog('Missing required fields for booking');
          throw new Error('Please fill in all required fields (name, email, and date)');
        }
      }
      
      // Prepare common submission data
      const submissionData: any = {
        formId: form.id,
        name,
        email,
        phone,
        mappedData: data, // Include all form data
      };
      
      // Add date for booking forms
      if (!isInquiryForm && date) {
        submissionData.date = date;
      }
      
      // Determine endpoint and headers based on form type
      const endpoint = isInquiryForm ? '/api/leads' : '/api/bookings';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Add public context header for booking forms
      if (!isInquiryForm) {
        headers['x-public-context'] = 'true';
      }
      
      addDebugLog(`Submitting form data to ${endpoint}`);
      
      // Submit the form data
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        addDebugLog(`Error response from API: ${JSON.stringify(errorData)}`);
        throw new Error(errorData.error || `Failed to create ${isInquiryForm ? 'inquiry' : 'booking'}`);
      }

      const result = await response.json();
      addDebugLog(`${isInquiryForm ? 'Lead' : 'Booking'} created successfully with ID: ${result.id}`);
      
      if (result.submissionId) {
        addDebugLog(`Form submission created with ID: ${result.submissionId}`);
      }

      toast({
        title: "Success",
        description: `Your ${isInquiryForm ? 'inquiry' : 'booking'} has been submitted successfully!`,
      });

      // Redirect to success page with submission ID
      router.push(`/forms/${form.id}/success?${isInquiryForm ? 'leadId' : 'bookingId'}=${result.id}&submissionId=${result.submissionId}`);
    } catch (error) {
      addDebugLog(`Error submitting form: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: "destructive",
      });
      
      // Show more detailed error information in the logs for debugging
      if (error instanceof Error) {
        addDebugLog(`Error details: ${error.stack || 'No stack trace available'}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Card>
          <CardHeader>
            <CardTitle>Form Not Found</CardTitle>
            <CardDescription>The requested form could not be found.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8 form-container">
      <Head>
        {customCss && (
          <style dangerouslySetInnerHTML={{ __html: customCss }} />
        )}
      </Head>
      <Card>
        <CardHeader className="form-header">
          <CardTitle className="form-title">{form.name}</CardTitle>
          {form.description && (
            <CardDescription className="form-description">{form.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="form-content">
          <FormBuilder
            sections={form.sections}
            fields={form.fields}
            isMultiPage={form.isMultiPage}
            onSubmit={handleSubmit}
            viewOnly
            onChange={(values) => {
              // Update form values when fields change
              setFormValues(values);
              
              // Update form session with new values
              if (sessionId) {
                debouncedUpdateSession(sessionId, values);
              }
            }}
          />
          {/* Add submit button for non-multipage forms or when no sections are present */}
          {(!form.isMultiPage || !form.sections || form.sections.length === 0) && (
            <div className="mt-6 form-submit">
              <Button 
                type="button" 
                className="w-full" 
                disabled={submitting}
                onClick={() => {
                  // Log the form values before submission
                  addDebugLog('Submitting form with values');
                  
                  // Call the handleSubmit function with the form values
                  handleSubmit(formValues);
                }}
              >
                {submitting ? "Submitting..." : "Submit"}
              </Button>
            </div>
          )}
          
          {/* Debug panel - only visible in development or when debug=true in query params */}
          {(process.env.NODE_ENV !== 'production' || router.query.debug === 'true') && (
            <div className="mt-8 p-4 border border-gray-200 rounded-md bg-gray-50">
              <h3 className="text-sm font-semibold mb-2">Debug Logs</h3>
              <div className="text-xs font-mono bg-black text-white p-2 rounded h-40 overflow-y-auto">
                {debugLogs.length === 0 ? (
                  <div className="text-gray-400">No logs yet...</div>
                ) : (
                  debugLogs.map((log, i) => (
                    <div key={i} className="mb-1">{log}</div>
                  ))
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
