# Form Analytics System 2.0 Specification

## Overview

The Form Analytics System 2.0 will provide comprehensive tracking and analysis of form interactions, submissions, and email processing. This system will integrate with the Form System 2.0 and Email System 2.0 to create a complete picture of the user journey from form view to submission to email follow-up.

## Directory Structure

```
/lib/analytics2.0/
  /core/
    analyticsTypes.ts           # Type definitions
    analyticsClient.ts          # Client for sending analytics events
    analyticsContext.ts         # Context provider for analytics
  /tracking/
    formTracker.ts              # Form interaction tracking
    pageTracker.ts              # Page view tracking
    conversionTracker.ts        # Conversion tracking
  /events/
    eventDefinitions.ts         # Standardized event definitions
    eventProcessor.ts           # Event processing and enrichment
  /storage/
    analyticsStorage.ts         # Storage for analytics data
  /reporting/
    analyticsReporting.ts       # Reporting and visualization
    dashboardData.ts            # Data preparation for dashboards

/components/analytics2.0/
  AnalyticsProvider.tsx         # Provider component for analytics context
  FormAnalytics.tsx             # Form analytics visualization
  ConversionFunnel.tsx          # Conversion funnel visualization
  AnalyticsDashboard.tsx        # Main analytics dashboard

/pages/api/analytics2.0/
  track-event.ts                # API for tracking events
  get-form-analytics.ts         # API for retrieving form analytics
  get-conversion-data.ts        # API for retrieving conversion data
```

## Core Analytics Types

```typescript
// lib/analytics2.0/core/analyticsTypes.ts

/**
 * Form interaction event types
 */
export type FormEventType = 
  | 'form_view'                 // Form page viewed
  | 'form_start'                // User started filling out form (first interaction)
  | 'form_field_focus'          // User focused on a field
  | 'form_field_blur'           // User left a field
  | 'form_field_change'         // User changed a field value
  | 'form_field_error'          // Field validation error occurred
  | 'form_section_view'         // User viewed a form section (for multi-section forms)
  | 'form_section_complete'     // User completed a form section
  | 'form_submit_attempt'       // User attempted to submit the form
  | 'form_submit_success'       // Form was successfully submitted
  | 'form_submit_error'         // Form submission failed
  | 'form_abandon'              // User abandoned the form
  | 'email_processed'           // Email was processed based on form submission
  | 'email_sent'                // Email was sent based on form submission
  | 'email_opened'              // Email was opened by recipient
  | 'email_clicked'             // Link in email was clicked
  | 'booking_created'           // Booking was created from form
  | 'booking_confirmed'         // Booking was confirmed
  | 'booking_cancelled';        // Booking was cancelled

/**
 * Analytics event
 */
export interface AnalyticsEvent {
  id: string;                   // Unique event ID
  type: FormEventType;          // Event type
  timestamp: Date;              // When the event occurred
  sessionId: string;            // Session ID
  userId?: string;              // User ID if authenticated
  visitorId: string;            // Anonymous visitor ID
  formId?: string;              // Form ID if applicable
  formName?: string;            // Form name if applicable
  formType?: string;            // Form type (INQUIRY, BOOKING, etc.)
  fieldId?: string;             // Field ID if applicable
  fieldName?: string;           // Field name if applicable
  sectionId?: string;           // Section ID if applicable
  sectionName?: string;         // Section name if applicable
  submissionId?: string;        // Submission ID if applicable
  emailId?: string;             // Email ID if applicable
  bookingId?: string;           // Booking ID if applicable
  value?: any;                  // Event value (e.g., field value)
  metadata?: Record<string, any>; // Additional metadata
  source?: string;              // Traffic source
  medium?: string;              // Traffic medium
  campaign?: string;            // Campaign name
  referrer?: string;            // Referrer URL
  userAgent?: string;           // User agent
  ipAddress?: string;           // IP address (hashed if needed for privacy)
  duration?: number;            // Duration in milliseconds (for applicable events)
  previousEventId?: string;     // Previous event in sequence
}

/**
 * Form analytics data
 */
export interface FormAnalyticsData {
  formId: string;
  formName: string;
  formType: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    views: number;              // Total form views
    starts: number;             // Number of users who started the form
    completions: number;        // Number of successful submissions
    conversionRate: number;     // Completion rate (completions / views)
    startToCompletionRate: number; // Start to completion rate
    averageCompletionTime: number; // Average time to complete the form
    abandonmentRate: number;    // Rate at which users abandon the form
    fieldErrorRate: Record<string, number>; // Error rate by field
  };
  funnelStages: Array<{
    name: string;
    count: number;
    dropoff: number;
    dropoffRate: number;
  }>;
  fieldPerformance: Record<string, {
    fieldId: string;
    fieldName: string;
    focusCount: number;
    errorCount: number;
    errorRate: number;
    averageTimeSpent: number;
    abandonmentRate: number;
  }>;
  emailMetrics: {
    processed: number;
    sent: number;
    opened: number;
    clicked: number;
    openRate: number;
    clickRate: number;
  };
  bookingMetrics?: {
    created: number;
    confirmed: number;
    cancelled: number;
    confirmationRate: number;
  };
}
```

## Form Tracking Implementation

```typescript
// lib/analytics2.0/tracking/formTracker.ts
import { v4 as uuidv4 } from 'uuid';
import { AnalyticsEvent, FormEventType } from '../core/analyticsTypes';
import { trackEvent } from './eventProcessor';

/**
 * Track a form event
 */
export function trackFormEvent(
  eventType: FormEventType,
  data: {
    formId: string;
    formName?: string;
    formType?: string;
    fieldId?: string;
    fieldName?: string;
    sectionId?: string;
    sectionName?: string;
    submissionId?: string;
    value?: any;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  const event: AnalyticsEvent = {
    id: uuidv4(),
    type: eventType,
    timestamp: new Date(),
    sessionId: getSessionId(),
    visitorId: getVisitorId(),
    ...data,
    referrer: typeof window !== 'undefined' ? document.referrer : undefined,
    userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
  };
  
  return trackEvent(event);
}

/**
 * Initialize form tracking for a specific form
 */
export function initFormTracking(
  formElement: HTMLFormElement,
  formData: {
    formId: string;
    formName: string;
    formType: string;
  }
): () => void {
  if (!formElement) return () => {};
  
  // Track form view
  trackFormEvent('form_view', formData);
  
  let formStarted = false;
  let lastFocusedField: HTMLElement | null = null;
  let fieldFocusTime: number | null = null;
  
  // Track field interactions
  const fieldElements = formElement.querySelectorAll('input, select, textarea');
  
  const fieldFocusHandlers: Map<HTMLElement, (e: FocusEvent) => void> = new Map();
  const fieldBlurHandlers: Map<HTMLElement, (e: FocusEvent) => void> = new Map();
  const fieldChangeHandlers: Map<HTMLElement, (e: Event) => void> = new Map();
  
  fieldElements.forEach(field => {
    const fieldId = field.id || field.getAttribute('name') || '';
    const fieldName = field.getAttribute('data-field-name') || field.getAttribute('aria-label') || field.getAttribute('placeholder') || fieldId;
    
    // Focus handler
    const focusHandler = (e: FocusEvent) => {
      if (!formStarted) {
        formStarted = true;
        trackFormEvent('form_start', formData);
      }
      
      lastFocusedField = field as HTMLElement;
      fieldFocusTime = Date.now();
      
      trackFormEvent('form_field_focus', {
        ...formData,
        fieldId,
        fieldName,
      });
    };
    
    // Blur handler
    const blurHandler = (e: FocusEvent) => {
      if (fieldFocusTime) {
        const timeSpent = Date.now() - fieldFocusTime;
        
        trackFormEvent('form_field_blur', {
          ...formData,
          fieldId,
          fieldName,
          duration: timeSpent,
          value: (field as HTMLInputElement).value,
        });
        
        fieldFocusTime = null;
      }
      
      lastFocusedField = null;
    };
    
    // Change handler
    const changeHandler = (e: Event) => {
      trackFormEvent('form_field_change', {
        ...formData,
        fieldId,
        fieldName,
        value: (field as HTMLInputElement).value,
      });
    };
    
    field.addEventListener('focus', focusHandler);
    field.addEventListener('blur', blurHandler);
    field.addEventListener('change', changeHandler);
    
    fieldFocusHandlers.set(field as HTMLElement, focusHandler);
    fieldBlurHandlers.set(field as HTMLElement, blurHandler);
    fieldChangeHandlers.set(field as HTMLElement, changeHandler);
  });
  
  // Track form submission
  const submitHandler = (e: Event) => {
    trackFormEvent('form_submit_attempt', formData);
  };
  
  formElement.addEventListener('submit', submitHandler);
  
  // Track form abandonment
  const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
    if (formStarted && !formElement.getAttribute('data-submitted')) {
      trackFormEvent('form_abandon', formData);
    }
  };
  
  window.addEventListener('beforeunload', beforeUnloadHandler);
  
  // Return cleanup function
  return () => {
    fieldElements.forEach(field => {
      const focusHandler = fieldFocusHandlers.get(field as HTMLElement);
      const blurHandler = fieldBlurHandlers.get(field as HTMLElement);
      const changeHandler = fieldChangeHandlers.get(field as HTMLElement);
      
      if (focusHandler) field.removeEventListener('focus', focusHandler);
      if (blurHandler) field.removeEventListener('blur', blurHandler);
      if (changeHandler) field.removeEventListener('change', changeHandler);
    });
    
    formElement.removeEventListener('submit', submitHandler);
    window.removeEventListener('beforeunload', beforeUnloadHandler);
  };
}

// Helper functions
function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  
  let sessionId = sessionStorage.getItem('form_analytics_session_id');
  if (!sessionId) {
    sessionId = uuidv4();
    sessionStorage.setItem('form_analytics_session_id', sessionId);
  }
  return sessionId;
}

function getVisitorId(): string {
  if (typeof window === 'undefined') return '';
  
  let visitorId = localStorage.getItem('form_analytics_visitor_id');
  if (!visitorId) {
    visitorId = uuidv4();
    localStorage.setItem('form_analytics_visitor_id', visitorId);
  }
  return visitorId;
}
```

## React Integration

```typescript
// components/analytics2.0/AnalyticsProvider.tsx
import React, { createContext, useContext, ReactNode } from 'react';
import { trackFormEvent } from '@/lib/analytics2.0/tracking/formTracker';
import { FormEventType } from '@/lib/analytics2.0/core/analyticsTypes';

interface AnalyticsContextValue {
  trackEvent: (eventType: FormEventType, data: any) => void;
  trackFormSubmission: (formId: string, submissionId: string, data: any) => void;
  trackFormCompletion: (formId: string, submissionId: string) => void;
  trackEmailEvent: (emailId: string, eventType: 'processed' | 'sent' | 'opened' | 'clicked') => void;
}

const AnalyticsContext = createContext<AnalyticsContextValue | undefined>(undefined);

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const trackEvent = (eventType: FormEventType, data: any) => {
    return trackFormEvent(eventType, data);
  };
  
  const trackFormSubmission = (formId: string, submissionId: string, data: any) => {
    return trackFormEvent('form_submit_success', {
      formId,
      submissionId,
      metadata: { formData: data }
    });
  };
  
  const trackFormCompletion = (formId: string, submissionId: string) => {
    return trackFormEvent('form_submit_success', {
      formId,
      submissionId
    });
  };
  
  const trackEmailEvent = (emailId: string, eventType: 'processed' | 'sent' | 'opened' | 'clicked') => {
    const eventMap: Record<string, FormEventType> = {
      processed: 'email_processed',
      sent: 'email_sent',
      opened: 'email_opened',
      clicked: 'email_clicked'
    };
    
    return trackFormEvent(eventMap[eventType], {
      emailId
    });
  };
  
  return (
    <AnalyticsContext.Provider value={{
      trackEvent,
      trackFormSubmission,
      trackFormCompletion,
      trackEmailEvent
    }}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
}
```

## Integration with Form System 2.0

```typescript
// components/forms2.0/renderer/FormRenderer.tsx
import { useEffect, useRef } from 'react';
import { useAnalytics } from '@/components/analytics2.0/AnalyticsProvider';
import { initFormTracking } from '@/lib/analytics2.0/tracking/formTracker';

export function FormRenderer2({ form, handlers }: FormRendererProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const analytics = useAnalytics();
  
  // Initialize form tracking
  useEffect(() => {
    if (formRef.current) {
      const cleanup = initFormTracking(formRef.current, {
        formId: form.id,
        formName: form.title,
        formType: form.type || 'INQUIRY'
      });
      
      return cleanup;
    }
  }, [form]);
  
  const handleSubmit = async (values: Record<string, any>) => {
    try {
      // Track submission attempt
      analytics.trackEvent('form_submit_attempt', {
        formId: form.id,
        formName: form.title,
        formType: form.type || 'INQUIRY'
      });
      
      // Create submission in database
      const submission = await createFormSubmission(form.id, values);
      
      // Track successful submission
      analytics.trackFormSubmission(form.id, submission.id, values);
      
      // Process emails
      await fetch('/api/emails2.0/process-submission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formId: form.id,
          submissionId: submission.id,
          formData: values,
          source: 'form_submission'
        }),
      });
      
      // Mark form as submitted to prevent abandon event
      if (formRef.current) {
        formRef.current.setAttribute('data-submitted', 'true');
      }
      
      // Call onSubmitSuccess handler
      if (handlers?.onSubmitSuccess) {
        handlers.onSubmitSuccess(submission);
      }
    } catch (error) {
      // Track submission error
      analytics.trackEvent('form_submit_error', {
        formId: form.id,
        formName: form.title,
        formType: form.type || 'INQUIRY',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Handle error
      if (handlers?.onSubmitError) {
        handlers.onSubmitError(error instanceof Error ? error : new Error('Unknown error'));
      }
    }
  };
  
  // ... rest of component ...
  
  return (
    <form ref={formRef} onSubmit={/* ... */}>
      {/* Form rendering */}
    </form>
  );
}
```

## Database Schema Updates

```prisma
// prisma/schema.prisma (additions)

// Analytics Events
model AnalyticsEvent {
  id            String   @id
  type          String
  timestamp     DateTime
  sessionId     String
  userId        String?
  visitorId     String
  formId        String?
  formName      String?
  formType      String?
  fieldId       String?
  fieldName     String?
  sectionId     String?
  sectionName   String?
  submissionId  String?
  emailId       String?
  bookingId     String?
  value         String?  // JSON string
  metadata      String?  // JSON string
  source        String?
  medium        String?
  campaign      String?
  referrer      String?
  userAgent     String?
  ipAddress     String?
  duration      Int?
  previousEventId String?
  
  createdAt     DateTime @default(now())
  
  @@index([sessionId])
  @@index([visitorId])
  @@index([formId])
  @@index([submissionId])
  @@index([emailId])
  @@index([type])
  @@index([timestamp])
}

// Form Analytics Summary (for faster queries)
model FormAnalyticsSummary {
  id            String   @id @default(cuid())
  formId        String
  date          DateTime
  views         Int      @default(0)
  starts        Int      @default(0)
  completions   Int      @default(0)
  abandonments  Int      @default(0)
  averageCompletionTime Int?
  
  @@unique([formId, date])
  @@index([formId])
  @@index([date])
}
```

## Analytics Dashboard

```typescript
// components/analytics2.0/AnalyticsDashboard.tsx
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { FormAnalyticsData } from '@/lib/analytics2.0/core/analyticsTypes';
import { getFormAnalytics } from '@/lib/analytics2.0/reporting/analyticsReporting';
import { ConversionFunnel } from './ConversionFunnel';
import { FieldPerformance } from './FieldPerformance';
import { EmailMetrics } from './EmailMetrics';

export function AnalyticsDashboard2({ formId }: { formId: string }) {
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date()
  });
  const [analytics, setAnalytics] = useState<FormAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function loadAnalytics() {
      setLoading(true);
      try {
        const data = await getFormAnalytics(formId, dateRange.start, dateRange.end);
        setAnalytics(data);
      } catch (error) {
        console.error('Error loading analytics:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadAnalytics();
  }, [formId, dateRange]);
  
  if (loading) {
    return <div>Loading analytics...</div>;
  }
  
  if (!analytics) {
    return <div>No analytics data available</div>;
  }
  
  return (
    <div className="analytics-dashboard">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Form Analytics: {analytics.formName}</h1>
        <DateRangePicker
          value={dateRange}
          onChange={setDateRange}
        />
      </div>
      
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Views</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.metrics.views}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Starts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.metrics.starts}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.metrics.completions}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(analytics.metrics.conversionRate * 100).toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="funnel">
        <TabsList>
          <TabsTrigger value="funnel">Conversion Funnel</TabsTrigger>
          <TabsTrigger value="fields">Field Performance</TabsTrigger>
          <TabsTrigger value="emails">Email Metrics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="funnel">
          <Card>
            <CardHeader>
              <CardTitle>Conversion Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              <ConversionFunnel data={analytics.funnelStages} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="fields">
          <Card>
            <CardHeader>
              <CardTitle>Field Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldPerformance data={analytics.fieldPerformance} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="emails">
          <Card>
            <CardHeader>
              <CardTitle>Email Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <EmailMetrics data={analytics.emailMetrics} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

## API Routes

```typescript
// pages/api/analytics2.0/track-event.ts
import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { AnalyticsEvent } from '@/lib/analytics2.0/core/analyticsTypes';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const event: AnalyticsEvent = req.body;
    
    // Validate event
    if (!event.id || !event.type || !event.timestamp || !event.sessionId || !event.visitorId) {
      return res.status(400).json({ error: 'Invalid event data' });
    }
    
    // Store event in database
    await prisma.analyticsEvent.create({
      data: {
        id: event.id,
        type: event.type,
        timestamp: new Date(event.timestamp),
        sessionId: event.sessionId,
        userId: event.userId,
        visitorId: event.visitorId,
        formId: event.formId,
        formName: event.formName,
        formType: event.formType,
        fieldId: event.fieldId,
        fieldName: event.fieldName,
        sectionId: event.sectionId,
        sectionName: event.sectionName,
        submissionId: event.submissionId,
        emailId: event.emailId,
        bookingId: event.bookingId,
        value: event.value ? JSON.stringify(event.value) : null,
        metadata: event.metadata ? JSON.stringify(event.metadata) : null,
        source: event.source,
        medium: event.medium,
        campaign: event.campaign,
        referrer: event.referrer,
        userAgent: event.userAgent,
        ipAddress: event.ipAddress,
        duration: event.duration,
        previousEventId: event.previousEventId
      }
    });
    
    // Update summary tables if needed
    if (['form_view', 'form_start', 'form_submit_success', 'form_abandon'].includes(event.type) && event.formId) {
      await updateFormAnalyticsSummary(event);
    }
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error tracking event:', error);
    return res.status(500).json({ error: 'Failed to track event' });
  }
}

async function updateFormAnalyticsSummary(event: AnalyticsEvent) {
  const date = new Date(event.timestamp);
  date.setHours(0, 0, 0, 0);
  
  const formId = event.formId as string;
  
  // Get or create summary record
  let summary = await prisma.formAnalyticsSummary.findUnique({
    where: {
      formId_date: {
        formId,
        date
      }
    }
  });
  
  if (!summary) {
    summary = await prisma.formAnalyticsSummary.create({
      data: {
        formId,
        date,
        views: 0,
        starts: 0,
        completions: 0,
        abandonments: 0
      }
    });
  }
  
  // Update metrics based on event type
  switch (event.type) {
    case 'form_view':
      await prisma.formAnalyticsSummary.update({
        where: { id: summary.id },
        data: { views: { increment: 1 } }
      });
      break;
    case 'form_start':
      await prisma.formAnalyticsSummary.update({
        where: { id: summary.id },
        data: { starts: { increment: 1 } }
      });
      break;
    case 'form_submit_success':
      await prisma.formAnalyticsSummary.update({
        where: { id: summary.id },
        data: { completions: { increment: 1 } }
      });
      break;
    case 'form_abandon':
      await prisma.formAnalyticsSummary.update({
        where: { id: summary.id },
        data: { abandonments: { increment: 1 } }
      });
      break;
  }
}
```

## Conclusion

The Form Analytics System 2.0 provides comprehensive tracking and analysis of the entire form lifecycle, from initial view to submission to email follow-up. Key features include:

1. **Complete User Journey Tracking**: Track every step from form view to email engagement
2. **Field-Level Analytics**: Understand which fields cause problems or abandonment
3. **Conversion Funnel Visualization**: See where users drop off in the form process
4. **Email Performance Metrics**: Track email processing, sending, opens, and clicks
5. **Real-time Tracking**: Capture events as they happen for immediate insights
6. **Comprehensive Dashboard**: Visualize all form analytics in one place

This system integrates seamlessly with the Form System 2.0 and Email System 2.0 to create a complete picture of form performance and user engagement.
